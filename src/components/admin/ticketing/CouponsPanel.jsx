import React, { useMemo, useState } from 'react';
import Tag from 'lucide-react/dist/esm/icons/tag';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Pause from 'lucide-react/dist/esm/icons/pause';
import Play from 'lucide-react/dist/esm/icons/play';
import Plus from 'lucide-react/dist/esm/icons/plus';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import Percent from 'lucide-react/dist/esm/icons/percent';
import IndianRupee from 'lucide-react/dist/esm/icons/indian-rupee';
import { useStore } from '../../../lib/store';
import { copyToClipboard } from '../../../lib/clipboard';
import { cn } from '../../../lib/utils';
import { normalizeCouponCode, couponExpiryMoment, SOLD_STATUSES } from '../../../lib/ticketing';
import Sheet from '../Sheet';
import { Button, Badge, EmptyState, Menu, MenuItem, StatTile, SegmentedTabs } from '../ui';
import { accent } from '../theme';
import { Field, Choice, fieldCls } from '../uploads/UploadKit';
import { Panel, Meter, useConfirm, useBusy } from './kit';
import { inr } from './format';

const couponState = (c) => {
    if (c.isActive === false) return { key: 'paused', label: 'Paused', tone: 'gray' };
    const expiry = couponExpiryMoment(c.expiryDate);
    if (expiry && expiry < new Date()) return { key: 'expired', label: 'Expired', tone: 'red' };
    if (c.usageLimit && (Number(c.usedCount) || 0) >= Number(c.usageLimit)) return { key: 'used', label: 'Used up', tone: 'amber' };
    return { key: 'live', label: 'Live', tone: 'green' };
};

const EMPTY = { code: '', type: 'percentage', value: '', limit: '', expiry: '' };

