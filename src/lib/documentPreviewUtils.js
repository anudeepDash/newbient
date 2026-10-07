/**
 * Utilities for extracting document preview images, Cloudinary PDF thumbnail rendering,
 * and generating rich metadata for social link sharing and link unfurling.
 */

export const getPdfPreviewImageUrl = (fileUrl, options = {}) => {
    if (!fileUrl || typeof fileUrl !== 'string') return null;

    const { width = 1200, height = 630 } = options;

    // Direct image check
    if (fileUrl.match(/\.(jpg|jpeg|png|webp)($|\?)/i)) {
        return fileUrl;
    }

    // Cloudinary PDF transformation
    // Cloudinary can render any page of a PDF as a high-quality image on the fly!
    if (fileUrl.includes('cloudinary.com') && (fileUrl.toLowerCase().includes('.pdf') || fileUrl.includes('/raw/upload/'))) {
        try {
            let transformed = fileUrl;
            // Switch /raw/upload/ to /image/upload/ if needed for PDF rendering
            if (transformed.includes('/raw/upload/')) {
                transformed = transformed.replace('/raw/upload/', '/image/upload/');
            }
            // Add Cloudinary transformation flags: width, height, fit, page 1, format jpg, auto quality
            const transformFlag = `w_${width},h_${height},c_fit,pg_1,f_jpg,q_auto`;
            transformed = transformed.replace(/\/upload\/(?:v\d+\/)?/i, (match) => {
                if (match.includes('/v')) {
                    return match.replace('/upload/', `/upload/${transformFlag}/`);
                }
                return `/upload/${transformFlag}/`;
            });
            // Replace .pdf extension with .jpg
            transformed = transformed.replace(/\.pdf($|\?)/i, '.jpg$1');
            return transformed;
        } catch (e) {
            console.warn("Failed to transform Cloudinary PDF URL:", e);
        }
    }

    return null;
};

export const getDocumentShareMeta = (documentData = {}, type = 'proposal') => {
    const docNumber = documentData.proposalNumber || documentData.invoiceNumber || documentData.agreementNumber || documentData.id || 'NB-DOC';
    const clientName = documentData.clientName || documentData.parties?.secondParty?.name || 'Valued Partner';
    const campaignName = documentData.campaignName || documentData.proposalName || documentData.title || '';
    const rawAmount = documentData.dealValue || documentData.totalOverride || documentData.amount || documentData.total || documentData.commercials?.totalValue || documentData.subtotal;
    const formattedAmount = rawAmount ? `₹${Number(rawAmount).toLocaleString('en-IN')}` : null;
    const fileUrl = documentData.fileUrl || documentData.pdfUrl;

    const previewImage = getPdfPreviewImageUrl(fileUrl) || documentData.thumbnail || documentData.coverImage || 'https://www.newbi.live/og-image.png';

    if (type === 'invoice') {
        const title = `Tax Invoice ${docNumber} · ${clientName}`;
        const description = `Tax Invoice ${docNumber} issued to ${clientName}${formattedAmount ? ` for ${formattedAmount}` : ''}. Issued by Newbi Entertainment & Marketing LLP.`;
        const shareMessage = `🧾 *Tax Invoice ${docNumber}*\n` +
            `*Client:* ${clientName}\n` +
            (formattedAmount ? `*Amount:* ${formattedAmount}\n` : '') +
            `*Status:* ${documentData.status || 'Issued'}\n\n` +
            `📄 View & download official invoice:`;

        return {
            title,
            description,
            previewImage,
            docNumber,
            clientName,
            formattedAmount,
            badge: 'TAX INVOICE',
            shareMessage,
            emailSubject: `Tax Invoice ${docNumber} - ${clientName}`,
            emailBody: `Dear ${clientName},\n\nPlease find your tax invoice (${docNumber})${formattedAmount ? ` for ${formattedAmount}` : ''} ready for review and download.\n\nYou can access the document directly at:\n`
        };
    }

    if (type === 'agreement') {
        const firstParty = documentData.parties?.firstParty?.name || documentData.senderName || 'Newbi Entertainment & Marketing LLP';
        const title = `Service Agreement ${docNumber} · ${clientName}`;
        const description = `Official Service Agreement between ${firstParty} and ${clientName}. Review and sign online.`;
        const shareMessage = `📜 *Service Agreement ${docNumber}*\n` +
            `*Parties:* ${firstParty} & ${clientName}\n` +
            `*Status:* ${documentData.status || 'Active'}\n\n` +
            `📄 View & execute agreement online:`;

        return {
            title,
            description,
            previewImage,
            docNumber,
            clientName,
            formattedAmount,
            badge: 'SERVICE AGREEMENT',
            shareMessage,
            emailSubject: `Service Agreement ${docNumber} - ${clientName}`,
            emailBody: `Dear ${clientName},\n\nPlease find your service agreement (${docNumber}) ready for your review and digital sign-off.\n\nYou can access the agreement directly at:\n`
        };
    }

    // Default: Proposal
    const title = `Strategic Proposal · ${clientName} (${docNumber})`;
    const description = `Official Strategic Proposal prepared for ${clientName}${campaignName ? ` · ${campaignName}` : ''}${formattedAmount ? ` · Commercial Value: ${formattedAmount}` : ''}. Review and authorize online.`;
    const shareMessage = `📋 *Strategic Proposal · ${clientName}*\n` +
        `*Quote Ref:* ${docNumber}\n` +
        (campaignName ? `*Project:* ${campaignName}\n` : '') +
        (formattedAmount ? `*Commercial Value:* ${formattedAmount}\n` : '') +
        `*Status:* ${documentData.status || 'Official Quotation'}\n\n` +
        `📄 View Strategic Memorandum & authorize online:`;

    return {
        title,
        description,
        previewImage,
        docNumber,
        clientName,
        campaignName,
        formattedAmount,
        badge: 'STRATEGIC PROPOSAL',
        shareMessage,
        emailSubject: `Strategic Proposal: ${clientName} (${docNumber})`,
        emailBody: `Dear ${clientName},\n\nPlease find our Strategic Memorandum and Quotation (${docNumber})${campaignName ? ` for ${campaignName}` : ''}${formattedAmount ? ` with commercial value ${formattedAmount}` : ''} prepared for your review.\n\nYou can inspect and digitally authorize the proposal here:\n`
    };
};
