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

/** Staff-written editor HTML: drop scripts, frames, event handlers and javascript: links; keep images inside the column. */
export const sanitizeHtml = (html) => String(html || '')
    .replace(/<(script|style|iframe|object|embed|form|textarea)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\/?(script|style|iframe|object|embed|form|textarea|meta|link|base)\b[^>]*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(["'])\s*(javascript|vbscript|data:text)[^"']*\2/gi, '$1="#"')
    .replace(/(href|src)\s*=\s*(javascript|vbscript):[^\s>]*/gi, '$1="#"')
    .replace(/<img\b([^>]*)>/gi, (m, attrs) => {
        const clean = attrs.replace(/\s(width|height|style)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '').replace(/\/\s*$/, '');
        return `<img${clean} style="width:100%;max-width:100%;height:auto;display:block;margin:16px 0;border-radius:12px" />`;
    });

const textOf = (html) => String(html || '')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

const para = (text) => esc(text).replace(/\r?\n/g, '<br>');

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/* ---------- Blocks ---------- */

const renderBlock = (block, ctx) => {
    if (!block) return '';
    if (block.p !== undefined) return isPresent(block.p) ? `<p class="txt" style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46">${para(block.p)}</p>` : '';
    if (block.lead !== undefined) return isPresent(block.lead) ? `<p class="txt" style="margin:0 0 20px;font-size:17px;line-height:1.55;color:#18181b">${para(block.lead)}</p>` : '';
    if (block.note !== undefined) return isPresent(block.note) ? `<p class="muted" style="margin:0 0 14px;font-size:13px;line-height:1.55;color:#71717a">${para(block.note)}</p>` : '';
    if (block.quote !== undefined) return isPresent(block.quote) ? `<div class="card" style="margin:0 0 20px;padding:14px 16px;border-left:3px solid ${BRAND_GREEN};background:#f6f6f7;border-radius:10px;font-size:14px;line-height:1.6;color:#3f3f46">${para(block.quote)}</div>` : '';
    if (block.html !== undefined) return isPresent(block.html) ? `<div class="txt" style="margin:0 0 18px;font-size:15px;line-height:1.65;color:#3f3f46">${sanitizeHtml(block.html)}</div>` : '';
    if (block.list) {
        const items = block.list.filter(isPresent);
        return items.length ? `<ul class="txt" style="margin:0 0 18px;padding-left:20px;font-size:15px;line-height:1.6;color:#3f3f46">${items.map(i => `<li style="margin-bottom:6px">${para(i)}</li>`).join('')}</ul>` : '';
    }
    if (block.details) {
        const rows = block.details.filter(r => Array.isArray(r) && isPresent(r[1]));
        if (!rows.length) return '';
        return `<table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-collapse:separate;background:#f6f6f7;border-radius:14px">
${block.title ? `<tr><td colspan="2" style="padding:14px 16px 4px;font-size:12px;font-weight:700;color:#71717a">${esc(block.title)}</td></tr>` : ''}
${rows.map(([label, value], i) => `<tr><td class="muted" style="padding:${i === 0 && !block.title ? '14px' : '8px'} 16px ${i === rows.length - 1 ? '14px' : '8px'};font-size:13px;color:#71717a;white-space:nowrap;vertical-align:top">${esc(label)}</td><td class="strong" style="padding:${i === 0 && !block.title ? '14px' : '8px'} 16px ${i === rows.length - 1 ? '14px' : '8px'};font-size:14px;font-weight:600;color:#18181b;text-align:right;word-break:break-word">${para(value)}</td></tr>`).join('')}
</table>`;
    }
    if (block.items) {
        const items = block.items.filter(i => i && isPresent(i.name));
        if (!items.length) return '';
        const showPrice = items.some(i => Number(i.price) > 0);
        return `<table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-collapse:separate;background:#f6f6f7;border-radius:14px">
${items.map(i => `<tr><td class="strong" style="padding:10px 16px;font-size:14px;font-weight:600;color:#18181b">${esc(i.name)}${Number(i.count) > 1 ? ` <span class="muted" style="color:#71717a;font-weight:500">× ${esc(i.count)}</span>` : ''}</td>${showPrice ? `<td class="strong" style="padding:10px 16px;font-size:14px;color:#18181b;text-align:right">${money(Number(i.price || 0) * Number(i.count || 1))}</td>` : ''}</tr>`).join('')}
${isPresent(block.total) && showPrice ? `<tr><td class="strong" style="padding:12px 16px;border-top:1px solid #e4e4e7;font-size:14px;font-weight:800;color:#18181b">${esc(block.totalLabel || 'Total')}</td><td class="strong" style="padding:12px 16px;border-top:1px solid #e4e4e7;font-size:14px;font-weight:800;color:#18181b;text-align:right">${money(block.total)}</td></tr>` : ''}
</table>`;
    }
    if (block.code) {
        if (!isPresent(block.code)) return '';
        return `<p class="muted" style="margin:0 0 6px;font-size:12px;font-weight:700;color:#71717a">${esc(block.label || 'Reference')}</p>
<p style="margin:0 0 20px"><span class="code" style="display:inline-block;padding:8px 12px;border-radius:10px;background:#f4f4f5;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:16px;font-weight:700;letter-spacing:1px;color:#18181b">${esc(block.code)}</span></p>`;
    }
    if (block.qr) {
        if (!isPresent(block.qr.value)) return '';
        const src = `${ctx.origin}/api/qr?text=${encodeURIComponent(block.qr.value)}&size=360&margin=1`;
        return `<div style="margin:4px 0 22px;text-align:center"><img src="${esc(src)}" width="180" height="180" alt="${esc(block.qr.alt || 'Entry QR code')}" style="width:180px;height:180px;padding:10px;border-radius:14px;background:#ffffff;border:1px solid #e4e4e7" />${isPresent(block.qr.caption) ? `<p class="muted" style="margin:8px 0 0;font-size:12px;color:#71717a">${esc(block.qr.caption)}</p>` : ''}</div>`;
    }
    if (block.image) {
        const src = safeUrl(block.image.url, ctx.origin);
        return src ? `<img src="${esc(src)}" alt="${esc(block.image.alt || '')}" width="520" style="width:100%;max-width:100%;height:auto;display:block;margin:0 0 20px;border-radius:14px" />` : '';
    }
    if (block.button) {
        const href = safeUrl(block.button.url, ctx.origin);
        if (!href || !isPresent(block.button.label)) return '';
        return `<p style="margin:0 0 20px"><a href="${esc(href)}" class="btn2" style="display:inline-block;padding:12px 20px;border-radius:12px;border:1px solid #d4d4d8;color:#18181b;font-size:14px;font-weight:700;text-decoration:none">${esc(block.button.label)}</a></p>`;
    }
    if (block.divider) return '<hr style="border:0;border-top:1px solid #e4e4e7;margin:8px 0 20px" />';
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
 * model = { subject, preheader, eyebrow, title, blocks, cta: {label,url}, kind, reason }
 * → { subject, html, text }
 */
export const renderEmail = (model, opts = {}) => {
    const origin = String(opts.origin || DEFAULT_ORIGIN).replace(/\/+$/, '');
    const ctx = { origin };
    const kind = model.kind === 'marketing' ? 'marketing' : 'transactional';
    const blocks = (model.blocks || []).filter(Boolean);
    const ctaHref = model.cta ? safeUrl(model.cta.url, origin) : '';
    const hasCta = Boolean(ctaHref && isPresent(model.cta?.label));
    const preheader = isPresent(model.preheader) ? String(model.preheader) : textOf(blocks.map(b => blockText(b, ctx)).join(' ')).slice(0, 140);
    const unsubscribeUrl = kind === 'marketing' ? (opts.unsubscribeUrl || `${origin}/unsubscribe`) : '';
    const preferencesUrl = kind === 'marketing' && opts.preferencesUrl ? opts.preferencesUrl : '';

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
a{color:#15803d}
@media (max-width:600px){.wrap{padding:0!important}.box{border-radius:0!important;border-left:0!important;border-right:0!important}.pad{padding:28px 20px!important}.title{font-size:24px!important}}
@media (prefers-color-scheme:dark){
body,.bg{background:#09090b!important}
.box{background:#121214!important;border-color:#27272a!important}
.title,.strong{color:#fafafa!important}
.txt{color:#d4d4d8!important}
.muted{color:#a1a1aa!important}
.card,.code{background:#1c1c1f!important;color:#fafafa!important}
.btn2{color:#fafafa!important;border-color:#3f3f46!important}
.foot{background:#0d0d0f!important;border-color:#27272a!important}
a{color:${BRAND_GREEN}!important}
.cta{color:#000000!important}
}
</style>
</head>
<body class="bg" style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="bg" style="background:#f4f4f5">
<tr><td align="center" class="wrap" style="padding:32px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="box" style="max-width:600px;background:#ffffff;border:1px solid #e4e4e7;border-radius:20px;overflow:hidden">
<tr><td style="padding:24px 32px;background:#0a0a0a"><img src="${esc(origin)}/logo_full.png" alt="Newbi" height="24" style="display:block;height:24px;width:auto;max-width:170px;border:0" /></td></tr>
<tr><td class="pad" style="padding:36px 32px 12px">
${isPresent(model.eyebrow) ? `<p style="margin:0 0 14px"><span style="display:inline-block;padding:5px 10px;border-radius:8px;background:${BRAND_GREEN};color:#000000;font-size:11px;font-weight:800">${esc(model.eyebrow)}</span></p>` : ''}
${isPresent(model.title) ? `<h1 class="title" style="margin:0 0 18px;font-size:26px;line-height:1.25;font-weight:800;color:#09090b">${esc(model.title)}</h1>` : ''}
${blocks.map(b => renderBlock(b, ctx)).join('\n')}
${hasCta ? `<p style="margin:8px 0 28px"><a href="${esc(ctaHref)}" class="cta" style="display:inline-block;padding:15px 26px;border-radius:12px;background:${BRAND_GREEN};color:#000000;font-size:15px;font-weight:800;text-decoration:none">${esc(model.cta.label)}</a></p>` : ''}
</td></tr>
<tr><td class="foot" style="padding:22px 32px;background:#fafafa;border-top:1px solid #e4e4e7">
${isPresent(model.reason) ? `<p class="muted" style="margin:0 0 8px;font-size:12px;line-height:1.5;color:#71717a">${esc(model.reason)}</p>` : ''}
<p class="muted" style="margin:0;font-size:12px;line-height:1.5;color:#71717a">Newbi Entertainment &amp; Marketing LLP · <a href="${esc(origin)}" style="color:#71717a">newbi.live</a></p>
${kind === 'marketing' ? `<p class="muted" style="margin:8px 0 0;font-size:12px;line-height:1.5;color:#71717a"><a href="${esc(unsubscribeUrl)}" style="color:#71717a">Unsubscribe</a>${preferencesUrl ? ` · <a href="${esc(preferencesUrl)}" style="color:#71717a">Email preferences</a>` : ''}</p>` : ''}
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
        'Newbi Entertainment & Marketing LLP · newbi.live',
        kind === 'marketing' ? `Unsubscribe: ${unsubscribeUrl}` : '',
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
