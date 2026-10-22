import React, { useEffect, useMemo, useState } from 'react';
import Inbox from 'lucide-react/dist/esm/icons/inbox';
import Users from 'lucide-react/dist/esm/icons/users';
import UserCheck from 'lucide-react/dist/esm/icons/user-check';
import Star from 'lucide-react/dist/esm/icons/star';
import Clock from 'lucide-react/dist/esm/icons/clock';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Phone from 'lucide-react/dist/esm/icons/phone';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import CalendarDays from 'lucide-react/dist/esm/icons/calendar-days';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import Sheet from '../Sheet';
import ExportMenu from '../ExportMenu';
import { Avatar, Badge, Button, EmptyState, SearchInput, SegmentedTabs, StatTile } from '../ui';
import { Toggle } from '../uploads/UploadKit';
import { useStore } from '../../../lib/store';
import { cn } from '../../../lib/utils';
import { exportSubtitle, fileDate } from '../../../lib/xlsx';
import { notifySpecificUser } from '../../../lib/notificationTriggers';
import { answerText, responseFields, responseIdentity } from './formSchema';
import { deleteFormResponses, subscribeToFormResponses, syncResponseCount, updateFormResponses } from './formResponses';
import { BulkBar, InfoRow, SelectBox, SheetSection, formatDateTime, timeAgo, toDate, useConfirm } from './kit';
import { notifyEvent } from '../../../lib/mailApi';
import WhatsAppSendSheet from '../whatsapp/WhatsAppSendSheet';

/*
 * Every response to a built-in form, with search, export, bulk actions and a
 * detail view. In `volunteer` mode (a gig's applicants) each response also has
 * a status: applied → shortlisted → confirmed / waitlist / rejected, counted
 * against the gig's spots.
 */

export const VOLUNTEER_STATUS = {
    new: { label: 'Applied', tone: 'blue' },
    shortlisted: { label: 'Shortlisted', tone: 'violet' },
    confirmed: { label: 'Confirmed', tone: 'green' },
    waitlist: { label: 'Waitlist', tone: 'amber' },
    rejected: { label: 'Not this time', tone: 'red' },
};
const STATUS_ORDER = ['new', 'shortlisted', 'confirmed', 'waitlist', 'rejected'];
const statusOf = (r) => (VOLUNTEER_STATUS[r.status] ? r.status : 'new');

const NOTIFY_COPY = {
    confirmed: (gig) => ['You are on the crew', `You're confirmed for ${gig?.title || 'the gig'}. We'll share the details soon.`],
    waitlist: (gig) => ['You are on the waitlist', `Thanks for applying to ${gig?.title || 'the gig'}. You're on the waitlist and we'll tell you if a spot opens up.`],
    rejected: (gig) => ['Thanks for applying', `We couldn't fit you into ${gig?.title || 'this gig'} this time. Keep an eye out for the next one.`],
};

const digits = (p) => String(p || '').replace(/\D/g, '');
const waNumber = (p) => {
    const d = digits(p);
    return d.length === 10 ? `91${d}` : d;
};

const AnswerValue = ({ field, value }) => {
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)) return <span className="text-gray-400">No answer</span>;
    if (field.type === 'file' || value?.url || value?.[0]?.url) {
        const files = Array.isArray(value) ? value : [value];
        return (
            <div className="space-y-1.5">
                {files.map(f => (
                    <a key={f.url} href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-black/10 px-3 py-2.5 text-[13px] font-semibold hover:border-black/25 dark:border-white/10 dark:hover:border-white/25">
                        <FileText size={15} className="shrink-0 text-rose-500" />
                        <span className="min-w-0 flex-1 truncate">{f.name || 'Open file'}</span>
                        <ExternalLink size={13} className="shrink-0 text-gray-400" />
                    </a>
                ))}
            </div>
        );
    }
    if (field.type === 'url' && /^https?:\/\//.test(String(value))) {
        return <a href={value} target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-sky-600 dark:text-neon-blue">{value}</a>;
    }
    if (Array.isArray(value)) {
        return <div className="flex flex-wrap gap-1.5">{value.map(v => <Badge key={v} tone="violet">{v}</Badge>)}</div>;
    }
    return <span className="whitespace-pre-line">{answerText(field, value)}</span>;
};

