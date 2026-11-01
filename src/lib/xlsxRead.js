import { unzipSync, strFromU8 } from 'fflate';

/*
 * Reads the first sheet of an .xlsx file into rows of text cells, enough for
 * importing a list (Outreach → Import). Formulas come through as their saved
 * values; formatting, merged cells and other sheets are ignored.
 */

const decode = (s) => s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&');

// The text of every <t> inside a piece of XML (rich text splits one string into runs).
const textOf = (xml) => decode([...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(m => m[1]).join(''));

const colIndex = (ref) => [...String(ref).replace(/\d+/g, '')].reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0) - 1;

// A big number saved as 9.19876543210E11 is a phone number, not a sum: write it out in full.
const plainNumber = (v) => (/e/i.test(v) && Number.isFinite(Number(v)) ? Number(v).toFixed(0) : v);

export const readXlsx = (buffer) => {
    const files = unzipSync(new Uint8Array(buffer));
    const shared = files['xl/sharedStrings.xml']
        ? [...strFromU8(files['xl/sharedStrings.xml']).matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => textOf(m[1]))
        : [];
    const sheetName = Object.keys(files).filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
        .sort((a, b) => Number(a.match(/(\d+)\.xml$/)[1]) - Number(b.match(/(\d+)\.xml$/)[1]))[0];
    if (!sheetName) return [];
    const xml = strFromU8(files[sheetName]);
    const rows = [];
    for (const [, rowXml] of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
        const row = [];
        for (const m of rowXml.matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
            const attrs = m[1];
            const inner = m[2] || '';
            const ref = (attrs.match(/\br="([A-Z]+\d+)"/) || [])[1];
            const type = (attrs.match(/\bt="([^"]+)"/) || [])[1];
            const v = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
            let value = '';
            if (type === 's') value = shared[Number(v)] ?? '';
            else if (type === 'inlineStr') value = textOf(inner);
            else if (v !== undefined) value = type === 'str' ? decode(v) : plainNumber(v);
            row[ref ? colIndex(ref) : row.length] = String(value).trim();
        }
        rows.push(Array.from(row, c => c ?? ''));
    }
    return rows.filter(r => r.some(Boolean));
};
