import React from 'react';
import { Link } from 'react-router-dom';
import Construction from 'lucide-react/dist/esm/icons/construction';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard';
import Settings from 'lucide-react/dist/esm/icons/settings';
import { useStore } from '../../lib/store';

/*
 * Shown in place of a page (or the whole site) while it's switched off in
 * System. Visitors get a calm "back soon" message; team members get a way back
 * to the admin and, if they can change it, to the switch itself.
 */
const Maintenance = () => {
    const { user, maintenanceState = {} } = useStore();

    const isAdmin = ['developer', 'super_admin', 'editor', 'admin', 'founder', 'content_admin', 'gate_manager', 'scanner', 'blog_writer'].includes(user?.role);
    const canSwitch = ['developer', 'super_admin', 'founder'].includes(user?.role);
    const whole = Boolean(maintenanceState.global);

    const button = 'inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-[14px] font-semibold transition-colors';

    return (
        <div className="flex min-h-[80dvh] items-center justify-center px-4 py-16 font-heading">
            <div className="w-full max-w-md rounded-3xl border border-black/[0.06] bg-white p-6 text-center shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03] sm:p-10">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300">
                    <Construction size={28} />
                </span>

                <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                    {whole ? "We'll be right back" : 'This page is taking a short break'}
                </h1>
                <p className="mt-3 text-[15px] leading-relaxed text-gray-600 dark:text-zinc-400">
                    {whole
                        ? "We're making some improvements to the site. Please check back in a little while. Thanks for your patience."
                        : "We're working on this part of the site right now. It'll be back soon."}
                </p>

                {isAdmin && (
                    <p className="mt-4 rounded-xl bg-amber-500/[0.08] px-3 py-2.5 text-[13px] font-medium text-amber-800 dark:bg-amber-400/[0.08] dark:text-amber-200">
                        {whole ? 'Maintenance mode is on for the whole site.' : 'This was switched off in System.'} Only developers can still open it.
                    </p>
                )}

                <div className="mt-6 flex flex-col gap-2">
                    {isAdmin ? (
                        <>
                            {canSwitch && (
                                <Link to="/admin/system-command" className={`${button} bg-neon-green text-black hover:bg-[#5dff3f]`}>
                                    <Settings size={16} /> Open System switches
                                </Link>
                            )}
                            <Link to="/admin" className={`${button} border border-black/10 bg-white text-gray-800 hover:border-black/20 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:border-white/20`}>
                                <LayoutDashboard size={16} /> Back to the dashboard
                            </Link>
                        </>
                    ) : whole ? null : (
                        <Link to="/" className={`${button} border border-black/10 bg-white text-gray-800 hover:border-black/20 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:border-white/20`}>
                            <ArrowLeft size={16} /> Back to the home page
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Maintenance;
