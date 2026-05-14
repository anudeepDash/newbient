import { auth } from './firebase';
export const NEWBI_GREEN = '#39FF14';
export const CONCERT_ZONE_CYAN = '#00f2ff';
const getBaseUrl = () => {
    try {
        if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            return window.location.origin;
        }
    } catch (e) {}
    return 'https://newbi.live';
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
        
        const result = await apiFetch('/api/mail', {
            to: toEmail,
            subject: `Your Tickets for ${eventName}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2>Hi ${toName},</h2>
                    <p>Here are your tickets for <strong>${eventName}</strong>. We look forward to seeing you there!</p>
                    <p><strong>Booking Ref:</strong> ${bookingRef}</p>
                    <div style="margin: 30px 0;">
                        <a href="${ticketLink}" style="background: #39FF14; color: black; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Your Tickets</a>
                    </div>
                    <p style="font-size: 12px; color: #666;">If the button above doesn't work, copy and paste this link: ${ticketLink}</p>
                </div>
            `
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
 * Sends an event booking confirmation email.
 */
export const sendBookingConfirmation = async (bookingData) => {
    try {
        const { to_name, to_email, event_name, booking_ref, tickets_html, total_amount, payment_ref, ticket_url } = bookingData;
        const viewUrl = `https://newbi.live/ticket/${booking_ref}`;

        const result = await apiFetch('/api/mail', {
            to: to_email,
            subject: `Booking Confirmed: ${event_name}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
                    <h2 style="color: #000;">Booking Confirmed!</h2>
                    <p>Hi ${to_name}, your payment for <strong>${event_name}</strong> has been verified successfully.</p>
                    
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Booking Reference:</strong> ${booking_ref}</p>
                        <p><strong>Total Amount:</strong> ₹${total_amount}</p>
                        <p><strong>Payment Ref:</strong> ${payment_ref}</p>
                    </div>

                    <div style="margin: 20px 0;">
                        ${tickets_html}
                    </div>

                    <div style="margin: 30px 0; text-align: center;">
                        <a href="${viewUrl}" style="background: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Access Digital Tickets</a>
                    </div>
                    
                    <p style="font-size: 12px; color: #999;">Newbi Entertainment &bull; Exclusive Experiences</p>
                </div>
            `
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
        const result = await apiFetch('/api/mail', {
            to: email,
            subject: `Thanks for reaching out, ${name}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2>Hello ${name},</h2>
                    <p>We've received your message and our team will get back to you shortly.</p>
                    <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #39FF14; margin: 20px 0;">
                        <p style="font-style: italic;">"${message}"</p>
                    </div>
                    <p>Best regards,<br/>The Newbi Team</p>
                </div>
            `
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
        const result = await apiFetch('/api/mail', {
            to: toEmail,
            subject: `Invoice Ready: ${invoiceNumber}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2>Invoice Ready</h2>
                    <p>Your invoice <strong>${invoiceNumber}</strong> for <strong>₹${amount}</strong> is ready for review.</p>
                    <div style="margin: 30px 0;">
                        <a href="${invoiceUrl}" style="background: #000; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Invoice</a>
                    </div>
                    <p>Thank you for your business!</p>
                </div>
            `
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
        const result = await apiFetch('/api/mail', {
            to: toEmail,
            subject: `New Proposal: ${proposalTitle}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2>Strategic Proposal</h2>
                    <p>A new strategic proposal "<strong>${proposalTitle}</strong>" has been prepared for your review.</p>
                    <div style="margin: 30px 0;">
                        <a href="${proposalUrl}" style="background: #39FF14; color: #000; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;">Review Proposal</a>
                    </div>
                    <p>Best regards,<br/>Newbi Entertainment</p>
                </div>
            `
        });
        return result.success ? { success: true } : { success: false, error: result.error };
    } catch (error) {
        console.error('Failed to send proposal email:', error);
        return { success: false, error };
    }
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
        theme = "light" 
    } = data;

    const isDark = theme === 'dark';
    const bgColor = isDark ? '#000000' : '#fcfcfc';
    const containerBg = isDark ? '#0a0a0a' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#111111';
    const subTextColor = isDark ? '#888888' : '#444444';
    const borderColor = isDark ? '#1a1a1a' : '#eaeaea';
    
    // Brand Logos: Home (Dark) vs Document (Light)
    const baseUrl = getBaseUrl();
    const logoUrl = isDark 
        ? `${baseUrl}/logo_full.png` 
        : `${baseUrl}/logo_document.png`;

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                .preheader { display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; }
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: ${bgColor}; color: ${textColor}; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 40px auto; background-color: ${containerBg}; border: 1px solid ${borderColor}; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.02); }
                .header { padding: 40px; border-bottom: 1px solid ${borderColor}; text-align: left; }
                .content { padding: 50px; text-align: left; }
                .category-badge { display: inline-block; padding: 6px 12px; background: ${NEWBI_GREEN}; color: #000000; font-size: 9px; font-weight: 900; border-radius: 6px; letter-spacing: 2px; margin-bottom: 20px; text-transform: uppercase; }
                .title { font-size: 28px; font-weight: 800; color: ${textColor}; margin-bottom: 24px; line-height: 1.2; letter-spacing: -0.5px; }
                .body-text { color: ${subTextColor}; font-size: 15px; line-height: 1.6; font-weight: 400; margin-bottom: 40px; }
                .cta-button { display: inline-block; padding: 16px 30px; background-color: ${NEWBI_GREEN}; color: #000000; text-decoration: none; font-weight: 700; font-size: 12px; border-radius: 10px; transition: all 0.2s; }
                .footer { padding: 40px 50px; background-color: ${isDark ? '#050505' : '#fafafa'}; border-top: 1px solid ${borderColor}; text-align: center; }
                .footer-text { font-size: 10px; font-weight: 800; color: #777; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; }
                .social-links { margin-bottom: 20px; }
                .social-icon { display: inline-block; margin: 0 12px; }
                .social-img { width: 18px; height: 18px; opacity: 0.6; ${isDark ? 'filter: invert(1);' : ''} }
            </style>
        </head>
        <body>
            <span class="preheader">${messageBody.replace(/<[^>]*>?/gm, '').substring(0, 150)}</span>
            <div class="container">
                <div class="header">
                    <img src="${logoUrl}" alt="Newbi" style="display: block; margin: 0; height: 25px; width: auto; max-width: 180px;">
                </div>
                <div class="content">
                    <div class="category-badge">${category}</div>
                    <h1 class="title">${headerText}</h1>
                    <div class="body-text">${messageBody}</div>
                    ${ctaText ? `<a href="${ctaUrl}" class="cta-button">${ctaText}</a>` : ''}
                </div>
                <div class="footer">
                    <div class="social-links">
                        <a href="https://www.instagram.com/newbi.live" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/instagram-new.png" class="social-img" alt="Instagram"></a>
                        <a href="https://linkedin.com/company/newbi-ent" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/linkedin.png" class="social-img" alt="LinkedIn"></a>
                        <a href="https://newbi.live" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/domain.png" class="social-img" alt="Website"></a>
                    </div>
                    <p class="footer-text">© ${new Date().getFullYear()} NEWBI ENTERTAINMENT. ALL RIGHTS RESERVED.</p>
                    <p class="footer-text" style="margin-top: 10px;"><a href="https://newbi.live/unsubscribe" style="color: #777; text-decoration: underline;">UNSUBSCRIBE FROM OFFICIAL LIST</a></p>
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
        theme = "dark" 
    } = data;

    const isDark = theme === 'dark';
    const bgColor = isDark ? '#000000' : '#ffffff';
    const containerBg = isDark ? '#000000' : '#ffffff';
    const textColor = isDark ? '#f8fafc' : '#000000';
    const subTextColor = isDark ? '#94a3b8' : '#333333';
    const borderColor = isDark ? '#1e293b' : '#eeeeee';
    const accent = isDark ? '#00f2ff' : '#008899'; // Darker cyan for light mode for better legibility

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                .preheader { display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; }
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: ${bgColor}; color: ${textColor}; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
                .container { max-width: 650px; margin: 0 auto; background-color: ${containerBg}; }
                .header { padding: 30px 40px 10px; text-align: left; }
                .header img { width: 100%; max-width: 450px; height: auto; display: block; }
                .logo-text { font-size: 72px; font-weight: 900; font-style: italic; color: ${textColor}; letter-spacing: -4px; line-height: 0.85; margin: 0; text-transform: uppercase; }
                .logo-subtext { font-size: 9px; font-weight: 950; color: ${accent}; letter-spacing: 6px; margin: 8px 0 0 4px; text-transform: uppercase; opacity: 0.9; }
                .content { padding: 0 40px 30px; }
                .content p, .content h1, .content h2, .content h3, .content h4, .content div, .content span { color: inherit !important; }
                .footer { padding: 50px 40px; border-top: 1px solid ${borderColor}; text-align: left; }
                .footer-text { font-size: 9px; font-weight: 800; color: ${isDark ? '#333' : '#999'}; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 20px; }
                .social-links { margin-bottom: 30px; }
                .social-icon { display: inline-block; margin-right: 25px; }
                .social-img { width: 16px; height: 16px; opacity: 0.4; ${isDark ? 'filter: invert(1);' : ''} }
                .unsubscribe-link { font-size: 8px; font-weight: 700; color: ${accent}; text-decoration: none; text-transform: uppercase; letter-spacing: 1px; }
                .content p { line-height: 1.8; margin-bottom: 1.5em; }
                .content a { color: ${accent}; text-decoration: none; font-weight: 700; }
                .content * { max-width: 100%; }
            </style>
        </head>
        <body>
            <span class="preheader">${summary}</span>
            <div class="container">
                <div class="header">
                    <img src="${getBaseUrl()}/weekly_logo_${isDark ? 'dark' : 'light'}.png" alt="WEEKLY BY CONCERT ZONE">
                </div>
                <div class="content">
                    ${messageBody}
                </div>
                <div class="footer">
                    <div class="social-links">
                        <a href="https://www.instagram.com/newbi.live" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/instagram-new.png" class="social-img" alt="Instagram"></a>
                        <a href="https://linkedin.com/company/newbi-ent" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/linkedin.png" class="social-img" alt="LinkedIn"></a>
                        <a href="https://newbi.live" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/domain.png" class="social-img" alt="Website"></a>
                    </div>
                    <p class="footer-text">© ${new Date().getFullYear()} CONCERT ZONE // INTELLECTUAL PROPERTY OF NEWBI ENT.</p>
                    <a href="https://newbi.live/unsubscribe" class="unsubscribe-link">UNSUBSCRIBE FROM NEWSLETTER</a>
                </div>
            </div>
        </body>
        </html>
    `;
};


/**
 * Sends a mass email to multiple recipients via BCC to protect privacy.
 * Supports account switching via accountType parameter.
 */
export const sendMassEmail = async (bccArray, subject, htmlContent, accountType = 'official') => {
    try {
        const result = await apiFetch('/api/mail', {
            to: accountType === 'weekly' ? 'weekly@newbi.live' : 'partnership@newbi.live',
            bcc: bccArray.join(','),
            subject: subject,
            html: htmlContent,
            accountType: accountType,
            headers: {
                'List-Unsubscribe': '<https://newbi.live/unsubscribe>'
            }
        });
        return result.success ? { success: true } : { success: false, error: result.error };
    } catch (error) {
        console.error(`Failed to send ${accountType} mass email:`, error);
        return { success: false, error };
    }
};
