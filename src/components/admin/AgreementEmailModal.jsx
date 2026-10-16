import React, { useCallback, useMemo } from 'react';
import { generateAgreementEmailHTML } from '../../lib/email';
import EmailComposer from './EmailComposer';

/** Email a contract's signing link. Each recipient gets their own tracked link. */
const AgreementEmailModal = ({ isOpen, onClose, agreement, onSend }) => {
    const party = agreement?.parties?.secondParty?.name || 'there';
    const project = agreement?.details?.projectName || 'the project';

    const initial = useMemo(() => agreement && ({
        to: agreement.parties?.secondParty?.email || '',
        subject: `Contract for review: ${agreement.agreementNumber || project}`,
        headerText: 'Your contract is ready to sign',
        messageBody: `<p>Hi <strong>${party}</strong>,</p>
<p>The contract for <strong>${project}</strong> (ref <strong>${agreement.agreementNumber || ''}</strong>) is ready for you.</p>
<p>You can read it and sign online using the button below.</p>
<p>Best regards,<br/>Newbi Entertainment</p>`,
        theme: 'light',
    }), [agreement, party, project]);

    const buildHtml = useCallback(({ headerText, messageBody, theme, recipient, preview }) => {
        const query = new URLSearchParams({ via: 'email', email: recipient || '', name: agreement?.parties?.secondParty?.name || '' }).toString();
        return generateAgreementEmailHTML({
            headerText,
            messageBody,
            agreementNumber: agreement?.agreementNumber || 'AGR-0000',
            secondPartyName: agreement?.parties?.secondParty?.name || 'Client',
            projectName: agreement?.details?.projectName || '',
            effectiveDate: agreement?.effectiveDate ? new Date(agreement.effectiveDate).toLocaleDateString('en-GB') : '',
            agreementUrl: `${window.location.origin}/agreement/${agreement?.id}?${query}`,
            theme,
            ...(preview ? { isPreview: true } : {}),
        });
    }, [agreement]);

    return (
        <EmailComposer
            open={isOpen && Boolean(agreement)}
            onClose={onClose}
            title="Email contract"
            subtitle={[agreement?.agreementNumber, agreement?.parties?.secondParty?.name].filter(Boolean).join(' · ')}
            initial={initial}
            resetKey={agreement?.id}
            buildHtml={buildHtml}
            perRecipient
            onSend={onSend}
            successText="Contract sent to"
        />
    );
};

export default AgreementEmailModal;
