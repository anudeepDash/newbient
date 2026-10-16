import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import LandingApp from './LandingApp';
import { LANDING_ROUTES, findRoute, headTags } from './routes';

/*
 * Used only at build time by scripts/prerender.mjs: renders each landing page
 * to static HTML. Runtime data (events, clients, case studies…) is not baked
 * in; those sections appear once the cached feed loads in the browser.
 */
export const routes = LANDING_ROUTES.map((r) => r.path);

export async function render(url) {
    const route = findRoute(url);
    if (!route) throw new Error(`Not a landing route: ${url}`);
    await route.Page.preload();
    const html = renderToString(
        <StaticRouter location={url}>
            <LandingApp />
        </StaticRouter>
    );
    return { html, head: headTags(route) };
}
