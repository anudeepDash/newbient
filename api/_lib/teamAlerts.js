/**
 * WhatsApp alerts to the Newbi team (admins), and the team list the WhatsApp
 * center shows. A team member's number is the `phone` on their admin record,
 * else the verified phone on their app account (matched by email).
 *
 *   await sendTeamAlert(db, { roles: TICKET_TEAM, template: 'team_order_alert', bodyParams: [...] })
 *
 * Nothing is sent until the template is approved and its WHATSAPP_TEMPLATE_*
 * setting is on. Alerts never throw: they report what happened.
 */
import { isTemplateLive, isWhatsAppConfigured, sendTemplate, toE164 } from './whatsapp.js';

const FULL_ACCESS = ['developer', 'super_admin', 'founder'];
// Who hears about new ticket orders: the ticketing admins (gate_manager, and its older name scanner) and full access.
export const TICKET_TEAM = ['gate_manager', 'scanner', ...FULL_ACCESS];
// Who hears about new enquiries.
export const LEADS_TEAM = ['admin', ...FULL_ACCESS];

const ROLE_LABELS = {
    developer: 'Developer', super_admin: 'Super admin', founder: 'Founder', admin: 'Admin', editor: 'Editor',
    content_admin: 'Content admin', gate_manager: 'Ticketing admin', scanner: 'Ticketing admin', blog_writer: 'Blog writer',
};
export const roleLabel = (role) => ROLE_LABELS[role] || String(role || 'Team member').replace(/_/g, ' ');

/** One admin record → { name, phone } using the admin's own phone or their verified account phone. */
export const contactForAdmin = async (db, admin) => {
    let phone = toE164(admin.phone);
    let name = admin.displayName && admin.displayName !== 'UNNAMED_MEMBER' ? admin.displayName : '';
    if ((!phone || !name) && admin.email) {
        const u = await db.collection('users').where('email', '==', String(admin.email).toLowerCase()).limit(1).get().catch(() => null);
        const user = u && !u.empty ? u.docs[0].data() : {};
        phone = phone || toE164(user.phoneVerified ? (user.phone || user.phoneNumber) : null);
        name = name || user.displayName || '';
    }
    return { name: name || String(admin.email || '').split('@')[0], phone };
};

/** The approved team (not pending requests), optionally only some roles. */
export const loadTeam = async (db, { roles = null } = {}) => {
    const snap = await db.collection('admins').get();
    const admins = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(a => a.role && a.role !== 'pending' && a.role !== 'unauthorized')
        .filter(a => !roles || roles.includes(a.role));
    return Promise.all(admins.map(async (a) => ({ id: a.id, email: a.email || '', role: a.role, ...(await contactForAdmin(db, a)) })));
};

/** Sends one template to every team member in `roles` who has a WhatsApp number. → { sent, skipped } */
export const sendTeamAlert = async (db, { roles, template, bodyParams = [], buttons = [], event = 'team-alert' }) => {
    if (!isWhatsAppConfigured() || !isTemplateLive(template)) return { sent: 0, skipped: 'template not live' };
    try {
        const team = (await loadTeam(db, { roles })).filter(m => m.phone);
        const seen = new Set();
        let sent = 0;
        for (const m of team) {
            if (seen.has(m.phone)) continue;
            seen.add(m.phone);
            const r = await sendTemplate({ to: m.phone, template, bodyParams, buttons, event, autoRetry: false });
            if (r.ok) sent += 1;
        }
        return { sent };
    } catch (err) {
        console.warn(`[TEAM ALERT] ${template} not sent:`, err.message);
        return { sent: 0, skipped: err.message };
    }
};
