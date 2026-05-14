import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);

        // Check if it's a dynamic import error (chunk failure)
        const errorMessage = error?.message || "";
        const isDynamicImportError = 
            errorMessage.includes('Failed to fetch dynamically imported module') ||
            errorMessage.includes('Importing a module script failed');

        if (isDynamicImportError) {
            const lastReload = sessionStorage.getItem('last-chunk-reload');
            const now = Date.now();
            
            // Only reload if we haven't reloaded in the last 5 seconds to avoid infinite loops
            if (!lastReload || now - parseInt(lastReload) > 5000) {
                sessionStorage.setItem('last-chunk-reload', now.toString());
                console.warn('Detected dynamic import error in ErrorBoundary, reloading page...');
                window.location.reload();
            }
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', color: 'white', background: '#111', minHeight: '100vh', fontFamily: 'monospace' }}>
                    <h1 style={{ color: '#ff0055', fontSize: '2rem', marginBottom: '1rem' }}>Something went wrong.</h1>
                    <details style={{ whiteSpace: 'pre-wrap' }}>
                        <summary>Click for error details</summary>
                        <p style={{ color: '#ffaaaa', marginTop: '1rem' }}>{this.state.error && this.state.error.toString()}</p>
                        <p style={{ color: '#888' }}>{this.state.errorInfo && this.state.errorInfo.componentStack}</p>
                    </details>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ marginTop: '2rem', padding: '0.5rem 1rem', background: '#333', color: 'white', border: 'none', cursor: 'pointer' }}
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
