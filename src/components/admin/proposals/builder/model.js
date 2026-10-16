import { DEFAULT_V2_PROPOSAL_DATA, getV2PaginatedPages, normalizeProposalData } from '../../../../lib/proposalTemplateV2';
import { isProposalClosed, proposalExpiry } from '../../../../lib/proposals';
import { estimateBlockHeight, isHtmlEmpty, splitTextIntoPages } from './text';

/*
 * The proposal builder's data rules: the two paper formats (the current
 * 8-page "v2" quotation and the classic format older proposals use), totals,
 * and the checks run before a proposal is shared.
 */

export const LOGO_OPTIONS = [
    { id: 'entertainment', label: 'Newbi Entertainment', path: '/brand/newbi-logo-entertainment-800w.png', color: '#39FF14' },
    { id: 'media', label: 'Newbi Media', path: '/brand/newbi-logo-media-800w.png', color: '#00D1FF' },
    { id: 'marketing', label: 'Newbi Marketing', path: '/brand/newbi-logo-marketing-800w.png', color: '#FF0055' },
];
export const logoFor = (id) => LOGO_OPTIONS.find(l => l.id === id) || LOGO_OPTIONS[0];

export const DEFAULT_COLUMNS = [
    { key: 'description', label: 'Resource Inventory', type: 'text' },
    { key: 'qty', label: 'Qty', type: 'number' },
    { key: 'price', label: 'Amount (INR)', type: 'amount' },
];

export const COLUMN_TYPES = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'amount', label: 'Amount (₹)' },
];

/** The starter row older builds put in every new proposal. It is never real data. */
export const PLACEHOLDER_ITEM_DESC = 'Project Phase 01: Initial Strategic Planning';
export const isPlaceholderItem = (it) => it && it.description === PLACEHOLDER_ITEM_DESC && !Number(it.price);

export const isV2Proposal = (p) => p?.templateVersion === 'v2' || Boolean(p?.whatsInside || p?.blueprintSteps || p?.deliverablesTable);

/** Fields the client or the system owns. The editor never writes its (possibly stale) copy back. */
export const CLIENT_OWNED_FIELDS = [
    'id', 'status', 'approvalMetadata', 'rejectionMetadata', 'clientSignature', 'accessLogs', 'lastOpened',
    'createdAt', 'createdBy', 'createdByEmail', 'respondedAt', 'sentAt', 'lastSharedAt', 'lastSharedVia',
    'convertedInvoiceId', 'convertedAt', 'statusHistory', 'revisionOf',
];

export const LEGACY_TITLE_DEFAULTS = {
    strategyTitle: 'EXECUTIVE SUMMARY',
    strategySub: 'STRATEGIC OUTLINE',
    scopeTitle: 'SCOPE OF WORK',
    scopeSub: 'RESOURCE DELIVERABLES',
    proposalTitle: 'DELIVERABLES',
    proposalSub: 'PROJECT INVENTORY',
    inventoryTitle: 'RESOURCE INVENTORY',
    inventorySub: 'COMMERCIALS BREAKDOWN',
    commercialsTitle: 'COMMERCIAL TERMS',
    commercialsSub: 'SETTLEMENT & SIGN-OFF',
};

export const SAMPLE_CLIENT_NAME = DEFAULT_V2_PROPOSAL_DATA.clientName;

export const newId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const pad2 = (n) => String(n).padStart(2, '0');

/**
 * The v2 paper reads stepNumber / deliverable / description / qtyPrice /
 * deliverablesTableNote. Earlier editors and the AI wrote number / package /
 * scope / price / deliverablesIndicativeNote, which the paper never showed.
 * Copy those values across (old keys are kept, nothing is lost).
 */
