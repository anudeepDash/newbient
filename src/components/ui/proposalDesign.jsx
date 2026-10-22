import React from 'react';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import { cn } from '../../lib/utils';

/*
 * The parts of the proposal paper (the "Pinnaca" design): A4 page chrome,
 * section titles, callouts, card grids, tables, numbered steps and notes,
 * plus the content blocks an extra page is built from.
 *
 * Sizes are in px on the 794 × 1123 page (A4 at 96 dpi), measured from the
 * reference PDF. Everything here must render the same in html2canvas, so it
 * sticks to plain boxes, borders and text (no blur, no shadows on text).
 */

export const PAPER_W = 794;
export const PAPER_H = 1123;

export const INK = '#111214';
export const GREEN = '#16A34A';
export const NEON = '#39FF14';
const BOX_BG = '#F5F6F5';
const LINE = '#E8EAE8';

/* Manrope (the heading face) is self-hosted and imported above; Inter is on every page. */
export const HEADING_FONT = { fontFamily: "'Manrope', 'Inter', sans-serif" };
export const BODY_FONT = { fontFamily: "'Inter', sans-serif" };

/*
 * Text with light formatting: **bold**, line breaks, and blank lines between
 * paragraphs. Built from React nodes (never raw HTML), so client-facing text
 * can't inject markup.
 */
const renderInline = (line, keyBase) => {
    const out = [];
    const re = /\*\*(.+?)\*\*/g;
    let last = 0;
    let m;
    let i = 0;
    while ((m = re.exec(line))) {
        if (m.index > last) out.push(line.slice(last, m.index));
        out.push(<strong key={`${keyBase}-b${i++}`} className="font-bold text-[#111214]">{m[1]}</strong>);
        last = m.index + m[0].length;
    }
    if (last < line.length) out.push(line.slice(last));
    return out;
};

export const Rich = ({ text, className, paragraphClassName }) => {
    if (text === null || text === undefined || text === '') return null;
    const paras = String(text).replace(/\r/g, '').split(/\n{2,}/).filter(p => p.trim());
    return (
        <div className={cn('space-y-3', className)}>
            {paras.map((p, pi) => (
                <p key={pi} className={paragraphClassName}>
                    {p.split('\n').map((line, li, arr) => (
                        <React.Fragment key={li}>
                            {renderInline(line, `${pi}-${li}`)}
                            {li < arr.length - 1 && <br />}
                        </React.Fragment>
                    ))}
                </p>
            ))}
        </div>
    );
};

/* [[TBC]] in a table cell becomes a small tag. Pending words are grey, the rest green. */
const TAG_RE = /\[\[(.+?)\]\]/g;
const PENDING = /^(tbc|tbd|pending|to confirm|optional)$/i;
export const Tag = ({ children }) => {
    const grey = PENDING.test(String(children).trim());
    return (
        <span
            className="mx-0.5 inline-block rounded-full px-[7px] py-[1.5px] align-[1px] text-[7.5px] font-bold uppercase leading-[11px] tracking-[0.12em]"
            style={grey ? { background: '#EEF0EE', color: '#6B7280' } : { background: '#E6F7EC', color: GREEN }}
        >
            {children}
        </span>
    );
};

const withTags = (line, keyBase) => {
    const out = [];
    let last = 0;
    let m;
    let i = 0;
    TAG_RE.lastIndex = 0;
    while ((m = TAG_RE.exec(line))) {
        if (m.index > last) out.push(...renderInline(line.slice(last, m.index), `${keyBase}-t${i}`));
        out.push(<Tag key={`${keyBase}-tag${i++}`}>{m[1]}</Tag>);
        last = m.index + m[0].length;
    }
    if (last < line.length) out.push(...renderInline(line.slice(last), `${keyBase}-end`));
    return out;
};

/** A table cell: the first line in the cell's style, later lines as a small grey sub-line. */
const Cell = ({ value, strong }) => {
    const lines = String(value ?? '').replace(/\r/g, '').split('\n');
    const [first, ...rest] = lines;
    return (
        <>
            <span className={strong ? 'font-semibold text-[#111214]' : undefined}>{withTags(first, 'c')}</span>
            {rest.filter(l => l.trim()).map((l, i) => (
                <span key={i} className="mt-0.5 block text-[9.5px] font-normal text-gray-500">{withTags(l, `s${i}`)}</span>
            ))}
        </>
    );
};

