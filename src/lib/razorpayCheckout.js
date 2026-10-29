/*
 * Razorpay's checkout window, shared by ticket booking and invoice payment.
 * The script loads only when someone goes to pay. Razorpay is the only way
 * Newbi takes money: UPI, cards and netbanking all happen inside it.
 */
let razorpayScript = null;

export const loadRazorpay = () => {
    if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
    if (window.Razorpay) return Promise.resolve(window.Razorpay);
    if (!razorpayScript) {
        razorpayScript = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://checkout.razorpay.com/v1/checkout.js';
            s.async = true;
            s.onload = () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error('no Razorpay')));
            s.onerror = () => { razorpayScript = null; reject(new Error('script failed')); };
            document.head.appendChild(s);
        });
    }
    return razorpayScript;
};
