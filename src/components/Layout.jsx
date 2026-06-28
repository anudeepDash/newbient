import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import NotificationToast from './NotificationToast';
import { useStore } from '../lib/store';
import { cn } from '../lib/utils';

const Layout = () => {
    const { maintenanceState, user } = useStore();
    const location = useLocation();
    const isBypassing = maintenanceState.global && user?.role === 'developer';
    
    // Identify document editors and viewers to hide global navigation
    const isSpecialPage = 
        location.pathname === '/creator' ||
        location.pathname.startsWith('/campus') ||
        location.pathname.startsWith('/invoice/') || 
        location.pathname.startsWith('/proposal/') ||
        location.pathname.startsWith('/artistant') ||
        location.pathname.startsWith('/concertzone') ||
        location.pathname.startsWith('/campaign/') ||
        location.pathname.startsWith('/doc/') ||
        location.pathname.includes('/admin/create-') ||
        location.pathname.includes('/admin/edit-') ||
        location.pathname.includes('/admin/agreements/');

    const isHeightLockedPage = 
        location.pathname.startsWith('/doc/') ||
        location.pathname.includes('/admin/create-') || 
        location.pathname.includes('/admin/edit-') ||
        location.pathname.includes('/admin/agreements/new') ||
        location.pathname.includes('/admin/agreements/edit/') ||
        location.pathname.includes('/admin/ai-studio');

    return (
        <div className={cn(
            "flex flex-col bg-black text-white selection:bg-neon-pink selection:text-white w-full max-w-[100vw] overflow-x-hidden",
            isHeightLockedPage ? "h-screen overflow-hidden" : "min-h-screen"
        )}>
            {!isSpecialPage && <Navbar />}
            <NotificationToast />
            <main className={cn(
                "flex-grow transition-all duration-300", 
                isSpecialPage ? "pb-0" : "pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-12",
                isHeightLockedPage && "h-full overflow-hidden flex flex-col"
            )}>
                <Outlet />
            </main>
            {!isSpecialPage && <Footer />}

            {/* Background Glow Effects - Enhanced */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[30%] h-[30%] md:w-[40%] md:h-[40%] bg-neon-blue/10 rounded-full blur-[60px] md:blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] md:w-[40%] md:h-[40%] bg-neon-pink/10 rounded-full blur-[60px] md:blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-[40%] left-[50%] translate-x-[-50%] w-[20%] h-[20%] md:w-[30%] md:h-[30%] bg-neon-green/5 rounded-full blur-[50px] md:blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>
        </div>
    );
};

export default Layout;
