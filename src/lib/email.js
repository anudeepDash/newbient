import { auth, db } from './firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { DEFAULT_CREATOR_GROUPS } from './constants';

export const NEWBI_GREEN = '#39FF14';
export const CONCERT_ZONE_CYAN = '#00f2ff';

const getBaseUrl = () => {
    return typeof window !== 'undefined' && window.location?.origin 
        ? window.location.origin 
        : 'https://newbi.live';
};

/**
 * Injects 1x1 open tracking pixel and rewrites outbound hyperlinks to route through link click tracking.
 */
export const injectEmailTracking = ({ 
    html, 
    trackingId = '', 
    recipientEmail = '', 
    campaignId = '', 
    subject = '', 
    baseUrl = null 
}) => {
    if (!html || typeof html !== 'string') return html;

    const rootUrl = baseUrl || getBaseUrl();
    const safeBaseUrl = (rootUrl || 'https://newbi.live').replace(/\/+$/, '');
    const encodedTid = encodeURIComponent(trackingId || '');
    const encodedEmail = encodeURIComponent(recipientEmail || '');
    const encodedCid = encodeURIComponent(campaignId || '');
    const encodedSub = encodeURIComponent(subject || '');

    // 1. Rewrite <a href="..."> links to route through click tracking
    let processedHtml = html.replace(/<a\b([^>]*?)href=(["'])(.*?)\2([^>]*?)>/gi, (match, prefix, quote, originalHref, suffix) => {
        const trimmedHref = (originalHref || '').trim();
        // Do not wrap internal anchors, mailto, tel, javascript, or already-tracked links
        if (
            !trimmedHref || 
            trimmedHref === '#' || 
            trimmedHref.startsWith('#') || 
            trimmedHref.startsWith('mailto:') || 
            trimmedHref.startsWith('tel:') || 
            trimmedHref.startsWith('javascript:') ||
            trimmedHref.includes('/api/track')
        ) {
            return match;
        }

        const trackingUrl = `${safeBaseUrl}/api/track?type=click&url=${encodeURIComponent(trimmedHref)}&tid=${encodedTid}&email=${encodedEmail}&cid=${encodedCid}`;
        return `<a${prefix}href=${quote}${trackingUrl}${quote}${suffix}>`;
    });

    // 2. Inject transparent 1x1 open tracking pixel
    const pixelUrl = `${safeBaseUrl}/api/track?type=open&tid=${encodedTid}&email=${encodedEmail}&cid=${encodedCid}&sub=${encodedSub}`;
    const trackingPixel = `\n<!-- Email Tracking Pixel -->\n<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none !important; max-height:0; width:0; height:0; opacity:0; visibility:hidden; mso-hide:all;" border="0" />\n`;

    if (processedHtml.includes('</body>')) {
        processedHtml = processedHtml.replace('</body>', `${trackingPixel}</body>`);
    } else {
        processedHtml += trackingPixel;
    }

    return processedHtml;
};


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
        isPreview = false
    } = data;

    const formattedBody = formatEmailBodyHtml(messageBody);

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
    const logoUrl = `${baseUrl}/logo_full.png`;

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
            <span class="preheader">${messageBody.replace(/<[^>]*>?/gm, '').substring(0, 150)}</span>
            <div class="container" style="width: 100%; max-width: 600px; margin: 40px auto; background-color: ${containerBg}; border: 1px solid ${borderColor}; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.02); color: ${textColor};">
                <div class="header" style="padding: 40px; background-color: ${headerBg}; border-bottom: 1px solid ${headerBorder}; text-align: left;">
                    <!-- Brand Logo -->
                    <img src="${logoUrl}" alt="Newbi" style="display: block; margin: 0; height: 25px; width: auto; max-width: 180px;">
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
 * Utility to get the current Firebase ID token for authenticated requests.
 */
const getAuthToken = async () => {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
};

/**
 * Standard fetch wrapper for API calls with Auth
 */
const apiFetch = async (endpoint, body) => {
    const token = await getAuthToken();
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(body),
    });
    return await response.json();
};

/**
 * Sends a ticket email to the user.
 */
export const sendTicketEmail = async (toName, toEmail, ticketUrl, eventName, bookingRef) => {
    try {
        const ticketLink = Array.isArray(ticketUrl) ? ticketUrl[0] : ticketUrl;
        
        const rawHtml = generateOfficialHTML({
            headerText: 'Your Tickets are Ready!',
            messageBody: `
                <p>Hi <strong>${toName}</strong>,</p>
                <p>Here are your tickets for <strong>${eventName}</strong>. We look forward to seeing you there!</p>
                <p style="margin-top: 15px; font-size: 14px;"><strong>Booking Reference:</strong> <code style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${bookingRef}</code></p>
                <p style="font-size: 12px; color: #666; margin-top: 20px;">If the button doesn't work, copy and paste this link: <a href="${ticketLink}" style="color: ${NEWBI_GREEN}; text-decoration: underline;">${ticketLink}</a></p>
            `,
            category: 'TICKETING',
            ctaText: 'View Your Tickets',
            ctaUrl: ticketLink,
            theme: 'light'
        });

        const html = injectEmailTracking({
            html: rawHtml,
            trackingId: `ticket_${bookingRef}`,
            recipientEmail: toEmail,
            campaignId: `TICKET_${eventName}`,
            subject: `Your Tickets for ${eventName}`
        });

        const result = await apiFetch('/api/mail', {
            to: toEmail,
            subject: `Your Tickets for ${eventName}`,
            fromName: 'Newbi Bookings',
            fromEmail: 'booking@newbi.live',
            html
        });

        if (result.success) {
            console.log('Email sent successfully via API');
            return { success: true };
        }
        throw new Error(result.error || 'Failed to send email');
    } catch (error) {
        console.error('Failed to send email:', error);
        return { success: false, error };
    }
};

/**
 * Sends a guestlist RSVP confirmation email.
 */
export const sendGuestlistConfirmation = async (guestlistData) => {
    try {
        const { toName, toEmail, eventName, bookingRef, guestCount, date, location, guestlistMode } = guestlistData;
        const isRSVPOnly = guestlistMode === 'rsvp';
        
        let htmlContent = '';
        if (isRSVPOnly) {
            htmlContent = generateOfficialHTML({
                headerText: 'RSVP Confirmed!',
                messageBody: `
                    <p>Hi <strong>${toName}</strong>,</p>
                    <p>Your RSVP for <strong>${eventName}</strong> has been successfully registered.</p>
                    
                    <div style="background: #fafafa; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #eaeaea; text-align: left;">
                        <p style="margin: 8px 0; font-size: 14px; color: #111111;"><strong>Event:</strong> ${eventName}</p>
                        <p style="margin: 8px 0; font-size: 14px; color: #111111;"><strong>Date:</strong> ${date || 'To Be Announced'}</p>
                        <p style="margin: 8px 0; font-size: 14px; color: #111111;"><strong>Location:</strong> ${location || 'Venue'}</p>
                        <p style="margin: 8px 0; font-size: 14px; color: #111111;"><strong>Guests:</strong> ${guestCount}</p>
                        <p style="margin: 8px 0; font-size: 14px; color: #111111;"><strong>Reference ID:</strong> <code style="font-family: monospace; background: #eaeaea; padding: 2px 6px; border-radius: 4px;">${bookingRef}</code></p>
                    </div>

                    <p>We look forward to hosting you. We will reach out if there are any updates regarding the entry details.</p>
                `,
                category: 'RSVP',
                ctaText: '',
                ctaUrl: '',
                theme: 'light'
            });
        } else {
            const viewUrl = `https://newbi.live/ticket/${bookingRef}`;
            htmlContent = generateOfficialHTML({
                headerText: 'Guestlist Confirmed!',
                messageBody: `
                    <p>Hi <strong>${toName}</strong>,</p>
                    <p>Your guestlist spot for <strong>${eventName}</strong> is secured. Below are your entry details and access pass.</p>
                    
                    <div style="background: #fafafa; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #eaeaea; text-align: left;">
                        <p style="margin: 8px 0; font-size: 14px; color: #111111;"><strong>Event:</strong> ${eventName}</p>
                        <p style="margin: 8px 0; font-size: 14px; color: #111111;"><strong>Date:</strong> ${date || 'To Be Announced'}</p>
                        <p style="margin: 8px 0; font-size: 14px; color: #111111;"><strong>Location:</strong> ${location || 'Venue'}</p>
                        <p style="margin: 8px 0; font-size: 14px; color: #111111;"><strong>Guests:</strong> ${guestCount}</p>
                        <p style="margin: 8px 0; font-size: 14px; color: #111111;"><strong>Access Code:</strong> <code style="font-family: monospace; background: #eaeaea; padding: 2px 6px; border-radius: 4px;">${bookingRef}</code></p>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(bookingRef)}" alt="Access QR Code" style="width: 150px; height: 150px; border: 1px solid #eaeaea; padding: 10px; border-radius: 12px; background: #fff;" />
                        <p style="font-size: 11px; color: #666; margin-top: 10px;">Present this QR code at the gate for entry verification.</p>
                    </div>
                `,
                category: 'GUESTLIST',
                ctaText: 'Access Digital Pass',
                ctaUrl: viewUrl,
                theme: 'light'
            });
        }

        const subject = isRSVPOnly ? `RSVP Confirmed: ${eventName}` : `Guestlist Access Confirmed: ${eventName}`;
        const trackedHtml = injectEmailTracking({
            html: htmlContent,
            trackingId: `guestlist_${bookingRef}`,
            recipientEmail: toEmail,
            campaignId: `GUESTLIST_${eventName}`,
            subject
        });

        const result = await apiFetch('/api/mail', {
            to: toEmail,
            subject,
            fromName: 'Newbi Bookings',
            fromEmail: 'booking@newbi.live',
            html: trackedHtml
        });

        if (result.success) return { success: true };
        throw new Error(result.error || 'Failed to send guestlist confirmation');
    } catch (error) {
        console.error('Failed to send guestlist email:', error);
        return { success: false, error };
    }
};

/**
 * Sends an event booking confirmation email.
 */
export const sendBookingConfirmation = async (bookingData) => {
    try {
        const { to_name, to_email, event_name, booking_ref, tickets_html, total_amount, payment_ref, ticket_url, items } = bookingData;
        const viewUrl = `https://newbi.live/ticket/${booking_ref}`;

        let invoiceHtml = '';
        if (items && Array.isArray(items) && total_amount > 0) {
            const itemsRows = items.map(item => {
                const rate = item.price || 0;
                const amt = rate * (item.count || 1);
                return `
                    <tr style="border-bottom: 1px dashed #eee;">
                        <td style="padding: 12px 0; font-weight: bold; text-align: left;">${item.name}</td>
                        <td style="padding: 12px 0; text-align: center; color: #555;">${item.count}</td>
                        <td style="padding: 12px 0; text-align: right; color: #555;">₹${rate}</td>
                        <td style="padding: 12px 0; text-align: right; font-weight: bold;">₹${amt}</td>
                    </tr>
                `;
            }).join('');

            invoiceHtml = `
                <div style="margin: 30px 0; border: 1px solid #eaeaea; border-radius: 16px; overflow: hidden; font-family: sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
                    <div style="background: #000000; color: #ffffff; padding: 20px; display: flex; justify-content: space-between; align-items: center; text-align: left;">
                        <div>
                            <h3 style="margin: 0; font-size: 13px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">TAX INVOICE</h3>
                            <span style="font-size: 10px; color: #888888; font-family: monospace;">Ref: ${booking_ref}</span>
                        </div>
                        <div style="text-align: right;">
                            <span style="font-size: 9px; font-weight: 900; color: #39FF14; background: rgba(57, 255, 20, 0.1); border: 1px solid rgba(57, 255, 20, 0.2); padding: 6px 12px; border-radius: 6px; text-transform: uppercase; letter-spacing: 1px;">PAID</span>
                        </div>
                    </div>
                    <div style="padding: 20px; background: #fafafa; text-align: left;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: #111111;">
                            <thead>
                                <tr style="border-bottom: 1px solid #eaeaea; font-weight: bold; color: #666666; text-transform: uppercase; font-size: 9px; letter-spacing: 1px;">
                                    <th style="padding: 10px 0; text-align: left;">Item Description</th>
                                    <th style="padding: 10px 0; text-align: center;">Qty</th>
                                    <th style="padding: 10px 0; text-align: right;">Rate</th>
                                    <th style="padding: 10px 0; text-align: right;">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsRows}
                            </tbody>
                        </table>
                        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eaeaea;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: #111111;">
                                <tr>
                                    <td style="color: #666666; text-align: left;">Subtotal</td>
                                    <td style="text-align: right; font-weight: 700;">₹${total_amount}</td>
                                </tr>
                                <tr>
                                    <td style="color: #666666; padding-top: 8px; text-align: left;">GST (0%)</td>
                                    <td style="text-align: right; font-weight: 700; padding-top: 8px;">₹0.00</td>
                                </tr>
                                <tr style="font-size: 14px; font-weight: 900;">
                                    <td style="padding-top: 16px; border-top: 1px dashed #eaeaea; text-align: left; text-transform: uppercase; letter-spacing: 1px;">Total Paid</td>
                                    <td style="text-align: right; padding-top: 16px; border-top: 1px dashed #eaeaea; color: #2bd93e;">₹${total_amount}</td>
                                </tr>
                            </table>
                        </div>
                        <div style="margin-top: 24px; text-align: center; font-size: 9px; color: #999999; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px;">
                            Thanks for booking with Newbi Entertainment!
                        </div>
                    </div>
                </div>
            `;
        }

        const rawHtml = generateOfficialHTML({
            headerText: 'Booking Confirmed!',
            messageBody: `
                <p>Hi <strong>${to_name}</strong>,</p>
                <p>Your payment for <strong>${event_name}</strong> has been verified successfully.</p>
                
                <div style="background: #fafafa; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #eaeaea; text-align: left;">
                    <p style="margin: 8px 0; font-size: 14px; color: #111111;"><strong>Booking Reference:</strong> <code style="font-family: monospace; background: #eaeaea; padding: 2px 6px; border-radius: 4px;">${booking_ref}</code></p>
                    <p style="margin: 8px 0; font-size: 14px; color: #111111;"><strong>Payment Ref:</strong> <code style="font-family: monospace; background: #eaeaea; padding: 2px 6px; border-radius: 4px;">${payment_ref}</code></p>
                </div>

                ${invoiceHtml}

                <div style="margin: 25px 0; text-align: left;">
                    <h3 style="font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; color: #111111;">Tickets Purchased</h3>
                    ${tickets_html}
                </div>
            `,
            category: 'TICKETING',
            ctaText: 'Access Digital Tickets',
            ctaUrl: viewUrl,
            theme: 'light'
        });

        const subject = `Booking Confirmed: ${event_name}`;
        const html = injectEmailTracking({
            html: rawHtml,
            trackingId: `booking_${booking_ref}`,
            recipientEmail: to_email,
            campaignId: `BOOKING_${event_name}`,
            subject
        });

        const result = await apiFetch('/api/mail', {
            to: to_email,
            subject,
            fromName: 'Newbi Bookings',
            fromEmail: 'booking@newbi.live',
            html
        });

        if (result.success) return { success: true };
        throw new Error(result.error || 'Failed to send confirmation');
    } catch (error) {
        console.error('Failed to send automated booking email:', error);
        return { success: false, error };
    }
};

/**
 * Sends a contact form auto-reply.
 */
export const sendContactAutoReply = async (name, email, message) => {
    try {
        const rawHtml = `
            <div style="font-family: sans-serif; padding: 20px;">
                <h2>Hello ${name},</h2>
                <p>We've received your message and our team will get back to you shortly.</p>
                <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #39FF14; margin: 20px 0;">
                    <p style="font-style: italic;">"${message}"</p>
                </div>
                <p>Best regards,<br/>The Newbi Team</p>
            </div>
        `;
        const subject = `Thanks for reaching out, ${name}`;
        const html = injectEmailTracking({
            html: rawHtml,
            trackingId: `contact_${Date.now()}`,
            recipientEmail: email,
            campaignId: 'CONTACT_AUTOREPLY',
            subject
        });

        const result = await apiFetch('/api/mail', {
            to: email,
            subject,
            fromName: 'Newbi Support',
            fromEmail: 'noreply@newbi.live',
            html
        });
        return result.success ? { success: true } : { success: false, error: result.error };
    } catch (error) {
        console.error('Failed to send contact email:', error);
        return { success: false, error };
    }
};

/**
 * Sends an invoice email.
 */
