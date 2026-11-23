/**
 * Outreach → Message → Email details: the team emails one creator the campaign's
 * details (template campaign-details), for creators who ask to have them in
 * writing. Any email address the team pastes; the name is looked up on the
 * campaign's outreach list when it's left empty.
 *
 * Action: outreach-email-details { campaignId, email, name?, reward?, note?, include? }
 *   include: { event, rewards, deliverables, group } (all on unless set false)
 *   → { sent: true, to } · 400 bad email · 502 the email didn't go
 *
 * Built from the stored campaign (src/lib/outreach/campaignDetails.js), its group
 * link (Message setup, else the editor's) and the linked event. Logged in the
 * campaign's audit.
 */
import { APP_URL, istDate } from './db.js';
import { normalizeEmail, isValidEmail } from './mailing.js';
import { sendTransactional } from './mail/send.js';
import { campaignDetailsData, MAX_NOTE } from '../../src/lib/outreach/campaignDetails.js';

const send = (res, status, body) => res.status(status).json(body);
const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);

export const handleEmailDetails = async (req, res, { db, actor }) => {
    const b = req.body || {};
    const campaignId = str(b.campaignId, 120);
    const email = normalizeEmail(b.email);
    if (!isValidEmail(email)) return send(res, 400, { success: false, field: 'email', error: 'Paste a valid email address.' });
    const campRef = campaignId ? db.collection('campaigns').doc(campaignId) : null;
    const campSnap = campRef ? await campRef.get() : null;
    if (!campSnap?.exists) return send(res, 404, { success: false, error: 'Campaign not found.' });
    const campaign = campSnap.data();

    const [privSnap, eventSnap, apps] = await Promise.all([
        campRef.collection('private').doc('outreach').get(),
        campaign.eventId ? db.collection('upcoming_events').doc(String(campaign.eventId)).get() : null,
        str(b.name) ? null : campRef.collection('applications').where('email', '==', email).limit(1).get(),
    ]);
    const ev = eventSnap?.exists ? eventSnap.data() : null;
    // A Timestamp as its day in India (midnight IST is the evening before in UTC).
    const toDay = (d) => (d?.toDate ? istDate(d.toDate()) : d);
    const include = Object.fromEntries(['event', 'rewards', 'deliverables', 'group'].map(k => [k, b.include?.[k] !== false]));
    const data = campaignDetailsData(campaign, {
        name: str(b.name, 80) || apps?.docs?.[0]?.data()?.fullName || '',
        reward: str(b.reward, 200),
        note: str(b.note, MAX_NOTE),
        include,
        groupLink: privSnap.data()?.whatsappGroupLink || campaign.whatsappLink || '',
        event: ev ? { title: ev.title, date: toDay(ev.date), time: ev.time, venue: ev.location || ev.venue } : null,
        campaignUrl: `${APP_URL}/c/${encodeURIComponent(campaignId)}`,
    });

    // Keyed by the minute, so a double click sends one email; the team can send it again later.
    const minute = new Date().toISOString().slice(0, 16);
    const result = await sendTransactional('campaign-details', email, data, {
        ref: { collection: 'campaigns', id: campaignId },
        idempotencyKey: `campaign_details_${campaignId}_${email}_${minute}`,
    });
    if (!result.ok) return send(res, 502, { success: false, error: result.status === 'skipped' ? 'Paste a valid email address.' : 'The email didn’t go. Please try again in a minute.' });

    await campRef.collection('audit').doc().set({
        appId: apps?.docs?.[0]?.id || null, field: 'details_email', from: null, to: email, source: 'admin',
        note: `Campaign details emailed to ${email}`, ...actor, at: new Date().toISOString(),
    }).catch(() => {});
    return send(res, 200, { success: true, sent: true, to: email, duplicate: result.status === 'duplicate' });
};
