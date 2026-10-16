import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { appPath, appUrl, stripAppBase } from './host';

/*
 * Old links → their app pages. The query string is kept (?ref=, ?taskId=).
 *
 * vercel.json does the same server-side for newbi.live in production. This
 * covers everything else: links opened inside the app (notifications with
 * old paths), app.newbi.live/<old path>, and the landing routes in dev and
 * on previews.
 *
 *   legacyAppPath('/campaign/abc', '?taskId=2')     → '/c/abc?taskId=2'
 *   legacyAppPath('/creator-dashboard', '?campaignId=abc') → '/c/abc'
 */

const CAMPAIGN = [
    /^\/campaigns?\/([^/]+)\/?$/,
    /^\/creator\/campaigns?\/([^/]+)\/?$/,
    /^\/creator-dashboard\/campaign\/([^/]+)\/?$/,
];
const DASHBOARD = /^\/(creator-dashboard(\/.*)?|creator\/(dashboard|hub|studio|campaigns)|creator-hub|creator-studio|campaigns)\/?$/;
const APPLY = /^\/(creator\/join|creator-join|creator\/register|creator\/signup)\/?$/;
const PITCH = /^\/(creators|creator\/landing)\/?$/;

const withQuery = (path, params) => {
    const q = params.toString();
    return q ? `${path}?${q}` : path;
};

export function legacyAppPath(pathname = '/', search = '') {
    const path = pathname.replace(/\/+$/, '') || '/';
    const params = new URLSearchParams(search);

    for (const re of CAMPAIGN) {
        const m = path.match(re);
        if (m) return withQuery(`/c/${encodeURIComponent(decodeURIComponent(m[1]))}`, params);
    }
    if (DASHBOARD.test(path)) {
        const campaignId = params.get('campaignId') || params.get('campaign');
        if (campaignId) {
            params.delete('campaignId');
            params.delete('campaign');
            return withQuery(`/c/${encodeURIComponent(campaignId)}`, params);
        }
        const wantsSettings = /\/settings$/.test(path) || params.get('tab') === 'settings' || params.get('action') === 'edit' || params.get('edit') === 'true';
        ['tab', 'action', 'edit'].forEach(k => params.delete(k));
        return withQuery(wantsSettings ? '/creator/profile' : '/creator', params);
    }
    if (APPLY.test(path)) return withQuery('/creator/apply', params);
    if (PITCH.test(path)) return withQuery('/creator', params);
    return null;
}

/* In the app's catch-all route: an old path goes to its new page, anything else is a 404. */
const LegacyRedirect = ({ fallback = null }) => {
    const location = useLocation();
    const target = legacyAppPath(stripAppBase(location.pathname), location.search);
    if (!target) return fallback;
    return <Navigate to={`${appPath(target)}${location.hash}`} replace />;
};

/*
 * On the landing site (dev and previews mount the app under /app; in
 * production the app is on app.newbi.live). Used by App.jsx for the retired
 * creator routes: /creator/join, /creator-dashboard, /campaign/:id and aliases.
 */
export const ToAppRedirect = () => {
    const location = useLocation();
    const target = legacyAppPath(location.pathname, location.search) || '/creator';
    const url = `${appUrl(target)}${location.hash}`;
    const external = /^https?:\/\//.test(url);
    useEffect(() => {
        if (external) window.location.replace(url);
    }, [external, url]);
    return external ? null : <Navigate to={url} replace />;
};

export default LegacyRedirect;
