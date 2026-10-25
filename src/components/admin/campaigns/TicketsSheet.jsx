import React, { useEffect, useMemo, useRef, useState } from 'react';
import QrCode from 'lucide-react/dist/esm/icons/qr-code';
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
import Download from 'lucide-react/dist/esm/icons/download';
import Upload from 'lucide-react/dist/esm/icons/upload';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import Send from 'lucide-react/dist/esm/icons/send';
import X from 'lucide-react/dist/esm/icons/x';
import Users from 'lucide-react/dist/esm/icons/users';
import { cn } from '../../../lib/utils';
import { useStore } from '../../../lib/store';
import { downloadCsv, fileDate } from '../../../lib/xlsx';
import GoogleSheetsButton from '../GoogleSheetsButton';
import { passesPost, fileToBase64 } from '../../../lib/passesApi';
import Sheet from '../Sheet';
import { Avatar, Badge, Button, SegmentedTabs } from '../ui';
import { Field, fieldCls, Choice } from '../uploads/UploadKit';
import { Spinner } from './parts';
import { creatorPhotoOf, formatDay } from './campaignModel';
import {
    TEMPLATE_COLUMNS, ROW_STATUS, canGetTicket, evaluateRows, passFor, passesByCreator, readTicketCsv, templateRows,
    cleanPassTiers, followerTier, followersLabel, ticketAudience, isTaskDone,
} from './ticketModel';
import { DeliveryDots } from './CampaignTickets';

/*
 * "Send tickets" for a campaign's shortlisted creators (all of them, or only those
 * who finished every deliverable or one of them). Two ways:
 *
 *   Newbi pass          one per creator: a QR pass (the gate scanner checks it), a
 *                       confirmation without a QR, or "on the guestlist" (their name is
 *                       added to the venue's list; no ticket, they're told it's there).
 *                       For the linked event, or without one the campaign's own event
 *                       name, date and venue.
 *   Official tickets    a CSV from the ticketing partner (links or PDFs dropped in alongside):
 *                       preview → fix or skip rows → "Send N tickets"
 *
 * Every ticket goes out in the creator's campaign, by email (PDF attached) and
 * on WhatsApp; the result per channel is shown at the end and on the Tickets tab.
 * Every send is logged in ticket_uploads.
 */

const QR_BATCH = 10;

/* Whether this creator's existing pass rules out sending them another of `kind`: a QR pass can
   still upgrade a confirmation, a guestlist place or a partner ticket; the other two need no pass at all. */
const blocks = (kind, pass) => (pass ? (kind === 'qr' ? pass.qr !== false : true) : false);
const passLabel = (pass) => (!pass ? null : pass.qr !== false ? 'Has a QR pass' : pass.externalTicket ? 'Has partner ticket' : pass.mode === 'guestlist' ? 'On guestlist' : 'Confirmed');
const KINDS = ['qr', 'confirmation', 'guestlist'];
const CSV_BATCH = 5;

const chunks = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));

