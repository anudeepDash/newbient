import Wallet from 'lucide-react/dist/esm/icons/wallet';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import CalendarClock from 'lucide-react/dist/esm/icons/calendar-clock';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import Star from 'lucide-react/dist/esm/icons/star';
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
import Receipt from 'lucide-react/dist/esm/icons/receipt';
import Hourglass from 'lucide-react/dist/esm/icons/hourglass';
import Scale from 'lucide-react/dist/esm/icons/scale';
import Shield from 'lucide-react/dist/esm/icons/shield';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square';
import Banknote from 'lucide-react/dist/esm/icons/banknote';
import ClipboardCheck from 'lucide-react/dist/esm/icons/clipboard-check';
import Users from 'lucide-react/dist/esm/icons/users';
import Gift from 'lucide-react/dist/esm/icons/gift';
import MailWarning from 'lucide-react/dist/esm/icons/mail-warning';
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap';
import ShieldAlert from 'lucide-react/dist/esm/icons/shield-alert';
import { invoiceState, invoiceBalance, daysOverdue, todayKey } from '../../../lib/invoicing';
import { proposalState, lastViewedAt, proposalExpiry, proposalValue } from '../../../lib/proposals';
import { contractState, contractParty } from '../../../lib/contracts';
import { creatorHasCollegeNiche } from '../../../lib/constants';
import { isPendingCreator } from '../creatorPortal/creatorUtils';
import { campaignStatus, indexApplicants, summarize } from '../campaigns/campaignModel';
import { isSpendPending, amountOf } from '../finance/money';
import { giveawayState } from '../giveaways/giveawayUtils';
import { campaignState as mailState, canRetryCampaign } from '../mailing/mailingApi';
import { messageState } from '../workspace/MessageSheet';

/*
 * "Needs attention" on the dashboard: everything that is waiting on the team,
 * worked out with the same rules each module's page uses, so the count on the
 * dashboard always matches what the link opens.
 *
 * Each item: { id, priority (1 urgent → 4 nice to know), tone, icon, title,
 * detail, link, count, amount? }
 */

const DAY = 86400000;
const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const toDate = (v) => {
    if (!v) return null;
    if (typeof v?.toDate === 'function') return v.toDate();
    if (typeof v === 'object' && typeof v.seconds === 'number') return new Date(v.seconds * 1000);
    const d = new Date(String(v).length === 10 ? `${v}T00:00:00` : v);
    return isNaN(d.getTime()) ? null : d;
};
// One item: open it directly. Several: open the filtered list.
const oneOr = (list, single, many) => (list.length === 1 ? single(list[0]) : many);
const enc = encodeURIComponent;

const names = (list, pick, max = 2) => {
    const uniq = [...new Set(list.map(pick).map(s => String(s || '').trim()).filter(Boolean))];
    if (!uniq.length) return '';
    return uniq.length > max ? `${uniq.slice(0, max).join(', ')} and ${uniq.length - max} more` : uniq.join(uniq.length === 2 ? ' and ' : ', ');
};

/**
 * @param state   the store state (only the collections the role can see are loaded)
 * @param visible Set of nav item ids this person can open
 * @param opts    { isFinance, isFullAccess, now }
 */
