import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAppStore } from '../../lib/store/appStore';
import { AmbientBackdrop, Button } from '../../components/app';
import { isPresent } from '../../lib/present';
import useDynamicMeta from '../../hooks/useDynamicMeta';
import { appPath } from '../host';
import { PageBody } from '../pages/PageHeader';
import { plainText } from './communityParts';

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
                <div className="mx-auto max-w-2xl space-y-4">
                    <div className="h-8 w-2/3 animate-pulse rounded-full bg-black/[0.06] dark:bg-white/[0.06]" />
                    <div className="h-80 animate-pulse rounded-3xl bg-black/[0.04] dark:bg-white/[0.04]" />
                </div>
            </PageBody>
        );
    }

    if (!form) {
        return (
            <PageBody>
                <div className="mx-auto max-w-md space-y-4 rounded-3xl border border-dashed border-black/[0.1] px-6 py-10 text-center dark:border-white/[0.1]">
                    <p className="text-[17px] font-bold">Form not found</p>
                    <p className="text-[15px] text-gray-600 dark:text-zinc-400">It may have closed or moved.</p>
                    <Button variant="secondary" to={appPath('/community')}>See what’s on</Button>
                </div>
            </PageBody>
        );
    }

    const description = plainText(form.description);

    return (
        <PageBody>
            <div className="mx-auto max-w-2xl space-y-5">
                <Link to={appPath('/community')} className="-ml-2 inline-flex h-10 items-center gap-1 rounded-full px-2 text-[14px] font-bold text-gray-600 dark:text-zinc-400">
                    <ChevronLeft size={18} /> Community
                </Link>

                <header className="relative overflow-hidden rounded-[2rem] border border-black/[0.06] bg-white px-5 py-6 dark:border-white/[0.08] dark:bg-[#0c0e14] sm:px-7">
                    <AmbientBackdrop image={form.image} />
                    <div className="relative space-y-2">
                        <h1 className="font-heading text-[26px] font-black leading-tight tracking-tight sm:text-[32px]">{form.title}</h1>
                        {isPresent(description) && <p className="whitespace-pre-line text-[15px] text-gray-600 dark:text-zinc-400">{description}</p>}
                    </div>
                </header>

                <div className="overflow-hidden rounded-[2rem] border border-black/[0.06] bg-white dark:border-white/[0.08] dark:bg-[#0c0e14] [&_input]:text-[16px] [&_select]:text-[16px] [&_textarea]:text-[16px]">
                    {native ? (
                        <Suspense fallback={<div className="h-80 animate-pulse" />}>
                            <FormRenderer form={form} />
                        </Suspense>
                    ) : closed ? (
                        <p className="px-6 py-14 text-center text-[16px] font-bold">This form is closed.</p>
                    ) : !url ? (
                        <p className="px-6 py-14 text-center text-[15px] text-gray-600 dark:text-zinc-400">This form isn’t available right now.</p>
                    ) : form.requiresExternal ? (
                        <div className="space-y-4 px-6 py-12 text-center">
                            <p className="text-[15px] text-gray-600 dark:text-zinc-400">This form opens in a new tab (it needs Google sign-in or file uploads).</p>
                            <Button href={url} target="_blank" rel="noopener noreferrer" icon={ExternalLink}>Open form</Button>
                        </div>
                    ) : (
                        <div className="relative">
                            {!frameReady && <div className="absolute inset-0 animate-pulse bg-black/[0.03] dark:bg-white/[0.03]" />}
                            <iframe
                                src={url}
                                title={form.title || 'Form'}
                                onLoad={() => setFrameReady(true)}
                                className="block h-[80dvh] min-h-[560px] w-full border-0"
                                allow="camera; microphone"
                                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                            />
                        </div>
                    )}
                </div>

                {!native && url && !form.requiresExternal && (
                    <p className="text-center text-[13px] text-gray-500 dark:text-zinc-500">
                        Trouble with the form? <a href={url} target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-2">Open it in a new tab</a>.
                    </p>
                )}
            </div>
        </PageBody>
    );
};

export default FormPage;
