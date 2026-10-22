import { isPresent } from '../../lib/present';
import { t } from '../../i18n';

/*
 * The progressive profile: each flow asks only for what's still missing.
 *
 *   missingFields(profile, ['name', 'phoneVerified'])  → ['phoneVerified']
 *   missingFields(profile, requirementsFor('guestlist'))
 *
 * `profile` is the normalised shape from lib/store/profile.js (toProfile).
 */

export const PROFILE_FIELDS = {
    name: { label: 'Your name', check: p => isPresent(p?.name) },
    email: { label: 'Email', check: p => isPresent(p?.email) },
    phone: { label: 'Phone number', check: p => isPresent(p?.phone) },
    phoneVerified: { label: 'Verified phone number', check: p => Boolean(p?.phone && p?.phoneVerified) },
    city: { label: 'City', check: p => isPresent(p?.city) },
    college: { label: 'College', check: p => isPresent(p?.collegeId) || isPresent(p?.college) },
    photo: { label: 'Profile photo', check: p => isPresent(p?.photoURL) },
    instagram: { label: 'Instagram', check: p => isPresent(p?.instagram?.handle) },
    instagramVerified: { label: 'Verified Instagram', check: p => isPresent(p?.instagram?.igUserId) && isPresent(p?.instagram?.verifiedAt) },
};

/* What each flow needs from the shared profile (flow-specific questions live in the flow). */
export const FLOW_REQUIREMENTS = {
    // Just the sign-in (Google gives an email, phone sign-in a number); Home's banner asks for the rest later.
    guestlist: ['name'],
    giveaway: ['name', 'city'],
    giveawayCampus: ['name', 'city', 'college'],
    creatorApply: ['name', 'email', 'phoneVerified', 'city'],
    creatorApplyCampus: ['name', 'email', 'phoneVerified', 'city', 'college'],
    gig: ['name'],
    // Email comes from the account; the ticket sheet asks for one itself when it's missing.
    tickets: ['name', 'phoneVerified'],
    community: ['name'],
};

export const requirementsFor = (flow) => FLOW_REQUIREMENTS[flow] || [];

/* The fields from `required` that the profile doesn't satisfy yet, in order. */
export function missingFields(profile, required = []) {
    return (required || []).filter((key) => {
        const field = PROFILE_FIELDS[key];
        if (!field) {
            console.warn(`[requirements] unknown profile field "${key}"`);
            return false;
        }
        return !field.check(profile);
    });
}

export const isProfileComplete = (profile, required) => missingFields(profile, required).length === 0;

// Read at call time, so it follows the current language.
export const fieldLabel = (key) => t(PROFILE_FIELDS[key]?.label || key);
