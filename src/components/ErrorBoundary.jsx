import React from 'react';
import { safeSessionStorage } from '../lib/storage';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    // When used around a route, a new resetKey (the pathname) clears the error so
    // navigating away from a broken page works without a full reload.
    componentDidUpdate(prevProps) {
        if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
            this.setState({ hasError: false, error: null, errorInfo: null });
        }
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
            try {
                const lastReload = safeSessionStorage.getItem('last-chunk-reload');
                const now = Date.now();
                
                // Only reload if we haven't reloaded in the last 5 seconds to avoid infinite loops
                if (!lastReload || now - parseInt(lastReload) > 5000) {
                    safeSessionStorage.setItem('last-chunk-reload', now.toString());
                    console.warn('Detected dynamic import error in ErrorBoundary, reloading page...');
                    window.location.reload();
                }
            } catch (e) {
                console.warn('Error in ErrorBoundary chunk reload handler:', e);
            }
        }
    }


    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-[60vh] flex items-center justify-center p-6 text-gray-900 dark:text-white">
                    <div className="text-center space-y-4 max-w-md">
                        <h1 className="text-2xl font-black">Something went wrong on this page.</h1>
                        <p className="text-sm text-gray-500">Please reload. If it keeps happening, let us know at support@newbi.live.</p>
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-3 bg-neon-green text-black font-black uppercase tracking-widest text-xs rounded-2xl"
                            >
                                Reload Page
                            </button>
                            <a href="/" className="px-6 py-3 text-xs font-bold underline">Return Home</a>
                        </div>
                        {import.meta.env.DEV && (
                            <details className="text-left text-xs whitespace-pre-wrap">
                                <summary>Error details</summary>
                                <p className="text-red-400 mt-2">{this.state.error && this.state.error.toString()}</p>
                                <p className="text-gray-500">{this.state.errorInfo && this.state.errorInfo.componentStack}</p>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
