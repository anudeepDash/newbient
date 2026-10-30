import { PDFDocument, PDFString, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';

/*
 * The last page(s) of an uploaded proposal PDF when files or links are
 * attached: one card per attachment with its name, its link (tappable in the
 * PDF) and a QR code to scan from a printout. The same idea as the Attachments
 * page of proposals made in the builder.
 *
 * The proposal record keeps how many pages were added (appendixPages), so a
 * later edit can take them off and add a fresh set instead of stacking them.
 */

const TYPE_LABEL = { pdf: 'PDF', spreadsheet: 'Spreadsheet', image: 'Image', other: 'Link' };

const INK = rgb(0.04, 0.05, 0.07);
const GREY = rgb(0.42, 0.44, 0.48);
const LINE = rgb(0.88, 0.89, 0.91);
const LINK = rgb(0.05, 0.4, 0.75);
const GREEN = rgb(0.22, 0.93, 0.25);

// The standard PDF fonts only cover Latin-1: anything else (₹, emoji, Devanagari) is left out.
export const pdfSafeText = (s) => String(s || '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const ellipsize = (font, text, size, max) => {
    if (font.widthOfTextAtSize(text, size) <= max) return text;
    let t = text;
    while (t.length > 1 && font.widthOfTextAtSize(`${t}...`, size) > max) t = t.slice(0, -1);
    return `${t.trimEnd()}...`;
};

/** Up to `maxLines` lines of `text` within `max` points; the last one ends in "..." if it runs over. */
const wrap = (font, text, size, max, maxLines) => {
    const lines = [];
    let rest = text;
    while (rest && lines.length < maxLines) {
        if (lines.length === maxLines - 1 || font.widthOfTextAtSize(rest, size) <= max) {
            lines.push(ellipsize(font, rest, size, max));
            break;
        }
        // Break at the last space that fits, or mid-word (long URLs) when none does.
        let cut = rest.length;
        while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > max) cut -= 1;
        const space = rest.lastIndexOf(' ', cut);
        if (space > cut * 0.5) cut = space;
        lines.push(rest.slice(0, cut).trimEnd());
        rest = rest.slice(cut).trimStart();
    }
    return lines;
};

const addLink = (pdfDoc, page, x, y, w, h, url) => {
    const annot = pdfDoc.context.register(pdfDoc.context.obj({
        Type: 'Annot',
        Subtype: 'Link',
        Rect: [x, y, x + w, y + h],
        Border: [0, 0, 0],
        A: { Type: 'Action', S: 'URI', URI: PDFString.of(url) },
    }));
    page.node.addAnnot(annot);
};

const toBytes = async (data) => {
    if (typeof Blob !== 'undefined' && data instanceof Blob) return new Uint8Array(await data.arrayBuffer());
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    return data;
};

