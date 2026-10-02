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

        // =========================================================================
        // 2. ADDITIONAL QUOTE REFERENCE REPLACEMENT (Cover page & Closing page)
        // =========================================================================
        // Cover page (Page 1): Quote Reference at x = 60.5, y = 174.6
        if (i === 0) {
            page.drawRectangle({
                x: 58,
                y: 166,
                width: 130,
                height: 22,
                color: rgb(1, 1, 1),
            });
            page.drawText(propNum, {
                x: 60.5,
                y: 174.6,
                size: 10.5,
                font: fontBold,
                color: rgb(0, 0, 0),
            });
        }

        // Closing page (Last page): Quote Reference at x = 311.45, y = 549.55
        if (i === pages.length - 1) {
            page.drawRectangle({
                x: 308,
                y: 541,
                width: 130,
                height: 22,
                color: rgb(1, 1, 1),
            });
            page.drawText(propNum, {
                x: 311.45,
                y: 549.55,
                size: 10.5,
                font: fontBold,
                color: rgb(0, 0, 0),
            });
        }
    }

    // =========================================================================
    // 3. OPTIONAL SIGNATURE & SEAL STAMPING ON EXECUTION PAGE (Last Page)
    // =========================================================================
    const clientSig = options.clientSignature;
    const ourSig = options.ourSignature;
    const isAccepted = Boolean(options.isAccepted || clientSig || options.signedAt);

    if (isAccepted || clientSig || ourSig || options.signedBy) {
        const lastPage = pages[pages.length - 1];
        if (lastPage) {
            const { width } = lastPage.getSize();

            const clientSigImage = await embedImageInPdf(pdfDoc, clientSig);
            const ourSigImage = await embedImageInPdf(pdfDoc, ourSig);

            const boxX = 30;
            const boxWidth = width - 60;
            const boxHeight = 125;
            const boxY = 160;

            // Background card
            lastPage.drawRectangle({
                x: boxX,
                y: boxY,
                width: boxWidth,
                height: boxHeight,
                color: rgb(0.976, 0.98, 0.984), // #F9FAFB
                borderColor: rgb(0.898, 0.906, 0.922), // #E5E7EB
                borderWidth: 1,
            });

            // Status badge pill if accepted
            if (isAccepted) {
                const badgeText = 'DIGITALLY AUTHORIZED & EXECUTED';
                const badgeWidth = fontBold.widthOfTextAtSize(badgeText, 7.2);
                const badgePillWidth = badgeWidth + 16;
                const badgePillHeight = 16;
                const badgeX = boxX + boxWidth - badgePillWidth - 14;
                const badgeY = boxY + boxHeight - 22;

                lastPage.drawRectangle({
                    x: badgeX,
                    y: badgeY,
                    width: badgePillWidth,
                    height: badgePillHeight,
                    color: rgb(0.91, 0.98, 0.94), // #E8FAF0
                    borderColor: rgb(0.72, 0.95, 0.82), // #B8F2D1
                    borderWidth: 0.8,
                });

                lastPage.drawText(badgeText, {
                    x: badgeX + 8,
                    y: badgeY + 4.5,
                    size: 7.2,
                    font: fontBold,
                    color: rgb(0.086, 0.639, 0.29), // #16A34A
                });
            }

            const col1X = boxX + 20;
            const colWidth = (boxWidth - 60) / 2;
            const col2X = boxX + boxWidth - 20 - colWidth;

            // ── Left Column: Provider Authorization ──
            lastPage.drawText('PROVIDER AUTHORIZATION', {
                x: col1X,
                y: boxY + boxHeight - 20,
                size: 7.5,
                font: fontBold,
                color: rgb(0.55, 0.55, 0.58),
            });

            if (ourSigImage) {
                lastPage.drawImage(ourSigImage, {
                    x: col1X,
                    y: boxY + 45,
                    width: 105,
                    height: 42,
                });
            } else {
                lastPage.drawText('Authorized Signatory', {
                    x: col1X,
                    y: boxY + 58,
                    size: 15,
                    font: fontOblique,
                    color: rgb(0.15, 0.15, 0.15),
                });
            }

            lastPage.drawLine({
                start: { x: col1X, y: boxY + 38 },
                end: { x: col1X + colWidth, y: boxY + 38 },
                thickness: 0.8,
                color: rgb(0.88, 0.88, 0.9),
            });

            lastPage.drawText(options.senderName || 'NewBi Entertainment & Marketing LLP', {
                x: col1X,
                y: boxY + 24,
                size: 8.5,
                font: fontBold,
                color: rgb(0.1, 0.1, 0.1),
            });

            // ── Right Column: Counterparty Acceptance ──
            lastPage.drawText('COUNTERPARTY ACCEPTANCE', {
                x: col2X,
                y: boxY + boxHeight - 20,
                size: 7.5,
                font: fontBold,
                color: rgb(0.55, 0.55, 0.58),
            });

            const clientSignerName = options.signedBy || options.clientName || 'Authorized Signatory';

            if (clientSigImage) {
                lastPage.drawImage(clientSigImage, {
                    x: col2X,
                    y: boxY + 45,
                    width: 105,
                    height: 42,
                });
            } else if (isAccepted || options.signedBy) {
                lastPage.drawText(clientSignerName, {
                    x: col2X,
                    y: boxY + 58,
                    size: 15,
                    font: fontOblique,
                    color: rgb(0.15, 0.15, 0.15),
                });
            } else {
                lastPage.drawText('Awaiting Digital Signature', {
                    x: col2X,
                    y: boxY + 58,
                    size: 9.5,
                    font: fontOblique,
                    color: rgb(0.6, 0.6, 0.65),
                });
            }

            lastPage.drawLine({
                start: { x: col2X, y: boxY + 38 },
                end: { x: col2X + colWidth, y: boxY + 38 },
                thickness: 0.8,
                color: rgb(0.88, 0.88, 0.9),
            });

            lastPage.drawText(clientSignerName, {
                x: col2X,
                y: boxY + 24,
                size: 8.5,
                font: fontBold,
                color: rgb(0.1, 0.1, 0.1),
            });

            if (isAccepted) {
                const dateStr = options.signedAt 
                    ? new Date(options.signedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                const metaText = `SIGNED: ${dateStr}${options.ip ? ` · IP: ${options.ip}` : ''}`;
                lastPage.drawText(metaText, {
                    x: col2X,
                    y: boxY + 12,
                    size: 6.5,
                    font: fontRegular,
                    color: rgb(0.45, 0.45, 0.5),
                });
            }
        }
    }

    const modifiedBytes = await pdfDoc.save();
    return modifiedBytes;
}
