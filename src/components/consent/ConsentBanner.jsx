import { useEffect, useRef, useState } from 'react';
import { getConsent, onOpenConsentSettings, sendsGlobalPrivacyControl, setConsent, useConsent } from '../../lib/consent';
import { landingUrl } from '../../app/host';
import BrandLayers from '../app/BrandLayers';
import { useT } from '../../i18n';

/*
 * The cookie banner and cookie settings, shared by newbi.live and the app.
 *
 * Shown until the visitor chooses; "Essential only" and "Allow all" are the same
 * size and weight, so saying no is as easy as saying yes. Nothing optional loads
 * before a choice (src/lib/consent.js). "Cookie settings" links (footers, the app's
 * profile) reopen it on the settings view. It renders only after mount, so the
 * prerendered landing pages hydrate unchanged.
 */

const Switch = ({ checked, onChange, label, disabled }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${checked ? 'bg-emerald-600 dark:bg-neon-green' : 'bg-black/15 dark:bg-white/20'}`}
    >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
);

const btn = 'inline-flex h-9 flex-1 items-center justify-center whitespace-nowrap rounded-full px-3 text-[13px] font-bold transition-colors';
const solid = `${btn} bg-gray-950 text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-200`;
const outline = `${btn} bg-white/60 text-gray-900 ring-1 ring-inset ring-black/15 hover:bg-white dark:bg-white/[0.04] dark:text-white dark:ring-white/20 dark:hover:bg-white/[0.08]`;
const textLink = 'font-semibold text-gray-900 underline underline-offset-2 dark:text-white';

// One settings row: the name, a one-line reason, and its switch.
const Row = ({ title, hint, children }) => (
    <li className="flex items-center gap-3 py-2">
        <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold">{title}</p>
            <p className="text-[12px] leading-snug text-gray-600 dark:text-zinc-400">{hint}</p>
        </div>
        {children}
    </li>
);

export default function ConsentBanner() {
    const t = useT();
    const consent = useConsent();
    const [mounted, setMounted] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [draft, setDraft] = useState({ analytics: false, media: false });
    const panelRef = useRef(null);

    useEffect(() => { setMounted(true); }, []);
    useEffect(() => onOpenConsentSettings(() => {
        const current = getConsent();
        setDraft({ analytics: Boolean(current?.analytics), media: Boolean(current?.media) });
        setSettingsOpen(true);
    }), []);
    useEffect(() => {
        if (settingsOpen) panelRef.current?.focus();
    }, [settingsOpen]);
    useEffect(() => {
        if (!settingsOpen) return undefined;
        const onKey = (e) => { if (e.key === 'Escape' && getConsent()) setSettingsOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [settingsOpen]);

    if (!mounted) return null;
    // Global Privacy Control already said no; the settings can still be opened to look.
    const undecided = !consent && !sendsGlobalPrivacyControl();
    if (!undecided && !settingsOpen) return null;

    const choose = (value) => {
        setConsent(value);
        setSettingsOpen(false);
    };
    const privacyHref = landingUrl('/privacy#cookies');
    const gpc = sendsGlobalPrivacyControl();

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:justify-start sm:p-5">
            <section
                ref={panelRef}
                tabIndex={-1}
                role={settingsOpen ? 'dialog' : 'region'}
                aria-modal={settingsOpen ? 'false' : undefined}
                aria-labelledby="nb-consent-title"
                className="pointer-events-auto relative isolate w-full max-w-[21rem] overflow-hidden rounded-[1.25rem] bg-[#f7f7f3] p-4 text-gray-900 shadow-[0_18px_50px_-14px_rgba(0,0,0,0.35)] ring-1 ring-inset ring-black/[0.06] outline-none dark:bg-[#0b0d12] dark:text-white dark:ring-white/10"
            >
                {/* The app's N. card: green glow from the corner, a fading dot grid and the faded N. mark. */}
                <BrandLayers mark="small" soft />
                {!settingsOpen ? (
                    <>
                        <h2 id="nb-consent-title" className="font-heading text-[15px] font-extrabold tracking-[-0.01em]">
                            {t('Cookies, kept simple')}<span className="text-emerald-600 dark:text-neon-green">.</span>
                        </h2>
                        <p className="mt-1 text-[13px] leading-snug text-gray-600 dark:text-zinc-400">
                            {t('Essential storage keeps you signed in. With your OK we also count visits and play videos. We never sell your data.')}{' '}
                            <a href={privacyHref} className={textLink}>{t('Privacy')}</a>
                            {' · '}
                            <button type="button" className={textLink} onClick={() => { setDraft({ analytics: false, media: false }); setSettingsOpen(true); }}>
                                {t('Choose')}
                            </button>
                        </p>
                        <div className="mt-3 flex gap-2">
                            <button type="button" className={outline} onClick={() => choose({ analytics: false, media: false })}>{t('Essential only')}</button>
                            <button type="button" className={solid} onClick={() => choose({ analytics: true, media: true })}>{t('Allow all')}</button>
                        </div>
                    </>
                ) : (
                    <>
                        <h2 id="nb-consent-title" className="font-heading text-[15px] font-extrabold tracking-[-0.01em]">
                            {t('Cookie settings')}<span className="text-emerald-600 dark:text-neon-green">.</span>
                        </h2>
                        {gpc && (
                            <p className="mt-2 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[12px] text-emerald-800 dark:bg-neon-green/10 dark:text-neon-green">
                                {t('Your browser sends Global Privacy Control, so everything optional stays off.')}
                            </p>
                        )}
                        <ul className="mt-1 divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                            <Row title={t('Essential')} hint={t('Sign-in, settings and offline passes. Always on.')}>
                                <Switch checked disabled label={t('Essential, always on')} />
                            </Row>
                            <Row title={t('Analytics')} hint={t('Visit counts with Vercel. No cookies or ads.')}>
                                <Switch checked={draft.analytics} disabled={gpc} label={t('Analytics')} onChange={(v) => setDraft(d => ({ ...d, analytics: v }))} />
                            </Row>
                            <Row title={t('Embedded videos')} hint={t('YouTube, Vimeo and Instagram set their own cookies.')}>
                                <Switch checked={draft.media} disabled={gpc} label={t('Embedded videos')} onChange={(v) => setDraft(d => ({ ...d, media: v }))} />
                            </Row>
                        </ul>
                        <div className="mt-2 flex gap-2">
                            <button type="button" className={outline} onClick={() => choose(gpc ? {} : draft)}>{t('Save choices')}</button>
                            <button type="button" className={solid} disabled={gpc} onClick={() => choose({ analytics: true, media: true })}>{t('Allow all')}</button>
                        </div>
                        <p className="mt-2 text-[11px] text-gray-500 dark:text-zinc-500">
                            {t('Change it any time from “Cookie settings” in the footer.')}{' '}
                            <a href={privacyHref} className="underline underline-offset-2">{t('Privacy Policy')}</a>
                        </p>
                    </>
                )}
            </section>
        </div>
    );
}
