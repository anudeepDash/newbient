import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Eye from 'lucide-react/dist/esm/icons/eye';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Send from 'lucide-react/dist/esm/icons/send';
import Save from 'lucide-react/dist/esm/icons/save';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Download from 'lucide-react/dist/esm/icons/download';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Lock from 'lucide-react/dist/esm/icons/lock';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Users from 'lucide-react/dist/esm/icons/users';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import ImageIcon from 'lucide-react/dist/esm/icons/image';
import Target from 'lucide-react/dist/esm/icons/target';
import ClipboardList from 'lucide-react/dist/esm/icons/clipboard-list';
import Layers from 'lucide-react/dist/esm/icons/layers';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import Building2 from 'lucide-react/dist/esm/icons/building-2';
import PenTool from 'lucide-react/dist/esm/icons/pen-tool';
import Paperclip from 'lucide-react/dist/esm/icons/paperclip';
import Briefcase from 'lucide-react/dist/esm/icons/briefcase';
import ScrollText from 'lucide-react/dist/esm/icons/scroll-text';

import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { cn } from '../../lib/utils';
import { isProposalClosed, nextProposalNumber, proposalState, PROPOSAL_STATE_LABEL, PROPOSAL_STATUS } from '../../lib/proposals';
import { useAccent } from '../../components/admin/theme';
import { Badge, Button, EmptyState } from '../../components/admin/ui';
import Sheet from '../../components/admin/Sheet';
import {
    V2CoverEditor, V2StrategyEditor, V2BlueprintEditor, V2DeliverablesEditor, V2PricingEditor, V2DeepDiveEditor, V2ClosingEditor,
} from '../../components/admin/V2ProposalEditorSections';
import {
    LegacyCoverEditor, LegacyStrategyEditor, LegacyScopeEditor, LegacyDeliverablesEditor, LegacyPricingEditor, LegacyPaymentEditor,
} from '../../components/admin/proposals/builder/LegacySections';
import { ClientSection, DetailsSection, CustomPagesSection, SignaturesSection, AttachmentsSection } from '../../components/admin/proposals/builder/CommonSections';
import ReviewSection from '../../components/admin/proposals/builder/ReviewSection';
import PreviewPane from '../../components/admin/proposals/builder/PreviewPane';
import { AiSheet, RefineSheet } from '../../components/admin/proposals/builder/AiSheet';
import { exportProposalPdf } from '../../components/admin/proposals/builder/exportPdf';
import '../../lib/documentFonts';
import {
    CLIENT_OWNED_FIELDS, applyAiDraft, applyRevision, aiItems, checkBeforeSharing, computeTotals, contentForAi, getProposalPages,
    isPlaceholderItem, isV2Proposal, loadForEditing, newProposalData,
} from '../../components/admin/proposals/builder/model';

/*
 * Proposal builder (/admin/create-proposal and /admin/edit-proposal/:id).
 *
 * New proposals use the 8-page "v2" paper; older proposals keep the classic
 * paper they were made with. Changes save automatically a few seconds after
 * you stop typing. Accepted or declined proposals are locked so the version
 * the client answered stays as it was.
 */

// Sections in the order you'd fill them. `page` is the preview page to show.
const V2_SECTIONS = [
    { id: 'client', label: 'Client', icon: Users, desc: 'Who it is for and how to reach them', page: 'v2-cover' },
    { id: 'details', label: 'Number & brand', icon: FileText, desc: 'Proposal number, validity and logo', page: 'v2-cover' },
    { id: 'cover', label: 'Campaign & cover', icon: ImageIcon, desc: 'Project name and the cover page', page: 'v2-cover' },
    { id: 'strategy', label: 'Strategy', icon: Target, desc: 'Executive summary and objective', page: 'v2-executive' },
    { id: 'plan', label: 'Plan & timeline', icon: ClipboardList, desc: 'How you will execute, step by step', page: 'v2-blueprint-1' },
    { id: 'deliverables', label: 'Deliverables', icon: Layers, desc: 'What the client gets and when', page: 'v2-deliverables' },
    { id: 'pricing', label: 'Pricing & payment', icon: CreditCard, desc: 'Prices, GST and payment terms', page: 'v2-commercials' },
    { id: 'deepdive', label: 'City deep-dive', icon: Building2, desc: 'The lead market in detail', page: 'v2-deepdive' },
    { id: 'terms', label: 'Terms & pages', icon: ScrollText, desc: 'Terms and conditions and extra pages', page: 'v2-custom' },
    { id: 'sign', label: 'Closing & signing', icon: PenTool, desc: 'Next steps, acceptance, signature and seal', page: 'v2-closing' },
    { id: 'files', label: 'Attachments', icon: Paperclip, desc: 'Files and links for the client', page: null },
    { id: 'review', label: 'Review & send', icon: Send, desc: 'Check it and send it', page: null },
];

