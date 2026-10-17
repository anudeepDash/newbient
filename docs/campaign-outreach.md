# Campaign outreach

Replaces the Google Form → sheet → WhatsApp Web routine for creator campaigns. Creators apply through an open form with no sign-in. Admins shortlist them, send each person a WhatsApp message by hand from a ready-made link, and track them through joined, posted and paid. Every status change is logged.

Phase 1 (this) has no WhatsApp API. Messages open in WhatsApp through `wa.me` and **an admin presses send**. Nothing is sent from the browser automatically, and nothing drives WhatsApp Web.

## Where things are

| What | Where |
|---|---|
| Public form | `app.newbi.live/c/{slug}/apply` → `src/app/creator/campaign/apply/CampaignApplyPage.jsx` |
| Admin | Creators → Campaigns → a campaign → **Outreach** tab → `src/components/admin/campaigns/outreach/` |
| Open-form settings | Campaign editor → **Open application form** card (`outreach/OpenFormCard.jsx`) |
| Shared rules (browser and server) | `src/lib/outreach/` (normalise, template, status, match, application, export) |
| Server | `api/_lib/outreach.js`, reached through `api/creator-join.js?action=outreach-*`. The project is at Vercel's function limit, so it can't have its own function. |
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
  ```

  Check that no broader rule (such as `match /campaigns/{id}/{document=**} { allow read: if true; }`) opens these subcollections.
- **Rate-limit clean-up:** add a TTL policy on `rate_limits.expiresAt`:

  ```bash
  gcloud firestore fields ttls update expiresAt --collection-group=rate_limits --enable-ttl
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

110 tests cover:
- handle and phone normalisation
- the duplicate merge
- bulk-paste matching
- template rendering and the "Hey!" fallback
- status transitions
- the server handlers: validation, rate limit, admin-only access, the audit log and log masking
- the seed data

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

   **Copy message** is the fallback when WhatsApp Web won't open. After 15 chats in 10 minutes the panel suggests a break, because WhatsApp Web signed us out after ~44 quick sends.
7. Track **joined**, **replied**, **posted** and **paid** from the Messages card or the person's sheet. **Activity** shows every change and who made it.
8. **Export shortlist** downloads Excel or CSV with every column.
9. When the event starts, set the status to **Live**. Applications close, and the shortlist keeps working.

## Phase 2 and 3 (not built)

- **Phase 2:** WhatsApp Cloud API templates mapped to the same four placeholders, a delivery and read webhook, a "Joined" quick reply with a reminder, and a rate-limited send queue. `api/_lib/whatsapp.js` already has the sender and the message log to build on.
- **Phase 3:** a replies inbox, deliverable submission with approve/reject, and payout or ticket release against approved deliverables.
