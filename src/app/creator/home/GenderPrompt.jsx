import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CREATOR_GENDER_OPTIONS, hasCreatorGender } from '../../../lib/creator/options';
import { useStore as useLegacyStore } from '../../../lib/store.js';
import { cn } from '../../../lib/utils';
import { callCreatorApi } from '../api';
import { ChoiceChip } from '../ui';
import { useT } from '../../../i18n';

/*
 * For creators who applied before the form asked for gender: a one-tap card on
 * their dashboard, until they answer ("Prefer not to say" counts). The "add
 * your gender" email links to /creator?ask=gender, which scrolls here and
 * highlights it. Saved through creator-gender, which touches nothing else.
 */
const GenderPrompt = ({ creator }) => {
    const t = useT();
    const [params, setParams] = useSearchParams();
    const [saving, setSaving] = useState(null);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    const [highlight, setHighlight] = useState(false);
    const ref = useRef(null);
    const blocked = creator.profileStatus === 'rejected' || creator.profileStatus === 'suspended';
    const show = !blocked && !saved && !hasCreatorGender(creator);

    // From the email: bring the card into view, then drop the parameter.
    useEffect(() => {
        if (params.get('ask') !== 'gender') return;
        if (show) {
            setHighlight(true);
            requestAnimationFrame(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
        }
        const next = new URLSearchParams(params);
        next.delete('ask');
        setParams(next, { replace: true });
        // eslint-disable-next-line
    }, [params]);

    if (!show) return null;

    const pick = async (gender) => {
        setSaving(gender);
        setError('');
        const res = await callCreatorApi('creator-gender', { gender });
        setSaving(null);
        if (!res.ok) return setError(res.error || t('Couldn’t save that. Try again.'));
        setSaved(true);
        useLegacyStore.getState().addToast?.(t('Saved. Thanks!'), 'success');
        return undefined;
    };

    return (
        <section
            ref={ref}
            className={cn(
                'space-y-3 rounded-3xl border bg-white p-5 transition-shadow dark:bg-[#0c0e14]',
                highlight ? 'border-neon-green shadow-[0_0_0_3px_rgba(57,255,20,0.35)]' : 'border-black/[0.06] dark:border-white/[0.07]',
            )}
            aria-labelledby="gender-prompt-title"
        >
            <div className="space-y-1">
                <h2 id="gender-prompt-title" className="text-[16px] font-bold">{t('One quick thing: add your gender')}</h2>
                <p className="text-[14px] text-gray-600 dark:text-zinc-400">{t('Some brands brief campaigns for women or men only. One tap, and we can match you to them. Only the Newbi team sees it.')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
                {CREATOR_GENDER_OPTIONS.map(g => (
                    <ChoiceChip key={g.id} selected={saving === g.id} onClick={() => !saving && pick(g.id)} className={cn('py-2', saving && saving !== g.id && 'opacity-50')}>
                        {t(g.label)}
                    </ChoiceChip>
                ))}
            </div>
            {error && <p role="alert" className="text-[13px] font-medium text-red-600 dark:text-red-400">{error}</p>}
        </section>
    );
};

export default GenderPrompt;
