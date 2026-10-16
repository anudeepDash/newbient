import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '../ui';
import Sheet from '../Sheet';
import { fetchSuppressionList } from './mailingApi';
import { normalizeEmail } from './audience';

/* Small pieces shared by the mailing screens. */

/** The unsubscribe list from the server. status: loading | ready | error */
export const useSuppression = () => {
    const [entries, setEntries] = useState([]);
    const [status, setStatus] = useState('loading');
    const load = useCallback(async () => {
        setStatus('loading');
        try {
            setEntries(await fetchSuppressionList());
            setStatus('ready');
        } catch (err) {
            console.warn('Unsubscribe list unavailable:', err.message);
            setStatus('error');
        }
    }, []);
    useEffect(() => { load(); }, [load]);
    const set = useMemo(() => new Set(entries.map(e => normalizeEmail(e.email))), [entries]);
    return { entries, set, status, reload: load, setEntries };
};

/** Small centred confirm. */
export const ConfirmDialog = ({ open, onClose, title, children, confirmLabel = 'Confirm', danger = false, busy = false, onConfirm }) => (
    <Sheet
        open={open}
        onClose={busy ? () => {} : onClose}
        variant="dialog"
        size="sm"
        title={title}
        footer={(
            <div className="flex gap-2">
                <Button variant="ghost" className="h-12 flex-1" onClick={onClose} disabled={busy}>Cancel</Button>
                <Button variant={danger ? 'danger' : 'primary'} className="h-12 flex-1" onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</Button>
            </div>
        )}
    >
        <div className="text-[14px] text-gray-600 dark:text-zinc-300">{children}</div>
    </Sheet>
);

/** Label row for a form field with an optional right-hand slot. */
export const FieldLabel = ({ children, optional, right }) => (
    <span className="mb-1 flex min-h-[20px] items-center gap-1.5 text-[12px] font-bold text-gray-500">
        <span>{children}</span>
        {optional && <span className="font-medium">(optional)</span>}
        {right && <span className="ml-auto">{right}</span>}
    </span>
);
