import React, { useCallback, useMemo } from 'react';
import EmailComposer from './EmailComposer';
import { proposalEmail, proposalValidUntil, proposalValue } from '../../lib/proposals';

/** Email a proposal link. Each recipient gets their own tracked link. */
const ProposalEmailModal = ({ isOpen, onClose, proposal, onSend }) => {
    const initial = useMemo(() => proposal && ({
        to: proposal.clientEmail || '',
        ...proposalEmail(proposal),
        theme: 'light',
    }), [proposal]);

    const buildData = useCallback(({ headerText, messageBody, recipient }) => {
        const query = new URLSearchParams({ via: 'email', email: recipient || '', name: proposal?.clientName || '' }).toString();
        return {
            headerText,
            messageBody,
            proposalNumber: proposal?.proposalNumber || '',
            clientName: proposal?.clientName || '',
            projectName: proposal?.campaignName || '',
            validUntil: proposalValidUntil(proposal, 'short'),
            amount: proposalValue(proposal) ? proposalValue(proposal).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '',
            proposalUrl: `${window.location.origin}/proposal/${proposal?.id}?${query}`,
            company: proposal?.selectedLogo || 'entertainment',
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
