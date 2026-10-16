import React, { useCallback, useMemo } from 'react';
import EmailComposer from './EmailComposer';

/** Email a proposal link. Each recipient gets their own tracked link. */
const ProposalEmailModal = ({ isOpen, onClose, proposal, onSend }) => {
    const title = proposal?.campaignName || proposal?.proposalTitle || 'Proposal';

    const initial = useMemo(() => proposal && ({
        to: proposal.clientEmail || '',
        subject: `Proposal: ${title}`,
        headerText: 'Your proposal is ready',
        messageBody: `<p>Hi${proposal.clientName ? ` <strong>${proposal.clientName}</strong>` : ''},</p>
<p>Here's our proposal for <strong>${title}</strong>.</p>
<p>You can read it, and accept it online, using the button below.</p>
<p>Best regards,<br/>Newbi Entertainment</p>`,
        theme: 'light',
    }), [proposal, title]);

    const buildData = useCallback(({ headerText, messageBody, recipient }) => {
        const query = new URLSearchParams({ via: 'email', email: recipient || '', name: proposal?.clientName || '' }).toString();
        return {
            headerText,
            messageBody,
            proposalNumber: proposal?.proposalNumber || '',
            clientName: proposal?.clientName || '',
            projectName: proposal?.campaignName || '',
            proposalUrl: `${window.location.origin}/proposal/${proposal?.id}?${query}`,
        };
    }, [proposal]);

    return (
        <EmailComposer
            open={isOpen && Boolean(proposal)}
            onClose={onClose}
            title="Email proposal"
            subtitle={[proposal?.proposalNumber, proposal?.clientName].filter(Boolean).join(' · ')}
            initial={initial}
            resetKey={proposal?.id}
            template="proposal"
            buildData={buildData}
            perRecipient
            onSend={onSend}
            successText="Proposal sent to"
        />
    );
};

export default ProposalEmailModal;
