/**
 * NEWBI PROPOSAL DESIGN SYSTEM v2
 * Master specification, default mock data, and paginator for the 8-page
 * executive strategic quotation format.
 */

export const DEFAULT_V2_PROPOSAL_DATA = {
    templateVersion: 'v2',
    proposalNumber: '',
    selectedLogo: 'entertainment',
    status: 'Draft',

    // Page 1: Official Strategic Quotation Cover
    showCover: true,
    showCoverPill: true,
    coverPillText: 'OFFICIAL STRATEGIC QUOTATION',
    clientName: "ITW Playworks",
    clientSubtitle: "In association with Playworx",
    clientAddress: "",
    campaignName: "Sonu Nigam's Revolution",
    campaignSubtitle: "India Tour 2026–27",
    showDuration: true,
    campaignDuration: "OCT '26 – MAR '27",
    introParagraph: "NewBi Entertainment & Marketing LLP is pleased to present this multi-city promotion proposal for Sonu Nigam's Revolution India Tour — Three Decades, One Voice — across 75 cities. Our approach combines online community engagement and creator-led content to build awareness and support ticket sales in every tour city, with NewBi managing overall execution in Bengaluru directly.",
    showWhatsInside: true,
    whatsInside: [
        { num: '01', title: 'Executive Summary & Objective' },
        { num: '02', title: 'Process & Execution Blueprint' },
        { num: '03', title: 'Per-City Deliverables' },
        { num: '04', title: 'Pricing Structure' },
        { num: '05', title: 'Bengaluru Management' },
        { num: '06', title: 'Next Steps' }
    ],
    showPreparedFor: true,
    preparedForText: "This quotation has been prepared exclusively for ITW Playworks, in connection with Sonu Nigam's Revolution India Tour 2026–27. All figures and scope items are indicative and open to discussion ahead of final sign-off.",
    classification: 'Strategic Commercial',

    // Page 2: Strategic Outline / Executive Summary
    showExecutiveSummary: true,
    strategySub: 'STRATEGIC OUTLINE',
    strategyTitle: 'Executive Summary',
    executiveParagraphs: [
        "This proposal outlines the multi-city marketing plan NewBi will execute for Sonu Nigam's Revolution India Tour 2026–27 — Three Decades, One Voice — presented by ITW Playworks, across a network of 75 cities nationally, anchored by key markets including Bengaluru, Pune, Surat, Indore, Bhopal, Nagpur, Lucknow, Chandigarh, and Jodhpur. NewBi is an entertainment and youth marketing company that builds online engagement, connecting the artist's wide, multi-generational fan base with student, youth, and music audiences across the tour.",
        "Through a combination of fan community engagement, creator marketing, and campus outreach at national scale, our objective is to build awareness of the tour and support ticket sales across all 75 cities. Bengaluru, as the tour's primary market, will be managed directly by NewBi, with overall coordination and oversight handled from the ground up."
    ],
    showPrimaryObjective: true,
    primaryObjectiveTitle: 'PRIMARY OBJECTIVE',
    primaryObjectiveText: "To build a local fan and audience base, and to manage city-wise promotion for Sonu Nigam's Revolution India Tour, supporting ticket sales across a network of 75 cities.",
    showAnchorMarkets: true,
    anchorMarketsTitle: 'KEY ANCHOR MARKETS',
    anchorMarkets: ['Bengaluru', 'Pune', 'Surat', 'Indore', 'Bhopal', 'Nagpur', 'Lucknow', 'Chandigarh', 'Jodhpur'],
    anchorMarketsCaption: 'These markets anchor the campaign, with promotion extending to a wider network of 75 cities in total.',
    showWhyThisApproach: true,
    whyThisApproachTitle: 'WHY THIS APPROACH',
    whyThisApproachText: "Sonu Nigam's audience spans three generations. Campus and youth audiences respond better to content shared by peers than to direct advertising, while his core audience responds to stories about his career and music. By sharing content through fan pages and creators first, and adding campus outreach at scale across 75 cities, the campaign builds genuine interest that supports ticket sales rather than passive views.",

    // Pages 3 & 4: Process & Execution Blueprint
    showBlueprint: true,
    blueprintSub: "HOW WE'LL EXECUTE",
    blueprintTitle: "Process & Execution Blueprint",
    blueprintSteps: [
        {
            stepNumber: 1,
            title: "Activating Sonu Nigam Fan Pages",
            bullets: [
                "Activate major Sonu Nigam fan pages and fan communities on Instagram, Twitter/X, and Facebook in each tour city, with countdown posts, past performance clips, and audience polls.",
                "Share early content, such as rehearsal clips and setlist previews, through fan pages first, so they become the main source of tour updates and maintain steady, organic reach.",
                "Run a dedicated \"Three Decades, One Voice\" content series covering career milestones and fan memories, to engage the older audience alongside the younger, campus-based audience."
            ]
        },
        {
            stepNumber: 2,
            title: "Promoting Across City Pages, Campuses, and Creators",
            bullets: [
                "City pages: city-specific announcements and locally relevant content, released in stages for each tour stop, along with tour creative assets shared across all pages.",
                "Campus pages: college-specific content using NewBi's existing campus network across all 75 tour cities.",
                "Larger creators: 1–2 well-known influencers engaged per city to lend credibility and reach a wide audience.",
                "Smaller creators: a larger number of smaller creators engaged, mostly on a barter or ticket basis, to build authentic, wide-reaching content across each city.",
                "Regional-language content prepared for Indore, Bhopal, Nagpur, Lucknow, Chandigarh, and Jodhpur, in addition to the standard English-language content."
            ]
        },
        {
            stepNumber: 3,
            title: "Genre-Specific Content by Creators",
            bullets: [
                "Creator content organized by era and genre — Bollywood playback songs, romantic songs, and clips highlighting Sonu Nigam's vocal range, along with \"then and now\" comparisons drawn from his three-decade career.",
                "Content adjusted for each city, using regional song preferences and language, to avoid repeating the same content across markets."
            ]
        },
        {
            stepNumber: 4,
            title: "WhatsApp Outreach in Campuses",
            bullets: [
                "City-wise WhatsApp messages sent through NewBi's campus ambassador network, covering early-bird pricing, group offers, and countdown reminders.",
                "Simple, shareable messages prepared for students to forward to one another.",
                "A separate WhatsApp and alumni network outreach for the wider, older audience in each city, outside the campus network."
            ]
        },
        {
            stepNumber: 5,
            title: "Reporting and Tracking",
            bullets: [
                "Weekly reporting on reach, engagement, and content performance across fan pages, city pages, and creator content in each city.",
                "A shared tracker covering creator deliverables, content status, and city-wise progress, reviewed with ITW Playworks on a regular basis."
            ]
        }
    ],

    // Page 5: Scope Summary / Per-City Deliverables
    showDeliverables: true,
    deliverablesSub: "SCOPE SUMMARY",
    deliverablesTitle: "Per City Deliverables",
    deliverablesTableHeaders: ['#', 'DELIVERABLE', 'QTY / UNIT', 'TIMELINE'],
    deliverablesTable: [
        { id: '01', deliverable: 'Fan-Page Integrations', qty: '3–4', timeline: '—' },
        { id: '02', deliverable: 'City Pages', qty: '20', timeline: '—' },
        { id: '03', deliverable: 'Creators / Influencers (1 Reel + 3 Stories)', qty: '20–30', timeline: '—' },
        { id: '04', deliverable: 'Campus Digital Activities', qty: '8–12 colleges/city', timeline: '—' },
        { id: '05', deliverable: 'WhatsApp & Community Outreach', qty: 'Ongoing', timeline: 'Through tour run' },
        { id: '06', deliverable: 'Weekly Reporting', qty: '1 report/week', timeline: 'Ongoing' }
    ],
    deliverablesTableNote: 'FIGURES ARE INDICATIVE AND MAY CHANGE BASED ON CREATORS ENGAGED AND BUDGET',
    showCityNote: true,
    cityNoteTitle: 'NOTE ON BENGALURU',
    cityNoteText: 'Bengaluru is treated as the primary market for this campaign. NewBi will manage overall execution in Bengaluru directly, in addition to the digital promotion plan applied across all 75 cities.',

    // Page 6: Commercials / Pricing Structure
    showCommercials: true,
    commercialsSub: 'COMMERCIALS',
    commercialsTitle: '04 · Pricing Structure',
    commercialsSubtitle: 'The pricing below covers the full digital promotion plan described in Sections 01 to 03, applied per city across the tour network.',
    pricingTable: [
        {
            id: '01',
            deliverable: 'Digital Promotion Package',
            description: 'Fan-page activation, city pages, creators, and campus outreach',
            qtyPrice: '₹75,000 / city',
            timeline: '—'
        }
    ],
    pricingTableNote: 'PRICING IS INDICATIVE AND SUBJECT TO FINAL SCOPE AND CITY COUNT CONFIRMATION',
    showWhatsIncluded: true,
    whatsIncludedTitle: "WHAT'S INCLUDED",
    whatsIncludedText: "The per-city fee covers fan-page activation, city-page management, creator engagement (both larger and smaller creators), campus digital outreach, WhatsApp distribution, and weekly reporting, as detailed in Sections 01 to 03.",
    showPaymentScaling: true,
    paymentScalingTitle: 'PAYMENT & SCALING',
    paymentScalingText: "The total cost scales directly with the number of cities confirmed for the tour. A detailed payment schedule and city-wise breakdown will be shared once the final list of cities and tour dates is confirmed with ITW Playworks.",

    // Page 7: City Deep-Dive / Bengaluru Management
    showDeepDive: true,
    deepDiveSub: 'CITY DEEP-DIVE · BENGALURU',
    deepDiveTitle: '05 · Bengaluru Management',
    deepDiveIntro: 'Bengaluru is the tour\'s primary market. NewBi will manage overall execution in Bengaluru directly, in addition to the digital promotion plan applied across the wider city network.',
    deepDiveSubsections: [
        {
            badge: '5.1',
            title: 'Direct Management',
            bullets: [
                'NewBi will take direct ownership of the Bengaluru campaign, coordinating fan-page activation, creator engagement, and campus outreach for the city.',
                'A single point of contact from NewBi will be assigned to ITW Playworks for all Bengaluru-related coordination and updates.'
            ]
        },
        {
            badge: '5.2',
            title: 'Campus Network',
            bullets: [
                'Outreach across 8–12 partner colleges in Bengaluru, using NewBi\'s existing campus relationships and fan-page network.',
                'Campus ambassadors assigned to manage WhatsApp distribution, society outreach, and local announcements.'
            ]
        },
        {
            badge: '5.3',
            title: 'Reporting',
            bullets: [
                'Weekly updates shared with ITW Playworks on Bengaluru-specific reach, engagement, and campus progress, in addition to the standard national reporting.'
            ]
        }
    ],

    // Page 8: Closing & Next Steps
    showClosing: true,
    closingSub: 'CLOSING',
    closingTitle: '06 · Next Steps',
    closingText: "We'd welcome the opportunity to walk ITW Playworks through this plan in detail and confirm city scope, creator mix, and budget against the final tour schedule and city list.",
    preparedBy: 'NewBi Entertainment & Marketing LLP',
    showSignatures: false,
    showSeal: false,
    ourSignature: null,
    clientSignature: null,
    approvalMetadata: null,

    // Legacy fields mapped for safety
    hiddenFields: [],
    customPages: [],
    attachments: [],
    items: []
};

