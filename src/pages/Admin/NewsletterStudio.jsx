import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout, Zap, Newspaper, Monitor, Smartphone, Send, ArrowLeft, Shield, Users, ChevronRight, LayoutGrid, Sparkles, Mail } from 'lucide-react';
import { useStore } from '../../lib/store';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import { sendMassEmail, generateWeeklyHTML } from '../../lib/email';
import StudioRichEditor from '../../components/ui/StudioRichEditor';

const NewsletterStudio = () => {
    const { posts, subscribers, allUsers, admins, addToast } = useStore();
    const [selectedPosts, setSelectedPosts] = useState([]);
    const [viewMode, setViewMode] = useState('desktop');
    const [sending, setSending] = useState(false);
    const [theme, setTheme] = useState('dark');
    const [recipientType, setRecipientType] = useState('subscribers');
    const [editorialText, setEditorialText] = useState('');
    const [commercialContent, setCommercialContent] = useState('');
    const [subStep, setSubStep] = useState('stories'); // 'stories' or 'content'

    const availablePosts = useMemo(() => {
        return posts
            .filter(p => p.status === 'Published')
            .sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
    }, [posts]);

    const togglePost = (post) => {
        if (selectedPosts.find(p => p.id === post.id)) {
            setSelectedPosts(selectedPosts.filter(p => p.id !== post.id));
        } else {
            if (selectedPosts.length >= 6) {
                addToast("Recommended max is 6 stories for optimal flow.", "info");
                return;
            }
            setSelectedPosts([...selectedPosts, post]);
        }
    };

    const trimDescription = (text, limit = 160) => {
        if (!text) return "";
        const cleanText = text.replace(/<[^>]*>?/gm, '');
        return cleanText.length > limit ? cleanText.substring(0, limit) + '...' : cleanText;
    };

    const generateInternalHTML = useMemo(() => {
        const mainPost = selectedPosts[0];
        const otherPosts = selectedPosts.slice(1);
        const isDark = theme === 'dark';
        const accent = isDark ? '#00f2ff' : '#008899';
        const borderColor = isDark ? '#1a1a1a' : '#eaeaea';

        const innerContent = `
            <div class="responsive-px" style="margin-bottom: 40px; padding-top: 20px; padding-bottom: 20px; background: ${isDark ? '#000000' : '#ffffff'}; border-bottom: 1px solid ${borderColor};">
                <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 30px;">
                    <h3 style="font-size: 11px; font-weight: 900; color: ${accent}; text-transform: uppercase; letter-spacing: 5px; margin: 0;">THE BRIEFING</h3>
                    <div style="flex: 1; height: 1px; background: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};"></div>
                </div>

                ${editorialText ? `
                    <div style="margin-bottom: 40px; font-size: 16px; line-height: 1.8; color: ${isDark ? '#ffffff' : '#000000'} !important; font-weight: 400; font-family: Georgia, serif;">
                        ${editorialText}
                    </div>
                ` : ''}
                
                ${otherPosts.map(post => `
                    <div class="mobile-stack" style="display: flex; gap: 30px; margin-bottom: 40px; align-items: flex-start;">
                        <div class="mobile-w-full" style="width: 100px; height: 100px; border-radius: 2px; overflow: hidden; flex-shrink: 0; background: #111;">
                            <img src="${post.coverImage}" style="width: 100%; height: 100%; object-fit: cover; filter: ${isDark ? 'brightness(0.8)' : 'none'};" />
                        </div>
                        <div style="flex: 1;">
                            <div style="font-size: 8px; font-weight: 950; color: ${accent}; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 2px;">${post.category || 'INTEL'}</div>
                            <h4 style="font-size: 18px; font-weight: 900; margin: 0 0 10px 0; line-height: 1.1; text-transform: uppercase; letter-spacing: -0.5px; font-style: italic; color: ${isDark ? '#ffffff' : '#000000'};">${post.title}</h4>
                            <a href="https://newbi.live/concertzone/${post.category?.toLowerCase().replace(' ', '-')}/${post.slug}" style="font-size: 9px; font-weight: 950; color: ${isDark ? '#ffffff' : '#000000'}; text-decoration: none; text-transform: uppercase; letter-spacing: 2px; border-bottom: 1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}; padding-bottom: 4px;">EXPLORE</a>
                        </div>
                    </div>
                `).join('')}
            </div>

            ${mainPost ? `
                <div style="margin-bottom: 80px; background: ${isDark ? '#000000' : '#ffffff'};">
                    <div style="position: relative;">
                        <img src="${mainPost.coverImage}" style="width: 100%; display: block; filter: ${isDark ? 'brightness(0.9)' : 'none'};" />
                        <div style="position: absolute; bottom: 0; left: 0;">
                            <span style="background: ${accent}; padding: 8px 16px; font-size: 10px; font-weight: 950; color: #000; text-transform: uppercase; letter-spacing: 3px;">${mainPost.category || 'FEATURE'}</span>
                        </div>
                    </div>
                    <div class="responsive-px" style="padding-top: 35px; padding-bottom: 20px;">
                        <h2 style="font-size: 44px; font-weight: 900; margin: 0 0 25px 0; line-height: 0.95; text-transform: uppercase; font-style: italic; letter-spacing: -2px; color: ${isDark ? '#ffffff' : '#000000'} !important;">${mainPost.title}</h2>
                        <p style="font-size: 16px; line-height: 1.8; color: ${isDark ? '#999' : '#000000'} !important; margin-bottom: 40px; font-weight: 400;">${trimDescription(mainPost.shortDescription || mainPost.content || "Experience the latest intelligence from the Concert Zone ecosystem.", 300)}</p>
                        <a href="https://newbi.live/concertzone/${mainPost.category?.toLowerCase().replace(' ', '-')}/${mainPost.slug}" style="display: inline-block; padding: 18px 0; color: ${accent}; text-decoration: none; font-size: 12px; font-weight: 950; text-transform: uppercase; letter-spacing: 4px; border-bottom: 3px solid ${accent};">READ FULL NARRATIVE →</a>
                    </div>
                </div>
            ` : ''}

            ${commercialContent ? `
                <div class="responsive-px" style="padding-top: 60px; padding-bottom: 60px; background: ${isDark ? '#000000' : '#ffffff'}; border-top: 1px solid ${borderColor}; text-align: center;">
                    <div style="font-size: 8px; font-weight: 950; color: ${isDark ? '#333' : '#ccc'}; text-transform: uppercase; letter-spacing: 5px; margin-bottom: 30px;">COMMERCIAL INTEGRATION</div>
                    <div style="font-size: 14px; line-height: 1.8; color: ${isDark ? '#888' : '#666'}; font-style: italic; max-width: 500px; margin: 0 auto;">
                        ${commercialContent}
                    </div>
                </div>
            ` : ''}
        `;

        return generateWeeklyHTML({
            summary: mainPost ? `FEATURING: ${mainPost.title.toUpperCase()}` : "THE DEFINITIVE WEEKLY BRIEFING",
            messageBody: innerContent,
            theme: theme
        });
    }, [selectedPosts, theme, editorialText, commercialContent]);

    const handleExecuteWeeklyBroadcast = async () => {
        let recipients = [];
        if (recipientType === 'subscribers') recipients = subscribers;
        else if (recipientType === 'registered') recipients = allUsers;
        else if (recipientType === 'admins') recipients = admins;
        else recipients = [...subscribers, ...allUsers];

        const uniqueRecipients = Array.from(new Set(recipients.map(r => r.email)))
            .map(email => recipients.find(r => r.email === email));

        if (uniqueRecipients.length === 0) {
            addToast("No recipients found for this category.", "error");
            return;
        }

        if (!window.confirm(`Broadcast Weekly Newsletter to ${uniqueRecipients.length} recipients?`)) return;

        setSending(true);
        try {
            const html = generateInternalHTML;
            const bccList = uniqueRecipients.map(r => r.email).filter(Boolean);
            const result = await sendMassEmail(
                bccList, 
                `WEEKLY NEWSLETTER: ${selectedPosts[0]?.title || 'NEWBI ENT'}`, 
                html, 
                'weekly'
            );

            if (result.success) {
                addToast("Weekly newsletter sent successfully.", "success");
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            addToast("Failed to dispatch: " + error.message, "error");
        } finally {
            setSending(false);
        }
    };

    return (
        <AdminCommunityHubLayout 
            hideTabs={true}
            studioHeader={{
                title: "NEWSLETTER",
                subtitle: "STUDIO",
                accentClass: "text-neon-blue",
                logo: "/weekly_logo.png"
            }}
        >
            <div className="relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10">
                    {/* Left Side: Editor & Selection */}
                    <div className="lg:col-span-7 space-y-8">
                        <Card className="p-6 md:p-8 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[2.5rem] relative overflow-hidden">
                            {/* Sub-tab Switcher */}
                            <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 w-fit mb-8 shadow-2xl">
                                <button 
                                    onClick={() => setSubStep('stories')}
                                    className={cn(
                                        "px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        subStep === 'stories' ? "bg-neon-blue text-black" : "text-gray-500 hover:text-white"
                                    )}
                                >
                                    1. Select Stories
                                </button>
                                <button 
                                    onClick={() => setSubStep('content')}
                                    className={cn(
                                        "px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        subStep === 'content' ? "bg-neon-blue text-black" : "text-gray-500 hover:text-white"
                                    )}
                                >
                                    2. Add Content
                                </button>
                            </div>

                            <div className="space-y-10">
                                {subStep === 'stories' ? (
                                    <div className="space-y-8">
                                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                            <div className="space-y-2">
                                                <h3 className="text-xl font-black font-heading uppercase italic text-white tracking-tight">Intelligence Stack</h3>
                                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Selected stories for the briefing.</p>
                                            </div>
                                            <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-white flex items-center gap-4">
                                                <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Selected</span>
                                                <span className="text-xl font-black font-heading text-neon-blue">{selectedPosts.length} <span className="text-sm opacity-20">/ 6</span></span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                            {availablePosts.map((post) => {
                                                const isSelected = selectedPosts.find(p => p.id === post.id);
                                                const selectionIndex = selectedPosts.findIndex(p => p.id === post.id);
                                                
                                                return (
                                                    <motion.div
                                                        key={post.id}
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={() => togglePost(post)}
                                                        className={cn(
                                                            "relative cursor-pointer rounded-2xl overflow-hidden border transition-all duration-500 group",
                                                            isSelected 
                                                                ? "bg-neon-blue/10 border-neon-blue/40 shadow-2xl" 
                                                                : "bg-black/40 border-white/5 hover:border-white/20"
                                                        )}
                                                    >
                                                        <div className="aspect-[16/10] relative">
                                                            <img src={post.coverImage} className="w-full h-full object-cover" alt="" />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-transparent opacity-60" />
                                                            {isSelected && (
                                                                <div className="absolute inset-0 flex items-center justify-center bg-neon-blue/20 backdrop-blur-sm">
                                                                    <div className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center font-black text-lg shadow-2xl">
                                                                        {selectionIndex === 0 ? "★" : selectionIndex + 1}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="p-4">
                                                            <h4 className="text-[10px] font-black font-heading uppercase italic text-white line-clamp-2 leading-tight">
                                                                {post.title}
                                                            </h4>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-10">
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-4">
                                                <div className="px-4 py-1.5 bg-neon-blue/20 text-neon-blue text-[9px] font-black uppercase tracking-[0.2em] rounded-full border border-neon-blue/30">
                                                    EDITORIAL
                                                </div>
                                                <h3 className="text-xl font-black font-heading uppercase italic text-white tracking-tight">Lead Commentary</h3>
                                            </div>
                                            <div className="bg-black/40 border border-white/5 rounded-[2rem] p-4 overflow-hidden">
                                                <StudioRichEditor 
                                                    value={editorialText} 
                                                    onChange={setEditorialText}
                                                    placeholder="Craft your lead editorial note here... (Optional)"
                                                    minHeight="200px"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="flex items-center gap-4">
                                                <div className="px-4 py-1.5 bg-amber-500/20 text-amber-500 text-[9px] font-black uppercase tracking-[0.2em] rounded-full border border-amber-500/30">
                                                    COMMERCIAL
                                                </div>
                                                <h3 className="text-xl font-black font-heading uppercase italic text-white tracking-tight">Ad Integration</h3>
                                            </div>
                                            <div className="bg-black/40 border border-white/5 rounded-[2rem] p-4 overflow-hidden">
                                                <StudioRichEditor 
                                                    value={commercialContent} 
                                                    onChange={setCommercialContent}
                                                    placeholder="Enter promotional copy... (Optional)"
                                                    accentColor="amber-500"
                                                    minHeight="150px"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Audience Selection Card */}
                        <Card className="p-6 md:p-8 bg-zinc-900/40 backdrop-blur-3xl border-white/5 rounded-[2.5rem]">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                                <div className="flex items-center gap-6">
                                    <div className="w-14 h-14 rounded-2xl bg-neon-blue/10 flex items-center justify-center text-neon-blue border border-neon-blue/20">
                                        <Users size={24} />
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-4">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Target Audience</p>
                                            <div className="px-3 py-1 bg-neon-blue/10 rounded-full border border-neon-blue/20 flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-neon-blue animate-pulse" />
                                                <span className="text-[10px] font-black text-neon-blue uppercase">
                                                    {recipientType === 'subscribers' ? subscribers.length : 
                                                     recipientType === 'registered' ? allUsers.length : 
                                                     recipientType === 'admins' ? admins.length : (subscribers.length + allUsers.length)} Recipients
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
                                            {[
                                                { id: 'subscribers', label: 'Subs' },
                                                { id: 'registered', label: 'Users' },
                                                { id: 'admins', label: 'Test' },
                                                { id: 'all', label: 'Global' }
                                            ].map(type => (
                                                <button
                                                    key={type.id}
                                                    onClick={() => setRecipientType(type.id)}
                                                    className={cn(
                                                        "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                                        recipientType === type.id ? "bg-white text-black shadow-lg" : "text-gray-500 hover:text-white"
                                                    )}
                                                >
                                                    {type.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <Button 
                                    onClick={handleExecuteWeeklyBroadcast}
                                    disabled={sending || selectedPosts.length === 0}
                                    className="h-14 px-10 bg-neon-blue text-black font-black font-heading uppercase tracking-[0.2em] rounded-2xl shadow-2xl disabled:opacity-50 disabled:grayscale hover:scale-105 transition-all flex items-center gap-3"
                                >
                                    {sending ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                            SENDING...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={18} /> SEND NEWSLETTER
                                        </>
                                    )}
                                </Button>
                            </div>
                        </Card>
                    </div>

                    {/* Right Side: Transmission Preview */}
                    <div className="lg:col-span-5">
                        <div className="sticky top-32">
                            <div className="flex items-center justify-between mb-8 px-4">
                                <h3 className="text-sm font-black uppercase tracking-[0.4em] text-white/40">Transmission Preview</h3>
                                <div className="flex items-center gap-4">
                                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                                        <button 
                                            onClick={() => setTheme('light')}
                                            className={cn("px-3 py-1.5 rounded-lg transition-all text-[8px] font-black uppercase tracking-widest", theme === 'light' ? "bg-white text-black shadow-lg" : "text-gray-500 hover:text-white")}
                                        >
                                            Light
                                        </button>
                                        <button 
                                            onClick={() => setTheme('dark')}
                                            className={cn("px-3 py-1.5 rounded-lg transition-all text-[8px] font-black uppercase tracking-widest", theme === 'dark' ? "bg-zinc-800 text-white shadow-lg" : "text-gray-500 hover:text-white")}
                                        >
                                            Dark
                                        </button>
                                    </div>
                                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                                        <button 
                                            onClick={() => setViewMode('desktop')}
                                            className={cn("p-1.5 rounded-lg transition-all", viewMode === 'desktop' ? "bg-white text-black" : "text-gray-500")}
                                        >
                                            <Monitor size={12} />
                                        </button>
                                        <button 
                                            onClick={() => setViewMode('mobile')}
                                            className={cn("p-1.5 rounded-lg transition-all", viewMode === 'mobile' ? "bg-white text-black" : "text-gray-500")}
                                        >
                                            <Smartphone size={12} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className={cn(
                                "mx-auto transition-all duration-500 rounded-[3rem] overflow-hidden border border-white/5 shadow-[0_40px_120px_rgba(0,0,0,0.5)]",
                                viewMode === 'mobile' ? "max-w-[375px]" : "w-full",
                                theme === 'dark' ? "bg-black" : "bg-white"
                            )}>
                                <div className={cn(
                                    "h-[700px] overflow-y-auto scrollbar-hide",
                                    theme === 'dark' ? "bg-[#060606]" : "bg-[#fcfcfc]"
                                )}>
                                    <div dangerouslySetInnerHTML={{ __html: generateInternalHTML }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminCommunityHubLayout>
    );
};

export default NewsletterStudio;