export const sendInvoiceEmail = async (toEmail, invoiceNumber, amount, invoiceUrl) => {
    try {
        const rawHtml = `
            <div style="font-family: sans-serif; padding: 20px;">
                <h2>Invoice Ready</h2>
                <p>Your invoice <strong>${invoiceNumber}</strong> for <strong>₹${amount}</strong> is ready for review.</p>
                <div style="margin: 30px 0;">
                    <a href="${invoiceUrl}" style="background: #000; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Invoice</a>
                </div>
                <p>Thank you for your business!</p>
            </div>
        `;
        const subject = `Invoice Ready: ${invoiceNumber}`;
        const html = injectEmailTracking({
            html: rawHtml,
            trackingId: `inv_${invoiceNumber}`,
            recipientEmail: toEmail,
            campaignId: `INVOICE_${invoiceNumber}`,
            subject
        });

        const result = await apiFetch('/api/mail', {
            to: toEmail,
            subject,
            fromName: 'Newbi Finance',
            fromEmail: 'partnership@newbi.live',
            html
        });
        return result.success ? { success: true } : { success: false, error: result.error };
    } catch (error) {
        console.error('Failed to send invoice email:', error);
        return { success: false, error };
    }
};

/**
 * Sends a proposal share email.
 */
export const sendProposalEmail = async (toEmail, proposalTitle, proposalUrl) => {
    try {
        const rawHtml = `
            <div style="font-family: sans-serif; padding: 20px;">
                <h2>Strategic Proposal</h2>
                <p>A new strategic proposal "<strong>${proposalTitle}</strong>" has been prepared for your review.</p>
                <div style="margin: 30px 0;">
                    <a href="${proposalUrl}" style="background: #39FF14; color: #000; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;">Review Proposal</a>
                </div>
                <p>Best regards,<br/>Newbi Entertainment</p>
            </div>
        `;
        const subject = `New Proposal: ${proposalTitle}`;
        const html = injectEmailTracking({
            html: rawHtml,
            trackingId: `prop_${Date.now()}`,
            recipientEmail: toEmail,
            campaignId: `PROPOSAL_${proposalTitle}`,
            subject
        });

        const result = await apiFetch('/api/mail', {
            to: toEmail,
            subject,
            fromName: 'Newbi Partnerships',
            fromEmail: 'partnership@newbi.live',
            html
        });
        return result.success ? { success: true } : { success: false, error: result.error };
    } catch (error) {
        console.error('Failed to send proposal email:', error);
        return { success: false, error };
    }
};

/**
 * Generates the HTML for an invoice email with attachment-style invoice card.
 * Professional template with editable content, invoice summary, and download link.
 */
export const generateInvoiceEmailHTML = (data) => {
    const {
        headerText = "Your Invoice is Ready",
        messageBody = "",
        invoiceNumber = "INV-0000",
        clientName = "Client",
        amount = "0",
        dueDate = "",
        invoiceUrl = "#",
        theme = "light",
        isPreview = false
    } = data;

    const formattedBody = formatEmailBodyHtml(messageBody);

    const isDark = theme === 'dark';
    const bgColor = isDark ? '#000000' : '#fcfcfc';
    const containerBg = isDark ? '#0a0a0a' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#111111';
    const subTextColor = isDark ? '#888888' : '#444444';
    const borderColor = isDark ? '#1a1a1a' : '#eaeaea';
    const cardBg = isDark ? '#111111' : '#f8f9fa';
    const cardBorder = isDark ? '#1e1e1e' : '#e5e7eb';
    const baseUrl = getBaseUrl();
    
    // Header background is always dark to avoid a mismatched logo/header in dark mode
    const headerBg = '#0a0a0a';
    const headerBorder = '#1a1a1a';
    const logoUrl = `${baseUrl}/69c6b548-01d8-4fd3-9813-9cc53fa40498.png`;

    const mediaQueries = (isPreview || isDark) ? '' : `
        @media (prefers-color-scheme: dark) {
            body { background-color: #000000 !important; color: #ffffff !important; }
            .container { background-color: #0a0a0a !important; border-color: #1a1a1a !important; color: #ffffff !important; }
            .title { color: #ffffff !important; }
            .body-text { color: #888888 !important; }
            .footer { background-color: #050505 !important; border-color: #1a1a1a !important; }
            .social-img { filter: invert(1) !important; }
            .category-badge { background: ${NEWBI_GREEN} !important; }
            .attachment-card { background: #111111 !important; border-color: #1e1e1e !important; }
            .attachment-label { color: #888888 !important; }
            .attachment-value { color: #ffffff !important; }
            .attachment-total { background: #0d1f0d !important; }
            .attachment-total-value { color: #ffffff !important; }
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
                .body-text { color: ${subTextColor}; font-size: 15px; line-height: 1.6; font-weight: 400; margin-bottom: 30px; }
                .body-text img, .content img { max-width: 100% !important; height: auto !important; border-radius: 10px; margin: 15px 0; display: block; }
                .body-text ul, .content ul { list-style-type: disc !important; padding-left: 20px !important; margin-top: 10px !important; margin-bottom: 10px !important; }
                .body-text ol, .content ol { list-style-type: decimal !important; padding-left: 20px !important; margin-top: 10px !important; margin-bottom: 10px !important; }
                .body-text li, .content li { margin-bottom: 5px !important; line-height: 1.6 !important; }
                
                /* Attachment Card - Table layout compatible */
                .attachment-card { background: ${cardBg}; border: 1px solid ${cardBorder}; border-radius: 16px; overflow: hidden; margin: 30px 0; }
                .attachment-header { padding: 16px 20px; border-bottom: 1px solid ${cardBorder}; }
                .attachment-icon { width: 44px; height: 44px; background: linear-gradient(135deg, #FF4444, #CC0000); border-radius: 10px; text-align: center; line-height: 44px; color: white; font-weight: 900; font-size: 11px; letter-spacing: 1px; }
                .attachment-filename { font-size: 13px; font-weight: 800; color: ${textColor}; letter-spacing: -0.3px; margin: 0; }
                .attachment-filetype { font-size: 9px; font-weight: 700; color: ${subTextColor}; text-transform: uppercase; letter-spacing: 1.5px; margin: 3px 0 0; }
                .attachment-body { padding: 20px 20px 10px 20px; }
                .attachment-row { padding: 10px 0; }
                .attachment-label { font-size: 10px; font-weight: 800; color: ${subTextColor}; text-transform: uppercase; letter-spacing: 1.5px; }
                .attachment-value { font-size: 13px; font-weight: 700; color: ${textColor}; }
                .attachment-total { background: ${isDark ? '#0d1f0d' : '#f0fdf4'}; border-top: 2px solid ${NEWBI_GREEN}; padding: 16px 20px; }
                .attachment-total-label { font-size: 10px; font-weight: 900; color: ${NEWBI_GREEN}; text-transform: uppercase; letter-spacing: 2px; }
                .attachment-total-value { font-size: 22px; font-weight: 900; color: ${textColor}; letter-spacing: -1px; }
                
                .cta-button { display: inline-block; padding: 16px 30px; background-color: ${NEWBI_GREEN}; color: #000000 !important; text-decoration: none; font-weight: 700; font-size: 12px; border-radius: 10px; letter-spacing: 1px; text-transform: uppercase; }
                .download-row { padding: 14px 20px; background: ${isDark ? '#0a0a0a' : '#fafafa'}; border-top: 1px solid ${cardBorder}; text-align: center; }
                .download-link { font-size: 11px; font-weight: 800; color: ${NEWBI_GREEN}; text-decoration: none; text-transform: uppercase; letter-spacing: 1.5px; }
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
            <span class="preheader">Invoice ${invoiceNumber} for ${clientName} — ₹${amount}</span>
            <div class="container" style="width: 100%; max-width: 600px; margin: 40px auto; background-color: ${containerBg}; border: 1px solid ${borderColor}; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.02); color: ${textColor};">
                <div class="header" style="padding: 40px; background-color: ${headerBg}; border-bottom: 1px solid ${headerBorder}; text-align: left;">
                    <!-- Brand Logo -->
                    <img src="${logoUrl}" alt="Newbi" style="display: block; margin: 0; height: 25px; width: auto; max-width: 180px;">
                </div>
                <div class="content" style="padding: 50px; text-align: left;">
                    <div class="category-badge" style="display: inline-block; padding: 6px 12px; background: ${NEWBI_GREEN}; color: #000000; font-size: 9px; font-weight: 900; border-radius: 6px; letter-spacing: 2px; margin-bottom: 20px; text-transform: uppercase;">INVOICE</div>
                    <h1 class="title" style="font-size: 28px; font-weight: 800; color: ${textColor}; margin-bottom: 24px; line-height: 1.2; letter-spacing: -0.5px; margin-top: 0;">${headerText}</h1>
                    <div class="body-text" style="color: ${subTextColor}; font-size: 15px; line-height: 1.6; font-weight: 400; margin-bottom: 30px;">${formattedBody}</div>

                    <!-- Attachment-Style Invoice Card (Table-based for maximum email client compatibility) -->
                    <table class="attachment-card" width="100%" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; background: ${cardBg}; border: 1px solid ${cardBorder}; border-radius: 16px; margin: 30px 0; overflow: hidden; color: ${textColor};">
                        <tr>
                            <td class="attachment-header" style="padding: 16px 20px; border-bottom: 1px solid ${cardBorder}; background-color: ${cardBg};">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                    <tr>
                                        <td width="44" valign="middle" style="width: 44px; padding-right: 14px;">
                                            <div class="attachment-icon" style="width: 44px; height: 44px; background: linear-gradient(135deg, #FF4444, #CC0000); border-radius: 10px; text-align: center; line-height: 44px; color: white; font-weight: 900; font-size: 11px; letter-spacing: 1px;">PDF</div>
                                        </td>
                                        <td valign="middle" style="text-align: left;">
                                            <p class="attachment-filename" style="font-size: 13px; font-weight: 800; color: ${textColor}; letter-spacing: -0.3px; margin: 0;">Invoice-${invoiceNumber}.pdf</p>
                                            <p class="attachment-filetype" style="font-size: 9px; font-weight: 700; color: ${subTextColor}; text-transform: uppercase; letter-spacing: 1.5px; margin: 3px 0 0;">PDF Document • Newbi Entertainment</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td class="attachment-body" style="padding: 20px 20px 10px 20px; background-color: ${cardBg};">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                    <tr>
                                        <td class="attachment-row" style="padding: 10px 0; border-bottom: 1px dashed ${cardBorder};">
                                            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                                <tr>
                                                    <td align="left" class="attachment-label" style="font-size: 10px; font-weight: 800; color: ${subTextColor}; text-transform: uppercase; letter-spacing: 1.5px; text-align: left;">Invoice Number</td>
                                                    <td align="right" class="attachment-value" style="font-size: 13px; font-weight: 700; color: ${textColor}; text-align: right;">${invoiceNumber}</td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="attachment-row" style="padding: 10px 0; border-bottom: 1px dashed ${cardBorder};">
                                            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                                <tr>
                                                    <td align="left" class="attachment-label" style="font-size: 10px; font-weight: 800; color: ${subTextColor}; text-transform: uppercase; letter-spacing: 1.5px; text-align: left;">Client</td>
                                                    <td align="right" class="attachment-value" style="font-size: 13px; font-weight: 700; color: ${textColor}; text-align: right;">${clientName}</td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    ${dueDate ? `
                                    <tr>
                                        <td class="attachment-row" style="padding: 10px 0; border-bottom: none;">
                                            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                                <tr>
                                                    <td align="left" class="attachment-label" style="font-size: 10px; font-weight: 800; color: ${subTextColor}; text-transform: uppercase; letter-spacing: 1.5px; text-align: left;">Due Date</td>
                                                    <td align="right" class="attachment-value" style="font-size: 13px; font-weight: 700; color: ${textColor}; text-align: right;">${dueDate}</td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    ` : ''}
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td class="attachment-total" style="background: ${isDark ? '#0d1f0d' : '#f0fdf4'}; border-top: 2px solid ${NEWBI_GREEN}; padding: 16px 20px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                    <tr>
                                        <td align="left" class="attachment-total-label" style="font-size: 10px; font-weight: 900; color: ${NEWBI_GREEN}; text-transform: uppercase; letter-spacing: 2px; valign: middle; text-align: left;">Total Amount</td>
                                        <td align="right" class="attachment-total-value" style="font-size: 22px; font-weight: 900; color: ${textColor}; letter-spacing: -1px; valign: middle; text-align: right;">₹${amount}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td class="download-row" style="padding: 14px 20px; background: ${isDark ? '#0a0a0a' : '#fafafa'}; border-top: 1px solid ${cardBorder}; text-align: center;">
                                <a href="${invoiceUrl}" class="download-link" style="font-size: 11px; font-weight: 800; color: ${NEWBI_GREEN}; text-decoration: none; text-transform: uppercase; letter-spacing: 1.5px; display: block;">↓ View & Download Invoice</a>
                            </td>
                        </tr>
                    </table>

                    <div style="text-align: center; margin-top: 35px;">
                        <a href="${invoiceUrl}" class="cta-button" style="display: inline-block; padding: 16px 30px; background-color: ${NEWBI_GREEN}; color: #000000 !important; text-decoration: none; font-weight: 700; font-size: 12px; border-radius: 10px; letter-spacing: 1px; text-transform: uppercase;">View Full Invoice</a>
                    </div>
                </div>
                <div class="footer" style="padding: 40px 50px; background-color: ${isDark ? '#050505' : '#fafafa'}; border-top: 1px solid ${borderColor}; text-align: center;">
                    <div class="social-links" style="margin-bottom: 20px;">
                        <a href="https://www.instagram.com/newbi.live" class="social-icon" style="display: inline-block; margin: 0 12px;"><img src="https://img.icons8.com/material-outlined/48/888888/instagram-new.png" class="social-img" style="width: 18px; height: 18px; opacity: 0.6; ${isDark ? 'filter: invert(1);' : ''}" alt="Instagram"></a>
                        <a href="https://linkedin.com/company/newbi-ent" class="social-icon" style="display: inline-block; margin: 0 12px;"><img src="https://img.icons8.com/material-outlined/48/888888/linkedin.png" class="social-img" style="width: 18px; height: 18px; opacity: 0.6; ${isDark ? 'filter: invert(1);' : ''}" alt="LinkedIn"></a>
                        <a href="https://newbi.live" class="social-icon" style="display: inline-block; margin: 0 12px;"><img src="https://img.icons8.com/material-outlined/48/888888/domain.png" class="social-img" style="width: 18px; height: 18px; opacity: 0.6; ${isDark ? 'filter: invert(1);' : ''}" alt="Website"></a>
                    </div>
                    <p class="footer-text" style="font-size: 10px; font-weight: 800; color: #777; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; margin-top: 0;">© ${new Date().getFullYear()} NEWBI ENTERTAINMENT & MARKETING LLP. ALL RIGHTS RESERVED.</p>
                </div>
            </div>
        </body>
        </html>
    `;
};

/**
 * Sends a payment approval notification email to the client.
 */
export const sendPaymentApprovedEmail = async (toEmail, clientName, invoiceNumber, invoiceUrl) => {
    try {
        const rawHtml = generateOfficialHTML({
            headerText: 'Payment Verified Successfully',
            messageBody: `
                <p>Hi <strong>${clientName}</strong>,</p>
                <p>Great news! Your payment for Invoice <strong>#${invoiceNumber}</strong> has been verified and confirmed by our finance team.</p>
                <p>Your invoice status has been updated to <strong style="color: ${NEWBI_GREEN};">PAID</strong>.</p>
                <p>You can view your updated invoice at any time using the button below.</p>
            `,
            category: 'PAYMENT CONFIRMED',
            ctaText: 'View Invoice',
            ctaUrl: invoiceUrl,
            theme: 'light'
        });
        const subject = `Payment Confirmed: Invoice #${invoiceNumber}`;
        const html = injectEmailTracking({
            html: rawHtml,
            trackingId: `pay_approved_${invoiceNumber}`,
            recipientEmail: toEmail,
            campaignId: `PAYMENT_${invoiceNumber}`,
            subject
        });
        const result = await apiFetch('/api/mail', {
            to: toEmail,
            subject,
            fromName: 'Newbi Finance',
            fromEmail: 'partnership@newbi.live',
            html
        });
        return result.success ? { success: true } : { success: false, error: result.error };
    } catch (error) {
        console.error('Failed to send payment approval email:', error);
        return { success: false, error };
    }
};

/**
 * Sends a payment declined notification email to the client.
 */
export const sendPaymentDeclinedEmail = async (toEmail, clientName, invoiceNumber, invoiceUrl) => {
    try {
        const rawHtml = generateOfficialHTML({
            headerText: 'Payment Verification Update',
            messageBody: `
                <p>Hi <strong>${clientName}</strong>,</p>
                <p>We were unable to verify the payment claim for Invoice <strong>#${invoiceNumber}</strong>.</p>
                <p>Your invoice status has been updated to <strong>NOT PAID</strong>. This could be because we haven't received the payment in our records yet.</p>
                <p>If you believe this is an error, please contact us at <a href="mailto:partnership@newbi.live" style="color: ${NEWBI_GREEN}; font-weight: bold;">partnership@newbi.live</a> with your transaction details, and we'll resolve this promptly.</p>
                <p>You can also complete the payment directly via the invoice link below.</p>
            `,
            category: 'ACTION REQUIRED',
            ctaText: 'View Invoice & Pay',
            ctaUrl: invoiceUrl,
            theme: 'light'
        });
        const subject = `Payment Update: Invoice #${invoiceNumber}`;
        const html = injectEmailTracking({
            html: rawHtml,
            trackingId: `pay_declined_${invoiceNumber}`,
            recipientEmail: toEmail,
            campaignId: `PAYMENT_${invoiceNumber}`,
            subject
        });
        const result = await apiFetch('/api/mail', {
            to: toEmail,
            subject,
            fromName: 'Newbi Finance',
            fromEmail: 'partnership@newbi.live',
            html
        });
        return result.success ? { success: true } : { success: false, error: result.error };
    } catch (error) {
        console.error('Failed to send payment declined email:', error);
        return { success: false, error };
    }
};

