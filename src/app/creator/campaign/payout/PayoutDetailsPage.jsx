import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import Landmark from 'lucide-react/dist/esm/icons/landmark';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import CircleCheck from 'lucide-react/dist/esm/icons/circle-check';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import Save from 'lucide-react/dist/esm/icons/save';
import { Button, TextInput } from '../../../../components/app';
import { cn } from '../../../../lib/utils';
import { isPresent } from '../../../../lib/present';
import useDynamicMeta from '../../../../hooks/useDynamicMeta';
import { ActionBar, ExpandedHero, ExpandedPage, ExpandedSkeleton, ExpandedTitle } from '../../../pages/ExpandedCard';
import { Notice } from '../../ui';
import { callCreatorApi } from '../../api';
import { validatePayoutDetails } from '../../../../lib/outreach/deliverables';
import { isOnShortlist } from '../../../../lib/outreach/status';
import { useT } from '../../../../i18n';

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
const EMPTY = { mode: 'upi', upiId: '', name: '', accountNumber: '', confirmAccountNumber: '', ifsc: '', bankName: '' };

const Card = ({ children, className }) => (
    <section className={cn('space-y-3 rounded-[1.75rem] bg-white p-4 ring-1 ring-inset ring-black/[0.06] dark:bg-[#0c0e14] dark:ring-white/[0.08] sm:p-5', className)}>{children}</section>
);

const ModeButton = ({ selected, icon: Icon, title, hint, onClick }) => (
    <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onClick}
        className={cn(
            'flex min-h-[64px] w-full items-center gap-3 rounded-2xl px-4 py-3 text-left ring-1 ring-inset transition-colors',
            selected ? 'bg-emerald-50 ring-2 ring-emerald-500/70 dark:bg-neon-green/10 dark:ring-neon-green/70' : 'ring-black/[0.08] hover:bg-black/[0.03] dark:ring-white/[0.1] dark:hover:bg-white/[0.04]'
        )}
    >
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', selected ? 'bg-emerald-500 text-white dark:bg-neon-green dark:text-black' : 'bg-black/[0.05] text-gray-600 dark:bg-white/[0.08] dark:text-zinc-300')}>
            <Icon size={19} />
        </span>
        <span className="min-w-0">
            <span className="block text-[15px] font-bold">{title}</span>
            <span className="block text-[12.5px] text-gray-500 dark:text-zinc-400">{hint}</span>
        </span>
    </button>
);

const DetailsSummary = ({ details }) => {
    const t = useT();
    const Icon = details.mode === 'bank' ? Landmark : Smartphone;
    return (
        <div className="flex items-center gap-3 rounded-2xl bg-black/[0.03] p-3.5 dark:bg-white/[0.04]">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-gray-700 ring-1 ring-inset ring-black/[0.06] dark:bg-white/[0.06] dark:text-zinc-200 dark:ring-white/[0.08]"><Icon size={20} /></span>
            <div className="min-w-0">
                <p className="text-[12px] font-bold text-gray-500 dark:text-zinc-400">{details.mode === 'bank' ? (details.bankName || t('Bank account')) : t('UPI')}</p>
                <p className="break-words font-mono text-[15px] font-semibold">{details.label}</p>
                {isPresent(details.name) && <p className="truncate text-[13px] text-gray-500 dark:text-zinc-400">{details.name}</p>}
            </div>
        </div>
    );
};

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
    const trust = (
        <div className="flex gap-3 rounded-2xl px-1 text-[13px] text-gray-500 dark:text-zinc-400">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-600 dark:text-neon-green" />
            <p>{t('Only the Newbi team sees these details, and only to pay you. We will never ask for your UPI PIN, a password or an OTP.')}</p>
        </div>
    );

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
    const bank = form.mode === 'bank';

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
                <Card>
                    <p className="text-[16px] font-bold">{t('How should we pay you?')}</p>
                    <div role="radiogroup" aria-label={t('Payout method')} className="grid gap-2 sm:grid-cols-2">
                        <ModeButton selected={!bank} icon={Smartphone} title={t('UPI')} hint={t('Quickest. GPay, PhonePe, Paytm…')} onClick={() => { set({ mode: 'upi' }); setErrors({}); }} />
                        <ModeButton selected={bank} icon={Landmark} title={t('Bank account')} hint={t('Account number and IFSC')} onClick={() => { set({ mode: 'bank' }); setErrors({}); }} />
                    </div>
                </Card>
                <Card>
                    {!bank ? (
                        <>
                            <TextInput label={t('UPI ID')} autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="off" placeholder="name@okaxis" value={form.upiId} onChange={(e) => set({ upiId: e.target.value })} error={errors.upiId} hint={t('Find it in your UPI app, under your profile.')} />
                            <TextInput label={t('Name on the UPI account (optional)')} autoComplete="name" value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={80} />
                        </>
                    ) : (
                        <>
                            <TextInput label={t('Name on the bank account')} autoComplete="name" value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={80} error={errors.name} hint={t('Exactly as your bank has it.')} />
                            <TextInput label={t('Account number')} inputMode="numeric" autoComplete="off" value={form.accountNumber} onChange={(e) => set({ accountNumber: e.target.value })} error={errors.accountNumber} inputClassName="font-mono tracking-wider" />
                            <TextInput label={t('Account number again')} inputMode="numeric" autoComplete="off" onPaste={(e) => e.preventDefault()} value={form.confirmAccountNumber} onChange={(e) => set({ confirmAccountNumber: e.target.value })} error={errors.confirmAccountNumber} inputClassName="font-mono tracking-wider" hint={t('Type it again so a typo doesn’t send your money somewhere else.')} />
                            <div className="grid gap-3 sm:grid-cols-2">
                                <TextInput label={t('IFSC')} autoCapitalize="characters" autoCorrect="off" spellCheck={false} autoComplete="off" placeholder="HDFC0001234" maxLength={11} value={form.ifsc} onChange={(e) => set({ ifsc: e.target.value.toUpperCase() })} error={errors.ifsc} inputClassName="font-mono uppercase tracking-wider" />
                                <TextInput label={t('Bank name (optional)')} value={form.bankName} onChange={(e) => set({ bankName: e.target.value })} maxLength={80} placeholder="HDFC Bank" />
                            </div>
                        </>
                    )}
                </Card>
                {error && <Notice tone="error" title={error} />}
                {trust}
            </form>
        </ExpandedPage>
    );
};

export default PayoutDetailsPage;
