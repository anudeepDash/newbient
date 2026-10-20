import React, { useCallback, useState } from 'react';
import Check from 'lucide-react/dist/esm/icons/check';
import { Button, WhatsAppBadge, WhatsAppLogo } from '../../components/app';
import { useAppStore } from '../../lib/store/appStore';
import { useStore as useLegacyStore } from '../../lib/store.js';
import { cn } from '../../lib/utils';
import { useT } from '../../i18n';

/*
 * A big "join our WhatsApp group" card. WhatsApp never tells us who joined,
 * so after the Join tap the card asks "Did you join?"; a yes hides it on this
 * device (per account). "Already in? Hide this" does the same without the tap.
 */

const keyFor = (uid) => `newbi.waJoined.${uid || 'guest'}`;
const readJoined = (uid) => {
    try { return JSON.parse(localStorage.getItem(keyFor(uid)) || '{}') || {}; } catch { return {}; }
};

/* Which group links this person said they joined, and a way to mark one. */
export const useJoinedGroups = () => {
    const uid = useAppStore(s => s.authUser?.uid);
    const [joined, setJoined] = useState(() => readJoined(uid));
    const [forUid, setForUid] = useState(uid);
    if (forUid !== uid) { setForUid(uid); setJoined(readJoined(uid)); }
    const markJoined = useCallback((url) => {
        const next = { ...readJoined(uid), [url]: Date.now() };
        try { localStorage.setItem(keyFor(uid), JSON.stringify(next)); } catch { /* private mode: hidden for this visit only */ }
        setJoined(next);
    }, [uid]);
    return { isJoined: (url) => Boolean(url && joined[url]), markJoined };
};

const WhatsAppGroupCard = ({ url, eyebrow, title, body, onJoined, className }) => {
    const t = useT();
    const addToast = useLegacyStore(s => s.addToast);
    const [asking, setAsking] = useState(false);

    const confirm = () => {
        onJoined(url);
        addToast?.(t('Nice, see you in the group.'), 'success');
    };

    return (
        <section
            aria-label={title}
            className={cn(
                'relative overflow-hidden rounded-[1.75rem] p-5 ring-1 ring-inset sm:p-6',
                'bg-gradient-to-br from-[#25D366]/[0.16] via-white/70 to-white/60 ring-[#25D366]/30',
                'dark:from-[#25D366]/[0.14] dark:via-white/[0.04] dark:to-white/[0.03] dark:ring-[#25D366]/25',
                className
            )}
        >
            {/* Big faint logo in the corner. */}
            <WhatsAppLogo size={170} className="pointer-events-none absolute -bottom-10 -right-8 text-[#25D366] opacity-[0.08]" />

            <div className="relative flex items-start gap-4">
                <WhatsAppBadge size={56} />
                <div className="min-w-0 flex-1">
                    {eyebrow && <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#128C7E] dark:text-[#25D366]">{eyebrow}</p>}
                    <h3 className="font-heading text-[20px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[22px]">{title}</h3>
                    {body && <p className="mt-1 text-[14px] text-gray-600 dark:text-zinc-400">{body}</p>}
                </div>
            </div>


            <div className="relative mt-5">
                {asking ? (
                    <div className="space-y-3 rounded-2xl bg-white/80 p-4 ring-1 ring-inset ring-black/[0.06] dark:bg-black/30 dark:ring-white/[0.08]">
                        <p className="font-heading text-[16px] font-extrabold">{t('Did you join the group?')}</p>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Button onClick={confirm} icon={Check} className="w-full bg-[#25D366] sm:flex-1">{t('Yes, I’m in')}</Button>
                            <Button variant="secondary" onClick={() => setAsking(false)} className="w-full sm:flex-1">{t('Not yet')}</Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Button
                            size="lg"
                            icon={WhatsAppLogo}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setAsking(true)}
                            className="w-full bg-[#25D366] sm:w-auto"
                        >
                            {t('Join on WhatsApp')}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setAsking(true)} className="sm:ml-auto">{t('Already in? Hide this')}</Button>
                    </div>
                )}
            </div>
        </section>
    );
};

export default WhatsAppGroupCard;
