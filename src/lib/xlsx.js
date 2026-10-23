/**
 * Styled Excel (.xlsx) export without a heavy library: an .xlsx file is a zip
 * of XML parts, built here and zipped with fflate.
 *
 * Every export gets the same look: a title band, a bold dark header row that
 * stays frozen while scrolling, filters on every column, zebra rows, sensible
 * column widths, and real number / ₹ / date cells (so totals and sorting work).
 *
 *   downloadXlsx({
 *     filename: 'invoices.xlsx', sheetName: 'Invoices',
 *     title: 'Invoices', subtitle: '42 invoices · exported 15 Oct 2026',
 *     columns: [{ header: 'Client', key: 'client', width: 28 },
 *               { header: 'Total', key: 'total', type: 'money' }],
 *     rows: [{ client: 'Red Bull', total: 250000 }],
 *     totals: { total: true },      // optional: sum these columns in a final row
 *   });
 */
import { zipSync, strToU8 } from 'fflate';

const esc = (v) => String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    // XML 1.0 forbids most control characters.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

const colName = (i) => {
    let n = i + 1, s = '';
    while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
    return s;
};

// Excel stores dates as days since 1899-12-30.
const excelDate = (d) => (d.getTime() - Date.UTC(1899, 11, 30) - d.getTimezoneOffset() * 60000) / 86400000;

const toDate = (v) => {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    if (typeof v?.toDate === 'function') return v.toDate();
    if (typeof v === 'object' && typeof v.seconds === 'number') return new Date(v.seconds * 1000);
    const d = new Date(String(v).length === 10 ? `${v}T00:00:00` : v);
    return isNaN(d.getTime()) ? null : d;
};

/*
 * Style indexes (cellXfs order in styles.xml):
 * 0 default · 1 title · 2 subtitle · 3 header
 * 4 text · 5 number · 6 money · 7 date · 8 datetime · 9 percent   (white rows)
 * 10-15 the same six on the zebra fill
 * 16 totals label · 17 totals money · 18 totals number
 */
const BODY = { text: 4, number: 5, money: 6, date: 7, datetime: 8, percent: 9 };
const ZEBRA_OFFSET = 6;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="4">
<numFmt numFmtId="164" formatCode="&quot;₹&quot;#,##0.00;[Red]-&quot;₹&quot;#,##0.00"/>
<numFmt numFmtId="165" formatCode="dd mmm yyyy"/>
<numFmt numFmtId="166" formatCode="dd mmm yyyy, hh:mm"/>
<numFmt numFmtId="167" formatCode="#,##0"/>
</numFmts>
<fonts count="5">
<font><sz val="11"/><color rgb="FF1F2937"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="16"/><color rgb="FF111827"/><name val="Calibri"/><family val="2"/></font>
<font><sz val="10"/><color rgb="FF6B7280"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FF111827"/><name val="Calibri"/><family val="2"/></font>
</fonts>
<fills count="5">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF111827"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF5F7FA"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFEEF0F3"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="3">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top/><bottom style="thin"><color rgb="FFE5E7EB"/></bottom><diagonal/></border>
<border><left/><right/><top style="medium"><color rgb="FF111827"/></top><bottom/><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="19">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="167" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top"/></xf>
<xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top"/></xf>
<xf numFmtId="10" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="167" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="164" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="165" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top"/></xf>
<xf numFmtId="166" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top"/></xf>
<xf numFmtId="10" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="0" fontId="4" fillId="4" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="164" fontId="4" fillId="4" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="167" fontId="4" fillId="4" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

