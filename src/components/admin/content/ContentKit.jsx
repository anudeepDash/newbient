import React, { useCallback, useRef, useState } from 'react';
import Upload from 'lucide-react/dist/esm/icons/upload';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import Radio from 'lucide-react/dist/esm/icons/radio';
import PenSquare from 'lucide-react/dist/esm/icons/pen-square';
import Music from 'lucide-react/dist/esm/icons/music';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import { cn } from '../../../lib/utils';
import { useStore } from '../../../lib/store';
import Sheet from '../Sheet';
import { Button } from '../ui';
import { fieldCls } from '../uploads/UploadKit';
import { imageProblem, MAX_IMAGE_MB } from './contentRules';

/* Pieces shared by the Content screens (site content, announcements, blog, portfolio). */

export const CONTENT_TABS = [
    { name: 'Site content', path: '/admin/content', icon: LayoutGrid },
    { name: 'Announcements', path: '/admin/announcements', icon: Radio },
    { name: 'Blog', path: '/admin/blog', icon: PenSquare },
    { name: 'Portfolio', path: '/admin/concertzone', icon: Music },
];

/** Small centred confirm. `tone="danger"` for deletes. */
export const ConfirmSheet = ({ open, onClose, title, children, confirmLabel = 'Confirm', tone = 'danger', busy, onConfirm, disabled }) => (
    <Sheet
        open={open}
        onClose={busy ? () => {} : onClose}
        variant="dialog"
        size="sm"
        title={title}
        zIndex={420}
        footer={(
            <div className="flex gap-2">
                <Button variant="secondary" onClick={onClose} disabled={busy} className="h-12 flex-1">Cancel</Button>
                <Button variant={tone === 'danger' ? 'danger' : 'accent'} onClick={onConfirm} disabled={busy || disabled} className="h-12 flex-1">
                    {busy ? 'Working…' : confirmLabel}
                </Button>
            </div>
        )}
    >
        <div className="flex gap-3">
            {tone === 'danger' && (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400"><AlertTriangle size={18} /></span>
            )}
            <div className="min-w-0 flex-1 space-y-3 text-[14px] leading-relaxed text-gray-600 dark:text-zinc-300">{children}</div>
        </div>
    </Sheet>
);

/** Text count against a soft limit: grey, amber near it, red over. */
export const CharCount = ({ value, ideal, max }) => {
    const n = String(value || '').length;
    const tone = n > max ? 'text-red-600 dark:text-red-400' : n >= ideal ? 'text-emerald-600 dark:text-neon-green' : 'text-gray-400';
    return <span className={cn('text-[11px] font-semibold tabular-nums', tone)}>{n}/{max}</span>;
};

/** Label row with an optional counter on the right. */
export const LabelRow = ({ label, optional, right }) => (
    <span className="mb-1 flex items-center justify-between gap-2 text-[12px] font-bold text-gray-500">
        <span>{label}{optional && <span className="font-medium"> (optional)</span>}</span>
        {right}
    </span>
);

const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dgtalrz4n';
const PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'maw1e4ud';

/**
 * Upload an image with progress. Uses Cloudinary directly (so we can report
 * progress), and falls back to the store's uploader (which can also use
 * Firebase Storage) if that fails. Resolves to the hosted URL.
 */
