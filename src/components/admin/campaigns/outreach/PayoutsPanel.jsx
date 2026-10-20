import React, { useMemo, useState } from 'react';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import Users from 'lucide-react/dist/esm/icons/users';
import { cn } from '../../../../lib/utils';
import { useStore } from '../../../../lib/store';
import { Button, Card, Badge, EmptyState, Menu, MenuItem } from '../../ui';
import Sheet from '../../Sheet';
import ExportMenu from '../../ExportMenu';
import { ConfirmSheet } from '../parts';
import { Field, fieldCls, Toggle, Choice } from '../../uploads/UploadKit';
import {
    deliverableSummary, defaultPayoutAmount, validatePayout, PAYOUT_METHODS, PAYOUT_STATUS, TICKET_STATUS,
} from '../../../../lib/outreach/deliverables';
import { callOutreach } from './outreachApi';
import { StatusBadge, Handle, when } from './parts';

/*
 * Per creator: deliverables progress, their ticket and their payout.
 * Tickets go through the passes system (QR pass + email/WhatsApp). Payouts are
 * recorded here after you've paid in your bank app; each one also shows in
 * Finance → Spends as a Creator Payout. "Mark paid" waits for approved
 * deliverables unless you write why you're paying early.
 */

const IN_PLAY = new Set(['message_sent', 'replied', 'joined', 'posted', 'paid']);
const today = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);

const PaySheet = ({ campaign, app, onClose, onDone }) => {
    const addToast = useStore(s => s.addToast);
    const summary = app ? deliverableSummary(campaign, app) : null;
    const blocked = summary && summary.requiredCount > 0 && !summary.allRequiredApproved;
    const [form, setForm] = useState(() => ({
        amount: String(defaultPayoutAmount(campaign, app) || ''), method: 'upi', accountType: 'newbi',
        paidAt: today(), reference: '', note: '', override: false, overrideReason: '',
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
                        <p><span className="text-gray-500">UPI:</span> <span className="font-semibold">{app.payoutDetails?.upiId || 'Not shared yet'}</span>{app.payoutDetails?.upiName ? ` (${app.payoutDetails.upiName})` : ''}</p>
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
    const [busy, setBusy] = useState(false);
    const rows = useMemo(() => applications
        .filter(a => IN_PLAY.has(a.status) || a.payout || a.ticket)
        .map(a => ({ app: a, summary: deliverableSummary(campaign, a) }))
        .sort((x, y) => String(x.app.fullName || '').localeCompare(String(y.app.fullName || ''))), [campaign, applications]);

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
    const readyForTicket = rows.filter(r => r.app.ticket?.status !== 'released');
    const exportSpec = () => (due.length ? {
        filename: `${String(campaign.title || 'campaign').replace(/[^\w-]+/g, '_').slice(0, 40)}_payouts_due`,
        sheetName: 'Payouts due',
        title: `${campaign.title} · payouts due`,
        subtitle: `${due.length} creator${due.length === 1 ? '' : 's'}`,
        rows: due.map(r => r.app),
        totals: { amount: true },
        columns: [
            { header: 'Name', width: 24, value: a => a.fullName || '' },
            { header: 'UPI ID', width: 26, value: a => a.payoutDetails?.upiId || '' },
            { header: 'Name on UPI', width: 22, value: a => a.payoutDetails?.upiName || '' },
            { header: 'Amount', key: 'amount', type: 'money', value: a => defaultPayoutAmount(campaign, a) || null },
            { header: 'Tier', value: a => a.tier || '' },
            { header: 'Phone', width: 16, value: a => a.phone || '' },
            { header: 'Instagram', value: a => a.instagramHandle || '' },
        ],
    } : null);

    if (!rows.length) {
        return <Card><EmptyState icon={Users} title="Nobody to pay or ticket yet" description="People show up here once their message is sent." /></Card>;
    }
    const paidTotal = rows.reduce((n, r) => n + (r.app.payout?.status === 'paid' ? Number(r.app.payout.amount) || 0 : 0), 0);

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] text-gray-500">{due.length} payout{due.length === 1 ? '' : 's'} due · ₹{paidTotal.toLocaleString('en-IN')} paid so far</p>
                <div className="flex flex-wrap gap-2">
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
                                <p className="text-[12.5px] text-gray-500"><Handle handle={app.instagramHandle} /> · {app.tier}</p>
                            </div>
                            <StatusBadge status={app.status} />
                            <span className="text-[12.5px] text-gray-500">{summary.requiredCount ? `${summary.requiredApproved}/${summary.requiredCount} approved` : 'No deliverables'}{summary.toReview ? ` · ${summary.toReview} to review` : ''}</span>
                            <Badge tone={TICKET_STATUS[t].tone}>{TICKET_STATUS[t].label}</Badge>
                            {p && <Badge tone={PAYOUT_STATUS[p].tone}>{p === 'paid' ? `Paid ₹${Number(app.payout.amount).toLocaleString('en-IN')}` : PAYOUT_STATUS[p].label}</Badge>}
                            <div className="ml-auto flex gap-1.5">
                                {app.payout?.status !== 'paid'
                                    ? <Button size="sm" variant={p === 'due' ? 'accent' : 'secondary'} onClick={() => setPayFor(app)}><Wallet size={13} /> Mark paid</Button>
                                    : <span className="self-center text-[12px] text-gray-500">{app.payout.reference ? `Ref ${app.payout.reference} · ` : ''}{when(app.payout.recordedAt)}</span>}
                                <Menu trigger={({ toggle }) => <Button size="sm" variant="ghost" onClick={toggle}>More</Button>} title={app.fullName}>
                                    {t !== 'released' && <MenuItem onClick={() => ticket([app.id], 'release')}>Send ticket</MenuItem>}
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
            <ConfirmSheet open={Boolean(cancelFor)} onClose={() => setCancelFor(null)} title={`Cancel ${cancelFor?.fullName}’s payout?`} message="Use this if it was recorded by mistake. They go back to Posted and the Spend is marked Cancelled." confirmLabel="Cancel payout" tone="danger" onConfirm={cancelPayout} />
            <ConfirmSheet open={Boolean(revokeFor)} onClose={() => setRevokeFor(null)} title={`Revoke ${revokeFor?.fullName}’s ticket?`} message="Their pass stops working at the gate. You can send a new one later." confirmLabel="Revoke ticket" tone="danger" onConfirm={async () => { await ticket([revokeFor.id], 'revoke', 'Revoked in outreach'); setRevokeFor(null); }} />
        </div>
    );
};

export default PayoutsPanel;
