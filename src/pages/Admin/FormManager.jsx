import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ClipboardList from 'lucide-react/dist/esm/icons/clipboard-list';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Edit from 'lucide-react/dist/esm/icons/edit';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Inbox from 'lucide-react/dist/esm/icons/inbox';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Unlock from 'lucide-react/dist/esm/icons/unlock';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import Star from 'lucide-react/dist/esm/icons/star';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import CopyPlus from 'lucide-react/dist/esm/icons/copy-plus';
import Radio from 'lucide-react/dist/esm/icons/radio';
import Timer from 'lucide-react/dist/esm/icons/timer';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { notifyAllUsers } from '../../lib/notificationTriggers';
import { copyToClipboard } from '../../lib/clipboard';
import { cn } from '../../lib/utils';
import { exportSubtitle, fileDate } from '../../lib/xlsx';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import ExportMenu from '../../components/admin/ExportMenu';
import { Badge, Button, EmptyState, Menu, MenuItem, SearchInput, SegmentedTabs, Select, StatTile, ViewToggle, useViewMode } from '../../components/admin/ui';
import ResponsesSheet from '../../components/admin/forms/ResponsesSheet';
import { FORM_STATE_LABEL, formState, isNativeForm } from '../../components/admin/forms/formSchema';
import { countFormResponses } from '../../components/admin/forms/formResponses';
import { formatDateTime, formatDay, toDate, useConfirm } from '../../components/admin/forms/kit';

const FILTERS = ['all', 'live', 'filling', 'closed'];
const FILTER_LABEL = { all: 'All', live: 'Live', filling: 'Filling fast', closed: 'Closed' };

const isOnHome = (form, upcomingEvents) => (upcomingEvents || []).some(e =>
    e.formId === form.id || e.link === `/forms/${form.id}` || (e.title === form.title && e.category === 'form'));

