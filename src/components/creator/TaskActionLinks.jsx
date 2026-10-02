import React, { useState } from 'react';
import { 
    ExternalLink, 
    Copy, 
    Check, 
    Ticket, 
    Instagram, 
    Sparkles, 
    Download, 
    Globe,
    FileText,
    Lock,
    ArrowRight
} from 'lucide-react';
import { extractTaskActionLinks } from '../../lib/taskLinks';
import { cn } from '../../lib/utils';

export const TaskActionLinks = ({ 
    task, 
    links = null, 
    className = '' 
}) => {
    const actionLinks = links || extractTaskActionLinks(task);
    const [copiedIndex, setCopiedIndex] = useState(null);

    if (!actionLinks || actionLinks.length === 0) return null;

    const handleCopy = (e, url, idx) => {
        e.stopPropagation();
        e.preventDefault();
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url);
            setCopiedIndex(idx);
            setTimeout(() => setCopiedIndex(null), 2200);
        }
    };

    return (
        <div className={cn("mt-2.5 space-y-2", className)} onClick={e => e.stopPropagation()}>
            {actionLinks.map((item, idx) => {
                const isCopied = copiedIndex === idx;
                const isGoogleForm = item.type === 'google_form';
                const isTicket = item.type === 'ticket';
                const isInstagram = item.type === 'repost';
                const isCreative = item.type === 'creative';

                const Icon = isGoogleForm ? FileText :
                             isTicket ? Ticket :
                             isInstagram ? Instagram :
                             isCreative ? Download : Globe;

                return (
                    <div
                        key={idx}
                        className={cn(
                            "flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-xl border transition-all shadow-xs",
                            isGoogleForm
                                ? "bg-gradient-to-r from-purple-500/[0.1] via-indigo-500/[0.08] to-purple-500/[0.04] dark:from-purple-500/[0.18] dark:via-indigo-500/[0.12] dark:to-purple-500/[0.06] border-purple-500/40 dark:border-purple-400/50 shadow-md ring-1 ring-purple-500/25"
                                : isTicket 
                                ? "bg-emerald-500/[0.04] dark:bg-neon-green/[0.04] border-emerald-500/25 dark:border-neon-green/30" 
                                : isInstagram 
                                ? "bg-purple-500/[0.04] dark:bg-purple-500/[0.06] border-purple-500/25 dark:border-purple-500/30" 
                                : isCreative 
                                ? "bg-blue-500/[0.04] dark:bg-blue-500/[0.06] border-blue-500/25 dark:border-blue-500/30" 
                                : "bg-black/[0.02] dark:bg-white/[0.03] border-black/10 dark:border-white/10"
                        )}
                    >
                        {/* Left: Icon + Custom Text / Label + Domain */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-xs",
                                isGoogleForm ? "bg-purple-500/20 text-purple-600 dark:text-purple-300 ring-1 ring-purple-500/30" :
                                isTicket ? "bg-emerald-500/15 text-emerald-600 dark:text-neon-green" :
                                isInstagram ? "bg-purple-500/15 text-purple-600 dark:text-purple-400" :
                                isCreative ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" :
                                "bg-black/5 dark:bg-white/10 text-gray-500 dark:text-zinc-400"
                            )}>
                                <Icon size={15} />
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="font-bold text-xs sm:text-[13px] text-gray-900 dark:text-white leading-tight truncate">
                                        {item.label}
                                    </p>
                                    {isGoogleForm ? (
                                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25 shrink-0">
                                            Google Form · File Upload
                                        </span>
                                    ) : item.badge && (
                                        <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/10 text-gray-500 dark:text-zinc-400 shrink-0">
                                            {item.badge}
                                        </span>
                                    )}
                                </div>
                                <p className="text-[10px] font-mono text-gray-400 dark:text-zinc-500 truncate mt-0.5">
                                    {isGoogleForm ? `Opens in new tab • ${item.domain}` : item.domain}
                                </p>
                            </div>
                        </div>

                        {/* Right: Direct Tap Buttons (Mobile Thumb Friendly) */}
                        <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto">
                            {/* Copy button */}
                            <button
                                type="button"
                                onClick={(e) => handleCopy(e, item.url, idx)}
                                className={cn(
                                    "flex-1 sm:flex-none h-8 px-2.5 rounded-lg font-mono text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-95 border",
                                    isCopied
                                        ? "bg-emerald-500 dark:bg-neon-green text-white dark:text-black border-emerald-500 dark:border-neon-green shadow-xs"
                                        : "bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-200 border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10"
                                )}
                                title="Copy link to clipboard"
                            >
                                {isCopied ? (
                                    <>
                                        <Check size={12} className="stroke-[3]" />
                                        <span className="text-[11px]">COPIED</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy size={12} />
                                        <span className="text-[11px]">COPY</span>
                                    </>
                                )}
                            </button>

                            {/* Open button (opens in new tab) */}
                            <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className={cn(
                                    "flex-1 sm:flex-none h-8 px-3.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs font-mono uppercase tracking-wider",
                                    isGoogleForm
                                        ? "bg-purple-600 hover:bg-purple-500 text-white font-extrabold shadow-sm"
                                        : isTicket 
                                        ? "bg-emerald-600 hover:bg-emerald-500 dark:bg-neon-green dark:hover:bg-emerald-400 text-white dark:text-black font-extrabold" 
                                        : isInstagram 
                                        ? "bg-purple-600 hover:bg-purple-500 text-white" 
                                        : isCreative 
                                        ? "bg-blue-600 hover:bg-blue-500 text-white" 
                                        : "bg-gray-900 text-white dark:bg-white dark:text-black hover:opacity-90"
                                )}
                            >
                                <span>{isGoogleForm ? 'OPEN FORM' : isTicket ? 'OPEN TICKET' : isInstagram ? 'VIEW POST' : isCreative ? 'OPEN ASSET' : 'OPEN LINK'}</span>
                                <ExternalLink size={11} />
                            </a>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default TaskActionLinks;
