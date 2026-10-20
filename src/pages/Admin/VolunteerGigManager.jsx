import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Briefcase from 'lucide-react/dist/esm/icons/briefcase';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Edit from 'lucide-react/dist/esm/icons/edit';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Users from 'lucide-react/dist/esm/icons/users';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Unlock from 'lucide-react/dist/esm/icons/unlock';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import Bell from 'lucide-react/dist/esm/icons/bell';
import Star from 'lucide-react/dist/esm/icons/star';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Clock from 'lucide-react/dist/esm/icons/clock';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import CopyPlus from 'lucide-react/dist/esm/icons/copy-plus';
import ArrowUp from 'lucide-react/dist/esm/icons/arrow-up';
import ArrowDown from 'lucide-react/dist/esm/icons/arrow-down';
import Timer from 'lucide-react/dist/esm/icons/timer';
import Radio from 'lucide-react/dist/esm/icons/radio';
import Zap from 'lucide-react/dist/esm/icons/zap';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { notifyAllUsers } from '../../lib/notificationTriggers';
import { copyToClipboard } from '../../lib/clipboard';
import { cn } from '../../lib/utils';
import { exportSubtitle, fileDate } from '../../lib/xlsx';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import ExportMenu from '../../components/admin/ExportMenu';
import { Badge, Button, EmptyState, Menu, MenuItem, SearchInput, SegmentedTabs, Select, StatTile, ViewToggle, useViewMode } from '../../components/admin/ui';
import GigEditor, { gigDates, syncGigForm } from '../../components/admin/gigs/GigEditor';
import ResponsesSheet from '../../components/admin/forms/ResponsesSheet';
import { countFormResponses } from '../../components/admin/forms/formResponses';
import { formatDay, todayKey, toDate, useConfirm } from '../../components/admin/forms/kit';

const FILTERS = ['all', 'open', 'filling', 'closed', 'past'];
const FILTER_LABEL = { all: 'All', open: 'Open', filling: 'Filling fast', closed: 'Closed', past: 'Past' };
const STATE_BADGE = { open: { label: 'Open', tone: 'green' }, filling: { label: 'Filling fast', tone: 'amber' }, closed: { label: 'Closed', tone: 'red' }, past: { label: 'Past', tone: 'gray' } };
const APPLY_LABEL = { form: 'Newbi form', link: 'Link', whatsapp: 'WhatsApp' };

const gigState = (gig, dates, today) => {
    if (dates.length && dates.every(d => d < today)) return 'past';
    const s = String(gig.status || 'Open').toLowerCase();
    if (s === 'closed') return 'closed';
    if (s.includes('fill')) return 'filling';
    return 'open';
};

