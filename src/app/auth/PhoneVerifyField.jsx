import React, { useState } from 'react';
import CheckCircle2 from 'lucide-react/dist/esm/icons/circle-check';
import { Button, TextInput } from '../../components/app/controls';
import WhatsAppLogo from '../../components/app/WhatsAppLogo';
import { usePhoneVerification } from './usePhoneVerification';
import MergeConfirm from './MergeConfirm';
import { useT } from '../../i18n';

/*
 * Phone number + OTP in one block, on top of usePhoneVerification.
 * The code goes on WhatsApp first (with a "Copy code" button), SMS when
 * WhatsApp can't carry it or the person asks. The code field uses
 * one-time-code autofill, so iOS offers an SMS code.
 * A number that already has its own Newbi account is merged into this one
 * (MergeConfirm), so one number never means two accounts.
 *
 * Adding a number to an account (signed in) offers two equal ways: "Verify on
 * WhatsApp" (they send us one prefilled message and the number they sent it
 * from is confirmed) or a code by SMS to the number typed.
 */
const PhoneVerifyField = ({ initialPhone = '', onVerified, label = 'Mobile number', mode, sendLabel = 'Send code' }) => {
    const t = useT();
    const [number, setNumber] = useState(initialPhone || '');
    const [code, setCode] = useState('');
    const [starting, setStarting] = useState(false); // "Verify on WhatsApp" is asking the server
    const phone = usePhoneVerification({ mode, onVerified });

    if (phone.verified) {
        return (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-[15px] font-semibold text-emerald-700 dark:text-neon-green">
                <CheckCircle2 size={18} />
                <span className="min-w-0 flex-1 truncate">{phone.testMode ? t('{phone} verified (test mode)', { phone: phone.phone }) : t('{phone} verified', { phone: phone.phone })}</span>
            </div>
        );
    }

    if (phone.conflict) {
        return (
            <MergeConfirm
                proof={phone.conflict.proof}
                preview={phone.conflict.preview}
                what={phone.phone || t('This number')}
                onMerged={phone.completeMerge}
                onCancel={() => { setCode(''); phone.reset(); }}
            />
        );
    }

    if (phone.awaitingMessage) {
        const { code, link } = phone.waMessage;
        return (
            <div className="space-y-3 rounded-2xl border border-black/[0.08] p-4 dark:border-white/[0.1]">
                <p className="text-[15px] font-bold">{t('Send us the message on WhatsApp')}</p>
                <p className="text-[13px] text-gray-600 dark:text-zinc-400">
                    {t('It’s already typed, with your code {code}. Send it from the WhatsApp number you want on your account.', { code })}
                </p>
                <Button className="w-full" icon={WhatsAppLogo} href={link} target="_blank" rel="noopener noreferrer">{t('Open WhatsApp')}</Button>
                <p role="status" className="flex items-center gap-2 text-[13px] font-semibold text-gray-600 dark:text-zinc-400">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />
                    {t('Waiting for your message. This page updates by itself.')}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <button type="button" onClick={() => phone.reset()} className="h-10 text-[13px] font-semibold text-gray-500 underline-offset-2 hover:underline dark:text-zinc-400">
                        {t('Cancel')}
                    </button>
                    <button type="button" onClick={() => phone.reset()} className="h-10 text-[13px] font-semibold text-gray-500 underline-offset-2 hover:underline dark:text-zinc-400">
                        {t('Get a code by SMS instead')}
                    </button>
                </div>
                {phone.error && <p role="alert" className="text-[13px] font-medium text-red-600 dark:text-red-400">{phone.error}</p>}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-end gap-2">
                <TextInput
                    label={t(label)}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="98765 43210"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className="flex-1"
                    disabled={phone.codeSent}
                />
                {!phone.codeSent && !phone.canMessageUs && (
                    <Button variant="secondary" onClick={() => phone.send(number)} loading={phone.isSending} disabled={!number.trim()}>
                        {t(sendLabel)}
                    </Button>
                )}
            </div>

            {/* Adding a number: two equal ways to prove it's theirs. */}
            {phone.canMessageUs && !phone.codeSent && (
                <div className="space-y-2">
                    <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
                        <Button variant="secondary" icon={WhatsAppLogo} onClick={async () => { setStarting(true); await phone.messageUs(); setStarting(false); }} loading={starting} disabled={phone.isSending}>
                            {t('Verify on WhatsApp')}
                        </Button>
                        <Button variant="secondary" onClick={() => phone.send(number, { via: 'sms' })} loading={phone.isSending && !starting} disabled={!number.trim() || starting}>
                            {t('Get a code by SMS')}
                        </Button>
                    </div>
                    <p className="text-[12px] text-gray-500 dark:text-zinc-400">
                        {t('WhatsApp: send us one message, no code to type. SMS: we text a code to the number above.')}
                    </p>
                </div>
            )}

            {phone.codeSent && (
                <div className="space-y-3">
                    <TextInput
                        label={phone.channel === 'whatsapp'
                            ? t('Code sent on WhatsApp to {phone}', { phone: phone.phone })
                            : t('Code sent to {phone}', { phone: phone.phone })}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]*"
                        maxLength={6}
                        placeholder={t('6-digit code')}
                        value={code}
                        onChange={(e) => {
                            const next = e.target.value.replace(/\D/g, '').slice(0, 6);
                            setCode(next);
                            if (next.length === 6) phone.verify(next);
                        }}
                        inputClassName="tracking-[0.4em] text-center font-mono"
                    />
                    <div className="flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={() => { setCode(''); phone.reset(); }}
                            className="h-10 text-[13px] font-semibold text-gray-500 underline-offset-2 hover:underline dark:text-zinc-400"
                        >
                            {t('Change number')}
                        </button>
                        <Button size="sm" onClick={() => phone.verify(code)} loading={phone.isVerifying} disabled={code.length !== 6}>
                            {t('Verify')}
                        </Button>
                    </div>
                    <button
                        type="button"
                        disabled={phone.cooldown > 0 || phone.isSending}
                        onClick={() => phone.send(phone.phone)}
                        className="text-[13px] font-semibold text-gray-500 disabled:opacity-60 dark:text-zinc-400"
                    >
                        {phone.cooldown > 0 ? t('Resend code in {seconds}s', { seconds: phone.cooldown }) : t('Resend code')}
                    </button>
                    {phone.channel === 'whatsapp' && (
                        <button
                            type="button"
                            disabled={phone.isSending}
                            onClick={() => { setCode(''); phone.sendViaSms(); }}
                            className="block text-[13px] font-semibold text-gray-500 underline-offset-2 hover:underline disabled:opacity-60 dark:text-zinc-400"
                        >
                            {t('No WhatsApp? Get the code by SMS')}
                        </button>
                    )}
                </div>
            )}

            {phone.error && <p role="alert" className="text-[13px] font-medium text-red-600 dark:text-red-400">{phone.error}</p>}
        </div>
    );
};

export default PhoneVerifyField;
