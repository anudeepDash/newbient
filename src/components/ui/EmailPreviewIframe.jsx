import React, { useEffect, useRef } from 'react';

/**
 * Renders an HTML email in a sandboxed iframe to prevent global CSS leakage.
 * The iframe is sized to match the content height automatically.
 * 
 * @param {string} html - The complete HTML document string to render.
 * @param {string} [className] - Optional Tailwind/CSS class for the wrapper div.
 */
const EmailPreviewIframe = ({ html, className = '' }) => {
    const iframeRef = useRef(null);

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe || !html) return;

        // Write the full HTML document into the sandboxed iframe
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;

        doc.open();
        doc.write(html);
        doc.close();

        // Auto-resize the iframe to fit its content height
        const resize = () => {
            try {
                const body = doc.body;
                const docEl = doc.documentElement;
                if (body && docEl) {
                    const height = Math.max(
                        body.scrollHeight,
                        body.offsetHeight,
                        docEl.clientHeight,
                        docEl.scrollHeight,
                        docEl.offsetHeight
                    );
                    iframe.style.height = `${height}px`;
                }
            } catch (e) {
                // Cross-origin frames would throw; safe to ignore
            }
        };

        // Resize after content loads
        iframe.onload = resize;
        // Also resize after a short delay to catch late-rendering images/fonts
        const timer = setTimeout(resize, 300);
        return () => clearTimeout(timer);
    }, [html]);

    return (
        <div className={className} style={{ width: '100%' }}>
            <iframe
                ref={iframeRef}
                title="Email Preview"
                sandbox="allow-same-origin"
                style={{
                    width: '100%',
                    border: 'none',
                    display: 'block',
                    minHeight: '200px',
                    height: 'auto',
                    overflow: 'hidden',
                }}
                scrolling="no"
            />
        </div>
    );
};

export default EmailPreviewIframe;
