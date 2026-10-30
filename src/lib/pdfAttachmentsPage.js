import { PDFDocument, PDFString, StandardFonts, rgb, setCharacterSpacing } from 'pdf-lib';
import QRCode from 'qrcode';

/*
 * The last page(s) of an uploaded proposal PDF when files or links are
 * attached: one row per attachment with its name, its link (tappable in the
 * PDF) and a QR code to scan from a printout. Drawn in the proposal paper's
 * look (src/components/ui/proposalDesign.jsx): dot grid, N. mark header with
 * the quotation number, grey letter-spaced labels, a ruled table, and the
 * wordmark footer with the page number.
 *
 * The proposal record keeps how many pages were added (appendixPages), so a
 * later edit can take them off and add a fresh set instead of stacking them.
 */

/** Bumped when the page's design changes, so saving an older proposal redraws it. */
export const APPENDIX_VERSION = 2;

const TYPE_LABEL = { pdf: 'PDF', spreadsheet: 'Spreadsheet', image: 'Image', other: 'Link' };

const hex = (h) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const INK = hex('#111214');
const BODY = hex('#2B2D31');
const MUTED = hex('#9CA3AF'); // gray-400, the paper's labels
const SUBTLE = hex('#6B7280');
const LINE = hex('#E8EAE8');
const DOT = hex('#D9DCD9');
const LINK = hex('#15803D');

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
        // Break at the last space that fits, else after a / ? & = in a link, else mid-word.
        let cut = rest.length;
        while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > max) cut -= 1;
        const space = rest.lastIndexOf(' ', cut);
        const slash = Math.max(...['/', '?', '&', '='].map(ch => rest.lastIndexOf(ch, cut - 1) + 1));
        if (space > cut * 0.5) cut = space;
        else if (slash > cut * 0.5) cut = slash;
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
 * @param {Object} [options] - proposalNumber; label ("Quotation"); logo (the N. mark, PNG bytes);
 *   footerLogo (the black wordmark, PNG bytes); entity (the line under the mark)
 * @returns {Promise<{ bytes: Uint8Array, pagesAdded: number }>}
 */
