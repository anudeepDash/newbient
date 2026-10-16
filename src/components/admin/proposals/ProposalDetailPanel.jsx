import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Edit from 'lucide-react/dist/esm/icons/edit';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import CopyPlus from 'lucide-react/dist/esm/icons/copy-plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Receipt from 'lucide-react/dist/esm/icons/receipt';
import Eye from 'lucide-react/dist/esm/icons/eye';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import XCircle from 'lucide-react/dist/esm/icons/x-circle';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import { useStore } from '../../../lib/store';
import { cn } from '../../../lib/utils';
import {
    proposalState, PROPOSAL_STATE_LABEL, proposalValue, proposalViews, lastViewedAt, proposalExpiry, isProposalClosed,
} from '../../../lib/proposals';
import Sheet from '../Sheet';
import { Button, Badge } from '../ui';
import { inr, formatDateTime, toDate } from '../ticketing/format';

const deviceOf = (ua = '') => {
    const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X|Macintosh/.test(ua) ? 'Mac' : '';
    const browser = /Edg\//.test(ua) ? 'Edge' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
    return [os, browser].filter(Boolean).join(' · ');
};
const viaLabel = (via) => ({ email: 'Email', whatsapp: 'WhatsApp', share: 'Shared link', link: 'Copied link' }[via] || 'Direct');
const formatDay = (v) => {
    const d = toDate(v);
    return d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
};

