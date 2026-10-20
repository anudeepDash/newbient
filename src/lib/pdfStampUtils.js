import { PDFDocument, rgb } from 'pdf-lib';
import { inflate } from 'pako';

const NBQ_NUMBER = /^NBQ-(\d{3,6})$/i;
const toMillis = (v) => {
    if (!v) return 0;
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (typeof v.seconds === 'number') return v.seconds * 1000;
    const t = new Date(v).getTime();
    return Number.isNaN(t) ? 0 : t;
};

/**
 * The next proposal number: one after the most recently created proposal's
 * (NBQ-1637 → NBQ-1638), skipping any number already used. Not "highest + 1":
 * an old NBQ-9998 would otherwise make every new proposal NBQ-9999.
 * With no numbered proposals yet, it starts at NBQ-1001.
 */
export function generateNextProposalNumber(proposals = []) {
    const list = Array.isArray(proposals) ? proposals : [];
    const used = new Set(list.map(p => String(p?.proposalNumber || '').trim().toUpperCase()).filter(Boolean));
    const numbered = list
        .map(p => ({ m: String(p?.proposalNumber || '').trim().match(NBQ_NUMBER), at: toMillis(p?.createdAt || p?.dateAdded || p?.updatedAt) }))
        .filter(x => x.m)
        .sort((a, b) => b.at - a.at);
    let next = numbered.length ? parseInt(numbered[0].m[1], 10) + 1 : 1001;
    while (used.has(`NBQ-${next}`)) next += 1;
    return `NBQ-${next}`;
}

/**
 * Helper to safely extract and decompress stream text from a page node if available.
 */
function inspectPageStreamText(page, pdfDoc) {
    try {
        const contentsRef = page.node.Contents();
        if (!contentsRef) return '';

        const context = pdfDoc.context;
        const contentsObj = context.lookup(contentsRef);
        if (!contentsObj) return '';

        const streams = [];
        if (typeof contentsObj.asArray === 'function' || Array.isArray(contentsObj.array)) {
            const arr = typeof contentsObj.asArray === 'function' ? contentsObj.asArray() : contentsObj.array;
            for (const r of arr) {
                const s = context.lookup(r);
                if (s) streams.push(s);
            }
        } else {
            streams.push(contentsObj);
        }

        let combinedText = '';
        for (const stream of streams) {
            try {
                const rawBytes = typeof stream.getContents === 'function' ? stream.getContents() : stream.contents;
                if (!rawBytes) continue;
                
                let text = '';
                try {
                    // FlateDecode decompressed via pako
                    const decompressed = inflate(rawBytes);
                    text = new TextDecoder('latin1').decode(decompressed);
                } catch {
                    // Raw/uncompressed stream fallback
                    text = new TextDecoder('latin1').decode(rawBytes);
                }
                combinedText += ' ' + text;
            } catch (streamErr) {
                console.warn('Error reading stream during PDF inspection:', streamErr);
            }
        }
        return combinedText;
    } catch (err) {
        return '';
    }
}

/**
 * Safely decodes and embeds an image (base64 PNG/JPG or remote HTTP URL) into a pdfDoc.
 */
async function embedImageInPdf(pdfDoc, imageSource) {
    if (!imageSource || typeof imageSource !== 'string') return null;
    try {
        let bytes = null;
        let isPng = true;

        if (imageSource.startsWith('data:image')) {
            const parts = imageSource.split(',');
            const mime = parts[0].toLowerCase();
            isPng = !mime.includes('jpeg') && !mime.includes('jpg');
            const b64 = parts[1];
            const binary = atob(b64);
            bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
        } else if (imageSource.startsWith('http://') || imageSource.startsWith('https://')) {
            const res = await fetch(imageSource);
            if (!res.ok) return null;
            const buf = await res.arrayBuffer();
            bytes = new Uint8Array(buf);
            isPng = !imageSource.toLowerCase().includes('.jpg') && !imageSource.toLowerCase().includes('.jpeg');
        }

        if (!bytes) return null;

        if (isPng) {
            try {
                return await pdfDoc.embedPng(bytes);
            } catch {
                return await pdfDoc.embedJpg(bytes);
            }
        } else {
            try {
                return await pdfDoc.embedJpg(bytes);
            } catch {
                return await pdfDoc.embedPng(bytes);
            }
        }
    } catch (err) {
        console.warn('Could not embed image into PDF:', err);
        return null;
    }
}