const cell = (ref, value, type, style) => {
    if (value === null || value === undefined || value === '') return `<c r="${ref}" s="${style}"/>`;
    if (type === 'number' || type === 'money' || type === 'percent') {
        const n = Number(value);
        if (Number.isFinite(n)) return `<c r="${ref}" s="${style}"><v>${n}</v></c>`;
    }
    if (type === 'date' || type === 'datetime') {
        const d = toDate(value);
        if (d) return `<c r="${ref}" s="${style}"><v>${excelDate(d)}</v></c>`;
    }
    return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`;
};

const displayLength = (value, type) => {
    if (value === null || value === undefined) return 0;
    if (type === 'money') return String(Math.round(Number(value) || 0)).length + 6;
    if (type === 'date') return 11;
    if (type === 'datetime') return 18;
    return Math.max(...String(value).split('\n').map(l => l.length));
};

/** Build the .xlsx bytes. */
export const buildXlsx = ({ sheetName = 'Sheet1', title, subtitle, columns, rows, totals }) => {
    const values = rows.map(row => columns.map(col => (typeof col.value === 'function' ? col.value(row) : row[col.key])));
    const titleRows = (title ? 1 : 0) + (subtitle ? 1 : 0);
    const headerRow = titleRows + (titleRows ? 2 : 1); // a blank spacer row after the title band
    const lastCol = colName(columns.length - 1);

    const widths = columns.map((col, i) => col.width || Math.min(60, Math.max(
        col.header.length + 4,
        ...values.slice(0, 500).map(r => displayLength(r[i], col.type) + 2),
        8,
    )));

    const out = [];
    let r = 1;
    if (title) out.push(`<row r="${r}" ht="26" customHeight="1">${cell(`A${r}`, title, 'text', 1)}</row>`), r++;
    if (subtitle) out.push(`<row r="${r}">${cell(`A${r}`, subtitle, 'text', 2)}</row>`), r++;
    if (titleRows) r++;

    out.push(`<row r="${r}" ht="24" customHeight="1">${columns.map((c, i) => cell(`${colName(i)}${r}`, c.header, 'text', 3)).join('')}</row>`);
    r++;

    values.forEach((vals, idx) => {
        const zebra = idx % 2 === 1 ? ZEBRA_OFFSET : 0;
        out.push(`<row r="${r}">${vals.map((v, i) => cell(`${colName(i)}${r}`, v, columns[i].type || 'text', BODY[columns[i].type || 'text'] + zebra)).join('')}</row>`);
        r++;
    });

    if (totals && values.length) {
        const first = headerRow + 1;
        const last = r - 1;
        const cells = columns.map((col, i) => {
            const ref = `${colName(i)}${r}`;
            if (i === 0) return cell(ref, 'Total', 'text', 16);
            if (totals[col.key || col.header]) {
                return `<c r="${ref}" s="${col.type === 'money' ? 17 : 18}"><f>SUM(${colName(i)}${first}:${colName(i)}${last})</f></c>`;
            }
            return `<c r="${ref}" s="16"/>`;
        });
        out.push(`<row r="${r}">${cells.join('')}</row>`);
        r++;
    }

    const lastDataRow = Math.max(headerRow, headerRow + values.length);
    const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr><outlinePr summaryBelow="0"/></sheetPr>
<dimension ref="A1:${lastCol}${Math.max(1, r - 1)}"/>
<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="${headerRow}" topLeftCell="A${headerRow + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${headerRow + 1}" sqref="A${headerRow + 1}"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="18"/>
<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>
<sheetData>${out.join('')}</sheetData>
${values.length ? `<autoFilter ref="A${headerRow}:${lastCol}${lastDataRow}"/>` : ''}
${title ? `<mergeCells count="${subtitle ? 2 : 1}"><mergeCell ref="A1:${lastCol}1"/>${subtitle ? `<mergeCell ref="A2:${lastCol}2"/>` : ''}</mergeCells>` : ''}
<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;

    const safeSheet = esc(sheetName.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Sheet1');
    const files = {
        '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`,
        '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`,
        'docProps/core.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${esc(title || sheetName)}</dc:title><dc:creator>Newbi Entertainment</dc:creator>
<dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</dcterms:created>
</cp:coreProperties>`,
        'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${safeSheet}" sheetId="1" r:id="rId1"/></sheets>
${values.length ? `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${safeSheet}'!$A$${headerRow}:$${lastCol}$${lastDataRow}</definedName></definedNames>` : ''}
</workbook>`,
        'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
        'xl/styles.xml': STYLES,
        'xl/worksheets/sheet1.xml': sheet,
    };
    return zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])), { level: 6 });
};

/** Build and download. Returns false when there is nothing to export. */
export const downloadXlsx = (options) => {
    if (!options.rows?.length) return false;
    const bytes = buildXlsx(options);
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = options.filename.endsWith('.xlsx') ? options.filename : `${options.filename}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
};

/** "42 invoices · Overdue · exported 15 Oct 2026, 3:10 pm" */
export const exportSubtitle = (count, noun, extra) => [
    `${count} ${noun}${count === 1 ? '' : 's'}`,
    extra,
    `exported ${new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`,
].filter(Boolean).join(' · ');

const pad2 = (n) => String(n).padStart(2, '0');
const csvValue = (value, type) => {
    if (value === null || value === undefined) return '';
    if (type === 'date' || type === 'datetime') {
        const d = toDate(value);
        if (!d) return String(value);
        const day = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
        return type === 'date' ? day : `${day} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    }
    return value;
};

/** The CSV text for a spec: header row first, formulas defused. */
export const buildCsv = ({ columns, rows }) => {
    const cellText = (v) => {
        let s = String(v ?? '');
        // Phone numbers and negatives stay as they are; anything else that
        // looks like a formula is defused.
        if (/^[=+\-@\t\r]/.test(s) && !/^[+-]?[\d\s().-]+$/.test(s)) s = `'${s}`;
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [
        columns.map(c => cellText(c.header)).join(','),
        ...rows.map(row => columns.map(col => cellText(csvValue(typeof col.value === 'function' ? col.value(row) : row[col.key], col.type))).join(',')),
    ].join('\r\n');
};

/**
 * The same export as plain CSV, for tools that want it. Opens cleanly in Excel
 * (BOM for ₹ and Indian names) and can't run formulas.
 */
export const downloadCsv = (options) => {
    if (!options.rows?.length) return false;
    const { filename } = options;
    const blob = new Blob(['﻿' + buildCsv(options)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace(/\.xlsx$/, '').replace(/\.csv$/, '') + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
};

/** Today's date for file names: 2026-10-15 */
export const fileDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
