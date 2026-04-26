import React, { useState } from 'react';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import { motion } from 'framer-motion';

const EXAMPLES = [
  "Concert with Papon in Pune. ₹10L fee, 50% advance. Need exclusivity and force majeure.",
  "Influencer campaign with @creator for 3 Instagram reels. ₹2L total, 30-day exclusivity.",
  "Venue rental agreement for The Lalit, Delhi. 2-day event, ₹5L + GST.",
  "Revenue share deal with DJ Snake — 70/30 split on ticket sales, min guarantee ₹15L."
];

const ContractAIBox = ({ onGenerate, isLoading }) => {
  const [prompt, setPrompt] = useState('');

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/5 via-purple-500/5 to-neon-blue/5 rounded-[2rem] blur-xl" />
      <div className="relative bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl bg-neon-blue/20 flex items-center justify-center"><Sparkles size={16} className="text-neon-blue" /></div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest">AI Contract Generator</p>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Describe your requirement in natural language</p>
          </div>
        </div>
        <div className="relative">
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Describe your contract requirement..."
            rows={3}
            className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 pr-16 text-sm font-medium text-white placeholder:text-gray-600 outline-none focus:border-neon-blue/50 resize-none transition-all"
          />
          <button
            onClick={() => prompt.trim() && onGenerate(prompt)}
            disabled={isLoading || !prompt.trim()}
            className="absolute right-3 bottom-3 w-10 h-10 bg-neon-blue text-black rounded-xl flex items-center justify-center hover:scale-110 transition-all disabled:opacity-30 disabled:hover:scale-100"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {EXAMPLES.map((ex, i) => (
            <button key={i} onClick={() => setPrompt(ex)} className="flex-shrink-0 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-[8px] font-bold text-gray-500 hover:text-white uppercase tracking-wider transition-all">
              {ex.length > 50 ? ex.slice(0, 50) + '...' : ex}
            </button>
          ))}
        </div>
        {isLoading && (
          <div className="flex items-center gap-3 p-3 bg-neon-blue/5 border border-neon-blue/10 rounded-xl">
            <Loader2 size={14} className="text-neon-blue animate-spin" />
            <p className="text-[10px] font-black text-neon-blue uppercase tracking-widest">AI is analyzing your requirement...</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ContractAIBox;
