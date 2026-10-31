import React, { useEffect, useMemo, useState } from 'react';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import Users from 'lucide-react/dist/esm/icons/users';
import Send from 'lucide-react/dist/esm/icons/send';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import Copy from 'lucide-react/dist/esm/icons/copy';
import { copyToClipboard } from '../../../../lib/clipboard';
import { firstNameOf } from '../../../../lib/outreach/normalize';
import { isOnShortlist } from '../../../../lib/outreach/status';
import { cn } from '../../../../lib/utils';
import { useStore } from '../../../../lib/store';
import { Button, Card, Badge, EmptyState, Menu, MenuItem } from '../../ui';
import Sheet from '../../Sheet';
import ExportMenu from '../../ExportMenu';
import { ConfirmSheet } from '../parts';
import { Field, fieldCls, Toggle, Choice } from '../../uploads/UploadKit';
import {
    deliverableSummary, defaultPayoutAmount, validatePayout, PAYOUT_METHODS, PAYOUT_STATUS, TICKET_STATUS, hasPayoutDetails,
} from '../../../../lib/outreach/deliverables';
import { callOutreach } from './outreachApi';
import { StatusBadge, Handle, when } from './parts';
import PayoutFormCard from './PayoutFormCard';

/*
 * Per creator: deliverables progress, their ticket and their payout.
 * Tickets go through the passes system (QR pass + email/WhatsApp). Payouts are
 * recorded here after you've paid in your bank app; each one also shows in
 * Finance → Spends as a Creator Payout. "Mark paid" waits for approved
 * deliverables unless you write why you're paying early.
 *
 * Payout details: creators add a UPI ID or bank account on their payout page
 * (/pay/<link>), which also saves them as a Vendor payee in Finance → Payees.
 * They're asked only from here: "Ask for payout details" emails them, sends
 * the campaign_payout_details WhatsApp (once it's switched on) and an in-app
 * notice; or copy each link, or export everyone's links in a sheet, to share
 * them yourself. Everyone approved (shortlisted onwards) is listed, so their
 * link can go out before the campaign message does; tickets still wait for it.
 * Creators who never applied on the website use the campaign's open payout
 * form instead (PayoutFormCard); once added they're listed here like anyone else.
 */

const IN_PLAY = new Set(['message_sent', 'replied', 'joined', 'posted', 'paid']);
const today = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
const shortDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }) : '');

/* Where to pay them, as Finance writes it, for the pay sheet and exports. */
const detailsLine = (d) => {
    if (!hasPayoutDetails(d)) return '';
    return d.mode === 'bank' ? `${d.bankName ? `${d.bankName} · ` : ''}A/C ${d.accountNumber} · ${d.ifsc}` : d.upiId;
};

/* "Details added" / "Asked 3 Nov" / "No details yet", for each row. */
const detailsBadge = (app) => {
    if (hasPayoutDetails(app.payoutDetails)) return { tone: 'teal', label: app.payoutDetails.mode === 'bank' ? 'Bank details added' : 'UPI added' };
    const req = app.payoutDetailsRequest;
    if (req?.requestedAt) return { tone: 'amber', label: `${req.channels?.manual ? 'Link shared' : 'Asked'} ${shortDate(req.requestedAt)}` };
    return { tone: 'gray', label: 'No payout details' };
};

/* The message to paste in a chat with their link. */
export const shareMessage = (app, campaign, url) => `Hi ${firstNameOf(app.fullName) || 'there'}! Please add your payout details for ${campaign.title || 'the campaign'} here, so we can pay you: ${url}\n\nIt's your personal link. We'll never ask for your UPI PIN, a password or an OTP. – Team Newbi`;

