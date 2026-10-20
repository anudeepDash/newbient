import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Send from 'lucide-react/dist/esm/icons/send';
import ImagePlus from 'lucide-react/dist/esm/icons/image-plus';
import Ticket from 'lucide-react/dist/esm/icons/ticket';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import CircleCheck from 'lucide-react/dist/esm/icons/circle-check';
import Users from 'lucide-react/dist/esm/icons/users';
import { Button, TextInput } from '../../../../components/app';
import { cn } from '../../../../lib/utils';
import { isOnShortlist } from '../../../../lib/outreach/status';
import { isPresent } from '../../../../lib/present';
import useDynamicMeta from '../../../../hooks/useDynamicMeta';
import { PageBody } from '../../../pages/PageHeader';
import { PanelLabel } from '../../../pages/DetailLayout';
import { Notice, ToneChip } from '../../ui';
import { callCreatorApi, uploadProof } from '../../api';
import { validateSubmission, DELIVERABLE_STATUS, normalizeUpi } from '../../../../lib/outreach/deliverables';
import { formatDeadline } from '../../../../lib/outreach/template';
import { useT } from '../../../../i18n';

/*
 * /d/:token: a creator's own page for a campaign. The token is their personal
 * signed link (in their Newbi notifications, and on WhatsApp once the API is
 * set up); the page itself needs no sign-in. It has the WhatsApp groups to
 * join with an "I've joined" button (WhatsApp never tells us who's in a
 * group), each deliverable to send (a post link, or a story screenshot), what
 * to change, a UPI ID for payment, and their ticket once it's released.
 */

const GroupCard = ({ token, which, title, hint, group, onDone }) => {
    const t = useT();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const joined = async () => {
        setBusy(true);
        const r = await callCreatorApi('outreach-joined', { token, which });
        setBusy(false);
        if (!r.ok) { setError(r.error); return; }
        onDone();
    };
    return (
        <section className="space-y-3 rounded-[1.5rem] bg-white p-4 ring-1 ring-inset ring-black/[0.06] dark:bg-[#0c0e14] dark:ring-white/[0.08]">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[16px] font-bold"><Users size={17} /> {title}</p>
                    <p className="text-[13px] text-gray-500 dark:text-zinc-400">{hint}</p>
                </div>
                {group.joined && <ToneChip tone="green" className="shrink-0 whitespace-nowrap">{t('Joined')}</ToneChip>}
            </div>
            {!group.joined && (
                <div className="flex flex-col gap-2 sm:flex-row">
                    <Button href={group.url} target="_blank" rel="noopener noreferrer" className="w-full sm:flex-1">{t('Join on WhatsApp')}</Button>
                    <Button variant="secondary" loading={busy} onClick={joined} className="w-full sm:flex-1">{t('I’ve joined')}</Button>
                </div>
            )}
            {error && <Notice tone="error" title={error} />}
        </section>
    );
};

const TaskForm = ({ token, task, onDone }) => {
    const t = useT();
    const [link, setLink] = useState(task.link || '');
    const [shot, setShot] = useState(task.screenshotUrl || '');
    const [note, setNote] = useState('');
    const [errors, setErrors] = useState({});
    const [uploading, setUploading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const wantsLink = task.proof !== 'screenshot';
    const wantsShot = task.proof !== 'link';

    const upload = async (file) => {
        if (!file) return;
        setUploading(true);
        setError('');
        try {
            setShot(await uploadProof(file));
        } catch {
            setError(t('The screenshot didn’t upload. Try again, or use a smaller image.'));
        } finally {
            setUploading(false);
        }
    };

    const submit = async (e) => {
        e.preventDefault();
        const local = validateSubmission(task, { link, screenshotUrl: shot, note });
        setErrors(Object.fromEntries(Object.entries(local.errors).map(([k, v]) => [k, t(v)])));
        if (!local.ok) return;
        setSending(true);
        const r = await callCreatorApi('outreach-submit', { token, taskId: task.id, link, screenshotUrl: shot, note });
        setSending(false);
        if (!r.ok) {
            if (r.errors) setErrors(r.errors);
            setError(r.error);
            return;
        }
        onDone();
    };

    return (
        <form onSubmit={submit} noValidate className="space-y-3 pt-2">
            {wantsLink && (
                <TextInput
                    label={task.proof === 'either' ? t('Post link (or add a screenshot)') : t('Link to your post')}
                    type="url"
                    inputMode="url"
                    autoCapitalize="none"
                    placeholder="https://www.instagram.com/reel/…"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    error={errors.link}
                />
            )}
            {wantsShot && (
                <div className="space-y-1.5">
                    <span className="block px-1 text-[13px] font-bold text-gray-700 dark:text-zinc-300">{task.proof === 'screenshot' ? t('Screenshot of your story') : t('Screenshot (optional)')}</span>
                    {shot ? (
                        <div className="flex items-center gap-3">
                            <img src={shot} alt={t('Your screenshot')} className="h-24 w-16 rounded-xl object-cover ring-1 ring-black/10" />
                            <button type="button" onClick={() => setShot('')} className="h-11 text-[14px] font-bold text-gray-600 underline dark:text-zinc-300">{t('Change')}</button>
                        </div>
                    ) : (
                        <label className={cn('flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed px-4 text-[15px] font-semibold', errors.screenshotUrl ? 'border-red-500/60 text-red-600' : 'border-black/15 text-gray-700 dark:border-white/15 dark:text-zinc-300')}>
                            <ImagePlus size={18} /> {uploading ? t('Uploading…') : t('Add screenshot')}
                            <input type="file" accept="image/*" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} disabled={uploading} />
                        </label>
                    )}
                    {errors.screenshotUrl && <span className="block px-1 text-[13px] font-medium text-red-600 dark:text-red-400">{errors.screenshotUrl}</span>}
                </div>
            )}
            <TextInput label={t('Anything we should know? (optional)')} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
            {error && <Notice tone="error" title={error} />}
            <Button type="submit" icon={Send} loading={sending} disabled={uploading} className="w-full">{t('Send for review')}</Button>
        </form>
    );
};

