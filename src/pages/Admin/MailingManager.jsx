import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { 
    LayoutGrid, Send, Sparkles, Mail, Users, Monitor, Smartphone, 
    Image as ImageIcon, ExternalLink, X, Upload, Loader, Link as LinkIcon, 
    Shield, Zap, Save, Search, Plus, FolderOpen, Tag, Check, Trash2, UserPlus, FileText, RefreshCw,
    BarChart3, MousePointerClick, Eye, ArrowUpRight, Clock, CheckCircle2, AlertCircle, ChevronRight, Activity, Filter, Globe
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import StudioRichEditor from '../../components/ui/StudioRichEditor';
import { sendMassEmail, generateOfficialHTML } from '../../lib/email';

const ALIASES = [
    { name: 'Newbi Partnerships', email: 'partnership@newbi.live', key: 'partnership' },
    { name: 'Newbi Notifications', email: 'noreply@newbi.live', key: 'noreply' },
    { name: 'Newbi Legal', email: 'legal@newbi.live', key: 'legal' },
    { name: 'Newbi Collaborations', email: 'collaborations@newbi.live', key: 'collaborations' },
    { name: 'Custom Alias', email: '', key: 'custom' }
];

const PRESET_CATEGORIES = ['OFFICIAL', 'UPDATES', 'NEWS', 'PROMO', 'CUSTOM'];

const MailingManager = () => {
    useStoreSubscription(['subscribers', 'allUsers', 'admins', 'creators', 'artists', 'emailTemplates', 'emailCampaigns', 'emailEvents']);
    const { 
        subscribers, 
        allUsers, 
        admins, 
        creators, 
        artists, 
        emailTemplates, 
        emailCampaigns, 
        emailEvents, 
        addToast, 
        saveEmailTemplate, 
        deleteEmailTemplate,
        deleteEmailCampaign 
    } = useStore();
    const [searchParams] = useSearchParams();
    
    // Main View Tab: 'composer' | 'analytics'
    const [activeTab, setActiveTab] = useState('composer');

    // Mail Maker State with local draft recovery
    const [mailData, setMailData] = useState(() => {
        const savedDraft = localStorage.getItem('nb_mailing_draft');
        let initial = {
            subject: searchParams.get('subject') || '',
            headerText: searchParams.get('header') || '',
            messageBody: searchParams.get('body') || '',
            ctaText: searchParams.get('ctaText') || '',
            ctaUrl: searchParams.get('ctaUrl') || '',
            category: 'OFFICIAL',
            customCategory: '',
            theme: 'light'
        };
        if (savedDraft && !searchParams.get('subject') && !searchParams.get('body')) {
            try {
                const parsed = JSON.parse(savedDraft);
                initial = { ...initial, ...parsed };
            } catch (e) {}
        }
        return initial;
    });

    const [recipientType, setRecipientType] = useState('subscribers'); 
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState(null); 
    const [viewMode, setViewMode] = useState('desktop');

    // Sender Alias State
    const [selectedAlias, setSelectedAlias] = useState(ALIASES[0]);
    const [customName, setCustomName] = useState('');
    const [customEmail, setCustomEmail] = useState('');

    // Individuals & Search State
    const [selectedIndividuals, setSelectedIndividuals] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [savingTemplate, setSavingTemplate] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');

    // Analytics Dashboard State
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [campaignSearch, setCampaignSearch] = useState('');
    const [campaignCategoryFilter, setCampaignCategoryFilter] = useState('ALL');
    const [modalDetailTab, setModalDetailTab] = useState('recipients'); // 'recipients' | 'links' | 'preview'

    // Save mailData changes to draft storage
    React.useEffect(() => {
        try {
            localStorage.setItem('nb_mailing_draft', JSON.stringify(mailData));
        } catch (e) {}
    }, [mailData]);

    const handleNewDraft = () => {
        setSelectedTemplateId('');
        setMailData({
            subject: '',
            headerText: '',
            messageBody: '',
            ctaText: '',
            ctaUrl: '',
            category: 'OFFICIAL',
            customCategory: '',
            theme: 'light'
        });
        localStorage.removeItem('nb_mailing_draft');
        addToast("Started new blank draft", "info");
    };

    const allKnownUsers = useMemo(() => {
        const merged = [...(subscribers || []), ...(allUsers || []), ...(admins || []), ...(creators || []), ...(artists || [])];
        const unique = Array.from(new Set(merged.map(r => r.email?.toLowerCase()).filter(Boolean)))
            .map(email => merged.find(r => r.email?.toLowerCase() === email));
        return unique;
    }, [subscribers, allUsers, admins, creators, artists]);

    const recipients = useMemo(() => {
        if (recipientType === 'subscribers') return subscribers || [];
        if (recipientType === 'registered') return allUsers || [];
        if (recipientType === 'admins') return admins || [];
        if (recipientType === 'creators') return creators || [];
        if (recipientType === 'artists') return artists || [];
        if (recipientType === 'individuals') return selectedIndividuals;
        
        return allKnownUsers;
    }, [recipientType, subscribers, allUsers, admins, creators, artists, selectedIndividuals, allKnownUsers]);

    // Handle adding custom email string
    const handleAddCustomEmail = (rawEmail) => {
        const trimmed = (rawEmail || searchQuery).trim().toLowerCase();
        if (!trimmed) return;
        
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
        if (!isEmail) {
            addToast("Please enter a valid email address (e.g. name@example.com)", 'error');
            return;
        }

        if (selectedIndividuals.some(u => u.email?.toLowerCase() === trimmed)) {
            addToast("Email is already in the recipient list", 'error');
            return;
        }

        setSelectedIndividuals(prev => [...prev, { name: trimmed.split('@')[0], email: trimmed, isCustom: true }]);
        setSearchQuery('');
        addToast(`Added ${trimmed}`, 'success');
    };

    const handleSaveTemplate = async (saveAsNew = false) => {
        const subject = mailData.subject?.trim();
        if (!subject) {
            addToast("Please enter a subject line before saving as a template", 'error');
            return;
        }
        setSavingTemplate(true);
        try {
            const templateId = await saveEmailTemplate({
                id: (!saveAsNew && selectedTemplateId) ? selectedTemplateId : undefined,
                subject: subject,
                headerText: mailData.headerText || '',
                messageBody: mailData.messageBody || '',
                ctaText: mailData.ctaText || '',
                ctaUrl: mailData.ctaUrl || '',
                category: mailData.category === 'CUSTOM' ? (mailData.customCategory?.trim() || 'OFFICIAL') : mailData.category,
                customCategory: mailData.customCategory?.trim() || '',
                theme: mailData.theme || 'light'
            });

            if (!saveAsNew && selectedTemplateId) {
                addToast("Template updated successfully!", "success");
            } else {
                setSelectedTemplateId(templateId);
                addToast("Template saved successfully!", "success");
            }
        } catch (error) {
            console.error("Save template notice:", error);
            if (error.message && error.message.startsWith("SAVED_LOCALLY")) {
                const noticeMsg = error.message.replace("SAVED_LOCALLY: ", "");
                addToast(noticeMsg, "info");
            } else {
                addToast(error.message || "Failed to save template", 'error');
            }
        } finally {
            setSavingTemplate(false);
        }
    };

    const handleDeleteTemplate = async (templateId, e) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this saved template?")) return;
        try {
            await deleteEmailTemplate(templateId);
            if (selectedTemplateId === templateId) setSelectedTemplateId('');
            addToast("Template deleted", "success");
        } catch (err) {
            addToast("Failed to delete template", "error");
        }
    };

    const handleLoadTemplate = (templateId) => {
        setSelectedTemplateId(templateId);
        if (!templateId) return;
        const template = emailTemplates?.find(t => t.id === templateId);
        if (template) {
            const rawCat = template.category || 'OFFICIAL';
            const isPresetCat = PRESET_CATEGORIES.includes(rawCat);
            setMailData({
                subject: template.subject || '',
                headerText: template.headerText || '',
                messageBody: template.messageBody || '',
                ctaText: template.ctaText || '',
                ctaUrl: template.ctaUrl || '',
                category: isPresetCat ? rawCat : 'CUSTOM',
                customCategory: !isPresetCat ? rawCat : (template.customCategory || ''),
                theme: template.theme || 'light'
            });
            addToast("Template loaded into editor", "success");
        }
    };

    const handleSendEmails = async (e) => {
        if (e) e.preventDefault();
        if (recipients.length === 0) {
            addToast("No recipients found for this broadcast.", 'error');
            return;
        }

        const effectiveCategory = mailData.category === 'CUSTOM' 
            ? (mailData.customCategory || 'OFFICIAL') 
            : mailData.category;

        if (!window.confirm(`Send official email to ${recipients.length} recipient(s)?`)) return;

        setSending(true);
        setStatus({ type: 'info', text: 'Executing official broadcast with real-time tracking...' });

        try {
            const finalMailData = {
                ...mailData,
                category: effectiveCategory,
                recipientType: recipientType
            };

            const htmlContent = generateOfficialHTML(finalMailData);
            const fromName = selectedAlias.key === 'custom' ? customName : selectedAlias.name;
            const fromEmail = selectedAlias.key === 'custom' ? customEmail : selectedAlias.email;

            const mailResult = await sendMassEmail(recipients, mailData.subject, htmlContent, 'official', null, fromName, fromEmail, finalMailData);

            if (!mailResult.success) {
                throw new Error(mailResult.error || "Failed to broadcast");
            }

            setStatus({ type: 'success', text: `Broadcast complete! Delivered to ${recipients.length} address(es) with Tracking ID: ${mailResult.campaignId}` });
            addToast("Broadcast transmitted successfully with open & link tracking enabled!", "success");
        } catch (error) {
            console.error("Send failed:", error);
            setStatus({ type: 'error', text: 'Broadcast failed. Check API configuration.' });
            addToast(error.message || "Failed to broadcast email", "error");
        } finally {
            setSending(false);
            setTimeout(() => setStatus(null), 8000);
        }
    };

    // Analytics Aggregates
    const analyticsSummary = useMemo(() => {
        const list = emailCampaigns || [];
        const totalCampaigns = list.length;
        let totalRecipients = 0;
        let totalUniqueOpens = 0;
        let totalOpens = 0;
        let totalUniqueClicks = 0;
        let totalClicks = 0;

        list.forEach(c => {
            const rec = Number(c.totalRecipients || c.sentCount || 0);
            totalRecipients += rec;
            totalUniqueOpens += Number(c.uniqueOpens || (Array.isArray(c.openedEmails) ? c.openedEmails.length : 0));
            totalOpens += Number(c.opensCount || 0);
            totalUniqueClicks += Number(c.uniqueClicks || (Array.isArray(c.clickedEmails) ? c.clickedEmails.length : 0));
            totalClicks += Number(c.clicksCount || 0);
        });

        const openRate = totalRecipients > 0 ? ((totalUniqueOpens / totalRecipients) * 100).toFixed(1) : '0.0';
        const clickRate = totalRecipients > 0 ? ((totalUniqueClicks / totalRecipients) * 100).toFixed(1) : '0.0';

        return {
            totalCampaigns,
            totalRecipients,
            totalUniqueOpens,
            totalOpens,
            totalUniqueClicks,
            totalClicks,
            openRate,
            clickRate
        };
    }, [emailCampaigns]);

    // Filtered Campaigns
    const filteredCampaigns = useMemo(() => {
        const list = emailCampaigns || [];
        return list.filter(c => {
            const matchesCategory = campaignCategoryFilter === 'ALL' || (c.category?.toUpperCase() === campaignCategoryFilter.toUpperCase());
            const q = campaignSearch.toLowerCase().trim();
            const matchesSearch = !q || 
                c.subject?.toLowerCase().includes(q) ||
                c.category?.toLowerCase().includes(q) ||
                c.senderEmail?.toLowerCase().includes(q) ||
                c.senderName?.toLowerCase().includes(q) ||
                c.id?.toLowerCase().includes(q) ||
                (Array.isArray(c.openedEmails) && c.openedEmails.some(e => e.toLowerCase().includes(q)));
            return matchesCategory && matchesSearch;
        });
    }, [emailCampaigns, campaignCategoryFilter, campaignSearch]);

    const handleLoadCampaignToComposer = (campaign) => {
        if (!campaign) return;
        const rawCat = campaign.category || 'OFFICIAL';
        const isPresetCat = PRESET_CATEGORIES.includes(rawCat);
        setMailData({
            subject: campaign.subject || '',
            headerText: campaign.headerText || '',
            messageBody: campaign.messageBody || '',
            ctaText: campaign.ctaText || '',
            ctaUrl: campaign.ctaUrl || '',
            category: isPresetCat ? rawCat : 'CUSTOM',
            customCategory: !isPresetCat ? rawCat : '',
            theme: campaign.theme || 'light'
        });
        setActiveTab('composer');
        addToast(`Loaded broadcast "${campaign.subject}" into Composer`, "success");
    };

    const handleDeleteCampaign = async (campaignId, e) => {
        if (e) e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this broadcast tracking record? All tracking logs for this broadcast will be preserved.")) return;
        try {
            await deleteEmailCampaign(campaignId);
            if (selectedCampaign?.id === campaignId) setSelectedCampaign(null);
            addToast("Broadcast record deleted", "success");
        } catch (err) {
            addToast("Failed to delete broadcast record", "error");
        }
    };

    const effectiveCategory = mailData.category === 'CUSTOM' 
        ? (mailData.customCategory || 'OFFICIAL') 
        : mailData.category;

    const sampleRecipient = useMemo(() => {
        if (recipients && recipients.length > 0) {
            const first = recipients[0];
            const fullName = first.displayName || first.name || first.email?.split('@')[0] || 'Alex Rivera';
            return {
                name: fullName,
                firstName: fullName.split(' ')[0] || 'Alex',
                email: first.email || 'alex@example.com',
                role: first.role || 'Member'
            };
        }
        return { name: 'Alex Rivera', firstName: 'Alex', email: 'alex@example.com', role: 'Member' };
    }, [recipients]);

    const previewMailData = useMemo(() => {
        const replaceSampleTags = (str) => {
            if (!str) return '';
            return str
                .replace(/\{\{?\s*name\s*\}?\}/gi, sampleRecipient.name)
                .replace(/\{\{?\s*first_name\s*\}?\}/gi, sampleRecipient.firstName)
                .replace(/\{\{?\s*email\s*\}?\}/gi, sampleRecipient.email)
                .replace(/\{\{?\s*role\s*\}?\}/gi, sampleRecipient.role);
        };

        return {
            ...mailData,
            category: effectiveCategory,
            headerText: replaceSampleTags(mailData.headerText || ''),
            messageBody: replaceSampleTags(mailData.messageBody || ''),
            ctaText: replaceSampleTags(mailData.ctaText || '')
        };
    }, [mailData, effectiveCategory, sampleRecipient]);

    return (
        <AdminCommunityHubLayout 
            hideTabs={true}
            accentColor="neon-pink"
            studioHeader={{
                title: "OFFICIAL",
                subtitle: "COMMUNICATIONS STUDIO",
                accentClass: "text-neon-pink"
            }}
            action={(
                <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 w-full md:w-auto">
                    {/* Main Tabs Switcher: Studio & Composer vs Broadcast Analytics */}
                    <div className="flex bg-gray-200/80 dark:bg-black/60 p-1.5 rounded-2xl border border-black/10 dark:border-white/10 shadow-xl backdrop-blur-2xl">
                        <button
                            type="button"
                            onClick={() => setActiveTab('composer')}
                            className={cn(
                                "px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2",
                                activeTab === 'composer' 
                                    ? "bg-white text-black dark:bg-white dark:text-black shadow-lg scale-[1.02]" 
                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            <Send size={13} className={activeTab === 'composer' ? 'text-neon-pink' : ''} />
                            <span>Composer & Studio</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('analytics')}
                            className={cn(
                                "px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 relative",
                                activeTab === 'analytics' 
                                    ? "bg-white text-black dark:bg-white dark:text-black shadow-lg scale-[1.02]" 
                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            <BarChart3 size={13} className={activeTab === 'analytics' ? 'text-neon-pink' : ''} />
                            <span>Analytics & Tracking</span>
                            {(emailCampaigns?.length || 0) > 0 && (
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold",
                                    activeTab === 'analytics' ? "bg-neon-pink/20 text-neon-pink" : "bg-black/10 dark:bg-white/10 text-gray-700 dark:text-gray-300"
                                )}>
                                    {emailCampaigns?.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* In Composer Mode: Audience Selector Pill Bar */}
                    {activeTab === 'composer' && (
                        <div className="flex bg-white dark:bg-black/60 p-1.5 rounded-2xl border border-black/10 dark:border-white/5 overflow-x-auto no-scrollbar max-w-full shadow-lg">
                            {[
                                { id: 'subscribers', label: 'Subscribers' },
                                { id: 'registered', label: 'Users' },
                                { id: 'admins', label: 'Admins' },
                                { id: 'creators', label: 'Creators' },
                                { id: 'artists', label: 'Artists' },
                                { id: 'individuals', label: 'Individuals' },
                                { id: 'all', label: 'Global' }
                            ].map(type => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setRecipientType(type.id)}
                                    className={cn(
                                        "px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5",
                                        recipientType === type.id 
                                            ? "bg-neon-pink text-black shadow-md font-extrabold" 
                                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                    )}
                                >
                                    {type.id === 'individuals' && <UserPlus size={11} />}
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        >
            <div className="relative z-10 space-y-8">

                {/* ========================================================= */}
                {/* 1. BROADCAST ANALYTICS & TRACKING VIEW                     */}
                {/* ========================================================= */}
                {activeTab === 'analytics' && (
                    <motion.div 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        className="space-y-8"
                    >
                        {/* Top KPI Metrics Row */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                            {/* Card 1: Total Broadcasts */}
                            <Card className="p-5 md:p-6 bg-gray-100 dark:bg-zinc-900/60 backdrop-blur-3xl border-black/10 dark:border-white/10 rounded-[2rem] shadow-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-28 h-28 bg-neon-pink/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />
                                <div className="relative z-10 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Total Broadcasts</span>
                                        <div className="p-2 rounded-xl bg-neon-pink/10 text-neon-pink border border-neon-pink/20">
                                            <Mail size={16} />
                                        </div>
                                    </div>
                                    <div className="text-3xl md:text-4xl font-black font-heading text-gray-900 dark:text-white">
                                        {analyticsSummary.totalCampaigns}
                                    </div>
                                    <p className="text-[10px] font-mono text-gray-500 flex items-center gap-1.5">
                                        <CheckCircle2 size={12} className="text-emerald-400" /> {analyticsSummary.totalRecipients.toLocaleString()} Recipients Sent
                                    </p>
                                </div>
                            </Card>

                            {/* Card 2: Open Rate */}
                            <Card className="p-5 md:p-6 bg-gray-100 dark:bg-zinc-900/60 backdrop-blur-3xl border-black/10 dark:border-white/10 rounded-[2rem] shadow-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />
                                <div className="relative z-10 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Avg Open Rate</span>
                                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            <Eye size={16} />
                                        </div>
                                    </div>
                                    <div className="text-3xl md:text-4xl font-black font-heading text-emerald-400 flex items-baseline gap-1">
                                        {analyticsSummary.openRate}%
                                    </div>
                                    <p className="text-[10px] font-mono text-gray-500 flex items-center gap-1.5">
                                        <Activity size={12} className="text-emerald-400" /> {analyticsSummary.totalUniqueOpens} Unique / {analyticsSummary.totalOpens} Total Opens
                                    </p>
                                </div>
                            </Card>

                            {/* Card 3: Click-Through Rate (CTR) */}
                            <Card className="p-5 md:p-6 bg-gray-100 dark:bg-zinc-900/60 backdrop-blur-3xl border-black/10 dark:border-white/10 rounded-[2rem] shadow-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />
                                <div className="relative z-10 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Click Rate (CTR)</span>
                                        <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                            <MousePointerClick size={16} />
                                        </div>
                                    </div>
                                    <div className="text-3xl md:text-4xl font-black font-heading text-cyan-400 flex items-baseline gap-1">
                                        {analyticsSummary.clickRate}%
                                    </div>
                                    <p className="text-[10px] font-mono text-gray-500 flex items-center gap-1.5">
                                        <ArrowUpRight size={12} className="text-cyan-400" /> {analyticsSummary.totalUniqueClicks} Unique / {analyticsSummary.totalClicks} Total Clicks
                                    </p>
                                </div>
                            </Card>

                            {/* Card 4: Tracking Engine Status */}
                            <Card className="p-5 md:p-6 bg-gray-100 dark:bg-zinc-900/60 backdrop-blur-3xl border-black/10 dark:border-white/10 rounded-[2rem] shadow-xl relative overflow-hidden flex flex-col justify-between">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Engine Health</span>
                                        <span className="relative flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                        </span>
                                    </div>
                                    <div className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white">
                                        Active & Logging
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-black/10 dark:border-white/5 flex items-center justify-between text-[9px] font-mono text-gray-500">
                                    <span>Route: /api/track</span>
                                    <span className="text-emerald-400 font-bold">1x1 GIF & 302</span>
                                </div>
                            </Card>
                        </div>

                        {/* Realtime Live Events Ticker Feed */}
                        {(emailEvents?.length || 0) > 0 && (
                            <Card className="p-4 md:p-5 bg-gray-100 dark:bg-zinc-900/40 backdrop-blur-2xl border-black/10 dark:border-white/10 rounded-3xl shadow-xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <span className="relative flex h-2.5 w-2.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-pink opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-neon-pink"></span>
                                        </span>
                                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">Live Tracking Stream</h4>
                                    </div>
                                    <span className="text-[10px] font-mono text-gray-500">
                                        {emailEvents.length} events logged
                                    </span>
                                </div>

                                <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                                    {emailEvents.slice(0, 12).map((ev, idx) => (
                                        <div 
                                            key={ev.id || idx}
                                            className="px-3.5 py-2 rounded-2xl bg-white dark:bg-black/60 border border-black/10 dark:border-white/5 flex items-center gap-2.5 shrink-0 shadow-sm"
                                        >
                                            <div className={cn(
                                                "p-1.5 rounded-lg text-[10px]",
                                                ev.eventType === 'open' ? "bg-emerald-500/10 text-emerald-400" : "bg-cyan-500/10 text-cyan-400"
                                            )}>
                                                {ev.eventType === 'open' ? <Eye size={12} /> : <MousePointerClick size={12} />}
                                            </div>
                                            <div className="space-y-0.5">
                                                <div className="text-[10px] font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                                    <span className="uppercase font-mono text-[9px] text-neon-pink font-black">{ev.eventType}</span>
                                                    <span className="truncate max-w-[140px] text-gray-600 dark:text-gray-300">{ev.email || 'Anonymous Recipient'}</span>
                                                </div>
                                                <div className="text-[8px] font-mono text-gray-500 truncate max-w-[180px]">
                                                    {ev.subject || ev.targetUrl || 'Broadcast'} &bull; {new Date(ev.timestamp || ev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {/* Broadcast History & Campaign Explorer */}
                        <Card className="p-6 md:p-8 bg-gray-100 dark:bg-zinc-900/50 backdrop-blur-3xl border-black/10 dark:border-white/10 rounded-[2.5rem] shadow-2xl space-y-6">
                            {/* Search & Category Filter Bar */}
                            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pb-6 border-b border-black/10 dark:border-white/5">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white flex items-center gap-2">
                                        <FileText size={16} className="text-neon-pink" /> Broadcast Transmissions History
                                    </h3>
                                    <p className="text-[10px] text-gray-500">Track delivery, open rates, and individual link clicks across all broadcasts</p>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center gap-3">
                                    {/* Search Input */}
                                    <div className="relative w-full sm:w-64">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
                                        <Input 
                                            value={campaignSearch}
                                            onChange={(e) => setCampaignSearch(e.target.value)}
                                            placeholder="Search broadcasts, emails..."
                                            className="h-10 pl-9 bg-white dark:bg-black/60 border-black/10 dark:border-white/10 rounded-xl text-[10px] font-bold tracking-wider"
                                        />
                                    </div>

                                    {/* Category Filter Pills */}
                                    <div className="flex bg-white dark:bg-black/60 p-1 rounded-xl border border-black/10 dark:border-white/5 overflow-x-auto no-scrollbar w-full sm:w-auto">
                                        {['ALL', ...PRESET_CATEGORIES].map(cat => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => setCampaignCategoryFilter(cat)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap",
                                                    campaignCategoryFilter === cat 
                                                        ? "bg-neon-pink text-black font-extrabold shadow-sm" 
                                                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                                )}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Campaign List */}
                            {filteredCampaigns.length === 0 ? (
                                <div className="text-center py-16 space-y-4">
                                    <div className="w-16 h-16 rounded-3xl bg-neon-pink/10 border border-neon-pink/20 flex items-center justify-center text-neon-pink mx-auto">
                                        <Mail size={24} />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">No Broadcast Campaigns Found</h4>
                                        <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                            {campaignSearch || campaignCategoryFilter !== 'ALL' 
                                                ? "Try changing your search term or filter category." 
                                                : "Send your first official broadcast from the Composer & Studio tab to begin tracking open and click metrics."}
                                        </p>
                                    </div>
                                    <Button
                                        onClick={() => setActiveTab('composer')}
                                        className="h-11 px-6 bg-neon-pink text-black font-black uppercase text-[10px] tracking-wider rounded-2xl hover:scale-105 transition-all"
                                    >
                                        <Plus size={14} className="mr-1.5" /> Go to Composer
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredCampaigns.map(camp => {
                                        const totalRec = Number(camp.totalRecipients || camp.sentCount || 1);
                                        const uniqOpens = Number(camp.uniqueOpens || (Array.isArray(camp.openedEmails) ? camp.openedEmails.length : 0));
                                        const openPct = Math.min(100, ((uniqOpens / totalRec) * 100)).toFixed(1);
                                        const uniqClicks = Number(camp.uniqueClicks || (Array.isArray(camp.clickedEmails) ? camp.clickedEmails.length : 0));
                                        const clickPct = Math.min(100, ((uniqClicks / totalRec) * 100)).toFixed(1);

                                        return (
                                            <div 
                                                key={camp.id}
                                                className="p-5 md:p-6 bg-white dark:bg-black/50 border border-black/10 dark:border-white/5 rounded-3xl hover:border-neon-pink/40 transition-all shadow-sm group"
                                            >
                                                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                                                    
                                                    {/* Campaign Info */}
                                                    <div className="space-y-2 flex-1 min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="px-2.5 py-1 rounded-lg bg-neon-pink/10 border border-neon-pink/20 text-neon-pink text-[9px] font-black uppercase tracking-widest">
                                                                {camp.category || 'OFFICIAL'}
                                                            </span>
                                                            <span className={cn(
                                                                "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider",
                                                                camp.status === 'completed' ? "bg-emerald-500/10 text-emerald-400" :
                                                                camp.status === 'partially_failed' ? "bg-amber-500/10 text-amber-400" :
                                                                "bg-blue-500/10 text-blue-400"
                                                            )}>
                                                                {camp.status || 'Delivered'}
                                                            </span>
                                                            <span className="text-[10px] font-mono text-gray-500 flex items-center gap-1">
                                                                <Clock size={11} /> {new Date(camp.sentAt || 0).toLocaleString()}
                                                            </span>
                                                        </div>

                                                        <h4 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-wider truncate">
                                                            {camp.subject || 'Untitled Broadcast'}
                                                        </h4>

                                                        <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono text-gray-500">
                                                            <span>From: <span className="text-gray-700 dark:text-gray-300 font-bold">{camp.senderName || 'Newbi'} &lt;{camp.senderEmail || 'partnership@newbi.live'}&gt;</span></span>
                                                            <span>Audience: <span className="text-neon-pink font-bold">{camp.totalRecipients || camp.sentCount || 0} Recipients</span></span>
                                                        </div>
                                                    </div>

                                                    {/* Metrics Progress Bars */}
                                                    <div className="grid grid-cols-2 gap-4 w-full lg:w-72 shrink-0">
                                                        {/* Open Rate Meter */}
                                                        <div className="space-y-1.5 p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                                                            <div className="flex items-center justify-between text-[10px]">
                                                                <span className="font-bold text-gray-500 flex items-center gap-1">
                                                                    <Eye size={12} className="text-emerald-400" /> Opens
                                                                </span>
                                                                <span className="font-mono font-black text-emerald-400">{openPct}%</span>
                                                            </div>
                                                            <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                                                                <div 
                                                                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300 rounded-full transition-all duration-500"
                                                                    style={{ width: `${openPct}%` }}
                                                                />
                                                            </div>
                                                            <div className="text-[8px] font-mono text-gray-500 text-right">
                                                                {uniqOpens} / {totalRec} unique
                                                            </div>
                                                        </div>

                                                        {/* Click Rate Meter */}
                                                        <div className="space-y-1.5 p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                                                            <div className="flex items-center justify-between text-[10px]">
                                                                <span className="font-bold text-gray-500 flex items-center gap-1">
                                                                    <MousePointerClick size={12} className="text-cyan-400" /> Clicks
                                                                </span>
                                                                <span className="font-mono font-black text-cyan-400">{clickPct}%</span>
                                                            </div>
                                                            <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                                                                <div 
                                                                    className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 rounded-full transition-all duration-500"
                                                                    style={{ width: `${clickPct}%` }}
                                                                />
                                                            </div>
                                                            <div className="text-[8px] font-mono text-gray-500 text-right">
                                                                {uniqClicks} / {totalRec} unique
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-2 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-black/5 dark:border-white/5">
                                                        <Button
                                                            type="button"
                                                            onClick={() => setSelectedCampaign(camp)}
                                                            className="h-10 px-4 bg-neon-pink/10 hover:bg-neon-pink/20 text-neon-pink border border-neon-pink/30 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"
                                                        >
                                                            <BarChart3 size={13} /> View Analytics
                                                        </Button>

                                                        <Button
                                                            type="button"
                                                            onClick={() => handleLoadCampaignToComposer(camp)}
                                                            className="h-10 px-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl text-[10px] font-bold"
                                                            title="Load into Composer"
                                                        >
                                                            <RefreshCw size={13} />
                                                        </Button>

                                                        <Button
                                                            type="button"
                                                            onClick={(e) => handleDeleteCampaign(camp.id, e)}
                                                            className="h-10 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-[10px]"
                                                            title="Delete broadcast record"
                                                        >
                                                            <Trash2 size={13} />
                                                        </Button>
                                                    </div>

                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>
                    </motion.div>
                )}


                {/* ========================================================= */}
                {/* 2. COMPOSER & STUDIO VIEW                                 */}
                {/* ========================================================= */}
                {activeTab === 'composer' && (
                    <motion.div 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
                    >
                        {/* Left Column - Mail Creation Form */}
                        <div className="lg:col-span-7 space-y-6">
                            
                            {/* Preset Templates Header Bar */}
                            <div className="bg-gray-100 dark:bg-zinc-900/60 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-3xl p-5 shadow-xl space-y-4">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-2xl bg-neon-pink/10 border border-neon-pink/20 text-neon-pink">
                                            <FolderOpen size={18} />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white flex items-center gap-2">
                                                Saved Templates 
                                                <span className="px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10 text-[9px] text-gray-700 dark:text-gray-300">
                                                    {emailTemplates?.length || 0}
                                                </span>
                                            </h4>
                                            <p className="text-[10px] text-gray-600 dark:text-gray-400">Load a saved layout or store your current mail draft</p>
                                        </div>
                                    </div>

                                    {/* Template Selector with Full Width and Proper Padding */}
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <Button
                                            type="button"
                                            onClick={handleNewDraft}
                                            className="h-11 px-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 border border-black/10 dark:border-white/10 rounded-2xl transition-all flex items-center justify-center shrink-0 text-[10px] font-black uppercase tracking-wider"
                                            title="Start a new blank draft"
                                        >
                                            <Plus size={14} className="mr-1" /> New Draft
                                        </Button>

                                        <div className="relative w-full sm:w-72 md:w-80">
                                            <select
                                                value={selectedTemplateId}
                                                onChange={(e) => handleLoadTemplate(e.target.value)}
                                                className="w-full h-11 pl-4 pr-10 bg-white dark:bg-black/80 border border-white/15 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white focus:outline-none focus:border-neon-pink transition-all appearance-none cursor-pointer truncate"
                                                style={{
                                                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ff4f8b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                                                    backgroundRepeat: 'no-repeat',
                                                    backgroundPosition: 'right 14px center',
                                                    backgroundSize: '14px'
                                                }}
                                            >
                                                <option value="" className="bg-gray-100 dark:bg-zinc-950 text-gray-600 dark:text-gray-400">
                                                    {emailTemplates?.length > 0 ? '-- Select Saved Template --' : 'No Saved Templates'}
                                                </option>
                                                {emailTemplates?.map(t => (
                                                    <option key={t.id} value={t.id} className="bg-gray-100 dark:bg-zinc-950 text-gray-900 dark:text-white">
                                                        {t.subject ? `[${t.category || 'OFFICIAL'}] ${t.subject}` : 'Untitled Template'}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {selectedTemplateId && (
                                            <Button
                                                type="button"
                                                onClick={(e) => handleDeleteTemplate(selectedTemplateId, e)}
                                                className="h-11 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-2xl transition-all flex items-center justify-center shrink-0"
                                                title="Delete selected template"
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Template Active Pill Notice */}
                                {selectedTemplateId && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="flex items-center justify-between p-3 rounded-2xl bg-neon-pink/10 border border-neon-pink/20 text-gray-900 dark:text-white text-[10px]"
                                    >
                                        <div className="flex items-center gap-2 font-bold truncate">
                                            <Check size={14} className="text-neon-pink shrink-0" />
                                            <span className="truncate">Loaded Template: <span className="text-neon-pink">{emailTemplates?.find(t => t.id === selectedTemplateId)?.subject}</span></span>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => setSelectedTemplateId('')}
                                            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-black uppercase text-[9px] pl-2 shrink-0"
                                        >
                                            Dismiss
                                        </button>
                                    </motion.div>
                                )}
                            </div>

                            {/* Main Editor Card */}
                            <Card className="p-6 md:p-8 bg-gray-100 dark:bg-zinc-900/50 backdrop-blur-3xl border-black/10 dark:border-white/10 rounded-[2.5rem] shadow-2xl relative overflow-hidden space-y-8">
                                <form onSubmit={handleSendEmails} className="space-y-8 relative z-10">
                                    
                                    {/* Section 1: Audience & Sender Setup */}
                                    <div className="space-y-6 pb-6 border-b border-black/10 dark:border-white/5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                <Shield size={14} className="text-neon-pink" />
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">1. Transmission & Category Settings</span>
                                            </div>

                                            <div className="flex items-center gap-1.5 text-[9px] font-mono text-emerald-400">
                                                <Zap size={11} /> Open & Click Tracking Enabled
                                            </div>
                                        </div>

                                        {/* Sender Alias */}
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest pl-1">Sender Alias</label>
                                            <select
                                                value={selectedAlias.key}
                                                onChange={(e) => {
                                                    const alias = ALIASES.find(a => a.key === e.target.value);
                                                    setSelectedAlias(alias);
                                                }}
                                                className="w-full h-13 px-4 bg-white dark:bg-black/60 border border-black/10 dark:border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:border-white/30 focus:outline-none text-gray-900 dark:text-white transition-all appearance-none cursor-pointer"
                                                style={{
                                                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                                                    backgroundRepeat: 'no-repeat',
                                                    backgroundPosition: 'right 16px center',
                                                    backgroundSize: '16px'
                                                }}
                                            >
                                                {ALIASES.map(a => (
                                                    <option key={a.key} value={a.key} className="bg-gray-100 dark:bg-zinc-950 text-gray-900 dark:text-white">
                                                        {a.key === 'custom' ? 'Custom Alias...' : `${a.name} <${a.email}>`}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <AnimatePresence>
                                            {selectedAlias.key === 'custom' && (
                                                <motion.div 
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-hidden pt-2"
                                                >
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest pl-1">Custom Name</label>
                                                        <Input 
                                                            value={customName}
                                                            onChange={(e) => setCustomName(e.target.value)}
                                                            placeholder="e.g. Newbi Events"
                                                            className="h-12 bg-white dark:bg-black/60 border-black/10 dark:border-white/10 rounded-2xl text-[11px] font-bold tracking-wider focus:border-white/30"
                                                            required={selectedAlias.key === 'custom'}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest pl-1">Custom Email</label>
                                                        <Input 
                                                            value={customEmail}
                                                            onChange={(e) => setCustomEmail(e.target.value)}
                                                            placeholder="e.g. events@newbi.live"
                                                            className="h-12 bg-white dark:bg-black/60 border-black/10 dark:border-white/10 rounded-2xl text-[11px] font-bold tracking-wider focus:border-white/30"
                                                            required={selectedAlias.key === 'custom'}
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                                            {/* Communication Category */}
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest pl-1 flex items-center justify-between">
                                                    <span>Communication Type</span>
                                                    {mailData.category === 'CUSTOM' && <span className="text-neon-pink">Custom Active</span>}
                                                </label>
                                                <div className="flex flex-wrap gap-2">
                                                    {PRESET_CATEGORIES.map(cat => (
                                                        <button
                                                            key={cat}
                                                            type="button"
                                                            onClick={() => setMailData({...mailData, category: cat})}
                                                            className={cn(
                                                                "px-3.5 py-2.5 rounded-xl border transition-all text-[9px] font-black uppercase tracking-wider shrink-0",
                                                                mailData.category === cat 
                                                                    ? "bg-white text-black border-white shadow-lg shadow-white/10" 
                                                                    : "bg-white dark:bg-black/50 text-gray-600 dark:text-gray-400 border-black/10 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 hover:text-gray-900 dark:hover:text-white"
                                                            )}
                                                        >
                                                            {cat}
                                                        </button>
                                                    ))}
                                                </div>
                                                {mailData.category === 'CUSTOM' && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -5 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="pt-2"
                                                    >
                                                        <Input 
                                                            value={mailData.customCategory}
                                                            onChange={(e) => setMailData({...mailData, customCategory: e.target.value.toUpperCase()})}
                                                            placeholder="TYPE CUSTOM CATEGORY (e.g. EXCLUSIVE)..."
                                                            className="h-12 bg-white dark:bg-black/60 border-neon-pink/30 rounded-2xl text-[10px] font-black tracking-widest text-gray-900 dark:text-white uppercase focus:border-neon-pink"
                                                        />
                                                    </motion.div>
                                                )}
                                            </div>

                                            {/* Theme Selector */}
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest pl-1">Visual Theme</label>
                                                <div className="flex gap-2 h-12 bg-white dark:bg-black/60 p-1.5 rounded-2xl border border-black/10 dark:border-white/10">
                                                    <button
                                                        type="button"
                                                        onClick={() => setMailData({...mailData, theme: 'light'})}
                                                        className={cn(
                                                            "flex-1 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                                            mailData.theme === 'light' ? "bg-white text-black shadow-md" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                                        )}
                                                    >
                                                        Light Mode
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setMailData({...mailData, theme: 'dark'})}
                                                        className={cn(
                                                            "flex-1 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                                            mailData.theme === 'dark' ? "bg-zinc-800 text-gray-900 dark:text-white shadow-md" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                                        )}
                                                    >
                                                        Dark Mode
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 2: Individual Recipient Picker (if Individual mode active) */}
                                    {recipientType === 'individuals' && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="space-y-4 p-5 bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-3xl"
                                        >
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black text-neon-pink uppercase tracking-widest flex items-center gap-2">
                                                    <UserPlus size={14} /> Individual Recipient Manager
                                                </label>
                                                <span className="text-[10px] text-gray-600 dark:text-gray-400 font-bold">{selectedIndividuals.length} Selected</span>
                                            </div>

                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 w-4 h-4" />
                                                    <Input 
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                handleAddCustomEmail();
                                                            }
                                                        }}
                                                        placeholder="Search registered user or type new email..."
                                                        className="w-full h-12 pl-12 bg-white dark:bg-black/60 border-black/10 dark:border-white/10 rounded-2xl text-[11px] font-bold tracking-wider focus:border-white/30 text-gray-900 dark:text-white"
                                                    />
                                                </div>
                                                {searchQuery.includes('@') && (
                                                    <Button
                                                        type="button"
                                                        onClick={() => handleAddCustomEmail()}
                                                        className="h-12 px-4 bg-neon-pink text-black text-[10px] font-black uppercase tracking-wider rounded-2xl hover:scale-105 transition-all shrink-0 flex items-center gap-2"
                                                    >
                                                        <Plus size={14} /> Add Email
                                                    </Button>
                                                )}
                                            </div>

                                            {/* Registered Users Search Autocomplete Dropdown */}
                                            {searchQuery.length > 0 && (
                                                <div className="max-h-48 overflow-y-auto bg-gray-100 dark:bg-zinc-950/90 border border-white/15 rounded-2xl p-2 space-y-1 no-scrollbar shadow-2xl">
                                                    {searchQuery.includes('@') && !selectedIndividuals.some(s => s.email?.toLowerCase() === searchQuery.trim().toLowerCase()) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAddCustomEmail(searchQuery)}
                                                            className="w-full flex items-center justify-between p-3 rounded-xl bg-neon-pink/10 hover:bg-neon-pink/20 border border-neon-pink/20 transition-all text-left group"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Plus size={14} className="text-neon-pink" />
                                                                <span className="text-xs font-bold text-gray-900 dark:text-white">Add custom email: <span className="text-neon-pink">{searchQuery.trim()}</span></span>
                                                            </div>
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-neon-pink">Add +</span>
                                                        </button>
                                                    )}

                                                    {allKnownUsers.filter(u => 
                                                        (u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                                         u.email?.toLowerCase().includes(searchQuery.toLowerCase())) &&
                                                        !selectedIndividuals.find(s => s.email?.toLowerCase() === u.email?.toLowerCase())
                                                    ).slice(0, 15).map(user => (
                                                        <button
                                                            key={user.email}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedIndividuals([...selectedIndividuals, user]);
                                                                setSearchQuery('');
                                                            }}
                                                            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-left"
                                                        >
                                                            <div>
                                                                <div className="text-gray-900 dark:text-white text-xs font-bold">{user.name || 'Registered User'}</div>
                                                                <div className="text-gray-600 dark:text-gray-400 text-[11px]">{user.email}</div>
                                                            </div>
                                                            <div className="text-[9px] font-black uppercase tracking-widest text-neon-pink">Add +</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Selected Recipient Pills */}
                                            {selectedIndividuals.length > 0 && (
                                                <div className="flex flex-wrap gap-2 pt-1 max-h-36 overflow-y-auto no-scrollbar">
                                                    {selectedIndividuals.map(user => (
                                                        <div key={user.email} className="flex items-center gap-2 bg-black/10 dark:bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 transition-all">
                                                            <div className="text-[11px] font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                                                {user.isCustom && <span className="w-1.5 h-1.5 rounded-full bg-neon-pink" />}
                                                                {user.name && user.name !== user.email ? `${user.name} (${user.email})` : user.email}
                                                            </div>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => setSelectedIndividuals(selectedIndividuals.filter(u => u.email !== user.email))}
                                                                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-0.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedIndividuals([])}
                                                        className="text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-red-400 px-2 py-1.5 transition-colors"
                                                    >
                                                        Clear All
                                                    </button>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}

                                    {/* Section 3: Email Content */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                            <FileText size={14} className="text-neon-pink" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">2. Email Content & Design</span>
                                        </div>

                                        {/* Subject Line */}
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest pl-1">Subject Line</label>
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-1">
                                                        <Tag size={10} className="text-neon-pink" /> Insert Tag:
                                                    </span>
                                                    {['first_name', 'name', 'email', 'role'].map(tag => (
                                                        <button
                                                            key={tag}
                                                            type="button"
                                                            onClick={() => {
                                                                setMailData(prev => ({
                                                                    ...prev,
                                                                    subject: prev.subject + ` {{${tag}}}`
                                                                }));
                                                            }}
                                                            className="px-1.5 py-0.5 text-[9px] font-mono font-bold text-neon-pink bg-neon-pink/10 border border-neon-pink/20 rounded hover:bg-neon-pink/20 transition-all cursor-pointer"
                                                            title={`Click to append {{${tag}}} to Subject Line`}
                                                        >
                                                            +&#123;&#123;{tag}&#125;&#125;
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <Input 
                                                value={mailData.subject}
                                                onChange={(e) => setMailData({...mailData, subject: e.target.value})}
                                                placeholder="OFFICIAL COMMUNICATION..."
                                                className="h-14 bg-white dark:bg-black/60 border-black/10 dark:border-white/10 rounded-2xl text-[11px] font-bold tracking-wider uppercase focus:border-white/30"
                                                required
                                            />
                                        </div>

                                        {/* Primary Header */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest pl-1">Primary Banner Header</label>
                                            <Input 
                                                value={mailData.headerText}
                                                onChange={(e) => setMailData({...mailData, headerText: e.target.value})}
                                                placeholder="NEWBI ANNOUNCEMENT"
                                                className="h-14 bg-white dark:bg-black/60 border-black/10 dark:border-white/10 rounded-2xl text-[11px] font-bold tracking-wider uppercase focus:border-white/30"
                                                required
                                            />
                                        </div>

                                        {/* Rich Message Editor */}
                                        <div className="space-y-2">
                                            <StudioRichEditor 
                                                label="Message Body Content"
                                                value={mailData.messageBody}
                                                onChange={(val) => setMailData({...mailData, messageBody: val})}
                                                placeholder="Type your official broadcast message here..."
                                                minHeight="280px"
                                                accentColor="white"
                                                tags={['first_name', 'name', 'email', 'role']}
                                            />
                                        </div>

                                        {/* CTA Button Inputs */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest pl-1">Call-to-Action Button Text (Optional)</label>
                                                <Input 
                                                    value={mailData.ctaText}
                                                    onChange={(e) => setMailData({...mailData, ctaText: e.target.value})}
                                                    placeholder="e.g. VIEW DETAILS"
                                                    className="h-12 bg-white dark:bg-black/60 border-black/10 dark:border-white/10 rounded-2xl text-[11px] font-bold tracking-wider uppercase"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest pl-1">Action URL</label>
                                                <Input 
                                                    value={mailData.ctaUrl}
                                                    onChange={(e) => setMailData({...mailData, ctaUrl: e.target.value})}
                                                    placeholder="https://newbi.live"
                                                    className="h-12 bg-white dark:bg-black/60 border-black/10 dark:border-white/10 rounded-2xl text-[11px] font-bold tracking-wider"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status Alert Banner */}
                                    {status && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={cn(
                                                "p-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-lg",
                                                status.type === 'success' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : 
                                                status.type === 'error' ? "bg-red-500/10 border-red-500/30 text-red-400" :
                                                "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-gray-700 dark:text-gray-300"
                                            )}
                                        >
                                            <Zap size={14} className="shrink-0" /> {status.text}
                                        </motion.div>
                                    )}

                                    {/* Action Buttons Footer Bar */}
                                    <div className="pt-4 border-t border-black/10 dark:border-white/5 space-y-4">
                                        <div className="flex flex-col sm:flex-row items-stretch gap-4">
                                            <Button 
                                                type="submit" 
                                                disabled={sending || recipients.length === 0}
                                                className="flex-1 h-16 bg-neon-pink text-black font-black font-heading text-xs uppercase tracking-[0.2em] rounded-2xl shadow-[0_10px_30px_rgba(255,79,139,0.3)] hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
                                            >
                                                {sending ? (
                                                    <>
                                                        <LoadingSpinner size="xs" color="black" />
                                                        BROADCASTING WITH TRACKING...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Send size={18} /> EXECUTE OFFICIAL BROADCAST ({recipients.length})
                                                    </>
                                                )}
                                            </Button>

                                            {selectedTemplateId ? (
                                                <>
                                                    <Button
                                                        type="button"
                                                        onClick={() => handleSaveTemplate(false)}
                                                        disabled={savingTemplate || !mailData.subject}
                                                        className="h-16 px-6 bg-zinc-800 hover:bg-zinc-700 text-gray-900 dark:text-white font-black text-xs uppercase tracking-widest border border-black/10 dark:border-white/10 rounded-2xl transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 shrink-0"
                                                    >
                                                        {savingTemplate ? <LoadingSpinner size="xs" color="white" /> : <Save size={16} />}
                                                        <span>Update Template</span>
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        onClick={() => handleSaveTemplate(true)}
                                                        disabled={savingTemplate || !mailData.subject}
                                                        className="h-16 px-6 bg-gray-100 dark:bg-zinc-900/60 hover:bg-zinc-800 text-gray-700 dark:text-gray-300 font-black text-xs uppercase tracking-widest border border-black/10 dark:border-white/5 rounded-2xl transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 shrink-0"
                                                    >
                                                        {savingTemplate ? <LoadingSpinner size="xs" color="white" /> : <Plus size={16} />}
                                                        <span>Save as New</span>
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    onClick={() => handleSaveTemplate(false)}
                                                    disabled={savingTemplate || !mailData.subject}
                                                    className="h-16 px-6 bg-zinc-800 hover:bg-zinc-700 text-gray-900 dark:text-white font-black text-xs uppercase tracking-widest border border-black/10 dark:border-white/10 rounded-2xl transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 shrink-0"
                                                >
                                                    {savingTemplate ? <LoadingSpinner size="xs" color="white" /> : <Save size={16} />}
                                                    <span>Save Template</span>
                                                </Button>
                                            )}
                                        </div>

                                        <p className="text-center text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                                            Sender: <span className="text-gray-900 dark:text-white">{selectedAlias.key === 'custom' ? `${customName || 'Custom'} <${customEmail || 'No email'}>` : `${selectedAlias.name} <${selectedAlias.email}>`}</span>
                                        </p>
                                    </div>
                                </form>
                            </Card>
                        </div>

                        {/* Right Column - Live Preview */}
                        <div className="lg:col-span-5 sticky top-28 space-y-4">
                            <div className="flex flex-col gap-1 px-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Sparkles size={14} className="text-neon-pink" />
                                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-900 dark:text-white">Live Email Preview</h3>
                                    </div>
                                    
                                    <div className="flex bg-white dark:bg-black/60 p-1 rounded-xl border border-black/10 dark:border-white/10">
                                        <button 
                                            onClick={() => setViewMode('desktop')}
                                            className={cn("p-2 rounded-lg transition-all", viewMode === 'desktop' ? "bg-white text-black shadow-md" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white")}
                                            title="Desktop View"
                                        >
                                            <Monitor size={14} />
                                        </button>
                                        <button 
                                            onClick={() => setViewMode('mobile')}
                                            className={cn("p-2 rounded-lg transition-all", viewMode === 'mobile' ? "bg-white text-black shadow-md" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white")}
                                            title="Mobile View"
                                        >
                                            <Smartphone size={14} />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-[9px] font-mono text-neon-pink/80 tracking-wider">
                                    Previewing for: <span className="text-gray-900 dark:text-white font-bold">{sampleRecipient.name} ({sampleRecipient.email})</span>
                                </p>
                            </div>

                            {/* Outer Device Frame */}
                            <div className={cn(
                                "mx-auto transition-all duration-300 rounded-[2.5rem] overflow-hidden border border-white/15 shadow-2xl bg-gray-100 dark:bg-zinc-950 p-2",
                                viewMode === 'mobile' ? "max-w-[360px]" : "w-full"
                            )}>
                                <div className="bg-white dark:bg-black/90 rounded-[2rem] overflow-hidden border border-black/10 dark:border-white/5">
                                    {/* Simulated email window bar */}
                                    <div className="h-9 bg-gray-100 dark:bg-zinc-900/80 px-4 flex items-center justify-between border-b border-black/10 dark:border-white/5">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                                            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                                        </div>
                                        <span className="text-[9px] font-mono text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                                            {(mailData.subject || 'Subject Preview')
                                                .replace(/\{\{?\s*name\s*\}?\}/gi, sampleRecipient.name)
                                                .replace(/\{\{?\s*first_name\s*\}?\}/gi, sampleRecipient.firstName)
                                                .replace(/\{\{?\s*email\s*\}?\}/gi, sampleRecipient.email)
                                                .replace(/\{\{?\s*role\s*\}?\}/gi, sampleRecipient.role)
                                            }
                                        </span>
                                        <div className="w-8" />
                                    </div>

                                    {/* Preview Frame Container */}
                                    <div className="h-[620px] overflow-y-auto scrollbar-hide p-1">
                                        <div dangerouslySetInnerHTML={{ __html: generateOfficialHTML(previewMailData) }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

            </div>

            {/* ========================================================= */}
            {/* 3. CAMPAIGN DRILLDOWN MODAL                                */}
            {/* ========================================================= */}
            {createPortal(
                <AnimatePresence>
                    {selectedCampaign && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-zinc-950 border border-black/15 dark:border-white/15 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="p-6 md:p-8 border-b border-black/10 dark:border-white/10 flex items-start justify-between gap-4 bg-gray-50/50 dark:bg-zinc-900/30">
                                <div className="space-y-2 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="px-2.5 py-1 rounded-lg bg-neon-pink/10 border border-neon-pink/20 text-neon-pink text-[9px] font-black uppercase tracking-widest">
                                            {selectedCampaign.category || 'OFFICIAL'}
                                        </span>
                                        <span className="text-[10px] font-mono text-gray-500">
                                            ID: {selectedCampaign.id}
                                        </span>
                                        <span className="text-[10px] font-mono text-gray-500 flex items-center gap-1">
                                            <Clock size={11} /> {new Date(selectedCampaign.sentAt || 0).toLocaleString()}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-black font-heading text-gray-900 dark:text-white uppercase tracking-wider">
                                        {selectedCampaign.subject}
                                    </h3>
                                </div>

                                <button
                                    onClick={() => setSelectedCampaign(null)}
                                    className="p-2 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all shrink-0"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Modal KPI Mini Bar */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 border-b border-black/10 dark:border-white/10 bg-gray-100/50 dark:bg-zinc-900/10">
                                <div className="p-3 rounded-2xl bg-white dark:bg-black/40 border border-black/10 dark:border-white/5">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Delivered</span>
                                    <div className="text-xl font-black font-heading text-gray-900 dark:text-white">
                                        {selectedCampaign.totalRecipients || selectedCampaign.sentCount || 0}
                                    </div>
                                </div>
                                <div className="p-3 rounded-2xl bg-white dark:bg-black/40 border border-black/10 dark:border-white/5">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Unique Opens</span>
                                    <div className="text-xl font-black font-heading text-emerald-400">
                                        {selectedCampaign.uniqueOpens || (Array.isArray(selectedCampaign.openedEmails) ? selectedCampaign.openedEmails.length : 0)}
                                    </div>
                                </div>
                                <div className="p-3 rounded-2xl bg-white dark:bg-black/40 border border-black/10 dark:border-white/5">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Total Opens</span>
                                    <div className="text-xl font-black font-heading text-emerald-400">
                                        {selectedCampaign.opensCount || 0}
                                    </div>
                                </div>
                                <div className="p-3 rounded-2xl bg-white dark:bg-black/40 border border-black/10 dark:border-white/5">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Link Clicks</span>
                                    <div className="text-xl font-black font-heading text-cyan-400">
                                        {selectedCampaign.clicksCount || 0} ({selectedCampaign.uniqueClicks || 0} unique)
                                    </div>
                                </div>
                            </div>

                            {/* Detail Sub-Tabs */}
                            <div className="px-6 pt-4 border-b border-black/10 dark:border-white/5 flex gap-2">
                                {[
                                    { id: 'recipients', label: `Opened By (${Array.isArray(selectedCampaign.openedEmails) ? selectedCampaign.openedEmails.length : 0})`, icon: Eye },
                                    { id: 'links', label: `Clicked Links (${Array.isArray(selectedCampaign.clickedUrls) ? selectedCampaign.clickedUrls.length : 0})`, icon: LinkIcon },
                                    { id: 'preview', label: 'Message Preview', icon: FileText }
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setModalDetailTab(t.id)}
                                        className={cn(
                                            "pb-3 px-4 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all",
                                            modalDetailTab === t.id 
                                                ? "border-neon-pink text-neon-pink" 
                                                : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                        )}
                                    >
                                        <t.icon size={13} />
                                        <span>{t.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Modal Tab Body */}
                            <div className="p-6 overflow-y-auto flex-1 max-h-[420px]">
                                {modalDetailTab === 'recipients' && (
                                    <div className="space-y-3">
                                        {(!selectedCampaign.openedEmails || selectedCampaign.openedEmails.length === 0) ? (
                                            <div className="text-center py-12 text-gray-500 text-xs">
                                                No opens tracked for this broadcast yet. Tracking pixels will register opens as recipients view their inboxes.
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-black/5 dark:divide-white/5">
                                                {selectedCampaign.openedEmails.map((email, i) => (
                                                    <div key={i} className="py-3 flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                                            <span className="font-mono font-bold text-gray-900 dark:text-white">{email}</span>
                                                        </div>
                                                        <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">
                                                            Verified Open
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {modalDetailTab === 'links' && (
                                    <div className="space-y-3">
                                        {(!selectedCampaign.clickedUrls || selectedCampaign.clickedUrls.length === 0) ? (
                                            <div className="text-center py-12 text-gray-500 text-xs">
                                                No outbound link clicks recorded yet. Hyperlinks wrapped with redirect trackers will appear here in real-time.
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-black/5 dark:divide-white/5">
                                                {selectedCampaign.clickedUrls.map((url, i) => (
                                                    <div key={i} className="py-3 flex items-center justify-between gap-4 text-xs">
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <ExternalLink size={14} className="text-cyan-400 shrink-0" />
                                                            <a 
                                                                href={url} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer" 
                                                                className="font-mono text-cyan-400 hover:underline truncate"
                                                            >
                                                                {url}
                                                            </a>
                                                        </div>
                                                        <span className="text-[10px] font-mono text-gray-500 shrink-0">
                                                            Active Link
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {modalDetailTab === 'preview' && (
                                    <div className="bg-white dark:bg-black/90 p-4 rounded-2xl border border-black/10 dark:border-white/10">
                                        <div dangerouslySetInnerHTML={{ 
                                            __html: generateOfficialHTML({
                                                headerText: selectedCampaign.headerText || selectedCampaign.subject,
                                                messageBody: selectedCampaign.messageBody || '<p>Content transmitted via broadcast</p>',
                                                category: selectedCampaign.category || 'OFFICIAL',
                                                ctaText: selectedCampaign.ctaText,
                                                ctaUrl: selectedCampaign.ctaUrl,
                                                theme: selectedCampaign.theme || 'light',
                                                isPreview: true
                                            }) 
                                        }} />
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-black/10 dark:border-white/10 flex items-center justify-between bg-gray-50/50 dark:bg-zinc-900/30">
                                <Button
                                    type="button"
                                    onClick={() => handleLoadCampaignToComposer(selectedCampaign)}
                                    className="h-11 px-5 bg-neon-pink text-black font-black uppercase text-[10px] tracking-wider rounded-2xl hover:scale-105 transition-all flex items-center gap-2"
                                >
                                    <RefreshCw size={13} /> Load into Composer
                                </Button>

                                <Button
                                    type="button"
                                    onClick={() => setSelectedCampaign(null)}
                                    className="h-11 px-5 bg-black/5 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-2xl text-[10px] font-bold"
                                >
                                    Close
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>,
            document.body
        )}
        </AdminCommunityHubLayout>
    );
};

export default MailingManager;