// Relocated generateOfficialHTML to top of file


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
 * Sends a mass email to multiple recipients.
 * If merge tags (like {{name}}, {{first_name}}, {{email}}, {{role}}) are detected in the subject or body,
 * sends personalized emails per recipient.
 * Otherwise, batches recipients into BCC groups of 45 for max delivery efficiency.
 */
export const sendMassEmail = async (
    recipientList, 
    subject, 
    htmlContent, 
    accountType = 'official', 
    onProgress = null, 
    fromName = null, 
    fromEmail = null,
    mailData = null
) => {
    const BATCH_SIZE = 45;
    const DELAY_BETWEEN_BATCHES_MS = 1500;
    const toAddress = accountType === 'weekly' ? 'weekly@newbi.live' : 'partnership@newbi.live';

    // Parse array of email strings OR recipient objects ({ email, name, displayName, role })
    const normalizedRecipients = (recipientList || []).map(item => {
        if (typeof item === 'string') {
            const trimmed = item.trim().toLowerCase();
            return trimmed ? { email: trimmed, name: '', role: '' } : null;
        }
        if (!item || !item.email) return null;
        return {
            email: item.email.trim().toLowerCase(),
            name: item.displayName || item.name || item.fullName || '',
            role: item.role || item.category || ''
        };
    }).filter(Boolean);

    // Deduplicate by email address
    const uniqueRecipients = Array.from(new Map(normalizedRecipients.map(r => [r.email, r])).values());

    if (uniqueRecipients.length === 0) {
        return { success: false, error: 'No valid recipients' };
    }

    // Generate unique Campaign ID for tracking and analytics
    const campaignId = 'camp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const campaignSentAt = new Date().toISOString();
    const effectiveCategory = mailData?.category === 'CUSTOM' 
        ? (mailData?.customCategory || 'CUSTOM') 
        : (mailData?.category || (accountType === 'weekly' ? 'NEWSLETTER' : 'OFFICIAL'));

    const senderDisplayName = fromName || (accountType === 'weekly' ? 'Weekly by Concert Zone' : 'Newbi Entertainment');
    const senderEmailAddress = fromEmail || (accountType === 'weekly' ? 'weekly@newbi.live' : 'partnership@newbi.live');

    // Create tracking campaign record in Firestore
    if (db) {
        try {
            const campaignRecord = {
                id: campaignId,
                subject: subject || 'Untitled Broadcast',
                category: effectiveCategory,
                senderName: senderDisplayName,
                senderEmail: senderEmailAddress,
                accountType: accountType || 'official',
                recipientType: mailData?.recipientType || (accountType === 'weekly' ? 'subscribers' : 'custom'),
                totalRecipients: uniqueRecipients.length,
                recipients: uniqueRecipients.map(r => ({ email: r.email, name: r.name || '' })),
                sentAt: campaignSentAt,
                status: 'sending',
                opensCount: 0,
                uniqueOpens: 0,
                openedEmails: [],
                clicksCount: 0,
                uniqueClicks: 0,
                clickedEmails: [],
                clickedUrls: [],
                headerText: mailData?.headerText || '',
                ctaText: mailData?.ctaText || '',
                ctaUrl: mailData?.ctaUrl || '',
                theme: mailData?.theme || 'light'
            };
            await setDoc(doc(db, 'email_campaigns', campaignId), campaignRecord, { merge: true });
        } catch (dbErr) {
            console.warn('[Mass Mail] Could not initialize Firestore campaign record:', dbErr.message);
        }
    }

    // Check if subject, htmlContent, or mailData contains merge tags (e.g. {{name}}, {{first_name}}, {{email}}, {{role}})
    const tagRegex = /\{\{?\s*(name|first_name|email|role)\s*\}?\}/i;
    const hasTags = tagRegex.test(subject || '') || 
                     tagRegex.test(htmlContent || '') || 
                     (mailData && (tagRegex.test(mailData.headerText || '') || tagRegex.test(mailData.messageBody || '')));

    if (hasTags) {
        console.log(`[Mass Mail] Personalized Mode enabled for ${uniqueRecipients.length} recipient(s) with Tracking ID: ${campaignId}`);
        let successCount = 0;
        let failCount = 0;
        const errors = [];

        for (let i = 0; i < uniqueRecipients.length; i++) {
            const user = uniqueRecipients[i];
            const userEmail = user.email;
            const fullName = user.name || userEmail.split('@')[0] || 'Subscriber';
            const firstName = fullName.split(' ')[0] || 'Subscriber';
            const userRole = user.role || 'Member';

            const replaceUserTags = (text) => {
                if (!text || typeof text !== 'string') return text;
                return text
                    .replace(/\{\{?\s*name\s*\}?\}/gi, fullName)
                    .replace(/\{\{?\s*first_name\s*\}?\}/gi, firstName)
                    .replace(/\{\{?\s*email\s*\}?\}/gi, userEmail)
                    .replace(/\{\{?\s*role\s*\}?\}/gi, userRole);
            };

            const personalizedSubject = replaceUserTags(subject);
            let personalizedHtml = htmlContent;

            if (mailData) {
                const personalizedMailData = {
                    ...mailData,
                    headerText: replaceUserTags(mailData.headerText || ''),
                    messageBody: replaceUserTags(mailData.messageBody || ''),
                    ctaText: replaceUserTags(mailData.ctaText || '')
                };
                personalizedHtml = generateOfficialHTML(personalizedMailData);
            } else {
                personalizedHtml = replaceUserTags(htmlContent);
            }

            // Inject open tracking pixel and link click tracking for this specific recipient
            const trackedHtml = injectEmailTracking({
                html: personalizedHtml,
                trackingId: campaignId,
                recipientEmail: userEmail,
                campaignId: campaignId,
                subject: personalizedSubject
            });

            try {
                const result = await apiFetch('/api/mail', {
                    to: userEmail,
                    subject: personalizedSubject,
                    html: trackedHtml,
                    accountType: accountType,
                    fromName: fromName,
                    fromEmail: fromEmail,
                    headers: {
                        'List-Unsubscribe': '<https://newbi.live/unsubscribe>'
                    }
                });

                if (result.success) {
                    successCount++;
                    console.log(`[Mass Mail] ✅ Personalized mail ${i + 1}/${uniqueRecipients.length} sent to ${userEmail}`);
                } else {
                    failCount++;
                    errors.push(`${userEmail}: ${result.error}`);
                    console.error(`[Mass Mail] ❌ Personalized mail to ${userEmail} failed:`, result.error);
                }
            } catch (error) {
                failCount++;
                errors.push(`${userEmail}: ${error.message}`);
                console.error(`[Mass Mail] ❌ Personalized mail exception for ${userEmail}:`, error);
            }

            if (onProgress) {
                onProgress({
                    currentBatch: i + 1,
                    totalBatches: uniqueRecipients.length,
                    sent: successCount,
                    failed: failCount,
                    total: uniqueRecipients.length
                });
            }

            // Small throttle delay between individual personalized sends
            if (i < uniqueRecipients.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }

        const allSucceeded = failCount === 0;

        // Update campaign status in Firestore
        if (db) {
            try {
                await updateDoc(doc(db, 'email_campaigns', campaignId), {
                    status: allSucceeded ? 'completed' : 'partially_failed',
                    sentCount: successCount,
                    failedCount: failCount,
                    errors: errors.length > 0 ? errors.slice(0, 50) : []
                });
            } catch (e) {}
        }

        return {
            success: allSucceeded,
            campaignId,
            sent: successCount,
            failed: failCount,
            total: uniqueRecipients.length,
            batches: uniqueRecipients.length,
            error: errors.length > 0 ? errors.join('; ') : undefined
        };
    }

    // Standard BCC Batching mode when no merge tags are present
    const uniqueEmails = uniqueRecipients.map(r => r.email);
    const batches = [];
    for (let i = 0; i < uniqueEmails.length; i += BATCH_SIZE) {
        batches.push(uniqueEmails.slice(i, i + BATCH_SIZE));
    }

    console.log(`[Mass Mail] Standard BCC Mode: Sending to ${uniqueEmails.length} recipients in ${batches.length} batch(es) with Tracking ID: ${campaignId}`);

    let successCount = 0;
    let failCount = 0;
    const errors = [];

    // Inject open tracking and click tracking for campaign
    const trackedHtml = injectEmailTracking({
        html: htmlContent,
        trackingId: campaignId,
        recipientEmail: '',
        campaignId: campaignId,
        subject: subject
    });

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        try {
            const result = await apiFetch('/api/mail', {
                to: toAddress,
                bcc: batch.join(','),
                subject: subject,
                html: trackedHtml,
                accountType: accountType,
                fromName: fromName,
                fromEmail: fromEmail,
                headers: {
                    'List-Unsubscribe': '<https://newbi.live/unsubscribe>'
                }
            });

            if (result.success) {
                successCount += batch.length;
                console.log(`[Mass Mail] ✅ Batch ${i + 1}/${batches.length} sent (${batch.length} recipients)`);
            } else {
                failCount += batch.length;
                errors.push(`Batch ${i + 1}: ${result.error}`);
                console.error(`[Mass Mail] ❌ Batch ${i + 1} failed:`, result.error);
            }
        } catch (error) {
            failCount += batch.length;
            errors.push(`Batch ${i + 1}: ${error.message}`);
            console.error(`[Mass Mail] ❌ Batch ${i + 1} exception:`, error);
        }

        if (onProgress) {
            onProgress({
                currentBatch: i + 1,
                totalBatches: batches.length,
                sent: successCount,
                failed: failCount,
                total: uniqueEmails.length
            });
        }

        if (i < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
        }
    }

    const allSucceeded = failCount === 0;

    // Update campaign status in Firestore
    if (db) {
        try {
            await updateDoc(doc(db, 'email_campaigns', campaignId), {
                status: allSucceeded ? 'completed' : 'partially_failed',
                sentCount: successCount,
                failedCount: failCount,
                errors: errors.length > 0 ? errors.slice(0, 50) : []
            });
        } catch (e) {}
    }

    return {
        success: allSucceeded,
        campaignId,
        sent: successCount,
        failed: failCount,
        total: uniqueEmails.length,
        batches: batches.length,
        error: errors.length > 0 ? errors.join('; ') : undefined
    };
};

export const NEON_PURPLE = '#A855F7';

/**
 * Generates the HTML for a proposal email with attachment-style proposal card.
 * Professional template with editable content, proposal details, and download link.
 */
