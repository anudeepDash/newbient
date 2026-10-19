# newbi.live — Performance, Load & Security Audit

**Date:** 2026-10-17 · **Targets:** production `www.newbi.live` + `app.newbi.live` (Vercel, prod = `origin/main` @ `bc35eb9`)
**Method:** Lighthouse (mobile+desktop), autocannon staged load (≤100 req/s, up to 50 connections), live non‑destructive probes, and a read‑only code review of `api/**`.

> Note: production runs `origin/main`, **not** the local `redesign/integration` branch (126 commits ahead, unpushed). Findings below are against what is live today.

---

## 1. Performance (Lighthouse)

| Page | Mobile perf | Desktop perf | Mobile LCP | A11y | Notes |
|---|---|---|---|---|---|
| Landing `/` | **56** | 89 | **11.1 s** | 87 | ~20 MB page weight |
| App home `app/` | 63 | 88 | 6.8 s | 87 | ~20 MB |
| Community `app/community` | **33** 🔴 | 60 | 10.4 s | 88 | **CLS 0.699** (0.386 desktop) 🔴 |
| ConcertZone | 59 | 83 | 10.9 s | 82 | best-practices 71 |
| Creator landing | 57 | 93 | 9.0 s | 89–95 | |
| Creator apply | (sampled) | 88 | — | — | 5 layout shifts |

Desktop is fine; **mobile is the problem**, and most real traffic is mobile.

**Root causes (in priority order):**
1. **Giant unoptimized images.** The landing page pulls raw Cloudinary **PNGs** of 4.3 MB, 3.1 MB, 2.7 MB, 2.3 MB, 2.2 MB, 1.9 MB… — ~20 MB total. Lighthouse: *modern-image-formats could save 14 MB*; *responsive-images ~500 KB*. These Cloudinary URLs have **no transformation params** (`/upload/v123/<id>.png`). Fix is cheap: insert `f_auto,q_auto,w_<width>,dpr_auto` into the URL (e.g. `/upload/f_auto,q_auto,w_1280/v123/<id>`) and/or use `<img srcset>`. This alone should move mobile LCP from ~10 s to ~2–3 s.
2. **Community page layout shift (CLS 0.699).** Content reflows as cards/images load without reserved space. Set explicit width/height or aspect-ratio boxes on the cards and hero media.
3. **Render-blocking + unused JS.** ~1.7 s blocking, ~424 KB unused JS, bootup 2–10 s on mobile. The `vendor-pdf` (176 KB) and `vendor-firebase` (177 KB) chunks load on pages that don't need them — lazy‑load/route‑split the PDF and auth-heavy code.
4. Firebase auth iframe (93 KB) loads on public pages that don't need a session yet — defer until sign-in is actually required.

---

## 2. Load & stress (autocannon, owner‑authorised, moderate)

Staged 10 → 25 → 50 connections, capped at 100 req/s, 20 s each. **No server errors (5xx) anywhere; no throttling of legitimate load.**

| Endpoint | p50 | p99 | max | 5xx |
|---|---|---|---|---|
| Landing (CDN) | 46–72 ms | 154–3481 ms* | 3.9 s* | 0 |
| app/community (dynamic og fn) | 29–38 ms | 136–672 ms | 963 ms | 0 |
| ConcertZone (og fn) | 30–49 ms | 143–232 ms | 385 ms | 0 |
| api/forms (Firestore read) | 21–32 ms | 107–223 ms | 270 ms | 0 |
| api/qr (CPU fn) | 26–47 ms | 117–211 ms | 349 ms | 0 |

\* One p90/p99 blip on the landing run (3.4 s) was a single cold-cache sample, not sustained.

**Two useful signals:**
- **Vercel's WAF/DDoS protection is active and working.** `api/qr` served ~100 requests then returned **403 for the rest of the burst** — the platform challenge/rate-limit kicked in on the CPU-heavy function. Good. (The app-level `checkRateLimit` in `mail.js`/`reset-password.js` is per‑instance in‑memory, so it does *not* hold across Vercel's many lambda instances — rely on the WAF, or move counters to Firestore/Edge Config for the mail/OTP paths.)
- Dynamic pages (`/community`, `/concertzone`) are `x-vercel-cache: MISS` every time — they re-render the OG shell per request. Fine at this scale; add `s-maxage` caching on the OG responses if traffic grows.

**Verdict:** the site comfortably handles moderate concurrent load. The bottleneck for real users is **payload size on mobile**, not server capacity.

---

## 3. Security

### Confirmed live (non-destructive probes)

