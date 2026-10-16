import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
import ClipboardPaste from 'lucide-react/dist/esm/icons/clipboard-paste';
import Scale from 'lucide-react/dist/esm/icons/scale';
import { DEFAULT_V2_PROPOSAL_DATA } from '../../../lib/proposalTemplateV2';

/*
 * What the AI studio can make, and how AI answers become real proposal /
 * contract records. Kept apart from the page so the shapes are easy to check.
 */

export const STUDIO_KINDS = {
    proposal: {
        id: 'proposal',
        aiType: 'proposal',
        module: 'proposal',
        label: 'Proposal',
        hint: 'A full 8-page quotation from a short brief',
        icon: FileSpreadsheet,
        tone: 'violet',
        placeholder: 'Who is it for, what are you proposing, where and when, and a rough budget. For example: digital promotion for a 10-city comedy tour for Laugh Factory, Jan–Mar, ₹60,000 per city.',
        examples: [
            'Event production proposal for a 2-day music festival in Goa, including stage, sound and lighting',
            'Artist logistics and hospitality for a 6-city stand-up comedy tour, March to May',
            'Campus and creator promotion for a brand launch across Bengaluru, Pune and Hyderabad',
            'Digital marketing and social media coverage for a product launch event in Mumbai',
            '50 event volunteers and site management for a corporate marathon',
            'Technical production and stage management for a TEDx event',
        ],
    },
    notes: {
        id: 'notes',
        aiType: 'bulk_proposal',
        module: 'proposal',
        label: 'Proposal from notes',
        hint: 'Paste a draft, brief or meeting notes and get it laid out',
        icon: ClipboardPaste,
        tone: 'fuchsia',
        placeholder: 'Paste the draft proposal, client brief, email thread or meeting notes here. Attach a PDF or text file if it is long.',
        examples: [
            'Client: Sunrise Studios. Campaign: Monsoon Nights concert series, 4 cities, July–Sept. Deliverables: 20 creators per city, campus outreach in 10 colleges, weekly reports. Budget ₹1.2L per city, 50% advance.',
            'Notes from call with Karma Foods: wants a 3-month Instagram push for new outlet launches in Indiranagar and Koramangala, 15 micro creators a month, one launch event, ₹4L total.',
        ],
    },
    contract: {
        id: 'contract',
        aiType: 'contract',
        module: 'contract',
        label: 'Contract',
        hint: 'An agreement with parties, payment terms and clauses',
        icon: Scale,
        tone: 'indigo',
        placeholder: 'Who the contract is with, what the work is, how long it runs, the total value and payment terms. For example: 12-month social media management for Karma Foods, ₹50,000 a month, 50% advance.',
        examples: [
            'Service contract for social media management for 12 months, ₹50,000 total value',
            'NDA and service contract for a brand collaboration with Sunrise Studios',
            'MOU for a joint venture between Newbi Entertainment and a production house',
            'Freelancer contract for video editing, 6-month engagement, ₹25,000 a month',
            'Content licensing contract for YouTube channel management',
        ],
    },
};

export const KIND_ORDER = ['proposal', 'notes', 'contract'];

export const TONES = [
    { value: 'Premium', label: 'Premium' },
    { value: 'Formal', label: 'Formal' },
    { value: 'Friendly', label: 'Friendly' },
    { value: 'Concise', label: 'Short and direct' },
];

// Longest brief we send (prompt + attachments). The server allows more, but
// very long inputs make the AI slow and cut its answer short.
export const MAX_BRIEF_CHARS = 60000;

// AI text is shown on the client-facing paper, so it is kept as plain text:
// tags are dropped (no markup or scripts can come through from a brief or file).
const TAG = /<\/?[a-z][^>]*>/gi;
const str = (v) => (v === null || v === undefined || typeof v === 'object' ? '' : String(v)).replace(TAG, '').trim();