const TaskCard = ({ token, task, onDone }) => {
    const t = useT();
    const meta = DELIVERABLE_STATUS[task.status] || DELIVERABLE_STATUS.not_started;
    const [editing, setEditing] = useState(false);
    const open = task.status === 'not_started' || task.status === 'rejected' || editing;
    return (
        <section className="space-y-2 rounded-[1.5rem] bg-white p-4 ring-1 ring-inset ring-black/[0.06] dark:bg-[#0c0e14] dark:ring-white/[0.08]">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[16px] font-bold">{task.title}</p>
                    <p className="text-[13px] text-gray-500 dark:text-zinc-400">
                        {[task.required ? t('Required') : t('Optional'), task.deadline && t('due {date}', { date: formatDeadline(String(task.deadline).slice(0, 10)) })].filter(Boolean).join(' · ')}
                    </p>
                </div>
                <ToneChip tone={meta.tone === 'rose' ? 'red' : meta.tone} className="shrink-0 whitespace-nowrap">{t(meta.label)}</ToneChip>
            </div>
            {isPresent(task.description) && <p className="text-[14px] text-gray-600 dark:text-zinc-400">{task.description}</p>}
            {task.status === 'rejected' && task.reason && <Notice tone="warn" title={t('What to change')}>{task.reason}</Notice>}
            {task.status === 'submitted' && !editing && (
                <p className="text-[14px] text-gray-600 dark:text-zinc-400">
                    {t('Sent. We’ll check it soon.')} <button type="button" className="font-bold underline" onClick={() => setEditing(true)}>{t('Send a different one')}</button>
                </p>
            )}
            {task.status === 'approved' && <p className="flex items-center gap-1.5 text-[14px] font-semibold text-emerald-700 dark:text-neon-green"><CircleCheck size={16} /> {t('Approved. Thank you!')}</p>}
            {/* The team opens posts one at a time: until then there's nothing to send. */}
            {task.open === false && task.status === 'not_started' && (
                <p className="text-[14px] text-gray-500 dark:text-zinc-400">{t('Not open yet. We’ll tell you when to post this one.')}</p>
            )}
            {open && task.status !== 'approved' && task.open !== false && <TaskForm token={token} task={task} onDone={() => { setEditing(false); onDone(); }} />}
        </section>
    );
};

const UpiCard = ({ token, saved, onSaved }) => {
    const t = useT();
    const [upi, setUpi] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(!saved);
    const save = async (e) => {
        e.preventDefault();
        if (!normalizeUpi(upi)) { setError(t('Enter your UPI ID, like name@okaxis.')); return; }
        setSaving(true);
        const r = await callCreatorApi('outreach-upi', { token, upiId: upi, upiName: name });
        setSaving(false);
        if (!r.ok) { setError(r.error); return; }
        setEditing(false);
        onSaved();
    };
    return (
        <section className="space-y-2 rounded-[1.5rem] bg-white p-4 ring-1 ring-inset ring-black/[0.06] dark:bg-[#0c0e14] dark:ring-white/[0.08]">
            <p className="flex items-center gap-2 text-[16px] font-bold"><Wallet size={17} /> {t('Where to pay you')}</p>
            {!editing ? (
                <p className="text-[14px] text-gray-600 dark:text-zinc-400">{t('UPI')} {saved}. <button type="button" className="font-bold underline" onClick={() => setEditing(true)}>{t('Change')}</button></p>
            ) : (
                <form onSubmit={save} noValidate className="space-y-3">
                    <TextInput label={t('UPI ID')} autoCapitalize="none" placeholder="name@okaxis" value={upi} onChange={(e) => { setUpi(e.target.value); setError(''); }} error={error} />
                    <TextInput label={t('Name on the UPI account (optional)')} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
                    <Button type="submit" variant="secondary" loading={saving} className="w-full">{t('Save UPI ID')}</Button>
                    <p className="text-[12px] text-gray-500 dark:text-zinc-500">{t('Only the Newbi team sees this. We never ask for bank passwords or OTPs.')}</p>
                </form>
            )}
        </section>
    );
};

