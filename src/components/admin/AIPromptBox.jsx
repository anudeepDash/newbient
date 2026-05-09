import React, { useState, useRef, useEffect } from 'react';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Shield from 'lucide-react/dist/esm/icons/shield';
import X from 'lucide-react/dist/esm/icons/x';
import Cpu from 'lucide-react/dist/esm/icons/cpu';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import Lightbulb from 'lucide-react/dist/esm/icons/lightbulb';
import Wand2 from 'lucide-react/dist/esm/icons/wand-2';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Smart prompt suggestions per document type
const SUGGESTIONS = {
    proposal: [
        "Event production proposal for a 2-day music festival, including stage, sound, and lighting setup",
        "Artist logistics and hospitality proposal for a multi-city stand-up comedy tour",
        "Proposal for 50 event volunteers and site management for a corporate marathon",
        "Strategic event consultation for a brand's 10th-anniversary gala dinner",
        "Complete digital marketing and social media coverage for a product launch event",
        "Technical production and stage management proposal for a TEDx event",
    ],
    contract: [
        "Draft a service contract for social media management services for 12 months, ₹50,000 total value",
        "Create an NDA and service contract for a brand collaboration with Sunrise Studios",
        "Generate an MOU for a joint venture between Newbi Entertainment and a production house",
        "Write a freelancer contract for video editing services, 6-month engagement",
        "Draft a content licensing contract for YouTube channel management",
    ],
    invoice: [
        "Create an invoice for 3 months of social media management at ₹15,000/month for Karma Foods",
        "Generate an invoice for a completed video production project worth ₹75,000",
        "Draft an invoice for event management services for a corporate annual day",
    ],
    form: [
        "Create a volunteer registration form for our upcoming community event in Bangalore",
        "Design an internship application form for content creation roles at Newbi",
        "Make a feedback survey form for post-event attendee experience",
        "Build a casting call form for models and actors for a brand shoot",
        "Create a workshop registration form for a social media masterclass",
    ],
    document: [
        "Generate a professional business document based on your requirements",
    ]
};

// Generation stage messages
const STAGE_MESSAGES = [
    { icon: Cpu, text: "Analyzing your requirements...", color: "text-purple-400" },
    { icon: Wand2, text: "Crafting document structure...", color: "text-blue-400" },
    { icon: Sparkles, text: "Generating premium content...", color: "text-neon-green" },
    { icon: CheckCircle2, text: "Finalizing & polishing...", color: "text-emerald-400" },
];

