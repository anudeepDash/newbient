import { auth } from './firebase';
export const NEWBI_GREEN = '#39FF14';
export const CONCERT_ZONE_CYAN = '#00f2ff';
const getBaseUrl = () => {
    // For emails, static logo and assets should always resolve to the public production website
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
            fromName: 'Newbi Bookings',
            fromEmail: 'booking@newbi.live',
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
 * Sends a guestlist RSVP confirmation email.
 */
export const sendGuestlistConfirmation = async (guestlistData) => {
    try {
        const { toName, toEmail, eventName, bookingRef, guestCount, date, location, guestlistMode } = guestlistData;
        const isRSVPOnly = guestlistMode === 'rsvp';
        
        let htmlContent = '';
        if (isRSVPOnly) {
            htmlContent = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; background-color: #ffffff; color: #111111;">
                    <h2 style="color: #000; font-style: italic; text-transform: uppercase;">RSVP Confirmed!</h2>
                    <p>Hi ${toName},</p>
                    <p>Your RSVP for <strong>${eventName}</strong> has been successfully registered.</p>
                    
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #eee; text-align: left;">
                        <p style="margin: 5px 0;"><strong>Event:</strong> ${eventName}</p>
                        <p style="margin: 5px 0;"><strong>Date:</strong> ${date || 'To Be Announced'}</p>
                        <p style="margin: 5px 0;"><strong>Location:</strong> ${location || 'Venue'}</p>
                        <p style="margin: 5px 0;"><strong>Guests:</strong> ${guestCount}</p>
                        <p style="margin: 5px 0;"><strong>Reference ID:</strong> ${bookingRef}</p>
                    </div>

                    <p>We look forward to hosting you. We will reach out if there are any updates regarding the entry details.</p>
                    
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
                    <p style="font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 2px;">Newbi Entertainment &bull; Exclusive Experiences</p>
                </div>
            `;
        } else {
            const viewUrl = `https://newbi.live/ticket/${bookingRef}`;
            htmlContent = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; background-color: #ffffff; color: #111111;">
                    <h2 style="color: #000; font-style: italic; text-transform: uppercase;">Guestlist Entry Confirmed!</h2>
                    <p>Hi ${toName},</p>
                    <p>Your guestlist spot for <strong>${eventName}</strong> is secured. Below is your entry details and access pass.</p>
                    
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #eee; text-align: left;">
                        <p style="margin: 5px 0;"><strong>Event:</strong> ${eventName}</p>
                        <p style="margin: 5px 0;"><strong>Date:</strong> ${date || 'To Be Announced'}</p>
                        <p style="margin: 5px 0;"><strong>Location:</strong> ${location || 'Venue'}</p>
                        <p style="margin: 5px 0;"><strong>Guests:</strong> ${guestCount}</p>
                        <p style="margin: 5px 0;"><strong>Access Code:</strong> ${bookingRef}</p>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(bookingRef)}" alt="Access QR Code" style="width: 150px; height: 150px; border: 1px solid #ddd; padding: 10px; border-radius: 8px; background: #fff;" />
                        <p style="font-size: 11px; color: #666; margin-top: 10px;">Present this QR code at the gate for entry verification.</p>
                    </div>

                    <div style="margin: 30px 0; text-align: center;">
                        <a href="${viewUrl}" style="background: #39FF14; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; text-transform: uppercase; letter-spacing: 1px;">Access Digital Pass</a>
                    </div>
                    
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
                    <p style="font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 2px;">Newbi Entertainment &bull; Exclusive Experiences</p>
                </div>
            `;
        }

        const result = await apiFetch('/api/mail', {
            to: toEmail,
            subject: isRSVPOnly ? `RSVP Confirmed: ${eventName}` : `Guestlist Access Confirmed: ${eventName}`,
            fromName: 'Newbi Bookings',
            fromEmail: 'booking@newbi.live',
            html: htmlContent
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

        const result = await apiFetch('/api/mail', {
            to: to_email,
            subject: `Booking Confirmed: ${event_name}`,
            fromName: 'Newbi Bookings',
            fromEmail: 'booking@newbi.live',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; background-color: #ffffff; color: #111111;">
                    <h2 style="color: #000; font-style: italic; text-transform: uppercase; text-align: left;">Booking Confirmed!</h2>
                    <p style="text-align: left;">Hi ${to_name}, your payment for <strong>${event_name}</strong> has been verified successfully.</p>
                    
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #eee; text-align: left;">
                        <p style="margin: 5px 0;"><strong>Booking Reference:</strong> ${booking_ref}</p>
                        <p style="margin: 5px 0;"><strong>Payment Ref:</strong> ${payment_ref}</p>
                    </div>

                    ${invoiceHtml}

                    <div style="margin: 20px 0; text-align: left;">
                        ${tickets_html}
                    </div>

                    <div style="margin: 30px 0; text-align: center;">
                        <a href="${viewUrl}" style="background: #39FF14; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; text-transform: uppercase; letter-spacing: 1px;">Access Digital Tickets</a>
                    </div>
                    
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
                    <p style="font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 2px; text-align: center;">Newbi Entertainment &bull; Exclusive Experiences</p>
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
            fromName: 'Newbi Support',
            fromEmail: 'noreply@newbi.live',
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
            fromName: 'Newbi Finance',
            fromEmail: 'partnership@newbi.live',
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
            fromName: 'Newbi Partnerships',
            fromEmail: 'partnership@newbi.live',
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
        theme = "light"
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
    
    // Header background and logo adapt to the theme to avoid a mismatched black header on light emails
    const headerBg = containerBg;
    const headerBorder = borderColor;
    const logoUrl = isDark ? `${baseUrl}/logo_full.png` : `${baseUrl}/logo_document.png`;

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
                .logo-light { display: ${isDark ? 'none' : 'block'} !important; }
                .logo-dark { display: ${isDark ? 'block' : 'none'} !important; }

                @media screen and (max-width: 600px) {
                    .container { margin: 0 !important; border-radius: 0 !important; border: none !important; width: 100% !important; }
                    .content { padding: 30px 20px !important; }
                    .header { padding: 30px 20px !important; }
                    .footer { padding: 30px 20px !important; }
                    .title { font-size: 24px !important; margin-bottom: 18px !important; }
                    .body-text { font-size: 14px !important; line-height: 1.5 !important; }
                }

                @media (prefers-color-scheme: dark) {
                    body { background-color: #000000 !important; color: #ffffff !important; }
                    .container { background-color: #0a0a0a !important; border-color: #1a1a1a !important; }
                    .header { background-color: #0a0a0a !important; border-color: #1a1a1a !important; }
                    .title { color: #ffffff !important; }
                    .body-text { color: #888888 !important; }
                    .footer { background-color: #050505 !important; border-color: #1a1a1a !important; }
                    .social-img { filter: invert(1) !important; }
                    .logo-light { display: none !important; }
                    .logo-dark { display: block !important; }
                    .category-badge { background: ${NEWBI_GREEN} !important; }
                    .attachment-card { background: #111111 !important; border-color: #1e1e1e !important; }
                    .attachment-label { color: #888888 !important; }
                    .attachment-value { color: #ffffff !important; }
                    .attachment-total { background: #0d1f0d !important; }
                    .attachment-total-value { color: #ffffff !important; }
                }

                @media (prefers-color-scheme: light) {
                    body { background-color: #fcfcfc !important; color: #111111 !important; }
                    .container { background-color: #ffffff !important; border-color: #eaeaea !important; }
                    .header { background-color: #ffffff !important; border-color: #eaeaea !important; }
                    .title { color: #111111 !important; }
                    .body-text { color: #444444 !important; }
                    .footer { background-color: #fafafa !important; border-color: #eaeaea !important; }
                    .social-img { filter: none !important; }
                    .logo-dark { display: none !important; }
                    .logo-light { display: block !important; }
                    .category-badge { background: ${NEWBI_GREEN} !important; }
                    .attachment-card { background: #f8f9fa !important; border-color: #e5e7eb !important; }
                    .attachment-label { color: #444444 !important; }
                    .attachment-value { color: #111111 !important; }
                    .attachment-total { background: #f0fdf4 !important; }
                    .attachment-total-value { color: #111111 !important; }
                }
            </style>
        </head>
        <body>
            <span class="preheader">Invoice ${invoiceNumber} for ${clientName} — ₹${amount}</span>
            <div class="container">
                <div class="header">
                    <!-- Light Mode Logo -->
                    <img src="${baseUrl}/logo_document.png" class="logo-light" alt="Newbi" style="display: ${isDark ? 'none' : 'block'}; margin: 0; height: 25px; width: auto; max-width: 180px;">
                    <!-- Dark Mode Logo -->
                    <img src="${baseUrl}/logo_full.png" class="logo-dark" alt="Newbi" style="display: ${isDark ? 'block' : 'none'}; margin: 0; height: 25px; width: auto; max-width: 180px;">
                </div>
                <div class="content">
                    <div class="category-badge">INVOICE</div>
                    <h1 class="title">${headerText}</h1>
                    <div class="body-text">${messageBody}</div>

                    <!-- Attachment-Style Invoice Card (Table-based for maximum email client compatibility) -->
                    <table class="attachment-card" width="100%" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; background: ${cardBg}; border: 1px solid ${cardBorder}; border-radius: 16px; margin: 30px 0; overflow: hidden;">
                        <tr>
                            <td class="attachment-header" style="padding: 16px 20px; border-bottom: 1px solid ${cardBorder};">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                    <tr>
                                        <td width="44" valign="middle" style="width: 44px; padding-right: 14px;">
                                            <div class="attachment-icon" style="width: 44px; height: 44px; background: linear-gradient(135deg, #FF4444, #CC0000); border-radius: 10px; text-align: center; line-height: 44px; color: white; font-weight: 900; font-size: 11px; letter-spacing: 1px;">PDF</div>
                                        </td>
                                        <td valign="middle">
                                            <p class="attachment-filename" style="font-size: 13px; font-weight: 800; color: ${textColor}; letter-spacing: -0.3px; margin: 0;">Invoice-${invoiceNumber}.pdf</p>
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
                                                    <td align="left" class="attachment-label" style="font-size: 10px; font-weight: 800; color: ${subTextColor}; text-transform: uppercase; letter-spacing: 1.5px;">Invoice Number</td>
                                                    <td align="right" class="attachment-value" style="font-size: 13px; font-weight: 700; color: ${textColor};">${invoiceNumber}</td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="attachment-row" style="padding: 10px 0; border-bottom: 1px dashed ${cardBorder};">
                                            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                                <tr>
                                                    <td align="left" class="attachment-label" style="font-size: 10px; font-weight: 800; color: ${subTextColor}; text-transform: uppercase; letter-spacing: 1.5px;">Client</td>
                                                    <td align="right" class="attachment-value" style="font-size: 13px; font-weight: 700; color: ${textColor};">${clientName}</td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    ${dueDate ? `
                                    <tr>
                                        <td class="attachment-row" style="padding: 10px 0; border-bottom: none;">
                                            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                                <tr>
                                                    <td align="left" class="attachment-label" style="font-size: 10px; font-weight: 800; color: ${subTextColor}; text-transform: uppercase; letter-spacing: 1.5px;">Due Date</td>
                                                    <td align="right" class="attachment-value" style="font-size: 13px; font-weight: 700; color: ${textColor};">${dueDate}</td>
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
                                        <td align="left" class="attachment-total-label" style="font-size: 10px; font-weight: 900; color: ${NEWBI_GREEN}; text-transform: uppercase; letter-spacing: 2px; valign: middle;">Total Amount</td>
                                        <td align="right" class="attachment-total-value" style="font-size: 22px; font-weight: 900; color: ${textColor}; letter-spacing: -1px; valign: middle;">₹${amount}</td>
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
                        <a href="${invoiceUrl}" class="cta-button">View Full Invoice</a>
                    </div>
                </div>
                <div class="footer">
                    <div class="social-links">
                        <a href="https://www.instagram.com/newbi.live" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/instagram-new.png" class="social-img" alt="Instagram"></a>
                        <a href="https://linkedin.com/company/newbi-ent" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/linkedin.png" class="social-img" alt="LinkedIn"></a>
                        <a href="https://newbi.live" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/domain.png" class="social-img" alt="Website"></a>
                    </div>
                    <p class="footer-text">© ${new Date().getFullYear()} NEWBI ENTERTAINMENT. ALL RIGHTS RESERVED.</p>
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
        const html = generateOfficialHTML({
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
        const result = await apiFetch('/api/mail', {
            to: toEmail,
            subject: `Payment Confirmed: Invoice #${invoiceNumber}`,
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
        const html = generateOfficialHTML({
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
        const result = await apiFetch('/api/mail', {
            to: toEmail,
            subject: `Payment Update: Invoice #${invoiceNumber}`,
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
    
    // Header background and logo adapt to the theme to avoid a mismatched black header on light emails
    const headerBg = containerBg;
    const headerBorder = borderColor;
    const logoUrl = isDark ? `${baseUrl}/logo_full.png` : `${baseUrl}/logo_document.png`;

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
                .cta-button { display: inline-block; padding: 16px 30px; background-color: ${NEWBI_GREEN}; color: #000000 !important; text-decoration: none; font-weight: 700; font-size: 12px; border-radius: 10px; transition: all 0.2s; }
                .footer { padding: 40px 50px; background-color: ${isDark ? '#050505' : '#fafafa'}; border-top: 1px solid ${borderColor}; text-align: center; }
                .footer-text { font-size: 10px; font-weight: 800; color: #777; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; }
                .social-links { margin-bottom: 20px; }
                .social-icon { display: inline-block; margin: 0 12px; }
                .social-img { width: 18px; height: 18px; opacity: 0.6; ${isDark ? 'filter: invert(1);' : ''} }
                .logo-light { display: ${isDark ? 'none' : 'block'} !important; }
                .logo-dark { display: ${isDark ? 'block' : 'none'} !important; }

                @media screen and (max-width: 600px) {
                    .container { margin: 0 !important; border-radius: 0 !important; border: none !important; width: 100% !important; }
                    .content { padding: 30px 20px !important; }
                    .header { padding: 30px 20px !important; }
                    .footer { padding: 30px 20px !important; }
                    .title { font-size: 24px !important; margin-bottom: 18px !important; }
                    .body-text { font-size: 14px !important; line-height: 1.5 !important; }
                }

                @media (prefers-color-scheme: dark) {
                    body { background-color: #000000 !important; color: #ffffff !important; }
                    .container { background-color: #0a0a0a !important; border-color: #1a1a1a !important; }
                    .header { background-color: #0a0a0a !important; border-color: #1a1a1a !important; }
                    .title { color: #ffffff !important; }
                    .body-text { color: #888888 !important; }
                    .footer { background-color: #050505 !important; border-color: #1a1a1a !important; }
                    .social-img { filter: invert(1) !important; }
                    .logo-light { display: none !important; }
                    .logo-dark { display: block !important; }
                    .category-badge { background: ${NEWBI_GREEN} !important; }
                }

                @media (prefers-color-scheme: light) {
                    body { background-color: #fcfcfc !important; color: #111111 !important; }
                    .container { background-color: #ffffff !important; border-color: #eaeaea !important; }
                    .header { background-color: #ffffff !important; border-color: #eaeaea !important; }
                    .title { color: #111111 !important; }
                    .body-text { color: #444444 !important; }
                    .footer { background-color: #fafafa !important; border-color: #eaeaea !important; }
                    .social-img { filter: none !important; }
                    .logo-dark { display: none !important; }
                    .logo-light { display: block !important; }
                    .category-badge { background: ${NEWBI_GREEN} !important; }
                }
            </style>
        </head>
        <body>
            <span class="preheader">${messageBody.replace(/<[^>]*>?/gm, '').substring(0, 150)}</span>
            <div class="container">
                <div class="header">
                    <!-- Light Mode Logo -->
                    <img src="${baseUrl}/logo_document.png" class="logo-light" alt="Newbi" style="display: ${isDark ? 'none' : 'block'}; margin: 0; height: 25px; width: auto; max-width: 180px;">
                    <!-- Dark Mode Logo -->
                    <img src="${baseUrl}/logo_full.png" class="logo-dark" alt="Newbi" style="display: ${isDark ? 'block' : 'none'}; margin: 0; height: 25px; width: auto; max-width: 180px;">
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
export const sendMassEmail = async (bccArray, subject, htmlContent, accountType = 'official', onProgress = null, fromName = null, fromEmail = null) => {
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
        theme = "light"
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
    
    // Header background and logo adapt to the theme to avoid a mismatched black header on light emails
    const headerBg = containerBg;
    const headerBorder = borderColor;
    const logoUrl = isDark ? `${baseUrl}/logo_full.png` : `${baseUrl}/logo_document.png`;

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
                .logo-light { display: ${isDark ? 'none' : 'block'} !important; }
                .logo-dark { display: ${isDark ? 'block' : 'none'} !important; }

                @media screen and (max-width: 600px) {
                    .container { margin: 0 !important; border-radius: 0 !important; border: none !important; width: 100% !important; }
                    .content { padding: 30px 20px !important; }
                    .header { padding: 30px 20px !important; }
                    .footer { padding: 30px 20px !important; }
                    .title { font-size: 24px !important; margin-bottom: 18px !important; }
                    .body-text { font-size: 14px !important; line-height: 1.5 !important; }
                }

                @media (prefers-color-scheme: dark) {
                    body { background-color: #000000 !important; color: #ffffff !important; }
                    .container { background-color: #0a0a0a !important; border-color: #1a1a1a !important; }
                    .header { background-color: #0a0a0a !important; border-color: #1a1a1a !important; }
                    .title { color: #ffffff !important; }
                    .body-text { color: #888888 !important; }
                    .footer { background-color: #050505 !important; border-color: #1a1a1a !important; }
                    .social-img { filter: invert(1) !important; }
                    .logo-light { display: none !important; }
                    .logo-dark { display: block !important; }
                    .category-badge { background: ${NEWBI_GREEN} !important; }
                    .attachment-card { background: #111111 !important; border-color: #1e1e1e !important; }
                    .attachment-label { color: #888888 !important; }
                    .attachment-value { color: #ffffff !important; }
                }

                @media (prefers-color-scheme: light) {
                    body { background-color: #fcfcfc !important; color: #111111 !important; }
                    .container { background-color: #ffffff !important; border-color: #eaeaea !important; }
                    .header { background-color: #ffffff !important; border-color: #eaeaea !important; }
                    .title { color: #111111 !important; }
                    .body-text { color: #444444 !important; }
                    .footer { background-color: #fafafa !important; border-color: #eaeaea !important; }
                    .social-img { filter: none !important; }
                    .logo-dark { display: none !important; }
                    .logo-light { display: block !important; }
                    .category-badge { background: ${NEWBI_GREEN} !important; }
                    .attachment-card { background: #f8f9fa !important; border-color: #e5e7eb !important; }
                    .attachment-label { color: #444444 !important; }
                    .attachment-value { color: #111111 !important; }
                }
            </style>
        </head>
        <body>
            <span class="preheader">Proposal ${proposalNumber} for ${clientName}</span>
            <div class="container">
                <div class="header">
                    <!-- Light Mode Logo -->
                    <img src="${baseUrl}/logo_document.png" class="logo-light" alt="Newbi" style="display: ${isDark ? 'none' : 'block'}; margin: 0; height: 25px; width: auto; max-width: 180px;">
                    <!-- Dark Mode Logo -->
                    <img src="${baseUrl}/logo_full.png" class="logo-dark" alt="Newbi" style="display: ${isDark ? 'block' : 'none'}; margin: 0; height: 25px; width: auto; max-width: 180px;">
                </div>
                <div class="content">
                    <div class="category-badge">PROPOSAL</div>
                    <h1 class="title">${headerText}</h1>
                    <div class="body-text">${messageBody}</div>

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
                        <a href="${proposalUrl}" class="cta-button">View Full Proposal</a>
                    </div>
                </div>
                <div class="footer">
                    <div class="social-links">
                        <a href="https://www.instagram.com/newbi.live" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/instagram-new.png" class="social-img" alt="Instagram"></a>
                        <a href="https://linkedin.com/company/newbi-ent" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/linkedin.png" class="social-img" alt="LinkedIn"></a>
                        <a href="https://newbi.live" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/domain.png" class="social-img" alt="Website"></a>
                    </div>
                    <p class="footer-text">© ${new Date().getFullYear()} NEWBI ENTERTAINMENT. ALL RIGHTS RESERVED.</p>
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
        theme = "light"
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
    
    // Header background and logo adapt to the theme to avoid a mismatched black header on light emails
    const headerBg = containerBg;
    const headerBorder = borderColor;
    const logoUrl = isDark ? `${baseUrl}/logo_full.png` : `${baseUrl}/logo_document.png`;

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
                .category-badge { display: inline-block; padding: 6px 12px; background: ${NEON_PURPLE}; color: #ffffff; font-size: 9px; font-weight: 900; border-radius: 6px; letter-spacing: 2px; margin-bottom: 20px; text-transform: uppercase; }
                .title { font-size: 28px; font-weight: 800; color: ${textColor}; margin-bottom: 24px; line-height: 1.2; letter-spacing: -0.5px; }
                .body-text { color: ${subTextColor}; font-size: 15px; line-height: 1.6; font-weight: 400; margin-bottom: 30px; }
                
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
                .logo-light { display: ${isDark ? 'none' : 'block'} !important; }
                .logo-dark { display: ${isDark ? 'block' : 'none'} !important; }

                @media screen and (max-width: 600px) {
                    .container { margin: 0 !important; border-radius: 0 !important; border: none !important; width: 100% !important; }
                    .content { padding: 30px 20px !important; }
                    .header { padding: 30px 20px !important; }
                    .footer { padding: 30px 20px !important; }
                    .title { font-size: 24px !important; margin-bottom: 18px !important; }
                    .body-text { font-size: 14px !important; line-height: 1.5 !important; }
                }

                @media (prefers-color-scheme: dark) {
                    body { background-color: #000000 !important; color: #ffffff !important; }
                    .container { background-color: #0a0a0a !important; border-color: #1a1a1a !important; }
                    .header { background-color: #0a0a0a !important; border-color: #1a1a1a !important; }
                    .title { color: #ffffff !important; }
                    .body-text { color: #888888 !important; }
                    .footer { background-color: #050505 !important; border-color: #1a1a1a !important; }
                    .social-img { filter: invert(1) !important; }
                    .logo-light { display: none !important; }
                    .logo-dark { display: block !important; }
                    .category-badge { background: ${NEON_PURPLE} !important; }
                    .attachment-card { background: #111111 !important; border-color: #1e1e1e !important; }
                    .attachment-label { color: #888888 !important; }
                    .attachment-value { color: #ffffff !important; }
                }

                @media (prefers-color-scheme: light) {
                    body { background-color: #fcfcfc !important; color: #111111 !important; }
                    .container { background-color: #ffffff !important; border-color: #eaeaea !important; }
                    .header { background-color: #ffffff !important; border-color: #eaeaea !important; }
                    .title { color: #111111 !important; }
                    .body-text { color: #444444 !important; }
                    .footer { background-color: #fafafa !important; border-color: #eaeaea !important; }
                    .social-img { filter: none !important; }
                    .logo-dark { display: none !important; }
                    .logo-light { display: block !important; }
                    .category-badge { background: ${NEON_PURPLE} !important; }
                    .attachment-card { background: #f8f9fa !important; border-color: #e5e7eb !important; }
                    .attachment-label { color: #444444 !important; }
                    .attachment-value { color: #111111 !important; }
                }
            </style>
        </head>
        <body>
            <span class="preheader">Contract ${agreementNumber} — ${secondPartyName}</span>
            <div class="container">
                <div class="header">
                    <!-- Light Mode Logo -->
                    <img src="${baseUrl}/logo_document.png" class="logo-light" alt="Newbi" style="display: ${isDark ? 'none' : 'block'}; margin: 0; height: 25px; width: auto; max-width: 180px;">
                    <!-- Dark Mode Logo -->
                    <img src="${baseUrl}/logo_full.png" class="logo-dark" alt="Newbi" style="display: ${isDark ? 'block' : 'none'}; margin: 0; height: 25px; width: auto; max-width: 180px;">
                </div>
                <div class="content">
                    <div class="category-badge">CONTRACT</div>
                    <h1 class="title">${headerText}</h1>
                    <div class="body-text">${messageBody}</div>

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
                        <a href="${agreementUrl}" class="cta-button">View & Sign Agreement</a>
                    </div>
                </div>
                <div class="footer">
                    <div class="social-links">
                        <a href="https://www.instagram.com/newbi.live" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/instagram-new.png" class="social-img" alt="Instagram"></a>
                        <a href="https://linkedin.com/company/newbi-ent" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/linkedin.png" class="social-img" alt="LinkedIn"></a>
                        <a href="https://newbi.live" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/domain.png" class="social-img" alt="Website"></a>
                    </div>
                    <p class="footer-text">© ${new Date().getFullYear()} NEWBI ENTERTAINMENT. ALL RIGHTS RESERVED.</p>
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
        theme = "dark"
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
    
    const headerBg = containerBg;
    const headerBorder = borderColor;

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
                .logo-light { display: ${isDark ? 'none' : 'block'} !important; }
                .logo-dark { display: ${isDark ? 'block' : 'none'} !important; }

                @media screen and (max-width: 600px) {
                    .container { margin: 0 !important; border-radius: 0 !important; border: none !important; width: 100% !important; }
                    .content { padding: 30px 20px !important; }
                    .header { padding: 30px 20px !important; }
                    .footer { padding: 30px 20px !important; }
                    .title { font-size: 24px !important; margin-bottom: 18px !important; }
                    .body-text { font-size: 14px !important; line-height: 1.5 !important; }
                }

                @media (prefers-color-scheme: dark) {
                    body { background-color: #000000 !important; color: #ffffff !important; }
                    .container { background-color: #0a0a0a !important; border-color: #1a1a1a !important; }
                    .header { background-color: #0a0a0a !important; border-color: #1a1a1a !important; }
                    .title { color: #ffffff !important; }
                    .body-text { color: #888888 !important; }
                    .footer { background-color: #050505 !important; border-color: #1a1a1a !important; }
                    .social-img { filter: invert(1) !important; }
                    .logo-light { display: none !important; }
                    .logo-dark { display: block !important; }
                    .category-badge { background: ${NEWBI_GREEN} !important; }
                    .attachment-card { background: #111111 !important; border-color: #1e1e1e !important; }
                    .attachment-label { color: #888888 !important; }
                    .attachment-value { color: #ffffff !important; }
                    .attachment-total { background: #0d1f0d !important; }
                    .attachment-total-value { color: #ffffff !important; }
                }

                @media (prefers-color-scheme: light) {
                    body { background-color: #fcfcfc !important; color: #111111 !important; }
                    .container { background-color: #ffffff !important; border-color: #eaeaea !important; }
                    .header { background-color: #ffffff !important; border-color: #eaeaea !important; }
                    .title { color: #111111 !important; }
                    .body-text { color: #444444 !important; }
                    .footer { background-color: #fafafa !important; border-color: #eaeaea !important; }
                    .social-img { filter: none !important; }
                    .logo-dark { display: none !important; }
                    .logo-light { display: block !important; }
                    .category-badge { background: ${NEWBI_GREEN} !important; }
                    .attachment-card { background: #f8f9fa !important; border-color: #e5e7eb !important; }
                    .attachment-label { color: #444444 !important; }
                    .attachment-value { color: #111111 !important; }
                    .attachment-total { background: #f0fdf4 !important; }
                    .attachment-total-value { color: #111111 !important; }
                }
            </style>
        </head>
        <body>
            <span class="preheader">Payout Receipt ${reference} to ${receiverName} — ₹${amount}</span>
            <div class="container">
                <div class="header">
                    <!-- Light Mode Logo -->
                    <img src="${baseUrl}/logo_document.png" class="logo-light" alt="Newbi" style="display: ${isDark ? 'none' : 'block'}; margin: 0; height: 25px; width: auto; max-width: 180px;">
                    <!-- Dark Mode Logo -->
                    <img src="${baseUrl}/logo_full.png" class="logo-dark" alt="Newbi" style="display: ${isDark ? 'block' : 'none'}; margin: 0; height: 25px; width: auto; max-width: 180px;">
                </div>
                <div class="content">
                    <div class="category-badge">PAYOUT RECEIPT</div>
                    <h1 class="title">${headerText}</h1>
                    <div class="body-text">${messageBody}</div>

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
                        <a href="${verifyUrl}" class="cta-button">Verify Payout</a>
                    </div>
                </div>
                <div class="footer">
                    <div class="social-links">
                        <a href="https://www.instagram.com/newbi.live" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/instagram-new.png" class="social-img" alt="Instagram"></a>
                        <a href="https://linkedin.com/company/newbi-ent" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/linkedin.png" class="social-img" alt="LinkedIn"></a>
                        <a href="https://newbi.live" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/domain.png" class="social-img" alt="Website"></a>
                    </div>
                    <p class="footer-text">© ${new Date().getFullYear()} NEWBI ENTERTAINMENT. ALL RIGHTS RESERVED.</p>
                </div>
            </div>
        </body>
        </html>
    `;
};


/**
 * Sends a welcome confirmation email to creators upon registration.
 */
export const sendCreatorWelcomeEmail = async (toEmail, creatorName) => {
    try {
        const html = generateCreatorWelcomeHTML(creatorName);
        const result = await apiFetch('/api/mail', {
            to: toEmail,
            subject: `Welcome to Newbi Creators! 🚀`,
            fromName: 'Newbii Creators',
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
 * Generates the HTML for the creator welcome email.
 */
export const generateCreatorWelcomeHTML = (creatorName) => {
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
                .welcome-badge { display: inline-block; padding: 6px 12px; background: linear-gradient(90deg, #00f2ff, #FF4F8B); color: #000000; font-size: 10px; font-weight: 900; border-radius: 6px; letter-spacing: 2px; margin-bottom: 24px; text-transform: uppercase; }
                .title { font-size: 32px; font-weight: 900; line-height: 1.2; letter-spacing: -1px; margin-bottom: 24px; color: #ffffff; text-transform: uppercase; font-style: italic; }
                .pink-text { color: #FF4F8B; }
                .blue-text { color: #00f2ff; }
                .body-text { color: #a0a0a0; font-size: 16px; line-height: 1.6; font-weight: 400; margin-bottom: 30px; }
                
                .studio-card { background: #121212; border: 1px solid #222222; border-radius: 16px; padding: 24px; margin: 30px 0; }
                .studio-card h3 { font-size: 18px; font-weight: 800; color: #00f2ff; margin-top: 0; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
                .studio-card p { font-size: 14px; color: #888888; line-height: 1.5; margin: 0; }
                
                .cta-button { display: inline-block; padding: 18px 36px; background: linear-gradient(90deg, #00f2ff, #FF4F8B); color: #000000 !important; text-decoration: none; font-weight: 900; font-size: 13px; border-radius: 12px; letter-spacing: 1.5px; text-transform: uppercase; box-shadow: 0 0 20px rgba(0,242,255,0.3); }
                .footer { padding: 40px 50px; background-color: #050505; border-top: 1px solid #1a1a1a; text-align: center; }
                .footer-text { font-size: 10px; font-weight: 800; color: #555555; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 15px; }
                .social-links { margin-bottom: 20px; }
                .social-icon { display: inline-block; margin: 0 12px; }
                .social-img { width: 18px; height: 18px; opacity: 0.5; filter: invert(1); }
                .logo-light { display: none; }
                .logo-dark { display: block; }
                
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
                    .header { background-color: #ffffff !important; border-color: #e5e7eb !important; }
                    .welcome-badge { background: linear-gradient(90deg, #0099aa, #cc3366) !important; }
                    .title { color: #111111 !important; }
                    .body-text { color: #444444 !important; }
                    .studio-card { background: #f8f9fa !important; border-color: #e5e7eb !important; }
                    .studio-card h3 { color: #0099aa !important; }
                    .studio-card p { color: #555555 !important; }
                    .cta-button { box-shadow: 0 0 20px rgba(0,153,170,0.2) !important; }
                    .footer { background-color: #fafafa !important; border-color: #e5e7eb !important; }
                    .footer-text { color: #999999 !important; }
                    .social-img { filter: none !important; opacity: 0.5 !important; }
                    .logo-dark { display: none !important; }
                    .logo-light { display: block !important; }
                }
            </style>
        </head>
        <body>
            <span class="preheader">Your creator application is received. Welcome to Newbi!</span>
            <div class="container">
                <div class="header">
                    <!-- Light Mode Logo -->
                    <img src="${baseUrl}/logo_document.png" class="logo-light" alt="Newbi" style="display: none; margin: 0; height: 25px; width: auto; max-width: 180px;">
                    <!-- Dark Mode Logo -->
                    <img src="${baseUrl}/logo_full.png" class="logo-dark" alt="Newbi" style="display: block; margin: 0; height: 25px; width: auto; max-width: 180px;">
                </div>
                <div class="content">
                    <div class="welcome-badge">CREATOR WORKSPACE</div>
                    <h1 class="title">Welcome to <span class="blue-text">Newbi</span> <span class="pink-text">Creators</span></h1>
                    <p class="body-text">Hi <strong>${creatorName}</strong>,</p>
                    <p class="body-text">Your profile has been successfully submitted and is currently being reviewed by our partnerships team. We're excited to have you on board as we connect elite creators with top-tier brands.</p>
                    
                    <div class="studio-card">
                        <h3>Creator Studio Workspace</h3>
                        <p>In the meantime, you can explore your dashboard, link your social channels, verify your contact information, and get ready to join upcoming campaigns.</p>
                    </div>

                    <div style="text-align: center; margin: 40px 0;">
                        <a href="https://newbi.live/creator-dashboard" class="cta-button">Go to Creator Dashboard</a>
                    </div>
                </div>
                <div class="footer">
                    <div class="social-links">
                        <a href="https://www.instagram.com/newbi.live" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/instagram-new.png" class="social-img" alt="Instagram"></a>
                        <a href="https://linkedin.com/company/newbi-ent" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/linkedin.png" class="social-img" alt="LinkedIn"></a>
                        <a href="https://newbi.live" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/domain.png" class="social-img" alt="Website"></a>
                    </div>
                    <p class="footer-text">© ${new Date().getFullYear()} NEWBI ENTERTAINMENT. ALL RIGHTS RESERVED.</p>
                </div>
            </div>
        </body>
        </html>
    `;
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
    const campaignUrl = `https://newbi.live/campaigns`;
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
                .logo-light { display: none; }
                .logo-dark { display: block; }
                
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
                    .header { background-color: #ffffff !important; border-color: #e5e7eb !important; }
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
                    .logo-dark { display: none !important; }
                    .logo-light { display: block !important; }
                }
            </style>
        </head>
        <body>
            <span class="preheader">New Campaign: ${campaign.title} is now active in ${cityText}.</span>
            <div class="container">
                <div class="header">
                    <!-- Light Mode Logo -->
                    <img src="${baseUrl}/logo_document.png" class="logo-light" alt="Newbi" style="display: none; margin: 0; height: 25px; width: auto; max-width: 180px;">
                    <!-- Dark Mode Logo -->
                    <img src="${baseUrl}/logo_full.png" class="logo-dark" alt="Newbi" style="display: block; margin: 0; height: 25px; width: auto; max-width: 180px;">
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
                        <a href="https://www.instagram.com/newbi.live" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/instagram-new.png" class="social-img" alt="Instagram"></a>
                        <a href="https://linkedin.com/company/newbi-ent" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/linkedin.png" class="social-img" alt="LinkedIn"></a>
                        <a href="https://newbi.live" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/domain.png" class="social-img" alt="Website"></a>
                    </div>
                    <p class="footer-text">© ${new Date().getFullYear()} NEWBI ENTERTAINMENT. ALL RIGHTS RESERVED.</p>
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
        const html = generateCreatorApprovedHTML(creatorName);
        const result = await apiFetch('/api/mail', {
            to: toEmail,
            subject: `Congratulations! Your Creator Profile is Verified 🚀`,
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
                
                .studio-card { background: #121212; border: 1px solid #222222; border-radius: 16px; padding: 24px; margin: 30px 0; }
                .studio-card h3 { font-size: 18px; font-weight: 800; color: #00f2ff; margin-top: 0; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
                .studio-card p { font-size: 14px; color: #888888; line-height: 1.5; margin: 0; }
                
                .cta-button { display: inline-block; padding: 18px 36px; background: linear-gradient(90deg, #00f2ff, #FF4F8B); color: #000000 !important; text-decoration: none; font-weight: 900; font-size: 13px; border-radius: 12px; letter-spacing: 1.5px; text-transform: uppercase; box-shadow: 0 0 20px rgba(0,242,255,0.3); }
                .footer { padding: 40px 50px; background-color: #050505; border-top: 1px solid #1a1a1a; text-align: center; }
                .footer-text { font-size: 10px; font-weight: 800; color: #555555; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 15px; }
                .social-links { margin-bottom: 20px; }
                .social-icon { display: inline-block; margin: 0 12px; }
                .social-img { width: 18px; height: 18px; opacity: 0.5; filter: invert(1); }
                .logo-light { display: none; }
                .logo-dark { display: block; }
                
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
                    .header { background-color: #ffffff !important; border-color: #e5e7eb !important; }
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
                    .logo-dark { display: none !important; }
                    .logo-light { display: block !important; }
                }
            </style>
        </head>
        <body>
            <span class="preheader">Congratulations! Your Newbi Creators profile has been verified.</span>
            <div class="container">
                <div class="header">
                    <!-- Light Mode Logo -->
                    <img src="${baseUrl}/logo_document.png" class="logo-light" alt="Newbi" style="display: none; margin: 0; height: 25px; width: auto; max-width: 180px;">
                    <!-- Dark Mode Logo -->
                    <img src="${baseUrl}/logo_full.png" class="logo-dark" alt="Newbi" style="display: block; margin: 0; height: 25px; width: auto; max-width: 180px;">
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
                        <a href="https://www.instagram.com/newbi.live" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/instagram-new.png" class="social-img" alt="Instagram"></a>
                        <a href="https://linkedin.com/company/newbi-ent" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/linkedin.png" class="social-img" alt="LinkedIn"></a>
                        <a href="https://newbi.live" class="social-icon"><img src="https://img.icons8.com/material-outlined/48/domain.png" class="social-img" alt="Website"></a>
                    </div>
                    <p class="footer-text">© ${new Date().getFullYear()} NEWBI ENTERTAINMENT. ALL RIGHTS RESERVED.</p>
                </div>
            </div>
        </body>
        </html>
    `;
};