const PaySheet = ({ campaign, app, onClose, onDone }) => {
    const addToast = useStore(s => s.addToast);
    const summary = app ? deliverableSummary(campaign, app) : null;
    const blocked = summary && summary.requiredCount > 0 && !summary.allRequiredApproved;
    const [form, setForm] = useState(() => ({
        amount: String(defaultPayoutAmount(campaign, app) || ''), method: app?.payoutDetails?.mode === 'bank' ? 'bank' : 'upi', accountType: 'newbi',
        // Added from the payout form: their posts were never tracked here, so say so up front.
        paidAt: today(), reference: '', note: '',
        override: app?.addedVia === 'payout_form', overrideReason: app?.addedVia === 'payout_form' ? 'Approved off the website (payout form)' : '',
    }));
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const set = (patch) => setForm(f => ({ ...f, ...patch }));
    const save = async () => {
        const local = validatePayout(form);
        const errs = { ...local.errors };
        if (blocked && !form.override) errs.override = 'Their deliverables aren’t all approved yet.';
        if (form.override && form.overrideReason.trim().length < 5) errs.overrideReason = 'Say why you’re paying early.';
        setErrors(errs);
        if (Object.keys(errs).length) return;
        setSaving(true);
        const r = await callOutreach('outreach-payout', { campaignId: campaign.id, appId: app.id, action: 'paid', ...form, override: form.override });
        setSaving(false);
        if (!r.ok) {
            addToast(r.error || 'Please try again.', 'error', {
                title: 'Payout not recorded',
                action: { label: 'Try again', onClick: () => save() },
            });
            return;
        }
        addToast(r.data.notice === 'sent' ? 'Added to Spends. They’ve been told on WhatsApp.' : 'Added to Spends.', 'success', { title: 'Payout recorded' });
        onDone();
    };
    return (
        <Sheet
            open={Boolean(app)}
            onClose={onClose}
            title={app ? `Mark ${app.fullName} paid` : ''}
            subtitle="Record a payment you’ve already made. Nothing is sent from here."
            footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="accent" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Record payout'}</Button></div>}
        >
            {app && (
                <div className="space-y-4">
                    <div className="rounded-2xl bg-black/[0.03] p-3 text-[13px] dark:bg-white/[0.04]">
                        <p><span className="text-gray-500">{app.payoutDetails?.mode === 'bank' ? 'Bank:' : 'UPI:'}</span> <span className="font-semibold">{detailsLine(app.payoutDetails) || 'Not shared yet'}</span>{app.payoutDetails?.name ? ` (${app.payoutDetails.name})` : app.payoutDetails?.upiName ? ` (${app.payoutDetails.upiName})` : ''}</p>
                        <p><span className="text-gray-500">Deliverables:</span> {summary.requiredApproved} of {summary.requiredCount} required approved</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Amount (₹)" hint={defaultPayoutAmount(campaign, app) ? `${app.tier} tier: ₹${defaultPayoutAmount(campaign, app).toLocaleString('en-IN')}` : null}>
                            <input className={cn(fieldCls, errors.amount && 'border-rose-500/60')} inputMode="numeric" value={form.amount} onChange={(e) => set({ amount: e.target.value })} />
                            {errors.amount && <p className="mt-1 text-[12px] font-semibold text-rose-600">{errors.amount}</p>}
                        </Field>
                        <Field label="Paid on">
                            <input type="date" className={cn(fieldCls, errors.paidAt && 'border-rose-500/60')} value={form.paidAt} onChange={(e) => set({ paidAt: e.target.value })} />
                        </Field>
                    </div>
                    <Field label="How"><Choice value={form.method} onChange={(v) => set({ method: v })} options={PAYOUT_METHODS} /></Field>
                    <Field label="From"><Choice value={form.accountType} onChange={(v) => set({ accountType: v })} options={[{ value: 'newbi', label: 'Newbi account' }, { value: 'personal', label: 'Personal account', hint: 'To reimburse' }]} /></Field>
                    <Field label="UTR or reference" optional hint="From your bank app. Sent to the creator with the payout message.">
                        <input className={cn(fieldCls, errors.reference && 'border-rose-500/60')} value={form.reference} onChange={(e) => set({ reference: e.target.value })} autoCapitalize="characters" />
                        {errors.reference && <p className="mt-1 text-[12px] font-semibold text-rose-600">{errors.reference}</p>}
                    </Field>
                    <Field label="Note" optional><input className={fieldCls} value={form.note} onChange={(e) => set({ note: e.target.value })} maxLength={300} /></Field>
                    {blocked && (
                        <div className="space-y-2 rounded-2xl border border-amber-500/30 p-3">
                            <Toggle label="Pay before their deliverables are approved" hint="Recorded in the audit log with your reason." checked={form.override} onChange={(v) => set({ override: v })} />
                            {form.override && (
                                <input className={cn(fieldCls, errors.overrideReason && 'border-rose-500/60')} value={form.overrideReason} onChange={(e) => set({ overrideReason: e.target.value })} placeholder="Why, e.g. agreed advance for travel" aria-label="Why pay early" />
                            )}
                            {(errors.override || errors.overrideReason) && <p className="text-[12px] font-semibold text-rose-600">{errors.override || errors.overrideReason}</p>}
                        </div>
                    )}
                </div>
            )}
        </Sheet>
    );
};

