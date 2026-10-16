import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import Scale from 'lucide-react/dist/esm/icons/scale';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Upload from 'lucide-react/dist/esm/icons/upload';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Send from 'lucide-react/dist/esm/icons/send';
import Eye from 'lucide-react/dist/esm/icons/eye';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import PenLine from 'lucide-react/dist/esm/icons/pen-line';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Edit from 'lucide-react/dist/esm/icons/edit';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import CopyPlus from 'lucide-react/dist/esm/icons/copy-plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import Inbox from 'lucide-react/dist/esm/icons/inbox';
import { AnimatePresence } from 'framer-motion';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { copyToClipboard } from '../../lib/clipboard';
import { cn } from '../../lib/utils';
import { exportSubtitle, fileDate } from '../../lib/xlsx';
import ExportMenu from '../../components/admin/ExportMenu';
import { FINANCE_ROLES } from '../../constants/roles';
import { contractState, CONTRACT_STATE_LABEL, contractValue, contractViews, contractLastViewed, contractParty, contractTitle } from '../../lib/contracts';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import { Card, Button, Badge, SearchInput, SegmentedTabs, EmptyState, Select, Menu, MenuItem, ViewToggle, useViewMode } from '../../components/admin/ui';
import AgreementEmailModal from '../../components/admin/AgreementEmailModal';
import UploadAgreementModal from '../../components/admin/UploadAgreementModal';
import ContractDetailPanel from '../../components/admin/contracts/ContractDetailPanel';
import { inr, toDate } from '../../components/admin/ticketing/format';

const FILTERS = ['all', 'draft', 'ready', 'viewed', 'signed'];
const PAGE = 48;
const LEGACY_STATUS = { Draft: 'draft', Final: 'ready', Executed: 'signed' };

