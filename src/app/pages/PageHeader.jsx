import React from 'react';
import { isPresent } from '../../lib/present';
import Sticker from '../../components/brand/Sticker';

/*
 * Page title block used by every app page, styled like the landing site:
 * a glass label chip with the neon dot, a heavy title whose key word
 * (`highlight`) is the quiet neon sticker, and one supporting line.
 */
const PageHeader = ({ eyebrow, title, highlight, subtitle, action }) => (
    <header className="flex items-end justify-between gap-4 pb-1">
        <div className="min-w-0">
            {isPresent(eyebrow) && (
                <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-gray-700 ring-1 ring-inset ring-black/[0.06] backdrop-blur-md dark:bg-white/[0.06] dark:text-zinc-300 dark:ring-white/10">
                    <span className="h-1.5 w-1.5 rounded-full bg-neon-green shadow-[0_0_8px_rgba(57,255,20,0.9)]" aria-hidden="true" />
                    {eyebrow}
                </p>
            )}
            <h1 className="font-heading text-[32px] font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-[38px] lg:text-[52px]">
                {title}{isPresent(highlight) && <> <Sticker subtle>{highlight}</Sticker></>}
            </h1>
            {isPresent(subtitle) && <p className="mt-2 max-w-2xl text-[15px] text-gray-600 dark:text-zinc-400 lg:mt-3 lg:text-[17px]">{subtitle}</p>}
        </div>
        {action}
    </header>
);

/* Standard page width and padding: one column on phones, wide on desktop. */
export const PageBody = ({ children }) => (
    <div className="mx-auto w-full max-w-6xl space-y-7 px-4 py-6 sm:px-6 sm:py-8 lg:space-y-10 lg:px-8 lg:py-12">{children}</div>
);

export default PageHeader;