export const generateProposalEmailHTML = (data) => {
    const {
        headerText = "Strategic Proposal Ready",
        messageBody = "",
        proposalNumber = "PROP-0000",
        clientName = "Client",
        projectName = "",
        proposalUrl = "#",
        theme = "light",
        isPreview = false
    } = data;

    const formattedBody = formatEmailBodyHtml(messageBody);

    const isDark = theme === 'dark';
    const bgColor = isDark ? '#000000' : '#fcfcfc';
    const containerBg = isDark ? '#0a0a0a' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#111111';
    const subTextColor = isDark ? '#888888' : '#444444';
    const borderColor = isDark ? '#1a1a1a' : '#eaeaea';
    const cardBg = isDark ? '#111111' : '#f8f9fa';
    const cardBorder = isDark ? '#1e1e1e' : '#e5e7eb';
    const baseUrl = getBaseUrl();
    
    // Header background is always dark to avoid a mismatched logo/header in dark mode
    const headerBg = '#0a0a0a';
    const headerBorder = '#1a1a1a';
    const logoUrl = `${baseUrl}/69c6b548-01d8-4fd3-9813-9cc53fa40498.png`;

    const mediaQueries = (isPreview || isDark) ? '' : `
        @media (prefers-color-scheme: dark) {
            body { background-color: #000000 !important; color: #ffffff !important; }
            .container { background-color: #0a0a0a !important; border-color: #1a1a1a !important; color: #ffffff !important; }
            .title { color: #ffffff !important; }
            .body-text { color: #888888 !important; }
            .footer { background-color: #050505 !important; border-color: #1a1a1a !important; }
            .social-img { filter: invert(1) !important; }
            .category-badge { background: ${NEWBI_GREEN} !important; }
            .attachment-card { background: #111111 !important; border-color: #1e1e1e !important; }
            .attachment-label { color: #888888 !important; }
            .attachment-value { color: #ffffff !important; }
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
            <style>
                .preheader { display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; }
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: ${bgColor}; color: ${textColor}; margin: 0; padding: 0; }
                .container { width: 100%; max-width: 600px; margin: 40px auto; background-color: ${containerBg}; border: 1px solid ${borderColor}; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.02); }
                .header { padding: 40px; background-color: ${headerBg}; border-bottom: 1px solid ${headerBorder}; text-align: left; }
                .content { padding: 50px; text-align: left; }
                .category-badge { display: inline-block; padding: 6px 12px; background: ${NEWBI_GREEN}; color: #000000; font-size: 9px; font-weight: 900; border-radius: 6px; letter-spacing: 2px; margin-bottom: 20px; text-transform: uppercase; }
                .title { font-size: 28px; font-weight: 800; color: ${textColor}; margin-bottom: 24px; line-height: 1.2; letter-spacing: -0.5px; }
                .body-text { color: ${subTextColor}; font-size: 15px; line-height: 1.6; font-weight: 400; margin-bottom: 30px; }
                .body-text img, .content img { max-width: 100% !important; height: auto !important; border-radius: 10px; margin: 15px 0; display: block; }
                .body-text ul, .content ul { list-style-type: disc !important; padding-left: 20px !important; margin-top: 10px !important; margin-bottom: 10px !important; }
                .body-text ol, .content ol { list-style-type: decimal !important; padding-left: 20px !important; margin-top: 10px !important; margin-bottom: 10px !important; }
                .body-text li, .content li { margin-bottom: 5px !important; line-height: 1.6 !important; }
                
                /* Attachment Card - Table layout compatible */
                .attachment-card { background: ${cardBg}; border: 1px solid ${cardBorder}; border-radius: 16px; overflow: hidden; margin: 30px 0; }
                .attachment-header { padding: 16px 20px; border-bottom: 1px solid ${cardBorder}; }
                .attachment-icon { width: 44px; height: 44px; background: linear-gradient(135deg, #39FF14, #1b7a0a); border-radius: 10px; text-align: center; line-height: 44px; color: black; font-weight: 900; font-size: 11px; letter-spacing: 1px; }
                .attachment-filename { font-size: 13px; font-weight: 800; color: ${textColor}; letter-spacing: -0.3px; margin: 0; }
                .attachment-filetype { font-size: 9px; font-weight: 700; color: ${subTextColor}; text-transform: uppercase; letter-spacing: 1.5px; margin: 3px 0 0; }
                .attachment-body { padding: 20px 20px 10px 20px; }
                .attachment-row { padding: 10px 0; }
                .attachment-label { font-size: 10px; font-weight: 800; color: ${subTextColor}; text-transform: uppercase; letter-spacing: 1.5px; }
                .attachment-value { font-size: 13px; font-weight: 700; color: ${textColor}; }
                
                .cta-button { display: inline-block; padding: 16px 30px; background-color: ${NEWBI_GREEN}; color: #000000 !important; text-decoration: none; font-weight: 700; font-size: 12px; border-radius: 10px; letter-spacing: 1px; text-transform: uppercase; }
                .download-row { padding: 14px 20px; background: ${isDark ? '#0a0a0a' : '#fafafa'}; border-top: 1px solid ${cardBorder}; text-align: center; }
                .download-link { font-size: 11px; font-weight: 800; color: ${NEWBI_GREEN}; text-decoration: none; text-transform: uppercase; letter-spacing: 1.5px; }
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
            <span class="preheader">Proposal ${proposalNumber} for ${clientName}</span>
            <div class="container" style="width: 100%; max-width: 600px; margin: 40px auto; background-color: ${containerBg}; border: 1px solid ${borderColor}; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.02); color: ${textColor};">
                <div class="header" style="padding: 40px; background-color: ${headerBg}; border-bottom: 1px solid ${headerBorder}; text-align: left;">
                    <!-- Brand Logo -->
                    <img src="${baseUrl}/69c6b548-01d8-4fd3-9813-9cc53fa40498.png" alt="Newbi" style="display: block; margin: 0; height: 25px; width: auto; max-width: 180px;">
                </div>
                <div class="content" style="padding: 50px; text-align: left;">
                    <div class="category-badge" style="display: inline-block; padding: 6px 12px; background: ${NEWBI_GREEN}; color: #000000; font-size: 9px; font-weight: 900; border-radius: 6px; letter-spacing: 2px; margin-bottom: 20px; text-transform: uppercase;">PROPOSAL</div>
                    <h1 class="title" style="font-size: 28px; font-weight: 800; color: ${textColor}; margin-bottom: 24px; line-height: 1.2; letter-spacing: -0.5px; margin-top: 0;">${headerText}</h1>
                    <div class="body-text" style="color: ${subTextColor}; font-size: 15px; line-height: 1.6; font-weight: 400; margin-bottom: 30px;">${formattedBody}</div>

                    <!-- Attachment-Style Proposal Card (Table-based) -->
                    <table class="attachment-card" width="100%" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; background: ${cardBg}; border: 1px solid ${cardBorder}; border-radius: 16px; margin: 30px 0; overflow: hidden;">
                        <tr>
                            <td class="attachment-header" style="padding: 16px 20px; border-bottom: 1px solid ${cardBorder};">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                    <tr>
                                        <td width="44" valign="middle" style="width: 44px; padding-right: 14px;">
                                            <div class="attachment-icon" style="width: 44px; height: 44px; background: linear-gradient(135deg, #39FF14, #1b7a0a); border-radius: 10px; text-align: center; line-height: 44px; color: black; font-weight: 900; font-size: 11px; letter-spacing: 1px;">PDF</div>
                                        </td>
                                        <td valign="middle">
                                            <p class="attachment-filename" style="font-size: 13px; font-weight: 800; color: ${textColor}; letter-spacing: -0.3px; margin: 0;">Proposal-${proposalNumber}.pdf</p>
                                            <p class="attachment-filetype" style="font-size: 9px; font-weight: 700; color: ${subTextColor}; text-transform: uppercase; letter-spacing: 1.5px; margin: 3px 0 0;">PDF Document • Newbi Entertainment</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td class="attachment-body" style="padding: 20px 20px 10px 20px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                    <tr>
                                        <td class="attachment-row" style="padding: 10px 0; border-bottom: 1px dashed ${cardBorder};">
                                            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                                <tr>
                                                    <td align="left" class="attachment-label" style="font-size: 10px; font-weight: 800; color: ${subTextColor}; text-transform: uppercase; letter-spacing: 1.5px;">Proposal Number</td>
                                                    <td align="right" class="attachment-value" style="font-size: 13px; font-weight: 700; color: ${textColor};">${proposalNumber}</td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="attachment-row" style="padding: 10px 0; border-bottom: ${projectName ? `1px dashed ${cardBorder}` : 'none'};">
                                            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                                <tr>
                                                    <td align="left" class="attachment-label" style="font-size: 10px; font-weight: 800; color: ${subTextColor}; text-transform: uppercase; letter-spacing: 1.5px;">Client</td>
                                                    <td align="right" class="attachment-value" style="font-size: 13px; font-weight: 700; color: ${textColor};">${clientName}</td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    ${projectName ? `
                                    <tr>
                                        <td class="attachment-row" style="padding: 10px 0; border-bottom: none;">
                                            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                                <tr>
                                                    <td align="left" class="attachment-label" style="font-size: 10px; font-weight: 800; color: ${subTextColor}; text-transform: uppercase; letter-spacing: 1.5px;">Project</td>
                                                    <td align="right" class="attachment-value" style="font-size: 13px; font-weight: 700; color: ${textColor};">${projectName}</td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    ` : ''}
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td class="download-row" style="padding: 14px 20px; background: ${isDark ? '#0a0a0a' : '#fafafa'}; border-top: 1px solid ${cardBorder}; text-align: center;">
                                <a href="${proposalUrl}" class="download-link" style="font-size: 11px; font-weight: 800; color: ${NEWBI_GREEN}; text-decoration: none; text-transform: uppercase; letter-spacing: 1.5px; display: block;">↓ View & Review Proposal</a>
                            </td>
                        </tr>
                    </table>

                    <div style="text-align: center; margin-top: 35px;">
                        <a href="${proposalUrl}" class="cta-button" style="display: inline-block; padding: 16px 30px; background-color: ${NEWBI_GREEN}; color: #000000 !important; text-decoration: none; font-weight: 700; font-size: 12px; border-radius: 10px; letter-spacing: 1px; text-transform: uppercase;">View Full Proposal</a>
                    </div>
                </div>
                <div class="footer" style="padding: 40px 50px; background-color: ${isDark ? '#050505' : '#fafafa'}; border-top: 1px solid ${borderColor}; text-align: center;">
                    <div class="social-links" style="margin-bottom: 20px;">
                        <a href="https://www.instagram.com/newbi.live" class="social-icon" style="display: inline-block; margin: 0 12px;"><img src="https://img.icons8.com/material-outlined/48/888888/instagram-new.png" class="social-img" style="width: 18px; height: 18px; opacity: 0.6; ${isDark ? 'filter: invert(1);' : ''}" alt="Instagram"></a>
                        <a href="https://linkedin.com/company/newbi-ent" class="social-icon" style="display: inline-block; margin: 0 12px;"><img src="https://img.icons8.com/material-outlined/48/888888/linkedin.png" class="social-img" style="width: 18px; height: 18px; opacity: 0.6; ${isDark ? 'filter: invert(1);' : ''}" alt="LinkedIn"></a>
                        <a href="https://newbi.live" class="social-icon" style="display: inline-block; margin: 0 12px;"><img src="https://img.icons8.com/material-outlined/48/888888/domain.png" class="social-img" style="width: 18px; height: 18px; opacity: 0.6; ${isDark ? 'filter: invert(1);' : ''}" alt="Website"></a>
                    </div>
                    <p class="footer-text" style="font-size: 10px; font-weight: 800; color: #777; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; margin-top: 0;">© ${new Date().getFullYear()} NEWBI ENTERTAINMENT & MARKETING LLP. ALL RIGHTS RESERVED.</p>
                </div>
            </div>
        </body>
        </html>
    `;
};

/**
 * Generates the HTML for an agreement email with attachment-style contract card.
 * Professional template with editable content, agreement details, and signing link.
 */
export const generateAgreementEmailHTML = (data) => {
    const {
        headerText = "Agreement Ready for Review",
        messageBody = "",
        agreementNumber = "AGR-0000",
        secondPartyName = "Client",
        projectName = "",
        effectiveDate = "",
        agreementUrl = "#",
        theme = "light",
        isPreview = false
    } = data;

    const isDark = theme === 'dark';
    const bgColor = isDark ? '#000000' : '#fcfcfc';
    const containerBg = isDark ? '#0a0a0a' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#111111';
    const subTextColor = isDark ? '#888888' : '#444444';
    const borderColor = isDark ? '#1a1a1a' : '#eaeaea';
    const cardBg = isDark ? '#111111' : '#f8f9fa';
    const cardBorder = isDark ? '#1e1e1e' : '#e5e7eb';
    const baseUrl = getBaseUrl();
    
    // Header background is always dark to avoid a mismatched logo/header in dark mode
    const headerBg = '#0a0a0a';
    const headerBorder = '#1a1a1a';
    const logoUrl = `${baseUrl}/69c6b548-01d8-4fd3-9813-9cc53fa40498.png`;

    const mediaQueries = (isPreview || isDark) ? '' : `
        @media (prefers-color-scheme: dark) {
            body { background-color: #000000 !important; color: #ffffff !important; }
            .container { background-color: #0a0a0a !important; border-color: #1a1a1a !important; color: #ffffff !important; }
            .title { color: #ffffff !important; }
            .body-text { color: #888888 !important; }
            .footer { background-color: #050505 !important; border-color: #1a1a1a !important; }
            .social-img { filter: invert(1) !important; }
            .header img { filter: invert(1) brightness(1.2) !important; }
            .category-badge { background: ${NEON_PURPLE} !important; }
            .attachment-card { background: #111111 !important; border-color: #1e1e1e !important; }
            .attachment-label { color: #888888 !important; }
            .attachment-value { color: #ffffff !important; }
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
            <style>
                .preheader { display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; }
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: ${bgColor}; color: ${textColor}; margin: 0; padding: 0; }
                .container { width: 100%; max-width: 600px; margin: 40px auto; background-color: ${containerBg}; border: 1px solid ${borderColor}; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.02); }
                .header { padding: 40px; background-color: ${headerBg}; border-bottom: 1px solid ${headerBorder}; text-align: left; }
                .content { padding: 50px; text-align: left; }
                .category-badge { display: inline-block; padding: 6px 12px; background: ${NEON_PURPLE}; color: #ffffff; font-size: 9px; font-weight: 900; border-radius: 6px; letter-spacing: 2px; margin-bottom: 20px; text-transform: uppercase; }
                .title { font-size: 28px; font-weight: 800; color: ${textColor}; margin-bottom: 24px; line-height: 1.2; letter-spacing: -0.5px; }
                .body-text { color: ${subTextColor}; font-size: 15px; line-height: 1.6; font-weight: 400; margin-bottom: 30px; }
                .body-text ul, .content ul { list-style-type: disc !important; padding-left: 20px !important; margin-top: 10px !important; margin-bottom: 10px !important; }
                .body-text ol, .content ol { list-style-type: decimal !important; padding-left: 20px !important; margin-top: 10px !important; margin-bottom: 10px !important; }
                .body-text li, .content li { margin-bottom: 5px !important; line-height: 1.6 !important; }
                
                /* Attachment Card - Table layout compatible */
                .attachment-card { background: ${cardBg}; border: 1px solid ${cardBorder}; border-radius: 16px; overflow: hidden; margin: 30px 0; }
                .attachment-header { padding: 16px 20px; border-bottom: 1px solid ${cardBorder}; }
                .attachment-icon { width: 44px; height: 44px; background: linear-gradient(135deg, #A855F7, #6B21A8); border-radius: 10px; text-align: center; line-height: 44px; color: white; font-weight: 900; font-size: 11px; letter-spacing: 1px; }
                .attachment-filename { font-size: 13px; font-weight: 800; color: ${textColor}; letter-spacing: -0.3px; margin: 0; }
                .attachment-filetype { font-size: 9px; font-weight: 700; color: ${subTextColor}; text-transform: uppercase; letter-spacing: 1.5px; margin: 3px 0 0; }
                .attachment-body { padding: 20px 20px 10px 20px; }
                .attachment-row { padding: 10px 0; }
                .attachment-label { font-size: 10px; font-weight: 800; color: ${subTextColor}; text-transform: uppercase; letter-spacing: 1.5px; }
                .attachment-value { font-size: 13px; font-weight: 700; color: ${textColor}; }
                
                .cta-button { display: inline-block; padding: 16px 30px; background-color: ${NEON_PURPLE}; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 12px; border-radius: 10px; letter-spacing: 1px; text-transform: uppercase; }
                .download-row { padding: 14px 20px; background: ${isDark ? '#0a0a0a' : '#fafafa'}; border-top: 1px solid ${cardBorder}; text-align: center; }
                .download-link { font-size: 11px; font-weight: 800; color: ${NEON_PURPLE}; text-decoration: none; text-transform: uppercase; letter-spacing: 1.5px; }
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
            <span class="preheader">Contract ${agreementNumber} — ${secondPartyName}</span>
            <div class="container" style="width: 100%; max-width: 600px; margin: 40px auto; background-color: ${containerBg}; border: 1px solid ${borderColor}; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.02); color: ${textColor};">
                <div class="header" style="padding: 40px; background-color: ${headerBg}; border-bottom: 1px solid ${headerBorder}; text-align: left;">
                    <!-- Brand Logo -->
                    <img src="${baseUrl}/logo_full.png" alt="Newbi" style="display: block; margin: 0; height: 25px; width: auto; max-width: 180px;">
                </div>
                <div class="content" style="padding: 50px; text-align: left;">
                    <div class="category-badge" style="display: inline-block; padding: 6px 12px; background: ${NEON_PURPLE}; color: #ffffff; font-size: 9px; font-weight: 900; border-radius: 6px; letter-spacing: 2px; margin-bottom: 20px; text-transform: uppercase;">CONTRACT</div>
                    <h1 class="title" style="font-size: 28px; font-weight: 800; color: ${textColor}; margin-bottom: 24px; line-height: 1.2; letter-spacing: -0.5px; margin-top: 0;">${headerText}</h1>
                    <div class="body-text" style="color: ${subTextColor}; font-size: 15px; line-height: 1.6; font-weight: 400; margin-bottom: 30px;">${messageBody}</div>

                    <!-- Attachment-Style Agreement Card (Table-based) -->
                    <table class="attachment-card" width="100%" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; background: ${cardBg}; border: 1px solid ${cardBorder}; border-radius: 16px; margin: 30px 0; overflow: hidden;">
                        <tr>
                            <td class="attachment-header" style="padding: 16px 20px; border-bottom: 1px solid ${cardBorder};">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                    <tr>
                                        <td width="44" valign="middle" style="width: 44px; padding-right: 14px;">
                                            <div class="attachment-icon" style="width: 44px; height: 44px; background: linear-gradient(135deg, #A855F7, #6B21A8); border-radius: 10px; text-align: center; line-height: 44px; color: white; font-weight: 900; font-size: 11px; letter-spacing: 1px;">PDF</div>
                                        </td>
                                        <td valign="middle">
                                            <p class="attachment-filename" style="font-size: 13px; font-weight: 800; color: ${textColor}; letter-spacing: -0.3px; margin: 0;">Agreement-${agreementNumber}.pdf</p>
                                            <p class="attachment-filetype" style="font-size: 9px; font-weight: 700; color: ${subTextColor}; text-transform: uppercase; letter-spacing: 1.5px; margin: 3px 0 0;">PDF Document • Newbi Entertainment</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td class="attachment-body" style="padding: 20px 20px 10px 20px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                    <tr>
                                        <td class="attachment-row" style="padding: 10px 0; border-bottom: 1px dashed ${cardBorder};">
                                            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                                <tr>
                                                    <td align="left" class="attachment-label" style="font-size: 10px; font-weight: 800; color: ${subTextColor}; text-transform: uppercase; letter-spacing: 1.5px;">Agreement Number</td>
                                                    <td align="right" class="attachment-value" style="font-size: 13px; font-weight: 700; color: ${textColor};">${agreementNumber}</td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="attachment-row" style="padding: 10px 0; border-bottom: ${projectName || effectiveDate ? `1px dashed ${cardBorder}` : 'none'};">
                                            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                                <tr>
                                                    <td align="left" class="attachment-label" style="font-size: 10px; font-weight: 800; color: ${subTextColor}; text-transform: uppercase; letter-spacing: 1.5px;">Second Party</td>
                                                    <td align="right" class="attachment-value" style="font-size: 13px; font-weight: 700; color: ${textColor};">${secondPartyName}</td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    ${projectName ? `
                                    <tr>
                                        <td class="attachment-row" style="padding: 10px 0; border-bottom: ${effectiveDate ? `1px dashed ${cardBorder}` : 'none'};">
                                            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                                <tr>
                                                    <td align="left" class="attachment-label" style="font-size: 10px; font-weight: 800; color: ${subTextColor}; text-transform: uppercase; letter-spacing: 1.5px;">Project</td>
                                                    <td align="right" class="attachment-value" style="font-size: 13px; font-weight: 700; color: ${textColor};">${projectName}</td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    ` : ''}
                                    ${effectiveDate ? `
                                    <tr>
                                        <td class="attachment-row" style="padding: 10px 0; border-bottom: none;">
                                            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                                <tr>
                                                    <td align="left" class="attachment-label" style="font-size: 10px; font-weight: 800; color: ${subTextColor}; text-transform: uppercase; letter-spacing: 1.5px;">Effective Date</td>
                                                    <td align="right" class="attachment-value" style="font-size: 13px; font-weight: 700; color: ${textColor};">${effectiveDate}</td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    ` : ''}
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td class="download-row" style="padding: 14px 20px; background: ${isDark ? '#0a0a0a' : '#fafafa'}; border-top: 1px solid ${cardBorder}; text-align: center;">
                                <a href="${agreementUrl}" class="download-link" style="font-size: 11px; font-weight: 800; color: ${NEON_PURPLE}; text-decoration: none; text-transform: uppercase; letter-spacing: 1.5px; display: block;">↓ View & Sign Agreement</a>
                            </td>
                        </tr>
                    </table>

                    <div style="text-align: center; margin-top: 35px;">
                        <a href="${agreementUrl}" class="cta-button" style="display: inline-block; padding: 16px 30px; background-color: ${NEON_PURPLE}; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 12px; border-radius: 10px; letter-spacing: 1px; text-transform: uppercase;">View &amp; Sign Agreement</a>
                    </div>
                </div>
                <div class="footer" style="padding: 40px 50px; background-color: ${isDark ? '#050505' : '#fafafa'}; border-top: 1px solid ${borderColor}; text-align: center;">
                    <div class="social-links" style="margin-bottom: 20px;">
                        <a href="https://www.instagram.com/newbi.live" class="social-icon" style="display: inline-block; margin: 0 12px;"><img src="https://img.icons8.com/material-outlined/48/888888/instagram-new.png" class="social-img" style="width: 18px; height: 18px; opacity: 0.6; ${isDark ? 'filter: invert(1);' : ''}" alt="Instagram"></a>
                        <a href="https://linkedin.com/company/newbi-ent" class="social-icon" style="display: inline-block; margin: 0 12px;"><img src="https://img.icons8.com/material-outlined/48/888888/linkedin.png" class="social-img" style="width: 18px; height: 18px; opacity: 0.6; ${isDark ? 'filter: invert(1);' : ''}" alt="LinkedIn"></a>
                        <a href="https://newbi.live" class="social-icon" style="display: inline-block; margin: 0 12px;"><img src="https://img.icons8.com/material-outlined/48/888888/domain.png" class="social-img" style="width: 18px; height: 18px; opacity: 0.6; ${isDark ? 'filter: invert(1);' : ''}" alt="Website"></a>
                    </div>
                    <p class="footer-text" style="font-size: 10px; font-weight: 800; color: #777; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; margin-top: 0;">© ${new Date().getFullYear()} NEWBI ENTERTAINMENT & MARKETING LLP. ALL RIGHTS RESERVED.</p>
                </div>
            </div>
        </body>
        </html>
    `;
};

