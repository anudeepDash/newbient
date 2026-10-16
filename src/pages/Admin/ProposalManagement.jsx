import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Upload from 'lucide-react/dist/esm/icons/upload';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Send from 'lucide-react/dist/esm/icons/send';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import Percent from 'lucide-react/dist/esm/icons/percent';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Edit from 'lucide-react/dist/esm/icons/edit';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import CopyPlus from 'lucide-react/dist/esm/icons/copy-plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import Receipt from 'lucide-react/dist/esm/icons/receipt';
import Eye from 'lucide-react/dist/esm/icons/eye';
import Inbox from 'lucide-react/dist/esm/icons/inbox';
import { AnimatePresence } from 'framer-motion';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { copyToClipboard } from '../../lib/clipboard';
import { cn } from '../../lib/utils';
import { exportSubtitle, fileDate } from '../../lib/xlsx';
import ExportMenu from '../../components/admin/ExportMenu';
import { FINANCE_ROLES } from '../../constants/roles';
import { proposalState, PROPOSAL_STATE_LABEL, proposalValue, proposalViews, lastViewedAt, proposalExpiry } from '../../lib/proposals';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import { Card, Button, Badge, SearchInput, SegmentedTabs, EmptyState, Select, Menu, MenuItem, ViewToggle, useViewMode } from '../../components/admin/ui';
import ProposalEmailModal from '../../components/admin/ProposalEmailModal';
import UploadProposalModal from '../../components/admin/UploadProposalModal';
import ProposalDetailPanel from '../../components/admin/proposals/ProposalDetailPanel';
import { inr, toDate } from '../../components/admin/ticketing/format';

const FILTERS = ['all', 'draft', 'sent', 'viewed', 'accepted', 'declined', 'expired'];
const PAGE = 48;
const LEGACY_STATUS = { Draft: 'draft', Sent: 'sent', Accepted: 'accepted', Rejected: 'declined' };

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
    const Comp = onClick ? 'button' : 'div';
    return (
        <Comp type={onClick ? 'button' : undefined} onClick={onClick} className="text-left">
            <Card className={cn('h-full rounded-2xl p-4', onClick && 'transition-colors hover:border-black/15 dark:hover:border-white/15', active && 'border-gray-900 dark:border-white/60')}>
                <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', tones[tone])}><Icon size={17} /></span>
                <p className="mt-3 truncate text-[20px] font-extrabold leading-none tracking-tight tabular-nums sm:text-[24px]">{value}</p>
                <p className="mt-1.5 truncate text-[12px] font-bold text-gray-700 dark:text-zinc-300">{label}</p>
                <p className="truncate text-[11px] text-gray-500">{hint}</p>
            </Card>
        </Comp>
    );
};