export async function appendAttachmentsPage(pdfData, attachments, options = {}) {
    const bytes = await toBytes(pdfData);
    const list = linkableAttachments(attachments);
    if (!list.length) return { bytes, pagesAdded: 0 };

    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const embed = async (png) => {
        if (!png) return null;
        try { return await pdfDoc.embedPng(png); } catch (err) { console.warn('[attachments page] image skipped', err); return null; }
    };
    const mark = await embed(options.logo);
    const wordmark = await embed(options.footerLogo);
    const qrs = await Promise.all(list.map(a => QRCode.toDataURL(a.url, { margin: 0, width: 360, errorCorrectionLevel: 'M', color: { dark: '#111214', light: '#ffffff' } })
        .then(uri => pdfDoc.embedPng(uri))));

    const existing = pdfDoc.getPageCount();
    const last = existing ? pdfDoc.getPage(existing - 1) : null;
    const { width, height } = last ? last.getSize() : { width: 595.28, height: 841.89 };
    // Sizes are the paper's CSS pixels (794 wide); u turns them into points on this page.
    const u = Math.min(width / 794, height / 600);
    const padX = 50 * u;
    const right = width - padX;
    const contentW = right - padX;

    const text = (page, str, { x, y, size, f = font, color = INK, tracking = 0, align = 'left' }) => {
        const t = pdfSafeText(str);
        if (!t) return 0;
        const w = f.widthOfTextAtSize(t, size * u) + tracking * size * u * Math.max(0, t.length - 1);
        const left = align === 'right' ? x - w : x;
        if (tracking) page.pushOperators(setCharacterSpacing(tracking * size * u));
        page.drawText(t, { x: left, y, size: size * u, font: f, color });
        if (tracking) page.pushOperators(setCharacterSpacing(0));
        return w;
    };
    const rule = (page, y, from = padX, to = right) => page.drawLine({ start: { x: from, y }, end: { x: to, y }, thickness: 0.75 * u, color: LINE });

    // Vertical plan, top down (y is from the bottom in PDF space).
    const headerTop = height - 40 * u;
    const markH = 42 * u;
    const headerLine = headerTop - markH - 24 * u;
    const eyebrowY = headerLine - 44 * u;
    const titleY = eyebrowY - 30 * u;
    const tableHeadY = titleY - 40 * u;
    const tableTop = tableHeadY - 12 * u;
    const footerLine = 70 * u; // top of the footer (no rule, like the paper)
    const rowH = 96 * u;
    const noteSpace = 34 * u;
    const rowsFit = Math.max(1, Math.floor((tableTop - footerLine - noteSpace - 20 * u) / rowH));
    const pageCount = Math.ceil(list.length / rowsFit);
    const total = existing + pageCount;

    const number = options.proposalNumber || '';
    const label = options.label || 'Quotation';
    const entity = options.entity || 'Newbi Entertainment & Marketing LLP';
    const colType = padX + contentW * 0.6;
    const qrSize = 68 * u;

    for (let p = 0; p < pageCount; p += 1) {
        const page = pdfDoc.addPage([width, height]);
        page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });

        // Fine dot grid behind the header, fading out downwards.
        const step = 12 * u;
        const fade = 150 * u;
        for (let dy = step / 2; dy < fade; dy += step) {
            const opacity = Math.max(0, 1 - (dy / fade) ** 1.5);
            for (let dx = step / 2; dx < width; dx += step) {
                page.drawCircle({ x: dx, y: height - dy, size: 0.9 * u, color: DOT, opacity });
            }
        }

        // Header: N. mark and the company on the left, the quotation number on the right.
        if (mark) {
            const w = (mark.width / mark.height) * markH;
            page.drawImage(mark, { x: padX, y: headerTop - markH, width: w, height: markH });
        } else {
            text(page, 'Newbi', { x: padX, y: headerTop - markH * 0.8, size: 22, f: bold });
        }
        text(page, entity.toUpperCase(), { x: padX, y: headerTop - markH - 12 * u, size: 6, f: bold, color: SUBTLE, tracking: 0.12 });
        text(page, label.toUpperCase(), { x: right, y: headerTop - 14 * u, size: 8.5, f: bold, color: SUBTLE, tracking: 0.04, align: 'right' });
        if (number) text(page, number, { x: right, y: headerTop - 31 * u, size: 13, f: bold, align: 'right' });
        rule(page, headerLine);

        // Eyebrow and title.
        text(page, 'APPENDIX', { x: padX, y: eyebrowY, size: 8.5, f: bold, color: MUTED, tracking: 0.12 });
        text(page, `Attachments${p > 0 ? ' (continued)' : ''}`, { x: padX, y: titleY, size: 24, f: bold });

        // Table head.
        text(page, '#', { x: padX, y: tableHeadY, size: 7.7, f: bold, color: MUTED, tracking: 0.1 });
        text(page, 'DOCUMENT', { x: padX + 42 * u, y: tableHeadY, size: 7.7, f: bold, color: MUTED, tracking: 0.1 });
        text(page, 'TYPE', { x: colType, y: tableHeadY, size: 7.7, f: bold, color: MUTED, tracking: 0.1 });
        text(page, 'SCAN', { x: right, y: tableHeadY, size: 7.7, f: bold, color: MUTED, tracking: 0.1, align: 'right' });
        rule(page, tableTop);

        const rows = list.slice(p * rowsFit, (p + 1) * rowsFit);
        rows.forEach((att, i) => {
            const idx = p * rowsFit + i;
            const rowTop = tableTop - i * rowH;
            const rowBottom = rowTop - rowH;
            const firstLine = rowTop - 30 * u;

            text(page, String(idx + 1).padStart(2, '0'), { x: padX, y: firstLine, size: 11, color: BODY });

            const docX = padX + 42 * u;
            const docW = colType - docX - 16 * u;
            const nameLines = wrap(bold, pdfSafeText(att.name) || `Attachment ${idx + 1}`, 12 * u, docW, 2);
            let cursor = firstLine;
            nameLines.forEach((line, l) => {
                if (l) cursor -= 15 * u;
                text(page, line, { x: docX, y: cursor, size: 12, f: bold });
            });
            wrap(font, pdfSafeText(att.url.replace(/^https?:\/\//i, '')), 8.6 * u, docW, nameLines.length > 1 ? 1 : 2).forEach((line) => {
                cursor -= 14 * u;
                text(page, line, { x: docX, y: cursor, size: 8.6, color: SUBTLE });
            });
            text(page, 'Open  >', { x: docX, y: rowBottom + 14 * u, size: 8.6, f: bold, color: LINK, tracking: 0.04 });

            const kind = att.fileType && TYPE_LABEL[att.fileType] && att.fileType !== 'other'
                ? `${TYPE_LABEL[att.fileType]} ${att.type === 'file' ? 'file' : 'link'}`
                : (att.type === 'file' ? 'File' : 'Web link');
            text(page, kind, { x: colType, y: firstLine, size: 11, color: BODY });

            page.drawImage(qrs[idx], { x: right - qrSize, y: rowBottom + (rowH - qrSize) / 2, width: qrSize, height: qrSize });
            rule(page, rowBottom);
            addLink(pdfDoc, page, padX, rowBottom, contentW, rowH, att.url);
        });

        const tableBottom = tableTop - rows.length * rowH;
        text(page, 'Scan a code with your phone camera, or tap a row to open it. Links stay live, so they always show the latest version.', { x: padX, y: tableBottom - 18 * u, size: 7.7, color: MUTED });

        // Footer: wordmark and page number.
        const wordH = 32 * u;
        if (wordmark) {
            page.drawImage(wordmark, { x: padX, y: footerLine - wordH, width: (wordmark.width / wordmark.height) * wordH, height: wordH });
        } else {
            text(page, 'newbi.live', { x: padX, y: footerLine - wordH * 0.7, size: 11, f: bold });
        }
        text(page, `PAGE ${existing + p + 1} OF ${total}`, { x: right, y: footerLine - wordH * 0.62, size: 8.5, color: MUTED, tracking: 0.06, align: 'right' });
    }

    return { bytes: await pdfDoc.save(), pagesAdded: pageCount };
}
