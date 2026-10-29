/*
 * Razorpay's checkout window, shared by ticket booking and invoice payment.
 * The script loads only when someone is about to pay (preloadRazorpay when
 * the pay screen opens, so the window appears faster). Razorpay is the only
 * way Newbi takes money: UPI, cards and netbanking all happen inside it.
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

/** Warm the script up before the click. Never throws. */
export const preloadRazorpay = () => { loadRazorpay().catch(() => {}); };

/** Newbi's look inside Razorpay's window: our logo, accent colour and a dimmed backdrop. */
export const razorpayBrand = (color = '#16a34a') => ({
    image: typeof window !== 'undefined' ? `${window.location.origin}/brand/newbi-icon-512.png` : undefined,
    theme: { color, backdrop_color: 'rgba(8, 8, 10, 0.72)' },
    retry: { enabled: true, max_count: 3 },
});