/**
 * Generates the HTML for a payment receipt email.
 * Premium theme, compatible with light and dark mode templates.
 */
export const generateReceiptEmailHTML = (data) => {
    const {
        headerText = "Disbursement Voucher Approved",
        messageBody = "",
        reference = "N/A",
        receiverName = "Payee",
        amount = "0",
        date = "",
        paymentMode = "UPI",
        verifyUrl = "#",
        theme = "dark",
        isPreview = false
    } = data;

    const isDark = theme === 'dark';
    const bgColor = isDark ? '#000000' : '#fcfcfc';
    const containerBg = isDark ? '#0a0a0a' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#111111';
    const subTextColor = isDark ? '#888888' : '#444444';
    const borderColor = isDark ? '#1a1a1a' : '#eaeaea';
    const cardBg = isDark ? '#111111' : '#f8f9fa';
    const cardBorder = isDark ? '#1e1e1e' : '#e5e7eb';
    const baseUrl = getBaseUrl();
    
    // Header background is always dark to avoid a mismatched logo/header in dark mode
    const headerBg = '#0a0a0a';
    const headerBorder = '#1a1a1a';
    const logoUrl = `${baseUrl}/logo_full.png`;

    const mediaQueries = (isPreview || isDark) ? '' : `
        @media (prefers-color-scheme: dark) {
            body { background-color: #000000 !important; color: #ffffff !important; }
            .container { background-color: #0a0a0a !important; border-color: #1a1a1a !important; color: #ffffff !important; }
            .title { color: #ffffff !important; }
            .body-text { color: #888888 !important; }
            .footer { background-color: #050505 !important; border-color: #1a1a1a !important; }
            .social-img { filter: invert(1) !important; }
            .attachment-card { background: #111111 !important; }
            .attachment-label { color: #888888 !important; }
            .attachment-value { color: #ffffff !important; }
            .attachment-total { background: #0d1f0d !important; }
            .attachment-total-value { color: #ffffff !important; }
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
            <style>
                .preheader { display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; }
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: ${bgColor}; color: ${textColor}; margin: 0; padding: 0; }
                .container { width: 100%; max-width: 600px; margin: 40px auto; background-color: ${containerBg}; border: 1px solid ${borderColor}; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.02); }
                .header { padding: 40px; background-color: ${headerBg}; border-bottom: 1px solid ${headerBorder}; text-align: left; }
                .content { padding: 50px; text-align: left; }
                .category-badge { display: inline-block; padding: 6px 12px; background: ${NEWBI_GREEN}; color: #000000; font-size: 9px; font-weight: 900; border-radius: 6px; letter-spacing: 2px; margin-bottom: 20px; text-transform: uppercase; }
                .title { font-size: 28px; font-weight: 800; color: ${textColor}; margin-bottom: 24px; line-height: 1.2; letter-spacing: -0.5px; }
                .body-text { color: ${subTextColor}; font-size: 15px; line-height: 1.6; font-weight: 400; margin-bottom: 30px; }
                .body-text ul, .content ul { list-style-type: disc !important; padding-left: 20px !important; margin-top: 10px !important; margin-bottom: 10px !important; }
                .body-text ol, .content ol { list-style-type: decimal !important; padding-left: 20px !important; margin-top: 10px !important; margin-bottom: 10px !important; }
                .body-text li, .content li { margin-bottom: 5px !important; line-height: 1.6 !important; }
                
                /* Receipt Attachment Card */
                .attachment-card { background: ${cardBg}; border: 1px solid ${cardBorder}; border-top: none; border-bottom: none; border-radius: 0; overflow: visible; margin: 30px 0; }
                .attachment-header { padding: 16px 20px; border-bottom: 1px solid ${cardBorder}; }
                .attachment-icon { width: 44px; height: 44px; background: linear-gradient(135deg, #10b981, #047857); border-radius: 10px; text-align: center; line-height: 44px; color: white; font-weight: 900; font-size: 11px; letter-spacing: 1px; }
                .attachment-filename { font-size: 13px; font-weight: 800; color: ${textColor}; letter-spacing: -0.3px; margin: 0; }
                .attachment-filetype { font-size: 9px; font-weight: 700; color: ${subTextColor}; text-transform: uppercase; letter-spacing: 1.5px; margin: 3px 0 0; }
                .attachment-body { padding: 20px 20px 10px 20px; }
                .attachment-row { padding: 10px 0; }
                .attachment-label { font-size: 10px; font-weight: 800; color: ${subTextColor}; text-transform: uppercase; letter-spacing: 1.5px; }
                .attachment-value { font-size: 13px; font-weight: 700; color: ${textColor}; }
                .attachment-total { background: ${isDark ? '#0d1f0d' : '#f0fdf4'}; border-top: 2px solid ${NEWBI_GREEN}; padding: 16px 20px; }
                .attachment-total-label { font-size: 10px; font-weight: 900; color: ${NEWBI_GREEN}; text-transform: uppercase; letter-spacing: 2px; }
                .attachment-total-value { font-size: 22px; font-weight: 900; color: ${textColor}; letter-spacing: -1px; }
                
                .cta-button { display: inline-block; padding: 16px 30px; background-color: ${NEWBI_GREEN}; color: #000000 !important; text-decoration: none; font-weight: 700; font-size: 12px; border-radius: 10px; letter-spacing: 1px; text-transform: uppercase; }
                .download-row { padding: 14px 20px; background: ${isDark ? '#0a0a0a' : '#fafafa'}; border-top: 1px solid ${cardBorder}; text-align: center; }
                .download-link { font-size: 11px; font-weight: 800; color: ${NEWBI_GREEN}; text-decoration: none; text-transform: uppercase; letter-spacing: 1.5px; }
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
            <span class="preheader">Payout Receipt ${reference} to ${receiverName} — ₹${amount}</span>
            <div class="container" style="width: 100%; max-width: 600px; margin: 40px auto; background-color: ${containerBg}; border: 1px solid ${borderColor}; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.02); color: ${textColor};">
                <div class="header" style="padding: 40px; background-color: ${headerBg}; border-bottom: 1px solid ${headerBorder}; text-align: left;">
                    <!-- Brand Logo -->
                    <img src="${baseUrl}/logo_full.png" alt="Newbi" style="display: block; margin: 0; height: 25px; width: auto; max-width: 180px;">
                </div>
                <div class="content" style="padding: 50px; text-align: left;">
                    <div class="category-badge" style="display: inline-block; padding: 6px 12px; background: ${NEWBI_GREEN}; color: #000000; font-size: 9px; font-weight: 900; border-radius: 6px; letter-spacing: 2px; margin-bottom: 20px; text-transform: uppercase;">PAYOUT RECEIPT</div>
                    <h1 class="title" style="font-size: 28px; font-weight: 800; color: ${textColor}; margin-bottom: 24px; line-height: 1.2; letter-spacing: -0.5px; margin-top: 0;">${headerText}</h1>
                    <div class="body-text" style="color: ${subTextColor}; font-size: 15px; line-height: 1.6; font-weight: 400; margin-bottom: 30px;">${messageBody}</div>

                    <!-- Attachment-Style Receipt Card -->
                    <table class="attachment-card" width="100%" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; background: ${cardBg}; border: 1px solid ${cardBorder}; border-top: none; border-bottom: none; border-radius: 0; margin: 30px 0; overflow: visible;">
                        <tr>
                            <td style="background: ${containerBg}; padding: 0; margin: 0; line-height: 0; font-size: 0; vertical-align: top;">
                                <div style="width: 100%; height: 14px; overflow: hidden; margin: 0; padding: 0; line-height: 0; font-size: 0;">
                                    <svg viewBox="0 0 300 14" preserveAspectRatio="none" style="width: 100%; height: 14px; display: block; margin: 0; padding: 0;">
                                        <path d="M 300 14 L 0 14 L 0 0 L 5 9 L 10 0 L 15 9 L 20 0 L 25 9 L 30 0 L 35 9 L 40 0 L 45 9 L 50 0 L 55 9 L 60 0 L 65 9 L 70 0 L 75 9 L 80 0 L 85 9 L 90 0 L 95 9 L 100 0 L 105 9 L 110 0 L 115 9 L 120 0 L 125 9 L 130 0 L 135 9 L 140 0 L 145 9 L 150 0 L 155 9 L 160 0 L 165 9 L 170 0 L 175 9 L 180 0 L 185 9 L 190 0 L 195 9 L 200 0 L 205 9 L 210 0 L 215 9 L 220 0 L 225 9 L 230 0 L 235 9 L 240 0 L 245 9 L 250 0 L 255 9 L 260 0 L 265 9 L 270 0 L 275 9 L 280 0 L 285 9 L 290 0 L 295 9 L 300 0 Z" fill="${cardBg}" />
                                        <path d="M 0 0 L 5 9 L 10 0 L 15 9 L 20 0 L 25 9 L 30 0 L 35 9 L 40 0 L 45 9 L 50 0 L 55 9 L 60 0 L 65 9 L 70 0 L 75 9 L 80 0 L 85 9 L 90 0 L 95 9 L 100 0 L 105 9 L 110 0 L 115 9 L 120 0 L 125 9 L 130 0 L 135 9 L 140 0 L 145 9 L 150 0 L 155 9 L 160 0 L 165 9 L 170 0 L 175 9 L 180 0 L 185 9 L 190 0 L 195 9 L 200 0 L 205 9 L 210 0 L 215 9 L 220 0 L 225 9 L 230 0 L 235 9 L 240 0 L 245 9 L 250 0 L 255 9 L 260 0 L 265 9 L 270 0 L 275 9 L 280 0 L 285 9 L 290 0 L 295 9 L 300 0" fill="none" stroke="${cardBorder}" stroke-width="1.5" stroke-linejoin="round" />
                                    </svg>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td class="attachment-header" style="padding: 16px 20px; border-bottom: 1px solid ${cardBorder};">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                    <tr>
                                        <td width="44" valign="middle" style="width: 44px; padding-right: 14px;">
                                            <div class="attachment-icon" style="width: 44px; height: 44px; background: linear-gradient(135deg, #10b981, #047857); border-radius: 10px; text-align: center; line-height: 44px; color: white; font-weight: 900; font-size: 11px; letter-spacing: 1px;">REC</div>
                                        </td>
                                        <td valign="middle">
                                            <p class="attachment-filename" style="font-size: 13px; font-weight: 800; color: ${textColor}; letter-spacing: -0.3px; margin: 0;">Receipt-${reference}.png</p>
                                            <p class="attachment-filetype" style="font-size: 9px; font-weight: 700; color: ${subTextColor}; text-transform: uppercase; letter-spacing: 1.5px; margin: 3px 0 0;">Transaction Receipt • Newbi Entertainment</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td class="attachment-body" style="padding: 20px 20px 10px 20px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                    <tr>
                                        <td class="attachment-row" style="padding: 10px 0; border-bottom: 1px dashed ${cardBorder};">
                                            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                                <tr>
                                                    <td align="left" class="attachment-label" style="font-size: 10px; font-weight: 800; color: ${subTextColor}; text-transform: uppercase; letter-spacing: 1.5px;">Reference Number</td>
                                                    <td align="right" class="attachment-value" style="font-size: 13px; font-weight: 700; color: ${textColor};">${reference}</td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="attachment-row" style="padding: 10px 0; border-bottom: 1px dashed ${cardBorder};">
                                            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                                <tr>
                                                    <td align="left" class="attachment-label" style="font-size: 10px; font-weight: 800; color: ${subTextColor}; text-transform: uppercase; letter-spacing: 1.5px;">Payee</td>
                                                    <td align="right" class="attachment-value" style="font-size: 13px; font-weight: 700; color: ${textColor};">${receiverName}</td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="attachment-row" style="padding: 10px 0; border-bottom: 1px dashed ${cardBorder};">
                                            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                                <tr>
                                                    <td align="left" class="attachment-label" style="font-size: 10px; font-weight: 800; color: ${subTextColor}; text-transform: uppercase; letter-spacing: 1.5px;">Payment Date</td>
                                                    <td align="right" class="attachment-value" style="font-size: 13px; font-weight: 700; color: ${textColor};">${date}</td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="attachment-row" style="padding: 10px 0; border-bottom: none;">
                                            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                                <tr>
                                                    <td align="left" class="attachment-label" style="font-size: 10px; font-weight: 800; color: ${subTextColor}; text-transform: uppercase; letter-spacing: 1.5px;">Payment Mode</td>
                                                    <td align="right" class="attachment-value" style="font-size: 13px; font-weight: 700; color: ${textColor};">${paymentMode}</td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td class="attachment-total" style="background: ${isDark ? '#0d1f0d' : '#f0fdf4'}; border-top: 2px solid ${NEWBI_GREEN}; padding: 16px 20px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                    <tr>
                                        <td align="left" class="attachment-total-label" style="font-size: 10px; font-weight: 900; color: ${NEWBI_GREEN}; text-transform: uppercase; letter-spacing: 2px; valign: middle;">Total Paid</td>
                                        <td align="right" class="attachment-total-value" style="font-size: 22px; font-weight: 900; color: ${textColor}; letter-spacing: -1px; valign: middle;">₹${amount}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td class="download-row" style="padding: 14px 20px; background: ${isDark ? '#0a0a0a' : '#fafafa'}; border-top: 1px solid ${cardBorder}; text-align: center;">
                                <a href="${verifyUrl}" class="download-link" style="font-size: 11px; font-weight: 800; color: ${NEWBI_GREEN}; text-decoration: none; text-transform: uppercase; letter-spacing: 1.5px; display: block;">↓ Verify Payout Receipt</a>
                            </td>
                        </tr>
                        <tr>
                            <td style="background: ${containerBg}; padding: 0; margin: 0; line-height: 0; font-size: 0; vertical-align: top;">
                                <div style="width: 100%; height: 14px; overflow: hidden; margin: 0; padding: 0; line-height: 0; font-size: 0;">
                                    <svg viewBox="0 0 300 14" preserveAspectRatio="none" style="width: 100%; height: 14px; display: block; margin: 0; padding: 0;">
                                        <path d="M 0 0 L 300 0 L 300 14 L 295 5 L 290 14 L 285 5 L 280 14 L 275 5 L 270 14 L 265 5 L 260 14 L 255 5 L 250 14 L 245 5 L 240 14 L 235 5 L 230 14 L 225 5 L 220 14 L 215 5 L 210 14 L 205 5 L 200 14 L 195 5 L 190 14 L 185 5 L 180 14 L 175 5 L 170 14 L 165 5 L 160 14 L 155 5 L 150 14 L 145 5 L 140 14 L 135 5 L 130 14 L 125 5 L 120 14 L 115 5 L 110 14 L 105 5 L 100 14 L 95 5 L 90 14 L 85 5 L 80 14 L 75 5 L 70 14 L 65 5 L 60 14 L 55 5 L 50 14 L 45 5 L 40 14 L 35 5 L 30 14 L 25 5 L 20 14 L 15 5 L 10 14 L 5 5 L 0 14 Z" fill="${isDark ? '#0a0a0a' : '#fafafa'}" />
                                        <path d="M 300 14 L 295 5 L 290 14 L 285 5 L 280 14 L 275 5 L 270 14 L 265 5 L 260 14 L 255 5 L 250 14 L 245 5 L 240 14 L 235 5 L 230 14 L 225 5 L 220 14 L 215 5 L 210 14 L 205 5 L 200 14 L 195 5 L 190 14 L 185 5 L 180 14 L 175 5 L 170 14 L 165 5 L 160 14 L 155 5 L 150 14 L 145 5 L 140 14 L 135 5 L 130 14 L 125 5 L 120 14 L 115 5 L 110 14 L 105 5 L 100 14 L 95 5 L 90 14 L 85 5 L 80 14 L 75 5 L 70 14 L 65 5 L 60 14 L 55 5 L 50 14 L 45 5 L 40 14 L 35 5 L 30 14 L 25 5 L 20 14 L 15 5 L 10 14 L 5 5 L 0 14" fill="none" stroke="${cardBorder}" stroke-width="1.5" stroke-linejoin="round" />
                                    </svg>
                                </div>
                            </td>
                        </tr>
                    </table>

                    <div style="text-align: center; margin-top: 35px;">
                        <a href="${verifyUrl}" class="cta-button" style="display: inline-block; padding: 16px 30px; background-color: ${NEWBI_GREEN}; color: #000000 !important; text-decoration: none; font-weight: 700; font-size: 12px; border-radius: 10px; letter-spacing: 1px; text-transform: uppercase;">Verify Payout</a>
                    </div>
                </div>
                <div class="footer" style="padding: 40px 50px; background-color: ${isDark ? '#050505' : '#fafafa'}; border-top: 1px solid ${borderColor}; text-align: center;">
                    <div class="social-links" style="margin-bottom: 20px;">
                        <a href="https://www.instagram.com/newbi.live" class="social-icon" style="display: inline-block; margin: 0 12px;"><img src="https://img.icons8.com/material-outlined/48/888888/instagram-new.png" class="social-img" style="width: 18px; height: 18px; opacity: 0.6; ${isDark ? 'filter: invert(1);' : ''}" alt="Instagram"></a>
                        <a href="https://linkedin.com/company/newbi-ent" class="social-icon" style="display: inline-block; margin: 0 12px;"><img src="https://img.icons8.com/material-outlined/48/888888/linkedin.png" class="social-img" style="width: 18px; height: 18px; opacity: 0.6; ${isDark ? 'filter: invert(1);' : ''}" alt="LinkedIn"></a>
                        <a href="https://newbi.live" class="social-icon" style="display: inline-block; margin: 0 12px;"><img src="https://img.icons8.com/material-outlined/48/888888/domain.png" class="social-img" style="width: 18px; height: 18px; opacity: 0.6; ${isDark ? 'filter: invert(1);' : ''}" alt="Website"></a>
                    </div>
                    <p class="footer-text" style="font-size: 10px; font-weight: 800; color: #777; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; margin-top: 0;">© ${new Date().getFullYear()} NEWBI ENTERTAINMENT & MARKETING LLP. ALL RIGHTS RESERVED.</p>
                </div>
            </div>
        </body>
        </html>
    `;
};


