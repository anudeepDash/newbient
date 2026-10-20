/**
 * The one branded email layout. Pure JS (no Node imports) so the admin can
 * import the same templates for live previews.
 *
 * Templates describe an email as blocks; everything they pass is text and is
 * escaped here. Only `{ html }` blocks carry markup, and those are only used
 * for messages staff wrote in the editor (sanitised below).
 *
 * kind 'transactional': no marketing footer, no unsubscribe, no tracking.
 * kind 'marketing': adds the unsubscribe and preferences links; the sender
 * adds List-Unsubscribe headers and tracking.
 */

export const BRAND_GREEN = '#39FF14';

/*
 * Brand variants (model.brand):
 *   'newbi'       main newbi.live logo on a dark band (default)
 *   'company'     the logo with the company name (model.company: entertainment |
 *                 media | marketing) on a light band, for invoices, proposals,
 *                 contracts and receipts
 * Logos are served from the site (public/brand, public/weekly_logo_dark.png).
 * `ink` is the accent dark enough to read on white (neon green isn't).
 */
const COMPANY_ACCENT = { entertainment: '#39FF14', media: '#00D1FF', marketing: '#FF0055' };
const COMPANY_INK = { entertainment: '#15803d', media: '#0369a1', marketing: '#e11d48' };

export const brandFor = (model = {}, origin = DEFAULT_ORIGIN) => {
    if (model.brand === 'company') {
        const company = COMPANY_ACCENT[model.company] ? model.company : 'entertainment';
        return {
            accent: COMPANY_ACCENT[company], onAccent: company === 'marketing' ? '#FFFFFF' : '#000000', ink: COMPANY_INK[company], headerBg: '#FFFFFF', headerClass: 'hdr-light',
            logo: `${origin}/brand/newbi-logo-${company}-email.png`, logoAlt: `Newbi ${company.charAt(0).toUpperCase()}${company.slice(1)}`, logoWidth: 132, logoHeight: 75, align: 'left',
            note: '',
        };
    }
    return {
        accent: BRAND_GREEN, onAccent: '#000000', ink: '#15803d', headerBg: '#0A0A0A', headerClass: 'hdr-dark',
        logo: `${origin}/brand/newbi-logo-email.png`, logoLight: `${origin}/brand/newbi-logo-email-light.png`, logoAlt: 'newbi.live', logoWidth: 96, logoHeight: 47, align: 'left',
        note: '',
    };
};
const COMPANY_NAME = 'newbi.live';
const SOCIALS = [
    { name: 'Instagram', icon: 'instagram', url: () => 'https://www.instagram.com/newbi.live' },
    { name: 'Website', icon: 'website', url: (origin) => origin },
    { name: 'LinkedIn', icon: 'linkedin', url: () => 'https://www.linkedin.com/company/newbi-ent' },
];
const DEFAULT_ORIGIN = 'https://www.newbi.live';

export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

/** Values that mean "nothing to show": '', null, '—', 'TBD', 'N/A', [], NaN. */
export const isPresent = (v) => {
    if (v === null || v === undefined) return false;
    if (typeof v === 'number') return Number.isFinite(v);
    if (Array.isArray(v)) return v.length > 0;
    const s = String(v).trim();
    return s !== '' && !['—', '-', 'tbd', 'n/a', 'na', 'null', 'undefined', 'to be announced'].includes(s.toLowerCase());
};

/** http(s), mailto and tel links only; site-relative paths get the origin. */
export const safeUrl = (url, origin = DEFAULT_ORIGIN) => {
    const u = String(url || '').trim();
    if (!u) return '';
    if (u.startsWith('/') && !u.startsWith('//')) return `${origin.replace(/\/+$/, '')}${u}`;
    if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
    if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return '';
    return `https://${u}`;
};

// Pasted text carries its source's colours and sizes (black on black in dark mode).
const PASTED_STYLE_PROPS = /^(color|background|background-color|caret-color|font-size|font-family|line-height)$/i;

