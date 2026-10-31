import React, { useCallback, useEffect, useState } from 'react';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import Copy from 'lucide-react/dist/esm/icons/copy';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import UserPlus from 'lucide-react/dist/esm/icons/user-plus';
import { copyToClipboard } from '../../../../lib/clipboard';
import { useStore } from '../../../../lib/store';
import { Button, Card, Badge, Menu, MenuItem } from '../../ui';
import { Toggle } from '../../uploads/UploadKit';
import { ConfirmSheet } from '../parts';
import { STATUS_META } from '../../../../lib/outreach/status';
import { callOutreach } from './outreachApi';
import { Handle, when } from './parts';

/*
 * The campaign's open payout form (/pay/c/<link>): one link for every creator
 * who worked on it, including people who never applied on the website. Share
 * it in a group, a sheet or a chat; what they send waits here until you add
 * it to payouts (as a new approved creator, or onto the person it matches by
 * phone or Instagram). Nothing reaches Finance before that.
 */

const groupMessage = (campaign, url) => `Hi! If you worked with Newbi on ${campaign.title || 'our campaign'}, please add your payout details here so we can pay you: ${url}\n\nIt takes a minute. We'll never ask for your UPI PIN, a password or an OTP. – Team Newbi`;

const detailsText = (d = {}) => (d.mode === 'bank'
    ? `${d.bankName ? `${d.bankName} · ` : ''}A/C ${d.accountNumber} · ${d.ifsc}${d.name ? ` (${d.name})` : ''}`
    : `UPI ${d.upiId}${d.name ? ` (${d.name})` : ''}`);

const matchLine = (s) => {
    if (!s.match) return 'Not on this campaign yet: adds them as approved';
    const how = s.appId ? 'Added to' : `Matches by ${s.matchedBy === 'phone' ? 'phone' : 'Instagram'}:`;
    const status = STATUS_META[s.match.status]?.label || 'Applied';
    return `${how} ${s.match.fullName || 'their application'} (${status})${s.match.hasDetails && s.status === 'new' ? ', replaces their current details' : ''}`;
};

