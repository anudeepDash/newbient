import { DEFAULT_CREATOR_GROUPS } from './constants';
import { getPublicSiteUrl } from './siteUrl';

/*
 * HTML renderers for the admin composers (campaign, newsletter, creator
 * groups) and a city-group lookup. Nothing here sends mail: every email is
 * sent by the server (api/mail.js), through lib/mailApi.js. Transactional
 * emails (passes, creator emails, documents) are built on the server from
 * api/_lib/mail/templates.
 */

export const NEWBI_GREEN = '#39FF14';
const getBaseUrl = () => getPublicSiteUrl();

/**
 * Ensures all images in email body content are responsive and stay constrained within the email container width.
 * Prevents images from scaling up beyond 100% of container width or overflowing layout.
 */
export const formatEmailBodyHtml = (htmlString) => {
    if (!htmlString || typeof htmlString !== 'string') return '';

    return htmlString.replace(/<img\b([^>]*)>/gi, (match, attributes) => {
        // Strip raw HTML width and height attributes (e.g. width="100%" or width="2400") that break in email clients
        let cleanAttrs = attributes
            .replace(/\bwidth\s*=\s*["']?[^"'\s>]+["']?/gi, '')
            .replace(/\bheight\s*=\s*["']?[^"'\s>]+["']?/gi, '');

        // Preserve explicit width percentage if set by editor (e.g. 50%, 75%, 25%, 100%)
        let targetWidth = '100%';
        const widthMatch = attributes.match(/width\s*:\s*(\d+%)['";\s]/i);
        if (widthMatch && widthMatch[1]) {
            targetWidth = widthMatch[1];
        }

        // Determine margin alignment
        let marginStyle = '16px auto';
        if (/margin-left\s*:\s*0/i.test(attributes)) {
            marginStyle = '16px auto 16px 0';
        } else if (/margin-right\s*:\s*0/i.test(attributes)) {
            marginStyle = '16px 0 16px auto';
        }

        // Strict inline styles to guarantee containment across Gmail, Outlook, Apple Mail, iOS Mail
        const robustStyle = `width: ${targetWidth} !important; max-width: 100% !important; height: auto !important; display: block !important; margin: ${marginStyle} !important; border-radius: 12px; box-sizing: border-box !important;`;

        if (/style=["']/i.test(cleanAttrs)) {
            cleanAttrs = cleanAttrs.replace(/style=["']([^"']*)["']/i, () => `style="${robustStyle}"`);
        } else {
            cleanAttrs += ` style="${robustStyle}"`;
        }

        // Include width="600" as a safe fallback for Outlook Desktop rendering engine
        return `<img${cleanAttrs} width="600" />`;
    });
};

/**
 * Generates the HTML for an official Newbi communication.
 * Cleaner, professional, and minimalist. Supports Dark/Light themes.
 */
export const generateOfficialHTML = (data) => {
    const { 
        headerText = "OFFICIAL COMMUNICATION", 
        messageBody = "", 
        category = "OFFICIAL",
        ctaText = "", 
        ctaUrl = "#",
        theme = "light",
        isPreview = false,
        preheader = ""
    } = data;

    const formattedBody = formatEmailBodyHtml(messageBody);
    // Inbox preview text: the custom preheader if one was written, else the start of the message.
    const preheaderText = String(preheader || '').trim() || String(messageBody || '').replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').substring(0, 150);

    const isDark = theme === 'dark';
    const bgColor = isDark ? '#000000' : '#fcfcfc';
    const containerBg = isDark ? '#0a0a0a' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#111111';
    const subTextColor = isDark ? '#888888' : '#444444';
    const borderColor = isDark ? '#1a1a1a' : '#eaeaea';
    
    // Brand Logos: Home (Dark) vs Document (Light)
    const baseUrl = getBaseUrl();
    
    // Header background is always dark to avoid a mismatched logo/header in dark mode
    const headerBg = '#0a0a0a';
    const headerBorder = '#1a1a1a';
    // The unified newbi.live logo (public/brand), same as the server's email layout.
    const logoUrl = `${baseUrl}/brand/newbi-logo-email.png`;

    const mediaQueries = (isPreview || isDark) ? '' : `
        @media (prefers-color-scheme: dark) {
            body { background-color: #000000 !important; color: #ffffff !important; }
            .container { background-color: #0a0a0a !important; border-color: #1a1a1a !important; color: #ffffff !important; }
            .title { color: #ffffff !important; }
            .body-text { color: #888888 !important; }
            .footer { background-color: #050505 !important; border-color: #1a1a1a !important; }
            .social-img { filter: invert(1) !important; }
            .category-badge { background: ${NEWBI_GREEN} !important; }
        }
    `;

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="light dark">
            <meta name="supported-color-schemes" content="light dark">
            <style>
                .preheader { display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; }
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: ${bgColor}; color: ${textColor}; margin: 0; padding: 0; }
                .container { width: 100%; max-width: 600px; margin: 40px auto; background-color: ${containerBg}; border: 1px solid ${borderColor}; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.02); }
                .header { padding: 40px; background-color: ${headerBg}; border-bottom: 1px solid ${headerBorder}; text-align: left; }
                .content { padding: 50px; text-align: left; }
                .category-badge { display: inline-block; padding: 6px 12px; background: ${NEWBI_GREEN}; color: #000000; font-size: 9px; font-weight: 900; border-radius: 6px; letter-spacing: 2px; margin-bottom: 20px; text-transform: uppercase; }
                .title { font-size: 28px; font-weight: 800; color: ${textColor}; margin-bottom: 24px; line-height: 1.2; letter-spacing: -0.5px; }
                .body-text { color: ${subTextColor}; font-size: 15px; line-height: 1.6; font-weight: 400; margin-bottom: 40px; }
                .body-text img, .content img { max-width: 100% !important; height: auto !important; border-radius: 10px; margin: 15px 0; display: block; }
                .body-text ul, .content ul { list-style-type: disc !important; padding-left: 20px !important; margin-top: 10px !important; margin-bottom: 10px !important; }
                .body-text ol, .content ol { list-style-type: decimal !important; padding-left: 20px !important; margin-top: 10px !important; margin-bottom: 10px !important; }
                .body-text li, .content li { margin-bottom: 5px !important; line-height: 1.6 !important; }
                .cta-button { display: inline-block; padding: 16px 30px; background-color: ${NEWBI_GREEN}; color: #000000 !important; text-decoration: none; font-weight: 700; font-size: 12px; border-radius: 10px; transition: all 0.2s; }
                .footer { padding: 40px 50px; background-color: ${isDark ? '#050505' : '#fafafa'}; border-top: 1px solid ${borderColor}; text-align: center; }
                .footer-text { font-size: 10px; font-weight: 800; color: #777; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; }
                .social-links { margin-bottom: 20px; }
                .social-icon { display: inline-block; margin: 0 12px; }
                .social-img { width: 18px; height: 18px; opacity: 0.6; ${isDark ? 'filter: invert(1);' : ''} }

                @media screen and (max-width: 600px) {
                    .container { margin: 0 !important; border-radius: 0 !important; border: none !important; width: 100% !important; }
                    .content { padding: 30px 20px !important; }
                    .header { padding: 30px 20px !important; }
                    .footer { padding: 30px 20px !important; }
                    .title { font-size: 24px !important; margin-bottom: 18px !important; }
                    .body-text { font-size: 14px !important; line-height: 1.5 !important; }
                }

                ${mediaQueries}
            </style>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: ${bgColor}; color: ${textColor}; margin: 0; padding: 0;">
            <span class="preheader">${preheaderText.replace(/</g, '&lt;')}</span>
            <div class="container" style="width: 100%; max-width: 600px; margin: 40px auto; background-color: ${containerBg}; border: 1px solid ${borderColor}; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.02); color: ${textColor};">
                <div class="header" style="padding: 40px; background-color: ${headerBg}; border-bottom: 1px solid ${headerBorder}; text-align: left;">
                    <!-- Brand Logo -->
                    <img src="${logoUrl}" alt="newbi.live" width="120" style="display: block; margin: 0; width: 120px; height: auto; max-width: 100%; border: 0;">
                </div>
                <div class="content" style="padding: 50px; text-align: left;">
                    <div class="category-badge" style="display: inline-block; padding: 6px 12px; background: ${NEWBI_GREEN}; color: #000000; font-size: 9px; font-weight: 900; border-radius: 6px; letter-spacing: 2px; margin-bottom: 20px; text-transform: uppercase;">${category}</div>
                    <h1 class="title" style="font-size: 28px; font-weight: 800; color: ${textColor}; margin-bottom: 24px; line-height: 1.2; letter-spacing: -0.5px; margin-top: 0;">${headerText}</h1>
                    <div class="body-text" style="color: ${subTextColor}; font-size: 15px; line-height: 1.6; font-weight: 400; margin-bottom: 40px;">${formattedBody}</div>
                    ${ctaText ? `<a href="${ctaUrl}" class="cta-button" style="display: inline-block; padding: 16px 30px; background-color: ${NEWBI_GREEN}; color: #000000 !important; text-decoration: none; font-weight: 700; font-size: 12px; border-radius: 10px;">${ctaText}</a>` : ''}
                </div>
                <div class="footer" style="padding: 40px 50px; background-color: ${isDark ? '#050505' : '#fafafa'}; border-top: 1px solid ${borderColor}; text-align: center;">
                    <div class="social-links" style="margin-bottom: 20px;">
                        <a href="https://www.instagram.com/newbi.live" class="social-icon" style="display: inline-block; margin: 0 12px;"><img src="https://img.icons8.com/material-outlined/48/888888/instagram-new.png" class="social-img" style="width: 18px; height: 18px; opacity: 0.6; ${isDark ? 'filter: invert(1);' : ''}" alt="Instagram"></a>
                        <a href="https://linkedin.com/company/newbi-ent" class="social-icon" style="display: inline-block; margin: 0 12px;"><img src="https://img.icons8.com/material-outlined/48/888888/linkedin.png" class="social-img" style="width: 18px; height: 18px; opacity: 0.6; ${isDark ? 'filter: invert(1);' : ''}" alt="LinkedIn"></a>
                        <a href="https://newbi.live" class="social-icon" style="display: inline-block; margin: 0 12px;"><img src="https://img.icons8.com/material-outlined/48/888888/domain.png" class="social-img" style="width: 18px; height: 18px; opacity: 0.6; ${isDark ? 'filter: invert(1);' : ''}" alt="Website"></a>
                    </div>
                    <p class="footer-text" style="font-size: 10px; font-weight: 800; color: #777; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; margin-top: 0;">© ${new Date().getFullYear()} NEWBI ENTERTAINMENT & MARKETING LLP. ALL RIGHTS RESERVED.</p>
                    <p class="footer-text" style="margin-top: 10px; font-size: 10px; font-weight: 800; color: #777; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0;"><a href="https://newbi.live/unsubscribe" style="color: #777; text-decoration: underline;">UNSUBSCRIBE FROM OFFICIAL LIST</a></p>
                </div>
            </div>
        </body>
        </html>
    `;
};


/**
 * Generates the HTML for the Weekly Briefing by Concert Zone.
 * High-fidelity, magazine-style editorial layout.
 */
export const generateWeeklyHTML = (data) => {
    const { 
        summary = "The official Weekly Newsletter from Concert Zone.",
        messageBody = "", 
        theme = "dark",
        isPreview = false
    } = data;

    const isDark = theme === 'dark';
    const bgColor = isDark ? '#000000' : '#ffffff';
    const containerBg = isDark ? '#080808' : '#fafafa';
    const textColor = isDark ? '#f8fafc' : '#111111';
    const subTextColor = isDark ? '#94a3b8' : '#4b5563';
    const borderColor = isDark ? '#1e293b' : '#e5e7eb';
    const cardBg = isDark ? '#111111' : '#ffffff';
    const accent = isDark ? '#00f2ff' : '#008899';
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    const baseUrl = getBaseUrl();

    // Dynamic header: dark theme uses dark bg with dark logo; light theme uses white bg with light logo
    const headerBg = isDark ? '#0a0a0a' : '#ffffff';
    const headerBorder = isDark ? '#1a1a1a' : '#e5e7eb';
    const logoSrc = isDark ? `${baseUrl}/weekly_logo_dark.png` : `${baseUrl}/weekly_logo_light.png`;

    // Media queries: omit entirely for preview; omit for dark (preserve dark); add dark override for light theme emails
    const mediaQueries = (isPreview || isDark) ? '' : `
        @media (prefers-color-scheme: dark) {
            body { background-color: #000000 !important; color: #f8fafc !important; }
            .container { background-color: #080808 !important; border-color: #1e293b !important; }
            .footer { background-color: #040404 !important; border-color: #1e293b !important; }
            .social-img { filter: invert(1) !important; }
        }
    `;

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="${isDark ? 'dark' : 'light'}">
            <meta name="supported-color-schemes" content="${isDark ? 'dark' : 'light'} dark">
            <title>Weekly by Concert Zone</title>
            <style>
                .preheader { display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; }
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
                    background-color: ${bgColor}; 
                    color: ${textColor}; 
                    margin: 0; 
                    padding: 0; 
                    -webkit-font-smoothing: antialiased; 
                }
                .container { 
                    max-width: 600px; 
                    margin: 40px auto; 
                    background-color: ${containerBg}; 
                    border: 1px solid ${borderColor}; 
                    border-radius: 32px; 
                    overflow: hidden; 
                    box-shadow: 0 30px 60px rgba(0,0,0,0.15);
                }
                .header { 
                    padding: 40px 40px 20px; 
                    text-align: center; 
                    background-color: ${headerBg};
                    border-bottom: 1px solid ${headerBorder};
                }
                .header img { 
                    width: 100%; 
                    max-width: 320px; 
                    height: auto; 
                }
                .date-badge {
                    display: inline-block;
                    margin-top: 15px;
                    padding: 4px 12px;
                    background: ${isDark ? 'rgba(0,242,255,0.1)' : 'rgba(0,136,153,0.1)'};
                    border: 1px solid ${isDark ? 'rgba(0,242,255,0.2)' : 'rgba(0,136,153,0.2)'};
                    border-radius: 12px;
                    font-size: 9px;
                    font-weight: 900;
                    letter-spacing: 3px;
                    color: ${accent};
                }
                .content { 
                    padding: 40px 0; 
                }
                .content p, .content h1, .content h2, .content h3, .content h4, .content div, .content span { 
                    color: inherit !important; 
                }
                .responsive-px { 
                    padding-left: 40px !important; 
                    padding-right: 40px !important; 
                }
                .footer { 
                    padding: 40px 40px; 
                    border-top: 1px solid ${borderColor}; 
                    text-align: center; 
                    background-color: ${isDark ? '#040404' : '#f3f4f6'};
                }
                .footer-text { 
                    font-size: 9px; 
                    font-weight: 800; 
                    color: ${isDark ? '#475569' : '#9ca3af'}; 
                    text-transform: uppercase; 
                    letter-spacing: 3px; 
                    margin-bottom: 20px; 
                    line-height: 1.6;
                }
                .social-links { 
                    margin-bottom: 25px; 
                }
                .social-icon { 
                    display: inline-block; 
                    margin: 0 10px; 
                }
                .social-img { 
                    width: 18px; 
                    height: 18px; 
                    opacity: 0.6; 
                    ${isDark ? 'filter: invert(1);' : ''} 
                }
                .unsubscribe-link { 
                    font-size: 8px; 
                    font-weight: 700; 
                    color: ${accent}; 
                    text-decoration: none; 
                    text-transform: uppercase; 
                    letter-spacing: 1px; 
                }
                .content p { 
                    line-height: 1.8; 
                    margin-bottom: 1.5em; 
                    font-size: 15px;
                }
                .content ul { list-style-type: disc !important; padding-left: 20px !important; margin-top: 10px !important; margin-bottom: 10px !important; }
                .content ol { list-style-type: decimal !important; padding-left: 20px !important; margin-top: 10px !important; margin-bottom: 10px !important; }
                .content li { margin-bottom: 5px !important; line-height: 1.6 !important; }
                .content a { 
                    color: ${accent}; 
                    text-decoration: none; 
                    font-weight: 700; 
                }
                .content * { 
                    max-width: 100%; 
                }
                
                /* Story card hover styles */
                .story-card {
                    background: ${cardBg};
                    border: 1px solid ${borderColor};
                    border-radius: 20px;
                }
                
                /* Interactive details summary accordion */
                details {
                    background: ${isDark ? '#0e0e0e' : '#f9fafb'};
                    border: 1px solid ${borderColor};
                    border-radius: 16px;
                    padding: 16px;
                    margin-bottom: 20px;
                }
                summary {
                    font-weight: 800;
                    font-size: 12px;
                    letter-spacing: 2px;
                    color: ${accent};
                    text-transform: uppercase;
                    cursor: pointer;
                    outline: none;
                }
                details[open] {
                    border-color: ${accent};
                }
                
                @media screen and (max-width: 600px) {
                    .container { 
                        width: 100% !important; 
                        margin: 0 !important;
                        border-radius: 0 !important;
                        border: none !important;
                    }
                    .header { padding: 30px 20px 15px !important; }
                    .content { padding: 25px 0 !important; }
                    .footer { padding: 35px 20px !important; }
                    .responsive-px { padding-left: 20px !important; padding-right: 20px !important; }
                    .mobile-stack { display: block !important; }
                    .mobile-w-full { width: 100% !important; max-width: 100% !important; margin-bottom: 15px !important; }
                }

                ${mediaQueries}

            </style>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: ${bgColor}; color: ${textColor}; margin: 0; padding: 0;">
            <span class="preheader">${summary}</span>
            <div class="container" style="max-width: 600px; margin: 40px auto; background-color: ${containerBg}; border: 1px solid ${borderColor}; border-radius: 32px; overflow: hidden; box-shadow: 0 30px 60px rgba(0,0,0,0.15); color: ${textColor};">
                <div class="header" style="padding: 40px 40px 20px; text-align: center; background-color: ${headerBg}; border-bottom: 1px solid ${headerBorder};">
                    <!-- Brand Logo -->
                    <img src="${logoSrc}" alt="WEEKLY BY CONCERT ZONE" style="display: block; margin: 0 auto; max-width: 320px; width: 100%; height: auto;">
                    <div>
                        <span class="date-badge" style="display: inline-block; margin-top: 15px; padding: 4px 12px; background: ${isDark ? 'rgba(0,242,255,0.1)' : 'rgba(0,136,153,0.1)'}; border: 1px solid ${isDark ? 'rgba(0,242,255,0.2)' : 'rgba(0,136,153,0.2)'}; border-radius: 12px; font-size: 9px; font-weight: 900; letter-spacing: 3px; color: ${accent};">${dateStr}</span>
                    </div>
                </div>
                <div class="content" style="padding: 40px 0; color: ${textColor};">
                    ${messageBody}
                </div>
                <div class="footer" style="padding: 40px 40px; border-top: 1px solid ${borderColor}; text-align: center; background-color: ${isDark ? '#040404' : '#f3f4f6'};">
                    <div class="social-links" style="margin-bottom: 25px;">
                        <a href="https://www.instagram.com/newbi.live" class="social-icon" style="display: inline-block; margin: 0 10px;"><img src="https://img.icons8.com/material-outlined/48/888888/instagram-new.png" class="social-img" style="width: 18px; height: 18px; opacity: 0.6; ${isDark ? 'filter: invert(1);' : ''}" alt="Instagram"></a>
                        <a href="https://linkedin.com/company/newbi-ent" class="social-icon" style="display: inline-block; margin: 0 10px;"><img src="https://img.icons8.com/material-outlined/48/888888/linkedin.png" class="social-img" style="width: 18px; height: 18px; opacity: 0.6; ${isDark ? 'filter: invert(1);' : ''}" alt="LinkedIn"></a>
                        <a href="https://newbi.live" class="social-icon" style="display: inline-block; margin: 0 10px;"><img src="https://img.icons8.com/material-outlined/48/888888/domain.png" class="social-img" style="width: 18px; height: 18px; opacity: 0.6; ${isDark ? 'filter: invert(1);' : ''}" alt="Website"></a>
                    </div>
                    <p class="footer-text" style="font-size: 9px; font-weight: 800; color: ${isDark ? '#475569' : '#9ca3af'}; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 20px; line-height: 1.6;">© ${new Date().getFullYear()} CONCERT ZONE. ALL RIGHTS RESERVED.<br/>A SUBSIDIARY OF NEWBI ENTERTAINMENT & MARKETING LLP.</p>
                    <a href="https://newbi.live/unsubscribe" class="unsubscribe-link" style="font-size: 8px; font-weight: 700; color: ${accent}; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">UNSUBSCRIBE FROM WEEKLY BRIEFINGS</a>
                </div>
            </div>
        </body>
        </html>
    `;
};


/**
 * Resolves the official WhatsApp Community Group for a given creator city.
 */
export const resolveCityWhatsAppGroup = (city = '', customUrl = '', availableGroups = null) => {
    if (customUrl) {
        return {
            id: 'custom_group',
            city: city || 'Local',
            platform: 'WhatsApp',
            title: `${city || 'Community'} Creators Group`,
            groupUrl: customUrl,
            description: 'Official city hub for brand campaigns, concert access & creator meetups.'
        };
    }
    const clean = String(city || '').trim().toLowerCase();

    // Check if availableGroups or store groups have a match
    const groupsList = Array.isArray(availableGroups) && availableGroups.length > 0 
        ? availableGroups 
        : DEFAULT_CREATOR_GROUPS;

    const dynamicMatch = groupsList.find(g => (g.city || '').toLowerCase().trim() === clean) ||
        groupsList.find(g => {
            const gc = (g.city || '').toLowerCase().trim();
            return clean.includes(gc) || gc.includes(clean);
        });

    if (dynamicMatch) return dynamicMatch;

    if (!clean || clean === 'pan-india' || clean === 'all') {
        return DEFAULT_CREATOR_GROUPS[0];
    }

    if (clean.includes('bengaluru') || clean.includes('bangalore')) {
        return DEFAULT_CREATOR_GROUPS.find(g => g.city.toLowerCase() === 'bengaluru') || DEFAULT_CREATOR_GROUPS[0];
    }
    if (clean.includes('hyderabad') || clean.includes('secunderabad')) {
        return DEFAULT_CREATOR_GROUPS.find(g => g.city.toLowerCase() === 'hyderabad') || DEFAULT_CREATOR_GROUPS[1];
    }
    if (clean.includes('chandigarh') || clean.includes('mohali') || clean.includes('panchkula') || clean.includes('tricity')) {
        return DEFAULT_CREATOR_GROUPS.find(g => g.city.toLowerCase() === 'chandigarh') || DEFAULT_CREATOR_GROUPS[2];
    }
    if (clean.includes('mumbai') || clean.includes('bombay') || clean.includes('navi mumbai') || clean.includes('thane')) {
        return DEFAULT_CREATOR_GROUPS.find(g => g.city.toLowerCase() === 'mumbai') || DEFAULT_CREATOR_GROUPS[3];
    }
    if (clean.includes('pune') || clean.includes('poona')) {
        return DEFAULT_CREATOR_GROUPS.find(g => g.city.toLowerCase() === 'pune') || DEFAULT_CREATOR_GROUPS[4];
    }
    if (clean.includes('kolkata') || clean.includes('calcutta')) {
        return DEFAULT_CREATOR_GROUPS.find(g => g.city.toLowerCase() === 'kolkata') || DEFAULT_CREATOR_GROUPS[5];
    }
    if (clean.includes('kochi') || clean.includes('cochin') || clean.includes('kerala') || clean.includes('ernakulam')) {
        return DEFAULT_CREATOR_GROUPS.find(g => g.city.toLowerCase() === 'kochi') || DEFAULT_CREATOR_GROUPS[6];
    }
    if (clean.includes('delhi') || clean.includes('ncr') || clean.includes('noida') || clean.includes('gurugram') || clean.includes('gurgaon') || clean.includes('ghaziabad') || clean.includes('faridabad')) {
        return DEFAULT_CREATOR_GROUPS.find(g => g.city.toLowerCase() === 'delhi') || DEFAULT_CREATOR_GROUPS[7];
    }
    if (clean.includes('bhubaneswar') || clean.includes('bhubaneshwar') || clean.includes('cuttack') || clean.includes('odisha') || clean.includes('orissa')) {
        return DEFAULT_CREATOR_GROUPS.find(g => g.city.toLowerCase().includes('bhubaneswar')) || DEFAULT_CREATOR_GROUPS[8];
    }
    if (clean.includes('vizag') || clean.includes('visakhapatnam') || clean.includes('andhra')) {
        return DEFAULT_CREATOR_GROUPS.find(g => g.city.toLowerCase().includes('vizag')) || DEFAULT_CREATOR_GROUPS[9];
    }
    if (clean.includes('surat')) {
        return DEFAULT_CREATOR_GROUPS.find(g => g.city.toLowerCase() === 'surat') || DEFAULT_CREATOR_GROUPS[10];
    }
    if (clean.includes('ahmedabad')) {
        return DEFAULT_CREATOR_GROUPS.find(g => g.city.toLowerCase() === 'ahmedabad') || DEFAULT_CREATOR_GROUPS[11];
    }
    if (clean.includes('jaipur')) {
        return DEFAULT_CREATOR_GROUPS.find(g => g.city.toLowerCase() === 'jaipur') || DEFAULT_CREATOR_GROUPS[12];
    }
    if (clean.includes('chennai') || clean.includes('madras')) {
        return DEFAULT_CREATOR_GROUPS.find(g => g.city.toLowerCase() === 'chennai') || DEFAULT_CREATOR_GROUPS[13];
    }

    const partial = DEFAULT_CREATOR_GROUPS.find(g => clean.includes(g.city.toLowerCase()) || g.city.toLowerCase().includes(clean));
    return partial || DEFAULT_CREATOR_GROUPS[0];
};

/**
 * Generates high-converting HTML announcement for Creator WhatsApp City Groups.
 */
export const generateCreatorGroupsBroadcastHTML = ({
    creatorName = 'Creator',
    city = 'Bengaluru',
    groupUrl = 'https://chat.whatsapp.com/K6MtDAOlZ7s7AUtOFHxduU?mode=gi_t',
    customMessage = '',
    availableGroups = []
} = {}) => {
    const baseUrl = getBaseUrl();
    const formattedCity = (city || 'Your City').toUpperCase();
    const cleanName = creatorName && creatorName !== 'Creator' ? creatorName.split(' ')[0] : 'Creator';
    
    // Group buttons for other active hubs
    const otherHubsHTML = (availableGroups || []).filter(g => g.groupUrl && g.isActive !== false).map(g => `
        <a href="${g.groupUrl}" class="hub-btn" style="display: inline-block; margin: 4px; padding: 8px 16px; background: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 8px; color: #0F172A; text-decoration: none; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
            📍 ${g.city}
        </a>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>${formattedCity} Creator WhatsApp Group</title>
    <style>
        :root {
            color-scheme: light dark;
            supported-color-schemes: light dark;
        }
        .preheader { display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; }
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
        table { border-collapse: separate; }
        a { text-decoration: none; }
        @media only screen and (max-width: 600px) {
            .email-container { width: 100% !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; }
            .content-padding { padding: 22px 18px !important; }
            .header-padding { padding: 20px 18px 14px 18px !important; }
            .wa-btn { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
        }

        /* Light Mode Rules */
        @media (prefers-color-scheme: light) {
            .light-logo { display: block !important; }
            .dark-logo { display: none !important; }
            .dark-logo-wrap { display: none !important; }
            .email-bg { background-color: #F4F6F9 !important; }
            .email-container { background-color: #FFFFFF !important; border-color: #E2E8F0 !important; box-shadow: 0 10px 30px rgba(0,0,0,0.06) !important; }
            .header-border { border-bottom-color: #F1F5F9 !important; }
            .chip-hub { background: #ECFDF5 !important; border-color: #A7F3D0 !important; color: #059669 !important; }
            .text-title { color: #0F172A !important; }
            .text-subtitle { color: #475569 !important; }
            .card-box { background: #F8FAFC !important; border-color: #E2E8F0 !important; }
            .card-tag { color: #059669 !important; }
            .card-list { color: #334155 !important; }
            .hub-title { color: #64748B !important; }
            .hub-btn { background: #F1F5F9 !important; border-color: #E2E8F0 !important; color: #0F172A !important; }
            .footer-bg { background-color: #F8FAFC !important; border-top-color: #E2E8F0 !important; }
            .social-icon { filter: invert(0) !important; opacity: 0.6 !important; }
            .footer-copy { color: #64748B !important; }
            .footer-support { color: #64748B !important; }
            .footer-support-link { color: #334155 !important; }
        }

        /* Dark Mode Rules */
        @media (prefers-color-scheme: dark) {
            .light-logo { display: none !important; }
            .dark-logo-wrap { display: block !important; max-height: none !important; max-width: none !important; overflow: visible !important; }
            .dark-logo { display: block !important; }
            .email-bg { background-color: #060709 !important; }
            .email-container { background-color: #0B0D14 !important; border-color: rgba(255, 255, 255, 0.08) !important; box-shadow: 0 20px 50px rgba(0,0,0,0.7) !important; }
            .header-border { border-bottom-color: rgba(255, 255, 255, 0.06) !important; }
            .chip-hub { background: rgba(37, 211, 102, 0.1) !important; border-color: rgba(37, 211, 102, 0.3) !important; color: #25D366 !important; }
            .text-title { color: #FFFFFF !important; }
            .text-subtitle { color: #8E96A4 !important; }
            .card-box { background: #111420 !important; border-color: rgba(255, 255, 255, 0.08) !important; }
            .card-tag { color: #25D366 !important; }
            .card-list { color: #CBD5E1 !important; }
            .hub-title { color: #64748B !important; }
            .hub-btn { background: #18181b !important; border-color: #27272a !important; color: #ffffff !important; }
            .footer-bg { background-color: #07090F !important; border-top-color: rgba(255, 255, 255, 0.06) !important; }
            .social-icon { filter: invert(1) !important; opacity: 0.4 !important; }
            .footer-copy { color: #475569 !important; }
            .footer-support { color: #475569 !important; }
            .footer-support-link { color: #8E96A4 !important; }
        }

        /* Outlook [data-ogsc] Dark Mode */
        [data-ogsc] .light-logo { display: none !important; }
        [data-ogsc] .dark-logo-wrap { display: block !important; max-height: none !important; max-width: none !important; overflow: visible !important; }
        [data-ogsc] .dark-logo { display: block !important; }
        [data-ogsc] .email-bg { background-color: #060709 !important; }
        [data-ogsc] .email-container { background-color: #0B0D14 !important; border-color: rgba(255, 255, 255, 0.08) !important; }
        [data-ogsc] .text-title { color: #FFFFFF !important; }
        [data-ogsc] .text-subtitle { color: #8E96A4 !important; }
        [data-ogsc] .card-box { background: #111420 !important; }
        [data-ogsc] .footer-bg { background-color: #07090F !important; }
        [data-ogsc] .social-icon { filter: invert(1) !important; }
    </style>
</head>
<body class="email-bg" style="margin: 0; padding: 0; background-color: #F4F6F9; color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <span class="preheader">Official WhatsApp Community for Verified Newbi Creators in ${formattedCity}.</span>

    <table role="presentation" class="email-bg" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F4F6F9; padding: 24px 8px;">
        <tr>
            <td align="center">
                <table role="presentation" class="email-container" width="560" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; width: 100%; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06);">
                    
                    <tr>
                        <td style="height: 2px; background: #39FF14;"></td>
                    </tr>

                    <tr>
                        <td class="header-padding header-border" style="padding: 26px 30px 16px 30px; border-bottom: 1px solid #F1F5F9;">
                            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="left" valign="middle">
                                        <a href="${baseUrl}" target="_blank" style="text-decoration: none; display: inline-block;">
                                            <img src="${baseUrl}/newbi-creators-logo-light.png" alt="Newbi Creators" class="light-logo" height="22" style="display: block; height: 22px; width: auto; max-width: 130px; border: 0;" />
                                            <!--[if !mso]><!-->
                                            <div class="dark-logo-wrap" style="display: none; mso-hide: all; overflow: hidden; max-height: 0; max-width: 0; line-height: 0;">
                                                <img src="${baseUrl}/newbi-creators-logo.png" alt="Newbi Creators" class="dark-logo" height="22" style="display: none; height: 22px; width: auto; max-width: 130px; border: 0;" />
                                            </div>
                                            <!--<![endif]-->
                                        </a>
                                    </td>
                                    <td align="right" valign="middle">
                                        <span class="chip-hub" style="display: inline-block; padding: 3px 9px; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 100px; color: #059669; font-family: monospace, -apple-system, sans-serif; font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">
                                            ● LIVE HUB · ${formattedCity}
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td class="content-padding" style="padding: 26px 30px 24px 30px;">
                            <div style="margin-bottom: 20px;">
                                <h1 class="text-title" style="margin: 0 0 6px 0; font-size: 22px; font-weight: 800; color: #0F172A; line-height: 1.25; letter-spacing: -0.4px;">
                                    Hey ${cleanName},
                                </h1>
                                <p class="text-subtitle" style="margin: 0; font-size: 13px; line-height: 1.6; color: #475569;">
                                    ${customMessage ? customMessage.replace(/\n/g, '<br />') : `We've opened the official <strong>${formattedCity} Creators WhatsApp Community</strong>. As a member of our creator roster, you have priority access to connect with fellow local creators, receive instant brand brief drops, and unlock guestlist passes.`}
                                </p>
                            </div>

                            <!-- Value Props Card -->
                            <table role="presentation" class="card-box" width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; margin: 20px 0; padding: 18px 20px;">
                                <tr>
                                    <td style="padding-bottom: 10px;">
                                        <div class="card-tag" style="font-size: 10px; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 1px;">
                                            ⚡ WHAT DROPS INSIDE
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="card-list" style="font-size: 12px; line-height: 1.7; color: #334155;">
                                        • <strong>Instant Campaign Briefs:</strong> Paid commercial brand opportunities in ${formattedCity}.<br />
                                        • <strong>VIP Concert &amp; Festival Passes:</strong> Complimentary backstage passes reserved for creators.<br />
                                        • <strong>Direct Support:</strong> Direct communication with the Newbi talent team.<br />
                                        • <strong>0% Agency Cut:</strong> 100% direct payouts straight to you.
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 26px 0 16px 0;">
                                <a href="${groupUrl}" target="_blank" rel="noopener noreferrer" class="wa-btn" style="display: inline-block; padding: 13px 30px; background: #25D366; color: #000000 !important; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; text-decoration: none; border-radius: 10px;">
                                    Join ${formattedCity} WhatsApp Group &rarr;
                                </a>
                                <div style="margin-top: 10px; font-size: 11px; color: #64748B;">
                                    Official verified creator invite link
                                </div>
                            </div>

                            ${otherHubsHTML ? `
                            <div style="margin-top: 26px; padding-top: 20px; border-top: 1px solid #E2E8F0;">
                                <p class="hub-title" style="margin: 0 0 10px 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #64748B;">
                                    Other Active City Hubs:
                                </p>
                                <div>
                                    ${otherHubsHTML}
                                </div>
                            </div>
                            ` : ''}
                        </td>
                    </tr>

                    <tr>
                        <td class="footer-bg" style="padding: 22px 30px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center;">
                            <div style="margin-bottom: 12px;">
                                <a href="https://www.instagram.com/newbi.live" style="display: inline-block; margin: 0 8px;"><img src="https://img.icons8.com/material-outlined/48/888888/instagram-new.png" class="social-icon" width="16" height="16" style="opacity: 0.6; filter: invert(0); display: block;" alt="Instagram"></a>
                                <a href="https://linkedin.com/company/newbi-ent" style="display: inline-block; margin: 0 8px;"><img src="https://img.icons8.com/material-outlined/48/888888/linkedin.png" class="social-icon" width="16" height="16" style="opacity: 0.6; filter: invert(0); display: block;" alt="LinkedIn"></a>
                                <a href="https://newbi.live" style="display: inline-block; margin: 0 8px;"><img src="https://img.icons8.com/material-outlined/48/888888/domain.png" class="social-icon" width="16" height="16" style="opacity: 0.6; filter: invert(0); display: block;" alt="Website"></a>
                            </div>
                            <p class="footer-copy" style="margin: 0 0 4px 0; font-size: 9px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 1px;">
                                &copy; ${new Date().getFullYear()} NEWBI ENTERTAINMENT &amp; MARKETING LLP
                            </p>
                            <p class="footer-support" style="margin: 0; font-size: 10px; font-weight: 500; color: #64748B;">
                                Support &amp; briefs: <a href="mailto:creators@newbi.live" class="footer-support-link" style="color: #334155; text-decoration: none;">creators@newbi.live</a>
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};