export const repairV2Fields = (data = {}) => {
    const out = { ...data };
    if (Array.isArray(out.blueprintSteps)) {
        out.blueprintSteps = out.blueprintSteps.map((s, i) => {
            const step = { ...(s || {}) };
            if (step.stepNumber === undefined || step.stepNumber === '') step.stepNumber = step.number || i + 1;
            if (!Array.isArray(step.bullets)) step.bullets = [];
            return step;
        });
    }
    if (Array.isArray(out.pricingTable)) {
        out.pricingTable = out.pricingTable.map((r, i) => {
            const row = { ...(r || {}) };
            if (!row.deliverable && row.package) row.deliverable = row.package;
            if (!row.description && row.scope) row.description = row.scope;
            if (!row.qtyPrice && row.price) row.qtyPrice = String(row.price);
            if (row.id === undefined || row.id === null || row.id === '') row.id = pad2(i + 1);
            return row;
        });
    }
    if (Array.isArray(out.deliverablesTable)) {
        out.deliverablesTable = out.deliverablesTable.map((r, i) => {
            const row = { ...(r || {}) };
            if (!row.deliverable && row.item) row.deliverable = row.item;
            if (row.id === undefined || row.id === null || row.id === '' || typeof row.id === 'number') row.id = pad2(typeof row.id === 'number' && row.id < 100 ? row.id : i + 1);
            return row;
        });
    }
    if (!out.deliverablesTableNote && out.deliverablesIndicativeNote) out.deliverablesTableNote = out.deliverablesIndicativeNote;
    return out;
};

/** A proposal as the editor holds it. */
export const loadForEditing = (proposal) => {
    if (isV2Proposal(proposal)) {
        return repairV2Fields({
            ...normalizeProposalData(proposal),
            hiddenFields: proposal.hiddenFields || [],
            selectedLogo: proposal.selectedLogo || 'entertainment',
            attachments: proposal.attachments || [],
            customPages: proposal.customPages || [],
        });
    }
    const out = {
        ...proposal,
        hiddenFields: proposal.hiddenFields || [],
        selectedLogo: proposal.selectedLogo || 'entertainment',
        hideTotalColumn: proposal.hideTotalColumn || false,
        attachments: proposal.attachments || [],
    };
    Object.entries(LEGACY_TITLE_DEFAULTS).forEach(([k, v]) => { out[k] = proposal[k] ?? v; });
    return out;
};

/** A brand-new proposal: the v2 template with our defaults. */
export const newProposalData = () => ({
    ...repairV2Fields(DEFAULT_V2_PROPOSAL_DATA),
    proposalNumber: '',
    templateVersion: 'v2',
    // The template's sample client is cleared so a proposal can't go out in someone else's name.
    clientName: '',
    clientSubtitle: '',
    // Clients can accept and sign online unless this is turned off.
    showSignatures: true,
    showGst: true,
    gstRate: 18,
    dealValue: '',
    validUntil: '',
    clientEmail: '',
    clientPhone: '',
    clientContactName: '',
    senderName: '',
    senderDesignation: '',
    providerSignature: '',
    items: [],
});

const num = (v) => {
    const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
};
export const roundMoney = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Totals. Classic proposals sum the chosen amount column (the "Amount" column
 * holds line totals); an override replaces the subtotal and GST follows it.
 * v2 proposals carry a deal value (before GST) instead of line items.
 */
export const computeTotals = (formData, items) => {
    const gstRate = num(formData.gstRate ?? 18);
    if (isV2Proposal(formData)) {
        const subtotal = num(formData.dealValue);
        const gstAmount = formData.showGst ? roundMoney((subtotal * gstRate) / 100) : 0;
        return { subtotal, gstAmount, totalAmount: roundMoney(subtotal + gstAmount), computedTotal: roundMoney(subtotal + gstAmount), hasOverride: false, gstRate };
    }
    const src = formData.totalSourceColumn || 'price';
    const subtotal = roundMoney((items || []).reduce((sum, item) => sum + num(item?.[src]), 0));
    const hasOverride = formData.totalOverride !== null && formData.totalOverride !== undefined && formData.totalOverride !== '';
    const base = hasOverride ? num(formData.totalOverride) : subtotal;
    const gstAmount = formData.showGst ? roundMoney((base * gstRate) / 100) : 0;
    const computedTotal = roundMoney(subtotal + (formData.showGst ? (subtotal * gstRate) / 100 : 0));
    const totalAmount = hasOverride ? roundMoney(base + gstAmount) : computedTotal;
    return { subtotal, gstAmount, totalAmount, computedTotal, hasOverride, gstRate };
};