/** HTML from the rich editors → plain text with line breaks (for the AI). */
export const htmlToPlain = (html) => String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(TAG, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
const list = (v) => (Array.isArray(v) ? v : []);
const pad2 = (n) => String(n).padStart(2, '0');

/* ── Proposals ─────────────────────────────────────────────────────────── */

// Layout settings and section headings from the v2 template, without its
// sample client content (so an empty AI field never shows someone else's text).
const V2_LAYOUT_KEYS = [
    'templateVersion', 'selectedLogo', 'showCover', 'showCoverPill', 'coverPillText', 'showDuration', 'showWhatsInside',
    'showPreparedFor', 'classification', 'showExecutiveSummary', 'strategySub', 'strategyTitle', 'showPrimaryObjective',
    'primaryObjectiveTitle', 'showAnchorMarkets', 'anchorMarketsTitle', 'showWhyThisApproach', 'whyThisApproachTitle',
    'showBlueprint', 'blueprintSub', 'blueprintTitle', 'showDeliverables', 'deliverablesSub', 'deliverablesTitle',
    'deliverablesTableHeaders', 'deliverablesTableNote', 'commercialsSub', 'commercialsTitle', 'pricingTableNote',
    'showWhatsIncluded', 'whatsIncludedTitle', 'showPaymentScaling', 'paymentScalingTitle', 'deepDiveSub', 'deepDiveTitle',
    'showClosing', 'closingSub', 'closingTitle', 'preparedBy', 'showSignatures', 'showSeal',
];

export const blankProposal = () => {
    const base = {};
    V2_LAYOUT_KEYS.forEach(k => { base[k] = DEFAULT_V2_PROPOSAL_DATA[k]; });
    return {
        ...base,
        templateVersion: 'v2',
        status: 'Draft',
        proposalNumber: '',
        clientName: '', clientSubtitle: '', clientAddress: '',
        campaignName: '', campaignSubtitle: '', campaignDuration: '',
        introParagraph: '', whatsInside: [], preparedForText: '',
        executiveParagraphs: [], primaryObjectiveText: '', anchorMarkets: [], anchorMarketsCaption: '', whyThisApproachText: '',
        blueprintSteps: [], deliverablesTable: [], showCityNote: false, cityNoteTitle: '', cityNoteText: '',
        showCommercials: true, commercialsSubtitle: '', pricingTable: [], whatsIncludedText: '', paymentScalingText: '',
        showDeepDive: false, deepDiveIntro: '', deepDiveSubsections: [],
        closingText: '',
        hiddenFields: [], customPages: [], attachments: [], items: [],
        ourSignature: null, clientSignature: null, approvalMetadata: null,
    };
};

const mapWhatsInside = (v) => list(v)
    .map((w, i) => (typeof w === 'string' ? { num: pad2(i + 1), title: str(w) } : { num: str(w?.num) || pad2(i + 1), title: str(w?.title) }))
    .filter(w => w.title);

const mapSteps = (v) => list(v)
    .map((s, i) => ({
        stepNumber: Number(s?.stepNumber || s?.number) || i + 1,
        title: str(s?.title),
        bullets: list(s?.bullets).map(str).filter(Boolean),
    }))
    .filter(s => s.title || s.bullets.length);

const mapDeliverables = (v) => list(v)
    .map((d, i) => ({
        id: pad2(i + 1),
        deliverable: str(d?.deliverable || d?.item || d?.name || d?.title),
        qty: str(d?.qty || d?.quantity),
        timeline: str(d?.timeline),
    }))
    .filter(d => d.deliverable);

// The AI's schema says package/scope/price; the paper reads deliverable/description/qtyPrice.
const mapPricing = (v) => list(v)
    .map((p, i) => ({
        id: pad2(i + 1),
        deliverable: str(p?.deliverable || p?.package || p?.name || p?.title),
        description: str(p?.description || p?.scope),
        qtyPrice: str(p?.qtyPrice || p?.price || p?.amount),
        timeline: str(p?.timeline) || '—',
    }))
    .filter(p => p.deliverable || p.qtyPrice);

const mapSubsections = (v) => list(v)
    .map((s, i) => ({ badge: str(s?.badge) || `5.${i + 1}`, title: str(s?.title), bullets: list(s?.bullets).map(str).filter(Boolean) }))
    .filter(s => s.title || s.bullets.length);

const paragraphs = (v) => (Array.isArray(v) ? v : str(v) ? str(v).split(/\n{2,}/) : []).map(str).filter(Boolean);

/** AI proposal JSON (v2 schema, or older field names) → a complete v2 proposal. */
export const buildProposal = (ai = {}, previous = null) => {
    const base = previous ? { ...previous } : blankProposal();
    const pick = (key, ...alts) => {
        for (const k of [key, ...alts]) { const v = str(ai[k]); if (v) return v; }
        return base[key] || '';
    };
    const next = {
        ...base,
        templateVersion: 'v2',
        clientName: pick('clientName'),
        clientSubtitle: pick('clientSubtitle'),
        clientAddress: pick('clientAddress'),
        campaignName: pick('campaignName', 'projectName', 'title'),
        campaignSubtitle: pick('campaignSubtitle'),
        campaignDuration: pick('campaignDuration', 'duration'),
        introParagraph: pick('introParagraph', 'coverDescription'),
        preparedForText: pick('preparedForText'),
        classification: pick('classification') || 'Strategic Commercial',
        primaryObjectiveText: pick('primaryObjectiveText', 'primaryGoal'),
        anchorMarketsCaption: pick('anchorMarketsCaption'),
        whyThisApproachText: pick('whyThisApproachText'),
        cityNoteTitle: pick('cityNoteTitle'),
        cityNoteText: pick('cityNoteText'),
        commercialsSubtitle: pick('commercialsSubtitle'),
        whatsIncludedText: pick('whatsIncludedText'),
        paymentScalingText: pick('paymentScalingText', 'terms'),
        deepDiveIntro: pick('deepDiveIntro'),
        closingText: pick('closingText'),
        preparedBy: pick('preparedBy') || 'NewBi Entertainment & Marketing LLP',
    };
    // Headings the AI may rewrite for this client.
    ['strategyTitle', 'blueprintTitle', 'deliverablesTitle', 'commercialsTitle', 'deepDiveSub', 'deepDiveTitle', 'closingTitle', 'cityNoteTitle']
        .forEach(k => { if (str(ai[k])) next[k] = str(ai[k]); });

    const exec = paragraphs(ai.executiveParagraphs || ai.overview);
    if (exec.length) next.executiveParagraphs = exec;
    const inside = mapWhatsInside(ai.whatsInside);
    if (inside.length) next.whatsInside = inside;
    const markets = list(ai.anchorMarkets).map(str).filter(Boolean);
    if (markets.length) next.anchorMarkets = markets;
    const steps = mapSteps(ai.blueprintSteps);
    if (steps.length) next.blueprintSteps = steps;
    const dels = mapDeliverables(ai.deliverablesTable || ai.deliverables);
    if (dels.length) next.deliverablesTable = dels;
    const pricing = mapPricing(ai.pricingTable || ai.items);
    if (pricing.length) next.pricingTable = pricing;
    const subs = mapSubsections(ai.deepDiveSubsections);
    if (subs.length) next.deepDiveSubsections = subs;

    return syncProposalSections(next);
};

/** Hide sections that have nothing in them, show them again once they do. */
export const syncProposalSections = (p) => ({
    ...p,
    showWhatsInside: list(p.whatsInside).length > 0,
    showPreparedFor: Boolean(str(p.preparedForText)),
    showPrimaryObjective: Boolean(str(p.primaryObjectiveText)),
    showAnchorMarkets: list(p.anchorMarkets).length > 0,
    showWhyThisApproach: Boolean(str(p.whyThisApproachText)),
    showBlueprint: list(p.blueprintSteps).length > 0,
    showDeliverables: list(p.deliverablesTable).length > 0,
    showCityNote: Boolean(str(p.cityNoteText)),
    showCommercials: list(p.pricingTable).length > 0 || Boolean(str(p.paymentScalingText)),
    showWhatsIncluded: Boolean(str(p.whatsIncludedText)),
    showPaymentScaling: Boolean(str(p.paymentScalingText)),
    showDeepDive: list(p.deepDiveSubsections).length > 0,
    showClosing: Boolean(str(p.closingText)),
    showDuration: Boolean(str(p.campaignDuration)),
});

/** What the AI sees when asked for changes: content only, no layout flags. */
export const proposalForRevision = (p) => {
    const out = {};
    ['clientName', 'clientSubtitle', 'clientAddress', 'campaignName', 'campaignSubtitle', 'campaignDuration', 'introParagraph',
        'whatsInside', 'preparedForText', 'executiveParagraphs', 'primaryObjectiveText', 'anchorMarkets', 'anchorMarketsCaption',
        'whyThisApproachText', 'blueprintSteps', 'deliverablesTable', 'cityNoteTitle', 'cityNoteText', 'commercialsSubtitle',
        'pricingTable', 'whatsIncludedText', 'paymentScalingText', 'deepDiveIntro', 'deepDiveSubsections', 'closingText']
        .forEach(k => { out[k] = p[k]; });
    return out;
};

/* ── Contracts ─────────────────────────────────────────────────────────── */

export const newAgreementNumber = () =>
    `NB-AGR-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

export const blankContract = () => ({
    agreementNumber: newAgreementNumber(),
    type: 'Service Agreement',
    template: 'Service Agreement',
    risk: 'Medium',
    status: 'Draft',
    effectiveDate: todayKey(),
    parties: {
        firstParty: { name: 'Newbi Entertainment', address: 'Bangalore, India', role: 'Service Provider', email: '' },
        secondParty: { name: '', address: '', role: 'Client', email: '' },
    },
    details: { projectName: '', purpose: '', duration: '', territory: 'India' },
    commercials: { totalValue: '', paymentSchedule: '', currency: 'INR', gstIncluded: true },
    clauses: [],
    revenueTerms: null,
    showSeal: false,
    showSignatures: false,
    providerSignature: null,
    providerName: 'Authorized Signatory',
    providerDesignation: 'Director of Operations',
    clientSignature: null,
    hiddenFields: [],
});

const money = (v) => {
    const n = Number(String(v ?? '').replace(/[^\d.]/g, ''));
    return n > 0 ? String(Math.round(n * 100) / 100) : '';
};

const mapClauses = (v, prefix) => list(v)
    .map((c, i) => ({
        ...(c && typeof c === 'object' ? c : {}),
        id: str(c?.id) || `${prefix}-${Date.now()}-${i}`,
        title: str(c?.title) || `Clause ${i + 1}`,
        content: str(c?.content || c?.text),
        isActive: c?.isActive !== false,
        category: c?.category || 'general',
    }))
    .filter(c => c.content || c.title);

/** AI contract JSON → a complete contract record (merged over `previous`). */
export const buildContract = (ai = {}, previous = null) => {
    const base = previous ? JSON.parse(JSON.stringify(previous)) : blankContract();
    const fp = ai.parties?.firstParty || {};
    const sp = ai.parties?.secondParty || {};
    const keep = (v, old) => (str(v) ? str(v) : old ?? '');
    const clauses = mapClauses(ai.clauses, 'ai');
    return {
        ...base,
        type: keep(ai.type, base.type),
        template: keep(ai.template || ai.type, base.template),
        parties: {
            firstParty: {
                ...base.parties.firstParty,
                name: keep(fp.name, base.parties.firstParty.name) || 'Newbi Entertainment',
                address: keep(fp.address, base.parties.firstParty.address),
                role: keep(fp.role, base.parties.firstParty.role),
                email: keep(fp.email, base.parties.firstParty.email),
            },
            secondParty: {
                ...base.parties.secondParty,
                name: keep(sp.name, base.parties.secondParty.name),
                address: keep(sp.address, base.parties.secondParty.address),
                role: keep(sp.role, base.parties.secondParty.role) || 'Client',
                email: keep(sp.email, base.parties.secondParty.email),
            },
        },
        details: {
            ...base.details,
            projectName: keep(ai.details?.projectName, base.details.projectName),
            purpose: keep(ai.details?.purpose, base.details.purpose),
            duration: keep(ai.details?.duration, base.details.duration),
            territory: keep(ai.details?.territory, base.details.territory),
        },
        commercials: {
            ...base.commercials,
            totalValue: money(ai.commercials?.totalValue) || base.commercials.totalValue,
            paymentSchedule: keep(ai.commercials?.paymentSchedule, base.commercials.paymentSchedule),
            currency: keep(ai.commercials?.currency, base.commercials.currency) || 'INR',
            gstIncluded: ai.commercials?.gstIncluded === undefined ? base.commercials.gstIncluded !== false : ai.commercials.gstIncluded !== false,
        },
        clauses: clauses.length ? clauses : base.clauses,
    };
};

export const contractForRevision = (c) => ({
    parties: c.parties,
    details: { ...c.details, purpose: htmlToPlain(c.details?.purpose) },
    commercials: { ...c.commercials, paymentSchedule: htmlToPlain(c.commercials?.paymentSchedule) },
    clauses: list(c.clauses).map(({ id, title, content, isActive }) => ({ id, title, content: htmlToPlain(content), isActive })),
});

/** Revised clauses keep library data (levels, strictness) of clauses they match by id. */
export const mergeRevisedContract = (revised, current) => {
    const merged = buildContract(revised, current);
    if (Array.isArray(revised?.clauses) && revised.clauses.length) {
        const byId = new Map(list(current.clauses).map(c => [c.id, c]));
        merged.clauses = mapClauses(revised.clauses, 'rev').map(c => (byId.has(c.id) ? { ...byId.get(c.id), ...c } : c));
    }
    return merged;
};

/* ── Labels ────────────────────────────────────────────────────────────── */

export const documentTitle = (kind, doc) => {
    if (!doc) return 'Untitled';
    if (STUDIO_KINDS[kind]?.module === 'contract') {
        return str(doc.details?.projectName) || str(doc.parties?.secondParty?.name) || str(doc.template) || 'Untitled contract';
    }
    return str(doc.campaignName) || str(doc.clientName) || 'Untitled proposal';
};

export const documentSubtitle = (kind, doc) => {
    if (!doc) return '';
    if (STUDIO_KINDS[kind]?.module === 'contract') {
        const party = str(doc.parties?.secondParty?.name);
        const value = Number(doc.commercials?.totalValue) > 0
            ? `${doc.commercials?.currency === 'INR' || !doc.commercials?.currency ? '₹' : `${doc.commercials.currency} `}${Number(doc.commercials.totalValue).toLocaleString('en-IN')}`
            : '';
        return [party, value].filter(Boolean).join(' · ');
    }
    return [str(doc.clientName), str(doc.campaignDuration)].filter(Boolean).join(' · ');
};

/** Short "what's inside" lines for the result card. */
export const documentStats = (kind, doc) => {
    if (!doc) return [];
    if (STUDIO_KINDS[kind]?.module === 'contract') {
        const active = list(doc.clauses).filter(c => c.isActive !== false).length;
        return [
            { label: 'Clauses', value: active, tone: 'indigo' },
            { label: 'Duration', value: str(doc.details?.duration) || '—', tone: 'blue' },
            { label: 'Territory', value: str(doc.details?.territory) || '—', tone: 'teal' },
        ];
    }
    return [
        { label: 'Plan steps', value: list(doc.blueprintSteps).length, tone: 'violet' },
        { label: 'Deliverables', value: list(doc.deliverablesTable).length, tone: 'pink' },
        { label: 'Price lines', value: list(doc.pricingTable).length, tone: 'amber' },
    ];
};

/** Fields the client or the system owns; an update from the studio never writes them back. */
export const PROPOSAL_PROTECTED_FIELDS = ['id', 'status', 'approvalMetadata', 'rejectionMetadata', 'clientSignature', 'accessLogs', 'lastOpened', 'createdAt', 'createdBy', 'createdByEmail', 'statusHistory', 'sentAt', 'convertedInvoiceId'];
export const CONTRACT_PROTECTED_FIELDS = ['id', 'status', 'approvalMetadata', 'clientSignature', 'accessLogs', 'lastOpened', 'createdAt', 'createdBy', 'createdByEmail', 'executedAt', 'lastSharedAt', 'lastSharedVia', 'versions', 'negotiationHistory'];
