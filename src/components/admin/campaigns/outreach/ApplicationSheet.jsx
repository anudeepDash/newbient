import React, { useState } from 'react';
import TriangleAlert from 'lucide-react/dist/esm/icons/triangle-alert';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Sheet from '../../Sheet';
import { Button } from '../../ui';
import { useStore } from '../../../../lib/store';
import { copyToClipboard } from '../../../../lib/clipboard';
import { TRANSITIONS, isOnShortlist } from '../../../../lib/outreach/status';
import { isBelowMinimum, minFollowersFor } from '../../../../lib/outreach/application';
import { formatCount } from '../campaignModel';
import { deliverableSummary, DELIVERABLE_STATUS, TICKET_STATUS, hasPayoutDetails } from '../../../../lib/outreach/deliverables';
import { callOutreach } from './outreachApi';
import { shareMessage } from './PayoutsPanel';
import ActivityList from './ActivityList';
import { StatusBadge, Handle, STATUS_ACTIONS, when } from './parts';

/* One application: every field, status actions and its own history. */

const Row = ({ label, children }) => (children === null || children === undefined || children === '' ? null : (
    <div className="flex justify-between gap-4 py-2 text-[13.5px]">
        <dt className="shrink-0 text-gray-500">{label}</dt>
        <dd className="min-w-0 text-right font-semibold [overflow-wrap:anywhere]">{children}</dd>
    </div>
));

/*
 * Copy an approved creator's payout page link (or a message with it) to share
 * by hand. Nothing is sent; it's noted as shared, like in Payouts.
 */
const PayoutLinkButtons = ({ app, campaign, campaignId, onChanged }) => {
    const addToast = useStore(s => s.addToast);
    const [busy, setBusy] = useState(false);
    const copy = async (withMessage) => {
        setBusy(true);
        const r = await callOutreach('outreach-payout-links', { campaignId, appIds: [app.id], markShared: !hasPayoutDetails(app.payoutDetails), via: 'link' });
        setBusy(false);
        const url = r.ok ? r.data.links[0]?.url : null;
        if (!url) { addToast(r.ok ? 'Only shortlisted creators get a payout link.' : r.error, 'error', { title: 'No payout link' }); return; }
        const ok = await copyToClipboard(withMessage ? shareMessage(app, campaign || {}, url) : url);
        if (!ok) { addToast('Your browser blocked copying.', 'warning'); return; }
        addToast(withMessage ? 'Paste it in your chat with them.' : 'Paste it wherever you talk to them.', 'success', { title: withMessage ? 'Message with link copied' : 'Payout link copied' });
        onChanged?.();
    };
    return (
        <span className="inline-flex flex-wrap justify-end gap-1.5">
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => copy(false)}><Copy size={13} /> Copy link</Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => copy(true)}>Copy message</Button>
        </span>
    );
};

