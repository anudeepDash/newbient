import React, { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import AppLayout from './AppLayout';
import { appRoutes } from './modules';
import AppNotFound from './pages/AppNotFound';
import LegacyRedirect from './redirects';

/*
 * The app's route tree. App.jsx mounts it at the root on app.newbi.live and
 * under /app (VITE_APP_BASE) on the landing host in dev and previews, so paths
 * here are relative.
 *
 * Pages that open over a list (the campaign page /c/:id, the creator
 * application /creator/apply, a guestlist, giveaway, form or pass) are linked with
 * state { backgroundLocation }: the list keeps rendering underneath and the
 * page shows as a sheet. Opened from a shared link, the same page renders
 * over its own default background.
 */
const OVERLAY_PATHS = ['c/:id', 'creator/apply', 'community/g/:id', 'community/giveaways/:slug', 'forms/:id', 'p/:ref'];

// The campaign and guestlist sheets' code loads while the browser is idle, so a tap opens them at once.
const prefetchCampaignPage = () => Promise.all([import('./creator/campaign/CampaignPage'), import('./community/GuestlistPage')]);

const AppRoutes = () => {
    const location = useLocation();
    useEffect(() => {
        const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
        const id = idle(() => { prefetchCampaignPage().catch(() => {}); });
        return () => (window.cancelIdleCallback ? window.cancelIdleCallback(id) : clearTimeout(id));
    }, []);
    const background = location.state?.backgroundLocation || null;
    const routes = appRoutes();
    return (
        <>
            <Routes location={background || location}>
                <Route element={<AppLayout />}>
                    {routes.map(({ key, path, index, Component }) => (
                        index
                            ? <Route key={key} index element={<Component />} />
                            : <Route key={key} path={path} element={<Component />} />
                    ))}
                    <Route path="*" element={<LegacyRedirect fallback={<AppNotFound />} />} />
                </Route>
            </Routes>
            {background && (
                <Routes>
                    {routes.filter(r => OVERLAY_PATHS.includes(r.path)).map(({ key, path, Component }) => (
                        <Route key={key} path={path} element={<Component overlay />} />
                    ))}
                    <Route path="*" element={null} />
                </Routes>
            )}
        </>
    );
};

export default AppRoutes;
