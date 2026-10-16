import { createContext, useContext } from 'react';

/*
 * Admin colour system. Every module has an accent (set on its nav item in
 * constants/adminNavigation.js); the shell provides it to the page so headers,
 * tabs, tiles and highlights pick it up without each page choosing colours.
 *
 * Each accent has the same set of class strings (full literals so Tailwind
 * keeps them):
 *   chip   icon tile: tinted background + coloured icon
 *   soft   faint tinted surface (selected rows, banners)
 *   text   coloured text / icons
 *   border coloured border for selected things
 *   solid  filled background with readable text (active pills, small CTAs)
 *   dot    small solid dot / progress bar fill
 */
export const ACCENTS = {
    green: {
        chip: 'bg-emerald-500/15 text-emerald-600 dark:bg-neon-green/10 dark:text-neon-green',
        soft: 'bg-emerald-500/[0.07] dark:bg-neon-green/[0.06]',
        text: 'text-emerald-600 dark:text-neon-green',
        border: 'border-emerald-500/40 dark:border-neon-green/40',
        solid: 'bg-emerald-500 text-white dark:bg-neon-green dark:text-black',
        dot: 'bg-emerald-500 dark:bg-neon-green',
    },
    teal: {
        chip: 'bg-teal-500/15 text-teal-600 dark:bg-teal-400/10 dark:text-teal-300',
        soft: 'bg-teal-500/[0.07] dark:bg-teal-400/[0.06]',
        text: 'text-teal-600 dark:text-teal-300',
        border: 'border-teal-500/40 dark:border-teal-300/40',
        solid: 'bg-teal-500 text-white dark:bg-teal-400 dark:text-black',
        dot: 'bg-teal-500 dark:bg-teal-300',
    },
    blue: {
        chip: 'bg-sky-500/15 text-sky-600 dark:bg-neon-blue/10 dark:text-neon-blue',
        soft: 'bg-sky-500/[0.07] dark:bg-neon-blue/[0.06]',
        text: 'text-sky-600 dark:text-neon-blue',
        border: 'border-sky-500/40 dark:border-neon-blue/40',
        solid: 'bg-sky-500 text-white dark:bg-neon-blue dark:text-black',
        dot: 'bg-sky-500 dark:bg-neon-blue',
    },
    cyan: {
        chip: 'bg-cyan-500/15 text-cyan-600 dark:bg-cyan-400/10 dark:text-cyan-300',
        soft: 'bg-cyan-500/[0.07] dark:bg-cyan-400/[0.06]',
        text: 'text-cyan-600 dark:text-cyan-300',
        border: 'border-cyan-500/40 dark:border-cyan-300/40',
        solid: 'bg-cyan-500 text-white dark:bg-cyan-400 dark:text-black',
        dot: 'bg-cyan-500 dark:bg-cyan-300',
    },
    indigo: {
        chip: 'bg-indigo-500/15 text-indigo-600 dark:bg-indigo-400/15 dark:text-indigo-300',
        soft: 'bg-indigo-500/[0.07] dark:bg-indigo-400/[0.07]',
        text: 'text-indigo-600 dark:text-indigo-300',
        border: 'border-indigo-500/40 dark:border-indigo-300/40',
        solid: 'bg-indigo-500 text-white dark:bg-indigo-400 dark:text-black',
        dot: 'bg-indigo-500 dark:bg-indigo-300',
    },
    violet: {
        chip: 'bg-violet-500/15 text-violet-600 dark:bg-neon-purple/15 dark:text-violet-300',
        soft: 'bg-violet-500/[0.07] dark:bg-neon-purple/[0.07]',
        text: 'text-violet-600 dark:text-violet-300',
        border: 'border-violet-500/40 dark:border-violet-300/40',
        solid: 'bg-violet-500 text-white dark:bg-neon-purple dark:text-white',
        dot: 'bg-violet-500 dark:bg-neon-purple',
    },
    fuchsia: {
        chip: 'bg-fuchsia-500/15 text-fuchsia-600 dark:bg-fuchsia-400/15 dark:text-fuchsia-300',
        soft: 'bg-fuchsia-500/[0.07] dark:bg-fuchsia-400/[0.07]',
        text: 'text-fuchsia-600 dark:text-fuchsia-300',
        border: 'border-fuchsia-500/40 dark:border-fuchsia-300/40',
        solid: 'bg-fuchsia-500 text-white dark:bg-fuchsia-400 dark:text-black',
        dot: 'bg-fuchsia-500 dark:bg-fuchsia-300',
    },
    pink: {
        chip: 'bg-pink-500/15 text-pink-600 dark:bg-neon-pink/15 dark:text-neon-pink',
        soft: 'bg-pink-500/[0.07] dark:bg-neon-pink/[0.07]',
        text: 'text-pink-600 dark:text-neon-pink',
        border: 'border-pink-500/40 dark:border-neon-pink/40',
        solid: 'bg-pink-500 text-white dark:bg-neon-pink dark:text-black',
        dot: 'bg-pink-500 dark:bg-neon-pink',
    },
    rose: {
        chip: 'bg-rose-500/15 text-rose-600 dark:bg-rose-400/15 dark:text-rose-300',
        soft: 'bg-rose-500/[0.07] dark:bg-rose-400/[0.07]',
        text: 'text-rose-600 dark:text-rose-300',
        border: 'border-rose-500/40 dark:border-rose-300/40',
        solid: 'bg-rose-500 text-white dark:bg-rose-400 dark:text-black',
        dot: 'bg-rose-500 dark:bg-rose-300',
    },
    orange: {
        chip: 'bg-orange-500/15 text-orange-600 dark:bg-orange-400/15 dark:text-orange-300',
        soft: 'bg-orange-500/[0.07] dark:bg-orange-400/[0.07]',
        text: 'text-orange-600 dark:text-orange-300',
        border: 'border-orange-500/40 dark:border-orange-300/40',
        solid: 'bg-orange-500 text-white dark:bg-orange-400 dark:text-black',
        dot: 'bg-orange-500 dark:bg-orange-300',
    },
    amber: {
        chip: 'bg-amber-500/15 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300',
        soft: 'bg-amber-500/[0.07] dark:bg-amber-400/[0.07]',
        text: 'text-amber-600 dark:text-amber-300',
        border: 'border-amber-500/40 dark:border-amber-300/40',
        solid: 'bg-amber-500 text-white dark:bg-amber-400 dark:text-black',
        dot: 'bg-amber-500 dark:bg-amber-300',
    },
    red: {
        chip: 'bg-red-500/15 text-red-600 dark:bg-red-400/15 dark:text-red-300',
        soft: 'bg-red-500/[0.07] dark:bg-red-400/[0.07]',
        text: 'text-red-600 dark:text-red-300',
        border: 'border-red-500/40 dark:border-red-300/40',
        solid: 'bg-red-500 text-white dark:bg-red-400 dark:text-black',
        dot: 'bg-red-500 dark:bg-red-300',
    },
    gray: {
        chip: 'bg-black/[0.06] text-gray-700 dark:bg-white/[0.08] dark:text-zinc-200',
        soft: 'bg-black/[0.03] dark:bg-white/[0.03]',
        text: 'text-gray-700 dark:text-zinc-200',
        border: 'border-black/20 dark:border-white/20',
        solid: 'bg-gray-900 text-white dark:bg-white dark:text-black',
        dot: 'bg-gray-500 dark:bg-zinc-400',
    },
};

/** Older tone names used around the admin map onto accents. */
const ALIASES = { purple: 'violet', sky: 'blue', emerald: 'green', yellow: 'amber' };

export const accent = (name) => ACCENTS[ALIASES[name] || name] || ACCENTS.green;

export const AccentContext = createContext('green');

/** The current module's accent name ('pink' on Creators, 'violet' on Proposals…). */
export const useAccentName = () => useContext(AccentContext);

/** The current module's accent classes. */
export const useAccent = () => accent(useContext(AccentContext));
