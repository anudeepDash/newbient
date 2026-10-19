/** data: { company (entertainment|media|marketing), subject, headerText, messageBody, proposalNumber, clientName, projectName, proposalUrl } */
export default (data = {}) => ({
    sender: 'partnerships',
    kind: 'transactional',
    subject: data.subject || `Proposal${data.projectName ? `: ${data.projectName}` : ''} from Newbi`,
    preheader: [data.proposalNumber, data.projectName].filter(Boolean).join(' · ') || 'Your proposal is ready to review.',
    eyebrow: 'Proposal',
    title: data.headerText || 'Your proposal is ready',
    blocks: [
        { html: data.messageBody },
        { document: { kind: 'PROPOSAL', name: `${data.projectName || 'Proposal'}${data.proposalNumber ? ` · ${data.proposalNumber}` : ''}.pdf`, meta: [data.clientName ? `For ${data.clientName}` : '', 'Proposal'], url: data.proposalUrl, label: 'Open proposal' } },
    ],
    cta: data.proposalUrl ? { label: 'Review proposal', url: data.proposalUrl } : null,
    reason: 'Sent by newbi.live.',
});
