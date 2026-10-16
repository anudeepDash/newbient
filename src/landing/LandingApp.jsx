import { Suspense, useEffect, useLayoutEffect, useRef } from 'react';
import { Routes, Route, useLocation, Link } from 'react-router-dom';
import LandingNav from './components/LandingNav';
import LandingFooter from './components/LandingFooter';
import { LANDING_ROUTES, findRoute } from './routes';
import { usePublicFeed, isOff } from './feed';

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

// Scroll to #anchors (also after navigating from another page) and to the top on page changes.
function ScrollManager() {
    const { pathname, hash } = useLocation();
    const first = useRef(true);
    useIsoLayoutEffect(() => {
        if (first.current) { first.current = false; if (!hash) return undefined; }
        if (!hash) { window.scrollTo(0, 0); return undefined; }
        // Sections filled from the feed (#work, #upcoming) appear a moment after load: keep looking briefly.
        let tries = 0;
        let timer;
        const find = () => {
            const el = document.getElementById(decodeURIComponent(hash.slice(1)));
            if (el) el.scrollIntoView({ block: 'start' });
            else if (tries++ < 30) timer = setTimeout(find, 100);
        };
        find();
        return () => clearTimeout(timer);
    }, [pathname, hash]);
    return null;
}

// Keeps the tab title right after client-side navigation (prerendered pages already have it).
function TitleSync() {
    const { pathname } = useLocation();
    useEffect(() => {
        const route = findRoute(pathname);
        if (route) document.title = route.meta.title;
    }, [pathname]);
    return null;
}

function Maintenance() {
    return (
        <div className="min-h-[70dvh] flex items-center justify-center px-6 text-center">
            <div className="space-y-4 max-w-md">
                <h1 className="font-heading text-3xl font-bold text-gray-950 dark:text-white">Back shortly</h1>
                <p className="text-gray-600 dark:text-zinc-400">We are updating this page. Please check back in a little while.</p>
                <Link to="/" className="inline-flex h-12 px-6 items-center rounded-xl bg-gray-950 text-white dark:bg-white dark:text-black font-semibold">Go to the home page</Link>
            </div>
        </div>
    );
}

function RoutePage({ route }) {
    const feed = usePublicFeed();
    if (route.featureId && isOff(feed, { page: route.featureId })) {
        return route.ownHeader ? <><LandingNav /><main><Maintenance /></main></> : <Maintenance />;
    }
    return <route.Page />;
}

function NotFound() {
    return (
        <div className="min-h-[70dvh] flex items-center justify-center px-6 text-center">
            <div className="space-y-4">
                <h1 className="font-heading text-5xl font-bold text-gray-950 dark:text-white">404</h1>
                <p className="text-gray-600 dark:text-zinc-400">This page does not exist.</p>
                <Link to="/" className="inline-flex h-12 px-6 items-center rounded-xl bg-gray-950 text-white dark:bg-white dark:text-black font-semibold">Go to the home page</Link>
            </div>
        </div>
    );
}

function Shell({ route }) {
    if (route.ownHeader) return <RoutePage route={route} />;
    return (
        <div className="min-h-dvh flex flex-col bg-gray-50 dark:bg-black text-gray-950 dark:text-white">
            <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:px-4 focus:py-3 focus:rounded-xl focus:bg-white focus:text-black">Skip to content</a>
            <LandingNav />
            <main id="main" className="flex-1">
                <RoutePage route={route} />
            </main>
            <LandingFooter />
        </div>
    );
}

export default function LandingApp() {
    return (
        <>
            <ScrollManager />
            <TitleSync />
            <Suspense fallback={<div className="min-h-dvh bg-gray-50 dark:bg-black" />}>
                <Routes>
                    {LANDING_ROUTES.map((r) => (
                        <Route key={r.path} path={r.path} element={<Shell route={r} />} />
                    ))}
                    <Route path="*" element={<div className="min-h-dvh flex flex-col bg-gray-50 dark:bg-black"><LandingNav /><main className="flex-1"><NotFound /></main><LandingFooter /></div>} />
                </Routes>
            </Suspense>
        </>
    );
}