const AIPromptBox = ({ onGenerate, isGenerating, type = 'document', forceClear = false }) => {
    const [prompt, setPrompt] = useState('');
    const [error, setError] = useState(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [stage, setStage] = useState(0);
    const [suggestionCategory, setSuggestionCategory] = useState(0);
    const [generationTime, setGenerationTime] = useState(0);
    const textareaRef = useRef(null);
    const timerRef = useRef(null);
    const stageRef = useRef(null);

    // Cycle through stages during generation
    useEffect(() => {
        if (isGenerating) {
            setStage(0);
            setGenerationTime(0);
            
            timerRef.current = setInterval(() => {
                setGenerationTime(prev => prev + 1);
            }, 1000);

            stageRef.current = setInterval(() => {
                setStage(prev => Math.min(prev + 1, STAGE_MESSAGES.length - 1));
            }, 4000);
        } else {
            clearInterval(timerRef.current);
            clearInterval(stageRef.current);
            setStage(0);
            setGenerationTime(0);
        }
        return () => {
            clearInterval(timerRef.current);
            clearInterval(stageRef.current);
        };
    }, [isGenerating]);

    // Auto-resize textarea and handle forceClear
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [prompt]);

    useEffect(() => {
        if (forceClear) {
            setPrompt('');
        }
    }, [forceClear]);

    const handleSubmit = async () => {
        if (!prompt.trim() || isGenerating) return;
        setError(null);
        setShowSuggestions(false);
        try {
            await onGenerate(prompt);
            // Prompt persistence: Removed automatic clearing
        } catch (err) {
            setError(err.message);
        }
    };

    const useSuggestion = (suggestion) => {
        setPrompt(suggestion);
        setShowSuggestions(false);
        if (textareaRef.current) {
            textareaRef.current.focus();
            // Auto-resize
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    };

    const suggestions = SUGGESTIONS[type] || SUGGESTIONS.document;
    const currentStage = STAGE_MESSAGES[stage];
    const StageIcon = currentStage?.icon || Zap;

    const accentColorMap = { proposal: 'neon-green', contract: 'neon-purple', invoice: 'neon-blue', form: 'neon-pink' };
    const accentColor = accentColorMap[type] || 'neon-green';
    const accentMap = {
        'neon-green': { bg: 'bg-[#39FF14]', text: 'text-[#39FF14]', shadow: 'shadow-[0_5px_15px_rgba(57,255,20,0.4)]', glow: 'shadow-[0_0_20px_rgba(57,255,20,0.4)]', border: 'border-[#39FF14]/20', bgLight: 'bg-[#39FF14]/10' },
        'neon-blue': { bg: 'bg-[#00F0FF]', text: 'text-[#00F0FF]', shadow: 'shadow-[0_5px_15px_rgba(0,240,255,0.4)]', glow: 'shadow-[0_0_20px_rgba(0,240,255,0.4)]', border: 'border-[#00F0FF]/20', bgLight: 'bg-[#00F0FF]/10' },
        'neon-pink': { bg: 'bg-[#FF4F8B]', text: 'text-[#FF4F8B]', shadow: 'shadow-[0_5px_15px_rgba(255,79,139,0.4)]', glow: 'shadow-[0_0_20px_rgba(255,79,139,0.4)]', border: 'border-[#FF4F8B]/20', bgLight: 'bg-[#FF4F8B]/10' },
        'neon-purple': { bg: 'bg-[#A855F7]', text: 'text-[#A855F7]', shadow: 'shadow-[0_5px_15px_rgba(168,85,247,0.4)]', glow: 'shadow-[0_0_20px_rgba(168,85,247,0.4)]', border: 'border-[#A855F7]/20', bgLight: 'bg-[#A855F7]/10' },
    };
    const accent = accentMap[accentColor] || accentMap['neon-green'];

    return (
        <div className="relative group mb-12">
            {/* Orbital Glow */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-green/15 via-neon-blue/20 to-purple-500/15 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
            
            <div className={cn(
                "relative bg-[#0A0A0A] border border-white/[0.06] rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col transition-all group-hover:border-white/[0.12]",
                error && "border-red-500/30",
                isGenerating && `${accent.border} border-opacity-50`
            )}>
                {/* Main Input Area */}
                <div className="flex items-center gap-3 p-3 pl-5">
                    <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 relative overflow-hidden", 
                        isGenerating ? `${accent.bg} text-black animate-pulse ${accent.glow}` : `bg-white/[0.04] ${accent.text} border border-white/[0.06]`
                    )}>
                        <Zap size={18} fill={isGenerating ? "currentColor" : "none"} className="relative z-10" />
                        {isGenerating && <div className="absolute inset-0 bg-white/20 animate-ping rounded-xl" />}
                    </div>
                    
                    <div className="flex-1 min-w-0 relative">
                        <textarea 
                            ref={textareaRef}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onFocus={() => !prompt.trim() && setShowSuggestions(true)}
                            placeholder={`Describe the ${type} you need — be specific for best results...`}
                            className="w-full bg-transparent border-none text-[14px] font-medium text-white placeholder:text-zinc-600 outline-none min-h-[40px] py-2.5 resize-none leading-relaxed"
                            disabled={isGenerating}
                            rows={1}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                                if (e.key === 'Escape') {
                                    setShowSuggestions(false);
                                }
                            }}
                        />
                        {prompt && !isGenerating && (
                            <button 
                                onClick={() => setPrompt('')}
                                className="absolute right-0 top-3 p-1 text-zinc-600 hover:text-white transition-colors"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 pr-1">
                        {/* Suggestion toggle */}
                        <button 
                            onClick={() => setShowSuggestions(!showSuggestions)}
                            className={cn(
                                "h-10 w-10 rounded-xl flex items-center justify-center transition-all border",
                                showSuggestions ? `${accent.bgLight} ${accent.border} ${accent.text}` : "bg-white/[0.03] border-white/[0.06] text-zinc-500 hover:text-white hover:bg-white/[0.06]"
                            )}
                            disabled={isGenerating}
                            title="Show prompt suggestions"
                        >
                            <Lightbulb size={16} />
                        </button>

                        {/* Generate button */}
                        <button 
                            onClick={handleSubmit}
                            disabled={!prompt.trim() || isGenerating}
                            className={cn(
                                "h-10 px-5 rounded-xl font-black uppercase tracking-tighter text-[10px] transition-all flex items-center gap-2 overflow-hidden relative shrink-0",
                                isGenerating 
                                    ? "bg-white/5 text-zinc-500 cursor-wait" 
                                    : `${accent.bg} text-black hover:scale-[1.03] active:scale-95 ${accent.shadow} disabled:opacity-30 disabled:scale-100 disabled:cursor-not-allowed`
                            )}
                        >
                            <AnimatePresence mode="wait">
                                {isGenerating ? (
                                    <motion.div 
                                        key="loading"
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -5 }}
                                        className="flex items-center gap-2"
                                    >
                                        <RefreshCw size={13} className="animate-spin" />
                                        <span>{generationTime}s</span>
                                    </motion.div>
                                ) : (
                                    <motion.div 
                                        key="static"
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -5 }}
                                        className="flex items-center gap-2"
                                    >
                                        <Sparkles size={13} />
                                        <span>Generate</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </button>
                    </div>
                </div>

                {/* Generation Progress */}
                <AnimatePresence>
                    {isGenerating && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="mx-4 mb-3 p-3 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                                <div className="flex items-center gap-3">
                                    <motion.div 
                                        key={stage}
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className={cn("w-7 h-7 rounded-lg flex items-center justify-center", accent.bgLight)}
                                    >
                                        <StageIcon size={14} className={currentStage.color} />
                                    </motion.div>
                                    <motion.span 
                                        key={stage + '-text'}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className={cn("text-[11px] font-bold tracking-wide", currentStage.color)}
                                    >
                                        {currentStage.text}
                                    </motion.span>
                                    <div className="ml-auto flex gap-1">
                                        {STAGE_MESSAGES.map((_, i) => (
                                            <div key={i} className={cn(
                                                "w-1.5 h-1.5 rounded-full transition-all duration-500",
                                                i <= stage ? accent.bg : "bg-white/10"
                                            )} />
                                        ))}
                                    </div>
                                </div>
                                {/* Progress bar */}
                                <div className="mt-2 h-0.5 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div 
                                        className={cn("h-full rounded-full", accent.bg)}
                                        initial={{ width: '0%' }}
                                        animate={{ width: `${Math.min(95, (stage + 1) / STAGE_MESSAGES.length * 100)}%` }}
                                        transition={{ duration: 1, ease: 'easeOut' }}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Suggestions Dropdown */}
                <AnimatePresence>
                    {showSuggestions && !isGenerating && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="mx-4 mb-3 p-1 bg-white/[0.02] rounded-2xl border border-white/[0.04]">
                                <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
                                    <div className={cn("flex items-center gap-2", accent.text)}>
                                        <Lightbulb size={14} className="animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Inspiration</span>
                                    </div>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSuggestionCategory(prev => (prev + 1) % 3);
                                        }}
                                        className="p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-all"
                                    >
                                        <RefreshCw size={12} className={cn(suggestionCategory > 0 && "rotate-180 transition-transform")} />
                                    </button>
                                </div>
                                <div className="space-y-0.5 max-h-[200px] overflow-y-auto scrollbar-hide">
                                    {suggestions.filter((_, i) => (i % 3) === suggestionCategory).map((s, i) => (
                                        <button
                                            key={i}
                                            onClick={() => useSuggestion(s)}
                                            className="w-full flex items-start text-left px-4 py-2.5 rounded-xl text-[12px] font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all leading-relaxed group/s gap-3"
                                        >
                                            <span className={cn("opacity-0 group-hover/s:opacity-100 transition-opacity shrink-0", accent.text)}>→</span>
                                            <span className="flex-1">{s}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Error Notification */}
                <AnimatePresence>
                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="mx-4 mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                                        <Shield size={12} />
                                    </div>
                                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider leading-relaxed break-words">{error}</span>
                                </div>
                                <button onClick={() => setError(null)} className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 transition-colors shrink-0">
                                    <X size={14} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            {/* Status Bar */}
            <div className="mt-4 flex items-center gap-4 px-6">
                <div className="flex items-center gap-2">
                    <div className="relative flex h-2 w-2 items-center justify-center">
                        <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", accent.bg)}></span>
                        <span className={cn("relative inline-flex rounded-full h-1.5 w-1.5", accent.bg, accent.glow)}></span>
                    </div>
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em]">Newbi Agent Active</span>
                </div>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-white/[0.05] via-white/[0.08] to-transparent" />
            </div>
        </div>
    );
};

export default AIPromptBox;
