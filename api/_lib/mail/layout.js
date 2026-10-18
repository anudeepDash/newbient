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
 *   'concertzone' ConcertZone is its own brand: the Weekly logo, cyan accent
 * Logos are served from the site (public/brand, public/weekly_logo_dark.png).
 * `ink` is the accent dark enough to read on white (neon green isn't).
 */
const COMPANY_ACCENT = { entertainment: '#39FF14', media: '#00D1FF', marketing: '#FF0055' };
const COMPANY_INK = { entertainment: '#15803d', media: '#0369a1', marketing: '#e11d48' };

export const brandFor = (model = {}, origin = DEFAULT_ORIGIN) => {
    if (model.brand === 'concertzone') {
        return {
            accent: '#00F2FF', onAccent: '#000000', ink: '#0e7490', headerBg: '#000000', headerClass: 'hdr-dark',
            logo: `${origin}/weekly_logo_dark.png`, logoAlt: 'Weekly by Concert Zone', logoWidth: 160, logoHeight: 47, align: 'center',
            note: 'Weekly by Concert Zone is a Newbi Entertainment & Marketing LLP publication.',
        };
    }
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
        logo: `${origin}/brand/newbi-logo-email.png`, logoAlt: 'newbi.live', logoWidth: 84, logoHeight: 41, align: 'left',
        note: '',
    };
};
const COMPANY_NAME = 'Newbi Entertainment & Marketing LLP';
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

