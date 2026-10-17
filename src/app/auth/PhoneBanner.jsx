import React, { useState } from 'react';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import X from 'lucide-react/dist/esm/icons/x';
import { useAppStore } from '../../lib/store/appStore';
import { Button } from '../../components/app';
import CompleteProfileSheet from '../profile/CompleteProfileSheet';

/*
 * Signed in without a verified phone number: a banner at the top of the app
 * that opens phone verification. Sign-in itself never asks for the number.
 * "Not now" hides it until the next visit (this tab's session).
 */

const DISMISS_KEY = 'nb_phone_banner_dismissed';

const readDismissed = () => {
    try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch (e) { return false; }
};

const PhoneBanner = () => {
    const authUser = useAppStore(s => s.authUser);
    const profile = useAppStore(s => s.profile);
    const profileLoaded = useAppStore(s => s.profileLoaded);
    const [dismissed, setDismissed] = useState(readDismissed);
    const [open, setOpen] = useState(false);

    const show = authUser && profileLoaded && profile?.uid === authUser.uid && !profile.phoneVerified && !dismissed;

    const dismiss = () => {
        setDismissed(true);
        try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch (e) { /* blocked */ }
    };

    return (
        <>
            {show && (
                <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6 lg:px-8 lg:pt-6">
                    <div className="flex items-center gap-3 rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.07] p-3 pl-4 dark:border-neon-green/20 dark:bg-neon-green/[0.06]">
                        <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 min-[400px]:flex text-emerald-700 dark:bg-neon-green/15 dark:text-neon-green">
                            <Smartphone size={19} />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-bold leading-snug">Link your phone</span>
                            <span className="block text-[13px] leading-snug text-gray-600 dark:text-zinc-400">For passes and tickets on WhatsApp.</span>
                        </span>
                        <Button size="sm" className="shrink-0" onClick={() => setOpen(true)}>Verify</Button>
                        <button
                            type="button"
                            onClick={dismiss}
                            aria-label="Not now"
                            className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/10"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}
            <CompleteProfileSheet open={open} onClose={() => setOpen(false)} required={['phoneVerified']} title="Link your phone" />
        </>
    );
};

export default PhoneBanner;
