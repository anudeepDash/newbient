import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useStore } from '../../lib/store';
import { DEFAULT_CREATOR_GROUPS } from '../../lib/constants';
import { sendCreatorGroupsBroadcastEmail, generateCreatorGroupsBroadcastHTML } from '../../lib/email';
import { cn } from '../../lib/utils';
import Send from 'lucide-react/dist/esm/icons/send';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Monitor from 'lucide-react/dist/esm/icons/monitor';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import Sheet from './Sheet';
import { Button, SegmentedTabs } from './ui';
import RichEditor from './RichEditor';
import EmailPreviewIframe from '../ui/EmailPreviewIframe';
import { Field, Toggle, fieldCls } from './uploads/UploadKit';

const normalizeCity = (cityStr = '') => {
    const raw = String(cityStr || '').trim().toLowerCase();
    if (/^bang[al]*o?re$/i.test(raw) || raw.includes('bengaluru') || raw.includes('bangalore')) return 'Bengaluru';
    if (raw.includes('hyderabad')) return 'Hyderabad';
    if (raw.includes('chandigarh')) return 'Chandigarh';
    if (raw.includes('mumbai')) return 'Mumbai';
    if (raw.includes('pune')) return 'Pune';
    if (raw.includes('kolkata') || raw.includes('calcutta')) return 'Kolkata';
    if (raw.includes('kochi') || raw.includes('cochin')) return 'Kochi';
    if (raw.includes('delhi')) return 'Delhi';
    if (raw.includes('bhubaneswar') || raw.includes('bhubaneshwar') || raw.includes('cuttack') || raw.includes('odisha')) return 'Bhubaneswar & Cuttack';
    if (raw.includes('vizag') || raw.includes('visakhapatnam')) return 'Vizag';
    if (raw.includes('surat')) return 'Surat';
    if (raw.includes('ahmedabad')) return 'Ahmedabad';
    if (raw.includes('jaipur')) return 'Jaipur';
    if (raw.includes('chennai') || raw.includes('madras')) return 'Chennai';
    return cityStr || 'Bengaluru';
};

// Same rule for the counts on the city buttons and for who actually gets the email.
const inCity = (creator, cityFilter) => {
    if (cityFilter === 'All') return true;
    const normFilter = cityFilter.toLowerCase();
    const normC = normalizeCity(creator.city).toLowerCase();
    return normC.includes(normFilter) || (normFilter === 'delhi' && normC.includes('delhi'));
};

const defaultSubject = (city) => `🔥 ${city === 'All' ? 'Official' : city} Creator WhatsApp Community is Live • Exclusive Invitation`;

// The editor leaves "<br>" behind when cleared; treat that as no message so the standard invite is used.
const cleanMessage = (html) => {
    const s = String(html || '');
    if (/<img/i.test(s)) return s;
    return s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() ? s : '';
};

