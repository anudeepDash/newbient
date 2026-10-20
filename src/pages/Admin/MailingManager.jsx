import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import Send from 'lucide-react/dist/esm/icons/send';
import MailPlus from 'lucide-react/dist/esm/icons/mail-plus';
import FlaskConical from 'lucide-react/dist/esm/icons/flask-conical';
import Save from 'lucide-react/dist/esm/icons/save';
import Eye from 'lucide-react/dist/esm/icons/eye';
import PenLine from 'lucide-react/dist/esm/icons/pen-line';
import History from 'lucide-react/dist/esm/icons/history';
import LayoutTemplate from 'lucide-react/dist/esm/icons/layout-template';
import UserX from 'lucide-react/dist/esm/icons/user-x';
import Users from 'lucide-react/dist/esm/icons/users';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import Check from 'lucide-react/dist/esm/icons/check';
import Plus from 'lucide-react/dist/esm/icons/plus';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { PREDEFINED_CITIES, CREATOR_NICHES } from '../../lib/constants';
import { cn } from '../../lib/utils';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import { Button, Card, EmptyState, SearchInput, SegmentedTabs, Select, Avatar } from '../../components/admin/ui';
import { accent } from '../../components/admin/theme';
import { Field, fieldCls } from '../../components/admin/uploads/UploadKit';
import { BuilderCard, ImageSlot } from '../../components/admin/events/EditorParts';
import RichEditor from '../../components/admin/RichEditor';
import ExportMenu from '../../components/admin/ExportMenu';
import { exportSubtitle, fileDate } from '../../lib/xlsx';
import { sendCampaignTest } from '../../lib/mailApi';
import AudienceBuilder from '../../components/admin/mailing/AudienceBuilder';
import EmailPreview from '../../components/admin/mailing/EmailPreview';
import SendSheet, { useMailWorkerKick } from '../../components/admin/mailing/SendSheet';
import CampaignHistory from '../../components/admin/mailing/CampaignHistory';
import TemplatesPanel from '../../components/admin/mailing/TemplatesPanel';
import { ConfirmDialog, FieldLabel, useSuppression } from '../../components/admin/mailing/shared';
import {
    DEFAULT_AUDIENCE, buildAudience, describeAudience, normalizeEmail, parseEmailList,
} from '../../components/admin/mailing/audience';
import {
    ALIASES, CATEGORY_LABEL, EMPTY_MAIL, MERGE_TAGS, PRESET_CATEGORIES, allowEmailAgain, buildOfficialHtml, effectiveCategory,
    fillTags, formatWhen, isValidEmailAddress, samplePerson, stripHtml, textToHtml, uploadInlineImages,
} from '../../components/admin/mailing/mailingApi';
import ThemedSelect from '../../components/admin/ThemedSelect';

/*
 * Mailing: write a campaign email, choose who gets it, preview it, send
 * yourself a test, then queue it (now or scheduled). The server sends it in
 * batches within the daily limit, so the tab can be closed. History keeps every
 * campaign with opens, clicks, failures (retryable) and unsubscribes.
 *
 * Deep links other pages use (keep working):
 *   /admin/mailing?subject=&header=&body=&heroImage=&ctaText=&ctaUrl=
 * Also: &to=a@x.com,b@y.com (custom list), ?tab=history&campaign=<id>
 */

const DRAFT_KEY = 'nb_mailing_draft';
const AUDIENCE_KEY = 'nb_mailing_audience';
const PREFILL_KEYS = ['subject', 'header', 'body', 'heroImage', 'ctaText', 'ctaUrl', 'to'];
const TABS = ['compose', 'history', 'templates', 'unsubscribed'];

const readJson = (key) => {
    try { const raw = window.localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
};
const writeJson = (key, value) => {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or private mode */ }
};

const SENDER_DEFAULT = { aliasKey: 'partnership', customName: '', customEmail: '' };

const contactFrom = (raw, sourceLabel) => {
    const email = normalizeEmail(raw?.email);
    if (!email) return null;
    return { email, name: String(raw.displayName || raw.name || raw.fullName || '').trim(), sourceLabel };
};

