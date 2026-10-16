import React, { useState } from 'react';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import { Button } from '../../../components/app';
import { cn } from '../../../lib/utils';
import { Notice } from '../ui';

/* Instagram messages shared by the application and the creator profile. */

const OAUTH_ERRORS = {
    denied: 'You closed the Instagram login before it finished.',
    personal: 'That Instagram account is a personal account. Switch it to a Professional (Creator) account, then connect again.',
    mismatch: 'You connected a different Instagram account from the one you typed. Connect @HANDLE, or change the username.',
    taken: 'That Instagram account is already linked to another Newbi creator profile.',
    expired: 'The Instagram login took too long. Please try again.',
    unavailable: 'Instagram didn’t answer. Please try again in a minute.',
    failed: 'The Instagram login didn’t finish. Please try again.',
};

export const oauthErrorMessage = (reason, handle) => (OAUTH_ERRORS[reason] || OAUTH_ERRORS.failed).replace('HANDLE', handle || 'your account');

const SWITCH_STEPS = [
    'Open Instagram and go to your profile.',
    'Tap ☰ → Settings and privacy → Account type and tools.',
    'Tap “Switch to professional account” and pick Creator. It’s free.',
    'Come back here and tap “Check again”.',
];

export const SwitchGuide = ({ onRetry, checking }) => {
    const [open, setOpen] = useState(false);
    return (
        <Notice
            tone="warn"
            title="Switch to a free Professional account"
            action={<Button size="sm" variant="secondary" icon={RefreshCw} loading={checking} onClick={onRetry}>Check again</Button>}
        >
            <p>We read your followers from Instagram itself, which only works for Professional (Creator or Business) accounts. It takes a minute.</p>
            <button type="button" onClick={() => setOpen(o => !o)} className="mt-1 flex min-h-[32px] items-center gap-1 font-bold">
                How to switch <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
            </button>
            {open && <ol className="mt-1 list-decimal space-y-1 pl-5">{SWITCH_STEPS.map(s => <li key={s}>{s}</li>)}</ol>}
        </Notice>
    );
};