/**
 * Staff-written editor HTML: drop scripts, frames, event handlers, javascript:
 * links and pasted colours/sizes; keep images inside the column.
 */
export const sanitizeHtml = (html) => String(html || '')
    .replace(/<(script|style|iframe|object|embed|form|textarea)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\/?(script|style|iframe|object|embed|form|textarea|meta|link|base)\b[^>]*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\sstyle\s*=\s*("([^"]*)"|'([^']*)')/gi, (match, _q, dq, sq) => {
        const kept = String(dq ?? sq ?? '').split(';').map(d => d.trim()).filter(d => d && !PASTED_STYLE_PROPS.test(d.split(':')[0].trim()));
        return kept.length ? ` style="${kept.join('; ').replace(/"/g, '&quot;')}"` : '';
    })
    .replace(/<font\b[^>]*>/gi, tag => tag.replace(/\s(color|face|size)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, ''))
    .replace(/(href|src)\s*=\s*(["'])\s*(javascript|vbscript|data:text)[^"']*\2/gi, '$1="#"')
    .replace(/(href|src)\s*=\s*(javascript|vbscript):[^\s>]*/gi, '$1="#"')
    .replace(/<img\b([^>]*)>/gi, (m, attrs) => {
        const clean = attrs.replace(/\s(width|height|style)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '').replace(/\/\s*$/, '');
        return `<img${clean} style="width:100%;max-width:100%;height:auto;display:block;margin:16px 0;border-radius:12px" />`;
    });

const textOf = (html) => String(html || '')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
    .replace(/&(rsquo|lsquo|rdquo|ldquo|hellip|mdash|ndash);/g, (m, n) => ({ rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', mdash: '—', ndash: '–' }[n]))
    .replace(/&#(\d+);/g, (m, n) => (Number(n) <= 0x10FFFF ? String.fromCodePoint(Number(n)) : m)).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

/** HTML that was stored entity-escaped (&lt;p&gt;…, even twice over) → real markup, so it can be stripped. */
const unescapeMarkup = (value) => {
    let s = String(value || '');
    for (let i = 0; i < 3 && /&(amp;)*lt;\s*\/?[a-z]/i.test(s); i += 1) {
        s = s.replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#0*39;/g, "'").replace(/&amp;/gi, '&');
    }
    return s;
};

/** Editor HTML or plain text → a plain-text teaser of at most `max` chars, cut at a word. */
export const excerpt = (value, max = 360) => {
    const text = textOf(sanitizeHtml(unescapeMarkup(value)).replace(/<\/p>/gi, '</p>\n')).replace(/[ \t]*\n[ \t]*/g, '\n');
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const space = cut.search(/\s\S*$/);
    return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s.,;:!?-]+$/, '')}…`;
};

// Invisible filler after the preheader, so inbox previews stop there instead of
// running on into the header and title ("Approved You're approved, Anu…").
const PREHEADER_PAD = '&#847;&zwnj;&nbsp;'.repeat(110);

const para = (text) => esc(text).replace(/\r?\n/g, '<br>');

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/* ---------- Blocks ---------- */

const CARD = 'border-collapse:separate;background:#11161f;border:1px solid #232a36;border-radius:18px';

/** A table-based pill button, so Outlook keeps the padding and the colour. */
const button = (href, label, { bg, fg, border, cls, size = 16, pad = '17px 34px', arrow = true, block = false }) => `<table role="presentation" cellpadding="0" cellspacing="0" class="${cls}-t" ${block ? 'width="100%"' : ''} style="margin:0 0 26px;border-collapse:separate"><tr><td align="center" class="${cls}-td" style="border-radius:999px;background:${bg};${border ? `border:2px solid ${border};` : ''}"><a href="${esc(href)}" target="_blank" class="${cls}" style="display:block;padding:${pad};border-radius:999px;color:${fg};font-size:${size}px;font-weight:800;letter-spacing:.2px;line-height:1.2;text-align:center;text-decoration:none">${esc(label)}${arrow ? '&nbsp;&nbsp;&rarr;' : ''}</a></td></tr></table>`;

/** File-type tile colours for the document card. */
const DOC_TILE = { PDF: '#e11d48', INVOICE: '#ffffff', PROPOSAL: '#ffffff', AGREEMENT: '#ffffff', RECEIPT: '#ffffff' };

const renderBlock = (block, ctx) => {
    if (!block) return '';
    if (block.p !== undefined) return isPresent(block.p) ? `<p class="txt" style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#d4d4d8">${para(block.p)}</p>` : '';
    if (block.lead !== undefined) return isPresent(block.lead) ? `<p class="strong" style="margin:0 0 20px;font-size:17px;line-height:1.55;color:#ffffff">${para(block.lead)}</p>` : '';
    if (block.note !== undefined) return isPresent(block.note) ? `<p class="muted" style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#9ca3af">${para(block.note)}</p>` : '';
    if (block.quote !== undefined) return isPresent(block.quote) ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px"><tr><td class="card txt" style="padding:16px 18px;border-left:3px solid ${ctx.accent};background:#11161f;border-radius:4px 14px 14px 4px;font-size:15px;line-height:1.6;color:#d4d4d8">${para(block.quote)}</td></tr></table>` : '';
    if (block.html !== undefined) return isPresent(block.html) ? `<div class="txt" style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#d4d4d8">${sanitizeHtml(block.html)}</div>` : '';
    if (block.list) {
        const items = block.list.filter(isPresent);
        return items.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px">${items.map((item, i) => `<tr><td valign="top" style="width:28px;padding:0 0 12px"><span class="num" style="display:inline-block;width:22px;height:22px;border-radius:11px;background:${ctx.accent};color:${ctx.onAccent};font-size:12px;font-weight:800;line-height:22px;text-align:center">${i + 1}</span></td><td class="txt" style="padding:1px 0 12px 6px;font-size:15px;line-height:1.55;color:#d4d4d8">${para(item)}</td></tr>`).join('')}</table>` : '';
    }
    if (block.steps) {
        const steps = block.steps.filter(r => Array.isArray(r) && isPresent(r[0]));
        if (!steps.length) return '';
        return `<table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;${CARD}">
${block.title ? `<tr><td colspan="2" class="muted" style="padding:16px 18px 4px;font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#9ca3af">${esc(block.title)}</td></tr>` : ''}
${steps.map(([head, text], i) => `<tr><td valign="top" style="width:30px;padding:${i === 0 ? '12px' : '4px'} 0 14px 18px"><span class="num" style="display:inline-block;width:22px;height:22px;border-radius:11px;background:${ctx.accent};color:${ctx.onAccent};font-size:12px;font-weight:800;line-height:22px;text-align:center">${i + 1}</span></td><td style="padding:${i === 0 ? '12px' : '4px'} 18px 14px 8px"><p class="strong" style="margin:0 0 2px;font-size:15px;font-weight:800;line-height:1.4;color:#ffffff">${esc(head)}</p>${isPresent(text) ? `<p class="txt" style="margin:0;font-size:14px;line-height:1.55;color:#d4d4d8">${para(text)}</p>` : ''}</td></tr>`).join('')}
</table>`;
    }
    if (block.details) {
        const rows = block.details.filter(r => Array.isArray(r) && isPresent(r[1]));
        if (!rows.length) return '';
        return `<table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;${CARD}">
${block.title ? `<tr><td colspan="2" class="muted" style="padding:16px 18px 2px;font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#9ca3af">${esc(block.title)}</td></tr>` : ''}
${rows.map(([label, value], i) => {
        const rule = i > 0 ? 'border-top:1px solid #232a36;' : '';
        return `<tr><td class="muted rule" style="${rule}padding:14px 18px;font-size:13px;color:#9ca3af;white-space:nowrap;vertical-align:top">${esc(label)}</td><td class="strong rule" style="${rule}padding:14px 18px;font-size:14px;font-weight:700;color:#ffffff;text-align:right;word-break:break-word">${para(value)}</td></tr>`;
    }).join('')}
</table>`;
    }
    if (block.items) {
        const items = block.items.filter(i => i && isPresent(i.name));
        if (!items.length) return '';
        const showPrice = items.some(i => Number(i.price) > 0);
        return `<table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;${CARD}">
${items.map((i, n) => `<tr><td class="strong rule" style="${n > 0 ? 'border-top:1px solid #232a36;' : ''}padding:13px 18px;font-size:14px;font-weight:600;color:#ffffff">${esc(i.name)}${Number(i.count) > 1 ? ` <span class="muted" style="color:#9ca3af;font-weight:500">× ${esc(i.count)}</span>` : ''}</td>${showPrice ? `<td class="strong rule" style="${n > 0 ? 'border-top:1px solid #232a36;' : ''}padding:13px 18px;font-size:14px;color:#ffffff;text-align:right">${money(Number(i.price || 0) * Number(i.count || 1))}</td>` : ''}</tr>`).join('')}
${isPresent(block.total) && showPrice ? `<tr><td class="strong rule" style="padding:14px 18px;border-top:1px solid #2e3643;font-size:15px;font-weight:800;color:#ffffff">${esc(block.totalLabel || 'Total')}</td><td class="strong rule" style="padding:14px 18px;border-top:1px solid #2e3643;font-size:15px;font-weight:800;color:#ffffff;text-align:right">${money(block.total)}</td></tr>` : ''}
</table>`;
    }
    if (block.code) {
        if (!isPresent(block.code)) return '';
        return `<p class="muted" style="margin:0 0 8px;font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#9ca3af">${esc(block.label || 'Reference')}</p>
<p style="margin:0 0 24px"><span class="code" style="display:inline-block;padding:10px 16px;border:1px dashed #2e3643;border-radius:12px;background:#11161f;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:18px;font-weight:700;letter-spacing:2px;color:#ffffff">${esc(block.code)}</span></p>`;
    }
    if (block.qr) {
        if (!isPresent(block.qr.value)) return '';
        const src = `${ctx.origin}/api/qr?text=${encodeURIComponent(block.qr.value)}&size=360&margin=1`;
        return `<div style="margin:4px 0 24px;text-align:center"><img src="${esc(src)}" width="184" height="184" alt="${esc(block.qr.alt || 'Entry QR code')}" style="width:184px;height:184px;padding:12px;border-radius:18px;background:#ffffff;border:1px solid #e4e4e7" />${isPresent(block.qr.caption) ? `<p class="muted" style="margin:10px 0 0;font-size:12px;color:#9ca3af">${esc(block.qr.caption)}</p>` : ''}</div>`;
    }
    if (block.image) {
        const src = safeUrl(block.image.url, ctx.origin);
        return src ? `<img src="${esc(src)}" alt="${esc(block.image.alt || '')}" width="536" style="width:100%;max-width:100%;height:auto;display:block;margin:0 0 26px;border-radius:20px;border:0" />` : '';
    }
    if (block.button) {
        const href = safeUrl(block.button.url, ctx.origin);
        if (!href || !isPresent(block.button.label)) return '';
        return button(href, block.button.label, { bg: 'transparent', fg: '#ffffff', border: '#3a4352', cls: 'btn2', size: 14, pad: '13px 24px' });
    }
    if (block.stats) {
        const tiles = block.stats.filter(r => Array.isArray(r) && isPresent(r[1])).slice(0, 3);
        if (!tiles.length) return '';
        const w = Math.floor(100 / tiles.length);
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-collapse:separate;border-spacing:0"><tr>${tiles.map(([label, value, tone], i) => `<td width="${w}%" valign="top" style="padding:${i === 0 ? '0 4px 0 0' : i === tiles.length - 1 ? '0 0 0 4px' : '0 4px'}"><table role="presentation" width="100%" height="100%" cellpadding="0" cellspacing="0" class="${tone === 'accent' ? 'tile tile-a' : 'tile'}" style="border-collapse:separate;background:#11161f;border:1px solid ${tone === 'accent' ? 'rgba(57,255,20,.35)' : '#232a36'};border-radius:14px"><tr><td style="padding:12px 12px 13px"><p class="muted" style="margin:0 0 5px;font-size:9px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#8b94a3">${esc(label)}</p><p class="${tone === 'accent' ? 'acc' : 'strong'}" style="margin:0;font-size:14px;line-height:1.3;font-weight:800;color:${tone === 'accent' ? ctx.accent : '#ffffff'}">${esc(value)}</p></td></tr></table></td>`).join('')}</tr></table>`;
    }
    if (block.document) {
        const d = block.document;
        const href = safeUrl(d.url, ctx.origin);
        const meta = (d.meta || []).filter(isPresent).map(esc).join('&nbsp;&nbsp;·&nbsp;&nbsp;');
        const kindLabel = esc(String(d.kind || 'PDF').toUpperCase());
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="paper" style="margin:0 0 26px;border-collapse:separate;background:#ffffff;border-radius:20px;overflow:hidden">
<tr><td style="padding:18px 18px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="58" valign="top" style="width:58px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle" style="width:50px;height:62px;border-radius:9px 16px 9px 9px;background:#0b0f17;border-bottom:4px solid ${ctx.accent}"><span style="font-size:12px;font-weight:900;letter-spacing:1px;color:#ffffff">PDF</span></td></tr></table></td>
<td valign="middle" style="padding-left:6px"><p style="margin:0 0 3px;font-size:10px;font-weight:900;letter-spacing:1.2px;text-transform:uppercase;color:#6b7280">${kindLabel} · Document</p><p style="margin:0 0 4px;font-size:16px;line-height:1.3;font-weight:800;color:#0b0f17;word-break:break-word">${esc(d.name || 'Document')}</p>${meta ? `<p style="margin:0;font-size:12px;line-height:1.5;color:#6b7280">${meta}</p>` : ''}</td>
</tr></table></td></tr>
${href ? `<tr><td align="center" style="border-top:1px solid #e5e7eb;padding:0"><a class="docbar" href="${esc(href)}" target="_blank" style="display:block;padding:15px 18px;font-size:14px;font-weight:800;color:#0b0f17;text-decoration:none">${esc(d.label || 'Open document')}&nbsp;&nbsp;&rarr;</a></td></tr>` : ''}
</table>`;
    }
    if (block.divider) return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 24px"><tr><td class="rule" style="border-top:1px solid #232a36;font-size:0;line-height:0">&nbsp;</td></tr></table>';
    return '';
};

const blockText = (block, ctx) => {
    if (!block) return '';
    if (block.p !== undefined) return isPresent(block.p) ? String(block.p) : '';
    if (block.lead !== undefined) return isPresent(block.lead) ? String(block.lead) : '';
    if (block.note !== undefined) return isPresent(block.note) ? String(block.note) : '';
    if (block.quote !== undefined) return isPresent(block.quote) ? `"${block.quote}"` : '';
    if (block.html !== undefined) return textOf(sanitizeHtml(block.html));
    if (block.list) return block.list.filter(isPresent).map(i => `- ${i}`).join('\n');
    if (block.steps) return block.steps.filter(r => Array.isArray(r) && isPresent(r[0])).map(([h, t], i) => `${i + 1}. ${h}${isPresent(t) ? `: ${t}` : ''}`).join('\n');
    if (block.details) return block.details.filter(r => Array.isArray(r) && isPresent(r[1])).map(([l, v]) => `${l}: ${v}`).join('\n');
    if (block.items) {
        const lines = block.items.filter(i => i && isPresent(i.name)).map(i => `${i.name}${Number(i.count) > 1 ? ` x ${i.count}` : ''}`);
        if (isPresent(block.total) && block.items.some(i => Number(i.price) > 0)) lines.push(`${block.totalLabel || 'Total'}: ${money(block.total)}`);
        return lines.join('\n');
    }
    if (block.code) return isPresent(block.code) ? `${block.label || 'Reference'}: ${block.code}` : '';
    if (block.button) { const href = safeUrl(block.button.url, ctx.origin); return href ? `${block.button.label}: ${href}` : ''; }
    if (block.stats) return block.stats.filter(r => Array.isArray(r) && isPresent(r[1])).map(([l, v]) => `${l}: ${v}`).join('\n');
    if (block.document) { const href = safeUrl(block.document.url, ctx.origin); return [block.document.name, (block.document.meta || []).filter(isPresent).join(' · '), href ? `${block.document.label || 'Open document'}: ${href}` : ''].filter(Boolean).join('\n'); }
    if (block.image) return '';
    return '';
};

/**
 * The poster, faded into the card's colour at the bottom (like the app's cards).
 * Only possible for Cloudinary uploads, which can do it in the URL; anything else
 * is shown as it is. The whole image is kept, nothing is cropped.
 */
const heroFaded = (url, hex) => {
    const m = String(url).match(/^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/);
    return m ? `${m[1]}w_1200,c_limit/e_gradient_fade,y_-0.5/b_rgb:${hex}/f_jpg/${m[2]}` : '';
};

/* ---------- Layout ---------- */

/**
 * renderEmail(model, { origin, unsubscribeUrl, preferencesUrl })
 * model = { subject, preheader, eyebrow, title, blocks, cta: {label,url}, kind, reason, brand, company }
 * → { subject, html, text }
 */
export const renderEmail = (model, opts = {}) => {
    const origin = String(opts.origin || DEFAULT_ORIGIN).replace(/\/+$/, '');
    const brand = brandFor(model, origin);
    const ctx = { origin, accent: brand.accent, onAccent: brand.onAccent };
    const kind = model.kind === 'marketing' ? 'marketing' : 'transactional';
    const blocks = (model.blocks || []).filter(Boolean);
    const heroSrc = model.hero ? safeUrl(model.hero.url, origin) : '';
    const ctaHref = model.cta ? safeUrl(model.cta.url, origin) : '';
    const hasCta = Boolean(ctaHref && isPresent(model.cta?.label));
    const preheader = isPresent(model.preheader) ? String(model.preheader) : textOf(blocks.map(b => blockText(b, ctx)).join(' ')).slice(0, 140);
    const unsubscribeUrl = kind === 'marketing' ? (opts.unsubscribeUrl || `${origin}/unsubscribe`) : '';
    const preferencesUrl = kind === 'marketing' && opts.preferencesUrl ? opts.preferencesUrl : '';
    const year = new Date().getFullYear();
    const socials = SOCIALS.map(s => ({ ...s, href: s.url(origin) }));
    const footLinks = [
        kind === 'marketing' ? ['Unsubscribe', unsubscribeUrl] : null,
        preferencesUrl ? ['Email preferences', preferencesUrl] : null,
        ['Privacy', `${origin}/privacy`],
        ['Terms', `${origin}/terms`],
    ].filter(Boolean);
    const footLink = ([label, href]) => `<a class="flink" href="${esc(href)}" target="_blank" style="color:#d4d4d8;text-decoration:underline">${label}</a>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<title>${esc(model.subject || 'Newbi')}</title>
<style>
body{margin:0;padding:0;background:#05070a;-webkit-text-size-adjust:100%}
a{color:${brand.accent}}
@media (prefers-color-scheme:light){
.dk{display:none!important}.lt{display:block!important}
body,.bg{background:#eef0f3!important}
.box{background:#ffffff!important;border-color:#e4e7ec!important}
.hdr,.herobg{background:#ffffff!important}
.pad{background-color:#ffffff!important;background-image:url('${origin}/brand/email/card-bg-light.png')!important}
.title,.strong{color:#0b0f17!important}
.txt{color:#3f4652!important}
.muted{color:#6b7280!important}
.acc{color:${brand.ink}!important}
.card,.tile,.code{background:#f6f7f9!important;border-color:#e4e7ec!important}
.tile-a{border-color:rgba(21,128,61,.4)!important}
.rule{border-color:#e4e7ec!important}
.paper{border:1px solid #e4e7ec!important}.docbar{color:#0b0f17!important}
.btn2-td{border-color:#0b0f17!important}.btn2{color:#0b0f17!important}
.foot{background:#f6f7f9!important;border-top:1px solid #e4e7ec!important}
.flink{color:#3f4652!important}
a{color:${brand.ink}!important}
.cta{color:${brand.onAccent}!important}
}
@media (max-width:600px){.wrap{padding:0!important}.box{border-radius:0!important;border-left:0!important;border-right:0!important}.hdr{padding:18px 22px!important}.pad{padding:28px 22px 8px!important}.foot{padding:28px 22px!important}.title{font-size:27px!important}.cta-t{width:100%!important}}
</style>
</head>
<body class="bg" style="margin:0;padding:0;background:#05070a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all">${esc(preheader)}${PREHEADER_PAD}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="bg" bgcolor="#05070a" style="background:#05070a">
<tr><td align="center" class="wrap" style="padding:32px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="box" bgcolor="#0b0f17" style="max-width:600px;background:#0b0f17;border:1px solid #1f2630;border-radius:28px;overflow:hidden">
<tr><td class="hdr" align="left" bgcolor="#0b0f17" style="padding:20px 32px;background:#0b0f17;text-align:left"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="left" valign="middle"><a href="${esc(origin)}" target="_blank" style="display:inline-block;text-decoration:none"><img class="dk" src="${esc(brand.logo)}" alt="${esc(brand.logoAlt)}" width="${brand.logoWidth}" height="${brand.logoHeight}" style="display:block;width:${brand.logoWidth}px;height:${brand.logoHeight}px;max-width:100%;border:0" /><!--[if !mso]><!--><img class="lt" src="${esc(brand.logoLight)}" alt="${esc(brand.logoAlt)}" width="${brand.logoWidth}" height="${brand.logoHeight}" style="display:none;width:${brand.logoWidth}px;height:${brand.logoHeight}px;max-width:100%;border:0" /><!--<![endif]--></a></td>${isPresent(model.eyebrow) ? `<td align="right" valign="middle"><span style="display:inline-block;padding:6px 12px;border-radius:12px;background:#000000;border:1px solid #2a3340;color:${brand.accent};font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10px;font-weight:900;letter-spacing:1.4px;text-transform:uppercase">${esc(model.eyebrow)}</span></td>` : ''}</tr></table></td></tr>
${heroSrc ? `<tr><td class="herobg" style="padding:0;font-size:0;line-height:0;background:#0b0f17">${(() => {
        const alt = esc(model.hero.alt || model.title || '');
        const img = (src, cls, hide) => `<img${cls ? ` class="${cls}"` : ''} src="${esc(src)}" alt="${alt}" width="600" style="display:${hide ? 'none' : 'block'};width:100%;max-width:600px;height:auto;border:0" />`;
        const dark = heroFaded(heroSrc, '0b0f17');
        return dark ? `${img(dark, 'dk')}${img(heroFaded(heroSrc, 'ffffff'), 'lt', true)}` : img(heroSrc);
    })()}</td></tr>` : ''}
<tr><td class="pad" background="${esc(`${origin}/brand/email/card-bg.png`)}" bgcolor="#0b0f17" valign="top" style="padding:${heroSrc ? '28px' : '10px'} 32px 12px;background:#0b0f17 url('${esc(`${origin}/brand/email/card-bg.png`)}') right bottom no-repeat">
${isPresent(model.title) ? `<h1 class="title" style="margin:0 0 22px;font-size:30px;line-height:1.15;font-weight:900;letter-spacing:-0.8px;color:#ffffff">${esc(model.title)}</h1>` : ''}
${blocks.map(b => renderBlock(b, ctx)).join('\n')}
${hasCta ? button(ctaHref, model.cta.label, { bg: brand.accent, fg: brand.onAccent, cls: 'cta', block: true }) : ''}
${model.signoff === false ? '' : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 22px"><tr><td class="rule" style="border-top:1px solid #232a36;padding:20px 0 0"><p class="strong" style="margin:0 0 2px;font-size:14px;font-weight:800;color:#ffffff">${esc(model.signoffName || 'The newbi.live team')}</p><p style="margin:0;font-size:12px"><a class="muted" href="${esc(origin)}" target="_blank" style="color:#8b94a3;text-decoration:none">newbi.live</a></p></td></tr></table>`}
</td></tr>
<tr><td class="foot" align="center" bgcolor="#05070a" style="padding:30px 32px 30px;background:#05070a;border-top:1px solid #1f2630;text-align:center">
<img class="dk" src="${esc(`${origin}/brand/email/n-mark.png`)}" alt="N." width="52" style="display:block;margin:0 auto 18px;width:52px;height:auto;border:0" /><img class="lt" src="${esc(`${origin}/brand/email/n-mark-light.png`)}" alt="N." width="52" style="display:none;margin:0 auto 18px;width:52px;height:auto;border:0" />
<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto 22px"><tr>
${socials.map(s => `<td style="padding:0 6px"><a href="${esc(s.href)}" target="_blank" style="display:inline-block;text-decoration:none"><img src="${esc(`${origin}/brand/email/${s.icon}.png`)}" width="36" height="36" alt="${esc(s.name)}" title="${esc(s.name)}" style="display:block;width:36px;height:36px;border:0" /></a></td>`).join('\n')}
</tr></table>
${isPresent(model.reason) ? `<p class="muted" style="margin:0 auto 14px;max-width:440px;font-size:12px;line-height:1.6;color:#8b94a3">${esc(model.reason)}</p>` : ''}
${brand.note ? `<p class="muted" style="margin:0 auto 14px;max-width:440px;font-size:12px;line-height:1.6;color:#8b94a3">${esc(brand.note)}</p>` : ''}
<p class="muted" style="margin:0 0 16px;font-size:12px;line-height:1.6;color:#8b94a3">${footLinks.map(footLink).join('&nbsp;&nbsp;·&nbsp;&nbsp;')}</p>
<p class="muted" style="margin:0;font-size:11px;line-height:1.6;color:#5b6472">© ${year} <a href="${esc(origin)}" target="_blank" style="color:#8b94a3;font-weight:700;text-decoration:none">${esc(COMPANY_NAME)}</a>. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

    const textParts = [
        model.title,
        ...blocks.map(b => blockText(b, ctx)),
        hasCta ? `${model.cta.label}: ${ctaHref}` : '',
        '—',
        model.reason || '',
        brand.note,
        socials.map(s => `${s.name}: ${s.href}`).join('\n'),
        kind === 'marketing' ? `Unsubscribe: ${unsubscribeUrl}` : '',
        `© ${year} ${COMPANY_NAME}. All rights reserved.`,
    ].filter(isPresent);

    return { subject: String(model.subject || 'Newbi').replace(/[\r\n]+/g, ' ').trim(), html, text: textParts.join('\n\n') };
};

/* Small helpers templates share. */
export const firstName = (name, fallback = 'there') => {
    const n = String(name || '').trim().split(/\s+/)[0];
    return n || fallback;
};

export const formatDate = (value, { withTime = false } = {}) => {
    if (!isPresent(value)) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
        ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
    });
};

export const formatMoney = money;
