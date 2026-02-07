import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { useStore } from '../lib/store';
import { cn } from '../lib/utils';

const Layout = () => {
    const { maintenanceState, user } = useStore();
    const isBypassing = maintenanceState.global && user?.role === 'developer';

    return (
        <div className="flex flex-col min-h-screen bg-dark text-white selection:bg-neon-pink selection:text-white">
            <Navbar />
            <main className={cn("flex-grow transition-all duration-300", isBypassing ? "pt-28" : "pt-20")}>
                <Outlet />
            </main>
            <Footer />

            {/* Background Glow Effects - Enhanced */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-blue/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neon-pink/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-[40%] left-[50%] translate-x-[-50%] w-[30%] h-[30%] bg-neon-green/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>
        </div>
    );
};

export default Layout;
