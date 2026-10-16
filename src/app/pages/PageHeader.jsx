import React from 'react';
import { isPresent } from '../../lib/present';

/* Page title block used by every app page. */
const PageHeader = ({ eyebrow, title, subtitle, action }) => (
    <header className="flex items-end justify-between gap-4 pb-2">
        <div className="min-w-0">
            {isPresent(eyebrow) && <p className="text-[12px] font-bold uppercase tracking-widest text-emerald-600 dark:text-neon-green">{eyebrow}</p>}
            <h1 className="font-heading text-[28px] font-black leading-tight tracking-tight sm:text-[32px]">{title}</h1>
            {isPresent(subtitle) && <p className="mt-1 text-[15px] text-gray-600 dark:text-zinc-400">{subtitle}</p>}
        </div>
        {action}
    </header>
);

/* Standard page width and padding. */
export const PageBody = ({ children }) => (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-5 sm:px-6 lg:px-10 lg:py-10">{children}</div>
);

export default PageHeader;