/** Editor HTML or plain text → a plain-text teaser of at most `max` chars, cut at a word. */
export const excerpt = (value, max = 360) => {
    const text = textOf(sanitizeHtml(value).replace(/<\/p>/gi, '</p>\n')).replace(/[ \t]*\n[ \t]*/g, '\n');
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const space = cut.search(/\s\S*$/);
    return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s.,;:!?-]+$/, '')}…`;
};

const para = (text) => esc(text).replace(/\r?\n/g, '<br>');

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/* ---------- Blocks ---------- */

const CARD = 'border-collapse:separate;background:#fafafa;border:1px solid #ececef;border-radius:16px';

/** A table-based button, so Outlook keeps the padding and the colour. */
const button = (href, label, { bg, fg, border, cls, size = 15, pad = '15px 28px' }) => `<table role="presentation" cellpadding="0" cellspacing="0" class="${cls}-t" style="margin:0 0 24px;border-collapse:separate"><tr><td align="center" class="${cls}-td" style="border-radius:14px;background:${bg};${border ? `border:1px solid ${border};` : ''}"><a href="${esc(href)}" target="_blank" class="${cls}" style="display:inline-block;padding:${pad};border-radius:14px;color:${fg};font-size:${size}px;font-weight:800;line-height:1.2;text-decoration:none">${esc(label)}&nbsp;&rarr;</a></td></tr></table>`;

const renderBlock = (block, ctx) => {
    if (!block) return '';
    if (block.p !== undefined) return isPresent(block.p) ? `<p class="txt" style="margin:0 0 18px;font-size:15px;line-height:1.65;color:#3f3f46">${para(block.p)}</p>` : '';
    if (block.lead !== undefined) return isPresent(block.lead) ? `<p class="strong" style="margin:0 0 20px;font-size:17px;line-height:1.55;color:#18181b">${para(block.lead)}</p>` : '';
    if (block.note !== undefined) return isPresent(block.note) ? `<p class="muted" style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#71717a">${para(block.note)}</p>` : '';
    if (block.quote !== undefined) return isPresent(block.quote) ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px"><tr><td class="card txt" style="padding:16px 18px;border-left:3px solid ${ctx.accent};background:#fafafa;border-radius:4px 14px 14px 4px;font-size:15px;line-height:1.6;color:#3f3f46">${para(block.quote)}</td></tr></table>` : '';
    if (block.html !== undefined) return isPresent(block.html) ? `<div class="txt" style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#3f3f46">${sanitizeHtml(block.html)}</div>` : '';
    if (block.list) {
        const items = block.list.filter(isPresent);
        return items.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px">${items.map((item, i) => `<tr><td valign="top" style="width:28px;padding:0 0 12px"><span class="num" style="display:inline-block;width:22px;height:22px;border-radius:11px;background:#18181b;color:#ffffff;font-size:12px;font-weight:800;line-height:22px;text-align:center">${i + 1}</span></td><td class="txt" style="padding:1px 0 12px 6px;font-size:15px;line-height:1.55;color:#3f3f46">${para(item)}</td></tr>`).join('')}</table>` : '';
    }
    if (block.details) {
        const rows = block.details.filter(r => Array.isArray(r) && isPresent(r[1]));
        if (!rows.length) return '';
        return `<table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;${CARD}">
${block.title ? `<tr><td colspan="2" class="muted" style="padding:16px 18px 2px;font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#71717a">${esc(block.title)}</td></tr>` : ''}
${rows.map(([label, value], i) => {
        const rule = i > 0 ? 'border-top:1px solid #ececef;' : '';
        return `<tr><td class="muted rule" style="${rule}padding:14px 18px;font-size:13px;color:#71717a;white-space:nowrap;vertical-align:top">${esc(label)}</td><td class="strong rule" style="${rule}padding:14px 18px;font-size:14px;font-weight:700;color:#18181b;text-align:right;word-break:break-word">${para(value)}</td></tr>`;
    }).join('')}
</table>`;
    }
    if (block.items) {
        const items = block.items.filter(i => i && isPresent(i.name));
        if (!items.length) return '';
        const showPrice = items.some(i => Number(i.price) > 0);
        return `<table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;${CARD}">
${items.map((i, n) => `<tr><td class="strong rule" style="${n > 0 ? 'border-top:1px solid #ececef;' : ''}padding:13px 18px;font-size:14px;font-weight:600;color:#18181b">${esc(i.name)}${Number(i.count) > 1 ? ` <span class="muted" style="color:#71717a;font-weight:500">× ${esc(i.count)}</span>` : ''}</td>${showPrice ? `<td class="strong rule" style="${n > 0 ? 'border-top:1px solid #ececef;' : ''}padding:13px 18px;font-size:14px;color:#18181b;text-align:right">${money(Number(i.price || 0) * Number(i.count || 1))}</td>` : ''}</tr>`).join('')}
${isPresent(block.total) && showPrice ? `<tr><td class="strong rule" style="padding:14px 18px;border-top:1px solid #d4d4d8;font-size:15px;font-weight:800;color:#18181b">${esc(block.totalLabel || 'Total')}</td><td class="strong rule" style="padding:14px 18px;border-top:1px solid #d4d4d8;font-size:15px;font-weight:800;color:#18181b;text-align:right">${money(block.total)}</td></tr>` : ''}
</table>`;
    }
    if (block.code) {
        if (!isPresent(block.code)) return '';
        return `<p class="muted" style="margin:0 0 8px;font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#71717a">${esc(block.label || 'Reference')}</p>
<p style="margin:0 0 24px"><span class="code" style="display:inline-block;padding:10px 16px;border:1px dashed #d4d4d8;border-radius:12px;background:#fafafa;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:18px;font-weight:700;letter-spacing:2px;color:#18181b">${esc(block.code)}</span></p>`;
    }
    if (block.qr) {
        if (!isPresent(block.qr.value)) return '';
        const src = `${ctx.origin}/api/qr?text=${encodeURIComponent(block.qr.value)}&size=360&margin=1`;
        return `<div style="margin:4px 0 24px;text-align:center"><img src="${esc(src)}" width="184" height="184" alt="${esc(block.qr.alt || 'Entry QR code')}" style="width:184px;height:184px;padding:12px;border-radius:18px;background:#ffffff;border:1px solid #e4e4e7" />${isPresent(block.qr.caption) ? `<p class="muted" style="margin:10px 0 0;font-size:12px;color:#71717a">${esc(block.qr.caption)}</p>` : ''}</div>`;
    }
    if (block.image) {
        const src = safeUrl(block.image.url, ctx.origin);
        return src ? `<img src="${esc(src)}" alt="${esc(block.image.alt || '')}" width="536" style="width:100%;max-width:100%;height:auto;display:block;margin:0 0 26px;border-radius:16px;border:0" />` : '';
    }
    if (block.button) {
        const href = safeUrl(block.button.url, ctx.origin);
        if (!href || !isPresent(block.button.label)) return '';
        return button(href, block.button.label, { bg: '#ffffff', fg: '#18181b', border: '#d4d4d8', cls: 'btn2', size: 14, pad: '12px 20px' });
    }
    if (block.divider) return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 24px"><tr><td class="rule" style="border-top:1px solid #ececef;font-size:0;line-height:0">&nbsp;</td></tr></table>';
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
    if (block.details) return block.details.filter(r => Array.isArray(r) && isPresent(r[1])).map(([l, v]) => `${l}: ${v}`).join('\n');
    if (block.items) {
        const lines = block.items.filter(i => i && isPresent(i.name)).map(i => `${i.name}${Number(i.count) > 1 ? ` x ${i.count}` : ''}`);
        if (isPresent(block.total) && block.items.some(i => Number(i.price) > 0)) lines.push(`${block.totalLabel || 'Total'}: ${money(block.total)}`);
        return lines.join('\n');
    }
    if (block.code) return isPresent(block.code) ? `${block.label || 'Reference'}: ${block.code}` : '';
    if (block.button) { const href = safeUrl(block.button.url, ctx.origin); return href ? `${block.button.label}: ${href}` : ''; }
    if (block.image) return '';
    return '';
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
    const ctx = { origin, accent: brand.accent };
    const kind = model.kind === 'marketing' ? 'marketing' : 'transactional';
    const blocks = (model.blocks || []).filter(Boolean);
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
    const footLink = ([label, href]) => `<a href="${esc(href)}" target="_blank" style="color:#d4d4d8;text-decoration:underline">${label}</a>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(model.subject || 'Newbi')}</title>
<style>
body{margin:0;padding:0;background:#f4f4f5;-webkit-text-size-adjust:100%}
a{color:${brand.ink}}
@media (max-width:600px){.wrap{padding:0!important}.box{border-radius:0!important;border-left:0!important;border-right:0!important}.hdr{padding:18px 22px!important}.pad{padding:32px 22px 8px!important}.foot{padding:28px 22px!important}.title{font-size:25px!important}.cta-t{width:100%!important}.cta{display:block!important}}
@media (prefers-color-scheme:dark){
body,.bg{background:#09090b!important}
.box{background:#121214!important;border-color:#27272a!important}
.title,.strong{color:#fafafa!important}
.txt{color:#d4d4d8!important}
.muted{color:#a1a1aa!important}
.eyebrow{color:${brand.accent}!important}
.card,.code{background:#1a1a1d!important;border-color:#2c2c30!important;color:#fafafa!important}
.rule{border-color:#2c2c30!important}
.num{background:#fafafa!important;color:#09090b!important}
.btn2-td{background:#121214!important;border-color:#3f3f46!important}
.btn2{color:#fafafa!important}
a{color:${brand.accent}!important}
.cta{color:${brand.onAccent}!important}
.foot{border-top:1px solid #27272a!important}
.foot a{color:#d4d4d8!important}
.hdr-light{background:#FFFFFF!important}
.hdr-dark{background:${brand.headerBg}!important}
}
</style>
</head>
<body class="bg" style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="bg" style="background:#f4f4f5">
<tr><td align="center" class="wrap" style="padding:32px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="box" style="max-width:600px;background:#ffffff;border:1px solid #e4e4e7;border-radius:24px;overflow:hidden">
<tr><td class="hdr ${brand.headerClass}" align="${brand.align}" style="padding:20px 32px;background:${brand.headerBg};border-bottom:3px solid ${brand.accent};text-align:${brand.align}"><a href="${esc(origin)}" target="_blank" style="display:inline-block;text-decoration:none"><img src="${esc(brand.logo)}" alt="${esc(brand.logoAlt)}" width="${brand.logoWidth}" height="${brand.logoHeight}" style="display:block;width:${brand.logoWidth}px;height:${brand.logoHeight}px;max-width:100%;border:0" /></a></td></tr>
<tr><td class="pad" style="padding:40px 32px 12px">
${isPresent(model.eyebrow) ? `<p class="eyebrow" style="margin:0 0 12px;font-size:12px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:${brand.ink}">${esc(model.eyebrow)}</p>` : ''}
${isPresent(model.title) ? `<h1 class="title" style="margin:0 0 20px;font-size:28px;line-height:1.2;font-weight:800;letter-spacing:-0.5px;color:#09090b">${esc(model.title)}</h1>` : ''}
${blocks.map(b => renderBlock(b, ctx)).join('\n')}
${hasCta ? button(ctaHref, model.cta.label, { bg: brand.accent, fg: brand.onAccent, cls: 'cta' }) : ''}
</td></tr>
<tr><td class="foot" align="center" style="padding:32px 32px 30px;background:#0A0A0A;text-align:center">
<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto 22px"><tr>
${socials.map(s => `<td style="padding:0 6px"><a href="${esc(s.href)}" target="_blank" style="display:inline-block;text-decoration:none"><img src="${esc(`${origin}/brand/email/${s.icon}.png`)}" width="36" height="36" alt="${esc(s.name)}" title="${esc(s.name)}" style="display:block;width:36px;height:36px;border:0" /></a></td>`).join('\n')}
</tr></table>
${isPresent(model.reason) ? `<p style="margin:0 auto 14px;max-width:440px;font-size:12px;line-height:1.6;color:#a1a1aa">${esc(model.reason)}</p>` : ''}
${brand.note ? `<p style="margin:0 auto 14px;max-width:440px;font-size:12px;line-height:1.6;color:#a1a1aa">${esc(brand.note)}</p>` : ''}
<p style="margin:0 0 16px;font-size:12px;line-height:1.6;color:#a1a1aa">${footLinks.map(footLink).join('&nbsp;&nbsp;·&nbsp;&nbsp;')}</p>
<p style="margin:0;font-size:11px;line-height:1.6;color:#71717a">© ${year} ${esc(COMPANY_NAME)}. All rights reserved.<br><a href="${esc(origin)}" target="_blank" style="color:#71717a;text-decoration:none">newbi.live</a></p>
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
