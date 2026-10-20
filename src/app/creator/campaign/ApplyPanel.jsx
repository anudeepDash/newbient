import React from 'react';
import Zap from 'lucide-react/dist/esm/icons/zap';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import IdCard from 'lucide-react/dist/esm/icons/id-card';
import UserRound from 'lucide-react/dist/esm/icons/user-round';
import { Button } from '../../../components/app';
import { isPresent } from '../../../lib/present';
import { cn } from '../../../lib/utils';
import { GLASS } from '../../pages/parts';
import { compactCount, creatorPassId } from '../format';
import { useT, t as translateNow } from '../../../i18n';

/*
 * How you apply to a campaign.
 *
 *   Newbi ID   your creator card (photo, @handle, followers, ID) and one
 *              button: "1-click apply". No creator ID yet? "Get my creator ID"
 *              opens the 30-second creator form and applies you on the way back.
 *   Form       the campaign's Google Form, opened in the app.
 *
 * `status` replaces the apply buttons once you're in the campaign.
 * `compact` is the phone version (the sheet's bottom bar).
 */

const Avatar = ({ src, size = 'h-12 w-12' }) => (
    src
        ? <img src={src} alt="" className={cn(size, 'shrink-0 rounded-full object-cover ring-2 ring-neon-green/70')} />
        : <span className={cn(size, 'flex shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-gray-500 ring-2 ring-black/[0.06] dark:bg-white/[0.08] dark:text-zinc-400 dark:ring-white/10')}><UserRound size={18} /></span>
);

export const NewbiIdCard = ({ creator, profile }) => {
    const t = useT();
    const handle = creator?.instagram ? `@${String(creator.instagram).replace(/^@/, '')}` : null;
    const followers = compactCount(creator?.instagramFollowers);
    const id = creatorPassId(creator);
    return (
        <div className="relative overflow-hidden rounded-2xl bg-[#0b0d12] p-4 text-white ring-1 ring-inset ring-white/10">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(90% 120% at 100% 0%, rgba(57,255,20,0.22), transparent 60%)' }} />
            <div className="relative flex items-center gap-3">
                <Avatar src={creator?.profilePicture || profile?.photoURL} />
                <div className="min-w-0 flex-1">
                    <p className="truncate font-heading text-[16px] font-extrabold tracking-[-0.01em]">{creator?.name || profile?.name || t('Your Newbi ID')}</p>
                    <p className="truncate text-[13px] text-zinc-400">{[handle, followers && t('{count} followers', { count: followers })].filter(Boolean).join(' · ') || t('Creator profile')}</p>
                </div>
            </div>
            {id && (
                <p className="relative mt-3 flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-neon-green">
                    <IdCard size={13} /> {t('Newbi ID')} · {id}
                </p>
            )}
        </div>
    );
};

/* What the apply button does right now, or null when nothing can be done here. */
const primaryFor = ({ method, signedIn, loading, creator, blocker, applying, onApply, onGetId, onSignIn, onOpenForm }) => {
    if (method === 'form') {
        if (creator && blocker) return null;
        return { label: translateNow('Apply with the form'), icon: FileText, onClick: onOpenForm, hint: translateNow('Opens the campaign’s Google Form here.') };
    }
    if (!signedIn) return { label: translateNow('Apply with Newbi ID'), icon: Zap, onClick: onSignIn, hint: translateNow('Sign in, then it’s one tap.') };
    if (loading) return { label: translateNow('Loading'), loading: true };
    if (!creator) return { label: translateNow('Get my creator ID'), icon: IdCard, onClick: onGetId, hint: translateNow('30 seconds. We apply you to this campaign right after.') };
    if (blocker) return null;
    return { label: translateNow('1-click apply'), icon: Zap, onClick: onApply, loading: applying, hint: translateNow('Your Newbi ID is sent to the brand.') };
};

const ApplyPanel = (props) => {
    const t = useT();
    const { method, creator, profile, signedIn, blocker, status, onOpenForm, onShare, compact } = props;
    const primary = status ? null : primaryFor(props);
    const formToo = !status && method === 'both' && !(creator && blocker);
    const showCard = !status && method !== 'form' && signedIn && creator;

    const shareButton = onShare && (
        <Button variant="secondary" size="lg" icon={Share2} onClick={onShare} aria-label={t('Share campaign')} className="w-14 shrink-0 px-0" />
    );
    const blockerText = !status && creator && blocker
        ? <p className="flex min-h-[48px] flex-1 items-center text-[14px] font-semibold text-gray-600 dark:text-zinc-400">{blocker}</p>
        : null;

    if (compact) {
        const handle = creator?.instagram ? `@${String(creator.instagram).replace(/^@/, '')}` : null;
        const id = creatorPassId(creator);
        return (
            <div className="space-y-2.5">
                {showCard && !blocker && (handle || id) && (
                    <div className="flex items-center gap-2.5">
                        <Avatar src={creator?.profilePicture || profile?.photoURL} size="h-8 w-8" />
                        <p className="min-w-0 flex-1 truncate text-[13px] text-gray-600 dark:text-zinc-400">
                            {t('Applying as')} <span className="font-bold text-gray-900 dark:text-white">{handle || creator?.name}</span>
                            {id && <span className="ml-1.5 font-mono text-[11px] font-bold tracking-[0.12em] text-emerald-700 dark:text-neon-green">ID {id}</span>}
                        </p>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    {status || blockerText || (primary && (
                        <Button className="flex-1" size="lg" icon={primary.icon} loading={primary.loading} disabled={primary.loading && !primary.onClick} onClick={primary.onClick}>{primary.label}</Button>
                    ))}
                    {shareButton}
                </div>
                {formToo && (
                    <button type="button" onClick={onOpenForm} className="block w-full text-center text-[13px] font-bold text-gray-700 underline decoration-neon-green decoration-2 underline-offset-4 dark:text-zinc-300">{t('Or apply with the Google Form')}</button>
                )}
            </div>
        );
    }

    return (
        <section className={cn('space-y-4 rounded-[1.75rem] p-5', GLASS)} aria-label={t('Apply')}>
            <p className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gray-600 dark:text-zinc-400">
                <span className="h-1.5 w-1.5 rounded-full bg-neon-green shadow-[0_0_8px_rgba(57,255,20,0.9)]" aria-hidden="true" />
                {status ? t('Your status') : method === 'form' ? t('Apply') : t('Apply with your Newbi ID')}
            </p>
            {showCard && <NewbiIdCard creator={creator} profile={profile} />}
            {status ? <div className="flex items-center gap-2">{status}{shareButton}</div> : (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        {blockerText || (primary && (
                            <Button className="flex-1" size="lg" icon={primary.icon} loading={primary.loading} disabled={primary.loading && !primary.onClick} onClick={primary.onClick}>{primary.label}</Button>
                        ))}
                        {shareButton}
                    </div>
                    {formToo && <Button className="w-full" variant="secondary" icon={FileText} onClick={onOpenForm}>{t('Or apply with the Google Form')}</Button>}
                    {isPresent(primary?.hint) && <p className="px-1 text-[13px] text-gray-500 dark:text-zinc-400">{primary.hint}</p>}
                </div>
            )}
        </section>
    );
};

export default ApplyPanel;
