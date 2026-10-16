import React, { useEffect, useState } from 'react';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import { cn } from '../../../lib/utils';
import Sheet from '../Sheet';
import { Button } from '../ui';
import { accent } from '../theme';

/**
 * Small centred confirm for anything destructive or important. `onConfirm`
 * may be async: the button shows progress, double taps are ignored, and a
 * thrown error is shown in the dialog (the dialog stays open so nothing is
 * marked done when the write failed).
 */
const ConfirmSheet = ({
    open, onClose, title, description, children,
    confirmLabel = 'Confirm', busyLabel = 'Working…', tone = 'danger', icon: Icon = AlertTriangle,
    onConfirm, disabled,
}) => {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { if (open) { setBusy(false); setError(''); } }, [open]);

    const run = async () => {
        if (busy) return;
        setBusy(true);
        setError('');
        try {
            await onConfirm?.();
            onClose?.();
        } catch (err) {
            console.error(err);
            setError(err?.userMessage || err?.message || "Couldn't do that. Please try again.");
        } finally {
            setBusy(false);
        }
    };

    const chipTone = tone === 'danger' ? 'red' : tone === 'warning' ? 'amber' : 'green';

    return (
        <Sheet
            open={open}
            onClose={busy ? () => {} : onClose}
            variant="dialog"
            size="sm"
            zIndex={320}
            header={(
                <div className="flex items-start gap-3">
                    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', accent(chipTone).chip)}>
                        <Icon size={18} />
                    </span>
                    <div className="min-w-0 pt-0.5">
                        <h2 className="text-[17px] font-extrabold leading-snug tracking-tight">{title}</h2>
                    </div>
                </div>
            )}
            footer={(
                <div className="space-y-3">
                    {error && <p role="alert" className="text-[13px] font-semibold text-red-600 dark:text-red-400">{error}</p>}
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose} disabled={busy} className="h-11 flex-1 sm:flex-none">Cancel</Button>
                        <Button
                            variant={tone === 'danger' ? 'danger' : tone === 'warning' ? 'secondary' : 'primary'}
                            onClick={run}
                            disabled={busy || disabled}
                            className={cn('h-11 flex-1', tone === 'warning' && 'border-amber-500/40 text-amber-700 dark:text-amber-300')}
                        >
                            {busy ? busyLabel : confirmLabel}
                        </Button>
                    </div>
                </div>
            )}
        >
            <div className="space-y-4 text-[14px] leading-relaxed text-gray-600 dark:text-zinc-300">
                {description && (typeof description === 'string' ? <p>{description}</p> : description)}
                {children}
            </div>
        </Sheet>
    );
};

export default ConfirmSheet;
