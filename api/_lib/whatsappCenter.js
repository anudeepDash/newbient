/**
 * The admin WhatsApp center (src/pages/Admin/WhatsAppCenter.jsx): the
 * approved templates, the team to message, sending a template by hand, and a
 * log of everything sent (automatic or manual). The inbox itself is the
 * outreach inbox (api/_lib/outreachInbox.js).
 *
 *   POST ?action=wa-templates  {}                      templates from Meta, with their variables
 *   POST ?action=wa-team       {}                      team admins and whether they have a WhatsApp number
 *   POST ?action=wa-send       { template, language, recipients, params }   sends one template to each recipient
 *        recipients: { type: 'team', id } | { type: 'phone', phone } | { type: 'applicant', campaignId, appId }
 *        params: { body: [...], buttons: {index: ending}, headerUrl?, headerText?, campaignId? }
 *        A value like {first_name} or {campaign_title} is filled in for each person (src/lib/outreach/waFields.js).
 *   POST ?action=wa-log        { limit? }              the latest sends from message_log
 *
 * Same roles as outreach (checked by the router in api/_lib/outreach.js).
 * Sends share the outreach rate limit and daily cap, skip numbers that asked
 * to stop (STOP), and land in each person's inbox thread.
 *
 * Env: WHATSAPP_WABA_ID (the WhatsApp Business Account id, for the template list).
 */
import { nowIso } from './db.js';
import { isWhatsAppConfigured, sendTemplate, toE164, imageHeaderFor, headerImageUrl, campaignImageOf } from './whatsapp.js';
import { acquireSlot, joinPayload, submitToken } from './outreachQueue.js';
import { appendThreadMessage, contactIdFor } from './outreachThreads.js';
import { maskPhone, firstNameOf } from '../../src/lib/outreach/normalize.js';
import { deadlineLineFor } from '../../src/lib/outreach/template.js';
import { fillTokens, missingTokens, FIELDS, JOIN_TEMPLATES } from '../../src/lib/outreach/waFields.js';
import { loadTeam } from './teamAlerts.js';
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

/* The header a send needs, from what the template was approved with. An image header shows the link typed
   in, else the person's campaign picture, else the template's card. */
const headerFor = (tpl, params, campaign = null) => {
    const fmt = tpl.header?.format;
    const url = /^https:\/\//.test(String(params.headerUrl || '')) ? String(params.headerUrl) : '';
    const picture = campaignImageOf(campaign);
    if (fmt === 'IMAGE') return { type: 'image', link: url || imageHeaderFor(tpl.name, picture)?.link || headerImageUrl(picture) || `${APP_ORIGIN}${OG_IMAGES.app.path}` };
    if (fmt === 'DOCUMENT') return url ? { type: 'document', link: url, filename: String(params.headerFilename || 'document.pdf').slice(0, 120) } : 'missing';
    if (fmt === 'VIDEO') return 'unsupported';
    if (fmt === 'TEXT' && tpl.header.vars) return params.headerText ? { type: 'text', text: String(params.headerText) } : 'missing';
    return null;
};

/* `join`: an applicant's signed "Joined" payload, for the shortlist and reminder templates. */
const buttonsFor = (tpl, params, { join = null } = {}) => tpl.buttons.flatMap((b) => {
    if (b.dynamic) return [{ index: b.index, param: String(params.buttons?.[b.index] || '').trim() }];
    // "Stop updates" opts the number out (api/_lib/outreachQueue.js); "Joined" marks an applicant joined; other quick replies come back as a reply.
    if (b.type === 'QUICK_REPLY') return [{ index: b.index, payload: /stop/i.test(b.text) ? STOP_PAYLOAD : (join && /join/i.test(b.text) ? join : 'm1') }];
    return [];
});

/* A campaign's details for {campaign_title}, {group_link} and the like (cached for one send). */
const campaignLoader = (db) => {
    const cache = new Map();
    return (campaignId) => {
        if (!campaignId) return Promise.resolve(null);
        if (!cache.has(campaignId)) {
            const ref = db.collection('campaigns').doc(campaignId);
            cache.set(campaignId, Promise.all([ref.get(), ref.collection('private').doc('outreach').get()]).then(([c, p]) => (c.exists ? {
                id: campaignId, ...c.data(), groupLink: p.exists ? p.data().whatsappGroupLink || '' : '',
            } : null)));
        }
        return cache.get(campaignId);
    };
};