export const rupees = (n) => `₹${roundMoney(n).toLocaleString('en-IN')}`;

export const todayKey = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const addDaysKey = (n, from = new Date()) => {
    const d = new Date(from);
    d.setDate(d.getDate() + n);
    return todayKey(d);
};

/** Pages of the document, in order. */
export const getProposalPages = (formData, items) => (isV2Proposal(formData) ? getV2PaginatedPages(formData) : getLegacyPages(formData, items));

export const getLegacyPages = (formData, items = []) => {
    const isHidden = (f) => (formData.hiddenFields || []).includes(f);
    const pages = [];

    const insertCustomPagesFor = (placement) => {
        if (!isHidden('customPages') && formData.customPages && formData.customPages.length > 0) {
            formData.customPages.forEach((cp, cpIdx) => {
                const target = cp.insertAfter || 'default';
                if (target === placement) {
                    const cpPages = splitTextIntoPages(cp.content || '', 800);
                    cpPages.forEach((cpText, cpSubIdx) => {
                        pages.push({
                            type: 'custom',
                            items: [],
                            title: cpPages.length > 1 ? `${cp.title} (Part ${cpSubIdx + 1})` : cp.title,
                            content: cpText,
                            pageIndex: cpIdx,
                            customSubIdx: cpSubIdx
                        });
                    });
                }
            });
        }
    };

    if (!isHidden('cover')) {
        pages.push({ type: 'cover', items: [] });
    }
    insertCustomPagesFor('cover');

    if (!isHidden('strategy') && (!isHidden('overview') || !isHidden('primaryGoal'))) {
        const overviewHtml = !isHidden('overview') ? (formData.overview || '') : '';
        const primaryGoalHtml = (!isHidden('primaryGoal') && !isHtmlEmpty(formData.primaryGoal)) ? (formData.primaryGoal || '') : '';
        
        const overviewPages = splitTextIntoPages(overviewHtml, 800);
        const lastOverviewPage = overviewPages[overviewPages.length - 1] || '';
        const goalContainerHeight = primaryGoalHtml ? estimateBlockHeight(primaryGoalHtml) + 120 : 0;
        
        if (estimateBlockHeight(lastOverviewPage) + goalContainerHeight <= 800) {
            overviewPages.forEach((opText, opIdx) => {
                if (opIdx === overviewPages.length - 1) {
                    pages.push({
                        type: 'strategy',
                        overviewText: opText,
                        primaryGoalText: primaryGoalHtml,
                        strategyPage: opIdx + 1,
                        isLastStrategy: true
                    });
                } else {
                    pages.push({
                        type: 'strategy',
                        overviewText: opText,
                        primaryGoalText: '',
                        strategyPage: opIdx + 1,
                        isLastStrategy: false
                    });
                }
            });
        } else {
            overviewPages.forEach((opText, opIdx) => {
                pages.push({
                    type: 'strategy',
                    overviewText: opText,
                    primaryGoalText: '',
                    strategyPage: opIdx + 1,
                    isLastStrategy: false
                });
            });
            pages.push({
                type: 'strategy',
                overviewText: '',
                primaryGoalText: primaryGoalHtml,
                strategyPage: overviewPages.length + 1,
                isLastStrategy: true
            });
        }
    }
    insertCustomPagesFor('strategy');

    if (!isHidden('scopeOfWork') && formData.scopeOfWork) {
        const scopePages = splitTextIntoPages(formData.scopeOfWork, 800);
        scopePages.forEach((spText, spIdx) => {
            pages.push({
                type: 'scope',
                items: [],
                scopeText: spText,
                scopePage: spIdx + 1,
                isLastScope: spIdx === scopePages.length - 1
            });
        });
    }
    insertCustomPagesFor('scope');

    if (!isHidden('proposal')) {
        const activeDeliverables = (formData.deliverables || []).filter(d => d.item);
        const clientReqs = (formData.clientRequirements || []).filter(r => r.description);
        
        if (activeDeliverables.length === 0) {
            pages.push({
                type: 'proposal',
                deliverables: [],
                clientRequirements: clientReqs,
                proposalPage: 1,
                isLastProposal: true
            });
        } else {
            let delsRemaining = [...activeDeliverables];
            let pageIdx = 1;
            while (delsRemaining.length > 0) {
                const chunk = delsRemaining.splice(0, 10);
                const isLast = delsRemaining.length === 0;
                pages.push({
                    type: 'proposal',
                    deliverables: chunk,
                    clientRequirements: isLast ? clientReqs : [],
                    proposalPage: pageIdx++,
                    isLastProposal: isLast,
                    startIndex: (pageIdx - 2) * 10
                });
            }
        }
    }
    insertCustomPagesFor('proposal');

    if (!isHidden('inventory')) {
        let itemsRemaining = [...items];
        if (itemsRemaining.length === 0) pages.push({ type: 'table', items: [] });
        else {
            let pIdx = 1;
            while (itemsRemaining.length > 0) {
                pages.push({ 
                    type: 'table', 
                    items: itemsRemaining.splice(0, 10),
                    tablePageIdx: pIdx++ 
                });
            }
        }
    }
    insertCustomPagesFor('table');

    insertCustomPagesFor('default');

    if (!isHidden('commercials')) {
        const termsHtml = formData.terms || '';
        const paymentDetailsHtml = (formData.showPaymentDetails !== false && !isHidden('paymentDetails')) ? (formData.paymentDetails || '') : '';
        
        if (termsHtml) {
            const termsPages = splitTextIntoPages(termsHtml, 800);
            const lastTermsPageText = termsPages[termsPages.length - 1];
            const finalPageStaticHeight = 550;
            const lastTermsHeight = estimateBlockHeight(lastTermsPageText) + (paymentDetailsHtml ? 100 : 0);
            
            if (lastTermsHeight + finalPageStaticHeight <= 800) {
                for (let i = 0; i < termsPages.length - 1; i++) {
                    pages.push({
                        type: 'terms_only',
                        termsText: termsPages[i],
                        termsPageIdx: i + 1
                    });
                }
                pages.push({
                    type: 'commercials',
                    termsText: lastTermsPageText,
                    paymentDetailsText: paymentDetailsHtml,
                    items: []
                });
            } else {
                for (let i = 0; i < termsPages.length; i++) {
                    pages.push({
                        type: 'terms_only',
                        termsText: termsPages[i],
                        termsPageIdx: i + 1
                    });
                }
                pages.push({
                    type: 'commercials',
                    termsText: '',
                    paymentDetailsText: paymentDetailsHtml,
                    items: []
                });
            }
        } else {
            pages.push({
                type: 'commercials',
                termsText: '',
                paymentDetailsText: paymentDetailsHtml,
                items: []
            });
        }
    }
    insertCustomPagesFor('commercials');
    if (!isHidden('attachments') && formData.attachments && formData.attachments.length > 0) {
        pages.push({
            type: 'attachments',
            attachments: formData.attachments
        });
    }
    return pages;
};

