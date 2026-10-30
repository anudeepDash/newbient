/*
 * Razorpay's checkout window, shared by ticket booking and invoice payment.
 * The script loads only when someone is about to pay (preloadRazorpay when
 * the pay screen opens, so the window appears faster). Razorpay is the only
 * way Newbi takes money: UPI, cards and netbanking all happen inside it.
 */
let razorpayScript = null;

/*
 * Razorpay's window is a light page in an iframe. Under our dark colour scheme the browser paints an
 * opaque white canvas behind it, hiding the dimmed site, so the frame is kept light (and see-through).
 * Set here, not in a stylesheet, because each part of the site loads its own CSS.
 */
const keepFrameSeeThrough = () => {
    if (document.getElementById('nb-razorpay-frame')) return;
    const style = document.createElement('style');
    style.id = 'nb-razorpay-frame';
    style.textContent = '.razorpay-checkout-frame { color-scheme: light; }';
    document.head.appendChild(style);
};

export const loadRazorpay = () => {
    if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
    keepFrameSeeThrough();
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

/** The methods Razorpay can show, by the name our buttons use. */
export const PAY_METHODS = ['upi', 'card', 'netbanking', 'wallet'];

/**
 * Open Razorpay on one method (a button per method), or on all of them when none is given.
 * Razorpay hides the methods set to false, so the window is short and focused.
 */
export const razorpayMethodOptions = (method) => (PAY_METHODS.includes(method)
    ? { method: { upi: method === 'upi', card: method === 'card', netbanking: method === 'netbanking', wallet: method === 'wallet', emi: false, paylater: false } }
    : {});

/**
 * Razorpay's window over the site. Its colour and logo come from the Razorpay dashboard
 * (Checkout styling), so neither is set here: anything passed in code would override it.
 * Only the dimmed backdrop is ours, so it opens as a window over the site
 * (keepFrameSeeThrough stops it sitting on white in dark mode).
 */
export const razorpayBrand = () => ({
    theme: { backdrop_color: 'rgba(8, 8, 10, 0.72)' },
    retry: { enabled: true, max_count: 3 },
});
