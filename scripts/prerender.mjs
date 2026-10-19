/*
 * Prerenders the landing site (newbi.live) to static HTML after `vite build`.
 *
 *   dist/_landing/index.html          → /
 *   dist/_landing/creator/index.html  → /creator   (also /community, /contact, /terms, /privacy)
 *   dist/app-shell.html               → every other route (the app; was dist/index.html)
 *
 * vercel.json rewrites those paths to these files (except on the app host), and
 * api/og.js reads app-shell.html as its template. dist/index.html is removed so
 * "/" can be rewritten per host instead of always serving the app shell.
 *
 * Runs automatically as a Vite plugin at the end of the client build, so a plain
 * `vite build` (as Vercel runs it) produces the prerendered pages.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const INNER = 'NB_PRERENDER_INNER';

export async function prerender({ root = process.cwd(), log = console.log } = {}) {
    const { build } = await import('vite');
    const dist = path.join(root, 'dist');
    const ssrOut = path.join(root, 'node_modules', '.cache', 'landing-ssr');

    // 1. Server build of the landing entry (React components → string).
    process.env[INNER] = '1';
    try {
        await build({
            root,
            configFile: path.join(root, 'vite.config.js'),
            mode: 'production',
            logLevel: 'warn',
            build: {
                ssr: 'src/landing/entry-server.jsx',
                outDir: ssrOut,
                emptyOutDir: true,
                manifest: false,
                rollupOptions: { input: 'src/landing/entry-server.jsx' },
            },
            ssr: { noExternal: ['lucide-react'] },
        });
    } finally {
        delete process.env[INNER];
    }

    const entryFile = fs.readdirSync(ssrOut).find((f) => /^entry-server.*\.m?js$/.test(f));
    const { render, routes } = await import(pathToFileURL(path.join(ssrOut, entryFile)).href);

    // 2. The client build's landing template and the chunk graph, to preload each page's chunk.
    const templatePath = path.join(dist, 'landing.html');
    const template = fs.readFileSync(templatePath, 'utf8');
    const manifestPath = path.join(dist, '.vite', 'manifest.json');
    const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};

    const staticGraph = (key, seen = new Set()) => {
        const entry = manifest[key];
        if (!entry || seen.has(key)) return seen;
        seen.add(key);
        (entry.imports || []).forEach((k) => staticGraph(k, seen));
        return seen;
    };
    const inEntry = staticGraph('landing.html');
    const pageModule = {
        '/': ['src/landing/pages/HomePage.jsx'],
        '/creator': ['src/landing/pages/CreatorPage.jsx'],
        '/community': ['src/landing/pages/CommunityPage.jsx'],
        '/work': ['src/landing/pages/WorkPage.jsx'],
        '/contact': ['src/pages/Contact.jsx'],
        '/terms': ['src/pages/Terms.jsx'],
        '/privacy': ['src/pages/Privacy.jsx'],
    };
    const preloadsFor = (route) => {
        const modules = pageModule[route] || [];
        const names = modules.map((m) => path.basename(m, path.extname(m)));
        const key = modules.find((k) => manifest[k])
            || Object.keys(manifest).find((k) => names.includes(manifest[k].name));
        if (!key) {
            log(`  (no chunk found to preload for ${route})`);
            return '';
        }
        return [...staticGraph(key)]
            .filter((k) => !inEntry.has(k))
            .map((k) => `<link rel="modulepreload" crossorigin href="/${manifest[k].file}">`)
            .join('\n  ');
    };

    // 3. One HTML file per landing route.
    for (const route of routes) {
        const { html, head } = await render(route);
        const page = template
            .replace('<!--landing-head-->', `${head}\n  ${preloadsFor(route)}`)
            .replace('<!--landing-html-->', html);
        const outDir = path.join(dist, '_landing', route === '/' ? '' : route.slice(1));
        fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(path.join(outDir, 'index.html'), page);
        log(`  prerendered ${route.padEnd(9)} → dist/_landing${route === '/' ? '' : route}/index.html (${(Buffer.byteLength(page) / 1024).toFixed(1)} kB)`);
    }

    // 4. The app shell moves aside so "/" is free for the landing page.
    const shell = path.join(dist, 'index.html');
    if (fs.existsSync(shell)) fs.renameSync(shell, path.join(dist, 'app-shell.html'));
    fs.rmSync(templatePath, { force: true });
    fs.rmSync(path.join(dist, '.vite'), { recursive: true, force: true });
    fs.rmSync(ssrOut, { recursive: true, force: true });
}

export function landingPrerender() {
    let isSsr = false;
    return {
        name: 'landing-prerender',
        apply: 'build',
        configResolved(config) {
            isSsr = Boolean(config.build.ssr);
        },
        closeBundle: {
            sequential: true,
            order: 'post',
            async handler() {
                if (isSsr || process.env[INNER]) return;
                console.log('\nPrerendering the landing pages…');
                await prerender();
            },
        },
    };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
    prerender().catch((err) => { console.error(err); process.exit(1); });
}
