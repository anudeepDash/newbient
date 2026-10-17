# Campaign outreach

Replaces the Google Form → sheet → WhatsApp Web routine for creator campaigns. Creators apply through an open form with no sign-in. Admins shortlist them, send each person a WhatsApp message by hand from a ready-made link, and track them through joined, posted and paid. Every status change is logged.

Phase 1 sends by hand: messages open in WhatsApp through `wa.me` and **an admin presses send**. Nothing is sent from the browser automatically, and nothing drives WhatsApp Web. Phase 2 adds sending through the WhatsApp Cloud API (below) when it's set up. The by-hand flow stays as the fallback.

## Where things are

| What | Where |
|---|---|
| Public form | `app.newbi.live/c/{slug}/apply` → `src/app/creator/campaign/apply/CampaignApplyPage.jsx` |
| Admin | Creators → Campaigns → a campaign → **Outreach** tab → `src/components/admin/campaigns/outreach/` |
| Open-form settings | Campaign editor → **Open application form** card (`outreach/OpenFormCard.jsx`) |
| Shared rules (browser and server) | `src/lib/outreach/` (normalise, template, status, match, application, export) |
| Server | `api/_lib/outreach.js`, reached through `api/creator-join.js?action=outreach-*`. The project is at Vercel's function limit, so it can't have its own function. |
| WhatsApp API queue (Phase 2) | `api/_lib/outreachQueue.js`; webhook in `api/track.js`; daily run in `api/mail.js` |
| Deliverables, tickets, payouts (Phase 3) | `api/_lib/outreachDeliver.js`; creator page `app.newbi.live/d/{token}` → `src/app/creator/campaign/apply/DeliverablesPage.jsx`; passes via `api/_lib/passes.js` (`releaseApplicationPass`) |
| Inbox (Phase 3) | `api/_lib/outreachInbox.js`, storage in `api/_lib/outreachThreads.js`; admin **Outreach → Inbox** |
| Tests | `tests/outreach/` (Vitest; server handlers run against an in-memory Firestore) |
| Seed | `scripts/seed-outreach.mjs` (local emulator only) |

## Data

```
campaigns/{id}                              public campaign doc, plus:
    slug, publicApplyEnabled, artist, cities[], eventDate, applicationDeadline,
    postingDeadline, deliverablesText, perksByTier{nano,micro,macro: {minFollowers, cash, pass}},
    status: Draft | Open | Closed | Live
campaigns/{id}/private/outreach             whatsappGroupLink, messageTemplate        (admin only)
campaigns/{id}/applications/{appId}         one per person                            (admin only)
campaigns/{id}/application_keys/{key}       "p:+9198…" / "ig:handle" → { appId }      (duplicates)
campaigns/{id}/audit/{autoId}               appId, field, from, to, source, actorUid, actorEmail, at
creator_contacts/{p_<hash of phone>}        lightweight creator record, linked to creators/{id} by handle
rate_limits/{hash of ip}                    per-IP counter for the public form (expiresAt for TTL)
```

- **Dates** are calendar days (`YYYY-MM-DD`). Applications close at the end of `applicationDeadline`, India time.
- **Status:** a new application starts as `applied`. Moves allowed:
  - applied → shortlisted or removed
  - shortlisted → message_queued or removed
  - message_queued → message_sent, back to shortlisted, or removed
  - message_sent → replied, joined or removed
  - replied → joined or removed
  - joined → posted or removed
  - posted → paid or removed
  - removed → shortlisted (restore)

  `message_queued` means "WhatsApp was opened or the message copied". Only **Mark sent** sets `message_sent`.
- **Duplicates:** a second application with the same phone or the same handle updates the first one with the latest values. It keeps the status, links and first-applied time. If the phone belongs to one application and the handle to another, the phone wins and both are flagged "Check duplicate".
- **Live** means the event is running and applications are closed. The app's campaign list and the 1-click apply also stop treating `live` as open.

## Privacy and security

- Browsers never read the new collections directly. Every read and write goes through the server actions:
  - `outreach-campaign` and `outreach-apply` are public.
  - `outreach-list`, `outreach-status`, `outreach-settings` and `outreach-audit` check the caller's role: **founder, super_admin, developer or admin** only. Editors and content admins don't see phones, emails or follower counts.