/**
 * Normalizes any proposal object into v2 shape while preserving backwards compatibility.
 */
export function normalizeProposalData(raw = {}) {
    const isV2 = raw.templateVersion === 'v2' || Boolean(raw.whatsInside || raw.blueprintSteps || raw.deliverablesTable);
    if (!isV2) return raw;

    return {
        ...DEFAULT_V2_PROPOSAL_DATA,
        ...raw,
        showSignatures: Boolean(raw.showSignatures),
        templateVersion: 'v2',
        whatsInside: raw.whatsInside || DEFAULT_V2_PROPOSAL_DATA.whatsInside,
        executiveParagraphs: raw.executiveParagraphs || (raw.overview ? [raw.overview] : DEFAULT_V2_PROPOSAL_DATA.executiveParagraphs),
        anchorMarkets: raw.anchorMarkets || DEFAULT_V2_PROPOSAL_DATA.anchorMarkets,
        blueprintSteps: raw.blueprintSteps || DEFAULT_V2_PROPOSAL_DATA.blueprintSteps,
        deliverablesTable: raw.deliverablesTable || raw.deliverables || DEFAULT_V2_PROPOSAL_DATA.deliverablesTable,
        pricingTable: raw.pricingTable || DEFAULT_V2_PROPOSAL_DATA.pricingTable,
        deepDiveSubsections: raw.deepDiveSubsections || DEFAULT_V2_PROPOSAL_DATA.deepDiveSubsections
    };
}

