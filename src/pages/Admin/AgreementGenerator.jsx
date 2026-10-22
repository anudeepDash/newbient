import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Download from 'lucide-react/dist/esm/icons/download';
import Eye from 'lucide-react/dist/esm/icons/eye';
import Save from 'lucide-react/dist/esm/icons/save';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Users from 'lucide-react/dist/esm/icons/users';
import Target from 'lucide-react/dist/esm/icons/target';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import Gavel from 'lucide-react/dist/esm/icons/gavel';
import PenTool from 'lucide-react/dist/esm/icons/pen-tool';
import ListChecks from 'lucide-react/dist/esm/icons/list-checks';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Lock from 'lucide-react/dist/esm/icons/lock';
import CopyPlus from 'lucide-react/dist/esm/icons/copy-plus';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import Link2 from 'lucide-react/dist/esm/icons/link-2';
import Send from 'lucide-react/dist/esm/icons/send';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';

import { useStore } from '../../lib/store';
import { useStoreSubscription } from '../../hooks/useStoreSubscription';
import { cn } from '../../lib/utils';
import { copyToClipboard } from '../../lib/clipboard';
import DocumentSeal from '../../components/ui/DocumentSeal';
import { contractState, CONTRACT_STATE_LABEL, CONTRACT_STATUS } from '../../lib/contracts';
import { generateFullDocument, reviseDocument, refineFieldContent } from '../../lib/ai';

import useContractGenerator, { normalizeContract, paginateContract, newAgreementNumber } from '../../components/admin/useContractGenerator';
import ClauseMarketplace from '../../components/admin/ClauseMarketplace';
import ContractPreview from '../../components/admin/ContractPreview';
import RichEditor from '../../components/admin/RichEditor';
import Sheet from '../../components/admin/Sheet';
import { Button, Badge } from '../../components/admin/ui';
import { useAccent } from '../../components/admin/theme';
import { BuilderCard } from '../../components/admin/events/EditorParts';
import { fieldCls, areaCls, Field, Toggle, Choice, SignatureField } from '../../components/admin/uploads/UploadKit';
import PaperViewer from '../../components/admin/contracts/PaperViewer';
import { AIDraftSheet, AIRefineSheet } from '../../components/admin/contracts/ContractAISheets';
import {
    contractIssues, milestoneCheck, gstSummary, formatMoney, tidyAmountText, contractTotal,
    formatContractDate, parseContractDate,
} from '../../components/admin/contracts/contractRules';
import ThemedSelect from '../../components/admin/ThemedSelect';
import '../../lib/documentFonts';

const STEPS = [
    { id: 'parties', label: 'Parties', icon: Users, desc: 'Who the contract is between', page: 'intro' },
    { id: 'project', label: 'Project & scope', icon: Target, desc: 'Dates, term, scope of work and deliverables', page: 'mission' },
    { id: 'commercials', label: 'Commercials', icon: CreditCard, desc: 'Contract value, GST and when each payment is due', page: 'commercials' },
    { id: 'clauses', label: 'Clauses', icon: Gavel, desc: 'Terms and conditions, in the order they appear', page: 'clauses' },
    { id: 'signatures', label: 'Signatures', icon: PenTool, desc: 'Who signs, your signature and the seal', page: 'execution' },
    { id: 'review', label: 'Review', icon: ListChecks, desc: 'Check everything, then send it for signing' },
];

const LOGOS = [
    { id: 'entertainment', label: 'Entertainment', path: '/brand/newbi-logo-entertainment-800w.png' },
    { id: 'media', label: 'Media', path: '/brand/newbi-logo-media-800w.png' },
    { id: 'marketing', label: 'Marketing', path: '/brand/newbi-logo-marketing-800w.png' },
];

const TERM_PRESETS = ['One event', '1 month', '3 months', '6 months', '12 months'];

// Fields the client or the system owns. The editor never writes its (possibly stale) copy back.
const CLIENT_OWNED_FIELDS = ['id', 'status', 'approvalMetadata', 'clientSignature', 'accessLogs', 'lastOpened', 'createdAt', 'createdByEmail', 'executedAt', 'lastSharedAt', 'lastSharedVia', 'versions', 'negotiationHistory'];

const PROVIDER_KEY = 'newbi_contract_provider';
const readProvider = () => {
    try { return JSON.parse(window.localStorage.getItem(PROVIDER_KEY) || 'null'); } catch { return null; }
};

const plain = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim();

/** After a save, swap images that were uploaded (data URL → link) into the form, but only where the value hasn't changed since. */
const swapUploaded = (cur, sent, written) => {
    if (typeof sent === 'string') return (cur === sent && typeof written === 'string' && written !== sent) ? written : cur;
    if (Array.isArray(cur) && Array.isArray(sent) && Array.isArray(written)) return cur.map((c, i) => swapUploaded(c, sent[i], written[i]));
    if (cur && sent && written && typeof cur === 'object' && typeof sent === 'object' && typeof written === 'object') {
        const out = { ...cur };
        Object.keys(cur).forEach(k => { if (k in sent && k in written) out[k] = swapUploaded(cur[k], sent[k], written[k]); });
        return out;
    }
    return cur;
};

const dataUrlToFile = async (dataUrl, name) => {
    const blob = await (await fetch(dataUrl)).blob();
    return new File([blob], name, { type: blob.type || 'image/png' });
};

