import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Sun, Moon, ArrowUpRight, UserRound } from 'lucide-react';
import Logo from './Logo';
import { useTheme } from '../../hooks/useTheme';
import { APP_LINKS } from '../links';
import { readSessionHint } from '../../lib/sessionHint';

const LINKS = [
    { label: 'Work', to: '/work' },
    { label: 'About', to: '/#about' },
    { label: 'Creators', to: '/creator' },
    { label: 'Community', to: '/community' },
    { label: 'ConcertZone', href: '/concertzone' }, // its own brand and app, so a full page load
    { label: 'Contact', to: '/contact' },
];

export function ThemeToggle({ className = '' }) {
    const { toggleTheme } = useTheme();
    // Both icons are rendered and CSS shows the right one, so the prerendered
    // HTML matches whatever theme the visitor has.
    return (
        <button
            type="button"
            onClick={() => toggleTheme()}
            aria-label="Switch light or dark theme"
            className={`w-11 h-11 rounded-xl flex items-center justify-center text-gray-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${className}`}
        >
            <Moon size={18} className="dark:hidden" aria-hidden="true" />
            <Sun size={18} className="hidden dark:block text-amber-300" aria-hidden="true" />
        </button>
    );
}

// Who's signed in to the app, read after hydration so the prerendered HTML stays the same for everyone.
function useSignedIn() {
    const [hint, setHint] = useState(null);
    useEffect(() => { setHint(readSessionHint()); }, []);
    return hint;
}

function Avatar({ hint, size = 28 }) {
    const [broken, setBroken] = useState(false);
    const initial = (hint.name || '').charAt(0).toUpperCase();
    if (hint.photo && !broken) {
        return <img src={hint.photo} alt="" width={size} height={size} referrerPolicy="no-referrer" onError={() => setBroken(true)} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
    }
    return (
        <span aria-hidden="true" className="flex shrink-0 items-center justify-center rounded-full bg-neon-green text-black text-[13px] font-bold" style={{ width: size, height: size }}>
            {initial || <UserRound size={14} />}
        </span>
    );
}

export default function LandingNav() {
    const [open, setOpen] = useState(false);
    const location = useLocation();
    const signedIn = useSignedIn();

    useEffect(() => { setOpen(false); }, [location.pathname, location.hash]);
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    const linkCls = 'px-3 h-11 inline-flex items-center rounded-lg font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gray-600 dark:text-zinc-400 hover:text-gray-950 dark:hover:text-white transition-colors';

    return (
        <header
            className="sticky top-0 z-50 border-b border-gray-950/10 dark:border-white/10 bg-[#F4F2EC]/95 dark:bg-[#050505]/95 md:bg-[#F4F2EC]/80 md:dark:bg-[#050505]/70 md:backdrop-blur-md"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
                <Logo height={30} />

                <nav aria-label="Main" className="hidden lg:flex items-center gap-1">
                    {LINKS.map((l) => l.href
                        ? <a key={l.label} href={l.href} className={linkCls}>{l.label}</a>
                        : <Link key={l.label} to={l.to} className={linkCls}>{l.label}</Link>)}
                </nav>

                <div className="flex items-center gap-1 sm:gap-1.5">
                    <ThemeToggle className="hidden sm:flex" />
                    {/* Into the app: sign in, passes, campaigns. Signed in already: their name, straight to the app. */}
                    {signedIn ? (
                        <a href={APP_LINKS.home} aria-label={signedIn.name ? `Open the app, signed in as ${signedIn.name}` : 'Open the app'} className="h-11 pl-1.5 pr-3 sm:pr-4 inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-white/70 dark:bg-white/[0.08] ring-1 ring-inset ring-black/10 dark:ring-white/15 text-gray-950 dark:text-white font-heading text-sm font-bold hover:bg-white dark:hover:bg-white/[0.14] transition-colors">
                            <Avatar hint={signedIn} size={32} />
                            <span className="max-w-[5.5rem] truncate sm:max-w-[8rem]">{signedIn.name || 'Open app'}</span>
                        </a>
                    ) : (
                        <a href={APP_LINKS.home} className="h-11 px-3 sm:px-5 inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-white/70 dark:bg-white/[0.08] ring-1 ring-inset ring-black/10 dark:ring-white/15 text-gray-950 dark:text-white font-heading text-sm font-bold hover:bg-white dark:hover:bg-white/[0.14] transition-colors">
                            <UserRound size={15} aria-hidden="true" className="hidden sm:block" /> Sign in
                        </a>
                    )}
                    <Link to="/#enquire" className="h-11 px-4 sm:px-5 inline-flex whitespace-nowrap items-center rounded-full bg-neon-green text-black font-heading text-sm font-bold hover:scale-[1.03] transition-transform">
                        Work with us
                    </Link>
                    <button
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        aria-label={open ? 'Close menu' : 'Open menu'}
                        aria-expanded={open}
                        aria-controls="landing-menu"
                        className="lg:hidden w-11 h-11 rounded-xl flex items-center justify-center text-gray-800 dark:text-white hover:bg-black/5 dark:hover:bg-white/10"
                    >
                        {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
                    </button>
                </div>
            </div>

            {open && (
                <nav id="landing-menu" aria-label="Main" className="lg:hidden border-t border-gray-950/10 dark:border-white/10 bg-[#F4F2EC] dark:bg-[#050505] px-4 pb-5 pt-2">
                    <ul className="flex flex-col">
                        {LINKS.map((l) => (
                            <li key={l.label}>
                                {l.href
                                    ? <a href={l.href} className="flex items-center h-12 font-heading text-2xl font-bold tracking-[-0.02em] text-gray-950 dark:text-white">{l.label}</a>
                                    : <Link to={l.to} className="flex items-center h-12 font-heading text-2xl font-bold tracking-[-0.02em] text-gray-950 dark:text-white">{l.label}</Link>}
                            </li>
                        ))}
                    </ul>
                    <div className="mt-3 flex items-center gap-2">
                        <a href={APP_LINKS.home} className="flex-1 h-12 inline-flex items-center justify-center gap-1.5 rounded-xl bg-black/5 dark:bg-white/10 text-sm font-semibold text-gray-900 dark:text-white">
                            {signedIn ? 'Open the app' : 'Sign in'} <ArrowUpRight size={15} aria-hidden="true" />
                        </a>
                        <ThemeToggle className="bg-black/5 dark:bg-white/10 h-12 w-12" />
                    </div>
                </nav>
            )}
        </header>
    );
}
