import React from 'react';
import { Route, Routes } from 'react-router-dom';
import AppLayout from './AppLayout';
import { appRoutes } from './modules';
import AppNotFound from './pages/AppNotFound';

/*
 * The app's route tree. App.jsx mounts it at the root on app.newbi.live and
 * under /app (VITE_APP_BASE) on the landing host in dev and previews, so paths
 * here are relative.
 */
const AppRoutes = () => (
    <Routes>
        <Route element={<AppLayout />}>
            {appRoutes().map(({ key, path, index, Component }) => (
                index
                    ? <Route key={key} index element={<Component />} />
                    : <Route key={key} path={path} element={<Component />} />
            ))}
            <Route path="*" element={<AppNotFound />} />
        </Route>
    </Routes>
);

export default AppRoutes;
