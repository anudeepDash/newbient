import { callCreatorApi } from '../app/creator/api';

/*
 * Saves the signed-in account's phone through the server
 * (api/_lib/creatorApp.js, action profile-phone). Firestore rules don't let
 * the browser write the phone fields on users/{uid}: the server marks a
 * number verified only when it is the one on the Firebase Auth account
 * (after an OTP link or phone sign-in). Any other number is saved as an
 * unverified contact number.
 *
 *   const { phone, verified } = await saveProfilePhone('+919876543210');
 */
export async function saveProfilePhone(phone) {
    const res = await callCreatorApi('profile-phone', { phone: phone || '' });
    if (!res.ok) throw Object.assign(new Error(res.error), { code: res.code || 'error' });
    return { phone: res.data.phone, verified: Boolean(res.data.verified) };
}

export default saveProfilePhone;
