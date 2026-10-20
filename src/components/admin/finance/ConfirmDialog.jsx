import React, { useEffect, useState } from 'react';
import Sheet from '../Sheet';
import { Button } from '../ui';
import { useStore } from '../../../lib/store';

/*
 * Small centred confirm for money actions. Blocks double taps, keeps the
 * dialog open and shows the error if the action fails.
 */
const toast = (msg, type = 'success', options) => useStore.getState().addToast?.(msg, type, options);

const ConfirmDialog = ({ open, onClose, title, body, confirmLabel = 'Delete', tone = 'danger', onConfirm }) => {
    const [busy, setBusy] = useState(false);
    useEffect(() => { if (!open) setBusy(false); }, [open]);
    const run = async () => {
        if (busy) return;
        setBusy(true);
        try {
            await onConfirm();
            onClose();
        } catch (err) {
            console.error(err);
            toast(err?.message && !/firebase|permission/i.test(err.message) ? err.message : 'Check your connection and try again.', 'error', { title: "That didn't go through" });
            setBusy(false);
        }
    };
    return (
        <Sheet open={open} onClose={busy ? () => {} : onClose} variant="dialog" size="sm" title={title} zIndex={320}
            footer={(
                <div className="flex gap-2">
                    <Button variant="ghost" className="h-12 flex-1" onClick={onClose} disabled={busy}>Cancel</Button>
                    <Button variant={tone} className="h-12 flex-1" onClick={run} disabled={busy}>{busy ? 'Working…' : confirmLabel}</Button>
                </div>
            )}
        >
            <div className="text-[14px] leading-relaxed text-gray-600 dark:text-zinc-300">{body}</div>
        </Sheet>
    );
};

export default ConfirmDialog;
