import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Share from 'lucide-react/dist/esm/icons/share';
import TicketX from 'lucide-react/dist/esm/icons/ticket-x';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import X from 'lucide-react/dist/esm/icons/x';
import { Button } from '../../components/app';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
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

/*
 * Over a list: just the ticket, floating on a dimmed backdrop (no sheet around
 * it). Tap outside, the close button or Escape to go back to the list.
 */
const TicketOverlay = ({ onClose, label, children }) => {
    const t = useT();
    useBodyScrollLock(true);
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    return createPortal(
        <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-black/70 backdrop-blur-md"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="flex min-h-full items-center justify-center px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(4.5rem+env(safe-area-inset-top))]" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
                <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 32 }} className="relative w-full max-w-sm">
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t('Close')}
                        className="absolute -top-14 right-0 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-inset ring-white/20 backdrop-blur-xl transition-colors hover:bg-white/25"
                    >
                        <X size={20} />
                    </button>
                    {children}
                </motion.div>
            </div>
        </motion.div>,
        document.body
    );
};

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
        return (
            <TicketOverlay onClose={close} label={t('Your pass')}>
                {pass ? <PassView pass={pass} bare offline={fromCache && typeof navigator !== 'undefined' && navigator.onLine === false} />
                    : error ? <PassMissing message={error} /> : <PassSkeleton />}
            </TicketOverlay>
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