const CouponSheet = ({ open, onClose, eventId, coupons }) => {
    const addToast = useStore(s => s.addToast);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const close = () => { if (!saving) { onClose(); setForm(f => ({ ...EMPTY, type: f.type })); setError(''); } };

    const submit = async (e) => {
        e.preventDefault();
        if (saving) return;
        setError('');
        const code = normalizeCouponCode(form.code);
        const value = Number(form.value);
        const limit = form.limit === '' ? null : Math.floor(Number(form.limit));
        if (!/^[A-Z0-9_-]{3,20}$/.test(code)) return setError('Use 3–20 letters, numbers, - or _.');
        if (!(value > 0)) return setError('Enter a discount above zero.');
        if (form.type === 'percentage' && value > 100) return setError('A percentage discount can be at most 100%.');
        if (limit !== null && !(limit > 0)) return setError('The usage limit must be at least 1, or leave it blank.');
        if (form.expiry && couponExpiryMoment(form.expiry) < new Date()) return setError('The last day is already over.');
        if (coupons.some(c => normalizeCouponCode(c.code) === code && (c.eventId === eventId || !c.eventId))) {
            return setError(`${code} already exists for this event.`);
        }
        setSaving(true);
        try {
            await useStore.getState().addCoupon({
                code,
                discountType: form.type,
                discountValue: value,
                usageLimit: limit,
                expiryDate: form.expiry || null,
                eventId,
            });
            addToast(`Coupon ${code} created.`, 'success');
            setSaving(false);
            onClose();
            setForm({ ...EMPTY, type: form.type });
        } catch (err) {
            console.error(err);
            setError("Couldn't create the coupon. Please try again.");
            setSaving(false);
        }
    };

    return (
        <Sheet
            open={open}
            onClose={close}
            size="sm"
            title="New coupon"
            subtitle="Works only for this event. Buyers type the code at checkout."
            footer={(
                <div className="space-y-2">
                    {error && <p role="alert" className="text-[13px] font-semibold text-red-600 dark:text-red-400">{error}</p>}
                    <Button type="submit" form="coupon-form" variant="accent" disabled={saving || !form.code || !form.value} className="h-12 w-full">
                        <Plus size={15} /> {saving ? 'Creating…' : 'Create coupon'}
                    </Button>
                </div>
            )}
        >
            <form id="coupon-form" onSubmit={submit} className="space-y-4" noValidate>
                <Field label="Code">
                    <input
                        className={cn(fieldCls, 'font-mono')}
                        value={form.code}
                        onChange={e => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                        placeholder="NEWBI20"
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck={false}
                        maxLength={20}
                    />
                </Field>
                <Field label="Discount">
                    <Choice value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={[
                        { value: 'percentage', label: '% off', hint: 'Share of the total' },
                        { value: 'flat', label: '₹ off', hint: 'Fixed amount' },
                    ]} />
                </Field>
                <Field label={form.type === 'percentage' ? 'Percent off' : 'Amount off (₹)'}>
                    <input className={fieldCls} type="number" inputMode="decimal" min="0" max={form.type === 'percentage' ? 100 : undefined}
                        value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder={form.type === 'percentage' ? '20' : '100'} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Max uses" optional>
                        <input className={fieldCls} type="number" inputMode="numeric" min="1" value={form.limit} onChange={e => setForm({ ...form, limit: e.target.value })} placeholder="No limit" />
                    </Field>
                    <Field label="Last day" optional>
                        <input className={fieldCls} type="date" value={form.expiry} onChange={e => setForm({ ...form, expiry: e.target.value })} />
                    </Field>
                </div>
            </form>
        </Sheet>
    );
};

const CouponsPanel = ({ eventId, coupons, orders, canSeeMoney = true }) => {
    const addToast = useStore(s => s.addToast);
    const [creating, setCreating] = useState(false);
    const [show, setShow] = useState('all');
    const [busy, run] = useBusy();
    const [ask, confirmSheet] = useConfirm();

    const eventCoupons = useMemo(() => coupons
        .filter(c => c.eventId === eventId || !c.eventId)
        .sort((a, b) => String(a.code).localeCompare(String(b.code))), [coupons, eventId]);

    // Verified orders per code, to show what each coupon actually did here.
    const usage = useMemo(() => {
        const map = {};
        orders.forEach(o => {
            const code = o.appliedCoupon?.code;
            if (!code || !SOLD_STATUSES.includes(o.status)) return;
            map[code] = map[code] || { orders: 0, discount: 0 };
            map[code].orders += 1;
            map[code].discount += Number(o.discount) || 0;
        });
        return map;
    }, [orders]);

    const totals = useMemo(() => ({
        live: eventCoupons.filter(c => couponState(c).key === 'live').length,
        orders: Object.values(usage).reduce((a, u) => a + u.orders, 0),
        discount: Object.values(usage).reduce((a, u) => a + u.discount, 0),
    }), [eventCoupons, usage]);

    const shown = eventCoupons.filter(c => show === 'all' || (show === 'live' ? couponState(c).key === 'live' : couponState(c).key !== 'live'));

    const toggle = (c) => run(c.id, 'toggle', async () => {
        await useStore.getState().updateCoupon(c.id, { isActive: c.isActive === false });
        addToast(c.isActive === false ? `${c.code} is live again.` : `${c.code} paused.`, 'success');
    }, { errorMessage: "Couldn't update the coupon." });

    const remove = (c) => {
        const used = usage[c.code]?.orders || 0;
        ask({
            title: `Delete ${c.code}?`,
            body: used
                ? `${used} ${used === 1 ? 'order has' : 'orders have'} used it; those orders keep their discount. Pausing is usually better.`
                : !c.eventId ? 'This code works for every event, so it stops working everywhere.' : 'Buyers can no longer use it.',
            confirmLabel: 'Delete coupon',
            danger: true,
            action: async () => {
                await useStore.getState().deleteCoupon(c.id);
                addToast('Coupon deleted.', 'success');
            },
        });
    };

    const copy = async (code) => {
        const ok = await copyToClipboard(code);
        addToast(ok ? 'Code copied.' : "Couldn't copy.", ok ? 'success' : 'error');
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <StatTile icon={Tag} tone="violet" label="Live coupons" value={totals.live} hint={`${eventCoupons.length} in total`} />
                <StatTile icon={Percent} tone="orange" label="Orders with a coupon" value={totals.orders} hint="Verified orders" />
                {canSeeMoney && <StatTile icon={IndianRupee} tone="pink" label="Discount given" value={inr(totals.discount)} hint="On verified orders" className="col-span-2 lg:col-span-1" />}
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <SegmentedTabs value={show} onChange={setShow} items={[
                    { value: 'all', label: 'All', count: eventCoupons.length },
                    { value: 'live', label: 'Live', count: totals.live },
                    { value: 'off', label: 'Paused or ended', count: eventCoupons.length - totals.live },
                ]} />
                <Button variant="accent" className="ml-auto h-11" onClick={() => setCreating(true)}><Plus size={15} /> New coupon</Button>
            </div>

            {shown.length === 0 ? (
                <Panel>
                    <EmptyState icon={Tag} tone="violet" title={eventCoupons.length ? 'Nothing here' : 'No coupons yet'}
                        description={eventCoupons.length ? 'Try another filter.' : 'Create a code to offer a discount for this event.'}
                        action={!eventCoupons.length && <Button variant="accent" className="h-11" onClick={() => setCreating(true)}><Plus size={15} /> New coupon</Button>} />
                </Panel>
            ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {shown.map(c => {
                        const state = couponState(c);
                        const used = Number(c.usedCount) || 0;
                        const verified = usage[c.code];
                        const expiry = couponExpiryMoment(c.expiryDate);
                        return (
                            <Panel key={c.id} className={cn('flex flex-col gap-3 p-4', state.key !== 'live' && 'opacity-80')}>
                                <div className="flex items-start justify-between gap-2">
                                    <button type="button" onClick={() => copy(c.code)} className={cn('inline-flex min-w-0 items-center gap-1.5 rounded-xl px-3 py-1.5 font-mono text-[15px] font-bold', accent('violet').chip)}>
                                        <span className="truncate">{c.code}</span> <Copy size={12} className="shrink-0 opacity-70" />
                                    </button>
                                    <Menu trigger={({ toggle: t }) => (
                                        <Button variant="ghost" onClick={t} aria-label={`More for ${c.code}`} className="h-10 w-10 px-0"><MoreHorizontal size={17} /></Button>
                                    )}>
                                        <MenuItem icon={Copy} onClick={() => copy(c.code)}>Copy code</MenuItem>
                                        <MenuItem icon={c.isActive === false ? Play : Pause} onClick={() => toggle(c)}>{c.isActive === false ? 'Make live again' : 'Pause'}</MenuItem>
                                        <MenuItem icon={Trash2} danger onClick={() => remove(c)}>Delete</MenuItem>
                                    </Menu>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <Badge tone={state.tone}>{state.label}</Badge>
                                    <Badge tone="orange">{c.discountType === 'percentage' ? `${c.discountValue}% off` : `${inr(c.discountValue)} off`}</Badge>
                                    {!c.eventId && <Badge tone="blue">All events</Badge>}
                                </div>
                                <div>
                                    <div className="mb-1 flex justify-between text-[12px] text-gray-500">
                                        <span>{used} / {c.usageLimit || '∞'} used</span>
                                        {expiry && <span>Until {expiry.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                                    </div>
                                    <Meter max={c.usageLimit || Math.max(used, 1)} label={`${used} uses`} segments={[{ value: c.usageLimit ? used : 0, tone: 'violet' }]} />
                                    <p className="mt-1.5 text-[12px] text-gray-500">
                                        {verified ? `${verified.orders} verified ${verified.orders === 1 ? 'order' : 'orders'} here${canSeeMoney && verified.discount ? ` · ${inr(verified.discount)} off` : ''}` : 'Not used on a verified order here yet'}
                                    </p>
                                </div>
                                <Button variant="secondary" className="mt-auto h-11" onClick={() => toggle(c)} disabled={Boolean(busy[c.id])}>
                                    {c.isActive === false ? <><Play size={14} /> Make live</> : <><Pause size={14} /> Pause</>}
                                </Button>
                            </Panel>
                        );
                    })}
                </div>
            )}

            <CouponSheet open={creating} onClose={() => setCreating(false)} eventId={eventId} coupons={coupons} />
            {confirmSheet}
        </div>
    );
};

export default CouponsPanel;
