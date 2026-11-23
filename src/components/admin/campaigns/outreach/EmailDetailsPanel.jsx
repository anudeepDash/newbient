import React, { useMemo, useState } from 'react';
import Mail from 'lucide-react/dist/esm/icons/mail';
import { cn } from '../../../../lib/utils';
import { useStore } from '../../../../lib/store';
import { previewEmailHtml } from '../../../../lib/emailTemplates';
import { Button, Card } from '../../ui';
import { Field, fieldCls } from '../../uploads/UploadKit';
import { Spinner, ConfirmSheet } from '../parts';
import { EmailFrame } from '../../mailing/EmailPreview';
import { campaignDetailsData, DETAIL_SECTIONS, MAX_NOTE } from '../../../../lib/outreach/campaignDetails';
import { callOutreach } from './outreachApi';

/*
 * Outreach → Message → Email details: email one creator this campaign's details (what they post and by
 * when, the event, what they get), for anyone who wants them in writing. Paste any email address; it goes
 * from creators@newbi.live (api/_lib/outreachEmailDetails.js). The preview is the real email.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const APP_ORIGIN = 'https://app.newbi.live';

const EmailDetailsPanel = ({ campaign, applications = [], settings }) => {
    const addToast = useStore(s => s.addToast);
    const events = useStore(s => s.upcomingEvents) || [];
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [reward, setReward] = useState(campaign.reward || '');
    const [note, setNote] = useState('');
    const [include, setInclude] = useState({ event: true, rewards: true, deliverables: true, group: true });
    const [confirm, setConfirm] = useState(false);
    const [sending, setSending] = useState(false);
    const [sentTo, setSentTo] = useState([]);

    const clean = email.trim().toLowerCase();
    const valid = EMAIL_RE.test(clean);
    // Someone on this campaign's list with that email: use their name unless the team typed one.
    const match = useMemo(() => applications.find(a => String(a.email || '').trim().toLowerCase() === clean) || null, [applications, clean]);
    const known = useMemo(() => [...new Set(applications.map(a => String(a.email || '').trim().toLowerCase()).filter(e => EMAIL_RE.test(e)))].slice(0, 300), [applications]);
    const groupLink = settings?.whatsappGroupLink || campaign.whatsappLink || '';
    const ev = events.find(e => e.id === campaign.eventId);
    const has = {
        event: Boolean(campaign.eventName || campaign.eventDate || campaign.venue || ev),
        rewards: true,
        deliverables: (campaign.tasks || []).length > 0,
        group: /^https:\/\//.test(groupLink),
    };

    const data = campaignDetailsData(campaign, {
        name: name.trim() || match?.fullName || '',
        reward, note, include, groupLink,
        event: ev ? { title: ev.title, date: ev.date, time: ev.time, venue: ev.location || ev.venue } : null,
        campaignUrl: `${APP_ORIGIN}/c/${encodeURIComponent(campaign.id)}`,
    });
    const html = useMemo(() => previewEmailHtml('campaign-details', data), [JSON.stringify(data)]); // eslint-disable-line react-hooks/exhaustive-deps

    const sendNow = async () => {
        setSending(true);
        const r = await callOutreach('outreach-email-details', { campaignId: campaign.id, email: clean, name: name.trim(), reward, note, include });
        setSending(false);
        setConfirm(false);
        if (!r.ok) { addToast(r.error || 'Please try again.', 'error', { title: 'Email not sent' }); return; }
        addToast(`Campaign details sent to ${clean}.`, 'success', { title: 'Email sent' });
        setSentTo(s => [{ email: clean, at: new Date() }, ...s].slice(0, 5));
        setEmail('');
        setName('');
        setNote('');
    };

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
            <Card className="min-w-0 space-y-4 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Email" hint={match ? `On this campaign: ${match.fullName || 'a creator'}.` : 'Paste any email address.'}>
                        <input className={fieldCls} type="email" inputMode="email" autoCapitalize="off" autoCorrect="off" list="campaign-emails" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="creator@gmail.com" />
                        <datalist id="campaign-emails">{known.map(e => <option key={e} value={e} />)}</datalist>
                    </Field>
                    <Field label="Their name" optional hint="Used in “Hi …”.">
                        <input className={fieldCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={match?.fullName || 'Riya Sharma'} />
                    </Field>
                </div>

                <div className="space-y-2">
                    <p className="text-[13px] font-bold">What to include</p>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                        {DETAIL_SECTIONS.map(s => (
                            <label key={s.key} className={cn('flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px]', has[s.key] ? 'cursor-pointer bg-black/[0.03] dark:bg-white/[0.04]' : 'opacity-50')}>
                                <input type="checkbox" className="h-4 w-4 accent-emerald-600" disabled={!has[s.key]} checked={has[s.key] && include[s.key]} onChange={() => setInclude(x => ({ ...x, [s.key]: !x[s.key] }))} />
                                {s.label}{!has[s.key] && <span className="text-[11.5px] text-gray-500"> · none set</span>}
                            </label>
                        ))}
                    </div>
                </div>

                {include.rewards && (
                    <Field label="What they get" optional hint="From the campaign. Change it for this person if they agreed something different.">
                        <input className={fieldCls} value={reward} onChange={(e) => setReward(e.target.value)} maxLength={200} placeholder="Free passes for you and a friend" />
                    </Field>
                )}
                <Field label="Note" optional hint={`Shown near the top, e.g. anything agreed only with them. ${MAX_NOTE - note.length} characters left.`}>
                    <textarea className={cn(fieldCls, 'h-auto py-3')} rows={3} maxLength={MAX_NOTE} value={note} onChange={(e) => setNote(e.target.value)} placeholder="As discussed on call, one reel and two stories. Your two passes are at the box office." />
                </Field>

                <Button variant="success" className="h-11 w-full sm:w-auto" disabled={!valid || sending} onClick={() => setConfirm(true)}>
                    {sending ? <Spinner /> : <Mail size={14} />} {valid ? `Email ${clean}` : 'Paste an email address'}
                </Button>
                {sentTo.length > 0 && (
                    <ul className="space-y-0.5 text-[12px] text-gray-500">
                        {sentTo.map(s => <li key={`${s.email}-${+s.at}`}>Sent to {s.email} at {s.at.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</li>)}
                    </ul>
                )}
            </Card>

            <div className="min-w-0 lg:sticky lg:top-4 lg:self-start">
                <Card className="overflow-hidden p-0">
                    <p className="border-b border-black/[0.06] px-4 py-2.5 text-[12px] font-bold text-gray-500 dark:border-white/[0.06]">
                        From Newbi Creators · <span className="font-semibold text-gray-700 dark:text-zinc-200">Your campaign details: {campaign.title || 'your campaign'}</span>
                    </p>
                    <EmailFrame html={html} title="Campaign details email" />
                </Card>
            </div>

            <ConfirmSheet
                open={confirm}
                onClose={() => setConfirm(false)}
                title={`Email the details to ${clean}?`}
                message="It goes from creators@newbi.live with what’s shown in the preview. Replies come to that inbox."
                confirmLabel={sending ? 'Sending…' : 'Send email'}
                onConfirm={sendNow}
            />
        </div>
    );
};

export default EmailDetailsPanel;
