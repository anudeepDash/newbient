import React, { useState } from 'react';
import CheckCircle2 from 'lucide-react/dist/esm/icons/circle-check';
import { Button, TextInput } from '../../components/app/controls';
import WhatsAppLogo from '../../components/app/WhatsAppLogo';
import { usePhoneVerification } from './usePhoneVerification';
import MergeConfirm from './MergeConfirm';
import { useT } from '../../i18n';

/*
 * Phone number + OTP in one block, on top of usePhoneVerification.
 * The code field uses one-time-code autofill, so iOS offers an SMS code.
 * A number that already has its own Newbi account is merged into this one
 * (MergeConfirm), so one number never means two accounts.
 *
 * With WhatsApp codes on (canWhatsAppCode), two ways to get the same 6-digit
 * code sit side by side: "Send code" by SMS and a WhatsApp-green "Get code on
 * WhatsApp" (a WhatsApp message with a Copy code button). Neither is the
 * default and only the one they tap goes out, so we never pay for both. Without
 * it, "Send code" alone sends it, and a failed SMS while signing in offers the
 * sheet's other options through `onOtherWay`.
 */
const PhoneVerifyField = ({ initialPhone = '', onVerified, label = 'Mobile number', mode, sendLabel = 'Send code', onOtherWay, otherWayLabel = 'Use Google or email instead' }) => {
    const t = useT();
    const [number, setNumber] = useState(initialPhone || '');
    const [code, setCode] = useState('');
    const [via, setVia] = useState(null); // the button that's sending: 'sms' | 'whatsapp'
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

    // With WhatsApp offered, each button sends only its own way; alone, "Send code" lets the server pick.
    const sendBy = async (how, to = number) => {
        setVia(how);
        setCode('');
        await phone.send(to, phone.canWhatsAppCode ? { via: how } : undefined);
        setVia(null);
    };

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
                {!phone.codeSent && (
                    <Button variant="secondary" onClick={() => sendBy('sms')} loading={phone.isSending && via !== 'whatsapp'} disabled={!number.trim() || via === 'whatsapp'}>
                        {t(sendLabel)}
                    </Button>
                )}
            </div>

            {phone.canWhatsAppCode && !phone.codeSent && (
                <div className="space-y-2">
                    <Button className="w-full bg-[#25D366]" icon={WhatsAppLogo} onClick={() => sendBy('whatsapp')} loading={phone.isSending && via === 'whatsapp'} disabled={!number.trim() || via === 'sms'}>
                        {t('Get code on WhatsApp')}
                    </Button>
                    <p className="text-[12px] text-gray-500 dark:text-zinc-400">
                        {phone.smsFailed
                            ? t('Texts aren’t getting through right now. Get the code on WhatsApp instead.')
                            : t('Same 6-digit code, sent to your WhatsApp instead of by SMS.')}
                    </p>
                </div>
            )}

            {phone.smsFailed && !phone.canWhatsAppCode && onOtherWay && (
                <Button variant="secondary" className="w-full" onClick={onOtherWay}>{t(otherWayLabel)}</Button>
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
                        onClick={() => sendBy(phone.channel || 'sms', phone.phone)}
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
                    {phone.channel === 'sms' && phone.canWhatsAppCode && (
                        <button
                            type="button"
                            disabled={phone.isSending}
                            onClick={() => sendBy('whatsapp', phone.phone)}
                            className="block text-[13px] font-semibold text-gray-500 underline-offset-2 hover:underline disabled:opacity-60 dark:text-zinc-400"
                        >
                            {t('No SMS? Get the code on WhatsApp')}
                        </button>
                    )}
                </div>
            )}

            {phone.error && <p role="alert" className="text-[13px] font-medium text-red-600 dark:text-red-400">{phone.error}</p>}
        </div>
    );
};

export default PhoneVerifyField;
