import React, { useEffect, useMemo, useRef, useState } from 'react';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import { cn } from '../../../../lib/utils';
import { useStore } from '../../../../lib/store';
import { Button, Card } from '../../ui';
import { Field, fieldCls, Toggle, Choice } from '../../uploads/UploadKit';
import { WA_TEMPLATES, JOIN_BUTTON, renderTemplatePreview } from '../../../../lib/outreach/whatsappTemplate';
import { TICKET_RULES } from '../../../../lib/outreach/deliverables';
import { DEFAULT_TEMPLATE, PLACEHOLDERS, renderMessage, unknownPlaceholders } from '../../../../lib/outreach/template';
import { callOutreach } from './outreachApi';

/*
 * The private half of the outreach setup: the WhatsApp group invite and the
 * message template. Saved to campaigns/{id}/private/outreach through the
 * server (admins only), never on the public campaign doc.
 */

const GROUP_LINK = /^https:\/\/chat\.whatsapp\.com\/(?:invite\/)?[A-Za-z0-9]{10,40}\/?$/;
const SAMPLE = { fullName: 'Riya Sharma' };

const SetupPanel = ({ campaign, settings, api, sampleApplication, onSaved }) => {
    const addToast = useStore(s => s.addToast);
    // An empty private link starts from the campaign's own group link, so nothing is typed twice.
    const initial = useMemo(() => ({
        whatsappGroupLink: settings?.whatsappGroupLink || (GROUP_LINK.test(campaign.whatsappLink || '') ? campaign.whatsappLink : ''),
        messageTemplate: settings?.messageTemplate || DEFAULT_TEMPLATE,
        remindersEnabled: settings?.remindersEnabled !== false,
        joinReminderHours: String(settings?.joinReminderHours || 48),
        ticketRule: settings?.ticketRule || 'deliverables',
    }), [settings, campaign.whatsappLink]);
    const [form, setForm] = useState(initial);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const areaRef = useRef(null);
    useEffect(() => setForm(initial), [initial]);

    const unknown = unknownPlaceholders(form.messageTemplate);
    const linkError = form.whatsappGroupLink && !GROUP_LINK.test(form.whatsappGroupLink.trim()) ? 'Paste a group invite link (https://chat.whatsapp.com/…).' : null;
    const hours = Number(form.joinReminderHours);
    const hoursError = form.remindersEnabled && !(Number.isInteger(hours) && hours >= 1 && hours <= 336) ? 'Use 1 to 336 hours.' : null;
    const dirty = ['whatsappGroupLink', 'messageTemplate', 'remindersEnabled', 'joinReminderHours', 'ticketRule'].some(k => form[k] !== initial[k]) || !settings?.updatedAt;
    const apiSample = {
        application: sampleApplication || SAMPLE,
        campaign,
        groupLink: form.whatsappGroupLink.trim() || 'https://chat.whatsapp.com/…',
        data: { taskTitle: campaign.tasks?.[0]?.title || 'Instagram reel 1', reason: 'Tag @newbi.live in the caption.', amount: 1500, reference: '412345678901' },
    };
    const preview = renderMessage(form.messageTemplate, { application: sampleApplication || SAMPLE, campaign: { ...campaign, whatsappGroupLink: form.whatsappGroupLink.trim() } });
    const fallbackPreview = renderMessage(form.messageTemplate, { application: { fullName: 'rj_99' }, campaign: { ...campaign, whatsappGroupLink: form.whatsappGroupLink.trim() } });

    const insert = (token) => {
        const el = areaRef.current;
        const text = `{${token}}`;
        if (!el) { setForm(f => ({ ...f, messageTemplate: f.messageTemplate + text })); return; }
        const start = el.selectionStart ?? form.messageTemplate.length;
        const end = el.selectionEnd ?? start;
        const next = form.messageTemplate.slice(0, start) + text + form.messageTemplate.slice(end);
        setForm(f => ({ ...f, messageTemplate: next }));
        requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + text.length, start + text.length); });
    };

    const save = async () => {
        if (linkError || unknown.length || hoursError) return;
        setSaving(true);
        const r = await callOutreach('outreach-settings', {
            campaignId: campaign.id,
            whatsappGroupLink: form.whatsappGroupLink.trim(),
            messageTemplate: form.messageTemplate,
            remindersEnabled: form.remindersEnabled,
            joinReminderHours: form.remindersEnabled ? hours : undefined,
            ticketRule: form.ticketRule,
        });
        setSaving(false);
        if (!r.ok) {
            setErrors(r.field ? { [r.field]: r.error } : {});
            addToast(r.error || 'Please try again.', 'error', {
                title: 'Message setup not saved',
                action: r.field ? undefined : { label: 'Try again', onClick: () => save() },
            });
            return;
        }
        setErrors({});
        addToast('Message setup saved.', 'success');
        onSaved?.();
    };

    return (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <Card className="space-y-4 p-5">
                <Field label="WhatsApp group invite" hint="Only shortlisted creators get this, inside their message. It isn’t shown on the public campaign.">
                    <input
                        className={cn(fieldCls, (linkError || errors.whatsappGroupLink) && 'border-rose-500/60')}
                        value={form.whatsappGroupLink}
                        onChange={(e) => setForm(f => ({ ...f, whatsappGroupLink: e.target.value }))}
                        placeholder="https://chat.whatsapp.com/…"
                        inputMode="url"
                        autoCapitalize="off"
                    />
                    {(linkError || errors.whatsappGroupLink) && <p className="mt-1 text-[12px] font-semibold text-rose-600 dark:text-rose-300">{linkError || errors.whatsappGroupLink}</p>}
                </Field>
                <Field label="Message template">
                    <div className="mb-2 flex flex-wrap gap-1.5">
                        {PLACEHOLDERS.map(p => (
                            <button key={p} type="button" onClick={() => insert(p)} className="h-8 rounded-lg border border-black/10 px-2.5 font-mono text-[12px] text-gray-700 hover:border-black/25 dark:border-white/10 dark:text-zinc-300">{`{${p}}`}</button>
                        ))}
                        <button type="button" onClick={() => setForm(f => ({ ...f, messageTemplate: DEFAULT_TEMPLATE }))} className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-[12px] font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white"><RotateCcw size={12} /> Default</button>
                    </div>
                    <textarea
                        ref={areaRef}
                        className={cn(fieldCls, 'min-h-[240px] py-3 font-mono text-[13px] leading-relaxed', (unknown.length || errors.messageTemplate) && 'border-rose-500/60')}
                        value={form.messageTemplate}
                        onChange={(e) => setForm(f => ({ ...f, messageTemplate: e.target.value }))}
                        aria-label="Message template"
                    />
                    {unknown.length > 0 && <p className="mt-1 text-[12px] font-semibold text-rose-600 dark:text-rose-300">Unknown placeholder{unknown.length > 1 ? 's' : ''}: {unknown.map(u => `{${u}}`).join(', ')}. Use the buttons above.</p>}
                    <p className="mt-1 text-[12px] text-gray-500">When a first name isn’t clear (a handle, one letter, numbers), “Hey {'{first_name}'}!” becomes “Hey!”.</p>
                </Field>
                <div className="space-y-3 rounded-2xl border border-black/[0.06] p-4 dark:border-white/[0.08]">
                    <p className="text-[13px] font-bold">WhatsApp API {api?.configured ? <span className="font-semibold text-emerald-600">· set up</span> : <span className="font-semibold text-gray-500">· not set up (sending by hand)</span>}</p>
                    <p className="text-[12.5px] text-gray-500">API messages use templates approved by Meta, so they can’t be edited here. The template above is for Open WhatsApp. Both use the same details.</p>
                    {['invite', 'reminder', 'deliverables', 'changes', 'payout'].map(kind => (
                        <div key={kind} className="space-y-1">
                            <p className="flex items-center gap-2 font-mono text-[12px] text-gray-500">
                                {WA_TEMPLATES[kind].name}
                                {api?.configured && (api.templates?.[kind]
                                    ? <span className="font-sans font-semibold text-emerald-600">· on</span>
                                    : <span className="font-sans font-semibold text-gray-500">· off until WHATSAPP_TEMPLATE_{WA_TEMPLATES[kind].name.toUpperCase()} is set</span>)}
                            </p>
                            <div className="whitespace-pre-wrap rounded-xl bg-black/[0.03] p-3 text-[13px] dark:bg-white/[0.04]">{renderTemplatePreview(kind, apiSample)}{(['invite', 'reminder'].includes(kind) ? JOIN_BUTTON : WA_TEMPLATES[kind].button) && <span className="mt-1 block font-semibold text-sky-600">{['invite', 'reminder'].includes(kind) ? JOIN_BUTTON : WA_TEMPLATES[kind].button}</span>}</div>
                        </div>
                    ))}
                    <Toggle
                        label="Remind people who haven’t tapped Joined"
                        hint="One reminder with the API, only if they still haven’t joined."
                        checked={form.remindersEnabled}
                        onChange={(v) => setForm(f => ({ ...f, remindersEnabled: v }))}
                    />
                    {form.remindersEnabled && (
                        <Field label="Remind after (hours)">
                            <input className={cn(fieldCls, 'w-32', (hoursError || errors.joinReminderHours) && 'border-rose-500/60')} inputMode="numeric" value={form.joinReminderHours} onChange={(e) => setForm(f => ({ ...f, joinReminderHours: e.target.value.replace(/\D/g, '') }))} />
                            {(hoursError || errors.joinReminderHours) && <p className="mt-1 text-[12px] font-semibold text-rose-600 dark:text-rose-300">{hoursError || errors.joinReminderHours}</p>}
                        </Field>
                    )}
                </div>
                <Field label="Send tickets" hint={campaign.eventId ? 'Tickets are Newbi passes for the linked event, sent by email and WhatsApp.' : 'Tickets are Newbi passes (QR). Link an event in Edit → Event tickets so the gate scanner knows it.'}>
                    <Choice value={form.ticketRule} onChange={(v) => setForm(f => ({ ...f, ticketRule: v }))} options={TICKET_RULES} />
                </Field>
                <div className="flex justify-end">
                    <Button variant="accent" onClick={save} disabled={saving || !dirty || Boolean(linkError) || Boolean(hoursError) || unknown.length > 0}>{saving ? 'Saving…' : 'Save message setup'}</Button>
                </div>
            </Card>
            <div className="space-y-3">
                <p className="text-[12px] font-bold text-gray-500">Preview · {sampleApplication?.fullName || SAMPLE.fullName}</p>
                <div className="whitespace-pre-wrap rounded-2xl bg-[#dcf8c6] p-4 text-[14px] leading-relaxed text-gray-900 shadow-sm dark:bg-[#005c4b] dark:text-white">{preview}</div>
                <p className="text-[12px] font-bold text-gray-500">When the name isn’t clear</p>
                <div className="whitespace-pre-wrap rounded-2xl bg-black/[0.03] p-4 text-[13px] leading-relaxed text-gray-700 dark:bg-white/[0.04] dark:text-zinc-300">{fallbackPreview.split('\n').slice(0, 2).join('\n')}</div>
            </div>
        </div>
    );
};

export default SetupPanel;
