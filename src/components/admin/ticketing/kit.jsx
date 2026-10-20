import React, { useCallback, useRef, useState } from 'react';
import Phone from 'lucide-react/dist/esm/icons/phone';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Check from 'lucide-react/dist/esm/icons/check';
import Sheet from '../Sheet';
import { Button } from '../ui';
import { accent } from '../theme';
import { cn } from '../../../lib/utils';
import { useStore } from '../../../lib/store';
import { copyToClipboard } from '../../../lib/clipboard';

/* Small pieces shared by the ticketing panels and the guestlist screens. */

/** Our own errors read well; Firebase/network ones get a plain sentence. */
export const friendlyError = (err) => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return "You're offline. Check your connection and try again.";
    if (err?.message && !err.code && err.message.length < 140) return err.message;
    return "That didn't go through. Please try again.";
};

export const panelCls = 'rounded-2xl border border-black/[0.06] bg-white dark:border-white/[0.08] dark:bg-white/[0.03]';

export const Panel = ({ className, children, ...rest }) => (
    <div className={cn(panelCls, className)} {...rest}>{children}</div>
);

export const PanelTitle = ({ title, hint, action, icon: Icon, tone }) => (
    <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
            {Icon && (
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', accent(tone || 'gray').chip)}>
                    <Icon size={16} />
                </span>
            )}
            <div className="min-w-0">
                <h3 className="text-[15px] font-bold">{title}</h3>
                {hint && <p className="text-[12px] text-gray-500 dark:text-zinc-400">{hint}</p>}
            </div>
        </div>
        {action}
    </div>
);

/** Coloured progress bar; `segments` = [{ value, tone }] stacked left to right. */
export const Meter = ({ segments, max, className, label }) => {
    const total = Math.max(1, max || segments.reduce((a, s) => a + (s.value || 0), 0));
    return (
        <div className={cn('flex h-2 gap-[2px] overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.07]', className)} role="img" aria-label={label}>
            {segments.map((s, i) => {
                const pct = Math.min(100, ((s.value || 0) / total) * 100);
                return pct > 0 ? <div key={i} className={cn('h-full rounded-full transition-[width] duration-500', accent(s.tone).dot)} style={{ width: `${pct}%` }} /> : null;
            })}
        </div>
    );
};

export const ContactLinks = ({ phone, email, className }) => (
    <div className={cn('flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-gray-500 dark:text-zinc-400', className)}>
        {phone && (
            <a href={`tel:${String(phone).replace(/\s/g, '')}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white">
                <Phone size={11} />{phone}
            </a>
        )}
        {email && (
            <a href={`mailto:${email}`} onClick={(e) => e.stopPropagation()} className="inline-flex min-w-0 items-center gap-1 hover:text-gray-900 dark:hover:text-white">
                <Mail size={11} /><span className="truncate">{email}</span>
            </a>
        )}
    </div>
);

/** A mono code (booking ref, UTR) that copies on tap. */
export const CopyChip = ({ text, label, prefix, className }) => {
    const [done, setDone] = useState(false);
    if (!text) return null;
    const copy = async (e) => {
        e.stopPropagation();
        const ok = await copyToClipboard(text);
        useStore.getState().addToast(ok ? `${label || 'Code'} copied.` : 'Select it and copy it by hand.', ok ? 'success' : 'error', ok ? undefined : { title: "Couldn't copy" });
        if (ok) { setDone(true); setTimeout(() => setDone(false), 1500); }
    };
    return (
        <button
            type="button"
            onClick={copy}
            className={cn('inline-flex h-8 max-w-full items-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-2.5 font-mono text-[12px] font-bold text-gray-800 hover:border-black/20 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-zinc-200 dark:hover:border-white/25', className)}
            aria-label={`Copy ${label || 'code'}`}
        >
            {prefix && <span className="font-sans font-semibold text-gray-500">{prefix}</span>}
            <span className="truncate">{text}</span>
            {done ? <Check size={11} className="shrink-0 text-emerald-600 dark:text-neon-green" /> : <Copy size={11} className="shrink-0 text-gray-400" />}
        </button>
    );
};

/** Checkbox sized for thumbs. */
export const SelectBox = ({ checked, onChange, label, className }) => (
    <label className={cn('flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center', className)} onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" className="h-[18px] w-[18px] cursor-pointer rounded accent-orange-500" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
    </label>
);

/**
 * Confirm dialogs that run the action themselves: the button shows progress,
 * a failure stays on screen with the reason, success closes it.
 *   const [ask, confirmSheet] = useConfirm();
 *   ask({ title, body, confirmLabel, danger, action: async () => {...} })
 */
export const useConfirm = () => {
    const [state, setState] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const lock = useRef(false);

    const ask = useCallback((opts) => { setError(''); setState(opts); }, []);
    const close = () => { if (!lock.current) setState(null); };

    const run = async () => {
        if (!state || lock.current) return;
        lock.current = true;
        setBusy(true);
        setError('');
        try {
            await state.action?.();
            lock.current = false;
            setState(null);
        } catch (err) {
            console.error(err);
            setError(friendlyError(err));
            lock.current = false;
        } finally {
            setBusy(false);
        }
    };

    const element = (
        <Sheet
            open={Boolean(state)}
            onClose={close}
            variant="dialog"
            size="sm"
            title={state?.title}
            zIndex={400}
            footer={(
                <div className="flex gap-2">
                    <Button variant="secondary" className="h-12 flex-1" onClick={close} disabled={busy}>{state?.cancelLabel || 'Cancel'}</Button>
                    <Button variant={state?.danger ? 'danger' : 'accent'} className="h-12 flex-[1.4]" onClick={run} disabled={busy}>
                        {busy ? (state?.busyLabel || 'Working…') : (state?.confirmLabel || 'Confirm')}
                    </Button>
                </div>
            )}
        >
            <div className="space-y-3 text-[14px] leading-relaxed text-gray-600 dark:text-zinc-300">
                {typeof state?.body === 'string' ? <p>{state.body}</p> : state?.body}
                {error && <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-[13px] font-semibold text-red-600 dark:text-red-300">{error}</p>}
            </div>
        </Sheet>
    );

    return [ask, element];
};

/** Runs async work per row id, so buttons can show progress and ignore double taps. */
export const useBusy = () => {
    const [busy, setBusy] = useState({});
    const running = useRef(new Set());
    const run = useCallback(async (id, label, fn, { errorMessage, errorTitle } = {}) => {
        if (running.current.has(id)) return undefined;
        running.current.add(id);
        setBusy(b => ({ ...b, [id]: label }));
        try {
            return await fn();
        } catch (err) {
            console.error(err);
            useStore.getState().addToast(errorMessage || friendlyError(err), 'error', errorTitle ? { title: errorTitle } : undefined);
            return undefined;
        } finally {
            running.current.delete(id);
            setBusy(b => { const n = { ...b }; delete n[id]; return n; });
        }
    }, []);
    return [busy, run];
};