const DeliverablesPage = () => {
    const t = useT();
    const { token } = useParams();
    const [state, setState] = useState({ loading: true, data: null, error: '' });
    const load = useCallback(async () => {
        const r = await callCreatorApi('outreach-deliverables', { token });
        setState({ loading: false, data: r.ok ? r.data : null, error: r.ok ? '' : r.error });
    }, [token]);
    useEffect(() => { load(); }, [load]);
    const d = state.data;
    useDynamicMeta({ page: 'campaign-deliverables', title: d ? t('Your campaign: {title}', { title: d.campaign.title }) : t('Your campaign') });

    if (state.loading) {
        return <PageBody><div className="mx-auto max-w-xl space-y-3"><div className="h-10 w-2/3 animate-pulse rounded-full bg-black/[0.06] dark:bg-white/[0.06]" /><div className="h-64 animate-pulse rounded-[2rem] bg-black/[0.04] dark:bg-white/[0.04]" /></div></PageBody>;
    }
    if (!d) {
        return (
            <PageBody>
                <div className="mx-auto max-w-md space-y-3 rounded-3xl border border-dashed border-black/[0.1] px-6 py-10 text-center dark:border-white/[0.1]">
                    <p className="text-[17px] font-bold">{t('This link isn’t active')}</p>
                    <p className="text-[15px] text-gray-600 dark:text-zinc-400">{state.error || t('Ask the Newbi team on WhatsApp for a new one.')}</p>
                </div>
            </PageBody>
        );
    }
    const done = d.tasks.filter(tk => tk.required).every(tk => tk.status === 'approved');
    return (
        <PageBody>
            <div className="mx-auto max-w-xl space-y-4">
                <header className="space-y-2">
                    <PanelLabel>{t('Your campaign')}</PanelLabel>
                    <h1 className="font-heading text-[28px] font-extrabold leading-[1.05] tracking-[-0.03em]">{d.firstName ? t('Hey {name}!', { name: d.firstName }) : t('Hey!')} {d.campaign.title}</h1>
                    <p className="text-[15px] text-gray-600 dark:text-zinc-400">
                        {d.instagramHandle ? t('Send each post here once it’s live on @{handle}.', { handle: d.instagramHandle }) : t('Send each post here once it’s live.')}{d.campaign.postingDeadline ? ` ${t('Please post by {date}.', { date: formatDeadline(d.campaign.postingDeadline) })}` : ''}
                    </p>
                </header>
                {d.ticket && (
                    <Button href={d.ticket.url} icon={Ticket} className="w-full">{t('Open my ticket')}</Button>
                )}
                {d.groups?.campaign && (
                    <GroupCard token={token} which="campaign" title={t('Campaign group')} hint={t('The brief, passes and updates for this campaign.')} group={d.groups.campaign} onDone={load} />
                )}
                {d.groups?.city && (
                    <GroupCard token={token} which="city" title={d.groups.city.title} hint={t('Gigs, guestlists and meetups in {city}.', { city: d.groups.city.city })} group={d.groups.city} onDone={load} />
                )}
                {done && <Notice tone="success" title={t('All your required posts are approved.')}>{d.payout ? t('We’ve paid ₹{amount}.', { amount: Number(d.payout.amount).toLocaleString('en-IN') }) : t('We’ll process your payout next.')}</Notice>}
                {d.tasks.length === 0 && d.status !== 'applied' && <Notice tone="info" title={t('Nothing to send yet.')}>{t('The Newbi team will share what to post in the group.')}</Notice>}
                {d.status === 'applied' && <Notice tone="info" title={t('You’ve applied.')}>{t('If you’re shortlisted, you’ll get a notification in the Newbi app and this page will show the campaign group.')}</Notice>}
                {/* Posts are sent only once they're shortlisted. */}
                {isOnShortlist(d.status) && d.tasks.map(tk => <TaskCard key={tk.id} token={token} task={tk} onDone={load} />)}
                <UpiCard token={token} saved={d.upi} onSaved={load} />
            </div>
        </PageBody>
    );
};

export default DeliverablesPage;
