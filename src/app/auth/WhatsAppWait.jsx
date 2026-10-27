import React, { useEffect, useState } from 'react';
import SendHorizontal from 'lucide-react/dist/esm/icons/send-horizontal';
import Lock from 'lucide-react/dist/esm/icons/lock';
import { Button } from '../../components/app/controls';
import WhatsAppLogo from '../../components/app/WhatsAppLogo';
import newbiIcon from '../../assets/logo/newbi-icon.svg';
import { useT } from '../../i18n';

/*
 * The wait after "Sign in with WhatsApp" / "Verify with WhatsApp": a small
 * WhatsApp chat with the message sitting in the compose box and the send
 * button pulsing under a "Tap send" label, then the three steps spelled out
 * (not everyone reads "tap send" the same way). Under them, a live status
 * with the time left on the code, one green button back to WhatsApp, and SMS
 * as the quiet way out. usePhoneVerification finishes by itself when the
 * message arrives.
 *
 * The preview text matches what the server types (api/_lib/waVerify.js:
 * loginMessageText / verifyMessageText); it stays in English because that is
 * what lands in their WhatsApp.
 */

const useTimeLeft = (expiresAt) => {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!expiresAt) return undefined;
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [expiresAt]);
    if (!expiresAt) return null;
    const seconds = Math.max(0, Math.round((expiresAt - now) / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

const WhatsAppWait = ({ code, link, expiresAt, signingIn, opened, onOpen, onCancel, error }) => {
    const t = useT();
    const left = useTimeLeft(expiresAt);
    const lead = signingIn ? 'Sign me in to Newbi:' : 'Verify my number for Newbi:';

    return (
        <div className="space-y-5">
            {/* What they'll see in WhatsApp: our chat, the message typed, send to tap. */}
            <div className="overflow-hidden rounded-3xl shadow-[0_24px_48px_-28px_rgba(0,0,0,0.55)] ring-1 ring-black/[0.06] dark:ring-white/[0.08]" aria-hidden="true">
                <div className="flex items-center gap-3 bg-[#008069] px-4 py-3 text-white dark:bg-[#202C33]">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black">
                        <img src={newbiIcon} alt="" className="h-5 w-auto" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold leading-tight">Newbi Live</p>
                        <p className="text-[12px] leading-tight text-white/70">{t('Business account')}</p>
                    </div>
                    <WhatsAppLogo size={20} className="text-white/80" />
                </div>
                <div className="bg-[#EFEAE2] px-3 pb-3 pt-8 dark:bg-[#0B141A]">
                    <div className="flex items-end gap-2">
                        <div className="min-w-0 flex-1 rounded-[22px] bg-white px-4 py-2.5 text-[15px] leading-snug text-[#111B21] shadow-sm dark:bg-[#2A3942] dark:text-[#E9EDEF]">
                            {lead} <span className="whitespace-nowrap font-semibold">{code}</span>
                        </div>
                        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#00A884] text-white">
                            <span className="absolute inset-0 animate-ping rounded-full bg-[#00A884]/40" />
                            <SendHorizontal size={19} className="relative" />
                            {/* Points at the button they need to press. */}
                            <span className="absolute -top-7 right-0 whitespace-nowrap rounded-full bg-[#111B21] px-2.5 py-1 text-[11px] font-bold text-white shadow-sm dark:bg-white dark:text-[#111B21]">
                                {t('Tap send')} ↓
                            </span>
                        </span>
                    </div>
                </div>
            </div>

            <div className="space-y-3 px-1">
                <h3 className="text-[19px] font-black tracking-tight">{t('Send us the message in WhatsApp')}</h3>
                <ol className="space-y-2.5">
                    {[
                        t('WhatsApp opens a chat with Newbi Live, with the message already typed.'),
                        (
                            <>
                                {t('Tap the green send button')}
                                <span className="ml-1.5 inline-flex h-6 w-6 translate-y-[3px] items-center justify-center rounded-full bg-[#00A884] text-white" aria-hidden="true">
                                    <SendHorizontal size={12} />
                                </span>
                            </>
                        ),
                        signingIn
                            ? t('Come back here. You’re signed in automatically.')
                            : t('Come back here. Your number is confirmed automatically.'),
                    ].map((step, i) => (
                        <li key={i} className="flex items-start gap-3 text-[14px] leading-snug text-gray-700 dark:text-zinc-300">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15 text-[12px] font-bold text-[#128C7E] dark:text-[#25D366]">
                                {i + 1}
                            </span>
                            <span className="pt-0.5">{step}</span>
                        </li>
                    ))}
                </ol>
            </div>

            <div role="status" className="flex items-center justify-between gap-3 rounded-2xl bg-black/[0.04] px-4 py-3 text-[13px] dark:bg-white/[0.05]">
                <span className="flex items-center gap-2.5 font-semibold text-gray-700 dark:text-zinc-200">
                    <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25D366] opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#25D366]" />
                    </span>
                    {t('Waiting for your message')}
                </span>
                {left && (
                    <span className="font-mono text-[13px] tabular-nums text-gray-500 dark:text-zinc-400" aria-label={t('Code expires in {time}', { time: left })}>
                        {left}
                    </span>
                )}
            </div>

            {error && <p role="alert" className="text-center text-[13px] font-medium text-red-600 dark:text-red-400">{error}</p>}

            <div className="space-y-1">
                <Button size="lg" className="w-full bg-[#25D366]" icon={WhatsAppLogo} href={link} target="_blank" rel="noopener noreferrer" onClick={onOpen}>
                    {opened ? t('Open WhatsApp again') : t('Open WhatsApp')}
                </Button>
                <button type="button" onClick={onCancel} className="h-11 w-full text-[14px] font-semibold text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white">
                    {t('Use SMS instead')}
                </button>
            </div>

            <p className="flex items-center justify-center gap-1.5 text-[12px] text-gray-400 dark:text-zinc-500">
                <Lock size={12} aria-hidden="true" />
                {t('We only use this message to confirm your number.')}
            </p>
        </div>
    );
};

export default WhatsAppWait;