const ResponsesSheet = ({ open, onClose, form, mode = 'form', gig, onCloseGig }) => {
    const addToast = useStore(s => s.addToast);
    const volunteer = mode === 'volunteer';
    const [responses, setResponses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [selected, setSelected] = useState(() => new Set());
    const [waPeople, setWaPeople] = useState(null); // [{ name, phone }] for Send on WhatsApp
    const [detailId, setDetailId] = useState(null);
    const [busy, setBusy] = useState(false);
    const [notify, setNotify] = useState(true);
    const [confirm, confirmEl] = useConfirm();

    const formId = form?.id;
    useEffect(() => {
        if (!open || !formId) return undefined;
        setLoading(true);
        setLoadError('');
        let first = true;
        const unsub = subscribeToFormResponses(formId, (list) => {
            setResponses(list);
            setLoading(false);
            if (first) {
                first = false;
                if (typeof form?.responseCount === 'number' && form.responseCount !== list.length) syncResponseCount(formId, list.length);
                else if (form && form.responseCount === undefined && list.length) syncResponseCount(formId, list.length);
            }
        }, (err) => {
            console.error(err);
            setLoading(false);
            setLoadError("Couldn't load the responses. Please try again.");
        });
        return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, formId]);

    useEffect(() => {
        if (!open) { setSelected(new Set()); setDetailId(null); setSearch(''); setStatus('all'); }
    }, [open]);

    const fields = useMemo(() => responseFields(form, responses), [form, responses]);
    const rows = useMemo(() => responses.map(r => ({ r, who: responseIdentity(r, fields), status: statusOf(r) })), [responses, fields]);

    const counts = useMemo(() => {
        const c = { all: rows.length };
        STATUS_ORDER.forEach(s => { c[s] = 0; });
        rows.forEach(x => { c[x.status] += 1; });
        return c;
    }, [rows]);

    const slots = Number(gig?.slots) || 0;

    const shown = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter(x => {
            if (volunteer && status !== 'all' && x.status !== status) return false;
            if (!q) return true;
            return [x.who.name, x.who.email, x.who.phone, ...Object.values(x.r.answers || {}).map(v => (typeof v === 'string' ? v : ''))]
                .some(v => String(v || '').toLowerCase().includes(q));
        });
    }, [rows, search, status, volunteer]);

    const week = useMemo(() => {
        const since = Date.now() - 7 * 86400000;
        return rows.filter(x => (toDate(x.r.submittedAt)?.getTime() || 0) >= since).length;
    }, [rows]);

    const toggle = (id, on) => setSelected(prev => {
        const next = new Set(prev);
        if (on) next.add(id); else next.delete(id);
        return next;
    });
    const allShownSelected = shown.length > 0 && shown.every(x => selected.has(x.r.id));

    const setStatusFor = async (ids, next) => {
        if (!ids.length || busy) return;
        const targets = rows.filter(x => ids.includes(x.r.id) && x.status !== next);
        if (!targets.length) return;
        if (next === 'confirmed' && slots) {
            const after = counts.confirmed + targets.length;
            if (after > slots && !(await confirm({
                title: 'More than the spots you have',
                body: `This makes ${after} confirmed for ${slots} spot${slots === 1 ? '' : 's'}. Confirm anyway?`,
                confirmLabel: 'Confirm anyway',
                tone: 'accent',
            }))) return;
        }
        setBusy(true);
        try {
            const user = useStore.getState().user;
            await updateFormResponses(targets.map(x => x.r.id), { status: next, statusUpdatedAt: new Date().toISOString(), statusUpdatedBy: user?.email || null });
            let notified = 0;
            if (volunteer && notify && NOTIFY_COPY[next]) {
                const [title, body] = NOTIFY_COPY[next](gig);
                await Promise.all(targets.filter(x => x.r.userId).map(x => notifySpecificUser(x.r.userId, title, body, '/community', 'gig').then(() => { notified += 1; }).catch(() => {})));
            }
            // Confirmed volunteers also get the gig details on WhatsApp (the server sends each one once).
            if (volunteer && notify && next === 'confirmed') notifyEvent('gig-selected', { responseIds: targets.map(x => x.r.id) }).catch(() => {});
            const marked = `${targets.length === 1 ? (targets[0].who.name || 'Applicant') : `${targets.length} people`} marked ${VOLUNTEER_STATUS[next].label.toLowerCase()}`;
            if (notified) addToast(`${notified === 1 ? '1 person' : `${notified} people`} got a notification.`, 'success', { title: marked });
            else addToast(`${marked}.`, 'success');
            setSelected(new Set());
            const confirmedAfter = counts.confirmed + (next === 'confirmed' ? targets.length : -targets.filter(x => x.status === 'confirmed').length);
            if (next === 'confirmed' && slots && confirmedAfter >= slots && gig && String(gig.status || '').toLowerCase() !== 'closed' && onCloseGig) {
                if (await confirm({
                    title: 'All spots are filled',
                    body: `${confirmedAfter} of ${slots} spots are confirmed. Close applications for ${gig.title || 'this gig'} so no one else applies?`,
                    confirmLabel: 'Close applications',
                    cancelLabel: 'Keep open',
                    tone: 'accent',
                })) await onCloseGig();
            }
        } catch (err) {
            console.error(err);
            addToast('Check your connection and try again.', 'error', { title: "Couldn't update the status" });
        } finally {
            setBusy(false);
        }
    };

    const remove = async (ids) => {
        if (!ids.length || busy) return;
        const ok = await confirm({
            title: ids.length === 1 ? 'Delete this response?' : `Delete ${ids.length} responses?`,
            body: "The answers and any files linked to them will be gone from here. This can't be undone.",
            confirmLabel: 'Delete',
        });
        if (!ok) return;
        setBusy(true);
        try {
            await deleteFormResponses(ids, form?.id);
            addToast(ids.length === 1 ? 'Response deleted.' : `${ids.length} responses deleted.`, 'success');
            setSelected(new Set());
            if (ids.includes(detailId)) setDetailId(null);
        } catch (err) {
            console.error(err);
            addToast('Check your connection and try again.', 'error', { title: ids.length === 1 ? "Couldn't delete the response" : "Couldn't delete the responses" });
        } finally {
            setBusy(false);
        }
    };

    const exportSpec = () => ({
        filename: `${volunteer ? 'applicants' : 'responses'}_${String(form?.title || 'form').replace(/[^\w-]+/g, '_').slice(0, 40)}_${fileDate()}`,
        sheetName: volunteer ? 'Applicants' : 'Responses',
        title: `${form?.title || 'Form'} · ${volunteer ? 'applicants' : 'responses'}`,
        subtitle: exportSubtitle(shown.length, volunteer ? 'applicant' : 'response', volunteer && status !== 'all' ? VOLUNTEER_STATUS[status].label : null),
        rows: shown,
        columns: [
            { header: 'Submitted', type: 'datetime', value: x => toDate(x.r.submittedAt) },
            { header: 'Name', value: x => x.who.name },
            { header: 'Email', value: x => x.who.email },
            { header: 'Phone', value: x => x.who.phone },
            ...(volunteer ? [{ header: 'Status', value: x => VOLUNTEER_STATUS[x.status].label }] : []),
            ...fields.map(f => ({ header: f.label || 'Question', width: f.type === 'long' ? 40 : 24, value: x => answerText(f, x.r.answers?.[f.id]) })),
            { header: 'Account', value: x => (x.r.userId ? 'Signed in' : 'Guest') },
        ],
    });

    const detail = rows.find(x => x.r.id === detailId);

    return (
        <>
            <Sheet
                open={open}
                onClose={onClose}
                size="xl"
                title={volunteer ? 'Applicants' : 'Responses'}
                subtitle={form ? `${form.title || 'Untitled form'} · ${rows.length} ${volunteer ? 'applicant' : 'response'}${rows.length === 1 ? '' : 's'}` : ''}
                bodyClassName="space-y-4"
            >
                {!form ? (
                    <EmptyState icon={AlertCircle} tone="amber" title="No form linked" description="Link a built-in form to this gig to collect applications here." />
                ) : (
                    <>
                        {volunteer ? (
                            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                                <StatTile icon={Users} tone="blue" label="Applied" value={counts.new} active={status === 'new'} onClick={() => setStatus(status === 'new' ? 'all' : 'new')} />
                                <StatTile icon={Star} tone="violet" label="Shortlisted" value={counts.shortlisted} active={status === 'shortlisted'} onClick={() => setStatus(status === 'shortlisted' ? 'all' : 'shortlisted')} />
                                <StatTile icon={UserCheck} tone="green" label="Confirmed" value={slots ? `${counts.confirmed}/${slots}` : counts.confirmed} hint={slots ? (counts.confirmed >= slots ? 'All spots filled' : `${slots - counts.confirmed} spots left`) : 'No spot limit set'} active={status === 'confirmed'} onClick={() => setStatus(status === 'confirmed' ? 'all' : 'confirmed')} />
                                <StatTile icon={Clock} tone="amber" label="Waitlist" value={counts.waitlist} active={status === 'waitlist'} onClick={() => setStatus(status === 'waitlist' ? 'all' : 'waitlist')} />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2.5">
                                <StatTile icon={Inbox} tone="indigo" label="Responses" value={rows.length} hint={form.responseLimit ? `Limit ${form.responseLimit}` : 'No limit'} />
                                <StatTile icon={CalendarDays} tone="teal" label="Last 7 days" value={week} hint={rows[0] ? `Latest ${timeAgo(rows[0].r.submittedAt)}` : 'None yet'} />
                            </div>
                        )}

                        <div className="flex gap-2">
                            <SearchInput value={search} onChange={setSearch} placeholder="Search names, emails, answers" className="flex-1" />
                            <ExportMenu getSpec={exportSpec} label="Export" />
                        </div>

                        {volunteer && (
                            <div className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                <SegmentedTabs value={status} onChange={setStatus} items={[{ value: 'all', label: 'All', count: counts.all }, ...STATUS_ORDER.map(s => ({ value: s, label: VOLUNTEER_STATUS[s].label, count: counts[s], highlight: s === 'new' && counts.new > 0 }))]} />
                            </div>
                        )}
                        {volunteer && <Toggle label="Notify people when their status changes" hint="Signed-in applicants get an in-app notification" checked={notify} onChange={setNotify} />}

                        {loadError ? (
                            <EmptyState icon={AlertCircle} tone="red" title={loadError} />
                        ) : loading ? (
                            <div className="space-y-2">{[0, 1, 2].map(i => <div key={i} className="h-16 rounded-2xl bg-black/[0.04] dark:bg-white/[0.04]" />)}</div>
                        ) : shown.length === 0 ? (
                            <EmptyState
                                icon={Inbox}
                                title={rows.length ? 'Nothing matches' : volunteer ? 'No applicants yet' : 'No responses yet'}
                                description={rows.length ? 'Try another search or status.' : 'Share the form link. Answers appear here as soon as people submit.'}
                            />
                        ) : (
                            <div className="overflow-hidden rounded-2xl border border-black/[0.06] dark:border-white/[0.08]">
                                <div className="flex items-center gap-1 border-b border-black/[0.06] px-2 py-1 text-[12px] font-bold text-gray-500 dark:border-white/[0.06]">
                                    <SelectBox checked={allShownSelected} onChange={(on) => setSelected(on ? new Set(shown.map(x => x.r.id)) : new Set())} label="Select all" />
                                    <span>{allShownSelected ? 'All selected' : 'Select all'}</span>
                                </div>
                                <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                                    {shown.map(({ r, who, status: st }) => (
                                        <li key={r.id} className={cn('relative flex items-center gap-1 px-2 py-2 transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.02]', selected.has(r.id) && 'bg-black/[0.025] dark:bg-white/[0.04]')}>
                                            <SelectBox checked={selected.has(r.id)} onChange={(on) => toggle(r.id, on)} label={`Select ${who.name || 'response'}`} />
                                            <button type="button" onClick={() => setDetailId(r.id)} className="flex min-w-0 flex-1 items-center gap-3 py-1 text-left">
                                                <Avatar name={who.name || who.email || '?'} size={38} />
                                                <span className="min-w-0 flex-1">
                                                    <span className="flex flex-wrap items-center gap-1.5">
                                                        <span className="truncate text-[14px] font-bold">{who.name || who.email || 'Anonymous'}</span>
                                                        {volunteer && <Badge tone={VOLUNTEER_STATUS[st].tone}>{VOLUNTEER_STATUS[st].label}</Badge>}
                                                    </span>
                                                    <span className="block truncate text-[12px] text-gray-500">{[who.email, who.phone].filter(Boolean).join(' · ') || 'No contact details'}</span>
                                                </span>
                                                <span className="hidden shrink-0 text-[12px] text-gray-500 sm:block">{timeAgo(r.submittedAt)}</span>
                                                <ChevronRight size={16} className="shrink-0 text-gray-400" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <WhatsAppSendSheet open={Boolean(waPeople)} onClose={() => setWaPeople(null)} people={waPeople || []} />
                        {selected.size > 0 && (
                            <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
                                {volunteer && (
                                    <>
                                        <Button size="sm" variant="secondary" disabled={busy} onClick={() => setStatusFor([...selected], 'shortlisted')}>Shortlist</Button>
                                        <Button size="sm" variant="success" disabled={busy} onClick={() => setStatusFor([...selected], 'confirmed')}>Confirm</Button>
                                        <Button size="sm" variant="secondary" disabled={busy} onClick={() => setStatusFor([...selected], 'waitlist')}>Waitlist</Button>
                                        <Button size="sm" variant="secondary" disabled={busy} onClick={() => setStatusFor([...selected], 'rejected')}>Decline</Button>
                                    </>
                                )}
                                <Button size="sm" variant="secondary" disabled={busy} onClick={() => setWaPeople(rows.filter(x => selected.has(x.r.id)).map(x => ({ name: x.who.name, phone: x.who.phone })))}><MessageCircle size={13} /> WhatsApp</Button>
                                <Button size="sm" variant="danger" disabled={busy} onClick={() => remove([...selected])}><Trash2 size={13} /> Delete</Button>
                            </BulkBar>
                        )}
                    </>
                )}
            </Sheet>

            <Sheet
                open={Boolean(detail)}
                onClose={() => setDetailId(null)}
                size="lg"
                zIndex={350}
                header={detail && (
                    <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={detail.who.name || detail.who.email || '?'} size={44} />
                        <div className="min-w-0">
                            <h2 className="truncate text-lg font-extrabold tracking-tight">{detail.who.name || detail.who.email || 'Anonymous'}</h2>
                            <p className="text-[13px] text-gray-500">Sent {formatDateTime(detail.r.submittedAt)}</p>
                        </div>
                    </div>
                )}
                footer={detail && (
                    <div className="flex gap-2">
                        <Button variant="secondary" className="h-12" onClick={() => remove([detail.r.id])} disabled={busy} aria-label="Delete response"><Trash2 size={15} /></Button>
                        {volunteer ? (
                            detail.status === 'confirmed'
                                ? <Button variant="secondary" className="h-12 flex-1" disabled={busy} onClick={() => setStatusFor([detail.r.id], 'shortlisted')}>Move back to shortlist</Button>
                                : <Button variant="success" className="h-12 flex-1" disabled={busy} onClick={() => setStatusFor([detail.r.id], 'confirmed')}><UserCheck size={15} /> Confirm for the crew</Button>
                        ) : (
                            <Button variant="secondary" className="h-12 flex-1" onClick={() => setDetailId(null)}>Done</Button>
                        )}
                    </div>
                )}
                bodyClassName="space-y-4"
            >
                {detail && (
                    <>
                        {volunteer && (
                            <SheetSection title="Status">
                                <div className="flex flex-wrap gap-2">
                                    {STATUS_ORDER.map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            disabled={busy}
                                            onClick={() => setStatusFor([detail.r.id], s)}
                                            aria-pressed={detail.status === s}
                                            className={cn('h-10 rounded-xl border px-3.5 text-[13px] font-semibold transition-colors',
                                                detail.status === s ? 'border-transparent bg-gray-900 text-white dark:bg-white dark:text-black' : 'border-black/10 hover:border-black/25 dark:border-white/10 dark:hover:border-white/25')}
                                        >
                                            {VOLUNTEER_STATUS[s].label}
                                        </button>
                                    ))}
                                </div>
                                {detail.r.statusUpdatedAt && <p className="mt-2 text-[12px] text-gray-500">Changed {timeAgo(detail.r.statusUpdatedAt)}{detail.r.statusUpdatedBy ? ` by ${detail.r.statusUpdatedBy}` : ''}</p>}
                            </SheetSection>
                        )}

                        {(detail.who.email || detail.who.phone) && (
                            <div className="flex flex-wrap gap-2">
                                {detail.who.email && <Button as="a" href={`mailto:${detail.who.email}`} variant="secondary" className="h-11"><Mail size={14} /> Email</Button>}
                                {detail.who.phone && <Button as="a" href={`https://wa.me/${waNumber(detail.who.phone)}`} target="_blank" rel="noopener noreferrer" variant="secondary" className="h-11"><MessageCircle size={14} /> WhatsApp</Button>}
                                {detail.who.phone && <Button as="a" href={`tel:${digits(detail.who.phone)}`} variant="secondary" className="h-11"><Phone size={14} /> Call</Button>}
                            </div>
                        )}

                        <SheetSection title="Answers">
                            <div className="space-y-4">
                                {fields.map(f => (
                                    <InfoRow key={f.id} label={<>{f.label || 'Question'}{f.removed && <span className="ml-1.5 font-medium text-gray-400">(removed question)</span>}</>}>
                                        <AnswerValue field={f} value={detail.r.answers?.[f.id]} />
                                    </InfoRow>
                                ))}
                            </div>
                        </SheetSection>

                        <SheetSection title="Details">
                            <div className="grid grid-cols-2 gap-4">
                                <InfoRow label="Sent">{formatDateTime(detail.r.submittedAt)}</InfoRow>
                                <InfoRow label="Account">{detail.r.userId ? 'Signed in' : 'Guest'}</InfoRow>
                            </div>
                        </SheetSection>
                    </>
                )}
            </Sheet>
            {confirmEl}
        </>
    );
};

export default ResponsesSheet;
