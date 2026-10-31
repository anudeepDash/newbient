import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import Send from 'lucide-react/dist/esm/icons/send';
import { Button, TextInput } from '../../../../components/app';
import { isPresent } from '../../../../lib/present';
import useDynamicMeta from '../../../../hooks/useDynamicMeta';
import { ActionBar, ExpandedHero, ExpandedPage, ExpandedSkeleton, ExpandedTitle } from '../../../pages/ExpandedCard';
import { Notice } from '../../ui';
import { callCreatorApi } from '../../api';
import { validatePayoutDetails } from '../../../../lib/outreach/deliverables';
import { useT } from '../../../../i18n';
import { EMPTY, Card, PayoutMethodFields, PayoutTrust } from './payoutParts';

/*
 * /pay/c/:token: a campaign's open payout form, one link the team shares in a
 * group, a sheet or a chat with creators who worked on the campaign but never
 * applied on the website. They say who they are and how to be paid; the team
 * checks it in Outreach → Payouts before paying (api/_lib/outreachPayoutForm.js).
 * No sign-in. Sending again from the same number replaces what they sent.
 */

const FORM_ID = 'payout-form';
const START = { ...EMPTY, fullName: '', phone: '', instagramHandle: '', email: '', website: '' };

const PayoutFormPage = () => {
    const t = useT();
    const { token } = useParams();
    const [state, setState] = useState({ loading: true, data: null, error: '' });
    const [form, setForm] = useState(START);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(null);

    const load = useCallback(async () => {
        const r = await callCreatorApi('outreach-payout-form', { token });
        setState({ loading: false, data: r.ok ? r.data : null, error: r.ok ? '' : r.error });
    }, [token]);
    useEffect(() => { load(); }, [load]);

    const d = state.data;
    useDynamicMeta({ page: 'campaign-payout-form', title: d?.campaign?.title ? t('Payout details: {title}', { title: d.campaign.title }) : t('Payout details'), noindex: true });
    const set = (patch) => { setForm(f => ({ ...f, ...patch })); setError(''); };

    const submit = async (e) => {
        e.preventDefault();
        const local = validatePayoutDetails(form);
        const errs = { ...local.errors };
        if (form.fullName.trim().length < 2) errs.fullName = 'Enter your full name.';
        if (form.phone.replace(/\D/g, '').length < 10) errs.phone = 'Enter your WhatsApp number, like 98765 43210.';
        if (!form.instagramHandle.trim()) errs.instagramHandle = 'Enter your Instagram handle.';
        setErrors(Object.fromEntries(Object.entries(errs).map(([k, v]) => [k, t(v)])));
        if (Object.keys(errs).length) return;
        setSaving(true);
        setError('');
        const r = await callCreatorApi('outreach-payout-form-submit', { token, ...form });
        setSaving(false);
        if (!r.ok) {
            if (r.errors) setErrors(Object.fromEntries(Object.entries(r.errors).map(([k, v]) => [k, t(v)])));
            setError(r.error);
            return;
        }
        setDone({ name: form.fullName.trim().split(' ')[0], updated: Boolean(r.data.updated) });
        window.scrollTo?.({ top: 0, behavior: 'smooth' });
    };

    if (state.loading) return <ExpandedPage label={t('Payout details')} body={<ExpandedSkeleton />} />;
    if (!d) {
        return (
            <ExpandedPage
                label={t('Payout details')}
                body={(
                    <div className="mx-auto max-w-md space-y-3 rounded-3xl border border-dashed border-black/[0.1] px-6 py-10 text-center dark:border-white/[0.1]">
                        <p className="text-[17px] font-bold">{t('This link isn’t active')}</p>
                        <p className="text-[15px] text-gray-600 dark:text-zinc-400">{state.error || t('Ask the Newbi team on WhatsApp for a new one.')}</p>
                    </div>
                )}
            />
        );
    }

    const title = d.campaign.title || t('your campaign');
    const hero = (
        <ExpandedHero
            image={isPresent(d.campaign.image) ? d.campaign.image : null}
            icon={Wallet}
            chips={[{ label: done ? t('Sent') : t('Payout details'), tone: done ? 'accent' : undefined }]}
        />
    );
    const eyebrow = <p className="text-[11px] font-black uppercase tracking-widest text-emerald-700 dark:text-neon-green">{title}</p>;

    if (done) {
        return (
            <ExpandedPage label={t('Payout details')} hero={hero}>
                <ExpandedTitle eyebrow={eyebrow} title={done.name ? t('Thanks, {name}!', { name: done.name }) : t('Thanks!')}>
                    <p className="text-[15px] text-gray-600 dark:text-zinc-400">{t('The Newbi team will check your details and pay you. We’ll message you on WhatsApp when it’s done.')}</p>
                </ExpandedTitle>
                <Notice tone="success" title={done.updated ? t('Your details are updated.') : t('Your details are in.')}>{t('Made a mistake? Send the form again from the same number and we’ll use the new details.')}</Notice>
                <Button variant="secondary" onClick={() => { setDone(null); setForm(START); setErrors({}); }} className="w-full">{t('Send it again')}</Button>
                <PayoutTrust />
            </ExpandedPage>
        );
    }

    const bar = (
        <ActionBar>
            <Button type="submit" form={FORM_ID} size="lg" icon={Send} loading={saving} className="flex-1">{t('Send payout details')}</Button>
        </ActionBar>
    );

    return (
        <ExpandedPage label={t('Payout details')} hero={hero} bar={bar}>
            <ExpandedTitle eyebrow={eyebrow} title={t('Where should we pay you?')}>
                <p className="text-[15px] text-gray-600 dark:text-zinc-400">{t('Worked with us on {title}? Tell us who you are and how to pay you. It takes a minute.', { title })}</p>
            </ExpandedTitle>
            <form id={FORM_ID} onSubmit={submit} noValidate className="space-y-4">
                <Card>
                    <p className="text-[16px] font-bold">{t('About you')}</p>
                    <TextInput label={t('Full name')} autoComplete="name" value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} maxLength={80} error={errors.fullName} />
                    <TextInput label={t('WhatsApp number')} type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" value={form.phone} onChange={(e) => set({ phone: e.target.value })} error={errors.phone} hint={t('The one the Newbi team talks to you on.')} />
                    <TextInput label={t('Instagram handle')} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="@yourhandle" value={form.instagramHandle} onChange={(e) => set({ instagramHandle: e.target.value })} error={errors.instagramHandle} />
                    <TextInput label={t('Email (optional)')} type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(e) => set({ email: e.target.value })} error={errors.email} />
                    {/* Bots fill this; people never see it. */}
                    <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={form.website} onChange={(e) => set({ website: e.target.value })} />
                </Card>
                <PayoutMethodFields form={form} set={set} errors={errors} setErrors={setErrors} />
                {error && <Notice tone="error" title={error} />}
                <p className="px-1 text-[13px] text-gray-500 dark:text-zinc-400">{t('By sending this, you agree that Newbi can message you on WhatsApp about this payment.')}</p>
                <PayoutTrust />
            </form>
        </ExpandedPage>
    );
};

export default PayoutFormPage;
