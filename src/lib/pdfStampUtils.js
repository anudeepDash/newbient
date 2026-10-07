import { PDFDocument, rgb } from 'pdf-lib';
import { inflate } from 'pako';

/**
 * Automatically calculates the next sequential proposal number (e.g. NBQ-8066)
 * based on all existing proposals in the store, falling back to a clean 4-digit number.
 */
export function generateNextProposalNumber(proposals = []) {
    let maxNum = 0;
    const regex = /^NBQ-(\d+)$/i;
    if (Array.isArray(proposals)) {
        for (const p of proposals) {
            const num = p?.proposalNumber;
            if (num) {
                const match = String(num).trim().match(regex);
                if (match) {
                    const val = parseInt(match[1], 10);
                    if (val > maxNum) maxNum = val;
                }
            }
        }
    }
    if (maxNum > 0) {
        return `NBQ-${maxNum + 1}`;
    }
    return `NBQ-${Math.floor(1000 + Math.random() * 9000)}`;
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

/**
 * Automatically embeds the new proposal number into a pre-made proposal PDF.
 * Removes existing proposal numbers on all pages and stamps the new proposal number
 * at the exact place with matching typography.
 * Also stamps counterparty and provider signatures on the execution page if present.
 *
 * @param {ArrayBuffer|Uint8Array|Blob|File} pdfData - Source PDF data
 * @param {string} proposalNumber - Target proposal number to embed (e.g. "NBQ-8065")
 * @param {Object} [options] - Additional options (signatures, client name, etc.)
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

    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const fontBold = await pdfDoc.embedFont('Helvetica-Bold');
    const fontRegular = await pdfDoc.embedFont('Helvetica');
    const fontOblique = await pdfDoc.embedFont('Helvetica-Oblique');
    const pages = pdfDoc.getPages();

    if (!pages || pages.length === 0) return arrayBuffer;

    // Loop through ALL pages to remove old proposal number and embed the new one
    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();

        // =========================================================================
        // 1. TOP-RIGHT HEADER REPLACEMENT (Present on all proposal pages)
        // =========================================================================
        // In the original PDF:
        // "QUOTATION" baseline is at y = 744.75, right-aligned to x = 557.0
        // Proposal Number baseline is at y = 733.2, right-aligned to x = 557.0
        const rightEdge = width > 600 ? 557.0 : width - 55.0;
        const topMaskWidth = 145;
        const topMaskX = rightEdge - topMaskWidth + 10;
        const topMaskY = height > 800 ? height - 72 : 722;
        const topMaskHeight = 44;

        // Solid pure white rectangle covering the top-right header slot completely
        page.drawRectangle({
            x: topMaskX,
            y: topMaskY,
            width: topMaskWidth,
            height: topMaskHeight,
            color: rgb(1, 1, 1), // solid white to erase old text completely
        });

        // Redraw "QUOTATION" label in original typography
        const labelText = 'QUOTATION';
        const labelSize = 7.5;
        const labelWidth = fontBold.widthOfTextAtSize(labelText, labelSize);
        const labelY = height > 800 ? height - 47.25 : 744.75;
        page.drawText(labelText, {
            x: rightEdge - labelWidth,
            y: labelY,
            size: labelSize,
            font: fontBold,
            color: rgb(0.44, 0.44, 0.48), // #71717A subtle gray
        });

        // Draw the new Proposal Number in bold black typography at the EXACT baseline
        const propNumSize = 10.5;
        const propNumWidth = fontBold.widthOfTextAtSize(propNum, propNumSize);
        const propNumY = height > 800 ? height - 58.8 : 733.2;
        page.drawText(propNum, {
            x: rightEdge - propNumWidth,
            y: propNumY,
            size: propNumSize,
            font: fontBold,
            color: rgb(0, 0, 0), // solid black
        });

        // Clean up any historical stamp over "PREPARED BY" on page 1
        if (i === 0) {
            page.drawRectangle({
                x: 54,
                y: 164,
                width: 155,
                height: 24,
                color: rgb(1, 1, 1),
            });
            const senderLabel = options.senderName || 'Newbi Entertainment & Marketing LLP';
            page.drawText(senderLabel, {
                x: 54,
                y: 173.5,
                size: 9.5,
                font: fontBold,
                color: rgb(0, 0, 0),
            });
        }
    }

    // =========================================================================
    // 2. REMOVE ANY STAMPED SIGNATURE / AUTHORIZATION BOX FROM THE PDF
    // =========================================================================
    if (pages.length > 0) {
        const lastPage = pages[pages.length - 1];
        const { width: lastWidth } = lastPage.getSize();
        
        // Solid white rectangle erasing the signature/authorization card box
        // (originally stamped at x: 30, y: 160, width: width - 60, height: 125)
        lastPage.drawRectangle({
            x: 28,
            y: 156,
            width: lastWidth - 56,
            height: 133,
            color: rgb(1, 1, 1), // solid white to completely remove the signature box
        });
    }

    // =========================================================================
    // 3. FINALIZE & SAVE
    // =========================================================================
    const modifiedBytes = await pdfDoc.save();
    return modifiedBytes;
}