/** Fill a proposal from an AI draft without wiping what the AI left empty. */
const V2_TEXT_KEYS = [
    'clientName', 'clientSubtitle', 'clientAddress', 'campaignName', 'campaignSubtitle', 'campaignDuration', 'introParagraph',
    'preparedForText', 'classification', 'strategySub', 'strategyTitle', 'primaryObjectiveTitle', 'primaryObjectiveText',
    'anchorMarketsTitle', 'anchorMarketsCaption', 'whyThisApproachTitle', 'whyThisApproachText', 'blueprintSub', 'blueprintTitle',
    'deliverablesSub', 'deliverablesTitle', 'deliverablesTableNote', 'deliverablesIndicativeNote', 'cityNoteTitle', 'cityNoteText',
    'commercialsSub', 'commercialsTitle', 'commercialsSubtitle', 'pricingTableNote', 'whatsIncludedTitle', 'whatsIncludedText',
    'paymentScalingTitle', 'paymentScalingText', 'deepDiveSub', 'deepDiveTitle', 'deepDiveIntro', 'closingSub', 'closingTitle',
    'closingText', 'preparedBy',
];
const V2_LIST_KEYS = ['whatsInside', 'executiveParagraphs', 'anchorMarkets', 'blueprintSteps', 'deliverablesTable', 'pricingTable', 'deepDiveSubsections'];
const LEGACY_TEXT_KEYS = ['clientName', 'clientAddress', 'campaignName', 'campaignDuration', 'coverDescription', 'overview', 'primaryGoal', 'scopeOfWork', 'terms'];