| # | Severity | Finding |
|---|---|---|
| **S1** | **High** | **Open redirect.** `GET /api/track?type=click&url=https://example.com/` → `302 Location: https://example.com/`. Any external URL is honoured (`api/track.js` only adds tracking params for internal hosts but redirects to the raw destination regardless). Because this lives on `newbi.live` and is used in marketing emails, it's a ready-made phishing redirector (`https://www.newbi.live/api/track?url=<attacker>`). **Fix:** only 302 to an allow-listed host or a signed link; otherwise show an interstitial. |
| **S2** | Low/Med | **Unvalidated id → Firestore path, raw 500 leak.** `GET /api/forms?id=a/b/c/d` (and `id=../../admin`, `id=__proto__`) returns `500` with the raw backend error `INVALID_ARGUMENT: Document name "projects/newbi-ent-v2/..."`, leaking the project id and internals, and is an unhandled crash. `og.js` sanitises ids (`cleanId`) but the `forms.js` read paths don't. **Fix:** validate/segment-check the id before `db.doc()`, return 400/404, never surface the raw error. |
| **S3** | Low | `GET /api/ai` (no auth) returns `geminiAvailable` + full discovered-model list — minor info disclosure. `POST /api/ai` correctly requires auth (401). |

### Verified safe ✓
- Auth gating is solid: `POST` to `/api/mail`, `/api/get-members`, `/api/sync-users`, `/api/revoke-sessions`, `/api/ai` all return **401** without a valid Firebase token.
- **SSRF blocked:** `proposal-pdf?url=http://169.254.169.254/...` and arbitrary hosts → **403** (host allowlist).
- **No reflected XSS** in OG share pages — payloads are escaped (`escapeHtml`/`toInlineJson`).
- Security headers present and strong: HSTS preload, CSP, X-Frame-Options SAMEORIGIN, nosniff, Referrer-Policy, Permissions-Policy.
- nodemailer: CRLF stripped from subject, header allowlist, attachments can't use `path`/`href` (no local file read).
- WhatsApp webhook HMAC compared in constant time; signed links are HMAC+expiry; pass refs are 50 bits of CSPRNG.
- No secrets in the client bundle (`dist/` has only the public Firebase web config + Cloudinary/AdSense public values).

### From code review — needs attention (not live-probed; write endpoints left untouched to avoid sending real email/WhatsApp)

- 🔴 **No Firestore/Storage security rules in the repo.** `firebase.json` only configures the emulator. Several server checks trust fields the browser writes to its own `users/{uid}` doc (`role`, `phone`, `phoneVerified`) and `admins` docs created client‑side. **If the console rules are permissive, a user can set their own `role`/create an `admins` doc and become admin, or forge a verified phone.** Pull the live rules and confirm — this is the single most important thing to verify. Commit the rules file.
- 🔴 **`sync-users` role check too loose** (`sync-users.js:53-60`): any `admins` entry is accepted; it also rewrites `isBlocked`, un‑blocking every blocked user. Restrict to founder/developer; stop writing `isBlocked` there.
- 🔴 **Anonymous ticket orders** (`creator-join` `ticket-order`, `tickets.js`): no auth, no rate limit, no per‑phone/email cap — can confirm free tickets, hold paid seats to SOLD_OUT with a fake UTR, and send email+WhatsApp to arbitrary recipients. Require sign-in + Firestore-backed caps; expire pending orders.
- 🟠 **Legacy public `join`** auto-approves creators, trusts client-sent follower count, and mass-assigns fields missing from the denylist (`isFeatured`, `badges`, `isInstagramVerified`, payouts…). Retire in favour of `creator-apply`; use a field allowlist.
- 🟠 `email_verified` not checked in most staff paths; low-privilege roles (scanner/blog_writer) count as "staff" and can send free-form HTML email from any alias (≤3000/hr) and issue/revoke passes. Blocking is cosmetic (API never checks `isBlocked`; Auth account not disabled).
- 🟡 Public info leaks: `creator-groups-get` returns all WhatsApp invite links; `GET /api/forms` returns full form docs incl. drafts; `revoke-sessions`/`reset-password` are user-enumeration oracles.
- ⚠️ **`newbi-project.zip` is committed** (contains a 59-byte `.env`). If `github.com/anudeepDash/newbient` is public, treat those values as leaked and rotate. Remove the zip from git history.

---

## 4. What to do first

1. **Rotate** anything in the committed `newbi-project.zip` `.env` and delete the zip from history (if repo is public).
2. **Confirm the live Firestore rules** lock down `role` / `phoneVerified` / `admins`, then commit the rules file.
3. **Fix the open redirect** in `api/track.js` (S1) — allowlist/interstitial.
4. **Lock down ticket-order + sync-users** (auth, rate limits, role scope).
5. **Images:** add `f_auto,q_auto,w_*` to Cloudinary URLs + `srcset` — biggest single mobile win.
6. Reserve space on community/creator cards to kill the CLS; lazy-load the pdf/firebase chunks.

Server capacity is healthy; the live-exploitable issue is the open redirect, and the biggest unknown is the Firestore ruleset.