const to12h = (t) => {
    if (!/^\d{2}:\d{2}/.test(t || '')) return t || '';
    const [h, m] = t.split(':').map(Number);
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`;
};

const datesText = (dates) => {
    if (!dates.length) return 'Dates to be announced';
    if (dates.length === 1) return formatDay(dates[0]);
    return `${formatDay(dates[0], false)} – ${formatDay(dates[dates.length - 1])} · ${dates.length} days`;
};

const VolunteerGigManager = () => {
    useStoreSubscription(['volunteerGigs', 'upcomingEvents', 'forms']);
    const gigs = useStore(s => s.volunteerGigs) || [];
    const forms = useStore(s => s.forms) || [];
    const upcomingEvents = useStore(s => s.upcomingEvents) || [];
    const loaded = useStore(s => s.subscriptionsLoaded?.volunteerGigs);
    const addToast = useStore(s => s.addToast);
    const [params, setParams] = useSearchParams();
    const [view, setView] = useViewMode('gigs', 'cards');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('order');
    const [applicants, setApplicants] = useState({});
    const [busyId, setBusyId] = useState(null);
    const [confirm, confirmEl] = useConfirm();

    const filter = FILTERS.includes(params.get('filter')) ? params.get('filter') : 'all';
    const editId = params.get('edit');
    const isNew = params.get('new') === '1';
    const applicantsId = params.get('applicants');
    const setParam = (updates, replace = false) => {
        const next = new URLSearchParams(params);
        Object.entries(updates).forEach(([k, v]) => { if (v) next.set(k, v); else next.delete(k); });
        setParams(next, { replace });
    };

    const today = todayKey();

    // Applicant counts for gigs that use a Newbi form.
    const formIds = [...new Set(gigs.map(g => g.formId).filter(Boolean))].join(',');
    useEffect(() => {
        if (!formIds) return;
        let cancelled = false;
        // A failed count falls back to the count stored on the form.
        Promise.all(formIds.split(',').map(fid => countFormResponses(fid).then(n => [fid, n]).catch(() => [fid, -1])))
            .then(pairs => { if (!cancelled) setApplicants(Object.fromEntries(pairs)); });
        return () => { cancelled = true; };
    }, [formIds, applicantsId]);

    const enriched = useMemo(() => gigs.map((g, index) => {
        const dates = gigDates(g);
        const home = upcomingEvents.find(e => e.relatedVolunteerGigId === g.id || e.gigId === g.id || (e.title === g.title && e.category === 'volunteer'));
        return {
            g,
            index,
            dates,
            next: dates.find(d => d >= today) || null,
            state: gigState(g, dates, today),
            applyType: g.formId ? 'form' : (g.applyType || 'link'),
            applicants: g.formId ? (applicants[g.formId] === -1 || applicants[g.formId] === undefined
                ? (applicants[g.formId] === -1 ? (forms.find(f => f.id === g.formId)?.responseCount ?? 0) : null)
                : applicants[g.formId]) : null,
            home,
        };
    }), [gigs, upcomingEvents, applicants, today, forms]);

    const tally = useMemo(() => {
        const c = { all: 0, open: 0, filling: 0, closed: 0, past: 0, applicants: 0 };
        enriched.forEach(e => { c.all += 1; c[e.state] += 1; c.applicants += e.applicants || 0; });
        return c;
    }, [enriched]);
    const nextUp = useMemo(() => enriched.filter(e => e.next && e.state !== 'past').sort((a, b) => a.next.localeCompare(b.next))[0], [enriched]);

    const canReorder = sort === 'order' && filter === 'all' && !search.trim();
    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = enriched.filter(e => (filter === 'all' || e.state === filter)
            && (!q || [e.g.title, e.g.location, e.g.description].some(v => String(v || '').toLowerCase().includes(q))));
        const by = {
            order: (a, b) => a.index - b.index,
            date: (a, b) => String(a.next || a.dates[0] || '9999').localeCompare(String(b.next || b.dates[0] || '9999')),
            newest: (a, b) => (toDate(b.g.createdAt)?.getTime() || 0) - (toDate(a.g.createdAt)?.getTime() || 0),
            title: (a, b) => String(a.g.title || '').localeCompare(String(b.g.title || '')),
        }[sort];
        return list.sort(by);
    }, [enriched, filter, search, sort]);

    // ── actions ──
    const run = async (id, fn, success) => {
        if (busyId) return;
        setBusyId(id);
        try {
            await fn();
            if (success) addToast(success, 'success');
        } catch (err) {
            console.error(err);
            addToast('Check your connection and try again.', 'error', { title: 'Change not saved' });
        } finally {
            setBusyId(null);
        }
    };

    // Closing or reopening a gig also closes or reopens its application form.
    const setStatus = (g, status) => run(g.id, async () => {
        await useStore.getState().updateVolunteerGig(g.id, { status });
        if (g.formId) await syncGigForm(g.formId, status, forms);
    }, status === 'Closed' ? 'Applications closed.' : status === 'Open' ? 'Applications reopened.' : 'Marked as filling fast.');
    const togglePin = (g) => run(g.id, () => useStore.getState().updateVolunteerGig(g.id, { isPinned: !g.isPinned }), g.isPinned ? 'Removed from the spotlight.' : 'Added to the spotlight.');

    const move = (e, dir) => {
        const list = [...gigs];
        const i = e.index;
        const j = i + dir;
        if (j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
        run(e.g.id, () => useStore.getState().reorderVolunteerGigs(list));
    };

    const toggleHome = async (e) => {
        const g = e.g;
        if (e.home) {
            if (!(await confirm({ title: 'Remove from the home page?', body: `"${g.title}" will no longer show in Upcoming events.`, confirmLabel: 'Remove' }))) return;
            run(g.id, () => useStore.getState().deleteUpcomingEvent(e.home.id), 'Removed from the home page.');
            return;
        }
        run(g.id, () => useStore.getState().addUpcomingEvent({
            title: g.title,
            description: g.description || '',
            image: g.image || '',
            location: g.location || 'GLOBAL',
            date: e.next || e.dates[0] || new Date().toISOString(),
            buttonText: 'JOIN SQUAD',
            link: e.applyType !== 'whatsapp' && g.applyLink ? g.applyLink : '/community',
            highlightColor: g.highlightColor || '#39FF14',
            category: 'volunteer',
            relatedVolunteerGigId: g.id,
            gigId: g.id,
            isVolunteerGig: true,
        }), 'Added to the home page.');
    };

    const notify = async (g) => {
        if (!(await confirm({ title: 'Notify everyone?', body: `Every user gets a notification asking for volunteers for "${g.title}".`, confirmLabel: 'Send', tone: 'accent' }))) return;
        run(g.id, () => notifyAllUsers(`Volunteers needed for ${g.title}`, `Join the crew for ${g.title}${g.location ? ` at ${g.location}` : ''}. Apply now in the community tab.`, `/community?gig=${g.id}`, g.image || ''), 'Notification sent.');
    };

    const announce = async (g) => {
        if (!(await confirm({ title: 'Post an announcement?', body: `Adds "${g.title}" to the announcements feed.`, confirmLabel: 'Post', tone: 'accent' }))) return;
        run(g.id, () => useStore.getState().addAnnouncement({
            title: `New Volunteer Opportunity: ${g.title}`,
            content: g.description || `We are looking for volunteers for ${g.title} at ${g.location}. Apply now!`,
            date: new Date().toISOString().split('T')[0],
            isPinned: false,
            link: g.applyLink || `/community?gig=${g.id}`,
            image: g.image || '',
            type: 'volunteer_gig',
        }), 'Announcement posted.');
    };

    const duplicate = (g) => run(g.id, async () => {
        const { id, order, createdAt, updatedAt, ...copy } = g;
        const ref = await useStore.getState().addVolunteerGig({ ...JSON.parse(JSON.stringify(copy)), title: `${g.title || 'Gig'} (copy)`, isPinned: false, status: 'Open' });
        if (ref?.id) setParam({ edit: ref.id });
    }, 'Copy made. You are editing it now.');

    const remove = async (e) => {
        const ok = await confirm({
            title: `Delete "${e.g.title || 'this gig'}"?`,
            body: `It disappears from the community page${e.home ? ' and the home page' : ''}.${e.applicants ? ` Its ${e.applicants} applicants stay in the linked form.` : ''} This can't be undone.`,
            confirmLabel: 'Delete gig',
        });
        if (!ok) return;
        run(e.g.id, () => useStore.getState().deleteVolunteerGig(e.g.id), 'Gig deleted.');
    };

    const copyLink = async (g) => {
        const ok = await copyToClipboard(`${window.location.origin}/community?gig=${g.id}`);
        addToast(ok ? 'Gig link copied.' : "Couldn't copy the link.", ok ? 'success' : 'error');
    };

    const exportSpec = () => ({
        filename: `volunteer_gigs_${filter}_${fileDate()}`,
        sheetName: 'Gigs',
        title: 'Volunteer gigs',
        subtitle: exportSubtitle(rows.length, 'gig', filter !== 'all' ? FILTER_LABEL[filter] : null),
        rows,
        totals: { applicants: true },
        columns: [
            { header: 'Title', value: e => e.g.title || '' },
            { header: 'Status', value: e => STATE_BADGE[e.state].label },
            { header: 'Dates', value: e => e.dates.map(d => formatDay(d)).join(', ') },
            { header: 'Reporting time', value: e => to12h(e.g.time) },
            { header: 'Location', value: e => e.g.location || '' },
            { header: 'Apply via', value: e => APPLY_LABEL[e.applyType] || e.applyType },
            { header: 'Apply link / number', value: e => (e.applyType === 'form' ? `${window.location.origin}/forms/${e.g.formId}` : e.g.applyLink || '') },
            { header: 'Spots', type: 'number', value: e => e.g.slots || null },
            { header: 'Applicants', key: 'applicants', type: 'number', value: e => e.applicants },
            { header: 'Spotlight', value: e => (e.g.isPinned ? 'Yes' : '') },
            { header: 'On home page', value: e => (e.home ? 'Yes' : '') },
            { header: 'Community link', value: e => `${window.location.origin}/community?gig=${e.g.id}` },
        ],
    });

    // ── editor ──
    const editingGig = editId ? gigs.find(g => g.id === editId) : null;
    if (isNew || editingGig) {
        return (
            <AdminCommunityHubLayout studioHeader={{ title: isNew ? 'New gig' : 'Edit gig', icon: Briefcase, description: 'Volunteer roles on the community page' }} hideTabs>
                <GigEditor key={editId || 'new'} gig={editingGig} forms={forms} onDone={() => setParam({ edit: null, new: null })} />
            </AdminCommunityHubLayout>
        );
    }

    const menu = (e) => (
        <Menu trigger={({ toggle }) => (
            <Button size="sm" variant="ghost" onClick={toggle} aria-label="More actions" className="h-10 w-10 px-0"><MoreHorizontal size={16} /></Button>
        )}>
            {e.g.formId && <MenuItem icon={Users} onClick={() => setParam({ applicants: e.g.id })}>Applicants</MenuItem>}
            <MenuItem icon={Edit} onClick={() => setParam({ edit: e.g.id })}>Edit</MenuItem>
            <MenuItem as="a" href={`/community?gig=${e.g.id}`} target="_blank" rel="noopener noreferrer" icon={ExternalLink}>Open on community page</MenuItem>
            <MenuItem icon={Link2} onClick={() => copyLink(e.g)}>Copy link</MenuItem>
            {e.state !== 'closed' && <MenuItem icon={Lock} onClick={() => setStatus(e.g, 'Closed')}>Close applications</MenuItem>}
            {e.state === 'closed' && <MenuItem icon={Unlock} onClick={() => setStatus(e.g, 'Open')}>Reopen applications</MenuItem>}
            {e.state === 'open' && <MenuItem icon={Timer} onClick={() => setStatus(e.g, 'Filling Fast')}>Mark as filling fast</MenuItem>}
            {e.state === 'filling' && <MenuItem icon={Radio} onClick={() => setStatus(e.g, 'Open')}>Mark as open</MenuItem>}
            <MenuItem icon={Star} onClick={() => togglePin(e.g)}>{e.g.isPinned ? 'Remove from spotlight' : 'Spotlight on community page'}</MenuItem>
            <MenuItem icon={Calendar} onClick={() => toggleHome(e)}>{e.home ? 'Remove from home page' : 'Show on home page'}</MenuItem>
            <MenuItem icon={Bell} onClick={() => notify(e.g)} hint="Push and in-app">Notify everyone</MenuItem>
            <MenuItem icon={Megaphone} onClick={() => announce(e.g)}>Post an announcement</MenuItem>
            {canReorder && <MenuItem icon={ArrowUp} disabled={e.index === 0} onClick={() => move(e, -1)}>Move up</MenuItem>}
            {canReorder && <MenuItem icon={ArrowDown} disabled={e.index === gigs.length - 1} onClick={() => move(e, 1)}>Move down</MenuItem>}
            <MenuItem icon={CopyPlus} onClick={() => duplicate(e.g)}>Duplicate</MenuItem>
            <MenuItem icon={Trash2} danger onClick={() => remove(e)}>Delete</MenuItem>
        </Menu>
    );

    const badges = (e) => (
        <>
            <Badge tone={STATE_BADGE[e.state].tone}>{STATE_BADGE[e.state].label}</Badge>
            {e.g.isPinned && <Badge tone="amber"><Star size={10} /> Spotlight</Badge>}
            {e.home && <Badge tone="teal">Home page</Badge>}
        </>
    );

    const capacity = (e) => {
        const slots = Number(e.g.slots) || 0;
        if (e.applyType !== 'form') {
            return <p className="text-[12px] text-gray-500">Applies via {APPLY_LABEL[e.applyType] || 'link'}{slots ? ` · ${slots} spots` : ''}</p>;
        }
        if (e.applicants === null) return <p className="text-[12px] text-gray-500">Counting applicants…</p>;
        return (
            <div>
                <p className="text-[12px] font-semibold text-gray-600 dark:text-zinc-300">{e.applicants} applicant{e.applicants === 1 ? '' : 's'}{slots ? ` for ${slots} spots` : ''}</p>
                {slots > 0 && (
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                        <div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.min(100, (e.applicants / slots) * 100)}%` }} />
                    </div>
                )}
            </div>
        );
    };

    const primary = (e) => (e.g.formId ? (
        <Button size="sm" variant="accent" onClick={() => setParam({ applicants: e.g.id })} className="h-10 flex-1"><Users size={14} /> Applicants{e.applicants ? ` (${e.applicants})` : ''}</Button>
    ) : (
        <Button size="sm" variant="secondary" onClick={() => setParam({ edit: e.g.id })} className="h-10 flex-1"><Edit size={14} /> Edit</Button>
    ));

    const applicantsGig = gigs.find(g => g.id === applicantsId) || null;
    const applicantsForm = applicantsGig ? forms.find(f => f.id === applicantsGig.formId) || null : null;

    return (
        <AdminCommunityHubLayout
            studioHeader={{ title: 'Volunteer gigs', icon: Briefcase, description: 'Crew roles, applicants and who is confirmed' }}
            action={<Button variant="primary" onClick={() => setParam({ new: '1' })} className="h-11 w-full sm:w-auto"><Plus size={15} /> New gig</Button>}
        >
            <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatTile icon={Radio} tone="green" label="Open" value={tally.open} hint="Taking applications" active={filter === 'open'} onClick={() => setParam({ filter: filter === 'open' ? null : 'open' }, true)} />
                    <StatTile icon={Timer} tone="amber" label="Filling fast" value={tally.filling} hint="Marked as urgent" active={filter === 'filling'} onClick={() => setParam({ filter: filter === 'filling' ? null : 'filling' }, true)} />
                    <StatTile icon={Users} tone="orange" label="Applicants" value={tally.applicants} hint="Through Newbi forms" />
                    <StatTile icon={CalendarDays} tone="violet" label="Next up" value={nextUp ? formatDay(nextUp.next, false) : '—'} hint={nextUp ? nextUp.g.title : 'No upcoming dates'} onClick={nextUp ? () => setParam({ edit: nextUp.g.id }) : undefined} />
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <SearchInput value={search} onChange={setSearch} placeholder="Search gigs or places" className="lg:w-80" />
                    <div className="flex flex-1 items-center gap-2">
                        <Select value={sort} onChange={setSort} label="Sort" className="flex-1 lg:w-52 lg:flex-none" options={[
                            { value: 'order', label: 'Community page order' },
                            { value: 'date', label: 'Next date' },
                            { value: 'newest', label: 'Newest first' },
                            { value: 'title', label: 'Title A–Z' },
                        ]} />
                        <ExportMenu getSpec={exportSpec} />
                        <ViewToggle value={view} onChange={setView} />
                    </div>
                </div>

                <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                    <SegmentedTabs value={filter} onChange={(v) => setParam({ filter: v === 'all' ? null : v }, true)} items={FILTERS.map(f => ({ value: f, label: FILTER_LABEL[f], count: tally[f] }))} />
                </div>

                {!loaded && gigs.length === 0 ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map(i => <div key={i} className="h-72 rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]" />)}</div>
                ) : rows.length === 0 ? (
                    <div className="rounded-2xl border border-black/[0.06] bg-white dark:border-white/[0.08] dark:bg-white/[0.03]">
                        <EmptyState
                            icon={Briefcase}
                            title={gigs.length ? 'No matching gigs' : 'No volunteer gigs yet'}
                            description={gigs.length ? 'Try another filter or search.' : 'Post a crew role. Link a Newbi form to see and confirm applicants here.'}
                            action={!gigs.length && <Button variant="primary" onClick={() => setParam({ new: '1' })}><Plus size={14} /> New gig</Button>}
                        />
                    </div>
                ) : view === 'cards' ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {rows.map(e => (
                            <article key={e.g.id} className={cn('flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white transition-colors hover:border-black/15 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/15', busyId === e.g.id && 'opacity-60')}>
                                <button type="button" onClick={() => setParam({ edit: e.g.id })} className="relative block h-36 w-full overflow-hidden text-left" aria-label={`Edit ${e.g.title}`}>
                                    {e.g.image ? (
                                        <img src={e.g.image} alt="" loading="lazy" className="h-full w-full object-cover" style={{ objectPosition: `${50 + (e.g.imageTransform?.x || 0)}% ${50 + (e.g.imageTransform?.y || 0)}%` }} />
                                    ) : (
                                        <span className="flex h-full w-full items-center justify-center" style={{ backgroundColor: `${e.g.highlightColor || '#39FF14'}1f`, color: e.g.highlightColor || '#39FF14' }}><Zap size={30} /></span>
                                    )}
                                    <span className="absolute inset-x-0 bottom-0 h-1" style={{ backgroundColor: e.g.highlightColor || '#39FF14' }} />
                                    <span className="absolute left-3 top-3 flex flex-wrap gap-1.5">{badges(e)}</span>
                                </button>
                                <div className="flex flex-1 flex-col p-4">
                                    <h3 className="line-clamp-2 text-[16px] font-extrabold leading-snug">{e.g.title || 'Untitled gig'}</h3>
                                    <div className="mt-2 space-y-1 text-[13px] text-gray-600 dark:text-zinc-300">
                                        <p className="flex items-center gap-2"><Calendar size={13} className="shrink-0 text-orange-500" /> <span className="truncate">{datesText(e.dates)}</span></p>
                                        {e.g.time && <p className="flex items-center gap-2"><Clock size={13} className="shrink-0 text-violet-500" /> {to12h(e.g.time)}</p>}
                                        <p className="flex items-center gap-2"><MapPin size={13} className="shrink-0 text-sky-500" /> <span className="truncate">{e.g.location || 'Location to be announced'}</span></p>
                                    </div>
                                    <div className="mb-4 mt-3">{capacity(e)}</div>
                                    <div className="mt-auto flex items-center gap-2 border-t border-black/[0.06] pt-3 dark:border-white/[0.06]">
                                        {primary(e)}
                                        {e.g.formId && <Button size="sm" variant="secondary" onClick={() => setParam({ edit: e.g.id })} className="h-10"><Edit size={14} /> Edit</Button>}
                                        {e.applyType === 'whatsapp' && !e.g.formId && <Button size="sm" variant="secondary" as="a" href={`https://wa.me/${String(e.g.applyLink || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="h-10 w-10 px-0" aria-label="Open WhatsApp"><MessageCircle size={14} /></Button>}
                                        {menu(e)}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white dark:border-white/[0.08] dark:bg-white/[0.03]">
                        <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                            {rows.map(e => (
                                <li key={e.g.id} className={cn('flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5', busyId === e.g.id && 'opacity-60')}>
                                    {canReorder && (
                                        <div className="hidden shrink-0 flex-col sm:flex">
                                            <button type="button" onClick={() => move(e, -1)} disabled={e.index === 0 || Boolean(busyId)} aria-label="Move up" className="flex h-7 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-black/5 disabled:opacity-20 dark:hover:bg-white/5"><ArrowUp size={14} /></button>
                                            <button type="button" onClick={() => move(e, 1)} disabled={e.index === gigs.length - 1 || Boolean(busyId)} aria-label="Move down" className="flex h-7 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-black/5 disabled:opacity-20 dark:hover:bg-white/5"><ArrowDown size={14} /></button>
                                        </div>
                                    )}
                                    <button type="button" onClick={() => setParam({ edit: e.g.id })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                                        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl" style={{ backgroundColor: `${e.g.highlightColor || '#39FF14'}1f`, color: e.g.highlightColor || '#39FF14' }}>
                                            {e.g.image ? <img src={e.g.image} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Zap size={18} />}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="flex flex-wrap items-center gap-1.5">
                                                <span className="truncate text-[15px] font-bold">{e.g.title || 'Untitled gig'}</span>
                                                {badges(e)}
                                            </span>
                                            <span className="mt-0.5 block truncate text-[12px] text-gray-500">
                                                {datesText(e.dates)}{e.g.location ? ` · ${e.g.location}` : ''}{e.g.formId && e.applicants !== null ? ` · ${e.applicants} applicant${e.applicants === 1 ? '' : 's'}${e.g.slots ? ` / ${e.g.slots} spots` : ''}` : ''}
                                            </span>
                                        </span>
                                    </button>
                                    <div className="flex items-center gap-2 sm:w-[240px] sm:justify-end">
                                        {primary(e)}
                                        {menu(e)}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {canReorder && gigs.length > 1 && <p className="text-center text-[12px] text-gray-500">Spotlight gigs show first on the community page; use Move up / down to set the order.</p>}
            </div>

            <ResponsesSheet
                open={Boolean(applicantsGig)}
                onClose={() => setParam({ applicants: null })}
                form={applicantsForm}
                mode="volunteer"
                gig={applicantsGig}
                onCloseGig={applicantsGig ? async () => {
                    try {
                        await useStore.getState().updateVolunteerGig(applicantsGig.id, { status: 'Closed' });
                        if (applicantsGig.formId) await syncGigForm(applicantsGig.formId, 'Closed', forms);
                        addToast('Applications closed.', 'success');
                    } catch (err) {
                        console.error(err);
                        addToast('Check your connection and try again.', 'error', { title: "Couldn't close applications" });
                    }
                } : undefined}
            />
            {confirmEl}
        </AdminCommunityHubLayout>
    );
};

export default VolunteerGigManager;
