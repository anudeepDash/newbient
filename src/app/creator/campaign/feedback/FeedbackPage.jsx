import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Star from 'lucide-react/dist/esm/icons/star';
import Send from 'lucide-react/dist/esm/icons/send';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import Quote from 'lucide-react/dist/esm/icons/quote';
import MessageSquareQuote from 'lucide-react/dist/esm/icons/message-square-quote';
import { Button, INPUT, ERROR_RING } from '../../../../components/app';
import { cn } from '../../../../lib/utils';
import { isPresent } from '../../../../lib/present';
import useDynamicMeta from '../../../../hooks/useDynamicMeta';
import { ActionBar, BarStatus, ExpandedHero, ExpandedPage, ExpandedSkeleton, ExpandedTitle } from '../../../pages/ExpandedCard';
import { Notice } from '../../ui';
import { callCreatorApi } from '../../api';
import { AGAIN, CONSENT, QUOTE_MAX, TEXT_MAX, validateFeedback } from '../../../../lib/campaignFeedback';
import { useT } from '../../../../i18n';

/*
 * /f/:token: the creator's feedback form after a campaign, from their personal
 * WhatsApp or email link (no sign-in). A rating, what to keep and fix, and an
 * optional testimonial with a clear choice about publishing it. They can come
 * back to the same link to change their answers or take their words down.
 *
 * Laid out like the campaign popup (ExpandedCard): the poster with its colour
 * glow, the title block, then the questions; the send button is in the action
 * bar, pinned to the card on desktop and docked to the screen on phones.
 */

const FORM_ID = 'campaign-feedback-form';
const RATING_WORDS = ['', 'Poor', 'Okay', 'Good', 'Great', 'Loved it'];
const EMPTY = { rating: 0, again: '', liked: '', improve: '', testimonial: '', consent: '' };

const Card = ({ children, className }) => (
    <section className={cn('space-y-3 rounded-[1.75rem] bg-white p-4 ring-1 ring-inset ring-black/[0.06] dark:bg-[#0c0e14] dark:ring-white/[0.08] sm:p-5', className)}>{children}</section>
);

const Question = ({ children, hint }) => (
    <div className="space-y-0.5">
        <p className="text-[16px] font-bold">{children}</p>
        {hint && <p className="text-[13px] text-gray-500 dark:text-zinc-400">{hint}</p>}
    </div>
);

const TextArea = ({ label, value, onChange, max, rows = 3, error, placeholder }) => (
    <label className="block space-y-1.5">
        {label && <span className="block px-1 text-[13px] font-bold text-gray-700 dark:text-zinc-300">{label}</span>}
        <textarea
            rows={rows}
            value={value}
            maxLength={max}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className={cn(INPUT, 'block resize-y px-4 py-3 leading-relaxed', error && ERROR_RING)}
        />
        <span className="flex justify-between gap-3 px-1 text-[12px]">
            <span className="font-medium text-red-600 dark:text-red-400">{error || ''}</span>
            {max && value.length > max * 0.7 && <span className="text-gray-500 dark:text-zinc-500">{value.length}/{max}</span>}
        </span>
    </label>
);

const Choice = ({ selected, onClick, children }) => (
    <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onClick}
        className={cn(
            'flex min-h-[48px] w-full items-center gap-3 rounded-2xl px-4 text-left text-[15px] font-semibold ring-1 ring-inset transition-colors',
            selected ? 'bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/70 dark:bg-neon-green/10 dark:text-white dark:ring-neon-green/70' : 'ring-black/[0.08] hover:bg-black/[0.03] dark:ring-white/[0.1] dark:hover:bg-white/[0.04]'
        )}
    >
        <span className={cn('h-5 w-5 shrink-0 rounded-full ring-2 ring-inset', selected ? 'bg-emerald-500 ring-emerald-500 dark:bg-neon-green dark:ring-neon-green' : 'ring-gray-300 dark:ring-zinc-600')} />
        {children}
    </button>
);

