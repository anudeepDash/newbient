/**
 * Reads a PDF in the browser before it's uploaded: page count, a first-page
 * thumbnail, and the text, so the upload forms can fill themselves in.
 * pdf.js is loaded only when someone actually picks a PDF.
 */

let pdfjsPromise = null;
const loadPdfjs = () => {
    if (!pdfjsPromise) {
        pdfjsPromise = Promise.all([
            import('pdfjs-dist'),
            import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
        ]).then(([lib, worker]) => {
            lib.GlobalWorkerOptions.workerSrc = worker.default;
            return lib;
        });
    }
    return pdfjsPromise;
};

export const isPdfFile = (file) => Boolean(file) && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name || ''));

/** { pages, thumbnail (data URL), lines: string[] }. Never throws; returns null if unreadable. */
export const inspectPdf = async (file, { thumbWidth = 520, textPages = 3 } = {}) => {
    if (!isPdfFile(file)) return null;
    try {
        const pdfjs = await loadPdfjs();
        const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;

        let thumbnail = null;
        try {
            const page = await doc.getPage(1);
            const base = page.getViewport({ scale: 1 });
            const viewport = page.getViewport({ scale: thumbWidth / base.width });
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(viewport.width);
            canvas.height = Math.round(viewport.height);
            await page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport }).promise;
            thumbnail = canvas.toDataURL('image/jpeg', 0.82);
        } catch { /* a thumbnail is a nicety */ }

        // Rebuild text lines from positioned runs (top to bottom, left to right).
        const lines = [];
        for (let p = 1; p <= Math.min(doc.numPages, textPages); p++) {
            const page = await doc.getPage(p);
            const content = await page.getTextContent();
            const rows = new Map();
            content.items.forEach(item => {
                if (!item.str?.trim()) return;
                const y = Math.round(item.transform[5] / 3) * 3;
                if (!rows.has(y)) rows.set(y, []);
                rows.get(y).push({ x: item.transform[4], s: item.str });
            });
            [...rows.entries()]
                .sort((a, b) => b[0] - a[0])
                .forEach(([, runs]) => {
                    const text = runs.sort((a, b) => a.x - b.x).map(r => r.s).join(' ').replace(/\s+/g, ' ').trim();
                    if (text) lines.push(text);
                });
        }
        const pages = doc.numPages;
        doc.destroy?.();
        return { pages, thumbnail, lines };
    } catch (err) {
        console.warn('[pdfInspect] could not read PDF', err);
        return null;
    }
};

// ---------- Field guessing ----------

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
const month = (w) => { const l = String(w).toLowerCase(); return MONTHS[l.slice(0, 4)] ?? MONTHS[l.slice(0, 3)]; };
const pad = (n) => String(n).padStart(2, '0');
const key = (y, m, d) => {
    if (y < 100) y += 2000;
    if (m < 0 || m > 11 || d < 1 || d > 31 || y < 2000 || y > 2100) return null;
    return `${y}-${pad(m + 1)}-${pad(d)}`;
};

/** First date in a string, as YYYY-MM-DD. Day-first for numeric dates (India). */
export const parseDate = (text) => {
    const s = String(text || '');
    let m = s.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
    if (m) return key(+m[1], +m[2] - 1, +m[3]);
    m = s.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/);
    if (m) return key(+m[3], +m[2] - 1, +m[1]);
    m = s.match(/\b(\d{1,2})(?:st|nd|rd|th)?[\s-]+(?:of\s+)?([A-Za-z]{3,9})\.?[,\s-]+(\d{2,4})\b/);
    if (m && month(m[2]) !== undefined) return key(+m[3], month(m[2]), +m[1]);
    m = s.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/);
    if (m && month(m[1]) !== undefined) return key(+m[3], month(m[1]), +m[2]);
    return null;
};

const amountsIn = (line) => (String(line).match(/(?:₹|rs\.?|inr)?\s*\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|(?:₹|rs\.?|inr)\s*\d+(?:\.\d{1,2})?|\b\d{4,}(?:\.\d{1,2})?\b/gi) || [])
    .map(t => Number(t.replace(/^\s*(?:₹|rs\.?|inr)\s*/i, '').replace(/[^\d.]/g, '')))
    .filter(n => Number.isFinite(n) && n > 0 && !(n >= 1900 && n <= 2100 && Number.isInteger(n)));

/** Value on a labelled line (or the line after it). */
const afterLabel = (lines, pattern, pick) => {
    for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(pattern);
        if (!match) continue;
        const rest = lines[i].slice(match.index + match[0].length);
        const got = pick(rest) ?? (lines[i + 1] ? pick(lines[i + 1]) : null);
        if (got) return got;
    }
    return null;
};

const cleanName = (s) => String(s || '')
    .replace(/^[\s:,\-–]+/, '')
    .replace(/\s*(gstin|gst no|pan|address|phone|email|mob).*$/i, '')
    .replace(/[,;:]+$/, '')
    .trim();

