import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Check from 'lucide-react/dist/esm/icons/check';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import SkipForward from 'lucide-react/dist/esm/icons/skip-forward';
import Square from 'lucide-react/dist/esm/icons/square';
import Undo2 from 'lucide-react/dist/esm/icons/undo-2';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import Zap from 'lucide-react/dist/esm/icons/zap';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import Users from 'lucide-react/dist/esm/icons/users';
import Repeat from 'lucide-react/dist/esm/icons/repeat';
import { useStore } from '../../lib/store';
import { PREDEFINED_CITIES, DEFAULT_CREATOR_GROUPS } from '../../lib/constants';
import { queueCreatorGroupsBroadcast } from '../../lib/creatorGroupsMail';
import { cn } from '../../lib/utils';
import Sheet from './Sheet';
import { Button, Badge, SearchInput, Select, SegmentedTabs, Avatar, Menu, MenuItem, EmptyState } from './ui';

/*
 * Group invites, mostly on autopilot:
 *  - every creator gets the group for their own city (no more one link for all);
 *  - the people who need an invite (never sent, or sent days ago and still not
 *    in) are picked automatically;
 *  - each person goes out on the best channel: WhatsApp when they have a phone,
 *    email when they don't;
 *  - the WhatsApp queue opens one chat at a time and moves on by itself as soon
 *    as you come back from WhatsApp, so it's one tap per creator.
 * Browsers only allow one chat window per tap, which is why WhatsApp can't be
 * fully hands-free; email goes out in the background.
 */

const FOLLOW_UP_DAYS = 3;
const TEMPLATE_KEY = 'nb_group_invite_template';
const FOLLOW_UP_KEY = 'nb_group_followup_template';

const DEFAULT_INVITE = `Hey {name}! 👋 Here's your invite to the Newbi {city} Creator community on WhatsApp:

👉 {groupLink}

It's where we share paid brand gigs, guestlist passes and meetups in {city}. See you inside!`;

const DEFAULT_FOLLOW_UP = `Hey {name}, just checking you saw this 🙂 The Newbi {city} Creator group is where all the gigs and guestlists drop first:

👉 {groupLink}`;

export const normalizeCity = (cityStr = '') => {
    const raw = String(cityStr || '').trim().toLowerCase();
    if (!raw) return '';
    if (/^bang[al]*o?re$/i.test(raw) || raw.includes('bengaluru') || raw.includes('bangalore')) return 'Bengaluru';
    if (raw.includes('hyderabad')) return 'Hyderabad';
    if (raw.includes('chandigarh')) return 'Chandigarh';
    if (raw.includes('mumbai')) return 'Mumbai';
    if (raw.includes('pune')) return 'Pune';
    if (raw.includes('kolkata') || raw.includes('calcutta')) return 'Kolkata';
    if (raw.includes('kochi') || raw.includes('cochin')) return 'Kochi';
    if (raw.includes('delhi') || raw.includes('gurgaon') || raw.includes('gurugram') || raw.includes('noida')) return 'Delhi NCR';
    if (raw.includes('chennai') || raw.includes('madras')) return 'Chennai';
    if (raw.includes('jaipur')) return 'Jaipur';
    if (raw.includes('goa')) return 'Goa';
    if (raw.includes('ahmedabad')) return 'Ahmedabad';
    if (raw.includes('bhubaneswar') || raw.includes('bhubaneshwar') || raw.includes('cuttack') || raw.includes('odisha')) return 'Bhubaneswar & Cuttack';
    if (raw.includes('vizag') || raw.includes('visakhapatnam')) return 'Vizag';
    if (raw.includes('surat')) return 'Surat';
    return raw.replace(/\b\w/g, ch => ch.toUpperCase());
};

const waNumber = (raw) => {
    const digits = String(raw || '').replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    if (digits.length >= 11 && digits.length <= 15) return digits.replace(/^0+/, '');
    return '';
};
const prettyPhone = (n) => (n ? `+${n.slice(0, n.length - 10)} ${n.slice(-10, -5)} ${n.slice(-5)}` : '');

