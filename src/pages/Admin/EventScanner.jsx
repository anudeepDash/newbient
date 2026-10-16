import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import ScanLine from 'lucide-react/dist/esm/icons/scan-line';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import XCircle from 'lucide-react/dist/esm/icons/x-circle';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import WifiOff from 'lucide-react/dist/esm/icons/wifi-off';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Flashlight from 'lucide-react/dist/esm/icons/flashlight';
import SwitchCamera from 'lucide-react/dist/esm/icons/switch-camera';
import Volume2 from 'lucide-react/dist/esm/icons/volume-2';
import VolumeX from 'lucide-react/dist/esm/icons/volume-x';
import History from 'lucide-react/dist/esm/icons/history';
import Search from 'lucide-react/dist/esm/icons/search';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Users from 'lucide-react/dist/esm/icons/users';
import Settings2 from 'lucide-react/dist/esm/icons/settings-2';
import ListChecks from 'lucide-react/dist/esm/icons/list-checks';
import CameraOff from 'lucide-react/dist/esm/icons/camera-off';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { cn } from '../../lib/utils';
import { SOLD_STATUSES, orderTicketCount, isOrderCheckedIn, isGuestAdmissible } from '../../lib/ticketing';
import Sheet from '../../components/admin/Sheet';
import { Toggle } from '../../components/admin/uploads/UploadKit';
import { useOperationalEvents, useGuestEntries, hasGuestlist } from '../../components/admin/ticketing/events';
import { formatEventDate } from '../../components/admin/ticketing/format';
import { scanFeedback, unlockScanAudio } from '../../components/admin/events/scanFeedback';

/*
 * The gate scanner: a full-screen page for a phone at the door, built for the
 * dark. Camera first, a big colour result for every scan (green = let in,
 * amber = already used, red = not valid), sound and vibration, manual entry,
 * recent scans, and scans made without signal are kept and sent later.
 * Check-ins go through store.scanTicket (Firestore transactions).
 */

const SHEET_Z = 600;
const HOUR = 3600000;

