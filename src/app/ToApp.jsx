import { useEffect } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { appUrl } from './host';

/*
 * Old landing-site routes that now live in the app (/ticket/:id → /p/:id,
 * /giveaway/:slug → /community/giveaways/:slug). The server redirects these
 * too; this covers in-site navigation. Same origin (dev, previews): a router
 * redirect; otherwise a full load on app.newbi.live. Keeps the query string.
 *
 *   <Route path="ticket/:id" element={<ToApp to="/p/:id" />} />
 */
const ToApp = ({ to }) => {
    const params = useParams();
    const location = useLocation();
    const path = to.replace(/:([A-Za-z]+)/g, (_, key) => encodeURIComponent(params[key] || ''));
    const target = `${appUrl(path)}${location.search}${location.hash}`;
    const external = /^https?:\/\//.test(target);
    useEffect(() => {
        if (external) window.location.replace(target);
    }, [external, target]);
    return external ? null : <Navigate to={target} replace />;
};

export default ToApp;
