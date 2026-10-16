import React from 'react';
import PenTool from 'lucide-react/dist/esm/icons/pen-tool';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import { cn } from '../../../lib/utils';

/*
 * Pieces shared by the public invoice, proposal and contract viewers.
 * Everything here reads in light and dark mode; the paper itself is not
 * styled here and stays exactly as the builders render it.
 */

// One colour per document type. Neon on dark, a deeper shade on light so text stays readable.
export const DOC_THEMES = {
    invoice: {
        label: 'Invoice',
        primary: '#00D1FF',
        text: 'text-sky-600 dark:text-[#00D1FF]',
        soft: 'bg-sky-500/10 dark:bg-[#00D1FF]/10',
        border: 'border-sky-500/25 dark:border-[#00D1FF]/25',
        solid: 'bg-[#00D1FF] text-black hover:bg-[#33dbff]',
        dot: 'bg-sky-500 dark:bg-[#00D1FF]',
        ring: 'focus:border-sky-500 dark:focus:border-[#00D1FF]',
        selection: 'selection:bg-[#00D1FF] selection:text-black',
    },
    proposal: {
        label: 'Proposal',
        primary: '#39FF14',
        text: 'text-emerald-600 dark:text-neon-green',
        soft: 'bg-emerald-500/10 dark:bg-neon-green/10',
        border: 'border-emerald-500/25 dark:border-neon-green/25',
        solid: 'bg-neon-green text-black hover:bg-[#5cff40]',
        dot: 'bg-emerald-500 dark:bg-neon-green',
        ring: 'focus:border-emerald-500 dark:focus:border-neon-green',
        selection: 'selection:bg-neon-green selection:text-black',
    },
    agreement: {
        label: 'Contract',
        primary: '#A855F7',
        text: 'text-violet-600 dark:text-[#C084FC]',
        soft: 'bg-violet-500/10',
        border: 'border-violet-500/25',
        solid: 'bg-[#A855F7] text-white hover:bg-[#b46cf8]',
        dot: 'bg-violet-500',
        ring: 'focus:border-violet-500',
        selection: 'selection:bg-[#A855F7] selection:text-white',
    },
};

export const docTheme = (type) => DOC_THEMES[type] || DOC_THEMES.proposal;