const ContractGenerator = () => {
    useStoreSubscription(['agreements']);
    const { id } = useParams();
    const navigate = useNavigate();
    const a = useAccent();
    const { addAgreement, updateAgreement, agreements, user, addToast } = useStore();
    const agreementsLoaded = useStore(s => Boolean(s.subscriptionsLoaded?.agreements));

    const live = useMemo(() => (id ? (agreements || []).find(x => x.id === id) : null), [agreements, id]);
    const locked = live?.status === CONTRACT_STATUS.EXECUTED;
    const lockedRef = useRef(false);
    lockedRef.current = locked;

    const {
        formData, setFormData, updateField,
        toggleClause, updateClause, removeClause, addCustomClause,
        paginatedPages,
    } = useContractGenerator(live, { withDefaultClauses: !id });

    const [step, setStep] = useState('parties');
    const [previewPage, setPreviewPage] = useState(0);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [autosaveStatus, setAutosaveStatus] = useState('idle');
    const [lastSaved, setLastSaved] = useState('');
    const [busy, setBusy] = useState('');  // 'save' | 'ready' | 'pdf' | 'copy' | 'leave'
    const [showIssues, setShowIssues] = useState(false);
    const [aiOpen, setAiOpen] = useState(false);
    const [aiBusy, setAiBusy] = useState(false);
    const [refineTarget, setRefineTarget] = useState(null);
    const [refineBusy, setRefineBusy] = useState(false);
    const [sigUploading, setSigUploading] = useState(false);
    const editorScrollRef = useRef(null);
    const pdfRef = useRef(null);

    // ── Loading and autosave (same pattern as the invoice builder) ──
    const isDirtyRef = useRef(false);
    const initialDataLoadedRef = useRef(false);
    const hasInitializedRef = useRef(false);
    const justCreatedIdRef = useRef(null);
    const revisionRef = useRef(0);
    const createPromiseRef = useRef(null);
    const idRef = useRef(id);
    idRef.current = id || justCreatedIdRef.current;

    useEffect(() => {
        if (id && id === justCreatedIdRef.current) return;
        hasInitializedRef.current = false;
        initialDataLoadedRef.current = false;
    }, [id]);

    // A new contract: Newbi's remembered details, signature on, GST stated, a unique number.
    useEffect(() => {
        if (id) return;
        const saved = readProvider();
        setFormData(prev => ({
            ...prev,
            showSignatures: true,
            parties: { ...prev.parties, firstParty: { ...prev.parties.firstParty, ...(saved?.firstParty || {}) } },
            providerName: saved?.providerName || prev.providerName,
            providerDesignation: saved?.providerDesignation || prev.providerDesignation,
            providerSignature: saved?.providerSignature || prev.providerSignature,
            details: { ...prev.details, deliverables: [] },
            commercials: { ...prev.commercials, gstMode: 'extra', gstRate: 18, milestones: [] },
        }));
        initialDataLoadedRef.current = true;
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (id || !agreementsLoaded) return;
        const taken = new Set((agreements || []).map(x => String(x.agreementNumber || '').toUpperCase()));
        if (taken.has(String(formData.agreementNumber || '').toUpperCase())) {
            let next = newAgreementNumber();
            while (taken.has(next)) next = newAgreementNumber();
            updateField('agreementNumber', next);
        }
    }, [id, agreementsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!id || hasInitializedRef.current || !live) return;
        setFormData(normalizeContract(live));
        hasInitializedRef.current = true;
        const t = setTimeout(() => { initialDataLoadedRef.current = true; }, 200);
        return () => clearTimeout(t);
    }, [id, live, setFormData]);

    const notFound = Boolean(id) && agreementsLoaded && !live && id !== justCreatedIdRef.current;

    useEffect(() => {
        if (initialDataLoadedRef.current) {
            isDirtyRef.current = true;
            revisionRef.current += 1;
        }
    }, [formData]);

    // Remember Newbi's details (and a saved signature link) for the next contract.
    useEffect(() => {
        if (locked || !initialDataLoadedRef.current) return;
        const fp = formData.parties?.firstParty || {};
        try {
            window.localStorage.setItem(PROVIDER_KEY, JSON.stringify({
                firstParty: { name: fp.name || '', address: fp.address || '', email: fp.email || '', pan: fp.pan || '', gstin: fp.gstin || '', role: fp.role || '' },
                providerName: formData.providerName || '',
                providerDesignation: formData.providerDesignation || '',
                providerSignature: typeof formData.providerSignature === 'string' && /^https?:/.test(formData.providerSignature) ? formData.providerSignature : (readProvider()?.providerSignature || null),
            }));
        } catch { /* private mode */ }
    }, [formData.parties?.firstParty, formData.providerName, formData.providerDesignation, formData.providerSignature, locked]); // eslint-disable-line react-hooks/exhaustive-deps

    const hasContent = Boolean(
        String(formData.parties?.secondParty?.name || '').trim() ||
        String(formData.details?.projectName || '').trim() ||
        plain(formData.details?.purpose)
    );

    const buildPayload = () => {
        const data = JSON.parse(JSON.stringify({ ...formData, updatedAt: new Date().toISOString(), createdBy: formData.createdBy || user?.uid || null }));
        if (idRef.current) CLIENT_OWNED_FIELDS.forEach(key => { delete data[key]; });
        else data.status = CONTRACT_STATUS.DRAFT;
        return data;
    };

    // One save path for autosave and the buttons. Concurrent first saves share one
    // create promise, so a slow network can never make two contracts.
    const persist = async (extra = {}) => {
        if (lockedRef.current) throw Object.assign(new Error('locked'), { code: 'LOCKED' });
        const revision = revisionRef.current;
        const sent = { ...buildPayload(), ...extra };
        const currentId = idRef.current;
        let savedId = currentId;
        if (currentId) {
            const written = await updateAgreement(currentId, sent, { unlessSigned: true });
            if (written && JSON.stringify(sent).includes(';base64,')) setFormData(prev => swapUploaded(prev, sent, written));
        } else {
            if (!createPromiseRef.current) {
                createPromiseRef.current = addAgreement(sent).catch(err => { createPromiseRef.current = null; throw err; });
            }
            savedId = await createPromiseRef.current;
            justCreatedIdRef.current = savedId;
            idRef.current = savedId;
            hasInitializedRef.current = true;
            initialDataLoadedRef.current = true;
            navigate(`/admin/agreements/edit/${savedId}`, { replace: true });
        }
        if (revisionRef.current === revision) isDirtyRef.current = false;
        setAutosaveStatus('saved');
        setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        return savedId;
    };

    const saveError = (err) => {
        if (err?.code === 'LOCKED') {
            lockedRef.current = true;
            addToast("It was just signed, so your latest edits weren't saved.", 'error', { title: 'This contract is locked' });
        } else {
            addToast('Check your connection and try again.', 'error', { title: 'Contract not saved' });
        }
    };

    useEffect(() => {
        if (!initialDataLoadedRef.current || !isDirtyRef.current || locked) return undefined;
        if (!idRef.current && !hasContent) return undefined;
        const timer = setTimeout(async () => {
            setAutosaveStatus('saving');
            try {
                await persist();
            } catch (err) {
                console.error('Contract autosave failed:', err);
                setAutosaveStatus(err?.code === 'LOCKED' ? 'locked' : 'error');
                if (err?.code === 'LOCKED') saveError(err);
            }
        }, 4000);
        return () => clearTimeout(timer);
    }, [formData, id, locked]); // eslint-disable-line react-hooks/exhaustive-deps

    // Warn before closing the tab with unsaved edits.
    useEffect(() => {
        const onBeforeUnload = (e) => {
            if (isDirtyRef.current && !lockedRef.current && (idRef.current || hasContent)) { e.preventDefault(); e.returnValue = ''; }
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [hasContent]);

    const leave = async () => {
        if (isDirtyRef.current && !lockedRef.current && (idRef.current || hasContent)) {
            setBusy('leave');
            try { await persist(); } catch (err) {
                setBusy('');
                if (!window.confirm("Couldn't save your latest changes. Leave anyway and lose them?")) return;
            }
        }
        navigate('/admin/agreements');
    };

    const handleSave = async () => {
        setBusy('save');
        try {
            await persist();
            addToast('Contract saved.', 'success');
            navigate('/admin/agreements');
        } catch (err) {
            saveError(err);
        } finally { setBusy(''); }
    };

    // ── Derived ──
    const issues = useMemo(() => contractIssues(formData, { agreements, id: idRef.current }), [formData, agreements, id]);
    const blocking = issues.filter(i => i.blocking);
    const issuesByStep = useMemo(() => issues.reduce((m, i) => { (m[i.step] = m[i.step] || []).push(i); return m; }, {}), [issues]);
    const state = live ? contractState(live) : 'draft';
    const stateCfg = CONTRACT_STATE_LABEL[state];
    const isReady = live?.status === CONTRACT_STATUS.FINAL;

    // Locked contracts show exactly what was signed, signatures included.
    const previewData = useMemo(() => (locked && live ? normalizeContract(live) : formData), [locked, live, formData]);
    const previewPages = useMemo(() => (locked && live ? paginateContract(previewData) : paginatedPages), [locked, live, previewData, paginatedPages]);

    useEffect(() => {
        if (previewPage >= previewPages.length) setPreviewPage(Math.max(0, previewPages.length - 1));
    }, [previewPages.length, previewPage]);

    const stepIndex = STEPS.findIndex(s => s.id === step);
    const goStep = (sid) => {
        setStep(sid);
        if (sid === 'review') setShowIssues(true);
        const target = STEPS.find(s => s.id === sid)?.page;
        const idx = target ? previewPages.findIndex(p => p.type === target) : -1;
        if (idx >= 0) setPreviewPage(idx);
        editorScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const set = (path) => (e) => updateField(path, e && e.target ? e.target.value : e);
    const isHidden = (f) => (formData.hiddenFields || []).includes(f);
    const setShown = (f, shown) => setFormData(prev => {
        const cur = prev.hiddenFields || [];
        return { ...prev, hiddenFields: shown ? cur.filter(x => x !== f) : Array.from(new Set([...cur, f])) };
    });

    // ── Actions ──
    const generatePDF = async () => {
        setBusy('pdf');
        try {
            const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')]);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pages = pdfRef.current?.querySelectorAll('.agreement-page-render') || [];
            for (let i = 0; i < pages.length; i++) {
                const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' });
                if (i > 0) pdf.addPage();
                pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297, '', 'FAST');
            }
            const who = String(previewData.parties?.secondParty?.name || 'Draft').replace(/[^\w-]+/g, '-');
            pdf.save(`Newbi-Contract-${previewData.agreementNumber || ''}-${who}.pdf`);
        } catch (error) {
            console.error(error);
            addToast('Please try again.', 'error', { title: "Couldn't create the PDF", action: { label: 'Try again', onClick: () => generatePDF() } });
        } finally { setBusy(''); }
    };

    const markReady = async () => {
        setShowIssues(true);
        if (blocking.length) {
            addToast('Fix the items marked in red first.', 'warning');
            return;
        }
        setBusy('ready');
        try {
            await persist({ status: CONTRACT_STATUS.FINAL });
            addToast('Share the link from the contracts list, or copy it here.', 'success', { title: 'Ready to sign' });
        } catch (err) { saveError(err); } finally { setBusy(''); }
    };

    const backToDraft = async () => {
        setBusy('ready');
        try {
            await persist({ status: CONTRACT_STATUS.DRAFT });
            addToast('Moved back to draft.', 'success');
        } catch (err) { saveError(err); } finally { setBusy(''); }
    };

    const signingLink = idRef.current ? `${window.location.origin}/agreement/${idRef.current}` : '';
    const copyLink = async () => {
        if (!signingLink) return;
        const ok = await copyToClipboard(`${signingLink}?via=link`);
        addToast(ok ? 'Signing link copied.' : 'Please try again.', ok ? 'success' : 'error', ok ? undefined : { title: "Couldn't copy the link" });
        if (ok && idRef.current) useStore.getState().markAgreementShared(idRef.current, 'link').catch(() => {});
    };

    const makeCopy = async () => {
        if (!id) return;
        setBusy('copy');
        try {
            const newId = await useStore.getState().duplicateAgreement(id);
            addToast('Copy created as a draft.', 'success');
            navigate(`/admin/agreements/edit/${newId}`);
        } catch (err) {
            console.error(err);
            addToast('Check your connection and try again.', 'error', { title: 'Contract not copied', action: { label: 'Try again', onClick: () => makeCopy() } });
        } finally { setBusy(''); }
    };

    const onSignature = async (dataUrl) => {
        updateField('providerSignature', dataUrl);
        if (!dataUrl || !String(dataUrl).startsWith('data:')) return;
        // Upload once now, so autosave doesn't upload the same image again and again.
        setSigUploading(true);
        try {
            const file = await dataUrlToFile(dataUrl, 'newbi-signature.png');
            const url = await useStore.getState().uploadToCloudinary(file);
            if (url) setFormData(prev => (prev.providerSignature === dataUrl ? { ...prev, providerSignature: url } : prev));
        } catch (err) {
            console.warn('Signature upload deferred to save', err);
        } finally { setSigUploading(false); }
    };

    // ── AI ──
    const mapAiClauses = (list) => (list || []).map((c, i) => ({
        id: c.id || `ai-clause-${Date.now()}-${i}`,
        title: c.title || `Clause ${i + 1}`,
        content: c.content || '',
        isActive: c.isActive !== false,
        isCustom: true,
        strictness: 'medium',
        category: 'custom',
    }));

    const runAiDraft = async (mode, prompt) => {
        setAiBusy(true);
        try {
            if (mode === 'new') {
                const data = await generateFullDocument('contract', prompt, 'Premium', { strict: true });
                setFormData(prev => normalizeContract({
                    ...prev,
                    parties: {
                        firstParty: { ...prev.parties.firstParty, ...(data.parties?.firstParty || {}), name: prev.parties.firstParty.name || data.parties?.firstParty?.name || 'Newbi Entertainment & Marketing LLP', address: prev.parties.firstParty.address || data.parties?.firstParty?.address || '' },
                        secondParty: { ...prev.parties.secondParty, ...(data.parties?.secondParty || {}) },
                    },
                    details: { ...prev.details, ...(data.details || {}) },
                    commercials: { ...prev.commercials, ...(data.commercials || {}) },
                    clauses: data.clauses?.length ? mapAiClauses(data.clauses) : prev.clauses,
                    template: data.template || prev.template,
                }));
                addToast('Check each step before sending.', 'success', { title: 'Draft ready' });
            } else {
                const updated = await reviseDocument(formData, prompt, 'Premium', { strict: true });
                setFormData(prev => normalizeContract({
                    ...prev,
                    ...updated,
                    // Identity, status and signatures never come from AI.
                    id: prev.id, status: prev.status, agreementNumber: prev.agreementNumber,
                    providerSignature: prev.providerSignature, clientSignature: prev.clientSignature, approvalMetadata: prev.approvalMetadata,
                    parties: {
                        firstParty: { ...prev.parties.firstParty, ...(updated.parties?.firstParty || {}) },
                        secondParty: { ...prev.parties.secondParty, ...(updated.parties?.secondParty || {}) },
                    },
                    details: { ...prev.details, ...(updated.details || {}) },
                    commercials: { ...prev.commercials, ...(updated.commercials || {}) },
                    clauses: updated.clauses?.length ? mapAiClauses(updated.clauses) : prev.clauses,
                }));
                addToast('Check the preview to see them.', 'success', { title: 'Changes applied' });
            }
            setAiOpen(false);
            return true;
        } catch (err) {
            console.error(err);
            addToast('Try again, or describe it a different way.', 'error', { title: "Couldn't draft that", action: { label: 'Try again', onClick: () => runAiDraft(mode, prompt) } });
            return false;
        } finally { setAiBusy(false); }
    };

    const openRefine = (key, label, value) => setRefineTarget({ key, label, value: value || '' });
    const runRefine = async (instruction) => {
        if (!refineTarget || !instruction) return;
        setRefineBusy(true);
        try {
            const refined = await refineFieldContent('contract', refineTarget.label, refineTarget.value, instruction, 'Premium');
            const m = refineTarget.key.match(/^clauses\[(.+)\]$/);
            if (m) updateClause(m[1], { content: refined });
            else updateField(refineTarget.key, refined);
            addToast(`${refineTarget.label} rewritten.`, 'success');
            setRefineTarget(null);
        } catch (err) {
            console.error(err);
            addToast('Please try again.', 'error', { title: "Couldn't rewrite that", action: { label: 'Try again', onClick: () => runRefine(instruction) } });
        } finally { setRefineBusy(false); }
    };

    // ── Commercials helpers ──
    const currency = formData.commercials?.currency || 'INR';
    const total = contractTotal(formData);
    const gst = gstSummary(formData);
    const mCheck = milestoneCheck(formData);
    const milestones = formData.commercials?.milestones || [];
    const setMilestones = (next) => updateField('commercials.milestones', next);
    const updateMilestone = (idx, patch) => setMilestones(milestones.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
    const presetMilestones = (rows) => setMilestones(rows.map((r, i) => ({ id: `ms-${Date.now()}-${i}`, label: r[0], percent: r[1], amount: '', due: r[2] })));

    const deliverables = formData.details?.deliverables || [];
    const setDeliverables = (next) => updateField('details.deliverables', next);

    const fp = formData.parties?.firstParty || {};
    const sp = formData.parties?.secondParty || {};

    // ── Pieces ──
    const aiButton = (path, label, value) => (
        <button type="button" onClick={() => openRefine(path, label, value)} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[12px] font-semibold text-violet-600 hover:bg-violet-500/10 dark:text-violet-300">
            <Sparkles size={13} /> Improve with AI
        </button>
    );

    const showInContract = (field) => (
        <Toggle label="Show this section in the contract" checked={!isHidden(field)} onChange={v => setShown(field, v)} />
    );

    const stepIssues = (sid) => {
        if (!showIssues || !issuesByStep[sid]?.length) return null;
        return (
            <ul className="space-y-1.5 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-3">
                {issuesByStep[sid].map((i, n) => (
                    <li key={n} className={cn('flex items-start gap-2 text-[13px] font-semibold', i.blocking ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-300')}>
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {i.message}
                    </li>
                ))}
            </ul>
        );
    };

    const saveLabel = {
        saving: 'Saving…',
        saved: `Saved ${lastSaved}`,
        error: "Couldn't autosave. Check your connection.",
        locked: 'Signed. Edits are locked.',
        idle: id ? 'Changes save automatically' : 'Saves automatically once you add the other party',
    }[autosaveStatus];

    if (notFound) {
        return (
            <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#f6f7f9] px-6 text-center font-heading dark:bg-[#07080b] dark:text-white">
                <h1 className="text-xl font-extrabold">Contract not found</h1>
                <p className="max-w-sm text-[14px] text-gray-500">It may have been deleted. Go back to the list to pick another one.</p>
                <Button variant="accent" onClick={() => navigate('/admin/agreements')}>Back to contracts</Button>
            </div>
        );
    }

    const approval = live?.approvalMetadata;

    return (
        <div className="flex h-dvh flex-col overflow-hidden bg-[#f6f7f9] font-heading text-gray-900 dark:bg-[#07080b] dark:text-white admin-hub-content-container">
            <style dangerouslySetInnerHTML={{ __html: `
                .font-signature { font-family: 'Caveat', cursive; }
                .font-formal { font-family: 'Crimson Pro', serif; }
            `}} />

            {/* Header */}
            <header className="relative z-30 shrink-0 border-b border-black/[0.06] bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#07080b]/90">
                <div className="flex h-14 items-center gap-2 px-2 sm:px-4">
                    <button type="button" onClick={leave} disabled={busy === 'leave'} aria-label="Back to contracts" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10">
                        {busy === 'leave' ? <RefreshCw size={16} className="animate-spin" /> : <ArrowLeft size={18} />}
                    </button>
                    <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 truncate text-[15px] font-bold leading-tight">
                            <span className="truncate">{id ? (sp.name || 'Edit contract') : 'New contract'}</span>
                            <Badge tone={stateCfg.tone} className="hidden sm:inline-flex">{stateCfg.label}</Badge>
                        </p>
                        <p className={cn('truncate text-[11px] font-medium', autosaveStatus === 'error' ? 'text-red-500' : 'text-gray-500')}>
                            {formData.agreementNumber ? `${formData.agreementNumber} · ` : ''}{locked ? 'Signed. Edits are locked.' : saveLabel}
                        </p>
                    </div>
                    {!locked && (
                        <Button variant="ghost" onClick={() => setAiOpen(true)} className="hidden sm:inline-flex" aria-label="Draft with AI">
                            <Sparkles size={15} className="text-violet-500" /> AI draft
                        </Button>
                    )}
                    <Button variant="secondary" onClick={() => setPreviewOpen(true)} className="lg:hidden" aria-label="Preview contract">
                        <Eye size={15} /> <span className="hidden sm:inline">Preview</span>
                    </Button>
                    <Button variant="secondary" onClick={generatePDF} disabled={busy === 'pdf'} className="hidden sm:inline-flex">
                        {busy === 'pdf' ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />} PDF
                    </Button>
                    {!locked && (
                        <Button variant="accent" onClick={handleSave} disabled={Boolean(busy)} className="hidden md:inline-flex">
                            <Save size={15} /> Save & close
                        </Button>
                    )}
                </div>
                {!locked && (
                    <nav aria-label="Contract sections" className="flex gap-1 overflow-x-auto px-2 pb-2 [scrollbar-width:none] sm:px-4 [&::-webkit-scrollbar]:hidden">
                        {STEPS.map((s, i) => {
                            const active = step === s.id;
                            const stepBlocking = showIssues && (issuesByStep[s.id] || []).some(x => x.blocking);
                            return (
                                <button key={s.id} type="button" onClick={() => goStep(s.id)} aria-current={active ? 'step' : undefined}
                                    className={cn('flex h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold transition-colors',
                                        active ? a.solid : 'text-gray-500 hover:bg-black/5 hover:text-gray-900 dark:hover:bg-white/5 dark:hover:text-white')}>
                                    <span className={cn('flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold', active ? 'bg-white/25 dark:bg-black/15' : 'bg-black/5 dark:bg-white/10')}>{i + 1}</span>
                                    {s.label}
                                    {stepBlocking && <span className="h-2 w-2 rounded-full bg-red-500" aria-label="Needs attention" />}
                                </button>
                            );
                        })}
                    </nav>
                )}
            </header>

            <main className="flex min-h-0 flex-1 overflow-hidden">
                {/* Editor column */}
                <section className="flex min-w-0 flex-1 flex-col">
                    <div ref={editorScrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                        <div className="mx-auto max-w-3xl px-4 pb-10 pt-6 sm:px-6">
                            {locked ? (
                                <div className="space-y-5">
                                    <div className={cn('rounded-2xl border p-4 sm:p-5', 'border-emerald-500/30 bg-emerald-500/[0.06]')}>
                                        <div className="flex items-start gap-3">
                                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-neon-green"><Lock size={18} /></span>
                                            <div className="min-w-0">
                                                <h2 className="text-[16px] font-bold">Signed and locked</h2>
                                                <p className="mt-0.5 text-[13px] text-gray-600 dark:text-zinc-300">
                                                    {approval?.signedBy ? `${approval.signedBy} signed` : 'The other party signed'}{approval?.signedAt ? ` on ${formatContractDate(approval.signedAt)}` : ''}. A signed contract can't be changed. Make a copy to change the terms; the copy starts as a new draft.
                                                </p>
                                            </div>
                                        </div>
                                        {(approval?.clientSignature || live?.clientSignature) && (
                                            <img src={approval?.clientSignature || live?.clientSignature} alt="Signature of the other party" className="mt-4 h-16 rounded-lg bg-white p-1.5" />
                                        )}
                                        <dl className="mt-4 grid grid-cols-1 gap-2 text-[13px] sm:grid-cols-2">
                                            {approval?.email && <div><dt className="text-gray-500">Email</dt><dd className="font-semibold">{approval.email}</dd></div>}
                                            {approval?.ip && <div><dt className="text-gray-500">IP address</dt><dd className="font-mono text-[12px]">{approval.ip}</dd></div>}
                                        </dl>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <Button variant="accent" onClick={makeCopy} disabled={busy === 'copy'}><CopyPlus size={15} /> Make a copy</Button>
                                            <Button variant="secondary" onClick={generatePDF} disabled={busy === 'pdf'}><Download size={15} /> Download PDF</Button>
                                            <Button variant="secondary" as="a" href={`/agreement/${id}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> Contract page</Button>
                                        </div>
                                    </div>
                                    <div className="lg:hidden">
                                        <Button variant="secondary" onClick={() => setPreviewOpen(true)} className="w-full"><Eye size={15} /> View the signed contract</Button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-6">
                                        <h2 className="text-2xl font-extrabold tracking-tight">{STEPS[stepIndex]?.label}</h2>
                                        <p className="text-[13px] text-gray-500">{STEPS[stepIndex]?.desc}</p>
                                    </div>

                                    {step === 'parties' && (
                                        <div className="space-y-5">
                                            {stepIssues("parties")}
                                            <BuilderCard title="Contract" hint="Type, number and letterhead">
                                                <div className="space-y-4">
                                                    <Choice
                                                        value={formData.template === 'MOU' ? 'MOU' : 'Service Agreement'}
                                                        onChange={v => setFormData(prev => ({ ...prev, template: v, type: v }))}
                                                        options={[
                                                            { value: 'Service Agreement', label: 'Service agreement', hint: 'Binding terms for paid work' },
                                                            { value: 'MOU', label: 'MOU', hint: 'Memorandum of understanding' },
                                                        ]}
                                                    />
                                                    <Field label="Contract number" hint="Printed on every page. Must be unique.">
                                                        <input className={cn(fieldCls, 'font-mono')} value={formData.agreementNumber || ''} onChange={e => updateField('agreementNumber', e.target.value.toUpperCase())} autoCapitalize="characters" />
                                                    </Field>
                                                    <div>
                                                        <span className="mb-1 block text-[12px] font-bold text-gray-500">Letterhead</span>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {LOGOS.map(logo => {
                                                                const sel = (formData.selectedLogo || 'entertainment') === logo.id;
                                                                return (
                                                                    <button key={logo.id} type="button" onClick={() => updateField('selectedLogo', logo.id)} aria-pressed={sel}
                                                                        className={cn('flex flex-col items-center gap-2 rounded-xl border p-2 text-[12px] font-semibold transition-colors',
                                                                            sel ? cn(a.border, a.soft) : 'border-black/10 hover:border-black/20 dark:border-white/10 dark:hover:border-white/20')}>
                                                                        <span className="flex aspect-[4/3] w-full items-center justify-center rounded-lg bg-white p-2"><img src={logo.path} alt="" className="h-full w-full object-contain" /></span>
                                                                        {logo.label}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </BuilderCard>

                                            <BuilderCard title="Newbi (first party)" hint="Remembered for your next contract">
                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                    <div className="sm:col-span-2"><Field label="Legal name"><input className={fieldCls} value={fp.name || ''} onChange={set('parties.firstParty.name')} placeholder="Newbi Entertainment & Marketing LLP" /></Field></div>
                                                    <div className="sm:col-span-2"><Field label="Registered address"><textarea className={areaCls} rows={2} value={fp.address || ''} onChange={set('parties.firstParty.address')} /></Field></div>
                                                    <Field label="PAN" optional><input className={cn(fieldCls, 'font-mono')} value={fp.pan || ''} onChange={e => updateField('parties.firstParty.pan', e.target.value.toUpperCase())} autoCapitalize="characters" maxLength={10} /></Field>
                                                    <Field label="GSTIN" optional><input className={cn(fieldCls, 'font-mono')} value={fp.gstin || ''} onChange={e => updateField('parties.firstParty.gstin', e.target.value.toUpperCase())} autoCapitalize="characters" maxLength={15} /></Field>
                                                    <Field label="Called in the contract" hint='e.g. "Service Provider"'><input className={fieldCls} value={fp.role || ''} onChange={set('parties.firstParty.role')} /></Field>
                                                    <Field label="Email" optional><input type="email" inputMode="email" autoCapitalize="off" className={fieldCls} value={fp.email || ''} onChange={set('parties.firstParty.email')} /></Field>
                                                </div>
                                            </BuilderCard>

                                            <BuilderCard title="Other party" hint="The client, artist, brand or vendor">
                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                    <div className="sm:col-span-2"><Field label="Legal name"><input className={fieldCls} value={sp.name || ''} onChange={set('parties.secondParty.name')} placeholder="Company or person, as on their PAN" /></Field></div>
                                                    <div className="sm:col-span-2"><Field label="Address"><textarea className={areaCls} rows={2} value={sp.address || ''} onChange={set('parties.secondParty.address')} /></Field></div>
                                                    <Field label="PAN" optional><input className={cn(fieldCls, 'font-mono')} value={sp.pan || ''} onChange={e => updateField('parties.secondParty.pan', e.target.value.toUpperCase())} autoCapitalize="characters" maxLength={10} /></Field>
                                                    <Field label="GSTIN" optional><input className={cn(fieldCls, 'font-mono')} value={sp.gstin || ''} onChange={e => updateField('parties.secondParty.gstin', e.target.value.toUpperCase())} autoCapitalize="characters" maxLength={15} /></Field>
                                                    <Field label="Called in the contract" hint='e.g. "Client", "Artist", "Sponsor"'><input className={fieldCls} value={sp.role || ''} onChange={set('parties.secondParty.role')} /></Field>
                                                    <Field label="Email" optional hint="Pre-fills the email when you send it"><input type="email" inputMode="email" autoCapitalize="off" className={fieldCls} value={sp.email || ''} onChange={set('parties.secondParty.email')} /></Field>
                                                    <Field label="Phone" optional><input type="tel" inputMode="tel" className={fieldCls} value={sp.phone || ''} onChange={set('parties.secondParty.phone')} /></Field>
                                                    <div className="hidden sm:block" />
                                                    <Field label="Signs for them" hint="Name of the person who will sign"><input className={fieldCls} value={sp.signatoryName || ''} onChange={set('parties.secondParty.signatoryName')} /></Field>
                                                    <Field label="Their designation" optional><input className={fieldCls} value={sp.signatoryDesignation || ''} onChange={set('parties.secondParty.signatoryDesignation')} placeholder="e.g. Director" /></Field>
                                                </div>
                                            </BuilderCard>
                                        </div>
                                    )}

                                    {step === 'project' && (
                                        <div className="space-y-5">
                                            {stepIssues("project")}
                                            <BuilderCard title="Project and term">
                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                    <div className="sm:col-span-2"><Field label="Project title"><input className={fieldCls} value={formData.details?.projectName || ''} onChange={set('details.projectName')} placeholder="e.g. Brand activation, Sunburn Campus 2026" /></Field></div>
                                                    <Field label="Effective date"><input type="date" className={fieldCls} value={formData.effectiveDate || ''} onChange={set('effectiveDate')} /></Field>
                                                    <Field label="End date" optional><input type="date" className={fieldCls} value={formData.details?.endDate || ''} min={formData.effectiveDate || undefined} onChange={set('details.endDate')} /></Field>
                                                    <div className="sm:col-span-2">
                                                        <Field label="Term" optional hint="How long the contract lasts, in words"><input className={fieldCls} value={formData.details?.duration || ''} onChange={set('details.duration')} placeholder="e.g. 6 months" /></Field>
                                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                                            {TERM_PRESETS.map(t => (
                                                                <button key={t} type="button" onClick={() => updateField('details.duration', t === 'One event' ? 'the duration of the event' : t)}
                                                                    className={cn('h-9 rounded-full border px-3 text-[12px] font-semibold transition-colors', formData.details?.duration === (t === 'One event' ? 'the duration of the event' : t) ? cn(a.border, a.soft) : 'border-black/10 text-gray-600 hover:border-black/20 dark:border-white/10 dark:text-zinc-300')}>
                                                                    {t}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="sm:col-span-2"><Field label="Territory" optional><input className={fieldCls} value={formData.details?.territory || ''} onChange={set('details.territory')} placeholder="e.g. India" /></Field></div>
                                                </div>
                                            </BuilderCard>

                                            <BuilderCard title="Scope of work" hint="What will be done, by whom, and how" action={aiButton("details.purpose", "Scope of work", formData.details?.purpose)}>
                                                <RichEditor label="Scope of work" value={formData.details?.purpose || ''} onChange={v => updateField('details.purpose', v)} placeholder="Describe the services, responsibilities and how the work will be delivered…" minHeight={200} />
                                                <div className="mt-3">{showInContract("mission")}</div>
                                            </BuilderCard>

                                            <BuilderCard title="Deliverables" hint="Listed under the scope, one per line">
                                                <div className="space-y-2">
                                                    {deliverables.map((d, i) => (
                                                        <div key={i} className="flex items-center gap-2">
                                                            <span className="w-6 shrink-0 text-center text-[12px] font-bold text-gray-400">{String.fromCharCode(97 + i)}</span>
                                                            <input className={fieldCls} value={d} onChange={e => setDeliverables(deliverables.map((x, j) => (j === i ? e.target.value : x)))} placeholder="e.g. 4 Instagram reels" />
                                                            <button type="button" onClick={() => setDeliverables(deliverables.filter((_, j) => j !== i))} aria-label={`Remove deliverable ${i + 1}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-500"><Trash2 size={15} /></button>
                                                        </div>
                                                    ))}
                                                    <Button variant="secondary" onClick={() => setDeliverables([...deliverables, ''])}><Plus size={14} /> Add deliverable</Button>
                                                </div>
                                            </BuilderCard>
                                        </div>
                                    )}

                                    {step === 'commercials' && (
                                        <div className="space-y-5">
                                            {stepIssues("commercials")}
                                            <BuilderCard title="Contract value">
                                                <div className="grid grid-cols-3 gap-3">
                                                    <Field label="Currency">
                                                        <ThemedSelect className={fieldCls} value={currency} onChange={set('commercials.currency')}>
                                                            <option value="INR">₹ INR</option>
                                                            <option value="USD">$ USD</option>
                                                            <option value="EUR">€ EUR</option>
                                                            <option value="GBP">£ GBP</option>
                                                        </ThemedSelect>
                                                    </Field>
                                                    <div className="col-span-2">
                                                        <Field label="Total value" hint={total > 0 ? `Reads as ${formatMoney(total, currency)}` : 'Numbers only, e.g. 500000'}>
                                                            <input className={cn(fieldCls, 'tabular-nums')} inputMode="decimal" value={formData.commercials?.totalValue || ''}
                                                                onChange={set('commercials.totalValue')}
                                                                onBlur={e => { const t = tidyAmountText(e.target.value, currency); if (t !== e.target.value) updateField('commercials.totalValue', t); }}
                                                                placeholder="5,00,000" />
                                                        </Field>
                                                    </div>
                                                </div>
                                                <div className="mt-4 space-y-3">
                                                    <span className="block text-[12px] font-bold text-gray-500">GST</span>
                                                    <Choice
                                                        value={formData.commercials?.gstMode || 'none'}
                                                        onChange={v => updateField('commercials.gstMode', v)}
                                                        options={[
                                                            { value: 'extra', label: 'Plus GST', hint: 'Added on top' },
                                                            { value: 'included', label: 'Included', hint: 'Value has GST in it' },
                                                            { value: 'none', label: 'Not stated' },
                                                        ]}
                                                    />
                                                    {formData.commercials?.gstMode === 'extra' && (
                                                        <div className="grid grid-cols-3 gap-3">
                                                            <Field label="GST rate (%)"><input type="number" inputMode="decimal" min="0" max="28" className={fieldCls} value={formData.commercials?.gstRate ?? 18} onChange={e => updateField('commercials.gstRate', e.target.value === '' ? '' : Number(e.target.value))} /></Field>
                                                            <div className="col-span-2 flex flex-col justify-end rounded-xl bg-black/[0.03] p-3 text-[13px] dark:bg-white/[0.04]">
                                                                <div className="flex justify-between"><span className="text-gray-500">GST</span><span className="font-semibold tabular-nums">{formatMoney(gst.gst, currency)}</span></div>
                                                                <div className="flex justify-between"><span className="font-bold">Total payable</span><span className="font-extrabold tabular-nums">{formatMoney(gst.grand, currency)}</span></div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </BuilderCard>

                                            <BuilderCard title="Payment milestones" hint="When each part is paid. They should add up to the contract value.">
                                                {milestones.length === 0 && (
                                                    <div className="mb-3 flex flex-wrap gap-1.5">
                                                        {[
                                                            ['50% advance, 50% after', [['Advance on signing', 50, 'on signing this Agreement'], ['Balance', 50, 'within 7 days of completion']]],
                                                            ['30 / 70', [['Advance on signing', 30, 'on signing this Agreement'], ['Balance', 70, 'within 7 days of completion']]],
                                                            ['100% on signing', [['Full payment', 100, 'on signing this Agreement']]],
                                                            ['100% after the work', [['Full payment', 100, 'within 15 days of completion']]],
                                                        ].map(([label, rows]) => (
                                                            <button key={label} type="button" onClick={() => presetMilestones(rows)} className="h-9 rounded-full border border-black/10 px-3 text-[12px] font-semibold text-gray-600 hover:border-black/20 dark:border-white/10 dark:text-zinc-300">{label}</button>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="space-y-3">
                                                    {milestones.map((m, i) => {
                                                        const row = mCheck.rows[i] || {};
                                                        return (
                                                            <div key={m.id || i} className="rounded-xl border border-black/[0.08] p-3 dark:border-white/[0.08]">
                                                                <div className="mb-2 flex items-center justify-between">
                                                                    <span className="text-[12px] font-bold text-gray-500">Payment {i + 1}</span>
                                                                    <button type="button" onClick={() => setMilestones(milestones.filter((_, j) => j !== i))} aria-label={`Remove payment ${i + 1}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-500"><Trash2 size={15} /></button>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                                                    <div className="col-span-2"><Field label="What for"><input className={fieldCls} value={m.label || ''} onChange={e => updateMilestone(i, { label: e.target.value })} placeholder="e.g. Advance" /></Field></div>
                                                                    <Field label="Percent"><input type="number" inputMode="decimal" min="0" max="100" className={fieldCls} value={m.percent ?? ''} placeholder={row.percent ? String(row.percent) : ''} onChange={e => updateMilestone(i, { percent: e.target.value === '' ? '' : Number(e.target.value), amount: '' })} /></Field>
                                                                    <Field label="Amount"><input type="number" inputMode="decimal" min="0" className={fieldCls} value={m.amount ?? ''} placeholder={row.amount ? String(row.amount) : ''} onChange={e => updateMilestone(i, { amount: e.target.value === '' ? '' : Number(e.target.value), percent: '' })} /></Field>
                                                                    <div className="col-span-2 sm:col-span-4"><Field label="When it's due"><input className={fieldCls} value={m.due || ''} onChange={e => updateMilestone(i, { due: e.target.value })} placeholder="e.g. within 7 days of the event" /></Field></div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    <Button variant="secondary" onClick={() => setMilestones([...milestones, { id: `ms-${Date.now()}`, label: '', percent: '', amount: '', due: '' }])}><Plus size={14} /> Add payment</Button>
                                                    {milestones.length > 0 && (
                                                        <div className={cn('flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-semibold', mCheck.ok ? 'bg-emerald-500/[0.08] text-emerald-700 dark:text-neon-green' : 'bg-red-500/[0.08] text-red-600 dark:text-red-400')}>
                                                            <span className="flex items-center gap-1.5">{mCheck.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />} {mCheck.ok ? 'Adds up to the contract value' : mCheck.diff > 0 ? `${formatMoney(mCheck.diff, currency)} still to schedule` : `${formatMoney(-mCheck.diff, currency)} more than the contract value`}</span>
                                                            <span className="tabular-nums">{formatMoney(mCheck.sum, currency)} / {formatMoney(total, currency)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </BuilderCard>

                                            <BuilderCard title="Payment terms" hint="Invoicing, late fees, bank details. Printed under the milestones." action={aiButton("commercials.paymentSchedule", "Payment terms", formData.commercials?.paymentSchedule)}>
                                                <RichEditor label="Payment terms" value={formData.commercials?.paymentSchedule || ''} onChange={v => updateField('commercials.paymentSchedule', v)} placeholder="e.g. Each payment is due within 7 days of Newbi's invoice…" minHeight={140} />
                                                <div className="mt-3">{showInContract("commercials")}</div>
                                            </BuilderCard>
                                        </div>
                                    )}

                                    {step === 'clauses' && (
                                        <div className="space-y-5">
                                            {stepIssues("clauses")}
                                            <BuilderCard title="Clauses" hint="Tap a clause to edit it. Use the arrows to change the order.">
                                                <ClauseMarketplace
                                                    activeClauses={formData.clauses || []}
                                                    onToggleClause={toggleClause}
                                                    onUpdateClause={updateClause}
                                                    onRemoveClause={removeClause}
                                                    onAddCustom={addCustomClause}
                                                    onRefineClick={(key, title, content) => openRefine(key, title || 'Clause', content)}
                                                />
                                                <div className="mt-4">{showInContract("clauses")}</div>
                                            </BuilderCard>
                                        </div>
                                    )}

                                    {step === 'signatures' && (
                                        <div className="space-y-5">
                                            {stepIssues("signatures")}
                                            <BuilderCard title="Signature block">
                                                <Toggle label="Collect signatures" hint="The other party signs online on the contract page" checked={Boolean(formData.showSignatures)} onChange={v => updateField('showSignatures', v)} />
                                            </BuilderCard>

                                            <BuilderCard title="Signing for Newbi">
                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                    <Field label="Name"><input className={fieldCls} value={formData.providerName || ''} onChange={set('providerName')} placeholder="Full name" /></Field>
                                                    <Field label="Designation"><input className={fieldCls} value={formData.providerDesignation || ''} onChange={set('providerDesignation')} placeholder="e.g. Founder" /></Field>
                                                </div>
                                                <div className="mt-3">
                                                    <SignatureField value={formData.providerSignature || null} onChange={onSignature} label="Newbi's signature" hint={sigUploading ? 'Uploading the signature…' : 'Saved for your next contract.'} />
                                                </div>
                                            </BuilderCard>

                                            <BuilderCard title={`Signing for ${sp.name || 'the other party'}`} action={<Button size="sm" variant="ghost" onClick={() => goStep('parties')}>Edit</Button>}>
                                                <dl className="grid grid-cols-2 gap-3 text-[13px]">
                                                    <div><dt className="text-gray-500">Name</dt><dd className="font-semibold">{sp.signatoryName || <span className="text-amber-600">Not set</span>}</dd></div>
                                                    <div><dt className="text-gray-500">Designation</dt><dd className="font-semibold">{sp.signatoryDesignation || 'Authorised signatory'}</dd></div>
                                                </dl>
                                                <p className="mt-3 rounded-xl bg-black/[0.03] p-3 text-[12px] text-gray-500 dark:bg-white/[0.04]">
                                                    They sign on the contract page with their name, email and a drawn or uploaded signature. The time and IP address are recorded, and the contract locks once signed.
                                                </p>
                                            </BuilderCard>

                                            <BuilderCard title="Official seal">
                                                <Toggle label="Stamp the company seal" checked={Boolean(formData.showSeal)} onChange={v => updateField('showSeal', v)} />
                                                {formData.showSeal && (
                                                    <div className="mt-3 flex justify-center overflow-hidden rounded-xl bg-white p-4"><DocumentSeal type="contract" date={formData.effectiveDate} className="h-28 w-28" /></div>
                                                )}
                                            </BuilderCard>
                                        </div>
                                    )}

                                    {step === 'review' && (
                                        <div className="space-y-5">
                                            <BuilderCard title={blocking.length ? `${blocking.length} thing${blocking.length === 1 ? '' : 's'} to fix` : 'Ready to go'} hint={blocking.length ? 'These stop the contract from going out for signing.' : issues.length ? 'Some suggestions below, but nothing blocking.' : 'Everything a contract needs is filled in.'}>
                                                {issues.length === 0 ? (
                                                    <p className="flex items-center gap-2 text-[14px] font-semibold text-emerald-700 dark:text-neon-green"><CheckCircle2 size={16} /> All checks passed.</p>
                                                ) : (
                                                    <ul className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                                                        {issues.map((i, n) => (
                                                            <li key={n} className="flex items-center gap-3 py-2.5">
                                                                <span className={cn('h-2 w-2 shrink-0 rounded-full', i.blocking ? 'bg-red-500' : 'bg-amber-500')} />
                                                                <span className="min-w-0 flex-1 text-[13px] font-semibold">{i.message}</span>
                                                                <Button size="sm" variant="ghost" onClick={() => goStep(i.step)}>Fix</Button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </BuilderCard>

                                            <BuilderCard title="Summary">
                                                <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-[13px] sm:grid-cols-2">
                                                    <div><dt className="text-gray-500">Between</dt><dd className="font-semibold">{fp.name || '—'} and {sp.name || '—'}</dd></div>
                                                    <div><dt className="text-gray-500">Project</dt><dd className="font-semibold">{formData.details?.projectName || '—'}</dd></div>
                                                    <div><dt className="text-gray-500">Effective</dt><dd className="font-semibold">{formatContractDate(formData.effectiveDate) || '—'}{formData.details?.duration ? ` · ${formData.details.duration}` : ''}{parseContractDate(formData.details?.endDate) ? ` · until ${formatContractDate(formData.details.endDate)}` : ''}</dd></div>
                                                    <div><dt className="text-gray-500">Value</dt><dd className="font-semibold tabular-nums">{total > 0 ? formatMoney(total, currency) : '—'}{gst.mode === 'extra' ? ` + GST (${formatMoney(gst.grand, currency)})` : gst.mode === 'included' ? ' incl. GST' : ''}</dd></div>
                                                    <div><dt className="text-gray-500">Payments</dt><dd className="font-semibold">{milestones.length ? `${milestones.length} milestone${milestones.length === 1 ? '' : 's'}` : 'No milestones'}</dd></div>
                                                    <div><dt className="text-gray-500">Clauses</dt><dd className="font-semibold">{(formData.clauses || []).filter(c => c.isActive !== false).length} in the contract</dd></div>
                                                    <div><dt className="text-gray-500">Pages</dt><dd className="font-semibold">{paginatedPages.length}</dd></div>
                                                    <div><dt className="text-gray-500">Status</dt><dd><Badge tone={stateCfg.tone}>{stateCfg.label}</Badge></dd></div>
                                                </dl>
                                            </BuilderCard>

                                            <BuilderCard title="Send for signing" hint={isReady ? 'This contract is ready to sign. Share the link; the other party signs on the contract page.' : 'Marking it ready saves it and lets you share the signing link.'}>
                                                <div className="flex flex-wrap gap-2">
                                                    {isReady ? (
                                                        <>
                                                            <Button variant="accent" onClick={copyLink}><Link2 size={15} /> Copy signing link</Button>
                                                            <Button variant="secondary" as="a" href={signingLink} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> Open contract page</Button>
                                                            <Button variant="ghost" onClick={backToDraft} disabled={busy === 'ready'}>Back to draft</Button>
                                                        </>
                                                    ) : (
                                                        <Button variant="accent" onClick={markReady} disabled={busy === 'ready' || blocking.length > 0}>
                                                            {busy === 'ready' ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />} Mark ready to sign
                                                        </Button>
                                                    )}
                                                    <Button variant="secondary" onClick={generatePDF} disabled={busy === 'pdf'}><Download size={15} /> Download PDF</Button>
                                                </div>
                                                <p className="mt-3 text-[12px] text-gray-500">To email it, use Email on the contract in the list. It goes with a tracked signing link.</p>
                                            </BuilderCard>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Sticky save bar */}
                    {!locked && (
                        <div className="shrink-0 border-t border-black/[0.06] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#07080b]/95">
                            <div className="mx-auto flex h-16 max-w-3xl items-center gap-2 px-3 sm:px-6">
                                <div className="min-w-0 flex-1">
                                    <p className="text-[11px] text-gray-500">{gst.mode === 'extra' ? 'Value + GST' : 'Contract value'}</p>
                                    <p className="truncate text-[16px] font-extrabold tabular-nums">{total > 0 ? formatMoney(gst.grand, currency) : '—'}</p>
                                </div>
                                <Button variant="ghost" onClick={() => setAiOpen(true)} className="h-11 w-11 px-0 sm:hidden" aria-label="Draft with AI"><Sparkles size={17} className="text-violet-500" /></Button>
                                {stepIndex > 0 && (
                                    <Button variant="secondary" onClick={() => goStep(STEPS[stepIndex - 1].id)} className="h-11 w-11 px-0 sm:w-auto sm:px-4" aria-label="Previous section">
                                        <ChevronLeft size={17} /> <span className="hidden sm:inline">{STEPS[stepIndex - 1].label}</span>
                                    </Button>
                                )}
                                {stepIndex < STEPS.length - 1 ? (
                                    <Button variant="accent" onClick={() => goStep(STEPS[stepIndex + 1].id)} className="h-11">
                                        <span>Next<span className="hidden sm:inline">: {STEPS[stepIndex + 1].label}</span></span> <ChevronRight size={17} />
                                    </Button>
                                ) : (
                                    <Button variant="accent" onClick={handleSave} disabled={Boolean(busy)} className="h-11">
                                        <Save size={16} /> Save & close
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </section>

                {/* Live preview on wide screens */}
                <aside className="hidden w-[440px] shrink-0 flex-col border-l border-black/[0.06] dark:border-white/[0.06] lg:flex xl:w-[520px] 2xl:w-[620px]">
                    <PaperViewer formData={previewData} pages={previewPages} page={previewPage} onPage={setPreviewPage} className="h-full" />
                </aside>
            </main>

            {/* Preview on phones and tablets */}
            <Sheet open={previewOpen} onClose={() => setPreviewOpen(false)} size="xl" title="Preview" subtitle={formData.agreementNumber} bodyClassName="p-0 flex flex-col"
                footer={<Button variant="accent" onClick={generatePDF} disabled={busy === 'pdf'} className="w-full">{busy === 'pdf' ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />} Download PDF</Button>}>
                <PaperViewer formData={previewData} pages={previewPages} page={previewPage} onPage={setPreviewPage} className="min-h-[60dvh] flex-1" />
            </Sheet>

            {/* All pages, off screen, for the PDF */}
            <div ref={pdfRef} aria-hidden="true" className="pointer-events-none fixed left-[-9999px] top-0 flex flex-col gap-10 bg-white">
                {previewPages.map((_, idx) => (
                    <ContractPreview key={`export-${idx}`} formData={previewData} paginatedPages={previewPages} currentPage={idx} />
                ))}
            </div>

            <AIDraftSheet open={aiOpen} onClose={() => setAiOpen(false)} hasContent={hasContent} busy={aiBusy} onSubmit={runAiDraft} />
            <AIRefineSheet target={refineTarget} onClose={() => setRefineTarget(null)} busy={refineBusy} onSubmit={runRefine} />
        </div>
    );
};

export default ContractGenerator;
