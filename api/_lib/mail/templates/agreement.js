/** data: { company (entertainment|media|marketing), subject, headerText, messageBody, agreementNumber, secondPartyName, projectName, effectiveDate, agreementUrl } */
export default (data = {}) => ({
    sender: 'legal',
    kind: 'transactional',
    subject: data.subject || `Agreement${data.agreementNumber ? ` ${data.agreementNumber}` : ''} ready for review`,
    preheader: [data.agreementNumber, data.projectName].filter(Boolean).join(' · ') || 'Your agreement is ready to review and sign.',
    eyebrow: 'Agreement',
    title: data.headerText || 'Your agreement is ready',
    blocks: [
        { html: data.messageBody },
        { document: { kind: 'AGREEMENT', name: `${data.projectName || 'Agreement'}${data.agreementNumber ? ` · ${data.agreementNumber}` : ''}.pdf`, meta: [data.secondPartyName ? `With ${data.secondPartyName}` : '', data.effectiveDate ? `Effective ${data.effectiveDate}` : ''], url: data.agreementUrl, label: 'Open agreement' } },
    ],
    cta: data.agreementUrl ? { label: 'Review and sign', url: data.agreementUrl } : null,
    reason: 'Sent by newbi.live.',
});
