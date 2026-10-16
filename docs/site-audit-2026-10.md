# Newbi public site audit — October 2026

Scope: everything a non-admin sees on newbi.live. That covers the home page, the community, the creator portal, ConcertZone, giveaways, forms, tickets, payouts and the APIs behind them. The method was reading the code and clicking through the dev build on desktop and at phone width. Nothing was changed, and nothing was written to Firebase.

---

## 1. The short version

The site today is **one marketing layout that a set of app features have been bolted onto**. There is no clear line between "the site that sells Newbi" and "the app people use". Because of that:

- The **home page** tries to speak to brands, colleges, creators and fans at once. It downloads about 776 KB of gzipped JS+CSS, including the PDF library, and opens around 17 live Firestore listeners before anything shows.
- The **app side** (community, tickets, creator, profile) has no home of its own:
  - Events are found on the landing page.
  - "My tickets" lives inside a 2,700-line slide-over panel.
  - The creator portal has three different headers.
  - There are at least 6 separate sign-in/identity flows.
- Under the hood there are **real security holes** that need fixing before anything new is built on top, especially campus, which would add more student data.

The recommendation has three parts:

1. Fix security first (days, not weeks).
2. Make `/` a fast, static landing page.
3. Build one **app shell** at `/app` that community, passes and creator plug into, with campus as the next module.

---

## 2. Fix first — security and privacy (Critical)

These are confirmed in the code. Two were also confirmed live against the production Firebase project from a signed-out browser.

| # | Problem | Where | What to do |
|---|---|---|---|
| S1 | **The Gemini API key is sent to every visitor.** Every page load, signed in or not, subscribes to `site_settings/ai_config`. A signed-out browser received `geminiKey` and `globalKey` (confirmed live). | `src/lib/store.js:1038-1043` | **Rotate the key today.** Move AI calls behind `api/ai.js` with the key in a Vercel env var. Subscribe to `ai_config` and `dashboard_config` only for admins, and deny public reads in the Firestore rules. |
| S2 | **The creator API has no auth.** `api/creator-join.js` runs with Firebase Admin privileges and has no token requirement (`:920-931`). CORS reflects any origin (`:904-909`). As a result, anyone on the internet can call: <br>• `creator-update` (`:1245`) — edit or approve any creator <br>• `creator-delete` (`:1302`) — delete any creator <br>• the city-group create/edit/delete actions <br>• `campaign-task-submit` with `updatedTasks` (`:1344`) — overwrite every creator's task submissions <br>• `whatsapp-verify` (`:1126`) — send WhatsApp messages to any number | `api/creator-join.js` | Require a verified ID token on every action. Admin actions also need an admin check (reuse `api/_lib/auth.js`). Accept only an allowlist of fields from creators. Delete the `updatedTasks` path. Restrict CORS to newbi.live. |
| S3 | **Creator accounts can be taken over.** `get-profile` finds a creator by any email or phone supplied in the request, then re-links that creator's `uid` to whatever uid the caller sends. It also returns the whole document. | `api/creator-join.js:1386-1448` | Resolve only from the verified token. Never re-link from request parameters. |
| S4 | **`join` trusts the client.** The client sets `profileStatus`, `isVerified` and `isPhoneVerified` itself. The response returns `verificationToken`, so the WhatsApp verification proves nothing. The verify link also flips `pending` creators (the ones waiting for manual review) straight to `approved`. | `creator-join.js:1730-1766, 1848, 1109` | Set status only on the server. Don't return the token. Keep manual review as `pending` until an admin acts. |
| S5 | **Payout receipts can be forged.** `/verify-payout` shows "Transaction Verified", an amount and a hash taken straight from URL query parameters. Anyone can make a real-looking newbi.live receipt. | `src/pages/VerifyPayout.jsx:21-28` | Look up a server record by id, or sign the parameters. |
| S6 | **`/register-payment` overwrites payees.** The page is public. It matches an existing payee by email or phone, replaces their bank or UPI details, and sets `status: 'Approved'`. Signed-out visitors can't read payees (confirmed: permission denied), but a signed-in user might, depending on the rules. | `src/pages/PayeeRegistration.jsx:83-110` | Require sign-in, never overwrite an existing payee from the public page, and start new payees as `pending`. |
| S7 | **Notifications leak to everyone.** All clients, including signed-out ones, download the latest 50 notifications for **all users** and filter them in the browser. Push messages and profile actions write notifications with no `userId`, which makes them global. One user marking a notification read hides it for everyone. | `store.js:1181-1193`, `lib/notifications.js:73`, `ProfilePanel.jsx:392-505` | Store notifications per user (`users/{uid}/notifications` or `where('userId','==',uid)`), keep a separate read-only global feed, and track read state per user. |
| S8 | **Whole collections are streamed to ordinary users.** The profile panel subscribes to all of `ticket_orders`, `creators`, `campaigns` and `guestlists`. The creator dashboard streams every creator (phones, emails, tokens) before it checks auth. The giveaway page streams every entrant's phone and college. | `ProfilePanel.jsx:91-96`, `CreatorDashboard.jsx:664`, `GiveawayPage.jsx:45` | Use per-user queries only. |
| S9 | **Game-able client logic.** Giveaway scores are computed and written by the client, and its "verification" is a 2-second `setTimeout`. Guestlist capacity and duplicate checks are client-side with no transaction. Ticket booking refs are 5 random characters and act as the bearer link. | `GiveawayPage.jsx:111-128`, `store.js:2589-2597`, `EventTicketingModal.jsx:645` | Move these into `api/` functions that use transactions, and make refs longer. |
| S10 | **The Firestore rules aren't in the repo**, so none of the above can be reviewed or tested. | — | Add `firestore.rules` and `firebase.json` to the repo and review them line by line. |

