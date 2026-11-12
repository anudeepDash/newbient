import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import IndianRupee from 'lucide-react/dist/esm/icons/indian-rupee';
import Lock from 'lucide-react/dist/esm/icons/lock';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import CircleCheck from 'lucide-react/dist/esm/icons/circle-check';
import { Button, TextInput, INPUT, ERROR_RING } from '../../components/app';
import useDynamicMeta from '../../hooks/useDynamicMeta';
import { ActionBar, ExpandedHero, ExpandedPage, ExpandedSkeleton, ExpandedTitle } from '../pages/ExpandedCard';
import { Notice } from '../creator/ui';
import { Card } from '../creator/campaign/payout/payoutParts';
import { callTicketApi } from '../../lib/ticketApi';
import { loadRazorpay, preloadRazorpay, razorpayBrand } from '../../lib/razorpayCheckout';
import { useT } from '../../i18n';
import { cn } from '../../lib/utils';

/*
 * /pay/t/:id: a payment page the team shares for an event. The buyer types the
 * amount and their details and pays in Razorpay's window; nothing else (no
 * tickets to pick, no pass). They get a "payment received" email and the team
 * sends the tickets by hand. Server: api/_lib/payPages.js. No sign-in.
 */

const FORM_ID = 'pay-page';
const START = { amount: '', name: '', email: '', phone: '' };
const UNREACHABLE = 'We couldn’t reach Newbi. Check your connection and try again.';

const rupees = (n) => `₹${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN')}`;

const checkLocally = (form) => {
    const errors = {};
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount < 1) errors.amount = 'Enter the amount, at least ₹1.';
    if (form.name.trim().length < 2) errors.name = 'Enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter your email. The confirmation goes there.';
    const digits = form.phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 13) errors.phone = 'Enter your phone number, like 98765 43210.';
    return errors;
};

// Asks Razorpay (through our server) whether the order was paid; the capture can land a moment late.
const verify = async (id, orderId, tries) => {
    let last = null;
    for (let i = 0; i < tries; i++) {
        last = await callTicketApi('ticket-paypage-confirm', { id, orderId, sync: true }, { timeoutMs: 20000 });
        if (last.ok && last.data?.paid) return last;
        if (i < tries - 1) await new Promise(r => setTimeout(r, 2500));
    }
    return last;
};