const ProposalDetailPanel = ({ proposalId, onClose, canManage, canInvoice, onEdit, onEmail, onShare, onWhatsApp, onDuplicate, onDelete, onConvert }) => {
    const proposal = useStore(s => (s.proposals || []).find(p => p.id === proposalId)) || null;
    const addToast = useStore(s => s.addToast);
    const [savingValidity, setSavingValidity] = useState(false);
    const views = useMemo(() => [...proposalViews(proposal)].sort((a, b) => (toDate(b.timestamp)?.getTime() || 0) - (toDate(a.timestamp)?.getTime() || 0)), [proposal]);

    if (!proposalId) return null;

    const state = proposal ? proposalState(proposal) : 'draft';
    const cfg = PROPOSAL_STATE_LABEL[state];
    const value = proposal ? proposalValue(proposal) : 0;
    const approval = proposal?.approvalMetadata;
    const rejection = proposal?.rejectionMetadata;
    const lastSeen = proposal ? lastViewedAt(proposal) : null;

    const update = async (updates, message) => {
        try {
            await useStore.getState().updateProposal(proposal.id, updates);
            if (message) addToast(message, 'success');
        } catch (err) {
            console.error(err);
            addToast("Couldn't update the proposal. Please try again.", 'error');
        }
    };

    const saveValidity = async (value) => {
        setSavingValidity(true);
        await update({ validUntil: value || null }, value ? `Valid until ${formatDay(`${value}T12:00:00`)}.` : 'Expiry date removed.');
        setSavingValidity(false);
    };

    const revoke = () => {
        if (!window.confirm(`Revoke ${approval?.signedBy || 'the client'}'s signature? The proposal reopens and must be signed again.`)) return;
        update({ status: 'Sent', approvalMetadata: null, rejectionMetadata: null, clientSignature: null }, 'Signature revoked. The proposal is open again.');
    };
    const reopen = () => {
        if (!window.confirm('Reopen this declined proposal so the client can respond again?')) return;
        update({ status: 'Sent', rejectionMetadata: null }, 'Proposal reopened.');
    };

    return (
        <Sheet
            open={Boolean(proposalId)}
            onClose={onClose}
            size="md"
            title={proposal ? (proposal.clientName || 'Untitled proposal') : 'Proposal'}
            subtitle={proposal ? [proposal.proposalNumber, proposal.campaignName].filter(Boolean).join(' · ') || 'No number' : 'This proposal was deleted.'}
        >
            {!proposal ? (
                <p className="text-sm text-gray-500">It may have been deleted by someone else.</p>
            ) : (
                <div className="space-y-6">
                    <div className="rounded-2xl border border-black/[0.06] p-4 dark:border-white/[0.08]">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[12px] font-bold text-gray-500">Deal value</p>
                                <p className="text-3xl font-extrabold tracking-tight tabular-nums">{value ? inr(value) : '—'}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <Badge tone={cfg.tone}>{cfg.label}</Badge>
                                {proposal.isUploaded && <Badge tone="gray">PDF</Badge>}
                            </div>
                        </div>
                        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                            <div><dt className="text-gray-500">Created</dt><dd className="font-semibold">{formatDay(proposal.createdAt)}</dd></div>
                            <div><dt className="text-gray-500">Last viewed</dt><dd className="font-semibold">{lastSeen ? formatDateTime(lastSeen) : 'Not yet'}</dd></div>
                            <div><dt className="text-gray-500">Views</dt><dd className="font-semibold tabular-nums">{views.length}</dd></div>
                            <div>
                                <dt className="text-gray-500">Valid until</dt>
                                <dd>
                                    {canManage && !isProposalClosed(proposal) ? (
                                        <input
                                            type="date"
                                            value={proposal.validUntil ? String(proposal.validUntil).slice(0, 10) : ''}
                                            onChange={(e) => saveValidity(e.target.value)}
                                            disabled={savingValidity}
                                            className={cn('h-9 w-full rounded-lg border border-black/10 bg-transparent px-2 text-[13px] font-semibold outline-none dark:border-white/10', state === 'expired' && 'text-amber-600 dark:text-amber-400')}
                                            aria-label="Valid until"
                                        />
                                    ) : (
                                        <span className="font-semibold">{proposalExpiry(proposal) ? formatDay(proposalExpiry(proposal)) : 'No expiry'}</span>
                                    )}
                                </dd>
                            </div>
                        </dl>
                        {state === 'expired' && <p className="mt-3 text-[12px] text-amber-700 dark:text-amber-400">The client can no longer accept it. Move the date forward to reopen it.</p>}
                    </div>

                    {proposal.status === 'Accepted' && (
                        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4">
                            <p className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-neon-green"><CheckCircle2 size={16} /> Accepted</p>
                            <dl className="mt-2 space-y-1 text-[13px]">
                                {approval?.signedBy && <div><dt className="inline text-gray-500">Signed by </dt><dd className="inline font-semibold">{approval.signedBy}</dd></div>}
                                {approval?.email && <div><dt className="inline text-gray-500">Email </dt><dd className="inline font-semibold">{approval.email}</dd></div>}
                                {approval?.signedAt && <div><dt className="inline text-gray-500">When </dt><dd className="inline font-semibold">{formatDateTime(approval.signedAt)}</dd></div>}
                                {approval?.ip && <div><dt className="inline text-gray-500">IP </dt><dd className="inline font-mono text-[12px]">{approval.ip}</dd></div>}
                            </dl>
                            {(approval?.clientSignature || proposal.clientSignature) && (
                                <img src={approval?.clientSignature || proposal.clientSignature} alt="Client signature" className="mt-3 h-14 rounded-lg bg-white p-1" />
                            )}
                            <div className="mt-3 flex flex-wrap gap-2">
                                {canInvoice && (proposal.convertedInvoiceId ? (
                                    <Button as={Link} to={`/admin/edit-invoice/${proposal.convertedInvoiceId}`} variant="secondary" size="sm"><Receipt size={13} /> View invoice</Button>
                                ) : (
                                    <Button variant="primary" size="sm" onClick={() => onConvert(proposal)}><Receipt size={13} /> Create invoice</Button>
                                ))}
                                {canManage && <Button variant="ghost" size="sm" onClick={revoke}><RotateCcw size={13} /> Revoke signature</Button>}
                            </div>
                        </div>
                    )}

                    {proposal.status === 'Rejected' && (
                        <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.05] p-4">
                            <p className="flex items-center gap-2 text-sm font-bold text-red-600 dark:text-red-400"><XCircle size={16} /> Declined</p>
                            <p className="mt-2 text-[13px]">{rejection?.reason || 'No reason given.'}</p>
                            {rejection?.rejectedAt && <p className="mt-1 text-[12px] text-gray-500">{formatDateTime(rejection.rejectedAt)}</p>}
                            {canManage && <Button variant="ghost" size="sm" onClick={reopen} className="mt-3"><RotateCcw size={13} /> Reopen</Button>}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        <Button as="a" href={`/proposal/${proposal.id}`} target="_blank" rel="noopener noreferrer" variant="secondary"><ExternalLink size={14} /> Open</Button>
                        {canManage && <Button variant="secondary" onClick={() => onEdit(proposal)}><Edit size={14} /> Edit</Button>}
                        <Button variant="secondary" onClick={() => onEmail(proposal)}><Mail size={14} /> Email</Button>
                        <Button variant="secondary" onClick={() => onWhatsApp(proposal)}><MessageCircle size={14} /> WhatsApp</Button>
                        <Button variant="secondary" onClick={() => onShare(proposal)}><Share2 size={14} /> Share</Button>
                        {canManage && <Button variant="secondary" onClick={() => onDuplicate(proposal)}><CopyPlus size={14} /> Duplicate</Button>}
                        {canInvoice && proposal.status !== 'Accepted' && !proposal.convertedInvoiceId && (
                            <Button variant="secondary" onClick={() => onConvert(proposal)}><Receipt size={14} /> Invoice</Button>
                        )}
                        {canManage && <Button variant="ghost" onClick={() => onDelete(proposal)} className="text-red-500 hover:text-red-600"><Trash2 size={14} /> Delete</Button>}
                    </div>

                    <div>
                        <p className="mb-2 text-[13px] font-bold">Views</p>
                        {views.length === 0 ? (
                            <p className="rounded-2xl bg-black/[0.03] p-4 text-[13px] text-gray-500 dark:bg-white/[0.04]">The client hasn't opened it yet. Views from your own admin account aren't counted.</p>
                        ) : (
                            <ul className="divide-y divide-black/[0.05] rounded-2xl border border-black/[0.06] dark:divide-white/[0.05] dark:border-white/[0.08]">
                                {views.slice(0, 50).map((log, i) => (
                                    <li key={i} className="flex items-center gap-3 px-4 py-3">
                                        <Eye size={15} className="shrink-0 text-gray-400" />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[13px] font-semibold">{log.shareName || log.userName || (log.userEmail && log.userEmail !== 'Guest' ? log.userEmail : viaLabel(log.via))}</p>
                                            <p className="truncate text-[12px] text-gray-500">{[viaLabel(log.via), deviceOf(log.userAgent), log.shareEmail].filter(Boolean).join(' · ')}</p>
                                        </div>
                                        <span className="shrink-0 text-[12px] text-gray-500">{formatDateTime(log.timestamp)}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </Sheet>
    );
};

export default ProposalDetailPanel;