Also: blog post HTML is rendered without sanitising (`BlogPostDetail.jsx:376`). Any admin who can write a post can inject script.

---

## 3. What a visitor sees today

### Home page (`/`)

The section order is Hero → Why Partner → Making Impact → Capabilities → Creators/Brands → Upcoming Events → Our Impact (portfolio) → ConcertZone → Partners → CTA.

| Issue | Evidence |
|---|---|
| **No single audience or goal.** The H1 "The Pulse of Youth." doesn't say what Newbi does. The CTAs are "Contact us" (brands) and "Join our community" (fans). Colleges, the core claimed USP, get no entry point of their own. | `Hero.jsx:67-96` |
| **Repeated sections.** "Why Partner" repeats "Capabilities". "Making Impact" and "Our Impact" both appear. The "bridging the gap" line is used 3 times. All three "Learn more" buttons go to the same anchor. | `WhyChooseUs.jsx`, `Services.jsx`, `About.jsx:59`, `Portfolio.jsx:78` |
| **Fake content in production.** <br>• A **"Hello World"** test post is featured on the home page right now. <br>• If `past_clients` is empty, the page shows **Spotify, Red Bull, Tinder, Bacardi, MTV…** as "Global Partners", which is a legal and credibility risk. | `FeaturedBlog.jsx:16` → `ConcertZoneBlog.jsx:77` (TEST_POSTS); `PastClients.jsx:6-19` |
| **Unbacked claims** ("India's leading", 250+ events, 17+ cities, 1M+, 100+ colleges), hardcoded. | `Hero.jsx:78`, `About.jsx:10-12` |
| **Slow and blank on phones.** At 375px the hero was still an empty dark screen after 3 seconds, because every block fades in with framer-motion. Infinite animations, five auto-scrolling carousels and fixed blurred glow layers make it heavier. | screenshot; `Layout.jsx:54-57`, `Hero.jsx:19-43` |
| **Heavy bundle.** <br>• `html2canvas` is imported statically in `UpcomingEvents.jsx:7`, which drags the 170 KB gz PDF chunk onto every page. <br>• `FeaturedBlog` imports `TEST_POSTS` from `ConcertZoneBlog`, which pulls the whole blog page into the main chunk. <br>• Home, CreatorLanding, CreatorJoin and Contact are imported eagerly. | `App.jsx:12-15`; `dist/` |
| **Too much live data.** Home opens whole-collection listeners on events, portfolio, posts (all drafts and full HTML), giveaways, forms and gigs, plus global ones on settings, payments, AI config and announcements (twice). | `Home.jsx:18`, `store.js:996-1080` |
| **SEO.** <br>• It's a pure SPA with no prerender and no canonical. <br>• Twitter meta tags are never set (`useDynamicMeta.js:96-99` bug). <br>• The OG image is 1024×576 but declared as 1200×630. <br>• The sitemap is from April and has no blog URLs. <br>• `robots.txt` points to the apex domain while the sitemap uses www. | `index.html`, `public/` |
| **Accessibility.** No `aria-label`s on icon buttons, no reduced-motion support, lots of 9–10px uppercase text. | `components/home/*` |

