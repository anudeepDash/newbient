import React, { useMemo } from 'react';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Edit from 'lucide-react/dist/esm/icons/edit';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import CopyPlus from 'lucide-react/dist/esm/icons/copy-plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Eye from 'lucide-react/dist/esm/icons/eye';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import Send from 'lucide-react/dist/esm/icons/send';
import { useStore } from '../../../lib/store';
import { contractState, CONTRACT_STATE_LABEL, contractValue, contractViews, contractLastViewed, contractParty, contractTitle } from '../../../lib/contracts';
import Sheet from '../Sheet';
import { Button, Badge } from '../ui';
import { inr, formatDateTime, toDate } from '../ticketing/format';
import { contractIssues } from './contractRules';

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

const ContractDetailPanel = ({ contractId, onClose, canManage, onEdit, onEmail, onShare, onWhatsApp, onDuplicate, onDelete }) => {
    const contract = useStore(s => (s.agreements || []).find(a => a.id === contractId)) || null;
    const agreements = useStore(s => s.agreements);
    const addToast = useStore(s => s.addToast);
    const views = useMemo(() => [...contractViews(contract)].sort((a, b) => (toDate(b.timestamp)?.getTime() || 0) - (toDate(a.timestamp)?.getTime() || 0)), [contract]);

    if (!contractId) return null;

    const state = contract ? contractState(contract) : 'draft';
    const cfg = CONTRACT_STATE_LABEL[state];
    const value = contract ? contractValue(contract) : 0;
    const approval = contract?.approvalMetadata;
    const lastSeen = contract ? contractLastViewed(contract) : null;

    const update = async (updates, message) => {
        try {
            await useStore.getState().updateAgreement(contract.id, updates);
            if (message) addToast(message, 'success');
        } catch (err) {
            console.error(err);
            addToast('Check your connection and try again.', 'error', { title: 'Contract not updated', action: { label: 'Try again', onClick: () => update(updates, message) } });
        }
    };

    const revoke = () => {
        if (!window.confirm(`Revoke ${approval?.signedBy || 'the client'}'s signature? The contract goes back to "ready to sign".`)) return;
        update({ status: 'Final', approvalMetadata: null, clientSignature: null, executedAt: null }, 'Signature revoked.');
    };

    return (
        <Sheet
            open={Boolean(contractId)}
            onClose={onClose}
            size="md"
            title={contract ? (contractParty(contract) || 'Untitled contract') : 'Contract'}
            subtitle={contract ? [contract.agreementNumber, contractTitle(contract)].filter(Boolean).join(' · ') : 'This contract was deleted.'}
        >
            {!contract ? (
                <p className="text-sm text-gray-500">It may have been deleted by someone else.</p>
            ) : (
                <div className="space-y-6">
                    <div className="rounded-2xl border border-black/[0.06] p-4 dark:border-white/[0.08]">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[12px] font-bold text-gray-500">Contract value</p>
                                <p className="text-3xl font-extrabold tracking-tight tabular-nums">{value ? inr(value) : '—'}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <Badge tone={cfg.tone}>{cfg.label}</Badge>
                                {contract.isUploaded && <Badge tone="gray">PDF</Badge>}
                            </div>
                        </div>
                        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                            <div><dt className="text-gray-500">Effective</dt><dd className="font-semibold">{formatDay(contract.effectiveDate)}</dd></div>
                            <div><dt className="text-gray-500">Created</dt><dd className="font-semibold">{formatDay(contract.createdAt)}</dd></div>
                            <div><dt className="text-gray-500">Last viewed</dt><dd className="font-semibold">{lastSeen ? formatDateTime(lastSeen) : 'Not yet'}</dd></div>
                            <div><dt className="text-gray-500">Views</dt><dd className="font-semibold tabular-nums">{views.length}</dd></div>
                        </dl>
                        {canManage && state === 'draft' && (() => {
                            // Same checks as the builder's Review step.
                            const blocking = contract.isUploaded ? [] : contractIssues(contract, { agreements, id: contract.id }).filter(i => i.blocking); // uploaded PDFs have no builder fields
                            return (
                                <div className="mt-4 space-y-2">
                                    <Button size="sm" variant="primary" disabled={blocking.length > 0} onClick={() => update({ status: 'Final' }, 'Marked ready to sign.')}><Send size={13} /> Mark ready to sign</Button>
                                    {blocking.length > 0 && (
                                        <div className="rounded-xl bg-amber-500/[0.08] p-3 text-[12px] text-amber-800 dark:text-amber-300">
                                            <p className="font-semibold">Finish these in the editor first:</p>
                                            <ul className="mt-1 list-disc space-y-0.5 pl-4">
                                                {blocking.slice(0, 5).map(i => <li key={i.message}>{i.message}</li>)}
                                            </ul>
                                            {onEdit && <button type="button" onClick={() => onEdit(contract)} className="mt-2 font-semibold underline">Open editor</button>}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                        {canManage && (state === 'ready' || state === 'viewed') && (
                            <Button size="sm" variant="ghost" className="mt-4" onClick={() => update({ status: 'Draft' }, 'Moved back to draft.')}><RotateCcw size={13} /> Back to draft</Button>
                        )}
                    </div>

                    {state === 'signed' && (
                        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4">
                            <p className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-neon-green"><CheckCircle2 size={16} /> Signed</p>
                            <dl className="mt-2 space-y-1 text-[13px]">
                                {approval?.signedBy && <div><dt className="inline text-gray-500">Signed by </dt><dd className="inline font-semibold">{approval.signedBy}</dd></div>}
                                {approval?.email && <div><dt className="inline text-gray-500">Email </dt><dd className="inline font-semibold">{approval.email}</dd></div>}
                                {approval?.signedAt && <div><dt className="inline text-gray-500">When </dt><dd className="inline font-semibold">{formatDateTime(approval.signedAt)}</dd></div>}
                                {approval?.ip && <div><dt className="inline text-gray-500">IP </dt><dd className="inline font-mono text-[12px]">{approval.ip}</dd></div>}
                            </dl>
                            {(approval?.clientSignature || contract.clientSignature) && (
                                <img src={approval?.clientSignature || contract.clientSignature} alt="Client signature" className="mt-3 h-14 rounded-lg bg-white p-1" />
                            )}
                            {canManage && <Button variant="ghost" size="sm" onClick={revoke} className="mt-3"><RotateCcw size={13} /> Revoke signature</Button>}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        <Button as="a" href={`/agreement/${contract.id}`} target="_blank" rel="noopener noreferrer" variant="secondary"><ExternalLink size={14} /> Open</Button>
                        {canManage && <Button variant="secondary" onClick={() => onEdit(contract)}><Edit size={14} /> Edit</Button>}
                        <Button variant="secondary" onClick={() => onEmail(contract)}><Mail size={14} /> Email</Button>
                        <Button variant="secondary" onClick={() => onWhatsApp(contract)}><MessageCircle size={14} /> WhatsApp</Button>
                        <Button variant="secondary" onClick={() => onShare(contract)}><Share2 size={14} /> Share</Button>
                        {canManage && <Button variant="secondary" onClick={() => onDuplicate(contract)}><CopyPlus size={14} /> Duplicate</Button>}
                        {canManage && <Button variant="ghost" onClick={() => onDelete(contract)} className="text-red-500 hover:text-red-600"><Trash2 size={14} /> Delete</Button>}
                    </div>

                    <div>
                        <p className="mb-2 text-[13px] font-bold">Views</p>
                        {views.length === 0 ? (
                            <p className="rounded-2xl bg-black/[0.03] p-4 text-[13px] text-gray-500 dark:bg-white/[0.04]">The other party hasn't opened it yet.</p>
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

export default ContractDetailPanel;
