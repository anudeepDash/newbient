import { isPresent } from '../../../lib/present';
import { creatorPassId } from '../format';

/*
 * How a campaign takes applications (set in the admin campaign editor):
 *   'newbi'  1-click apply with the creator's Newbi ID (the default)
 *   'form'   the campaign's Google Form, opened inside the app
 *   'both'   either
 */
export const applyMethodOf = (c) => (['form', 'both'].includes(c?.applyMethod) && isPresent(c?.applyFormUrl) ? c.applyMethod : 'newbi');

const KEYS = ['name', 'email', 'phone', 'instagram', 'followers', 'city', 'newbiId'];
// A Google "pre-filled link" keeps the placeholder URL-encoded ({name} → %7Bname%7D), so match both.
const PLACEHOLDER = new RegExp(`(?:\\{|%7B)(${KEYS.join('|')})(?:\\}|%7D)`, 'gi');

/* What we know about the person, for the form's placeholders. Unknown values become empty answers. */
export const formValuesFor = ({ creator, profile }) => ({
    name: creator?.name || profile?.name || '',
    email: profile?.email || creator?.email || '',
    phone: profile?.phone || creator?.phone || '',
    instagram: creator?.instagram ? `@${String(creator.instagram).replace(/^@/, '')}` : '',
    followers: creator?.instagramFollowers ? String(creator.instagramFollowers) : '',
    city: creator?.city || profile?.city || '',
    newbiId: creatorPassId(creator) || '',
});

/* The campaign's form link with the placeholders filled in; `embed` adds Google's embedded view. */
export const googleFormUrl = (raw, values = {}, { embed = false } = {}) => {
    const filled = String(raw || '').trim().replace(PLACEHOLDER, (_, key) => {
        const k = KEYS.find(x => x.toLowerCase() === key.toLowerCase());
        return encodeURIComponent(values[k] ?? '');
    });
    try {
        const url = new URL(filled);
        if (url.protocol !== 'https:') return null;
        if (embed && url.hostname === 'docs.google.com') url.searchParams.set('embedded', 'true');
        return url.toString();
    } catch {
        return null;
    }
};
