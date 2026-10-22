import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Share from 'lucide-react/dist/esm/icons/share';
import TicketX from 'lucide-react/dist/esm/icons/ticket-x';
import { Button, Sheet } from '../../components/app';
import { useCloseExpanded } from '../pages/ExpandedCard';
import { useAppStore } from '../../lib/store/appStore';
import { cachePass, cachedPass, passesGet } from '../../lib/passesApi';
import useDynamicMeta from '../../hooks/useDynamicMeta';
import { appPath } from '../host';
import { PageBody } from '../pages/PageHeader';
import PassView from './PassView';
import { canHintAddToHome, warmOfflineCache } from './offline';
import { useT } from '../../i18n';

/*
 * /p/:ref: one pass, opened from Community → My guestlists, a campaign, the
 * pass email or WhatsApp. Shows the saved copy at once (so it opens at the
 * gate with no signal), then refreshes it from the server.
 */

export const PassSkeleton = () => (
    <div className="mx-auto w-full max-w-md space-y-4 rounded-[2rem] border border-black/[0.06] p-6 dark:border-white/[0.08]">
        <div className="mx-auto h-4 w-28 animate-pulse rounded-full bg-black/[0.06] dark:bg-white/[0.06]" />
        <div className="mx-auto h-7 w-3/4 animate-pulse rounded-full bg-black/[0.06] dark:bg-white/[0.06]" />
        <div className="mx-auto h-64 w-64 animate-pulse rounded-3xl bg-black/[0.05] dark:bg-white/[0.05]" />
    </div>
);

export const PassMissing = ({ message }) => {
    const t = useT();
    return (
    <div className="mx-auto max-w-md space-y-4 rounded-3xl border border-dashed border-black/[0.1] px-6 py-10 text-center dark:border-white/[0.1]">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-black/[0.04] text-gray-500 dark:bg-white/[0.05] dark:text-zinc-400"><TicketX size={22} /></span>
        <p className="text-[17px] font-bold">{t('Pass not found')}</p>
        <p className="text-[15px] text-gray-600 dark:text-zinc-400">{message}</p>
        <Button variant="secondary" to={appPath('/community')}>{t('Go to Community')}</Button>
    </div>
    );
};

export const AddToHomeHint = () => {
    const t = useT();
    if (!canHintAddToHome()) return null;
    return (
        <p className="mx-auto flex max-w-md items-start gap-3 rounded-2xl bg-black/[0.03] px-4 py-3 text-[14px] text-gray-600 dark:bg-white/[0.04] dark:text-zinc-400">
            <Share size={18} className="mt-0.5 shrink-0" />
            <span>{t('To open this pass without signal, tap')} <strong className="font-bold text-gray-900 dark:text-white">{t('Share')}</strong>{t(', then')} <strong className="font-bold text-gray-900 dark:text-white">{t('Add to Home Screen')}</strong>.</span>
        </p>
    );
};

const PassPage = ({ overlay = false }) => {
    const t = useT();
    const { ref: rawRef } = useParams();
    const ref = String(rawRef || '').trim().toUpperCase();
    const uid = useAppStore(s => s.authUser?.uid);
    const authReady = useAppStore(s => s.authReady);
    const [pass, setPass] = useState(() => cachedPass(ref));
    const [fromCache, setFromCache] = useState(() => Boolean(cachedPass(ref)));
    const [error, setError] = useState('');

    useDynamicMeta({ page: 'pass', title: pass?.event?.title ? t('Pass · {title}', { title: pass.event.title }) : t('Your pass'), noindex: true });

    useEffect(() => {
        // Wait for sign-in to settle, so the holder gets the full pass on the first request.
        if (!authReady) return undefined;
        let cancelled = false;
        passesGet('get', { ref }).then((res) => {
            if (cancelled) return;
            if (res.ok) {
                setPass(res.data.pass);
                setFromCache(false);
                setError('');
                if (res.data.pass.isHolder) cachePass(res.data.pass);
            } else if (res.code !== 'OFFLINE') {
                setError(res.error);
                if (res.status === 404) setPass(null);
            }
        });
        return () => { cancelled = true; };
    }, [ref, uid, authReady]);

    useEffect(() => {
        if (pass && !fromCache) warmOfflineCache();
    }, [pass, fromCache]);

    const close = useCloseExpanded(appPath('/tickets'));
    if (overlay) {
        // Over a list: the ticket in a sheet.
        return (
            // Sized to the ticket, so there's no empty space under it.
            <Sheet open onClose={close} size="auto" width="sm" bleed header={<span className="sr-only">{t('Your pass')}</span>} bodyClassName="px-3 pb-4 pt-3 sm:px-4">
                {pass ? <PassView pass={pass} bare offline={fromCache && typeof navigator !== 'undefined' && navigator.onLine === false} />
                    : <div className="px-2 pt-12">{error ? <PassMissing message={error} /> : <PassSkeleton />}</div>}
            </Sheet>
        );
    }

    return (
        <PageBody>
            {pass ? (
                <>
                    <PassView pass={pass} offline={fromCache && typeof navigator !== 'undefined' && navigator.onLine === false} />
                    <AddToHomeHint />
                </>
            ) : error ? <PassMissing message={error} /> : <PassSkeleton />}
        </PageBody>
    );
};

export default PassPage;