/* ── Page chrome ─────────────────────────────────────────────────────────── */

export const FOOTER_LOGOS = {
    entertainment: '/brand/newbi-logo-black.svg',
    media: '/brand/newbi-logo-black-media.svg',
    marketing: '/brand/newbi-logo-black-marketing.svg',
};

export const PaperHeader = ({ number, label = 'Proposal', entity = 'Newbi Entertainment & Marketing LLP' }) => (
    <div className="relative z-10 flex shrink-0 items-start justify-between border-b pb-[9px]" style={{ borderColor: LINE }}>
        <div>
            <img src="/brand/email/n-mark-light.png" alt="Newbi" className="h-[32px] w-auto" crossOrigin="anonymous" />
            <p className="mt-[9px] text-[6.4px] font-medium uppercase tracking-[0.3em] text-gray-400">{entity}</p>
        </div>
        <div className="pt-[2px] text-right">
            <p className="text-[7.7px] font-medium uppercase tracking-[0.3em] text-gray-400">{label}</p>
            <p className="mt-[5px] text-[11.2px] font-bold tracking-[0.12em] text-[#111214]">{number || 'NBQ-XXXX'}</p>
        </div>
    </div>
);

export const PaperFooter = ({ pageIdx, totalPages, brand }) => (
    <div className="relative z-10 mt-auto flex shrink-0 items-center justify-between border-t pt-[22px]" style={{ borderColor: LINE }}>
        <img src={FOOTER_LOGOS[brand] || FOOTER_LOGOS.entertainment} alt="newbi.live" className="h-[22px] w-auto" crossOrigin="anonymous" />
        <p className="text-[7.7px] font-medium uppercase tracking-[0.2em] text-gray-400">Page {pageIdx + 1} of {totalPages}</p>
    </div>
);

/** One A4 sheet with the header and footer. */
export const Paper = ({ number, pageIdx, totalPages, brand, isExporting, children }) => (
    <div
        className="proposal-page-render relative flex h-[1123px] w-[794px] shrink-0 flex-col overflow-hidden rounded-[2px] bg-white px-[40px] pb-[20px] pt-[24px] text-[#111214] shadow-2xl"
        style={{ ...BODY_FONT, margin: isExporting ? '0' : undefined }}
    >
        <PaperHeader number={number} />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-start overflow-hidden pb-4 pt-[52px]">{children}</div>
        <PaperFooter pageIdx={pageIdx} totalPages={totalPages} brand={brand} />
    </div>
);

/* ── Type ───────────────────────────────────────────────────────────────── */

export const Eyebrow = ({ children, className, color = GREEN }) => (
    children ? <p className={cn('text-[8.5px] font-bold uppercase tracking-[0.3em]', className)} style={{ color }}>{children}</p> : null
);

/** Grey letter-spaced label above a block ("CAMPAIGN PHASES"). */
export const Label = ({ children, className }) => (
    children ? <p className={cn('mb-[14px] text-[8.3px] font-medium uppercase tracking-[0.3em] text-gray-500', className)}>{children}</p> : null
);

/** The green eyebrow and big title at the top of a page, with an optional grey aside. */
export const SectionTitle = ({ eyebrow, title, aside, className }) => (
    <div className={cn('mb-[22px]', className)}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="mt-[10px] text-[22.7px] font-bold leading-[1.15] tracking-[-0.01em] text-[#111214]" style={HEADING_FONT}>
            {title}
            {aside && <span className="ml-[10px] text-[13px] font-normal tracking-[-0.01em] text-gray-400">{aside}</span>}
        </h2>
    </div>
);

export const bodyText = 'text-[12px] leading-[20.4px] text-[#2B2D31]';

/* ── Blocks ─────────────────────────────────────────────────────────────── */

/** A grey rounded box with a green label; `accent` adds the green bar on the left. */
export const Callout = ({ label, text, children, accent = false, className }) => {
    if (!label && !text && !children) return null;
    return (
        <div
            className={cn('rounded-[12px] border px-[24px] py-[20px]', accent && 'rounded-l-[2px] border-l-[4px]', className)}
            style={{ background: BOX_BG, borderColor: LINE, ...(accent ? { borderLeftColor: GREEN } : null) }}
        >
            <Eyebrow className="mb-[10px]">{label}</Eyebrow>
            {text && <Rich text={text} className="space-y-2" paragraphClassName="text-[11.7px] leading-[20px] text-[#2B2D31]" />}
            {children}
        </div>
    );
};

