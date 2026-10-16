import React from 'react';
import { cn } from '../../lib/utils';
import { isPresent } from '../../lib/present';

/*
 * Field, Stat and Section render nothing when their value is empty, so the app
 * never shows "—", "0+", "N/A", "@" or "Universal". See lib/present.js for
 * what counts as empty. Pass allowZero where 0 is a real value (a price of 0).
 */

const valueOf = (value, format) => (format ? format(value) : value);

/* A labelled value in a list: "Venue · Hard Rock Cafe". */
export const Field = ({ label, value, icon: Icon, href, format, allowZero, children, className, valueClassName }) => {
    const shown = children ?? valueOf(value, format);
    if (!isPresent(children ?? value, { allowZero })) return null;
    const body = href ? (
        <a href={href} target={/^https?:/.test(href) ? '_blank' : undefined} rel="noopener noreferrer" className="underline decoration-black/20 underline-offset-2 hover:decoration-current dark:decoration-white/25">
            {shown}
        </a>
    ) : shown;
    return (
        <div className={cn('flex items-start gap-3 py-2.5', className)}>
            {Icon && (
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] text-gray-500 dark:bg-white/[0.06] dark:text-zinc-400">
                    <Icon size={15} />
                </span>
            )}
            <div className="min-w-0 flex-1">
                {label && <p className="text-[12px] font-semibold text-gray-500 dark:text-zinc-500">{label}</p>}
                <div className={cn('break-words text-[15px] font-semibold text-gray-900 dark:text-white', valueClassName)}>{body}</div>
            </div>
        </div>
    );
};

/* The stat tile from the campaign card: small caps label over a bold value. */
export const Stat = ({ label, value, icon: Icon, tone = 'default', format, allowZero, className }) => {
    if (!isPresent(value, { allowZero })) return null;
    return (
        <div className={cn('flex min-w-0 flex-1 flex-col items-center rounded-xl border border-black/[0.04] bg-black/[0.02] px-1 py-2.5 dark:border-white/[0.06] dark:bg-white/[0.03]', className)}>
            {label && (
                <span className="mb-0.5 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-gray-500 dark:text-zinc-500">
                    {Icon && <Icon size={9} className={tone === 'accent' ? 'text-emerald-600 dark:text-neon-green' : undefined} />}
                    {label}
                </span>
            )}
            <span className={cn(
                'max-w-full truncate px-1 text-[12px] font-black',
                tone === 'accent' ? 'text-emerald-600 dark:text-neon-green' : 'text-gray-900 dark:text-white'
            )}>
                {valueOf(value, format)}
            </span>
        </div>
    );
};

/* Is there anything a Section's children would actually show? */
export const hasContent = (children) => React.Children.toArray(children).some((child) => {
    if (!React.isValidElement(child)) return isPresent(child, { allowZero: true });
    if (child.type === Field || child.type === Stat) {
        return isPresent(child.props.children ?? child.props.value, { allowZero: child.props.allowZero });
    }
    if (child.type === React.Fragment) return hasContent(child.props.children);
    return true;
});

/* A titled block that disappears when everything inside it is empty. */
export const Section = ({ title, action, when, children, className, bodyClassName }) => {
    if (when === false || !hasContent(children)) return null;
    return (
        <section className={cn('space-y-2', className)}>
            {(title || action) && (
                <div className="flex items-center justify-between gap-3 px-1">
                    {title && <h2 className="text-[13px] font-bold text-gray-500 dark:text-zinc-400">{title}</h2>}
                    {action}
                </div>
            )}
            <div className={bodyClassName}>{children}</div>
        </section>
    );
};

/* A row of Stat tiles that hides when none has a value. */
export const StatRow = ({ children, className }) => {
    if (!hasContent(children)) return null;
    return <div className={cn('flex items-stretch gap-2', className)}>{children}</div>;
};
