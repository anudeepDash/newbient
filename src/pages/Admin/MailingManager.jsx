import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import Send from 'lucide-react/dist/esm/icons/send';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Mail from 'lucide-react/dist/esm/icons/mail';
import Users from 'lucide-react/dist/esm/icons/users';
import Monitor from 'lucide-react/dist/esm/icons/monitor';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import ImageIcon from 'lucide-react/dist/esm/icons/image';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import X from 'lucide-react/dist/esm/icons/x';
import Upload from 'lucide-react/dist/esm/icons/upload';
import Loader from 'lucide-react/dist/esm/icons/loader';
import LinkIcon from 'lucide-react/dist/esm/icons/link';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import AdminDashboardLink from '../../components/admin/AdminDashboardLink';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import MailPreview from '../../components/admin/MailPreview';
import StudioRichEditor from '../../components/ui/StudioRichEditor';
import { notifyAllUsers } from '../../lib/notificationTriggers';
import { sendMassEmail, generateMailingHTML } from '../../lib/email';
import { storage } from '../../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import WeeklyNewsletterGenerator from '../../components/admin/WeeklyNewsletterGenerator';

const MailingManager = () => {
    const { subscribers, allUsers, admins, siteDetails, uploadToCloudinary, addToast } = useStore();
    const [searchParams] = useSearchParams();
    
    // Mail Maker State
    const [mailData, setMailData] = useState({
        subject: searchParams.get('subject') || '',
        heroImage: searchParams.get('heroImage') || '',
        headerText: searchParams.get('header') || '',
        messageBody: searchParams.get('body') || '',
        ctaText: searchParams.get('ctaText') || '',
        ctaUrl: searchParams.get('ctaUrl') || '',
        accentColor: '#39FF14'
    });

    const [recipientType, setRecipientType] = useState('subscribers'); // subscribers, registered, all
    const [alsoSendingPush, setAlsoSendingPush] = useState(false);
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState(null); // { type: 'success' | 'error' | 'info', text: string }
    const [viewMode, setViewMode] = useState('desktop');
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [showWeeklyGenerator, setShowWeeklyGenerator] = useState(false);

    const handlePaste = (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let index in items) {
            const item = items[index];
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                const file = item.getAsFile();
                setSelectedFile(file);
                addToast("Hero image pasted from clipboard!", 'success');
                e.preventDefault();
            }
        }
    };

    const recipients = useMemo(() => {
        if (recipientType === 'subscribers') return subscribers;
        if (recipientType === 'registered') return allUsers;
        if (recipientType === 'admins') return admins;
        
        // Merge unique emails for Global
        const merged = [...subscribers, ...allUsers, ...admins];
        const unique = Array.from(new Set(merged.map(r => r.email?.toLowerCase())))
            .map(email => merged.find(r => r.email?.toLowerCase() === email));
        return unique;
    }, [recipientType, subscribers, allUsers, admins]);

    const handleSendEmails = async (e) => {
        if (e) e.preventDefault();
        if (recipients.length === 0) {
            useStore.getState().addToast("No recipients found. Please select an audience group first.", 'error');
            return;
        }

        const confirmMsg = alsoSendingPush 
            ? `Send email and push notification to ${recipients.length} recipients?`
            : `Send this email to ${recipients.length} recipients?`;

        if (!window.confirm(confirmMsg)) return;

        setSending(true);
        setStatus({ type: 'info', text: 'Sending your emails...' });

        try {
            let finalHeroImage = mailData.heroImage;
            if (selectedFile) {
                setStatus({ type: 'info', text: 'Uploading hero image...' });
                finalHeroImage = await uploadToCloudinary(selectedFile);
                setMailData(prev => ({ ...prev, heroImage: finalHeroImage }));
                setSelectedFile(null);
            }

            // Optional: Send Push Notification if toggled
            if (alsoSendingPush) {
                await notifyAllUsers(
                    mailData.subject || "New Message",
                    mailData.headerText || mailData.messageBody.substring(0, 50),
                    mailData.ctaUrl || "/",
                    finalHeroImage || null
                );
            }

            // Generate high-fidelity HTML content
            const htmlContent = generateMailingHTML({
                ...mailData,
                heroImage: finalHeroImage
            });

            // Send via our API
            const bccList = recipients.map(r => r.email).filter(Boolean);
            const mailResult = await sendMassEmail(bccList, mailData.subject, htmlContent);

            if (!mailResult.success) {
                throw new Error(mailResult.error || "Failed to broadcast emails");
            }

            setStatus({ type: 'success', text: `All done! ${recipients.length} emails sent successfully.` });
        } catch (error) {
            console.error("Send failed:", error);
            setStatus({ type: 'error', text: 'Something went wrong while sending. Please try again.' });
        } finally {
            setSending(false);
            setTimeout(() => setStatus(null), 5000);
        }
    };
    return (
        <AdminCommunityHubLayout 
            hideTabs={true}
            studioHeader={{
                title: "MAILING",
                subtitle: "MANAGEMENT",
                accentClass: "text-neon-green"
            }}
            action={(
                <>
                    <div className="flex items-center gap-6 bg-zinc-900/40 backdrop-blur-3xl border border-white/5 p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] w-full md:w-auto overflow-hidden">
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
                                    recipientType === type.id ? "bg-neon-green text-black" : "text-gray-500 hover:text-white"
                                )}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>
                    <div className="hidden sm:block w-px h-10 bg-white/10 shrink-0" />
                    <div className="hidden sm:flex items-center gap-4 shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-neon-green/10 flex items-center justify-center text-neon-green">
                            <Users size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black font-heading text-white leading-none">{recipients.length}</h3>
                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-1">Recipients</p>
                        </div>
                        </div>
                    </div>
                    <div className="hidden sm:block w-px h-10 bg-white/10 shrink-0" />
                    <Button 
                        onClick={() => setShowWeeklyGenerator(true)}
                        className="h-14 px-6 bg-neon-blue/10 border border-neon-blue/20 text-neon-blue font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-neon-blue hover:text-black transition-all flex items-center gap-2"
                    >
                        <Sparkles size={16} /> Weekly Generator
                    </Button>
                </>
            )}
        >
            <div className="relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-6">
                        <Card className="p-8 md:p-10 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[3rem] relative overflow-hidden">
                            <form onSubmit={handleSendEmails} className="space-y-8 relative z-10">
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                                                <Mail size={12} className="text-neon-green" /> Email Subject
                                            </label>
                                            <Input 
                                                value={mailData.subject}
                                                onChange={(e) => setMailData({...mailData, subject: e.target.value})}
                                                placeholder="ENTER SUBJECT..."
                                                className="h-14 bg-black/50 border-white/5 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:border-neon-green/30"
                                                required={true}
                                            />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                                                <ExternalLink size={12} className="text-neon-green" /> Primary Header Text
                                            </label>
                                            <Input 
                                                value={mailData.headerText}
                                                onChange={(e) => setMailData({...mailData, headerText: e.target.value})}
                                                placeholder="ENTER HEADER TEXT..."
                                                className="h-14 bg-black/50 border-white/5 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:border-neon-green/30"
                                                required={true}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Mailing Accent Color</label>
                                        <div className="flex flex-wrap gap-3 p-4 bg-black/40 rounded-2xl border border-white/5">
                                            {[
                                                { name: 'Neon Green', color: '#39FF14' },
                                                { name: 'Neon Blue', color: '#2EBFFF' },
                                                { name: 'Neon Pink', color: '#FF0080' },
                                                { name: 'Gold', color: '#FFD700' },
                                                { name: 'White', color: '#FFFFFF' }
                                            ].map((preset) => (
                                                <button
                                                    key={preset.color}
                                                    type="button"
                                                    onClick={() => setMailData({ ...mailData, accentColor: preset.color })}
                                                    className={cn(
                                                        "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
                                                        mailData.accentColor === preset.color ? "border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]" : "border-transparent opacity-50 hover:opacity-100"
                                                    )}
                                                    style={{ backgroundColor: preset.color }}
                                                    title={preset.name}
                                                />
                                            ))}
                                            <div className="w-px h-8 bg-white/10 mx-2" />
                                            <input 
                                                type="color" 
                                                value={mailData.accentColor}
                                                onChange={(e) => setMailData({ ...mailData, accentColor: e.target.value })}
                                                className="w-8 h-8 bg-transparent border-0 cursor-pointer p-0 overflow-hidden rounded-full"
                                            />
                                        </div>
                                    </div>

                                    <div 
                                        className="space-y-4 group/upload outline-none"
                                        onPaste={handlePaste}
                                        tabIndex={0}
                                    >
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 flex items-center gap-2">
                                                Cover Image Asset
                                                <span className="text-[8px] text-neon-green/40 opacity-0 group-hover/upload:opacity-100 transition-opacity font-black">CTRL+V TO PASTE</span>
                                            </label>
                                            <div className="flex items-center gap-2">
                                                {selectedFile && (
                                                    <button 
                                                        type="button"
                                                        onClick={() => setSelectedFile(null)}
                                                        className="text-[9px] font-black text-red-500 hover:text-white transition-colors cursor-pointer bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20"
                                                    >
                                                        RESET
                                                    </button>
                                                )}
                                                <input 
                                                    type="file" 
                                                    id="hero-image-upload" 
                                                    className="hidden" 
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        const file = e.target.files[0];
                                                        if (file) setSelectedFile(file);
                                                    }}
                                                />
                                                <label 
                                                    htmlFor="hero-image-upload"
                                                    className="text-[9px] font-black text-neon-green hover:text-white transition-colors cursor-pointer flex items-center gap-2 bg-neon-green/10 px-3 py-1.5 rounded-xl border border-neon-green/20"
                                                >
                                                    {uploading ? <Loader size={12} className="animate-spin" /> : <Upload size={12} />} UPLOAD IMAGE
                                                </label>
                                            </div>
                                        </div>
                                        <Input
                                            placeholder="HTTPS://IMAGE-URL.PNG"
                                            value={mailData.heroImage}
                                            onChange={(e) => setMailData({ ...mailData, heroImage: e.target.value })}
                                            className="h-14 bg-black/50 border-white/5 rounded-2xl text-[10px] font-black tracking-widest focus:border-neon-green/30 font-mono"
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <StudioRichEditor 
                                            label="Email Message Content"
                                            value={mailData.messageBody}
                                            onChange={(val) => setMailData({...mailData, messageBody: val})}
                                            placeholder="Draft your message to the community... Use formatting, lists, and links!"
                                            minHeight="250px"
                                            accentColor="neon-green"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                                                <ImageIcon size={12} className="text-neon-green" /> Button Text (CTA)
                                            </label>
                                            <Input 
                                                value={mailData.ctaText}
                                                onChange={(e) => setMailData({...mailData, ctaText: e.target.value})}
                                                placeholder="VIEW EVENT"
                                                className="h-14 bg-black/50 border-white/5 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:border-neon-green/30"
                                            />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                                                <LinkIcon size={12} className="text-neon-green" /> Action URL
                                            </label>
                                            <Input 
                                                value={mailData.ctaUrl}
                                                onChange={(e) => setMailData({...mailData, ctaUrl: e.target.value})}
                                                placeholder="https://newbi.live/..."
                                                className="h-14 bg-black/50 border-white/5 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:border-neon-green/30"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-6 bg-black/40 rounded-2xl border border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                            alsoSendingPush ? "bg-neon-green/20 text-neon-green shadow-[0_0_15px_rgba(57,255,20,0.2)]" : "bg-white/5 text-gray-500"
                                        )}>
                                            <Sparkles size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-white">EMAIL & PUSH NOTIFICATION</p>
                                            <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest mt-1">Simultaneous Mobile & Desktop Push Notification</p>
                                        </div>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setAlsoSendingPush(!alsoSendingPush)}
                                        className={cn(
                                            "w-12 h-6 rounded-full p-1 transition-all duration-300 relative",
                                            alsoSendingPush ? "bg-neon-green" : "bg-zinc-800"
                                        )}
                                    >
                                        <div className={cn(
                                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300",
                                            alsoSendingPush ? "right-1 shadow-[0_0_10px_white]" : "left-1"
                                        )} />
                                    </button>
                                </div>

                                {status && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={cn(
                                            "p-4 rounded-xl border text-[10px] font-black uppercase tracking-widest flex items-center gap-3",
                                            status.type === 'success' ? "bg-neon-green/10 border-neon-green/20 text-neon-green" : 
                                            status.type === 'error' ? "bg-red-500/10 border-red-500/20 text-red-500" :
                                            "bg-neon-green/10 border-neon-green/20 text-neon-green shadow-[0_0_20px_rgba(57,255,20,0.1)]"
                                        )}
                                    >
                                        <Sparkles size={14} /> {status.text}
                                    </motion.div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Button 
                                        type="button"
                                        onClick={() => {
                                            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                                                new Notification(mailData.subject || "Test Notification", {
                                                    body: mailData.headerText || "This is a test notification from your dashboard.",
                                                    icon: '/logo_full.png'
                                                });
                                                setStatus({ type: 'info', text: 'Test notification sent! Check your desktop notifications.' });
                                            } else {
                                                useStore.getState().addToast("Notifications are blocked by your browser. Please enable them in your browser settings.", 'error');
                                            }
                                        }}
                                        className="h-20 bg-white/5 text-white font-black font-heading uppercase tracking-[0.2em] rounded-[2rem] border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                                    >
                                        <Monitor size={20} /> Test Notification
                                    </Button>
                                    
                                    <Button 
                                        type="submit" 
                                        disabled={sending || recipients.length === 0}
                                        className="h-20 bg-neon-green text-black font-black font-heading uppercase tracking-[0.2em] rounded-[2rem] shadow-[0_10px_40px_rgba(57,255,20,0.2)] hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
                                    >
                                        {sending ? (
                                            <span className="flex items-center gap-2">
                                                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                                SENDING...
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2">
                                                <Send size={20} /> Send Emails
                                            </span>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </div>

                    <div className="lg:col-span-6">
                        <MailPreview data={{
                            ...mailData,
                            heroImage: selectedFile ? URL.createObjectURL(selectedFile) : mailData.heroImage
                        }} />
                    </div>
                </div>
            </div>
            {showWeeklyGenerator && (
                <WeeklyNewsletterGenerator 
                    onClose={() => setShowWeeklyGenerator(false)}
                    onGenerate={(subject, header, body) => {
                        setMailData(prev => ({
                            ...prev,
                            subject,
                            headerText: header,
                            messageBody: body
                        }));
                        setShowWeeklyGenerator(false);
                        addToast("WEEKLY_TEMPLATE_LOADED.", "success");
                    }}
                />
            )}
        </AdminCommunityHubLayout>

        <AnimatePresence>
            {showWeeklyGenerator && (
                <WeeklyNewsletterGenerator 
                    onGenerate={(generatedData) => {
                        setMailData(generatedData);
                        addToast("WEEKLY_NEWSLETTER_COMPOSED.", 'success');
                    }}
                    onClose={() => setShowWeeklyGenerator(false)}
                />
            )}
        </AnimatePresence>
    );
};

export default MailingManager;

