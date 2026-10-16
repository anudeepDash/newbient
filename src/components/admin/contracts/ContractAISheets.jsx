import React, { useEffect, useState } from 'react';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Sheet from '../Sheet';
import { Button } from '../ui';
import { areaCls, Choice } from '../uploads/UploadKit';

const PRESETS = [
    { label: 'Service agreement', text: 'Service agreement for event production and marketing services for a brand, with a 50% advance, IP for campaign content and a 30-day termination notice.' },
    { label: 'Artist booking', text: 'Talent booking agreement for a headliner performance at a corporate event, with rider compliance, travel and stay, 50% advance and a cancellation fee.' },
    { label: 'Influencer retainer', text: 'Six-month creator retainer covering 4 posts and 8 stories a month, paid-ad usage rights for 3 months, monthly invoicing and exclusivity in the beverage category.' },
    { label: 'Sponsorship', text: 'Title sponsorship agreement for a campus festival granting stage naming, on-ground activation booths, digital mentions and VIP passes, paid in two instalments.' },
    { label: 'Venue and production', text: 'Venue and AV production agreement covering staging, lights, sound, safety certificates and insurance, with milestone payments and damage liability.' },
    { label: 'NDA', text: 'Mutual non-disclosure agreement covering event plans, artist rosters, pricing and production designs, valid for two years.' },
];

const STAGES = ['Reading your brief…', 'Writing the parties and scope…', 'Working out the money…', 'Drafting the clauses…', 'Putting it together…'];

const useStage = (busy) => {
    const [stage, setStage] = useState(0);
    useEffect(() => {
        if (!busy) { setStage(0); return undefined; }
        const t = setInterval(() => setStage(s => Math.min(s + 1, STAGES.length - 1)), 2500);
        return () => clearInterval(t);
    }, [busy]);
    return STAGES[stage];
};

/** Draft a whole contract from a brief, or change the current draft. */
export const AIDraftSheet = ({ open, onClose, hasContent, busy, onSubmit }) => {
    const [prompt, setPrompt] = useState('');
    const [mode, setMode] = useState(hasContent ? 'revise' : 'new');
    const stage = useStage(busy);
    useEffect(() => { if (open) setMode(hasContent ? 'revise' : 'new'); }, [open, hasContent]);

    const submit = async () => {
        if (prompt.trim().length < 5 || busy) return;
        if (mode === 'new' && hasContent && !window.confirm('Drafting from scratch replaces the parties, scope, money and clauses you have now. Continue?')) return;
        const ok = await onSubmit(mode, prompt.trim());
        if (ok) setPrompt('');
    };

    return (
        <Sheet
            open={open}
            onClose={busy ? () => {} : onClose}
            size="lg"
            title="Draft with AI"
            subtitle="Describe the deal in plain words. Check every field afterwards; AI can get names and numbers wrong."
            footer={(
                <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
                    <Button variant="accent" onClick={submit} disabled={busy || prompt.trim().length < 5}>
                        {busy ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
                        {busy ? 'Drafting…' : mode === 'new' ? 'Draft contract' : 'Apply changes'}
                    </Button>
                </div>
            )}
        >
            <div className="space-y-5">
                {hasContent && (
                    <Choice
                        value={mode}
                        onChange={setMode}
                        options={[
                            { value: 'revise', label: 'Change this draft', hint: 'Keeps what you have and edits it' },
                            { value: 'new', label: 'Start from scratch', hint: 'Replaces the current content' },
                        ]}
                    />
                )}
                <label className="block">
                    <span className="mb-1 block text-[12px] font-bold text-gray-500">{mode === 'new' ? 'What is this contract for?' : 'What should change?'}</span>
                    <textarea
                        className={areaCls}
                        rows={6}
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        disabled={busy}
                        placeholder={mode === 'new'
                            ? 'e.g. Six-month marketing retainer for Brand X, ₹5,00,000 plus GST, 50% advance, strict IP terms. You can also paste a full draft here.'
                            : 'e.g. Make the payment 40% advance and 60% after the event, and add a 15-day termination notice.'}
                    />
                </label>
                {mode === 'new' && (
                    <div>
                        <p className="mb-2 text-[12px] font-bold text-gray-500">Start from an example</p>
                        <div className="flex flex-wrap gap-1.5">
                            {PRESETS.map(p => (
                                <button key={p.label} type="button" onClick={() => setPrompt(p.text)} disabled={busy}
                                    className="h-9 rounded-full border border-black/10 px-3 text-[12px] font-semibold text-gray-600 hover:border-amber-500/50 hover:text-gray-900 disabled:opacity-50 dark:border-white/10 dark:text-zinc-300 dark:hover:text-white">
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {busy && (
                    <div className="rounded-xl bg-violet-500/[0.07] p-3 text-[13px] font-semibold text-violet-700 dark:text-violet-300" role="status">
                        {stage}
                    </div>
                )}
            </div>
        </Sheet>
    );
};

const plain = (html) => String(html || '').replace(/<\/(p|div|li|h\d)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();

/** Rewrite one field (scope, payment terms, a clause) with an instruction. */
export const AIRefineSheet = ({ target, onClose, busy, onSubmit }) => {
    const [instruction, setInstruction] = useState('');
    useEffect(() => { if (target) setInstruction(''); }, [target]);
    const quick = ['Make it clearer', 'Make it stricter', 'Make it shorter', 'Make it friendlier to the other party'];

    return (
        <Sheet
            open={Boolean(target)}
            onClose={busy ? () => {} : onClose}
            variant="dialog"
            size="md"
            title="Improve with AI"
            subtitle={target?.label}
            footer={(
                <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
                    <Button variant="accent" onClick={() => onSubmit(instruction.trim())} disabled={busy || !instruction.trim()}>
                        {busy ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
                        {busy ? 'Rewriting…' : 'Rewrite'}
                    </Button>
                </div>
            )}
        >
            {target && (
                <div className="space-y-4">
                    <div>
                        <p className="mb-1 text-[12px] font-bold text-gray-500">Now</p>
                        <div className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl bg-black/[0.03] p-3 text-[13px] leading-relaxed text-gray-600 dark:bg-white/[0.04] dark:text-zinc-300">
                            {plain(target.value) || <span className="text-gray-400">Empty. AI will write it from scratch.</span>}
                        </div>
                    </div>
                    <label className="block">
                        <span className="mb-1 block text-[12px] font-bold text-gray-500">How should it change?</span>
                        <textarea className={areaCls} rows={3} value={instruction} onChange={e => setInstruction(e.target.value)} disabled={busy}
                            placeholder="e.g. Payment within 7 days of each invoice"
                            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && instruction.trim()) { e.preventDefault(); onSubmit(instruction.trim()); } }} />
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                        {quick.map(q => (
                            <button key={q} type="button" onClick={() => setInstruction(q)} disabled={busy}
                                className="h-9 rounded-full border border-black/10 px-3 text-[12px] font-semibold text-gray-600 hover:border-amber-500/50 dark:border-white/10 dark:text-zinc-300">
                                {q}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </Sheet>
    );
};