- The group invite link and the template are not on the public campaign doc. That doc is readable by anyone, because the app lists campaigns.
- Phones are masked in logs (`+91******3210`). Request bodies are never logged. Raw IPs are never stored.
- **Firestore rules:** the repo doesn't hold the rules, so add these in the Firebase console. The server uses the Admin SDK, which bypasses rules, so this only blocks direct browser access:

  ```
  match /campaigns/{campaignId}/applications/{doc} { allow read, write: if false; }
  match /campaigns/{campaignId}/application_keys/{doc} { allow read, write: if false; }
  match /campaigns/{campaignId}/audit/{doc} { allow read, write: if false; }
  match /campaigns/{campaignId}/private/{doc} { allow read, write: if false; }
  match /creator_contacts/{doc} { allow read, write: if false; }
  match /rate_limits/{doc} { allow read, write: if false; }
  match /outreach_queue/{doc} { allow read, write: if false; }
  match /outreach_rate/{doc} { allow read, write: if false; }
  match /outreach_inbox/{thread} { allow read, write: if false;
    match /inbox_messages/{doc} { allow read, write: if false; } }
  ```

  Check that no broader rule (such as `match /campaigns/{id}/{document=**} { allow read: if true; }`) opens these subcollections.
- **Rate-limit clean-up:** add a TTL policy on `rate_limits.expiresAt`:

  ```bash
  gcloud firestore fields ttls update expiresAt --collection-group=rate_limits --enable-ttl
  ```

- **Inbox retention (12 months):** every inbox message has an `expiresAt` a year after it was sent. Add a TTL policy so Firestore deletes them. The thread and the application statuses stay.

  ```bash
  gcloud firestore fields ttls update expiresAt --collection-group=inbox_messages --enable-ttl
  ```

- **Indexes:** none needed. Every query is a single-field equality or order.

## Setup

1. `npm install`
2. Env: see the "Campaign outreach" block in `.env.example`. The defaults work; `OUTREACH_APPLY_LIMIT` and `OUTREACH_APPLY_WINDOW_MIN` tune the form's rate limit.
3. Add the Firestore rules and the TTL policy above.

## Running tests

```bash
npm test
```

157 tests cover:
- handle and phone normalisation
- the duplicate merge
- bulk-paste matching
- template rendering and the "Hey!" fallback
- status transitions
- the server handlers: validation, rate limit, admin-only access, the audit log and log masking
- the seed data
- the WhatsApp API queue: rate limit, daily cap, backoff, permanent failures, Joined (including a forged or wrong-number tap), replies, reminders and failed deliveries
- Phase 3: personal links (forged and removed), proof checks, review and changes, posted, the ticket rules and the passes extension, payouts with the Spend, override and cancel, and the inbox (dedupe, 24-hour window, templates, media)

## Trying it locally with sample data

The seed writes a sample campaign and 20 fake applicants **only to the local Firestore emulator**. It refuses to run otherwise. The emulator needs Java 11+.

```bash
brew install openjdk@21
npx firebase-tools emulators:start --only firestore --project demo-newbi
```

In another terminal:

```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed:outreach
```

The seed phones are in +1 202-555-01xx, a range reserved for fiction, so "Open WhatsApp" can't reach anyone real. To browse the sample in the admin, run the dev server with the same `FIRESTORE_EMULATOR_HOST` and `FIREBASE_PROJECT_ID=demo-newbi`.

## Adding a campaign

1. **Creators → Campaigns → New campaign.** Fill the basics as usual.
2. In **Open application form**:
   - Turn on **Take applications with the open form**.
   - Check the **link name**. This is the slug, e.g. `arijit-singh-blr`.
   - Add the **cities** shown in the form's dropdown, the **artist**, the **dates** and **deliverables**.
   - Add **perks by tier**. The "from followers" numbers set nano, micro and macro; the defaults are 0, 10k and 100k.
3. Set the status to **Open** and save. Copy the form link from the card, or from the Outreach tab, and share it.
4. On the campaign, open **Outreach → Message setup**. Paste the **WhatsApp group invite** and adjust the **template**. The placeholders are `{first_name}`, `{campaign_title}`, `{group_link}` and `{deadline_line}`.
5. As applications come in, use **Applications** to filter and shortlist. **Paste handles** takes a list from a sheet or chat and shows which ones have no application.
6. In **Messages**, for each person:
   1. Click **Open WhatsApp**.
   2. Press send in WhatsApp.
   3. Click **Mark sent**.

   With the WhatsApp API set up, use **Send to N** on the WhatsApp API card instead: it sends everyone at the rate limit, and people tap **Joined ✅** themselves. **Copy message** is the fallback when WhatsApp Web won't open. After 15 chats in 10 minutes the panel suggests a break, because WhatsApp Web signed us out after ~44 quick sends.
