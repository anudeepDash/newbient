import React, { useState } from 'react';
import { Shield, ChevronDown, ChevronUp, Trash2, GripVertical, Plus, AlertTriangle, Sparkles, RefreshCw } from 'lucide-react';
import AISectionButtons from './AISectionButtons';
import { motion, AnimatePresence } from 'framer-motion';
import { CLAUSE_LIBRARY } from '../../services/clauseLibrary';
import { cn } from '../../lib/utils';
import StudioRichEditor from '../ui/StudioRichEditor';

const STRICTNESS_COLORS = {
  low: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  high: 'bg-red-500/10 text-red-500 border-red-500/20'
};

const ClauseMarketplace = ({ activeClauses, onToggleClause, onUpdateClause, onRemoveClause, onAddCustom, onImproveClause, onRegenerateClause, isAILoading }) => {
  const [expanded, setExpanded] = useState(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customContent, setCustomContent] = useState('');
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);

  const handleDragStart = (e, idx) => { setDragIdx(idx); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e, idx) => { e.preventDefault(); if (dragIdx === null || dragIdx === idx) return; };
  const handleDrop = (e, targetIdx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === targetIdx) return;
    const reordered = [...activeClauses];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    onToggleClause(null, null, reordered);
    setDragIdx(null);
  };

  const libraryNotActive = CLAUSE_LIBRARY.filter(lc => !activeClauses.find(ac => ac.id === lc.id));

  return (
    <div className="space-y-6">
      {/* Active Clauses */}
      <div className="space-y-3">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Shield size={12} /> Active Clauses ({activeClauses.length})</p>
        {activeClauses.map((clause, idx) => (
          <motion.div key={clause.id} layout draggable onDragStart={e => handleDragStart(e, idx)} onDragOver={e => handleDragOver(e, idx)} onDrop={e => handleDrop(e, idx)}
            className="bg-black/30 border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all group">
            <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpanded(expanded === clause.id ? null : clause.id)}>
              <GripVertical size={14} className="text-gray-700 cursor-grab flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black uppercase tracking-widest truncate">{clause.title}</p>
                <p className="text-[8px] text-gray-600 font-bold uppercase">{clause.category || 'standard'}</p>
              </div>
              {/* Strictness toggle */}
              {clause.levels && (
                <div className="flex gap-1">
                  {['low', 'medium', 'high'].map(level => (
                    <button key={level} onClick={e => { e.stopPropagation(); onUpdateClause(clause.id, { strictness: level, content: clause.levels[level] }); }}
                      className={cn("px-2 py-0.5 rounded-md text-[7px] font-black uppercase border transition-all", clause.strictness === level ? STRICTNESS_COLORS[level] : 'border-transparent text-gray-700 hover:text-gray-400')}>
                      {level[0].toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <AISectionButtons 
                  onImprove={() => onImproveClause?.(clause.id)}
                  onRegenerate={() => onRegenerateClause?.(clause.id)}
                  isProcessing={isAILoading}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                />
                <button onClick={e => { e.stopPropagation(); onRemoveClause(clause.id); }} className="p-1.5 text-gray-700 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
              </div>
              {expanded === clause.id ? <ChevronUp size={14} className="text-gray-600" /> : <ChevronDown size={14} className="text-gray-600" />}
            </div>
            <AnimatePresence>
              {expanded === clause.id && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="px-4 pb-4 space-y-3">
                    <StudioRichEditor 
                      value={clause.content || ''} 
                      onChange={val => onUpdateClause(clause.id, { content: val })}
                      minHeight="100px"
                      className="bg-black/20"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Clause Library */}
      {libraryNotActive.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">+ Add from Library</p>
          <div className="grid grid-cols-2 gap-2">
            {libraryNotActive.map(lc => (
              <button key={lc.id} onClick={() => onToggleClause(lc.id, 'add')}
                className="p-3 bg-white/[0.02] hover:bg-white/5 border border-white/5 rounded-xl text-left group transition-all">
                <p className="text-[9px] font-black uppercase tracking-widest group-hover:text-purple-500 transition-colors">{lc.title}</p>
                <p className="text-[7px] text-gray-700 font-bold uppercase mt-0.5">{lc.category}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Clause */}
      <div className="space-y-3">
        {!showAddCustom ? (
          <button onClick={() => setShowAddCustom(true)} className="w-full p-4 border-2 border-dashed border-white/5 hover:border-purple-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-purple-500 flex items-center justify-center gap-2 transition-all">
            <Plus size={14} /> Add Custom Clause
          </button>
        ) : (
          <div className="p-4 bg-black/30 border border-white/10 rounded-2xl space-y-3">
            <input value={customTitle} onChange={e => setCustomTitle(e.target.value)} placeholder="Clause Title" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest outline-none placeholder:text-gray-700 focus:border-purple-500/30" />
            <StudioRichEditor 
              value={customContent} 
              onChange={val => setCustomContent(val)} 
              placeholder="Clause content..." 
              minHeight="120px"
              className="bg-black/20"
            />
            <div className="flex gap-2">
              <button onClick={() => { if (customTitle.trim()) { onAddCustom(customTitle, customContent); setCustomTitle(''); setCustomContent(''); setShowAddCustom(false); } }}
                className="px-4 py-2 bg-purple-500 text-black text-[9px] font-black uppercase rounded-lg">Add</button>
              <button onClick={() => setShowAddCustom(false)} className="px-4 py-2 bg-white/5 text-[9px] font-black uppercase rounded-lg text-gray-500">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClauseMarketplace;
