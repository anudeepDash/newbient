import React from 'react';
import { cn } from '../../lib/utils';

const ToneSwitch = ({ value, onChange }) => {
    const tones = [
        { id: 'Premium', label: 'Premium', desc: 'Luxury & Sophisticated' },
        { id: 'Aggressive', label: 'Aggressive', desc: 'High Impact & Sales Driven' },
        { id: 'Minimal', label: 'Minimal', desc: 'Clean & Direct' }
    ];

    return (
        <div className="flex flex-col gap-4">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Voice & Tone</label>
            <div className="grid grid-cols-3 gap-2 bg-zinc-900/40 p-1.5 rounded-2xl border border-white/5">
                {tones.map(tone => (
                    <button 
                        key={tone.id} 
                        onClick={() => onChange(tone.id)}
                        className={cn(
                            "flex flex-col items-center justify-center py-3 rounded-xl transition-all relative group",
                            value === tone.id ? "bg-white text-black shadow-lg" : "text-gray-500 hover:text-white"
                        )}
                    >
                        <span className="text-[9px] font-black uppercase tracking-widest">{tone.label}</span>
                        <span className={cn("text-[6px] font-bold uppercase tracking-tighter mt-1 opacity-60", value === tone.id ? "text-black" : "text-gray-600")}>{tone.desc}</span>
                        {value === tone.id && (
                            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-neon-green shadow-[0_0_8px_#39FF14]" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ToneSwitch;
