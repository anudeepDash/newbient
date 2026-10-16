/** data: { subject, headerText, messageBody, proposalNumber, clientName, projectName, proposalUrl } */
export default (data = {}) => ({
    sender: 'partnerships',
    kind: 'transactional',
    subject: data.subject || `Proposal${data.projectName ? `: ${data.projectName}` : ''} from Newbi`,
    preheader: [data.proposalNumber, data.projectName].filter(Boolean).join(' · ') || 'Your proposal is ready to review.',
    eyebrow: 'Proposal',
    title: data.headerText || 'Your proposal is ready',
    blocks: [
        { html: data.messageBody },
        { details: [['Proposal', data.proposalNumber], ['Prepared for', data.clientName], ['Project', data.projectName]] },
    ],
    cta: data.proposalUrl ? { label: 'Review proposal', url: data.proposalUrl } : null,
    reason: 'Sent by Newbi Entertainment & Marketing LLP.',
});
