import React, { useMemo, useRef, useState } from 'react';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Wand2 from 'lucide-react/dist/esm/icons/wand-2';
import Layers from 'lucide-react/dist/esm/icons/layers';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Download from 'lucide-react/dist/esm/icons/download';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import { cn } from '../../../../lib/utils';
import { useStore } from '../../../../lib/store';
import { generateFullDocument, reviseDocument, refineFieldContent } from '../../../../lib/ai';
import { nextProposalNumber, PROPOSAL_STATUS } from '../../../../lib/proposals';
import Sheet from '../../Sheet';
import { Button, SegmentedTabs } from '../../ui';
import { areaCls, Choice, UploadProgress } from '../../uploads/UploadKit';
import { accent } from '../../theme';
import { applyAiDraft, newProposalData, htmlishToText } from './model';
import { exportProposalPdf } from './exportPdf';

/*
 * AI help for proposals, in one sheet:
 *   Write    – draft the whole proposal from a brief
 *   Change   – ask for edits in plain words
 *   Several  – turn several briefs into separate draft proposals
 * Plus RefineSheet: rewrite one field.
 */

const TONES = [
    { value: 'creative', label: 'Creative', hint: 'Warm and bold' },
    { value: 'balanced', label: 'Balanced', hint: 'Clear and confident' },
    { value: 'formal', label: 'Formal', hint: 'Corporate' },
];

const IDEAS = [
    { label: 'Music festival', text: 'Create a detailed proposal for a 3-day music festival in Mumbai for a premium brand.' },
    { label: 'Comedy tour', text: 'Create a proposal for a 10-city stand-up comedy tour with a complete budget breakdown.' },
    { label: 'Corporate gala', text: 'Create a proposal for a corporate annual gala dinner for 500 guests with stage, lighting and an emcee.' },
    { label: 'Brand launch', text: 'Create a digital and on-ground marketing proposal for a brand launch.' },
    { label: 'Creator campaign', text: 'Create a creator marketing proposal: 20 beauty creators, 50 stories with tracked links, 90-day usage rights.' },
];

const errorText = (err) => (err?.code && err?.message ? err.message : "The AI couldn't do that right now. Please try again.");

const WritePanel = ({ tone, onApply, hasContent }) => {
    const [brief, setBrief] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState('');
    const run = async () => {
        if (busy || brief.trim().length < 5) return;
        if (hasContent && !window.confirm('Replace the text in this proposal with a new AI draft? Client contact details, bank details and attachments stay as they are.')) return;
        setBusy(true); setError(''); setDone('');
        try {
            const data = await generateFullDocument('proposal', brief.trim(), tone, { strict: true });
            onApply('draft', data);
            setDone(`Draft written${data.clientName ? ` for ${data.clientName}` : ''}. Check every section before sharing.`);
        } catch (err) {
            setError(errorText(err));
        } finally {
            setBusy(false);
        }
    };
    return (
        <div className="space-y-4">
            <div>
                <label htmlFor="ai-brief" className="mb-1 block text-[12px] font-bold text-gray-500">Brief</label>
                <textarea id="ai-brief" rows={7} className={areaCls} value={brief} onChange={e => setBrief(e.target.value)} placeholder="Who is the client, what is the event or campaign, cities, dates, budget, what you'll deliver…" />
            </div>
            <div className="flex flex-wrap gap-1.5">
                {IDEAS.map(idea => (
                    <button key={idea.label} type="button" onClick={() => setBrief(idea.text)} className="h-9 rounded-full border border-black/10 px-3 text-[12px] font-semibold text-gray-600 hover:border-black/20 dark:border-white/10 dark:text-zinc-300">{idea.label}</button>
                ))}
            </div>
            {busy && <p className="flex items-center gap-2 text-[13px] font-semibold text-gray-500"><RefreshCw size={14} className="animate-spin" /> Writing your proposal. This can take up to 30 seconds.</p>}
            {error && <p role="alert" className="text-[13px] font-semibold text-red-600 dark:text-red-400">{error}</p>}
            {done && <p className="flex items-start gap-2 text-[13px] font-semibold text-emerald-700 dark:text-neon-green"><CheckCircle2 size={16} className="mt-0.5 shrink-0" /> {done}</p>}
            <Button variant="accent" className="h-12 w-full" onClick={run} disabled={busy || brief.trim().length < 5}>
                {busy ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />} {busy ? 'Writing…' : 'Write the proposal'}
            </Button>
        </div>
    );
};

