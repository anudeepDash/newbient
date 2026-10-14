// Clipboard copy that also works inside in-app browsers (Instagram, WhatsApp,
// Facebook) and on non-secure origins, where navigator.clipboard is missing or
// rejects. Resolves true when the text was copied.
export const copyToClipboard = async (text) => {
    const value = String(text ?? '');
    if (!value) return false;

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(value);
            return true;
        } catch {
            // fall through to the legacy path
        }
    }

    try {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '-1000px';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, value.length);
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        return ok;
    } catch {
        return false;
    }
};
