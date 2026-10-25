import React, { useCallback, useEffect, useRef, useState } from 'react';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import Sheet from '../Sheet';
import { Button } from '../ui';
import { cn } from '../../../lib/utils';
import { useStore } from '../../../lib/store';
import { PosterGlow, usePosterColor, usePosterPalette } from '../../app/AmbientBackdrop';
import { AMBIENT_OFF, cleanAmbient, hslToHex } from '../../../lib/ambientColor';

/*
 * Small pieces shared by the community modules (forms, volunteer gigs,
 * giveaways): a promise-based confirm sheet, the editor's sticky top bar and
 * phone save bar, image upload state and date helpers.
 */

/** A centred confirm. Resolves true/false. */
export const useConfirm = () => {
    const [state, setState] = useState(null);
    const resolver = useRef(null);

    const confirm = useCallback((opts) => new Promise((resolve) => {
        resolver.current = resolve;
        setState(typeof opts === 'string' ? { title: opts } : opts);
    }), []);

    const close = (value) => {
        resolver.current?.(value);
        resolver.current = null;
        setState(null);
    };

    const element = (
        <Sheet
            open={Boolean(state)}
            onClose={() => close(false)}
            variant="dialog"
            size="sm"
            zIndex={400}
            title={state?.title}
            footer={(
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => close(false)} className="h-12 flex-1">{state?.cancelLabel || 'Cancel'}</Button>
                    <Button variant={state?.tone === 'primary' ? 'primary' : state?.tone === 'accent' ? 'accent' : 'danger'} onClick={() => close(true)} className="h-12 flex-1">
                        {state?.confirmLabel || 'Delete'}
                    </Button>
                </div>
            )}
        >
            {state?.body && <div className="text-[14px] leading-relaxed text-gray-600 dark:text-zinc-300">{state.body}</div>}
        </Sheet>
    );

    return [confirm, element];
};

/** Sticky bar at the top of a full-page editor. */
export const EditorBar = ({ backLabel, onBack, title, children }) => (
    <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30 -mx-4 mb-5 flex items-center gap-2 border-b border-black/[0.06] bg-white/90 px-4 py-3 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#0a0b10]/90 sm:-mx-6 sm:px-6 lg:top-0">
        <button type="button" onClick={onBack} className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-2 text-[13px] font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white">
            <ChevronLeft size={16} /> {backLabel}
        </button>
        <p className="min-w-0 flex-1 truncate text-[15px] font-bold">{title}</p>
        {children}
    </div>
);

/** Fixed save bar on phones (sits above the admin's bottom tab bar). */
export const PhoneBar = ({ children }) => (
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 border-t border-black/[0.06] bg-white/95 px-4 py-3 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#0a0b10]/95 sm:hidden">
        <div className="flex gap-2">{children}</div>
    </div>
);

