import React, { useState } from 'react';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Medal from 'lucide-react/dist/esm/icons/medal';
import X from 'lucide-react/dist/esm/icons/x';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import { Button } from '../../../components/app';
import { accent } from '../../../components/admin/theme';
import { copyToClipboard } from '../../../lib/clipboard';
import { useStore as useLegacyStore } from '../../../lib/store.js';
import { cn } from '../../../lib/utils';
import { monthStartIST, tierProgress } from '../../../lib/creator/referralTiers';
import { appPath } from '../../host';
import { creatorPassId } from '../format';
import { inviteUrl, whatsappShareUrl } from '../referral';

/*
 * "Refer more creators" on the Openings tab, for approved creators.
 * The × hides it on this device for 14 days. It comes back sooner when you
 * reach a new tier or a new month starts; after three dismissals it waits
 * for your next tier.
 */

const HIDE_MS = 14 * 86400000;
const keyFor = (uid) => `newbi.referBanner.${uid}`;

const readDismissal = (uid) => {
    try { return JSON.parse(localStorage.getItem(keyFor(uid)) || 'null'); } catch { return null; }
};

const isHidden = (d, tierId) => {
    if (!d) return false;
    if ((d.tier || null) !== (tierId || null)) return false;
    if (d.count >= 3) return true;
    return Date.now() < d.at + HIDE_MS && d.at >= monthStartIST();
};

const ReferBanner = ({ creator, referrals }) => {
    const addToast = useLegacyStore(s => s.addToast);
    const uid = creator.uid || creator.id;
    const approved = referrals?.me?.approved || 0;
    const { tier, next, toNext, ratio } = tierProgress(approved);
    const [dismissal, setDismissal] = useState(() => readDismissal(uid));
    const link = inviteUrl(creatorPassId(creator));

    if (creator.profileStatus !== 'approved' || !referrals || referrals.failed || !link) return null;
    if (isHidden(dismissal, tier?.id)) return null;

    const dismiss = () => {
        const prev = dismissal && (dismissal.tier || null) === (tier?.id || null) ? dismissal.count || 0 : 0;
        const d = { at: Date.now(), tier: tier?.id || null, count: prev + 1 };
        try { localStorage.setItem(keyFor(uid), JSON.stringify(d)); } catch { /* private mode: hide for this visit only */ }
        setDismissal(d);
    };
    const copy = async () => {
        if (await copyToClipboard(link)) addToast?.('Invite link copied', 'success');
    };

    const tone = accent(next?.tone || tier?.tone || 'green');
    const title = !tier
        ? 'Invite a creator, become a Scout'
        : next ? `You’re a ${tier.label}. ${toNext} more to ${next.label}.` : `You’re a ${tier.label}. Keep the top spot.`;
    const body = next
        ? `Get ${toNext} more creator${toNext === 1 ? '' : 's'} approved with your link to unlock: ${next.reward.charAt(0).toLowerCase()}${next.reward.slice(1)}.`
        : 'Every creator you bring in keeps you on the leaderboard.';

    return (
        <section className={cn('relative overflow-hidden rounded-3xl border p-4 sm:p-5', tone.border, tone.soft)} aria-label="Refer creators">
            <button
                type="button"
                onClick={dismiss}
                aria-label="Hide for now"
                className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/5"
            >
                <X size={16} />
            </button>
            <div className="flex gap-3 pr-8">
                <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', tone.chip)}><Medal size={20} /></span>
                <div className="min-w-0 flex-1">
                    <p className="font-heading text-[17px] font-extrabold leading-snug tracking-tight">{title}</p>
                    <p className="mt-0.5 text-[14px] text-gray-600 dark:text-zinc-400">{body}</p>
                </div>
            </div>
            {next && (
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                    <div className={cn('h-full rounded-full', tone.dot)} style={{ width: `${Math.max(4, ratio * 100)}%` }} />
                </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" icon={MessageCircle} href={whatsappShareUrl(link)} target="_blank" rel="noopener noreferrer">Invite on WhatsApp</Button>
                <Button size="sm" variant="secondary" icon={Copy} onClick={copy}>Copy link</Button>
                <Button size="sm" variant="ghost" to={appPath('/creator/referrals')} className="ml-auto">Leaderboard <ChevronRight size={15} /></Button>
            </div>
        </section>
    );
};

export default ReferBanner;