const LEGACY_SECTIONS = [
    { id: 'client', label: 'Client', icon: Users, desc: 'Who it is for and how to reach them', page: 'cover' },
    { id: 'details', label: 'Number & brand', icon: FileText, desc: 'Proposal number, validity and logo', page: 'cover' },
    { id: 'cover', label: 'Campaign & cover', icon: ImageIcon, desc: 'Project name and the cover note', page: 'cover' },
    { id: 'strategy', label: 'Strategy', icon: Target, desc: 'Executive summary and objective', page: 'strategy' },
    { id: 'scope', label: 'Scope of work', icon: ClipboardList, desc: 'What the work covers', page: 'scope' },
    { id: 'deliverables', label: 'Deliverables', icon: Layers, desc: 'What you deliver and when', page: 'proposal' },
    { id: 'pricing', label: 'Price table', icon: Briefcase, desc: 'Line items and columns', page: 'table' },
    { id: 'payment', label: 'Payment & terms', icon: CreditCard, desc: 'GST, advance, terms and bank details', page: 'commercials' },
    { id: 'terms', label: 'Extra pages', icon: ScrollText, desc: 'More pages anywhere in the document', page: 'custom' },
    { id: 'sign', label: 'Signing', icon: PenTool, desc: 'Acceptance, signature and seal', page: 'commercials' },
    { id: 'files', label: 'Attachments', icon: Paperclip, desc: 'Files and links for the client', page: 'attachments' },
    { id: 'review', label: 'Review & send', icon: Send, desc: 'Check it and send it', page: null },
];

const timeNow = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const SectionNavButton = ({ s, index, active, onClick, compact }) => {
    const a = useAccent();
    if (compact) {
        return (
            <button type="button" onClick={onClick} aria-current={active ? 'step' : undefined}
                className={cn('flex h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold transition-colors',
                    active ? a.solid : 'text-gray-500 hover:bg-black/5 hover:text-gray-900 dark:hover:bg-white/5 dark:hover:text-white')}>
                <s.icon size={14} /> {s.label}
            </button>
        );
    }
    return (
        <button type="button" onClick={onClick} aria-current={active ? 'step' : undefined}
            className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                active ? cn(a.soft, 'text-gray-900 dark:text-white') : 'text-gray-600 hover:bg-black/[0.04] dark:text-zinc-400 dark:hover:bg-white/[0.04]')}>
            <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', active ? a.chip : 'bg-black/[0.04] dark:bg-white/[0.06]')}><s.icon size={15} /></span>
            <span className="min-w-0">
                <span className="block truncate text-[13px] font-bold">{s.label}</span>
                <span className="block text-[11px] tabular-nums text-gray-400">Step {index + 1}</span>
            </span>
        </button>
    );
};