const idOf = (c) => c.id || c.uid;
const firstName = (c) => String(c?.name || c?.displayName || 'there').trim().split(/\s+/)[0];
const daysSince = (iso) => {
    const t = iso ? new Date(iso).getTime() : NaN;
    return Number.isFinite(t) ? Math.floor((Date.now() - t) / 86400000) : null;
};
const ago = (days) => (days === null ? '' : days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`);

const readStored = (key, fallback) => {
    try { return window.localStorage.getItem(key) || fallback; } catch { return fallback; }
};
const writeStored = (key, value) => {
    try { window.localStorage.setItem(key, value); } catch { /* private mode */ }
};

const STAGE = {
    ready: { label: 'To invite', tone: 'amber' },
    follow_up: { label: 'Follow up', tone: 'violet' },
    sent: { label: 'Invited', tone: 'blue' },
    joined: { label: 'In group', tone: 'green' },
    blocked: { label: "Can't invite", tone: 'gray' },
};

const fill = (template, creator, group) => template
    .replace(/{name}/g, firstName(creator))
    .replace(/{city}/g, group?.city || normalizeCity(creator.city) || 'your city')
    .replace(/{groupLink}/g, group?.groupUrl || '');

const AddCityCreatorsModal = ({ isOpen = true, onClose, initialCity = 'Bengaluru', preselectedUids = null }) => {
    const creators = useStore(s => s.creators);
    const creatorGroups = useStore(s => s.creatorGroups);
    const addToast = useStore(s => s.addToast);

    const fromSelection = Boolean(preselectedUids?.length);
    const [city, setCity] = useState(() => (fromSelection ? 'all' : normalizeCity(initialCity) || 'all'));
    const [stage, setStage] = useState('todo');
    const [search, setSearch] = useState('');
    const [verifiedOnly, setVerifiedOnly] = useState(!fromSelection);
    const [channel, setChannel] = useState('auto'); // auto | whatsapp | email
    const [picked, setPicked] = useState(null); // null = automatic selection
    const [showMessage, setShowMessage] = useState(false);
    const [template, setTemplate] = useState(() => readStored(TEMPLATE_KEY, DEFAULT_INVITE));
    const [followUp, setFollowUp] = useState(() => readStored(FOLLOW_UP_KEY, DEFAULT_FOLLOW_UP));
    const [run, setRun] = useState(null); // { queue: [...ids], index, emailed, emailTotal, emailing, done }
    const [busy, setBusy] = useState(false);
    const awaitingReturn = useRef(false);

    useEffect(() => writeStored(TEMPLATE_KEY, template), [template]);
    useEffect(() => writeStored(FOLLOW_UP_KEY, followUp), [followUp]);

    // City → group. Saved groups win; the official defaults fill any gaps.
    const groupFor = useMemo(() => {
        const map = new Map();
        (creatorGroups || []).filter(g => g.isActive !== false && g.groupUrl).forEach(g => {
            const key = normalizeCity(g.city);
            if (key && !map.has(key)) map.set(key, g);
        });
        DEFAULT_CREATOR_GROUPS.forEach(g => {
            const key = normalizeCity(g.city);
            if (!map.has(key)) map.set(key, g);
        });
        return map;
    }, [creatorGroups]);

    const people = useMemo(() => {
        const only = fromSelection ? new Set(preselectedUids) : null;
        return (creators || [])
            .filter(c => !only || only.has(c.id) || only.has(c.uid))
            .map(c => {
                const cityName = normalizeCity(c.city);
                const group = groupFor.get(cityName) || null;
                const phone = waNumber(c.whatsapp || c.phone || c.mobile);
                const email = String(c.email || '').includes('@') ? String(c.email).trim().toLowerCase() : '';
                const sentDays = c.inviteLinkSent ? daysSince(c.inviteLinkSentAt) : null;
                let st;
                if (c.hasJoinedCityGroup) st = 'joined';
                else if (!group || (!phone && !email)) st = 'blocked';
                else if (c.inviteLinkSent) st = sentDays === null || sentDays >= FOLLOW_UP_DAYS ? 'follow_up' : 'sent';
                else st = 'ready';
                return {
                    c, id: idOf(c), cityName, group, phone, email, sentDays, stage: st,
                    verified: c.profileStatus === 'approved',
                    blockedWhy: !group ? `No group for ${cityName || 'their city'}` : (!phone && !email ? 'No phone or email' : ''),
                };
            });
    }, [creators, preselectedUids, fromSelection, groupFor]);

    const inScope = useMemo(() => people.filter(p =>
        (city === 'all' || p.cityName === city) && (!verifiedOnly || p.verified)
    ), [people, city, verifiedOnly]);

    const counts = useMemo(() => {
        const out = { todo: 0, ready: 0, follow_up: 0, sent: 0, joined: 0, blocked: 0, all: inScope.length };
        inScope.forEach(p => { out[p.stage] += 1; if (p.stage === 'ready' || p.stage === 'follow_up') out.todo += 1; });
        return out;
    }, [inScope]);

    const listed = useMemo(() => {
        const q = search.trim().toLowerCase();
        return inScope
            .filter(p => stage === 'all' || (stage === 'todo' ? (p.stage === 'ready' || p.stage === 'follow_up') : p.stage === stage))
            .filter(p => !q || [p.c.name, p.c.email, p.c.phone, p.c.instagram, p.cityName].some(v => String(v || '').toLowerCase().includes(q)))
            .sort((a, b) => (a.cityName || '').localeCompare(b.cityName || '') || String(a.c.name || '').localeCompare(String(b.c.name || '')));
    }, [inScope, stage, search]);

    // Automatic selection: everyone who still needs an invite.
    const selected = useMemo(() => {
        if (picked) return picked;
        return new Set(inScope.filter(p => p.stage === 'ready' || p.stage === 'follow_up').map(p => p.id));
    }, [picked, inScope]);

    const toggle = (id) => {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id); else next.add(id);
        setPicked(next);
    };
    const allListedSelected = listed.length > 0 && listed.every(p => selected.has(p.id));
    const toggleAll = () => {
        const next = new Set(selected);
        listed.forEach(p => (allListedSelected ? next.delete(p.id) : next.add(p.id)));
        setPicked(next);
    };

    // Who goes where, for the current selection.
    const plan = useMemo(() => {
        const chosen = inScope.filter(p => selected.has(p.id) && p.stage !== 'joined' && p.stage !== 'blocked');
        const wa = [];
        const mail = [];
        chosen.forEach(p => {
            if (channel === 'whatsapp') { if (p.phone) wa.push(p); }
            else if (channel === 'email') { if (p.email) mail.push(p); }
            else if (p.phone) wa.push(p);
            else if (p.email) mail.push(p);
        });
        const skipped = chosen.length - wa.length - mail.length;
        const noGroupCities = [...new Set(inScope.filter(p => !p.group && p.stage !== 'joined').map(p => p.cityName).filter(Boolean))];
        return { wa, mail, skipped, noGroupCities, chosen };
    }, [inScope, selected, channel]);

    const messageFor = useCallback((p) => fill(p.stage === 'follow_up' ? followUp : template, p.c, p.group), [template, followUp]);

    const openWhatsApp = useCallback((p) => {
        const text = messageFor(p).replace(/\r?\n/g, '\r\n');
        // api.whatsapp.com keeps emoji intact where wa.me sometimes mangles them.
        window.open(`https://api.whatsapp.com/send?phone=${p.phone}&text=${encodeURIComponent(text)}`, '_blank', 'noopener');
        useStore.getState().markCreatorInviteSent(p.id, 'whatsapp');
    }, [messageFor]);

    // ---------- Running the invites ----------
    const queuePeople = useMemo(() => {
        if (!run) return [];
        const byId = new Map(people.map(p => [p.id, p]));
        return run.queue.map(id => byId.get(id)).filter(Boolean);
    }, [run, people]);
    const current = run && !run.done ? queuePeople[run.index] : null;

    const advance = useCallback(() => {
        setRun(r => {
            if (!r) return r;
            const index = r.index + 1;
            return index >= r.queue.length ? { ...r, index, done: !r.emailing } : { ...r, index };
        });
    }, []);

    // Back from WhatsApp → next creator is ready.
    useEffect(() => {
        if (!run || run.done) return undefined;
        const back = () => {
            if (document.visibilityState === 'visible' && awaitingReturn.current) {
                awaitingReturn.current = false;
                setTimeout(advance, 250);
            }
        };
        document.addEventListener('visibilitychange', back);
        window.addEventListener('focus', back);
        return () => {
            document.removeEventListener('visibilitychange', back);
            window.removeEventListener('focus', back);
        };
    }, [run, advance]);

    const sendCurrent = () => {
        if (!current) return;
        awaitingReturn.current = true;
        openWhatsApp(current);
    };

    // Keyboard: Enter sends, S skips.
    useEffect(() => {
        if (!current) return undefined;
        const onKey = (e) => {
            if (e.target?.tagName === 'TEXTAREA' || e.target?.tagName === 'INPUT') return;
            if (e.key === 'Enter') { e.preventDefault(); sendCurrent(); }
            if (e.key.toLowerCase() === 's') { e.preventDefault(); awaitingReturn.current = false; advance(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    const sendEmails = async (list) => {
        // One email per group, so everyone gets their own city's link.
        const byGroup = new Map();
        list.forEach(p => {
            const key = p.group.groupUrl;
            if (!byGroup.has(key)) byGroup.set(key, { group: p.group, people: [] });
            byGroup.get(key).people.push(p);
        });
        let sent = 0;
        let failed = 0;
        for (const { group, people: batch } of byGroup.values()) {
            try {
                const result = await queueCreatorGroupsBroadcast(
                    batch.map(p => ({ email: p.email, name: p.c.name || 'Creator', city: group.city })),
                    {
                        city: group.city,
                        groupUrl: group.groupUrl,
                        customSubject: `Your invite to the Newbi ${group.city} Creator group`,
                        customMessage: `You're invited to the Newbi ${group.city} Creator community on WhatsApp, where we share paid brand gigs, guestlist passes and meetups first.`,
                        availableGroups: [group],
                    }
                );
                if (result?.success || result?.sentCount > 0) {
                    await useStore.getState().bulkMarkCreatorInvitesSent(batch.map(p => p.id), 'email');
                    sent += result?.sentCount || batch.length;
                } else failed += batch.length;
            } catch {
                failed += batch.length;
            }
            setRun(r => (r ? { ...r, emailed: sent, emailFailed: failed } : r));
        }
        return { sent, failed };
    };

    const start = async () => {
        if (!plan.wa.length && !plan.mail.length) {
            addToast('No one selected can be invited on that channel.', 'info');
            return;
        }
        if (plan.mail.length && !window.confirm(`Email the group invite to ${plan.mail.length} creator${plan.mail.length === 1 ? '' : 's'} now?`)) return;
        setRun({
            queue: plan.wa.map(p => p.id),
            index: 0,
            emailTotal: plan.mail.length,
            emailed: 0,
            emailFailed: 0,
            emailing: plan.mail.length > 0,
            done: plan.wa.length === 0 && plan.mail.length === 0,
        });
        if (plan.mail.length) {
            const { sent, failed } = await sendEmails(plan.mail);
            setRun(r => (r ? { ...r, emailing: false, done: r.index >= r.queue.length } : r));
            addToast(failed ? `Emailed ${sent}. ${failed} couldn't be sent.` : `Emailed ${sent} creator${sent === 1 ? '' : 's'}.`, failed ? 'warning' : 'success');
        }
    };

    const stop = () => { awaitingReturn.current = false; setRun(null); setPicked(null); };

    const markJoined = async (ids) => {
        if (!ids.length) return;
        setBusy(true);
        try {
            await useStore.getState().bulkAddCreatorsToCityGroup(city === 'all' ? '' : city, ids);
            addToast(`${ids.length} marked as in the group.`, 'success');
            setPicked(null);
        } catch {
            addToast("Couldn't update them. Please try again.", 'error');
        } finally {
            setBusy(false);
        }
    };

    const undoSent = async (p) => {
        try {
            await useStore.getState().updateCreator(p.id, { inviteLinkSent: false, inviteLinkSentAt: null, inviteLinkChannel: null });
            addToast(`${firstName(p.c)} is back on the to-invite list.`, 'info');
        } catch {
            addToast("Couldn't undo that. Please try again.", 'error');
        }
    };
    const undoJoined = async (p) => {
        try {
            await useStore.getState().updateCreator(p.id, { hasJoinedCityGroup: false, joinedCityGroupAt: null });
            addToast(`${firstName(p.c)} is no longer marked as in the group.`, 'info');
        } catch {
            addToast("Couldn't update that. Please try again.", 'error');
        }
    };

    const cities = useMemo(() => {
        const set = new Set(PREDEFINED_CITIES.filter(c => c !== 'Others' && c !== 'Pan-India / Remote').map(normalizeCity));
        people.forEach(p => p.cityName && set.add(p.cityName));
        return [...set].sort();
    }, [people]);

    const selectedJoinable = inScope.filter(p => selected.has(p.id) && p.stage !== 'joined').map(p => p.id);
    const previewPerson = plan.wa[0] || plan.mail[0] || inScope.find(p => p.group) || null;

    // ---------- Run view ----------
    const runView = run && (
        <div className="space-y-4">
            {run.emailTotal > 0 && (
                <div className="flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-black/[0.02] p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neon-blue/10 text-sky-600 dark:text-neon-blue"><Mail size={18} /></div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold">{run.emailing ? 'Sending emails…' : 'Emails sent'}</p>
                        <p className="text-[12px] text-gray-500">{run.emailed} of {run.emailTotal}{run.emailFailed ? ` · ${run.emailFailed} failed` : ''}</p>
                    </div>
                    {run.emailing ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" /> : <CheckCircle2 size={18} className="text-emerald-500" />}
                </div>
            )}

            {run.queue.length > 0 && (
                <div className="rounded-2xl border border-black/[0.06] p-4 dark:border-white/[0.06]">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-[13px] font-bold">WhatsApp queue</p>
                        <p className="text-[12px] font-semibold text-gray-500">{Math.min(run.index, run.queue.length)} of {run.queue.length} done</p>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                        <div className="h-full rounded-full bg-neon-green transition-all" style={{ width: `${(Math.min(run.index, run.queue.length) / run.queue.length) * 100}%` }} />
                    </div>

                    {current ? (
                        <div className="mt-4 space-y-3">
                            <div className="flex items-center gap-3">
                                <Avatar src={current.c.profileImage || current.c.photoURL} name={current.c.name} size={44} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[15px] font-bold">{current.c.name || 'Creator'}</p>
                                    <p className="truncate text-[12px] text-gray-500">{prettyPhone(current.phone)} · {current.group?.city}</p>
                                </div>
                                {current.stage === 'follow_up' && <Badge tone="violet">Follow-up</Badge>}
                            </div>
                            <p className="whitespace-pre-wrap rounded-xl bg-[#e7ffdb] p-3 text-[13px] leading-relaxed text-gray-900 dark:bg-emerald-950/40 dark:text-emerald-50">{messageFor(current)}</p>
                            <div className="flex gap-2">
                                <Button variant="primary" className="h-12 flex-1" onClick={sendCurrent}>
                                    <MessageCircle size={15} /> Open WhatsApp
                                </Button>
                                <Button variant="secondary" className="h-12" onClick={() => { awaitingReturn.current = false; advance(); }} aria-label="Skip">
                                    <SkipForward size={15} /> Skip
                                </Button>
                            </div>
                            <p className="text-[11px] text-gray-500">Send the message in WhatsApp, then come back here: the next creator loads by itself. On a computer, Enter opens the chat and S skips.</p>
                        </div>
                    ) : (
                        <div className="mt-4 flex items-center gap-2 text-[13px] font-semibold text-emerald-600 dark:text-neon-green">
                            <CheckCircle2 size={16} /> Queue finished.
                        </div>
                    )}
                </div>
            )}

            {run.done && (
                <div className="rounded-2xl border border-neon-green/30 bg-neon-green/[0.06] p-4">
                    <p className="text-[14px] font-bold">All done</p>
                    <p className="mt-1 text-[12px] text-gray-600 dark:text-zinc-400">
                        People who don't join within {FOLLOW_UP_DAYS} days show up under Follow up, with a shorter reminder message.
                        When you see someone in the WhatsApp group, mark them as in the group.
                    </p>
                </div>
            )}
        </div>
    );

    return (
        <Sheet
            open={isOpen}
            onClose={onClose}
            size="xl"
            title="Invite to WhatsApp groups"
            subtitle={fromSelection ? `${preselectedUids.length} selected creators · each gets their own city's group` : 'Each creator gets the group for their own city'}
            bodyClassName="space-y-4"
            footer={run ? (
                <div className="flex gap-2">
                    {!run.done && <Button variant="secondary" className="h-12" onClick={stop}><Square size={13} /> Stop</Button>}
                    <Button variant={run.done ? 'primary' : 'secondary'} className="h-12 flex-1" onClick={run.done ? stop : onClose}>
                        {run.done ? 'Back to list' : 'Close'}
                    </Button>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] font-semibold text-gray-600 dark:text-zinc-400">
                        <span className="inline-flex items-center gap-1.5"><MessageCircle size={13} className="text-emerald-500" /> {plan.wa.length} on WhatsApp</span>
                        <span className="inline-flex items-center gap-1.5"><Mail size={13} className="text-sky-500" /> {plan.mail.length} by email</span>
                        {plan.skipped > 0 && <span className="text-amber-600">{plan.skipped} skipped (no {channel === 'email' ? 'email' : 'phone'})</span>}
                    </div>
                    <div className="flex gap-2">
                        <Menu align="left" trigger={({ toggle: open }) => (
                            <Button variant="secondary" className="h-12" onClick={open} disabled={!selectedJoinable.length || busy}>
                                <MoreHorizontal size={15} /> <span className="hidden sm:inline">More</span>
                            </Button>
                        )}>
                            <MenuItem icon={Users} onClick={() => markJoined(selectedJoinable)} hint="For people you've already seen in the group">
                                Mark {selectedJoinable.length} as in group
                            </MenuItem>
                        </Menu>
                        <Button variant="primary" className="h-12 flex-1" onClick={start} disabled={!plan.wa.length && !plan.mail.length}>
                            <Zap size={15} /> Invite {plan.wa.length + plan.mail.length || ''}
                        </Button>
                    </div>
                </div>
            )}
        >
            {run ? runView : (
                <>
                    {/* Scope */}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                        <Select value={city} onChange={(v) => { setCity(v); setPicked(null); }} label="City" options={[
                            { value: 'all', label: fromSelection ? 'All their cities' : 'All cities' },
                            ...cities.map(c => ({ value: c, label: `${c}${groupFor.has(c) ? '' : ' · no group'}` })),
                        ]} />
                        <Select value={channel} onChange={setChannel} label="Channel" options={[
                            { value: 'auto', label: 'Best channel each' },
                            { value: 'whatsapp', label: 'WhatsApp only' },
                            { value: 'email', label: 'Email only' },
                        ]} />
                        <button
                            type="button"
                            onClick={() => { setVerifiedOnly(v => !v); setPicked(null); }}
                            className={cn('col-span-2 flex h-11 items-center justify-center gap-2 rounded-xl border px-3.5 text-xs font-bold transition-colors sm:col-span-1',
                                verifiedOnly ? 'border-neon-green/40 bg-neon-green/10 text-emerald-700 dark:text-neon-green' : 'border-black/10 text-gray-600 dark:border-white/10 dark:text-zinc-300')}
                        >
                            <span className={cn('flex h-4 w-4 items-center justify-center rounded border', verifiedOnly ? 'border-emerald-600 bg-emerald-600 text-white dark:border-neon-green dark:bg-neon-green dark:text-black' : 'border-gray-300')}>
                                {verifiedOnly && <Check size={11} strokeWidth={3} />}
                            </span>
                            Verified only
                        </button>
                    </div>

                    {plan.noGroupCities.length > 0 && (
                        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-3 text-[12px] text-amber-800 dark:text-amber-300">
                            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                            <p>No group yet for {plan.noGroupCities.slice(0, 4).join(', ')}{plan.noGroupCities.length > 4 ? ` and ${plan.noGroupCities.length - 4} more` : ''}. Creators there are skipped until you add one under Groups.</p>
                        </div>
                    )}

                    {/* Message */}
                    <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.06]">
                        <button type="button" onClick={() => setShowMessage(v => !v)} className="flex w-full items-center gap-3 p-4 text-left">
                            <MessageCircle size={16} className="shrink-0 text-emerald-500" />
                            <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-bold">Message</p>
                                <p className="truncate text-[12px] text-gray-500">{previewPerson ? fill(template, previewPerson.c, previewPerson.group).split('\n')[0] : 'Invite and follow-up messages'}</p>
                            </div>
                            <ChevronDown size={16} className={cn('shrink-0 text-gray-400 transition-transform', showMessage && 'rotate-180')} />
                        </button>
                        {showMessage && (
                            <div className="space-y-4 border-t border-black/[0.06] p-4 dark:border-white/[0.06]">
                                {[
                                    { label: 'First invite', value: template, set: setTemplate, def: DEFAULT_INVITE },
                                    { label: `Follow-up (after ${FOLLOW_UP_DAYS} days)`, value: followUp, set: setFollowUp, def: DEFAULT_FOLLOW_UP },
                                ].map(t => (
                                    <div key={t.label} className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[12px] font-bold text-gray-600 dark:text-zinc-300">{t.label}</span>
                                            {t.value !== t.def && <button type="button" onClick={() => t.set(t.def)} className="text-[11px] font-semibold text-gray-500 underline">Reset</button>}
                                        </div>
                                        <textarea
                                            value={t.value}
                                            onChange={(e) => t.set(e.target.value)}
                                            rows={5}
                                            className="w-full resize-y rounded-xl border border-black/10 bg-white p-3 text-[15px] leading-relaxed outline-none focus:border-neon-green/60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white sm:text-[13px]"
                                        />
                                    </div>
                                ))}
                                <p className="text-[11px] text-gray-500">{'{name}'} is the first name, {'{city}'} their city and {'{groupLink}'} that city's group. Saved on this device.</p>
                            </div>
                        )}
                    </div>

                    {/* People */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                            <SegmentedTabs value={stage} onChange={setStage} items={[
                                { value: 'todo', label: 'Needs invite', count: counts.todo, highlight: counts.todo > 0 },
                                { value: 'sent', label: 'Invited', count: counts.sent },
                                { value: 'joined', label: 'In group', count: counts.joined },
                                ...(counts.blocked ? [{ value: 'blocked', label: "Can't invite", count: counts.blocked }] : []),
                                { value: 'all', label: 'All', count: counts.all },
                            ]} />
                        </div>
                        <SearchInput value={search} onChange={setSearch} placeholder="Name, phone, city" className="sm:ml-auto sm:w-56" />
                    </div>

                    {listed.length === 0 ? (
                        <EmptyState
                            icon={stage === 'todo' ? CheckCircle2 : Users}
                            title={stage === 'todo' ? 'Everyone here is invited' : 'No one here'}
                            description={stage === 'todo' ? `Nobody in ${city === 'all' ? 'these cities' : city} needs an invite right now.` : 'Try another city or tab.'}
                        />
                    ) : (
                        <div className="overflow-hidden rounded-2xl border border-black/[0.06] dark:border-white/[0.06]">
                            <button type="button" onClick={toggleAll} className="flex w-full items-center gap-3 border-b border-black/[0.06] bg-black/[0.02] px-4 py-2.5 text-left dark:border-white/[0.06] dark:bg-white/[0.02]">
                                <span className={cn('flex h-5 w-5 items-center justify-center rounded-md border', allListedSelected ? 'border-emerald-600 bg-emerald-600 text-white dark:border-neon-green dark:bg-neon-green dark:text-black' : 'border-gray-300 dark:border-white/20')}>
                                    {allListedSelected && <Check size={12} strokeWidth={3} />}
                                </span>
                                <span className="flex-1 text-[12px] font-bold">Select all {listed.length}</span>
                                <span className="text-[11px] font-semibold text-gray-500">{selected.size} selected{picked ? '' : ' automatically'}</span>
                            </button>
                            <ul className="max-h-[48dvh] divide-y divide-black/[0.05] overflow-y-auto dark:divide-white/[0.05]">
                                {listed.map(p => {
                                    const isSel = selected.has(p.id);
                                    const cfg = STAGE[p.stage];
                                    const canWhatsApp = p.phone && p.group && p.stage !== 'joined';
                                    return (
                                        <li key={p.id} className={cn('flex items-center gap-3 px-4 py-3', isSel && 'bg-neon-green/[0.04]')}>
                                            <button type="button" onClick={() => toggle(p.id)} aria-label={isSel ? 'Unselect' : 'Select'} className="-m-2 p-2">
                                                <span className={cn('flex h-5 w-5 items-center justify-center rounded-md border', isSel ? 'border-emerald-600 bg-emerald-600 text-white dark:border-neon-green dark:bg-neon-green dark:text-black' : 'border-gray-300 dark:border-white/20')}>
                                                    {isSel && <Check size={12} strokeWidth={3} />}
                                                </span>
                                            </button>
                                            <Avatar src={p.c.profileImage || p.c.photoURL} name={p.c.name} size={36} />
                                            <button type="button" onClick={() => toggle(p.id)} className="min-w-0 flex-1 text-left">
                                                <p className="truncate text-[14px] font-bold">{p.c.name || 'Creator'}</p>
                                                <p className="truncate text-[12px] text-gray-500">
                                                    {[p.cityName || 'No city', p.phone ? prettyPhone(p.phone) : p.email || 'No contact'].join(' · ')}
                                                </p>
                                                {(p.blockedWhy && p.stage === 'blocked') ? (
                                                    <p className="truncate text-[11px] font-semibold text-amber-600">{p.blockedWhy}</p>
                                                ) : p.sentDays !== null && p.stage !== 'joined' ? (
                                                    <p className="truncate text-[11px] text-gray-400">Invited {ago(p.sentDays)}{p.c.inviteLinkChannel ? ` by ${p.c.inviteLinkChannel}` : ''}</p>
                                                ) : null}
                                            </button>
                                            <Badge tone={cfg.tone} className="hidden sm:inline-flex">{cfg.label}</Badge>
                                            {canWhatsApp && (
                                                <Button size="sm" variant="secondary" onClick={() => openWhatsApp(p)} aria-label="Send on WhatsApp" className="w-9 px-0 text-emerald-600">
                                                    <MessageCircle size={15} />
                                                </Button>
                                            )}
                                            <Menu trigger={({ toggle: open }) => (
                                                <Button size="sm" variant="ghost" onClick={open} aria-label="More" className="w-9 px-0"><MoreHorizontal size={15} /></Button>
                                            )}>
                                                {p.stage !== 'joined' && <MenuItem icon={Users} onClick={() => markJoined([p.id])}>Mark as in group</MenuItem>}
                                                {p.stage === 'joined' && <MenuItem icon={Undo2} onClick={() => undoJoined(p)}>Not in group</MenuItem>}
                                                {(p.stage === 'sent' || p.stage === 'follow_up') && <MenuItem icon={Repeat} onClick={() => undoSent(p)}>Move back to to-invite</MenuItem>}
                                                {p.group?.groupUrl && <MenuItem as="a" href={p.group.groupUrl} target="_blank" rel="noopener noreferrer" icon={MessageCircle}>Open {p.group.city} group</MenuItem>}
                                            </Menu>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </>
            )}
        </Sheet>
    );
};

export default AddCityCreatorsModal;
