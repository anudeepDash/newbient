import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { useStore } from '../lib/store';
import { cn } from '../lib/utils';
import { isAdminPath } from '../constants/adminNavigation';
import { useSafariChrome } from '../hooks/useSafariChrome';

const Layout = () => {
    const { maintenanceState, user } = useStore();
    const location = useLocation();
    const isBypassing = maintenanceState.global && user?.role === 'developer';
    
    // The admin area brings its own shell (sidebar, tabs, quick jump).
    const isAdminArea = isAdminPath(location.pathname);

    // Safari's bars take the colour at the top of the page.
    useSafariChrome(location.pathname);

    // In the admin, the page colour behind everything (seen when you pull past the
    // top or bottom in Safari) is the admin's own background, and "Add to Home
    // Screen" installs the admin app rather than the website.
    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle('admin-route', isAdminArea);
        const link = document.querySelector('link[rel="manifest"]');
        const href = isAdminArea ? '/admin.webmanifest' : '/manifest.webmanifest';
        if (link && link.getAttribute('href') !== href) link.setAttribute('href', href);
        const title = document.querySelector('meta[name="apple-mobile-web-app-title"]');
        if (title) title.setAttribute('content', isAdminArea ? 'Newbi Admin' : 'Newbi');
    }, [isAdminArea]);

    // Identify document editors and viewers to hide global navigation
    const isSpecialPage = 
        isAdminArea ||
        location.pathname.startsWith('/invoice/') || 
        location.pathname.startsWith('/proposal/') ||
        location.pathname.startsWith('/agreement/') ||
        location.pathname.startsWith('/artistant') ||
        location.pathname.startsWith('/campaign/') ||
        location.pathname.startsWith('/doc/') ||
        location.pathname === '/creator' ||
        location.pathname === '/creator/' ||
        location.pathname.startsWith('/creator/join');

    const isHeightLockedPage = 
        location.pathname.startsWith('/doc/') ||
        location.pathname.includes('/admin/create-') || 
        location.pathname.includes('/admin/edit-') ||
        location.pathname.includes('/admin/agreements/new') ||
        location.pathname.includes('/admin/agreements/edit/') ||
        location.pathname.includes('/admin/ai-studio');

    return (
        <div className={cn(
            // overflow-x: clip (not hidden) so position: sticky keeps working in Safari.
            "flex flex-col text-gray-900 dark:text-white selection:bg-neon-pink selection:text-black w-full max-w-[100vw] overflow-x-hidden supports-[overflow:clip]:overflow-x-clip transition-colors duration-300",
            // Admin screens (including sign-in and loading) use the admin background end to end.
            isAdminArea ? "bg-[#f6f7f9] dark:bg-[#07080b]" : "bg-gray-50 dark:bg-black",
            isHeightLockedPage ? "h-dvh overflow-hidden" : "min-h-dvh"
        )}>
            {!isSpecialPage && <Navbar />}
            <main className={cn(
                "flex-grow transition-all duration-300", 
                isSpecialPage ? "pb-0" : "pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-12",
                isHeightLockedPage && "h-full overflow-hidden flex flex-col"
            )}>
                <Outlet />
            </main>
            {!isSpecialPage && <Footer />}

            {/* Background glow (public pages only — the blurred layers are costly on iOS) */}
            {!isAdminArea && <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none transition-opacity duration-500 opacity-0 dark:opacity-100">
                <div className="absolute top-[-10%] left-[-10%] w-[30%] h-[30%] md:w-[40%] md:h-[40%] bg-neon-blue/10 rounded-full blur-[60px] md:blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] md:w-[40%] md:h-[40%] bg-neon-pink/10 rounded-full blur-[60px] md:blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-[40%] left-[50%] translate-x-[-50%] w-[20%] h-[20%] md:w-[30%] md:h-[30%] bg-neon-green/5 rounded-full blur-[50px] md:blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>}
        </div>
    );
};

export default Layout;