/**
 * Calculates page breakdown for the v2 proposal design.
 */
export function getV2PaginatedPages(formData = {}) {
    const data = normalizeProposalData(formData);
    const pages = [];

    // Page 1: Official Strategic Quotation Cover
    if (data.showCover !== false) {
        pages.push({ type: 'v2-cover', title: 'Official Strategic Quotation' });
    }

    // Page 2: Strategic Outline / Executive Summary
    if (data.showExecutiveSummary !== false) {
        pages.push({ type: 'v2-executive', title: data.strategyTitle || 'Executive Summary' });
    }

    // Pages 3 & 4: Process & Execution Blueprint
    if (data.showBlueprint !== false && Array.isArray(data.blueprintSteps) && data.blueprintSteps.length > 0) {
        const stepPage1 = data.blueprintSteps.slice(0, 3);
        pages.push({
            type: 'v2-blueprint-1',
            title: data.blueprintTitle || 'Process & Execution Blueprint',
            steps: stepPage1
        });

        if (data.blueprintSteps.length > 3) {
            const stepPage2 = data.blueprintSteps.slice(3);
            pages.push({
                type: 'v2-blueprint-2',
                title: `${data.blueprintTitle || 'Process & Execution Blueprint'} (Continued)`,
                steps: stepPage2
            });
        }
    }

    // Page 5: Scope Summary / Per City Deliverables
    if (data.showDeliverables !== false) {
        pages.push({ type: 'v2-deliverables', title: data.deliverablesTitle || 'Per City Deliverables' });
    }

    // Page 6: Commercials / Pricing Structure
    if (data.showCommercials !== false) {
        pages.push({ type: 'v2-commercials', title: data.commercialsTitle || '04 · Pricing Structure' });
    }

    // Page 7: City Deep-Dive / Bengaluru Management
    if (data.showDeepDive !== false && Array.isArray(data.deepDiveSubsections) && data.deepDiveSubsections.length > 0) {
        pages.push({ type: 'v2-deepdive', title: data.deepDiveTitle || '05 · Bengaluru Management' });
    }

    // Page 8: Closing & Next Steps
    if (data.showClosing !== false) {
        pages.push({ type: 'v2-closing', title: data.closingTitle || '06 · Next Steps' });
    }

    // Custom Pages (if added)
    if (Array.isArray(data.customPages) && data.customPages.length > 0) {
        data.customPages.forEach((cp, idx) => {
            pages.push({
                type: 'v2-custom',
                title: cp.title || `Custom Section ${idx + 1}`,
                subtitle: cp.subtitle || '',
                content: cp.content || '',
                pageIndex: idx
            });
        });
    }

    return pages;
}
