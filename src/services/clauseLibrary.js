// Standard clause library for Contract Vault
// Each clause has 3 strictness levels: low, medium, high

export const CLAUSE_LIBRARY = [
    {
        id: 'exclusivity',
        title: 'Exclusivity',
        category: 'protection',
        tags: ['artist', 'event', 'influencer'],
        levels: {
            low: 'During the Term, the Second Party agrees to give reasonable priority to the obligations under this Agreement but shall not be restricted from engaging with other parties for similar services, provided such engagements do not directly conflict with the deliverables herein.',
            medium: 'During the Term of this Agreement, the Second Party shall not engage in any activities or accept any engagements that directly compete with or are substantially similar to the services described herein, within the same geographic territory and market segment, without prior written consent from the First Party.',
            high: 'During the Term and for a period of six (6) months thereafter, the Second Party shall maintain absolute exclusivity with respect to the services described herein. The Second Party shall not, directly or indirectly, provide similar services to any third party, participate in competing events, or engage in any activity that could reasonably be considered competitive to the interests of the First Party. Any breach of this exclusivity clause shall entitle the First Party to immediate termination and recovery of all payments made, in addition to liquidated damages equal to 200% of the total contract value.'
        }
    },
    {
        id: 'confidentiality',
        title: 'Confidentiality',
        category: 'protection',
        tags: ['all'],
        levels: {
            low: 'Both Parties agree to treat as confidential any proprietary information shared during the course of this engagement. This obligation shall survive for a period of one (1) year after termination.',
            medium: 'Each Party agrees to hold in strict confidence all Confidential Information received from the other Party. "Confidential Information" includes but is not limited to business plans, financial data, client lists, pricing, technical specifications, and any information marked as confidential. This obligation shall survive for two (2) years following termination. Disclosure to employees or contractors is permitted solely on a need-to-know basis under equivalent confidentiality obligations.',
            high: 'Each Party agrees to hold in absolute confidence all Confidential Information of the other Party and shall not disclose, publish, or otherwise disseminate such information to any third party without prior written consent. Confidential Information encompasses all information, whether written, oral, electronic, or visual, including but not limited to trade secrets, proprietary data, financial records, strategic plans, client information, and any information that a reasonable person would consider confidential. The receiving Party shall implement security measures no less stringent than those used to protect its own confidential information. This obligation survives in perpetuity. Breach shall entitle the disclosing Party to injunctive relief and damages including consequential losses.'
        }
    },
    {
        id: 'ip_rights',
        title: 'Intellectual Property Rights',
        category: 'protection',
        tags: ['creative', 'influencer', 'media'],
        levels: {
            low: 'Each Party retains ownership of its pre-existing intellectual property. Any IP created jointly shall be co-owned with equal rights to use and license.',
            medium: 'All intellectual property created specifically for or arising out of this Agreement shall vest in the First Party upon full payment. The Second Party retains rights to their pre-existing IP and grants the First Party a non-exclusive, royalty-free license to use such pre-existing IP solely in connection with the deliverables. The Second Party warrants that the deliverables do not infringe any third-party IP rights.',
            high: 'All intellectual property, including but not limited to copyrights, trademarks, patents, trade secrets, designs, creative works, content, recordings, and any derivative works created in connection with this Agreement shall be the sole and exclusive property of the First Party, constituting works made for hire. The Second Party hereby irrevocably assigns all rights, title, and interest in such IP to the First Party worldwide, in perpetuity, across all media now known or hereafter devised. The Second Party waives all moral rights. The Second Party shall execute any documents necessary to perfect such assignment.'
        }
    },
    {
        id: 'non_compete',
        title: 'Non-Compete',
        category: 'protection',
        tags: ['artist', 'influencer', 'service'],
        levels: {
            low: 'The Second Party agrees not to engage with direct competitors of the First Party for competing projects during the active Term of this Agreement.',
            medium: 'During the Term and for three (3) months following termination, the Second Party shall not directly or indirectly engage in any business, service, or project that competes with the First Party within the agreed territory. This restriction is limited to the specific industry segment covered by this Agreement.',
            high: 'During the Term and for twelve (12) months following termination or expiry, the Second Party shall not, within the territory of India, directly or indirectly: (a) engage in any business competing with the First Party; (b) solicit any clients, customers, or partners of the First Party; (c) employ or solicit any employees or contractors of the First Party; or (d) participate in any venture that could reasonably be deemed competitive. The Parties acknowledge this restriction is reasonable and necessary to protect legitimate business interests.'
        }
    },
    {
        id: 'force_majeure',
        title: 'Force Majeure',
        category: 'compliance',
        tags: ['event', 'all'],
        levels: {
            low: 'Neither Party shall be liable for delays or failures caused by circumstances beyond their reasonable control, including natural disasters, government actions, or pandemics. The affected Party shall notify the other promptly.',
            medium: 'Neither Party shall be liable for any failure or delay in performing its obligations where such failure or delay results from Force Majeure Events including but not limited to: acts of God, natural disasters, epidemics, pandemics, war, terrorism, civil unrest, government regulations, strikes, or infrastructure failures. The affected Party must provide written notice within 48 hours and use commercially reasonable efforts to mitigate the impact. If the Force Majeure Event continues for more than 30 days, either Party may terminate this Agreement without penalty.',
            high: 'Neither Party shall be liable for non-performance caused by Force Majeure Events, defined as events beyond reasonable control including: natural disasters, epidemics, pandemics, war, terrorism, civil unrest, sanctions, embargoes, government orders, strikes, lockouts, utility failures, cyberattacks, or any event that a reasonable person could not have foreseen or prevented. The affected Party must: (a) notify the other Party in writing within 24 hours; (b) provide evidence of the Force Majeure Event; (c) take all reasonable steps to mitigate impact; and (d) resume performance as soon as practicable. If the event persists beyond 15 days, either Party may terminate without liability, provided all payments for work completed shall be settled within 7 business days.'
        }
    },
    {
        id: 'penalties',
        title: 'Penalties & Liquidated Damages',
        category: 'financial',
        tags: ['event', 'artist', 'service'],
        levels: {
            low: 'In the event of non-performance or material breach, the defaulting Party shall be liable for actual direct damages incurred by the non-defaulting Party.',
            medium: 'In the event of material breach, the defaulting Party shall pay liquidated damages equal to 100% of the total contract value. For delays in performance, a penalty of 1% of the contract value per day of delay shall apply, capped at 15% of the total value. The Parties agree these amounts represent a genuine pre-estimate of loss.',
            high: 'In the event of material breach by the Second Party, including but not limited to cancellation, no-show, non-performance, or failure to meet agreed specifications, the Second Party shall pay liquidated damages equal to 200% of the total contract value plus all consequential losses including but not limited to: venue costs, marketing expenditure, third-party commitments, reputational damage, and loss of revenue. For the First Party breach, liability shall be limited to refund of amounts received. Time penalties of 2% per day of delay shall apply without cap. These amounts are agreed as a genuine pre-estimate of loss and not as a penalty.'
        }
    },
    {
        id: 'performance_metrics',
        title: 'Performance Metrics',
        category: 'standard',
        tags: ['service', 'influencer', 'campaign'],
        levels: {
            low: 'The Second Party shall perform services to a professional standard consistent with industry norms. Performance shall be reviewed mutually at project milestones.',
            medium: 'The Second Party shall meet the performance metrics specified in Schedule A. Failure to meet key performance indicators (KPIs) within 10% variance shall trigger a review meeting. Persistent underperformance (3 consecutive measurement periods) shall constitute grounds for termination. The First Party shall have the right to request monthly performance reports.',
            high: 'The Second Party shall meet or exceed all performance metrics, KPIs, and service levels specified in Schedule A. Performance shall be measured weekly and reported within 2 business days. Any failure to meet targets shall trigger an automatic escalation process. Persistent underperformance (2 or more measurement periods below 90% of target) shall constitute material breach entitling the First Party to terminate and claim damages. The First Party shall have real-time access to all performance data and analytics.'
        }
    },
    {
        id: 'termination',
        title: 'Termination',
        category: 'standard',
        tags: ['all'],
        levels: {
            low: 'Either Party may terminate this Agreement by providing 30 days written notice. Upon termination, all outstanding payments for work completed shall be settled within 15 business days.',
            medium: 'This Agreement may be terminated: (a) by mutual written consent; (b) by either Party with 15 days prior written notice; (c) immediately upon material breach if not cured within 7 days of written notice; (d) immediately if either Party becomes insolvent or enters bankruptcy proceedings. Upon termination, the Second Party shall deliver all work product, and the First Party shall pay for all work completed to date.',
            high: 'This Agreement may be terminated: (a) by the First Party at any time with 7 days written notice and payment for work completed; (b) by the Second Party with 30 days written notice, subject to completion of all in-progress obligations; (c) immediately by either Party upon material breach; (d) immediately upon insolvency, bankruptcy, or criminal proceedings against either Party. Upon termination: all IP reverts to the First Party; all confidential information must be returned or destroyed within 48 hours; survival clauses (Confidentiality, IP, Non-compete, Indemnification) remain in full force. Wrongful termination by the Second Party shall trigger the Penalties clause.'
        }
    },
    {
        id: 'liability',
        title: 'Limitation of Liability',
        category: 'protection',
        tags: ['all'],
        levels: {
            low: 'Neither Party shall be liable for indirect, incidental, or consequential damages. Total liability under this Agreement shall not exceed the total contract value.',
            medium: 'The First Party\'s total aggregate liability shall not exceed the total fees paid or payable under this Agreement. Neither Party shall be liable for indirect, special, incidental, or consequential damages including loss of profits, data, or business opportunities. These limitations shall not apply to breaches of confidentiality, IP infringement, or gross negligence.',
            high: 'The First Party\'s maximum aggregate liability shall be limited to 50% of the total contract value. The Second Party\'s liability shall be unlimited for: breach of confidentiality, IP infringement, willful misconduct, fraud, and breaches of exclusivity. Neither Party shall be liable for indirect or consequential damages except where arising from willful misconduct or gross negligence. The Second Party shall maintain professional indemnity insurance of no less than the contract value throughout the Term.'
        }
    },
    {
        id: 'indemnification',
        title: 'Indemnification',
        category: 'protection',
        tags: ['all'],
        levels: {
            low: 'Each Party agrees to indemnify and hold harmless the other Party from claims arising from their own negligence or willful misconduct in connection with this Agreement.',
            medium: 'The Second Party shall indemnify, defend, and hold harmless the First Party, its directors, officers, employees, and agents from any claims, damages, losses, costs, and expenses (including reasonable legal fees) arising from: (a) breach of this Agreement; (b) negligence or misconduct of the Second Party; (c) infringement of third-party rights; or (d) violation of applicable laws. The First Party shall provide prompt notice of any claim and cooperate in the defense.',
            high: 'The Second Party shall unconditionally indemnify, defend, and hold harmless the First Party, its affiliates, directors, officers, employees, agents, and successors from and against any and all claims, demands, actions, damages, losses, costs, liabilities, and expenses (including but not limited to reasonable attorneys\' fees, court costs, and settlement amounts) arising directly or indirectly from: (a) any breach of this Agreement; (b) any negligent, fraudulent, or wrongful act or omission; (c) infringement of any IP or proprietary rights; (d) violation of any applicable law or regulation; (e) any claim by a third party related to the Second Party\'s performance; or (f) any tax liability arising from the Second Party\'s obligations. This indemnification survives termination.'
        }
    },
    {
        id: 'dispute_resolution',
        title: 'Dispute Resolution',
        category: 'compliance',
        tags: ['all'],
        levels: {
            low: 'Any dispute arising from this Agreement shall first be resolved through good faith negotiation. If unresolved within 30 days, the dispute shall be submitted to the courts of Bangalore, India.',
            medium: 'Any dispute shall be resolved through the following escalation: (a) Good faith negotiation between designated representatives within 15 days; (b) Mediation by a mutually agreed mediator within 30 days; (c) If unresolved, binding arbitration under the Arbitration and Conciliation Act, 1996, conducted by a sole arbitrator in Bangalore, India. The arbitration shall be conducted in English, and the decision shall be final and binding. Costs shall be borne by the unsuccessful party.',
            high: 'Any dispute shall be resolved exclusively through binding arbitration under the Arbitration and Conciliation Act, 1996 (as amended). A panel of three arbitrators shall be appointed — one by each Party and the third (presiding) by mutual agreement or by the High Court of Karnataka. The seat of arbitration shall be Bangalore. The language shall be English. The arbitration shall be confidential. The arbitral award shall be final, binding, and enforceable in any court of competent jurisdiction. Pending arbitration, the First Party may seek interim injunctive relief from competent courts. Each Party shall bear its own costs unless the tribunal orders otherwise.'
        }
    },
    {
        id: 'governing_law',
        title: 'Governing Law',
        category: 'compliance',
        tags: ['all'],
        levels: {
            low: 'This Agreement shall be governed by and construed in accordance with the laws of India.',
            medium: 'This Agreement shall be governed by and construed in accordance with the laws of India, without regard to its conflict of laws principles. The courts of Bangalore, Karnataka shall have exclusive jurisdiction over any matters not subject to arbitration.',
            high: 'This Agreement shall be governed exclusively by the laws of India, including but not limited to the Indian Contract Act, 1872, the Information Technology Act, 2000, and all applicable regulations. The courts of Bangalore, Karnataka shall have exclusive jurisdiction. The Parties irrevocably submit to such jurisdiction and waive any objection on grounds of venue or forum non conveniens. Nothing in this Agreement shall be construed contrary to mandatory provisions of Indian law.'
        }
    }
];

export const TEMPLATE_TYPES = [
    'Artist Agreement', 'Service Agreement', 'Event Agreement', 'Influencer Agreement',
    'Vendor Agreement', 'MOU', 'NDA', 'Revenue Share Agreement', 'Sponsorship Agreement',
    'Licensing Agreement', 'Employment Agreement', 'Freelancer Agreement'
];

export const getClausesByTag = (tag) => CLAUSE_LIBRARY.filter(c => c.tags.includes(tag) || c.tags.includes('all'));

export const getDefaultStrictness = (riskLevel) => {
    if (riskLevel === 'High' || riskLevel === 'Critical') return 'high';
    if (riskLevel === 'Medium') return 'medium';
    return 'low';
};
