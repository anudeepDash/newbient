import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { AUDIENCES, BUDGETS, TIMELINES, validateEnquiry } from '../../../api/_lib/enquiryRules.js';
import { ENQUIRY_URL } from '../links';
import { useT } from '../../i18n';

const EMPTY = { name: '', email: '', phone: '', company: '', budget: '', timeline: '', message: '' };

const fieldCls = 'w-full h-12 px-4 rounded-xl bg-white dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-base text-gray-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-neon-green/60 focus:border-transparent';
const labelCls = 'block text-sm font-semibold text-gray-800 dark:text-zinc-200 mb-1.5';

function Field({ id, label, optional, error, children }) {
    const t = useT();
    return (
        <div>
            <label htmlFor={id} className={labelCls}>
                {t(label)}{optional && <span className="font-normal text-gray-400 dark:text-zinc-500"> {t('(optional)')}</span>}
            </label>
            {children}
            {error && <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600 dark:text-red-400">{t(error)}</p>}
        </div>
    );
}

/*
 * The enquiry form (home page and /contact). Posts to the enquiry handler,
 * which validates again and writes to `messages`. A hidden "website" field
 * and a minimum fill time keep most bots out.
 */
export default function EnquiryForm({ audience, onAudienceChange, page = 'home' }) {
    const t = useT();
    const uid = useId();
    const [values, setValues] = useState(EMPTY);
    const [ownAudience, setOwnAudience] = useState('');
    const [errors, setErrors] = useState({});
    const [status, setStatus] = useState('idle'); // idle | sending | sent | failed
    const [failure, setFailure] = useState('');
    const startedAt = useRef(0);
    const formRef = useRef(null);

    const who = audience ?? ownAudience;
    const setWho = onAudienceChange || setOwnAudience;

    useEffect(() => { startedAt.current = Date.now(); }, []);

    const set = (key) => (e) => {
        setValues((v) => ({ ...v, [key]: e.target.value }));
        if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }));
    };

    const submit = async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const payload = { ...values, audience: who, page, website: form.get('website') || '', startedAt: startedAt.current };
        const check = validateEnquiry(payload);
        if (!check.ok) {
            setErrors(check.errors);
            const first = Object.keys(check.errors)[0];
            formRef.current?.querySelector(`[data-field="${first}"]`)?.focus();
            return;
        }
        setStatus('sending');
        setFailure('');
        try {
            const res = await fetch(ENQUIRY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const json = await res.json().catch(() => ({}));
            if (res.ok && json.success) {
                setStatus('sent');
                return;
            }
            if (json.errors) setErrors(json.errors);
            setFailure(json.error || (json.errors ? 'Please check the highlighted fields.' : 'Something went wrong. Please try again.'));
            setStatus('failed');
        } catch {
            setFailure('No connection. Please check your internet and try again.');
            setStatus('failed');
        }
    };

    if (status === 'sent') {
        return (
            <div role="status" className="p-6 md:p-8 rounded-3xl bg-white dark:bg-white/[0.04] border border-black/[0.07] dark:border-white/[0.08]">
                <CheckCircle2 size={28} className="text-emerald-600 dark:text-neon-green" aria-hidden="true" />
                <h3 className="mt-4 font-heading text-2xl font-bold text-gray-950 dark:text-white">{t('Thanks, {name}.', { name: values.name.split(' ')[0] })}</h3>
                <p className="mt-2 text-gray-600 dark:text-zinc-400">{t('We have your message and will reply to {email}.', { email: values.email })}</p>
            </div>
        );
    }

    const id = (k) => `${uid}-${k}`;
    const describedBy = (k) => (errors[k] ? `${id(k)}-error` : undefined);

    return (
        <form ref={formRef} onSubmit={submit} noValidate className="p-5 sm:p-6 md:p-8 rounded-3xl bg-white dark:bg-white/[0.03] border border-black/[0.07] dark:border-white/[0.08] space-y-5">
            <fieldset>
                <legend className={labelCls}>{t("I'm a")}</legend>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-describedby={errors.audience ? `${id('audience')}-error` : undefined}>
                    {Object.entries(AUDIENCES).map(([key, label], i) => (
                        <label key={key} className={`min-h-[44px] px-4 inline-flex items-center rounded-xl border text-[15px] font-semibold cursor-pointer select-none transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-neon-green/60 ${who === key ? 'bg-gray-950 text-white border-gray-950 dark:bg-neon-green dark:text-black dark:border-neon-green' : 'bg-white dark:bg-white/[0.04] text-gray-800 dark:text-zinc-200 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30'}`}>
                            <input
                                type="radio"
                                name="audience"
                                value={key}
                                checked={who === key}
                                onChange={() => { setWho(key); setErrors((x) => ({ ...x, audience: undefined })); }}
                                className="sr-only"
                                data-field={i === 0 ? 'audience' : undefined}
                            />
                            {t(label)}
                        </label>
                    ))}
                </div>
                {errors.audience && <p id={`${id('audience')}-error`} className="mt-1.5 text-sm text-red-600 dark:text-red-400">{t(errors.audience)}</p>}
            </fieldset>

            <div className="grid gap-5 sm:grid-cols-2">
                <Field id={id('name')} label="Your name" error={errors.name}>
                    <input id={id('name')} data-field="name" className={fieldCls} autoComplete="name" value={values.name} onChange={set('name')} aria-invalid={!!errors.name} aria-describedby={describedBy('name')} />
                </Field>
                <Field id={id('email')} label="Email" error={errors.email}>
                    <input id={id('email')} data-field="email" type="email" inputMode="email" className={fieldCls} autoComplete="email" value={values.email} onChange={set('email')} aria-invalid={!!errors.email} aria-describedby={describedBy('email')} />
                </Field>
                <Field id={id('phone')} label="Phone" optional error={errors.phone}>
                    <input id={id('phone')} data-field="phone" type="tel" inputMode="tel" className={fieldCls} autoComplete="tel" value={values.phone} onChange={set('phone')} aria-invalid={!!errors.phone} aria-describedby={describedBy('phone')} />
                </Field>
                <Field id={id('company')} label="Brand, college or organisation" optional>
                    <input id={id('company')} className={fieldCls} autoComplete="organization" value={values.company} onChange={set('company')} />
                </Field>
                <Field id={id('budget')} label="Budget" optional error={errors.budget}>
                    <select id={id('budget')} data-field="budget" className={fieldCls} value={values.budget} onChange={set('budget')}>
                        <option value="">{t('Choose a range')}</option>
                        {Object.entries(BUDGETS).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}
                    </select>
                </Field>
                <Field id={id('timeline')} label="When" optional error={errors.timeline}>
                    <select id={id('timeline')} data-field="timeline" className={fieldCls} value={values.timeline} onChange={set('timeline')}>
                        <option value="">{t('Choose a timeline')}</option>
                        {Object.entries(TIMELINES).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}
                    </select>
                </Field>
            </div>

            <Field id={id('message')} label="What are you planning?" error={errors.message}>
                <textarea id={id('message')} data-field="message" rows={5} className={`${fieldCls} h-auto py-3 resize-y`} placeholder={t('A few lines on the idea, the city or campus, and dates if you have them.')} value={values.message} onChange={set('message')} aria-invalid={!!errors.message} aria-describedby={describedBy('message')} />
            </Field>

            {/* Honeypot: hidden from people and screen readers; bots fill it in. */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
                <label htmlFor={id('website')}>{t('Website')}</label>
                <input id={id('website')} name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
            </div>

            {failure && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{t(failure)}</p>}

            <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full sm:w-auto h-14 px-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-neon-green text-black text-base font-bold hover:brightness-95 active:scale-[0.98] disabled:opacity-60 transition"
            >
                {status === 'sending' ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> {t('Sending…')}</> : <>{t('Send enquiry')} <ArrowRight size={18} aria-hidden="true" /></>}
            </button>
        </form>
    );
}