### Community (`/community`)

- Signed-out visitors are told **"Your Tribe Access is Active."** (`CommunityJoin.jsx:524`).
- Signed-in users who haven't "joined" see only a Google Form iframe, with everything else hidden (`:362`). Membership is self-declared with an "I've submitted" button.
- **Past events are still listed** as open forms (e.g. the Varun Jain guestlist dated 26 Sep 2026).
- Volunteer gigs just open WhatsApp; nothing is recorded. Gigs that have a guestlist appear twice.
- Share fails on iOS Safari: the clipboard and image work happen before `navigator.share`, so the tap no longer counts.

### Events → tickets

- Events are discovered on `/`, not in the app. Share links point to `/?event=`.
- The ticket flow is a 1,870-line modal. Its success screen never links to the ticket page or to "My passes".
- **Paid tickets only show in the user's Tickets tab if the event title contains "jazba" or "terminal"** (`ProfilePanel.jsx:215`).
- The empty state sends users to `/concertzone`, which is the blog.

### Creator portal

- **Three different shells:**
  - `/creator` has its own header and no bottom nav.
  - `/creator/join` is a 2,635-line wizard.
  - `/creator-dashboard` uses the main navbar but hides the tab bar.
- The mobile "Creator" tab leads to a page with no tab bar, a dead end. There are about 18 redirect aliases.
- Creator identity is a separate `creators` doc, matched to the user by uid, email or phone (fragile, and the root of S3).
- The numbers don't agree: welcome points show 100 in one place and 500 in another, the pass shows a random ID, and "Direct payouts" and "points ledger" are promised but not built.

### Identity and app chrome

- **6+ sign-in or identity flows:**
  - AuthOverlay (email, Google popup, phone)
  - CreatorJoin's own sign-in
  - phone linking copied 3×
  - details re-asked in the ticket and giveaway flows
- Google sign-in is popup-only, so it **breaks in the Instagram and WhatsApp in-app browsers**, which is exactly where share links are opened.
- The task the user started is lost after they log in, everywhere except the ticket modal.
- There is no web manifest, so the app can't be installed and iOS can't receive push. The notification prompt fires automatically instead of from a tap.
- The login effect re-subscribes everything and runs `checkUserRole` twice (`App.jsx:144`).

---

## 4. What to build: two surfaces

```
newbi.live/                 MARKETING (static, fast, no login needed)
  /                         landing: who we are, proof, enquire
  /brands  /colleges        audience pages (optional, later)
  /creator                  creator program pitch → "Apply" → /app/creator/join
  /concertzone/*            editorial (SEO)
  /contact  /terms  /privacy

newbi.live/app/             THE APP (one shell, one login, one profile)
  /app                      Home: your next event, passes, open gigs/giveaways
  /app/discover             events, guestlists, gigs, giveaways, forms
  /app/events/:id           event page (share target) → get pass
  /app/passes, /:ref        my tickets & guestlist passes
  /app/creator/*            creator dashboard, campaigns/:id, submissions
  /app/campus/*             ← next module
  /app/notifications
  /app/profile              account, phone, college, security
```

**Why `/app` and not `app.newbi.live`:** Firebase auth is stored per origin. Using the same origin keeps everyone logged in, shares one deploy and avoids CORS. A subdomain can come later if you ever need it.

### The app shell

- One `AppLayout` with a bottom tab bar on mobile and a left rail on desktop: **Home · Discover · Passes · (Creator) · (Campus) · Profile**, plus a bell for notifications.
- Tabs come from a module registry, so campus is a config entry, not a rewrite:

  ```js
  { id: 'campus', path: '/app/campus', tab: { label: 'Campus', icon: School },
    capability: 'campus', onboarding: CampusOnboarding }
  ```
- One `AuthGate` with `returnTo`: the user taps "Get pass" → signs in → lands back on that action. Use a Google redirect fallback for in-app browsers.
- Old links stay working. `/community?gl=`, `/?event=`, `/creator-dashboard`, `/campaign/:id`, `/giveaway/:slug` and `/ticket/:id` move into **one redirect map** that points into `/app/...`.

