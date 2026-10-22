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
 *   POST ?action=wa-number     {}                      the number's state at Meta (health, display name) and the last send
 *   POST ?action=wa-bulk       { template, language, campaignId?, recipients: [{ phone, name }], params }
 *        queues one approved template for many people (up to 500). The send queue
 *        (api/_lib/outreachQueue.js) sends them at the rate limit, retries, and holds
 *        them while Meta refuses the number, so they go out once it can send.
 *
 * Same roles as outreach (checked by the router in api/_lib/outreach.js).
 * Sends share the outreach rate limit and daily cap, skip numbers that asked
 * to stop (STOP), and land in each person's inbox thread.
 *
 * Env: WHATSAPP_WABA_ID (the WhatsApp Business Account id, for the template list).
 */
import { nowIso } from './db.js';
import { isWhatsAppConfigured, sendTemplate, toE164, imageHeaderFor } from './whatsapp.js';
import { acquireSlot, joinPayload, submitToken, enqueueJob, kickWorker, runQueue } from './outreachQueue.js';
import { appendThreadMessage, contactIdFor } from './outreachThreads.js';
import { maskPhone, firstNameOf } from '../../src/lib/outreach/normalize.js';
import { deadlineLineFor } from '../../src/lib/outreach/template.js';
import { fillTokens, missingTokens, FIELDS, JOIN_TEMPLATES } from '../../src/lib/outreach/waFields.js';
import { loadTeam } from './teamAlerts.js';
import { STOP_PAYLOAD } from '../../src/lib/outreach/whatsappTemplate.js';
import { APP_ORIGIN, OG_IMAGES } from '../../src/app/seo.js';

export const WA_CENTER_ACTIONS = new Set(['wa-templates', 'wa-team', 'wa-send', 'wa-log', 'wa-number', 'wa-bulk']);

const MAX_RECIPIENTS = 50;
const MAX_BULK = 500;
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
    const rawHeader = headerFor(tpl, params, rawBody);
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
        const header = headerFor(tpl, personParams, bodyParams);
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

/* ── Bulk: queue one template for many people ─────────────────────────── */

/* The template, checked with Meta, and the parts every person shares. Throws { status, field } for the form. */
const approvedTemplate = async ({ template, language }) => {
    if (!template) throw Object.assign(new Error('Pick a template.'), { status: 400, field: 'template' });
    const tpl = (await fetchTemplates()).find(t => t.name === template && (!language || t.language === language));
    if (!tpl) throw Object.assign(new Error('That template isn’t in WhatsApp Manager.'), { status: 404, field: 'template' });
    if (tpl.status !== 'APPROVED') throw Object.assign(new Error(`“${tpl.name}” is ${String(tpl.status).toLowerCase().replace('_', ' ')}, so it can’t be sent yet.`), { status: 409, field: 'template' });
    return tpl;
};