/* The old fixed-position stamp, for PDFs whose number can't be read. */
function legacyFixedStamp(pages, propNum, fontBold, options) {
    pages.forEach((page, i) => {
        const { width, height } = page.getSize();
        const rightEdge = width > 600 ? 557.0 : width - 55.0;
        const topMaskWidth = 145;
        page.drawRectangle({
            x: rightEdge - topMaskWidth + 10,
            y: height > 800 ? height - 72 : 722,
            width: topMaskWidth,
            height: 44,
            color: rgb(1, 1, 1),
        });
        const labelText = 'QUOTATION';
        const labelSize = 7.5;
        page.drawText(labelText, {
            x: rightEdge - fontBold.widthOfTextAtSize(labelText, labelSize),
            y: height > 800 ? height - 47.25 : 744.75,
            size: labelSize,
            font: fontBold,
            color: rgb(0.44, 0.44, 0.48),
        });
        const propNumSize = 10.5;
        page.drawText(propNum, {
            x: rightEdge - fontBold.widthOfTextAtSize(propNum, propNumSize),
            y: height > 800 ? height - 58.8 : 733.2,
            size: propNumSize,
            font: fontBold,
            color: rgb(0, 0, 0),
        });
        if (i === 0) {
            page.drawRectangle({ x: 54, y: 164, width: 155, height: 24, color: rgb(1, 1, 1) });
            page.drawText(options.senderName || 'Newbi Entertainment & Marketing LLP', { x: 54, y: 173.5, size: 9.5, font: fontBold, color: rgb(0, 0, 0) });
        }
    });
    // Older versions stamped a signature box on the last page: erase it.
    const lastPage = pages[pages.length - 1];
    lastPage.drawRectangle({ x: 28, y: 156, width: lastPage.getSize().width - 56, height: 133, color: rgb(1, 1, 1) });
}

/*
 * Where the proposal number goes, read from the PDF's own text (pdf.js): every
 * "NBQ-XXXX" placeholder (or an NBQ-1234 already there), with its position and
 * size, page by page. Also the marks an older version of this stamper left at
 * fixed coordinates, so they can be cleaned up.
 */
const PLACEHOLDER = /^NBQ[-\s]?[X#]{2,}$/i;
const DIGITS = /^NBQ-\d{3,6}$/i;
const near = (a, b, tol) => Math.abs(a - b) <= tol;

async function findNumberSlots(bytes, loadPdfjsLib) {
    try {
        const pdfjs = await loadPdfjsLib();
        // pdf.js may take over the buffer it's given: hand it a copy.
        const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes).slice(), useSystemFonts: true }).promise;
        const pages = [];
        for (let p = 1; p <= doc.numPages; p++) {
            const page = await doc.getPage(p);
            const { width, height } = page.getViewport({ scale: 1 });
            const content = await page.getTextContent();
            const items = content.items
                .filter(i => i.str && i.str.trim())
                .map(i => ({
                    text: i.str.trim(),
                    x: i.transform[4],
                    y: i.transform[5],
                    w: i.width,
                    size: Math.hypot(i.transform[2], i.transform[3]) || 10,
                }));
            pages.push({ width, height, items });
        }
        doc.destroy?.();
        return pages;
    } catch (err) {
        console.warn('[pdfStamp] could not read the PDF text; using fixed positions', err);
        return null;
    }
}

// What the previous stamper drew (fixed coordinates): "QUOTATION" + number at the top right, the sender on page 1.
const isOldHeaderStamp = (it, page) => {
    const rightEdge = page.width > 600 ? 557 : page.width - 55;
    const right = it.x + it.w;
    if (it.text === 'QUOTATION' && near(it.size, 7.5, 0.4) && near(right, rightEdge, 3)) return true;
    return DIGITS.test(it.text) && near(it.size, 10.5, 0.4) && near(right, rightEdge, 3)
        && near(it.y, page.height > 800 ? page.height - 58.8 : 733.2, 3);
};
const isOldSenderStamp = (it, pageIndex) => pageIndex === 0 && near(it.x, 54, 1.5) && near(it.y, 173.5, 1.5) && near(it.size, 9.5, 0.4);

