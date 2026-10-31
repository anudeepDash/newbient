import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import CircleCheck from 'lucide-react/dist/esm/icons/circle-check';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import Save from 'lucide-react/dist/esm/icons/save';
import { Button } from '../../../../components/app';
import { isPresent } from '../../../../lib/present';
import useDynamicMeta from '../../../../hooks/useDynamicMeta';
import { ActionBar, ExpandedHero, ExpandedPage, ExpandedSkeleton, ExpandedTitle } from '../../../pages/ExpandedCard';
import { Notice } from '../../ui';
import { callCreatorApi } from '../../api';
import { validatePayoutDetails } from '../../../../lib/outreach/deliverables';
import { isOnShortlist } from '../../../../lib/outreach/status';
import { useT } from '../../../../i18n';
import { EMPTY, Card, DetailsSummary, PayoutMethodFields, PayoutTrust } from './payoutParts';

/*
 * /pay/:token: where a creator tells us how to pay them for a campaign, from
 * the link in the email and WhatsApp the team sends (or shares by hand). No
 * sign-in: it's their personal signed link, the same one as /d/:token.
 * A UPI ID, or a bank account; details they gave for another campaign can be
 * reused in one tap. Once saved, the page says so ("Details added") and they
 * can change them until they're paid. Saving also updates their payee in
 * Finance (api/_lib/outreachDeliver.js). Approved creators only: anyone not
 * on the shortlist is told it opens once they're selected.
 */

const FORM_ID = 'payout-details-form';
const PayoutDetailsPage = () => {
    const t = useT();
    const { token } = useParams();
    const [state, setState] = useState({ loading: true, data: null, error: '' });
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(false);

    const load = useCallback(async () => {
        const r = await callCreatorApi('outreach-deliverables', { token });
        setState({ loading: false, data: r.ok ? r.data : null, error: r.ok ? '' : r.error });
    }, [token]);
    useEffect(() => { load(); }, [load]);

    const d = state.data;
    useDynamicMeta({ page: 'campaign-payout-details', title: d?.campaign?.title ? t('Payout details: {title}', { title: d.campaign.title }) : t('Payout details'), noindex: true });
    const set = (patch) => { setForm(f => ({ ...f, ...patch })); setError(''); };

    const save = async (body) => {
        setSaving(true);
        setError('');
        const r = await callCreatorApi('outreach-payout-details', { token, ...body });
        setSaving(false);
        if (!r.ok) {
            if (r.errors) setErrors(Object.fromEntries(Object.entries(r.errors).map(([k, v]) => [k, t(v)])));
            setError(r.error);
            return;
        }
        setState(s => ({ ...s, data: { ...s.data, payoutDetails: r.data.details, payoutDetailsAt: new Date().toISOString() } }));
        setForm(EMPTY);
        setErrors({});
        setEditing(false);
        window.scrollTo?.({ top: 0, behavior: 'smooth' });
    };

    const submit = (e) => {
        e.preventDefault();
        const local = validatePayoutDetails(form);
        setErrors(Object.fromEntries(Object.entries(local.errors).map(([k, v]) => [k, t(v)])));
        if (!local.ok) return;
        save(form);
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

    if (!isOnShortlist(d.status)) {
        return (
            <ExpandedPage
                label={t('Payout details')}
                body={(
                    <div className="mx-auto max-w-md space-y-3 rounded-3xl border border-dashed border-black/[0.1] px-6 py-10 text-center dark:border-white/[0.1]">
                        <p className="text-[17px] font-bold">{t('Not open yet')}</p>
                        <p className="text-[15px] text-gray-600 dark:text-zinc-400">{t('You can add payout details once you’re selected for this campaign.')}</p>
                    </div>
                )}
            />
        );
    }

    const title = d.campaign.title || t('your campaign');
    const added = Boolean(d.payoutDetails) && !editing;
    const paid = Boolean(d.payout);
    const hero = (
        <ExpandedHero
            image={isPresent(d.campaign.image) ? d.campaign.image : null}
            icon={Wallet}
            chips={[{ label: paid ? t('Paid') : added ? t('Details added') : t('Payout details'), tone: added || paid ? 'accent' : undefined }]}
        />
    );
    const titleBlock = (
        <ExpandedTitle
            eyebrow={<p className="text-[11px] font-black uppercase tracking-widest text-emerald-700 dark:text-neon-green">{title}</p>}
            title={added ? t('You’re all set{name}', { name: d.firstName ? `, ${d.firstName}` : '' }) : d.firstName ? t('Where should we pay you, {name}?', { name: d.firstName }) : t('Where should we pay you?')}
        >
            {!added && <p className="text-[15px] text-gray-600 dark:text-zinc-400">{t('Add a UPI ID or a bank account for your payout for this campaign. It takes a minute.')}</p>}
        </ExpandedTitle>
    );
    const trust = <PayoutTrust />;

    if (added) {
        const bar = !paid && (
            <ActionBar>
                <Button variant="secondary" size="lg" icon={Pencil} onClick={() => { setEditing(true); setForm({ ...EMPTY, mode: d.payoutDetails.mode }); }} className="flex-1">{t('Change details')}</Button>
            </ActionBar>
        );
        return (
            <ExpandedPage label={t('Payout details')} hero={hero} bar={bar || undefined}>
                {titleBlock}
                {paid
                    ? <Notice tone="success" title={t('We’ve paid ₹{amount}.', { amount: Number(d.payout.amount).toLocaleString('en-IN') })}>{t('Thanks for creating with Newbi!')}</Notice>
                    : <Notice tone="success" title={t('Details added. Thank you!')}>{t('We’ll use these for your payout for this campaign. You can change them here until you’re paid.')}</Notice>}
                <Card>
                    <p className="flex items-center gap-2 text-[16px] font-bold"><CircleCheck size={18} className="text-emerald-600 dark:text-neon-green" /> {t('We’ll pay you to')}</p>
                    <DetailsSummary details={d.payoutDetails} />
                </Card>
                {trust}
            </ExpandedPage>
        );
    }

    const bar = (
        <ActionBar>
            {d.payoutDetails && <Button variant="secondary" size="lg" onClick={() => { setEditing(false); setErrors({}); setError(''); }} className="shrink-0">{t('Cancel')}</Button>}
            <Button type="submit" form={FORM_ID} size="lg" icon={Save} loading={saving} className="flex-1">{t('Save payout details')}</Button>
        </ActionBar>
    );

    return (
        <ExpandedPage label={t('Payout details')} hero={hero} bar={bar}>
            {titleBlock}
            {d.savedPayout && !d.payoutDetails && (
                <Card>
                    <p className="text-[16px] font-bold">{t('Use the details you gave us before?')}</p>
                    <DetailsSummary details={d.savedPayout} />
                    <Button variant="secondary" loading={saving} onClick={() => save({ useSaved: true })} className="w-full">{t('Yes, pay me here')}</Button>
                    <p className="text-[13px] text-gray-500 dark:text-zinc-400">{t('Or add different ones below.')}</p>
                </Card>
            )}
            <form id={FORM_ID} onSubmit={submit} noValidate className="space-y-4">
                <PayoutMethodFields form={form} set={set} errors={errors} setErrors={setErrors} />
                {error && <Notice tone="error" title={error} />}
                {trust}
            </form>
        </ExpandedPage>
    );
};

export default PayoutDetailsPage;