const handleBulk = async (req, res, { db, actor }) => {
    const { template, language, recipients = [], params = {} } = req.body || {};
    let tpl;
    try { tpl = await approvedTemplate({ template, language }); } catch (err) {
        if (!err.field) throw err;
        return send(res, err.status, { success: false, field: err.field, error: err.message });
    }
    const rawBody = Array.from({ length: tpl.bodyVars }, (_, i) => String(params.body?.[i] ?? '').trim());
    if (rawBody.some(v => !v)) return send(res, 400, { success: false, field: 'body', error: 'Fill in every variable.' });
    const rawHeader = headerFor(tpl, params, rawBody);
    if (rawHeader === 'missing') return send(res, 400, { success: false, field: 'header', error: 'This template needs a header: add its link or text.' });
    if (rawHeader === 'unsupported') return send(res, 400, { success: false, field: 'header', error: 'Video headers can’t be sent from here.' });
    if (buttonsFor(tpl, params).some(b => b.param === '')) return send(res, 400, { success: false, field: 'buttons', error: 'Fill in the link ending for each link button.' });
    if (!Array.isArray(recipients) || !recipients.length) return send(res, 400, { success: false, field: 'recipients', error: 'Choose who to send it to.' });
    if (recipients.length > MAX_BULK) return send(res, 400, { success: false, field: 'recipients', error: `Up to ${MAX_BULK} people at a time.` });

    const campaignId = String(params.campaignId || req.body?.campaignId || '').slice(0, 120) || null;
    const campaign = await campaignLoader(db)(campaignId);
    const createdBy = actor?.actorEmail || 'Newbi team';
    const queued = [];
    const skipped = [];
    const seen = new Set();
    for (const r of recipients) {
        const phone = toE164(r?.phone);
        const label = String(r?.name || '').trim() || (phone ? maskPhone(phone) : 'No number');
        if (!phone) { skipped.push({ label, error: 'No WhatsApp number' }); continue; }
        if (seen.has(phone)) continue;
        seen.add(phone);
        const values = valuesFor({ name: r?.name, campaign });
        const bodyParams = rawBody.map(v => fillTokens(v, values));
        const personParams = {
            ...params,
            headerText: params.headerText ? fillTokens(params.headerText, values) : params.headerText,
            buttons: Object.fromEntries(Object.entries(params.buttons || {}).map(([i, v]) => [i, fillTokens(v, values)])),
        };
        const missing = [...new Set([...bodyParams, personParams.headerText, ...Object.values(personParams.buttons)].flatMap(missingTokens))];
        if (missing.length) { skipped.push({ label, error: MISSING_WHY(missing) }); continue; }
        const header = headerFor(tpl, personParams, bodyParams);
        const id = await enqueueJob(db, {
            campaignId, kind: 'template', createdBy,
            data: { phone, name: r?.name || null, template: tpl.name, language: tpl.language, header: header || null, bodyParams, buttons: buttonsFor(tpl, personParams), text: fill(tpl.body, bodyParams) },
        });
        if (id) queued.push(label); else skipped.push({ label, error: 'Already waiting to go out' });
    }
    // Start sending now: in the background with CRON_SECRET, else a first batch in this request.
    let worker = { started: false };
    if (queued.length) worker = (await kickWorker(req, 0)) ? { started: true } : { started: false, report: await runQueue({ db, deadline: Date.now() + 20_000 }) };
    return send(res, 200, { success: true, queued: queued.length, skipped, worker });
};

/* ── The number's state at Meta ───────────────────────────────────────── */

const NUMBER_FIELDS = ['display_phone_number', 'verified_name', 'name_status', 'new_name_status', 'status', 'quality_rating',
    'whatsapp_business_manager_messaging_limit', 'messaging_limit_tier', 'health_status'];
// Fields every Graph version has, for when Meta refuses one of the newer ones.
const CORE_FIELDS = ['display_phone_number', 'verified_name', 'name_status', 'quality_rating', 'health_status'];

