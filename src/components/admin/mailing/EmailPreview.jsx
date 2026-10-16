import React, { useEffect, useRef, useState } from 'react';
import Monitor from 'lucide-react/dist/esm/icons/monitor';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import Sun from 'lucide-react/dist/esm/icons/sun';
import Moon from 'lucide-react/dist/esm/icons/moon';
import { cn } from '../../../lib/utils';
import { Avatar } from '../ui';

/*
 * The real email (from lib/email.js) in a desktop or phone frame, with the
 * inbox line above it: sender, subject and the preview text people see before
 * opening. `theme` / `onThemeChange` switch the email between light and dark.
 */

/**
 * Sandboxed frame that always fits its content: it re-measures when images
 * load, when the frame is resized, and when it becomes visible again (a hidden
 * frame measures 0, which is why a plain one-off measure isn't enough).
 */
export const EmailFrame = ({ html, title = 'Email preview' }) => {
    const ref = useRef(null);
    const [height, setHeight] = useState(320);
    useEffect(() => {
        const frame = ref.current;
        if (!frame) return undefined;
        let observer;
        const measure = () => {
            const docEl = frame.contentDocument?.documentElement;
            if (!docEl || !frame.offsetParent) return;
            const h = Math.max(docEl.scrollHeight, frame.contentDocument.body?.scrollHeight || 0);
            if (h > 0) setHeight(h);
        };
        const onLoad = () => {
            measure();
            const doc = frame.contentDocument;
            if (!doc) return;
            doc.querySelectorAll('img').forEach(img => img.addEventListener('load', measure));
            if (typeof ResizeObserver !== 'undefined' && doc.body) {
                observer = new ResizeObserver(measure);
                observer.observe(doc.body);
            }
        };
        frame.addEventListener('load', onLoad);
        const outer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
        outer?.observe(frame);
        return () => {
            frame.removeEventListener('load', onLoad);
            observer?.disconnect();
            outer?.disconnect();
        };
    }, [html]);
    return (
        <iframe
            ref={ref}
            title={title}
            srcDoc={html || ''}
            sandbox="allow-same-origin allow-popups"
            scrolling="no"
            style={{ width: '100%', height, border: 0, display: 'block', overflow: 'hidden' }}
        />
    );
};

const IconToggle = ({ value, onChange, options, label }) => (
    <div className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-black/[0.05] p-1 dark:bg-white/[0.06]" role="group" aria-label={label}>
        {options.map(({ v, Icon, text }) => (
            <button
                key={v}
                type="button"
                onClick={() => onChange(v)}
                aria-pressed={value === v}
                aria-label={text}
                title={text}
                className={cn('flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold transition-colors',
                    value === v ? 'bg-white text-gray-900 shadow-sm dark:bg-white/[0.14] dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white')}
            >
                <Icon size={14} /> <span className="hidden sm:inline">{text}</span>
            </button>
        ))}
    </div>
);

const EmailPreview = ({ html, subject, preheader, fromName, fromEmail, theme, onThemeChange, note, className, initialDevice = 'desktop' }) => {
    const [device, setDevice] = useState(initialDevice);
    return (
        <div className={cn('space-y-3', className)}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <IconToggle label="Screen size" value={device} onChange={setDevice} options={[
                    { v: 'desktop', Icon: Monitor, text: 'Desktop' },
                    { v: 'mobile', Icon: Smartphone, text: 'Phone' },
                ]} />
                {onThemeChange && (
                    <IconToggle label="Email colours" value={theme} onChange={onThemeChange} options={[
                        { v: 'light', Icon: Sun, text: 'Light' },
                        { v: 'dark', Icon: Moon, text: 'Dark' },
                    ]} />
                )}
            </div>

            {/* How it looks in the inbox list */}
            <div className="flex items-start gap-3 rounded-2xl border border-black/[0.06] bg-white p-3 dark:border-white/[0.08] dark:bg-white/[0.03]">
                <Avatar name={fromName || 'Newbi'} size={36} />
                <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-[13px] font-bold">{fromName || 'Newbi'}</p>
                        <span className="shrink-0 text-[11px] text-gray-400">now</span>
                    </div>
                    <p className="truncate text-[13px] font-semibold text-gray-800 dark:text-zinc-200">{subject || 'No subject yet'}</p>
                    <p className="truncate text-[12px] text-gray-500">{preheader || 'Add preview text so people know what this is about'}</p>
                    {fromEmail && <p className="sr-only">From {fromEmail}</p>}
                </div>
            </div>

            <div className="flex justify-center overflow-hidden rounded-2xl border border-black/[0.06] bg-black/[0.03] p-2 dark:border-white/[0.08] dark:bg-white/[0.03] sm:p-3">
                <div className={cn('w-full overflow-hidden rounded-xl bg-white transition-[max-width] duration-300', device === 'mobile' ? 'max-w-[375px]' : 'max-w-[680px]', theme === 'dark' && 'bg-black')}>
                    <EmailFrame html={html} />
                </div>
            </div>
            {note && <p className="text-[12px] text-gray-500">{note}</p>}
        </div>
    );
};

export default EmailPreview;
