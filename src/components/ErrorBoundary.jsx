import React from 'react';
import { isChunkLoadError, isPageLeaving, reloadForNewChunks } from '../lib/chunkReload';
import { forceHideSplash, holdSplash } from '../lib/splash';
import { isAppHost, landingAppBase } from '../app/host';
import { t } from '../i18n';

/*
 * Catches a page that crashed while rendering.
 *
 * The error screen waits a moment before it shows: going Back or Forward to another
 * document cancels the page's in-flight requests, and a page chunk that fails that way
 * would otherwise flash "Something went wrong" just before the next page appears. A
 * chunk that failed because of a new deploy reloads behind the N. splash instead.
 *
 * `inline` draws the error inside the app shell (the tabs stay usable), and a new
 * `resetKey` (the path) or Back/Forward clears it, so leaving the broken page recovers.
 */

const GRACE_MS = 600;

// Where "Go home" leads from wherever the crash happened.
const homeHref = () => {
    if (typeof window === 'undefined') return '/';
    const path = window.location.pathname;
    if (path === '/admin' || path.startsWith('/admin/')) return '/admin';
    if (isAppHost()) return '/';
    const base = landingAppBase();
    return base && (path === base || path.startsWith(`${base}/`)) ? base : '/';
};

const initialState = { hasError: false, error: null, errorInfo: null, showing: false, reloading: false };

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = initialState;
        this.graceTimer = null;
        this.releaseSplash = null;
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidMount() {
        window.addEventListener('popstate', this.onHistory);
    }

    componentWillUnmount() {
        window.removeEventListener('popstate', this.onHistory);
        clearTimeout(this.graceTimer);
        this.releaseSplash?.();
    }

    componentDidUpdate(prevProps) {
        if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) this.reset();
    }

    componentDidCatch(error, errorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ errorInfo });

        // A chunk that failed to load (usually right after a deploy): reload behind the splash.
        if (isChunkLoadError(error)) {
            const reloading = reloadForNewChunks();
            this.setState({ reloading });
            if (reloading) {
                if (!this.props.inline && !this.releaseSplash) this.releaseSplash = holdSplash();
                return;
            }
        }

        clearTimeout(this.graceTimer);
        this.graceTimer = setTimeout(() => {
            // On the way to another page: let it arrive instead of flashing an error.
            if (isPageLeaving()) return;
            if (!this.props.inline) forceHideSplash();
            this.setState({ showing: true });
        }, GRACE_MS);
    }

    // Back or Forward away from the broken page tries again.
    onHistory = () => {
        if (this.state.hasError && !this.state.reloading) this.reset();
    };

    reset = () => {
        clearTimeout(this.graceTimer);
        this.setState(initialState);
    };

    renderScreen(title, message, actions) {
        const { inline } = this.props;
        return (
            <div
                role="alert"
                className={inline
                    ? 'mx-auto my-10 max-w-md px-4 text-center'
                    : 'flex min-h-dvh flex-col items-center justify-center bg-[#F4F2EC] px-6 text-center dark:bg-[#050505]'}
            >
                <div className={inline ? 'rounded-[1.75rem] bg-white/70 p-8 ring-1 ring-inset ring-black/[0.06] dark:bg-white/[0.04] dark:ring-white/10' : 'max-w-sm'}>
                    <h1 className="font-heading text-[22px] font-extrabold tracking-[-0.02em] text-gray-950 dark:text-white">{title}</h1>
                    <p className="mt-2 text-[15px] text-gray-600 dark:text-zinc-400">{message}</p>
                    <div className="mt-6 flex flex-wrap justify-center gap-2">{actions}</div>
                    {import.meta.env.DEV && this.state.error && (
                        <details className="mt-6 whitespace-pre-wrap text-left font-mono text-[12px] text-gray-500 dark:text-zinc-500">
                            <summary className="cursor-pointer">Error details (dev only)</summary>
                            <p className="mt-2 text-red-600 dark:text-red-400">{String(this.state.error)}</p>
                            <p>{this.state.errorInfo?.componentStack}</p>
                        </details>
                    )}
                </div>
            </div>
        );
    }

    render() {
        const { hasError, error, showing, reloading } = this.state;
        if (!hasError) return this.props.children;

        // Reloading, or still inside the grace period: keep the screen calm.
        if (reloading || !showing) {
            return this.props.inline
                ? <div className="min-h-[50vh]" aria-busy="true" />
                : <div className="min-h-dvh bg-[#F4F2EC] dark:bg-[#050505]" aria-busy="true" />;
        }

        const primary = 'inline-flex h-12 items-center rounded-full bg-gray-950 px-6 text-[15px] font-bold text-white dark:bg-white dark:text-black';
        const secondary = 'inline-flex h-12 items-center rounded-full px-6 text-[15px] font-bold text-gray-700 ring-1 ring-inset ring-black/10 dark:text-zinc-300 dark:ring-white/15';
        const reload = <button key="reload" type="button" onClick={() => window.location.reload()} className={primary}>{t('Reload')}</button>;

        if (isChunkLoadError(error)) {
            return this.renderScreen(t("This page didn't load"), t('Check your connection and try again.'), [reload]);
        }
        return this.renderScreen(
            t('Something went wrong'),
            t('This page ran into a problem. Reloading usually fixes it.'),
            [reload, <a key="home" href={homeHref()} className={secondary}>{t('Go home')}</a>],
        );
    }
}

export default ErrorBoundary;