const fetchNumber = async () => {
    const doFetch = testFetch || fetch;
    const get = async (fields) => {
        const url = `https://graph.facebook.com/${graphVersion()}/${encodeURIComponent(process.env.WHATSAPP_PHONE_NUMBER_ID)}?fields=${fields.join(',')}`;
        const res = await doFetch(url, { headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` } });
        return { ok: res.ok, data: await res.json().catch(() => ({})), status: res.status };
    };
    let r = await get(NUMBER_FIELDS);
    if (!r.ok && Number(r.data?.error?.code) === 100) r = await get(CORE_FIELDS);
    if (!r.ok) throw Object.assign(new Error(r.data?.error?.message || `Meta answered ${r.status}`), { status: 502 });
    return r.data;
};

/* What Meta's health check says about each part (number, account, business, app), in words. */
const issuesOf = (health) => (health?.entities || []).flatMap((e) => {
    const texts = [
        ...(e.errors || []).map(x => ({ text: x.error_description || `Error ${x.error_code}`, fix: x.possible_solution || null, code: x.error_code || null })),
        ...[].concat(e.additional_info || []).filter(Boolean).map(text => ({ text: String(text), fix: null, code: null })),
    ];
    return texts.map(t => ({ entity: String(e.entity_type || '').toLowerCase().replace(/_/g, ' '), canSend: e.can_send_message || null, ...t }));
});

/* "TIER_1K" and the like; Meta has sent this both as a string and as { current_limit }. */
const limitOf = (n) => {
    const v = n.whatsapp_business_manager_messaging_limit;
    const raw = typeof v === 'string' ? v : v?.current_limit || n.messaging_limit_tier || null;
    return typeof raw === 'string' ? raw : null;
};

const NAME_OK = new Set(['APPROVED', 'AVAILABLE_WITHOUT_REVIEW']);
export const DISPLAY_NAME_ERROR = 131037;

/*
 * Can it send right now? Meta's health check and the name status can lag the
 * truth for a day or two, so the last real send counts most.
 * → { tone: 'green'|'amber'|'rose'|'gray', title, detail }
 */
export const verdictFor = ({ canSend = null, nameStatus = null, lastSend = null }) => {
    const nameBlocked = ['failed', 'held'].includes(lastSend?.status) && Number(lastSend.errorCode) === DISPLAY_NAME_ERROR;
    if (nameBlocked && (canSend !== 'AVAILABLE' || !NAME_OK.has(nameStatus))) {
        return { tone: 'rose', title: 'Not sending: the display name isn’t active yet', detail: 'Meta refuses every message until the number’s display name is approved. After approval it can take 1–2 business days to apply.' };
    }
    if (nameBlocked) {
        return { tone: 'amber', title: 'Meta now shows the name as approved', detail: 'The last message still failed on the display name. The next one will tell whether it has applied.' };
    }
    if (canSend === 'BLOCKED') return { tone: 'rose', title: 'Meta is blocking messages', detail: 'See what Meta says below.' };
    if (nameStatus && !NAME_OK.has(nameStatus)) return { tone: 'amber', title: 'Display name not approved yet', detail: 'Messages may be refused until Meta approves it.' };
    if (canSend === 'LIMITED') return { tone: 'amber', title: 'Sending, with limits', detail: 'Messages go out, with a lower daily limit. See what Meta says below.' };
    if (canSend === 'AVAILABLE') return { tone: 'green', title: 'Sending normally', detail: lastSend?.status && lastSend.status !== 'failed' ? 'The last message went through.' : 'Meta says this number can send.' };
    return { tone: 'gray', title: 'Status unknown', detail: 'Meta didn’t say whether this number can send.' };
};

/* The latest WhatsApp send that reached Meta's answer (sent, delivered, read or failed). */
const lastSendOf = async (db) => {
    const snap = await db.collection('message_log').orderBy('updatedAt', 'desc').limit(40).get();
    const m = snap.docs.map(d => d.data()).find(x => x.channel === 'whatsapp' && ['sent', 'delivered', 'read', 'failed', 'held'].includes(x.status));
    return m ? { status: m.status, at: m.updatedAt || m.createdAt || null, template: m.template || '', error: m.error || null, errorCode: m.errorCode || null } : null;
};

/* Messages waiting in the send queue, and how many are held because Meta refused them for now. */
const waitingOf = async (db) => {
    const snap = await db.collection('outreach_queue').where('status', '==', 'queued').get();
    const jobs = snap.docs.map(d => d.data()).filter(j => j.kind !== 'reminder');
    const held = jobs.filter(j => j.heldAt);
    const nextAt = jobs.map(j => j.nextAttemptAt).filter(Boolean).sort()[0] || null;
    return { waiting: jobs.length, held: held.length, nextAt };
};

const handleNumber = async (req, res, { db }) => {
    const [n, lastSend, queue] = await Promise.all([fetchNumber(), lastSendOf(db).catch(() => null), waitingOf(db).catch(() => null)]);
    const canSend = n.health_status?.can_send_message || null;
    return send(res, 200, {
        success: true,
        at: nowIso(),
        number: {
            phone: n.display_phone_number || '',
            verifiedName: n.verified_name || '',
            nameStatus: n.name_status || null,
            newNameStatus: n.new_name_status || null,
            status: n.status || null,
            quality: n.quality_rating || null,
            limit: limitOf(n),
            canSend,
            issues: issuesOf(n.health_status),
        },
        lastSend,
        queue,
        verdict: verdictFor({ canSend, nameStatus: n.name_status || null, lastSend }),
    });
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
        if (action === 'wa-number') return await handleNumber(req, res, ctx);
        if (action === 'wa-bulk') return await handleBulk(req, res, ctx);
    } catch (err) {
        if (err?.status) return send(res, err.status, { success: false, error: err.message });
        throw err;
    }
    return send(res, 400, { success: false, error: 'Unknown action.' });
};
