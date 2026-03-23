import emailjs from '@emailjs/browser';

// CONFIGURATION: These should be set in your .env file
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'YOUR_SERVICE_ID';
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY';
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'YOUR_TEMPLATE_ID';

/**
 * Sends a ticket email to the user.
 * @param {string} toName - Name of the recipient
 * @param {string} toEmail - Email of the recipient
 * @param {string} ticketUrl - URL of the ticket image
 * @param {string} eventName - Name of the event
 * @param {string} bookingRef - Booking Reference ID
 */

/**
 * Sends a ticket email to the user.
 * @param {string} toName - Name of the recipient
 * @param {string} toEmail - Email of the recipient
 * @param {string} ticketUrl - URL of the ticket image
 * @param {string} eventName - Name of the event
 * @param {string} bookingRef - Booking Reference ID
 */
export const sendTicketEmail = async (toName, toEmail, ticketUrl, eventName, bookingRef) => {
    try {
        // Legacy simple template
        const templateParams = {
            to_name: toName,
            to_email: toEmail,
            ticket_url: Array.isArray(ticketUrl) ? ticketUrl[0] : ticketUrl, // Fallback for email templates
            ticket_links: Array.isArray(ticketUrl) ? ticketUrl.join('\n') : ticketUrl,
            event_name: eventName,
            booking_ref: bookingRef,
            message: `Here are your tickets for ${eventName}. We look forward to seeing you there!`
        };

        const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
        console.log('Email sent successfully!', response.status, response.text);
        return { success: true };
    } catch (error) {
        console.error('Failed to send email:', error);
        return { success: false, error };
    }
};


/**
 * Helper to convert a URL to a Base64 string for attachments.
 */
const urlToBase64 = async (url) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]); // Remove data:application/pdf;base64, prefix
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Error converting URL to base64:", error);
        return null;
    }
};

/**
 * Sends an event booking confirmation email (replaces generic order confirmation).
 * 
 * Template Data Structure for EmailJS ('event_booking_confirmation'):
 * - event_name: string
 * - event_date: string (e.g. "Oct 24, 2026 @ 7:00 PM")
 * - event_location: string
 * - event_image_url: string (optional hero image)
 * - booking_ref: string
 * - tickets: array of { name: "VIP", count: 2, price: 500 }
 * - total_amount: string/number
 * - to_name: string
 * - to_email: string
 * 
 * @param {Object} bookingData - The booking data object matching the structure above plus ticket_url for attachment
 */
export const sendBookingConfirmation = async (bookingData) => {
    try {
        const { to_name, to_email, event_name, booking_ref, tickets_html, total_amount, payment_ref, ticket_url } = bookingData;
        
        const params = {
            to_name,
            to_email,
            event_name,
            booking_ref, // The "Unique Code"
            tickets_html, // For "Email Invoice" style listing
            total_amount,
            payment_ref,
            ticket_link: Array.isArray(ticket_url) ? ticket_url[0] : ticket_url, // Link to the digital asset
            view_ticket_url: `https://newbi.live/ticket/${booking_ref}`, // Direct portal link
            message: `Your payment for ${event_name} has been verified successfully. Your unique access code is below.`
        };

        // Use your Event Booking Template ID
        // Note: For "Email Invoice" look, the EmailJS template should use these variables 
        // to render a nice HTML table.
        const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, params, PUBLIC_KEY);
        console.log('Automated booking email sent successfully!', response.status, response.text);
        return { success: true };
    } catch (error) {
        console.error('Failed to send automated booking email:', error);
        return { success: false, error };
    }
};


/**
 * Sends a contact form auto-reply (and optionally admin notification).
 * @param {string} name - User's name
 * @param {string} email - User's email
 * @param {string} message - User's message
 */
export const sendContactAutoReply = async (name, email, message) => {
    try {
        // Use your Contact Auto-Reply Template ID
        // const CONTACT_TEMPLATE_ID = 'YOUR_CONTACT_TEMPLATE_ID';
        const templateParams = {
            name,
            email, // EmailJS often uses 'to_email' or maps this in dashboard
            message,
            to_email: email // Explicitly set if template expects it
        };
        const response = await emailjs.send(SERVICE_ID, 'YOUR_CONTACT_TEMPLATE_ID', templateParams, PUBLIC_KEY);
        return { success: true };
    } catch (error) {
        console.error('Failed to send contact email:', error);
        return { success: false, error };
    }
};

/**
 * Sends an invoice share email.
 * @param {string} toEmail - Recipient email
 * @param {string} invoiceNumber - Invoice ID/Number
 * @param {string} amount - Formatted amount (e.g. "$500")
 * @param {string} invoiceUrl - Link to the invoice
 */
export const sendInvoiceEmail = async (toEmail, invoiceNumber, amount, invoiceUrl) => {
    try {
        // Use your Invoice Share Template ID
        const templateParams = {
            to_email: toEmail,
            invoice_number: invoiceNumber,
            amount,
            invoice_url: invoiceUrl
        };
        const response = await emailjs.send(SERVICE_ID, 'YOUR_INVOICE_TEMPLATE_ID', templateParams, PUBLIC_KEY);
        return { success: true };
    } catch (error) {
        console.error('Failed to send invoice email:', error);
        return { success: false, error };
    }
};
