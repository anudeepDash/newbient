import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Gift from 'lucide-react/dist/esm/icons/gift';
import Users from 'lucide-react/dist/esm/icons/users';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import Shuffle from 'lucide-react/dist/esm/icons/shuffle';
import Star from 'lucide-react/dist/esm/icons/star';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import Ban from 'lucide-react/dist/esm/icons/ban';
import Undo2 from 'lucide-react/dist/esm/icons/undo-2';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Mail from 'lucide-react/dist/esm/icons/mail';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import Instagram from 'lucide-react/dist/esm/icons/instagram';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import Circle from 'lucide-react/dist/esm/icons/circle';
import Copy from 'lucide-react/dist/esm/icons/copy';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Edit from 'lucide-react/dist/esm/icons/edit';
import Lock from 'lucide-react/dist/esm/icons/lock';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import History from 'lucide-react/dist/esm/icons/history';
import SearchX from 'lucide-react/dist/esm/icons/search-x';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { notifySpecificUser } from '../../lib/notificationTriggers';
import { copyToClipboard } from '../../lib/clipboard';
import { cn } from '../../lib/utils';
import { exportSubtitle, fileDate } from '../../lib/xlsx';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import ExportMenu from '../../components/admin/ExportMenu';
import Sheet from '../../components/admin/Sheet';
import { Avatar, Badge, Button, EmptyState, Menu, MenuItem, SearchInput, SegmentedTabs, Select, StatTile, ViewToggle, useViewMode } from '../../components/admin/ui';
import { Field, fieldCls } from '../../components/admin/uploads/UploadKit';
import WinnerDrawSheet from '../../components/admin/giveaways/WinnerDrawSheet';
import { TASK_ICONS } from '../../components/admin/giveaways/GiveawayEditor';
import { GIVEAWAY_STATE, entryPoints, findDuplicates, giveawayEndsAt, giveawayState, subscribeToEntries } from '../../components/admin/giveaways/giveawayUtils';
import { BulkBar, InfoRow, SelectBox, SheetSection, formatDateTime, timeAgo, toDate, useConfirm } from '../../components/admin/forms/kit';

const FILTERS = ['all', 'winners', 'referrers', 'duplicates', 'disqualified'];
const FILTER_LABEL = { all: 'All', winners: 'Winners', referrers: 'Referrers', duplicates: 'Possible duplicates', disqualified: 'Disqualified' };
const PAGE = 60;

const digits = (p) => String(p || '').replace(/\D/g, '');
const waNumber = (p) => { const d = digits(p); return d.length === 10 ? `91${d}` : d; };
const igHandle = (e) => String(e.instagramUsername || e.instagram || '').replace(/^@/, '').trim();