const formatDay = (d) => (d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const relative = (d) => {
    if (!d) return '';
    const mins = Math.round((Date.now() - d.getTime()) / 60000);
    if (mins < 60) return `${Math.max(1, mins)}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return days < 30 ? `${days}d ago` : formatDay(d);
};

const Kpi = ({ icon: Icon, label, value, hint, tone, active, onClick }) => {
    const tones = {
        gray: 'bg-black/5 text-gray-700 dark:bg-white/5 dark:text-zinc-300',
        blue: 'bg-neon-blue/10 text-sky-700 dark:text-neon-blue',
        green: 'bg-neon-green/10 text-emerald-700 dark:text-neon-green',
        violet: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
    };
    return (
        <button type="button" onClick={onClick} className="text-left">
            <Card className={cn('h-full rounded-2xl p-4 transition-colors hover:border-black/15 dark:hover:border-white/15', active && 'border-gray-900 dark:border-white/60')}>
                <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', tones[tone])}><Icon size={17} /></span>
                <p className="mt-3 truncate text-[20px] font-extrabold leading-none tracking-tight tabular-nums sm:text-[24px]">{value}</p>
                <p className="mt-1.5 truncate text-[12px] font-bold text-gray-700 dark:text-zinc-300">{label}</p>
                <p className="truncate text-[11px] text-gray-500">{hint}</p>
            </Card>
        </button>
    );
};

const AgreementManagement = () => {
    useStoreSubscription(['agreements']);
    const navigate = useNavigate();
    const agreements = useStore(s => s.agreements) || [];
    const user = useStore(s => s.user);
    const addToast = useStore(s => s.addToast);
    const [params, setParams] = useSearchParams();

    const legacy = LEGACY_STATUS[params.get('status')];
    const filter = FILTERS.includes(params.get('filter')) ? params.get('filter') : (legacy || 'all');
    const openId = params.get('contract');
    const setParam = (key, value, push = false) => {
        const next = new URLSearchParams(params);
        if (value) next.set(key, value); else next.delete(key);
        if (key === 'filter') next.delete('status');
        setParams(next, { replace: !push });
    };

    const [view, setView] = useViewMode('contracts', 'cards');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('newest');
    const [limit, setLimit] = useState(PAGE);
    const [emailContract, setEmailContract] = useState(null);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [editingUpload, setEditingUpload] = useState(null);

    const isEditor = user?.role === 'editor' || user?.role === 'content_admin';
    const canManage = !isEditor;
    const canInvoice = FINANCE_ROLES.includes(user?.role);

    const visible = useMemo(() => (isEditor ? agreements.filter(a => a.createdBy === user?.uid) : agreements), [agreements, isEditor, user?.uid]);

    const enriched = useMemo(() => visible.map(a => ({
        a,
        state: contractState(a),
        value: contractValue(a),
        party: contractParty(a),
        title: contractTitle(a),
        created: toDate(a.createdAt),
        viewed: contractLastViewed(a),
        views: contractViews(a).length,
    })), [visible]);

    const counts = useMemo(() => {
        const c = Object.fromEntries(FILTERS.map(f => [f, 0]));
        enriched.forEach(e => { c.all += 1; c[e.state] += 1; });
        return c;
    }, [enriched]);

    const kpis = useMemo(() => {
        const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
        let awaitingValue = 0, signedMonth = 0, signedMonthValue = 0;
        enriched.forEach(e => {
            if (e.state === 'ready') awaitingValue += e.value;
            if (e.state === 'signed') {
                const when = toDate(e.a.approvalMetadata?.signedAt || e.a.executedAt);
                if (when && when >= monthStart) { signedMonth += 1; signedMonthValue += e.value; }
            }
        });
        return { awaitingValue, signedMonth, signedMonthValue };
    }, [enriched]);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = enriched.filter(e => {
            if (filter !== 'all' && e.state !== filter) return false;
            if (!q) return true;
            return [e.party, e.title, e.a.agreementNumber, e.a.parties?.secondParty?.email, e.a.fileName].some(v => String(v || '').toLowerCase().includes(q));
        });
        const by = {
            newest: (x, y) => (y.created?.getTime() || 0) - (x.created?.getTime() || 0),
            value: (x, y) => y.value - x.value,
            viewed: (x, y) => (y.viewed?.getTime() || 0) - (x.viewed?.getTime() || 0),
            party: (x, y) => x.party.localeCompare(y.party),
        }[sort];
        return list.sort(by);
    }, [enriched, filter, search, sort]);

    // ── actions ──
    const urlFor = (a, via) => `${window.location.origin}/agreement/${a.id}?via=${via}`;
    const markShared = (a, via) => useStore.getState().markAgreementShared(a.id, via).catch(err => console.warn('Share not recorded', err));

    const copyLink = async (a) => {
        const ok = await copyToClipboard(urlFor(a, 'link'));
        addToast(ok ? 'Contract link copied.' : "Couldn't copy the link.", ok ? 'success' : 'error');
        if (ok) markShared(a, 'link');
    };
    const share = async (a) => {
        if (navigator.share) {
            try {
                await navigator.share({ title: `Contract for ${contractParty(a) || 'you'}`, text: 'Your contract from Newbi Entertainment.', url: urlFor(a, 'share') });
                markShared(a, 'share');
                return;
            } catch (err) {
                if (err?.name === 'AbortError') return;
            }
        }
        copyLink(a);
    };
    const whatsapp = (a) => {
        const name = contractParty(a);
        const text = `Hi${name ? ` ${name}` : ''}, here is your contract from Newbi Entertainment: ${urlFor(a, 'whatsapp')}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
        markShared(a, 'whatsapp');
    };
    const edit = (a) => {
        if (a.isUploaded) { setEditingUpload(a); setUploadOpen(true); }
        else navigate(`/admin/agreements/edit/${a.id}`);
    };
    const duplicate = async (a) => {
        if (!window.confirm(`Make a new draft copy of ${a.agreementNumber || 'this contract'}?`)) return;
        try {
            const newId = await useStore.getState().duplicateAgreement(a.id);
            addToast('Copied as a new draft.', 'success');
            const id = typeof newId === 'string' ? newId : newId?.id;
            if (id) setParam('contract', id, true);
        } catch (err) {
            console.error(err);
            addToast("Couldn't duplicate the contract.", 'error');
        }
    };
    const remove = async (a) => {
        if (!canManage) { addToast("Editors can't delete contracts.", 'info'); return; }
        const signed = a.status === 'Executed';
        if (!window.confirm(`Delete ${a.agreementNumber || 'this contract'} with ${contractParty(a) || 'this party'}?${signed ? ' It has been SIGNED — the signed record will be lost.' : ''} The link will stop working. This can't be undone.`)) return;
        try {
            await useStore.getState().deleteAgreement(a.id);
            if (openId === a.id) setParam('contract', null);
            addToast('Contract deleted.', 'success');
        } catch (err) {
            console.error(err);
            addToast("Couldn't delete the contract.", 'error');
        }
    };
    const sendEmail = async ({ to, cc, bcc, subject, html }) => {
        const { auth } = await import('../../lib/firebase');
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        const res = await fetch('/api/mail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
            body: JSON.stringify({ to, cc, bcc, subject, html, fromName: 'Newbi Legal', fromEmail: 'partnership@newbi.live' }),
        });
        const result = await res.json().catch(() => ({}));
        if (!result.success) throw new Error(result.error || 'Send failed');
        if (emailContract) markShared(emailContract, 'email');
    };

    const exportSpec = () => ({
        filename: `contracts_${filter}_${fileDate()}`,
        sheetName: 'Contracts',
        title: 'Contracts',
        subtitle: exportSubtitle(rows.length, 'contract', filter !== 'all' ? CONTRACT_STATE_LABEL[filter]?.label : null),
        rows,
        totals: { value: true },
        columns: [
            { header: 'Contract No', value: r => r.a.agreementNumber || '' },
            { header: 'Other Party', value: r => r.party || '' },
            { header: 'Project', value: r => r.title || '' },
            { header: 'Value', key: 'value', type: 'money', value: r => r.value },
            { header: 'Status', value: r => CONTRACT_STATE_LABEL[r.state].label },
            { header: 'Effective Date', type: 'date', value: r => (r.a.effectiveDate ? String(r.a.effectiveDate).slice(0, 10) : null) },
            { header: 'Created', type: 'date', value: r => r.created || null },
            { header: 'Views', type: 'number', value: r => r.views || 0 },
            { header: 'Last Viewed', type: 'datetime', value: r => r.viewed || null },
            { header: 'Signed By', value: r => r.a.approvalMetadata?.signedBy || '' },
            { header: 'Signed At', type: 'datetime', value: r => r.a.approvalMetadata?.signedAt || null },
            { header: 'Link', value: r => `${window.location.origin}/agreement/${r.a.id}` },
        ],
    });

    const shown = rows.slice(0, limit);

    const actionsMenu = (a) => (
        <Menu trigger={({ toggle }) => (
            <Button size="sm" variant="ghost" onClick={toggle} aria-label="More actions" className="w-9 px-0"><MoreHorizontal size={15} /></Button>
        )}>
            <MenuItem icon={FileText} onClick={() => setParam('contract', a.id, true)}>Details & activity</MenuItem>
            <MenuItem as="a" href={`/agreement/${a.id}`} target="_blank" rel="noopener noreferrer" icon={ExternalLink}>Open contract</MenuItem>
            {canManage && <MenuItem icon={Edit} onClick={() => edit(a)}>Edit</MenuItem>}
            <MenuItem icon={Mail} onClick={() => setEmailContract(a)}>Email for signature</MenuItem>
            <MenuItem icon={MessageCircle} onClick={() => whatsapp(a)}>Send on WhatsApp</MenuItem>
            <MenuItem icon={Link2} onClick={() => copyLink(a)}>Copy link</MenuItem>
            {canManage && <MenuItem icon={CopyPlus} onClick={() => duplicate(a)}>Duplicate as draft</MenuItem>}
            {canManage && <MenuItem icon={Trash2} danger onClick={() => remove(a)}>Delete</MenuItem>}
        </Menu>
    );

    return (
        <AdminCommunityHubLayout
            studioHeader={{ title: 'Contracts', icon: Scale, accentClass: 'text-purple-600 dark:text-purple-400', description: 'Agreements, signatures and who has opened what' }}
            tabs={[
                ...(canInvoice ? [{ name: 'Invoices', path: '/admin/invoices', icon: FileText }] : []),
                { name: 'Proposals', path: '/admin/proposals', icon: FileSpreadsheet },
                { name: 'Contracts', path: '/admin/agreements', icon: ShieldCheck },
            ]}
            action={(
                // Phones: the main action gets its own full-width row, the other two share one.
                <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
                    <Button as={Link} to="/admin/agreements/new" variant="primary" className="col-span-2 sm:order-last"><Plus size={14} /> New contract</Button>
                    <Button variant="secondary" onClick={() => { setEditingUpload(null); setUploadOpen(true); }}><Upload size={14} /> Add PDF</Button>
                    <Button as={Link} to="/admin/ai-studio?type=contract" variant="secondary"><Sparkles size={14} /> Draft with AI</Button>
                </div>
            )}
        >
            <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Kpi icon={PenLine} tone="gray" label="Drafts" value={counts.draft} hint={counts.draft ? 'Still being written' : 'No drafts'} active={filter === 'draft'} onClick={() => setParam('filter', filter === 'draft' ? null : 'draft')} />
                    <Kpi icon={Send} tone="blue" label="Ready to sign" value={counts.ready} hint={kpis.awaitingValue ? `${inr(kpis.awaitingValue)} awaiting signature` : 'Not opened yet'} active={filter === 'ready'} onClick={() => setParam('filter', filter === 'ready' ? null : 'ready')} />
                    <Kpi icon={Eye} tone="violet" label="Viewed, not signed" value={counts.viewed} hint={counts.viewed ? 'Good time to follow up' : 'No open views'} active={filter === 'viewed'} onClick={() => setParam('filter', filter === 'viewed' ? null : 'viewed')} />
                    <Kpi icon={CheckCircle2} tone="green" label="Signed this month" value={kpis.signedMonth} hint={kpis.signedMonthValue ? inr(kpis.signedMonthValue) : `${counts.signed} signed in total`} active={filter === 'signed'} onClick={() => setParam('filter', filter === 'signed' ? null : 'signed')} />
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <SearchInput value={search} onChange={(v) => { setSearch(v); setLimit(PAGE); }} placeholder="Party, project or contract number" className="lg:w-80" />
                    <div className="flex flex-1 items-center gap-2">
                        <Select value={sort} onChange={setSort} label="Sort" className="flex-1 lg:w-48 lg:flex-none" options={[
                            { value: 'newest', label: 'Newest first' },
                            { value: 'viewed', label: 'Recently viewed' },
                            { value: 'value', label: 'Largest value' },
                            { value: 'party', label: 'Party A–Z' },
                        ]} />
                        <ExportMenu getSpec={exportSpec} />
                        <ViewToggle value={view} onChange={setView} />
                    </div>
                </div>

                <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                    <SegmentedTabs
                        value={filter}
                        onChange={(v) => { setParam('filter', v === 'all' ? null : v); setLimit(PAGE); }}
                        items={FILTERS.filter(f => f === 'all' || f === filter || counts[f] > 0).map(f => ({
                            value: f, label: f === 'all' ? 'All' : CONTRACT_STATE_LABEL[f].label, count: counts[f], highlight: f === 'viewed' && counts[f] > 0,
                        }))}
                    />
                </div>

                {shown.length === 0 ? (
                    <Card className="rounded-2xl">
                        <EmptyState
                            icon={Inbox}
                            title={visible.length ? 'No matching contracts' : 'No contracts yet'}
                            description={visible.length ? 'Try another filter or search.' : 'Draft one, or add a signed PDF you already have.'}
                            action={!visible.length && <Button as={Link} to="/admin/agreements/new" variant="primary"><Plus size={14} /> New contract</Button>}
                        />
                    </Card>
                ) : view === 'cards' ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {shown.map(({ a, state, value, party, title, created, viewed, views }) => {
                            const cfg = CONTRACT_STATE_LABEL[state];
                            return (
                                <Card key={a.id} className="relative flex flex-col rounded-2xl p-4 transition-colors hover:border-black/15 dark:hover:border-white/15">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <Badge tone={cfg.tone}>{cfg.label}</Badge>
                                            {a.isUploaded && <Badge tone="gray">PDF</Badge>}
                                        </div>
                                        <span className="shrink-0 truncate font-mono text-[11px] text-gray-500">{a.agreementNumber || ''}</span>
                                    </div>
                                    <button type="button" onClick={() => setParam('contract', a.id, true)} className="mt-3 min-w-0 text-left after:absolute after:inset-0">
                                        <p className="line-clamp-2 text-[17px] font-extrabold leading-snug">{party || 'Untitled'}</p>
                                        <p className="mt-0.5 truncate text-[12px] text-gray-500">{title || a.fileName || ' '}</p>
                                    </button>
                                    <p className="mt-3 text-[22px] font-extrabold tracking-tight tabular-nums">{value ? inr(value) : '—'}</p>
                                    <div className="mt-1 space-y-0.5 text-[12px] text-gray-500">
                                        <p>{a.effectiveDate ? `Effective ${formatDay(toDate(a.effectiveDate))}` : `Created ${formatDay(created)}`}</p>
                                        {state === 'signed'
                                            ? <p className="text-emerald-700 dark:text-neon-green">Signed by {a.approvalMetadata?.signedBy || 'the other party'}{a.approvalMetadata?.signedAt ? ` · ${formatDay(toDate(a.approvalMetadata.signedAt))}` : ''}</p>
                                            : <p className={cn(viewed && 'font-semibold text-purple-700 dark:text-purple-400')}>{viewed ? `Viewed ${relative(viewed)} · ${views} ${views === 1 ? 'view' : 'views'}` : state === 'draft' ? 'Not shared yet' : 'Not opened yet'}</p>}
                                    </div>
                                    <div className="relative z-10 mt-4 flex items-center gap-2 border-t border-black/[0.06] pt-3 dark:border-white/[0.06]">
                                        <Button size="sm" variant="secondary" onClick={() => share(a)} className="flex-1"><Share2 size={13} /> Share</Button>
                                        <Button size="sm" as="a" href={`/agreement/${a.id}`} target="_blank" rel="noopener noreferrer" variant="secondary" aria-label="Open contract" className="w-9 px-0"><ExternalLink size={14} /></Button>
                                        {actionsMenu(a)}
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <Card className="overflow-hidden rounded-2xl">
                        <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                            {shown.map(({ a, state, value, party, title, created, viewed }) => {
                                const cfg = CONTRACT_STATE_LABEL[state];
                                return (
                                    <li key={a.id} className="relative flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.02] sm:px-5">
                                        <button type="button" onClick={() => setParam('contract', a.id, true)} className="min-w-0 flex-1 text-left after:absolute after:inset-0">
                                            <span className="flex flex-wrap items-center gap-2">
                                                <span className="truncate text-[15px] font-bold">{party || 'Untitled'}</span>
                                                <Badge tone={cfg.tone}>{cfg.label}</Badge>
                                                {a.isUploaded && <Badge tone="gray">PDF</Badge>}
                                            </span>
                                            <span className="mt-0.5 block truncate text-[12px] text-gray-500">
                                                {[a.agreementNumber, title, formatDay(created), viewed && state !== 'signed' ? `viewed ${relative(viewed)}` : null].filter(Boolean).join(' · ')}
                                            </span>
                                        </button>
                                        <p className="shrink-0 text-right text-[15px] font-extrabold tabular-nums">{value ? inr(value) : '—'}</p>
                                        <div className="relative z-10 flex shrink-0 items-center gap-1">
                                            <Button size="sm" variant="secondary" onClick={() => share(a)} aria-label="Share contract" className="hidden w-9 px-0 sm:inline-flex"><Share2 size={14} /></Button>
                                            {actionsMenu(a)}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </Card>
                )}
                {rows.length > limit && (
                    <div className="text-center">
                        <Button variant="ghost" onClick={() => setLimit(l => l + PAGE)}>Show {Math.min(PAGE, rows.length - limit)} more of {rows.length - limit}</Button>
                    </div>
                )}
            </div>

            <ContractDetailPanel
                contractId={openId}
                onClose={() => setParam('contract', null)}
                canManage={canManage}
                onEdit={edit}
                onEmail={setEmailContract}
                onShare={share}
                onWhatsApp={whatsapp}
                onDuplicate={duplicate}
                onDelete={remove}
            />
            <AnimatePresence>
                {emailContract && (
                    <AgreementEmailModal isOpen={Boolean(emailContract)} onClose={() => setEmailContract(null)} agreement={emailContract} onSend={sendEmail} />
                )}
            </AnimatePresence>
            <UploadAgreementModal
                isOpen={uploadOpen}
                onClose={() => { setUploadOpen(false); setEditingUpload(null); }}
                onSuccess={(id) => { setUploadOpen(false); setEditingUpload(null); if (id) setParam('contract', id, true); }}
                editingAgreement={editingUpload}
            />
        </AdminCommunityHubLayout>
    );
};

export default AgreementManagement;
