import React, { useEffect, useState } from 'react';
import History from 'lucide-react/dist/esm/icons/history';
import { EmptyState } from '../../ui';
import { statusLabel } from '../../../../lib/outreach/status';
import { Spinner } from '../parts';
import { callOutreach } from './outreachApi';
import { when } from './parts';

/*
 * The audit log: every status change with who, when and from → to. For the
 * whole campaign, or one applicant (appId). Read-only; entries are written by
 * the server in the same transaction as the change.
 */

const SOURCE = { admin: '', bulk_paste: ' (bulk paste)', public_form: ' (form)', whatsapp_api: ' (API send)', whatsapp_webhook: ' (from WhatsApp)', reminder: ' (reminder)' };

const describe = (e, nameOf) => {
    const who = e.appId ? nameOf(e.appId) : null;
    if (e.field === 'status') {
        if (!e.from) return `${who || 'Someone'} applied`;
        return `${who ? `${who}: ` : ''}${statusLabel(e.from)} → ${statusLabel(e.to)}`;
    }
    if (e.field === 'submission') return `${who || 'Someone'} sent the form again (submission ${e.to})`;
    if (e.field === 'whatsappGroupLink') return e.to ? 'Changed the WhatsApp group link' : 'Removed the WhatsApp group link';
    if (e.field === 'messageTemplate') return 'Edited the message template';
    if (e.field === 'whatsapp') return `${who ? `${who}: ` : ''}${e.to === 'failed' ? 'WhatsApp message not sent' : 'Queued for the WhatsApp API'}`;
    if (e.field === 'reminder') return `${who ? `${who}: ` : ''}join reminder sent`;
    if (e.field === 'reminders') return e.to === 'off' ? 'Turned join reminders off' : `Join reminders ${e.to}`;
    return `${e.field}: ${e.from ?? '–'} → ${e.to ?? '–'}`;
};

const ActivityList = ({ campaignId, appId, nameOf = () => null, refreshKey }) => {
    const [state, setState] = useState({ loading: true, entries: [], error: '' });
    useEffect(() => {
        let cancelled = false;
        setState(s => ({ ...s, loading: true }));
        callOutreach('outreach-audit', { campaignId, ...(appId ? { appId } : {}) }).then(r => {
            if (cancelled) return;
            setState(r.ok ? { loading: false, entries: r.data.entries, error: '' } : { loading: false, entries: [], error: r.error });
        });
        return () => { cancelled = true; };
    }, [campaignId, appId, refreshKey]);

    if (state.loading) return <div className="flex justify-center py-10 text-gray-400"><Spinner className="h-5 w-5" /></div>;
    if (state.error) return <p className="py-6 text-center text-[13px] text-rose-600">{state.error}</p>;
    if (!state.entries.length) return <EmptyState icon={History} title="No activity yet" description="Status changes show up here with who made them." />;

    return (
        <ol className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
            {state.entries.map(e => (
                <li key={e.id} className="flex items-start justify-between gap-3 py-2.5 text-[13px]">
                    <div className="min-w-0">
                        <p className="font-semibold">{describe(e, nameOf)}</p>
                        <p className="text-[12px] text-gray-500">{e.actorEmail || 'Applicant'}{SOURCE[e.source] || ''}{e.note ? ` · ${e.note}` : ''}</p>
                    </div>
                    <time dateTime={e.at} title={e.at} className="shrink-0 text-[12px] text-gray-500">{when(e.at)}</time>
                </li>
            ))}
        </ol>
    );
};

export default ActivityList;
