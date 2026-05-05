import React from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';

const AISectionButtons = ({ onImprove, onRegenerate, isProcessing, className }) => {
    return (
        <div className={cn("flex items-center gap-2", className)}>
            <button 
                onClick={onImprove}
                disabled={isProcessing}
                className="group flex items-center gap-2 px-3 py-1.5 rounded-lg border border-purple-500/20 bg-purple-500/5 text-purple-500 hover:bg-purple-500 hover:text-black transition-all disabled:opacity-50"
                title="Improve with AI"
            >
                {isProcessing ? <RefreshCw size={10} className="animate-spin" /> : <Sparkles size={10} />}
                <span className="text-[8px] font-black uppercase tracking-widest hidden group-hover:inline">Improve</span>
            </button>
            <button 
                onClick={onRegenerate}
                disabled={isProcessing}
                className="group flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-gray-500 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
                title="Regenerate Section"
            >
                {isProcessing ? <RefreshCw size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                <span className="text-[8px] font-black uppercase tracking-widest hidden group-hover:inline">Regenerate</span>
            </button>
        </div>
    );
};

export default AISectionButtons;
