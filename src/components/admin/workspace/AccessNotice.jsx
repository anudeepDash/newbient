import React from 'react';
import Lock from 'lucide-react/dist/esm/icons/lock';
import { cn } from '../../../lib/utils';
import { accent } from '../theme';

/**
 * Calm full-page notice for "you can't open this" and "please sign in"
 * screens inside the admin. `actions` is a list of buttons/links.
 */
const AccessNotice = ({ icon: Icon = Lock, tone = 'amber', title, children, actions, note, className }) => (
    <div className={cn('flex min-h-[70dvh] items-center justify-center px-4 py-12 font-heading', className)}>
        <div className="w-full max-w-md rounded-3xl border border-black/[0.06] bg-white p-6 text-center shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03] sm:p-8">
            <span className={cn('mx-auto flex h-14 w-14 items-center justify-center rounded-2xl', accent(tone).chip)}>
                <Icon size={24} />
            </span>
            <h1 className="mt-5 text-xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-2xl">{title}</h1>
            {children && <div className="mt-2 text-[14px] leading-relaxed text-gray-500 dark:text-zinc-400">{children}</div>}
            {actions && <div className="mt-6 flex flex-col gap-2">{actions}</div>}
            {note && <p className="mt-4 text-[12px] text-gray-400 dark:text-zinc-500">{note}</p>}
        </div>
    </div>
);

export default AccessNotice;
