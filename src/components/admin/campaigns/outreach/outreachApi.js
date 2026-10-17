import { auth } from '../../../../lib/firebase';
import { appUrl } from '../../../../app/host';

/*
 * The admin side of campaign outreach (api/_lib/outreach.js through
 * api/creator-join.js). Applications, phones and emails are only ever read
 * through these calls, which check the admin role on the server.
 *
 * Resolves to { ok: true, data } or { ok: false, status, error, field }.
 */
export async function callOutreach(action, body = {}) {
    try {
        const token = await auth?.currentUser?.getIdToken?.().catch(() => null);
        const res = await fetch(`/api/creator-join?action=${encodeURIComponent(action)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ ...body, action }),
        });
        let data = null;
        try { data = await res.json(); } catch { /* not JSON */ }
        if (res.ok && data?.success) return { ok: true, data };
        return { ok: false, status: res.status, error: data?.error || 'Something went wrong. Please try again.', field: data?.field || null };
    } catch {
        return { ok: false, status: 0, error: 'Check your connection and try again.' };
    }
}

/* Roles that see applications and contact details (the server checks the same list). */
export const OUTREACH_ROLES = ['founder', 'super_admin', 'developer', 'admin'];
export const canSeeOutreach = (role) => OUTREACH_ROLES.includes(role);

/* The public form's full link: app.newbi.live in production, this origin in dev and previews. */
export const applyUrlFor = (slug) => {
    const path = appUrl(`/c/${encodeURIComponent(slug)}/apply`);
    return /^https?:/.test(path) ? path : `${window.location.origin}${path}`;
};