const FormManager = () => {
    useStoreSubscription(['forms', 'upcomingEvents']);
    const navigate = useNavigate();
    const allForms = useStore(s => s.forms) || [];
    const upcomingEvents = useStore(s => s.upcomingEvents) || [];
    const loaded = useStore(s => s.subscriptionsLoaded?.forms);
    const addToast = useStore(s => s.addToast);
    const [params, setParams] = useSearchParams();
    const [view, setView] = useViewMode('forms', 'cards');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('newest');
    const [counts, setCounts] = useState({});
    const [busyId, setBusyId] = useState(null);
    const [confirm, confirmEl] = useConfirm();

    const filter = FILTERS.includes(params.get('filter')) ? params.get('filter') : 'all';
    const responsesId = params.get('responses');
    const setParam = (key, value) => {
        const next = new URLSearchParams(params);
        if (value) next.set(key, value); else next.delete(key);
        setParams(next, { replace: key === 'filter' });
    };

    // A gig's own application form is looked after in Volunteer gigs, not listed here.
    const forms = useMemo(() => allForms.filter(f => !f.gigId), [allForms]);

    // Real response counts for built-in forms.
    const nativeIds = forms.filter(isNativeForm).map(f => f.id).join(',');
    useEffect(() => {
        if (!nativeIds) return;
        let cancelled = false;
        Promise.all(nativeIds.split(',').map(fid => countFormResponses(fid).then(n => [fid, n]).catch(() => null)))
            .then(pairs => { if (!cancelled) setCounts(Object.fromEntries(pairs.filter(Boolean))); });
        return () => { cancelled = true; };
    }, [nativeIds]);

    const enriched = useMemo(() => forms.map(f => ({
        f,
        state: formState(f),
        native: isNativeForm(f),
        responses: isNativeForm(f) ? (counts[f.id] ?? f.responseCount ?? 0) : null,
        onHome: isOnHome(f, upcomingEvents),
    })), [forms, counts, upcomingEvents]);

    const tally = useMemo(() => {
        const c = { all: 0, live: 0, filling: 0, closed: 0, responses: 0, native: 0 };
        enriched.forEach(e => { c.all += 1; c[e.state] += 1; c.responses += e.responses || 0; if (e.native) c.native += 1; });
        return c;
    }, [enriched]);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = enriched.filter(e => (filter === 'all' || e.state === filter)
            && (!q || [e.f.title, e.f.description, e.f.bottomText].some(v => String(v || '').toLowerCase().includes(q))));
        const by = {
            newest: (a, b) => (toDate(b.f.createdAt)?.getTime() || 0) - (toDate(a.f.createdAt)?.getTime() || 0),
            responses: (a, b) => (b.responses || 0) - (a.responses || 0),
            title: (a, b) => String(a.f.title || '').localeCompare(String(b.f.title || '')),
        }[sort];
        return list.sort(by);
    }, [enriched, filter, search, sort]);

    // ── actions ──
    const linkOf = (f) => `${window.location.origin}/forms/${f.id}`;
    const copyLink = async (f) => {
        const ok = await copyToClipboard(linkOf(f));
        if (ok) addToast('Form link copied.', 'success');
        else addToast('Open the form and copy the link from the address bar.', 'error', { title: "Couldn't copy the link" });
    };
    const whatsapp = (f) => window.open(`https://wa.me/?text=${encodeURIComponent(`${f.title}: ${linkOf(f)}`)}`, '_blank', 'noopener');

    const run = async (f, fn, success) => {
        if (busyId) return;
        setBusyId(f.id);
        try {
            await fn();
            if (success) addToast(success, 'success');
        } catch (err) {
            console.error(err);
            addToast('Check your connection and try again.', 'error', { title: "Couldn't save the change", action: { label: 'Try again', onClick: () => run(f, fn, success) } });
        } finally {
            setBusyId(null);
        }
    };

    const toggleOpen = (e) => {
        const closing = e.state !== 'closed';
        if (!closing && e.f.activeLabel !== 'Closed') {
            addToast(e.f.closesAt && toDate(e.f.closesAt) < new Date() ? 'Its closing date has passed. Change the date in the editor to reopen it.' : 'It has reached its response limit. Raise the limit in the editor to reopen it.', 'warning', { title: "Can't reopen this form yet" });
            return;
        }
        run(e.f, () => useStore.getState().updateForm(e.f.id, { activeLabel: closing ? 'Closed' : 'Live' }), closing ? 'Form closed.' : 'Form reopened.');
    };

    const togglePin = (f) => run(f, () => useStore.getState().updateForm(f.id, { isPinned: !f.isPinned }), f.isPinned ? 'Removed from the spotlight.' : 'Added to the spotlight.');

    const toggleHome = async (e) => {
        const f = e.f;
        const existing = upcomingEvents.find(ev => ev.formId === f.id || ev.link === `/forms/${f.id}` || (ev.title === f.title && ev.category === 'form'));
        if (existing) {
            if (!(await confirm({ title: 'Remove from the home page?', body: `"${f.title}" will no longer show in Upcoming events.`, confirmLabel: 'Remove' }))) return;
            run(f, () => useStore.getState().deleteUpcomingEvent(existing.id), 'Removed from the home page.');
        } else {
            run(f, () => useStore.getState().addUpcomingEvent({
                title: f.title,
                description: f.description || '',
                image: f.image || '',
                link: `/forms/${f.id}`,
                buttonText: f.buttonText || 'FILL FORM',
                highlightColor: f.highlightColor || '#FF4F8B',
                category: 'form',
                formId: f.id,
                relatedArtistFormId: f.id,
                date: new Date().toISOString(),
                location: 'Online Form',
                status: f.activeLabel || 'Live',
                isForm: true,
            }), 'Added to the home page.');
        }
    };

    const announce = async (f) => {
        const ok = await confirm({
            title: 'Tell everyone about this form?',
            body: 'Posts an announcement and sends a notification to every user.',
            confirmLabel: 'Send',
            tone: 'accent',
        });
        if (!ok) return;
        run(f, async () => {
            await useStore.getState().addAnnouncement({
                title: `Form Access: ${f.title}`,
                date: new Date().toISOString().split('T')[0],
                content: f.description || 'Please take a moment to fill out this form. Your feedback helps us improve.',
                isPinned: false,
                link: `/forms/${f.id}`,
                image: f.image || '',
            });
            await notifyAllUsers(`New form: ${f.title}`, f.description || "We'd love your input. Fill out this form whenever you have a moment.", `/forms/${f.id}`, f.image || '');
        }, 'Announcement posted and everyone notified.');
    };

    const duplicate = (f) => run(f, async () => {
        const { id, createdAt, updatedAt, responseCount, lastResponseAt, ...copy } = f;
        const newId = await useStore.getState().addForm({
            ...JSON.parse(JSON.stringify(copy)),
            title: `${f.title || 'Form'} (copy)`,
            activeLabel: 'Live',
            isPinned: false,
            responseCount: 0,
            createdAt: new Date().toISOString(),
        });
        if (newId) navigate(`/admin/forms/edit/${newId}`);
    }, 'Copy made. You are editing it now.');

    const remove = async (e) => {
        const n = e.responses || 0;
        const ok = await confirm({
            title: `Delete "${e.f.title || 'this form'}"?`,
            body: `The form link will stop working${e.onHome ? ' and its home page card is removed' : ''}.${n ? ` Its ${n} response${n === 1 ? '' : 's'} are kept but won't be listed here any more.` : ''} This can't be undone.`,
            confirmLabel: 'Delete form',
        });
        if (!ok) return;
        run(e.f, () => useStore.getState().deleteForm(e.f.id), 'Form deleted.');
    };

    const exportSpec = () => ({
        filename: `forms_${filter}_${fileDate()}`,
        sheetName: 'Forms',
        title: 'Forms',
        subtitle: exportSubtitle(rows.length, 'form', filter !== 'all' ? FILTER_LABEL[filter] : null),
        rows,
        totals: { responses: true },
        columns: [
            { header: 'Title', value: e => e.f.title || '' },
            { header: 'Type', value: e => (e.native ? 'Built here' : 'Google Form') },
            { header: 'Status', value: e => FORM_STATE_LABEL[e.state].label },
            { header: 'Responses', key: 'responses', type: 'number', value: e => e.responses },
            { header: 'Response limit', type: 'number', value: e => e.f.responseLimit || null },
            { header: 'Closes', type: 'datetime', value: e => toDate(e.f.closesAt) },
            { header: 'Created', type: 'date', value: e => toDate(e.f.createdAt) },
            { header: 'On home page', value: e => (e.onHome ? 'Yes' : '') },
            { header: 'Link', value: e => linkOf(e.f) },
        ],
    });

    const menu = (e) => (
        <Menu trigger={({ toggle }) => (
            <Button size="sm" variant="ghost" onClick={toggle} aria-label="More actions" className="h-10 w-10 px-0"><MoreHorizontal size={16} /></Button>
        )}>
            {e.native && <MenuItem icon={Inbox} onClick={() => setParam('responses', e.f.id)}>Responses</MenuItem>}
            <MenuItem icon={Edit} onClick={() => navigate(`/admin/forms/edit/${e.f.id}`)}>Edit</MenuItem>
            <MenuItem as="a" href={`/forms/${e.f.id}`} target="_blank" rel="noopener noreferrer" icon={ExternalLink}>Open form</MenuItem>
            <MenuItem icon={Link2} onClick={() => copyLink(e.f)}>Copy link</MenuItem>
            <MenuItem icon={MessageCircle} onClick={() => whatsapp(e.f)}>Share on WhatsApp</MenuItem>
            <MenuItem icon={e.state === 'closed' ? Unlock : Lock} onClick={() => toggleOpen(e)}>{e.state === 'closed' ? 'Reopen' : 'Close form'}</MenuItem>
            <MenuItem icon={Star} onClick={() => togglePin(e.f)}>{e.f.isPinned ? 'Remove from spotlight' : 'Spotlight on community page'}</MenuItem>
            <MenuItem icon={Calendar} onClick={() => toggleHome(e)}>{e.onHome ? 'Remove from home page' : 'Show on home page'}</MenuItem>
            <MenuItem icon={Megaphone} onClick={() => announce(e.f)} hint="Announcement and notification">Tell everyone</MenuItem>
            <MenuItem icon={CopyPlus} onClick={() => duplicate(e.f)}>Duplicate</MenuItem>
            <MenuItem icon={Trash2} danger onClick={() => remove(e)}>Delete</MenuItem>
        </Menu>
    );

    const badges = (e) => (
        <>
            <Badge tone={FORM_STATE_LABEL[e.state].tone}>{FORM_STATE_LABEL[e.state].label}</Badge>
            <Badge tone={e.native ? 'indigo' : 'amber'}>{e.native ? 'Built here' : 'Google Form · rebuild'}</Badge>
            {e.f.isPinned && <Badge tone="amber"><Star size={10} /> Spotlight</Badge>}
            {e.onHome && <Badge tone="teal">Home page</Badge>}
        </>
    );

    const meta = (e) => [
        e.native ? `${e.responses} response${e.responses === 1 ? '' : 's'}${e.f.responseLimit ? ` of ${e.f.responseLimit}` : ''}` : 'Responses in Google Forms',
        e.f.closesAt ? `${toDate(e.f.closesAt) < new Date() ? 'Closed' : 'Closes'} ${formatDateTime(e.f.closesAt)}` : null,
    ].filter(Boolean).join(' · ');

    const primary = (e) => (e.native ? (
        <Button size="sm" variant="accent" onClick={() => setParam('responses', e.f.id)} className="h-10 flex-1"><Inbox size={14} /> Responses{e.responses ? ` (${e.responses})` : ''}</Button>
    ) : (
        <Button size="sm" variant="secondary" as="a" href={e.f.formUrl} target="_blank" rel="noopener noreferrer" className="h-10 flex-1"><ExternalLink size={14} /> Open Google Form</Button>
    ));

    const responsesForm = forms.find(f => f.id === responsesId) || null;

    return (
        <AdminCommunityHubLayout
            studioHeader={{ title: 'Forms', icon: ClipboardList, description: 'Questions, sign-ups and the answers people send' }}
            action={<Button as={Link} to="/admin/forms/create" variant="primary" className="h-11 w-full sm:w-auto"><Plus size={15} /> New form</Button>}
        >
            <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatTile icon={Radio} tone="green" label="Live" value={tally.live} hint="Taking responses" active={filter === 'live'} onClick={() => setParam('filter', filter === 'live' ? null : 'live')} />
                    <StatTile icon={Timer} tone="amber" label="Filling fast" value={tally.filling} hint="Marked as urgent" active={filter === 'filling'} onClick={() => setParam('filter', filter === 'filling' ? null : 'filling')} />
                    <StatTile icon={Inbox} tone="indigo" label="Responses" value={tally.responses} hint={`Across ${tally.native} built-in form${tally.native === 1 ? '' : 's'}`} />
                    <StatTile icon={Lock} tone="red" label="Closed" value={tally.closed} hint="Not taking responses" active={filter === 'closed'} onClick={() => setParam('filter', filter === 'closed' ? null : 'closed')} />
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <SearchInput value={search} onChange={setSearch} placeholder="Search forms" className="lg:w-80" />
                    <div className="flex flex-1 items-center gap-2">
                        <Select value={sort} onChange={setSort} label="Sort" className="flex-1 lg:w-48 lg:flex-none" options={[
                            { value: 'newest', label: 'Newest first' },
                            { value: 'responses', label: 'Most responses' },
                            { value: 'title', label: 'Title A–Z' },
                        ]} />
                        <ExportMenu getSpec={exportSpec} />
                        <ViewToggle value={view} onChange={setView} />
                    </div>
                </div>

                <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                    <SegmentedTabs value={filter} onChange={(v) => setParam('filter', v === 'all' ? null : v)} items={FILTERS.map(f => ({ value: f, label: FILTER_LABEL[f], count: tally[f] }))} />
                </div>

                {!loaded && forms.length === 0 ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map(i => <div key={i} className="h-64 rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]" />)}</div>
                ) : rows.length === 0 ? (
                    <div className="rounded-2xl border border-black/[0.06] bg-white dark:border-white/[0.08] dark:bg-white/[0.03]">
                        <EmptyState
                            icon={ClipboardList}
                            title={forms.length ? 'No matching forms' : 'No forms yet'}
                            description={forms.length ? 'Try another filter or search.' : 'Build a sign-up or feedback form with your own questions. People fill it in the app and you see every answer here.'}
                            action={!forms.length && <Button as={Link} to="/admin/forms/create" variant="primary"><Plus size={14} /> New form</Button>}
                        />
                    </div>
                ) : view === 'cards' ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {rows.map(e => (
                            <article key={e.f.id} className={cn('flex flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white transition-colors hover:border-black/15 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/15', busyId === e.f.id && 'opacity-60')}>
                                <button type="button" onClick={() => navigate(`/admin/forms/edit/${e.f.id}`)} className="relative block h-32 w-full overflow-hidden text-left" aria-label={`Edit ${e.f.title}`}>
                                    {e.f.image ? (
                                        <img src={e.f.image} alt="" loading="lazy" className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="flex h-full w-full items-center justify-center" style={{ backgroundColor: `${e.f.highlightColor || '#FF4F8B'}1f`, color: e.f.highlightColor || '#FF4F8B' }}>
                                            <FileText size={30} />
                                        </span>
                                    )}
                                    <span className="absolute inset-x-0 bottom-0 h-1" style={{ backgroundColor: e.f.highlightColor || '#FF4F8B' }} />
                                </button>
                                <div className="flex flex-1 flex-col p-4">
                                    <div className="flex flex-wrap gap-1.5">{badges(e)}</div>
                                    <h3 className="mt-2.5 line-clamp-2 text-[16px] font-extrabold leading-snug">{e.f.title || 'Untitled form'}</h3>
                                    {e.f.description && <p className="mt-1 line-clamp-2 text-[13px] text-gray-500">{e.f.description}</p>}
                                    <p className="mb-4 mt-2 text-[12px] font-semibold text-gray-500">{meta(e)}</p>
                                    <div className="mt-auto flex items-center gap-2 border-t border-black/[0.06] pt-3 dark:border-white/[0.06]">
                                        {primary(e)}
                                        <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/forms/edit/${e.f.id}`)} className="h-10"><Edit size={14} /> Edit</Button>
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
                                <li key={e.f.id} className={cn('flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5', busyId === e.f.id && 'opacity-60')}>
                                    <button type="button" onClick={() => navigate(`/admin/forms/edit/${e.f.id}`)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                                        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl" style={{ backgroundColor: `${e.f.highlightColor || '#FF4F8B'}1f`, color: e.f.highlightColor || '#FF4F8B' }}>
                                            {e.f.image ? <img src={e.f.image} alt="" className="h-full w-full object-cover" loading="lazy" /> : <FileText size={18} />}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="flex flex-wrap items-center gap-1.5">
                                                <span className="truncate text-[15px] font-bold">{e.f.title || 'Untitled form'}</span>
                                                {badges(e)}
                                            </span>
                                            <span className="mt-0.5 block truncate text-[12px] text-gray-500">{meta(e)} · created {formatDay(e.f.createdAt) || '—'}</span>
                                        </span>
                                    </button>
                                    <div className="flex items-center gap-2 sm:w-[300px] sm:justify-end">
                                        {primary(e)}
                                        {menu(e)}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <ResponsesSheet open={Boolean(responsesForm)} onClose={() => setParam('responses', null)} form={responsesForm} />
            {confirmEl}
        </AdminCommunityHubLayout>
    );
};

export default FormManager;