/**
 * Resolves the official WhatsApp Community Group for a given creator city.
 */
export const resolveCityWhatsAppGroup = (city = '', customUrl = '') => {
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

    const partial = DEFAULT_CREATOR_GROUPS.find(g => clean.includes(g.city.toLowerCase()) || g.city.toLowerCase().includes(clean));
    return partial || DEFAULT_CREATOR_GROUPS[0];
};

/**
 * Sends a welcome confirmation email with Creator Pass & City WhatsApp group to creators upon registration.
 */
export const sendCreatorWelcomeEmail = async (toEmail, creatorName, verificationToken = '', creatorId = '', creatorData = {}) => {
    try {
        const verificationUrl = verificationToken && creatorId 
            ? `${getBaseUrl()}/verify-creator?id=${creatorId}&token=${verificationToken}` 
            : '';
        const mergedData = {
            ...creatorData,
            passId: creatorData.passId || creatorId || 'NWB-PASS'
        };
        const html = generateCreatorWelcomeHTML(creatorName, verificationUrl, mergedData);
        const cityGroup = resolveCityWhatsAppGroup(mergedData.city, mergedData.customGroupUrl || mergedData.whatsappGroupUrl);
        const result = await apiFetch('/api/mail', {
            to: toEmail,
            subject: `🎟️ Your Newbi Creator Pass & ${cityGroup.city} Community Access!`,
            fromName: 'Newbi Creators',
            fromEmail: 'creators@newbi.live',
            html
        });
        return result.success ? { success: true } : { success: false, error: result.error };
    } catch (error) {
        console.error('Failed to send creator welcome email:', error);
        return { success: false, error };
    }
};

/**
 * Generates high-impact HTML for the redesigned Creator Welcome Email,
 * featuring an embedded luxury Creator Pass card, City WhatsApp Community CTA,
 * 1-click verification, and creator perks.
 */
