import React from 'react';
import Landmark from 'lucide-react/dist/esm/icons/landmark';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import { TextInput } from '../../../../components/app';
import { cn } from '../../../../lib/utils';
import { isPresent } from '../../../../lib/present';
import { useT } from '../../../../i18n';

/*
 * The pieces both payout pages share: the personal one (/pay/:token) and the
 * campaign's open form (/pay/c/:token).
 */

export const EMPTY = { mode: 'upi', upiId: '', name: '', accountNumber: '', confirmAccountNumber: '', ifsc: '', bankName: '' };

export const Card = ({ children, className }) => (
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

export const DetailsSummary = ({ details }) => {
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

/* UPI or bank account, and its fields. */
export const PayoutMethodFields = ({ form, set, errors, setErrors }) => {
    const t = useT();
    const bank = form.mode === 'bank';
    return (
        <>
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
        </>
    );
};

export const PayoutTrust = () => {
    const t = useT();
    return (
        <div className="flex gap-3 rounded-2xl px-1 text-[13px] text-gray-500 dark:text-zinc-400">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-600 dark:text-neon-green" />
            <p>{t('Only the Newbi team sees these details, and only to pay you. We will never ask for your UPI PIN, a password or an OTP.')}</p>
        </div>
    );
};