const PayoutsPanel = ({ campaign, applications, onChanged }) => {
    const addToast = useStore(s => s.addToast);
    const [payFor, setPayFor] = useState(null);
    const [cancelFor, setCancelFor] = useState(null);
    const [revokeFor, setRevokeFor] = useState(null);
    const [askFor, setAskFor] = useState(null);
    const [busy, setBusy] = useState(false);
    const [links, setLinks] = useState({});
    const rows = useMemo(() => applications
        .filter(a => isOnShortlist(a.status) || a.payout || a.ticket)
        .map(a => ({ app: a, summary: deliverableSummary(campaign, a) }))
        .sort((x, y) => String(x.app.fullName || '').localeCompare(String(y.app.fullName || ''))), [campaign, applications]);

    // Everyone's payout page link, for copying and the sheet. Nothing is sent by loading them.
    const linkIds = rows.map(r => r.app.id).join(',');
    useEffect(() => {
        if (!linkIds) return undefined;
        let live = true;
        callOutreach('outreach-payout-links', { campaignId: campaign.id, appIds: linkIds.split(',') }).then(r => {
            if (live && r.ok) setLinks(Object.fromEntries(r.data.links.map(l => [l.id, l.url])));
        });
        return () => { live = false; };
    }, [campaign.id, linkIds]);
    const noteShared = (ids, via) => {
        const missing = ids.filter(id => !hasPayoutDetails(applications.find(a => a.id === id)?.payoutDetails));
        if (!missing.length) return;
        callOutreach('outreach-payout-links', { campaignId: campaign.id, appIds: missing, markShared: true, via }).then(r => { if (r.ok) onChanged(); });
    };
    const copyLink = async (app, withMessage) => {
        const url = links[app.id];
        if (!url) { addToast('Links are still loading. Try again in a moment.', 'info'); return; }
        const ok = await copyToClipboard(withMessage ? shareMessage(app, campaign, url) : url);
        if (!ok) { addToast('Your browser blocked copying.', 'warning'); return; }
        addToast(withMessage ? 'Paste it in your chat with them.' : 'Paste it wherever you talk to them.', 'success', { title: withMessage ? 'Message with link copied' : 'Payout link copied' });
        noteShared([app.id], 'link');
    };
    const copyAllLinks = async () => {
        const list = needDetails.filter(r => links[r.app.id]);
        if (!list.length) { addToast('Everyone has added their payout details.', 'info'); return; }
        const ok = await copyToClipboard(list.map(r => `${r.app.fullName}: ${links[r.app.id]}`).join('\n'));
        if (!ok) { addToast('Your browser blocked copying.', 'warning'); return; }
        addToast(`${list.length} link${list.length === 1 ? '' : 's'}, one per line with their name.`, 'success', { title: 'Payout links copied' });
        noteShared(list.map(r => r.app.id), 'link');
    };
    const ask = async (ids, again) => {
        setBusy(true);
        const r = await callOutreach('outreach-ask-payout', { campaignId: campaign.id, appIds: ids, again });
        setBusy(false);
        setAskFor(null);
        if (!r.ok) {
            addToast(r.error || 'Please try again.', 'error', { title: 'Not sent', action: { label: 'Try again', onClick: () => ask(ids, again) } });
            return;
        }
        const n = (o) => r.data.results.filter(x => x.outcome === o).length;
        const people = (k) => `${k} ${k === 1 ? 'person' : 'people'}`;
        const sent = n('sent');
        const notes = [
            n('has_details') && `${people(n('has_details'))} already added theirs`,
            n('no_channel') && `${people(n('no_channel'))} had no email, app account or WhatsApp: share their link yourself`,
            !r.data.whatsapp && 'WhatsApp is off until campaign_payout_details is approved (WHATSAPP_TEMPLATE_CAMPAIGN_PAYOUT_DETAILS)',
        ].filter(Boolean);
        addToast(notes.join('. ') || 'By email, WhatsApp and in the app.', sent ? 'success' : 'warning', { title: sent ? `Asked ${people(sent)} for payout details` : 'Nobody was asked' });
        onChanged();
    };

    const ticket = async (ids, action, reason) => {
        setBusy(true);
        const r = await callOutreach('outreach-ticket', { campaignId: campaign.id, appIds: ids, action, reason });
        setBusy(false);
        const verb = action === 'release' ? 'sent' : 'revoked';
        if (!r.ok) {
            addToast(r.error || 'Please try again.', 'error', {
                title: action === 'release' ? 'Tickets not sent' : 'Tickets not revoked',
                action: { label: 'Try again', onClick: () => ticket(ids, action, reason) },
            });
            return;
        }
        const ok = r.data.results.filter(x => ['released', 'revoked'].includes(x.outcome)).length;
        const problems = r.data.results.filter(x => !['released', 'revoked', 'already'].includes(x.outcome));
        const tickets = n => `${n} ticket${n === 1 ? '' : 's'}`;
        const why = o => ({ 'Not released': 'They don’t have a ticket to revoke.', 'Not found': 'That person is no longer on the list.' }[o] || o);
        if (problems.length) {
            addToast(why(problems[0].outcome), ok ? 'warning' : 'error', {
                title: ok ? `${tickets(ok)} ${verb}, ${problems.length} didn’t go through` : `${tickets(problems.length)} not ${verb}`,
            });
        } else addToast(`${tickets(ok)} ${verb}.`, 'success');
        onChanged();
    };
    const cancelPayout = async () => {
        const r = await callOutreach('outreach-payout', { campaignId: campaign.id, appId: cancelFor.id, action: 'cancel', reason: 'Cancelled in outreach' });
        if (r.ok) addToast('Its entry in Spends is marked Cancelled.', 'success', { title: 'Payout cancelled' });
        else addToast(r.error || 'Please try again.', 'error', { title: 'Payout not cancelled' });
        setCancelFor(null);
        onChanged();
    };
    const resendLink = async (app) => {
        const r = await callOutreach('outreach-resend-link', { campaignId: campaign.id, appIds: [app.id] });
        if (r.ok) addToast('Their personal link is on its way.', 'success');
        else addToast(r.error || 'Please try again.', 'error', {
            title: 'Link not sent',
            action: { label: 'Try again', onClick: () => resendLink(app) },
        });
    };

    const due = rows.filter(r => r.summary.allRequiredApproved && r.app.payout?.status !== 'paid');
    const needDetails = rows.filter(r => !hasPayoutDetails(r.app.payoutDetails) && r.app.payout?.status !== 'paid');
    const withDetails = rows.filter(r => hasPayoutDetails(r.app.payoutDetails)).length;
    const readyForTicket = rows.filter(r => IN_PLAY.has(r.app.status) && r.app.ticket?.status !== 'released');
    const exportSpec = () => (due.length ? {
        filename: `${String(campaign.title || 'campaign').replace(/[^\w-]+/g, '_').slice(0, 40)}_payouts_due`,
        sheetName: 'Payouts due',
        title: `${campaign.title} · payouts due`,
        subtitle: `${due.length} creator${due.length === 1 ? '' : 's'}`,
        rows: due.map(r => r.app),
        totals: { amount: true },
        columns: [
            { header: 'Name', width: 24, value: a => a.fullName || '' },
            { header: 'Method', value: a => (hasPayoutDetails(a.payoutDetails) ? (a.payoutDetails.mode === 'bank' ? 'Bank' : 'UPI') : 'Not shared') },
            { header: 'UPI ID', width: 26, value: a => a.payoutDetails?.upiId || '' },
            { header: 'Account holder', width: 22, value: a => a.payoutDetails?.name || a.payoutDetails?.upiName || '' },
            { header: 'Account number', width: 20, value: a => (a.payoutDetails?.mode === 'bank' ? a.payoutDetails.accountNumber : '') },
            { header: 'IFSC', width: 14, value: a => (a.payoutDetails?.mode === 'bank' ? a.payoutDetails.ifsc : '') },
            { header: 'Amount', key: 'amount', type: 'money', value: a => defaultPayoutAmount(campaign, a) || null },
            { header: 'Tier', value: a => a.tier || '' },
            { header: 'Phone', width: 16, value: a => a.phone || '' },
            { header: 'Instagram', value: a => a.instagramHandle || '' },
        ],
    } : null);
    // Everyone's payout link and whether they've added details: to share in a sheet, or send from another tool.
    const linksSpec = () => {
        const list = rows.filter(r => links[r.app.id]).map(r => r.app);
        if (!list.length) return null;
        noteShared(list.map(a => a.id), 'sheet');
        return {
            filename: `${String(campaign.title || 'campaign').replace(/[^\w-]+/g, '_').slice(0, 40)}_payout_links`,
            sheetName: 'Payout links',
            title: `${campaign.title} · payout details links`,
            subtitle: `${list.filter(a => !hasPayoutDetails(a.payoutDetails)).length} still to add · ${list.length} people`,
            rows: list,
            columns: [
                { header: 'Name', width: 24, value: a => a.fullName || '' },
                { header: 'Phone', width: 16, value: a => a.phone || '' },
                { header: 'Email', width: 26, value: a => a.email || '' },
                { header: 'Instagram', value: a => a.instagramHandle || '' },
                { header: 'Payout details', width: 16, value: a => (hasPayoutDetails(a.payoutDetails) ? 'Added' : 'Not yet') },
                { header: 'Payout link', width: 60, value: a => links[a.id] || '' },
            ],
        };
    };

    const formCard = <PayoutFormCard campaign={campaign} onChanged={onChanged} />;
    if (!rows.length) {
        return (
            <div className="space-y-3">
                {formCard}
                <Card><EmptyState icon={Users} title="Nobody to pay or ticket yet" description="People show up here once they’re shortlisted, or when you add someone from the payout form." /></Card>
            </div>
        );
    }
    const paidTotal = rows.reduce((n, r) => n + (r.app.payout?.status === 'paid' ? Number(r.app.payout.amount) || 0 : 0), 0);

    return (
        <div className="space-y-3">
            {formCard}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] text-gray-500">{due.length} payout{due.length === 1 ? '' : 's'} due · ₹{paidTotal.toLocaleString('en-IN')} paid so far · {withDetails} of {rows.length} added payout details</p>
                <div className="flex flex-wrap gap-2">
                    <Button className="h-11" variant="accent" disabled={busy || !needDetails.length} onClick={() => setAskFor({ ids: needDetails.map(r => r.app.id), again: false })}>
                        <Send size={14} /> Ask {needDetails.length || ''} for payout details
                    </Button>
                    <Menu trigger={({ toggle }) => <Button className="h-11" variant="secondary" onClick={toggle}><Link2 size={14} /> Payout links</Button>} title="Payout links">
                        <MenuItem icon={Copy} onClick={copyAllLinks} hint="Name and link, one per line, for everyone still to add">Copy links</MenuItem>
                    </Menu>
                    <ExportMenu label="Links sheet" getSpec={linksSpec} hint="Everyone’s payout link and whether they’ve added details" />
                    <Button className="h-11" disabled={busy || !readyForTicket.length} onClick={() => ticket(readyForTicket.slice(0, 25).map(r => r.app.id), 'release')}>
                        <Ticket size={14} /> Send tickets to {Math.min(25, readyForTicket.length)}
                    </Button>
                    <ExportMenu label="Export payouts due" getSpec={exportSpec} hint="Names, UPI IDs and amounts for your bank app" />
                </div>
            </div>
            <Card className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                {rows.map(({ app, summary }) => {
                    const t = app.ticket?.status || 'pending';
                    const p = app.payout?.status || (summary.allRequiredApproved ? 'due' : null);
                    return (
                        <div key={app.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                            <div className="min-w-[180px] flex-1">
                                <p className="text-[14px] font-bold">{app.fullName}</p>
                                <p className="text-[12.5px] text-gray-500"><Handle handle={app.instagramHandle} /> · {app.addedVia === 'payout_form' ? 'From the payout form' : app.tier}</p>
                            </div>
                            <StatusBadge status={app.status} />
                            <span className="text-[12.5px] text-gray-500">{summary.requiredCount ? `${summary.requiredApproved}/${summary.requiredCount} approved` : 'No deliverables'}{summary.toReview ? ` · ${summary.toReview} to review` : ''}</span>
                            <Badge tone={TICKET_STATUS[t].tone}>{TICKET_STATUS[t].label}</Badge>
                            <Badge tone={detailsBadge(app).tone}>{detailsBadge(app).label}</Badge>
                            {p && <Badge tone={PAYOUT_STATUS[p].tone}>{p === 'paid' ? `Paid ₹${Number(app.payout.amount).toLocaleString('en-IN')}` : PAYOUT_STATUS[p].label}</Badge>}
                            <div className="ml-auto flex gap-1.5">
                                {app.payout?.status !== 'paid'
                                    ? <Button size="sm" variant={p === 'due' ? 'accent' : 'secondary'} onClick={() => setPayFor(app)}><Wallet size={13} /> Mark paid</Button>
                                    : <span className="self-center text-[12px] text-gray-500">{app.payout.reference ? `Ref ${app.payout.reference} · ` : ''}{when(app.payout.recordedAt)}</span>}
                                <Menu trigger={({ toggle }) => <Button size="sm" variant="ghost" onClick={toggle}>More</Button>} title={app.fullName}>
                                    {app.payout?.status !== 'paid' && <MenuItem onClick={() => setAskFor({ ids: [app.id], again: hasPayoutDetails(app.payoutDetails), name: app.fullName })}>{hasPayoutDetails(app.payoutDetails) ? 'Ask to check payout details' : app.payoutDetailsRequest?.requestedAt ? 'Ask for payout details again' : 'Ask for payout details'}</MenuItem>}
                                    <MenuItem onClick={() => copyLink(app, false)}>Copy payout link</MenuItem>
                                    <MenuItem onClick={() => copyLink(app, true)}>Copy message with payout link</MenuItem>
                                    {t !== 'released' && IN_PLAY.has(app.status) && <MenuItem onClick={() => ticket([app.id], 'release')}>Send ticket</MenuItem>}
                                    {t === 'released' && <MenuItem danger onClick={() => setRevokeFor(app)}>Revoke ticket</MenuItem>}
                                    {(campaign.tasks || []).length > 0 && <MenuItem onClick={() => resendLink(app)}>Resend their posts link</MenuItem>}
                                    {app.payout?.status === 'paid' && <MenuItem danger onClick={() => setCancelFor(app)}>Cancel payout</MenuItem>}
                                </Menu>
                            </div>
                        </div>
                    );
                })}
            </Card>
            {payFor && <PaySheet campaign={campaign} app={payFor} onClose={() => setPayFor(null)} onDone={() => { setPayFor(null); onChanged(); }} />}
            <ConfirmSheet
                open={Boolean(askFor)}
                onClose={() => setAskFor(null)}
                title={askFor?.name ? `Ask ${askFor.name} for payout details?` : `Ask ${askFor?.ids.length} people for payout details?`}
                message={`They get an email, a WhatsApp message (once its template is approved) and a notice in the Newbi app, each with their personal link to add a UPI ID or bank account. What they add shows here and in Finance → Payees as a Vendor.${askFor?.again ? ' They’ve already added details; this asks them to check them.' : ''}`}
                confirmLabel="Send"
                onConfirm={() => ask(askFor.ids, askFor.again)}
            />
            <ConfirmSheet open={Boolean(cancelFor)} onClose={() => setCancelFor(null)} title={`Cancel ${cancelFor?.fullName}’s payout?`} message="Use this if it was recorded by mistake. They go back to Posted and the Spend is marked Cancelled." confirmLabel="Cancel payout" tone="danger" onConfirm={cancelPayout} />
            <ConfirmSheet open={Boolean(revokeFor)} onClose={() => setRevokeFor(null)} title={`Revoke ${revokeFor?.fullName}’s ticket?`} message="Their pass stops working at the gate. You can send a new one later." confirmLabel="Revoke ticket" tone="danger" onConfirm={async () => { await ticket([revokeFor.id], 'revoke', 'Revoked in outreach'); setRevokeFor(null); }} />
        </div>
    );
};

export default PayoutsPanel;