const ApplicationSheet = ({ app, campaign, campaignId, onClose, onStatus, onMessage = null, nameOf, refreshKey, onChanged }) => {
    const summary = app && campaign ? deliverableSummary(campaign, app) : null;
    // Under the campaign's follower minimum (the Nano "from" count): can't go onto the shortlist.
    const belowMin = Boolean(app && campaign && !isOnShortlist(app.status) && isBelowMinimum(app, campaign));
    const next = app ? (TRANSITIONS[app.status || 'applied'] || []).filter(s => !(belowMin && s === 'shortlisted')) : [];
    return (
        <Sheet open={Boolean(app)} onClose={onClose} title={app?.fullName || ''} subtitle={app ? `Applied ${when(app.firstSubmittedAt)}` : ''} size="md">
            {app && (
                <div className="space-y-5">
                    <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={app.status} />
                        {next.map(s => (
                            <Button key={s} size="sm" variant={s === 'removed' ? 'ghost' : 'secondary'} className={s === 'removed' ? 'text-rose-600' : undefined} onClick={() => onStatus([app.id], s)}>
                                {STATUS_ACTIONS[s]}
                            </Button>
                        ))}
                        {onMessage && !app.whatsappOptOut && (
                            <Button size="sm" variant="success" className="ml-auto" onClick={() => onMessage([app.id])}><MessageCircle size={13} /> Message on WhatsApp</Button>
                        )}
                    </div>
                    {belowMin && (
                        <p className="flex items-start gap-2 rounded-2xl bg-amber-500/10 p-3 text-[13px]">
                            <TriangleAlert size={15} className="mt-0.5 shrink-0 text-amber-600" />
                            <span>{formatCount(app.followerCount)} followers is under this campaign’s minimum of {formatCount(minFollowersFor(campaign))}, so they can’t be shortlisted.</span>
                        </p>
                    )}
                    {app.possibleDuplicateOf && (
                        <p className="flex items-start gap-2 rounded-2xl bg-amber-500/10 p-3 text-[13px]">
                            <TriangleAlert size={15} className="mt-0.5 shrink-0 text-amber-600" />
                            <span>Shares a phone or handle with {nameOf(app.possibleDuplicateOf) || 'another application'}. Check both before messaging.</span>
                        </p>
                    )}
                    <dl className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                        <Row label="Instagram"><Handle handle={app.instagramHandle} /></Row>
                        <Row label="Followers">{`${formatCount(app.followerCount)} · ${app.tier}`}</Row>
                        <Row label="Phone"><a href={`tel:${app.phone}`} className="hover:underline">{app.phone}</a></Row>
                        <Row label="Email"><a href={`mailto:${app.email}`} className="hover:underline">{app.email}</a></Row>
                        <Row label="City">{app.city}</Row>
                        <Row label="College or employer">{app.collegeOrEmployer}</Row>
                        <Row label="Category">{app.category}</Row>
                        <Row label="Runs city pages">{app.runsCityPages ? (app.cityPagesHandle ? <Handle handle={app.cityPagesHandle} /> : 'Yes') : 'No'}</Row>
                        <Row label="Says they’re on Newbi">{app.registeredNewbiCreator ? 'Yes' : 'No'}</Row>
                        <Row label="Newbi creator profile">{app.creatorId ? `Linked (${app.creatorId})` : 'Not found by handle'}</Row>
                        <Row label="Heard via">{app.referralSource}</Row>
                        <Row label="WhatsApp consent">{app.consentAt ? new Date(app.consentAt).toLocaleString('en-IN') : null}</Row>
                        <Row label="Times submitted">{app.submitCount > 1 ? String(app.submitCount) : null}</Row>
                        <Row label="Newbi account">{app.uid ? `Yes${app.accountEmail ? ` (${app.accountEmail})` : ''}${app.phoneVerified ? ' · phone verified' : ''}` : 'No (applied before sign-in was required)'}</Row>
                        <Row label="WhatsApp updates">{app.whatsappOptOut ? 'Stopped by them (STOP)' : null}</Row>
                        <Row label="City community">{app.cityGroup?.title ? `${app.cityGroup.title}${app.cityGroupJoinedAt ? ' · joined' : ''}` : null}</Row>
                        <Row label="Their posts link">{app.submitUrl ? <a href={app.submitUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">Open{app.submitLinkSentAt ? ` (sent ${when(app.submitLinkSentAt)})` : ''}</a> : null}</Row>
                        <Row label="Ticket">{app.ticket?.status ? `${TICKET_STATUS[app.ticket.status]?.label || app.ticket.status}${app.ticket.passRef ? ` · ${app.ticket.passRef}` : ''}` : null}</Row>
                        <Row label="Payout details">{app.payoutDetails?.mode === 'bank' && app.payoutDetails.accountNumber
                            ? `${app.payoutDetails.name ? `${app.payoutDetails.name} · ` : ''}A/C ${app.payoutDetails.accountNumber} · ${app.payoutDetails.ifsc}`
                            : app.payoutDetails?.upiId ? `UPI ${app.payoutDetails.upiId}` : app.payoutDetailsRequest?.requestedAt ? `Asked ${when(app.payoutDetailsRequest.requestedAt)}, not added yet` : null}</Row>
                        <Row label="Payout link">{isOnShortlist(app.status) && app.payout?.status !== 'paid' ? <PayoutLinkButtons app={app} campaign={campaign} campaignId={campaignId} onChanged={onChanged} /> : null}</Row>
                        <Row label="Payout">{app.payout?.status === 'paid' ? `₹${Number(app.payout.amount).toLocaleString('en-IN')} on ${app.payout.paidAt}${app.payout.reference ? ` · ${app.payout.reference}` : ''}` : app.payout?.status === 'cancelled' ? 'Cancelled' : null}</Row>
                        <Row label="Last message">{app.lastMessageText ? <span className="whitespace-pre-wrap text-left font-normal">{app.lastMessageText}</span> : null}</Row>
                    </dl>
                    {summary?.total > 0 && (
                        <section className="space-y-1">
                            <p className="text-[12px] font-bold text-gray-500">Deliverables · {summary.requiredApproved} of {summary.requiredCount} required approved</p>
                            <ul className="space-y-1 text-[13px]">
                                {summary.items.map(({ task, sub, status }) => (
                                    <li key={task.id} className="flex items-center justify-between gap-2">
                                        <span className="min-w-0 truncate">{task.title}{task.required ? '' : ' (optional)'}</span>
                                        <span className="flex items-center gap-2">
                                            {sub?.link && <a href={sub.link} target="_blank" rel="noopener noreferrer" className="text-[12px] underline">post</a>}
                                            {sub?.screenshotUrl && <a href={sub.screenshotUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] underline">screenshot</a>}
                                            <span className="text-[12px] text-gray-500">{DELIVERABLE_STATUS[status].label}</span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                    <section className="space-y-1">
                        <p className="text-[12px] font-bold text-gray-500">History</p>
                        <ActivityList campaignId={campaignId} appId={app.id} nameOf={nameOf} refreshKey={refreshKey} />
                    </section>
                </div>
            )}
        </Sheet>
    );
};

export default ApplicationSheet;