export const applyAiDraft = (prev, aiData = {}) => {
    let data = aiData || {};
    const next = { ...prev };
    const filled = (v) => (Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim() !== '' : v !== undefined && v !== null);
    if (isV2Proposal(prev)) {
        V2_TEXT_KEYS.forEach(k => { if (filled(data[k])) next[k] = data[k]; });
        V2_LIST_KEYS.forEach(k => { if (filled(data[k])) next[k] = data[k]; });
    } else {
        // The AI writes the 8-page format; carry its content into the classic fields.
        const esc = (t) => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const mapped = {
            coverDescription: data.coverDescription || (data.introParagraph ? `<p>${esc(data.introParagraph)}</p>` : ''),
            overview: data.overview || (Array.isArray(data.executiveParagraphs) ? data.executiveParagraphs.filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('') : ''),
            primaryGoal: data.primaryGoal || (data.primaryObjectiveText ? `<p>${esc(data.primaryObjectiveText)}</p>` : ''),
            scopeOfWork: data.scopeOfWork || (Array.isArray(data.blueprintSteps) ? data.blueprintSteps.map(st => `<p><strong>${esc(st.title)}</strong></p><ul>${(st.bullets || []).map(b => `<li>${esc(b)}</li>`).join('')}</ul>`).join('') : ''),
            terms: data.terms || (data.paymentScalingText ? `<p>${esc(data.paymentScalingText)}</p>` : ''),
        };
        LEGACY_TEXT_KEYS.forEach(k => { const v = filled(data[k]) ? data[k] : mapped[k]; if (filled(v)) next[k] = v; });
        if (!filled(data.deliverables) && filled(data.deliverablesTable)) data = { ...data, deliverables: data.deliverablesTable.map(r => ({ item: r.deliverable || r.item, qty: r.qty, timeline: r.timeline })) };
        if (filled(data.deliverables)) next.deliverables = data.deliverables.map((d, i) => ({ id: `${Date.now()}_${i}`, item: d.item || d.name || '', qty: d.qty || '1', timeline: d.timeline || 'TBD' }));
        if (filled(data.clientRequirements)) next.clientRequirements = data.clientRequirements.map((r, i) => ({ id: `${Date.now()}_r${i}`, description: r.description || r.requirement || '' }));
    }
    // Bank details are the user's own; the AI never touches them.
    next.paymentDetails = prev.paymentDetails;
    if (filled(data.customPages)) {
        next.customPages = [
            ...(prev.customPages || []),
            ...data.customPages.map((cp, i) => ({ id: `${Date.now()}_cp${i}`, title: cp.title || 'New page', subtitle: cp.subtitle || '', content: cp.content || '', insertAfter: cp.insertAfter || 'default' })),
        ];
    }
    return repairV2Fields(next);
};

export const aiItems = (data = {}) => (Array.isArray(data.items) && data.items.length
    ? data.items.map((item, i) => ({ id: `${Date.now()}_i${i}`, description: item.description || item.name || item.item || '', qty: Number(item.qty) || 1, unit: item.unit || 'Unit', price: Number(item.price) || 0 }))
    : null);

