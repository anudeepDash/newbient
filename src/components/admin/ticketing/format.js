// Small display helpers shared by the ticketing panels.

// Firestore timestamps, ISO strings and local "YYYY-MM-DDTHH:mm" strings all appear.
export const toDate = (value) => {
    if (!value) return null;
    if (typeof value?.toDate === 'function') return value.toDate();
    if (typeof value === 'object' && typeof value.seconds === 'number') return new Date(value.seconds * 1000);
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
};

export const inr = (n) => `₹${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN')}`;

export const formatDateTime = (value) => {
    const d = toDate(value);
    return d ? d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';
};

export const formatEventDate = (value) => {
    const d = toDate(value);
    return d ? d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'Date to be announced';
};

export const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const downloadText = (text, filename, type = 'text/csv;charset=utf-8') => {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Safari needs the URL to live until the download has started.
    setTimeout(() => URL.revokeObjectURL(url), 4000);
};

export const safeFileName = (text) => String(text || 'event').replace(/[^\w-]+/g, '_').replace(/_+/g, '_').slice(0, 60);

export const ORDER_STATUS = {
    pending: { label: 'Awaiting check', tone: 'amber' },
    awaiting_payment: { label: 'Paying online', tone: 'gray' },
    approved: { label: 'Paid', tone: 'blue' },
    dispatched: { label: 'Ticket sent', tone: 'green' },
    confirmed: { label: 'Free', tone: 'green' },
    attended: { label: 'Checked in', tone: 'green' },
    rejected: { label: 'Rejected', tone: 'red' },
};

// Guestlist entries: approved (or never needed review), waiting, or declined.
export const guestStatus = (entry) => {
    if (entry?.status === 'rejected') return 'rejected';
    // Full lists: waiting in line (or offered a place that freed up), and offers that ran out.
    if (entry?.status === 'waitlisted' || entry?.status === 'offered') return 'waitlist';
    if (entry?.status === 'waitlist_expired') return 'expired';
    if (entry?.status === 'approved' || entry?.status === 'confirmed' || (!entry?.status && !entry?.hasTask)) return 'approved';
    return 'pending';
};

export const GUEST_STATUS = {
    pending: { label: 'To review', tone: 'amber' },
    approved: { label: 'Approved', tone: 'green' },
    rejected: { label: 'Declined', tone: 'red' },
    waitlist: { label: 'Waitlist', tone: 'violet' },
    expired: { label: 'Offer expired', tone: 'gray' },
};

export const guestCount = (entry) => Math.max(1, Number(entry?.guestsCount) || 1);
export const personName = (x, fallback = 'Guest') => x?.customerName || x?.name || fallback;
