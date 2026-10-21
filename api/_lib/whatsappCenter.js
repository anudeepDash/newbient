/**
 * The admin WhatsApp center (src/pages/Admin/WhatsAppCenter.jsx): the
 * approved templates, the team to message, sending a template by hand, and a
 * log of everything sent (automatic or manual). The inbox itself is the
 * outreach inbox (api/_lib/outreachInbox.js).
 *
 *   POST ?action=wa-templates  {}                      templates from Meta, with their variables
 *   POST ?action=wa-team       {}                      team admins and whether they have a WhatsApp number
 *   POST ?action=wa-send       { template, language, recipients, params }   sends one template to each recipient
 *   POST ?action=wa-log        { limit? }              the latest sends from message_log
 *
 * Same roles as outreach (checked by the router in api/_lib/outreach.js).
 * Sends share the outreach rate limit and daily cap, skip numbers that asked
 * to stop (STOP), and land in each person's inbox thread.
 *
 * Env: WHATSAPP_WABA_ID (the WhatsApp Business Account id, for the template list).
 */
import { nowIso } from './db.js';
import { isWhatsAppConfigured, sendTemplate, toE164, imageHeaderFor } from './whatsapp.js';
import { acquireSlot } from './outreachQueue.js';
import { appendThreadMessage, contactIdFor } from './outreachThreads.js';
import { maskPhone } from '../../src/lib/outreach/normalize.js';
import { STOP_PAYLOAD } from '../../src/lib/outreach/whatsappTemplate.js';
import { APP_ORIGIN, OG_IMAGES } from '../../src/app/seo.js';

export const WA_CENTER_ACTIONS = new Set(['wa-templates', 'wa-team', 'wa-send', 'wa-log']);

const MAX_RECIPIENTS = 50;
const send = (res, status, body) => res.status(status).json(body);
const graphVersion = () => process.env.WHATSAPP_API_VERSION || 'v23.0';

let testFetch = null;
export const setCenterFetchForTests = (f) => { testFetch = f; };

/* A Meta template, reduced to what the send form needs. */
export const describeTemplate = (t) => {
    const comps = t.components || [];
    const header = comps.find(c => c.type === 'HEADER');
    const body = comps.find(c => c.type === 'BODY');
    const footer = comps.find(c => c.type === 'FOOTER');
    const buttons = comps.find(c => c.type === 'BUTTONS')?.buttons || [];
    const varsIn = (text) => Math.max(0, ...[...String(text || '').matchAll(/\{\{(\d+)\}\}/g)].map(m => Number(m[1])));
    return {
        name: t.name,
        language: t.language,
        status: t.status,
        category: t.category,
        header: header ? { format: header.format, text: header.text || '', vars: varsIn(header.text) } : null,
        body: body?.text || '',
        bodyVars: varsIn(body?.text),
        examples: body?.example?.body_text?.[0] || [],
        footer: footer?.text || '',
        buttons: buttons.map((b, index) => ({ index, type: b.type, text: b.text || '', url: b.url || '', dynamic: b.type === 'URL' && /\{\{1\}\}/.test(b.url || '') })),
    };
};

const fetchTemplates = async () => {
    const waba = process.env.WHATSAPP_WABA_ID;
    if (!waba) throw Object.assign(new Error('WHATSAPP_WABA_ID is not set.'), { status: 503 });
    const doFetch = testFetch || fetch;
    const url = `https://graph.facebook.com/${graphVersion()}/${encodeURIComponent(waba)}/message_templates?fields=name,status,category,language,components&limit=200`;
    const res = await doFetch(url, { headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data?.error?.message || `Meta answered ${res.status}`), { status: 502 });
    return (data.data || []).map(describeTemplate).sort((a, b) => a.name.localeCompare(b.name));
};