### One identity

- `users/{uid}` is the person: name, verified phone, email, `collegeId`, and `capabilities: { member, creator, campus, artist }`.
- `creators/{uid}`, and later `campus_members/{uid}`, use **the same id**. No email or phone matching. A one-time migration re-keys creator docs that have random ids.
- Admin roles stay in `admins/`, with one shared role list instead of the three differing copies.

### Data rules for the app

- Read only your own data: `where('userId','==',uid)` for orders, entries and submissions; `creators/{uid}`; and per-user notifications.
- Anything that awards, approves, counts or pays goes through `api/` with a transaction: guestlist spots, giveaway scores, task submissions (`campaigns/{id}/submissions/{uid}`) and payouts.
- Split `store.js` (5,000 lines) into slices: `auth`, `events`, `passes`, `creator`, `notifications`, `site`.

### Campus: what already exists to build on

- Creator niches "College Pages" and "Student/Campus Creator", plus a required `collegeName` (`constants.js:46-91`, `CreatorJoin.jsx:1929`).
- Campaign `targetCollege`, which is free text with substring matching (so "IIT" matches every IIT).
- `src/data/indianColleges.js`: a state → city → college directory that is **not used anywhere**.
- City WhatsApp groups (`creator_groups`) that already talk about college fests.

**First step:** turn `indianColleges.js` into a `colleges` collection with ids and slugs. Store `collegeId` on users, creators and campaigns, and match exactly. Campus pages, ambassadors, leaderboards and college events all hang off that.

---

## 5. The new landing page

Goal: in 5 seconds a visitor knows **what Newbi does, that it's real, and what to click**.

1. **Hero.** One sentence on what you do, e.g. "We run college activations, live shows and creator campaigns across India." Primary CTA: **Work with us** (enquiry). Secondary: four audience tiles: *Brands · Colleges · Creators · Fans*. Fans and Creators go into `/app`.
2. **Proof strip.** Only real client logos, and numbers you can stand behind.
3. **What we do.** One section, three or four services (merge Why, About and Capabilities).
4. **Work.** 3–4 case studies from `portfolio`, with outcomes.
5. **For creators / for students.** Short pitch → "Open the app".
6. **Upcoming.** The next 3 public events, read from one cached JSON (`/api/public-feed`, edge-cached), not live listeners → each links to `/app/events/:id`.
7. **ConcertZone.** The latest 3 *published* posts.
8. **Enquiry form.** Who are you (brand / college / artist), budget, timeline. Add a honeypot and send it through an API.

Technical bar:
- Prerendered HTML (vite-ssg or react-snap for marketing routes) and a canonical tag.
- No Firebase on first paint.
- Under 150 KB gz of JS on `/`.
- Hero visible immediately, no fade-in gating.
- `prefers-reduced-motion` respected, and no blur layers on mobile.

---

## 6. Suggested order of work

| Phase | What | Size |
|---|---|---|
| **0. Security** | S1–S10 above. Rotate the Gemini key first. Lock `creator-join.js`. Fix notifications. Commit and review the Firestore rules. | 2–4 days |
| **1. Landing quick wins** | Delete `TEST_POSTS` and `DEFAULT_CLIENTS`. Hide past events. Make html2canvas a dynamic import. Lazy-load CreatorLanding, CreatorJoin and Contact. Drop the admin listeners for visitors. Fix the "Tribe Access Active" text, the jazba/terminal filter, the twitter meta and the sitemap. | 2–3 days |
| **2. App shell and identity** | `AppLayout`, module registry, `AuthGate` with `returnTo`, `users/{uid}` capabilities, the redirect map, a manifest, and a PWA install path. | 1–2 weeks |
| **3. Move modules in** | Discover and events (out of the home page), passes (out of ProfilePanel), creator (dashboard, campaigns, submissions subcollection), profile. Delete `UnifiedGuestlistModal`, `BuyTicketModal`, `Team`, `Workflow`, `MediaGallery`, `LiveCampaigns` and `CreatorLogo`. | 2–3 weeks |
| **4. New landing page** | Section plan above, prerendered. Can run in parallel with phase 3. | ~1 week |
| **5. Campus** | `colleges` collection, `collegeId` everywhere, then the campus module at `/app/campus`. | after 2–3 |
