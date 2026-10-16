import React, { useState } from 'react';
import CheckCircle2 from 'lucide-react/dist/esm/icons/circle-check';
import { Button, TextInput } from '../../components/app/controls';
import { usePhoneVerification } from './usePhoneVerification';

/*
 * Phone number + OTP in one block, on top of usePhoneVerification.
 * The code field uses one-time-code autofill, so iOS offers the SMS code.
 */
const PhoneVerifyField = ({ initialPhone = '', onVerified, label = 'Mobile number' }) => {
    const [number, setNumber] = useState(initialPhone || '');
    const [code, setCode] = useState('');
    const phone = usePhoneVerification({ onVerified });

    if (phone.verified) {
        return (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-[15px] font-semibold text-emerald-700 dark:text-neon-green">
                <CheckCircle2 size={18} />
                <span className="min-w-0 flex-1 truncate">{phone.phone} verified{phone.testMode ? ' (test mode)' : ''}</span>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-end gap-2">
                <TextInput
                    label={label}
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
                    <Button variant="secondary" onClick={() => phone.send(number)} loading={phone.isSending} disabled={!number.trim()}>
                        Send code
                    </Button>
                )}
            </div>

            {phone.codeSent && (
                <div className="space-y-3">
                    <TextInput
                        label={`Code sent to ${phone.phone}`}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]*"
                        maxLength={6}
                        placeholder="6-digit code"
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
                            Change number
                        </button>
                        <Button size="sm" onClick={() => phone.verify(code)} loading={phone.isVerifying} disabled={code.length !== 6}>
                            Verify
                        </Button>
                    </div>
                    <button
                        type="button"
                        disabled={phone.cooldown > 0 || phone.isSending}
                        onClick={() => phone.send(phone.phone)}
                        className="text-[13px] font-semibold text-gray-500 disabled:opacity-60 dark:text-zinc-400"
                    >
                        {phone.cooldown > 0 ? `Resend code in ${phone.cooldown}s` : 'Resend code'}
                    </button>
                </div>
            )}

            {phone.error && <p role="alert" className="text-[13px] font-medium text-red-600 dark:text-red-400">{phone.error}</p>}
        </div>
    );
};

export default PhoneVerifyField;