const MailingManager = () => {
    useStoreSubscription(['subscribers', 'allUsers', 'admins', 'creators', 'emailTemplates', 'emailCampaigns']);
    const subscribers = useStore(s => s.subscribers);
    const allUsers = useStore(s => s.allUsers);
    const admins = useStore(s => s.admins);
    const creators = useStore(s => s.creators);
    const emailTemplates = useStore(s => s.emailTemplates);
    const emailCampaigns = useStore(s => s.emailCampaigns);
    // Wakes due scheduled sends (the server cron only runs daily on this plan).
    useMailWorkerKick(emailCampaigns);
    const user = useStore(s => s.user);
    const addToast = useStore(s => s.addToast);

    const [searchParams, setSearchParams] = useSearchParams();
    const tab = TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'compose';
    const openCampaignId = searchParams.get('campaign');
    const setParams = useCallback((patch) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            Object.entries(patch).forEach(([k, v]) => { if (v === null || v === undefined || v === '') next.delete(k); else next.set(k, v); });
            return next;
        }, { replace: true });
    }, [setSearchParams]);

    /* ---------- Draft (restored from this browser, or prefilled by a deep link) ---------- */

    const prefill = useMemo(() => {
        const has = PREFILL_KEYS.some(k => searchParams.get(k));
        if (!has) return null;
        return {
            mail: {
                ...EMPTY_MAIL,
                subject: searchParams.get('subject') || '',
                headerText: searchParams.get('header') || '',
                messageBody: textToHtml(searchParams.get('body') || ''),
                heroImage: searchParams.get('heroImage') || '',
                ctaText: searchParams.get('ctaText') || '',
                ctaUrl: searchParams.get('ctaUrl') || '',
            },
            to: parseEmailList(searchParams.get('to') || '').contacts,
        };
    // Only on first load: the params are cleared right after.
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const [mail, setMail] = useState(() => {
        if (prefill) return prefill.mail;
        const saved = readJson(DRAFT_KEY);
        return saved ? { ...EMPTY_MAIL, ...saved, sender: undefined, templateId: undefined } : EMPTY_MAIL;
    });
    const [sender, setSender] = useState(() => ({ ...SENDER_DEFAULT, ...(readJson(DRAFT_KEY)?.sender || {}) }));
    const [templateId, setTemplateId] = useState(() => (prefill ? '' : readJson(DRAFT_KEY)?.templateId || ''));
    const [audience, setAudience] = useState(() => {
        if (prefill?.to?.length) return { ...DEFAULT_AUDIENCE, segments: ['custom'], custom: prefill.to };
        const saved = readJson(AUDIENCE_KEY);
        return saved ? { ...DEFAULT_AUDIENCE, ...saved, creatorFilters: { ...DEFAULT_AUDIENCE.creatorFilters, ...(saved.creatorFilters || {}) } } : DEFAULT_AUDIENCE;
    });

    // Drop the prefill params once read, so a refresh doesn't wipe edits.
    useEffect(() => {
        if (!prefill) return;
        setParams(Object.fromEntries(PREFILL_KEYS.map(k => [k, null])));
        addToast('Email filled in. Check it, pick who gets it, then send.', 'info');
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { writeJson(DRAFT_KEY, { ...mail, sender, templateId }); }, [mail, sender, templateId]);
    useEffect(() => {
        // Very long custom lists are trimmed in storage so the draft still saves.
        writeJson(AUDIENCE_KEY, { ...audience, custom: audience.custom.slice(0, 5000) });
    }, [audience]);

    const patch = (p) => setMail(m => ({ ...m, ...p }));

    /* ---------- Audience ---------- */

    const suppression = useSuppression();
    const sources = useMemo(() => ({
        subscribers: subscribers || [],
        users: allUsers || [],
        creators: creators || [],
        team: admins || [],
    }), [subscribers, allUsers, creators, admins]);
    const audienceResult = useMemo(() => buildAudience(sources, audience, suppression.set), [sources, audience, suppression.set]);

    const knownPeople = useMemo(() => {
        const map = new Map();
        const add = (list, label) => (list || []).forEach(r => { const c = contactFrom(r, label); if (c && !map.has(c.email)) map.set(c.email, c); });
        add(admins, 'Team'); add(creators, 'Creator'); add(allUsers, 'User'); add(subscribers, 'Subscriber');
        return [...map.values()];
    }, [admins, creators, allUsers, subscribers]);

    const cityOptions = useMemo(() => {
        const set = new Set(PREDEFINED_CITIES);
        (creators || []).forEach(c => { const city = String(c.city || '').trim(); if (city && !/^bang[al]*o?re$/i.test(city)) set.add(city); });
        return [...set].filter(Boolean).sort();
    }, [creators]);

    /* ---------- Sender ---------- */

    const alias = ALIASES.find(a => a.key === sender.aliasKey) || ALIASES[0];
    const isCustomSender = alias.key === 'custom';
    const fromName = isCustomSender ? sender.customName.trim() : alias.name;
    const fromEmail = isCustomSender ? normalizeEmail(sender.customEmail) : alias.email;

    /* ---------- Preview ---------- */

    const person = samplePerson(audienceResult.recipients[0]);
    const previewMail = useMemo(() => ({
        ...mail,
        headerText: fillTags(mail.headerText, person),
        messageBody: fillTags(mail.messageBody, person),
        ctaText: fillTags(mail.ctaText, person),
        preheader: fillTags(mail.preheader, person),
    }), [mail, person]);
    const previewHtml = useMemo(() => buildOfficialHtml(previewMail, { preview: true }), [previewMail]);
    const [mobilePane, setMobilePane] = useState('edit');

    /* ---------- Checks ---------- */

    const problems = [
        !mail.subject.trim() && 'Add a subject.',
        !mail.headerText.trim() && !stripHtml(mail.messageBody) && 'Write a heading or a message.',
        isCustomSender && (!fromName || !isValidEmailAddress(fromEmail)) && 'Add a sender name and a valid sender email.',
        mail.ctaText.trim() && !mail.ctaUrl.trim() && 'Add a link for the button, or remove the button text.',
        audienceResult.stats.final === 0 && 'Choose who gets this email.',
    ].filter(Boolean);

    /* ---------- Images in the message ---------- */

    const uploadToCloudinary = useStore(s => s.uploadToCloudinary);
    const [heroUploading, setHeroUploading] = useState(false);
    const onHeroFile = async (file) => {
        if (!file?.type?.startsWith('image/')) { addToast('Pick an image file, like a JPG or PNG.', 'warning'); return; }
        setHeroUploading(true);
        try {
            const url = await uploadToCloudinary(file);
            if (!url) throw new Error('No URL');
            patch({ heroImage: url });
        } catch (err) {
            console.error('Hero upload failed:', err);
            addToast('Check your connection and try again.', 'error', { title: "Couldn't upload the image", action: { label: 'Try again', onClick: () => onHeroFile(file) } });
        } finally {
            setHeroUploading(false);
        }
    };

    // Pasted images are data: URLs, which inboxes block. Host them first.
    const mailRef = useRef(mail);
    mailRef.current = mail;
    const hostInlineImages = async () => {
        const current = mailRef.current;
        const { html, uploaded } = await uploadInlineImages(current.messageBody, uploadToCloudinary);
        const ready = uploaded ? { ...current, messageBody: html } : current;
        if (uploaded) setMail(m => ({ ...m, messageBody: html }));
        return ready;
    };

    /* ---------- Test send ---------- */

    const [testing, setTesting] = useState(false);
    const myEmail = normalizeEmail(user?.email);
    const [testedAt, setTestedAt] = useState(null);
    const sendTest = async () => {
        if (!myEmail) { addToast('Add an email address to your account to get test emails.', 'warning', { title: 'No email to send the test to' }); return; }
        if (!mail.subject.trim()) { addToast('Add a subject first.', 'warning'); return; }
        setTesting(true);
        try {
            const ready = await hostInlineImages();
            // Same server path as the real send; merge tags are filled in for you.
            const sent = await sendCampaignTest({ subject: ready.subject, html: buildOfficialHtml(ready), accountType: 'official', fromName, fromEmail });
            setTestedAt(Date.now());
            addToast(`Test sent to ${sent.to || myEmail}.`, 'success');
        } catch (err) {
            console.error('Test send failed:', err);
            addToast('Check your connection and try again.', 'error', {
                title: /upload/i.test(err?.message || '') ? "Couldn't upload the images in your message" : "Couldn't send the test",
                action: { label: 'Try again', onClick: () => sendTest() },
            });
        } finally {
            setTesting(false);
        }
    };

    /* ---------- Send ---------- */

    const [sendJob, setSendJob] = useState(null);
    const openReview = () => {
        if (problems.length) { addToast(problems[0], 'warning'); return; }
        const stats = audienceResult.stats;
        const recipients = audienceResult.recipients;
        const audienceLabel = describeAudience(audience);
        const skippedBits = [
            stats.unsubscribed && `${stats.unsubscribed.toLocaleString('en-IN')} unsubscribed`,
            stats.duplicates && `${stats.duplicates.toLocaleString('en-IN')} duplicates`,
            stats.invalid && `${stats.invalid.toLocaleString('en-IN')} invalid`,
            stats.excluded && `${stats.excluded.toLocaleString('en-IN')} left out`,
        ].filter(Boolean);
        setSendJob({
            recipients,
            subject: mail.subject.trim(),
            accountType: 'official',
            fromName,
            fromEmail,
            summary: [
                { label: 'To', value: `${recipients.length.toLocaleString('en-IN')} ${recipients.length === 1 ? 'person' : 'people'} · ${audienceLabel}` },
                skippedBits.length ? { label: 'Left out', value: skippedBits.join(', ') } : null,
                { label: 'From', value: `${fromName} <${fromEmail}>` },
                { label: 'Subject', value: fillTags(mail.subject, person) },
            ].filter(Boolean),
            warnings: [
                !testedAt && 'You haven\'t sent yourself a test of this email yet.',
                suppression.status === 'error' && "The unsubscribe list didn't load here. The server still skips unsubscribed people.",
            ].filter(Boolean),
            // Upload pasted images, then build the final email.
            prepare: async () => {
                const ready = await hostInlineImages();
                return {
                    html: buildOfficialHtml(ready),
                    mailData: { ...ready, subject: undefined, category: effectiveCategory(ready), customCategory: '', recipientType: audience.segments.join('+') },
                };
            },
            options: {
                audience: { label: audienceLabel, segments: audience.segments, creatorFilters: audience.segments.includes('creators') ? audience.creatorFilters : null, customCount: audience.custom.length, final: recipients.length },
            },
        });
    };

    const retryCampaign = (campaign) => {
        const pending = [...(campaign.failedEmails || []), ...(campaign.unsentEmails || [])];
        if (!pending.length) return;
        const names = new Map((campaign.recipients || []).map(r => [r.email, r.name]));
        const record = {
            ...EMPTY_MAIL,
            headerText: campaign.headerText || '',
            messageBody: campaign.messageBody || '',
            heroImage: campaign.heroImage || '',
            preheader: campaign.preheader || '',
            ctaText: campaign.ctaText || '',
            ctaUrl: campaign.ctaUrl || '',
            category: campaign.category || 'OFFICIAL',
            theme: campaign.theme || 'light',
        };
        setSendJob({
            retry: true,
            recipients: [...new Set(pending)].map(email => ({ email, name: names.get(email) || '' })),
            subject: campaign.subject,
            html: campaign.html || buildOfficialHtml(record),
            mailData: campaign.html ? null : { ...record, recipientType: campaign.recipientType },
            accountType: campaign.accountType || 'official',
            fromName: campaign.senderName,
            fromEmail: campaign.senderEmail,
            summary: [
                { label: 'Campaign', value: campaign.subject || 'Untitled' },
                { label: 'Retrying', value: `${pending.length.toLocaleString('en-IN')} ${pending.length === 1 ? 'person' : 'people'} who didn't get it` },
                { label: 'From', value: `${campaign.senderName || 'Newbi'} <${campaign.senderEmail || ''}>` },
            ],
            warnings: [],
            confirmLabel: `Retry ${pending.length.toLocaleString('en-IN')}`,
            options: {
                campaignId: campaign.id,
            },
        });
    };

    /* ---------- Templates ---------- */

    const saveEmailTemplate = useStore(s => s.saveEmailTemplate);
    const deleteEmailTemplate = useStore(s => s.deleteEmailTemplate);
    const deleteEmailCampaign = useStore(s => s.deleteEmailCampaign);
    const [savingTemplate, setSavingTemplate] = useState(false);
    const activeTemplate = (emailTemplates || []).find(t => t.id === templateId) || null;

    const saveTemplate = async (asNew) => {
        if (!mail.subject.trim()) { addToast('Add a subject before saving a template.', 'warning'); return; }
        if (savingTemplate) return;
        setSavingTemplate(true);
        try {
            const custom = mail.category === 'CUSTOM';
            const id = await saveEmailTemplate({
                id: !asNew && templateId ? templateId : undefined,
                subject: mail.subject.trim(),
                preheader: mail.preheader || '',
                headerText: mail.headerText || '',
                messageBody: mail.messageBody || '',
                heroImage: mail.heroImage || '',
                ctaText: mail.ctaText || '',
                ctaUrl: mail.ctaUrl || '',
                category: custom ? effectiveCategory(mail) : mail.category,
                customCategory: custom ? String(mail.customCategory || '').trim().toUpperCase() : '',
                theme: mail.theme || 'light',
            });
            setTemplateId(id);
            if (String(id).startsWith('tpl_local_')) addToast("Other admins won't see it until it saves online.", 'warning', { title: 'Template saved on this device only' });
            else addToast(!asNew && templateId ? 'Template updated.' : 'Template saved.', 'success');
        } catch (err) {
            if (err?.message?.startsWith('SAVED_LOCALLY')) addToast("Other admins won't see it until it saves online.", 'warning', { title: 'Template saved on this device only' });
            else addToast('Check your connection and try again.', 'error', { title: "Couldn't save the template", action: { label: 'Try again', onClick: () => saveTemplate(asNew) } });
        } finally {
            setSavingTemplate(false);
        }
    };

    const loadMailFields = (src) => {
        const raw = src.category || 'OFFICIAL';
        const preset = PRESET_CATEGORIES.includes(raw);
        setMail({
            ...EMPTY_MAIL,
            subject: src.subject || '',
            preheader: src.preheader || '',
            headerText: src.headerText || '',
            messageBody: src.messageBody || '',
            heroImage: src.heroImage || '',
            ctaText: src.ctaText || '',
            ctaUrl: src.ctaUrl || '',
            category: preset ? raw : 'CUSTOM',
            customCategory: preset ? '' : (src.customCategory || raw),
            theme: src.theme || 'light',
        });
        setTestedAt(null);
    };

    const applyTemplate = (t) => {
        loadMailFields(t);
        setTemplateId(t.id);
        setParams({ tab: null, campaign: null });
        addToast('Template opened in the composer.', 'success');
    };

    const reuseCampaign = (c) => {
        loadMailFields(c);
        setTemplateId('');
        setParams({ tab: null, campaign: null });
        addToast('Campaign copied into the composer.', 'success');
    };

    /* ---------- Confirms ---------- */

    const [confirm, setConfirm] = useState(null); // { kind, item }
    const [confirmBusy, setConfirmBusy] = useState(false);
    const runConfirm = async () => {
        if (!confirm) return;
        setConfirmBusy(true);
        try {
            if (confirm.kind === 'template') {
                await deleteEmailTemplate(confirm.item.id);
                if (templateId === confirm.item.id) setTemplateId('');
                addToast('Template deleted.', 'success');
            } else if (confirm.kind === 'campaign') {
                await deleteEmailCampaign(confirm.item.id);
                if (openCampaignId === confirm.item.id) setParams({ campaign: null });
                addToast('Campaign removed from the history.', 'success');
            } else if (confirm.kind === 'allow') {
                await allowEmailAgain(confirm.item.email);
                suppression.setEntries(list => list.filter(e => e.email !== confirm.item.email));
                addToast(`${confirm.item.email} will get campaign emails again.`, 'success');
            } else if (confirm.kind === 'new') {
                setMail(EMPTY_MAIL);
                setTemplateId('');
                setTestedAt(null);
                addToast('Started a new email.', 'info');
            }
            setConfirm(null);
        } catch (err) {
            console.error('Action failed:', err);
            addToast('Check your connection and try again.', 'error', {
                title: ({ template: "Couldn't delete the template", campaign: "Couldn't delete the campaign", allow: "Couldn't turn their emails back on" })[confirm.kind] || "That didn't work",
                action: { label: 'Try again', onClick: () => runConfirm() },
            });
        } finally {
            setConfirmBusy(false);
        }
    };

    const startNew = () => {
        const hasContent = mail.subject || mail.headerText || stripHtml(mail.messageBody) || mail.heroImage;
        if (hasContent) setConfirm({ kind: 'new' });
        else { setMail(EMPTY_MAIL); setTemplateId(''); }
        setParams({ tab: null, campaign: null });
    };

    /* ---------- Unsubscribed list ---------- */

    const [unsubSearch, setUnsubSearch] = useState('');
    const unsubRows = useMemo(() => {
        const map = new Map();
        suppression.entries.forEach(e => map.set(e.email, { email: e.email, at: e.unsubscribedAt, how: e.source === 'one_click' ? 'Mail app button' : 'Email link' }));
        (subscribers || []).forEach(s => {
            const email = normalizeEmail(s.email);
            if (s.unsubscribed && email && !map.has(email)) map.set(email, { email, at: s.unsubscribedAt, how: 'Subscriber list' });
        });
        const q = unsubSearch.trim().toLowerCase();
        return [...map.values()].filter(r => !q || r.email.includes(q)).sort((a, b) => (Date.parse(b.at || '') || 0) - (Date.parse(a.at || '') || 0));
    }, [suppression.entries, subscribers, unsubSearch]);

    /* ---------- Layout ---------- */

    // Keep the selected tab in view on narrow screens.
    const tabsRef = useRef(null);
    useEffect(() => {
        tabsRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
    }, [tab]);

    const tabItems = [
        { value: 'compose', label: 'Compose', icon: PenLine },
        { value: 'history', label: 'History', icon: History, count: (emailCampaigns || []).length },
        { value: 'templates', label: 'Templates', icon: LayoutTemplate, count: (emailTemplates || []).length },
        { value: 'unsubscribed', label: 'Unsubscribed', icon: UserX, count: suppression.status === 'ready' ? unsubRows.length : undefined },
    ];

    const insertSubjectTag = (tag) => patch({ subject: `${mail.subject}${mail.subject && !mail.subject.endsWith(' ') ? ' ' : ''}{{${tag}}}` });
    const insertBodyTag = (tag) => patch({ messageBody: `${mail.messageBody || ''} {{${tag}}}` });

    const categoryOptions = [...PRESET_CATEGORIES, 'CUSTOM'];
    const finalCount = audienceResult.stats.final;

    const actionButtons = (phone) => (
        <>
            <Button variant="secondary" onClick={sendTest} disabled={testing} className={cn(phone ? 'h-12 flex-1' : 'h-11')}>
                <FlaskConical size={15} /> {testing ? 'Sending…' : phone ? 'Test' : 'Send me a test'}
            </Button>
            <Button variant="primary" onClick={openReview} className={cn(phone ? 'h-12 flex-[2]' : 'h-11 flex-1 sm:flex-none')}>
                <Send size={15} /> Review &amp; send{finalCount ? ` · ${finalCount.toLocaleString('en-IN')}` : ''}
            </Button>
        </>
    );

    const composer = (
        <div className="pb-36 sm:pb-6">
            <div className="mb-4 xl:hidden">
                <SegmentedTabs value={mobilePane} onChange={setMobilePane} className="w-full [&>button]:flex-1 [&>button]:justify-center" items={[
                    { value: 'edit', label: 'Write', icon: PenLine },
                    { value: 'preview', label: 'Preview', icon: Eye },
                ]} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,480px)]">
                <div className={cn('min-w-0 space-y-5', mobilePane === 'preview' && 'hidden xl:block')}>
                    <BuilderCard
                        title="Who gets it"
                        hint="Mix groups, narrow creators, or use your own list"
                        action={<span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', accent('fuchsia').chip)}><Users size={16} /></span>}
                    >
                        <AudienceBuilder
                            sources={sources}
                            audience={audience}
                            onChange={setAudience}
                            result={audienceResult}
                            suppression={{ status: suppression.status, onRetry: suppression.reload }}
                            cityOptions={cityOptions}
                            nicheOptions={CREATOR_NICHES}
                            knownPeople={knownPeople}
                        />
                    </BuilderCard>

                    <BuilderCard
                        title="Email"
                        hint={activeTemplate ? `From the template “${activeTemplate.subject || 'Untitled'}”` : 'Start blank or from a template'}
                        action={<Button size="sm" variant="ghost" className="h-10" onClick={startNew}><Plus size={14} /> New</Button>}
                    >
                        <div className="space-y-4">
                            {(emailTemplates || []).length > 0 && (
                                <Select
                                    label="Template"
                                    value={templateId && activeTemplate ? templateId : ''}
                                    onChange={(id) => { const t = emailTemplates.find(x => x.id === id); if (t) applyTemplate(t); }}
                                    className="w-full"
                                    options={[{ value: '', label: 'Start from a template…' }, ...emailTemplates.map(t => ({ value: t.id, label: t.subject || 'Untitled template' }))]}
                                />
                            )}

                            <label className="block">
                                <FieldLabel right={<span className={cn('tabular-nums', mail.subject.length > 70 && 'text-amber-600 dark:text-amber-300')}>{mail.subject.length}/70</span>}>Subject</FieldLabel>
                                <input className={fieldCls} value={mail.subject} onChange={(e) => patch({ subject: e.target.value })} placeholder="What's this email about?" />
                            </label>
                            <div className="-mt-2 flex flex-wrap items-center gap-1.5">
                                <span className="text-[12px] text-gray-500">Personalise:</span>
                                {MERGE_TAGS.map(t => (
                                    <button key={t.tag} type="button" onClick={() => insertSubjectTag(t.tag)} className={cn('h-8 rounded-lg px-2.5 text-[12px] font-semibold', accent('fuchsia').chip)}>+ {t.label}</button>
                                ))}
                            </div>

                            <Field label="Preview text" optional hint="Shown next to the subject in most inboxes. Aim for 40–90 characters.">
                                <input className={fieldCls} value={mail.preheader} onChange={(e) => patch({ preheader: e.target.value })} placeholder="A one-line summary people see before opening" />
                            </Field>

                            <Field label="Heading in the email">
                                <input className={fieldCls} value={mail.headerText} onChange={(e) => patch({ headerText: e.target.value })} placeholder="The big title at the top" />
                            </Field>

                            <ImageSlot
                                label="Hero image (optional)"
                                hint="Wide images work best, about 1200 × 600"
                                aspect="aspect-[2/1]"
                                previewUrl={mail.heroImage}
                                url={mail.heroImage}
                                onFile={onHeroFile}
                                onUrl={(v) => patch({ heroImage: v.trim() })}
                                onClear={() => patch({ heroImage: '' })}
                                onPaste={(e) => { const f = [...(e.clipboardData?.files || [])].find(x => x.type.startsWith('image/')); if (f) { e.preventDefault(); onHeroFile(f); } }}
                                contain
                            />
                            {heroUploading && <p className="-mt-2 text-[12px] font-semibold text-gray-500">Uploading image…</p>}

                            <div>
                                <FieldLabel>Message</FieldLabel>
                                <RichEditor value={mail.messageBody} onChange={(v) => patch({ messageBody: v })} placeholder="Write your message…" minHeight={240} />
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                    <span className="text-[12px] text-gray-500">Add to message:</span>
                                    {MERGE_TAGS.map(t => (
                                        <button key={t.tag} type="button" onClick={() => insertBodyTag(t.tag)} className="h-8 rounded-lg bg-black/[0.05] px-2.5 text-[12px] font-semibold text-gray-600 dark:bg-white/[0.06] dark:text-zinc-300">{t.label}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <Field label="Button text" optional>
                                    <input className={fieldCls} value={mail.ctaText} onChange={(e) => patch({ ctaText: e.target.value })} placeholder="See details" />
                                </Field>
                                <Field label="Button link" optional>
                                    <input className={fieldCls} value={mail.ctaUrl} onChange={(e) => patch({ ctaUrl: e.target.value })} placeholder="https://newbi.live/…" inputMode="url" autoCapitalize="off" autoCorrect="off" />
                                </Field>
                            </div>
                        </div>
                    </BuilderCard>

                    <BuilderCard title="Sender and style" hint="Who it's from and how it's labelled">
                        <div className="space-y-4">
                            <Field label="From">
                                <ThemedSelect className={cn(fieldCls, 'cursor-pointer')} value={sender.aliasKey} onChange={(e) => setSender(s => ({ ...s, aliasKey: e.target.value }))}>
                                    {ALIASES.map(a => <option key={a.key} value={a.key}>{a.key === 'custom' ? 'Another address…' : `${a.name} <${a.email}>`}</option>)}
                                </ThemedSelect>
                            </Field>
                            {isCustomSender && (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <Field label="Sender name"><input className={fieldCls} value={sender.customName} onChange={(e) => setSender(s => ({ ...s, customName: e.target.value }))} placeholder="Newbi Events" /></Field>
                                    <Field label="Sender email" hint="Must be a newbi.live address the mail server can send as."><input className={fieldCls} value={sender.customEmail} onChange={(e) => setSender(s => ({ ...s, customEmail: e.target.value }))} placeholder="events@newbi.live" inputMode="email" autoCapitalize="off" /></Field>
                                </div>
                            )}
                            <div>
                                <FieldLabel>Label on the email</FieldLabel>
                                <div className="flex flex-wrap gap-2">
                                    {categoryOptions.map(cat => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => patch({ category: cat })}
                                            aria-pressed={mail.category === cat}
                                            className={cn('h-10 rounded-xl border px-3.5 text-[13px] font-semibold transition-colors',
                                                mail.category === cat ? cn(accent('fuchsia').border, accent('fuchsia').soft, accent('fuchsia').text) : 'border-black/10 text-gray-600 hover:border-black/20 dark:border-white/10 dark:text-zinc-300')}
                                        >
                                            {mail.category === cat && <Check size={13} className="mr-1 inline" />}{CATEGORY_LABEL[cat]}
                                        </button>
                                    ))}
                                </div>
                                {mail.category === 'CUSTOM' && (
                                    <input className={cn(fieldCls, 'mt-2')} value={mail.customCategory} onChange={(e) => patch({ customCategory: e.target.value })} placeholder="Your label, e.g. Exclusive" maxLength={24} />
                                )}
                            </div>
                        </div>
                    </BuilderCard>

                    {/* Desktop action bar */}
                    <div className="sticky bottom-4 z-20 hidden items-center gap-2 rounded-2xl border border-black/[0.08] bg-white/95 p-3 shadow-lg backdrop-blur-xl dark:border-white/[0.1] dark:bg-[#0d0f15]/95 sm:flex">
                        <div className="min-w-0 flex-1">
                            {problems.length ? (
                                <p className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-amber-700 dark:text-amber-300"><AlertTriangle size={14} className="shrink-0" /> {problems[0]}</p>
                            ) : (
                                <p className="truncate text-[13px] font-semibold text-gray-600 dark:text-zinc-300">Ready for {finalCount.toLocaleString('en-IN')} {finalCount === 1 ? 'person' : 'people'}{testedAt ? ' · test sent' : ''}</p>
                            )}
                        </div>
                        <Button variant="ghost" className="h-11" onClick={() => saveTemplate(false)} disabled={savingTemplate}>
                            <Save size={15} /> {savingTemplate ? 'Saving…' : templateId && activeTemplate ? 'Update template' : 'Save as template'}
                        </Button>
                        {templateId && activeTemplate && <Button variant="ghost" className="h-11" onClick={() => saveTemplate(true)} disabled={savingTemplate}>Save as new</Button>}
                        {actionButtons(false)}
                    </div>
                    <div className="flex gap-2 sm:hidden">
                        <Button variant="secondary" className="h-11 flex-1" onClick={() => saveTemplate(false)} disabled={savingTemplate}>
                            <Save size={15} /> {savingTemplate ? 'Saving…' : templateId && activeTemplate ? 'Update template' : 'Save as template'}
                        </Button>
                        {templateId && activeTemplate && <Button variant="ghost" className="h-11" onClick={() => saveTemplate(true)} disabled={savingTemplate}>Save as new</Button>}
                    </div>
                </div>

                <aside className={cn('min-w-0 space-y-3 xl:sticky xl:top-24 xl:self-start', mobilePane === 'edit' && 'hidden xl:block')}>
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-bold text-gray-500">Preview</p>
                        <p className="truncate text-[12px] text-gray-500">Personalised for {person.email}</p>
                    </div>
                    <EmailPreview
                        html={previewHtml}
                        subject={fillTags(mail.subject, person)}
                        preheader={previewMail.preheader || stripHtml(previewMail.messageBody).slice(0, 110)}
                        fromName={fromName}
                        fromEmail={fromEmail}
                        theme={mail.theme}
                        onThemeChange={(theme) => patch({ theme })}
                    />
                </aside>
            </div>

            {/* Phone action bar */}
            <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 border-t border-black/[0.06] bg-white/95 px-4 py-3 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#0a0b10]/95 sm:hidden">
                {problems.length > 0 && <p className="mb-2 truncate text-[12px] font-semibold text-amber-700 dark:text-amber-300">{problems[0]}</p>}
                <div className="flex gap-2">{actionButtons(true)}</div>
            </div>
        </div>
    );

    const unsubscribedPanel = (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <SearchInput value={unsubSearch} onChange={setUnsubSearch} placeholder="Search email" className="sm:w-96" />
                <div className="flex flex-1 items-center justify-end gap-2">
                    <ExportMenu getSpec={() => ({
                        filename: `unsubscribed_${fileDate()}`,
                        sheetName: 'Unsubscribed',
                        title: 'Unsubscribed from campaign email',
                        subtitle: exportSubtitle(unsubRows.length, 'address'),
                        rows: unsubRows,
                        columns: [
                            { header: 'Email', value: r => r.email },
                            { header: 'Unsubscribed', type: 'datetime', value: r => r.at || null },
                            { header: 'How', value: r => r.how },
                        ],
                    })} />
                </div>
            </div>
            <p className="text-[13px] text-gray-500">People here are skipped automatically by every campaign and newsletter. Receipts, tickets and invoices still reach them.</p>
            {suppression.status === 'error' && (
                <Card className="rounded-2xl p-4">
                    <p className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-amber-700 dark:text-amber-300">
                        <AlertTriangle size={14} /> Couldn't load the unsubscribe list.
                        <Button size="sm" variant="secondary" className="h-10" onClick={suppression.reload}>Try again</Button>
                    </p>
                </Card>
            )}
            {unsubRows.length === 0 ? (
                <Card className="rounded-2xl">
                    <EmptyState icon={UserX} tone="amber" title={suppression.status === 'loading' ? 'Loading…' : unsubSearch ? 'No one matches' : 'No one has unsubscribed'} description={suppression.status === 'loading' ? undefined : 'When someone uses the unsubscribe link in an email, they show up here.'} />
                </Card>
            ) : (
                <Card className="overflow-hidden rounded-2xl">
                    <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                        {unsubRows.slice(0, 500).map(r => (
                            <li key={r.email} className="flex items-center gap-3 px-4 py-3">
                                <Avatar name={r.email} size={34} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[14px] font-semibold">{r.email}</p>
                                    <p className="truncate text-[12px] text-gray-500">{[r.how, formatWhen(r.at)].filter(Boolean).join(' · ')}</p>
                                </div>
                                {r.how !== 'Subscriber list' && <Button size="sm" variant="ghost" className="h-10" onClick={() => setConfirm({ kind: 'allow', item: r })}>Allow again</Button>}
                            </li>
                        ))}
                    </ul>
                    {unsubRows.length > 500 && <p className="border-t border-black/[0.05] px-4 py-3 text-center text-[12px] text-gray-500 dark:border-white/[0.05]">Showing 500 of {unsubRows.length}. Search or export to see everyone.</p>}
                </Card>
            )}
        </div>
    );

    const confirmCopy = {
        template: { title: 'Delete this template?', label: 'Delete', danger: true, text: `“${confirm?.item?.subject || 'Untitled'}” will be removed for everyone. Emails already sent aren't affected.` },
        campaign: { title: 'Delete this campaign record?', label: 'Delete', danger: true, text: 'The report (opens, clicks, who failed) is removed. The emails that were sent stay in people\'s inboxes.' },
        allow: { title: 'Send to this address again?', label: 'Allow again', danger: false, text: `Only do this if ${confirm?.item?.email || 'they'} asked to get Newbi emails again.` },
        new: { title: 'Start a new email?', label: 'Start new', danger: true, text: 'This clears the composer. Save it as a template first if you want to keep it.' },
    }[confirm?.kind] || {};

    return (
        <AdminCommunityHubLayout
            hideTabs
            studioHeader={{ title: 'Mailing', icon: Megaphone, description: 'Write, test and send campaign emails, and see who opened them' }}
            action={tab !== 'compose' && (
                <Button variant="accent" onClick={() => setParams({ tab: null, campaign: null })} className="w-full sm:w-auto"><MailPlus size={15} /> Write an email</Button>
            )}
        >
            <div className="space-y-5">
                <div ref={tabsRef} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                    <SegmentedTabs value={tab} onChange={(v) => setParams({ tab: v === 'compose' ? null : v, campaign: null })} items={tabItems} />
                </div>

                {tab === 'compose' && composer}
                {tab === 'history' && (
                    <CampaignHistory
                        campaigns={emailCampaigns}
                        openId={openCampaignId}
                        onOpen={(id) => setParams({ campaign: id })}
                        onClose={() => setParams({ campaign: null })}
                        onReuse={reuseCampaign}
                        onRetry={retryCampaign}
                        onDelete={(c) => setConfirm({ kind: 'campaign', item: c })}
                        onCompose={() => setParams({ tab: null })}
                    />
                )}
                {tab === 'templates' && (
                    <TemplatesPanel
                        templates={emailTemplates}
                        activeId={templateId}
                        onUse={applyTemplate}
                        onDelete={(t) => setConfirm({ kind: 'template', item: t })}
                        onCompose={() => setParams({ tab: null })}
                    />
                )}
                {tab === 'unsubscribed' && unsubscribedPanel}
            </div>

            <SendSheet
                open={!!sendJob}
                job={sendJob}
                onClose={() => setSendJob(null)}
                onFinished={(res) => {
                    if (res.success) addToast(`Sent to ${res.sent.toLocaleString('en-IN')} ${res.sent === 1 ? 'person' : 'people'}.`, 'success');
                }}
                onViewReport={(id) => { setSendJob(null); setParams({ tab: 'history', campaign: id }); }}
            />

            <ConfirmDialog
                open={!!confirm}
                onClose={() => setConfirm(null)}
                title={confirmCopy.title}
                confirmLabel={confirmCopy.label}
                danger={confirmCopy.danger}
                busy={confirmBusy}
                onConfirm={runConfirm}
            >
                {confirmCopy.text}
            </ConfirmDialog>
        </AdminCommunityHubLayout>
    );
};

export default MailingManager;