/* The values a person's {tokens} are filled from. */
const valuesFor = ({ name, campaign, application, appId }) => ({
    first_name: firstNameOf(name) || 'there',
    full_name: String(name || '').trim() || 'there',
    ...(campaign ? {
        campaign_title: String(campaign.title || '').trim(),
        group_link: campaign.groupLink,
        deadline_line: deadlineLineFor(campaign) || 'Details are in the group.',
        campaign_id: campaign.id,
    } : {}),
    ...(application ? { city: String(application.city || '').trim(), submit_token: submitToken(campaign?.id, appId) } : {}),
});

const MISSING_WHY = (keys) => `No ${keys.map(k => (FIELDS[k]?.label || k).toLowerCase()).join(', ')} for them`;

const fill = (text, values) => String(text || '').replace(/\{\{(\d+)\}\}/g, (_, n) => values[Number(n) - 1] ?? '');

/*
 * An applicant messaged from here: an audit line on their application, and
 * the shortlist template moves them on to "Messaged" like the API queue does.
 */
const noteApplicantSent = async (db, p, { template, sentBy, join }) => {
    const appRef = db.collection('campaigns').doc(p.campaign.id).collection('applications').doc(p.appId);
    const auditRef = db.collection('campaigns').doc(p.campaign.id).collection('audit').doc();
    const at = nowIso();
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(appRef);
        const from = snap.data()?.status || 'applied';
        const move = join && ['shortlisted', 'message_queued'].includes(from);
        if (move) tx.update(appRef, { status: 'message_sent', statusUpdatedAt: at, statusUpdatedBy: sentBy, messageSentAt: at, messageSentBy: sentBy, updatedAt: at });
        tx.set(auditRef, {
            appId: p.appId, field: move ? 'status' : 'whatsapp', from: move ? from : null, to: move ? 'message_sent' : 'sent',
            source: 'whatsapp_center', note: `Sent “${template}” from the WhatsApp center`, actorUid: null, actorEmail: sentBy, at,
        });
    });
};