const gridCols = (n, columns) => {
    const c = Number(columns) || (n >= 4 && n % 4 === 0 ? 4 : n >= 5 ? 5 : Math.max(1, Math.min(3, n)));
    return { gridTemplateColumns: `repeat(${c}, minmax(0, 1fr))` };
};

/** White bordered cards in a grid: green kicker, bold title, text, grey meta line. */
export const CardGrid = ({ items = [], columns, compact = false }) => {
    const list = items.filter(it => it && (it.kicker || it.title || it.text || it.meta));
    if (!list.length) return null;
    return (
        <div className="grid gap-[12px]" style={gridCols(list.length, columns)}>
            {list.map((it, i) => (
                <div key={i} className={cn('rounded-[10px] border bg-white', compact ? 'px-[12px] py-[14px]' : 'px-[14px] py-[16px]')} style={{ borderColor: LINE }}>
                    {it.kicker && <Eyebrow className={compact ? 'mb-[8px] tracking-[0.12em]' : 'mb-[8px]'}>{it.kicker}</Eyebrow>}
                    {it.title && <p className={cn('font-bold leading-[1.35] text-[#111214]', compact ? 'text-[10px]' : 'text-[11.2px]')} style={HEADING_FONT}>{it.title}</p>}
                    {it.text && <Rich text={it.text} className="mt-[8px] space-y-1.5" paragraphClassName="text-[10.4px] leading-[17px] text-[#3A3C40]" />}
                    {it.meta && <p className="mt-[4px] text-[10px] text-gray-400">{it.meta}</p>}
                </div>
            ))}
        </div>
    );
};