const ChangePanel = ({ tone, onApply, getDoc }) => {
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const [log, setLog] = useState([]);
    const run = async () => {
        const prompt = text.trim();
        if (busy || prompt.length < 2) return;
        setBusy(true);
        setLog(l => [...l, { who: 'you', text: prompt }]);
        setText('');
        try {
            const revised = await reviseDocument(getDoc(), prompt, tone, { strict: true });
            onApply('revise', revised);
            setLog(l => [...l, { who: 'ai', text: 'Done. The preview shows the change.' }]);
        } catch (err) {
            setLog(l => [...l, { who: 'ai', text: errorText(err), error: true }]);
        } finally {
            setBusy(false);
        }
    };
    return (
        <div className="space-y-4">
            <p className="text-[13px] text-gray-500">Describe the change, for example “make the executive summary shorter” or “add a step for on-ground activations”.</p>
            {log.length > 0 && (
                <div className="space-y-2">
                    {log.map((m, i) => (
                        <div key={i} className={cn('max-w-[90%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-snug',
                            m.who === 'you' ? 'ml-auto bg-gray-900 text-white dark:bg-white dark:text-black' : m.error ? accent('red').soft : 'bg-black/[0.04] dark:bg-white/[0.06]')}>
                            {m.text}
                        </div>
                    ))}
                </div>
            )}
            {busy && <p className="flex items-center gap-2 text-[13px] font-semibold text-gray-500"><RefreshCw size={14} className="animate-spin" /> Making the change…</p>}
            <textarea aria-label="What should change" rows={3} className={areaCls} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); run(); } }} placeholder="What should change?" />
            <Button variant="accent" className="h-12 w-full" onClick={run} disabled={busy || text.trim().length < 2}>
                {busy ? <RefreshCw size={15} className="animate-spin" /> : <Wand2 size={15} />} Apply change
            </Button>
        </div>
    );
};

const splitBriefs = (raw) => {
    const text = String(raw || '').trim();
    if (!text) return [];
    const parts = /(^|\n)\s*[-_]{3,}\s*(\n|$)/.test(text) ? text.split(/\n?\s*[-_]{3,}\s*\n?/) : text.split(/\n\s*\n+/);
    const list = parts.map(p => p.trim()).filter(p => p.length > 10);
    return list.length ? list : [text];
};

