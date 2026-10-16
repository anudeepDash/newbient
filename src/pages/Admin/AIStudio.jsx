import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import History from 'lucide-react/dist/esm/icons/history';
import Save from 'lucide-react/dist/esm/icons/save';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import Undo2 from 'lucide-react/dist/esm/icons/undo-2';
import Download from 'lucide-react/dist/esm/icons/download';
import Plus from 'lucide-react/dist/esm/icons/plus';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Wand2 from 'lucide-react/dist/esm/icons/wand-2';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { cn } from '../../lib/utils';
import { generateFullDocument, reviseDocument } from '../../lib/ai';
import { nextProposalNumber } from '../../lib/proposals';
import { accent, useAccent } from '../../components/admin/theme';
import { Badge, Button, SegmentedTabs } from '../../components/admin/ui';
import Sheet from '../../components/admin/Sheet';
import AIPromptBox, { GenerationProgress, useElapsed } from '../../components/admin/AIPromptBox';
import useContractGenerator from '../../components/admin/useContractGenerator';
import DocumentPreview, { ExportPages, exportPaperPdf } from '../../components/admin/ai/DocumentPreview';
import ProposalEditSheet from '../../components/admin/ai/ProposalEditSheet';
import ContractEditSheet from '../../components/admin/ai/ContractEditSheet';
import HistorySheet, { HistoryRow, timeAgo } from '../../components/admin/ai/HistorySheet';
import useStudioHistory, { newEntryId } from '../../components/admin/ai/useStudioHistory';
import {
    KIND_ORDER, MAX_BRIEF_CHARS, STUDIO_KINDS, TONES,
    CONTRACT_PROTECTED_FIELDS, PROPOSAL_PROTECTED_FIELDS,
    blankContract, buildContract, buildProposal, contractForRevision, documentStats, documentSubtitle, documentTitle,
    mergeRevisedContract, proposalForRevision, syncProposalSections,
} from '../../components/admin/ai/studioDocuments';

/*
 * AI studio (/admin/ai-studio): describe a proposal or contract, let the AI
 * draft it, check it on the real paper, edit or ask for changes, then save it
 * as a draft into Proposals or Contracts. Every generation is kept in this
 * browser's history until it's saved, so nothing is lost on refresh.
 *
 * Deep link: ?type=proposal|notes|contract picks what to make.
 */

const MODULE_LINKS = {
    proposal: { list: '/admin/proposals', edit: (id) => `/admin/edit-proposal/${id}`, name: 'Proposals' },
    contract: { list: '/admin/agreements', edit: (id) => `/admin/agreements/edit/${id}`, name: 'Contracts' },
};

const REVISION_IDEAS = {
    proposal: ['Make it shorter and punchier', 'Add a timeline to every deliverable', 'Change the price to ₹80,000 per city', 'Write it for a college fest audience'],
    contract: ['Add a cancellation clause with 15 days notice', 'Make payment 40% advance, 60% on delivery', 'Make the confidentiality clause stricter', 'Add a force majeure clause'],
};

const composeBrief = (prompt, files = []) => {
    const ready = files.filter(f => f.status === 'ready' && f.text);
    const text = prompt.trim();
    if (!ready.length) return text;
    return `${text}\n\nReference material from attached files:\n${ready.map(f => `--- ${f.name} ---\n${f.text}`).join('\n\n')}`;
};

const clone = (v) => JSON.parse(JSON.stringify(v ?? null));
const fileSafe = (s) => String(s || '').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'Draft';
const isAbort = (e) => e?.name === 'AbortError';
// Firestore 'not-found' (updateDoc on a deleted doc) or the store's NOT_FOUND.
const isMissing = (e) => e?.code === 'not-found' || e?.code === 'NOT_FOUND';

const hasContent = (module, doc) => {
    if (!doc) return false;
    if (module === 'contract') return Boolean(doc.parties?.secondParty?.name || doc.details?.projectName || doc.details?.purpose || (doc.clauses || []).length);
    return Boolean(doc.clientName || doc.campaignName || (doc.executiveParagraphs || []).length || (doc.blueprintSteps || []).length || doc.introParagraph);
};

