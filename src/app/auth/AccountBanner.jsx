import React, { useEffect, useState } from 'react';
import Users from 'lucide-react/dist/esm/icons/users';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import Mail from 'lucide-react/dist/esm/icons/mail';
import UserRoundPen from 'lucide-react/dist/esm/icons/user-round-pen';
import X from 'lucide-react/dist/esm/icons/x';
import { useAppStore } from '../../lib/store/appStore';
import { useStore as useLegacyStore } from '../../lib/store.js';
import { Button, Sheet } from '../../components/app';
import { missingFields } from '../profile/requirements';
import CompleteProfileSheet from '../profile/CompleteProfileSheet';
import AccountMergeFlow from './AccountMergeFlow';
import { findOtherAccounts } from './accountMerge';

/*
 * Home's account banner. Signing in never asks for anything beyond the
 * sign-in itself (Google, phone code, or email and password); once it's done,
 * this asks for what the account is still missing: a verified phone, an email
 * (phone sign-ins have none) or a name. One banner, one sheet for all of it.
 * "Not now" hides it until the next visit (this tab's session).
 *
 * First, though: if another Newbi account has this person's phone number or
 * email (an older phone sign-in, say), it offers to merge that one in, so they
 * end up with one account.
 */

const FIELDS = ['phoneVerified', 'email', 'name'];
const DISMISS_KEY = 'nb_account_banner_dismissed';

const COPY = {
    phoneVerified: { icon: Smartphone, title: 'Verify your phone number', text: 'For passes and tickets on WhatsApp.', cta: 'Verify' },
    email: { icon: Mail, title: 'Add your email', text: 'For campaign updates and tickets.', cta: 'Add' },
    name: { icon: UserRoundPen, title: 'Add your name', text: 'So hosts and brands know who you are.', cta: 'Add' },
};
const SHORT = { phoneVerified: 'verify your phone', email: 'add your email', name: 'add your name' };

// Checked once per account per page load; merging clears it.
const matchCache = new Map();

const readDismissed = () => {
    try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch (e) { return false; }
};

const AccountBanner = () => {
    const authUser = useAppStore(s => s.authUser);
    const profile = useAppStore(s => s.profile);
    const profileLoaded = useAppStore(s => s.profileLoaded);
    const accountSheetOpen = useLegacyStore(s => s.isAuthOpen);
    const [dismissed, setDismissed] = useState(readDismissed);
    const [open, setOpen] = useState(false);
    const [matches, setMatches] = useState([]);
    const [merging, setMerging] = useState(null);

    const ready = authUser && profileLoaded && profile?.uid === authUser.uid && !accountSheetOpen;
    const uid = ready ? authUser.uid : null;
    useEffect(() => {
        if (!uid) return undefined;
        let live = true;
        if (!matchCache.has(uid)) matchCache.set(uid, findOtherAccounts().catch(() => []));
        matchCache.get(uid).then(list => { if (live) setMatches(list); });
        return () => { live = false; };
    }, [uid]);

    const other = matches[0];
    const missing = ready ? missingFields(profile, FIELDS) : [];
    const show = (other || missing.length > 0) && !dismissed && !open && !merging;

    const dismiss = () => {
        setDismissed(true);
        try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch (e) { /* blocked */ }
    };

    const one = missing.length === 1 ? COPY[missing[0]] : null;
    const steps = missing.map(f => SHORT[f]);
    const list = steps.length > 1 ? `${steps.slice(0, -1).join(', ')} and ${steps[steps.length - 1]}` : steps[0] || '';
    const by = other?.matchedBy?.includes('phone') ? 'your phone number' : 'your email';
    const Icon = other ? Users : one?.icon || UserRoundPen;
    const title = other ? 'You have another Newbi account' : one?.title || 'Finish setting up your account';
    const text = other
        ? `It has ${by}. Merge it so your passes and tickets are in one place.`
        : one?.text || `${list.replace(/^./, c => c.toUpperCase())}. Takes a minute.`;
    const cta = other ? 'Merge' : one?.cta || 'Finish';
    const act = () => (other ? setMerging(other) : setOpen(true));

    const merged = () => {
        matchCache.delete(uid);
        setMatches(list => list.filter(m => m.uid !== merging?.uid));
        setMerging(null);
    };

    return (
        <>
            {show && (
                <div className="flex items-center gap-3 rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.07] p-3 pl-4 dark:border-neon-green/20 dark:bg-neon-green/[0.06]">
                    <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-700 min-[400px]:flex dark:bg-neon-green/15 dark:text-neon-green">
                        <Icon size={19} />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-bold leading-snug">{title}</span>
                        <span className="block text-[13px] leading-snug text-gray-600 dark:text-zinc-400">{text}</span>
                    </span>
                    <Button size="sm" className="shrink-0" onClick={act}>{cta}</Button>
                    <button
                        type="button"
                        onClick={dismiss}
                        aria-label="Not now"
                        className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/10"
                    >
                        <X size={18} />
                    </button>
                </div>
            )}
            <CompleteProfileSheet open={open} onClose={() => setOpen(false)} required={FIELDS} title={one ? one.title : 'Finish your account'} />
            <Sheet open={Boolean(merging)} onClose={() => setMerging(null)} title="Merge your accounts" subtitle="Everything moves to the account you're signed in to.">
                {merging && <AccountMergeFlow key={merging.uid} match={merging} onDone={merged} onCancel={() => setMerging(null)} />}
            </Sheet>
        </>
    );
};

export default AccountBanner;