export const uploadImageWithProgress = (file, onProgress) => new Promise((resolve, reject) => {
    const problem = imageProblem(file);
    if (problem) { reject(new Error(problem)); return; }
    const fallback = async () => {
        try {
            onProgress?.(60);
            const result = await useStore.getState().uploadToCloudinary(file);
            const url = typeof result === 'string' ? result : result?.url;
            if (!url) throw new Error('Upload failed');
            onProgress?.(100);
            resolve(url);
        } catch (err) {
            reject(err);
        }
    };
    try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`);
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(Math.min(95, Math.round((e.loaded / e.total) * 95))); };
        xhr.onload = () => {
            try {
                const json = JSON.parse(xhr.responseText || '{}');
                if (xhr.status >= 200 && xhr.status < 300 && json.secure_url) {
                    onProgress?.(100);
                    resolve(json.secure_url);
                } else {
                    fallback();
                }
            } catch {
                fallback();
            }
        };
        xhr.onerror = () => fallback();
        const data = new FormData();
        data.append('file', file);
        data.append('upload_preset', PRESET);
        xhr.send(data);
    } catch {
        fallback();
    }
});

/** Upload state for one image slot: { busy, percent, error, upload(file) }. */
export const useImageUpload = (onDone) => {
    const [state, setState] = useState({ busy: false, percent: 0, error: '' });
    const token = useRef(0);
    const upload = useCallback(async (file) => {
        const problem = imageProblem(file);
        if (problem) { setState({ busy: false, percent: 0, error: problem }); return null; }
        const mine = ++token.current;
        setState({ busy: true, percent: 2, error: '' });
        try {
            const url = await uploadImageWithProgress(file, (p) => { if (mine === token.current) setState(s => ({ ...s, percent: p })); });
            if (mine !== token.current) return null;
            setState({ busy: false, percent: 100, error: '' });
            onDone?.(url);
            return url;
        } catch (err) {
            if (mine !== token.current) return null;
            console.error('Image upload failed:', err);
            setState({ busy: false, percent: 0, error: err?.message && err.message.length < 120 ? err.message : "Couldn't upload the image. Check your connection and try again." });
            return null;
        }
    }, [onDone]);
    const reset = useCallback(() => { token.current++; setState({ busy: false, percent: 0, error: '' }); }, []);
    return { ...state, upload, reset };
};

/** Pull an image out of a paste event, if there is one. */
export const imageFromPaste = (e) => {
    const items = e.clipboardData?.items || [];
    for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file' && items[i].type.startsWith('image/')) return items[i].getAsFile();
    }
    return null;
};

/**
 * An image slot: tap to upload, drop, paste, or paste a link. Shows upload
 * progress, the size limit and any failure. `children` renders over the
 * preview (framing guides etc.).
 */
export const ImagePicker = ({ label, hint, value, onChange, aspect = 'aspect-video', contain, imgStyle, imgClassName, optional, children }) => {
    const uploader = useImageUpload(onChange);
    const [dragging, setDragging] = useState(false);
    const onPaste = (e) => {
        const file = imageFromPaste(e);
        if (file) { e.preventDefault(); uploader.upload(file); }
    };
    return (
        <div className="space-y-2" onPaste={onPaste}>
            {(label || value) && (
                <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-bold text-gray-500">{label}{optional && <span className="font-medium"> (optional)</span>}</span>
                    {value && !uploader.busy && <button type="button" onClick={() => { uploader.reset(); onChange(''); }} className="h-8 text-[12px] font-semibold text-red-500">Remove</button>}
                </div>
            )}
            <label
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) uploader.upload(f); }}
                className={cn('relative block cursor-pointer overflow-hidden rounded-xl border bg-gray-50 transition-colors dark:bg-white/[0.04]', aspect,
                    dragging ? 'border-2 border-dashed border-emerald-500 dark:border-neon-green' : 'border-black/10 dark:border-white/10')}
            >
                {value ? (
                    <img src={value} alt="" className={cn('h-full w-full', contain ? 'object-contain' : 'object-cover', imgClassName)} style={imgStyle} />
                ) : (
                    <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center text-gray-500">
                        <Upload size={20} />
                        <span className="text-[13px] font-semibold">Upload, drop or paste an image</span>
                        <span className="text-[11px]">{hint || `JPG, PNG or WebP · up to ${MAX_IMAGE_MB} MB`}</span>
                    </span>
                )}
                {value && children}
                {uploader.busy && (
                    <span className="absolute inset-x-0 bottom-0 bg-white/90 px-3 py-2 dark:bg-black/80">
                        <span className="mb-1 flex justify-between text-[11px] font-semibold text-gray-600 dark:text-zinc-300"><span>Uploading…</span><span className="tabular-nums">{uploader.percent}%</span></span>
                        <span className="block h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                            <span className="block h-full rounded-full bg-emerald-500 transition-[width] dark:bg-neon-green" style={{ width: `${uploader.percent}%` }} />
                        </span>
                    </span>
                )}
                <input type="file" accept="image/*" disabled={uploader.busy} className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) uploader.upload(f); }} />
            </label>
            {uploader.error && <p role="alert" className="text-[12px] font-semibold text-red-600 dark:text-red-400">{uploader.error}</p>}
            <input
                className={cn(fieldCls, 'h-11 text-[13px] font-medium')}
                placeholder="…or paste an image link"
                value={value && !value.startsWith('data:') ? value : ''}
                onChange={(e) => { uploader.reset(); onChange(e.target.value.trim()); }}
                inputMode="url"
                autoCapitalize="off"
                autoCorrect="off"
            />
        </div>
    );
};

export const Slider = ({ label, value, min, max, step, onChange, format = (v) => v }) => (
    <label className="block">
        <span className="mb-1 flex justify-between text-[12px] font-semibold text-gray-500">
            <span>{label}</span>
            <span className="tabular-nums">{format(value)}</span>
        </span>
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="h-8 w-full cursor-pointer accent-emerald-500" />
    </label>
);

/** Zoom / left-right / up-down for the { scale, x, y } image transform used on cards. */
export const FramingControls = ({ value, onChange }) => {
    const t = value || { scale: 1, x: 0, y: 0 };
    return (
        <div className="space-y-2 rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.03]">
            <Slider label="Zoom" value={Number((t.scale ?? 1).toFixed(2))} min={0.5} max={3} step={0.01} format={(v) => `${v}×`} onChange={(v) => onChange({ ...t, scale: v })} />
            <Slider label="Left / right" value={t.x || 0} min={-100} max={100} step={1} format={(v) => `${v}%`} onChange={(v) => onChange({ ...t, x: v })} />
            <Slider label="Up / down" value={t.y || 0} min={-100} max={100} step={1} format={(v) => `${v}%`} onChange={(v) => onChange({ ...t, y: v })} />
            <button type="button" onClick={() => onChange({ scale: 1, x: 0, y: 0 })} className="flex h-8 items-center gap-1 text-[12px] font-semibold text-gray-500"><RotateCcw size={12} /> Reset framing</button>
        </div>
    );
};

/** Background-image style for the { scale, x, y } transform (same maths as the public cards). */
export const framedBackground = (image, t) => ({
    backgroundImage: image ? `url(${image})` : undefined,
    transform: `scale(${t?.scale || 1})`,
    backgroundPosition: `calc(50% + ${t?.x || 0}%) calc(50% + ${t?.y || 0}%)`,
    backgroundSize: 'cover',
});