/** A table: grey letter-spaced header, bold first column, optional row numbers, [[tags]] and sub-lines. */
export const Table = ({ columns = [], rows = [], numbered = false, widths }) => {
    const cols = columns.filter(c => c !== undefined);
    const body = rows.filter(r => Array.isArray(r) ? r.some(v => String(v ?? '').trim()) : false);
    if (!cols.length || !body.length) return null;
    return (
        <table className="w-full border-collapse overflow-hidden text-left" style={{ border: `1px solid ${LINE}` }}>
            <colgroup>
                {numbered && <col style={{ width: 44 }} />}
                {cols.map((_, i) => <col key={i} style={widths?.[i] ? { width: widths[i] } : undefined} />)}
            </colgroup>
            <thead>
                <tr style={{ background: BOX_BG }}>
                    {numbered && <th className="px-[12px] py-[13px] text-[7.7px] font-semibold uppercase tracking-[0.2em] text-gray-500">#</th>}
                    {cols.map((c, i) => (
                        <th key={i} className="px-[12px] py-[13px] text-[7.7px] font-semibold uppercase tracking-[0.2em] text-gray-500">{c}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {body.map((r, ri) => (
                    <tr key={ri} style={{ borderTop: `1px solid ${LINE}` }}>
                        {numbered && <td className="px-[12px] py-[9px] align-top text-[11px] text-gray-600">{String(ri + 1).padStart(2, '0')}</td>}
                        {cols.map((_, ci) => (
                            <td key={ci} className="px-[12px] py-[9px] align-top text-[11px] leading-[16px] text-[#2B2D31]">
                                <Cell value={r[ci]} strong={ci === 0} />
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export const Bullets = ({ items = [], className }) => {
    const list = items.filter(b => String(b ?? '').trim());
    if (!list.length) return null;
    return (
        <ul className={cn('space-y-[8px]', className)}>
            {list.map((b, i) => (
                <li key={i} className="flex items-start gap-[12px] text-[11.4px] leading-[18.5px] text-[#2B2D31]">
                    <span className="mt-[7px] h-[4px] w-[4px] shrink-0 rounded-full" style={{ background: GREEN }} />
                    <span>{renderInline(String(b), `b${i}`)}</span>
                </li>
            ))}
        </ul>
    );
};

/** Numbered steps (green circles) with bullets, divided by thin rules. */
export const Steps = ({ items = [], start = 1 }) => {
    const list = items.filter(s => s && (s.title || (s.bullets || []).some(b => String(b ?? '').trim())));
    if (!list.length) return null;
    return (
        <div>
            {list.map((s, i) => (
                <div key={i} className="border-b pb-[16px] pt-[16px] first:pt-0" style={{ borderColor: LINE }}>
                    <div className="flex items-center gap-[10px]">
                        <span className="flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full border text-[8px] font-bold text-[#111214]" style={{ background: NEON, borderColor: INK }}>
                            {s.stepNumber || start + i}
                        </span>
                        <h3 className="text-[12.4px] font-bold text-[#111214]" style={HEADING_FONT}>{s.title}</h3>
                    </div>
                    <Bullets items={s.bullets} className="mt-[10px] pl-[27px]" />
                </div>
            ))}
        </div>
    );
};

/** Small grey caps line under a table or at the end of a page. */
export const Note = ({ children, className }) => (
    children ? <p className={cn('text-[7.7px] font-medium uppercase leading-[13px] tracking-[0.18em] text-gray-400', className)}>{children}</p> : null
);

/** Chips in a grid (anchor markets and the like). */
export const Chips = ({ items = [] }) => {
    const list = items.filter(Boolean);
    if (!list.length) return null;
    return (
        <div className="grid grid-cols-3 gap-[8px]">
            {list.map((m, i) => (
                <div key={i} className="rounded-[8px] border bg-white px-3 py-[8px] text-center text-[11px] font-semibold text-[#111214]" style={{ borderColor: LINE }}>{m}</div>
            ))}
        </div>
    );
};

/*
 * Content blocks for extra pages (and the extra content on the summary page).
 * Each block may carry a grey `label` shown above it.
 *
 *   text     { text }                                   paragraphs with **bold**
 *   callout  { label, text, accent }                    grey box, green label
 *   cards    { label, columns, items: [{ kicker, title, text, meta }] }
 *   table    { label, columns: [..], rows: [[..]], numbered, note }
 *   steps    { label, items: [{ title, bullets: [..] }] }
 *   bullets  { label, items: [..] }
 *   image    { label, url, caption, sideLabel, sideText }
 *   note     { text }                                   small grey caps line
 */
export const BLOCK_TYPES = ['text', 'callout', 'cards', 'table', 'steps', 'bullets', 'image', 'note'];

const ImageBlock = ({ block }) => {
    if (!block.url) return null;
    const side = block.sideLabel || block.sideText;
    return (
        <div className={cn('grid gap-[24px]', side ? 'grid-cols-[1.45fr_1fr]' : 'grid-cols-1')}>
            <figure>
                <div className="overflow-hidden border bg-[#FAFAFA]" style={{ borderColor: LINE }}>
                    <img src={block.url} alt={block.caption || ''} className="block h-auto max-h-[420px] w-full object-contain" crossOrigin="anonymous" />
                </div>
                {block.caption && <figcaption className="mt-[6px] text-[9px] text-gray-400">{block.caption}</figcaption>}
            </figure>
            {side && (
                <div className="pt-[6px]">
                    {block.sideLabel && <Label>{block.sideLabel}</Label>}
                    <Rich text={block.sideText} className="space-y-[10px]" paragraphClassName="text-[11.4px] leading-[19px] text-[#2B2D31]" />
                </div>
            )}
        </div>
    );
};

export const Block = ({ block }) => {
    if (!block || !block.type) return null;
    const label = block.type === 'callout' || block.type === 'note' ? null : block.label;
    let body = null;
    switch (block.type) {
        case 'text': body = <Rich text={block.text} paragraphClassName={bodyText} />; break;
        case 'callout': body = <Callout label={block.label} text={block.text} accent={Boolean(block.accent)} />; break;
        case 'cards': body = <CardGrid items={block.items} columns={block.columns} />; break;
        case 'table': body = (
            <>
                <Table columns={block.columns} rows={block.rows} numbered={Boolean(block.numbered)} />
                <Note className="mt-[12px]">{block.note}</Note>
            </>
        ); break;
        case 'steps': body = <Steps items={block.items} />; break;
        case 'bullets': body = <Bullets items={block.items} />; break;
        case 'image': body = <ImageBlock block={block} />; break;
        case 'note': body = <Note>{block.text}</Note>; break;
        default: return null;
    }
    return (
        <div>
            <Label>{label}</Label>
            {body}
        </div>
    );
};

export const Blocks = ({ blocks = [], className }) => {
    const list = (blocks || []).filter(b => b && b.hidden !== true);
    if (!list.length) return null;
    return <div className={cn('space-y-[26px]', className)}>{list.map((b, i) => <Block key={b.id || i} block={b} />)}</div>;
};
