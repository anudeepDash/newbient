import React from 'react';
import ProposalDocumentRenderer from '../../../ui/ProposalDocumentRenderer';
import { normalizeProposalData } from '../../../../lib/proposalTemplateV2';
import LegacyProposalPage from './LegacyProposalPage';
import { renderContent } from './content';
import { isV2Proposal, logoFor } from './model';

/** One A4 page of the proposal, in whichever format the proposal uses. */
const ProposalPaper = ({ page, idx, totalPages, formData, totals, exporting = false }) => {
    const logo = logoFor(formData.selectedLogo);
    if (!page) return null;
    if (isV2Proposal(formData)) {
        const isHidden = (f) => (formData.hiddenFields || []).includes(f);
        return (
            <ProposalDocumentRenderer
                page={page}
                pageIdx={idx}
                totalPages={totalPages}
                formData={normalizeProposalData(formData)}
                currentLogo={logo}
                isHidden={isHidden}
                renderContent={renderContent}
                isExporting={exporting}
            />
        );
    }
    return <LegacyProposalPage page={page} idx={idx} totalPages={totalPages} formData={formData} currentLogo={logo} totals={totals} />;
};

export default ProposalPaper;
