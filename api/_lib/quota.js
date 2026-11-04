/**
 * Firestore answers RESOURCE_EXHAUSTED (gRPC code 8, "Quota exceeded") when
 * the project is over a usage limit. That's the database being unavailable,
 * not the caller lacking access, so admin checks pass it up instead of
 * answering "Admin access required", and handlers reply 503 with this text.
 */
export const isQuotaError = (e) => e?.code === 8 || /RESOURCE_EXHAUSTED|Quota exceeded/i.test(String(e?.message || ''));

export const QUOTA_ERROR = 'The database is over its usage limit right now, so this couldn’t load. Try again in a few minutes.';