// Status chip colours.
export const TONES = {
    green: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-300',
    amber: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300',
    red: 'bg-red-500/10 text-red-600 border-red-500/25 dark:text-red-400',
    blue: 'bg-sky-500/10 text-sky-700 border-sky-500/25 dark:text-sky-300',
    gray: 'bg-black/[0.04] text-gray-600 border-black/10 dark:bg-white/[0.06] dark:text-zinc-300 dark:border-white/10',
};
export const TONE_DOT = { green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500', blue: 'bg-sky-500', gray: 'bg-gray-400' };

export const StatusChip = ({ tone = 'gray', children, className, pulse }) => (
    <span className={cn('inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-semibold', TONES[tone] || TONES.gray, className)}>
        <span className={cn('h-1.5 w-1.5 rounded-full', TONE_DOT[tone] || TONE_DOT.gray, pulse && 'animate-pulse')} />
        {children}
    </span>
);

export const fmtDate = (value, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => {
    if (!value) return '';
    const d = value?.toDate ? value.toDate() : new Date(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', opts);
};

export const fmtMoney = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/* Panel building blocks */

export const PanelCard = ({ title, subtitle, icon: Icon, theme, children, className }) => (
    <section className={cn('rounded-2xl border border-black/[0.07] bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.03]', className)}>
        {(title || subtitle) && (
            <header className="mb-3 flex items-start gap-3">
                {Icon && (
                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', theme?.soft, theme?.text)}>
                        <Icon size={17} />
                    </span>
                )}
                <div className="min-w-0">
                    {title && <h3 className="text-[15px] font-bold leading-tight text-gray-900 dark:text-white">{title}</h3>}
                    {subtitle && <p className="mt-0.5 text-[12.5px] leading-snug text-gray-500 dark:text-zinc-400">{subtitle}</p>}
                </div>
            </header>
        )}
        {children}
    </section>
);

export const TextField = ({ label, required, theme, className, ...props }) => (
    <label className={cn('block', className)}>
        <span className="mb-1.5 block text-[12.5px] font-semibold text-gray-600 dark:text-zinc-300">
            {label}{required && <span className={cn('ml-0.5', theme?.text)}>*</span>}
        </span>
        <input
            {...props}
            // 16px stops iOS Safari zooming the page on focus.
            className={cn('h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 text-[16px] text-gray-900 outline-none transition-colors placeholder:text-gray-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-zinc-500 sm:text-[14px]', theme?.ring)}
        />
    </label>
);

export const DocButton = ({ variant = 'primary', theme, className, busy, children, ...props }) => (
    <button
        type="button"
        {...props}
        disabled={props.disabled || busy}
        className={cn(
            'inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-[14px] font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
            variant === 'primary' && (theme?.solid || 'bg-gray-900 text-white dark:bg-white dark:text-black'),
            variant === 'dark' && 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200',
            variant === 'secondary' && 'border border-black/10 bg-white text-gray-800 hover:bg-gray-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-100 dark:hover:bg-white/[0.08]',
            variant === 'ghost' && 'text-gray-600 hover:bg-black/[0.04] dark:text-zinc-300 dark:hover:bg-white/[0.06]',
            variant === 'danger' && 'text-red-600 hover:bg-red-500/10 dark:text-red-400',
            className
        )}
    >
        {busy && <RefreshCw size={15} className="animate-spin" />}
        {children}
    </button>
);

// A signature always sits on white, like the paper it will be stamped on.
export const SignatureBox = ({ src, name, onClick, theme, empty = 'Tap to sign', className }) => {
    const Tag = onClick ? 'button' : 'div';
    return (
        <Tag
            type={onClick ? 'button' : undefined}
            onClick={onClick}
            className={cn(
                'flex h-24 w-full items-center justify-center rounded-xl border bg-white p-3',
                onClick ? cn('border-dashed border-black/20 transition-colors hover:border-black/40 dark:border-white/25', theme?.ring) : 'border-black/10 dark:border-white/10',
                className
            )}
        >
            {src ? (
                <img src={src} alt={name ? `Signature of ${name}` : 'Signature'} className="max-h-full max-w-full object-contain" />
            ) : name ? (
                <span className="font-signature text-3xl text-gray-900">{name}</span>
            ) : (
                <span className="flex items-center gap-2 text-[13px] font-semibold text-gray-500"><PenTool size={15} /> {empty}</span>
            )}
        </Tag>
    );
};

/* Record of a completed signature (proposal accepted, contract signed). */
export const SignedRecord = ({ theme, title, subtitle, signedBy, signature, signedAt, email, ip }) => (
    <PanelCard theme={theme} icon={ShieldCheck} title={title} subtitle={subtitle}>
        <SignatureBox src={signature} name={signedBy} />
        <dl className="mt-3 space-y-1.5 text-[12.5px]">
            {signedBy && <Row label="Signed by" value={signedBy} />}
            {email && <Row label="Email" value={email} />}
            {signedAt && <Row label="Signed on" value={new Date(signedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })} />}
            {ip && <Row label="IP address" value={ip} mono />}
        </dl>
    </PanelCard>
);

export const Row = ({ label, value, mono, strong }) => (
    <div className="flex items-baseline justify-between gap-3">
        <dt className="shrink-0 text-gray-500 dark:text-zinc-400">{label}</dt>
        <dd className={cn('min-w-0 truncate text-right text-gray-900 dark:text-zinc-100', mono && 'font-mono text-[12px]', strong && 'font-bold')}>{value}</dd>
    </div>
);

/*
 * Name + email + signature, then one button. Used to accept a proposal and to
 * sign a contract. With no drawn signature the typed name is shown in script.
 */
export const SignForm = ({
    theme, title, subtitle, icon = PenTool,
    name, onName, email, onEmail, emailLabel = 'Email',
    signature, onOpenPad, onClearSignature, requireSignature,
    submitLabel, onSubmit, submitting, onDecline, declineLabel = 'Decline',
    consent, note,
}) => {
    const emailOk = onEmail ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim()) : true;
    const missing = !String(name || '').trim() ? 'Enter your full name' : !emailOk ? 'Enter a valid email' : requireSignature && !signature ? 'Add your signature' : '';
    return (
        <PanelCard theme={theme} icon={icon} title={title} subtitle={subtitle}>
            <div className="space-y-3">
                <TextField theme={theme} label="Full name" required value={name} onChange={(e) => onName(e.target.value)} placeholder="As it should appear on the document" autoComplete="name" />
                {onEmail && <TextField theme={theme} label={emailLabel} required type="email" inputMode="email" value={email} onChange={(e) => onEmail(e.target.value)} placeholder="name@company.com" autoComplete="email" />}
                <div>
                    <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[12.5px] font-semibold text-gray-600 dark:text-zinc-300">
                            Signature{requireSignature && <span className={cn('ml-0.5', theme?.text)}>*</span>}
                        </span>
                        {signature && (
                            <span className="flex items-center gap-3 text-[12.5px] font-semibold">
                                <button type="button" onClick={onOpenPad} className={theme?.text}>Change</button>
                                {onClearSignature && <button type="button" onClick={onClearSignature} className="text-gray-500 hover:text-red-600">Clear</button>}
                            </span>
                        )}
                    </div>
                    <SignatureBox src={signature} name={!requireSignature ? String(name || '').trim() : ''} onClick={onOpenPad} theme={theme} empty="Draw, type or upload" />
                    {!signature && !requireSignature && String(name || '').trim() && (
                        <p className="mt-1.5 text-[12px] text-gray-500 dark:text-zinc-400">Your typed name will be used, or tap to draw one.</p>
                    )}
                </div>
                {note && <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-[12.5px] leading-snug text-amber-800 dark:text-amber-200">{note}</p>}
                <DocButton theme={theme} onClick={onSubmit} busy={submitting} disabled={Boolean(missing)} className="h-12 w-full text-[15px]">
                    {!submitting && <ShieldCheck size={17} />} {submitting ? 'Saving…' : (missing || submitLabel)}
                </DocButton>
                {consent && <p className="text-[12px] leading-snug text-gray-500 dark:text-zinc-400">{consent}</p>}
                {onDecline && (
                    <DocButton variant="danger" onClick={onDecline} disabled={submitting} className="h-10 w-full">{declineLabel}</DocButton>
                )}
            </div>
        </PanelCard>
    );
};