const GiveawayParticipants = () => {
    useStoreSubscription(['giveaways']);
    const { giveawayId } = useParams();
    const navigate = useNavigate();
    const giveaways = useStore(s => s.giveaways) || [];
    const loadedGiveaways = useStore(s => s.subscriptionsLoaded?.giveaways);
    const addToast = useStore(s => s.addToast);
    const [params, setParams] = useSearchParams();
    // Start from entries already loaded by the giveaways list (instant), then go live.
    const [entries, setEntries] = useState(() => (useStore.getState().giveawayEntries || []).filter(e => e.campaignId === giveawayId));
    const [ready, setReady] = useState(() => entries.length > 0);
    const [loadError, setLoadError] = useState('');
    const [view, setView] = useViewMode('giveaway_entries', 'list');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('points');
    const [limit, setLimit] = useState(PAGE);
    const [selected, setSelected] = useState(() => new Set());
    const [drawOpen, setDrawOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [manualPrize, setManualPrize] = useState('');
    const [confirm, confirmEl] = useConfirm();

    const giveaway = giveaways.find(g => g.id === giveawayId);
    const filter = FILTERS.includes(params.get('filter')) ? params.get('filter') : 'all';
    const openId = params.get('entry');
    const setParam = (key, value) => {
        const next = new URLSearchParams(params);
        if (value) next.set(key, value); else next.delete(key);
        setParams(next, { replace: key !== 'entry' });
    };

    useEffect(() => {
        if (!giveawayId) return undefined;
        return subscribeToEntries(giveawayId, (list) => { setEntries(list); setReady(true); setLoadError(''); }, (err) => {
            console.error(err);
            setReady(true);
            setLoadError("Couldn't load the latest entries. Please refresh.");
        });
    }, [giveawayId]);

    useEffect(() => { setManualPrize(giveaway?.prize || ''); }, [giveaway?.prize, openId]);

    const dupes = useMemo(() => findDuplicates(entries), [entries]);
    const byCode = useMemo(() => Object.fromEntries(entries.filter(e => e.referralCode).map(e => [e.referralCode, e])), [entries]);

    const counts = useMemo(() => ({
        all: entries.length,
        winners: entries.filter(e => e.isWinner).length,
        referrers: entries.filter(e => (e.referralCount || 0) > 0).length,
        duplicates: entries.filter(e => dupes.has(e.id)).length,
        disqualified: entries.filter(e => e.disqualified).length,
    }), [entries, dupes]);
    const points = useMemo(() => entries.reduce((s, e) => s + entryPoints(e), 0), [entries]);
    const referrals = useMemo(() => entries.reduce((s, e) => s + (Number(e.referralCount) || 0), 0), [entries]);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = entries.filter(e => {
            if (filter === 'winners' && !e.isWinner) return false;
            if (filter === 'referrers' && !((e.referralCount || 0) > 0)) return false;
            if (filter === 'duplicates' && !dupes.has(e.id)) return false;
            if (filter === 'disqualified' && !e.disqualified) return false;
            if (!q) return true;
            return [e.name, e.email, e.phone, e.college, e.city, igHandle(e)].some(v => String(v || '').toLowerCase().includes(q));
        });
        const by = {
            points: (a, b) => entryPoints(b) - entryPoints(a),
            newest: (a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
            referrals: (a, b) => (b.referralCount || 0) - (a.referralCount || 0),
            name: (a, b) => String(a.name || '').localeCompare(String(b.name || '')),
        }[sort];
        return list.sort(by);
    }, [entries, filter, search, sort, dupes]);
    const shown = rows.slice(0, limit);
    const winners = useMemo(() => entries.filter(e => e.isWinner).sort((a, b) => String(a.winnerSelectedAt || '').localeCompare(String(b.winnerSelectedAt || ''))), [entries]);

    if (!giveaway) {
        return (
            <AdminCommunityHubLayout studioHeader={{ title: 'Giveaway', icon: Gift }} hideTabs>
                {loadedGiveaways ? (
                    <EmptyState icon={SearchX} title="Giveaway not found" description="It may have been deleted." action={<Button as={Link} to="/admin/giveaways" variant="accent">Back to giveaways</Button>} />
                ) : (
                    <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-20 rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]" />)}</div>
                )}
            </AdminCommunityHubLayout>
        );
    }

    const state = giveawayState(giveaway);
    const end = giveawayEndsAt(giveaway);

    // ── actions ──
    const guard = async (fn, success) => {
        if (busy) return false;
        setBusy(true);
        try {
            await fn();
            if (success) addToast(success, 'success');
            return true;
        } catch (err) {
            console.error(err);
            addToast(err?.message && !/firestore|permission|network/i.test(err.message) ? err.message : "Couldn't save. Please try again.", 'error');
            return false;
        } finally {
            setBusy(false);
        }
    };

    const setDisqualified = async (ids, on) => {
        const list = entries.filter(e => ids.includes(e.id) && Boolean(e.disqualified) !== on);
        if (!list.length) return;
        if (on && list.some(e => e.isWinner)) { addToast('Revoke the winner first, then disqualify.', 'info'); return; }
        if (on && !(await confirm({
            title: list.length === 1 ? `Disqualify ${list[0].name || 'this entry'}?` : `Disqualify ${list.length} entries?`,
            body: "They stay in the list but can't be drawn as winners. You can undo this.",
            confirmLabel: 'Disqualify',
        }))) return;
        guard(() => useStore.getState().setGiveawayEntriesDisqualified(list.map(e => e.id), on), on ? 'Disqualified.' : 'Restored.').then(ok => ok && setSelected(new Set()));
    };

    const removeEntries = async (ids) => {
        const list = entries.filter(e => ids.includes(e.id));
        if (!list.length) return;
        if (list.some(e => e.isWinner)) { addToast('Revoke the winner first, then remove the entry.', 'info'); return; }
        if (!(await confirm({
            title: list.length === 1 ? `Remove ${list[0].name || 'this entry'}?` : `Remove ${list.length} entries?`,
            body: "Their points and referrals are deleted and they could enter again. To keep the record, disqualify instead. This can't be undone.",
            confirmLabel: 'Remove',
        }))) return;
        const ok = await guard(() => useStore.getState().deleteGiveawayEntries(list.map(e => e.id)), list.length === 1 ? 'Entry removed.' : `${list.length} entries removed.`);
        if (ok) { setSelected(new Set()); if (ids.includes(openId)) setParam('entry', null); }
    };

    const makeWinner = async (entry) => {
        if (entry.disqualified) { addToast('This entry is disqualified. Restore it first.', 'info'); return; }
        if (!(await confirm({
            title: `Make ${entry.name || 'this person'} a winner?`,
            body: 'Picked by hand, not drawn. It is logged on the giveaway. To keep it fair, prefer Draw winners.',
            confirmLabel: 'Make winner',
            tone: 'accent',
        }))) return;
        const prize = manualPrize.trim();
        const ok = await guard(() => useStore.getState().confirmGiveawayWinners(giveaway.id, [{ entryId: entry.id, name: entry.name || '', prize: prize || null }], { manual: true, poolSize: 1, mode: 'manual' }), `${entry.name || 'They'} marked as a winner.`);
        if (ok && entry.userId) {
            notifySpecificUser(entry.userId, 'You won!', `Congratulations, you've won${prize ? ` ${prize}` : ''} in the ${giveaway.name} giveaway. Open the giveaway for details.`, `/giveaway/${giveaway.slug}`, 'giveaway').catch(() => {});
        }
    };

    const revoke = async (entry) => {
        if (!(await confirm({
            title: `Revoke ${entry.name || 'this'} win?`,
            body: `${giveaway.status === 'Closed' ? 'They will no longer be shown as the winner on the page. ' : ''}The change is logged on the giveaway. You can draw again afterwards.`,
            confirmLabel: 'Revoke win',
        }))) return;
        guard(() => useStore.getState().revokeGiveawayWinner(giveaway.id, entry), 'Win revoked.');
    };

    const closeNow = async () => {
        if (!(await confirm({ title: 'Close this giveaway?', body: 'No one else can enter. The winner is shown on the page once picked.', confirmLabel: 'Close giveaway', tone: 'accent' }))) return;
        guard(() => useStore.getState().closeGiveaways([giveaway.id]), 'Giveaway closed.');
    };

    // Mailing pre-fills recipients from `to` (comma separated). Long lists
    // don't fit in a link, so then Mailing opens without them.
    const MAX_TO = 1500;
    const mailingUrl = (people = [], winner = false) => {
        const p = new URLSearchParams({
            subject: winner ? `You won: ${giveaway.name}` : `Update: ${giveaway.name} giveaway`,
            header: winner ? 'Congratulations!' : giveaway.name,
            body: winner && people.length === 1
                ? `Hi ${people[0].name || 'there'}, you've been picked as a winner in the ${giveaway.name} giveaway.`
                : `Hello! We have an update on the ${giveaway.name} giveaway.`,
            heroImage: giveaway.posterUrl || '',
            ctaText: 'See the giveaway',
            ctaUrl: `${window.location.origin}/giveaway/${giveaway.slug}`,
        });
        const emails = [...new Set(people.map(e => String(e.email || '').trim()).filter(Boolean))];
        let fitted = true;
        if (emails.length) {
            const to = emails.join(',');
            if (encodeURIComponent(to).length <= MAX_TO) p.set('to', to);
            else fitted = false;
        }
        return { url: `/admin/mailing?${p.toString()}`, fitted, count: emails.length };
    };
    const openMailing = (people, winner = false) => {
        const { url, fitted, count } = mailingUrl(people, winner);
        if (people.length && !count) { addToast('None of these entries have an email address.', 'info'); return; }
        if (!fitted) addToast(`${count} addresses are too many to pass along. Pick the audience in Mailing.`, 'info');
        navigate(url);
    };

    const taskLabel = (id) => (giveaway.tasks || []).find(t => t.id === id);

    const exportSpec = () => ({
        filename: `${String(giveaway.name || 'giveaway').replace(/[^\w-]+/g, '_').slice(0, 40)}_participants_${fileDate()}`,
        sheetName: 'Participants',
        title: `${giveaway.name} · participants`,
        subtitle: exportSubtitle(rows.length, 'entry', filter !== 'all' ? FILTER_LABEL[filter] : null).replace(/entrys/, 'entries'),
        rows,
        totals: { points: true, referrals: true },
        columns: [
            { header: 'Name', value: e => e.name || '' },
            { header: 'Email', value: e => e.email || '' },
            { header: 'Phone', value: e => e.phone || '' },
            { header: 'Instagram', value: e => igHandle(e) },
            { header: 'College', value: e => e.college || '' },
            { header: 'City', value: e => e.city || '' },
            { header: 'Points', key: 'points', type: 'number', value: e => entryPoints(e) },
            { header: 'Referrals', key: 'referrals', type: 'number', value: e => Number(e.referralCount) || 0 },
            { header: 'Tasks done', type: 'number', value: e => Object.values(e.completedTasks || {}).filter(Boolean).length },
            { header: 'Spin reward', value: e => e.spinReward || '' },
            { header: 'Referred by', value: e => (e.referredBy ? (byCode[e.referredBy]?.name || e.referredBy) : '') },
            { header: 'Why they should win', width: 40, value: e => e.answer || '' },
            { header: 'Entered', type: 'datetime', value: e => toDate(e.createdAt || e.timestamp) },
            { header: 'Winner', value: e => (e.isWinner ? 'Yes' : '') },
            { header: 'Prize', value: e => e.prize || '' },
            { header: 'Picked at', type: 'datetime', value: e => toDate(e.winnerSelectedAt) },
            { header: 'Flags', value: e => [e.disqualified && 'Disqualified', dupes.has(e.id) && 'Possible duplicate'].filter(Boolean).join(', ') },
        ],
    });

    const toggle = (id, on) => setSelected(prev => { const n = new Set(prev); if (on) n.add(id); else n.delete(id); return n; });
    const allSelected = shown.length > 0 && shown.every(e => selected.has(e.id));

    const flags = (e) => (
        <>
            {e.isWinner && <Badge tone="amber"><Trophy size={10} /> Winner</Badge>}
            {e.disqualified && <Badge tone="red">Disqualified</Badge>}
            {dupes.has(e.id) && <Badge tone="orange">Possible duplicate</Badge>}
        </>
    );

    const detail = entries.find(e => e.id === openId);
    const referredPeople = detail?.referralCode ? entries.filter(e => e.referredBy === detail.referralCode) : [];
    const history = [...(giveaway.drawHistory || [])].sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));

    return (
        <AdminCommunityHubLayout
            studioHeader={{ title: giveaway.name || 'Giveaway', icon: Gift, description: `${GIVEAWAY_STATE[state].label} · ${end ? `${state === 'open' ? 'ends' : 'ended'} ${formatDateTime(end)}` : 'no end date'}` }}
            hideTabs
            action={(
                <div className="flex w-full gap-2 sm:w-auto">
                    <Button as={Link} to="/admin/giveaways" variant="secondary" className="h-11"><ChevronLeft size={15} /> All</Button>
                    <Button variant="accent" onClick={() => setDrawOpen(true)} disabled={!entries.length} className="h-11 flex-1 sm:flex-none"><Shuffle size={15} /> Draw winners</Button>
                    <Menu trigger={({ toggle: t }) => <Button variant="secondary" onClick={t} aria-label="More" className="h-11 w-11 px-0"><MoreHorizontal size={16} /></Button>}>
                        <MenuItem icon={Edit} as={Link} to={`/admin/giveaways?edit=${giveaway.id}`}>Edit giveaway</MenuItem>
                        <MenuItem icon={ExternalLink} as="a" href={`/giveaway/${giveaway.slug}`} target="_blank" rel="noopener noreferrer">Open giveaway page</MenuItem>
                        <MenuItem icon={Mail} onClick={() => openMailing(entries.filter(e => !e.disqualified))} hint="Opens Mailing with a draft">Email everyone</MenuItem>
                        {winners.length > 0 && <MenuItem icon={Trophy} onClick={() => openMailing(winners, true)}>Email the winners</MenuItem>}
                        <MenuItem icon={History} onClick={() => setHistoryOpen(true)} hint={history.length ? `${history.length} logged` : 'Nothing yet'}>Draw history</MenuItem>
                        {state !== 'closed' && <MenuItem icon={Lock} onClick={closeNow}>Close giveaway</MenuItem>}
                    </Menu>
                </div>
            )}
        >
            <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatTile icon={Users} tone="blue" label="Entries" value={entries.length} hint={`${counts.disqualified} disqualified`} active={filter === 'all'} onClick={() => setParam('filter', null)} />
                    <StatTile icon={Star} tone="violet" label="Points" value={points.toLocaleString('en-IN')} hint="Each point is a chance" />
                    <StatTile icon={Share2} tone="teal" label="Referrals" value={referrals} hint={`${counts.referrers} people shared`} active={filter === 'referrers'} onClick={() => setParam('filter', filter === 'referrers' ? null : 'referrers')} />
                    <StatTile icon={Trophy} tone="amber" label="Winners" value={counts.winners} hint={counts.winners ? winners.map(w => w.name).join(', ') : 'None picked yet'} active={filter === 'winners'} onClick={() => setParam('filter', filter === 'winners' ? null : 'winners')} />
                </div>

                {state === 'ended' && (
                    <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.07] p-4 sm:flex-row sm:items-center">
                        <AlertTriangle size={18} className="shrink-0 text-amber-600 dark:text-amber-400" />
                        <p className="flex-1 text-[14px]"><span className="font-bold">Entries closed {formatDateTime(end)}.</span> Draw the winners, then close the giveaway to show them on the page.</p>
                        <Button variant="secondary" onClick={closeNow} disabled={busy} className="h-11">Close now</Button>
                    </div>
                )}

                {winners.length > 0 && (
                    <SheetSection title={`Winner${winners.length === 1 ? '' : 's'}`} className="border-amber-500/30 bg-amber-500/[0.04] dark:bg-amber-400/[0.04]">
                        <ul className="space-y-2">
                            {winners.map(w => (
                                <li key={w.id} className="flex items-center gap-3">
                                    <Avatar name={w.name} size={38} />
                                    <button type="button" onClick={() => setParam('entry', w.id)} className="min-w-0 flex-1 text-left">
                                        <p className="truncate text-[14px] font-bold">{w.name || 'No name'}{w.prize ? <span className="font-medium text-gray-500"> · {w.prize}</span> : null}</p>
                                        <p className="truncate text-[12px] text-gray-500">Picked {w.winnerSelectedAt ? formatDateTime(w.winnerSelectedAt) : 'earlier'}{w.winnerSelectedBy ? ` by ${w.winnerSelectedBy}` : ''}</p>
                                    </button>
                                    <Button size="sm" variant="ghost" onClick={() => revoke(w)} disabled={busy} className="h-10">Revoke</Button>
                                </li>
                            ))}
                        </ul>
                    </SheetSection>
                )}

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <SearchInput value={search} onChange={(v) => { setSearch(v); setLimit(PAGE); }} placeholder="Name, phone, email, college, Instagram" className="lg:w-96" />
                    <div className="flex flex-1 items-center gap-2">
                        <Select value={sort} onChange={setSort} label="Sort" className="flex-1 lg:w-48 lg:flex-none" options={[
                            { value: 'points', label: 'Most points' },
                            { value: 'newest', label: 'Newest first' },
                            { value: 'referrals', label: 'Most referrals' },
                            { value: 'name', label: 'Name A–Z' },
                        ]} />
                        <ExportMenu getSpec={exportSpec} />
                        <ViewToggle value={view} onChange={setView} />
                    </div>
                </div>

                <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                    <SegmentedTabs value={filter} onChange={(v) => { setParam('filter', v === 'all' ? null : v); setLimit(PAGE); }} items={FILTERS.filter(f => f === 'all' || f === filter || counts[f] > 0).map(f => ({ value: f, label: FILTER_LABEL[f], count: counts[f], highlight: f === 'duplicates' && counts.duplicates > 0 }))} />
                </div>

                {loadError && entries.length > 0 && <p role="alert" className="rounded-xl bg-red-500/10 px-3.5 py-3 text-[13px] font-semibold text-red-600 dark:text-red-400">{loadError} The list below may be out of date.</p>}
                {loadError && !entries.length ? (
                    <EmptyState icon={AlertTriangle} tone="red" title={loadError} />
                ) : !ready ? (
                    <div className="space-y-2">{[0, 1, 2, 3].map(i => <div key={i} className="h-16 rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]" />)}</div>
                ) : shown.length === 0 ? (
                    <div className="rounded-2xl border border-black/[0.06] bg-white dark:border-white/[0.08] dark:bg-white/[0.03]">
                        <EmptyState
                            icon={Users}
                            title={entries.length ? 'No matching entries' : 'No entries yet'}
                            description={entries.length ? 'Try another filter or search.' : 'Share the giveaway link. People appear here as soon as they enter.'}
                            action={!entries.length && <Button variant="accent" onClick={async () => { const ok = await copyToClipboard(`${window.location.origin}/giveaway/${giveaway.slug}`); addToast(ok ? 'Link copied.' : "Couldn't copy the link.", ok ? 'success' : 'error'); }}><Copy size={14} /> Copy link</Button>}
                        />
                    </div>
                ) : view === 'cards' ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {shown.map(e => (
                            <article key={e.id} className={cn('relative rounded-2xl border bg-white p-4 transition-colors dark:bg-white/[0.03]', e.isWinner ? 'border-amber-500/40' : 'border-black/[0.06] hover:border-black/15 dark:border-white/[0.08] dark:hover:border-white/15', selected.has(e.id) && 'ring-2 ring-rose-500/40')}>
                                <div className="flex items-start gap-3">
                                    <Avatar name={e.name} size={44} />
                                    <button type="button" onClick={() => setParam('entry', e.id)} className="min-w-0 flex-1 text-left after:absolute after:inset-0">
                                        <p className="truncate text-[15px] font-bold">{e.name || 'No name'}</p>
                                        <p className="truncate text-[12px] text-gray-500">{[e.college, e.city].filter(Boolean).join(' · ') || e.email || '—'}</p>
                                    </button>
                                    <SelectBox checked={selected.has(e.id)} onChange={(on) => toggle(e.id, on)} label={`Select ${e.name || 'entry'}`} className="-mr-2 -mt-2" />
                                </div>
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    <Badge tone="violet">{entryPoints(e)} pts</Badge>
                                    {(e.referralCount || 0) > 0 && <Badge tone="teal">{e.referralCount} referral{e.referralCount === 1 ? '' : 's'}</Badge>}
                                    {flags(e)}
                                </div>
                                {e.answer && <p className="mt-2 line-clamp-2 text-[13px] text-gray-600 dark:text-zinc-300">“{e.answer}”</p>}
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white dark:border-white/[0.08] dark:bg-white/[0.03]">
                        <div className="flex items-center gap-1 border-b border-black/[0.06] px-2 py-1 text-[12px] font-bold text-gray-500 dark:border-white/[0.06]">
                            <SelectBox checked={allSelected} onChange={(on) => setSelected(on ? new Set(shown.map(e => e.id)) : new Set())} label="Select all shown" />
                            <span className="flex-1">{allSelected ? `All ${shown.length} selected` : 'Select all shown'}</span>
                            <span className="hidden w-20 text-right sm:block">Points</span>
                            <span className="hidden w-20 text-right sm:block">Referrals</span>
                            <span className="w-8" />
                        </div>
                        <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                            {shown.map((e, i) => (
                                <li key={e.id} className={cn('flex items-center gap-1 px-2 py-2', selected.has(e.id) && 'bg-black/[0.025] dark:bg-white/[0.04]', e.isWinner && 'bg-amber-500/[0.05]')}>
                                    <SelectBox checked={selected.has(e.id)} onChange={(on) => toggle(e.id, on)} label={`Select ${e.name || 'entry'}`} />
                                    <button type="button" onClick={() => setParam('entry', e.id)} className="flex min-w-0 flex-1 items-center gap-3 py-1 text-left">
                                        {sort === 'points' && filter === 'all' && !search && i < 3
                                            ? <span className={cn('flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl text-[14px] font-extrabold', ['bg-amber-500/15 text-amber-700 dark:text-amber-300', 'bg-gray-500/15 text-gray-600 dark:text-zinc-300', 'bg-orange-500/15 text-orange-700 dark:text-orange-300'][i])}>{i + 1}</span>
                                            : <Avatar name={e.name} size={38} />}
                                        <span className="min-w-0 flex-1">
                                            <span className="flex flex-wrap items-center gap-1.5">
                                                <span className="truncate text-[14px] font-bold">{e.name || 'No name'}</span>
                                                {flags(e)}
                                            </span>
                                            <span className="block truncate text-[12px] text-gray-500">{[e.college, e.city, e.phone].filter(Boolean).join(' · ') || e.email || '—'}</span>
                                        </span>
                                        <span className="w-14 shrink-0 text-right text-[14px] font-extrabold tabular-nums sm:w-20">{entryPoints(e)}<span className="text-[11px] font-semibold text-gray-500 sm:hidden"> pts</span></span>
                                        <span className="hidden w-20 shrink-0 text-right text-[13px] tabular-nums text-gray-500 sm:block">{e.referralCount || 0}</span>
                                        <ChevronRight size={16} className="shrink-0 text-gray-400" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {rows.length > limit && (
                    <div className="text-center"><Button variant="ghost" onClick={() => setLimit(l => l + PAGE)}>Show {Math.min(PAGE, rows.length - limit)} more of {rows.length - limit}</Button></div>
                )}

                {selected.size > 0 && (
                    <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
                        <Button size="sm" variant="secondary" disabled={busy} onClick={() => openMailing(entries.filter(e => selected.has(e.id)))}><Mail size={13} /> Email</Button>
                        <Button size="sm" variant="secondary" disabled={busy} onClick={() => setDisqualified([...selected], true)}><Ban size={13} /> Disqualify</Button>
                        <Button size="sm" variant="secondary" disabled={busy} onClick={() => setDisqualified([...selected], false)}><Undo2 size={13} /> Restore</Button>
                        <Button size="sm" variant="danger" disabled={busy} onClick={() => removeEntries([...selected])}><Trash2 size={13} /> Remove</Button>
                    </BulkBar>
                )}
            </div>

            {/* Entry detail */}
            <Sheet
                open={Boolean(detail)}
                onClose={() => setParam('entry', null)}
                size="lg"
                header={detail && (
                    <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={detail.name} size={44} />
                        <div className="min-w-0">
                            <h2 className="truncate text-lg font-extrabold tracking-tight">{detail.name || 'No name'}</h2>
                            <p className="text-[13px] text-gray-500">{entryPoints(detail)} points · entered {timeAgo(detail.createdAt || detail.timestamp) || 'earlier'}</p>
                        </div>
                    </div>
                )}
                footer={detail && (
                    <div className="flex gap-2">
                        <Button variant="secondary" className="h-12" onClick={() => removeEntries([detail.id])} disabled={busy || detail.isWinner} aria-label="Remove entry"><Trash2 size={15} /></Button>
                        <Button variant="secondary" className="h-12" onClick={() => setDisqualified([detail.id], !detail.disqualified)} disabled={busy || (detail.isWinner && !detail.disqualified)}>
                            {detail.disqualified ? <><Undo2 size={15} /> Restore</> : <><Ban size={15} /> Disqualify</>}
                        </Button>
                        {detail.isWinner
                            ? <Button variant="danger" className="h-12 flex-1" onClick={() => revoke(detail)} disabled={busy}>Revoke win</Button>
                            : <Button variant="accent" className="h-12 flex-1" onClick={() => makeWinner(detail)} disabled={busy || detail.disqualified}><Trophy size={15} /> Make winner</Button>}
                    </div>
                )}
                bodyClassName="space-y-4"
            >
                {detail && (
                    <>
                        <div className="flex flex-wrap gap-1.5">
                            <Badge tone="violet">{entryPoints(detail)} pts</Badge>
                            {(detail.referralCount || 0) > 0 && <Badge tone="teal">{detail.referralCount} referrals</Badge>}
                            {flags(detail)}
                        </div>
                        {dupes.has(detail.id) && (
                            <p className="rounded-xl bg-orange-500/10 p-3 text-[13px] text-orange-700 dark:text-orange-300">
                                Same phone or email as <button type="button" className="font-bold underline" onClick={() => setParam('entry', dupes.get(detail.id).id)}>{dupes.get(detail.id).name || 'an earlier entry'}</button>, who entered first. The draw skips this entry when “one chance per person” is on.
                            </p>
                        )}
                        {detail.isWinner && (
                            <SheetSection title="Winner" className="border-amber-500/30 bg-amber-500/[0.05]">
                                <div className="grid grid-cols-2 gap-4">
                                    <InfoRow label="Prize">{detail.prize}</InfoRow>
                                    <InfoRow label="Picked">{detail.winnerSelectedAt ? formatDateTime(detail.winnerSelectedAt) : null}</InfoRow>
                                    <InfoRow label="By">{detail.winnerSelectedBy}</InfoRow>
                                </div>
                            </SheetSection>
                        )}
                        {!detail.isWinner && !detail.disqualified && (
                            <Field label="Prize if you make them a winner" optional>
                                <input className={fieldCls} value={manualPrize} onChange={(e) => setManualPrize(e.target.value)} placeholder="e.g. 2 GA passes" />
                            </Field>
                        )}
                        {detail.disqualified && <p className="rounded-xl bg-red-500/10 p-3 text-[13px] text-red-700 dark:text-red-300">Disqualified {detail.disqualifiedAt ? formatDateTime(detail.disqualifiedAt) : ''}{detail.disqualifiedReason ? ` · ${detail.disqualifiedReason}` : ''}. They can't be drawn.</p>}

                        <div className="flex flex-wrap gap-2">
                            {detail.email && <Button variant="secondary" onClick={() => openMailing([detail], detail.isWinner)} className="h-11"><Mail size={14} /> Email</Button>}
                            {detail.phone && <Button as="a" href={`https://wa.me/${waNumber(detail.phone)}`} target="_blank" rel="noopener noreferrer" variant="secondary" className="h-11"><MessageCircle size={14} /> WhatsApp</Button>}
                            {igHandle(detail) && <Button as="a" href={`https://instagram.com/${igHandle(detail)}`} target="_blank" rel="noopener noreferrer" variant="secondary" className="h-11"><Instagram size={14} /> @{igHandle(detail)}</Button>}
                        </div>

                        <SheetSection title="Details">
                            <div className="grid grid-cols-2 gap-4">
                                <InfoRow label="Email">{detail.email}</InfoRow>
                                <InfoRow label="Phone">{detail.phone}</InfoRow>
                                <InfoRow label="College">{detail.college}</InfoRow>
                                <InfoRow label="City">{detail.city}</InfoRow>
                                <InfoRow label="Entered">{formatDateTime(detail.createdAt || detail.timestamp)}</InfoRow>
                                <InfoRow label="Spin wheel">{detail.hasSpunWheel ? (detail.spinReward || 'Spun') : 'Not spun'}</InfoRow>
                                <InfoRow label="Why they should win" className="col-span-2">{detail.answer && <span className="whitespace-pre-line">{detail.answer}</span>}</InfoRow>
                            </div>
                        </SheetSection>

                        {(giveaway.tasks || []).length > 0 && (
                            <SheetSection title="Tasks">
                                <ul className="space-y-2">
                                    {giveaway.tasks.map(t => {
                                        const done = Boolean(detail.completedTasks?.[t.id]);
                                        const Icon = TASK_ICONS[t.type] || Star;
                                        return (
                                            <li key={t.id} className="flex items-center gap-3">
                                                <Icon size={15} className="shrink-0 text-gray-400" />
                                                <span className={cn('min-w-0 flex-1 truncate text-[14px]', !done && 'text-gray-500')}>{t.label}</span>
                                                <span className="text-[12px] font-semibold text-gray-500">+{t.entryScore || 0}</span>
                                                {done ? <CheckCircle2 size={17} className="shrink-0 text-emerald-500" /> : <Circle size={17} className="shrink-0 text-gray-300 dark:text-zinc-600" />}
                                            </li>
                                        );
                                    })}
                                    {Object.keys(detail.completedTasks || {}).filter(id => !taskLabel(id)).length > 0 && (
                                        <li className="text-[12px] text-gray-500">Also did {Object.keys(detail.completedTasks).filter(id => !taskLabel(id)).length} task(s) that were later removed.</li>
                                    )}
                                </ul>
                            </SheetSection>
                        )}

                        <SheetSection title="Referrals">
                            <div className="grid grid-cols-2 gap-4">
                                <InfoRow label="Their code">{detail.referralCode && <span className="font-mono">{detail.referralCode}</span>}</InfoRow>
                                <InfoRow label="Referred by">
                                    {detail.referredBy ? (byCode[detail.referredBy]
                                        ? <button type="button" className="font-semibold text-sky-600 underline dark:text-neon-blue" onClick={() => setParam('entry', byCode[detail.referredBy].id)}>{byCode[detail.referredBy].name || detail.referredBy}</button>
                                        : detail.referredBy) : null}
                                </InfoRow>
                            </div>
                            {referredPeople.length > 0 && (
                                <div className="mt-3">
                                    <p className="mb-1.5 text-[12px] font-bold text-gray-500">Brought in {referredPeople.length}</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {referredPeople.map(p => <button key={p.id} type="button" onClick={() => setParam('entry', p.id)} className="h-9 rounded-xl border border-black/10 px-3 text-[13px] font-semibold dark:border-white/10">{p.name || 'No name'}</button>)}
                                    </div>
                                </div>
                            )}
                        </SheetSection>
                    </>
                )}
            </Sheet>

            {/* Draw history */}
            <Sheet open={historyOpen} onClose={() => setHistoryOpen(false)} title="Draw history" subtitle="Every draw, hand pick and revoke" size="md">
                {history.length === 0 ? (
                    <EmptyState icon={History} title="Nothing logged yet" description="Draws, hand-picked winners and revokes appear here with who did them and when." />
                ) : (
                    <ol className="space-y-3">
                        {history.map(h => (
                            <li key={h.id || h.at} className="rounded-2xl border border-black/[0.06] p-4 dark:border-white/[0.08]">
                                <div className="flex items-center justify-between gap-2">
                                    <Badge tone={h.type === 'revoke' ? 'red' : h.manual ? 'violet' : 'amber'}>{h.type === 'revoke' ? 'Revoked' : h.manual ? 'Picked by hand' : 'Draw'}</Badge>
                                    <span className="text-[12px] text-gray-500">{formatDateTime(h.at)}</span>
                                </div>
                                <p className="mt-2 text-[14px] font-semibold">
                                    {h.type === 'revoke' ? h.name || 'An entry' : (h.winners || []).map(w => w.name || 'No name').join(', ')}
                                    {h.type !== 'revoke' && h.winners?.[0]?.prize ? <span className="font-medium text-gray-500"> · {h.winners[0].prize}</span> : null}
                                </p>
                                <p className="mt-0.5 text-[12px] text-gray-500">
                                    {[h.by && `by ${h.by}`, h.type === 'draw' && !h.manual && h.poolSize ? `from ${h.poolSize} eligible` : null, h.mode === 'equal' ? 'equal chances' : h.mode === 'points' ? 'points as chances' : null, h.rerolled?.length ? `re-rolled ${h.rerolled.map(r => r.name).join(', ')}` : null, h.reason].filter(Boolean).join(' · ')}
                                </p>
                            </li>
                        ))}
                    </ol>
                )}
            </Sheet>

            <WinnerDrawSheet open={drawOpen} onClose={() => setDrawOpen(false)} giveaway={giveaway} entries={entries} />
            {confirmEl}
        </AdminCommunityHubLayout>
    );
};

export default GiveawayParticipants;
