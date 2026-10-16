import React, { useMemo } from 'react';
import EmailPreview from './mailing/EmailPreview';
import { buildOfficialHtml } from './mailing/mailingApi';

/**
 * Live preview of an official Newbi email.
 * data = { subject?, preheader?, headerText, messageBody, heroImage?, ctaText?, ctaUrl?, category?, theme? }
 * Renders the real email HTML from lib/email.js in a desktop / phone frame.
 */
const MailPreview = ({ data = {}, onThemeChange }) => {
    const html = useMemo(() => buildOfficialHtml({ category: 'OFFICIAL', ...data }, { preview: true }), [data]);
    return (
        <EmailPreview
            html={html}
            subject={data.subject}
            preheader={data.preheader}
            fromName={data.fromName}
            theme={data.theme === 'dark' ? 'dark' : 'light'}
            onThemeChange={onThemeChange}
        />
    );
};

export default MailPreview;