const Results = ({ results, byCreator }) => {
    const ok = results.filter(r => ['issued', 'updated', 'resent'].includes(r.outcome)).length;
    const unchanged = results.filter(r => r.outcome === 'unchanged').length;
    const skipped = results.filter(r => r.outcome === 'skipped').length;
    const failed = results.filter(r => r.outcome === 'failed');
    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                <Badge tone="green">{ok} sent</Badge>
                {unchanged > 0 && <Badge tone="gray">{unchanged} unchanged</Badge>}
                {skipped > 0 && <Badge tone="gray">{skipped} skipped</Badge>}
                {failed.length > 0 && <Badge tone="rose">{failed.length} failed</Badge>}
            </div>
            <ul className="divide-y divide-black/[0.05] rounded-xl border border-black/[0.06] dark:divide-white/[0.06] dark:border-white/[0.08]">
                {results.map((r, i) => {
                    const entry = byCreator.get(r.creatorId);
                    return (
                        <li key={`${r.creatorId}-${i}`} className="flex items-center gap-3 px-3 py-2.5">
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[14px] font-semibold">{entry?.creator?.name || r.creatorId || `Row ${r.row}`}</span>
                                {r.error && <span className="block truncate text-[12px] text-gray-500">{r.error}</span>}
                            </span>
                            {r.channels ? <DeliveryDots delivery={Object.fromEntries(Object.entries(r.channels).map(([k, v]) => [k, { status: v }]))} /> : <Badge tone={r.outcome === 'failed' ? 'rose' : 'gray'}>{r.outcome}</Badge>}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

const TicketsSheet = ({ open, onClose, campaign, applicants, preselected, passes }) => {
    const addToast = useStore(s => s.addToast);
    const existing = useMemo(() => passesByCreator(passes), [passes]);
    const byCreator = useMemo(() => {
        const m = new Map();
        applicants.forEach(a => { m.set(a.creator.id, a); if (a.creator.uid) m.set(a.creator.uid, a); });
        return m;
    }, [applicants]);
    const eligible = useMemo(() => applicants.filter(canGetTicket), [applicants]);
    const tasks = (campaign?.tasks || []).filter(t => t?.id);

    const [mode, setMode] = useState('qr');
    const [phase, setPhase] = useState('edit'); // edit | sending | done
    const [progress, setProgress] = useState({ done: 0, total: 0, step: '' });
    const [results, setResults] = useState([]);

    // Who gets them: 'all' shortlisted, 'done-all' (every required deliverable) or 'task:<id>'.
    const [who, setWho] = useState('all');
    const [inReview, setInReview] = useState(false); // count work still waiting for review as done
    const audience = useMemo(() => ticketAudience(eligible, campaign, { who, inReview }), [eligible, campaign, who, inReview]);

    // Newbi pass mode: 'qr', 'confirmation' (no QR) or 'guestlist' (no QR, name on the list)
    const [passKind, setPassKind] = useState('qr');
    const [qrPicked, setQrPicked] = useState(() => new Set());
    const [tierPick, setTierPick] = useState({}); // creator key → category name ('' = default), to upgrade someone
    const [qty, setQty] = useState('1');
    const [tier, setTier] = useState('');
    const [note, setNote] = useState('');

    // CSV mode
    const [csvName, setCsvName] = useState('');
    const [csvRows, setCsvRows] = useState([]);
    const [csvError, setCsvError] = useState('');
    const [files, setFiles] = useState([]);
    const [overrides, setOverrides] = useState({});
    const csvInput = useRef(null);
    const pdfInput = useRef(null);

    const preKey = (preselected || []).map(e => e.key).join('|');
    useEffect(() => {
        if (!open) return;
        const start = (preselected || []).filter(canGetTicket);
        const kind = KINDS.includes(campaign?.passKind) ? campaign.passKind : 'qr';
        setPassKind(kind);
        setWho('all');
        setInReview(false);
        setTierPick({});
        // Everyone ticked by default, minus those who already have this kind of pass.
        setQrPicked(new Set((start.length ? start : eligible).filter(e => !blocks(kind, passFor(existing, e.creator))).map(e => e.key)));
        setQty(String(Number(campaign?.ticketsPerCreator) || 1));
        setTier('');
        setNote('');
        setPhase('edit');
        setResults([]);
        setCsvRows([]); setCsvName(''); setCsvError(''); setFiles([]); setOverrides({});
        setMode('qr');
        // Only when the sheet opens.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, preKey]);

    const evaluated = useMemo(() => evaluateRows({ rows: csvRows, applicants, files, passes, overrides }), [csvRows, applicants, files, passes, overrides]);
    const counts = useMemo(() => {
        const c = { ready: 0, unmatched: 0, duplicate: 0, problem: 0 };
        evaluated.forEach(r => { c[r.status] += 1; });
        return c;
    }, [evaluated]);
    const toSend = evaluated.filter(r => r.status === 'ready' && !r.skip);
    const qrList = audience.filter(e => qrPicked.has(e.key));
    const pickable = audience.filter(e => !blocks(passKind, passFor(existing, e.creator)));
    // Changing who gets them ticks everyone in the new list who can get this kind.
    const tickAll = (list, kind = passKind) => setQrPicked(new Set(list.filter(e => !blocks(kind, passFor(existing, e.creator))).map(e => e.key)));
    const chooseWho = (next, review = inReview) => {
        setWho(next);
        setInReview(review);
        tickAll(ticketAudience(eligible, campaign, { who: next, inReview: review }));
    };
    const doneCount = (taskId) => eligible.filter(e => isTaskDone(e.progress?.items?.find(i => i.task.id === taskId)?.status, inReview)).length;
    const passTiers = useMemo(() => cleanPassTiers(campaign?.passTiers), [campaign?.passTiers]);

    const setOverride = (row, patch) => setOverrides(o => ({ ...o, [row]: { ...(o[row] || {}), ...patch } }));

    const readCsv = async (file) => {
        if (!file) return;
        setCsvError('');
        const text = await file.text();
        const { rows, error } = readTicketCsv(text);
        if (error) { setCsvError(error); setCsvRows([]); return; }
        setCsvName(file.name);
        setCsvRows(rows);
        setOverrides({});
    };

    const addPdfs = (list) => {
        const pdfs = Array.from(list || []).filter(f => /\.pdf$/i.test(f.name) || f.type === 'application/pdf');
        if (!pdfs.length) return;
        setFiles(prev => {
            const names = new Set(pdfs.map(f => f.name.toLowerCase()));
            return [...prev.filter(f => !names.has(f.name.toLowerCase())), ...pdfs];
        });
    };

    const templateSpec = () => {
        const rows = templateRows(audience.length ? audience : eligible, campaign);
        return {
            filename: `tickets_${(campaign?.title || 'campaign').replace(/[^\w]+/g, '-').toLowerCase()}_${fileDate()}`,
            columns: TEMPLATE_COLUMNS.map(key => ({ header: key, key })),
            rows: rows.length ? rows : [{ creator: 'creator@example.com', name: '', ticket_url: 'https://', ticket_file: '', qty: '1', tier: '', note: '' }],
        };
    };
    const downloadTemplate = () => downloadCsv(templateSpec());

    const startLog = async (totals, fileName) => {
        const res = await passesPost('upload-start', { campaignId: campaign.id, mode, totals, fileName });
        return res.ok ? res.data.uploadId : null;
    };

    // Each creator's category: one picked here (an upgrade), else from their followers
    // (editor → Event passes), else the default tier and count typed below.
    const earnedTier = (e) => followerTier(passTiers, e.creator);
    const tierOf = (e) => (e.key in tierPick ? passTiers.find(t => t.name === tierPick[e.key]) || null : earnedTier(e));
    const rank = (t) => (t ? passTiers.length - passTiers.findIndex(x => x.name === t.name) : 0);
    const isUpgrade = (e) => e.key in tierPick && rank(tierOf(e)) > rank(earnedTier(e));
    const sendQr = async () => {
        const ids = qrList.map(e => e.creator.id);
        if (!ids.length) return;
        setPhase('sending');
        setProgress({ done: 0, total: ids.length, step: 'Sending passes' });
        const uploadId = await startLog({ rows: ids.length, matched: ids.length, sending: ids.length });
        // One request group per category, so each gets its own tier and ticket count.
        const groups = new Map();
        qrList.forEach(e => {
            const t = tierOf(e);
            const g = { tier: t ? t.name : tier, qty: t?.qty ? String(t.qty) : qty };
            const key = `${g.tier}|${g.qty}`;
            if (!groups.has(key)) groups.set(key, { ...g, ids: [] });
            groups.get(key).ids.push(e.creator.id);
        });
        const all = [];
        for (const g of groups.values()) {
            for (const batch of chunks(g.ids, QR_BATCH)) {
                const res = await passesPost('issue-campaign', { campaignId: campaign.id, creatorIds: batch, kind: passKind, qty: g.qty, tier: g.tier, note, uploadId }, { timeoutMs: 60000 });
                if (res.ok) all.push(...res.data.results);
                else all.push(...batch.map(creatorId => ({ creatorId, outcome: 'failed', error: res.error })));
                setProgress(p => ({ ...p, done: Math.min(p.total, p.done + batch.length) }));
            }
        }
        if (uploadId) await passesPost('upload-finish', { uploadId });
        setResults(all);
        setPhase('done');
        const failed = all.filter(r => r.outcome === 'failed').length;
        if (failed) addToast(`${failed} couldn't be sent. Check the list below and try those again.`, 'warning', { title: `Sent ${all.length - failed} of ${all.length}` });
        else addToast(passKind === 'guestlist' ? "Added to the guestlist. They've been told." : passKind === 'confirmation' ? 'Confirmations sent.' : 'Passes sent.', 'success');
    };

    // Switching QR ↔ confirmation drops anyone who can't get that kind.
    const chooseKind = (kind) => {
        setPassKind(kind);
        setQrPicked(s => new Set([...s].filter(key => { const e = eligible.find(x => x.key === key); return e && !blocks(kind, passFor(existing, e.creator)); })));
    };
    const passWord = (n) => (passKind === 'confirmation' ? (n === 1 ? 'confirmation' : 'confirmations') : (n === 1 ? 'pass' : 'passes'));
    const sendLabel = (n) => (passKind === 'guestlist' ? `Add ${n} to the guestlist` : `Send ${n} ${passWord(n)}`);

    const sendCsv = async () => {
        if (!toSend.length) return;
        setPhase('sending');
        const pdfRows = toSend.filter(r => r.kind === 'pdf');
        setProgress({ done: 0, total: toSend.length + pdfRows.length, step: pdfRows.length ? 'Uploading PDFs' : 'Sending tickets' });
        const uploadId = await startLog({ rows: evaluated.length, matched: counts.ready, unmatched: counts.unmatched, duplicate: counts.duplicate, problem: counts.problem, sending: toSend.length }, csvName);

        const failed = [];
        const ready = [];
        for (const r of toSend) {
            const base = {
                row: r.row, creatorId: r.entry.creator.id, qty: r.qty, tier: r.tier || undefined, note: r.note || undefined, provider: r.provider || undefined,
            };
            if (r.kind === 'pdf') {
                try {
                    const data = await fileToBase64(r.file);
                    const up = await passesPost('upload-pdf', { campaignId: campaign.id, creatorId: r.entry.creator.id, filename: r.file.name, data }, { timeoutMs: 60000 });
                    if (!up.ok) { failed.push({ ...base, outcome: 'failed', error: up.error }); continue; }
                    ready.push({ ...base, kind: 'pdf', storagePath: up.data.storagePath, filename: up.data.filename, size: up.data.size });
                } catch {
                    failed.push({ ...base, outcome: 'failed', error: 'Could not read the PDF' });
                } finally {
                    setProgress(p => ({ ...p, done: p.done + 1 }));
                }
            } else {
                ready.push({ ...base, kind: 'link', url: r.url });
            }
        }
        setProgress(p => ({ ...p, step: 'Sending tickets' }));
        const all = [...failed];
        for (const batch of chunks(ready, CSV_BATCH)) {
            const res = await passesPost('issue-campaign-external', { campaignId: campaign.id, uploadId, rows: batch }, { timeoutMs: 60000 });
            if (res.ok) all.push(...res.data.results);
            else all.push(...batch.map(b => ({ creatorId: b.creatorId, row: b.row, outcome: 'failed', error: res.error })));
            setProgress(p => ({ ...p, done: p.done + batch.length }));
        }
        if (uploadId) await passesPost('upload-finish', { uploadId });
        setResults(all);
        setPhase('done');
        const n = all.filter(r => r.outcome === 'failed').length;
        if (n) addToast(`${n} couldn't be sent. Check the list below and try those again.`, 'warning', { title: `Sent ${all.length - n} of ${all.length}` });
        else addToast('Tickets sent.', 'success');
    };

    const sending = phase === 'sending';
    const footer = phase === 'done' ? (
        <Button variant="accent" onClick={onClose} className="h-11 w-full">Done</Button>
    ) : mode === 'qr' ? (
        <Button variant="accent" onClick={sendQr} disabled={sending || !qrList.length} className="h-11 w-full">
            {sending ? <><Spinner /> Sending {progress.done}/{progress.total}</> : <><Send size={14} /> {sendLabel(qrList.length)}</>}
        </Button>
    ) : (
        <Button variant="accent" onClick={sendCsv} disabled={sending || !toSend.length} className="h-11 w-full">
            {sending ? <><Spinner /> {progress.step} {progress.done}/{progress.total}</> : <><Send size={14} /> Send {toSend.length} {toSend.length === 1 ? 'ticket' : 'tickets'}</>}
        </Button>
    );

    return (
        <Sheet
            open={open}
            onClose={sending ? () => {} : onClose}
            title="Send tickets"
            subtitle="In the app, by email and on WhatsApp. A failed WhatsApp never holds up the rest."
            size="lg"
            footer={footer}
        >
            {phase === 'done' ? (
                <Results results={results} byCreator={byCreator} />
            ) : (
                <div className="space-y-5">
                    <SegmentedTabs
                        value={mode}
                        onChange={(v) => !sending && setMode(v)}
                        items={[{ value: 'qr', label: 'Newbi pass', icon: QrCode }, { value: 'csv', label: 'Official tickets (CSV)', icon: FileSpreadsheet }]}
                        className="w-full [&>button]:flex-1 [&>button]:justify-center"
                    />

                    {eligible.length > 0 && tasks.length > 0 && (
                        <div className="space-y-2">
                            <Field label="Who gets them">
                                <select className={cn(fieldCls, 'h-11 text-[14px]')} value={who} disabled={sending} onChange={e => chooseWho(e.target.value)}>
                                    <option value="all">Everyone shortlisted ({eligible.length})</option>
                                    <option value="done-all">Finished all {tasks.some(t => t.priority === 'optional' || t.required === false) ? 'required ' : ''}deliverables ({ticketAudience(eligible, campaign, { who: 'done-all', inReview }).length})</option>
                                    {tasks.length > 1 && tasks.map(t => <option key={t.id} value={`task:${t.id}`}>Finished: {t.title || 'Deliverable'} ({doneCount(t.id)})</option>)}
                                </select>
                            </Field>
                            {who !== 'all' && (
                                <label className="flex min-h-[40px] cursor-pointer items-center gap-2.5 text-[13px] text-gray-600 dark:text-zinc-400">
                                    <input type="checkbox" className="h-5 w-5 accent-emerald-600" checked={inReview} disabled={sending} onChange={e => chooseWho(who, e.target.checked)} />
                                    Also count work still waiting for review
                                </label>
                            )}
                        </div>
                    )}

                    {mode === 'qr' ? (
                        eligible.length === 0 ? (
                            <p className="rounded-xl bg-black/[0.03] px-3.5 py-3 text-[13px] text-gray-500 dark:bg-white/[0.04]">Shortlist creators first. Only shortlisted creators can get tickets or go on the guestlist.</p>
                        ) : audience.length === 0 ? (
                            <p className="rounded-xl bg-black/[0.03] px-3.5 py-3 text-[13px] text-gray-500 dark:bg-white/[0.04]">Nobody shortlisted has finished that yet{inReview ? '' : '. Tick “Also count work still waiting for review” to include work you haven’t checked'}.</p>
                        ) : (
                            <>
                                <Choice
                                    value={passKind}
                                    onChange={(v) => !sending && chooseKind(v)}
                                    options={[
                                        { value: 'qr', label: 'QR pass', hint: 'Scanned at the gate' },
                                        { value: 'confirmation', label: 'Confirmation', hint: 'Confirms their place, no QR' },
                                        { value: 'guestlist', label: 'Guestlist', hint: 'Name added to the list, no ticket' },
                                    ]}
                                />
                                {passKind === 'guestlist' && (
                                    <p className="text-[13px] text-gray-500">They get a message that their name is on the guestlist (as “Name + guests” when they get more than one), by email, on WhatsApp and in the app. Nothing to scan: the door checks the name. Export the list from the Tickets tab for the venue.</p>
                                )}
                                {!campaign?.eventId && (
                                    <p className="text-[13px] text-gray-500">
                                        No linked event: the pass shows <span className="font-semibold text-gray-700 dark:text-zinc-300">{campaign?.eventName || campaign?.title || 'the campaign'}</span>{[formatDay(campaign?.eventDate), campaign?.venue].filter(Boolean).length ? ` · ${[formatDay(campaign?.eventDate), campaign?.venue].filter(Boolean).join(' · ')}` : ''}. Change it in the editor (Event passes).
                                    </p>
                                )}
                                <div className="flex items-center gap-2 text-[13px]">
                                    <span className="flex items-center gap-1.5 font-semibold text-gray-600 dark:text-zinc-400"><Users size={13} /> {qrList.length} of {audience.length} ticked</span>
                                    <span className="ml-auto flex gap-1">
                                        <button type="button" disabled={sending || qrList.length === pickable.length} onClick={() => tickAll(audience)} className="h-9 rounded-lg px-2.5 font-semibold text-gray-600 hover:bg-black/5 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-white/5">Select all</button>
                                        <button type="button" disabled={sending || !qrList.length} onClick={() => setQrPicked(new Set())} className="h-9 rounded-lg px-2.5 font-semibold text-gray-600 hover:bg-black/5 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-white/5">Clear</button>
                                    </span>
                                </div>
                                <ul className="divide-y divide-black/[0.05] rounded-xl border border-black/[0.06] dark:divide-white/[0.06] dark:border-white/[0.08] sm:max-h-[38dvh] sm:overflow-y-auto">
                                    {audience.map(e => {
                                        const has = passFor(existing, e.creator);
                                        const blocked = blocks(passKind, has);
                                        const checked = qrPicked.has(e.key);
                                        return (
                                            <li key={e.key}>
                                                <label className={cn('flex min-h-[52px] cursor-pointer items-center gap-3 px-3 py-2', blocked && 'opacity-60')}>
                                                    <input type="checkbox" className="h-5 w-5 accent-emerald-600" disabled={blocked || sending} checked={checked && !blocked} onChange={() => setQrPicked(s => { const n = new Set(s); if (n.has(e.key)) n.delete(e.key); else n.add(e.key); return n; })} />
                                                    <Avatar src={creatorPhotoOf(e.creator)} name={e.creator.name} size={30} />
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-[14px] font-semibold">{e.creator.name || 'Creator'}</span>
                                                        {passTiers.length > 0 && (
                                                            <span className="block truncate text-[12px] text-gray-500">
                                                                {Number(e.creator.instagramFollowers) > 0 ? `${followersLabel(e.creator.instagramFollowers)} followers` : 'No follower count'}
                                                                {earnedTier(e) ? ` · earns ${earnedTier(e).name}` : ''}
                                                            </span>
                                                        )}
                                                    </span>
                                                    {passTiers.length > 0 && !blocked && (
                                                        // The category this creator gets; pick a higher one to upgrade them.
                                                        <select
                                                            aria-label={`Category for ${e.creator.name || 'creator'}`}
                                                            className={cn(fieldCls, 'h-9 w-auto max-w-[9.5rem] shrink-0 py-0 pr-7 text-[13px]', isUpgrade(e) && 'border-emerald-500 text-emerald-700 dark:border-neon-green dark:text-neon-green')}
                                                            value={tierOf(e)?.name || ''}
                                                            disabled={sending}
                                                            onClick={(ev) => ev.stopPropagation()}
                                                            onChange={(ev) => setTierPick(p => ({ ...p, [e.key]: ev.target.value }))}
                                                        >
                                                            <option value="">{tier || 'Default'}</option>
                                                            {passTiers.map(t => <option key={t.name} value={t.name}>{t.name}{t.qty ? ` · ${t.qty}` : ''}</option>)}
                                                        </select>
                                                    )}
                                                    {isUpgrade(e) && <Badge tone="green">Upgraded</Badge>}
                                                    {has && <Badge tone={has.qr !== false ? 'green' : has.externalTicket ? 'blue' : 'gray'}>{passLabel(has)}</Badge>}
                                                </label>
                                            </li>
                                        );
                                    })}
                                </ul>
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <Field label={`${passKind === 'guestlist' ? 'Admit each' : 'Tickets each'}${passTiers.length ? ' (default)' : ''}`}><input className={fieldCls} type="number" min="1" max="20" inputMode="numeric" value={qty} onChange={e => setQty(e.target.value)} /></Field>
                                    <Field label={passTiers.length ? 'Tier (default)' : 'Tier'} optional><input className={fieldCls} value={tier} onChange={e => setTier(e.target.value)} placeholder="e.g. VIP" /></Field>
                                    <Field label="Note" optional><input className={fieldCls} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Entry from Gate 2" /></Field>
                                </div>
                            </>
                        )
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-2">
                                <Button onClick={downloadTemplate} className="h-11 px-2 sm:justify-start sm:px-4"><Download size={14} /> Template</Button>
                                <Button onClick={() => csvInput.current?.click()} className="h-11 px-2 sm:justify-start sm:px-4" disabled={sending}><Upload size={14} /> {csvName ? 'CSV' : 'Choose CSV'}</Button>
                                <Button onClick={() => pdfInput.current?.click()} className="h-11 px-2 sm:justify-start sm:px-4" disabled={sending}><FileText size={14} /> PDFs{files.length ? ` (${files.length})` : ''}</Button>
                                <input ref={csvInput} type="file" accept=".csv,text/csv" className="hidden" onChange={e => { readCsv(e.target.files?.[0]); e.target.value = ''; }} />
                                <input ref={pdfInput} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={e => { addPdfs(e.target.files); e.target.value = ''; }} />
                                <GoogleSheetsButton getSpec={templateSpec} format="csv" label="Fill the template in Google Sheets" className="col-span-3 h-11 sm:justify-start" />
                            </div>
                            <div
                                onDragOver={e => e.preventDefault()}
                                onDrop={e => { e.preventDefault(); const list = Array.from(e.dataTransfer.files || []); const csv = list.find(f => /\.csv$/i.test(f.name)); if (csv) readCsv(csv); addPdfs(list); }}
                                className="rounded-xl border-black/10 text-[13px] text-gray-500 dark:border-white/10 sm:border-2 sm:border-dashed sm:px-4 sm:py-4 sm:text-center"
                            >
                                <span className="hidden sm:inline">Drop the CSV and the ticket PDFs here. </span>PDFs are matched to rows by <code className="font-mono">ticket_file</code> and must be under 3 MB. The template lists everyone in “Who gets them”.
                            </div>
                            {csvError && <p role="alert" className="text-[13px] font-semibold text-rose-600 dark:text-rose-300">{csvError}</p>}

                            {evaluated.length > 0 && (
                                <>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="truncate text-[13px] font-semibold">{csvName}</span>
                                        {Object.entries(counts).filter(([, n]) => n > 0).map(([k, n]) => <Badge key={k} tone={ROW_STATUS[k].tone}>{n} {ROW_STATUS[k].label.toLowerCase()}</Badge>)}
                                    </div>
                                    <ul className="space-y-2 sm:max-h-[42dvh] sm:overflow-y-auto">
                                        {evaluated.map(r => (
                                            <li key={r.row} className={cn('rounded-xl border px-3 py-2.5', r.status === 'ready' && !r.skip ? 'border-black/[0.08] dark:border-white/[0.1]' : 'border-black/[0.05] bg-black/[0.02] dark:border-white/[0.06] dark:bg-white/[0.02]')}>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-10 shrink-0 text-[11px] font-semibold text-gray-400">Row {r.row}</span>
                                                    <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{r.entry?.creator?.name || r.creator || 'Unknown creator'}</span>
                                                    <Badge tone={ROW_STATUS[r.status].tone}>{r.status === 'ready' && r.replaces ? 'Update' : ROW_STATUS[r.status].label}</Badge>
                                                    {r.status === 'ready' && (
                                                        <button type="button" aria-label={r.skip ? 'Include row' : 'Skip row'} onClick={() => setOverride(r.row, { skip: !r.skip })} className="flex h-9 shrink-0 items-center rounded-lg px-2 text-[12px] font-semibold text-gray-500 hover:bg-black/5 dark:hover:bg-white/5">
                                                            {r.skip ? 'Include' : <><X size={13} /> Skip</>}
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="mt-1 flex items-center gap-1.5 truncate pl-12 text-[12px] text-gray-500">
                                                    {r.kind === 'pdf' ? <FileText size={12} /> : r.kind === 'link' ? <Link2 size={12} /> : null}
                                                    <span className="truncate">{r.fileName || r.url || 'No ticket'}</span>
                                                    {r.qty > 1 && <span>· {r.qty} tickets</span>}
                                                    {r.tier && <span>· {r.tier}</span>}
                                                </p>
                                                {(r.reason || r.notSelected) && <p className={cn('mt-1 pl-12 text-[12px] font-medium', r.status === 'ready' ? 'text-amber-700 dark:text-amber-300' : 'text-rose-600 dark:text-rose-300')}>{r.reason || 'Applied but not selected yet'}</p>}

                                                {r.status === 'unmatched' && (
                                                    <div className="mt-2 pl-12">
                                                        <select className={cn(fieldCls, 'h-10 text-[14px]')} value={overrides[r.row]?.creatorKey || ''} onChange={e => setOverride(r.row, { creatorKey: e.target.value || undefined })} aria-label={`Pick the creator for row ${r.row}`}>
                                                            <option value="">Pick the creator…</option>
                                                            {applicants.map(a => <option key={a.key} value={a.key}>{a.creator.name || a.creator.email || a.key}</option>)}
                                                        </select>
                                                    </div>
                                                )}
                                                {r.status === 'problem' && (
                                                    <div className="mt-2 grid gap-2 pl-12 sm:grid-cols-2">
                                                        {files.length > 0 && (
                                                            <select className={cn(fieldCls, 'h-10 text-[14px]')} value={overrides[r.row]?.file ?? ''} onChange={e => setOverride(r.row, { file: e.target.value || undefined })} aria-label={`PDF for row ${r.row}`}>
                                                                <option value="">Use a dropped PDF…</option>
                                                                {files.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
                                                            </select>
                                                        )}
                                                        <input className={cn(fieldCls, 'h-10 text-[14px]')} placeholder="…or paste a ticket link" value={overrides[r.row]?.url ?? ''} onChange={e => setOverride(r.row, { url: e.target.value, file: '' })} inputMode="url" autoCapitalize="off" />
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="text-[12px] text-gray-500">Nothing is sent until you tap Send. Unmatched, duplicate and problem rows are left out unless you fix them.</p>
                                </>
                            )}
                        </div>
                    )}

                    {sending && (
                        <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                            <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-300 dark:bg-neon-green" style={{ width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%` }} />
                        </div>
                    )}
                </div>
            )}
        </Sheet>
    );
};

export default TicketsSheet;
