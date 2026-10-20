import React, { useState } from 'react';
import Info from 'lucide-react/dist/esm/icons/info';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import TicketPercent from 'lucide-react/dist/esm/icons/ticket-percent';
import X from 'lucide-react/dist/esm/icons/x';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import { Link } from 'react-router-dom';
import { Button, TextInput } from '../../components/app';
import { cn } from '../../lib/utils';
import { appPath } from '../host';
import { Notice } from '../creator/ui';
import VenueMap from './VenueMap';
import { Collapsible, ErrorText, rupees, Stepper } from './ticketParts';

/* Step 1: pick tickets (venue map or list), a coupon, and an email if the account has none. */

const LeftChip = ({ left }) => {
    if (left === null || left === undefined || left > 20) return null;
    return left === 0
        ? <span className="text-[12px] font-bold text-red-600 dark:text-red-400">Sold out</span>
        : <span className="text-[12px] font-bold text-amber-600 dark:text-amber-400">Only {left} left</span>;
};

const ViewSwitch = ({ view, onChange }) => (
    <div role="tablist" aria-label="Show" className="flex rounded-2xl bg-black/[0.04] p-1 dark:bg-white/[0.06]">
        {[['map', 'Venue map'], ['list', 'List']].map(([key, label]) => (
            <button
                key={key}
                type="button"
                role="tab"
                aria-selected={view === key}
                onClick={() => onChange(key)}
                className={cn(
                    'h-10 flex-1 rounded-xl text-[14px] font-bold transition-colors',
                    view === key ? 'bg-white text-gray-900 shadow-sm dark:bg-white/[0.12] dark:text-white' : 'text-gray-500 dark:text-zinc-400'
                )}
            >
                {label}
            </button>
        ))}
    </div>
);

const PickTickets = ({ event, co, needsEmail, email, onEmail, emailError }) => {
    const [view, setView] = useState(co.hasLayout ? 'map' : 'list');
    const categories = event.ticketCategories || [];

    const pickZone = (id) => {
        if (!co.cart[id]) co.changeTier(id, 1);
        setView('list');
    };

    return (
        <div className="space-y-5">
            {co.soldOut && (
                <Notice tone="warn" title="Sold out">Every ticket for this show has gone. Check back in case more are released.</Notice>
            )}

            {co.hasLayout && <ViewSwitch view={view} onChange={setView} />}

            {co.hasLayout && view === 'map' ? (
                <div className="space-y-2">
                    <VenueMap image={event.venueLayout} categories={categories} cart={co.cart} onPick={pickZone} tierLeft={co.tierLeft} />
                    <p className="px-1 text-[13px] text-gray-500 dark:text-zinc-400">Tap a zone to pick it. One ticket type per booking.</p>
                </div>
            ) : co.hasCategories ? (
                <div className="space-y-2">
                    {co.tiers.map(t => {
                        const n = co.cart[t.id] || 0;
                        const left = co.tierLeft(t.id);
                        return (
                            <div
                                key={t.id}
                                className={cn(
                                    'flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors',
                                    n > 0 ? 'border-emerald-500/40 bg-emerald-500/[0.06] dark:border-neon-green/40 dark:bg-neon-green/[0.06]' : 'border-black/[0.06] dark:border-white/[0.08]'
                                )}
                            >
                                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: t.color || '#39FF14' }} aria-hidden="true" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[15px] font-bold">{t.name}</p>
                                    <p className="text-[15px] font-black text-emerald-600 dark:text-neon-green">{t.price > 0 ? rupees(t.price) : 'Free'}</p>
                                    <LeftChip left={left} />
                                </div>
                                <Stepper
                                    value={n}
                                    label={t.name}
                                    onMinus={() => co.changeTier(t.id, -1)}
                                    onPlus={() => co.changeTier(t.id, 1)}
                                    minusDisabled={n === 0}
                                    plusDisabled={left === 0}
                                />
                            </div>
                        );
                    })}
                    {co.hasLayout && <p className="px-1 text-[13px] text-gray-500 dark:text-zinc-400">One ticket type per booking. Picking another replaces it.</p>}
                </div>
            ) : (
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-black/[0.06] px-4 py-4 dark:border-white/[0.08]">
                    <div className="min-w-0">
                        <p className="text-[16px] font-bold">Tickets</p>
                        <p className="text-[15px] font-black text-emerald-600 dark:text-neon-green">
                            {co.tiers[0]?.price > 0 ? `${rupees(co.tiers[0].price)} each` : 'Free'}
                        </p>
                        <LeftChip left={co.tierLeft(co.tiers[0]?.id)} />
                    </div>
                    <Stepper
                        size="lg"
                        value={co.baseCount}
                        onMinus={() => co.changeBase(-1)}
                        onPlus={() => co.changeBase(1)}
                        minusDisabled={co.baseCount <= 1}
                        plusDisabled={co.soldOut || co.baseCount >= co.baseMax}
                    />
                </div>
            )}

            {co.subtotal > 0 && (
                <div className="space-y-2">
                    {co.coupon ? (
                        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-3 dark:border-neon-green/30 dark:bg-neon-green/[0.06]">
                            <TicketPercent size={18} className="shrink-0 text-emerald-600 dark:text-neon-green" />
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-mono text-[15px] font-bold">{co.coupon.code}</p>
                                <p className="text-[13px] text-emerald-700 dark:text-neon-green">{rupees(co.discount)} off</p>
                            </div>
                            <button
                                type="button"
                                onClick={co.removeCoupon}
                                aria-label="Remove coupon"
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-black/[0.05] dark:text-zinc-400 dark:hover:bg-white/[0.08]"
                            >
                                <X size={17} />
                            </button>
                        </div>
                    ) : (
                        <form
                            className="flex items-end gap-2"
                            onSubmit={(e) => { e.preventDefault(); co.applyCode(); }}
                        >
                            <TextInput
                                label="Coupon code"
                                className="flex-1"
                                value={co.couponInput}
                                onChange={(e) => co.setCouponInput(e.target.value.toUpperCase())}
                                placeholder="Optional"
                                autoCapitalize="characters"
                                autoComplete="off"
                                autoCorrect="off"
                                spellCheck={false}
                                inputClassName="font-mono uppercase placeholder:font-sans placeholder:normal-case"
                            />
                            <Button type="submit" variant="secondary" loading={co.couponBusy} disabled={!co.couponInput.trim()}>Apply</Button>
                        </form>
                    )}
                    <ErrorText>{co.couponError}</ErrorText>
                </div>
            )}

            {needsEmail && (
                <TextInput
                    label="Email for your ticket"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => onEmail(e.target.value)}
                    error={emailError}
                    hint="Your account has no email, so we’ll send the ticket here."
                />
            )}

            <div className="space-y-2">
                <Collapsible title="About these tickets" icon={Info} text={event.ticketingDescription} />
                <Collapsible title="Rules" icon={ShieldCheck} text={event.ticketingRules} />
            </div>

            {event.isGuestlistEnabled && (
                <Link
                    to={appPath(`/community/g/${event.id}`)}
                    className="flex min-h-[48px] items-center justify-between gap-3 rounded-2xl bg-black/[0.03] px-4 py-3 text-[14px] font-semibold text-gray-700 dark:bg-white/[0.04] dark:text-zinc-300"
                >
                    This show also has a guestlist
                    <ArrowRight size={16} className="shrink-0" />
                </Link>
            )}
        </div>
    );
};

export default PickTickets;
