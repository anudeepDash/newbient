import React, { useState } from 'react';
import CheckCircle2 from 'lucide-react/dist/esm/icons/circle-check';
import Loader2 from 'lucide-react/dist/esm/icons/loader-circle';
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
 * When messaging us is on, a WhatsApp-green button sits under "Send code", for
 * adding a number and for signing in: they send us one prefilled message and the
 * number they sent it from is confirmed. Neither is the default; only the one
 * they tap goes out. The code is ready before the tap, so that button is a link
 * that opens WhatsApp at once; then a "Finish in WhatsApp" card waits and
 * finishes by itself when they come back. Without it, a failed SMS while
 * signing in offers the sheet's other options through `onOtherWay`.
 */
const PhoneVerifyField = ({ initialPhone = '', onVerified, label = 'Mobile number', mode, sendLabel = 'Send code', onOtherWay, otherWayLabel = 'Use Google or email instead' }) => {
    const t = useT();
    const [number, setNumber] = useState(initialPhone || '');
    const [code, setCode] = useState('');
    const [starting, setStarting] = useState(false); // the WhatsApp button is asking the server
    const [opened, setOpened] = useState(false); // the tap already opened WhatsApp
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
        const linkClass = 'inline-flex h-10 items-center text-[13px] font-semibold text-gray-600 underline-offset-2 hover:underline dark:text-zinc-300';
        return (
            <div className="space-y-4 rounded-3xl bg-[#25D366]/[0.08] p-4 ring-1 ring-inset ring-[#25D366]/30">
                <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-black" aria-hidden="true">
                        <WhatsAppLogo size={22} />
                    </span>
                    <div className="min-w-0">
                        <p className="text-[16px] font-bold">{t('Finish in WhatsApp')}</p>
                        <p className="mt-0.5 text-[13px] text-gray-600 dark:text-zinc-400">
                            {phone.signingIn
                                ? t('Tap send on the message we typed for you. You’ll be signed in here.')
                                : t('Tap send on the message we typed for you. Your number is confirmed here.')}
                        </p>
                    </div>
                </div>
                {!opened && (
                    <Button className="w-full bg-[#25D366]" icon={WhatsAppLogo} href={link} target="_blank" rel="noopener noreferrer" onClick={() => setOpened(true)}>
                        {t('Open WhatsApp')}
                    </Button>
                )}
                <p role="status" className="flex items-center gap-2 text-[13px] font-semibold text-[#128C7E] dark:text-[#25D366]">
                    <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                    {t('Waiting for your message…')}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-x-4">
                    {opened && <a href={link} target="_blank" rel="noopener noreferrer" className={linkClass}>{t('Open WhatsApp again')}</a>}
                    <button type="button" onClick={() => { setOpened(false); phone.reset(); }} className={linkClass}>
                        {t('Use SMS instead')}
                    </button>
                </div>
                <p className="text-[12px] text-gray-500 dark:text-zinc-500">
                    {t('Message not typed in? Send us this code on WhatsApp: {code}', { code })}
                </p>
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
                {!phone.codeSent && (
                    <Button
                        variant="secondary"
                        // With WhatsApp offered beside it, this is the SMS choice.
                        onClick={() => phone.send(number, phone.canMessageUs ? { via: 'sms' } : undefined)}
                        loading={phone.isSending && !starting}
                        disabled={!number.trim() || starting}
                    >
                        {t(sendLabel)}
                    </Button>
                )}
            </div>

            {/* The other way, never the default: one WhatsApp message to us, no code to type. */}
            {phone.canMessageUs && !phone.codeSent && (
                <div className="space-y-2">
                    {phone.waLink ? (
                        // A real link, so the tap itself opens WhatsApp (iPhone blocks one opened after a wait).
                        <Button className="w-full bg-[#25D366]" icon={WhatsAppLogo} href={phone.waLink} target="_blank" rel="noopener noreferrer" onClick={() => { setOpened(true); phone.messageUs(); }}>
                            {phone.signingIn ? t('Sign in with WhatsApp') : t('Verify with WhatsApp')}
                        </Button>
                    ) : (
                        <Button className="w-full bg-[#25D366]" icon={WhatsAppLogo} onClick={async () => { setStarting(true); setOpened(false); await phone.messageUs(); setStarting(false); }} loading={starting} disabled={phone.isSending}>
                            {phone.signingIn ? t('Sign in with WhatsApp') : t('Verify with WhatsApp')}
                        </Button>
                    )}
                    <p className="text-[12px] text-gray-500 dark:text-zinc-400">
                        {phone.smsFailed
                            ? t('Texts aren’t getting through right now. Use WhatsApp: send us one message, no code to type.')
                            : t('With WhatsApp you send us one message. No code to type.')}
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