const AIStudio = () => {
    useStoreSubscription(['proposals']);
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const { addProposal, updateProposal, proposals = [], addAgreement, updateAgreement, user, addToast } = useStore();
    const moduleAccent = useAccent();
    const history = useStudioHistory();

    // ── Brief ──────────────────────────────────────────────────────────
    const [kind, setKind] = useState(() => (STUDIO_KINDS[params.get('type')] ? params.get('type') : 'proposal'));
    const [prompt, setPrompt] = useState('');
    const [tone, setTone] = useState('Premium');
    const [files, setFiles] = useState([]);
    const cfg = STUDIO_KINDS[kind];

    const chooseKind = (k) => {
        setKind(k);
        const next = new URLSearchParams(params);
        next.set('type', k);
        setParams(next, { replace: true });
    };

    // ── Result ─────────────────────────────────────────────────────────
    const [phase, setPhase] = useState('compose'); // compose | result
    const [resultKind, setResultKind] = useState('proposal');
    const resultCfg = STUDIO_KINDS[resultKind];
    const module = resultCfg.module;
    const [proposalDoc, setProposalDoc] = useState(null);
    const contract = useContractGenerator(null);
    const doc = module === 'contract' ? contract.formData : proposalDoc;
    const setDoc = useCallback((next) => {
        if (module === 'contract') contract.setFormData(next);
        else setProposalDoc(next);
    }, [module, contract.setFormData]); // eslint-disable-line react-hooks/exhaustive-deps

    const [entryId, setEntryId] = useState(null);
    const [brief, setBrief] = useState(null); // { prompt, tone, text, files: [names] }
    const [changes, setChanges] = useState([]);
    const [undoStack, setUndoStack] = useState([]);
    const [saved, setSaved] = useState(null); // { id, at }
    const [createdAt, setCreatedAt] = useState(null);
    const [mobileTab, setMobileTab] = useState('preview');

    // Unsaved-change tracking: count doc changes, remember the count at save.
    const [version, setVersion] = useState(0);
    const [savedVersion, setSavedVersion] = useState(-1);
    const cleanNext = useRef(false);
    useEffect(() => {
        if (phase !== 'result') return;
        setVersion(v => {
            const next = v + 1;
            if (cleanNext.current) { cleanNext.current = false; setSavedVersion(next); }
            return next;
        });
    }, [doc]); // eslint-disable-line react-hooks/exhaustive-deps
    const dirty = Boolean(saved) && version !== savedVersion;

    // ── Busy state, cancel and errors ─────────────────────────────────
    const [busy, setBusy] = useState(null); // 'generate' | 'revise' | null
    const [error, setError] = useState(null); // { message, retry }
    const abortRef = useRef(null);
    const runRef = useRef(0);
    useEffect(() => () => abortRef.current?.abort(), []);

    const cancel = () => {
        runRef.current += 1;
        abortRef.current?.abort();
        abortRef.current = null;
        setBusy(null);
        addToast('Stopped. Nothing was changed.', 'info');
    };

    // ── History autosave: the working copy follows every edit ──────────
    useEffect(() => {
        if (phase !== 'result' || !entryId || !doc) return;
        history.upsert({ id: entryId, kind: resultKind, doc, brief, changes, savedId: saved?.id || null, savedAt: saved?.at || null, createdAt: createdAt || new Date().toISOString() });
    }, [doc, saved, changes]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadResult = (k, nextDoc, extra = {}) => {
        const m = STUDIO_KINDS[k].module;
        setResultKind(k);
        if (m === 'contract') contract.setFormData(nextDoc);
        else setProposalDoc(nextDoc);
        setEntryId(extra.id);
        setBrief(extra.brief || null);
        setChanges(extra.changes || []);
        setSaved(extra.savedId ? { id: extra.savedId, at: extra.savedAt } : null);
        setCreatedAt(extra.createdAt || new Date().toISOString());
        setUndoStack([]);
        if (extra.savedId) cleanNext.current = true;
        setPhase('result');
        setMobileTab('preview');
    };

    // ── Generate ───────────────────────────────────────────────────────
    const generate = async (fromBrief) => {
        const useKind = fromBrief?.kind || kind;
        const useCfg = STUDIO_KINDS[useKind];
        const text = fromBrief?.text ?? composeBrief(prompt, files);
        const useTone = fromBrief?.tone || tone;
        if (text.trim().length < 5) { setError({ message: 'Add a little more detail to the brief first.' }); return; }
        if (text.length > MAX_BRIEF_CHARS) { setError({ message: 'The brief is too long. Trim it or remove an attachment.' }); return; }

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        const run = ++runRef.current;
        setBusy('generate');
        setError(null);
        try {
            const ai = await generateFullDocument(useCfg.aiType, text, useTone, { strict: true, signal: controller.signal });
            if (run !== runRef.current) return;
            const built = useCfg.module === 'contract' ? buildContract(ai) : buildProposal(ai);
            if (!hasContent(useCfg.module, built)) throw new Error("The AI's answer was empty. Please try again, or add more detail to the brief.");
            const newBrief = fromBrief || { prompt: prompt.trim(), tone: useTone, text, files: files.filter(f => f.status === 'ready').map(f => f.name) };
            loadResult(useKind, built, { id: newEntryId(), brief: { ...newBrief, kind: useKind } });
        } catch (e) {
            if (run !== runRef.current || isAbort(e)) return;
            setError({ message: e?.message || "Couldn't generate the draft. Please try again.", retry: () => generate(fromBrief) });
        } finally {
            if (run === runRef.current) { setBusy(null); abortRef.current = null; }
        }
    };

    const regenerate = () => {
        if (!brief) { setPhase('compose'); return; }
        generate({ ...brief, kind: resultKind });
    };

    // ── Ask for changes ────────────────────────────────────────────────
    const [instruction, setInstruction] = useState('');
    const instructionRef = useRef(null);
    const revise = async (text = instruction) => {
        const ask = text.trim();
        if (ask.length < 3 || !doc) return;
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        const run = ++runRef.current;
        const before = clone(doc);
        setBusy('revise');
        setError(null);
        try {
            const current = module === 'contract' ? contractForRevision(doc) : proposalForRevision(doc);
            const revised = await reviseDocument(current, ask, brief?.tone || tone, { strict: true, signal: controller.signal });
            if (run !== runRef.current) return;
            let next;
            if (module === 'contract') {
                next = mergeRevisedContract(revised, before);
            } else {
                // Fields the AI returned replace ours, even when it emptied them.
                const cleared = { ...before };
                Object.keys(current).forEach(k => { if (k in revised) cleared[k] = Array.isArray(before[k]) ? [] : ''; });
                next = buildProposal({ ...current, ...revised }, cleared);
            }
            setUndoStack(s => [...s.slice(-9), { doc: before, label: `“${ask.length > 40 ? `${ask.slice(0, 40)}…` : ask}”` }]);
            setDoc(next);
            setChanges(c => [...c, { id: Date.now(), text: ask, at: new Date().toISOString() }]);
            setInstruction('');
        } catch (e) {
            if (run !== runRef.current || isAbort(e)) return;
            setError({ message: e?.message || "Couldn't apply that change. Please try again.", retry: () => revise(ask) });
        } finally {
            if (run === runRef.current) { setBusy(null); abortRef.current = null; }
        }
    };

    const undo = () => {
        setUndoStack(s => {
            if (!s.length) return s;
            const last = s[s.length - 1];
            setDoc(last.doc);
            return s.slice(0, -1);
        });
    };

    // ── Edit by hand ───────────────────────────────────────────────────
    const [editOpen, setEditOpen] = useState(false);
    const editSnapshot = useRef(null);
    const openEdit = () => {
        editSnapshot.current = JSON.stringify(doc);
        setEditOpen(true);
    };
    const closeEdit = () => {
        setEditOpen(false);
        const before = editSnapshot.current;
        editSnapshot.current = null;
        if (before && before !== JSON.stringify(doc)) {
            setUndoStack(s => [...s.slice(-9), { doc: JSON.parse(before), label: 'your edits' }]);
        }
    };

    // ── Save as draft (one record per generation: later saves update it) ─
    const [saving, setSaving] = useState(false);
    const saveRef = useRef(null);
    const save = async () => {
        if (!doc || busy) return;
        if (saveRef.current) return;
        const links = MODULE_LINKS[module];
        const startVersion = version;
        setSaving(true);
        const job = (async () => {
            const now = new Date().toISOString();
            if (module === 'proposal') {
                const data = clone({ ...syncProposalSections(doc), templateVersion: 'v2', updatedAt: now });
                if (saved?.id) {
                    const update = { ...data };
                    PROPOSAL_PROTECTED_FIELDS.forEach(k => { delete update[k]; });
                    try {
                        await updateProposal(saved.id, update);
                        return { id: saved.id, created: false };
                    } catch (e) {
                        if (!isMissing(e)) throw e;
                        // Deleted from Proposals since; save it again as a new draft.
                    }
                }
                data.status = 'Draft';
                if (!String(data.proposalNumber || '').trim()) data.proposalNumber = nextProposalNumber(proposals);
                const id = await addProposal(data);
                if (data.proposalNumber !== doc.proposalNumber) setProposalDoc(d => ({ ...d, proposalNumber: data.proposalNumber }));
                return { id, created: true, bumpsVersion: data.proposalNumber !== doc.proposalNumber };
            }
            const data = clone({ ...doc, updatedAt: now });
            if (saved?.id) {
                const update = { ...data };
                CONTRACT_PROTECTED_FIELDS.forEach(k => { delete update[k]; });
                try {
                    // Never overwrite a contract the client has signed meanwhile.
                    await updateAgreement(saved.id, update, { unlessSigned: true });
                    return { id: saved.id, created: false };
                } catch (e) {
                    if (e?.code === 'LOCKED') throw Object.assign(new Error("This contract has been signed, so it can't be changed here."), { friendly: true });
                    if (!isMissing(e)) throw e;
                }
            }
            data.status = 'Draft';
            data.createdBy = user?.uid || null;
            const id = await addAgreement(data);
            return { id, created: true };
        })();
        saveRef.current = job;
        try {
            const res = await job;
            if (!res?.id) throw new Error('No id');
            setSaved({ id: res.id, at: new Date().toISOString() });
            // A number filled in on first save changes the doc once more; count that as saved.
            if (res.bumpsVersion) cleanNext.current = true;
            setSavedVersion(startVersion);
            addToast(res.created ? `Saved as a draft in ${links.name}.` : 'Changes saved.', 'success');
        } catch (e) {
            console.error('[AI studio] save failed', e);
            addToast(e?.friendly ? e.message : "Couldn't save. Please try again.", 'error');
        } finally {
            saveRef.current = null;
            setSaving(false);
        }
    };

    // ── PDF ────────────────────────────────────────────────────────────
    const [exporting, setExporting] = useState(false);
    const exportRef = useRef(null);
    useEffect(() => {
        if (!exporting) return undefined;
        let alive = true;
        const t = setTimeout(async () => {
            try {
                const name = module === 'contract'
                    ? `Newbi-Contract-${fileSafe(doc?.parties?.secondParty?.name || doc?.details?.projectName)}.pdf`
                    : `Newbi-Proposal-${fileSafe(doc?.clientName || doc?.campaignName)}.pdf`;
                await exportPaperPdf(exportRef.current, name);
            } catch (e) {
                console.error('[AI studio] PDF failed', e);
                if (alive) addToast("Couldn't create the PDF. Please try again.", 'error');
            } finally {
                if (alive) setExporting(false);
            }
        }, 700);
        return () => { alive = false; clearTimeout(t); };
    }, [exporting]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── History actions ────────────────────────────────────────────────
    const [historyOpen, setHistoryOpen] = useState(false);
    const [confirm, setConfirm] = useState(null); // { title, body, action, label }
    const openEntry = (entry) => {
        if (busy) cancel();
        const k = STUDIO_KINDS[entry.kind] ? entry.kind : 'proposal';
        const d = STUDIO_KINDS[k].module === 'contract' ? { ...blankContract(), ...clone(entry.doc) } : syncProposalSections(clone(entry.doc));
        loadResult(k, d, entry);
        setError(null);
    };
    const askRemove = (entry) => setConfirm({
        title: 'Remove from history?',
        body: entry.savedId
            ? 'It is only removed from this list. The saved draft stays where it is.'
            : "This draft was never saved, so it will be gone for good.",
        label: 'Remove',
        action: () => {
            history.remove(entry.id);
            if (entry.id === entryId) startNew();
        },
    });
    const askClear = () => setConfirm({
        title: 'Clear all history?',
        body: `${history.entries.filter(e => !e.savedId).length || 'No'} unsaved drafts will be gone for good. Saved drafts stay in Proposals and Contracts.`,
        label: 'Clear history',
        action: () => { history.clear(); setHistoryOpen(false); if (phase === 'result') startNew(); },
    });

    const startNew = () => {
        if (busy) cancel();
        setPhase('compose');
        setEntryId(null);
        setError(null);
        setUndoStack([]);
        setInstruction('');
    };

    const editBrief = () => {
        if (brief) {
            setPrompt(brief.prompt || '');
            setTone(brief.tone || 'Premium');
            setKind(brief.kind || resultKind);
        }
        setFiles([]);
        startNew();
    };

    const elapsed = useElapsed(busy === 'revise');
    const genElapsed = useElapsed(busy === 'generate' && phase === 'result');
    const attachedChars = useMemo(() => files.reduce((n, f) => n + (f.text ? f.text.length + f.name.length + 10 : 0), 0), [files]);
    const recent = history.entries.slice(0, 4);
    const links = MODULE_LINKS[module];
    const ra = accent(resultCfg.tone);

    // ── Header ─────────────────────────────────────────────────────────
    const header = (
        <header className="relative z-30 shrink-0 border-b border-black/[0.06] bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#07080b]/90">
            <div className="flex h-14 items-center gap-2 px-2 sm:px-4">
                <Link to={phase === 'result' ? links.list : '/admin/proposals'} aria-label="Back" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10">
                    <ArrowLeft size={18} />
                </Link>
                <div className={cn('hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:flex', moduleAccent.chip)}><Sparkles size={17} /></div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold leading-tight">
                        {phase === 'result' ? documentTitle(resultKind, doc) : 'AI studio'}
                    </p>
                    <p className={cn('truncate text-[11.5px] font-medium', dirty ? 'text-amber-600 dark:text-amber-300' : 'text-gray-500')}>
                        {phase !== 'result' && 'Draft proposals and contracts from a short brief'}
                        {phase === 'result' && !saved && 'Not saved yet · kept on this device'}
                        {phase === 'result' && saved && !dirty && `Saved to ${links.name.toLowerCase()} · ${timeAgo(saved.at) || 'earlier'}`}
                        {phase === 'result' && dirty && 'Unsaved changes'}
                    </p>
                </div>
                <Button variant="ghost" onClick={() => setHistoryOpen(true)} className="h-10 px-3" aria-label="History">
                    <History size={16} /> <span className="hidden sm:inline">History</span>
                    {history.entries.length > 0 && <span className="rounded-full bg-black/[0.06] px-1.5 text-[11px] font-bold tabular-nums dark:bg-white/10">{history.entries.length}</span>}
                </Button>
                {phase === 'result' && (
                    <Button variant="accent" onClick={save} disabled={saving || Boolean(busy) || (saved && !dirty)} className="h-10">
                        {saving ? <Loader2 size={15} className="animate-spin" /> : saved && !dirty ? <CheckCircle2 size={15} /> : <Save size={15} />}
                        <span>{saving ? 'Saving…' : !saved ? 'Save as draft' : dirty ? 'Save changes' : 'Saved'}</span>
                    </Button>
                )}
            </div>
        </header>
    );

    const errorBox = error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/[0.06] p-4" role="alert">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-500" />
            <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold text-red-700 dark:text-red-300">Something went wrong</p>
                <p className="text-[13px] text-red-700/90 dark:text-red-200/90">{error.message}</p>
            </div>
            <div className="flex shrink-0 gap-1">
                {error.retry && <Button size="sm" variant="secondary" onClick={() => { const r = error.retry; setError(null); r(); }}>Try again</Button>}
                <Button size="sm" variant="ghost" onClick={() => setError(null)}>Dismiss</Button>
            </div>
        </div>
    );

    // ── Compose view ───────────────────────────────────────────────────
    const composeView = (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="mx-auto w-full max-w-3xl space-y-6 px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pt-10">
                <div>
                    <h1 className="text-[22px] font-extrabold tracking-tight sm:text-[26px]">What do you want to make?</h1>
                    <p className="mt-1 text-[14px] text-gray-500">Pick a document, describe it, and get a first draft on the real template in under a minute.</p>
                </div>

                <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Document type">
                        {KIND_ORDER.map(k => {
                            const c = STUDIO_KINDS[k];
                            const a = accent(c.tone);
                            const active = kind === k;
                            const Icon = c.icon;
                            return (
                                <button
                                    key={k}
                                    type="button"
                                    role="radio"
                                    aria-checked={active}
                                    disabled={Boolean(busy)}
                                    onClick={() => chooseKind(k)}
                                    className={cn(
                                        'flex min-h-[4.5rem] flex-col items-start gap-2 rounded-2xl border p-3 text-left transition-colors disabled:opacity-60 sm:flex-row sm:gap-3 sm:p-3.5',
                                        active ? cn(a.border, a.soft) : 'border-black/[0.08] bg-white hover:border-black/20 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/20'
                                    )}
                                >
                                    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', a.chip)}><Icon size={18} /></span>
                                    <span className="min-w-0">
                                        <span className={cn('block text-[13.5px] font-bold leading-snug sm:text-[14px]', active && a.text)}>{c.label}</span>
                                        <span className="hidden text-[12.5px] leading-snug text-gray-500 sm:block">{c.hint}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-[13px] text-gray-500 sm:hidden">{cfg.hint}</p>
                </div>

                <AIPromptBox
                    key={kind}
                    type={cfg.module}
                    value={prompt}
                    onChange={setPrompt}
                    placeholder={cfg.placeholder}
                    examples={cfg.examples}
                    attachments={files}
                    onAttachmentsChange={setFiles}
                    tones={TONES}
                    tone={tone}
                    onToneChange={setTone}
                    isGenerating={busy === 'generate'}
                    onGenerate={() => generate()}
                    onCancel={cancel}
                    submitLabel={kind === 'notes' ? 'Lay it out' : `Draft ${cfg.label.toLowerCase()}`}
                    generatingLabel={`Drafting your ${cfg.module === 'contract' ? 'contract' : 'proposal'}`}
                    maxChars={MAX_BRIEF_CHARS}
                    extraChars={attachedChars}
                    accentTone={cfg.tone}
                />

                {errorBox}

                <p className="text-[12px] text-gray-500">
                    Drafts stay on this device until you save them. AI can get facts and figures wrong, so check names, dates and prices before you send anything.
                </p>

                {recent.length > 0 && (
                    <section className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[15px] font-bold">Pick up where you left off</h2>
                            {history.entries.length > recent.length && (
                                <Button size="sm" variant="ghost" onClick={() => setHistoryOpen(true)}>See all</Button>
                            )}
                        </div>
                        <div className="space-y-2">
                            {recent.map(e => <HistoryRow key={e.id} entry={e} onOpen={openEntry} onRemove={askRemove} />)}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );

    // ── Result view ────────────────────────────────────────────────────
    const stats = documentStats(resultKind, doc);
    const ResultIcon = resultCfg.icon;
    const resultPanel = (
        <div className="space-y-5 px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-5 sm:px-5">
            {/* What was made */}
            <div className="rounded-2xl border border-black/[0.06] bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
                <div className="flex items-start gap-3">
                    <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', ra.chip)}><ResultIcon size={19} /></span>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <Badge tone={resultCfg.tone}>{resultCfg.label}</Badge>
                            {saved ? <Badge tone="green">Saved</Badge> : <Badge tone="amber">Not saved</Badge>}
                        </div>
                        <h2 className="mt-1.5 break-words text-[17px] font-extrabold leading-snug">{documentTitle(resultKind, doc)}</h2>
                        {documentSubtitle(resultKind, doc) && <p className="text-[13px] text-gray-500">{documentSubtitle(resultKind, doc)}</p>}
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                    {stats.map(s => (
                        <div key={s.label} className={cn('min-w-0 rounded-xl px-3 py-2', accent(s.tone).soft)}>
                            <p className="truncate text-[11.5px] font-semibold text-gray-500">{s.label}</p>
                            <p className={cn('truncate text-[16px] font-extrabold tabular-nums', accent(s.tone).text)}>{s.value}</p>
                        </div>
                    ))}
                </div>
                {saved ? (
                    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-emerald-500/[0.07] p-3 dark:bg-neon-green/[0.06]">
                        <CheckCircle2 size={16} className="shrink-0 text-emerald-600 dark:text-neon-green" />
                        <p className="min-w-0 flex-1 text-[13px] font-semibold text-emerald-800 dark:text-emerald-200">
                            {dirty ? 'Saved earlier. Save again to keep your latest changes.' : `In ${links.name} as a draft.`}
                        </p>
                        <Button size="sm" variant="secondary" onClick={() => navigate(links.edit(saved.id))} disabled={dirty} title={dirty ? 'Save your changes first' : undefined}>
                            <ExternalLink size={14} /> Open in editor
                        </Button>
                    </div>
                ) : (
                    <p className="mt-4 text-[12.5px] text-gray-500">
                        Check it over, then <span className="font-semibold text-gray-700 dark:text-zinc-300">Save as draft</span> to add it to {links.name}. For custom pages, attachments and sending, open it in the full editor after saving.
                    </p>
                )}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" className="h-11" onClick={openEdit} disabled={Boolean(busy)}><Pencil size={15} /> Edit details</Button>
                <Button variant="secondary" className="h-11" onClick={regenerate} disabled={Boolean(busy) || !brief}><RotateCcw size={15} /> Regenerate</Button>
                <Button variant="secondary" className="h-11" onClick={() => setExporting(true)} disabled={exporting || Boolean(busy)}>
                    {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} {exporting ? 'Preparing…' : 'Download PDF'}
                </Button>
                <Button variant="secondary" className="h-11" onClick={startNew} disabled={busy === 'revise'}><Plus size={15} /> New draft</Button>
            </div>

            {undoStack.length > 0 && !busy && (
                <button type="button" onClick={undo} className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-black/[0.08] px-3 py-2 text-left text-[13px] font-semibold text-gray-700 hover:border-black/20 dark:border-white/[0.08] dark:text-zinc-300 dark:hover:border-white/20">
                    <Undo2 size={15} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate">Undo {undoStack[undoStack.length - 1].label}</span>
                </button>
            )}

            {errorBox}

            {busy === 'generate' && (
                <GenerationProgress label="Regenerating" seconds={genElapsed} onCancel={cancel} tone={resultCfg.tone} />
            )}

            {/* Ask for changes */}
            <div className="rounded-2xl border border-black/[0.06] bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
                <div className="mb-3 flex items-center gap-2">
                    <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', moduleAccent.chip)}><Wand2 size={15} /></span>
                    <h3 className="text-[15px] font-bold">Ask for changes</h3>
                </div>
                {busy === 'revise' ? (
                    <GenerationProgress label="Applying your change" seconds={elapsed} onCancel={cancel} tone={resultCfg.tone} />
                ) : (
                    <>
                        <textarea
                            ref={instructionRef}
                            value={instruction}
                            onChange={(e) => setInstruction(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); revise(); } }}
                            rows={3}
                            disabled={Boolean(busy)}
                            placeholder={module === 'contract' ? 'e.g. Add a 15-day cancellation notice' : 'e.g. Add a second price option for 5 cities'}
                            aria-label="Change to make"
                            className="block w-full resize-y rounded-xl border border-black/10 bg-white px-3.5 py-3 text-[15px] leading-relaxed outline-none placeholder:text-gray-400 focus:border-black/25 dark:border-white/10 dark:bg-white/[0.03] dark:placeholder:text-zinc-500 dark:focus:border-white/25"
                        />
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {REVISION_IDEAS[module].map(idea => (
                                <button key={idea} type="button" onClick={() => setInstruction(idea)} className="min-h-10 rounded-lg bg-black/[0.04] px-2.5 py-1.5 text-left text-[12.5px] font-medium text-gray-600 hover:bg-black/[0.07] hover:text-gray-900 dark:bg-white/[0.05] dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white">
                                    {idea}
                                </button>
                            ))}
                        </div>
                        <div className="mt-3 flex justify-end">
                            <Button variant="accent" onClick={() => revise()} disabled={instruction.trim().length < 3 || Boolean(busy)}>
                                <Sparkles size={15} /> Apply change
                            </Button>
                        </div>
                    </>
                )}
                {changes.length > 0 && (
                    <ul className="mt-4 space-y-1.5 border-t border-black/[0.06] pt-3 dark:border-white/[0.06]">
                        {changes.slice().reverse().map(c => (
                            <li key={c.id} className="flex items-start gap-2 text-[13px]">
                                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                                <span className="min-w-0 flex-1 break-words text-gray-700 dark:text-zinc-300">{c.text}</span>
                                <span className="shrink-0 text-[11.5px] text-gray-400">{timeAgo(c.at)}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* The brief */}
            {brief && (
                <details className="group rounded-2xl border border-black/[0.06] bg-white dark:border-white/[0.08] dark:bg-white/[0.03]">
                    <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-[14px] font-bold [&::-webkit-details-marker]:hidden">
                        <span className="flex-1">Your brief</span>
                        <ChevronDown size={16} className="text-gray-400 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="space-y-3 px-4 pb-4">
                        <p className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words text-[13px] leading-relaxed text-gray-600 dark:text-zinc-400">{brief.prompt || '—'}</p>
                        <p className="text-[12px] text-gray-500">
                            Tone: {TONES.find(t => t.value === brief.tone)?.label || brief.tone}
                            {brief.files?.length ? ` · Files: ${brief.files.join(', ')}` : ''}
                        </p>
                        <Button size="sm" variant="secondary" onClick={editBrief} disabled={Boolean(busy)}><Pencil size={14} /> Change the brief</Button>
                    </div>
                </details>
            )}
        </div>
    );

    const resultView = (
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <div className="shrink-0 border-b border-black/[0.06] px-4 py-2 dark:border-white/[0.06] lg:hidden">
                <SegmentedTabs
                    value={mobileTab}
                    onChange={setMobileTab}
                    items={[{ value: 'preview', label: 'Preview' }, { value: 'details', label: 'Edit and save' }]}
                    className="w-full [&>button]:flex-1 [&>button]:justify-center"
                />
            </div>
            <aside className={cn(
                'min-h-0 overflow-y-auto overscroll-contain border-black/[0.06] dark:border-white/[0.06] lg:block lg:w-[440px] lg:shrink-0 lg:border-r',
                mobileTab === 'details' ? 'flex-1' : 'hidden'
            )}>
                {resultPanel}
            </aside>
            <main className={cn('min-h-0 flex-1 flex-col bg-[#eceef2] dark:bg-black/40 lg:flex', mobileTab === 'preview' ? 'flex' : 'hidden')}>
                {busy && (
                    <div className={cn('mx-4 mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-[12.5px] font-semibold lg:hidden', ra.soft, ra.text)}>
                        <Loader2 size={14} className="animate-spin" /> {busy === 'revise' ? 'Applying your change…' : 'Regenerating…'}
                        <button type="button" onClick={cancel} className="ml-auto h-8 rounded-lg px-2 underline">Cancel</button>
                    </div>
                )}
                {doc && <DocumentPreview module={module} doc={doc} contractPages={contract.paginatedPages} className={cn('flex-1', busy && 'opacity-60')} />}
            </main>
        </div>
    );

    return (
        <div className="flex h-dvh flex-col overflow-hidden bg-[#f6f7f9] font-heading text-gray-900 dark:bg-[#07080b] dark:text-white">
            {header}
            {phase === 'result' && doc ? resultView : composeView}

            {phase === 'result' && module === 'proposal' && (
                <ProposalEditSheet open={editOpen} onClose={closeEdit} doc={proposalDoc} onChange={setProposalDoc} />
            )}
            {phase === 'result' && module === 'contract' && (
                <ContractEditSheet
                    open={editOpen}
                    onClose={closeEdit}
                    contract={contract}
                    onRefine={(title) => { closeEdit(); setInstruction(`Rewrite the "${title || 'selected'}" clause so that `); setMobileTab('details'); setTimeout(() => instructionRef.current?.focus(), 350); }}
                />
            )}

            <HistorySheet
                open={historyOpen}
                onClose={() => setHistoryOpen(false)}
                entries={history.entries}
                activeId={phase === 'result' ? entryId : null}
                onOpen={openEntry}
                onRemove={askRemove}
                onClear={askClear}
            />

            <Sheet
                open={Boolean(confirm)}
                onClose={() => setConfirm(null)}
                variant="dialog"
                size="sm"
                title={confirm?.title}
                footer={(
                    <div className="flex gap-2">
                        <Button variant="secondary" className="h-11 flex-1" onClick={() => setConfirm(null)}>Keep</Button>
                        <Button variant="danger" className="h-11 flex-1" onClick={() => { const fn = confirm?.action; setConfirm(null); fn?.(); }}>{confirm?.label}</Button>
                    </div>
                )}
            >
                <p className="text-[14px] text-gray-600 dark:text-zinc-300">{confirm?.body}</p>
            </Sheet>

            {exporting && doc && <ExportPages ref={exportRef} module={module} doc={doc} contractPages={contract.paginatedPages} />}
        </div>
    );
};

export default AIStudio;
