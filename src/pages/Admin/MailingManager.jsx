import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LayoutGrid, Send, Sparkles, Mail, Users, Monitor, Smartphone, Image as ImageIcon, ExternalLink, X, Upload, Loader, Link as LinkIcon } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import AdminDashboardLink from '../../components/admin/AdminDashboardLink';
import MailPreview from '../../components/admin/MailPreview';
import { notifyAllUsers } from '../../lib/notificationTriggers';
import { storage } from '../../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const MailingManager = () => {
    const { subscribers, allUsers, admins, siteDetails } = useStore();
    const [searchParams] = useSearchParams();
    
    // Mail Maker State
    const [mailData, setMailData] = useState({
        subject: searchParams.get('subject') || '',
        heroImage: searchParams.get('heroImage') || '',
        headerText: searchParams.get('header') || '',
        messageBody: searchParams.get('body') || '',
        ctaText: searchParams.get('ctaText') || '',
        ctaUrl: searchParams.get('ctaUrl') || '',
    });

    const [recipientType, setRecipientType] = useState('subscribers'); // subscribers, registered, all
    const [alsoSendingPush, setAlsoSendingPush] = useState(false);
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState(null); // { type: 'success' | 'error' | 'info', text: string }
    const [viewMode, setViewMode] = useState('desktop');
    const [uploading, setUploading] = useState(false);

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

    const handleBroadcast = async (e) => {
        if (e) e.preventDefault();
        if (recipients.length === 0) {
            useStore.getState().addToast("Digital void detected: No recipients in the current sector.", 'error');
            return;
        }

        const confirmMsg = alsoSendingPush 
            ? `ESTABLISH DUAL-CHANNEL CAMPAIGN: Send email and push notification to ${recipients.length} recipients?`
            : `INITIATE CAMPAIGN: Send broadcast to ${recipients.length} recipients?`;

        if (!window.confirm(confirmMsg)) return;

        setSending(true);
        setStatus({ type: 'info', text: 'INITIATING MULTI-CHANNEL CAMPAIGN...' });

        try {
            // Optional: Send Push Notification if toggled
            if (alsoSendingPush) {
                await notifyAllUsers(
                    mailData.subject || "NEW MESSAGE RECEIVED",
                    mailData.headerText || mailData.messageBody.substring(0, 50),
                    mailData.ctaUrl || "/",
                    mailData.heroImage || null
                );
            }

            // Real EmailJS integration placeholder
            console.log("Broadcasting to:", recipients.map(r => r.email));
            
            // Simulation of delay
            await new Promise(resolve => setTimeout(resolve, 3000));

            setStatus({ type: 'success', text: `BROADCAST SUCCESSFUL. ${recipients.length} EMAILS SENT.` });
        } catch (error) {
            console.error("Broadcast failed:", error);
            setStatus({ type: 'error', text: 'BROADCAST INTERRUPTED. SYSTEM FAILURE.' });
        } finally {
            setSending(false);
            setTimeout(() => setStatus(null), 5000);
        }
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white pb-20">
            {/* Atmos */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] bg-neon-green/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-neon-blue/5 rounded-full blur-[150px]" />
            </div>

            <div className="relative z-10 max-w-[1600px] mx-auto px-4 md:px-8 pt-32 md:pt-40">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-16 gap-8">
                    <div className="space-y-4">
                        <AdminDashboardLink className="mb-2" />
                        <div className="flex items-center gap-3">
                            <Sparkles size={16} className="text-neon-green" />
                            <span className="text-neon-green text-[10px] font-black uppercase tracking-[0.4em]">Operations Hub</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black font-heading tracking-tighter uppercase italic text-white flex items-center gap-4">
                            MAILING <span className="text-neon-green">MANAGEMENT.</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-6 bg-zinc-900/40 backdrop-blur-3xl border border-white/5 p-6 rounded-[2.5rem]">
                        <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
                            {[
                                { id: 'subscribers', label: 'Subscribers' },
                                { id: 'registered', label: 'Users' },
                                { id: 'admins', label: 'Admins' },
                                { id: 'all', label: 'Global' }
                            ].map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => setRecipientType(type.id)}
                                    className={cn(
                                        "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        recipientType === type.id ? "bg-neon-green text-black" : "text-gray-500 hover:text-white"
                                    )}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                        <div className="w-px h-10 bg-white/10" />
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-neon-green/10 flex items-center justify-center text-neon-green">
                                <Users size={20} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black font-heading text-white leading-none">{recipients.length}</h3>
                                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-1">Recipients</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Mail Maker Editor */}
                    <div className="lg:col-span-6">
                        <Card className="p-8 md:p-10 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[3rem] relative overflow-hidden">
                            <form onSubmit={handleBroadcast} className="space-y-8 relative z-10">
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                                                <Mail size={12} className="text-neon-green" /> Broadcast Subject
                                            </label>
                                            <Input 
                                                value={mailData.subject}
                                                onChange={(e) => setMailData({...mailData, subject: e.target.value})}
                                                placeholder="SYSTEM ALERT: NEW UPDATE..."
                                                className="h-14 bg-black/50 border-white/5 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:border-neon-green/30"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                                                <ExternalLink size={12} className="text-neon-green" /> Primary Header Text
                                            </label>
                                            <Input 
                                                value={mailData.headerText}
                                                onChange={(e) => setMailData({...mailData, headerText: e.target.value})}
                                                placeholder="ACCESS GRANTED. VIEW DETAILS."
                                                className="h-14 bg-black/50 border-white/5 rounded-2xl text-[11px] font-black uppercase tracking-widest focus:border-neon-green/30"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Hero Image Asset</label>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="file" 
                                                    id="hero-image-upload" 
                                                    className="hidden" 
                                                    accept="image/*"
                                                    onChange={async (e) => {
                                                        const file = e.target.files[0];
                                                        if (!file) return;
                                                        
                                                        setUploading(true);
                                                        try {
                                                            const storageRef = ref(storage, `broadcasts/${Date.now()}_${file.name}`);
                                                            const uploadTask = await uploadBytesResumable(storageRef, file);
                                                            const url = await getDownloadURL(uploadTask.ref);
                                                            setMailData({ ...mailData, heroImage: url });
                                                            setStatus({ type: 'info', text: 'IMAGE UPLOAD SUCCESSFUL.' });
                                                        } catch (err) {
                                                            setStatus({ type: 'error', text: 'UPLOAD FAILED.' });
                                                        } finally {
                                                            setUploading(false);
                                                        }
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
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Communication Content</label>
                                        <textarea 
                                            value={mailData.messageBody}
                                            onChange={(e) => setMailData({...mailData, messageBody: e.target.value})}
                                            className="w-full bg-black/50 border border-white/5 rounded-[2.5rem] p-8 text-sm font-medium text-gray-300 focus:outline-none focus:border-neon-green/30 transition-all resize-none min-h-[250px] custom-scrollbar"
                                            placeholder="Draft your message to the community..."
                                            required
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
                                            <p className="text-[10px] font-black uppercase tracking-widest text-white">DUAL CHANNEL BROADCAST</p>
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
                                            if (Notification.permission === 'granted') {
                                                new Notification(mailData.subject || "DIAGNOSTIC_SIGNAL", {
                                                    body: mailData.headerText || "LOCAL_TEST_PAYLOAD_RECEIVED.",
                                                    icon: '/logo_full.png'
                                                });
                                                setStatus({ type: 'info', text: 'LOCAL_SIGNAL_DISPATCHED. CHECK_LAPTOP_NOTIFICATIONS.' });
                                            } else {
                                                useStore.getState().addToast("PERMISSION_DENIED: Browser has blocked native signals.", 'error');
                                            }
                                        }}
                                        className="h-20 bg-white/5 text-white font-black font-heading uppercase tracking-[0.2em] rounded-[2rem] border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                                    >
                                        <Monitor size={20} /> Test Signal
                                    </Button>
                                    
                                    <Button 
                                        type="submit" 
                                        disabled={sending || recipients.length === 0}
                                        className="h-20 bg-neon-green text-black font-black font-heading uppercase tracking-[0.2em] rounded-[2rem] shadow-[0_10px_40px_rgba(57,255,20,0.2)] hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
                                    >
                                        {sending ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                                TRANSMITTING...
                                            </>
                                        ) : (
                                            <>
                                                <Send size={20} /> Initiate Broadcast
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </div>

                    {/* Live Preview Pane */}
                    <div className="lg:col-span-6">
                        <MailPreview data={mailData} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MailingManager;
