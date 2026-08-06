import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
    LayoutGrid, Send, Sparkles, Mail, Users, Monitor, Smartphone, 
    Image as ImageIcon, ExternalLink, X, Upload, Loader, Link as LinkIcon, 
    Shield, Zap, Save, Search, Plus, FolderOpen, Tag, Check, Trash2, UserPlus, FileText, RefreshCw
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
    useStoreSubscription(['subscribers', 'allUsers', 'admins', 'creators', 'artists', 'emailTemplates']);
    const { subscribers, allUsers, admins, creators, artists, emailTemplates, addToast, saveEmailTemplate, deleteEmailTemplate } = useStore();
    const [searchParams] = useSearchParams();
    
    // Mail Maker State
    const [mailData, setMailData] = useState({
        subject: searchParams.get('subject') || '',
        headerText: searchParams.get('header') || '',
        messageBody: searchParams.get('body') || '',
        ctaText: searchParams.get('ctaText') || '',
        ctaUrl: searchParams.get('ctaUrl') || '',
        category: 'OFFICIAL',
        customCategory: '',
        theme: 'light'
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

    const handleSaveTemplate = async () => {
        if (!mailData.subject) {
            addToast("Please enter a subject line before saving as a template", 'error');
            return;
        }
        setSavingTemplate(true);
        try {
            await saveEmailTemplate({
                subject: mailData.subject || '',
                headerText: mailData.headerText || '',
                messageBody: mailData.messageBody || '',
                ctaText: mailData.ctaText || '',
                ctaUrl: mailData.ctaUrl || '',
                category: mailData.category === 'CUSTOM' ? (mailData.customCategory || 'OFFICIAL') : mailData.category,
                customCategory: mailData.customCategory || '',
                theme: mailData.theme || 'light'
            });
            addToast("Template saved successfully!", "success");
        } catch (error) {
            console.error("Save template failed:", error);
            addToast("Failed to save template", 'error');
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
        setStatus({ type: 'info', text: 'Executing official broadcast...' });

        try {
            const finalMailData = {
                ...mailData,
                category: effectiveCategory
            };

            const htmlContent = generateOfficialHTML(finalMailData);
            const bccList = recipients.map(r => r.email).filter(Boolean);
            
            const fromName = selectedAlias.key === 'custom' ? customName : selectedAlias.name;
            const fromEmail = selectedAlias.key === 'custom' ? customEmail : selectedAlias.email;

            const mailResult = await sendMassEmail(bccList, mailData.subject, htmlContent, 'official', null, fromName, fromEmail);

            if (!mailResult.success) {
                throw new Error(mailResult.error || "Failed to broadcast");
            }

            setStatus({ type: 'success', text: `Broadcast complete. Delivered to ${recipients.length} address(es).` });
        } catch (error) {
            console.error("Send failed:", error);
            setStatus({ type: 'error', text: 'Broadcast failed. Check API configuration.' });
        } finally {
            setSending(false);
            setTimeout(() => setStatus(null), 6000);
        }
    };

    const effectiveCategory = mailData.category === 'CUSTOM' 
        ? (mailData.customCategory || 'OFFICIAL') 
        : mailData.category;

    const previewMailData = useMemo(() => ({
        ...mailData,
        category: effectiveCategory
    }), [mailData, effectiveCategory]);

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
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 bg-zinc-900/60 backdrop-blur-3xl border border-white/10 p-4 md:p-5 rounded-[2rem] md:rounded-[2.5rem] w-full md:w-auto shadow-2xl">
                    <div className="flex bg-black/60 p-1.5 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar max-w-full">
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
                                    "px-4 md:px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 flex items-center gap-2",
                                    recipientType === type.id 
                                        ? "bg-white text-black shadow-lg shadow-white/10 scale-[1.02]" 
                                        : "text-gray-400 hover:text-white hover:bg-white/5"
                                )}
                            >
                                {type.id === 'individuals' && <UserPlus size={12} />}
                                {type.label}
                            </button>
                        ))}
                    </div>
                    <div className="hidden sm:block w-px h-8 bg-white/10 shrink-0" />
                    <div className="hidden sm:flex items-center gap-3 shrink-0 pr-2">
                        <div className="w-10 h-10 rounded-xl bg-neon-pink/10 border border-neon-pink/20 flex items-center justify-center text-neon-pink">
                            <Users size={18} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black font-heading text-white leading-none">{recipients.length}</h3>
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">Target Recipients</p>
                        </div>
                    </div>
                </div>
            )}
        >
            <div className="relative z-10 space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Left Column - Mail Creation Form */}
                    <div className="lg:col-span-7 space-y-6">
                        
                        {/* Preset Templates Header Bar */}
                        <div className="bg-zinc-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-xl space-y-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-2xl bg-neon-pink/10 border border-neon-pink/20 text-neon-pink">
                                        <FolderOpen size={18} />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                                            Saved Templates 
                                            <span className="px-2 py-0.5 rounded-full bg-white/10 text-[9px] text-gray-300">
                                                {emailTemplates?.length || 0}
                                            </span>
                                        </h4>
                                        <p className="text-[10px] text-gray-400">Load a saved layout or store your current mail draft</p>
                                    </div>
                                </div>

                                {/* Template Selector with Full Width and Proper Padding */}
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <div className="relative w-full sm:w-72 md:w-80">
                                        <select
                                            value={selectedTemplateId}
                                            onChange={(e) => handleLoadTemplate(e.target.value)}
                                            className="w-full h-11 pl-4 pr-10 bg-black/80 border border-white/15 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white focus:outline-none focus:border-neon-pink transition-all appearance-none cursor-pointer truncate"
                                            style={{
                                                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ff4f8b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                                                backgroundRepeat: 'no-repeat',
                                                backgroundPosition: 'right 14px center',
                                                backgroundSize: '14px'
                                            }}
                                        >
                                            <option value="" className="bg-zinc-950 text-gray-400">
                                                {emailTemplates?.length > 0 ? '-- Select Saved Template --' : 'No Saved Templates'}
                                            </option>
                                            {emailTemplates?.map(t => (
                                                <option key={t.id} value={t.id} className="bg-zinc-950 text-white">
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
                                    className="flex items-center justify-between p-3 rounded-2xl bg-neon-pink/10 border border-neon-pink/20 text-white text-[10px]"
                                >
                                    <div className="flex items-center gap-2 font-bold truncate">
                                        <Check size={14} className="text-neon-pink shrink-0" />
                                        <span className="truncate">Loaded Template: <span className="text-neon-pink">{emailTemplates?.find(t => t.id === selectedTemplateId)?.subject}</span></span>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setSelectedTemplateId('')}
                                        className="text-gray-400 hover:text-white font-black uppercase text-[9px] pl-2 shrink-0"
                                    >
                                        Dismiss
                                    </button>
                                </motion.div>
                            )}
                        </div>

                        {/* Main Editor Card */}
                        <Card className="p-6 md:p-8 bg-zinc-900/50 backdrop-blur-3xl border-white/10 rounded-[2.5rem] shadow-2xl relative overflow-hidden space-y-8">
                            <form onSubmit={handleSendEmails} className="space-y-8 relative z-10">
                                
                                {/* Section 1: Audience & Sender Setup */}
                                <div className="space-y-6 pb-6 border-b border-white/5">
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Shield size={14} className="text-neon-pink" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">1. Transmission & Category Settings</span>
                                    </div>

                                    {/* Sender Alias */}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Sender Alias</label>
                                        <select
                                            value={selectedAlias.key}
                                            onChange={(e) => {
                                                const alias = ALIASES.find(a => a.key === e.target.value);
                                                setSelectedAlias(alias);
                                            }}
                                            className="w-full h-13 px-4 bg-black/60 border border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:border-white/30 focus:outline-none text-white transition-all appearance-none cursor-pointer"
                                            style={{
                                                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                                                backgroundRepeat: 'no-repeat',
                                                backgroundPosition: 'right 16px center',
                                                backgroundSize: '16px'
                                            }}
                                        >
                                            {ALIASES.map(a => (
                                                <option key={a.key} value={a.key} className="bg-zinc-950 text-white">
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
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Custom Name</label>
                                                    <Input 
                                                        value={customName}
                                                        onChange={(e) => setCustomName(e.target.value)}
                                                        placeholder="e.g. Newbi Events"
                                                        className="h-12 bg-black/60 border-white/10 rounded-2xl text-[11px] font-bold tracking-wider focus:border-white/30"
                                                        required={selectedAlias.key === 'custom'}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Custom Email</label>
                                                    <Input 
                                                        value={customEmail}
                                                        onChange={(e) => setCustomEmail(e.target.value)}
                                                        placeholder="e.g. events@newbi.live"
                                                        className="h-12 bg-black/60 border-white/10 rounded-2xl text-[11px] font-bold tracking-wider focus:border-white/30"
                                                        required={selectedAlias.key === 'custom'}
                                                    />
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                                        {/* Communication Category */}
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 flex items-center justify-between">
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
                                                                : "bg-black/50 text-gray-400 border-white/5 hover:border-white/10 hover:text-white"
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
                                                        className="h-12 bg-black/60 border-neon-pink/30 rounded-2xl text-[10px] font-black tracking-widest text-white uppercase focus:border-neon-pink"
                                                    />
                                                </motion.div>
                                            )}
                                        </div>

                                        {/* Theme Selector */}
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Visual Theme</label>
                                            <div className="flex gap-2 h-12 bg-black/60 p-1.5 rounded-2xl border border-white/10">
                                                <button
                                                    type="button"
                                                    onClick={() => setMailData({...mailData, theme: 'light'})}
                                                    className={cn(
                                                        "flex-1 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                                        mailData.theme === 'light' ? "bg-white text-black shadow-md" : "text-gray-400 hover:text-white"
                                                    )}
                                                >
                                                    Light Mode
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setMailData({...mailData, theme: 'dark'})}
                                                    className={cn(
                                                        "flex-1 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                                        mailData.theme === 'dark' ? "bg-zinc-800 text-white shadow-md" : "text-gray-400 hover:text-white"
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
                                        className="space-y-4 p-5 bg-black/40 border border-white/10 rounded-3xl"
                                    >
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black text-neon-pink uppercase tracking-widest flex items-center gap-2">
                                                <UserPlus size={14} /> Individual Recipient Manager
                                            </label>
                                            <span className="text-[10px] text-gray-400 font-bold">{selectedIndividuals.length} Selected</span>
                                        </div>

                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
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
                                                    className="w-full h-12 pl-12 bg-black/60 border-white/10 rounded-2xl text-[11px] font-bold tracking-wider focus:border-white/30 text-white"
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
                                            <div className="max-h-48 overflow-y-auto bg-zinc-950/90 border border-white/15 rounded-2xl p-2 space-y-1 no-scrollbar shadow-2xl">
                                                {/* If search looks like an email and not added yet, show Add Custom Email option top */}
                                                {searchQuery.includes('@') && !selectedIndividuals.some(s => s.email?.toLowerCase() === searchQuery.trim().toLowerCase()) && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddCustomEmail(searchQuery)}
                                                        className="w-full flex items-center justify-between p-3 rounded-xl bg-neon-pink/10 hover:bg-neon-pink/20 border border-neon-pink/20 transition-all text-left group"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <Plus size={14} className="text-neon-pink" />
                                                            <span className="text-xs font-bold text-white">Add custom email: <span className="text-neon-pink">{searchQuery.trim()}</span></span>
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
                                                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/10 transition-colors text-left"
                                                    >
                                                        <div>
                                                            <div className="text-white text-xs font-bold">{user.name || 'Registered User'}</div>
                                                            <div className="text-gray-400 text-[11px]">{user.email}</div>
                                                        </div>
                                                        <div className="text-[9px] font-black uppercase tracking-widest text-neon-pink">Add +</div>
                                                    </button>
                                                ))}

                                                {allKnownUsers.filter(u => 
                                                    (u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                                     u.email?.toLowerCase().includes(searchQuery.toLowerCase())) &&
                                                    !selectedIndividuals.find(s => s.email?.toLowerCase() === u.email?.toLowerCase())
                                                ).length === 0 && !searchQuery.includes('@') && (
                                                    <div className="p-3 text-center text-gray-500 text-xs">
                                                        No matching registered users. Type a full email address (e.g. user@domain.com) to add custom email.
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Selected Recipient Pills */}
                                        {selectedIndividuals.length > 0 && (
                                            <div className="flex flex-wrap gap-2 pt-1 max-h-36 overflow-y-auto no-scrollbar">
                                                {selectedIndividuals.map(user => (
                                                    <div key={user.email} className="flex items-center gap-2 bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-xl border border-white/10 transition-all">
                                                        <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                                                            {user.isCustom && <span className="w-1.5 h-1.5 rounded-full bg-neon-pink" />}
                                                            {user.name && user.name !== user.email ? `${user.name} (${user.email})` : user.email}
                                                        </div>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setSelectedIndividuals(selectedIndividuals.filter(u => u.email !== user.email))}
                                                            className="text-gray-400 hover:text-white p-0.5 rounded-md hover:bg-white/10"
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
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <FileText size={14} className="text-neon-pink" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">2. Email Content & Design</span>
                                    </div>

                                    {/* Subject Line */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Subject Line</label>
                                        <Input 
                                            value={mailData.subject}
                                            onChange={(e) => setMailData({...mailData, subject: e.target.value})}
                                            placeholder="OFFICIAL COMMUNICATION..."
                                            className="h-14 bg-black/60 border-white/10 rounded-2xl text-[11px] font-bold tracking-wider uppercase focus:border-white/30"
                                            required
                                        />
                                    </div>

                                    {/* Primary Header */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Primary Banner Header</label>
                                        <Input 
                                            value={mailData.headerText}
                                            onChange={(e) => setMailData({...mailData, headerText: e.target.value})}
                                            placeholder="NEWBI ANNOUNCEMENT"
                                            className="h-14 bg-black/60 border-white/10 rounded-2xl text-[11px] font-bold tracking-wider uppercase focus:border-white/30"
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
                                        />
                                    </div>

                                    {/* CTA Button Inputs */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Call-to-Action Button Text (Optional)</label>
                                            <Input 
                                                value={mailData.ctaText}
                                                onChange={(e) => setMailData({...mailData, ctaText: e.target.value})}
                                                placeholder="e.g. VIEW DETAILS"
                                                className="h-12 bg-black/60 border-white/10 rounded-2xl text-[11px] font-bold tracking-wider uppercase"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Action URL</label>
                                            <Input 
                                                value={mailData.ctaUrl}
                                                onChange={(e) => setMailData({...mailData, ctaUrl: e.target.value})}
                                                placeholder="https://newbi.live"
                                                className="h-12 bg-black/60 border-white/10 rounded-2xl text-[11px] font-bold tracking-wider"
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
                                            "bg-white/5 border-white/10 text-gray-300"
                                        )}
                                    >
                                        <Zap size={14} className="shrink-0" /> {status.text}
                                    </motion.div>
                                )}

                                {/* Action Buttons Footer Bar */}
                                <div className="pt-4 border-t border-white/5 space-y-4">
                                    <div className="flex flex-col sm:flex-row items-stretch gap-4">
                                        <Button 
                                            type="submit" 
                                            disabled={sending || recipients.length === 0}
                                            className="flex-1 h-16 bg-neon-pink text-black font-black font-heading text-xs uppercase tracking-[0.2em] rounded-2xl shadow-[0_10px_30px_rgba(255,79,139,0.3)] hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
                                        >
                                            {sending ? (
                                                <>
                                                    <LoadingSpinner size="xs" color="black" />
                                                    BROADCASTING...
                                                </>
                                            ) : (
                                                <>
                                                    <Send size={18} /> EXECUTE OFFICIAL BROADCAST ({recipients.length})
                                                </>
                                            )}
                                        </Button>

                                        <Button
                                            type="button"
                                            onClick={handleSaveTemplate}
                                            disabled={savingTemplate || !mailData.subject}
                                            className="h-16 px-6 bg-zinc-800 hover:bg-zinc-700 text-white font-black text-xs uppercase tracking-widest border border-white/10 rounded-2xl transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 shrink-0"
                                        >
                                            {savingTemplate ? <LoadingSpinner size="xs" color="white" /> : <Save size={16} />}
                                            <span>Save Template</span>
                                        </Button>
                                    </div>

                                    <p className="text-center text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                                        Sender: <span className="text-white">{selectedAlias.key === 'custom' ? `${customName || 'Custom'} <${customEmail || 'No email'}>` : `${selectedAlias.name} <${selectedAlias.email}>`}</span>
                                    </p>
                                </div>
                            </form>
                        </Card>
                    </div>

                    {/* Right Column - Live Preview */}
                    <div className="lg:col-span-5 sticky top-28 space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <Sparkles size={14} className="text-neon-pink" />
                                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white">Live Email Preview</h3>
                            </div>
                            
                            <div className="flex bg-black/60 p-1 rounded-xl border border-white/10">
                                <button 
                                    onClick={() => setViewMode('desktop')}
                                    className={cn("p-2 rounded-lg transition-all", viewMode === 'desktop' ? "bg-white text-black shadow-md" : "text-gray-400 hover:text-white")}
                                    title="Desktop View"
                                >
                                    <Monitor size={14} />
                                </button>
                                <button 
                                    onClick={() => setViewMode('mobile')}
                                    className={cn("p-2 rounded-lg transition-all", viewMode === 'mobile' ? "bg-white text-black shadow-md" : "text-gray-400 hover:text-white")}
                                    title="Mobile View"
                                >
                                    <Smartphone size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Outer Device Frame */}
                        <div className={cn(
                            "mx-auto transition-all duration-300 rounded-[2.5rem] overflow-hidden border border-white/15 shadow-2xl bg-zinc-950 p-2",
                            viewMode === 'mobile' ? "max-w-[360px]" : "w-full"
                        )}>
                            <div className="bg-black/90 rounded-[2rem] overflow-hidden border border-white/5">
                                {/* Simulated email window bar */}
                                <div className="h-9 bg-zinc-900/80 px-4 flex items-center justify-between border-b border-white/5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                                        <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                                    </div>
                                    <span className="text-[9px] font-mono text-gray-500 truncate max-w-[200px]">
                                        {mailData.subject ? mailData.subject : 'Subject Preview'}
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

                </div>
            </div>
        </AdminCommunityHubLayout>
    );
};

export default MailingManager;
