import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAppStore } from '../../lib/store/appStore';
import { Button } from '../../components/app';
import { isPresent } from '../../lib/present';
import useDynamicMeta from '../../hooks/useDynamicMeta';
import { appPath } from '../host';
import { PageBody } from '../pages/PageHeader';
import { BackLink, PanelLabel } from '../pages/DetailLayout';
import { plainText } from './communityParts';
import { useT } from '../../i18n';

const FormRenderer = lazy(() => import('../../components/admin/forms/FormRenderer'));

/*
 * /forms/:id: one form. Only that form is loaded (the cached public API, then
 * Firestore), and nobody is asked to sign in just for opening it. A form that
 * needs an account (one entry per person) asks when it's submitted.
 */

const loadForm = async (id) => {
    try {
        const res = await fetch(`/api/forms?id=${encodeURIComponent(id)}`);
        const json = await res.json();
        if (json?.success && json.form) return json.form;
    } catch { /* fall back to Firestore */ }
    if (!db) return null;
    const snap = await getDoc(doc(db, 'forms', id)).catch(() => null);
    return snap?.exists() ? { id: snap.id, ...snap.data() } : null;
};

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

const FormPage = () => {
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

    if (form === undefined) {
        return (
            <PageBody>
                <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-12">
                    <div className="space-y-3">
                        <div className="h-10 w-2/3 animate-pulse rounded-full bg-black/[0.06] dark:bg-white/[0.06]" />
                        <div className="h-20 animate-pulse rounded-3xl bg-black/[0.04] dark:bg-white/[0.04]" />
                    </div>
                    <div className="h-96 animate-pulse rounded-[2rem] bg-black/[0.04] dark:bg-white/[0.04]" />
                </div>
            </PageBody>
        );
    }

    if (!form) {
        return (
            <PageBody>
                <div className="mx-auto max-w-md space-y-4 rounded-3xl border border-dashed border-black/[0.1] px-6 py-10 text-center dark:border-white/[0.1]">
                    <p className="text-[17px] font-bold">{t('Form not found')}</p>
                    <p className="text-[15px] text-gray-600 dark:text-zinc-400">{t('It may have closed or moved.')}</p>
                    <Button variant="secondary" to={appPath('/community')}>{t('See what’s on')}</Button>
                </div>
            </PageBody>
        );
    }

    const description = plainText(form.description);

    return (
        <PageBody>
            <div className="relative isolate">
                <div className="mb-3 lg:mb-5"><BackLink to={appPath('/community')}>{t('Community')}</BackLink></div>

                {/* Phones: one column. Desktop: what it is on the left (stays put), the form on the right. */}
                <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-12">
                    <header className="space-y-4 lg:sticky lg:top-24 lg:self-start">
                        {isPresent(form.image) && (
                            <img src={form.image} alt="" decoding="async" className="aspect-video w-full rounded-3xl border border-black/[0.06] object-cover shadow-[0_30px_80px_-40px_rgba(0,0,0,0.6)] dark:border-white/[0.08]" />
                        )}
                        <PanelLabel>{closed ? t('Closed') : t('Form')}</PanelLabel>
                        <h1 className="font-heading text-[30px] font-extrabold leading-[1.04] tracking-[-0.035em] sm:text-[36px] lg:text-[44px]">{form.title}</h1>
                        {isPresent(description) && <p className="whitespace-pre-line text-[15px] leading-relaxed text-gray-600 dark:text-zinc-400 lg:text-[16px]">{description}</p>}
                        {!native && url && !form.requiresExternal && (
                            <p className="hidden text-[13px] text-gray-500 dark:text-zinc-500 lg:block">
                                {t('Trouble with the form?')} <a href={url} target="_blank" rel="noopener noreferrer" className="font-bold text-gray-900 underline decoration-neon-green decoration-2 underline-offset-2 dark:text-white">{t('Open it in a new tab')}</a>.
                            </p>
                        )}
                    </header>

                    <div className="space-y-3">
                        <div className="overflow-hidden rounded-[2rem] bg-white ring-1 ring-inset ring-black/[0.06] shadow-[0_24px_60px_-30px_rgba(0,0,0,0.35)] dark:bg-[#0c0e14] dark:ring-white/[0.08] [&_input]:text-[16px] [&_select]:text-[16px] [&_textarea]:text-[16px]">
                            {native ? (
                                <Suspense fallback={<div className="h-80 animate-pulse" />}>
                                    <FormRenderer form={form} />
                                </Suspense>
                            ) : closed ? (
                                <p className="px-6 py-14 text-center text-[16px] font-bold">{t('This form is closed.')}</p>
                            ) : !url ? (
                                <p className="px-6 py-14 text-center text-[15px] text-gray-600 dark:text-zinc-400">{t('This form isn’t available right now.')}</p>
                            ) : form.requiresExternal ? (
                                <div className="space-y-4 px-6 py-12 text-center">
                                    <p className="text-[15px] text-gray-600 dark:text-zinc-400">{t('This form opens in a new tab (it needs Google sign-in or file uploads).')}</p>
                                    <Button href={url} target="_blank" rel="noopener noreferrer" icon={ExternalLink}>{t('Open form')}</Button>
                                </div>
                            ) : (
                                <div className="relative">
                                    {!frameReady && <div className="absolute inset-0 animate-pulse bg-black/[0.03] dark:bg-white/[0.03]" />}
                                    <iframe
                                        src={url}
                                        title={form.title || t('Form')}
                                        onLoad={() => setFrameReady(true)}
                                        className="block h-[80dvh] min-h-[560px] w-full border-0"
                                        allow="camera; microphone"
                                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                                    />
                                </div>
                            )}
                        </div>

                        {!native && url && !form.requiresExternal && (
                            <p className="text-center text-[13px] text-gray-500 dark:text-zinc-500 lg:hidden">
                                {t('Trouble with the form?')} <a href={url} target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-2">{t('Open it in a new tab')}</a>.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </PageBody>
    );
};

export default FormPage;