export const buildAttention = (state, visible, { isFinance = false, isFullAccess = false, now = new Date() } = {}) => {
    const items = [];
    const today = todayKey(now);
    const t = now.getTime();

    // ── Site ───────────────────────────────────────────────────────────────
    if (isFullAccess && state.maintenanceState?.global) {
        items.push({ id: 'maintenance', priority: 1, tone: 'red', icon: ShieldAlert, title: 'The website is in maintenance mode', detail: 'Visitors see the maintenance page. Turn it off in System when you are done.', link: '/admin/system-command', count: 1 });
    }

    // ── Invoices (finance roles only) ──────────────────────────────────────
    if (visible.has('invoices')) {
        const invoices = state.invoices || [];
        const claims = invoices.filter(i => invoiceState(i, today) === 'verifying');
        if (claims.length) {
            items.push({
                id: 'invoice-claims', priority: 1, tone: 'amber', icon: Wallet, count: claims.length,
                title: `${plural(claims.length, 'payment claim')} to check`,
                detail: `${names(claims, i => i.clientName)} say they've paid ${inr(claims.reduce((a, i) => a + invoiceBalance(i), 0))}. Check your bank, then confirm.`,
                link: oneOr(claims, i => `/admin/invoices?invoice=${enc(i.id)}`, '/admin/invoices?filter=verifying'),
            });
        }
        // Same rule as the Invoices page's Overdue tab.
        const overdue = invoices.filter(i => invoiceState(i, today) === 'overdue');
        if (overdue.length) {
            const worst = Math.max(...overdue.map(i => daysOverdue(i, now) || 0));
            const amount = overdue.reduce((a, i) => a + invoiceBalance(i), 0);
            items.push({
                id: 'invoice-overdue', priority: 1, tone: 'red', icon: AlertCircle, count: overdue.length, amount,
                title: `${plural(overdue.length, 'overdue invoice')}, ${inr(amount)}`,
                detail: `${names(overdue, i => i.clientName)}. Oldest is ${plural(worst, 'day')} late; send a reminder.`,
                link: oneOr(overdue, i => `/admin/invoices?invoice=${enc(i.id)}`, '/admin/invoices?filter=overdue'),
            });
        }
        const dueSoon = invoices.filter(i => {
            const st = invoiceState(i, today);
            if (st === 'paid' || st === 'verifying' || st === 'overdue' || invoiceBalance(i) <= 0 || !i.dueDate) return false;
            const due = toDate(String(i.dueDate).slice(0, 10));
            return due && due.getTime() - t <= 7 * DAY;
        });
        if (dueSoon.length) {
            const amount = dueSoon.reduce((a, i) => a + invoiceBalance(i), 0);
            items.push({
                id: 'invoice-due', priority: 3, tone: 'blue', icon: CalendarClock, count: dueSoon.length, amount,
                title: `${plural(dueSoon.length, 'invoice')} due this week, ${inr(amount)}`,
                detail: `${names(dueSoon, i => i.clientName)}. A friendly nudge now saves a chase later.`,
                link: oneOr(dueSoon, i => `/admin/invoices?invoice=${enc(i.id)}`, '/admin/invoices?filter=unpaid'),
            });
        }
    }

    // ── Payouts (finance roles) ────────────────────────────────────────────
    if (isFinance && visible.has('finance')) {
        const pending = (state.spends || []).filter(isSpendPending);
        if (pending.length) {
            const amount = pending.reduce((a, s) => a + amountOf(s.amount), 0);
            items.push({
                id: 'payouts', priority: 2, tone: 'teal', icon: Banknote, count: pending.length, amount,
                title: `${plural(pending.length, 'payout')} still to pay, ${inr(amount)}`,
                detail: `${names(pending, s => s.receiverName || s.paidTo || s.title)}. Pay, then save the UTR so the receipt is right.`,
                link: '/admin/spends?status=Pending&month=all',
            });
        }
    }

    // ── Ticketing ──────────────────────────────────────────────────────────
    if (visible.has('ticketing')) {
        const pending = (state.ticketOrders || []).filter(o => o.status === 'pending');
        if (pending.length) {
            const byEvent = {};
            pending.forEach(o => { byEvent[o.eventId] = (byEvent[o.eventId] || 0) + 1; });
            const eventIds = Object.keys(byEvent);
            const titleOf = (id) => (state.upcomingEvents || []).find(e => e.id === id)?.title || pending.find(o => o.eventId === id)?.eventTitle || 'an event';
            const amount = pending.reduce((a, o) => a + (Number(o.totalAmount) || 0), 0);
            items.push({
                id: 'ticket-orders', priority: 1, tone: 'orange', icon: Ticket, count: pending.length,
                title: `${plural(pending.length, 'ticket payment')} to verify`,
                detail: eventIds.length === 1
                    ? `${titleOf(eventIds[0])}${amount ? ` · ${inr(amount)}` : ''}. Match the UTR, then approve so the tickets go out.`
                    : `Across ${eventIds.length} events: ${eventIds.slice(0, 2).map(titleOf).join(', ')}${eventIds.length > 2 ? '…' : ''}.`,
                link: eventIds.length === 1 ? `/admin/ticketing?eventId=${encodeURIComponent(eventIds[0])}&tab=orders&filter=pending` : '/admin/ticketing',
            });
        }
    }

    // ── Proposals ──────────────────────────────────────────────────────────
    if (visible.has('proposals')) {
        const proposals = (state.proposals || []).map(p => ({ p, s: proposalState(p, now) }));
        const toInvoice = proposals.filter(({ p, s }) => s === 'accepted' && !p.convertedInvoiceId);
        if (toInvoice.length && visible.has('invoices')) {
            items.push({
                id: 'proposal-invoice', priority: 2, tone: 'green', icon: Receipt, count: toInvoice.length,
                title: `${plural(toInvoice.length, 'accepted proposal')} not invoiced yet`,
                detail: (() => {
                    const worth = toInvoice.reduce((a, x) => a + proposalValue(x.p), 0);
                    return `${names(toInvoice, x => x.p.clientName)}${worth ? `, worth ${inr(worth)}` : ''}. Create the ${toInvoice.length === 1 ? 'invoice' : 'invoices'} from the proposal.`;
                })(),
                link: oneOr(toInvoice, x => `/admin/proposals?proposal=${enc(x.p.id)}`, '/admin/proposals?filter=accepted'),
            });
        }
        const expiring = proposals.filter(({ p, s }) => {
            if (s !== 'sent' && s !== 'viewed') return false;
            const end = proposalExpiry(p);
            return end && end.getTime() >= t && end.getTime() - t <= 3 * DAY;
        });
        if (expiring.length) {
            items.push({
                id: 'proposal-expiring', priority: 2, tone: 'amber', icon: Hourglass, count: expiring.length,
                title: `${plural(expiring.length, 'proposal')} expiring in the next 3 days`,
                detail: `${names(expiring, x => x.p.clientName)}. Follow up, or extend the valid-until date.`,
                link: expiring.length === 1 ? `/admin/proposals?proposal=${encodeURIComponent(expiring[0].p.id)}` : '/admin/proposals?sort=newest',
            });
        }
        const expiringIds = new Set(expiring.map(x => x.p.id));
        const viewedRecently = proposals.filter(({ p, s }) => {
            if (s !== 'viewed' || expiringIds.has(p.id)) return false;
            const seen = lastViewedAt(p);
            return seen && t - seen.getTime() <= 30 * DAY;
        });
        if (viewedRecently.length) {
            items.push({
                id: 'proposal-viewed', priority: 3, tone: 'violet', icon: FileSpreadsheet, count: viewedRecently.length,
                title: `${plural(viewedRecently.length, 'proposal')} opened recently, no reply`,
                detail: `${names(viewedRecently, x => x.p.clientName)} opened ${viewedRecently.length === 1 ? 'it' : 'theirs'} in the last 30 days. A good time to follow up.`,
                link: oneOr(viewedRecently, x => `/admin/proposals?proposal=${enc(x.p.id)}`, '/admin/proposals?filter=viewed&sort=viewed'),
            });
        }
        const unopened = proposals.filter(({ p, s }) => {
            if (s !== 'sent' || expiringIds.has(p.id)) return false;
            const sent = toDate(p.lastSharedAt || p.sentAt || p.updatedAt);
            return sent && t - sent.getTime() >= 3 * DAY && t - sent.getTime() <= 45 * DAY;
        });
        if (unopened.length) {
            items.push({
                id: 'proposal-unopened', priority: 4, tone: 'gray', icon: FileSpreadsheet, count: unopened.length,
                title: `${plural(unopened.length, 'proposal')} sent but not opened`,
                detail: `${names(unopened, x => x.p.clientName)}. Sent over 3 days ago; check it reached the right person.`,
                link: '/admin/proposals?filter=sent',
            });
        }
    }

    // ── Contracts ──────────────────────────────────────────────────────────
    if (visible.has('contracts')) {
        const contracts = state.agreements || [];
        const viewed = contracts.filter(a => contractState(a) === 'viewed');
        const ready = contracts.filter(a => contractState(a) === 'ready');
        if (viewed.length) {
            items.push({
                id: 'contracts-viewed', priority: 2, tone: 'amber', icon: Scale, count: viewed.length,
                title: `${plural(viewed.length, 'contract')} opened but not signed`,
                detail: `${names(viewed, contractParty)}. Ask if anything needs changing.`,
                link: oneOr(viewed, a => `/admin/agreements?contract=${enc(a.id)}`, '/admin/agreements?filter=viewed'),
            });
        }
        if (ready.length) {
            items.push({
                id: 'contracts-ready', priority: 3, tone: 'amber', icon: Scale, count: ready.length,
                title: `${plural(ready.length, 'contract')} ready, not opened yet`,
                detail: `${names(ready, contractParty)}. Share the signing link if you haven't.`,
                link: oneOr(ready, a => `/admin/agreements?contract=${enc(a.id)}`, '/admin/agreements?filter=ready'),
            });
        }
    }

    // ── Creators and campaigns ─────────────────────────────────────────────
    if (visible.has('creators')) {
        const creators = state.creators || [];
        const pending = creators.filter(isPendingCreator);
        if (pending.length) {
            const manual = pending.filter(c => c.manualFollowerEntry || c.requiresManualVerification).length;
            items.push({
                id: 'creator-applications', priority: 2, tone: 'pink', icon: Star, count: pending.length,
                title: `${plural(pending.length, 'creator')} waiting for verification`,
                detail: `${names(pending, c => c.name)}${manual ? `. ${manual} entered follower counts by hand; check those first.` : '.'}`,
                link: oneOr(pending, c => `/admin/creators/${enc(c.id || c.uid)}`, '/admin/creators?status=pending'),
            });
        }
        const campaigns = state.campaigns || [];
        if (campaigns.length) {
            const index = indexApplicants(creators, campaigns);
            let review = 0; let decide = 0; const reviewNames = []; const decideNames = [];
            campaigns.forEach(c => {
                const stats = summarize(c, index.get(c.id) || []);
                if (stats.toReview) { review += stats.toReview; reviewNames.push(c.title); }
                if (campaignStatus(c) === 'open' && stats.undecided) { decide += stats.undecided; decideNames.push(c.title); }
            });
            if (review) {
                items.push({
                    id: 'campaign-review', priority: 2, tone: 'pink', icon: ClipboardCheck, count: review,
                    title: `${plural(review, 'creator submission')} to review`,
                    detail: `In ${names(reviewNames.map(n => ({ n })), x => x.n)}. Approve or ask for changes.`,
                    link: '/admin/campaigns?status=review',
                });
            }
            if (decide) {
                items.push({
                    id: 'campaign-decide', priority: 3, tone: 'pink', icon: Users, count: decide,
                    title: `${plural(decide, 'campaign application')} to decide`,
                    detail: `In ${names(decideNames.map(n => ({ n })), x => x.n)}. Shortlist or select creators.`,
                    link: '/admin/campaigns?status=decide',
                });
            }
        }
        // Same rule as the Creators page's "College missing" filter.
        const noCollege = creators.filter(c => creatorHasCollegeNiche(c) && !String(c.collegeName || '').trim());
        if (noCollege.length) {
            items.push({
                id: 'creator-college', priority: 4, tone: 'gray', icon: GraduationCap, count: noCollege.length,
                title: `${plural(noCollege.length, 'campus creator')} missing a college name`,
                detail: 'Campus creators and college pages need one. Add it from their profile.',
                link: '/admin/creators?college=missing',
            });
        }
    }

    // ── Giveaways ──────────────────────────────────────────────────────────
    if (visible.has('giveaways')) {
        const ended = (state.giveaways || []).filter(g => giveawayState(g, now) === 'ended');
        if (ended.length) {
            items.push({
                id: 'giveaways', priority: 2, tone: 'rose', icon: Gift, count: ended.length,
                title: `${plural(ended.length, 'giveaway')} ended, winners not picked`,
                detail: `${names(ended, g => g.title)}. Draw the winners and close it.`,
                link: oneOr(ended, g => `/admin/giveaways/${enc(g.id)}/participants`, '/admin/giveaways?filter=ended'),
            });
        }
    }

    // ── Mailing ────────────────────────────────────────────────────────────
    if (visible.has('mailing')) {
        const stuck = (state.emailCampaigns || []).filter(c => {
            const s = mailState(c);
            const at = toDate(c.lastProgressAt || c.sentAt || c.createdAt);
            return (s === 'interrupted' || s === 'partial' || s === 'failed') && canRetryCampaign(c) && at && t - at.getTime() <= 14 * DAY;
        });
        if (stuck.length) {
            const people = stuck.reduce((a, c) => a + (c.failedEmails?.length || 0) + (c.unsentEmails?.length || 0), 0);
            items.push({
                id: 'mailing', priority: 3, tone: 'fuchsia', icon: MailWarning, count: stuck.length,
                title: `${plural(stuck.length, 'email campaign')} didn't fully send`,
                detail: `${plural(people, 'person', 'people')} still to reach in ${names(stuck, c => c.subject)}. Open the report to retry.`,
                link: '/admin/mailing?tab=history',
            });
        }
    }

    // ── Team and inbox ─────────────────────────────────────────────────────
    if (visible.has('members')) {
        const pending = (state.admins || []).filter(a => a.role === 'pending');
        if (pending.length) {
            items.push({
                id: 'access', priority: 2, tone: 'indigo', icon: Shield, count: pending.length,
                title: `${plural(pending.length, 'access request')}`,
                detail: `${names(pending, a => a.name || a.displayName || a.email)} asked to join the admin.`,
                link: '/admin/manage-admins?tab=requests',
            });
        }
    }
    if (visible.has('inbox')) {
        const unread = (state.messages || []).filter(m => messageState(m) === 'unread')
            .sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0));
        if (unread.length) {
            const oldest = toDate(unread[unread.length - 1]?.createdAt);
            const waitDays = oldest ? Math.floor((t - oldest.getTime()) / DAY) : 0;
            items.push({
                id: 'inbox', priority: waitDays >= 2 ? 2 : 3, tone: 'blue', icon: MessageSquare, count: unread.length,
                title: `${plural(unread.length, 'unread message')}`,
                detail: `Latest from ${unread[0]?.name || unread[0]?.email || 'the contact form'}${waitDays >= 2 ? `; the oldest has waited ${plural(waitDays, 'day')}` : ''}.`,
                link: oneOr(unread, m => `/admin/messages?id=${enc(m.id)}`, '/admin/messages?filter=unread'),
            });
        }
    }

    // Most urgent first; within a level, the bigger pile first.
    return items.sort((a, b) => a.priority - b.priority || (b.amount || 0) - (a.amount || 0) || b.count - a.count);
};

/** Store collections the attention list reads for this person. */
export const attentionNeeds = (visible, { isFinance = false } = {}) => {
    const keys = [];
    if (visible.has('invoices')) keys.push('invoices');
    if (isFinance && visible.has('finance')) keys.push('spends');
    if (visible.has('ticketing')) keys.push('ticketOrders', 'upcomingEvents');
    if (visible.has('proposals')) keys.push('proposals');
    if (visible.has('contracts')) keys.push('agreements');
    if (visible.has('creators')) keys.push('creators', 'campaigns');
    if (visible.has('giveaways')) keys.push('giveaways');
    if (visible.has('mailing')) keys.push('emailCampaigns');
    if (visible.has('members')) keys.push('admins');
    if (visible.has('inbox')) keys.push('messages');
    return keys;
};
