# Copilot / AI Agent Instructions

This file gives focused, actionable context for AI coding agents working in this repository.

**Repository snapshot**
- Frontend: Vite + React app in `src/` (pages in `src/pages/`, components in `src/components/`). See [src/](src/).
- Serverless endpoints: `api/` — lightweight Node functions (Vercel-style). See [api/](api/).
- Shared libraries: `src/lib/` and `api/lib/` contain key helpers (`src/lib/firebase.js`, `src/lib/ai.js`).
- Standalone micro-frontend: `artisant_standalone/` (separate `package.json`).

**High-level architecture & data flow**
- Browser (Vite dev server) → React UI (`src/`) → serverless API routes (`api/*.js`) for backend work.
- Persistent/auth services use Firebase (`src/lib/firebase.js`, `api/lib/auth.js`, `firebase-admin` in `package.json`).
- Generative AI integrations live both client-side and server-side: check `src/lib/ai.js` and `api/ai.js` (uses `@google/genai` / `@google/generative-ai`).

**Important files to inspect for patterns**
- Frontend entry: [src/main.jsx](src/main.jsx)
- Firebase setup: [src/lib/firebase.js](src/lib/firebase.js)
- Client AI helpers: [src/lib/ai.js](src/lib/ai.js)
- Server AI endpoint: [api/ai.js](api/ai.js)
- Auth helpers for API: [api/lib/auth.js](api/lib/auth.js)
- Mail + OG + QR endpoints: [api/mail.js](api/mail.js), [api/og.js](api/og.js), [api/qr.js](api/qr.js)
- App-level state: [src/lib/store.js](src/lib/store.js) (uses `zustand`).

**Build / dev / lint commands**
- Start dev server: `npm run dev` (runs `vite`).
- Build: `npm run build` (runs `vite build`).
- Preview production build: `npm run preview`.
- Lint: `npm run lint` (ESLint configured; run locally before PRs).
- Note: `artisant_standalone/` has its own `package.json` — use its scripts when working in that folder.

**Project-specific conventions**
- ESM modules: `package.json` has `type: "module"` and targets Node `20.x` — use `import`/`export`.
- Feature organization: components grouped by feature (see `src/components/admin/`, `src/pages/`). Follow existing nesting.
- Small serverless functions: add new backend routes as single-file modules under `api/` exporting a default handler.
- Use existing `api/lib/auth.js` for auth checks in endpoints — do not roll custom auth logic unless necessary.
- Shared code for client/server belongs in `src/lib/` or `api/lib/` depending on runtime.

**Integration notes & gotchas**
- Firebase: both client (`firebase` package) and server (`firebase-admin`) are present. Server code must use `firebase-admin` credentials environment variables.
- Generative AI: some usage is client-side, but heavy or secret-key work should be implemented in `api/` endpoints to keep keys server-side.
- Vercel: `vercel.json` is present; deployment expects serverless-style `api/` routes.

**How to add/change an API route (example)**
1. Create `api/my-route.js` exporting the default handler function.
2. Use `api/lib/auth.js` for authentication where required.
3. Keep handlers small — call shared utilities from `api/lib/` or `src/lib/` as appropriate.

**Testing & CI**
- No test framework detected in repo. Run `npm run lint` before changes; add unit/integ tests in a new `test/` folder and update tooling if required.

**When in doubt**
- Inspect the referenced files above to mirror style and patterns.
- For UI changes, follow Tailwind classes (see `tailwind.config.js`) and PostCSS usage.

If any section is unclear or you'd like more examples (e.g., a sample API route or standard PR checklist), tell me which area to expand.
