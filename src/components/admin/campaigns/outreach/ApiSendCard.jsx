import React, { useState } from 'react';
import Zap from 'lucide-react/dist/esm/icons/zap';
import CircleStop from 'lucide-react/dist/esm/icons/circle-stop';
import { Button, Card, Badge } from '../../ui';
import { ConfirmSheet } from '../parts';
import { renderTemplatePreview, JOIN_BUTTON, DELIVERY_META } from '../../../../lib/outreach/whatsappTemplate';
import { when } from './parts';

/*
 * Phase 2: sending through the WhatsApp Cloud API. One button queues everyone
 * waiting for a message; the server sends them at the configured rate with the
 * approved template and a "Joined" button. Shows the queue while it runs, with
 * a way to stop it. Opening WhatsApp by hand still works for anyone.
 */

const time = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '');

const ApiSendCard = ({ api, campaign, settings, sendable, onSend, onStop }) => {
    const [confirm, setConfirm] = useState(false);
    const [stopping, setStopping] = useState(false);
    if (!api?.configured) {
        return (
            <Card className="p-4 text-[13px] text-gray-600 dark:text-zinc-400">
                <p className="font-semibold text-gray-900 dark:text-white">Sending by hand</p>
                <p>The WhatsApp API isn’t set up on this site, so messages go out with Open WhatsApp. See docs/campaign-outreach.md to switch it on.</p>
            </Card>
        );
    }
    if (api.templates && !api.templates.invite) {
        return (
            <Card className="p-4 text-[13px] text-gray-600 dark:text-zinc-400">
                <p className="font-semibold text-gray-900 dark:text-white">Sending by hand for now</p>
                <p>The WhatsApp API is set up, but the <span className="font-mono">campaign_shortlist</span> template isn’t switched on. Once Meta approves it, add WHATSAPP_TEMPLATE_CAMPAIGN_SHORTLIST=campaign_shortlist in Vercel and redeploy. Until then, use Open WhatsApp or the in-app notice.</p>
            </Card>
        );
    }
    const { queue = {}, rate = {} } = api;
    const active = (queue.queued || 0) + (queue.sending || 0);
    const preview = sendable[0]
        ? renderTemplatePreview('invite', { application: sendable[0], campaign, groupLink: settings?.whatsappGroupLink })
        : '';
    const left = Math.max(0, (rate.dailyCap || 0) - (rate.sentToday || 0));

    return (
        <Card className="space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                    <p className="flex items-center gap-2 text-[14px] font-bold"><Zap size={15} className="text-emerald-500" /> WhatsApp API</p>
                    <p className="text-[12.5px] text-gray-500">
                        Up to {rate.perMinute} a minute · {rate.sentToday} of {rate.dailyCap} sent today
                        {settings?.remindersEnabled !== false ? ` · reminder after ${settings?.joinReminderHours || 48} h if they haven’t joined` : ' · reminders off'}
                    </p>
                </div>
                <Button variant="success" disabled={!sendable.length || !settings?.whatsappGroupLink} onClick={() => setConfirm(true)}>
                    <Zap size={14} /> {sendable.length ? `Send to ${sendable.length}` : 'Nobody to send to'}
                </Button>
            </div>
            {(active > 0 || queue.failed > 0 || queue.sent > 0) && (
                <div className="flex flex-wrap items-center gap-2 border-t border-black/[0.06] pt-3 text-[12.5px] dark:border-white/[0.08]">
                    {active > 0 && <Badge tone="amber">{active} waiting{queue.nextAt ? ` · next ${time(queue.nextAt)}` : ''}</Badge>}
                    {queue.sent > 0 && <Badge tone="green">{queue.sent} sent</Badge>}
                    {queue.failed > 0 && <Badge tone="rose">{queue.failed} not sent</Badge>}
                    {queue.reminders > 0 && <Badge tone="gray">{queue.reminders} reminder{queue.reminders === 1 ? '' : 's'} scheduled</Badge>}
                    {active > 0 && (
                        <Button size="sm" variant="ghost" className="ml-auto text-rose-600" disabled={stopping} onClick={async () => { setStopping(true); await onStop(); setStopping(false); }}>
                            <CircleStop size={13} /> {stopping ? 'Stopping…' : 'Stop sending'}
                        </Button>
                    )}
                </div>
            )}
            {sendable.length > left && <p className="text-[12.5px] font-semibold text-amber-600 dark:text-amber-300">Only {left} more can go out today; the rest wait until tomorrow.</p>}
            <ConfirmSheet
                open={confirm}
                onClose={() => setConfirm(false)}
                title={`Send to ${sendable.length} with the WhatsApp API?`}
                message={`They get the approved “campaign_shortlist” template with a “${JOIN_BUTTON}” button, up to ${rate.perMinute} a minute. You can stop it while it runs.`}
                confirmLabel={`Send to ${sendable.length}`}
                tone="success"
                onConfirm={async () => { await onSend(sendable.map(a => a.id)); setConfirm(false); }}
            >
                {preview && (
                    <div className="space-y-1">
                        <p className="text-[12px] font-bold text-gray-500">{sendable[0].fullName} gets</p>
                        <div className="whitespace-pre-wrap rounded-2xl bg-[#dcf8c6] p-3 text-[13.5px] text-gray-900 dark:bg-[#005c4b] dark:text-white">{preview}</div>
                        <p className="text-center text-[12.5px] font-semibold text-sky-600">{JOIN_BUTTON}</p>
                    </div>
                )}
            </ConfirmSheet>
        </Card>
    );
};

export const DeliveryNote = ({ delivery, joinedVia, lastReplyAt }) => {
    if (joinedVia === 'button') return <Badge tone="pink">Tapped Joined</Badge>;
    if (!delivery?.status) return lastReplyAt ? <Badge tone="teal">Replied {when(lastReplyAt)}</Badge> : null;
    const meta = DELIVERY_META[delivery.status] || { label: delivery.status, tone: 'gray' };
    return (
        <span className="inline-flex flex-wrap items-center gap-1.5">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            {delivery.error && ['failed', 'retrying', 'cancelled'].includes(delivery.status) && <span className="text-[12px] text-gray-500">{delivery.error}</span>}
        </span>
    );
};

export default ApiSendCard;
