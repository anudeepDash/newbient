import React from 'react';
import { motion } from 'framer-motion';
import { Monitor, Smartphone, Mail, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';

const MailPreview = ({ data }) => {
    const [view, setView] = React.useState('desktop');
    const isDark = data.theme === 'dark';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between bg-zinc-900/60 p-4 rounded-2xl border border-white/5 backdrop-blur-xl">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-2">
                    <Mail size={14} className="text-neon-green" /> LIVE_RENDER_FEED
                </h3>
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                    <button 
                        onClick={() => setView('desktop')}
                        className={cn("p-2 rounded-lg transition-all", view === 'desktop' ? "bg-white text-black" : "text-gray-500 hover:text-white")}
                    >
                        <Monitor size={14} />
                    </button>
                    <button 
                        onClick={() => setView('mobile')}
                        className={cn("p-2 rounded-lg transition-all", view === 'mobile' ? "bg-white text-black" : "text-gray-500 hover:text-white")}
                    >
                        <Smartphone size={14} />
                    </button>
                </div>
            </div>

            <div className={cn(
                "mx-auto bg-black border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.5)] transition-all duration-500",
                view === 'desktop' ? "w-full min-h-[600px]" : "w-[360px] min-h-[600px]"
            )}>
                {/* Email Content Frame */}
                <div className={cn(
                    "font-sans overflow-y-auto max-h-[700px] custom-scrollbar transition-colors duration-500",
                    isDark ? "bg-[#0a0a0a] text-white" : "bg-[#ffffff] text-black"
                )}>
                    {/* Header/Logo */}
                    <div className={cn(
                        "p-8 text-left border-b transition-colors",
                        isDark ? "border-white/5 bg-gradient-to-b from-black to-transparent" : "border-black/5 bg-gradient-to-b from-gray-50 to-transparent"
                    )}>
                        <div className="inline-block relative">
                            <img 
                                src={isDark ? "/logo_full.png" : "/logo_document.png"} 
                                alt="Newbi Ent" 
                                className="h-6 w-auto object-contain relative z-10" 
                            />
                            {isDark && <div className="absolute inset-0 bg-neon-green/20 blur-xl rounded-full" />}
                        </div>
                    </div>

                    {/* Hero Image */}
                    {data.heroImage && (
                        <div className="relative aspect-video w-full overflow-hidden">
                            <img src={data.heroImage} alt="Hero" className="w-full h-full object-cover" />
                            <div className={cn(
                                "absolute inset-0 bg-gradient-to-t from-transparent via-transparent",
                                isDark ? "to-[#0a0a0a]" : "to-white"
                            )} />
                        </div>
                    )}

                    {/* Body Content */}
                    <div className="p-8 md:p-12 space-y-8 text-left">
                        <div className="space-y-4">
                            <h2 className={cn(
                                "text-3xl md:text-4xl font-black uppercase tracking-tighter leading-[1.1] italic break-words overflow-wrap-anywhere",
                                isDark ? "text-white" : "text-black"
                            )}>
                                {data.headerText || "YOUR_HEADER_HERE"}
                            </h2>
                            <div className="w-12 h-1 rounded-full" style={{ backgroundColor: '#39FF14' }} />
                        </div>

                        <div 
                            className={cn(
                                "text-sm md:text-base leading-relaxed font-medium prose max-w-none prose-sm break-words",
                                isDark ? "text-gray-400 prose-invert" : "text-gray-600 prose-zinc"
                            )}
                            style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                            dangerouslySetInnerHTML={{ 
                                __html: data.messageBody || "Draft your message payload to the tribe. This area supports multi-line text and structured communication formats." 
                            }}
                        />

                        {data.ctaText && (
                            <div className="pt-4">
                                <a 
                                    href={data.ctaUrl || "#"}
                                    className="inline-flex items-center gap-3 px-8 py-4 text-black font-black uppercase text-xs tracking-widest rounded-xl hover:scale-105 transition-all shadow-lg"
                                    style={{ 
                                        backgroundColor: '#39FF14',
                                        boxShadow: `0 10px 30px rgba(57, 255, 20, 0.3)`
                                    }}
                                >
                                    {data.ctaText} <ExternalLink size={14} />
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className={cn(
                        "p-12 border-t text-center space-y-6 transition-colors",
                        isDark ? "bg-black border-white/5" : "bg-gray-50 border-black/5"
                    )}>
                        <div className="flex justify-center gap-6">
                            {/* Social Icons */}
                            {['instagram-new.png', 'linkedin.png', 'domain.png'].map((icon, idx) => (
                                <div key={idx} className="w-8 h-8 rounded-full border border-gray-500/20 flex items-center justify-center">
                                    <img 
                                        src={`https://img.icons8.com/material-outlined/48/${icon}`} 
                                        className={cn("w-4 h-4 opacity-50", isDark && "invert")} 
                                        alt="social"
                                    />
                                </div>
                            ))}
                        </div>
                        <p className={cn(
                            "text-[10px] font-black uppercase tracking-[0.2em]",
                            isDark ? "text-gray-600" : "text-gray-400"
                        )}>
                            © {new Date().getFullYear()} NEWBI ENT. ALL RIGHTS RESERVED.
                        </p>
                        <p className={cn(
                            "text-[8px] font-bold uppercase tracking-widest max-w-[200px] mx-auto leading-relaxed",
                            isDark ? "text-gray-700" : "text-gray-500"
                        )}>
                            YOU ARE RECEIVING THIS BECAUSE YOU ARE PART OF THE TRIBE INFRASTRUCTURE.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MailPreview;
