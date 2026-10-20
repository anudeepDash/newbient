import { useEffect, useId, useRef, useState } from 'react';
import { Check, Languages } from 'lucide-react';
import { LANGS, useLang, setLang } from './index';

/*
 * Language picker: an icon button, the same size and style as the
 * theme toggle, that opens a two-option menu. Closed by default, so the prerendered HTML is the
 * same for everyone. `up` opens the menu above the button (for footers).
 */
export default function LangToggle({ className = '', up = false }) {
    const lang = useLang();
    const [open, setOpen] = useState(false);
    const root = useRef(null);
    const menuId = useId();

    useEffect(() => {
        if (!open) return undefined;
        const onDown = (e) => { if (root.current && !root.current.contains(e.target)) setOpen(false); };
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('pointerdown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const choose = (code) => { setLang(code); setOpen(false); };

    return (
        <div ref={root} className={`relative shrink-0 ${className}`}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="true"
                aria-expanded={open}
                aria-controls={open ? menuId : undefined}
                aria-label="Language"
                className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-700 transition-colors hover:bg-black/[0.05] dark:text-zinc-300 dark:hover:bg-white/10"
            >
                <Languages size={19} aria-hidden="true" />
            </button>
            {open && (
                <ul
                    id={menuId}
                    className={`absolute right-0 z-[70] min-w-[9.5rem] overflow-hidden rounded-2xl border border-black/10 bg-white p-1 shadow-xl dark:border-white/15 dark:bg-[#15171d] ${up ? 'bottom-full mb-2' : 'top-full mt-2'}`}
                >
                    {Object.entries(LANGS).map(([code, label]) => (
                        <li key={code}>
                            <button
                                type="button"
                                lang={code === 'hi' ? 'hi-Latn' : 'en'}
                                aria-pressed={lang === code}
                                onClick={() => choose(code)}
                                className={`flex h-10 w-full items-center justify-between gap-3 rounded-xl px-3 text-left font-heading text-sm font-semibold transition-colors ${lang === code
                                    ? 'bg-neon-green/20 text-gray-950 dark:text-white'
                                    : 'text-gray-700 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10'}`}
                            >
                                {label}
                                {lang === code && <Check size={15} aria-hidden="true" />}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