const ProposalManagement = () => {
    useStoreSubscription(['proposals']);
    const navigate = useNavigate();
    const proposals = useStore(s => s.proposals) || [];
    const user = useStore(s => s.user);
    const addToast = useStore(s => s.addToast);
    const [params, setParams] = useSearchParams();

    const legacy = LEGACY_STATUS[params.get('status')];
    const filter = FILTERS.includes(params.get('filter')) ? params.get('filter') : (legacy || 'all');
    const openId = params.get('proposal');
    const setParam = (key, value, push = false) => {
        const next = new URLSearchParams(params);
        if (value) next.set(key, value); else next.delete(key);
        if (key === 'filter') next.delete('status');
        setParams(next, { replace: !push });
    };

    const [view, setView] = useViewMode('proposals', 'cards');
    const [search, setSearch] = useState('');
    // ?sort=viewed (from the dashboard) puts the most recently opened first.
    const [sort, setSort] = useState(() => (['newest', 'viewed', 'value', 'client'].includes(new URLSearchParams(window.location.search).get('sort')) ? new URLSearchParams(window.location.search).get('sort') : 'newest'));
    const [limit, setLimit] = useState(PAGE);
    const [emailProposal, setEmailProposal] = useState(null);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [editingUpload, setEditingUpload] = useState(null);

    const isEditor = user?.role === 'editor' || user?.role === 'content_admin';
    const canManage = !isEditor;
    const canInvoice = FINANCE_ROLES.includes(user?.role);

    // Deep links: ?upload=true opens the upload form, ?edit=<id> edits an uploaded
    // proposal. Both are cleared once handled so the form doesn't reopen.
    useEffect(() => {
        if (params.get('upload') === 'true') {
            setEditingUpload(null);
            setUploadOpen(true);
            setParam('upload', null);
            return;
        }
        const editId = params.get('edit');
        if (editId && proposals.length) {
            const found = proposals.find(p => p.id === editId);
            if (found?.isUploaded) { setEditingUpload(found); setUploadOpen(true); }
            setParam('edit', null);
        }
    }, [params, proposals.length]); // eslint-disable-line react-hooks/exhaustive-deps

    const visible = useMemo(() => (isEditor ? proposals.filter(p => p.createdBy === user?.uid) : proposals), [proposals, isEditor, user?.uid]);

    const enriched = useMemo(() => visible.map(p => ({
        p,
        state: proposalState(p),
        value: proposalValue(p),
        created: toDate(p.createdAt),
        viewed: lastViewedAt(p),
        views: proposalViews(p).length,
    })), [visible]);

    const counts = useMemo(() => {
        const c = Object.fromEntries(FILTERS.map(f => [f, 0]));
        enriched.forEach(e => { c.all += 1; c[e.state] += 1; });
        return c;
    }, [enriched]);

    const kpis = useMemo(() => {
        const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
        let pipeline = 0, waiting = 0, wonMonth = 0, decided = 0, won = 0;
        enriched.forEach(e => {
            if (e.state === 'sent' || e.state === 'viewed') { pipeline += e.value; waiting += 1; }
            if (e.state === 'accepted' || e.state === 'declined') decided += 1;
            if (e.state === 'accepted') {
                won += 1;
                const signed = toDate(e.p.approvalMetadata?.signedAt || e.p.respondedAt);
                if (signed && signed >= monthStart) wonMonth += e.value;
            }
        });
        return { pipeline, waiting, wonMonth, winRate: decided ? Math.round((won / decided) * 100) : null, decided };
    }, [enriched]);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = enriched.filter(e => {
            if (filter !== 'all' && e.state !== filter) return false;
            if (!q) return true;
            return [e.p.clientName, e.p.proposalNumber, e.p.campaignName, e.p.clientEmail, e.p.fileName].some(v => String(v || '').toLowerCase().includes(q));
        });
        const by = {
            newest: (a, b) => (b.created?.getTime() || 0) - (a.created?.getTime() || 0),
            value: (a, b) => b.value - a.value,
            viewed: (a, b) => (b.viewed?.getTime() || 0) - (a.viewed?.getTime() || 0),
            client: (a, b) => String(a.p.clientName || '').localeCompare(String(b.p.clientName || '')),
        }[sort];
        return list.sort(by);
    }, [enriched, filter, search, sort]);

    // ── actions ──
    const urlFor = (p, via) => `${window.location.origin}/proposal/${p.id}?via=${via}`;
    const markShared = (p, via) => useStore.getState().markProposalShared(p.id, via).catch(err => console.warn('Share status not saved', err));

    const copyLink = async (p) => {
        const ok = await copyToClipboard(urlFor(p, 'link'));
        addToast(ok ? 'Proposal link copied.' : "Couldn't copy the link.", ok ? 'success' : 'error');
        if (ok) markShared(p, 'link');
    };
    const share = async (p) => {
        if (navigator.share) {
            try {
                await navigator.share({ title: `Proposal for ${p.clientName || 'you'}`, text: 'Your proposal from Newbi Entertainment.', url: urlFor(p, 'share') });
                markShared(p, 'share');
                return;
            } catch (err) {
                if (err?.name === 'AbortError') return;
            }
        }
        copyLink(p);
    };
    const whatsapp = (p) => {
        const text = `Hi${p.clientName ? ` ${p.clientName}` : ''}, here is your proposal from Newbi Entertainment: ${urlFor(p, 'whatsapp')}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
        markShared(p, 'whatsapp');
    };
    const edit = (p) => {
        if (p.isUploaded) { setEditingUpload(p); setUploadOpen(true); }
        else navigate(`/admin/edit-proposal/${p.id}`);
    };
    const duplicate = async (p) => {
        if (!window.confirm(`Make a new draft copy of ${p.proposalNumber || 'this proposal'}?`)) return;
        try {
            const newId = await useStore.getState().duplicateProposal(p.id);
            addToast('Copied as a new draft.', 'success');
            if (newId) setParam('proposal', newId, true);
        } catch (err) {
            console.error(err);
            addToast("Couldn't duplicate the proposal.", 'error');
        }
    };
    const remove = async (p) => {
        if (!canManage) { addToast('Only admins can delete proposals.', 'info'); return; }
        const signed = p.status === 'Accepted';
        if (!window.confirm(`Delete ${p.proposalNumber || 'this proposal'} for ${p.clientName || 'this client'}?${signed ? ' It was signed by the client — the signed record will be lost.' : ''} The client's link will stop working. This can't be undone.`)) return;
        try {
            await useStore.getState().deleteProposal(p.id);
            if (openId === p.id) setParam('proposal', null);
            addToast('Proposal deleted.', 'success');
        } catch (err) {
            console.error(err);
            addToast("Couldn't delete the proposal.", 'error');
        }
    };
    const convert = async (p) => {
        if (p.convertedInvoiceId) { navigate(`/admin/edit-invoice/${p.convertedInvoiceId}`); return; }
        if (!window.confirm(`Create an invoice for ${p.clientName || 'this client'} from ${p.proposalNumber || 'this proposal'}? You can edit it before sending.`)) return;
        try {
            const invoiceId = await useStore.getState().convertProposalToInvoice(p.id);
            addToast('Invoice drafted from the proposal.', 'success');
            navigate(`/admin/edit-invoice/${invoiceId}`);
        } catch (err) {
            console.error(err);
            addToast("Couldn't create the invoice.", 'error');
        }
    };
    const sendEmail = async ({ to, cc, bcc, subject, html }) => {
        const { auth } = await import('../../lib/firebase');
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        const res = await fetch('/api/mail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
            body: JSON.stringify({ to, cc, bcc, subject, html, fromName: 'Newbi Partnerships', fromEmail: 'partnership@newbi.live' }),
        });
        const result = await res.json().catch(() => ({}));
        if (!result.success) throw new Error(result.error || 'Send failed');
        if (emailProposal) markShared(emailProposal, 'email');
    };

    const exportSpec = () => ({
        filename: `proposals_${filter}_${fileDate()}`,
        sheetName: 'Proposals',
        title: 'Proposals',
        subtitle: exportSubtitle(rows.length, 'proposal', filter !== 'all' ? PROPOSAL_STATE_LABEL[filter]?.label : null),
        rows,
        totals: { value: true, views: true },
        columns: [
            { header: 'Proposal No', value: r => r.p.proposalNumber || '' },
            { header: 'Client', value: r => r.p.clientName || '' },
            { header: 'Campaign', value: r => r.p.campaignName || '' },
            { header: 'Client Email', value: r => r.p.clientEmail || '' },
            { header: 'Value', key: 'value', type: 'money', value: r => r.value },
            { header: 'Status', value: r => PROPOSAL_STATE_LABEL[r.state].label },
            { header: 'Created', type: 'date', value: r => r.created || null },
            { header: 'Valid Until', type: 'date', value: r => r.p.validUntil || null },
            { header: 'Views', key: 'views', type: 'number', value: r => r.views || 0 },
            { header: 'Last Viewed', type: 'datetime', value: r => r.viewed || null },
            { header: 'Signed By', value: r => r.p.approvalMetadata?.signedBy || '' },
            { header: 'Decline Reason', value: r => r.p.rejectionMetadata?.reason || '' },
            { header: 'Link', value: r => `${window.location.origin}/proposal/${r.p.id}` },
        ],
    });

    const shown = rows.slice(0, limit);

    const actionsMenu = (p) => (
        <Menu trigger={({ toggle }) => (
            <Button size="sm" variant="ghost" onClick={toggle} aria-label="More actions" className="w-9 px-0"><MoreHorizontal size={15} /></Button>
        )}>
            <MenuItem icon={FileText} onClick={() => setParam('proposal', p.id, true)}>Details & activity</MenuItem>
            <MenuItem as="a" href={`/proposal/${p.id}`} target="_blank" rel="noopener noreferrer" icon={ExternalLink}>Open proposal</MenuItem>
            {canManage && <MenuItem icon={Edit} onClick={() => edit(p)}>Edit</MenuItem>}
            <MenuItem icon={Mail} onClick={() => setEmailProposal(p)}>Email to client</MenuItem>
            <MenuItem icon={MessageCircle} onClick={() => whatsapp(p)}>Send on WhatsApp</MenuItem>
            <MenuItem icon={Link2} onClick={() => copyLink(p)}>Copy link</MenuItem>
            {canManage && <MenuItem icon={CopyPlus} onClick={() => duplicate(p)}>Duplicate as draft</MenuItem>}
            {canInvoice && <MenuItem icon={Receipt} onClick={() => convert(p)}>{p.convertedInvoiceId ? 'View invoice' : 'Create invoice'}</MenuItem>}
            {canManage && <MenuItem icon={Trash2} danger onClick={() => remove(p)}>Delete</MenuItem>}
        </Menu>
    );

    return (
        <AdminCommunityHubLayout
            studioHeader={{ title: 'Proposals', icon: FileSpreadsheet, accentClass: 'text-emerald-600 dark:text-neon-green', description: 'Quotes, client responses and who has opened what' }}
            tabs={[
                ...(canInvoice ? [{ name: 'Invoices', path: '/admin/invoices', icon: FileText }] : []),
                { name: 'Proposals', path: '/admin/proposals', icon: FileSpreadsheet },
                { name: 'Contracts', path: '/admin/agreements', icon: ShieldCheck },
            ]}
            action={(
                // Phones: the main action gets its own full-width row, the other two share one.
                <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
                    <Button as={Link} to="/admin/create-proposal" variant="primary" className="col-span-2 sm:order-last"><Plus size={14} /> New proposal</Button>
                    <Button variant="secondary" onClick={() => { setEditingUpload(null); setUploadOpen(true); }}><Upload size={14} /> Add PDF</Button>
                    <Button as={Link} to="/admin/ai-studio?type=proposal" variant="secondary"><Sparkles size={14} /> Draft with AI</Button>
                </div>
            )}
        >
            <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Kpi icon={Send} tone="blue" label="Sent, not opened" value={counts.sent} hint={kpis.waiting ? `${inr(kpis.pipeline)} awaiting replies` : 'Nothing waiting'} active={filter === 'sent'} onClick={() => setParam('filter', filter === 'sent' ? null : 'sent')} />
                    <Kpi icon={Eye} tone="violet" label="Viewed, no reply" value={counts.viewed} hint={counts.viewed ? 'Good time to follow up' : 'No open views'} active={filter === 'viewed'} onClick={() => setParam('filter', filter === 'viewed' ? null : 'viewed')} />
                    <Kpi icon={TrendingUp} tone="green" label="Won this month" value={inr(kpis.wonMonth)} hint={`${counts.accepted} accepted in total`} active={filter === 'accepted'} onClick={() => setParam('filter', filter === 'accepted' ? null : 'accepted')} />
                    <Kpi icon={Percent} tone="gray" label="Win rate" value={kpis.winRate === null ? '—' : `${kpis.winRate}%`} hint={kpis.decided ? `Of ${kpis.decided} answered` : 'No answers yet'} />
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <SearchInput value={search} onChange={(v) => { setSearch(v); setLimit(PAGE); }} placeholder="Client, number, campaign or email" className="lg:w-80" />
                    <div className="flex flex-1 items-center gap-2">
                        <Select value={sort} onChange={setSort} label="Sort" className="flex-1 lg:w-48 lg:flex-none" options={[
                            { value: 'newest', label: 'Newest first' },
                            { value: 'viewed', label: 'Recently viewed' },
                            { value: 'value', label: 'Largest value' },
                            { value: 'client', label: 'Client A–Z' },
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
                            value: f, label: f === 'all' ? 'All' : PROPOSAL_STATE_LABEL[f].label, count: counts[f], highlight: f === 'viewed' && counts[f] > 0,
                        }))}
                    />
                </div>

                {shown.length === 0 ? (
                    <Card className="rounded-2xl">
                        <EmptyState
                            icon={Inbox}
                            title={visible.length ? 'No matching proposals' : 'No proposals yet'}
                            description={visible.length ? 'Try another filter or search.' : 'Build one, or add a PDF you made elsewhere.'}
                            action={!visible.length && <Button as={Link} to="/admin/create-proposal" variant="primary"><Plus size={14} /> New proposal</Button>}
                        />
                    </Card>
                ) : view === 'cards' ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {shown.map(({ p, state, value, created, viewed, views }) => {
                            const cfg = PROPOSAL_STATE_LABEL[state];
                            const expiry = proposalExpiry(p);
                            return (
                                <Card key={p.id} className="relative flex flex-col rounded-2xl p-4 transition-colors hover:border-black/15 dark:hover:border-white/15">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <Badge tone={cfg.tone}>{cfg.label}</Badge>
                                            {p.isUploaded && <Badge tone="gray">PDF</Badge>}
                                            {p.convertedInvoiceId && <Badge tone="blue"><Receipt size={10} /> Invoiced</Badge>}
                                        </div>
                                        <span className="shrink-0 font-mono text-[11px] text-gray-500">{p.proposalNumber || ''}</span>
                                    </div>
                                    <button type="button" onClick={() => setParam('proposal', p.id, true)} className="mt-3 min-w-0 text-left after:absolute after:inset-0">
                                        <p className="line-clamp-2 text-[17px] font-extrabold leading-snug">{p.clientName || 'Untitled'}</p>
                                        <p className="mt-0.5 truncate text-[12px] text-gray-500">{p.campaignName || p.fileName || ' '}</p>
                                    </button>
                                    <p className="mt-3 text-[22px] font-extrabold tracking-tight tabular-nums">{value ? inr(value) : '—'}</p>
                                    <div className="mt-1 space-y-0.5 text-[12px] text-gray-500">
                                        <p>Created {formatDay(created)}</p>
                                        <p className={cn(viewed && 'font-semibold text-purple-700 dark:text-purple-400')}>{viewed ? `Viewed ${relative(viewed)} · ${views} ${views === 1 ? 'view' : 'views'}` : 'Not opened yet'}</p>
                                        {expiry && state !== 'accepted' && state !== 'declined' && <p className={cn(state === 'expired' && 'text-amber-600 dark:text-amber-400')}>{state === 'expired' ? 'Expired' : 'Valid until'} {formatDay(expiry)}</p>}
                                        {state === 'accepted' && p.approvalMetadata?.signedBy && <p className="text-emerald-700 dark:text-neon-green">Signed by {p.approvalMetadata.signedBy}</p>}
                                    </div>
                                    <div className="relative z-10 mt-4 flex items-center gap-2 border-t border-black/[0.06] pt-3 dark:border-white/[0.06]">
                                        {state === 'accepted' && canInvoice && !p.convertedInvoiceId ? (
                                            <Button size="sm" variant="primary" onClick={() => convert(p)} className="flex-1"><Receipt size={13} /> Create invoice</Button>
                                        ) : (
                                            <Button size="sm" variant="secondary" onClick={() => share(p)} className="flex-1"><Share2 size={13} /> Share</Button>
                                        )}
                                        <Button size="sm" as="a" href={`/proposal/${p.id}`} target="_blank" rel="noopener noreferrer" variant="secondary" aria-label="Open proposal" className="w-9 px-0"><ExternalLink size={14} /></Button>
                                        {actionsMenu(p)}
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <Card className="overflow-hidden rounded-2xl">
                        <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                            {shown.map(({ p, state, value, created, viewed }) => {
                                const cfg = PROPOSAL_STATE_LABEL[state];
                                return (
                                    <li key={p.id} className="relative flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.02] sm:px-5">
                                        <button type="button" onClick={() => setParam('proposal', p.id, true)} className="min-w-0 flex-1 text-left after:absolute after:inset-0">
                                            <span className="flex flex-wrap items-center gap-2">
                                                <span className="truncate text-[15px] font-bold">{p.clientName || 'Untitled'}</span>
                                                <Badge tone={cfg.tone}>{cfg.label}</Badge>
                                                {p.isUploaded && <Badge tone="gray">PDF</Badge>}
                                            </span>
                                            <span className="mt-0.5 block truncate text-[12px] text-gray-500">
                                                {[p.proposalNumber, p.campaignName, formatDay(created), viewed ? `viewed ${relative(viewed)}` : null].filter(Boolean).join(' · ')}
                                            </span>
                                        </button>
                                        <p className="shrink-0 text-right text-[15px] font-extrabold tabular-nums">{value ? inr(value) : '—'}</p>
                                        <div className="relative z-10 flex shrink-0 items-center gap-1">
                                            <Button size="sm" variant="secondary" onClick={() => share(p)} aria-label="Share proposal" className="hidden w-9 px-0 sm:inline-flex"><Share2 size={14} /></Button>
                                            {actionsMenu(p)}
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

            <ProposalDetailPanel
                proposalId={openId}
                onClose={() => setParam('proposal', null)}
                canManage={canManage}
                canInvoice={canInvoice}
                onEdit={edit}
                onEmail={setEmailProposal}
                onShare={share}
                onWhatsApp={whatsapp}
                onDuplicate={duplicate}
                onDelete={remove}
                onConvert={convert}
            />
            <AnimatePresence>
                {emailProposal && (
                    <ProposalEmailModal isOpen={Boolean(emailProposal)} onClose={() => setEmailProposal(null)} proposal={emailProposal} onSend={sendEmail} />
                )}
            </AnimatePresence>
            <UploadProposalModal
                isOpen={uploadOpen}
                onClose={() => { setUploadOpen(false); setEditingUpload(null); }}
                onSuccess={(id) => { setUploadOpen(false); setEditingUpload(null); if (id) setParam('proposal', id, true); }}
                editingProposal={editingUpload}
            />
        </AdminCommunityHubLayout>
    );
};

export default ProposalManagement;
