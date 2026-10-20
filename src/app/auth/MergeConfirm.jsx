import React, { useState } from 'react';
import Users from 'lucide-react/dist/esm/icons/users';
import { Button } from '../../components/app';
import { confirmMerge, describeHoldings } from './accountMerge';
import { useT } from '../../i18n';

/*
 * "This number already has a Newbi account. Merge it into this one?"
 * Shown once the person has signed in to the other account (proof) and the
 * server has said what it holds (preview). Merging moves everything here and
 * deletes the other sign-in, so the number or email opens this account.
 */
const MergeConfirm = ({ proof, preview, what = 'This number', onMerged, onCancel, cancelLabel = 'Use a different number' }) => {
    const t = useT();
    const [merging, setMerging] = useState(false);
    const [error, setError] = useState('');
    const holds = describeHoldings(preview?.holds);
    const name = (preview?.name || '').trim().split(/\s+/)[0];

    const merge = async () => {
        setMerging(true);
        setError('');
        try {
            const result = await confirmMerge(proof);
            await onMerged?.(result);
        } catch (err) {
            setError(err?.friendly || t('We couldn’t merge the accounts. Please try again.'));
            setMerging(false);
        }
    };

    return (
        <div className="space-y-3 rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-700 dark:bg-neon-green/15 dark:text-neon-green">
                    <Users size={19} />
                </span>
                <div className="min-w-0 space-y-1">
                    <p className="text-[15px] font-bold leading-snug">{t('{what} already has a Newbi account', { what: t(what) })}{name ? ` (${name})` : ''}</p>
                    <p className="text-[13px] leading-snug text-gray-600 dark:text-zinc-400">
                        {holds ? t('Merge it into this one: its {holds} move here.', { holds }) : t('Merge it into this one and everything on it moves here.')}{' '}
                        {t('After that you have one account, and signing in either way opens it.')}
                    </p>
                </div>
            </div>
            {error && <p role="alert" className="text-[13px] font-medium text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={merge} loading={merging}>{t('Merge accounts')}</Button>
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={merging}
                        className="h-10 px-2 text-[13px] font-semibold text-gray-500 underline-offset-2 hover:underline disabled:opacity-60 dark:text-zinc-400"
                    >
                        {t(cancelLabel)}
                    </button>
                )}
            </div>
        </div>
    );
};

export default MergeConfirm;