/**
 * Stamps the proposal number into a pre-made proposal PDF, where the template
 * puts it: every "NBQ-XXXX" placeholder is covered and replaced with the number
 * in the same place and size (right-aligned on the right half of the page,
 * left-aligned on the left). Old stamps from earlier versions are cleaned up.
 * PDFs with no readable number at all get the old fixed-position stamp.
 *
 * @param {ArrayBuffer|Uint8Array|Blob|File} pdfData - Source PDF data
 * @param {string} proposalNumber - Target proposal number to embed (e.g. "NBQ-8065")
 * @param {Object} [options] - senderName; loadPdfjs (to read the text; defaults to the app's pdf.js)
 * @returns {Promise<Uint8Array>} - Modified PDF bytes
 */
export async function embedProposalNumberInPdf(pdfData, proposalNumber, options = {}) {
    if (!pdfData) throw new Error('No PDF data provided for proposal stamping.');
    const propNum = String(proposalNumber || '').trim();
    if (!propNum) return pdfData;

    let arrayBuffer = pdfData;
    if (typeof Blob !== 'undefined' && pdfData instanceof Blob) {
        arrayBuffer = await pdfData.arrayBuffer();
    } else if (pdfData.buffer && pdfData.buffer instanceof ArrayBuffer && !(pdfData instanceof ArrayBuffer)) {
        arrayBuffer = pdfData.buffer.slice(pdfData.byteOffset, pdfData.byteOffset + pdfData.byteLength);
    }

    const loader = options.loadPdfjs || (async () => (await import('./pdfInspect')).loadPdfjs());
    const slots = await findNumberSlots(arrayBuffer, loader);

    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const fontBold = await pdfDoc.embedFont('Helvetica-Bold');
    const pages = pdfDoc.getPages();
    if (!pages || pages.length === 0) return arrayBuffer;

    const white = rgb(1, 1, 1);
    const ink = rgb(0.04, 0.05, 0.07);
    const cover = (page, it, pad = 1.5) => page.drawRectangle({
        x: it.x - pad, y: it.y - it.size * 0.3, width: it.w + pad * 2, height: it.size * 1.2, color: white,
    });
    const write = (page, slot, pageWidth) => {
        const size = slot.size;
        const textWidth = fontBold.widthOfTextAtSize(propNum, size);
        const rightAligned = slot.x + slot.w / 2 > pageWidth / 2;
        page.drawText(propNum, { x: rightAligned ? slot.x + slot.w - textWidth : slot.x, y: slot.y, size, font: fontBold, color: ink });
    };

    const readable = slots && slots.some(pg => pg.items.some(it => PLACEHOLDER.test(it.text) || DIGITS.test(it.text)));

    if (readable) {
        pages.forEach((page, i) => {
            const pg = slots[i];
            if (!pg) return;
            const placeholders = pg.items.filter(it => PLACEHOLDER.test(it.text));
            const numbers = pg.items.filter(it => DIGITS.test(it.text));
            const oldStamps = pg.items.filter(it => isOldHeaderStamp(it, pg) || isOldSenderStamp(it, i));
            if (placeholders.length) {
                // The template's own places: cover the placeholder, any number already drawn there,
                // and an older stamp's leftovers, then write the number in each place.
                [...placeholders, ...numbers, ...oldStamps].forEach(it => cover(page, it));
                placeholders.forEach(slot => write(page, slot, pg.width));
            } else if (numbers.length) {
                // A template with a real number in it (or an older stamp): replace it where it is.
                numbers.forEach(it => { cover(page, it); write(page, it, pg.width); });
            }
        });
    } else {
        // No number readable anywhere (an older template, or text drawn as shapes): the fixed positions.
        legacyFixedStamp(pages, propNum, fontBold, options);
    }

    // =========================================================================
    // 3. FINALIZE & SAVE
    // =========================================================================
    const modifiedBytes = await pdfDoc.save();
    return modifiedBytes;
}
