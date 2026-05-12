import { auth } from './firebase';

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
