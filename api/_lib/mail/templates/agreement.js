/** data: { subject, headerText, messageBody, agreementNumber, secondPartyName, projectName, effectiveDate, agreementUrl } */
export default (data = {}) => ({
    sender: 'legal',
    kind: 'transactional',
    subject: data.subject || `Agreement${data.agreementNumber ? ` ${data.agreementNumber}` : ''} ready for review`,
    preheader: [data.agreementNumber, data.projectName].filter(Boolean).join(' · ') || 'Your agreement is ready to review and sign.',
    eyebrow: 'Agreement',
    title: data.headerText || 'Your agreement is ready',
    blocks: [
        { html: data.messageBody },
        { details: [['Agreement', data.agreementNumber], ['Party', data.secondPartyName], ['Project', data.projectName], ['Effective', data.effectiveDate]] },
    ],
    cta: data.agreementUrl ? { label: 'Review and sign', url: data.agreementUrl } : null,
    reason: 'Sent by Newbi Entertainment & Marketing LLP.',
});
