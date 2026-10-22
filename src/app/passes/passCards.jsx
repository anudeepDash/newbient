/* Helpers for listing passes (Tickets, Home, Community). Each pass is drawn as a PassTicket. */

/* Still to come (or undated) and not cancelled. */
export const isUpcomingPass = (p) => {
    if (!p || p.status === 'revoked') return false;
    const raw = p.event?.date;
    if (!raw) return true;
    const day = String(raw).slice(0, 10);
    const end = /^\d{4}-\d{2}-\d{2}$/.test(day) ? new Date(`${day}T23:59:59`) : new Date(raw);
    return Number.isNaN(end.getTime()) || end.getTime() >= Date.now();
};

const time = (p) => {
    const d = p.event?.date ? new Date(p.event.date) : null;
    return d && !Number.isNaN(d.getTime()) ? d.getTime() : Infinity;
};
export const bySoonest = (a, b) => time(a) - time(b);