const PayoutFormCard = ({ campaign, onChanged }) => {
    const addToast = useStore(s => s.addToast);
    const [state, setState] = useState({ loading: true, form: null, submissions: [] });
    const [busy, setBusy] = useState(null);
    const [confirm, setConfirm] = useState(null);
    const [showDone, setShowDone] = useState(false);

    const run = useCallback(async (op, extra = {}) => {
        setBusy(extra.submissionId || op);
        const r = await callOutreach('outreach-payout-form-admin', { campaignId: campaign.id, op, ...extra });
        setBusy(null);
        if (!r.ok) {
            setState(s => ({ ...s, loading: false }));
            if (op !== 'get') addToast(r.error || 'Please try again.', 'error', { title: 'Not done' });
            return null;
        }
        setState({ loading: false, form: r.data.form, submissions: r.data.submissions });
        return r.data;
    }, [campaign.id, addToast]);
    useEffect(() => { run('get'); }, [run]);

    const { form, submissions } = state;
    const toCheck = submissions.filter(s => s.status === 'new');
    const done = submissions.filter(s => s.status !== 'new');

    const copy = async (withMessage) => {
        const ok = await copyToClipboard(withMessage ? groupMessage(campaign, form.url) : form.url);
        if (!ok) { addToast('Your browser blocked copying.', 'warning'); return; }
        addToast(withMessage ? 'Paste it in a group, a chat or your sheet.' : 'Paste it wherever you talk to them.', 'success', { title: withMessage ? 'Message with link copied' : 'Payout form link copied' });
    };
    const shareOnWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(groupMessage(campaign, form.url))}`, '_blank', 'noopener,noreferrer');
    const accept = async (s) => {
        const out = await run('accept', { submissionId: s.id });
        if (!out) return;
        addToast(s.match ? `Their details are on ${s.match.fullName}’s row and in Finance → Payees.` : 'They’re in the list below, ready to pay, and in Finance → Payees.', 'success', { title: `${s.fullName} added to payouts` });
        onChanged();
    };

    if (state.loading) return <Card className="h-24 animate-pulse" />;
    if (!form) return null;

    return (
        <Card className="space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-[220px] flex-1">
                    <p className="flex items-center gap-2 text-[14px] font-bold"><Link2 size={15} /> Payout form for everyone on this campaign {toCheck.length > 0 && <Badge tone="amber">{toCheck.length} to check</Badge>}</p>
                    <p className="text-[12.5px] text-gray-500">One link for creators who didn’t apply on the website. Share it in a group, a chat or your sheet; what they send shows here for you to check before paying.</p>
                </div>
                <Toggle label={form.enabled ? 'On' : 'Off'} checked={form.enabled} onChange={(v) => (v ? run('enable') : setConfirm('disable'))} />
            </div>

            {form.enabled && (
                <div className="space-y-2">
                    <p className="truncate rounded-xl bg-black/[0.03] px-3 py-2 font-mono text-[12.5px] dark:bg-white/[0.04]" title={form.url}>{form.url}</p>
                    <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={() => copy(false)}><Copy size={13} /> Copy link</Button>
                        <Button size="sm" variant="secondary" onClick={() => copy(true)}><Copy size={13} /> Copy message</Button>
                        <Button size="sm" variant="success" onClick={shareOnWhatsApp}><MessageCircle size={13} /> Share on WhatsApp</Button>
                        <Menu trigger={({ toggle }) => <Button size="sm" variant="ghost" onClick={toggle}>More</Button>} title="Payout form">
                            <MenuItem onClick={() => setConfirm('reset')} hint="The old link stops working">New link</MenuItem>
                            <MenuItem danger onClick={() => setConfirm('disable')}>Turn off</MenuItem>
                        </Menu>
                    </div>
                </div>
            )}

            {toCheck.length > 0 && (
                <div className="divide-y divide-black/[0.05] rounded-2xl ring-1 ring-inset ring-black/[0.06] dark:divide-white/[0.06] dark:ring-white/[0.08]">
                    {toCheck.map(s => (
                        <div key={s.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                            <div className="min-w-[200px] flex-1">
                                <p className="text-[14px] font-bold">{s.fullName} <span className="font-normal text-gray-500">· {s.phone}{s.instagramHandle ? ' · ' : ''}</span>{s.instagramHandle && <Handle handle={s.instagramHandle} />}</p>
                                <p className="font-mono text-[12.5px]">{detailsText(s.details)}</p>
                                <p className="text-[12px] text-gray-500">{matchLine(s)} · sent {when(s.updatedAt)}{s.count > 1 ? ` (${s.count} times)` : ''}</p>
                            </div>
                            <div className="ml-auto flex gap-1.5">
                                <Button size="sm" variant="accent" disabled={Boolean(busy) || s.match?.paid} onClick={() => accept(s)}><UserPlus size={13} /> {s.match ? 'Use these details' : 'Add to payouts'}</Button>
                                <Button size="sm" variant="ghost" disabled={Boolean(busy)} onClick={() => run('dismiss', { submissionId: s.id })}>Dismiss</Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {done.length > 0 && (
                <div className="text-[12.5px] text-gray-500">
                    <button type="button" className="font-semibold hover:underline" onClick={() => setShowDone(v => !v)}>{showDone ? 'Hide' : 'Show'} {done.length} already handled</button>
                    {showDone && (
                        <ul className="mt-1.5 space-y-1">
                            {done.map(s => <li key={s.id}>{s.fullName} · {s.status === 'added' ? `added ${when(s.addedAt)}` : `dismissed ${when(s.dismissedAt)}`}</li>)}
                        </ul>
                    )}
                </div>
            )}

            <ConfirmSheet
                open={confirm === 'reset'}
                onClose={() => setConfirm(null)}
                title="Make a new payout form link?"
                message="The link you’ve shared stops working. What people already sent stays here."
                confirmLabel="New link"
                onConfirm={async () => { await run('reset'); setConfirm(null); }}
            />
            <ConfirmSheet
                open={confirm === 'disable'}
                onClose={() => setConfirm(null)}
                title="Turn off the payout form?"
                message="The link stops taking details. Turn it back on any time and the same link works again."
                confirmLabel="Turn off"
                tone="danger"
                onConfirm={async () => { await run('disable'); setConfirm(null); }}
            />
        </Card>
    );
};

export default PayoutFormCard;