const PayPage = ({ overlay, onClose }) => {
    const t = useT();
    const { id } = useParams();
    const [state, setState] = useState({ loading: true, page: null, error: '' });
    const [form, setForm] = useState(START);
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(null);

    const load = useCallback(async () => {
        const r = await callTicketApi('ticket-paypage-view', { id });
        setState({ loading: false, page: r.ok ? r.data.page : null, error: r.ok ? '' : (r.unavailable ? UNREACHABLE : r.error) });
    }, [id]);
    useEffect(() => { load(); preloadRazorpay(); }, [load]);

    const page = state.page;
    useDynamicMeta({ page: 'pay-page', title: page?.eventName ? t('Pay for {title}', { title: page.eventName }) : t('Payment'), noindex: true });
    const set = (patch) => { setForm(f => ({ ...f, ...patch })); setErrors(e => ({ ...e, ...Object.fromEntries(Object.keys(patch).map(k => [k, undefined])) })); setError(''); };

    const finish = (data, amount) => {
        setDone({ amount: data.amount || amount, paymentId: data.paymentId, email: form.email.trim().toLowerCase(), emailed: data.emailed !== false });
        window.scrollTo?.({ top: 0, behavior: 'smooth' });
    };

    const pay = async (e) => {
        e?.preventDefault?.();
        if (busy) return;
        const local = checkLocally(form);
        setErrors(Object.fromEntries(Object.entries(local).map(([k, v]) => [k, t(v)])));
        if (Object.keys(local).length) return;
        setBusy(true);
        setError('');
        try {
            const [Razorpay, res] = await Promise.all([
                loadRazorpay().catch(() => null),
                callTicketApi('ticket-paypage-start', { id, amount: Number(form.amount), name: form.name, email: form.email, phone: form.phone }, { timeoutMs: 20000 }),
            ]);
            if (!res.ok) {
                if (res.errors) setErrors(Object.fromEntries(Object.entries(res.errors).map(([k, v]) => [k, t(v)])));
                if (res.code === 'CLOSED') load();
                setError(res.unavailable ? t(UNREACHABLE) : res.error);
                return;
            }
            if (!Razorpay) { setError(t('The payment window didn’t load. Check your connection and try again.')); return; }
            const start = res.data;
            const amount = start.amount / 100;
            await new Promise((resolve) => {
                const settle = async (conf) => {
                    if (conf?.ok && conf.data?.paid) finish(conf.data, amount);
                    resolve();
                };
                const rzp = new Razorpay({
                    key: start.keyId,
                    order_id: start.gatewayOrderId,
                    amount: start.amount,
                    currency: start.currency,
                    name: start.name,
                    description: start.description,
                    prefill: start.prefill,
                    notes: start.notes,
                    ...razorpayBrand(),
                    handler: async (resp) => {
                        setBusy(true);
                        let conf = await callTicketApi('ticket-paypage-confirm', { id, ...resp }, { timeoutMs: 25000 });
                        if (!conf.ok || !conf.data?.paid) conf = await verify(id, start.gatewayOrderId, 4);
                        setBusy(false);
                        if (!(conf?.ok && conf.data?.paid)) setError(t('Your payment went through, but we couldn’t confirm it yet. Keep the Razorpay payment ID from your SMS or email; the team will check it.'));
                        settle(conf);
                    },
                    modal: {
                        confirm_close: true,
                        // Closed without the success callback: a UPI app may still have finished it.
                        ondismiss: async () => {
                            setBusy(true);
                            const conf = await verify(id, start.gatewayOrderId, 2);
                            setBusy(false);
                            settle(conf);
                        },
                    },
                });
                rzp.on('payment.failed', (ev) => setError(ev?.error?.description || t('The payment didn’t go through. Please try again.')));
                setBusy(false);
                rzp.open();
            });
        } finally {
            setBusy(false);
        }
    };

    if (state.loading) return <ExpandedPage overlay={overlay} onClose={onClose} label={t('Payment')} body={<ExpandedSkeleton />} />;
    if (!page) {
        return (
            <ExpandedPage overlay={overlay} onClose={onClose} label={t('Payment')} body={(
                <div className="mx-auto max-w-md space-y-3 rounded-3xl border border-dashed border-black/[0.1] px-6 py-10 text-center dark:border-white/[0.1]">
                    <p className="text-[17px] font-bold">{t('This payment link isn’t working')}</p>
                    <p className="text-[15px] text-gray-600 dark:text-zinc-400">{state.error || t('Ask the Newbi team for a new one.')}</p>
                </div>
            )} />
        );
    }

    const hero = <ExpandedHero icon={IndianRupee} chips={[{ label: done ? t('Paid') : t('Payment'), tone: done ? 'accent' : undefined }]} />;
    const eyebrow = <p className="text-[11px] font-black uppercase tracking-widest text-emerald-700 dark:text-neon-green">{t('Pay Newbi')}</p>;

    if (done) {
        return (
            <ExpandedPage overlay={overlay} onClose={onClose} label={t('Payment')} hero={hero}>
                <ExpandedTitle eyebrow={eyebrow} title={t('Payment received')}>
                    <p className="text-[15px] text-gray-600 dark:text-zinc-400">{t('Thanks! We got {amount} for {title}. The Newbi team will send your tickets to you.', { amount: rupees(done.amount), title: page.eventName })}</p>
                </ExpandedTitle>
                <Card>
                    <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:bg-neon-green/15 dark:text-neon-green"><CircleCheck size={22} /></span>
                        <div className="min-w-0">
                            <p className="font-heading text-[26px] font-black leading-none tabular-nums">{rupees(done.amount)}</p>
                            <p className="mt-1 truncate text-[13px] text-gray-500 dark:text-zinc-400">{page.eventName}</p>
                        </div>
                    </div>
                    {done.paymentId && (
                        <p className="border-t border-black/[0.06] pt-3 text-[13px] text-gray-600 dark:border-white/[0.08] dark:text-zinc-400">
                            {t('Razorpay payment ID')} <span className="font-mono font-bold text-gray-900 dark:text-white">{done.paymentId}</span>
                        </p>
                    )}
                </Card>
                <Notice tone="success" title={done.emailed ? t('Confirmation sent to {email}', { email: done.email }) : t('Your payment is saved')}>
                    {done.emailed ? t('Keep that email. Quote the payment ID if you contact us.') : t('The confirmation email is on its way. Keep the payment ID above.')}
                </Notice>
            </ExpandedPage>
        );
    }

    if (!page.open) {
        return (
            <ExpandedPage overlay={overlay} onClose={onClose} label={t('Payment')} hero={hero}>
                <ExpandedTitle eyebrow={eyebrow} title={page.eventName} />
                <Notice tone="info" title={t('This payment page is closed')}>{t('Ask the Newbi team for a new link.')}</Notice>
            </ExpandedPage>
        );
    }

    const amount = Number(form.amount);
    const bar = (
        <ActionBar>
            <Button type="submit" form={FORM_ID} size="lg" icon={Lock} loading={busy} className="flex-1">
                {amount >= 1 ? t('Pay {amount}', { amount: rupees(amount) }) : t('Pay')}
            </Button>
        </ActionBar>
    );

    return (
        <ExpandedPage overlay={overlay} onClose={onClose} label={t('Payment')} hero={hero} bar={bar}>
            <ExpandedTitle eyebrow={eyebrow} title={page.eventName}>
                <p className="text-[15px] text-gray-600 dark:text-zinc-400">{t('Enter the amount the Newbi team told you, then pay with UPI, card or netbanking.')}</p>
            </ExpandedTitle>
            <form id={FORM_ID} onSubmit={pay} noValidate className="space-y-4">
                <Card>
                    <label htmlFor="pay-amount" className="block px-1 text-[13px] font-bold text-gray-700 dark:text-zinc-300">{t('Amount')}</label>
                    <div className="relative">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-heading text-[28px] font-black text-gray-400 dark:text-zinc-500">₹</span>
                        <input
                            id="pay-amount"
                            type="number"
                            inputMode="decimal"
                            min="1"
                            step="0.01"
                            placeholder="0"
                            value={form.amount}
                            onChange={(e) => set({ amount: e.target.value })}
                            className={cn(INPUT, 'h-[72px] pl-11 pr-4 font-heading text-[32px] font-black tabular-nums', errors.amount && ERROR_RING)}
                        />
                    </div>
                    {errors.amount && <p className="px-1 text-[13px] font-medium text-red-600 dark:text-red-400">{errors.amount}</p>}
                </Card>
                <Card>
                    <p className="text-[16px] font-bold">{t('Your details')}</p>
                    <TextInput label={t('Name')} autoComplete="name" value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={120} error={errors.name} />
                    <TextInput label={t('Email')} type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(e) => set({ email: e.target.value })} error={errors.email} hint={t('Your payment confirmation comes here.')} />
                    <TextInput label={t('Phone')} type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="98765 43210" error={errors.phone} />
                </Card>
                {error && <Notice tone="error" title={error} />}
                <button type="submit" hidden aria-hidden tabIndex={-1} />
            </form>
            <p className="flex items-center justify-center gap-1.5 pb-1 text-[12px] text-gray-500 dark:text-zinc-500">
                <ShieldCheck size={14} /> {t('Secured by Razorpay. Your card and bank details never reach Newbi.')}
            </p>
        </ExpandedPage>
    );
};

export default PayPage;