/** Problems that should stop a proposal going out, and softer warnings. */
export const checkBeforeSharing = (formData, { totals, proposals = [], id } = {}) => {
    const blockers = [];
    const warnings = [];
    if (!String(formData.clientName || '').trim()) blockers.push({ text: 'Add the client name.', section: 'client' });
    const number = String(formData.proposalNumber || '').trim();
    if (!number) blockers.push({ text: 'Give the proposal a number.', section: 'details' });
    else if (proposals.some(p => p.id !== id && String(p.proposalNumber || '').trim().toUpperCase() === number.toUpperCase())) {
        warnings.push({ text: `${number} is also used by another proposal.`, section: 'details' });
    }
    const expiry = proposalExpiry(formData);
    if (expiry && expiry < new Date()) blockers.push({ text: 'The "valid until" date has passed, so the client can’t accept it.', section: 'details' });
    if (!formData.validUntil) warnings.push({ text: 'No "valid until" date. The offer will stay open forever.', section: 'details' });
    if (!String(formData.clientEmail || '').trim()) warnings.push({ text: 'No client email yet. You can still share the link.', section: 'client' });
    if (!totals?.totalAmount) warnings.push({ text: 'No deal value or prices yet, so it shows as ₹0 in your pipeline.', section: 'pricing' });
    if (isV2Proposal(formData)) {
        const clientName = String(formData.clientName || '').trim();
        if (clientName && clientName !== SAMPLE_CLIENT_NAME) {
            const text = JSON.stringify([formData.introParagraph, formData.preparedForText, formData.executiveParagraphs, formData.blueprintSteps, formData.whatsIncludedText, formData.paymentScalingText, formData.closingText, formData.cityNoteText, formData.deepDiveSubsections]);
            if (text.includes(SAMPLE_CLIENT_NAME)) warnings.push({ text: `Some text still mentions the sample client "${SAMPLE_CLIENT_NAME}".`, section: 'cover' });
        }
        if (formData.showSignatures === false) warnings.push({ text: 'Online acceptance is off, so the client can only read it.', section: 'sign' });
    }
    if (isProposalClosed(formData)) blockers.push({ text: 'This proposal is already closed.', section: 'review' });
    return { blockers, warnings };
};

/** What the AI sees when asked for changes: the content, without files, logs or signatures. */
const NOT_FOR_AI = [...CLIENT_OWNED_FIELDS, 'attachments', 'providerSignature', 'ourSignature', 'paymentDetails', 'proposalNumber', 'templateVersion', 'hiddenFields', 'selectedLogo', 'clientEmail', 'clientPhone', 'updatedAt'];
export const contentForAi = (formData, items) => {
    const out = { ...formData, items };
    NOT_FOR_AI.forEach(k => { delete out[k]; });
    return out;
};

/** Merge an AI revision without letting it touch identity, files, bank details or client answers. */
export const applyRevision = (prev, revised = {}) => {
    const next = { ...prev };
    Object.entries(revised || {}).forEach(([k, v]) => {
        if (NOT_FOR_AI.includes(k) || k === 'items' || v === undefined) return;
        next[k] = v;
    });
    if (Array.isArray(next.customPages)) {
        next.customPages = next.customPages.map((cp, i) => ({ id: cp.id || `${Date.now()}_rcp${i}`, title: cp.title || 'Page', subtitle: cp.subtitle || '', content: cp.content || '', insertAfter: cp.insertAfter || 'default' }));
    }
    return repairV2Fields(next);
};

/** Plain text from editor HTML (for the AI and short previews). */
export const htmlishToText = (value) => {
    const s = String(value ?? '');
    if (!/<[a-z][\s\S]*>/i.test(s)) return s;
    return s
        .replace(/<li[^>]*>/gi, '\n• ')
        .replace(/<\/(p|div|h[1-6]|li|ul|ol)>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};