const Stars = ({ value, size = 22 }) => (
    <span className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(n => <Star key={n} size={size} className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-zinc-600'} />)}
    </span>
);

const FeedbackPage = () => {
    const t = useT();
    const { token } = useParams();
    const [state, setState] = useState({ loading: true, data: null, error: '' });
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(true);

    const load = useCallback(async () => {
        const r = await callCreatorApi('feedback-form', { token });
        setState({ loading: false, data: r.ok ? r.data : null, error: r.ok ? '' : r.error });
        if (r.ok && r.data.response) {
            setForm({ ...EMPTY, ...r.data.response });
            setEditing(false);
        }
    }, [token]);
    useEffect(() => { load(); }, [load]);

    const d = state.data;
    useDynamicMeta({ page: 'campaign-feedback', title: d?.campaign?.title ? t('Feedback: {title}', { title: d.campaign.title }) : t('Campaign feedback'), noindex: true });
    const set = (patch) => setForm(f => ({ ...f, ...patch }));

    const submit = async (e) => {
        e.preventDefault();
        const local = validateFeedback(form);
        setErrors(Object.fromEntries(Object.entries(local.errors).map(([k, v]) => [k, t(v)])));
        if (!local.ok) return;
        setSending(true);
        setError('');
        const r = await callCreatorApi('feedback-submit', { token, ...local.value });
        setSending(false);
        if (!r.ok) {
            if (r.errors) setErrors(r.errors);
            setError(r.error);
            return;
        }
        setForm({ ...EMPTY, ...local.value });
        setState(s => ({ ...s, data: { ...s.data, response: local.value, respondedAt: s.data.respondedAt || new Date().toISOString(), published: Boolean(r.data?.published) } }));
        setEditing(false);
        window.scrollTo?.({ top: 0, behavior: 'smooth' });
    };

    if (state.loading) return <ExpandedPage label={t('Campaign feedback')} body={<ExpandedSkeleton />} />;
    if (!d) {
        return (
            <ExpandedPage
                label={t('Campaign feedback')}
                body={(
                    <div className="mx-auto max-w-md space-y-3 rounded-3xl border border-dashed border-black/[0.1] px-6 py-10 text-center dark:border-white/[0.1]">
                        <p className="text-[17px] font-bold">{t('This link isn’t active')}</p>
                        <p className="text-[15px] text-gray-600 dark:text-zinc-400">{state.error || t('Ask the Newbi team on WhatsApp for a new one.')}</p>
                    </div>
                )}
            />
        );
    }

    const title = d.campaign.title || d.campaign.eventName || t('the campaign');
    const answered = !editing && d.response;
    const hero = (
        <ExpandedHero
            image={isPresent(d.campaign.image) ? d.campaign.image : null}
            ambientColor={d.campaign.ambientColor}
            icon={MessageSquareQuote}
            chips={[{ label: answered ? t('Answered') : t('Feedback'), tone: answered ? 'accent' : undefined }]}
        />
    );
    const titleBlock = (
        <ExpandedTitle
            eyebrow={isPresent(d.campaign.brand) && <p className="text-[11px] font-black uppercase tracking-widest text-emerald-700 dark:text-neon-green">{d.campaign.brand}</p>}
            title={d.firstName ? t('Hey {name}! How was {title}?', { name: d.firstName, title }) : t('How was {title}?', { title })}
        >
            {!answered && <p className="text-[15px] text-gray-600 dark:text-zinc-400">{t('Thanks for creating with Newbi. Tell us how it went, it takes about a minute.')}</p>}
        </ExpandedTitle>
    );

    if (answered) {
        const consent = CONSENT.find(c => c.value === d.response.consent);
        const bar = (
            <ActionBar>
                <Button variant="secondary" size="lg" icon={Pencil} onClick={() => setEditing(true)} className="flex-1">{t('Change my answers')}</Button>
            </ActionBar>
        );
        return (
            <ExpandedPage label={t('Campaign feedback')} hero={hero} bar={bar}>
                {titleBlock}
                <Notice tone="success" title={t('Thank you! We got your feedback.')}>{t('It goes straight to the Newbi team. You can change it from this link any time.')}</Notice>
                <Card>
                    <div className="flex items-center gap-2" aria-label={t('{n} out of 5', { n: d.response.rating })}>
                        <Stars value={d.response.rating} />
                        <span className="text-[14px] font-semibold text-gray-600 dark:text-zinc-400">{t(RATING_WORDS[d.response.rating])}</span>
                    </div>
                    {d.response.testimonial && (
                        <div className="space-y-2 rounded-2xl bg-black/[0.03] p-4 dark:bg-white/[0.04]">
                            <Quote size={18} className="text-gray-400" />
                            <p className="text-[15px] leading-relaxed">{d.response.testimonial}</p>
                            {consent && <p className="text-[13px] text-gray-500 dark:text-zinc-400">{consent.value === 'no' ? t('Private: only the Newbi team sees it.') : d.published ? t('On newbi.live, as you allowed.') : t('You said we can share it on newbi.live: {how}.', { how: t(consent.label).replace(/^Yes, /, '') })}</p>}
                        </div>
                    )}
                </Card>
            </ExpandedPage>
        );
    }

    const bar = (
        <ActionBar>
            {d.response && <Button variant="secondary" size="lg" onClick={() => { setForm({ ...EMPTY, ...d.response }); setErrors({}); setEditing(false); }} className="shrink-0">{t('Cancel')}</Button>}
            {form.rating ? (
                <Button type="submit" form={FORM_ID} size="lg" icon={Send} loading={sending} className="flex-1">{d.response ? t('Save my answers') : t('Send feedback')}</Button>
            ) : (
                <BarStatus icon={Star}>{t('Pick a rating to send it.')}</BarStatus>
            )}
        </ActionBar>
    );

    return (
        <ExpandedPage label={t('Campaign feedback')} hero={hero} bar={bar}>
            {titleBlock}
            <form id={FORM_ID} onSubmit={submit} noValidate className="space-y-4">
                <Card>
                    <Question>{t('How would you rate the campaign?')}</Question>
                    <div role="radiogroup" aria-label={t('Rating')} className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(n => (
                            <button
                                key={n}
                                type="button"
                                role="radio"
                                aria-checked={form.rating === n}
                                aria-label={t('{n} out of 5', { n })}
                                onClick={() => set({ rating: n })}
                                className="flex h-12 w-12 items-center justify-center rounded-xl active:scale-95"
                            >
                                <Star size={30} className={n <= form.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-zinc-600'} />
                            </button>
                        ))}
                        {form.rating > 0 && <span className="ml-1 text-[14px] font-semibold text-gray-600 dark:text-zinc-400">{t(RATING_WORDS[form.rating])}</span>}
                    </div>
                    {errors.rating && <p className="px-1 text-[13px] font-medium text-red-600 dark:text-red-400">{errors.rating}</p>}
                </Card>

                <Card>
                    <Question>{t('Would you do another campaign with Newbi?')}</Question>
                    <div role="radiogroup" className="grid grid-cols-3 gap-2">
                        {AGAIN.map(a => (
                            <button
                                key={a.value}
                                type="button"
                                role="radio"
                                aria-checked={form.again === a.value}
                                onClick={() => set({ again: form.again === a.value ? '' : a.value })}
                                className={cn('min-h-[48px] rounded-2xl px-2 text-[14px] font-bold ring-1 ring-inset', form.again === a.value ? 'bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/70 dark:bg-neon-green/10 dark:text-white dark:ring-neon-green/70' : 'ring-black/[0.08] dark:ring-white/[0.1]')}
                            >
                                {t(a.label)}
                            </button>
                        ))}
                    </div>
                </Card>

                <Card>
                    <TextArea label={t('What did you like? (optional)')} value={form.liked} onChange={(v) => set({ liked: v })} max={TEXT_MAX} placeholder={t('The brief, the event, the team, the payout…')} />
                    <TextArea label={t('What should we do better? (optional)')} value={form.improve} onChange={(v) => set({ improve: v })} max={TEXT_MAX} placeholder={t('Anything that was confusing, late or annoying')} />
                </Card>

                <Card>
                    <Question hint={t('Optional. A few lines about working with Newbi, in your own words.')}>{t('Would you write us a testimonial?')}</Question>
                    <TextArea value={form.testimonial} onChange={(v) => set({ testimonial: v })} max={QUOTE_MAX} rows={4} error={errors.testimonial} placeholder={t('“Working with Newbi was…”')} />
                    {form.testimonial.trim() && (
                        <div className="space-y-2">
                            <p className="text-[15px] font-bold">{t('Can we share it on our website?')}</p>
                            <div role="radiogroup" className="space-y-2">
                                {CONSENT.map(c => (
                                    <Choice key={c.value} selected={form.consent === c.value} onClick={() => set({ consent: c.value })}>{t(c.label)}</Choice>
                                ))}
                            </div>
                            {errors.consent && <p className="px-1 text-[13px] font-medium text-red-600 dark:text-red-400">{errors.consent}</p>}
                            <p className="px-1 text-[12px] text-gray-500 dark:text-zinc-500">{t('We only publish it if you say yes, and you can change your mind from this link any time.')}</p>
                        </div>
                    )}
                </Card>

                {error && <Notice tone="error" title={error} />}
            </form>
        </ExpandedPage>
    );
};

export default FeedbackPage;