// ── small persistence helpers (per browser; never required) ──
const readJson = (key, fallback) => {
    try { const v = window.localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
};
const writeJson = (key, value) => {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
};

const DEFAULT_PREFS = { sound: true, vibrate: true, autoNext: true };

const withTimeout = (promise, ms) => new Promise((resolve, reject) => {
    const t = setTimeout(() => { const e = new Error('timeout'); e.network = true; reject(e); }, ms);
    promise.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
});

const isNetworkError = (err) => Boolean(
    err?.network
    || (typeof navigator !== 'undefined' && navigator.onLine === false)
    || err?.code === 'unavailable'
    || /offline|network|failed to fetch/i.test(String(err?.message || err))
);

// Same reading as store.scanTicket, for offline look-ups.
const refFromCode = (raw) => {
    let text = String(raw || '').trim();
    for (let i = 0; i < 2; i++) { try { text = decodeURIComponent(text); } catch { break; } }
    try { const o = JSON.parse(text); if (o?.ref) return String(o.ref).toUpperCase(); } catch { /* not JSON */ }
    const m = text.toUpperCase().match(/\b(?:NB|GL)-[A-Z0-9]{3,12}\b/);
    return m ? m[0] : text.toUpperCase().replace(/\s+/g, '');
};

const timeOf = (iso) => {
    const d = iso ? new Date(iso) : null;
    return d && !isNaN(d) ? d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '';
};

// What each outcome looks like.
const LOOK = {
    admitted: { bg: 'bg-emerald-600', icon: CheckCircle2, title: 'Let them in', feedback: 'good' },
    already: { bg: 'bg-amber-400', fg: 'text-gray-950', icon: AlertTriangle, title: 'Already checked in', feedback: 'warn' },
    unpaid: { bg: 'bg-red-600', icon: XCircle, title: 'Payment not verified', feedback: 'bad' },
    pending: { bg: 'bg-red-600', icon: XCircle, title: 'Not approved yet', feedback: 'bad' },
    rejected: { bg: 'bg-red-600', icon: XCircle, title: 'Not valid', feedback: 'bad' },
    wrong_event: { bg: 'bg-red-600', icon: XCircle, title: 'Wrong event', feedback: 'bad' },
    not_found: { bg: 'bg-red-600', icon: XCircle, title: 'Code not found', feedback: 'bad' },
    offline: { bg: 'bg-sky-600', icon: WifiOff, title: 'No connection', feedback: 'info' },
    error: { bg: 'bg-zinc-700', icon: AlertTriangle, title: "Couldn't check", feedback: 'bad' },
};

const HINTS = {
    unpaid: 'Ask them to wait while someone verifies the payment in Ticketing.',
    pending: 'Their guestlist request is still waiting for approval.',
    not_found: 'Check the code, or find them by name on the check-in desk.',
    offline: "Saved on this phone and sent when you're back online.",
    error: 'Something went wrong. Try again in a moment.',
};

const recentTone = (reason) => (reason === 'admitted' ? 'bg-emerald-500' : reason === 'already' ? 'bg-amber-400' : reason === 'offline' ? 'bg-sky-500' : 'bg-red-500');

// ─────────────────────────────────────────────────────────────────────────────

const EventPicker = ({ events, onPick, onBack }) => {
    const [q, setQ] = useState('');
    const [showPast, setShowPast] = useState(false);
    const now = Date.now();
    const { soon, past } = useMemo(() => {
        const query = q.trim().toLowerCase();
        const list = events.filter(e => !query || [e.title, e.location].some(v => String(v || '').toLowerCase().includes(query)));
        const isPast = (e) => e.when && e.when.getTime() < now - 12 * HOUR;
        return {
            soon: list.filter(e => !isPast(e)).sort((a, b) => (a.when?.getTime() ?? Infinity) - (b.when?.getTime() ?? Infinity)),
            past: list.filter(isPast).sort((a, b) => b.when.getTime() - a.when.getTime()),
        };
    }, [events, q, now]);

    const row = (e) => {
        const today = e.when && Math.abs(e.when.getTime() - now) < 18 * HOUR;
        return (
            <li key={e.id}>
                <button type="button" onClick={() => onPick(e.id)} className="flex min-h-[72px] w-full items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3 text-left active:bg-white/[0.08]">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-teal-400/15 text-teal-300">
                        {e.image ? <img src={e.hubImage || e.image} alt="" className="h-full w-full object-cover" /> : e.isTicketed ? <ScanLine size={20} /> : <ListChecks size={20} />}
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-[16px] font-bold">{e.title || 'Untitled event'}</span>
                        <span className="mt-0.5 flex items-center gap-1.5 truncate text-[13px] text-zinc-400"><Calendar size={12} /> {formatEventDate(e.when)}</span>
                    </span>
                    {today && <span className="shrink-0 rounded-full bg-teal-400 px-2 py-0.5 text-[12px] font-bold text-black">Today</span>}
                    <ChevronRight size={18} className="shrink-0 text-zinc-500" />
                </button>
            </li>
        );
    };

    return (
        <div className="fixed inset-0 z-[500] flex h-dvh flex-col bg-[#07080b] font-heading text-white">
            <header className="flex shrink-0 items-center gap-2 border-b border-white/[0.08] px-3 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
                <button type="button" onClick={onBack} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.08]" aria-label="Back"><ArrowLeft size={20} /></button>
                <div className="min-w-0">
                    <h1 className="text-[18px] font-extrabold">Gate scanner</h1>
                    <p className="text-[13px] text-zinc-400">Pick the event you're checking in</p>
                </div>
            </header>
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4">
                <div className="mx-auto max-w-lg space-y-4">
                    <label className="relative block">
                        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events" type="search"
                            className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.05] pl-11 pr-4 text-[15px] font-semibold text-white outline-none placeholder:text-zinc-500 focus:border-teal-300/60" />
                    </label>
                    {soon.length === 0 && past.length === 0 ? (
                        <div className="py-16 text-center">
                            <p className="text-[16px] font-bold">No events to scan</p>
                            <p className="mt-1 text-[13px] text-zinc-400">Events with tickets or a guestlist show up here.</p>
                        </div>
                    ) : (
                        <>
                            <ul className="space-y-2">{soon.map(row)}</ul>
                            {soon.length === 0 && <p className="py-4 text-center text-[13px] text-zinc-400">Nothing coming up.</p>}
                            {past.length > 0 && (
                                <div>
                                    <button type="button" onClick={() => setShowPast(v => !v)} className="h-11 text-[14px] font-semibold text-zinc-400">
                                        {showPast ? 'Hide past events' : `Past events (${past.length})`}
                                    </button>
                                    {showPast && <ul className="space-y-2">{past.map(row)}</ul>}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────

const ResultScreen = ({ result, autoNext, onNext, onRetry }) => {
    const look = LOOK[result.reason] || LOOK.error;
    const Icon = look.icon;
    const d = result.data || {};
    const people = d.people || d.guestsCount || 1;
    const items = Array.isArray(d.items) ? d.items.filter(i => i.count > 0) : [];
    const timed = autoNext && result.reason === 'admitted';

    let detail = null;
    if (result.reason === 'admitted') detail = items.length ? items.map(i => `${i.count}× ${i.name}`).join(' · ') : d.type;
    else if (result.reason === 'already') detail = d.previousAt ? `First scanned at ${timeOf(d.previousAt)}` : 'This pass was used before.';
    else if (result.reason === 'offline') {
        detail = d.local === 'valid' ? `Looks valid for ${d.name}${people > 1 ? ` (${people} people)` : ''}. Only let them in if you're sure.`
            : d.local === 'used' ? `${d.name} was already checked in.`
                : d.local === 'invalid' ? `${d.name}'s pass isn't valid yet.`
                    : 'This code isn\'t in the list saved on this phone.';
    } else detail = result.message;

    return (
        <div className={cn('absolute inset-0 z-30 flex flex-col', look.bg, look.fg || 'text-white')} role="alert" aria-live="assertive">
            <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-6 pt-[env(safe-area-inset-top)] text-center">
                <Icon size={96} strokeWidth={2.2} />
                <h2 className="text-[34px] font-extrabold leading-tight">{look.title}</h2>
                {d.name && <p className="max-w-full break-words text-[26px] font-bold leading-snug">{d.name}</p>}
                {(result.reason === 'admitted' || result.reason === 'already' || (result.reason === 'offline' && d.local === 'valid')) && (
                    <p className="flex items-center gap-2 rounded-full bg-black/20 px-5 py-2 text-[22px] font-extrabold">
                        <Users size={22} /> {people === 1 ? '1 person' : `${people} people`}
                    </p>
                )}
                {detail && <p className="max-w-md text-[17px] font-semibold leading-snug opacity-90">{detail}</p>}
                {Array.isArray(d.plusOneNames) && d.plusOneNames.length > 0 && result.reason === 'admitted' && (
                    <p className="max-w-md text-[15px] opacity-90">With {d.plusOneNames.join(', ')}</p>
                )}
                {HINTS[result.reason] && <p className="max-w-md text-[15px] opacity-80">{HINTS[result.reason]}</p>}
                {d.code && <p className="font-mono text-[15px] opacity-75">{d.code}</p>}
            </div>
            <div className="shrink-0 space-y-2 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3">
                {timed && (
                    <div className="h-1.5 overflow-hidden rounded-full bg-black/20">
                        <div key={result.at} className="h-full origin-left animate-[nbscan-countdown_2.5s_linear_forwards] rounded-full bg-white" />
                    </div>
                )}
                {result.reason === 'error' && onRetry && (
                    <button type="button" onClick={onRetry} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-black/25 text-[17px] font-bold">
                        <RefreshCw size={18} /> Try again
                    </button>
                )}
                <button type="button" onClick={onNext} className="flex h-16 w-full items-center justify-center rounded-2xl bg-white text-[19px] font-extrabold text-black active:scale-[0.98]">
                    {timed ? 'Next (auto)' : 'Scan next'}
                </button>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────

const ScanScreen = ({ eventId, event, onChangeEvent, onBack, canOpenDesk, onOpenDesk }) => {
    const scanTicket = useStore(s => s.scanTicket);
    const ticketOrders = useStore(s => s.ticketOrders);
    const addToast = useStore(s => s.addToast);
    const { entries } = useGuestEntries(event?.guestlistIds, Boolean(event && hasGuestlist(event)));

    const [prefs, setPrefsState] = useState(() => ({ ...DEFAULT_PREFS, ...readJson('nb_scanner_prefs', {}) }));
    const setPref = (patch) => setPrefsState(p => { const n = { ...p, ...patch }; writeJson('nb_scanner_prefs', n); return n; });

    const [camOn, setCamOn] = useState(true);
    const [camState, setCamState] = useState('starting'); // starting | on | error
    const [camError, setCamError] = useState('');
    const [facing, setFacing] = useState('environment');
    const [restartKey, setRestartKey] = useState(0);
    const [torch, setTorch] = useState({ supported: false, on: false });
    const [result, setResult] = useState(null);
    const [checking, setChecking] = useState(false);
    const [manual, setManual] = useState('');
    const [recent, setRecent] = useState(() => readJson(`nb_scans_${eventId}`, []));
    const [queue, setQueue] = useState(() => readJson(`nb_scan_queue_${eventId}`, []));
    const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine !== false);
    const [panel, setPanel] = useState(null); // 'recent' | 'settings'

    const scannerRef = useRef(null);
    const busyRef = useRef(false);
    const lastRef = useRef({ code: '', at: 0 });
    const resultRef = useRef(null);
    const timerRef = useRef(null);
    const decodeRef = useRef(() => {});
    resultRef.current = result;

    // ── counts for the header ──
    const counts = useMemo(() => {
        let expected = 0;
        let inside = 0;
        (ticketOrders || []).forEach(o => {
            if (o.eventId !== event?.id || !SOLD_STATUSES.includes(o.status)) return;
            const n = orderTicketCount(o);
            expected += n;
            if (isOrderCheckedIn(o)) inside += n;
        });
        entries.forEach(e => {
            if (!isGuestAdmissible(e)) return;
            const n = Number(e.guestsCount) || 1;
            expected += n;
            if (e.attended) inside += n;
        });
        return { expected, inside };
    }, [ticketOrders, entries, event?.id]);

    // ── keep the screen awake while scanning ──
    useEffect(() => {
        let lock = null;
        const request = async () => {
            try { lock = await navigator.wakeLock?.request?.('screen'); } catch { /* not allowed */ }
        };
        request();
        const onVis = () => { if (document.visibilityState === 'visible') request(); };
        document.addEventListener('visibilitychange', onVis);
        return () => { document.removeEventListener('visibilitychange', onVis); try { lock?.release?.(); } catch { /* ignore */ } };
    }, []);

    // ── online / offline ──
    useEffect(() => {
        const up = () => setOnline(true);
        const down = () => setOnline(false);
        window.addEventListener('online', up);
        window.addEventListener('offline', down);
        return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
    }, []);

    // ── camera ──
    useEffect(() => {
        if (!camOn) return undefined;
        let cancelled = false;
        const stopInstance = async (s) => {
            if (!s) return;
            try { if (s.isScanning) await s.stop(); } catch { /* already stopped */ }
            try { s.clear(); } catch { /* element gone */ }
        };
        const start = async () => {
            setCamState('starting');
            setCamError('');
            setTorch({ supported: false, on: false });
            if (typeof window !== 'undefined' && !window.isSecureContext) {
                setCamState('error');
                setCamError('The camera only works on the secure (https) site. Type codes below instead.');
                return;
            }
            await new Promise(r => setTimeout(r, 60));
            if (cancelled || !document.getElementById('nb-reader')) return;
            let instance;
            try {
                instance = new Html5Qrcode('nb-reader', {
                    verbose: false,
                    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                    experimentalFeatures: { useBarCodeDetectorIfSupported: true },
                });
                scannerRef.current = instance;
                const cfg = { fps: 12, qrbox: (w, h) => { const s = Math.max(160, Math.floor(Math.min(w, h) * 0.72)); return { width: s, height: s }; } };
                const onDecode = (text) => decodeRef.current(text);
                try {
                    await instance.start({ facingMode: facing }, cfg, onDecode, () => {});
                } catch (first) {
                    if (cancelled) return;
                    if (/NotAllowed|Permission/i.test(String(first?.name || first))) throw first;
                    await instance.start({ facingMode: facing === 'environment' ? 'user' : 'environment' }, cfg, onDecode, () => {});
                }
                if (cancelled) { await stopInstance(instance); return; }
                setCamState('on');
                try {
                    const t = instance.getRunningTrackCameraCapabilities().torchFeature();
                    setTorch({ supported: t.isSupported(), on: false });
                } catch { /* no torch API */ }
            } catch (err) {
                if (cancelled) return;
                const text = `${err?.name || ''} ${err?.message || err}`;
                setCamState('error');
                setCamError(/NotAllowed|Permission/i.test(text)
                    ? 'Camera access is blocked. On iPhone: Settings → Safari → Camera → Allow, then reload. You can type codes below.'
                    : /NotFound|no camera|Requested device not found/i.test(text)
                        ? 'No camera found on this device. Type codes below instead.'
                        : "The camera couldn't start. Close other apps using it and tap Retry, or type codes below.");
            }
        };
        start();
        return () => {
            cancelled = true;
            const s = scannerRef.current;
            scannerRef.current = null;
            stopInstance(s);
        };
    }, [camOn, facing, restartKey]);

    const toggleTorch = async () => {
        try {
            const t = scannerRef.current?.getRunningTrackCameraCapabilities().torchFeature();
            if (!t?.isSupported()) return;
            await t.apply(!torch.on);
            setTorch(x => ({ ...x, on: !x.on }));
        } catch { addToast("The torch isn't available on this camera.", 'info'); }
    };

    // ── recent scans ──
    const addRecent = useCallback((entry) => {
        setRecent(prev => {
            const next = [entry, ...prev].slice(0, 40);
            writeJson(`nb_scans_${eventId}`, next);
            return next;
        });
    }, [eventId]);

    const saveQueue = (next) => { setQueue(next); writeJson(`nb_scan_queue_${eventId}`, next); };

    // ── checking a code ──
    const localLookup = useCallback((code) => {
        const ref = refFromCode(code);
        const order = (ticketOrders || []).find(o => o.eventId === event?.id && String(o.bookingRef || '').toUpperCase() === ref);
        if (order) {
            const sold = SOLD_STATUSES.includes(order.status);
            return { code: ref, name: order.customerName || 'Ticket holder', people: orderTicketCount(order), local: !sold ? 'invalid' : isOrderCheckedIn(order) ? 'used' : 'valid' };
        }
        const entry = entries.find(e => String(e.bookingRef || '').toUpperCase() === ref);
        if (entry) {
            return { code: ref, name: entry.customerName || entry.name || 'Guest', people: Number(entry.guestsCount) || 1, local: !isGuestAdmissible(entry) ? 'invalid' : entry.attended ? 'used' : 'valid' };
        }
        return { code: ref, local: 'unknown' };
    }, [ticketOrders, entries, event?.id]);

    const check = useCallback(async (code) => {
        const opts = { guestlistIds: event?.guestlistIds || [] };
        const attempt = (c) => withTimeout(scanTicket(event?.id || eventId, c, opts), 12000);
        let res = await attempt(code);
        // Typed codes without the "NB-" / "GL-" part.
        const bare = String(code).toUpperCase().replace(/[\s-]+/g, '');
        if (res?.reason === 'not_found' && /^[A-Z0-9]{3,12}$/.test(bare) && !/^(NB|GL)/.test(bare)) {
            res = await attempt(`NB-${bare}`);
            if (res?.reason === 'not_found') res = await attempt(`GL-${bare}`);
            if (res?.reason === 'not_found') res = { ...res, data: { code: bare } };
        }
        return res;
    }, [scanTicket, event?.id, event?.guestlistIds, eventId]);

    const clearResult = useCallback(() => {
        clearTimeout(timerRef.current);
        setResult(null);
    }, []);

    const show = useCallback((res) => {
        const look = LOOK[res.reason] || LOOK.error;
        scanFeedback(look.feedback, prefs);
        const at = Date.now();
        setResult({ ...res, at });
        clearTimeout(timerRef.current);
        if (res.reason === 'admitted' && prefs.autoNext) timerRef.current = setTimeout(() => setResult(null), 2500);
    }, [prefs]);

    const handleCode = useCallback(async (raw, via) => {
        const code = String(raw || '').trim();
        if (!code || busyRef.current || resultRef.current) return;
        const now = Date.now();
        // The camera reports the same QR many times a second; and right after a
        // result, the same pass is usually still in view.
        if (via === 'camera' && lastRef.current.code === code && now - lastRef.current.at < 5000) return;
        lastRef.current = { code, at: now };
        busyRef.current = true;
        setChecking(true);
        let res;
        try {
            if (typeof navigator !== 'undefined' && navigator.onLine === false) throw Object.assign(new Error('offline'), { network: true });
            res = await check(code);
        } catch (err) {
            if (isNetworkError(err)) {
                const local = localLookup(code);
                saveQueue([...readJson(`nb_scan_queue_${eventId}`, []).filter(q => q.code !== local.code), { code: local.code, at: new Date().toISOString() }]);
                res = { valid: false, reason: 'offline', data: local };
            } else {
                console.error('Scan failed:', err);
                res = { valid: false, reason: 'error', message: "Couldn't check this code.", data: { code: refFromCode(code) }, retry: code };
            }
        } finally {
            busyRef.current = false;
            setChecking(false);
        }
        show(res);
        addRecent({ code: res.data?.code || refFromCode(code), reason: res.reason, name: res.data?.name || '', people: res.data?.people || res.data?.guestsCount || null, at: new Date().toISOString(), via });
    }, [check, localLookup, show, addRecent, eventId]); // eslint-disable-line react-hooks/exhaustive-deps

    decodeRef.current = (text) => handleCode(text, 'camera');

    // ── send scans saved while offline ──
    const syncing = useRef(false);
    useEffect(() => {
        if (!online || !queue.length || syncing.current) return;
        syncing.current = true;
        (async () => {
            let done = 0;
            const left = [];
            for (const item of queue) {
                try {
                    const res = await withTimeout(scanTicket(event?.id || eventId, item.code, { guestlistIds: event?.guestlistIds || [] }), 12000);
                    done += 1;
                    addRecent({ code: res.data?.code || item.code, reason: res.reason, name: res.data?.name || '', people: res.data?.people || null, at: new Date().toISOString(), via: 'synced' });
                } catch (err) {
                    left.push(item);
                    if (isNetworkError(err)) break;
                }
            }
            const rest = [...left, ...queue.slice(done + left.length)];
            // Keep anything scanned offline while this was sending.
            const latest = readJson(`nb_scan_queue_${eventId}`, []);
            const added = latest.filter(x => !queue.some(q => q.code === x.code));
            saveQueue([...rest, ...added]);
            syncing.current = false;
            if (done) addToast(`${done} offline ${done === 1 ? 'scan' : 'scans'} sent. Check Recent for the results.`, 'success');
        })();
    }, [online, queue.length]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => () => clearTimeout(timerRef.current), []);

    const submitManual = (e) => {
        e.preventDefault();
        unlockScanAudio();
        const code = manual.trim();
        if (!code) return;
        lastRef.current = { code: '', at: 0 };
        // A new typed code replaces whatever result is showing.
        clearTimeout(timerRef.current);
        resultRef.current = null;
        setResult(null);
        handleCode(code, 'typed').then(() => setManual(''));
    };

    const lastScans = recent.slice(0, 3);

    return (
        <div className="fixed inset-0 z-[500] flex h-dvh flex-col bg-[#07080b] font-heading text-white" onPointerDown={unlockScanAudio}>
            {/* Top bar */}
            <header className="flex shrink-0 items-center gap-2 border-b border-white/[0.08] px-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
                <button type="button" onClick={onBack} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.08]" aria-label="Back"><ArrowLeft size={20} /></button>
                <button type="button" onClick={onChangeEvent} className="min-w-0 flex-1 rounded-xl px-1 text-left">
                    <span className="block truncate text-[16px] font-extrabold">{event?.title || 'Loading event…'}</span>
                    <span className="block truncate text-[12px] text-zinc-400">Tap to change event</span>
                </button>
                <div className="shrink-0 rounded-xl bg-teal-400/15 px-3 py-1.5 text-right">
                    <span className="block text-[18px] font-extrabold leading-none tabular-nums text-teal-300">{counts.inside}<span className="text-[13px] text-teal-300/70"> / {counts.expected}</span></span>
                    <span className="block text-[11px] font-semibold text-teal-300/80">in</span>
                </div>
                <button type="button" onClick={() => setPanel('settings')} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.08]" aria-label="Scanner settings"><Settings2 size={19} /></button>
            </header>

            {(!online || queue.length > 0) && (
                <div className={cn('flex shrink-0 items-center gap-2 px-4 py-2 text-[13px] font-semibold', online ? 'bg-sky-500/20 text-sky-200' : 'bg-amber-500/20 text-amber-200')}>
                    <WifiOff size={15} />
                    {online ? `Sending ${queue.length} saved ${queue.length === 1 ? 'scan' : 'scans'}…` : `Offline. Scans are saved on this phone${queue.length ? ` (${queue.length})` : ''}.`}
                </div>
            )}

            {/* Camera */}
            <div className="relative mx-auto w-full max-w-xl flex-1 overflow-hidden">
                <div className="absolute inset-0 bg-black">
                    {camOn && <div id="nb-reader" className="h-full w-full" />}
                </div>

                {camOn && camState !== 'error' && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="relative aspect-square w-[72%] max-w-[22rem]">
                            {['left-0 top-0 border-l-4 border-t-4 rounded-tl-3xl', 'right-0 top-0 border-r-4 border-t-4 rounded-tr-3xl', 'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-3xl', 'bottom-0 right-0 border-b-4 border-r-4 rounded-br-3xl'].map(c => (
                                <span key={c} className={cn('absolute h-12 w-12 border-teal-300', c)} />
                            ))}
                        </div>
                    </div>
                )}

                {camOn && camState === 'starting' && (
                    <p className="absolute inset-x-0 bottom-20 text-center text-[14px] font-semibold text-zinc-300">Starting camera…</p>
                )}

                {(!camOn || camState === 'error') && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
                        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.08] text-zinc-300"><CameraOff size={28} /></span>
                        <p className="max-w-xs text-[15px] leading-relaxed text-zinc-300">{camOn ? camError : 'Camera is off. Type codes below, or turn it back on.'}</p>
                        <button type="button" onClick={() => { setCamOn(true); setRestartKey(k => k + 1); }} className="flex h-12 items-center gap-2 rounded-2xl bg-teal-400 px-6 text-[15px] font-bold text-black">
                            <RefreshCw size={16} /> {camOn ? 'Retry camera' : 'Turn camera on'}
                        </button>
                    </div>
                )}

                {checking && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
                        <span className="h-14 w-14 animate-spin rounded-full border-4 border-teal-300 border-t-transparent" aria-label="Checking" />
                    </div>
                )}

                {camOn && camState === 'on' && (
                    <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
                        {torch.supported && (
                            <button type="button" onClick={toggleTorch} aria-pressed={torch.on} aria-label="Torch" className={cn('flex h-12 w-12 items-center justify-center rounded-full', torch.on ? 'bg-amber-300 text-black' : 'bg-black/60 text-white')}>
                                <Flashlight size={20} />
                            </button>
                        )}
                        <button type="button" onClick={() => setFacing(f => (f === 'environment' ? 'user' : 'environment'))} aria-label="Switch camera" className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white">
                            <SwitchCamera size={20} />
                        </button>
                    </div>
                )}

                {result && <ResultScreen result={result} autoNext={prefs.autoNext} onNext={clearResult} onRetry={result.retry ? () => { const c = result.retry; clearResult(); lastRef.current = { code: '', at: 0 }; setTimeout(() => handleCode(c, 'typed'), 0); } : undefined} />}
            </div>

            {/* Manual entry + recent */}
            <div className="mx-auto w-full max-w-xl shrink-0 space-y-3 border-t border-white/[0.08] px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
                <form onSubmit={submitManual} className="flex gap-2">
                    <input
                        value={manual}
                        onChange={(e) => setManual(e.target.value.toUpperCase())}
                        placeholder="Type a code, e.g. NB-7KQ2XM"
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck={false}
                        enterKeyHint="go"
                        className="h-14 min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.06] px-4 font-mono text-[17px] font-bold text-white outline-none placeholder:font-sans placeholder:text-[14px] placeholder:font-medium placeholder:text-zinc-500 focus:border-teal-300/60"
                    />
                    <button type="submit" disabled={!manual.trim() || checking} className="h-14 shrink-0 rounded-2xl bg-teal-400 px-5 text-[16px] font-extrabold text-black disabled:opacity-40">Check</button>
                </form>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setPanel('recent')} className="flex h-11 min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-xl bg-white/[0.05] px-3 text-left">
                        <History size={16} className="shrink-0 text-zinc-400" />
                        {lastScans.length ? (
                            <span className="flex min-w-0 items-center gap-2 overflow-hidden">
                                {lastScans.map((s, i) => (
                                    <span key={`${s.at}-${i}`} className="flex shrink-0 items-center gap-1.5 text-[13px] font-semibold">
                                        <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', recentTone(s.reason))} />
                                        <span className="max-w-[7rem] truncate">{s.name || s.code}</span>
                                    </span>
                                ))}
                            </span>
                        ) : <span className="text-[13px] text-zinc-400">Recent scans show here</span>}
                    </button>
                    {canOpenDesk && (
                        <button type="button" onClick={onOpenDesk} className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-white/[0.05] px-3 text-[13px] font-semibold text-zinc-200">
                            <Search size={15} /> Find by name
                        </button>
                    )}
                </div>
            </div>

            <Sheet open={panel === 'recent'} onClose={() => setPanel(null)} title="Recent scans" subtitle={`On this phone · ${recent.length}`} zIndex={SHEET_Z} size="sm">
                {recent.length === 0 ? (
                    <p className="py-8 text-center text-[14px] text-gray-500">Nothing scanned yet.</p>
                ) : (
                    <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
                        {recent.map((s, i) => (
                            <li key={`${s.at}-${i}`} className="flex items-center gap-3 py-3">
                                <span className={cn('h-3 w-3 shrink-0 rounded-full', recentTone(s.reason))} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[15px] font-bold">{s.name || s.code}</p>
                                    <p className="truncate text-[12px] text-gray-500">
                                        {(LOOK[s.reason] || LOOK.error).title}{s.people > 1 ? ` · ${s.people} people` : ''} · <span className="font-mono">{s.code}</span>{s.via === 'synced' ? ' · sent after reconnecting' : ''}
                                    </p>
                                </div>
                                <span className="shrink-0 text-[12px] tabular-nums text-gray-500">{timeOf(s.at)}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </Sheet>

            <Sheet open={panel === 'settings'} onClose={() => setPanel(null)} title="Scanner settings" zIndex={SHEET_Z} size="sm" bodyClassName="space-y-4">
                <Toggle label="Sound" hint="A beep for every result" checked={prefs.sound} onChange={(v) => { unlockScanAudio(); setPref({ sound: v }); }} />
                <Toggle label="Vibration" hint="Android phones; iPhones don't support it" checked={prefs.vibrate} onChange={(v) => setPref({ vibrate: v })} />
                <Toggle label="Move on by itself" hint="Valid scans clear after 2.5 seconds" checked={prefs.autoNext} onChange={(v) => setPref({ autoNext: v })} />
                <Toggle label="Camera" hint="Turn off to type codes only and save battery" checked={camOn} onChange={(v) => setCamOn(v)} />
                <div className="flex items-center gap-2 pt-2 text-[13px] text-gray-500">
                    {prefs.sound ? <Volume2 size={15} /> : <VolumeX size={15} />}
                    Scans made without signal are saved on this phone and sent when it reconnects.
                </div>
            </Sheet>

            <style>{`
                #nb-reader { position: relative; width: 100% !important; height: 100% !important; border: none !important; }
                #nb-reader video { position: absolute !important; inset: 0; width: 100% !important; height: 100% !important; object-fit: cover !important; }
                #nb-reader img, #nb-reader__dashboard, #nb-reader__header_message, #nb-reader #qr-shaded-region { display: none !important; }
                @keyframes nbscan-countdown { from { transform: scaleX(1); } to { transform: scaleX(0); } }
            `}</style>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────

const EventScanner = () => {
    useStoreSubscription(['upcomingEvents', 'portfolio', 'guestlists', 'volunteerGigs', 'ticketOrders']);
    const user = useStore(s => s.user);
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const eventId = params.get('eventId') || '';
    const events = useOperationalEvents();
    const event = events.find(e => e.id === eventId) || events.find(e => e.guestlistIds?.includes(eventId)) || null;
    const isScannerRole = user?.role === 'scanner';

    const goBack = () => {
        if (eventId && !isScannerRole) navigate(`/admin/ticketing?eventId=${encodeURIComponent(event?.id || eventId)}&tab=checkin`);
        else navigate(isScannerRole ? '/' : '/admin');
    };

    if (!eventId) {
        return <EventPicker events={events} onPick={(id) => { unlockScanAudio(); setParams({ eventId: id }); }} onBack={() => navigate(isScannerRole ? '/' : '/admin/ticketing')} />;
    }

    return (
        <ScanScreen
            key={eventId}
            eventId={eventId}
            event={event}
            onBack={goBack}
            onChangeEvent={() => setParams({})}
            canOpenDesk
            onOpenDesk={() => navigate(`/admin/ticketing?eventId=${encodeURIComponent(event?.id || eventId)}&tab=checkin`)}
        />
    );
};

export default EventScanner;