const ProposalGenerator = () => {
    useStoreSubscription(['proposals']);
    const { id } = useParams();
    const navigate = useNavigate();
    const a = useAccent();
    const proposals = useStore(s => s.proposals);
    const proposalsLoaded = useStore(s => Boolean(s.subscriptionsLoaded?.proposals));
    const activeModel = useStore(s => s.activeModel);
    const addToast = useStore(s => s.addToast);

    const [formData, setFormData] = useState(newProposalData);
    const [items, setItems] = useState([]);
    const [section, setSection] = useState('client');
    const [previewPage, setPreviewPage] = useState(0);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [aiOpen, setAiOpen] = useState(false);
    const [refineTarget, setRefineTarget] = useState(null);
    const [autosaveStatus, setAutosaveStatus] = useState('idle'); // idle | saving | saved | error
    const [lastSaved, setLastSaved] = useState('');
    const [saving, setSaving] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [copying, setCopying] = useState(false);

    // ── loading and change tracking ──
    const loadedIdRef = useRef(null);            // which proposal the form holds
    const justCreatedIdRef = useRef(null);       // set when this editor created the proposal
    const autoNumberRef = useRef('');            // the number we filled in (replaced on first save if still untouched)
    const savedSnapRef = useRef(null);           // what the last save (or load) looked like
    const dirtyRef = useRef(false);
    const revisionRef = useRef(0);
    const createPromiseRef = useRef(null);       // one shared create, so a slow network can't make duplicates
    const pendingIdRef = useRef(null);           // a copy we just made and are waiting to load

    const snapshot = useCallback((fd, its) => JSON.stringify([
        { ...fd, proposalNumber: fd.proposalNumber === autoNumberRef.current ? '' : fd.proposalNumber },
        its,
    ]), []);

    const currentId = id || justCreatedIdRef.current;
    const live = currentId ? (proposals || []).find(p => p.id === currentId) : null;
    const locked = Boolean(live && isProposalClosed(live));
    const notFound = Boolean(id && proposalsLoaded && !live && id !== justCreatedIdRef.current && id !== pendingIdRef.current);
    const isV2 = isV2Proposal(formData);
    const sections = isV2 ? V2_SECTIONS : LEGACY_SECTIONS;

    // A new proposal: remember the blank state so only real edits create a document.
    useEffect(() => {
        if (id) return;
        if (savedSnapRef.current === null) savedSnapRef.current = snapshot(formData, items);
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    // A new proposal gets the next number in the NBQ series once proposals load.
    useEffect(() => {
        if (id || justCreatedIdRef.current || !proposalsLoaded) return;
        setFormData(prev => {
            if (prev.proposalNumber && prev.proposalNumber !== autoNumberRef.current) return prev;
            const next = nextProposalNumber(proposals);
            autoNumberRef.current = next;
            return prev.proposalNumber === next ? prev : { ...prev, proposalNumber: next };
        });
    }, [id, proposals, proposalsLoaded]);

    // Load an existing proposal once (later server updates don't overwrite what you're typing).
    useEffect(() => {
        if (!id || loadedIdRef.current === id) return;
        if (id === justCreatedIdRef.current) { loadedIdRef.current = id; return; }
        const p = (proposals || []).find(x => x.id === id);
        if (!p) return;
        if (p.isUploaded) { navigate(`/admin/proposals?edit=${id}`, { replace: true }); return; }
        const loaded = loadForEditing(p);
        const loadedItems = (Array.isArray(p.items) ? p.items : []).filter(it => !(isV2Proposal(p) && isPlaceholderItem(it)));
        setFormData(loaded);
        setItems(loadedItems);
        loadedIdRef.current = id;
        autoNumberRef.current = '';
        savedSnapRef.current = snapshot(loaded, loadedItems);
        dirtyRef.current = false;
        createPromiseRef.current = null;
        setAutosaveStatus('idle');
    }, [id, proposals, navigate, snapshot]);

    // Every edit bumps the revision; a save only clears "dirty" if nothing changed meanwhile.
    useEffect(() => {
        if (savedSnapRef.current === null) return;
        if (id && loadedIdRef.current !== id) return;
        if (snapshot(formData, items) === savedSnapRef.current) { dirtyRef.current = false; return; }
        dirtyRef.current = true;
        revisionRef.current += 1;
    }, [formData, items]); // eslint-disable-line react-hooks/exhaustive-deps

    const totals = useMemo(() => computeTotals(formData, items), [formData, items]);

    // One save path for autosave and the Save button.
    const persist = async () => {
        const targetId = id || justCreatedIdRef.current;
        // Never write while the form still holds a different proposal (switching to a copy).
        if (id && loadedIdRef.current !== id) throw Object.assign(new Error('Still loading.'), { code: 'LOADING' });
        const liveNow = targetId ? (useStore.getState().proposals || []).find(p => p.id === targetId) : null;
        if (liveNow && isProposalClosed(liveNow)) throw Object.assign(new Error('This proposal is closed.'), { code: 'CLOSED' });
        const revision = revisionRef.current;
        const snap = snapshot(formData, items);
        const cleanItems = isV2 ? items.filter(it => !isPlaceholderItem(it)) : items;
        const data = JSON.parse(JSON.stringify({
            ...formData,
            items: cleanItems,
            subtotal: totals.subtotal,
            gstAmount: totals.gstAmount,
            totalAmount: totals.totalAmount,
            updatedAt: new Date().toISOString(),
        }));
        if (targetId) {
            CLIENT_OWNED_FIELDS.forEach(k => { delete data[k]; });
            await useStore.getState().updateProposal(targetId, data);
        } else {
            CLIENT_OWNED_FIELDS.forEach(k => { delete data[k]; });
            data.status = PROPOSAL_STATUS.DRAFT;
            // Untouched auto number: take the next free one at the moment of saving.
            if (!data.proposalNumber || data.proposalNumber === autoNumberRef.current) {
                const fresh = nextProposalNumber(useStore.getState().proposals || []);
                const old = autoNumberRef.current;
                data.proposalNumber = fresh;
                autoNumberRef.current = fresh;
                setFormData(prev => (!prev.proposalNumber || prev.proposalNumber === old ? { ...prev, proposalNumber: fresh } : prev));
            }
            if (!createPromiseRef.current) {
                createPromiseRef.current = useStore.getState().addProposal(data).catch(err => { createPromiseRef.current = null; throw err; });
            }
            const newId = await createPromiseRef.current;
            justCreatedIdRef.current = newId;
            loadedIdRef.current = newId;
            navigate(`/admin/edit-proposal/${newId}`, { replace: true });
        }
        if (revisionRef.current === revision) {
            dirtyRef.current = false;
            savedSnapRef.current = snap;
        }
        // Images (signature, pictures in text) are stored as files on save. Swap the
        // stored links in so the next save doesn't upload the same image again.
        const pid = targetId || justCreatedIdRef.current;
        const stored = (useStore.getState().proposals || []).find(p => p.id === pid);
        if (stored) {
            const swaps = {};
            Object.keys(formData).forEach(k => {
                const mine = JSON.stringify(formData[k] ?? null);
                if (mine.includes(';base64,') && stored[k] !== undefined && !JSON.stringify(stored[k]).includes(';base64,')) swaps[k] = stored[k];
            });
            if (Object.keys(swaps).length) {
                const sent = formData;
                setFormData(prev => {
                    const next = { ...prev };
                    Object.entries(swaps).forEach(([k, v]) => { if (prev[k] === sent[k]) next[k] = v; });
                    return next;
                });
                if (revisionRef.current === revision) savedSnapRef.current = snapshot({ ...formData, ...swaps }, items);
            }
        }
        setAutosaveStatus('saved');
        setLastSaved(timeNow());
        return targetId || justCreatedIdRef.current;
    };
    const persistRef = useRef(persist);
    persistRef.current = persist;

    // Autosave a few seconds after the last change.
    useEffect(() => {
        if (!dirtyRef.current || locked || notFound || (id && loadedIdRef.current !== id)) return undefined;
        const timer = setTimeout(async () => {
            if (!dirtyRef.current) return;
            setAutosaveStatus('saving');
            try {
                await persistRef.current();
            } catch (err) {
                console.error('Proposal autosave failed:', err);
                setAutosaveStatus(err?.code === 'CLOSED' || err?.code === 'LOADING' ? 'idle' : 'error');
            }
        }, 3000);
        return () => clearTimeout(timer);
    }, [formData, items, id, locked, notFound]);

    // Warn before closing the tab with unsaved changes.
    useEffect(() => {
        const onBeforeUnload = (e) => {
            if (!dirtyRef.current || locked) return;
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [locked]);

    const clashWith = (number) => {
        const n = String(number || '').trim().toUpperCase();
        return n && (proposals || []).find(p => p.id !== currentId && String(p.proposalNumber || '').trim().toUpperCase() === n);
    };

    const save = async ({ quiet } = {}) => {
        if (locked) return currentId;
        if (saving) return null;
        const clash = formData.proposalNumber !== autoNumberRef.current && clashWith(formData.proposalNumber);
        if (clash && !window.confirm(`${formData.proposalNumber} is already used by another proposal${clash.clientName ? ` (${clash.clientName})` : ''}. Save with the same number anyway?`)) return null;
        setSaving(true);
        setAutosaveStatus('saving');
        try {
            const pid = await persist();
            if (!quiet) addToast('Proposal saved.', 'success');
            return pid;
        } catch (err) {
            console.error(err);
            setAutosaveStatus('error');
            addToast(err?.code === 'CLOSED' ? 'The client already answered it, so it can no longer be changed.' : 'Check your connection and try again.', 'error', { title: 'Proposal not saved' });
            return null;
        } finally {
            setSaving(false);
        }
    };

    // Used before sharing: saves if needed, resolves to the proposal id.
    const ensureSaved = async () => {
        if (currentId && !dirtyRef.current) return currentId;
        return save({ quiet: true });
    };

    const leave = async () => {
        if (dirtyRef.current && !locked && !notFound) {
            const pid = await save({ quiet: true });
            if (!pid && !window.confirm("Your latest changes aren't saved. Leave anyway?")) return;
        }
        navigate('/admin/proposals');
    };

    // ── preview ──
    const deferredForm = useDeferredValue(formData);
    const deferredItems = useDeferredValue(items);
    const pages = useMemo(() => getProposalPages(deferredForm, deferredItems), [deferredForm, deferredItems]);
    const previewTotals = useMemo(() => computeTotals(deferredForm, deferredItems), [deferredForm, deferredItems]);
    useEffect(() => {
        if (previewPage >= pages.length && pages.length) setPreviewPage(pages.length - 1);
    }, [pages.length, previewPage]);

    const scrollRef = useRef(null);
    const pillsRef = useRef(null);
    useEffect(() => {
        const nav = pillsRef.current;
        const pill = nav?.querySelector('[aria-current="step"]');
        if (nav && pill) nav.scrollTo({ left: pill.offsetLeft - nav.clientWidth / 2 + pill.clientWidth / 2, behavior: 'smooth' });
    }, [section]);
    const goTo = (sectionId) => {
        const s = sections.find(x => x.id === sectionId) || sections[0];
        setSection(s.id);
        if (s.page) {
            const idx = pages.findIndex(p => p.type === s.page);
            if (idx >= 0) setPreviewPage(idx);
        }
        scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };
    useEffect(() => {
        if (!sections.some(s => s.id === section)) setSection('client');
    }, [sections, section]);

    const index = Math.max(0, sections.findIndex(s => s.id === section));
    const current = sections[index];

    const download = async () => {
        if (downloading) return;
        setDownloading(true);
        try {
            await exportProposalPdf(formData, items);
        } catch (err) {
            console.error(err);
            addToast('Please try again.', 'error', { title: "Couldn't create the PDF", action: { label: 'Try again', onClick: () => download() } });
        } finally {
            setDownloading(false);
        }
    };

    const makeCopy = async () => {
        if (!currentId || copying) return;
        setCopying(true);
        try {
            const newId = await useStore.getState().duplicateProposal(currentId);
            pendingIdRef.current = newId;
            dirtyRef.current = false;
            addToast('Copied as a new draft.', 'success');
            navigate(`/admin/edit-proposal/${newId}`);
        } catch (err) {
            console.error(err);
            addToast('Please try again.', 'error', { title: "Couldn't copy the proposal" });
        } finally {
            setCopying(false);
        }
    };

    // ── AI ──
    const onRefine = useCallback((target) => setRefineTarget(target), []);
    const applyAi = (mode, data) => {
        if (mode === 'draft') {
            setFormData(prev => applyAiDraft(prev, data));
            if (!isV2) { const its = aiItems(data); if (its) setItems(its); }
            goTo('client');
        } else {
            setFormData(prev => applyRevision(prev, data));
            if (!isV2) { const its = aiItems(data); if (its) setItems(its); }
        }
    };
    const getAiDoc = () => contentForAi(formData, items);

    const checks = useMemo(() => checkBeforeSharing(formData, { totals, proposals, id: currentId }), [formData, totals, proposals, currentId]);
    const state = live ? proposalState(live) : 'draft';
    const stateCfg = PROPOSAL_STATE_LABEL[state];

    const sectionProps = { formData, setFormData, onRefine, totals };
    const renderSection = () => {
        switch (section) {
            case 'client': return <ClientSection formData={formData} setFormData={setFormData} isV2={isV2} />;
            case 'details': return <DetailsSection formData={formData} setFormData={setFormData} />;
            case 'cover': return isV2 ? <V2CoverEditor {...sectionProps} /> : <LegacyCoverEditor {...sectionProps} />;
            case 'strategy': return isV2 ? <V2StrategyEditor {...sectionProps} /> : <LegacyStrategyEditor {...sectionProps} />;
            case 'plan': return <V2BlueprintEditor {...sectionProps} />;
            case 'scope': return <LegacyScopeEditor {...sectionProps} />;
            case 'deliverables': return isV2 ? <V2DeliverablesEditor {...sectionProps} /> : <LegacyDeliverablesEditor {...sectionProps} />;
            case 'pricing': return isV2 ? <V2PricingEditor {...sectionProps} /> : <LegacyPricingEditor {...sectionProps} items={items} setItems={setItems} />;
            case 'payment': return <LegacyPaymentEditor {...sectionProps} />;
            case 'deepdive': return <V2DeepDiveEditor {...sectionProps} />;
            case 'terms': return <CustomPagesSection formData={formData} setFormData={setFormData} isV2={isV2} onRefine={onRefine} />;
            case 'sign': return (
                <div className="space-y-5">
                    {isV2 && <V2ClosingEditor {...sectionProps} />}
                    <SignaturesSection formData={formData} setFormData={setFormData} isV2={isV2} />
                </div>
            );
            case 'files': return <AttachmentsSection formData={formData} setFormData={setFormData} />;
            case 'review': return (
                <ReviewSection
                    id={currentId}
                    formData={formData}
                    live={live}
                    totals={totals}
                    checks={checks}
                    onGoto={goTo}
                    ensureSaved={ensureSaved}
                    onDownload={download}
                    downloading={downloading}
                    locked={locked}
                />
            );
            default: return null;
        }
    };

    const saveText = locked ? 'Locked'
        : autosaveStatus === 'saving' ? 'Saving…'
            : autosaveStatus === 'error' ? "Couldn't save. Check your connection."
                : autosaveStatus === 'saved' ? `Saved ${lastSaved}`
                    : currentId ? 'Changes save automatically' : 'Saves once you start editing';

    if (notFound) {
        return (
            <div className="flex h-dvh items-center justify-center bg-[#f6f7f9] px-4 dark:bg-[#07080b]">
                <EmptyState icon={FileText} title="Proposal not found" description="It may have been deleted, or the link is wrong." action={<Button variant="primary" as={Link} to="/admin/proposals">Back to proposals</Button>} />
            </div>
        );
    }
    const waiting = Boolean(id && loadedIdRef.current !== id);

    return (
        <div className="flex h-dvh flex-col overflow-hidden bg-[#f6f7f9] font-heading text-gray-900 dark:bg-[#07080b] dark:text-white">
            {/* Fonts the document paper uses. */}
            <style dangerouslySetInnerHTML={{ __html: ".font-signature{font-family:'Caveat',cursive;}" }} />

            <header className="relative z-30 shrink-0 border-b border-black/[0.06] bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#07080b]/90">
                <div className="flex h-14 items-center gap-1.5 px-2 sm:gap-2 sm:px-4">
                    <button type="button" onClick={leave} aria-label="Back to proposals" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10">
                        <ArrowLeft size={18} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate text-[15px] font-bold leading-tight">
                                {waiting ? 'Loading…' : currentId ? (formData.clientName || 'Untitled proposal') : 'New proposal'}
                                {!waiting && formData.proposalNumber && <span className="font-medium text-gray-500"> · {formData.proposalNumber}</span>}
                            </p>
                            <Badge tone={stateCfg.tone} className="hidden sm:inline-flex">{stateCfg.label}</Badge>
                        </div>
                        <p className={cn('truncate text-[11.5px] font-medium', autosaveStatus === 'error' ? 'text-red-500' : 'text-gray-500')}>{saveText}</p>
                    </div>
                    {!locked && (
                        <Button variant="secondary" size="sm" className="h-10" onClick={() => setAiOpen(true)} aria-label="Write with AI">
                            <Sparkles size={15} className={a.text} /> <span className="hidden sm:inline">AI</span>
                        </Button>
                    )}
                    <Button variant="secondary" size="sm" className="h-10 lg:hidden" onClick={() => setPreviewOpen(true)} aria-label="Preview">
                        <Eye size={15} /> <span className="hidden sm:inline">Preview</span>
                    </Button>
                    <Button variant="secondary" size="sm" className="hidden h-10 lg:inline-flex" onClick={download} disabled={downloading}>
                        {downloading ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />} PDF
                    </Button>
                    <Button variant="accent" size="sm" className="h-10" onClick={() => goTo('review')}>
                        <Send size={15} /> <span className="hidden sm:inline">{locked ? 'Share' : 'Review & send'}</span>
                    </Button>
                </div>
                <nav ref={pillsRef} aria-label="Proposal sections" className="flex gap-1 overflow-x-auto px-2 pb-2 [scrollbar-width:none] sm:px-4 xl:hidden [&::-webkit-scrollbar]:hidden">
                    {sections.map((s, i) => <SectionNavButton key={s.id} s={s} index={i} active={s.id === section} onClick={() => goTo(s.id)} compact />)}
                </nav>
            </header>

            <main className="flex min-h-0 flex-1 overflow-hidden">
                <aside className="hidden w-60 shrink-0 flex-col gap-1 overflow-y-auto border-r border-black/[0.06] p-3 dark:border-white/[0.06] xl:flex">
                    <p className="px-3 pb-1 pt-1 text-[12px] font-bold text-gray-500">{isV2 ? 'Proposal' : 'Classic proposal'}</p>
                    {sections.map((s, i) => <SectionNavButton key={s.id} s={s} index={i} active={s.id === section} onClick={() => goTo(s.id)} />)}
                </aside>

                <section ref={scrollRef} className="relative flex min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain">
                    <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-8 pt-5 sm:px-6">
                        <div className="mb-5 flex items-start gap-3">
                            <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', a.chip)}><current.icon size={20} /></span>
                            <div className="min-w-0">
                                <h1 className="text-[22px] font-extrabold leading-tight tracking-tight">{current.label}</h1>
                                <p className="text-[13px] text-gray-500">{current.desc}</p>
                            </div>
                        </div>

                        {locked && (
                            <div className={cn('mb-5 rounded-2xl border p-4', live.status === PROPOSAL_STATUS.ACCEPTED ? 'border-emerald-500/30 bg-emerald-500/[0.06]' : 'border-red-500/30 bg-red-500/[0.06]')}>
                                <p className="flex items-center gap-2 text-[14px] font-bold"><Lock size={15} /> {live.status === PROPOSAL_STATUS.ACCEPTED ? 'Accepted. This proposal is locked.' : 'Declined. This proposal is locked.'}</p>
                                <p className="mt-1 text-[13px] text-gray-600 dark:text-zinc-400">
                                    {live.status === PROPOSAL_STATUS.ACCEPTED
                                        ? 'It stays exactly as the client signed it. To change the offer, make a copy and send that.'
                                        : 'To send a new offer, make a copy, update it and send it.'}
                                    {dirtyRef.current ? ' Your last unsaved edits were not applied.' : ''}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Button variant="secondary" size="sm" className="h-10" onClick={makeCopy} disabled={copying}><Copy size={14} /> Make a new draft copy</Button>
                                    {section !== 'review' && <Button variant="ghost" size="sm" className="h-10" onClick={() => goTo('review')}>Share or invoice</Button>}
                                </div>
                            </div>
                        )}

                        {waiting ? (
                            <p className="flex items-center gap-2 py-10 text-[14px] text-gray-500"><RefreshCw size={15} className="animate-spin" /> Loading the proposal…</p>
                        ) : (
                            <div inert={locked && section !== 'review' ? true : undefined} className={cn(locked && section !== 'review' && 'opacity-60')}>
                                {renderSection()}
                            </div>
                        )}
                    </div>

                    {/* Sticky save bar */}
                    <div className="sticky bottom-0 z-20 border-t border-black/[0.06] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#0a0b0f]/95">
                        <div className="mx-auto flex h-16 max-w-3xl items-center gap-2 px-3 sm:px-6">
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] text-gray-500">{isV2 ? 'Deal value' : 'Total'}</p>
                                <p className="truncate text-[16px] font-extrabold tabular-nums">{totals.totalAmount ? `₹${totals.totalAmount.toLocaleString('en-IN')}` : '—'}</p>
                            </div>
                            <button type="button" onClick={() => goTo(sections[index - 1]?.id)} disabled={index === 0} aria-label="Previous section" className="flex h-11 w-11 items-center justify-center rounded-xl border border-black/10 disabled:opacity-30 dark:border-white/10"><ChevronLeft size={18} /></button>
                            {index < sections.length - 1 ? (
                                <button type="button" onClick={() => goTo(sections[index + 1].id)} className="flex h-11 items-center gap-1 rounded-xl border border-black/10 px-3 text-[13px] font-bold dark:border-white/10">
                                    <span className="hidden sm:inline">{sections[index + 1].label}</span><span className="sm:hidden">Next</span> <ChevronRight size={16} />
                                </button>
                            ) : null}
                            {!locked && (
                                <Button variant="primary" className="h-11" onClick={() => save()} disabled={saving}>
                                    {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />} Save
                                </Button>
                            )}
                        </div>
                    </div>
                </section>

                <aside className="hidden w-[420px] shrink-0 border-l border-black/[0.06] dark:border-white/[0.06] lg:flex 2xl:w-[560px]">
                    {waiting ? <div className="w-full bg-gray-200/70 dark:bg-[#050608]" /> : (
                        <PreviewPane className="w-full" pages={pages} page={previewPage} onPage={setPreviewPage} formData={deferredForm} totals={previewTotals} />
                    )}
                </aside>
            </main>

            <Sheet open={previewOpen} onClose={() => setPreviewOpen(false)} size="xl" title="Preview" subtitle={formData.proposalNumber || undefined} bodyClassName="flex flex-col p-0"
                footer={<Button variant="secondary" className="h-11 w-full" onClick={download} disabled={downloading}>{downloading ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />} Download PDF</Button>}>
                <PreviewPane className="h-[70dvh]" pages={pages} page={previewPage} onPage={setPreviewPage} formData={deferredForm} totals={previewTotals} />
            </Sheet>

            <AiSheet open={aiOpen} onClose={() => setAiOpen(false)} onApply={applyAi} getDoc={getAiDoc} activeModel={activeModel}
                hasContent={Boolean(currentId || dirtyRef.current)} />
            <RefineSheet target={refineTarget} onClose={() => setRefineTarget(null)} />
        </div>
    );
};

export default ProposalGenerator;