const OUR_NAMES = /newbi/i;

/**
 * Guess what a document says. kind: 'invoice' | 'proposal' | 'contract'.
 * Returns only what it's fairly sure about.
 */
export const guessFields = (lines = [], kind = 'invoice') => {
    if (!lines.length) return {};
    const text = lines.join('\n');
    const out = {};

    const emails = [...new Set(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [])].filter(e => !OUR_NAMES.test(e));
    if (emails[0]) out.email = emails[0].toLowerCase();

    const totalLabels = [
        /grand\s+total|total\s+amount\s+(?:payable|due)|amount\s+payable|net\s+payable|total\s+payable|balance\s+due|total\s+due/i,
        /total\s+(?:investment|value|fee|fees|cost|consideration)|contract\s+value|deal\s+value|investment/i,
        /\btotal\b/i,
    ];
    for (const label of totalLabels) {
        const v = afterLabel(lines, label, (s) => { const a = amountsIn(s); return a.length ? Math.max(...a) : null; });
        if (v) { out.amount = v; break; }
    }
    if (!out.amount) {
        const rupee = lines.flatMap(l => (/₹|rs\.?\s*\d|inr/i.test(l) ? amountsIn(l) : []));
        if (rupee.length) out.amount = Math.max(...rupee);
    }

    if (kind === 'invoice') {
        const num = text.match(/(?:invoice|inv|bill)\s*(?:no\.?|number|num|#)\s*[:.\-]?\s*([A-Z0-9][A-Z0-9/\-_.]{1,30})/i);
        if (num) out.number = num[1].replace(/[.,]$/, '').toUpperCase();
        out.issueDate = afterLabel(lines, /invoice\s+date|date\s+of\s+(?:issue|invoice)|issue\s+date|\bdated?\b/i, parseDate);
        out.dueDate = afterLabel(lines, /due\s+date|payment\s+due|due\s+(?:by|on)|pay\s+by/i, parseDate);
        const client = afterLabel(lines, /\b(?:bill(?:ed)?\s+to|invoice\s+to|buyer|client(?:\s+name)?|customer(?:\s+name)?)\b\s*[:\-]?/i, (s) => {
            const n = cleanName(s);
            return n.length > 1 && !OUR_NAMES.test(n) && !parseDate(n) ? n : null;
        });
        if (client) out.name = client;
        const gst = (text.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/g) || []);
        if (gst.length > 1) out.gst = gst[gst.length - 1];
    }

    if (kind === 'proposal') {
        const num = text.match(/(?:proposal|quote|quotation|ref(?:erence)?)\s*(?:no\.?|number|#)\s*[:.\-]?\s*([A-Z0-9][A-Z0-9/\-_.]{1,30})/i);
        if (num) out.number = num[1].toUpperCase();
        out.validUntil = afterLabel(lines, /valid\s+(?:until|till|upto|up\s+to)|validity|expires?\s+on|offer\s+valid/i, parseDate);
        const client = afterLabel(lines, /\b(?:prepared\s+for|proposal\s+for|presented\s+to|for\s+the\s+attention\s+of|client)\b\s*[:\-]?/i, (s) => {
            const n = cleanName(s);
            return n.length > 1 && !OUR_NAMES.test(n) && !parseDate(n) ? n : null;
        });
        if (client) out.name = client;
    }

    if (kind === 'contract') {
        out.effectiveDate = afterLabel(lines, /effective\s+(?:date|from)|commencement\s+date|entered\s+into\s+(?:on|this)|made\s+(?:on|this)|dated/i, parseDate);
        const between = text.replace(/\n/g, ' ').match(/\bbetween\b(.{3,200}?)\band\b\s+(.{2,120}?)(?:,|\(|\bhaving\b|\ba\s+company\b|\bhereinafter\b|\bwith\s+its\b)/i);
        if (between) {
            const [a, b] = [cleanName(between[1]), cleanName(between[2])];
            const other = OUR_NAMES.test(a) ? b : OUR_NAMES.test(b) ? a : b;
            if (other && other.length < 90) out.name = other;
        }
        const type = text.match(/\b(non[-\s]?disclosure|nda|memorandum of understanding|mou|influencer|talent management|brand partnership|consultancy|service)\b/i);
        if (type) out.type = type[1].toLowerCase();
    }

    Object.keys(out).forEach(k => out[k] == null && delete out[k]);
    return out;
};

/** "Client_Proposal_v3-final.pdf" → "Client" */
export const nameFromFileName = (name, words = /\b(proposal|quote|quotation|invoice|inv|bill|contract|agreement|services?|consultancy|influencer|nda|mou|signed|final|draft|deck|presentation|v\d+|copy|scan)\b/gi) => {
    const cleaned = String(name || '')
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .replace(words, '')
        .replace(/\b\d{1,4}\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    return cleaned.length > 2 ? cleaned.replace(/\b\w/g, c => c.toUpperCase()) : '';
};