export const generateCreatorWelcomeHTML = (creatorName, verificationUrl = '', creatorData = {}) => {
    const baseUrl = getBaseUrl();
    const city = creatorData.city || 'Pan-India';
    const cityGroup = resolveCityWhatsAppGroup(city, creatorData.customGroupUrl || creatorData.whatsappGroupUrl);
    const passId = (creatorData.passId || creatorData.creatorId || 'NWB-PASS').toString().toUpperCase().replace(/^NWB-CR-/, '');
    const fullPassId = `NWB-CR-${passId}`;
    const handle = (creatorData.handle || creatorData.instagram || creatorName || 'creator').toString().replace(/^@/, '');
    const niche = creatorData.niche || creatorData.primaryNiche || creatorData.category || 'Creator & Influencer';
    const avatar = creatorData.avatar || creatorData.profilePicture || creatorData.photoURL || '';
    const points = Number(creatorData.points || 500).toLocaleString();
    const initialLetter = (creatorName ? creatorName.charAt(0) : 'C').toUpperCase();
    const interactivePassUrl = `${baseUrl}/creator-dashboard`;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>Welcome to Newbi Creators - Your Creator Pass</title>
    <style>
        .preheader { display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; }
        body { margin: 0; padding: 0; background-color: #07080C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
        table { border-collapse: separate; }
        a { text-decoration: none; }
        @media only screen and (max-width: 600px) {
            .email-container { width: 100% !important; border-radius: 0 !important; border: none !important; }
            .content-padding { padding: 24px 18px !important; }
            .header-padding { padding: 24px 18px !important; }
            .pass-card { padding: 16px !important; }
            .stats-col { display: table-cell !important; width: 33.33% !important; padding: 6px 2px !important; }
            .stat-value { font-size: 13px !important; }
            .stat-label { font-size: 7px !important; }
            .wa-btn { padding: 14px 20px !important; font-size: 12px !important; }
        }
        @media (prefers-color-scheme: light) {
            .dark-theme-wrapper { background-color: #07080C !important; }
        }
    </style>
</head>
<body class="dark-theme-wrapper" style="margin: 0; padding: 0; background-color: #07080C; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <span class="preheader">Your Newbi Creator Pass is ready. Join the ${cityGroup.city} WhatsApp community to unlock campaigns &amp; guestlists.</span>

    <!-- Outer Wrapper -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #07080C; padding: 30px 10px;">
        <tr>
            <td align="center">
                <!-- Main Container -->
                <table role="presentation" class="email-container" width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #0D0F18; border: 1px solid #1E2333; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.6);">
                    
                    <!-- Top Holographic Bar -->
                    <tr>
                        <td style="height: 4px; background: linear-gradient(90deg, #00F0FF 0%, #FF007A 50%, #39FF14 100%);"></td>
                    </tr>

                    <!-- Header -->
                    <tr>
                        <td class="header-padding" style="padding: 32px 36px 20px 36px; border-bottom: 1px solid #181C2B;">
                            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="left" valign="middle">
                                        <img src="${baseUrl}/logo_full.png" alt="Newbi" height="26" style="display: block; height: 26px; width: auto; max-width: 150px; border: 0;" />
                                    </td>
                                    <td align="right" valign="middle">
                                        <span style="display: inline-block; padding: 5px 12px; background: rgba(0, 240, 255, 0.1); border: 1px solid rgba(0, 240, 255, 0.35); border-radius: 8px; color: #00F0FF; font-size: 9px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase;">
                                            CREATOR ROSTER
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Content Body -->
                    <tr>
                        <td class="content-padding" style="padding: 36px 36px 20px 36px;">
                            
                            <!-- Hero Title -->
                            <div style="margin-bottom: 24px;">
                                <span style="display: inline-block; padding: 4px 10px; background: rgba(57, 255, 20, 0.12); border: 1px solid rgba(57, 255, 20, 0.35); color: #39FF14; font-size: 9px; font-weight: 900; border-radius: 6px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 14px;">
                                    MEMBERSHIP ACTIVATED
                                </span>
                                <h1 style="margin: 0 0 10px 0; font-size: 26px; font-weight: 900; color: #FFFFFF; line-height: 1.25; letter-spacing: -0.5px; text-transform: uppercase;">
                                    Welcome to Newbi, <span style="color: #00F0FF;">${creatorName.toUpperCase()}</span>!
                                </h1>
                                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #94A3B8; font-weight: 400;">
                                    You are officially enrolled in the Newbi Creator Network. Your digital pass has been minted and linked to the <strong style="color: #FFFFFF;">${cityGroup.city}</strong> creator hub.
                                </p>
                            </div>

                            <!-- ─── THE CREATOR PASS CARD (Embedded Visual Pass) ─── -->
                            <table role="presentation" class="pass-card" width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #0A0C13; border: 1px solid rgba(0, 240, 255, 0.35); border-radius: 20px; overflow: hidden; margin: 28px 0; box-shadow: 0 12px 36px rgba(0, 240, 255, 0.12);">
                                
                                <!-- Card Decorative Glow Strip -->
                                <tr>
                                    <td colspan="2" style="height: 3px; background: linear-gradient(90deg, #00F0FF 0%, #FF007A 50%, #39FF14 100%);"></td>
                                </tr>

                                <!-- Pass Header (Brand & Pass ID) -->
                                <tr>
                                    <td style="padding: 18px 22px 14px 22px;" align="left" valign="middle">
                                        <span style="font-size: 11px; font-weight: 900; letter-spacing: 1.5px; color: #FFFFFF; text-transform: uppercase;">NEWBI CREATORS</span>
                                        <span style="display: inline-block; width: 6px; height: 6px; background-color: #39FF14; border-radius: 50%; margin-left: 6px; vertical-align: middle;"></span>
                                    </td>
                                    <td style="padding: 18px 22px 14px 22px;" align="right" valign="middle">
                                        <span style="font-family: monospace; font-size: 10px; font-weight: 700; letter-spacing: 1px; color: #00F0FF; background: rgba(0, 240, 255, 0.08); border: 1px solid rgba(0, 240, 255, 0.3); border-radius: 6px; padding: 4px 8px;">
                                            ${fullPassId}
                                        </span>
                                    </td>
                                </tr>

                                <!-- Pass Identity Section -->
                                <tr>
                                    <td colspan="2" style="padding: 10px 22px 18px 22px;">
                                        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <!-- Avatar Box -->
                                                <td width="60" valign="middle" style="width: 60px; padding-right: 16px;">
                                                    ${avatar ? `
                                                        <img src="${avatar}" alt="${creatorName}" width="54" height="54" style="width: 54px; height: 54px; border-radius: 14px; object-fit: cover; border: 2px solid #39FF14; display: block;" />
                                                    ` : `
                                                        <table role="presentation" width="54" height="54" border="0" cellspacing="0" cellpadding="0" style="width: 54px; height: 54px; background-color: #141824; border: 2px solid #39FF14; border-radius: 14px; text-align: center;">
                                                            <tr>
                                                                <td align="center" valign="middle" style="font-size: 22px; font-weight: 900; color: #39FF14;">${initialLetter}</td>
                                                            </tr>
                                                        </table>
                                                    `}
                                                </td>
                                                <!-- Name & Handle Details -->
                                                <td valign="middle">
                                                    <div style="font-size: 18px; font-weight: 900; color: #FFFFFF; line-height: 1.2; letter-spacing: -0.3px;">
                                                        ${creatorName}
                                                    </div>
                                                    <div style="font-size: 12px; font-weight: 500; color: #94A3B8; margin-top: 4px;">
                                                        @${handle} <span style="color: #475569;">&bull;</span> ${cityGroup.city} <span style="color: #475569;">&bull;</span> ${niche}
                                                    </div>
                                                    <div style="margin-top: 6px;">
                                                        <span style="display: inline-block; font-size: 8px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; color: #39FF14; background: rgba(57, 255, 20, 0.12); border: 1px solid rgba(57, 255, 20, 0.35); border-radius: 4px; padding: 2px 7px;">
                                                            ● OFFICIAL CREATOR PASS
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Pass Authentication & Barcode Strip -->
                                <tr>
                                    <td colspan="2" style="border-top: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.015); padding: 12px 22px;">
                                        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td align="left" valign="middle">
                                                    <span style="font-family: monospace; font-size: 9px; font-weight: 700; letter-spacing: 1.5px; color: #94A3B8; text-transform: uppercase;">
                                                        AUTHENTICATED PASS // ALL-ACCESS
                                                    </span>
                                                </td>
                                                <td align="right" valign="middle">
                                                    <span style="font-family: monospace; font-size: 10px; letter-spacing: 2px; color: #475569;">
                                                        ||| |||| || ||||| ||||
                                                    </span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Pass Footer: 3D Pass Link -->
                                <tr>
                                    <td colspan="2" style="padding: 10px 22px 14px 22px;" align="right" valign="middle">
                                        <a href="${interactivePassUrl}" style="color: #00F0FF; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-decoration: none;">
                                            View 3D Pass Online &rarr;
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- ─── CITY WHATSAPP COMMUNITY SECTION (High Priority) ─── -->
                            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background: linear-gradient(180deg, rgba(37, 211, 102, 0.12) 0%, rgba(37, 211, 102, 0.03) 100%); border: 1px solid rgba(37, 211, 102, 0.35); border-radius: 18px; overflow: hidden; margin: 26px 0 20px 0;">
                                <tr>
                                    <td style="padding: 26px 24px; text-align: center;">
                                        <!-- WhatsApp Pill -->
                                        <div style="margin-bottom: 12px;">
                                            <span style="display: inline-block; background: rgba(37, 211, 102, 0.18); border: 1px solid #25D366; color: #25D366; font-size: 10px; font-weight: 900; letter-spacing: 1.5px; border-radius: 6px; padding: 4px 10px; text-transform: uppercase;">
                                                💬 ${cityGroup.city.toUpperCase()} CREATOR HUB
                                            </span>
                                        </div>
                                        <!-- Hub Title -->
                                        <h2 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 900; color: #FFFFFF; letter-spacing: -0.3px;">
                                            Join the ${cityGroup.city} Creators WhatsApp Group
                                        </h2>
                                        <!-- Description -->
                                        <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; color: #CBD5E1; max-width: 480px; margin-left: auto; margin-right: auto;">
                                            ${cityGroup.description}
                                        </p>
                                        <p style="margin: 0 0 22px 0; font-size: 12px; line-height: 1.5; color: #94A3B8;">
                                            ⚡ <strong>Priority drops:</strong> Commercial brand deals, VIP festival guestlists, and backstage invites are posted here first.
                                        </p>
                                        <!-- Big WhatsApp Emerald CTA Button -->
                                        <div style="margin-top: 10px;">
                                            <a href="${cityGroup.groupUrl}" target="_blank" class="wa-btn" style="display: inline-block; padding: 16px 36px; background-color: #25D366; color: #000000 !important; font-weight: 900; font-size: 13px; text-decoration: none; border-radius: 12px; letter-spacing: 0.5px; text-transform: uppercase; box-shadow: 0 8px 24px rgba(37, 211, 102, 0.35);">
                                                💬 JOIN ${cityGroup.city.toUpperCase()} WHATSAPP COMMUNITY &rarr;
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            </table>

                            <!-- ─── 1-CLICK PROFILE ACTIVATION (If verification link present) ─── -->
                            ${verificationUrl ? `
                            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background: rgba(57, 255, 20, 0.05); border: 1px solid rgba(57, 255, 20, 0.28); border-radius: 16px; margin: 20px 0; overflow: hidden;">
                                <tr>
                                    <td style="padding: 22px; text-align: center;">
                                        <div style="font-size: 11px; font-weight: 900; letter-spacing: 1.5px; color: #39FF14; text-transform: uppercase; margin-bottom: 6px;">
                                            ⚡ FAST-TRACK ACTIVATION
                                        </div>
                                        <h3 style="margin: 0 0 8px 0; font-size: 17px; font-weight: 900; color: #FFFFFF;">
                                            1-Click Profile &amp; Contact Verification
                                        </h3>
                                        <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.5; color: #94A3B8;">
                                            Confirm your registered mobile number to unlock instant payouts and priority brand matching.
                                        </p>
                                        <a href="${verificationUrl}" style="display: inline-block; padding: 13px 28px; background-color: #39FF14; color: #000000 !important; font-weight: 900; font-size: 12px; text-decoration: none; border-radius: 10px; letter-spacing: 1px; text-transform: uppercase; box-shadow: 0 4px 14px rgba(57, 255, 20, 0.25);">
                                            VERIFY PROFILE &amp; CONTACT &rarr;
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            ` : ''}

                            <!-- ─── 3 ECOSYSTEM PRIVILEGES ─── -->
                            <div style="margin: 28px 0 20px 0;">
                                <div style="font-size: 10px; font-weight: 900; letter-spacing: 2px; color: #64748B; text-transform: uppercase; margin-bottom: 14px; text-align: left;">
                                    YOUR CREATOR PRIVILEGES
                                </div>
                                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #111420; border: 1px solid #1C2234; border-radius: 16px; padding: 18px 20px;">
                                    <tr>
                                        <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
                                            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td width="30" valign="top" style="font-size: 16px; padding-top: 1px;">💸</td>
                                                    <td valign="top">
                                                        <strong style="color: #FFFFFF; font-size: 13px;">0% Agency Commission</strong>
                                                        <p style="margin: 3px 0 0 0; font-size: 12px; color: #94A3B8; line-height: 1.4;">Brands pay directly to your account. 100% of commercial budgets go to you.</p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
                                            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td width="30" valign="top" style="font-size: 16px; padding-top: 1px;">🎟️</td>
                                                    <td valign="top">
                                                        <strong style="color: #FFFFFF; font-size: 13px;">VIP Festival &amp; Concert Guestlists</strong>
                                                        <p style="margin: 3px 0 0 0; font-size: 12px; color: #94A3B8; line-height: 1.4;">Exclusive guestlist access &amp; backstage passes for concerts, tours, and nightlife in ${cityGroup.city}.</p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 0 4px 0;">
                                            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td width="30" valign="top" style="font-size: 16px; padding-top: 1px;">⚡</td>
                                                    <td valign="top">
                                                        <strong style="color: #FFFFFF; font-size: 13px;">Direct Brand Briefs</strong>
                                                        <p style="margin: 3px 0 0 0; font-size: 12px; color: #94A3B8; line-height: 1.4;">Personalized campaign briefs matched to your niche, aesthetic, and follower demographic.</p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- ─── CREATOR DASHBOARD CTA ─── -->
                            <div style="text-align: center; margin: 32px 0 10px 0;">
                                <a href="${interactivePassUrl}" style="display: inline-block; padding: 16px 36px; background: linear-gradient(90deg, #00F0FF, #FF007A); color: #FFFFFF !important; font-weight: 900; font-size: 13px; text-decoration: none; border-radius: 12px; letter-spacing: 1px; text-transform: uppercase; box-shadow: 0 4px 20px rgba(0, 240, 255, 0.25);">
                                    GO TO CREATOR STUDIO DASHBOARD &rarr;
                                </a>
                            </div>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 36px 36px 36px; background-color: #080A10; border-top: 1px solid #181C2B; text-align: center;">
                            <!-- Social Icons -->
                            <div style="margin-bottom: 16px;">
                                <a href="https://www.instagram.com/newbi.live" style="display: inline-block; margin: 0 10px;"><img src="https://img.icons8.com/material-outlined/48/888888/instagram-new.png" width="18" height="18" style="opacity: 0.6; filter: invert(1); display: block;" alt="Instagram"></a>
                                <a href="https://linkedin.com/company/newbi-ent" style="display: inline-block; margin: 0 10px;"><img src="https://img.icons8.com/material-outlined/48/888888/linkedin.png" width="18" height="18" style="opacity: 0.6; filter: invert(1); display: block;" alt="LinkedIn"></a>
                                <a href="https://newbi.live" style="display: inline-block; margin: 0 10px;"><img src="https://img.icons8.com/material-outlined/48/888888/domain.png" width="18" height="18" style="opacity: 0.6; filter: invert(1); display: block;" alt="Website"></a>
                            </div>
                            <p style="margin: 0 0 6px 0; font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 1.5px;">
                                &copy; ${new Date().getFullYear()} NEWBI ENTERTAINMENT &amp; MARKETING LLP. ALL RIGHTS RESERVED.
                            </p>
                            <p style="margin: 0; font-size: 10px; font-weight: 500; color: #475569;">
                                Queries or campaign support: <a href="mailto:creators@newbi.live" style="color: #00F0FF; text-decoration: none;">creators@newbi.live</a>
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


/**
 * Sends a notification email to creators in matching target cities when a new campaign goes live.
 */
export const sendNewCampaignNotificationEmail = async (bccEmails, campaign) => {
    try {
        const html = generateCampaignNotificationHTML(campaign);
        const subject = `🔥 NEW CAMPAIGN LIVE: ${campaign.title.toUpperCase()}`;
        
        const result = await sendMassEmail(
            bccEmails,
            subject,
            html,
            'official',
            null,
            'Newbii Creators',
            'creators@newbi.live'
        );
        return result;
    } catch (error) {
        console.error('Failed to send new campaign notifications:', error);
        return { success: false, error };
    }
};

/**
 * Generates the HTML for the campaign notification email.
 */
export const generateCampaignNotificationHTML = (campaign) => {
    const baseUrl = getBaseUrl();
    const campaignUrl = `https://newbi.live/creator-dashboard`;
    const cityText = (campaign.targetCity || 'Any').toUpperCase();
    const rewardText = campaign.reward || 'Exclusive Rewards';
    const requirementsText = campaign.requirements || 'Check requirements in details page.';
    
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
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #000000; color: #ffffff; margin: 0; padding: 0; }
                .container { width: 100%; max-width: 600px; margin: 40px auto; background-color: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
                .header { padding: 40px; border-bottom: 1px solid #1a1a1a; text-align: left; background-color: #0a0a0a; }
                .content { padding: 50px; text-align: left; }
                .campaign-badge { display: inline-block; padding: 6px 12px; background: linear-gradient(90deg, #00f2ff, #FF4F8B); color: #000000; font-size: 10px; font-weight: 900; border-radius: 6px; letter-spacing: 2px; margin-bottom: 24px; text-transform: uppercase; }
                .title { font-size: 32px; font-weight: 900; line-height: 1.2; letter-spacing: -1px; margin-bottom: 24px; color: #ffffff; text-transform: uppercase; font-style: italic; }
                .pink-text { color: #FF4F8B; }
                .blue-text { color: #00f2ff; }
                .body-text { color: #a0a0a0; font-size: 16px; line-height: 1.6; font-weight: 400; margin-bottom: 30px; }
                .body-text ul, .content ul { list-style-type: disc !important; padding-left: 20px !important; margin-top: 10px !important; margin-bottom: 10px !important; }
                .body-text ol, .content ol { list-style-type: decimal !important; padding-left: 20px !important; margin-top: 10px !important; margin-bottom: 10px !important; }
                .body-text li, .content li { margin-bottom: 5px !important; line-height: 1.6 !important; }
                
                .campaign-card { width: 100%; border-collapse: collapse; background: #121212; border: 1px solid #222222; border-radius: 16px; margin: 30px 0; overflow: hidden; }
                .card-row { border-bottom: 1px dashed #222222; }
                .card-label { padding: 16px 20px; font-size: 10px; font-weight: 800; color: #666666; text-transform: uppercase; letter-spacing: 1.5px; width: 35%; }
                .card-value { padding: 16px 20px; font-size: 14px; font-weight: 700; color: #ffffff; text-align: right; }
                .card-value-highlight { color: #00f2ff; }
                
                .cta-button { display: inline-block; padding: 18px 36px; background: linear-gradient(90deg, #00f2ff, #FF4F8B); color: #000000 !important; text-decoration: none; font-weight: 900; font-size: 13px; border-radius: 12px; letter-spacing: 1.5px; text-transform: uppercase; box-shadow: 0 0 20px rgba(0,242,255,0.3); }
                .footer { padding: 40px 50px; background-color: #050505; border-top: 1px solid #1a1a1a; text-align: center; }
                .footer-text { font-size: 10px; font-weight: 800; color: #555555; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 15px; }
                .social-links { margin-bottom: 20px; }
                .social-icon { display: inline-block; margin: 0 12px; }
                .social-img { width: 18px; height: 18px; opacity: 0.5; filter: invert(1); }
                
                @media screen and (max-width: 600px) {
                    .container { margin: 0 !important; border-radius: 0 !important; border: none !important; width: 100% !important; }
                    .content { padding: 30px 20px !important; }
                    .header { padding: 30px 20px !important; }
                    .footer { padding: 30px 20px !important; }
                    .title { font-size: 26px !important; margin-bottom: 18px !important; }
                    .body-text { font-size: 14px !important; }
                }

                @media (prefers-color-scheme: light) {
                    body { background-color: #ffffff !important; color: #111111 !important; }
                    .container { background-color: #ffffff !important; border-color: #e5e7eb !important; box-shadow: 0 20px 40px rgba(0,0,0,0.08) !important; }
                    .campaign-badge { background: linear-gradient(90deg, #0099aa, #cc3366) !important; }
                    .title { color: #111111 !important; }
                    .blue-text { color: #0099aa !important; }
                    .pink-text { color: #cc3366 !important; }
                    .body-text { color: #444444 !important; }
                    .campaign-card { background: #f8f9fa !important; border-color: #e5e7eb !important; }
                    .card-row { border-color: #e5e7eb !important; }
                    .card-label { color: #888888 !important; }
                    .card-value { color: #111111 !important; }
                    .card-value-highlight { color: #0099aa !important; }
                    .cta-button { box-shadow: 0 0 20px rgba(0,153,170,0.2) !important; }
                    .footer { background-color: #fafafa !important; border-color: #e5e7eb !important; }
                    .footer-text { color: #999999 !important; }
                    .social-img { filter: none !important; opacity: 0.5 !important; }
                }
            </style>
        </head>
        <body>
            <span class="preheader">New Campaign: ${campaign.title} is now active in ${cityText}.</span>
            <div class="container">
                <div class="header">
                    <!-- Brand Logo -->
                    <img src="${baseUrl}/logo_full.png" alt="Newbi" style="display: block; margin: 0; height: 25px; width: auto; max-width: 180px;">
                </div>
                <div class="content">
                    <div class="campaign-badge">NEW OPPORTUNITY</div>
                    <h1 class="title font-heading"><span class="blue-text">New Campaign</span> <span class="pink-text">Active</span></h1>
                    <p class="body-text">A new campaign matching your location profile has just gone live on the platform. Review the details below and apply today!</p>
                    
                    <table class="campaign-card">
                        <tr class="card-row">
                            <td class="card-label">Campaign</td>
                            <td class="card-value">${campaign.title}</td>
                        </tr>
                        <tr class="card-row">
                            <td class="card-label">Location</td>
                            <td class="card-value card-value-highlight">${cityText}</td>
                        </tr>
                        <tr class="card-row">
                            <td class="card-label">Reward</td>
                            <td class="card-value card-value-highlight">${rewardText}</td>
                        </tr>
                        <tr>
                            <td class="card-label" style="border: none;">Requirements</td>
                            <td class="card-value" style="border: none; font-size: 12px; color: #888888;">${requirementsText}</td>
                        </tr>
                    </table>

                    <div style="text-align: center; margin: 40px 0;">
                        <a href="${campaignUrl}" class="cta-button">View Brief & Apply</a>
                    </div>
                </div>
                <div class="footer">
                    <div class="social-links">
                        <a href="https://www.instagram.com/newbi.live" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/888888/instagram-new.png" class="social-img" alt="Instagram"></a>
                        <a href="https://linkedin.com/company/newbi-ent" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/888888/linkedin.png" class="social-img" alt="LinkedIn"></a>
                        <a href="https://newbi.live" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/888888/domain.png" class="social-img" alt="Website"></a>
                    </div>
                    <p class="footer-text">© ${new Date().getFullYear()} NEWBI ENTERTAINMENT & MARKETING LLP. ALL RIGHTS RESERVED.</p>
                </div>
            </div>
        </body>
        </html>
    `;
};


/**
 * Sends an email notification to creators when their profile is verified/approved by an admin.
 */
export const sendCreatorApprovedEmail = async (toEmail, creatorName) => {
    try {
        const rawHtml = generateCreatorApprovedHTML(creatorName);
        const subject = `Congratulations! Your Creator Profile is Verified 🚀`;
        const html = injectEmailTracking({
            html: rawHtml,
            trackingId: `creator_approved_${Date.now()}`,
            recipientEmail: toEmail,
            campaignId: `CREATOR_APPROVED`,
            subject
        });
        const result = await apiFetch('/api/mail', {
            to: toEmail,
            subject,
            fromName: 'Newbii Creators',
            fromEmail: 'creators@newbi.live',
            html
        });
        return result.success ? { success: true } : { success: false, error: result.error };
    } catch (error) {
        console.error('Failed to send creator approval email:', error);
        return { success: false, error };
    }
};

/**
 * Generates the HTML for the creator approval email.
 */
export const generateCreatorApprovedHTML = (creatorName) => {
    const baseUrl = getBaseUrl();
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
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #000000; color: #ffffff; margin: 0; padding: 0; }
                .container { width: 100%; max-width: 600px; margin: 40px auto; background-color: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
                .header { padding: 40px; border-bottom: 1px solid #1a1a1a; text-align: left; background-color: #0a0a0a; }
                .content { padding: 50px; text-align: left; }
                .verified-badge { display: inline-block; padding: 6px 12px; background: linear-gradient(90deg, #00f2ff, #FF4F8B); color: #000000; font-size: 10px; font-weight: 900; border-radius: 6px; letter-spacing: 2px; margin-bottom: 24px; text-transform: uppercase; }
                .title { font-size: 32px; font-weight: 900; line-height: 1.2; letter-spacing: -1px; margin-bottom: 24px; color: #ffffff; text-transform: uppercase; font-style: italic; }
                .pink-text { color: #FF4F8B; }
                .blue-text { color: #00f2ff; }
                .body-text { color: #a0a0a0; font-size: 16px; line-height: 1.6; font-weight: 400; margin-bottom: 30px; }
                .body-text ul, .content ul { list-style-type: disc !important; padding-left: 20px !important; margin-top: 10px !important; margin-bottom: 10px !important; }
                .body-text ol, .content ol { list-style-type: decimal !important; padding-left: 20px !important; margin-top: 10px !important; margin-bottom: 10px !important; }
                .body-text li, .content li { margin-bottom: 5px !important; line-height: 1.6 !important; }
                
                .studio-card { background: #121212; border: 1px solid #222222; border-radius: 16px; padding: 24px; margin: 30px 0; }
                .studio-card h3 { font-size: 18px; font-weight: 800; color: #00f2ff; margin-top: 0; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
                .studio-card p { font-size: 14px; color: #888888; line-height: 1.5; margin: 0; }
                
                .cta-button { display: inline-block; padding: 18px 36px; background: linear-gradient(90deg, #00f2ff, #FF4F8B); color: #000000 !important; text-decoration: none; font-weight: 900; font-size: 13px; border-radius: 12px; letter-spacing: 1.5px; text-transform: uppercase; box-shadow: 0 0 20px rgba(0,242,255,0.3); }
                .footer { padding: 40px 50px; background-color: #050505; border-top: 1px solid #1a1a1a; text-align: center; }
                .footer-text { font-size: 10px; font-weight: 800; color: #555555; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 15px; }
                .social-links { margin-bottom: 20px; }
                .social-icon { display: inline-block; margin: 0 12px; }
                .social-img { width: 18px; height: 18px; opacity: 0.5; filter: invert(1); }
                
                @media screen and (max-width: 600px) {
                    .container { margin: 0 !important; border-radius: 0 !important; border: none !important; width: 100% !important; }
                    .content { padding: 30px 20px !important; }
                    .header { padding: 30px 20px !important; }
                    .footer { padding: 30px 20px !important; }
                    .title { font-size: 26px !important; margin-bottom: 18px !important; }
                    .body-text { font-size: 14px !important; }
                }

                @media (prefers-color-scheme: light) {
                    body { background-color: #ffffff !important; color: #111111 !important; }
                    .container { background-color: #ffffff !important; border-color: #e5e7eb !important; box-shadow: 0 20px 40px rgba(0,0,0,0.08) !important; }
                    .verified-badge { background: linear-gradient(90deg, #0099aa, #cc3366) !important; }
                    .title { color: #111111 !important; }
                    .blue-text { color: #0099aa !important; }
                    .body-text { color: #444444 !important; }
                    .studio-card { background: #f8f9fa !important; border-color: #e5e7eb !important; }
                    .studio-card h3 { color: #0099aa !important; }
                    .studio-card p { color: #555555 !important; }
                    .cta-button { box-shadow: 0 0 20px rgba(0,153,170,0.2) !important; }
                    .footer { background-color: #fafafa !important; border-color: #e5e7eb !important; }
                    .footer-text { color: #999999 !important; }
                    .social-img { filter: none !important; opacity: 0.5 !important; }
                }
            </style>
        </head>
        <body>
            <span class="preheader">Congratulations! Your Newbi Creators profile has been verified.</span>
            <div class="container">
                <div class="header">
                    <!-- Brand Logo -->
                    <img src="${baseUrl}/logo_full.png" alt="Newbi" style="display: block; margin: 0; height: 25px; width: auto; max-width: 180px;">
                </div>
                <div class="content">
                    <div class="verified-badge">PROFILE VERIFIED</div>
                    <h1 class="title">You are <span class="blue-text">Verified</span></h1>
                    <p class="body-text">Hi <strong>${creatorName}</strong>,</p>
                    <p class="body-text">Great news! Our partnerships team has reviewed and verified your creator profile. You are now officially approved on Newbi Creators!</p>
                    
                    <div class="studio-card">
                        <h3>Unlock Direct Campaigns</h3>
                        <p>You can now apply directly to active briefs, unlock higher tier campaign rewards, submit proofs, and start earning for your creations.</p>
                    </div>

                    <div style="text-align: center; margin: 40px 0;">
                        <a href="https://newbi.live/creator-dashboard" class="cta-button">Access Creator Dashboard</a>
                    </div>
                </div>
                <div class="footer">
                    <div class="social-links">
                        <a href="https://www.instagram.com/newbi.live" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/888888/instagram-new.png" class="social-img" alt="Instagram"></a>
                        <a href="https://linkedin.com/company/newbi-ent" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/888888/linkedin.png" class="social-img" alt="LinkedIn"></a>
                        <a href="https://newbi.live" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/888888/domain.png" class="social-img" alt="Website"></a>
                    </div>
                    <p class="footer-text">© ${new Date().getFullYear()} NEWBI ENTERTAINMENT & MARKETING LLP. ALL RIGHTS RESERVED.</p>
                </div>
            </div>
        </body>
        </html>
    `;
};


/**
 * Sends an email notification to newly authorized staff with their role and login link.
 */
export const sendStaffAuthorizedEmail = async (toEmail, role) => {
    try {
        const rawHtml = generateStaffAuthorizedHTML(role);
        const subject = `Command Access Granted: New Role Assigned 🚀`;
        const html = injectEmailTracking({
            html: rawHtml,
            trackingId: `staff_auth_${Date.now()}`,
            recipientEmail: toEmail,
            campaignId: `STAFF_AUTHORIZED_${role}`,
            subject
        });
        const result = await apiFetch('/api/mail', {
            to: toEmail,
            subject,
            fromName: 'Newbi Security',
            fromEmail: 'security@newbi.live',
            html
        });
        return result.success ? { success: true } : { success: false, error: result.error };
    } catch (error) {
        console.error('Failed to send staff authorized email:', error);
        return { success: false, error };
    }
};

/**
 * Generates the HTML for the staff authorized email.
 */
export const generateStaffAuthorizedHTML = (role) => {
    const baseUrl = getBaseUrl();
    const roleLabels = {
        content_admin: 'Content Admin',
        gate_manager: 'Ticketing Admin',
        blog_writer: 'Blog Writer',
        super_admin: 'Super Admin',
        founder: 'Founder',
        developer: 'Developer'
    };
    const roleLabel = roleLabels[role] || role;

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
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #000000; color: #ffffff; margin: 0; padding: 0; }
                .container { width: 100%; max-width: 600px; margin: 40px auto; background-color: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
                .header { padding: 40px; border-bottom: 1px solid #1a1a1a; text-align: left; background-color: #0a0a0a; }
                .content { padding: 50px; text-align: left; }
                .verified-badge { display: inline-block; padding: 6px 12px; background: linear-gradient(90deg, #39FF14, #00f2ff); color: #000000; font-size: 10px; font-weight: 900; border-radius: 6px; letter-spacing: 2px; margin-bottom: 24px; text-transform: uppercase; }
                .title { font-size: 32px; font-weight: 900; line-height: 1.2; letter-spacing: -1px; margin-bottom: 24px; color: #ffffff; text-transform: uppercase; font-style: italic; }
                .green-text { color: #39FF14; }
                .blue-text { color: #00f2ff; }
                .body-text { color: #a0a0a0; font-size: 16px; line-height: 1.6; font-weight: 400; margin-bottom: 30px; }
                .body-text ul, .content ul { list-style-type: disc !important; padding-left: 20px !important; margin-top: 10px !important; margin-bottom: 10px !important; }
                .body-text ol, .content ol { list-style-type: decimal !important; padding-left: 20px !important; margin-top: 10px !important; margin-bottom: 10px !important; }
                .body-text li, .content li { margin-bottom: 5px !important; line-height: 1.6 !important; }
                
                .studio-card { background: #121212; border: 1px solid #222222; border-radius: 16px; padding: 24px; margin: 30px 0; }
                .studio-card h3 { font-size: 18px; font-weight: 800; color: #39FF14; margin-top: 0; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
                .studio-card p { font-size: 14px; color: #888888; line-height: 1.5; margin: 0; }
                
                .cta-button { display: inline-block; padding: 18px 36px; background: linear-gradient(90deg, #39FF14, #00f2ff); color: #000000 !important; text-decoration: none; font-weight: 900; font-size: 13px; border-radius: 12px; letter-spacing: 1.5px; text-transform: uppercase; box-shadow: 0 0 20px rgba(57,255,20,0.3); }
                .footer { padding: 40px 50px; background-color: #050505; border-top: 1px solid #1a1a1a; text-align: center; }
                .footer-text { font-size: 10px; font-weight: 800; color: #555555; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 15px; }
                .social-links { margin-bottom: 20px; }
                .social-icon { display: inline-block; margin: 0 12px; }
                .social-img { width: 18px; height: 18px; opacity: 0.5; filter: invert(1); }
                
                @media screen and (max-width: 600px) {
                    .container { margin: 0 !important; border-radius: 0 !important; border: none !important; width: 100% !important; }
                    .content { padding: 30px 20px !important; }
                    .header { padding: 30px 20px !important; }
                    .footer { padding: 30px 20px !important; }
                    .title { font-size: 26px !important; margin-bottom: 18px !important; }
                    .body-text { font-size: 14px !important; }
                }

                @media (prefers-color-scheme: light) {
                    body { background-color: #ffffff !important; color: #111111 !important; }
                    .container { background-color: #ffffff !important; border-color: #e5e7eb !important; box-shadow: 0 20px 40px rgba(0,0,0,0.08) !important; }
                    .verified-badge { background: linear-gradient(90deg, #39FF14, #00f2ff) !important; }
                    .title { color: #111111 !important; }
                    .blue-text { color: #0099aa !important; }
                    .body-text { color: #444444 !important; }
                    .studio-card { background: #f8f9fa !important; border-color: #e5e7eb !important; }
                    .studio-card h3 { color: #0099aa !important; }
                    .studio-card p { color: #555555 !important; }
                    .cta-button { box-shadow: 0 0 20px rgba(57,255,20,0.2) !important; }
                    .footer { background-color: #fafafa !important; border-color: #e5e7eb !important; }
                    .footer-text { color: #999999 !important; }
                    .social-img { filter: none !important; opacity: 0.5 !important; }
                }
            </style>
        </head>
        <body>
            <span class="preheader">Your Newbi Command Portal credentials have been authorized.</span>
            <div class="container">
                <div class="header">
                    <!-- Brand Logo -->
                    <img src="${baseUrl}/logo_full.png" alt="Newbi" style="display: block; margin: 0; height: 25px; width: auto; max-width: 180px;">
                </div>
                <div class="content">
                    <div class="verified-badge">STAFF AUTHORIZATION</div>
                    <h1 class="title">Clearance <span class="green-text">Granted</span></h1>
                    <p class="body-text">Hello,</p>
                    <p class="body-text">We are writing to inform you that your security clearance and staff privileges have been provisioned on the Newbi Command Portal.</p>
                    
                    <div class="studio-card">
                        <h3>Clearance Details</h3>
                        <p><strong>Role Level:</strong> ${roleLabel}</p>
                        <p style="margin-top: 10px;">With this level of clearance, you have been authorized to log in and access restricted dashboards, operations systems, tools, and content manager features.</p>
                    </div>

                    <div style="text-align: center; margin: 40px 0;">
                        <a href="https://newbi.live/admin" class="cta-button">Access Command Portal</a>
                    </div>
                </div>
                <div class="footer">
                    <div class="social-links">
                        <a href="https://www.instagram.com/newbi.live" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/888888/instagram-new.png" class="social-img" alt="Instagram"></a>
                        <a href="https://linkedin.com/company/newbi-ent" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/888888/linkedin.png" class="social-img" alt="LinkedIn"></a>
                        <a href="https://newbi.live" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/888888/domain.png" class="social-img" alt="Website"></a>
                    </div>
                    <p class="footer-text">© ${new Date().getFullYear()} NEWBI ENTERTAINMENT & MARKETING LLP. ALL RIGHTS RESERVED.</p>
                </div>
            </div>
        </body>
        </html>
    `;

};

/**
 * Sends a direct partnership email to a single creator.
 */
export const sendCreatorDirectEmail = async (toEmail, subject, messageBody, creatorName = 'Creator') => {
    try {
        const rawHtml = generateOfficialHTML({
            headerText: subject,
            messageBody: `
                <p>Hi <strong>${creatorName}</strong>,</p>
                <div style="line-height: 1.8; font-size: 15px; margin-top: 15px; color: #444444;">
                    ${messageBody.replace(/\n/g, '<br />')}
                </div>
            `,
            category: 'DIRECT MESSAGE',
            theme: 'light'
        });
        const html = injectEmailTracking({
            html: rawHtml,
            trackingId: `creator_direct_${Date.now()}`,
            recipientEmail: toEmail,
            campaignId: 'CREATOR_DIRECT',
            subject
        });
        const result = await apiFetch('/api/mail', {
            to: toEmail,
            subject: subject,
            fromName: 'Newbi Partnership',
            fromEmail: 'partnership@newbi.live',
            html
        });
        return result.success ? { success: true } : { success: false, error: result.error };
    } catch (error) {
        console.error('Failed to send direct email to creator:', error);
        return { success: false, error };
    }
};

/**
 * Sends a 1-click magic verification link to the creator's WhatsApp via Meta Cloud API.
 */
export const sendWhatsAppVerification = async (phone, creatorName, verificationUrl) => {
    try {
        const response = await fetch('/api/creator-join?action=whatsapp-verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone,
                creatorName,
                verificationUrl
            })
        });
        const data = await response.json();
        return data;
    } catch (err) {
        console.error("Failed to send WhatsApp verification:", err);
        return { success: false, error: err.message };
    }
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
    const formattedCity = (city || 'Your City').toUpperCase();
    const cleanName = creatorName && creatorName !== 'Creator' ? creatorName.split(' ')[0] : 'Creator';
    
    // Group buttons for other active hubs
    const otherHubsHTML = (availableGroups || []).filter(g => g.groupUrl && g.isActive !== false).map(g => `
        <a href="${g.groupUrl}" style="display: inline-block; margin: 4px; padding: 8px 16px; background: #18181b; border: 1px solid #27272a; border-radius: 8px; color: #ffffff; text-decoration: none; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
            📍 ${g.city}
        </a>
    `).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${formattedCity} Creator WhatsApp Group</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #050507; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050507;">
                <tr>
                    <td align="center" style="padding: 40px 16px;">
                        <table role="presentation" width="100%" max-width="600" style="max-width: 600px; width: 100%; background: #0c0e14; border: 1px solid rgba(37,211,102,0.3); border-radius: 24px; overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.7);">
                            
                            <!-- Top Ambient Banner -->
                            <tr>
                                <td style="padding: 32px 36px 20px 36px; background: linear-gradient(135deg, rgba(37,211,102,0.15) 0%, rgba(0,240,255,0.08) 100%); border-bottom: 1px solid rgba(255,255,255,0.08);">
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td>
                                                <div style="display: inline-block; padding: 5px 12px; background: rgba(37,211,102,0.2); border: 1px solid rgba(37,211,102,0.4); border-radius: 20px; color: #25D366; font-size: 10px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase;">
                                                    ● LIVE COMMUNITY • EXCLUSIVE INVITE
                                                </div>
                                                <h1 style="margin: 16px 0 6px 0; font-size: 26px; line-height: 1.25; font-weight: 900; letter-spacing: -0.5px; color: #ffffff; text-transform: uppercase;">
                                                    ${formattedCity} CREATOR LOUNGE IS LIVE ⚡
                                                </h1>
                                                <p style="margin: 0; font-size: 13px; color: #a1a1aa; line-height: 1.5;">
                                                    Official WhatsApp Community for Verified Newbi Creators
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- Main Content Area -->
                            <tr>
                                <td style="padding: 36px;">
                                    <p style="margin: 0 0 16px 0; font-size: 15px; color: #ffffff; font-weight: 700;">
                                        Hey ${cleanName},
                                    </p>
                                    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.7; color: #d4d4d8;">
                                        ${customMessage ? customMessage.replace(/\n/g, '<br />') : `We've opened the official <strong>${formattedCity} Creators WhatsApp Community</strong>. As an existing member of our Creator Network, you have priority access to connect with fellow local creators, receive instant brand brief drops, and unlock guestlist passes.`}
                                    </p>

                                    <!-- Value Props Card -->
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; margin: 24px 0; padding: 18px 20px;">
                                        <tr>
                                            <td style="padding-bottom: 12px;">
                                                <div style="font-size: 12px; font-weight: 800; color: #25D366; text-transform: uppercase; letter-spacing: 1px;">
                                                    ⚡ WHAT'S WAITING INSIDE:
                                                </div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="font-size: 13px; line-height: 1.8; color: #e4e4e7;">
                                                • <strong>Instant Campaign Drops:</strong> Get notified first when paid brand missions go live in ${formattedCity}.<br />
                                                • <strong>VIP Concert &amp; Festival Passes:</strong> Free guestlists &amp; festival passes reserved for creators.<br />
                                                • <strong>Direct Support:</strong> Direct communication line with the Newbi talent team.<br />
                                                • <strong>Zero Agency Commission:</strong> 100% direct payouts straight to you.
                                            </td>
                                        </tr>
                                    </table>

                                    <!-- Primary Action Button -->
                                    <div style="text-align: center; margin: 32px 0 20px 0;">
                                        <a href="${groupUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 18px 36px; background: #25D366; color: #000000 !important; font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; text-decoration: none; border-radius: 14px; box-shadow: 0 0 30px rgba(37,211,102,0.4);">
                                            💬 JOIN ${formattedCity} WHATSAPP GROUP &rarr;
                                        </a>
                                        <div style="margin-top: 10px; font-size: 11px; color: #71717a;">
                                            1-Tap Invite Link • Official WhatsApp Group
                                        </div>
                                    </div>

                                    ${otherHubsHTML ? `
                                    <!-- Other Cities Section -->
                                    <div style="margin-top: 36px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.08);">
                                        <p style="margin: 0 0 12px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #a1a1aa;">
                                            Travelling or creating across other cities? Join other hubs:
                                        </p>
                                        <div style="text-align: left;">
                                            ${otherHubsHTML}
                                        </div>
                                    </div>
                                    ` : ''}

                                    <!-- Creator Dashboard Link -->
                                    <div style="margin-top: 28px; text-align: center; font-size: 12px; color: #a1a1aa;">
                                        You can also view your live Creator ID and active briefs on your 
                                        <a href="https://newbi.live/creator-dashboard" style="color: #00F0FF; text-decoration: underline; font-weight: 700;">Creator Dashboard</a>.
                                    </div>
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style="padding: 24px 36px; background: #050507; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
                                    <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #71717a;">
                                        NEWBI ENTERTAINMENT • CREATOR OPERATIONS
                                    </p>
                                    <p style="margin: 0; font-size: 10px; color: #52525b; line-height: 1.5;">
                                        You received this email because you are a registered creator in the Newbi Creator Network.<br />
                                        Bengaluru • Mumbai • Delhi NCR • Hyderabad • Pune • Kolkata • Kochi • Chandigarh
                                    </p>
                                </td>
                            </tr>

                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `;
};

/**
 * Broadcasts the Creator WhatsApp Groups announcement email to a list of creators.
 */
export const sendCreatorGroupsBroadcastEmail = async (
    recipientList, 
    {
        city = 'Bengaluru',
        groupUrl = 'https://chat.whatsapp.com/K6MtDAOlZ7s7AUtOFHxduU?mode=gi_t',
        customSubject = '',
        customMessage = '',
        availableGroups = [],
        onProgress = null
    } = {}
) => {
    try {
        const subject = customSubject.trim() || `⚡ Official ${city ? `${city} ` : ''}Creator WhatsApp Community is Live!`;
        const html = generateCreatorGroupsBroadcastHTML({
            creatorName: 'Creator',
            city,
            groupUrl,
            customMessage,
            availableGroups
        });

        return await sendMassEmail(
            recipientList,
            subject,
            html,
            'official',
            onProgress,
            'Newbi Creators',
            'creators@newbi.live'
        );
    } catch (error) {
        console.error('Failed to send creator groups broadcast email:', error);
        return { success: false, error: error.message || 'Broadcast failed' };
    }
};