const BroadcastGroupsModal = ({ onClose, preselectedCity = 'All' }) => {
    const { creators, creatorGroups } = useStore();

    const activeGroups = useMemo(() => {
        const remote = (creatorGroups || []).filter(g => g.isActive !== false);
        const map = new Map();
        remote.forEach(g => {
            if (g.city) map.set(g.city.toLowerCase().trim(), g);
        });
        const list = [...remote];
        DEFAULT_CREATOR_GROUPS.forEach(dg => {
            const key = dg.city.toLowerCase().trim();
            if (!map.has(key)) {
                list.push(dg);
                map.set(key, dg);
            }
        });
        return list.sort((a, b) => (a.order || 0) - (b.order || 0));
    }, [creatorGroups]);

    const [selectedCityFilter, setSelectedCityFilter] = useState(preselectedCity || 'All');
    const [verifiedOnly, setVerifiedOnly] = useState(false);
    const [emailSubject, setEmailSubject] = useState(() => defaultSubject(preselectedCity || 'All'));
    const subjectEdited = useRef(false);
    const [customMessage, setCustomMessage] = useState('');
    const [tab, setTab] = useState('write');
    const [device, setDevice] = useState('desktop');
    const [isSending, setIsSending] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [sendStats, setSendStats] = useState(null);
    const [problem, setProblem] = useState('');

    // Creators with a usable email, optionally only verified ones
    const eligibleCreators = useMemo(() => {
        return (creators || []).filter(c => c.email && c.email.includes('@') && (!verifiedOnly || c.profileStatus === 'approved'));
    }, [creators, verifiedOnly]);

    const verifiedCount = useMemo(() => (creators || []).filter(c => c.email && c.email.includes('@') && c.profileStatus === 'approved').length, [creators]);

    const targetRecipients = useMemo(() => eligibleCreators.filter(c => inCity(c, selectedCityFilter)), [eligibleCreators, selectedCityFilter]);

    const cityCounts = useMemo(() => {
        const out = {};
        activeGroups.forEach(g => { out[g.city] = eligibleCreators.filter(c => inCity(c, g.city)).length; });
        return out;
    }, [activeGroups, eligibleCreators]);

    // Group for the selected city (the first group when sending to every city)
    const activeCityGroup = useMemo(() => {
        if (selectedCityFilter === 'All') return activeGroups[0] || DEFAULT_CREATOR_GROUPS[0];
        const found = activeGroups.find(g => normalizeCity(g.city).toLowerCase() === selectedCityFilter.toLowerCase());
        return found || activeGroups[0] || DEFAULT_CREATOR_GROUPS[0];
    }, [activeGroups, selectedCityFilter]);

    // Keep the subject in step with the city until it has been edited by hand
    useEffect(() => {
        if (!subjectEdited.current) setEmailSubject(defaultSubject(selectedCityFilter));
    }, [selectedCityFilter]);

    const emailCity = selectedCityFilter === 'All' ? activeCityGroup.city : selectedCityFilter;
    const message = cleanMessage(customMessage);

    const handleSend = async () => {
        setProblem('');
        if (targetRecipients.length === 0) {
            useStore.getState().addToast('No creators to email in the selected city. Try a different city.', 'error');
            return;
        }
        if (!emailSubject.trim()) {
            setProblem('Add a subject.');
            setTab('write');
            return;
        }

        setIsSending(true);
        setProgress({ current: 0, total: targetRecipients.length });

        try {
            const recipientsPayload = targetRecipients.map(c => ({
                email: c.email.trim().toLowerCase(),
                name: c.name || c.displayName || 'Creator',
                city: c.city || selectedCityFilter
            }));

            const result = await sendCreatorGroupsBroadcastEmail(recipientsPayload, {
                city: emailCity,
                groupUrl: activeCityGroup.groupUrl,
                customSubject: emailSubject,
                customMessage: message,
                availableGroups: activeGroups,
                // sendMassEmail reports { sent, failed, total } after each batch
                onProgress: (p, tot) => {
                    if (p && typeof p === 'object') setProgress({ current: (p.sent || 0) + (p.failed || 0), total: p.total || targetRecipients.length });
                    else setProgress({ current: Number(p) || 0, total: Number(tot) || targetRecipients.length });
                }
            });

            const sent = result?.sent ?? result?.sentCount ?? 0;
            const failed = result?.failed ?? result?.failedCount ?? 0;
            if (result && (result.success || sent > 0)) {
                const sentCount = result.success && !sent ? targetRecipients.length : sent;
                setSendStats({ sent: sentCount, failed });
                useStore.getState().addToast(`Broadcast sent to ${sentCount} creators.`, failed ? 'warning' : 'success');
            } else {
                throw new Error(result?.error || 'Email dispatch failed.');
            }
        } catch (err) {
            console.error('Broadcast error:', err);
            setProblem("Couldn't send the broadcast. Please try again.");
            useStore.getState().addToast("Couldn't send the broadcast. Please try again.", 'error');
        } finally {
            setIsSending(false);
        }
    };

    const previewHtml = useMemo(() => {
        return generateCreatorGroupsBroadcastHTML({
            creatorName: 'Creator Name',
            city: emailCity,
            groupUrl: activeCityGroup.groupUrl,
            customMessage: message,
            availableGroups: activeGroups
        });
    }, [emailCity, activeCityGroup, message, activeGroups]);

    const pct = progress.total ? Math.round((progress.current / progress.total) * 100) : 0;
    const n = targetRecipients.length;

    const cityChip = (value, label, count) => {
        const active = selectedCityFilter.toLowerCase() === value.toLowerCase();
        return (
            <button
                key={value}
                type="button"
                onClick={() => setSelectedCityFilter(value)}
                aria-pressed={active}
                className={cn(
                    'inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-[13px] font-semibold transition-colors',
                    active
                        ? 'border-emerald-500/60 bg-neon-green/[0.08] text-gray-900 dark:border-neon-green/50 dark:text-white'
                        : 'border-black/10 text-gray-600 hover:border-black/20 dark:border-white/10 dark:text-zinc-400 dark:hover:border-white/20'
                )}
            >
                {label}
                <span className={cn('rounded-md px-1.5 text-[11px] tabular-nums', active ? 'bg-emerald-500/15 text-emerald-700 dark:text-neon-green' : 'bg-black/5 text-gray-500 dark:bg-white/10')}>{count}</span>
            </button>
        );
    };

    const footer = sendStats ? (
        <Button variant="primary" className="h-12 w-full" onClick={onClose}>Done</Button>
    ) : (
        <div className="space-y-3">
            {problem && <p role="alert" className="text-[13px] font-semibold text-red-600 dark:text-red-400">{problem}</p>}
            {!isSending && (
                <p className="text-[13px] text-gray-500">
                    {n === 0 ? 'Nobody to email with these settings.' : <><strong className="text-gray-900 dark:text-white">{n}</strong> creator{n === 1 ? '' : 's'} will get this email.</>}
                </p>
            )}
            <div className="flex gap-2">
                <Button variant="ghost" onClick={onClose} disabled={isSending} className="h-12">Cancel</Button>
                <Button variant="primary" onClick={handleSend} disabled={isSending || n === 0} className="h-12 flex-1">
                    <Send size={15} /> {isSending ? `Sending ${progress.current} of ${progress.total}…` : `Send to ${n}`}
                </Button>
            </div>
        </div>
    );

    return (
        <Sheet
            open
            onClose={isSending ? () => {} : onClose}
            size="xl"
            title="Email creators about WhatsApp groups"
            subtitle="Invite creators to join their city's WhatsApp community."
            footer={footer}
            bodyClassName="space-y-5"
        >
            {sendStats ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neon-green/15 text-emerald-600 dark:text-neon-green">
                        <CheckCircle2 size={30} />
                    </div>
                    <h3 className="text-lg font-extrabold tracking-tight">Broadcast sent</h3>
                    <p className="max-w-sm text-[14px] text-gray-500">
                        Sent to <strong className="text-gray-900 dark:text-white">{sendStats.sent}</strong> creator{sendStats.sent === 1 ? '' : 's'}.
                        {sendStats.failed > 0 && ` ${sendStats.failed} couldn't be reached.`}
                    </p>
                </div>
            ) : isSending ? (
                <div className="space-y-4 py-12 text-center">
                    <p className="text-[15px] font-bold">Sending {progress.current} of {progress.total}</p>
                    <div className="mx-auto h-2 max-w-md overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                        <div className="h-full rounded-full bg-emerald-500 transition-all duration-300 dark:bg-neon-green" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[13px] text-gray-500">Keep this open until it finishes.</p>
                </div>
            ) : (
                <>
                    <SegmentedTabs value={tab} onChange={setTab} className="w-full [&>button]:flex-1 [&>button]:justify-center" items={[
                        { value: 'write', label: 'Write' },
                        { value: 'preview', label: 'Preview' },
                    ]} />

                    {tab === 'write' ? (
                        <div className="space-y-5">
                            <section className="space-y-3">
                                <h3 className="text-[13px] font-bold">Who gets it</h3>
                                <div className="flex flex-wrap gap-2">
                                    {cityChip('All', 'All cities', eligibleCreators.length)}
                                    {activeGroups.map(g => cityChip(g.city, g.city, cityCounts[g.city] || 0))}
                                </div>
                                <div className="rounded-xl border border-black/10 px-3.5 py-2 dark:border-white/10">
                                    <Toggle
                                        label="Verified creators only"
                                        hint={`${verifiedCount} verified creator${verifiedCount === 1 ? '' : 's'} have an email.`}
                                        checked={verifiedOnly}
                                        onChange={setVerifiedOnly}
                                    />
                                </div>
                            </section>

                            <section className="space-y-2">
                                <h3 className="text-[13px] font-bold">Group in the email</h3>
                                <div className="flex items-center gap-3 rounded-xl border border-black/10 p-3 dark:border-white/10">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-neon-green">
                                        <MessageCircle size={18} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[14px] font-semibold">{activeCityGroup.title || `${activeCityGroup.city} Creators Hub`}</p>
                                        <p className="truncate text-[12px] text-gray-500">{activeCityGroup.groupUrl}</p>
                                    </div>
                                    {activeCityGroup.groupUrl && (
                                        <a href={activeCityGroup.groupUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-black/10 px-3 text-[13px] font-semibold hover:border-black/20 dark:border-white/10 dark:hover:border-white/20">
                                            <ExternalLink size={14} /> Test
                                        </a>
                                    )}
                                </div>
                                {selectedCityFilter === 'All' && (
                                    <p className="text-[12px] text-gray-500">The main button links to the {activeCityGroup.city} group. Every active city group is listed under it.</p>
                                )}
                            </section>

                            <Field label="Subject">
                                <input
                                    className={fieldCls}
                                    value={emailSubject}
                                    onChange={(e) => { subjectEdited.current = true; setEmailSubject(e.target.value); }}
                                    placeholder="Official Creator Community is Live!"
                                />
                            </Field>

                            <div>
                                <span className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-gray-500">Personal note <span className="font-medium">(optional)</span></span>
                                <RichEditor
                                    value={customMessage}
                                    onChange={setCustomMessage}
                                    minHeight={140}
                                    label="Personal note"
                                    placeholder="Leave empty to use the standard invite."
                                />
                                <p className="mt-1 text-[11px] text-gray-500">The join button and the list of city groups are added below your note.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <p className="min-w-0 truncate text-[13px] font-semibold"><span className="text-gray-500">Subject:</span> {emailSubject}</p>
                                <div className="hidden shrink-0 gap-1 rounded-xl bg-black/5 p-1 dark:bg-white/5 sm:flex">
                                    {[{ v: 'desktop', I: Monitor }, { v: 'mobile', I: Smartphone }].map(({ v, I }) => (
                                        <button key={v} type="button" onClick={() => setDevice(v)} aria-label={`${v} preview`} className={cn('flex h-8 w-8 items-center justify-center rounded-lg', device === v ? 'bg-white text-black shadow-sm dark:bg-zinc-800 dark:text-white' : 'text-gray-500')}>
                                            <I size={14} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-center rounded-2xl bg-black/[0.03] p-2 dark:bg-white/[0.03] sm:p-4">
                                <div className={cn('w-full overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm transition-[max-width] dark:border-white/10', device === 'mobile' ? 'max-w-[375px]' : 'max-w-full')}>
                                    <EmailPreviewIframe html={previewHtml} />
                                </div>
                            </div>
                            <p className="text-[12px] text-gray-500">Each creator sees the same email; the greeting reads "Hey Creator".</p>
                        </div>
                    )}
                </>
            )}
        </Sheet>
    );
};

export default BroadcastGroupsModal;
