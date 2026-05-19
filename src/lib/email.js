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
    const containerBg = isDark ? '#080808' : '#fafafa';
    const textColor = isDark ? '#f8fafc' : '#111111';
    const subTextColor = isDark ? '#94a3b8' : '#4b5563';
    const borderColor = isDark ? '#1e293b' : '#e5e7eb';
    const cardBg = isDark ? '#111111' : '#ffffff';
    const accent = isDark ? '#00f2ff' : '#008899';
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="light dark">
            <meta name="supported-color-schemes" content="light dark">
            <title>Weekly by Concert Zone</title>
            <style>
                :root {
                    color-scheme: light dark;
                    supported-color-schemes: light dark;
                }
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
                    border-bottom: 1px solid ${borderColor};
                }
                .header img { 
                    width: 100%; 
                    max-width: 320px; 
                    height: auto; 
                }
                .logo-light { display: ${isDark ? 'none' : 'inline-block'}; }
                .logo-dark { display: ${isDark ? 'inline-block' : 'none'}; }
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
                    transition: transform 0.2s;
                }
                .social-icon:hover {
                    transform: scale(1.1);
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
                    border-bottom: 1px solid transparent;
                    transition: border-color 0.2s;
                }
                .unsubscribe-link:hover {
                    border-bottom-color: ${accent};
                }
                .content p { 
                    line-height: 1.8; 
                    margin-bottom: 1.5em; 
                    font-size: 15px;
                }
                .content a { 
                    color: ${accent}; 
                    text-decoration: none; 
                    font-weight: 700; 
                }
                .content * { 
                    max-width: 100%; 
                }
                
                /* Premium interactive card hover styles */
                .story-card {
                    background: ${cardBg};
                    border: 1px solid ${borderColor};
                    border-radius: 20px;
                    transition: all 0.3s ease;
                }
                .story-card:hover {
                    border-color: ${accent} !important;
                    box-shadow: 0 10px 25px rgba(0, 242, 255, 0.05);
                }
                
                /* Interactive details summary accordion */
                details {
                    background: ${isDark ? '#0e0e0e' : '#f9fafb'};
                    border: 1px solid ${borderColor};
                    border-radius: 16px;
                    padding: 16px;
                    margin-bottom: 20px;
                    transition: all 0.3s;
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

                /* Responsive Light/Dark Mode Overrides */
                @media (prefers-color-scheme: dark) {
                    ${!isDark ? `
                        body { background-color: #000000 !important; color: #f8fafc !important; }
                        .container { background-color: #080808 !important; border-color: #1e293b !important; }
                        .footer { background-color: #040404 !important; border-color: #1e293b !important; }
                        .footer-text { color: #475569 !important; }
                        .unsubscribe-link { color: #00f2ff !important; }
                        .story-card { background: #111111 !important; border-color: #1e293b !important; }
                        .date-badge {
                            background: rgba(0,242,255,0.1) !important;
                            border-color: rgba(0,242,255,0.2) !important;
                            color: #00f2ff !important;
                        }
                        .content a { color: #00f2ff !important; }
                        details { background: #0e0e0e !important; border-color: #1e293b !important; }
                        .logo-light { display: none !important; }
                        .logo-dark { display: inline-block !important; }
                    ` : ''}
                }

                @media (prefers-color-scheme: light) {
                    ${isDark ? `
                        body { background-color: #ffffff !important; color: #111111 !important; }
                        .container { background-color: #fafafa !important; border-color: #e5e7eb !important; }
                        .footer { background-color: #f3f4f6 !important; border-color: #e5e7eb !important; }
                        .footer-text { color: #9ca3af !important; }
                        .unsubscribe-link { color: #008899 !important; }
                        .story-card { background: #ffffff !important; border-color: #e5e7eb !important; }
                        .date-badge {
                            background: rgba(0,136,153,0.1) !important;
                            border-color: rgba(0,136,153,0.2) !important;
                            color: #008899 !important;
                        }
                        .content a { color: #008899 !important; }
                        details { background: #f9fafb !important; border-color: #e5e7eb !important; }
                        .logo-light { display: inline-block !important; }
                        .logo-dark { display: none !important; }
                    ` : ''}
                }

                /* Outlook/Windows Web App Specific Dark Mode Overrides */
                ${isDark ? `
                    [data-ogsc] body { background-color: #ffffff !important; color: #111111 !important; }
                    [data-ogsc] .container { background-color: #fafafa !important; border-color: #e5e7eb !important; }
                    [data-ogsc] .footer { background-color: #f3f4f6 !important; border-color: #e5e7eb !important; }
                    [data-ogsc] .footer-text { color: #9ca3af !important; }
                    [data-ogsc] .unsubscribe-link { color: #008899 !important; }
                    [data-ogsc] .story-card { background: #ffffff !important; border-color: #e5e7eb !important; }
                    [data-ogsc] .date-badge {
                        background: rgba(0,136,153,0.1) !important;
                        border-color: rgba(0,136,153,0.2) !important;
                        color: #008899 !important;
                    }
                    [data-ogsc] .content a { color: #008899 !important; }
                    [data-ogsc] details { background: #f9fafb !important; border-color: #e5e7eb !important; }
                    [data-ogsc] .logo-light { display: inline-block !important; }
                    [data-ogsc] .logo-dark { display: none !important; }
                ` : `
                    [data-ogsc] body { background-color: #000000 !important; color: #f8fafc !important; }
                    [data-ogsc] .container { background-color: #080808 !important; border-color: #1e293b !important; }
                    [data-ogsc] .footer { background-color: #040404 !important; border-color: #1e293b !important; }
                    [data-ogsc] .footer-text { color: #475569 !important; }
                    [data-ogsc] .unsubscribe-link { color: #00f2ff !important; }
                    [data-ogsc] .story-card { background: #111111 !important; border-color: #1e293b !important; }
                    [data-ogsc] .date-badge {
                        background: rgba(0,242,255,0.1) !important;
                        border-color: rgba(0,242,255,0.2) !important;
                        color: #00f2ff !important;
                    }
                    [data-ogsc] .content a { color: #00f2ff !important; }
                    [data-ogsc] details { background: #0e0e0e !important; border-color: #1e293b !important; }
                    [data-ogsc] .logo-light { display: none !important; }
                    [data-ogsc] .logo-dark { display: inline-block !important; }
                `}
            </style>
        </head>
        <body>
            <span class="preheader">${summary}</span>
            <div class="container">
                <div class="header">
                    <!-- Light Mode Logo -->
                    <img src="${getBaseUrl()}/weekly_logo_light.png" class="logo-light" alt="WEEKLY BY CONCERT ZONE" style="display: ${isDark ? 'none' : 'inline-block'}; max-width: 320px; width: 100%; height: auto;">
                    <!-- Dark Mode Logo -->
                    <img src="${getBaseUrl()}/weekly_logo_dark.png" class="logo-dark" alt="WEEKLY BY CONCERT ZONE" style="display: ${isDark ? 'inline-block' : 'none'}; max-width: 320px; width: 100%; height: auto;">
                    <div>
                        <span class="date-badge">${dateStr}</span>
                    </div>
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
                    <p class="footer-text">© ${new Date().getFullYear()} CONCERT ZONE. ALL RIGHTS RESERVED.<br/>A SUBSIDIARY OF NEWBI ENTERTAINMENT.</p>
                    <a href="https://newbi.live/unsubscribe" class="unsubscribe-link">UNSUBSCRIBE FROM WEEKLY BRIEFINGS</a>
                </div>
            </div>
        </body>
        </html>
    `;
};


/**
 * Sends a mass email to multiple recipients via BCC to protect privacy.
 * Batches recipients into groups of 45 to stay under SMTP provider limits
 * (Gmail/Workspace caps at ~100 recipients per message).
 * Supports account switching via accountType parameter.
 */
export const sendMassEmail = async (bccArray, subject, htmlContent, accountType = 'official', onProgress = null) => {
    const BATCH_SIZE = 45;
    const DELAY_BETWEEN_BATCHES_MS = 1500;
    const toAddress = accountType === 'weekly' ? 'weekly@newbi.live' : 'partnership@newbi.live';

    // Deduplicate and filter empty emails
    const uniqueEmails = [...new Set(bccArray.filter(Boolean).map(e => e.trim().toLowerCase()))];

    if (uniqueEmails.length === 0) {
        return { success: false, error: 'No valid recipients' };
    }

    // Split into batches
    const batches = [];
    for (let i = 0; i < uniqueEmails.length; i += BATCH_SIZE) {
        batches.push(uniqueEmails.slice(i, i + BATCH_SIZE));
    }

    console.log(`[Mass Mail] Sending to ${uniqueEmails.length} recipients in ${batches.length} batch(es) via ${accountType}`);

    let successCount = 0;
    let failCount = 0;
    const errors = [];

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        try {
            const result = await apiFetch('/api/mail', {
                to: toAddress,
                bcc: batch.join(','),
                subject: subject,
                html: htmlContent,
                accountType: accountType,
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

        // Report progress if callback provided
        if (onProgress) {
            onProgress({
                currentBatch: i + 1,
                totalBatches: batches.length,
                sent: successCount,
                failed: failCount,
                total: uniqueEmails.length
            });
        }

        // Delay between batches to avoid SMTP rate limits (skip after last batch)
        if (i < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
        }
    }

    const allSucceeded = failCount === 0;
    return {
        success: allSucceeded,
        sent: successCount,
        failed: failCount,
        total: uniqueEmails.length,
        batches: batches.length,
        error: errors.length > 0 ? errors.join('; ') : undefined
    };
};