const SeveralPanel = ({ tone, onDone }) => {
    const [raw, setRaw] = useState('');
    const [drafts, setDrafts] = useState([]);
    const [progress, setProgress] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const stopRef = useRef(false);
    const briefs = useMemo(() => splitBriefs(raw), [raw]);
    const addToast = useStore(s => s.addToast);

    const generate = async () => {
        if (!briefs.length || progress) return;
        setError('');
        stopRef.current = false;
        const made = [];
        for (let i = 0; i < briefs.length; i++) {
            if (stopRef.current) break;
            setProgress({ done: i, total: briefs.length });
            try {
                const data = await generateFullDocument('proposal', briefs[i], tone, { strict: true });
                const base = newProposalData();
                made.push({ key: `${Date.now()}_${i}`, brief: briefs[i], data: { ...applyAiDraft(base, data), isBulkGenerated: true } });
            } catch (err) {
                made.push({ key: `${Date.now()}_${i}`, brief: briefs[i], failed: errorText(err) });
            }
        }
        setDrafts(d => [...d, ...made]);
        setProgress(null);
    };

    const saveAll = async () => {
        const ready = drafts.filter(d => d.data && !d.savedId);
        if (!ready.length || saving) return;
        setSaving(true);
        let saved = 0;
        try {
            for (const d of ready) {
                const { proposals, addProposal } = useStore.getState();
                const number = nextProposalNumber(proposals);
                const id = await addProposal({ ...d.data, proposalNumber: number, status: PROPOSAL_STATUS.DRAFT, updatedAt: new Date().toISOString() });
                // Keep the local list in step so the next number is unique even before Firestore echoes back.
                useStore.setState(s => ({ proposals: [{ ...d.data, id, proposalNumber: number, status: PROPOSAL_STATUS.DRAFT, createdAt: new Date().toISOString() }, ...(s.proposals || []).filter(p => p.id !== id)] }));
                setDrafts(list => list.map(x => (x.key === d.key ? { ...x, savedId: id, data: { ...x.data, proposalNumber: number } } : x)));
                saved++;
            }
            addToast(`${saved} draft${saved === 1 ? '' : 's'} saved to proposals.`, 'success');
            onDone?.();
        } catch (err) {
            console.error(err);
            setError(`Saved ${saved} of ${ready.length}. Couldn't save the rest. Please try again.`);
        } finally {
            setSaving(false);
        }
    };

    const download = async (d) => {
        try { await exportProposalPdf(d.data, []); } catch (err) { console.error(err); addToast("Couldn't create the PDF.", 'error'); }
    };

    return (
        <div className="space-y-4">
            <div>
                <label htmlFor="ai-several" className="mb-1 block text-[12px] font-bold text-gray-500">Briefs</label>
                <textarea id="ai-several" rows={8} className={areaCls} value={raw} onChange={e => setRaw(e.target.value)} placeholder={'One brief per client. Separate them with a blank line or a line of ---'} />
                <p className="mt-1 text-[12px] text-gray-500">{briefs.length ? `${briefs.length} proposal${briefs.length === 1 ? '' : 's'} will be written.` : 'Each brief becomes its own draft with the next proposal number.'}</p>
            </div>
            {progress && (
                <div className="space-y-2">
                    <UploadProgress percent={(progress.done / progress.total) * 100} step={`Writing ${progress.done + 1} of ${progress.total}…`} />
                    <button type="button" onClick={() => { stopRef.current = true; }} className="text-[12px] font-semibold text-gray-500 underline">Stop after this one</button>
                </div>
            )}
            <Button variant="accent" className="h-12 w-full" onClick={generate} disabled={!briefs.length || Boolean(progress)}>
                <Layers size={15} /> Write {briefs.length || ''} draft{briefs.length === 1 ? '' : 's'}
            </Button>
            {drafts.length > 0 && (
                <div className="space-y-2">
                    {drafts.map(d => (
                        <div key={d.key} className="flex items-center gap-2 rounded-2xl border border-black/[0.08] p-3 dark:border-white/[0.08]">
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[14px] font-bold">{d.failed ? 'Not written' : (d.data.clientName || 'Untitled')}</p>
                                <p className="truncate text-[12px] text-gray-500">{d.failed || [d.data.proposalNumber && d.savedId ? d.data.proposalNumber : null, d.data.campaignName].filter(Boolean).join(' · ') || d.brief}</p>
                            </div>
                            {d.savedId && <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', accent('green').chip)}>Saved</span>}
                            {d.data && <button type="button" onClick={() => download(d)} aria-label="Download PDF" className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 hover:bg-black/5 dark:hover:bg-white/10"><Download size={15} /></button>}
                            {!d.savedId && <button type="button" onClick={() => setDrafts(l => l.filter(x => x.key !== d.key))} aria-label="Remove" className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 hover:bg-red-500/10 hover:text-red-500"><Trash2 size={15} /></button>}
                        </div>
                    ))}
                    {error && <p role="alert" className="text-[13px] font-semibold text-red-600 dark:text-red-400">{error}</p>}
                    <Button variant="primary" className="h-12 w-full" onClick={saveAll} disabled={saving || !drafts.some(d => d.data && !d.savedId)}>
                        {saving ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Save {drafts.filter(d => d.data && !d.savedId).length} as drafts
                    </Button>
                </div>
            )}
        </div>
    );
};

export const AiSheet = ({ open, onClose, onApply, getDoc, hasContent, activeModel }) => {
    const [tab, setTab] = useState('write');
    const [tone, setTone] = useState('balanced');
    return (
        <Sheet open={open} onClose={onClose} size="lg" title="Write with AI" subtitle={activeModel ? `Using ${activeModel}` : 'Drafts you can edit before sharing'}>
            <div className="space-y-5">
                <SegmentedTabs
                    value={tab}
                    onChange={setTab}
                    className="w-full overflow-x-auto"
                    items={[
                        { value: 'write', label: 'Write', icon: Sparkles },
                        { value: 'change', label: 'Change', icon: Wand2 },
                        { value: 'several', label: 'Several', icon: Layers },
                    ]}
                />
                <div>
                    <span className="mb-1 block text-[12px] font-bold text-gray-500">Tone</span>
                    <Choice value={tone} onChange={setTone} options={TONES} />
                </div>
                {tab === 'write' && <WritePanel tone={tone} onApply={onApply} hasContent={hasContent} />}
                {tab === 'change' && <ChangePanel tone={tone} onApply={onApply} getDoc={getDoc} />}
                {tab === 'several' && <SeveralPanel tone={tone} onDone={() => {}} />}
            </div>
        </Sheet>
    );
};

/** Rewrite one field with an instruction. target = { label, value, apply }. */
export const RefineSheet = ({ target, onClose }) => {
    const [instruction, setInstruction] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const addToast = useStore(s => s.addToast);
    const close = () => { if (!busy) { setInstruction(''); setError(''); onClose(); } };
    const run = async (text = instruction) => {
        if (!target || busy || !text.trim()) return;
        setBusy(true); setError('');
        try {
            const current = htmlishToText(target.value);
            const refined = await refineFieldContent('proposal', target.label, current, text.trim(), 'Premium');
            if (!refined || !String(refined).trim()) throw new Error('empty');
            target.apply(String(refined).trim());
            addToast(`${target.label} updated.`, 'success');
            setInstruction('');
            onClose();
        } catch (err) {
            setError(errorText(err));
        } finally {
            setBusy(false);
        }
    };
    const presets = ['Make it more formal', 'Shorter and punchier', 'Add more detail', 'Fix grammar and flow'];
    return (
        <Sheet open={Boolean(target)} onClose={close} variant="dialog" size="md" title={`Improve: ${target?.label || ''}`} subtitle="The AI rewrites this field only"
            footer={<div className="flex gap-2"><Button variant="secondary" className="flex-1" onClick={close} disabled={busy}>Cancel</Button><Button variant="accent" className="flex-1" onClick={() => run()} disabled={busy || !instruction.trim()}>{busy ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />} Rewrite</Button></div>}>
            <div className="space-y-3">
                {target?.value && <p className="line-clamp-3 rounded-xl bg-black/[0.03] p-3 text-[13px] text-gray-600 dark:bg-white/[0.04] dark:text-zinc-300">{htmlishToText(target.value)}</p>}
                <div className="flex flex-wrap gap-1.5">
                    {presets.map(p => (
                        <button key={p} type="button" disabled={busy} onClick={() => { setInstruction(p); run(p); }} className="h-9 rounded-full border border-black/10 px-3 text-[12px] font-semibold text-gray-600 hover:border-black/20 disabled:opacity-50 dark:border-white/10 dark:text-zinc-300">{p}</button>
                    ))}
                </div>
                <textarea aria-label="How should it change" rows={3} className={areaCls} value={instruction} onChange={e => setInstruction(e.target.value)} placeholder="Or say how to change it" />
                {error && <p role="alert" className="text-[13px] font-semibold text-red-600 dark:text-red-400">{error}</p>}
            </div>
        </Sheet>
    );
};
