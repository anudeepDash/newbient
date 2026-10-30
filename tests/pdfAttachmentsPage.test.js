import { describe, it, expect } from 'vitest';
import { PDFDocument, PDFName } from 'pdf-lib';
import { appendAttachmentsPage, removeLastPages, attachmentsKey, pdfSafeText } from '../src/lib/pdfAttachmentsPage.js';

const makePdf = async (pages, size = [595.28, 841.89]) => {
    const doc = await PDFDocument.create();
    for (let i = 0; i < pages; i += 1) doc.addPage(size);
    return doc.save();
};

const links = (page) => (page.node.Annots()?.asArray() || [])
    .map(ref => page.doc.context.lookup(ref))
    .filter(a => a.get(PDFName.of('Subtype'))?.toString() === '/Link')
    .map(a => a.get(PDFName.of('A')).get(PDFName.of('URI')).decodeText());

const ATTACHMENTS = [
    { id: 'a', name: 'Budget sheet ₹ “final”', url: 'https://docs.google.com/spreadsheets/d/abc', type: 'link', fileType: 'spreadsheet' },
    { id: 'b', name: 'Reference deck', url: 'https://res.cloudinary.com/x/raw/upload/deck.pdf', type: 'file', fileType: 'pdf' },
];

describe('attachments page on an uploaded proposal', () => {
    it('adds a page at the end with a tappable link per attachment', async () => {
        const { bytes, pagesAdded } = await appendAttachmentsPage(await makePdf(3), ATTACHMENTS, { proposalNumber: 'NBQ-1234' });
        expect(pagesAdded).toBe(1);
        const doc = await PDFDocument.load(bytes);
        expect(doc.getPageCount()).toBe(4);
        expect(links(doc.getPage(3))).toEqual(ATTACHMENTS.map(a => a.url));
        expect(doc.getPage(3).getSize()).toEqual(doc.getPage(0).getSize());
    });

    it('runs onto more pages when there are many, and skips entries without a web link', async () => {
        const many = Array.from({ length: 12 }, (_, i) => ({ name: `File ${i}`, url: `https://example.com/${i}`, fileType: 'other' }));
        const { bytes, pagesAdded } = await appendAttachmentsPage(await makePdf(1), [...many, { name: 'Broken', url: '' }]);
        expect(pagesAdded).toBeGreaterThan(1);
        const doc = await PDFDocument.load(bytes);
        const all = doc.getPages().slice(1).flatMap(links);
        expect(all).toEqual(many.map(a => a.url));
    });

    it('fits a landscape deck', async () => {
        const { bytes } = await appendAttachmentsPage(await makePdf(2, [960, 540]), ATTACHMENTS);
        const doc = await PDFDocument.load(bytes);
        expect(doc.getPage(2).getSize()).toEqual({ width: 960, height: 540 });
    });

    it('leaves the PDF alone with nothing attached', async () => {
        const src = await makePdf(2);
        const { bytes, pagesAdded } = await appendAttachmentsPage(src, []);
        expect(pagesAdded).toBe(0);
        expect(bytes).toBe(src);
    });

    it('takes an earlier attachments page off before a fresh one is added', async () => {
        const { bytes, pagesAdded } = await appendAttachmentsPage(await makePdf(3), ATTACHMENTS);
        const stripped = await PDFDocument.load(await removeLastPages(bytes, pagesAdded));
        expect(stripped.getPageCount()).toBe(3);
        // Never strips the whole document.
        expect((await PDFDocument.load(await removeLastPages(await makePdf(1), 5))).getPageCount()).toBe(1);
    });

    it('notices when the attachments change', () => {
        expect(attachmentsKey(ATTACHMENTS)).toBe(attachmentsKey(ATTACHMENTS.map(a => ({ ...a }))));
        expect(attachmentsKey(ATTACHMENTS)).not.toBe(attachmentsKey([ATTACHMENTS[0]]));
        expect(attachmentsKey(undefined)).toBe(attachmentsKey([]));
    });

    it('keeps text the standard PDF fonts can draw', () => {
        expect(pdfSafeText('Budget ₹ “final” – v2…')).toBe('Budget "final" - v2...');
    });
});
