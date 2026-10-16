import { render } from '../../api/_lib/mail/templates/index.js';
import { getPublicSiteUrl } from './siteUrl';

/*
 * The server's email templates, for live previews in the admin. Sending
 * always happens on the server (lib/mailApi.js), which renders the same
 * template again from the data, so what you preview is what goes out.
 */
export const renderEmailTemplate = (template, data = {}) => render(template, data, { origin: getPublicSiteUrl() });

export const previewEmailHtml = (template, data = {}) => {
    try {
        return renderEmailTemplate(template, data).html;
    } catch (err) {
        console.warn('Email preview failed:', err);
        return '';
    }
};
