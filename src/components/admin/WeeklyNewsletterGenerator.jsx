import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Mail, Check, X, Calendar, ChevronRight, Layout, Zap, Newspaper } from 'lucide-react';
import { useStore } from '../../lib/store';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';

const WeeklyNewsletterGenerator = ({ onGenerate, onClose, initialSelectedPosts = [] }) => {
    const { posts } = useStore();
    const [selectedPosts, setSelectedPosts] = useState(initialSelectedPosts);
    const [step, setStep] = useState(1);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        if (initialSelectedPosts.length > 0) {
            setSelectedPosts(initialSelectedPosts);
        }
    }, [initialSelectedPosts]);

    const availablePosts = posts
        .filter(p => p.status === 'Published')
        .sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));

    const togglePost = (post) => {
        if (selectedPosts.find(p => p.id === post.id)) {
            setSelectedPosts(selectedPosts.filter(p => p.id !== post.id));
        } else {
            if (selectedPosts.length >= 6) {
                alert("Recommended max is 6 posts for optimal reading experience.");
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

    const handleGenerate = () => {
        setGenerating(true);
        
        const mainPost = selectedPosts[0];
        const otherPosts = selectedPosts.slice(1);

        const htmlBody = `
            <div style="font-family: 'Helvetica', 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background: #060606; color: #ffffff; border-radius: 40px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05);">
                <!-- Masthead -->
                <div style="padding: 80px 40px 60px; text-align: center; background: linear-gradient(180deg, #111 0%, #060606 100%);">
                    <div style="margin-bottom: 40px;">
                         <span style="font-size: 10px; font-weight: 900; letter-spacing: 6px; color: #2EBFFF; text-transform: uppercase;">VOL 01 // MAY 2026</span>
                    </div>
                    <h1 style="font-size: 56px; font-weight: 900; letter-spacing: -3px; margin: 0; color: #ffffff; text-transform: uppercase; font-style: italic; line-height: 0.8;">WEEKLY</h1>
                    <div style="margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 15px;">
                        <div style="height: 1px; width: 40px; background: rgba(255,255,255,0.1);"></div>
                        <span style="font-size: 11px; font-weight: 900; letter-spacing: 4px; color: rgba(255,255,255,0.3); text-transform: uppercase;">BY CONCERT ZONE</span>
                        <div style="height: 1px; width: 40px; background: rgba(255,255,255,0.1);"></div>
                    </div>
                </div>

                <!-- Featured Narrative -->
                ${mainPost ? `
                    <div style="padding: 0 30px;">
                        <div style="background: #111; border-radius: 35px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); shadow: 0 20px 50px rgba(0,0,0,0.5);">
                            <img src="${mainPost.coverImage}" style="width: 100%; aspect-ratio: 16/9; object-fit: cover;" />
                            <div style="padding: 45px 40px;">
                                <div style="display: inline-block; padding: 8px 16px; background: rgba(46,191,255,0.1); color: #2EBFFF; font-size: 9px; font-weight: 900; border-radius: 12px; margin-bottom: 25px; text-transform: uppercase; letter-spacing: 2px; border: 1px solid rgba(46,191,255,0.2);">${mainPost.category}</div>
                                <h2 style="font-size: 36px; font-weight: 900; margin: 0 0 20px 0; line-height: 1.0; text-transform: uppercase; font-style: italic; letter-spacing: -1px;">${mainPost.title}</h2>
                                <p style="font-size: 15px; line-height: 1.7; color: #999; margin-bottom: 35px; font-weight: 400;">${trimDescription(mainPost.shortDescription || mainPost.content, 220)}</p>
                                <a href="${window.location.origin}/concertzone/${mainPost.category?.toLowerCase().replace(' ', '-')}/${mainPost.slug}" style="display: inline-block; padding: 22px 40px; background: #2EBFFF; color: #000000; text-decoration: none; font-size: 12px; font-weight: 900; border-radius: 20px; text-transform: uppercase; letter-spacing: 2px; box-shadow: 0 10px 30px rgba(46,191,255,0.3);">ENTER NARRATIVE</a>
                            </div>
                        </div>
                    </div>
                ` : ''}

                <!-- Secondary Intelligence -->
                <div style="padding: 60px 30px;">
                    <h3 style="font-size: 10px; font-weight: 900; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 6px; margin-bottom: 40px; text-align: center;">THE BRIEFING STACK</h3>
                    
                    ${otherPosts.map(post => `
                        <div style="display: flex; gap: 25px; margin-bottom: 25px; background: rgba(255,255,255,0.02); padding: 20px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.05);">
                            <div style="width: 120px; height: 120px; border-radius: 20px; overflow: hidden; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.1);">
                                <img src="${post.coverImage}" style="width: 100%; height: 100%; object-fit: cover;" />
                            </div>
                            <div style="flex: 1; padding: 5px 0;">
                                <div style="font-size: 8px; font-weight: 900; color: #2EBFFF; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 2px;">${post.category}</div>
                                <h4 style="font-size: 18px; font-weight: 900; margin: 0 0 12px 0; line-height: 1.2; text-transform: uppercase; letter-spacing: -0.5px;">${post.title}</h4>
                                <a href="${window.location.origin}/concertzone/${post.category?.toLowerCase().replace(' ', '-')}/${post.slug}" style="font-size: 10px; font-weight: 900; color: #ffffff; text-decoration: none; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #2EBFFF; padding-bottom: 2px;">READ MORE</a>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <!-- Closing -->
                <div style="padding: 80px 40px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05); background: #000;">
                    <div style="margin-bottom: 40px;">
                         <span style="font-size: 24px; font-weight: 900; color: #ffffff; font-style: italic;">CONCERT ZONE<span style="color: #2EBFFF;">.</span></span>
                    </div>
                    <p style="font-size: 13px; line-height: 1.6; color: #666; margin-bottom: 40px; max-width: 400px; margin-left: auto; margin-right: auto;">You are receiving the editorial briefing because you are part of the Newbi community. Stay tuned for live event coverage and artist spotlights.</p>
                    <div style="display: flex; justify-content: center; gap: 30px; margin-bottom: 40px;">
                        <a href="${window.location.origin}/concertzone" style="font-size: 10px; font-weight: 900; color: #2EBFFF; text-decoration: none; text-transform: uppercase; letter-spacing: 3px;">MAGAZINE</a>
                        <a href="${window.location.origin}" style="font-size: 10px; font-weight: 900; color: #ffffff; text-decoration: none; text-transform: uppercase; letter-spacing: 3px;">NEWBI HOME</a>
                    </div>
                    <div style="height: 1px; width: 60px; background: rgba(255,255,255,0.1); margin: 0 auto 30px;"></div>
                    <p style="font-size: 9px; font-weight: 900; color: #333; text-transform: uppercase; letter-spacing: 4px;">EST. 2026 // NEWBI ENTERTAINMENT</p>
                </div>
            </div>
        `;

        const finalData = {
            subject: `WEEKLY: ${mainPost?.title || 'This Week\'s Stories'}`,
            headerText: "WEEKLY BY CONCERT ZONE",
            messageBody: htmlBody,
            heroImage: mainPost?.coverImage || '',
            ctaText: 'EXPLORE THE ZONE',
            ctaUrl: `${window.location.origin}/concertzone`,
            accentColor: '#2EBFFF'
        };

        if (onGenerate) onGenerate(finalData);
        
        setGenerating(false);
        onClose();
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-6 md:p-12 bg-black/90 backdrop-blur-3xl"
        >
            <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-zinc-950 border border-white/10 rounded-[4rem] w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_50px_150px_rgba(0,0,0,1)]"
            >
                {/* Visual Header */}
                <div className="p-10 md:p-14 border-b border-white/5 flex items-center justify-between bg-zinc-950/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-neon-blue/10 blur-[120px] -mr-48 -mt-48 rounded-full pointer-events-none" />
                    
                    <div className="flex items-center gap-8 relative z-10">
                        <div className="w-16 h-16 rounded-3xl bg-neon-blue/10 flex items-center justify-center text-neon-blue border border-neon-blue/20 shadow-[0_0_30px_rgba(46,191,255,0.2)]">
                            <Mail size={32} />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black font-heading uppercase italic tracking-tighter text-white leading-none">Briefing Engine</h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.6em] text-neon-blue mt-3 opacity-60">High-Fidelity Editorial Synthesis</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-3xl text-gray-500 hover:text-white transition-all relative z-10"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Intelligent Selection Area */}
                <div className="flex-1 overflow-y-auto p-10 md:p-16 custom-scrollbar bg-[#080808]">
                    {availablePosts.length === 0 ? (
                        <div className="text-center py-32">
                            <Zap size={80} className="mx-auto text-white/5 mb-10" />
                            <h3 className="text-2xl font-black font-heading uppercase italic text-gray-600 tracking-tighter">No Active Narratives.</h3>
                            <p className="text-gray-700 text-xs mt-6 max-w-sm mx-auto uppercase tracking-widest font-black">Publish stories in the Content Studio to enable briefing synthesis.</p>
                        </div>
                    ) : (
                        <div className="space-y-16">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="px-4 py-1.5 bg-neon-blue/20 text-neon-blue text-[9px] font-black uppercase tracking-[0.2em] rounded-full border border-neon-blue/30">
                                            Step 01
                                        </div>
                                        <h3 className="text-2xl font-black font-heading uppercase italic text-white tracking-tight">Curation Strategy</h3>
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 max-w-md">Select up to 6 stories. The primary selection becomes the Featured Hero narrative.</p>
                                </div>
                                <div className="px-8 py-4 bg-white/5 border border-white/10 rounded-[2rem] text-white flex items-center gap-4">
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Selected Assets</span>
                                    <span className="text-2xl font-black font-heading text-neon-blue">{selectedPosts.length} <span className="text-sm opacity-20">/ 6</span></span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {availablePosts.map((post) => {
                                    const isSelected = selectedPosts.find(p => p.id === post.id);
                                    const selectionIndex = selectedPosts.findIndex(p => p.id === post.id);
                                    
                                    return (
                                        <motion.div
                                            key={post.id}
                                            whileHover={{ scale: 1.02, y: -5 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => togglePost(post)}
                                            className={cn(
                                                "relative cursor-pointer rounded-[2.5rem] overflow-hidden border transition-all duration-700 group",
                                                isSelected 
                                                    ? "bg-neon-blue/10 border-neon-blue/40 shadow-[0_20px_60px_rgba(46,191,255,0.15)]" 
                                                    : "bg-black/40 border-white/5 hover:border-white/20"
                                            )}
                                        >
                                            <div className="aspect-[16/10] relative">
                                                <img src={post.coverImage} className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all duration-1000" alt="" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-transparent opacity-80" />
                                                
                                                {isSelected && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-neon-blue/20 backdrop-blur-sm transition-all duration-500">
                                                        <div className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center font-black text-2xl shadow-2xl">
                                                            {selectionIndex === 0 ? "★" : selectionIndex + 1}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-8">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-neon-blue">{post.category}</span>
                                                    <div className="w-[1px] h-3 bg-white/10" />
                                                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{new Date(post.publishDate).toLocaleDateString()}</span>
                                                </div>
                                                <h4 className="text-lg font-black font-heading uppercase italic text-white line-clamp-2 leading-[1.1] tracking-tight group-hover:text-neon-blue transition-colors">
                                                    {post.title}
                                                </h4>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Synthesis Control Bar */}
                <div className="p-10 md:p-14 border-t border-white/5 bg-zinc-950 backdrop-blur-3xl flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-neon-pink/5 blur-[100px] -ml-32 -mb-32 rounded-full pointer-events-none" />
                    
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 mb-2">Payload Strategy</span>
                            <div className="flex items-center gap-3">
                                <Layout size={14} className="text-neon-blue" />
                                <span className="text-[11px] font-black uppercase tracking-widest text-white/60">Magazine Framework V1.0</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 relative z-10">
                        <button 
                            onClick={onClose}
                            className="h-16 px-10 border border-white/10 text-white font-black uppercase tracking-[0.3em] text-[10px] rounded-3xl hover:bg-white/5 transition-all"
                        >
                            ABORT
                        </button>
                        <Button 
                            onClick={handleGenerate}
                            disabled={selectedPosts.length === 0 || generating}
                            className="h-16 px-12 bg-white text-black font-black font-heading uppercase tracking-[0.2em] rounded-3xl shadow-[0_20px_50px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:grayscale hover:scale-105 active:scale-95 transition-all flex items-center gap-4"
                        >
                            {generating ? (
                                <div className="w-6 h-6 border-3 border-black border-t-transparent rounded-full animate-spin" />
                            ) : <Sparkles size={20} />}
                            SYNTHESIZE BRIEFING
                        </Button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default WeeklyNewsletterGenerator;
