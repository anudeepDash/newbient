import React, { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import Loader2 from 'lucide-react/dist/esm/icons/loader-circle';
import { cn } from '../../lib/utils';

/*
 * Buttons and inputs for the app. Inputs are 16px so iOS Safari never zooms
 * in on focus, and every tap target is at least 44px tall.
 */

const BUTTON_VARIANTS = {
    primary: 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-neon-green dark:text-black dark:hover:bg-neon-green/90',
    secondary: 'border border-black/[0.08] bg-black/[0.03] text-gray-900 hover:bg-black/[0.06] dark:border-white/[0.1] dark:bg-white/[0.05] dark:text-white dark:hover:bg-white/[0.09]',
    ghost: 'text-gray-600 hover:bg-black/[0.04] hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-white',
    danger: 'bg-red-500/10 text-red-600 hover:bg-red-500/15 dark:text-red-400',
};

export const Button = forwardRef(({ variant = 'primary', size = 'md', loading, disabled, icon: Icon, to, href, className, children, ...props }, ref) => {
    const classes = cn(
        'inline-flex select-none items-center justify-center gap-2 rounded-2xl font-bold transition-colors active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' ? 'h-10 px-4 text-[13px]' : size === 'lg' ? 'h-14 px-6 text-[16px]' : 'h-12 px-5 text-[15px]',
        BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary,
        className
    );
    const content = (
        <>
            {loading ? <Loader2 size={17} className="animate-spin" /> : Icon && <Icon size={17} />}
            {children}
        </>
    );
    if (to) return <Link ref={ref} to={to} className={classes} {...props}>{content}</Link>;
    if (href) return <a ref={ref} href={href} className={classes} {...props}>{content}</a>;
    return <button ref={ref} type="button" disabled={disabled || loading} className={classes} {...props}>{content}</button>;
});
Button.displayName = 'Button';

export const TextInput = forwardRef(({ label, hint, error, className, inputClassName, id, ...props }, ref) => {
    const inputId = id || (label ? `in-${String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined);
    return (
        <label htmlFor={inputId} className={cn('block space-y-1.5', className)}>
            {label && <span className="block text-[13px] font-semibold text-gray-600 dark:text-zinc-400">{label}</span>}
            <input
                ref={ref}
                id={inputId}
                className={cn(
                    'h-12 w-full rounded-2xl border bg-white px-4 text-[16px] text-gray-900 outline-none transition-colors placeholder:text-gray-400',
                    'border-black/[0.1] focus:border-gray-900 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-white dark:placeholder:text-zinc-600 dark:focus:border-neon-green/60',
                    error && 'border-red-500/60 dark:border-red-500/60',
                    inputClassName
                )}
                {...props}
            />
            {error ? <span className="block text-[13px] font-medium text-red-600 dark:text-red-400">{error}</span>
                : hint && <span className="block text-[12px] text-gray-500 dark:text-zinc-500">{hint}</span>}
        </label>
    );
});
TextInput.displayName = 'TextInput';
