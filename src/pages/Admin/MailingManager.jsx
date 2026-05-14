import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LayoutGrid, Send, Sparkles, Mail, Users, Monitor, Smartphone, Image as ImageIcon, ExternalLink, X, Upload, Loader, Link as LinkIcon, Shield, Zap } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import AdminDashboardLink from '../../components/admin/AdminDashboardLink';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import MailPreview from '../../components/admin/MailPreview';
import StudioRichEditor from '../../components/ui/StudioRichEditor';
import { notifyAllUsers } from '../../lib/notificationTriggers';
import { sendMassEmail, generateOfficialHTML } from '../../lib/email';

const MailingManager = () => {
    const { subscribers, allUsers, admins, addToast } = useStore();
    const [searchParams] = useSearchParams();
    
    // Mail Maker State
    const [mailData, setMailData] = useState({
        subject: searchParams.get('subject') || '',
        headerText: searchParams.get('header') || '',
        messageBody: searchParams.get('body') || '',
        ctaText: searchParams.get('ctaText') || '',
        ctaUrl: searchParams.get('ctaUrl') || '',
        category: 'OFFICIAL',
        theme: 'light'
    });

    const [recipientType, setRecipientType] = useState('subscribers'); 
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState(null); 
    const [viewMode, setViewMode] = useState('desktop');

    const recipients = useMemo(() => {
        if (recipientType === 'subscribers') return subscribers;
        if (recipientType === 'registered') return allUsers;
        if (recipientType === 'admins') return admins;
        
        const merged = [...subscribers, ...allUsers, ...admins];
        const unique = Array.from(new Set(merged.map(r => r.email?.toLowerCase())))
            .map(email => merged.find(r => r.email?.toLowerCase() === email));
        return unique;
    }, [recipientType, subscribers, allUsers, admins]);

    const handleSendEmails = async (e) => {
        if (e) e.preventDefault();
        if (recipients.length === 0) {
            addToast("No recipients found.", 'error');
            return;
        }

        if (!window.confirm(`Send official email to ${recipients.length} recipients?`)) return;

        setSending(true);
        setStatus({ type: 'info', text: 'Executing official broadcast...' });

        try {
            // Generate official HTML content
            const htmlContent = generateOfficialHTML(mailData);

            // Send via our API using the official account
            const bccList = recipients.map(r => r.email).filter(Boolean);
            const mailResult = await sendMassEmail(bccList, mailData.subject, htmlContent, 'official');

            if (!mailResult.success) {
                throw new Error(mailResult.error || "Failed to broadcast");
            }

            setStatus({ type: 'success', text: `Broadcast complete. ${recipients.length} emails delivered.` });
        } catch (error) {
            console.error("Send failed:", error);
            setStatus({ type: 'error', text: 'Broadcast failed. Check API configuration.' });
        } finally {
            setSending(false);
            setTimeout(() => setStatus(null), 5000);
        }
    };

    return (
        <AdminCommunityHubLayout 
            hideTabs={true}
            studioHeader={{
                title: "OFFICIAL",
                subtitle: "COMMUNICATIONS",
                accentClass: "text-white"
            }}
            action={(
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 bg-zinc-900/40 backdrop-blur-3xl border border-white/5 p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] w-full md:w-auto overflow-hidden">
                    <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
                        {[
                            { id: 'subscribers', label: 'Subscribers' },
                            { id: 'registered', label: 'Users' },
                            { id: 'admins', label: 'Admins' },
                            { id: 'all', label: 'Global' }
                        ].map(type => (
                            <button
                                key={type.id}
                                type="button"
                                onClick={() => setRecipientType(type.id)}
                                className={cn(
                                    "px-4 md:px-6 py-2 md:py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0",
                                    recipientType === type.id ? "bg-white text-black" : "text-gray-500 hover:text-white"
                                )}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>
                    <div className="hidden sm:block w-px h-10 bg-white/10 shrink-0" />
                    <div className="hidden sm:flex items-center gap-4 shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white">
                            <Users size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black font-heading text-white leading-none">{recipients.length}</h3>
                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-1">Recipients</p>
                        </div>
                    </div>
                </div>
            )}
        >
            <div className="relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-6">
                        <Card className="p-8 md:p-10 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[3rem] relative overflow-hidden">
                            <form onSubmit={handleSendEmails} className="space-y-10 relative z-10">
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    {/* Template Category Selector */}
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Communication Type</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {['OFFICIAL', 'UPDATES', 'NEWS', 'OTHER'].map(cat => (
                                                <button
                                                    key={cat}
                                                    type="button"
                                                    onClick={() => setMailData({...mailData, category: cat})}
                                                    className={cn(
                                                        "h-14 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest",
                                                        mailData.category === cat 
                                                            ? "bg-white text-black border-white shadow-[0_10px_20px_rgba(255,255,255,0.1)]" 
                                                            : "bg-black/40 text-gray-500 border-white/5 hover:border-white/10"
                                                    )}
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Theme Selector */}
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Visual Theme</label>
                                        <div className="flex gap-3 h-14 bg-black/40 p-1.5 rounded-2xl border border-white/5">
                                            <button
                                                type="button"
                                                onClick={() => setMailData({...mailData, theme: 'light'})}
                                                className={cn(
                                                    "flex-1 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                                    mailData.theme === 'light' ? "bg-white text-black shadow-lg" : "text-gray-500 hover:text-white"
                                                )}
                                            >
                                                Light Mode
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setMailData({...mailData, theme: 'dark'})}
                                                className={cn(
                                                    "flex-1 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                                    mailData.theme === 'dark' ? "bg-zinc-800 text-white shadow-lg" : "text-gray-500 hover:text-white"
                                                )}
                                            >
                                                Dark Mode
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                                            <Shield size={12} className="text-white" /> Subject Line
                                        </label>
                                        <Input 
                                            value={mailData.subject}
                                            onChange={(e) => setMailData({...mailData, subject: e.target.value})}
                                            placeholder="OFFICIAL COMMUNICATION..."
                                            className="h-16 bg-black/50 border-white/5 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:border-white/20"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Primary Header</label>
                                        <Input 
                                            value={mailData.headerText}
                                            onChange={(e) => setMailData({...mailData, headerText: e.target.value})}
                                            placeholder="NEWBI ANNOUNCEMENT"
                                            className="h-16 bg-black/50 border-white/5 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:border-white/20"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <StudioRichEditor 
                                            label="Formal Message"
                                            value={mailData.messageBody}
                                            onChange={(val) => setMailData({...mailData, messageBody: val})}
                                            placeholder="Type your official message here..."
                                            minHeight="300px"
                                            accentColor="white"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Button Text (Optional)</label>
                                            <Input 
                                                value={mailData.ctaText}
                                                onChange={(e) => setMailData({...mailData, ctaText: e.target.value})}
                                                placeholder="LEARN MORE"
                                                className="h-14 bg-black/50 border-white/5 rounded-2xl text-[11px] font-black uppercase tracking-widest"
                                            />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Action URL</label>
                                            <Input 
                                                value={mailData.ctaUrl}
                                                onChange={(e) => setMailData({...mailData, ctaUrl: e.target.value})}
                                                placeholder="https://newbi.live"
                                                className="h-14 bg-black/50 border-white/5 rounded-2xl text-[11px] font-black uppercase tracking-widest"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {status && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={cn(
                                            "p-5 rounded-2xl border text-[10px] font-black uppercase tracking-widest flex items-center gap-3",
                                            status.type === 'success' ? "bg-white/10 border-white/20 text-white" : 
                                            status.type === 'error' ? "bg-red-500/10 border-red-500/20 text-red-500" :
                                            "bg-white/5 border-white/10 text-gray-400"
                                        )}
                                    >
                                        <Zap size={14} /> {status.text}
                                    </motion.div>
                                )}

                                <div className="pt-4">
                                    <Button 
                                        type="submit" 
                                        disabled={sending || recipients.length === 0}
                                        className="w-full h-20 bg-neon-green text-black font-black font-heading uppercase tracking-[0.2em] rounded-[2rem] shadow-[0_20px_60px_rgba(57,255,20,0.1)] hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-4"
                                    >
                                        {sending ? (
                                            <>
                                                <LoadingSpinner size="xs" color="black" />
                                                BROADCASTING...
                                            </>
                                        ) : (
                                            <>
                                                <Send size={20} /> EXECUTE OFFICIAL BROADCAST
                                            </>
                                        )}
                                    </Button>
                                    <p className="text-center text-[8px] font-black text-gray-700 uppercase tracking-[0.3em] mt-6">
                                        Secure Transmission via partnership@newbi.live
                                    </p>
                                </div>
                            </form>
                        </Card>
                    </div>

                    <div className="lg:col-span-6">
                        <div className="sticky top-32">
                            <div className="flex items-center justify-between mb-8 px-4">
                                <h3 className="text-sm font-black uppercase tracking-[0.4em] text-white/40">Transmission Preview</h3>
                                <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/5">
                                    <button 
                                        onClick={() => setViewMode('desktop')}
                                        className={cn("p-2 rounded-lg transition-all", viewMode === 'desktop' ? "bg-white text-black" : "text-gray-500")}
                                    >
                                        <Monitor size={14} />
                                    </button>
                                    <button 
                                        onClick={() => setViewMode('mobile')}
                                        className={cn("p-2 rounded-lg transition-all", viewMode === 'mobile' ? "bg-white text-black" : "text-gray-500")}
                                    >
                                        <Smartphone size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className={cn(
                                "mx-auto transition-all duration-500 rounded-[3rem] overflow-hidden border border-white/5 shadow-2xl",
                                viewMode === 'mobile' ? "max-w-[375px]" : "w-full",
                                mailData.theme === 'dark' ? "bg-black" : "bg-white"
                            )}>
                                <div className={cn(
                                    "h-[600px] overflow-y-auto scrollbar-hide",
                                    mailData.theme === 'dark' ? "bg-black" : "bg-[#fcfcfc]"
                                )}>
                                    <div dangerouslySetInnerHTML={{ __html: generateOfficialHTML(mailData) }} />
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

