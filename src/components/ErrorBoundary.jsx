import React from 'react';
import { isChunkLoadError, reloadForNewChunks } from '../lib/chunkReload';
import { forceHideSplash } from '../lib/splash';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // The error screen must be visible, not covered by the loading splash.
        forceHideSplash();
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);

        // A chunk that failed to load (usually right after a deploy): reload rather than show the dump.
        if (isChunkLoadError(error)) {
            this.setState({ reloading: reloadForNewChunks() });
        }
    }


    render() {
        if (this.state.hasError && isChunkLoadError(this.state.error)) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem', minHeight: '100vh', background: '#111', color: 'white', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                        {this.state.reloading ? 'Loading the latest version…' : "This page didn't load"}
                    </h1>
                    {!this.state.reloading && (
                        <>
                            <p style={{ color: '#aaa', maxWidth: '22rem' }}>Check your connection and try again.</p>
                            <button
                                onClick={() => window.location.reload()}
                                style={{ padding: '0.6rem 1.2rem', background: '#333', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                            >
                                Reload
                            </button>
                        </>
                    )}
                </div>
            );
        }

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