/* Team admins (the admins collection, not pending requests) with a WhatsApp number from their admin record or account. */
const loadTeam = async (db) => {
    const snap = await db.collection('admins').get();
    const admins = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(a => a.role && a.role !== 'pending' && a.role !== 'unauthorized');
    return Promise.all(admins.map(async (a) => {
        let phone = toE164(a.phone);
        let name = a.displayName && a.displayName !== 'UNNAMED_MEMBER' ? a.displayName : '';
        if ((!phone || !name) && a.email) {
            const u = await db.collection('users').where('email', '==', String(a.email).toLowerCase()).limit(1).get().catch(() => null);
            const user = u && !u.empty ? u.docs[0].data() : {};
            phone = phone || toE164(user.phoneVerified ? (user.phone || user.phoneNumber) : null);
            name = name || user.displayName || '';
        }
        return { id: a.id, name: name || String(a.email || '').split('@')[0], email: a.email || '', role: a.role, phone };
    }));
};

/* The header a send needs, from what the template was approved with. */
const headerFor = (tpl, params, bodyParams) => {
    const fmt = tpl.header?.format;
    const url = /^https:\/\//.test(String(params.headerUrl || '')) ? String(params.headerUrl) : '';
    if (fmt === 'IMAGE') return { type: 'image', link: url || imageHeaderFor(tpl.name, bodyParams)?.link || `${APP_ORIGIN}${OG_IMAGES.app.path}` };
    if (fmt === 'DOCUMENT') return url ? { type: 'document', link: url, filename: String(params.headerFilename || 'document.pdf').slice(0, 120) } : 'missing';
    if (fmt === 'VIDEO') return 'unsupported';
    if (fmt === 'TEXT' && tpl.header.vars) return params.headerText ? { type: 'text', text: String(params.headerText) } : 'missing';
    return null;
};

const buttonsFor = (tpl, params) => tpl.buttons.flatMap((b) => {
    if (b.dynamic) return [{ index: b.index, param: String(params.buttons?.[b.index] || '').trim() }];
    // "Stop updates" opts the number out (api/_lib/outreachQueue.js); other quick replies come back as a reply.
    if (b.type === 'QUICK_REPLY') return [{ index: b.index, payload: /stop/i.test(b.text) ? STOP_PAYLOAD : 'm1' }];
    return [];
});

const fill = (text, values) => String(text || '').replace(/\{\{(\d+)\}\}/g, (_, n) => values[Number(n) - 1] ?? '');

