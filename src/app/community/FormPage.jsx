import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import { useAppStore } from '../../lib/store/appStore';
import { Button, CARD_TYPES } from '../../components/app';
import { isPresent } from '../../lib/present';
import useDynamicMeta from '../../hooks/useDynamicMeta';
import { appPath } from '../host';
import { ROW } from '../pages/DetailLayout';
import { ActionBar, BackButton, BarStatus, ExpandedHero, ExpandedMissing, ExpandedPage, ExpandedSkeleton, ExpandedTitle, useCloseExpanded } from '../pages/ExpandedCard';
import { loadForm, plainText, shareLink } from './communityParts';
import { useT } from '../../i18n';

const FormIcon = CARD_TYPES.form.icon;
const FormRenderer = lazy(() => import('../../components/admin/forms/FormRenderer'));

/*
 * /forms/:id: one form. Only that form is loaded (the cached public API, then
 * Firestore), and nobody is asked to sign in just for opening it. A form that
 * needs an account (one entry per person) asks when it's submitted.
 */

const embedUrl = (form, email) => {
    let raw = form?.formUrl || form?.link || form?.applyLink || '';
    if (raw.includes('<iframe')) raw = raw.match(/src="([^"]+)"/)?.[1] || '';
    try {
        const url = new URL(raw);
        if (email && /docs\.google\.com/.test(url.hostname)) url.searchParams.set('emailAddress', email);
        return url.toString();
    } catch {
        return '';
    }
};

const FormPage = ({ overlay = false }) => {
    const t = useT();
    const { id } = useParams();
    const email = useAppStore(s => s.authUser?.email);
    const [form, setForm] = useState(undefined);
    const [frameReady, setFrameReady] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setForm(undefined);
        loadForm(id).then(f => { if (!cancelled) setForm(f); });
        return () => { cancelled = true; };
    }, [id]);

    useDynamicMeta({ page: 'form', title: form?.title, description: form ? plainText(form.description).slice(0, 160) || undefined : undefined, image: form?.image || undefined });

    const url = useMemo(() => embedUrl(form, email), [form, email]);
    const native = Array.isArray(form?.fields) && form.fields.length > 0;
    const closed = String(form?.activeLabel || form?.status || '').toLowerCase() === 'closed';
    const close = useCloseExpanded(appPath('/community'));
    const back = !overlay ? <BackButton to={appPath('/community')}>{t('Community')}</BackButton> : null;

    if (!form) {
        return (
            <ExpandedPage
                overlay={overlay}
                onClose={close}
                back={back}
                label={t('Form')}
                body={form === null
                    ? <ExpandedMissing title={t('Form not found')} message={t('It may have closed or moved.')} action={<Button variant="secondary" to={appPath('/community')}>{t('See what’s on')}</Button>} />
                    : <ExpandedSkeleton />}
            />
        );
    }

    // A gig's application lives inside the gig (old shared links land there).
    if (form.gigId) return <Navigate to={`${appPath('/community')}?gig=${encodeURIComponent(form.gigId)}`} replace />;

    const description = plainText(form.description);
    const share = () => shareLink({ title: form.title, url: window.location.href });
    const embedded = !native && !closed && url && !form.requiresExternal;

    // Native forms submit inside the card; the bar opens the rest in a new tab.
    const action = closed
        ? <BarStatus>{t('This form is closed.')}</BarStatus>
        : !native && url
            ? <Button className="flex-1" size="lg" variant={form.requiresExternal ? 'primary' : 'secondary'} icon={ExternalLink} href={url} target="_blank" rel="noopener noreferrer">{form.requiresExternal ? t('Open form') : t('Open in a new tab')}</Button>
            : <div className="flex-1" />;
    const bar = <ActionBar onShare={share} shareLabel="Share form">{action}</ActionBar>;

    return (
        <ExpandedPage
            overlay={overlay}
            onClose={close}
            back={back}
            label={form.title}
            hero={<ExpandedHero image={isPresent(form.image) ? form.image : null} icon={FormIcon} chips={[{ icon: MapPin, label: form.city }, { label: closed ? t('Closed') : null }]} />}
            bar={bar}
        >
            <ExpandedTitle title={form.title} />
            {isPresent(description) && <p className="whitespace-pre-line text-[15px] leading-relaxed text-gray-700 dark:text-zinc-300">{description}</p>}

            {native ? (
                <div className="overflow-hidden rounded-[1.75rem] bg-white ring-1 ring-inset ring-black/[0.06] dark:bg-[#0c0e14] dark:ring-white/[0.08] [&_input]:text-[16px] [&_select]:text-[16px] [&_textarea]:text-[16px]">
                    <Suspense fallback={<div className="h-80 animate-pulse" />}>
                        <FormRenderer form={form} />
                    </Suspense>
                </div>
            ) : embedded ? (
                <div className="relative -mx-5 overflow-hidden bg-white ring-1 ring-inset ring-black/[0.06] dark:ring-white/[0.08] sm:mx-0 sm:rounded-[1.75rem]">
                    {!frameReady && <div className="absolute inset-0 animate-pulse bg-black/[0.03] dark:bg-white/[0.03]" />}
                    <iframe
                        src={url}
                        title={form.title || t('Form')}
                        onLoad={() => setFrameReady(true)}
                        className="block h-[75dvh] min-h-[520px] w-full border-0"
                        allow="camera; microphone"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                    />
                </div>
            ) : !closed && !url ? (
                <p className={`${ROW} px-5 py-8 text-center text-[15px] text-gray-600 dark:text-zinc-400`}>{t('This form isn’t available right now.')}</p>
            ) : form.requiresExternal && !closed ? (
                <p className="text-[14px] text-gray-600 dark:text-zinc-400">{t('This form opens in a new tab (it needs Google sign-in or file uploads).')}</p>
            ) : null}
        </ExpandedPage>
    );
};

export default FormPage;