/** Warn before closing the tab with unsaved changes. */
export const useUnsavedWarning = (dirty) => {
    useEffect(() => {
        if (!dirty) return undefined;
        const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [dirty]);
};

/**
 * An image field that uploads straight away (file pick or paste) and keeps
 * the URL. Returns props for ImageSlot plus `uploading`.
 */
export const useImageField = (value, onChange) => {
    const [uploading, setUploading] = useState(false);
    const upload = async (file) => {
        if (!file) return;
        if (!file.type?.startsWith('image/')) {
            useStore.getState().addToast('Pick an image file, like a JPG or PNG.', 'warning');
            return;
        }
        if (file.size > 15 * 1024 * 1024) {
            useStore.getState().addToast('Use an image under 15 MB.', 'warning', { title: 'That image is too big' });
            return;
        }
        setUploading(true);
        try {
            const url = await useStore.getState().uploadToCloudinary(file);
            if (!url) throw new Error('No URL');
            onChange(url);
        } catch (err) {
            console.error(err);
            useStore.getState().addToast('Check your connection and try again.', 'error', { title: "Couldn't upload the image", action: { label: 'Try again', onClick: () => upload(file) } });
        } finally {
            setUploading(false);
        }
    };
    const onPaste = (e) => {
        const item = Array.from(e.clipboardData?.items || []).find(i => i.kind === 'file' && i.type.startsWith('image/'));
        if (!item) return;
        e.preventDefault();
        upload(item.getAsFile());
    };
    return {
        uploading,
        slotProps: {
            previewUrl: value || '',
            url: value || '',
            onFile: upload,
            onUrl: (v) => onChange(v.trim()),
            onClear: () => onChange(''),
            onPaste,
        },
    };
};

// ── Dates ────────────────────────────────────────────────────────────────

/** Firestore Timestamp, ISO string or a bare "YYYY-MM-DD" (read as a local day). */
export const toDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    if (typeof value?.toDate === 'function') return value.toDate();
    if (typeof value === 'object' && typeof value.seconds === 'number') return new Date(value.seconds * 1000);
    const s = String(value);
    const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00`) : new Date(s);
    return isNaN(d.getTime()) ? null : d;
};

export const formatDay = (value, withYear = true) => {
    const d = toDate(value);
    return d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) }) : '';
};

export const formatDateTime = (value) => {
    const d = toDate(value);
    return d ? d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
};

export const timeAgo = (value) => {
    const d = toDate(value);
    if (!d) return '';
    const s = Math.round((Date.now() - d.getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
    return formatDay(d);
};

/** Today as YYYY-MM-DD in local time. */
export const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** A local "YYYY-MM-DD" from any stored date (Timestamp, ISO or plain). */
export const dayKeyOf = (value) => {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) && !value.includes('Z')) return value.slice(0, 10);
    const d = toDate(value);
    if (!d) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const slugify = (text) => String(text || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

/** A row of colour dots for the card highlight colour. */
export const COLOR_PRESETS = [
    { name: 'Neon green', value: '#39FF14' },
    { name: 'Neon pink', value: '#FF4F8B' },
    { name: 'Electric purple', value: '#BF00FF' },
    { name: 'Cyber blue', value: '#2ebfff' },
    { name: 'Sunset orange', value: '#FF7A1A' },
    { name: 'Gold', value: '#FACC15' },
];

export const ColorDots = ({ value, onChange }) => (
    <div className="flex flex-wrap items-center gap-2.5">
        {COLOR_PRESETS.map(c => (
            <button
                key={c.value}
                type="button"
                onClick={() => onChange(c.value)}
                aria-label={c.name}
                aria-pressed={value?.toLowerCase() === c.value.toLowerCase()}
                title={c.name}
                className={cn('h-10 w-10 rounded-full border-2 transition-transform active:scale-95',
                    value?.toLowerCase() === c.value.toLowerCase() ? 'border-gray-900 dark:border-white' : 'border-transparent')}
            >
                <span className="block h-full w-full rounded-full border-2 border-white dark:border-[#0d0f15]" style={{ backgroundColor: c.value }} />
            </button>
        ))}
        <label className="flex h-10 items-center gap-2 rounded-full border border-black/10 pl-1 pr-3 text-[12px] font-semibold text-gray-500 dark:border-white/10">
            <input type="color" value={value || '#39FF14'} onChange={(e) => onChange(e.target.value)} className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0" />
            Custom
        </label>
    </div>
);

/*
 * The glow colour behind the picture on the app's cards and popups
 * (`ambientColor`, lib/ambientColor.js). Auto samples the picture, which can
 * pick the wrong colour; here it can be set to one of the picture's own
 * colours, any colour, or turned off. A small card shows the result.
 */
export const AmbientColorField = ({ image, value, onChange, label = 'Glow colour', className }) => {
    const chosen = cleanAmbient(value);
    const auto = usePosterColor(image);
    const autoHex = auto ? hslToHex(auto) : null;
    const fromPoster = [...new Set(usePosterPalette(image).map(hslToHex))];
    const pill = (active) => cn('flex h-10 items-center gap-2 rounded-full border px-3 text-[12px] font-semibold transition-colors active:scale-95',
        active ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white' : 'border-black/10 text-gray-500 dark:border-white/10 dark:text-zinc-400');
    const dot = (hex, active) => (
        <button
            key={hex}
            type="button"
            onClick={() => onChange(hex)}
            aria-label={`Glow ${hex}`}
            aria-pressed={active}
            title={hex}
            className={cn('h-10 w-10 rounded-full border-2 transition-transform active:scale-95', active ? 'border-gray-900 dark:border-white' : 'border-transparent')}
        >
            <span className="block h-full w-full rounded-full border-2 border-white dark:border-[#0d0f15]" style={{ backgroundColor: hex }} />
        </button>
    );
    return (
        <div className={cn('space-y-2', className)}>
            <p className="text-[12px] font-bold text-gray-500">{label}</p>
            <div className="flex flex-wrap items-start gap-4">
                {/* What the card will look like: the picture with its glow spilling under it. */}
                <div aria-hidden="true" className="relative isolate w-36 shrink-0 overflow-hidden rounded-2xl border border-black/[0.08] bg-white pb-8 dark:border-white/[0.08] dark:bg-[#101219]">
                    <PosterGlow image={image} color={chosen} height="140%" strength={0.85} />
                    <div className="aspect-video w-full" style={{ WebkitMaskImage: 'linear-gradient(to bottom, #000 62%, transparent 100%)', maskImage: 'linear-gradient(to bottom, #000 62%, transparent 100%)' }}>
                        {image && <img src={image} alt="" className="h-full w-full object-cover" />}
                    </div>
                </div>
                <div className="min-w-0 flex-1 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <button type="button" onClick={() => onChange('')} aria-pressed={!chosen} className={pill(!chosen)}>
                            <span className="h-4 w-4 rounded-full border border-black/10 dark:border-white/15" style={{ background: autoHex || 'conic-gradient(#f43f5e, #f59e0b, #22c55e, #3b82f6, #a855f7, #f43f5e)' }} />
                            Auto
                        </button>
                        <button type="button" onClick={() => onChange(AMBIENT_OFF)} aria-pressed={chosen === AMBIENT_OFF} className={pill(chosen === AMBIENT_OFF)}>
                            Off
                        </button>
                        <label className={cn(pill(Boolean(chosen) && chosen !== AMBIENT_OFF && !fromPoster.includes(chosen)), 'cursor-pointer pl-1')}>
                            <input
                                type="color"
                                value={chosen && chosen !== AMBIENT_OFF ? chosen : autoHex || '#39ff14'}
                                onChange={(e) => onChange(e.target.value.toLowerCase())}
                                className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0"
                            />
                            Custom
                        </label>
                    </div>
                    {fromPoster.length > 0 && (
                        <div>
                            <p className="mb-1.5 text-[11px] font-semibold text-gray-400 dark:text-zinc-500">From the picture</p>
                            <div className="flex flex-wrap items-center gap-2">{fromPoster.map(hex => dot(hex, chosen === hex))}</div>
                        </div>
                    )}
                    <p className="text-[12px] text-gray-400 dark:text-zinc-500">
                        The soft light behind the picture on app cards and popups. Auto takes it from the picture; pick one if it looks wrong.
                    </p>
                </div>
            </div>
        </div>
    );
};

/** A labelled row for detail sheets. */
export const InfoRow = ({ label, children, className }) => (
    <div className={cn('min-w-0', className)}>
        <p className="text-[12px] font-bold text-gray-500">{label}</p>
        <div className="mt-0.5 break-words text-[14px] font-medium text-gray-900 dark:text-white">{children || <span className="text-gray-400">—</span>}</div>
    </div>
);

/** Section wrapper used inside sheets. */
export const SheetSection = ({ title, action, children, className }) => (
    <section className={cn('rounded-2xl border border-black/[0.06] bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.03]', className)}>
        {(title || action) && (
            <div className="mb-3 flex items-center justify-between gap-3">
                {title && <h3 className="text-[15px] font-bold">{title}</h3>}
                {action}
            </div>
        )}
        {children}
    </section>
);

/** Selection checkbox with a 40px tap target. */
export const SelectBox = ({ checked, onChange, label, className }) => (
    <label className={cn('relative z-10 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center', className)} onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} className="h-[18px] w-[18px] cursor-pointer rounded accent-emerald-500" />
    </label>
);

/** Bar shown while rows are selected. */
export const BulkBar = ({ count, onClear, children }) => (
    <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 flex flex-wrap items-center gap-2 rounded-2xl border border-black/10 bg-white/95 p-2 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-[#11131a]/95 sm:bottom-4">
        <span className="px-2 text-[13px] font-bold">{count} selected</span>
        <button type="button" onClick={onClear} className="h-10 rounded-xl px-3 text-[13px] font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white">Clear</button>
        <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>
    </div>
);