7. Track **joined**, **replied**, **posted** and **paid** from the Messages card or the person's sheet. **Activity** shows every change and who made it.
8. **Export shortlist** downloads Excel or CSV with every column.
9. When the event starts, set the status to **Live**. Applications close, and the shortlist keeps working.

## Phase 2: sending with the WhatsApp Cloud API

When the API is set up, **Messages** shows a WhatsApp API card. **Send to N** queues everyone waiting for a message. The server then sends Meta's approved template with a **Joined ✅** button, never faster than the rate limit. Badges on each person follow Sent → Delivered → Read, or Not delivered (with Meta's reason). Open WhatsApp and Copy still work for anyone, for example when a send fails.

### Set up (once)

1. **Create two templates** in WhatsApp Manager (Message templates → Create), language English. The category is Utility, or Marketing if Meta asks.

   **`campaign_shortlist`**
   - Body: `Hey {{1}}! You're shortlisted for {{2}} with Newbi. Join the creators group for the brief, passes and next steps: {{3}} {{4}}`
   - Samples: `Riya` / `Arijit Singh Live, Bangalore` / `https://chat.whatsapp.com/AbCdEf123` / `Please post by Monday, 2 November.`
   - Button: **Quick reply**, text `Joined ✅`

   **`campaign_join_reminder`**
   - Body: `Hey {{1}}, a reminder to join the {{2}} creators group: {{3}}`
   - Button: **Quick reply**, text `Joined ✅`

   The variables are the Phase 1 placeholders, in order: {{1}} `{first_name}`, {{2}} `{campaign_title}`, {{3}} `{group_link}`, {{4}} `{deadline_line}`. Meta rejects empty variables, so an unclear name is sent as "there" and a missing posting deadline as "Details are in the group." If you name the templates differently, set `WHATSAPP_TEMPLATE_CAMPAIGN_SHORTLIST` and `WHATSAPP_TEMPLATE_CAMPAIGN_JOIN_REMINDER`. The text in `src/lib/outreach/whatsappTemplate.js` is only for the admin preview, so keep it the same as what Meta approved.
2. **Env vars** (Vercel, never in code): `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `CRON_SECRET`, `LINK_SIGNING_SECRET`. Optional: `OUTREACH_WA_PER_MINUTE` (20), `OUTREACH_WA_DAILY_CAP` (250) and `OUTREACH_JOIN_REMINDER_HOURS` (48). See `.env.example`.
3. **Webhook:** in the Meta app's WhatsApp → Configuration, set the callback URL to `https://app.newbi.live/api/track?type=whatsapp` and the verify token to `WHATSAPP_VERIFY_TOKEN`. Subscribe to **messages**, which covers both delivery statuses and replies.

### How it works

- **Queue:** `outreach_queue/{campaignId}_{appId}_{invite|reminder}` holds one job per person per message, so it can't be queued or sent twice. A transaction on `outreach_rate/whatsapp` keeps every worker under `OUTREACH_WA_PER_MINUTE` and `OUTREACH_WA_DAILY_CAP` (India day).
- **Status:** queued people move shortlisted → **To send**. When Meta accepts a message they move to message_sent. If Meta later reports it failed, the system moves them back to To send, a move only the system can make. Every step goes into the audit log, with the actor shown as "WhatsApp".
- **Retries:** temporary errors (rate limits, Meta 5xx) retry after 1, 5, 30 and 120 minutes. Permanent ones (not on WhatsApp, template paused or missing) fail at once with Meta's reason. A failed person can be sent again or messaged by hand.
- **Joined ✅:** the button carries a signed payload for the campaign and application. The webhook marks the person **joined** only if the tap comes from the number we sent to, and it cancels their reminder. Any other message marks them **replied** and stores the time, but not the text (the text waits for the Phase 3 inbox).
- **Reminder:** queued when the invite is sent and due after `joinReminderHours` (Message setup, default 48). When it comes due it goes out only if the person still hasn't joined and reminders are on.
- **Who drains the queue:** Vercel Hobby only allows daily crons, so three things take turns:
  1. After **Send**, the server starts a worker that sends at the rate limit and calls itself again before its 60-second limit, the same way `/api/mail` does. This needs `CRON_SECRET`. Without it, the Send request sends one first batch itself.
  2. While someone has the Outreach tab open and sends are waiting, the tab nudges the queue every 30 seconds.
  3. The daily `/api/mail` cron drains leftovers and sends reminders that have come due.

  Reminders are therefore only on time if a worker runs near their due time. To make that reliable, call the worker every 15 minutes from any scheduler, e.g. a GitHub Actions `schedule`, or move to Vercel Pro:

  ```bash
  curl -X POST https://app.newbi.live/api/creator-join?action=outreach-queue-run -H "Authorization: Bearer $CRON_SECRET"
  ```
