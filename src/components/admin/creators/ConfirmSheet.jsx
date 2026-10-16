import React, { useEffect, useState } from 'react';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Sheet from '../Sheet';
import { Button } from '../ui';
import { fieldCls } from '../uploads/UploadKit';

/**
 * Small centred confirm for anything that changes or removes data.
 *   tone: 'danger' (red button) | 'success' | 'accent'
 *   typeToConfirm: a word the person must type before the button unlocks
 *   onConfirm may be async; the sheet stays open with a spinner until it settles.
 */
const ConfirmSheet = ({
    open, onClose, title, children, confirmLabel = 'Confirm', tone = 'danger',
    onConfirm, busy: busyProp, typeToConfirm, zIndex, disabled,
}) => {
    const [typed, setTyped] = useState('');
    const [running, setRunning] = useState(false);
    const busy = busyProp || running;

    useEffect(() => { if (open) setTyped(''); }, [open]);

    const locked = typeToConfirm && typed.trim().toLowerCase() !== String(typeToConfirm).toLowerCase();

    const confirm = async () => {
        if (busy || locked || disabled) return;
        setRunning(true);
        try {
            await onConfirm?.();
        } finally {
            setRunning(false);
        }
    };

    return (
        <Sheet
            open={open}
            onClose={() => { if (!busy) onClose?.(); }}
            variant="dialog"
            size="sm"
            title={title}
            zIndex={zIndex}
            footer={(
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={onClose} disabled={busy} className="h-12 flex-1 sm:flex-none">Cancel</Button>
                    <Button
                        variant={tone === 'danger' ? 'danger' : tone === 'success' ? 'success' : 'accent'}
                        onClick={confirm}
                        disabled={busy || locked || disabled}
                        className="h-12 flex-1"
                    >
                        {busy && <Loader2 size={15} className="animate-spin" />}
                        {confirmLabel}
                    </Button>
                </div>
            )}
        >
            <div className="space-y-3 text-[14px] leading-relaxed text-gray-600 dark:text-zinc-300">
                {children}
                {typeToConfirm && (
                    <label className="block pt-1">
                        <span className="mb-1 block text-[12px] font-bold text-gray-500">Type “{typeToConfirm}” to confirm</span>
                        <input
                            className={fieldCls}
                            value={typed}
                            onChange={(e) => setTyped(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirm(); } }}
                            autoCapitalize="off"
                            autoCorrect="off"
                            spellCheck={false}
                        />
                    </label>
                )}
            </div>
        </Sheet>
    );
};

export default ConfirmSheet;
