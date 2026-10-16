# Phase 5 (passes and the two ticket flows): owner setup

Everything here is needed before Phase 5 goes live. Until then the code is
safe to deploy: passes simply aren't readable from the browser, and WhatsApp
tickets are skipped (email and in-app still go out).

## 1. Firestore rules

Add these inside `match /databases/{database}/documents { … }`, using the
staff check your rules already have for `ticket_orders` (shown as `isStaff()`):

```
function signedIn() { return request.auth != null; }

// One record per pass. Written only by the server (/api/forms?type=passes).
match /passes/{ref} {
  allow read: if signedIn() && (resource.data.holderUid == request.auth.uid || isStaff());
  allow write: if false;
}

// One-pass-per-person keys and the CSV upload log: server only / staff read.
match /pass_keys/{id} { allow read, write: if false; }
match /ticket_uploads/{id} { allow read: if isStaff(); allow write: if false; }

// "I'm interested" on gigs: written by the server.
match /gig_applications/{id} {
  allow read: if isStaff() || (signedIn() && resource.data.userId == request.auth.uid);
  allow write: if false;
}

// Giveaway entries are created and scored by the server now. Staff still
// mark winners and disqualify from the admin.
match /giveaway_entries/{id} {
  allow read: if isStaff() || (signedIn() && resource.data.userId == request.auth.uid);
  allow create: if false;
  allow update, delete: if isStaff();
}

// users/{uid}: the app writes only capabilities.member (Join) and the
// verified phone. Don't let people set capabilities.creator / campus or role.
```

Indexes: every new query is a single-field or equality-only query, so no
composite index is needed. The pass page's fallback for old codes uses a
collection-group query on `entries.bookingRef`; enable the collection-group
single-field index for `entries` → `bookingRef` if Firestore asks for it.

## 2. Storage rules (ticket PDFs)

Official ticket PDFs live at `tickets/{campaignId}/{uid}/…`. The server
uploads them and hands out 10-minute signed links (1 hour for WhatsApp), so no
browser needs direct access:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /tickets/{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

Signed links need the service account key (`FIREBASE_CLIENT_EMAIL` /
`FIREBASE_PRIVATE_KEY`, already set). The bucket is `FIREBASE_STORAGE_BUCKET`,
falling back to `VITE_FIREBASE_STORAGE_BUCKET`.

## 3. WhatsApp templates (Meta WhatsApp Manager)

Create these as **Utility** templates, language English, and wait for approval:

| Template | Header | Body variables | Button |
|---|---|---|---|
| `campaign_ticket` | Document | {{1}} name, {{2}} campaign, {{3}} event, {{4}} date | URL `https://app.newbi.live/t/{{1}}` ("View ticket") |
| `campaign_ticket_link` | none | same as above | same as above |
| `pass_confirmed` | none | {{1}} name, {{2}} event, {{3}} date, {{4}} pass code | URL `https://app.newbi.live/p/{{1}}` ("Open pass") |

Suggested body for `campaign_ticket`: "Hi {{1}}, your ticket for the {{2}}
campaign is here: {{3}} on {{4}}. It's also inside the campaign in the Newbi
app."

After approval set, in Vercel:
`WHATSAPP_TEMPLATE_CAMPAIGN_TICKET=campaign_ticket`,
`WHATSAPP_TEMPLATE_CAMPAIGN_TICKET_LINK=campaign_ticket_link`,
`WHATSAPP_TEMPLATE_PASS_CONFIRMED=pass_confirmed`.
Nothing goes to WhatsApp until each one is set.

## 4. Environment

- `PUBLIC_APP_URL=https://app.newbi.live` (pass, ticket and campaign links in
  emails and WhatsApp; it is also the default).
- `LINK_SIGNING_SECRET` (from Phase 6) signs the `/t/<token>` ticket links.
  Changing it invalidates links already sent; the tickets stay in the app.

## 5. Data migration (after the rules are live)

`scripts/migrate-passes.mjs` copies upcoming confirmed orders and guestlist
places into `passes`, keeping their existing codes so QR codes people already
have keep scanning. It's a dry run unless `--apply --project <id>`; try it on
the emulator or a staging project first.

```
node scripts/migrate-passes.mjs --report passes-plan.json
node scripts/migrate-passes.mjs --apply --project newbi-ent-v2
```
