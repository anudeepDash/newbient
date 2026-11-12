import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import IndianRupee from 'lucide-react/dist/esm/icons/indian-rupee';
import Lock from 'lucide-react/dist/esm/icons/lock';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import CircleAlert from 'lucide-react/dist/esm/icons/circle-alert';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Clock from 'lucide-react/dist/esm/icons/clock';
import { Button, TextInput, Sheet, INPUT, ERROR_RING } from '../../components/app';
import PayReceipt from './PayReceipt';
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

/* The pop-up when a payment fails, is left unfinished, or went through but isn't confirmed yet. */
const PayProblem = ({ problem, busy, onRetry, onCheck, onClose }) => {
    const t = useT();
    const unconfirmed = problem?.kind === 'unconfirmed';
    const copy = {
        failed: [t('Payment failed'), problem?.message || t('The payment didn’t go through.'), t('No money was taken. Try again, or use another way to pay.')],
        unfinished: [t('Payment not finished'), t('You closed the payment window before paying.'), t('Nothing was charged. Try again when you’re ready.')],
        error: [t('Couldn’t start the payment'), problem?.message, t('Nothing was charged.')],
        unconfirmed: [t('We’re checking your payment'), t('Razorpay says it went through, but we couldn’t confirm it yet.'), problem?.checked
            ? t('Still waiting. Don’t pay again. If money left your account, the team will confirm it; contact us with the payment ID.')
            : t('Don’t pay again. Tap Check again in a few seconds.')],
    }[problem?.kind] || [];
    const Icon = unconfirmed ? Clock : CircleAlert;
    return (
        <Sheet
            open={Boolean(problem)}
            onClose={busy ? undefined : onClose}
            dismissible={!busy}
            title={copy[0]}
            footer={(
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={onClose} disabled={busy} className="flex-1">{t('Close')}</Button>
                    {unconfirmed
                        ? <Button icon={RefreshCw} loading={busy} onClick={onCheck} className="flex-[1.4]">{t('Check again')}</Button>
                        : <Button icon={RefreshCw} loading={busy} onClick={() => onRetry()} className="flex-[1.4]">{t('Try again')}</Button>}
                </div>
            )}
        >
            <div className="flex gap-3">
                <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', unconfirmed ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300' : 'bg-red-500/15 text-red-600 dark:text-red-300')}>
                    <Icon size={22} />
                </span>
                <div className="min-w-0 space-y-1.5 text-[15px]">
                    {copy[1] && <p className="font-semibold text-gray-900 dark:text-white">{copy[1]}</p>}
                    {copy[2] && <p className="text-gray-600 dark:text-zinc-400">{copy[2]}</p>}
                    {unconfirmed && problem.paymentId && (
                        <p className="pt-1 text-[13px] text-gray-500 dark:text-zinc-400">{t('Payment ID')} <span className="font-mono font-bold text-gray-900 dark:text-white">{problem.paymentId}</span></p>
                    )}
                </div>
            </div>
        </Sheet>
    );
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
    const [problem, setProblem] = useState(null); // { kind: 'failed'|'unfinished'|'unconfirmed'|'error', message, orderId, amount }

    const load = useCallback(async () => {
        const r = await callTicketApi('ticket-paypage-view', { id });
        setState({ loading: false, page: r.ok ? r.data.page : null, error: r.ok ? '' : (r.unavailable ? UNREACHABLE : r.error) });
    }, [id]);
    useEffect(() => { load(); preloadRazorpay(); }, [load]);

    const page = state.page;
    useDynamicMeta({ page: 'pay-page', title: page?.eventName ? t('Pay for {title}', { title: page.eventName }) : t('Payment'), image: page?.image || undefined, noindex: true });
    const set = (patch) => { setForm(f => ({ ...f, ...patch })); setErrors(e => ({ ...e, ...Object.fromEntries(Object.keys(patch).map(k => [k, undefined])) })); setError(''); };

    const finish = (data, amount) => {
        setProblem(null);
        setDone({
            amount: data.amount || amount,
            paymentId: data.paymentId,
            method: data.method || '',
            paidAt: data.paidAt || new Date().toISOString(),
            name: form.name.trim(),
            email: form.email.trim().toLowerCase(),
            emailed: data.emailed !== false,
        });
        window.scrollTo?.({ top: 0, behavior: 'smooth' });
    };

    const pay = async (e) => {
        e?.preventDefault?.();
        if (busy) return;
        const local = checkLocally(form);
        setErrors(Object.fromEntries(Object.entries(local).map(([k, v]) => [k, t(v)])));
        if (Object.keys(local).length) { setProblem(null); return; }
        setBusy(true);
        setError('');
        setProblem(null);
        try {
            const [Razorpay, res] = await Promise.all([
                loadRazorpay().catch(() => null),
                callTicketApi('ticket-paypage-start', { id, amount: Number(form.amount), name: form.name, email: form.email, phone: form.phone }, { timeoutMs: 20000 }),
            ]);
            if (!res.ok) {
                if (res.errors) {
                    // Something in the form: show it on the field, not in a pop-up.
                    setErrors(Object.fromEntries(Object.entries(res.errors).map(([k, v]) => [k, t(v)])));
                    setError(res.error);
                    return;
                }
                if (res.code === 'CLOSED') { load(); return; }
                setProblem({ kind: 'error', message: res.unavailable ? t(UNREACHABLE) : (res.error || t('Online payment isn’t working right now. Please try again in a moment.')) });
                return;
            }
            if (!Razorpay) { setProblem({ kind: 'error', message: t('The payment window didn’t load. Check your connection and try again.') }); return; }
            const start = res.data;
            const amount = start.amount / 100;
            let lastFailure = '';
            await new Promise((resolve) => {
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
                        if (conf?.ok && conf.data?.paid) finish(conf.data, amount);
                        else setProblem({ kind: 'unconfirmed', orderId: start.gatewayOrderId, amount, paymentId: resp?.razorpay_payment_id || '' });
                        resolve();
                    },
                    modal: {
                        confirm_close: true,
                        // Closed without the success callback: a UPI app may still have finished it.
                        ondismiss: async () => {
                            setBusy(true);
                            const conf = await verify(id, start.gatewayOrderId, 2);
                            setBusy(false);
                            if (conf?.ok && conf.data?.paid) finish(conf.data, amount);
                            else setProblem({ kind: lastFailure ? 'failed' : 'unfinished', message: lastFailure, orderId: start.gatewayOrderId, amount });
                            resolve();
                        },
                    },
                });
                // Razorpay lets them retry inside its window; the pop-up comes when they close it.
                rzp.on('payment.failed', (ev) => { lastFailure = ev?.error?.description || t('The payment didn’t go through.'); });
                setBusy(false);
                rzp.open();
            });
        } finally {
            setBusy(false);
        }
    };

    // "Check again" for a payment that went through but wasn't confirmed yet.
    const checkAgain = async () => {
        if (!problem?.orderId || busy) return;
        setBusy(true);
        const conf = await verify(id, problem.orderId, 3);
        setBusy(false);
        if (conf?.ok && conf.data?.paid) finish(conf.data, problem.amount);
        else setProblem(p => ({ ...p, checked: true }));
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

    const hero = <ExpandedHero image={page.image || null} icon={IndianRupee} chips={[{ label: done ? t('Paid') : t('Payment'), tone: done ? 'accent' : undefined }]} />;
    const eyebrow = <p className="text-[11px] font-black uppercase tracking-widest text-emerald-700 dark:text-neon-green">{t('Pay Newbi')}</p>;

    if (done) {
        return (
            <ExpandedPage overlay={overlay} onClose={onClose} label={t('Payment')} hero={hero}>
                <ExpandedTitle eyebrow={eyebrow} title={t('Payment received')}>
                    <p className="text-[15px] text-gray-600 dark:text-zinc-400">{t('Thanks! We got {amount} for {title}. The Newbi team will send your tickets to you.', { amount: rupees(done.amount), title: page.eventName })}</p>
                </ExpandedTitle>
                <PayReceipt receipt={{ ...done, eventName: page.eventName }} />
                <Notice tone="success" title={done.emailed ? t('Confirmation sent to {email}', { email: done.email }) : t('Your payment is saved')}>
                    {done.emailed ? t('Keep that email. Quote the payment ID if you contact us.') : t('The confirmation email is on its way. Keep the payment ID on the receipt.')}
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
            <PayProblem problem={problem} busy={busy} onRetry={pay} onCheck={checkAgain} onClose={() => setProblem(null)} />
        </ExpandedPage>
    );
};

export default PayPage;
