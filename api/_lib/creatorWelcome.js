/**
 * The WhatsApp welcome for someone who registers on the creator portal: their
 * city's creators community, as a "Join the community" button
 * (creator_welcome_city; the button opens app.newbi.live/wa/g/<invite code>).
 *
 * Once per creator, ever: the job id is fixed (welcome_city_<uid>), so saving
 * the profile again never sends a second one. It goes through the outreach
 * queue (kind 'template'), so it keeps to the rate limit and skips numbers
 * that replied STOP; it's sent right away when the limit has room, else the
 * worker or the daily cron sends it. Creators who turned WhatsApp off in the
 * app are left out. Nothing happens until WHATSAPP_TEMPLATE_CREATOR_WELCOME_CITY is set.
 */
import { getDb } from './db.js';
import { imageHeaderFor, isTemplateLive, isWhatsAppConfigured, toE164 } from './whatsapp.js';
import { enqueueJob, sendSoon } from './outreachQueue.js';
import { firstNameOf } from '../../src/lib/outreach/normalize.js';
import { groupCodeOf, STOP_PAYLOAD, WELCOME_CITY_TEMPLATE, WELCOME_CITY_BODY } from '../../src/lib/outreach/whatsappTemplate.js';

export const welcomeJobId = (uid) => `welcome_city_${uid}`.slice(0, 140);

/**
 * creator: the saved profile; cityGroup: { city, groupUrl } (resolveCityWhatsAppGroup in api/creator-join.js).
 * → 'queued' | 'sent' | …the sendJob outcome, or the reason it wasn't queued:
 *   'off' | 'no_number' | 'no_group' | 'whatsapp_off' | 'already'
 */
export const queueCityWelcome = async ({ db = getDb(), uid, creator = {}, cityGroup = null }) => {
    if (!uid || !isWhatsAppConfigured() || !isTemplateLive(WELCOME_CITY_TEMPLATE)) return 'off';
    const phone = toE164(creator.whatsapp || creator.phone);
    if (!phone) return 'no_number';
    const code = groupCodeOf(cityGroup?.groupUrl || cityGroup?.url);
    if (!code) return 'no_group';
    const user = await db.collection('users').doc(uid).get().catch(() => null);
    const prefs = { ...(creator.channelPrefs || {}), ...(user?.exists ? user.data().channelPrefs || {} : {}) };
    if (prefs.whatsapp === false) return 'whatsapp_off';
    const name = String(creator.displayName || creator.name || '').trim();
    const city = String(cityGroup.city || creator.city || '').trim() || 'your city';
    const bodyParams = [firstNameOf(name) || 'there', city];
    const id = await enqueueJob(db, {
        id: welcomeJobId(uid),
        kind: 'template',
        createdBy: 'Creator sign-up',
        data: {
            phone, name: name || null, template: WELCOME_CITY_TEMPLATE, language: null,
            header: imageHeaderFor(WELCOME_CITY_TEMPLATE),
            bodyParams,
            buttons: [{ index: 0, param: code }, { index: 1, payload: STOP_PAYLOAD }],
            text: WELCOME_CITY_BODY.replace(/\{\{(\d+)\}\}/g, (_, n) => bodyParams[Number(n) - 1] ?? ''),
        },
    });
    if (!id) return 'already';
    return sendSoon(db, id).catch(() => 'queued');
};
