import React, { useState } from 'react';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import GripVertical from 'lucide-react/dist/esm/icons/grip-vertical';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import DocumentSeal from '../ui/DocumentSeal';

// ── Reusable Toggle Switch Component ─────────────────────────────────────────
export function ToggleSwitch({ label, checked, onChange, description, accentColor = 'neon-green' }) {
    return (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 transition-colors">
            <div className="pr-4">
                <p className="text-[11px] font-black uppercase tracking-wider text-gray-900 dark:text-white leading-tight">
                    {label}
                </p>
                {description && (
                    <p className="text-[9px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                        {description}
                    </p>
                )}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={cn(
                    "w-12 h-6 rounded-full transition-all relative p-0.5 shrink-0 cursor-pointer shadow-inner",
                    checked ? "bg-[#16A34A]" : "bg-gray-300 dark:bg-zinc-700"
                )}
            >
                <div
                    className={cn(
                        "w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200",
                        checked ? "translate-x-6" : "translate-x-0"
                    )}
                />
            </button>
        </div>
    );
}

// ── 1. COVER PAGE & INDEX EDITOR ─────────────────────────────────────────────
export function V2CoverEditor({ formData, setFormData, logoOptions = [] }) {
    const whatsInside = formData.whatsInside || [];

    const handleUpdateWhatsInside = (idx, field, value) => {
        const updated = [...whatsInside];
        updated[idx] = { ...updated[idx], [field]: value };
        setFormData({ ...formData, whatsInside: updated });
    };

    const handleAddWhatsInsideItem = () => {
        const nextNum = String(whatsInside.length + 1).padStart(2, '0');
        setFormData({
            ...formData,
            whatsInside: [...whatsInside, { num: nextNum, title: 'New Section' }]
        });
    };

    const handleRemoveWhatsInsideItem = (idx) => {
        const updated = whatsInside.filter((_, i) => i !== idx);
        setFormData({ ...formData, whatsInside: updated });
    };

    return (
        <div className="space-y-8">
            {/* Division Branding */}
            <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">
                    Division Branding & Logo
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {logoOptions.map(logo => (
                        <button
                            key={logo.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, selectedLogo: logo.id })}
                            className={cn(
                                "p-3 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-2 overflow-hidden relative",
                                formData.selectedLogo === logo.id
                                    ? "bg-neon-green/10 border-neon-green text-black dark:text-white shadow-lg"
                                    : "bg-gray-100 dark:bg-zinc-900 border-black/10 dark:border-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            <div className="w-full aspect-[4/3] rounded-xl bg-white flex items-center justify-center p-2 relative overflow-hidden">
                                <img src={logo.path} alt={logo.label} className="w-full h-full object-contain" />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest">{logo.label}</span>
                            {formData.selectedLogo === logo.id && (
                                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Proposal Number & Pill */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">
                        Quotation Number (Fixed on all pages)
                    </label>
                    <input
                        value={formData.proposalNumber || ''}
                        onChange={e => setFormData({ ...formData, proposalNumber: e.target.value })}
                        className="w-full bg-gray-100 dark:bg-zinc-900 border border-black/10 dark:border-white/10 h-14 px-5 rounded-2xl font-mono font-bold text-sm outline-none focus:border-neon-green/40 transition-all"
                        placeholder="NBQ-XXXX"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">
                        Cover Classification
                    </label>
                    <input
                        value={formData.classification || ''}
                        onChange={e => setFormData({ ...formData, classification: e.target.value })}
                        className="w-full bg-gray-100 dark:bg-zinc-900 border border-black/10 dark:border-white/10 h-14 px-5 rounded-2xl font-bold text-sm outline-none focus:border-neon-green/40 transition-all"
                        placeholder="Strategic Commercial"
                    />
                </div>
            </div>

            {/* Top Pill Callout */}
            <div className="space-y-3 p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5">
                <ToggleSwitch
                    label="Official Strategic Quotation Pill"
                    checked={formData.showCoverPill !== false}
                    onChange={v => setFormData({ ...formData, showCoverPill: v })}
                    description="Green pill badge displayed at the top of the cover page"
                />
                {formData.showCoverPill !== false && (
                    <input
                        value={formData.coverPillText || ''}
                        onChange={e => setFormData({ ...formData, coverPillText: e.target.value })}
                        className="w-full bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 h-12 px-4 rounded-xl font-bold text-xs outline-none focus:border-[#16A34A] transition-all"
                        placeholder="OFFICIAL STRATEGIC QUOTATION"
                    />
                )}
            </div>

            {/* Client Entity Metadata */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#16A34A]">
                    Client Entity Specification
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-2">Client Entity Name</label>
                        <input
                            value={formData.clientName || ''}
                            onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                            className="w-full bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 h-12 px-4 rounded-xl font-bold text-sm outline-none focus:border-[#16A34A]"
                            placeholder="e.g. ITW Playworks"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-2">Client Subtitle / Association</label>
                        <input
                            value={formData.clientSubtitle || ''}
                            onChange={e => setFormData({ ...formData, clientSubtitle: e.target.value })}
                            className="w-full bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 h-12 px-4 rounded-xl font-bold text-sm outline-none focus:border-[#16A34A]"
                            placeholder="e.g. In association with Playworx"
                        />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-2">Client Address (Optional)</label>
                    <input
                        value={formData.clientAddress || ''}
                        onChange={e => setFormData({ ...formData, clientAddress: e.target.value })}
                        className="w-full bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 h-12 px-4 rounded-xl font-bold text-sm outline-none focus:border-[#16A34A]"
                        placeholder="Corporate Headquarters address"
                    />
                </div>
            </div>

            {/* Project Specification */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#16A34A]">
                    Project Specification
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-2">Project Specification Title</label>
                        <input
                            value={formData.campaignName || ''}
                            onChange={e => setFormData({ ...formData, campaignName: e.target.value })}
                            className="w-full bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 h-12 px-4 rounded-xl font-bold text-sm outline-none focus:border-[#16A34A]"
                            placeholder="e.g. Sonu Nigam's Revolution"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-2">Tour / Campaign Subtitle</label>
                        <input
                            value={formData.campaignSubtitle || ''}
                            onChange={e => setFormData({ ...formData, campaignSubtitle: e.target.value })}
                            className="w-full bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 h-12 px-4 rounded-xl font-bold text-sm outline-none focus:border-[#16A34A]"
                            placeholder="e.g. India Tour 2026–27"
                        />
                    </div>
                </div>

                <div className="space-y-3 pt-2">
                    <ToggleSwitch
                        label="Project Duration Badge"
                        checked={formData.showDuration !== false}
                        onChange={v => setFormData({ ...formData, showDuration: v })}
                        description="Shows green duration badge e.g. DURATION: OCT '26 – MAR '27"
                    />
                    {formData.showDuration !== false && (
                        <input
                            value={formData.campaignDuration || ''}
                            onChange={e => setFormData({ ...formData, campaignDuration: e.target.value })}
                            className="w-full bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 h-12 px-4 rounded-xl font-bold text-xs outline-none focus:border-[#16A34A]"
                            placeholder="OCT '26 – MAR '27"
                        />
                    )}
                </div>
            </div>

            {/* Intro Paragraph */}
            <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">
                    Cover Page Introduction Paragraph
                </label>
                <textarea
                    rows={4}
                    value={formData.introParagraph || ''}
                    onChange={e => setFormData({ ...formData, introParagraph: e.target.value })}
                    className="w-full bg-gray-100 dark:bg-zinc-900 border border-black/10 dark:border-white/10 p-4 rounded-2xl font-medium text-sm outline-none focus:border-neon-green/40 transition-all leading-relaxed"
                    placeholder="NewBi Entertainment & Marketing LLP is pleased to present this proposal..."
                />
            </div>

            {/* What's Inside 6-Card Grid */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#16A34A]">
                            WHAT'S INSIDE — Card Index Grid
                        </p>
                        <p className="text-[9px] text-gray-500">6 numbered cards displaying proposal table of contents</p>
                    </div>
                    <ToggleSwitch
                        label="Show Grid"
                        checked={formData.showWhatsInside !== false}
                        onChange={v => setFormData({ ...formData, showWhatsInside: v })}
                    />
                </div>

                {formData.showWhatsInside !== false && (
                    <div className="space-y-3 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {whatsInside.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-white dark:bg-zinc-950 p-2.5 rounded-xl border border-black/10 dark:border-white/10">
                                    <input
                                        value={item.num}
                                        onChange={e => handleUpdateWhatsInside(idx, 'num', e.target.value)}
                                        className="w-12 h-9 text-center bg-gray-100 dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-lg font-mono font-bold text-xs"
                                        placeholder="01"
                                    />
                                    <input
                                        value={item.title}
                                        onChange={e => handleUpdateWhatsInside(idx, 'title', e.target.value)}
                                        className="flex-1 h-9 px-3 bg-gray-100 dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-lg font-bold text-xs"
                                        placeholder="Section Title"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveWhatsInsideItem(idx)}
                                        className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleAddWhatsInsideItem}
                            className="text-xs text-neon-green gap-2"
                        >
                            <Plus size={14} /> Add Card Item
                        </Button>
                    </div>
                )}
            </div>

            {/* Prepared For Callout Box */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 space-y-3">
                <ToggleSwitch
                    label="PREPARED FOR Callout Box"
                    checked={formData.showPreparedFor !== false}
                    onChange={v => setFormData({ ...formData, showPreparedFor: v })}
                    description="Green-accented box stating proposal exclusivity and confidentiality"
                />
                {formData.showPreparedFor !== false && (
                    <textarea
                        rows={3}
                        value={formData.preparedForText || ''}
                        onChange={e => setFormData({ ...formData, preparedForText: e.target.value })}
                        className="w-full bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 p-3.5 rounded-xl font-medium text-xs outline-none focus:border-[#16A34A] leading-relaxed"
                        placeholder="This quotation has been prepared exclusively for..."
                    />
                )}
            </div>
        </div>
    );
}

// ── 2. STRATEGY & OBJECTIVES EDITOR ──────────────────────────────────────────
export function V2StrategyEditor({ formData, setFormData }) {
    const executiveParagraphs = formData.executiveParagraphs || [];
    const anchorMarkets = formData.anchorMarkets || [];
    const [newMarketInput, setNewMarketInput] = useState('');

    const handleUpdateParagraph = (idx, text) => {
        const updated = [...executiveParagraphs];
        updated[idx] = text;
        setFormData({ ...formData, executiveParagraphs: updated });
    };

    const handleAddParagraph = () => {
        setFormData({
            ...formData,
            executiveParagraphs: [...executiveParagraphs, '']
        });
    };

    const handleRemoveParagraph = (idx) => {
        const updated = executiveParagraphs.filter((_, i) => i !== idx);
        setFormData({ ...formData, executiveParagraphs: updated });
    };

    const handleAddMarket = (e) => {
        e?.preventDefault();
        const trimmed = newMarketInput.trim();
        if (!trimmed) return;
        if (!anchorMarkets.includes(trimmed)) {
            setFormData({
                ...formData,
                anchorMarkets: [...anchorMarkets, trimmed]
            });
        }
        setNewMarketInput('');
    };

    const handleRemoveMarket = (marketToRemove) => {
        setFormData({
            ...formData,
            anchorMarkets: anchorMarkets.filter(m => m !== marketToRemove)
        });
    };

    return (
        <div className="space-y-8">
            {/* Titles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Section Kicker</label>
                    <input
                        value={formData.strategySub || ''}
                        onChange={e => setFormData({ ...formData, strategySub: e.target.value })}
                        className="w-full bg-gray-100 dark:bg-zinc-900 border border-black/10 dark:border-white/10 h-12 px-4 rounded-xl font-bold text-xs uppercase"
                        placeholder="STRATEGIC OUTLINE"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Section Title</label>
                    <input
                        value={formData.strategyTitle || ''}
                        onChange={e => setFormData({ ...formData, strategyTitle: e.target.value })}
                        className="w-full bg-gray-100 dark:bg-zinc-900 border border-black/10 dark:border-white/10 h-12 px-4 rounded-xl font-bold text-xs"
                        placeholder="Executive Summary"
                    />
                </div>
            </div>

            {/* Executive Summary Body Paragraphs */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#16A34A]">
                            Executive Summary Paragraphs
                        </p>
                        <p className="text-[9px] text-gray-500">Core narrative body paragraphs for Page 2</p>
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleAddParagraph}
                        className="text-xs text-neon-green gap-1"
                    >
                        <Plus size={14} /> Add Paragraph
                    </Button>
                </div>

                <div className="space-y-3">
                    {executiveParagraphs.map((para, idx) => (
                        <div key={idx} className="relative group bg-white dark:bg-zinc-950 p-3 rounded-xl border border-black/10 dark:border-white/10">
                            <div className="flex justify-between items-center pb-2 mb-2 border-b border-black/5 dark:border-white/5">
                                <span className="text-[9px] font-black text-gray-400 uppercase">Paragraph {idx + 1}</span>
                                {executiveParagraphs.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveParagraph(idx)}
                                        className="text-gray-400 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                )}
                            </div>
                            <textarea
                                rows={3}
                                value={para}
                                onChange={e => handleUpdateParagraph(idx, e.target.value)}
                                className="w-full bg-transparent font-medium text-xs outline-none leading-relaxed resize-y"
                                placeholder={`Paragraph ${idx + 1} text...`}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Primary Objective Callout Box */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 space-y-3">
                <ToggleSwitch
                    label="PRIMARY OBJECTIVE Callout Box"
                    checked={formData.showPrimaryObjective !== false}
                    onChange={v => setFormData({ ...formData, showPrimaryObjective: v })}
                    description="Green vertical border callout emphasizing the project's primary goal"
                />
                {formData.showPrimaryObjective !== false && (
                    <div className="space-y-3 pt-2">
                        <input
                            value={formData.primaryObjectiveTitle || ''}
                            onChange={e => setFormData({ ...formData, primaryObjectiveTitle: e.target.value })}
                            className="w-full bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 h-10 px-3 rounded-lg font-bold text-xs"
                            placeholder="PRIMARY OBJECTIVE"
                        />
                        <textarea
                            rows={3}
                            value={formData.primaryObjectiveText || ''}
                            onChange={e => setFormData({ ...formData, primaryObjectiveText: e.target.value })}
                            className="w-full bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 p-3 rounded-lg font-medium text-xs leading-relaxed"
                            placeholder="To build a local fan and audience base..."
                        />
                    </div>
                )}
            </div>

            {/* Key Anchor Markets Grid Box */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 space-y-4">
                <ToggleSwitch
                    label="KEY ANCHOR MARKETS Matrix"
                    checked={formData.showAnchorMarkets !== false}
                    onChange={v => setFormData({ ...formData, showAnchorMarkets: v })}
                    description="3x3 grid showing anchor cities/markets with caption note"
                />

                {formData.showAnchorMarkets !== false && (
                    <div className="space-y-3 pt-2">
                        <input
                            value={formData.anchorMarketsTitle || ''}
                            onChange={e => setFormData({ ...formData, anchorMarketsTitle: e.target.value })}
                            className="w-full bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 h-10 px-3 rounded-lg font-bold text-xs"
                            placeholder="KEY ANCHOR MARKETS"
                        />

                        {/* City Tag Chips */}
                        <div className="flex flex-wrap gap-2 p-3 bg-white dark:bg-zinc-950 rounded-xl border border-black/10 dark:border-white/10">
                            {anchorMarkets.map((city, idx) => (
                                <span
                                    key={idx}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gray-100 dark:bg-zinc-900 text-xs font-bold text-gray-800 dark:text-gray-200 border border-black/5 dark:border-white/5"
                                >
                                    {city}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveMarket(city)}
                                        className="text-gray-400 hover:text-red-400"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>

                        {/* Add City Input */}
                        <div className="flex gap-2">
                            <input
                                value={newMarketInput}
                                onChange={e => setNewMarketInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddMarket(e)}
                                className="flex-1 bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 h-10 px-3 rounded-lg font-bold text-xs"
                                placeholder="Type city and hit Enter (e.g. Pune, Indore, Surat)"
                            />
                            <Button type="button" size="sm" onClick={handleAddMarket} className="bg-neon-green text-black font-bold">
                                Add Market
                            </Button>
                        </div>

                        {/* Caption */}
                        <input
                            value={formData.anchorMarketsCaption || ''}
                            onChange={e => setFormData({ ...formData, anchorMarketsCaption: e.target.value })}
                            className="w-full bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 h-10 px-3 rounded-lg font-medium text-xs text-gray-500"
                            placeholder="These markets anchor the campaign, with promotion extending..."
                        />
                    </div>
                )}
            </div>

            {/* Why This Approach Callout Box */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 space-y-3">
                <ToggleSwitch
                    label="WHY THIS APPROACH Callout Box"
                    checked={formData.showWhyThisApproach !== false}
                    onChange={v => setFormData({ ...formData, showWhyThisApproach: v })}
                    description="Green vertical border callout detailing the strategic rationale"
                />
                {formData.showWhyThisApproach !== false && (
                    <div className="space-y-3 pt-2">
                        <input
                            value={formData.whyThisApproachTitle || ''}
                            onChange={e => setFormData({ ...formData, whyThisApproachTitle: e.target.value })}
                            className="w-full bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 h-10 px-3 rounded-lg font-bold text-xs"
                            placeholder="WHY THIS APPROACH"
                        />
                        <textarea
                            rows={3}
                            value={formData.whyThisApproachText || ''}
                            onChange={e => setFormData({ ...formData, whyThisApproachText: e.target.value })}
                            className="w-full bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 p-3 rounded-lg font-medium text-xs leading-relaxed"
                            placeholder="Audience demographics respond significantly higher to peer-to-peer amplification..."
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

// ── 3. EXECUTION BLUEPRINT EDITOR ────────────────────────────────────────────
export function V2BlueprintEditor({ formData, setFormData }) {
    const blueprintSteps = formData.blueprintSteps || [];

    const handleUpdateStep = (stepIdx, field, value) => {
        const updated = [...blueprintSteps];
        updated[stepIdx] = { ...updated[stepIdx], [field]: value };
        setFormData({ ...formData, blueprintSteps: updated });
    };

    const handleAddStep = () => {
        const nextNum = String(blueprintSteps.length + 1).padStart(2, '0');
        setFormData({
            ...formData,
            blueprintSteps: [
                ...blueprintSteps,
                { number: nextNum, title: 'New Execution Phase', bullets: ['Initial deliverable item'] }
            ]
        });
    };

    const handleRemoveStep = (stepIdx) => {
        const updated = blueprintSteps.filter((_, i) => i !== stepIdx);
        setFormData({ ...formData, blueprintSteps: updated });
    };

    const handleUpdateBullet = (stepIdx, bulletIdx, value) => {
        const updated = [...blueprintSteps];
        const step = { ...updated[stepIdx] };
        const bullets = [...step.bullets];
        bullets[bulletIdx] = value;
        step.bullets = bullets;
        updated[stepIdx] = step;
        setFormData({ ...formData, blueprintSteps: updated });
    };

    const handleAddBullet = (stepIdx) => {
        const updated = [...blueprintSteps];
        const step = { ...updated[stepIdx] };
        step.bullets = [...(step.bullets || []), ''];
        updated[stepIdx] = step;
        setFormData({ ...formData, blueprintSteps: updated });
    };

    const handleRemoveBullet = (stepIdx, bulletIdx) => {
        const updated = [...blueprintSteps];
        const step = { ...updated[stepIdx] };
        step.bullets = step.bullets.filter((_, i) => i !== bulletIdx);
        updated[stepIdx] = step;
        setFormData({ ...formData, blueprintSteps: updated });
    };

    return (
        <div className="space-y-8">
            {/* Headers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Section Kicker</label>
                    <input
                        value={formData.blueprintSub || ''}
                        onChange={e => setFormData({ ...formData, blueprintSub: e.target.value })}
                        className="w-full bg-gray-100 dark:bg-zinc-900 border border-black/10 dark:border-white/10 h-12 px-4 rounded-xl font-bold text-xs uppercase"
                        placeholder="HOW WE'LL EXECUTE"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Section Title</label>
                    <input
                        value={formData.blueprintTitle || ''}
                        onChange={e => setFormData({ ...formData, blueprintTitle: e.target.value })}
                        className="w-full bg-gray-100 dark:bg-zinc-900 border border-black/10 dark:border-white/10 h-12 px-4 rounded-xl font-bold text-xs"
                        placeholder="Process & Execution Blueprint"
                    />
                </div>
            </div>

            <ToggleSwitch
                label="Process & Execution Blueprint (Pages 3 & 4)"
                checked={formData.showBlueprint !== false}
                onChange={v => setFormData({ ...formData, showBlueprint: v })}
                description="Renders steps 1-3 on Page 3 and steps 4-5 on Page 4 with green number badges"
            />

            {/* Steps List */}
            {formData.showBlueprint !== false && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#16A34A]">
                            Execution Blueprint Steps ({blueprintSteps.length} Steps)
                        </p>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleAddStep}
                            className="bg-neon-green text-black font-bold text-xs gap-1"
                        >
                            <Plus size={14} /> Add Step
                        </Button>
                    </div>

                    {blueprintSteps.map((step, stepIdx) => (
                        <div key={stepIdx} className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-[#E8FAF0] border border-[#B8F2D1] text-[#16A34A] flex items-center justify-center font-black text-xs shrink-0">
                                    {step.number || String(stepIdx + 1).padStart(2, '0')}
                                </span>
                                <input
                                    value={step.number || ''}
                                    onChange={e => handleUpdateStep(stepIdx, 'number', e.target.value)}
                                    className="w-14 h-10 text-center bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-lg font-mono font-bold text-xs"
                                    placeholder="01"
                                />
                                <input
                                    value={step.title || ''}
                                    onChange={e => handleUpdateStep(stepIdx, 'title', e.target.value)}
                                    className="flex-1 h-10 px-3 bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-lg font-bold text-xs"
                                    placeholder="Step Title (e.g. Campus & Youth Outreach)"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleRemoveStep(stepIdx)}
                                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            {/* Bullet Items */}
                            <div className="space-y-2 pl-11">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">
                                    Action Items & Deliverables (Green Bullets)
                                </label>
                                {(step.bullets || []).map((bullet, bulletIdx) => (
                                    <div key={bulletIdx} className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-[#16A34A] shrink-0" />
                                        <input
                                            value={bullet}
                                            onChange={e => handleUpdateBullet(stepIdx, bulletIdx, e.target.value)}
                                            className="flex-1 h-9 px-3 bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-lg font-medium text-xs"
                                            placeholder="Detail bullet item..."
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveBullet(stepIdx, bulletIdx)}
                                            className="p-1 text-gray-400 hover:text-red-400"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                ))}
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleAddBullet(stepIdx)}
                                    className="text-xs text-neon-green gap-1 mt-1"
                                >
                                    <Plus size={12} /> Add Bullet
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── 4. DELIVERABLES TABLE EDITOR ─────────────────────────────────────────────
export function V2DeliverablesEditor({ formData, setFormData }) {
    const deliverablesTable = formData.deliverablesTable || [];

    const handleUpdateRow = (idx, field, value) => {
        const updated = [...deliverablesTable];
        updated[idx] = { ...updated[idx], [field]: value };
        setFormData({ ...formData, deliverablesTable: updated });
    };

    const handleAddRow = () => {
        const nextId = deliverablesTable.length + 1;
        setFormData({
            ...formData,
            deliverablesTable: [
                ...deliverablesTable,
                { id: nextId, deliverable: 'New Deliverable', qty: '1 Unit', timeline: 'Pre-Event' }
            ]
        });
    };

    const handleRemoveRow = (idx) => {
        const updated = deliverablesTable.filter((_, i) => i !== idx);
        setFormData({ ...formData, deliverablesTable: updated });
    };

    return (
        <div className="space-y-8">
            {/* Headers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Section Kicker</label>
                    <input
                        value={formData.deliverablesSub || ''}
                        onChange={e => setFormData({ ...formData, deliverablesSub: e.target.value })}
                        className="w-full bg-gray-100 dark:bg-zinc-900 border border-black/10 dark:border-white/10 h-12 px-4 rounded-xl font-bold text-xs uppercase"
                        placeholder="SCOPE SUMMARY"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Section Title</label>
                    <input
                        value={formData.deliverablesTitle || ''}
                        onChange={e => setFormData({ ...formData, deliverablesTitle: e.target.value })}
                        className="w-full bg-gray-100 dark:bg-zinc-900 border border-black/10 dark:border-white/10 h-12 px-4 rounded-xl font-bold text-xs"
                        placeholder="Per City Deliverables"
                    />
                </div>
            </div>

            <ToggleSwitch
                label="Scope Summary / Deliverables Page"
                checked={formData.showDeliverables !== false}
                onChange={v => setFormData({ ...formData, showDeliverables: v })}
                description="Renders the 4-column deliverables table and city note callout box"
            />

            {/* Deliverables Table */}
            {formData.showDeliverables !== false && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#16A34A]">
                            Scope Deliverables Table (4 Columns)
                        </p>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleAddRow}
                            className="bg-neon-green text-black font-bold text-xs gap-1"
                        >
                            <Plus size={14} /> Add Deliverable Row
                        </Button>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-black/10 dark:border-white/10 bg-gray-50 dark:bg-zinc-900/60 text-[9px] font-black uppercase tracking-wider text-gray-500">
                                    <th className="p-3 w-12 text-center">#</th>
                                    <th className="p-3">Deliverable Item</th>
                                    <th className="p-3 w-40">Qty / Unit</th>
                                    <th className="p-3 w-36">Timeline</th>
                                    <th className="p-3 w-12 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                {deliverablesTable.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-zinc-900/30">
                                        <td className="p-2 text-center">
                                            <span className="text-xs font-mono font-bold text-[#16A34A]">{idx + 1}</span>
                                        </td>
                                        <td className="p-2">
                                            <input
                                                value={row.deliverable || ''}
                                                onChange={e => handleUpdateRow(idx, 'deliverable', e.target.value)}
                                                className="w-full h-9 px-2.5 bg-gray-50 dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-lg font-bold text-xs"
                                                placeholder="Deliverable description"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                value={row.qty || ''}
                                                onChange={e => handleUpdateRow(idx, 'qty', e.target.value)}
                                                className="w-full h-9 px-2.5 bg-gray-50 dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-lg font-mono font-bold text-xs"
                                                placeholder="2–3 videos"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                value={row.timeline || ''}
                                                onChange={e => handleUpdateRow(idx, 'timeline', e.target.value)}
                                                className="w-full h-9 px-2.5 bg-gray-50 dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-lg font-mono font-bold text-xs"
                                                placeholder="T-14 to T-7"
                                            />
                                        </td>
                                        <td className="p-2 text-center">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveRow(idx)}
                                                className="p-1 text-gray-400 hover:text-red-400"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Indicative Note */}
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">
                            Table Disclaimer / Indicative Sub-Note
                        </label>
                        <input
                            value={formData.deliverablesIndicativeNote || ''}
                            onChange={e => setFormData({ ...formData, deliverablesIndicativeNote: e.target.value })}
                            className="w-full bg-gray-100 dark:bg-zinc-900 border border-black/10 dark:border-white/10 h-10 px-3 rounded-xl font-medium text-xs text-gray-600 dark:text-gray-300"
                            placeholder="Deliverables listed above are per city. Total scope across 75 cities is scaled accordingly."
                        />
                    </div>
                </div>
            )}

            {/* City Note Callout Box */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 space-y-3">
                <ToggleSwitch
                    label="Primary City / Hub Note Callout Box"
                    checked={formData.showCityNote !== false}
                    onChange={v => setFormData({ ...formData, showCityNote: v })}
                    description="Green-accented callout box for Bengaluru or primary flagship market"
                />
                {formData.showCityNote !== false && (
                    <div className="space-y-3 pt-2">
                        <input
                            value={formData.cityNoteTitle || ''}
                            onChange={e => setFormData({ ...formData, cityNoteTitle: e.target.value })}
                            className="w-full bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 h-10 px-3 rounded-lg font-bold text-xs"
                            placeholder="NOTE ON BENGALURU"
                        />
                        <textarea
                            rows={3}
                            value={formData.cityNoteText || ''}
                            onChange={e => setFormData({ ...formData, cityNoteText: e.target.value })}
                            className="w-full bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 p-3 rounded-lg font-medium text-xs leading-relaxed"
                            placeholder="Bengaluru will receive direct on-ground management from NewBi..."
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

// ── 5. PRICING & COMMERCIALS EDITOR ──────────────────────────────────────────
export function V2PricingEditor({ formData, setFormData }) {
    const pricingTable = formData.pricingTable || [];

    const handleUpdateRow = (idx, field, value) => {
        const updated = [...pricingTable];
        updated[idx] = { ...updated[idx], [field]: value };
        setFormData({ ...formData, pricingTable: updated });
    };

    const handleAddRow = () => {
        const nextId = pricingTable.length + 1;
        setFormData({
            ...formData,
            pricingTable: [
                ...pricingTable,
                { id: nextId, package: 'Standard Package', scope: 'Scope summary description', price: '₹1,50,000 / city' }
            ]
        });
    };

    const handleRemoveRow = (idx) => {
        const updated = pricingTable.filter((_, i) => i !== idx);
        setFormData({ ...formData, pricingTable: updated });
    };

    return (
        <div className="space-y-8">
            {/* Headers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Section Kicker</label>
                    <input
                        value={formData.commercialsSub || ''}
                        onChange={e => setFormData({ ...formData, commercialsSub: e.target.value })}
                        className="w-full bg-gray-100 dark:bg-zinc-900 border border-black/10 dark:border-white/10 h-12 px-4 rounded-xl font-bold text-xs uppercase"
                        placeholder="COMMERCIALS"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Section Title</label>
                    <input
                        value={formData.commercialsTitle || ''}
                        onChange={e => setFormData({ ...formData, commercialsTitle: e.target.value })}
                        className="w-full bg-gray-100 dark:bg-zinc-900 border border-black/10 dark:border-white/10 h-12 px-4 rounded-xl font-bold text-xs"
                        placeholder="04 · Pricing Structure"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Commercials Subtitle</label>
                <input
                    value={formData.commercialsSubtitle || ''}
                    onChange={e => setFormData({ ...formData, commercialsSubtitle: e.target.value })}
                    className="w-full bg-gray-100 dark:bg-zinc-900 border border-black/10 dark:border-white/10 h-12 px-4 rounded-xl font-medium text-xs text-gray-600 dark:text-gray-300"
                    placeholder="Costs are indicative and scalable based on final scope, creator tier mix, and city network."
                />
            </div>

            <ToggleSwitch
                label="Commercials & Pricing Page (Page 6)"
                checked={formData.showCommercials !== false}
                onChange={v => setFormData({ ...formData, showCommercials: v })}
                description="Renders the pricing packages table, What's Included callout, and Payment & Scaling terms"
            />

            {/* Pricing Table */}
            {formData.showCommercials !== false && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#16A34A]">
                            Package Pricing Table (3 Columns)
                        </p>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleAddRow}
                            className="bg-neon-green text-black font-bold text-xs gap-1"
                        >
                            <Plus size={14} /> Add Package Tier
                        </Button>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-black/10 dark:border-white/10 bg-gray-50 dark:bg-zinc-900/60 text-[9px] font-black uppercase tracking-wider text-gray-500">
                                    <th className="p-3 w-48">Package Tier</th>
                                    <th className="p-3">Scope & Inclusions</th>
                                    <th className="p-3 w-44">Indicative Cost</th>
                                    <th className="p-3 w-12 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                {pricingTable.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-zinc-900/30">
                                        <td className="p-2">
                                            <input
                                                value={row.package || ''}
                                                onChange={e => handleUpdateRow(idx, 'package', e.target.value)}
                                                className="w-full h-9 px-2.5 bg-gray-50 dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-lg font-bold text-xs text-[#16A34A]"
                                                placeholder="e.g. Anchor City Package"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                value={row.scope || ''}
                                                onChange={e => handleUpdateRow(idx, 'scope', e.target.value)}
                                                className="w-full h-9 px-2.5 bg-gray-50 dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-lg font-medium text-xs"
                                                placeholder="Scope description..."
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                value={row.price || ''}
                                                onChange={e => handleUpdateRow(idx, 'price', e.target.value)}
                                                className="w-full h-9 px-2.5 bg-gray-50 dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-lg font-mono font-bold text-xs"
                                                placeholder="₹1,50,000 / city"
                                            />
                                        </td>
                                        <td className="p-2 text-center">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveRow(idx)}
                                                className="p-1 text-gray-400 hover:text-red-400"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* What's Included Callout Box */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 space-y-3">
                <ToggleSwitch
                    label="WHAT'S INCLUDED Callout Box"
                    checked={formData.showWhatsIncluded !== false}
                    onChange={v => setFormData({ ...formData, showWhatsIncluded: v })}
                    description="Green-accented box outlining universal package inclusions"
                />
                {formData.showWhatsIncluded !== false && (
                    <div className="space-y-3 pt-2">
                        <input
                            value={formData.whatsIncludedTitle || ''}
                            onChange={e => setFormData({ ...formData, whatsIncludedTitle: e.target.value })}
                            className="w-full bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 h-10 px-3 rounded-lg font-bold text-xs"
                            placeholder="WHAT'S INCLUDED"
                        />
                        <textarea
                            rows={3}
                            value={formData.whatsIncludedText || ''}
                            onChange={e => setFormData({ ...formData, whatsIncludedText: e.target.value })}
                            className="w-full bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 p-3 rounded-lg font-medium text-xs leading-relaxed"
                            placeholder="All pricing packages include creator sourcing and briefing, content review..."
                        />
                    </div>
                )}
            </div>

            {/* Payment & Scaling Callout Box */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 space-y-3">
                <ToggleSwitch
                    label="PAYMENT & SCALING Callout Box"
                    checked={formData.showPaymentScaling !== false}
                    onChange={v => setFormData({ ...formData, showPaymentScaling: v })}
                    description="Green-accented box covering payment milestones and volume discount scaling"
                />
                {formData.showPaymentScaling !== false && (
                    <div className="space-y-3 pt-2">
                        <input
                            value={formData.paymentScalingTitle || ''}
                            onChange={e => setFormData({ ...formData, paymentScalingTitle: e.target.value })}
                            className="w-full bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 h-10 px-3 rounded-lg font-bold text-xs"
                            placeholder="PAYMENT & SCALING"
                        />
                        <textarea
                            rows={3}
                            value={formData.paymentScalingText || ''}
                            onChange={e => setFormData({ ...formData, paymentScalingText: e.target.value })}
                            className="w-full bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 p-3 rounded-lg font-medium text-xs leading-relaxed"
                            placeholder="Payment terms: 50% advance upon contract signing; balance billed against delivery milestones..."
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

// ── 6. CITY DEEP-DIVE EDITOR ─────────────────────────────────────────────────
export function V2DeepDiveEditor({ formData, setFormData }) {
    const deepDiveSubsections = formData.deepDiveSubsections || [];

    const handleUpdateSubsection = (idx, field, value) => {
        const updated = [...deepDiveSubsections];
        updated[idx] = { ...updated[idx], [field]: value };
        setFormData({ ...formData, deepDiveSubsections: updated });
    };

    const handleAddSubsection = () => {
        const nextBadge = `5.${deepDiveSubsections.length + 1}`;
        setFormData({
            ...formData,
            deepDiveSubsections: [
                ...deepDiveSubsections,
                { badge: nextBadge, title: 'New Management Area', bullets: ['Specific operational detail item'] }
            ]
        });
    };

    const handleRemoveSubsection = (idx) => {
        const updated = deepDiveSubsections.filter((_, i) => i !== idx);
        setFormData({ ...formData, deepDiveSubsections: updated });
    };

    const handleUpdateBullet = (subIdx, bulletIdx, value) => {
        const updated = [...deepDiveSubsections];
        const sub = { ...updated[subIdx] };
        const bullets = [...sub.bullets];
        bullets[bulletIdx] = value;
        sub.bullets = bullets;
        updated[subIdx] = sub;
        setFormData({ ...formData, deepDiveSubsections: updated });
    };

    const handleAddBullet = (subIdx) => {
        const updated = [...deepDiveSubsections];
        const sub = { ...updated[subIdx] };
        sub.bullets = [...(sub.bullets || []), ''];
        updated[subIdx] = sub;
        setFormData({ ...formData, deepDiveSubsections: updated });
    };

    const handleRemoveBullet = (subIdx, bulletIdx) => {
        const updated = [...deepDiveSubsections];
        const sub = { ...updated[subIdx] };
        sub.bullets = sub.bullets.filter((_, i) => i !== bulletIdx);
        updated[subIdx] = sub;
        setFormData({ ...formData, deepDiveSubsections: updated });
    };

    return (
        <div className="space-y-8">
            {/* Headers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Section Kicker</label>
                    <input
                        value={formData.deepDiveSub || ''}
                        onChange={e => setFormData({ ...formData, deepDiveSub: e.target.value })}
                        className="w-full bg-gray-100 dark:bg-zinc-900 border border-black/10 dark:border-white/10 h-12 px-4 rounded-xl font-bold text-xs uppercase"
                        placeholder="CITY DEEP-DIVE · BENGALURU"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Section Title</label>
                    <input
                        value={formData.deepDiveTitle || ''}
                        onChange={e => setFormData({ ...formData, deepDiveTitle: e.target.value })}
                        className="w-full bg-gray-100 dark:bg-zinc-900 border border-black/10 dark:border-white/10 h-12 px-4 rounded-xl font-bold text-xs"
                        placeholder="05 · Bengaluru Management"
                    />
                </div>
            </div>

            <ToggleSwitch
                label="City Deep-Dive Page (Page 7)"
                checked={formData.showDeepDive !== false}
                onChange={v => setFormData({ ...formData, showDeepDive: v })}
                description="Renders dedicated primary market execution plan with badge subsections (5.1, 5.2, etc.)"
            />

            {formData.showDeepDive !== false && (
                <div className="space-y-6">
                    {/* Intro */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">
                            Deep-Dive Introduction Narrative
                        </label>
                        <textarea
                            rows={3}
                            value={formData.deepDiveIntro || ''}
                            onChange={e => setFormData({ ...formData, deepDiveIntro: e.target.value })}
                            className="w-full bg-gray-100 dark:bg-zinc-900 border border-black/10 dark:border-white/10 p-4 rounded-2xl font-medium text-xs leading-relaxed"
                            placeholder="Bengaluru is the tour's primary market. NewBi will manage overall execution directly..."
                        />
                    </div>

                    {/* Subsections */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#16A34A]">
                                Management Subsections with Badges
                            </p>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleAddSubsection}
                                className="bg-neon-green text-black font-bold text-xs gap-1"
                            >
                                <Plus size={14} /> Add Subsection
                            </Button>
                        </div>

                        {deepDiveSubsections.map((sub, subIdx) => (
                            <div key={subIdx} className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 space-y-4">
                                <div className="flex items-center gap-3">
                                    <input
                                        value={sub.badge || ''}
                                        onChange={e => handleUpdateSubsection(subIdx, 'badge', e.target.value)}
                                        className="w-16 h-10 text-center bg-[#E8FAF0] border border-[#B8F2D1] text-[#16A34A] rounded-xl font-bold text-xs"
                                        placeholder="5.1"
                                    />
                                    <input
                                        value={sub.title || ''}
                                        onChange={e => handleUpdateSubsection(subIdx, 'title', e.target.value)}
                                        className="flex-1 h-10 px-3 bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-lg font-bold text-xs"
                                        placeholder="Direct Management"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSubsection(subIdx)}
                                        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {/* Bullets */}
                                <div className="space-y-2 pl-4">
                                    {(sub.bullets || []).map((bullet, bulletIdx) => (
                                        <div key={bulletIdx} className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-[#16A34A] shrink-0" />
                                            <input
                                                value={bullet}
                                                onChange={e => handleUpdateBullet(subIdx, bulletIdx, e.target.value)}
                                                className="flex-1 h-9 px-3 bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 rounded-lg font-medium text-xs"
                                                placeholder="Operational action bullet..."
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveBullet(subIdx, bulletIdx)}
                                                className="p-1 text-gray-400 hover:text-red-400"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    ))}
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleAddBullet(subIdx)}
                                        className="text-xs text-neon-green gap-1 mt-1"
                                    >
                                        <Plus size={12} /> Add Bullet
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── 7. CLOSING & SIGNATURES EDITOR ───────────────────────────────────────────
export function V2ClosingEditor({ formData, setFormData }) {
    return (
        <div className="space-y-8">
            {/* Headers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Section Kicker</label>
                    <input
                        value={formData.closingSub || ''}
                        onChange={e => setFormData({ ...formData, closingSub: e.target.value })}
                        className="w-full bg-gray-100 dark:bg-zinc-900 border border-black/10 dark:border-white/10 h-12 px-4 rounded-xl font-bold text-xs uppercase"
                        placeholder="CLOSING"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Section Title</label>
                    <input
                        value={formData.closingTitle || ''}
                        onChange={e => setFormData({ ...formData, closingTitle: e.target.value })}
                        className="w-full bg-gray-100 dark:bg-zinc-900 border border-black/10 dark:border-white/10 h-12 px-4 rounded-xl font-bold text-xs"
                        placeholder="06 · Next Steps"
                    />
                </div>
            </div>

            <ToggleSwitch
                label="Closing & Next Steps (Page 8)"
                checked={formData.showClosing !== false}
                onChange={v => setFormData({ ...formData, showClosing: v })}
                description="Renders closing text, quotation classification reference, and authorization block"
            />

            {/* Closing Text */}
            <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">
                    Closing Statement
                </label>
                <textarea
                    rows={4}
                    value={formData.closingText || ''}
                    onChange={e => setFormData({ ...formData, closingText: e.target.value })}
                    className="w-full bg-gray-100 dark:bg-zinc-900 border border-black/10 dark:border-white/10 p-4 rounded-2xl font-medium text-xs leading-relaxed"
                    placeholder="We'd welcome the opportunity to walk the client through this plan in detail..."
                />
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">
                    Prepared By Entity
                </label>
                <input
                    value={formData.preparedBy || ''}
                    onChange={e => setFormData({ ...formData, preparedBy: e.target.value })}
                    className="w-full bg-gray-100 dark:bg-zinc-900 border border-black/10 dark:border-white/10 h-12 px-4 rounded-xl font-bold text-xs"
                    placeholder="NewBi Entertainment & Marketing LLP"
                />
            </div>

            {/* Signatures & Seal Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ToggleSwitch
                    label="Digital Signatures Block"
                    checked={formData.showSignatures !== false}
                    onChange={v => setFormData({ ...formData, showSignatures: v })}
                    description="Dual signature blocks for Provider & Client"
                />
                <ToggleSwitch
                    label="Official Document Seal"
                    checked={formData.showSeal !== false}
                    onChange={v => setFormData({ ...formData, showSeal: v })}
                    description="Green Newbi Entertainment stamp seal"
                />
            </div>

            {/* Signatory Details */}
            {formData.showSignatures !== false && (
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#16A34A]">
                        Authorized Signatory Information
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-2">Signatory Name</label>
                            <input
                                value={formData.senderName || ''}
                                onChange={e => setFormData({ ...formData, senderName: e.target.value })}
                                className="w-full bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 h-12 px-4 rounded-xl font-bold text-xs"
                                placeholder="Authorized Signatory"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest px-2">Signatory Designation</label>
                            <input
                                value={formData.senderDesignation || ''}
                                onChange={e => setFormData({ ...formData, senderDesignation: e.target.value })}
                                className="w-full bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 h-12 px-4 rounded-xl font-bold text-xs"
                                placeholder="Director of Operations"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
