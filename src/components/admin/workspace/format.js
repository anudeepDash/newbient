/*
 * Small date/text helpers shared by the Workspace screens (Inbox, Members,
 * System). Dates arrive as ISO strings, Firestore Timestamps or {seconds}.
 */

export const toDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    if (typeof value?.toDate === 'function') return value.toDate();
    if (typeof value === 'object' && typeof value.seconds === 'number') return new Date(value.seconds * 1000);
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
};

const sameYear = (d) => d.getFullYear() === new Date().getFullYear();

/** "12 Oct" this year, "12 Oct 2025" otherwise. */
export const formatDay = (value) => {
    const d = toDate(value);
    if (!d) return '';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...(sameYear(d) ? {} : { year: 'numeric' }) });
};

/** "12 Oct, 4:05 pm". */
export const formatDateTime = (value) => {
    const d = toDate(value);
    if (!d) return '';
    return `${formatDay(d)}, ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`;
};

/** "just now", "5 min ago", "3 h ago", "yesterday", "4 days ago", then a date. */
export const relativeTime = (value) => {
    const d = toDate(value);
    if (!d) return '';
    const diff = Date.now() - d.getTime();
    if (diff < 0) return formatDay(d);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    return formatDay(d);
};

export const escapeHtml = (text) => String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** wa.me link for an Indian or international number; null when there is no usable number. */
export const whatsappLink = (phone, text = '') => {
    let digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return null;
    if (digits.length === 10) digits = `91${digits}`;
    if (digits.length === 11 && digits.startsWith('0')) digits = `91${digits.slice(1)}`;
    if (digits.length < 11) return null;
    return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};

export const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/;
