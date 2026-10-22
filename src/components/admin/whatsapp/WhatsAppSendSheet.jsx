import React, { useEffect, useMemo, useState } from 'react';
import Send from 'lucide-react/dist/esm/icons/send';
import X from 'lucide-react/dist/esm/icons/x';
import { useStore } from '../../../lib/store';
import Sheet from '../Sheet';
import { Button } from '../ui';
import { Spinner } from '../campaigns/parts';
import { callOutreach } from '../campaigns/outreach/outreachApi';
import { useWhatsAppTemplate, WhatsAppTemplateFields } from './TemplateFields';

/*
 * "Send on WhatsApp" for anyone picked in a list (creators, giveaway entries,
 * ticket buyers, form responses…): choose an approved template, change its
 * fields, take people off, send. The server queues one message each
 * (api/_lib/whatsappCenter.js, wa-bulk), so they go out at the rate limit,
 * retry, and wait while Meta is holding the number, instead of failing.
 *
 * people: [{ name, phone }]. campaign (optional): { id, title } fills {campaign_title} and the like.
 */

const digits = (p) => String(p || '').replace(/\D/g, '');
const hasNumber = (p) => digits(p.phone).length >= 10;

const WhatsAppSendSheet = ({ open, onClose, people = [], campaign = null, title = 'Send on WhatsApp' }) => {
    const addToast = useStore(s => s.addToast);
    const [removed, setRemoved] = useState(() => new Set());
    const [showAll, setShowAll] = useState(false);
    const [sending, setSending] = useState(false);
    const template = useWhatsAppTemplate({ active: open, campaign: Boolean(campaign) });

    useEffect(() => {
        if (open) { setRemoved(new Set()); setShowAll(false); template.reset(); }
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    const list = useMemo(() => people.map((p, i) => ({ ...p, key: `${digits(p.phone) || 'x'}-${i}` })), [people]);
    const reachable = list.filter(p => hasNumber(p) && !removed.has(p.key));
    const noNumber = list.filter(p => !hasNumber(p)).length;
    const shown = showAll ? reachable : reachable.slice(0, 12);

    const send = async () => {
        if (sending || !template.ready || !reachable.length) return;
        setSending(true);
        const r = await callOutreach('wa-bulk', {
            ...template.payload,
            params: { ...template.payload.params, ...(campaign?.id ? { campaignId: campaign.id } : {}) },
            recipients: reachable.map(p => ({ phone: p.phone, name: p.name || '' })),
        });
        setSending(false);
        if (!r.ok) { addToast(r.error, 'error', { title: 'Not sent' }); return; }
        const skipped = r.data.skipped.length;
        addToast(
            `${r.data.queued} queued${skipped ? `, ${skipped} skipped (${[...new Set(r.data.skipped.map(s => s.error))].join(', ').toLowerCase()})` : ''}. They go out a few a minute, and wait if Meta is holding the number. Follow them on the WhatsApp page → Sent.`,
            r.data.queued ? 'success' : 'warning',
            { title: `“${template.tpl.name}” on WhatsApp` },
        );
        onClose();
    };

    return (
        <Sheet
            open={open}
            onClose={sending ? () => {} : onClose}
            title={title}
            subtitle="An approved template, with each person’s details filled in."
            size="md"
            footer={(
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={onClose} disabled={sending} className="h-11">Cancel</Button>
                    <Button variant="success" onClick={send} disabled={sending || !template.ready || !reachable.length} className="h-11 flex-1">
                        {sending ? <Spinner /> : <Send size={14} />} {reachable.length ? `Send to ${reachable.length}` : 'Nobody to send to'}
                    </Button>
                </div>
            )}
        >
            <div className="space-y-4">
                <div className="space-y-2 rounded-xl border border-black/[0.06] p-3 dark:border-white/[0.08]">
                    <p className="text-[13px] font-bold">
                        {reachable.length} {reachable.length === 1 ? 'person' : 'people'}
                        {noNumber > 0 && <span className="font-medium text-gray-500"> · {noNumber} without a WhatsApp number left out</span>}
                        {removed.size > 0 && <span className="font-medium text-gray-500"> · {removed.size} taken off</span>}
                    </p>
                    <ul className="flex flex-wrap gap-1.5">
                        {shown.map(p => (
                            <li key={p.key} className="flex items-center gap-1 rounded-full bg-black/[0.04] py-1 pl-2.5 pr-1 text-[12.5px] dark:bg-white/[0.06]">
                                <span className="max-w-[160px] truncate">{p.name || p.phone}</span>
                                <button type="button" aria-label={`Take ${p.name || p.phone} off`} className="flex h-6 w-6 items-center justify-center rounded-full text-gray-500 hover:bg-black/[0.06] dark:hover:bg-white/[0.08]" onClick={() => setRemoved(s => new Set(s).add(p.key))}>
                                    <X size={12} />
                                </button>
                            </li>
                        ))}
                        {reachable.length > shown.length && (
                            <li><button type="button" className="rounded-full px-2.5 py-1 text-[12.5px] font-semibold text-emerald-700 dark:text-neon-green" onClick={() => setShowAll(true)}>+{reachable.length - shown.length} more</button></li>
                        )}
                    </ul>
                    {removed.size > 0 && <button type="button" className="text-[12px] font-semibold text-gray-500 underline" onClick={() => setRemoved(new Set())}>Put everyone back</button>}
                </div>
                <WhatsAppTemplateFields wa={template} campaign={campaign} sampleName={reachable[0]?.name || ''} />
                <p className="text-[12px] text-gray-500">Each message is billed by Meta. People who replied STOP are skipped.</p>
            </div>
        </Sheet>
    );
};

export default WhatsAppSendSheet;