const handleSend = async (req, res, { db, actor }) => {
    const { template, language, recipients = [], params = {} } = req.body || {};
    if (!template) return send(res, 400, { success: false, field: 'template', error: 'Pick a template.' });
    const templates = await fetchTemplates();
    const tpl = templates.find(t => t.name === template && (!language || t.language === language));
    if (!tpl) return send(res, 404, { success: false, field: 'template', error: 'That template isn’t in WhatsApp Manager.' });
    if (tpl.status !== 'APPROVED') return send(res, 409, { success: false, field: 'template', error: `“${tpl.name}” is ${String(tpl.status).toLowerCase().replace('_', ' ')}, so it can’t be sent yet.` });

    const bodyParams = Array.from({ length: tpl.bodyVars }, (_, i) => String(params.body?.[i] ?? '').trim());
    if (bodyParams.some(v => !v)) return send(res, 400, { success: false, field: 'body', error: 'Fill in every variable.' });
    const header = headerFor(tpl, params, bodyParams);
    if (header === 'missing') return send(res, 400, { success: false, field: 'header', error: 'This template needs a header: add its link or text.' });
    if (header === 'unsupported') return send(res, 400, { success: false, field: 'header', error: 'Video headers can’t be sent from here.' });
    const buttons = buttonsFor(tpl, params);
    if (buttons.some(b => b.param === '')) return send(res, 400, { success: false, field: 'buttons', error: 'Fill in the link ending for each link button.' });

    const team = recipients.some(r => r?.type === 'team') ? await loadTeam(db) : [];
    const people = [];
    const seen = new Set();
    for (const r of recipients.slice(0, MAX_RECIPIENTS * 2)) {
        const member = r?.type === 'team' ? team.find(m => m.id === r.id) : null;
        const phone = member ? member.phone : toE164(r?.phone);
        const label = member ? member.name : (phone ? maskPhone(phone) : String(r?.phone || '').slice(0, 20));
        if (!phone) { people.push({ label, status: 'skipped', error: 'No WhatsApp number' }); continue; }
        if (seen.has(phone)) continue;
        seen.add(phone);
        people.push({ label, phone, name: member?.name || null });
    }
    if (people.filter(p => p.phone).length > MAX_RECIPIENTS) return send(res, 400, { success: false, field: 'recipients', error: `Send to ${MAX_RECIPIENTS} people or fewer at a time.` });

    const sentBy = actor?.actorEmail || 'Newbi team';
    const text = fill(tpl.body, bodyParams);
    const results = [];
    for (const p of people) {
        if (!p.phone) { results.push(p); continue; }
        const contact = await db.collection('creator_contacts').doc(contactIdFor(p.phone)).get();
        if (contact.exists && contact.data().whatsappOptOut?.at) { results.push({ label: p.label, status: 'skipped', error: 'Asked to stop WhatsApp updates' }); continue; }
        const slot = await acquireSlot(db);
        if (!slot.ok) {
            results.push({ label: p.label, status: 'skipped', error: slot.capped ? 'Today’s WhatsApp limit is reached' : 'Sending too fast: try the rest in a minute' });
            continue;
        }
        const r = await sendTemplate({
            to: p.phone, template: tpl.name, language: tpl.language, header: header || undefined, bodyParams, buttons,
            event: 'admin-manual', autoRetry: false,
        });
        if (r.ok) {
            await appendThreadMessage(db, { phone: p.phone, name: p.name, direction: 'out', type: 'template', text, wamid: r.messageId, status: 'sent', sentBy }).catch(() => null);
        }
        results.push({ label: p.label, status: r.ok ? 'sent' : 'failed', error: r.ok ? null : r.error });
    }
    const sent = results.filter(r => r.status === 'sent').length;
    return send(res, 200, { success: true, sent, results });
};

const handleLog = async (req, res, { db }) => {
    const limit = Math.min(200, Math.max(1, Number(req.body?.limit) || 100));
    const snap = await db.collection('message_log').orderBy('updatedAt', 'desc').limit(limit * 2).get();
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(m => m.channel === 'whatsapp')
        .slice(0, limit)
        .map(m => ({
            id: m.id,
            at: m.createdAt || m.updatedAt,
            to: m.to ? maskPhone(m.to) : '',
            template: m.template || '',
            event: m.event || '',
            status: m.status || '',
            error: m.error || null,
        }));
    return send(res, 200, { success: true, rows });
};

export const handleWhatsAppCenterAction = async (action, req, res, ctx) => {
    if (action !== 'wa-log' && !isWhatsAppConfigured()) return send(res, 503, { success: false, error: 'The WhatsApp API isn’t set up.' });
    try {
        if (action === 'wa-templates') return send(res, 200, { success: true, templates: await fetchTemplates(), at: nowIso() });
        if (action === 'wa-team') {
            const team = await loadTeam(ctx.db);
            return send(res, 200, { success: true, team: team.map(m => ({ id: m.id, name: m.name, role: m.role, email: m.email, phone: m.phone ? maskPhone(m.phone) : null })) });
        }
        if (action === 'wa-send') return await handleSend(req, res, ctx);
        if (action === 'wa-log') return await handleLog(req, res, ctx);
    } catch (err) {
        if (err?.status) return send(res, err.status, { success: false, error: err.message });
        throw err;
    }
    return send(res, 400, { success: false, error: 'Unknown action.' });
};