const handleSend = async (req, res, { db, actor }) => {
    const { template, language, recipients = [], params = {} } = req.body || {};
    if (!template) return send(res, 400, { success: false, field: 'template', error: 'Pick a template.' });
    const templates = await fetchTemplates();
    const tpl = templates.find(t => t.name === template && (!language || t.language === language));
    if (!tpl) return send(res, 404, { success: false, field: 'template', error: 'That template isn’t in WhatsApp Manager.' });
    if (tpl.status !== 'APPROVED') return send(res, 409, { success: false, field: 'template', error: `“${tpl.name}” is ${String(tpl.status).toLowerCase().replace('_', ' ')}, so it can’t be sent yet.` });

    const rawBody = Array.from({ length: tpl.bodyVars }, (_, i) => String(params.body?.[i] ?? '').trim());
    if (rawBody.some(v => !v)) return send(res, 400, { success: false, field: 'body', error: 'Fill in every variable.' });
    const rawHeader = headerFor(tpl, params);
    if (rawHeader === 'missing') return send(res, 400, { success: false, field: 'header', error: 'This template needs a header: add its link or text.' });
    if (rawHeader === 'unsupported') return send(res, 400, { success: false, field: 'header', error: 'Video headers can’t be sent from here.' });
    if (buttonsFor(tpl, params).some(b => b.param === '')) return send(res, 400, { success: false, field: 'buttons', error: 'Fill in the link ending for each link button.' });

    const team = recipients.some(r => r?.type === 'team') ? await loadTeam(db) : [];
    const campaignOf = campaignLoader(db);
    const formCampaign = await campaignOf(String(params.campaignId || '').slice(0, 120) || null);
    const people = [];
    const seen = new Set();
    for (const r of recipients.slice(0, MAX_RECIPIENTS * 2)) {
        const key = r?.type === 'team' ? `team:${r.id}` : r?.type === 'applicant' ? `app:${r.campaignId}:${r.appId}` : `phone:${r?.phone}`;
        let person;
        if (r?.type === 'applicant') {
            const campaign = await campaignOf(String(r.campaignId || '').slice(0, 120));
            const snap = campaign ? await db.collection('campaigns').doc(campaign.id).collection('applications').doc(String(r.appId || '').slice(0, 120)).get() : null;
            const app = snap?.exists ? snap.data() : null;
            if (!app) { people.push({ key, label: 'Unknown applicant', status: 'skipped', error: 'Application not found' }); continue; }
            person = { key, phone: toE164(app.phone), label: app.fullName || maskPhone(app.phone), name: app.fullName || null, campaign, application: app, appId: snap.id };
        } else if (r?.type === 'team') {
            const member = team.find(m => m.id === r.id);
            person = { key, phone: member?.phone || null, label: member?.name || 'Team member', name: member?.name || null, campaign: formCampaign };
        } else {
            const phone = toE164(r?.phone);
            const thread = phone ? await db.collection('outreach_inbox').doc(contactIdFor(phone)).get() : null;
            person = { key, phone, label: phone ? maskPhone(phone) : String(r?.phone || '').slice(0, 20), name: thread?.exists ? thread.data().name || null : null, campaign: formCampaign };
        }
        if (!person.phone) { people.push({ key, label: person.label, status: 'skipped', error: 'No WhatsApp number' }); continue; }
        if (seen.has(person.phone)) continue;
        seen.add(person.phone);
        people.push(person);
    }
    if (people.filter(p => p.phone).length > MAX_RECIPIENTS) return send(res, 400, { success: false, field: 'recipients', error: `Send to ${MAX_RECIPIENTS} people or fewer at a time.` });

    const sentBy = actor?.actorEmail || 'Newbi team';
    const results = [];
    for (const p of people) {
        if (!p.phone) { results.push(p); continue; }
        // Their own values for {first_name}, {campaign_title}…
        const values = valuesFor(p);
        const bodyParams = rawBody.map(v => fillTokens(v, values));
        const personParams = {
            ...params,
            headerText: params.headerText ? fillTokens(params.headerText, values) : params.headerText,
            buttons: Object.fromEntries(Object.entries(params.buttons || {}).map(([i, v]) => [i, fillTokens(v, values)])),
        };
        const missing = [...new Set([...bodyParams, personParams.headerText, ...Object.values(personParams.buttons)].flatMap(missingTokens))];
        if (missing.length) { results.push({ key: p.key, label: p.label, status: 'skipped', error: MISSING_WHY(missing) }); continue; }
        const contact = await db.collection('creator_contacts').doc(contactIdFor(p.phone)).get();
        if (contact.exists && contact.data().whatsappOptOut?.at) { results.push({ key: p.key, label: p.label, status: 'skipped', error: 'Asked to stop WhatsApp updates' }); continue; }
        const slot = await acquireSlot(db);
        if (!slot.ok) {
            results.push({ key: p.key, label: p.label, status: 'skipped', retry: !slot.capped, error: slot.capped ? 'Today’s WhatsApp limit is reached' : 'Sending too fast: send the rest in a minute' });
            continue;
        }
        const header = headerFor(tpl, personParams, p.campaign);
        const join = p.application && JOIN_TEMPLATES.has(tpl.name) ? joinPayload(p.campaign.id, p.appId) : null;
        const r = await sendTemplate({
            to: p.phone, template: tpl.name, language: tpl.language, header: header || undefined, bodyParams, buttons: buttonsFor(tpl, personParams, { join }),
            event: 'admin-manual', autoRetry: false,
            // An applicant's badge in the Outreach tab follows sent → delivered → read.
            ref: p.application ? { collection: `campaigns/${p.campaign.id}/applications`, id: p.appId } : null,
        });
        if (r.ok) {
            await appendThreadMessage(db, {
                phone: p.phone, name: p.name, direction: 'out', type: 'template', text: fill(tpl.body, bodyParams), wamid: r.messageId, status: 'sent', sentBy,
                ...(p.application ? { campaignId: p.campaign.id, appId: p.appId } : {}),
            }).catch(() => null);
            if (p.application) await noteApplicantSent(db, p, { template: tpl.name, sentBy, join: Boolean(join) }).catch(() => null);
        }
        results.push({ key: p.key, label: p.label, status: r.ok ? 'sent' : 'failed', error: r.ok ? null : r.error });
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