- **Logs:** each message is in `message_log` (event `outreach-invite` or `outreach-reminder`). Phones are masked in server logs, and the access token never leaves the env.

## Phase 3: inbox, deliverables, tickets and payouts

### Creators send their posts

- After a creator taps **Joined ✅**, they get a personal link on WhatsApp (template `campaign_deliverables`): `app.newbi.live/d/{token}`. You can also put it in a hand-sent message with `{submit_link}`.
- The link is signed (`LINK_SIGNING_SECRET`), lasts 60 days and needs no sign-in. It stops working if they're removed from the shortlist.
- On that page they see the campaign's **deliverables** (the list in Edit → Deliverables) and send each one:
  - reels and posts: an Instagram link (checked to be an instagram.com reel or post);
  - stories: a screenshot (uploaded to Cloudinary like other proofs);
  - anything else: either.
- They can also add a **UPI ID** for payment. Nothing else financial is collected: no bank account numbers, no PAN.
- Submissions are stored on the application (`deliverables.{taskId}`, with a short history). They're rate-limited per network and audited.

### Review (Outreach → Review posts)

- **Approve**, or **Ask for changes** with a reason. The reason goes to the creator on WhatsApp (`campaign_deliverable_changes`) with their link, and they send it again.
- When every **required** deliverable is approved, the person moves to **Posted** automatically.

### Tickets (Outreach → Payouts and tickets)

Tickets are real Newbi passes (QR, gate scanner), sent by email and WhatsApp through the existing passes system (`campaign_ticket` / `campaign_ticket_link`). Choose when they go out in Message setup:
- **when their pre-event deliverables are approved** (default). These are the required ones due on or before the event date; without dates, every required one except "visit the event";
- **when they tap Joined**;
- **only when you release them**.

`passes.js` gained `releaseApplicationPass`. The holder comes from the application (the phone and email they applied with), so it works for people without a Newbi login. A registered creator's pass is keyed to their login, so they never get two. You can revoke a ticket and send a new one. Ticket messages go through the passes system's own delivery, not the outreach queue.

### Payouts (Outreach → Payouts and tickets)

- **Nothing moves money.** Pay in your bank app, then **Mark paid**. The amount defaults to the tier's cash from the campaign; add the method, account, date and the UTR.
- Mark paid needs every required deliverable approved. You can override that with a written reason, which goes into the audit log.
- Each payout also writes a **Spend** (`spends`, type **Creator Payout**, linked to the campaign and application), so it shows in Finance. The creator gets `campaign_payout_sent` with the amount and reference.
- **Cancel payout** marks the Spend Cancelled and moves them back to Posted.
- **Export payouts due** gives an Excel file with names, UPI IDs and amounts.
- Payments to creators above certain amounts may need TDS (sections 194R/194J). Check with your accountant; the app doesn't handle TDS.

### Inbox (Outreach → Inbox)

- Every WhatsApp message in and out is kept per phone number (`outreach_inbox/{contactId}/inbox_messages`). That covers incoming texts, Joined taps, photos and voice notes, plus every template and reply we sent. Each thread is linked to the person's applications and their creator profile.
- Only founder, super_admin, developer and admin roles can see it, the same as the rest of outreach.
- **Replying:** free text only within 24 hours of their last message (Meta's rule). After that, send a template (their posts link, or the join reminder). Replies use the send queue: same rate limit, retries and read ticks.
- **Media:** photos and voice notes load through the server when you click Show. Meta only keeps media for a while.
- **Mark done** files a thread away; a new message reopens it. Messages are deleted after 12 months by the TTL policy above.

### More templates to create in WhatsApp Manager

1. **`campaign_deliverables`**
   - Body: `Hey {{1}}! Here's your personal link to send your {{2}} posts to Newbi. Tap the button once they're live.`
   - Button: **Visit website**, dynamic URL `https://app.newbi.live/d/{{1}}`, text "Send my posts"
2. **`campaign_deliverable_changes`**
   - Body: `Hey {{1}}, a quick change on "{{2}}": {{3}} Tap the button to send it again.`
   - Button: the same dynamic URL, text "Send it again"
3. **`campaign_payout_sent`**
   - Body: `Hey {{1}}, we've sent ₹{{2}} for {{3}}. Reference: {{4}}. Thanks for creating with Newbi!`

The ticket templates (`campaign_ticket`, `campaign_ticket_link`) already exist for the passes system. Override names with `WHATSAPP_TEMPLATE_CAMPAIGN_DELIVERABLES` and the like.
