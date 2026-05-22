import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout, Zap, Newspaper, Monitor, Smartphone, Send, ArrowLeft, Shield, Users, ChevronRight, LayoutGrid, Sparkles, Mail } from 'lucide-react';
import { useStore } from '../../lib/store';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import AdminCommunityHubLayout from '../../components/admin/AdminCommunityHubLayout';
import { sendMassEmail, generateWeeklyHTML } from '../../lib/email';
import { generateNewsletterBriefing } from '../../lib/ai';
import StudioRichEditor from '../../components/ui/StudioRichEditor';

const NewsletterStudio = () => {
    const { posts, subscribers, allUsers, admins, addToast } = useStore();
    const [selectedPosts, setSelectedPosts] = useState([]);
    const [viewMode, setViewMode] = useState('desktop');
    const [sending, setSending] = useState(false);
    const [theme, setTheme] = useState('light');
    const [recipientType, setRecipientType] = useState('subscribers');
    const [editorialText, setEditorialText] = useState('');
    const [commercialContent, setCommercialContent] = useState('');
    const [subStep, setSubStep] = useState('stories'); // 'stories' or 'content'
    const [aiGuidance, setAiGuidance] = useState('');
    const [generatingAI, setGeneratingAI] = useState(false);

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
        const borderColor = isDark ? '#1e293b' : '#e5e7eb';
        const cardBg = isDark ? '#111111' : '#ffffff';
        const textColor = isDark ? '#f8fafc' : '#111111';
        const subTextColor = isDark ? '#94a3b8' : '#4b5563';

        const innerContent = `
            <!-- Lead Editorial Briefing -->
            ${editorialText ? `
                <div class="responsive-px mobile-mx-10" style="margin-bottom: 30px; padding-top: 30px; padding-bottom: 30px; background: ${isDark ? '#0a0a0a' : '#f9fafb'}; border-radius: 24px; border: 1px solid ${borderColor};">
                    <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px;">
                        <h3 style="font-size: 10px; font-weight: 900; color: ${accent}; text-transform: uppercase; letter-spacing: 4px; margin: 0;">EDITORIAL BRIEFING</h3>
                        <div style="flex: 1; height: 1px; background: ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};"></div>
                    </div>
                    <div style="font-size: 15px; line-height: 1.8; color: ${textColor} !important; font-family: Georgia, serif;">
                        ${editorialText}
                    </div>
                </div>
            ` : ''}

            <!-- Primary Featured Story -->
            ${mainPost ? `
                <div class="responsive-px mobile-mx-10" style="margin-bottom: 30px;">
                    <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px;">
                        <h3 style="font-size: 10px; font-weight: 900; color: ${accent}; text-transform: uppercase; letter-spacing: 4px; margin: 0;">FEATURED STORY</h3>
                        <div style="flex: 1; height: 1px; background: ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};"></div>
                    </div>
                    <div class="story-card" style="background: ${cardBg}; border: 1px solid ${borderColor}; border-radius: 24px; overflow: hidden; display: block; text-decoration: none;">
                        <div style="position: relative; height: 200px; overflow: hidden; background: #000;">
                            <img src="${mainPost.coverImage}" style="width: 100%; height: 100%; object-fit: cover; filter: ${isDark ? 'brightness(0.85)' : 'none'};" />
                            <div style="position: absolute; top: 15px; left: 15px;">
                                <span style="background: ${accent}; padding: 4px 10px; font-size: 9px; font-weight: 900; color: #000000; text-transform: uppercase; letter-spacing: 2px; border-radius: 6px;">${mainPost.category || 'FEATURE'}</span>
                            </div>
                        </div>
                        <div style="padding: 24px;">
                            <h2 style="font-size: 24px; font-weight: 900; margin: 0 0 12px 0; line-height: 1.2; text-transform: uppercase; font-style: italic; letter-spacing: -0.5px; color: ${textColor} !important;">${mainPost.title}</h2>
                            <p style="font-size: 14px; line-height: 1.6; color: ${subTextColor} !important; margin: 0 0 20px 0;">${trimDescription(mainPost.shortDescription || mainPost.content || "Experience the latest news from Concert Zone.", 160)}</p>
                            <a href="https://newbi.live/concertzone/${mainPost.category?.toLowerCase().replace(' ', '-')}/${mainPost.slug}" style="display: inline-block; color: ${accent}; text-decoration: none; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; border-bottom: 2px solid ${accent}; padding-bottom: 2px;">READ STORY →</a>
                        </div>
                    </div>
                </div>
            ` : ''}

            <!-- Other Stories Stack -->
            ${otherPosts.length > 0 ? `
                <div class="responsive-px mobile-mx-10" style="margin-bottom: 30px;">
                    <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px;">
                        <h3 style="font-size: 10px; font-weight: 900; color: ${accent}; text-transform: uppercase; letter-spacing: 4px; margin: 0;">WEEKLY HIGHLIGHTS</h3>
                        <div style="flex: 1; height: 1px; background: ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};"></div>
                    </div>
                    
                    ${otherPosts.map(post => `
                        <div class="story-card" style="background: ${cardBg}; border: 1px solid ${borderColor}; border-radius: 16px; margin-bottom: 16px; overflow: hidden;">
                            <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                                <tr>
                                    <!-- Thumbnail Column -->
                                    <td width="90" style="vertical-align: middle; padding: 12px; width: 90px; height: 90px;">
                                        <div style="width: 80px; height: 80px; border-radius: 10px; overflow: hidden; background: #000;">
                                            <img src="${post.coverImage}" style="width: 100%; height: 100%; object-fit: cover; display: block; filter: ${isDark ? 'brightness(0.85)' : 'none'};" />
                                        </div>
                                    </td>
                                    <!-- Details Column -->
                                    <td style="vertical-align: middle; padding: 12px 16px 12px 4px;">
                                        <div style="font-size: 8px; font-weight: 900; color: ${accent}; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px;">${post.category || 'HIGHLIGHT'}</div>
                                        <h4 style="font-size: 15px; font-weight: 800; margin: 0 0 8px 0; line-height: 1.25; color: ${textColor} !important; text-transform: uppercase; font-style: italic;">${post.title}</h4>
                                        <a href="https://newbi.live/concertzone/${post.category?.toLowerCase().replace(' ', '-')}/${post.slug}" style="font-size: 10px; font-weight: 800; color: ${accent}; text-decoration: none; text-transform: uppercase; letter-spacing: 1.5px;">EXPLORE →</a>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            <!-- Interactive details FAQ/Feedback block -->
            <div class="responsive-px mobile-mx-10" style="margin-bottom: 30px;">
                <details style="background: ${isDark ? '#0a0a0a' : '#f9fafb'}; border: 1px solid ${borderColor}; border-radius: 16px; padding: 16px; margin: 0;">
                    <summary style="font-weight: 800; font-size: 11px; letter-spacing: 2px; color: ${accent}; text-transform: uppercase; cursor: pointer;">COULD CONCERT ZONE IMPROVE?</summary>
                    <p style="font-size: 13px; line-height: 1.6; color: ${subTextColor} !important; margin: 12px 0 0 0;">
                        We want to hear from you. Reply directly to this briefing or email us at <a href="mailto:weekly@newbi.live" style="color: ${accent}; font-weight: 700; text-decoration: none;">weekly@newbi.live</a> with your feedback or stories you want us to cover.
                    </p>
                </details>
            </div>

            <!-- Commercial Ad -->
            ${commercialContent ? `
                <div class="responsive-px mobile-mx-10" style="padding: 30px 24px; background: ${isDark ? '#0a0a0a' : '#f9fafb'}; border-radius: 24px; border: 1px solid ${borderColor}; text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 8px; font-weight: 900; color: ${isDark ? '#444' : '#bbb'}; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 16px;">SPONSORED BRIEFING</div>
                    <div style="font-size: 13px; line-height: 1.7; color: ${subTextColor}; font-style: italic; max-width: 480px; margin: 0 auto;">
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

    const handleGenerateAIExtract = async () => {
        if (selectedPosts.length === 0) {
            addToast("Please select at least one story to generate a briefing.", "warning");
            return;
        }
        setGeneratingAI(true);
        try {
            const briefingHtml = await generateNewsletterBriefing(selectedPosts, aiGuidance);
            setEditorialText(briefingHtml);
            addToast("Editorial briefing generated successfully by Concert Zone AI.", "success");
        } catch (error) {
            console.error("AI Briefing failed:", error);
            addToast("AI briefing generation failed: " + error.message, "error");
        } finally {
            setGeneratingAI(false);
        }
    };

    const [sendProgress, setSendProgress] = useState(null);

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
        setSendProgress(null);
        try {
            const html = generateInternalHTML;
            const bccList = uniqueRecipients.map(r => r.email).filter(Boolean);
            const result = await sendMassEmail(
                bccList, 
                `WEEKLY NEWSLETTER: ${selectedPosts[0]?.title || 'NEWBI ENT'}`, 
                html, 
                'weekly',
                (progress) => setSendProgress(progress)
            );

            if (result.success) {
                addToast(`Newsletter delivered to ${result.sent} recipients across ${result.batches} batch(es).`, "success");
            } else {
                addToast(`Sent ${result.sent}/${result.total} — some batches failed: ${result.error}`, result.sent > 0 ? "info" : "error");
            }
        } catch (error) {
            addToast("Failed to dispatch: " + error.message, "error");
        } finally {
            setSending(false);
            setSendProgress(null);
        }
    };

    return (
        <AdminCommunityHubLayout 
            hideTabs={true}
            accentColor="neon-blue"
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
                                    <div className="space-y-8">
                                        {/* AI Briefing Assistant */}
                                        <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem] space-y-4">
                                            <div className="flex items-center gap-3">
                                                <Sparkles className="text-neon-blue w-5 h-5 animate-pulse" />
                                                <h4 className="text-xs font-black font-heading uppercase tracking-widest text-white">AI Briefing Assistant</h4>
                                            </div>
                                            <p className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider leading-relaxed">
                                                Generate a professional, cohesive editorial lead note wrapping up your selected stories.
                                            </p>
                                            <div className="space-y-3">
                                                <textarea
                                                    value={aiGuidance}
                                                    onChange={(e) => setAiGuidance(e.target.value)}
                                                    placeholder="Guidance e.g. 'Keep it energetic, focus on the electronic music scene resurgence and local artists'"
                                                    className="w-full h-20 bg-black/40 border border-white/5 rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-neon-blue/40 resize-none transition-all"
                                                />
                                                <Button
                                                    onClick={handleGenerateAIExtract}
                                                    disabled={generatingAI || selectedPosts.length === 0}
                                                    className="w-full py-3 bg-neon-blue text-black font-black uppercase tracking-widest text-[9px] rounded-xl flex items-center justify-center gap-2 hover:scale-[1.01] disabled:opacity-50 transition-all"
                                                >
                                                    {generatingAI ? (
                                                        <>
                                                            <div className="w-3.5 h-3.5 border border-black border-t-transparent rounded-full animate-spin" />
                                                            GENERATING BRIEFING NARRATIVE...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Sparkles size={12} /> GENERATE BRIEFING WITH GEMINI AI
                                                        </>
                                                    )}
                                                </Button>
                                                {selectedPosts.length === 0 && (
                                                    <p className="text-[9px] text-amber-500 font-bold uppercase tracking-wider text-center mt-1">
                                                        ⚠ Select at least one story in Step 1 to use the AI writer.
                                                    </p>
                                                )}
                                            </div>
                                        </div>

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
                                            {sendProgress 
                                                ? `BATCH ${sendProgress.currentBatch}/${sendProgress.totalBatches} — ${sendProgress.sent} SENT`
                                                : 'PREPARING...'}
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