/** Attachments that can go on the page: the ones with a web link. */
export const linkableAttachments = (attachments) => (Array.isArray(attachments) ? attachments : [])
    .filter(a => a && /^https?:\/\//i.test(String(a.url || '')));

/** A short fingerprint of the attachments, to tell whether the page needs redoing. */
export const attachmentsKey = (attachments) => JSON.stringify(linkableAttachments(attachments).map(a => [a.name || '', a.url]));

/** Takes the last `count` pages off a PDF (a previously added attachments page). */
export async function removeLastPages(pdfData, count) {
    const bytes = await toBytes(pdfData);
    const n = Math.max(0, parseInt(count, 10) || 0);
    if (!n) return bytes;
    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const total = pdfDoc.getPageCount();
    if (n >= total) return bytes;
    for (let i = total - 1; i >= total - n; i -= 1) pdfDoc.removePage(i);
    return pdfDoc.save();
}

/**
 * Adds the attachments page(s) at the end of a PDF, sized like its last page.
 *
 * @param {ArrayBuffer|Uint8Array|Blob} pdfData - The proposal PDF
 * @param {Array<{name, url, fileType, type}>} attachments - Files and links attached to the proposal
 * @param {Object} [options] - proposalNumber; logo (PNG bytes, drawn on the dark header band)
 * @returns {Promise<{ bytes: Uint8Array, pagesAdded: number }>}
 */
export async function appendAttachmentsPage(pdfData, attachments, options = {}) {
    const bytes = await toBytes(pdfData);
    const list = linkableAttachments(attachments);
    if (!list.length) return { bytes, pagesAdded: 0 };

    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    let logo = null;
    if (options.logo) {
        try { logo = await pdfDoc.embedPng(options.logo); } catch (err) { console.warn('[attachments page] logo skipped', err); }
    }
    const qrs = await Promise.all(list.map(a => QRCode.toDataURL(a.url, { margin: 1, width: 360, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } })
        .then(uri => pdfDoc.embedPng(uri))));

    const pages = pdfDoc.getPages();
    const last = pages[pages.length - 1];
    const { width, height } = last ? last.getSize() : { width: 595.28, height: 841.89 };
    const landscape = width > height * 1.05;
    const s = Math.min(width, height) / (landscape ? 540 : 595); // 1 on A4 portrait and a 960×540 deck
    const margin = 44 * s;
    const bandH = 76 * s;
    const titleY = height - bandH - 58 * s;
    const top = titleY - 40 * s; // where the cards start
    const bottom = 46 * s; // above the footer
    const cols = landscape ? 2 : 1;
    const gap = 14 * s;
    const cardW = (width - margin * 2 - gap * (cols - 1)) / cols;
    const cardH = 112 * s;
    const rows = Math.max(1, Math.floor((top - bottom + gap) / (cardH + gap)));
    const perPage = rows * cols;
    const pageCount = Math.ceil(list.length / perPage);
    const number = pdfSafeText(options.proposalNumber);

    for (let p = 0; p < pageCount; p += 1) {
        const page = pdfDoc.addPage([width, height]);
        page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });

        // Dark band with the logo, like the hosted proposal page.
        page.drawRectangle({ x: 0, y: height - bandH, width, height: bandH, color: INK });
        if (logo) {
            const h = bandH * 0.62;
            const w = (logo.width / logo.height) * h;
            page.drawImage(logo, { x: margin, y: height - bandH + (bandH - h) / 2, width: w, height: h });
        }
        if (number) {
            const size = 10 * s;
            page.drawText(number, { x: width - margin - bold.widthOfTextAtSize(number, size), y: height - bandH / 2 - size * 0.35, size, font: bold, color: rgb(1, 1, 1) });
        }
        page.drawRectangle({ x: 0, y: height - bandH - 3 * s, width, height: 3 * s, color: GREEN });

        page.drawText('APPENDIX', { x: margin, y: titleY + 30 * s, size: 8 * s, font: bold, color: GREY });
        page.drawText(p === 0 ? 'Attachments' : 'Attachments (continued)', { x: margin, y: titleY, size: 24 * s, font: bold, color: INK });
        page.drawText('Scan a code with your phone camera, or tap a card to open the file.', { x: margin, y: titleY - 18 * s, size: 9.5 * s, font, color: GREY });

        list.slice(p * perPage, (p + 1) * perPage).forEach((att, i) => {
            const idx = p * perPage + i;
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = margin + col * (cardW + gap);
            const y = top - (row + 1) * cardH - row * gap;
            const pad = 12 * s;
            const qrSize = cardH - pad * 2;

            page.drawRectangle({ x, y, width: cardW, height: cardH, borderColor: LINE, borderWidth: 1, color: rgb(1, 1, 1) });
            page.drawImage(qrs[idx], { x: x + pad, y: y + pad, width: qrSize, height: qrSize });

            const tx = x + pad * 2 + qrSize;
            const tw = cardW - (tx - x) - pad;
            // Top down: number and kind, the name (up to two lines), the link, and "Open" at the foot.
            let cursor = y + cardH - pad - 8 * s;
            const kind = `${String(idx + 1).padStart(2, '0')}  ·  ${TYPE_LABEL[att.fileType] || TYPE_LABEL.other}${att.type === 'file' ? ' file' : ''}`.toUpperCase();
            page.drawText(pdfSafeText(kind), { x: tx, y: cursor, size: 7.5 * s, font: bold, color: GREY });

            const nameSize = 13 * s;
            const name = pdfSafeText(att.name) || `Attachment ${idx + 1}`;
            const nameLines = wrap(bold, name, nameSize, tw, 2);
            nameLines.forEach((line) => {
                cursor -= nameSize * 1.3;
                page.drawText(line, { x: tx, y: cursor, size: nameSize, font: bold, color: INK });
            });

            const urlSize = 8 * s;
            cursor -= 4 * s;
            wrap(font, pdfSafeText(att.url.replace(/^https?:\/\//i, '')), urlSize, tw, nameLines.length > 1 ? 1 : 2).forEach((line) => {
                cursor -= urlSize * 1.35;
                page.drawText(line, { x: tx, y: cursor, size: urlSize, font, color: LINK });
            });

            page.drawText('Open  >', { x: tx, y: y + pad, size: 8.5 * s, font: bold, color: INK });
            addLink(pdfDoc, page, x, y, cardW, cardH, att.url);
        });

        const footSize = 7.5 * s;
        page.drawLine({ start: { x: margin, y: 30 * s }, end: { x: width - margin, y: 30 * s }, thickness: 0.6, color: LINE });
        page.drawText('Newbi Entertainment & Marketing LLP', { x: margin, y: 18 * s, size: footSize, font, color: GREY });
        const pg = pageCount > 1 ? `Attachments ${p + 1} of ${pageCount}` : 'newbi.live';
        page.drawText(pg, { x: width - margin - font.widthOfTextAtSize(pg, footSize), y: 18 * s, size: footSize, font, color: GREY });
    }

    return { bytes: await pdfDoc.save(), pagesAdded: pageCount };
}
