import { useEffect, useRef, useState } from 'react';
import { getConsent, onOpenConsentSettings, sendsGlobalPrivacyControl, setConsent, useConsent } from '../../lib/consent';
import { landingUrl } from '../../app/host';
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
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${checked ? 'bg-emerald-600 dark:bg-neon-green' : 'bg-black/15 dark:bg-white/20'}`}
    >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
);

const btn = 'inline-flex h-11 flex-1 items-center justify-center whitespace-nowrap rounded-full px-4 text-[14px] font-bold transition-colors';
const solid = `${btn} bg-gray-950 text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-200`;
const outline = `${btn} text-gray-900 ring-1 ring-inset ring-black/15 hover:bg-black/[0.04] dark:text-white dark:ring-white/20 dark:hover:bg-white/[0.06]`;

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
                className="pointer-events-auto w-full max-w-[26rem] rounded-[1.5rem] bg-white p-5 text-gray-900 shadow-[0_20px_60px_-12px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.06] outline-none dark:bg-[#15171d] dark:text-white dark:ring-white/10"
            >
                {!settingsOpen ? (
                    <>
                        <h2 id="nb-consent-title" className="font-heading text-[17px] font-extrabold tracking-[-0.01em]">{t('Cookies, kept simple')}</h2>
                        <p className="mt-2 text-[14px] leading-relaxed text-gray-600 dark:text-zinc-400">
                            {t('We use essential storage to keep you signed in and remember your settings. With your OK, we also count page visits (no ads, no tracking across sites) and play embedded videos. We never sell your data.')}{' '}
                            <a href={privacyHref} className="font-semibold text-gray-900 underline underline-offset-2 dark:text-white">{t('Privacy Policy')}</a>
                        </p>
                        <div className="mt-4 flex gap-2">
                            <button type="button" className={outline} onClick={() => choose({ analytics: false, media: false })}>{t('Essential only')}</button>
                            <button type="button" className={solid} onClick={() => choose({ analytics: true, media: true })}>{t('Allow all')}</button>
                        </div>
                        <button
                            type="button"
                            onClick={() => { setDraft({ analytics: false, media: false }); setSettingsOpen(true); }}
                            className="mt-2 inline-flex min-h-[44px] w-full items-center justify-center text-[14px] font-semibold text-gray-600 underline-offset-2 hover:underline dark:text-zinc-400"
                        >
                            {t('Choose what to allow')}
                        </button>
                    </>
                ) : (
                    <>
                        <h2 id="nb-consent-title" className="font-heading text-[17px] font-extrabold tracking-[-0.01em]">{t('Cookie settings')}</h2>
                        {gpc && (
                            <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800 dark:bg-neon-green/10 dark:text-neon-green">
                                {t('Your browser sends Global Privacy Control, so everything optional stays off.')}
                            </p>
                        )}
                        <ul className="mt-3 divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                            <li className="flex items-start gap-3 py-3">
                                <div className="min-w-0 flex-1">
                                    <p className="text-[15px] font-bold">{t('Essential')}</p>
                                    <p className="text-[13px] text-gray-600 dark:text-zinc-400">{t('Sign-in, language and theme, offline passes and form drafts. The site needs these to work.')}</p>
                                </div>
                                <Switch checked disabled label={t('Essential, always on')} />
                            </li>
                            <li className="flex items-start gap-3 py-3">
                                <div className="min-w-0 flex-1">
                                    <p className="text-[15px] font-bold">{t('Analytics')}</p>
                                    <p className="text-[13px] text-gray-600 dark:text-zinc-400">{t('Counts page visits and load times with Vercel Analytics. No cookies, no ads, not linked to your account.')}</p>
                                </div>
                                <Switch checked={draft.analytics} disabled={gpc} label={t('Analytics')} onChange={(v) => setDraft(d => ({ ...d, analytics: v }))} />
                            </li>
                            <li className="flex items-start gap-3 py-3">
                                <div className="min-w-0 flex-1">
                                    <p className="text-[15px] font-bold">{t('Embedded videos')}</p>
                                    <p className="text-[13px] text-gray-600 dark:text-zinc-400">{t('Plays videos from YouTube, Vimeo and Instagram, which set their own cookies. When off, you see a cover image instead.')}</p>
                                </div>
                                <Switch checked={draft.media} disabled={gpc} label={t('Embedded videos')} onChange={(v) => setDraft(d => ({ ...d, media: v }))} />
                            </li>
                        </ul>
                        <div className="mt-3 flex gap-2">
                            <button type="button" className={outline} onClick={() => choose(gpc ? {} : draft)}>{t('Save choices')}</button>
                            <button type="button" className={solid} disabled={gpc} onClick={() => choose({ analytics: true, media: true })}>{t('Allow all')}</button>
                        </div>
                        <p className="mt-3 text-[12px] text-gray-500 dark:text-zinc-500">
                            {t('Change this any time from “Cookie settings” at the bottom of the page.')}{' '}
                            <a href={privacyHref} className="underline underline-offset-2">{t('How we use your data')}</a>
                        </p>
                    </>
                )}
            </section>
        </div>
    );
}
