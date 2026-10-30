# Firestore access from the browser (for writing firestore.rules)

Mapped on 2026-10-19 from `src/` only. `api/` uses firebase-admin, which bypasses the rules. Line numbers are approximate.

## How it works today

- **Whole-collection listeners.** `subscribeToKey` (store.js ~858), triggered by `useStoreSubscription([...])`, opens an unfiltered `onSnapshot(collection(db, X))`. Every page that subscribes therefore needs list access to the whole collection.
- **Staff.** There are no custom claims. The role comes from the `admins` collection, matched by email in `checkUserRole` (store.js ~4840). `users/{uid}.role` is never read.
  - Roles live in `src/constants/roles.js`. Admin roles are founder, super_admin, developer, admin, editor, content_admin, scanner and gate_manager.
  - `pending` and `unauthorized` mean not staff.
  - Admin docs have random ids, so the rules can't check staff by email.
- **UI-only checks.** `localStorage.adminAuth` and `nb_auth_session` only affect what the UI shows, and both can be spoofed. Any protection has to come from the server or the rules.

## Users writing their own documents

**`users/{uid}`**
- Reads: own doc (get and onSnapshot). Staff list the whole collection (`subscribeToAllUsers`), and query `where email`.
- User writes: create on sign-up, `lastActive`, `displayName`, `fcmToken`/`fcmTokens`, and delete on account deletion.
  - `updateUserProfile` writes **any fields**, including `phoneNumber` (ProfilePanel, EventTicketingModal, AuthOverlay).
  - App `updateProfile` uses a whitelist: name, photoURL, city, collegeId, college, onboarding, emailPrefs, isStudent, occupation, gender, interests, instagramHandle, displayName, email, updatedAt.
  - **`savePhoneVerified`** writes `phone`, `phoneVerified`, `phoneNumber`, `isPhoneVerified` and `phoneVerifiedAt` from the client.
  - **`joinCommunity`** writes `capabilities.member`, `hasJoinedTribe` and `joinedCommunityAt`.
  - The client never writes `role`, `capabilities.creator` or `capabilities.campus`.
- Staff writes: `isBlocked`, `displayName`, and `forceLogoutBefore` (dev only).

**`admins/{autoId}`**
- **Any signed-in user** can `addDoc` a `role:'pending'` request (requestAdminAccess, store.js ~5048), and the client can set any field on it.
- **Anonymous visitors list the whole collection** through `notifyAdmins` (notificationTriggers.js ~83, from the public invoice payment claim).
- Founders and developers add, change role and delete in AdminManager. This is gated only in the UI.

**`creators/{id}`**
- Reads:
  - The owner reads their own doc and queries `where uid`/`email`/`phone`.
  - Staff list the whole collection.
  - **Anonymous** `getDoc` in VerifyCreator, where the token is compared on the client.
- Writes: the main path is the API. The direct fallback is localhost only.
  - **`updateCreator` writes any fields.** Callers write `profileStatus`, `isVerified`, `instagramVerified`, `isPhoneVerified`, `phone` and `joinedCampaigns`.
  - **Anonymous** VerifyCreator `updateDoc` writes `isPhoneVerified`, `isEmailVerified` and `verificationToken`.
  - Staff can do anything.

**`artists/{uid}`**
- Public list on `/artistant`.
- The user `set`s, `update`s and `delete`s their own doc. `gigCasting.*` updates are also made.

**`notifications/{autoId}`**
- Reads: own, via `where userId == uid`, and global, via `where userId == null`.
- Writes:
  - `addNotification` **defaults to `userId:null`, which is a global broadcast**. ProfilePanel ~1770 relies on that default.
  - A user can mark their own notifications `isRead`.
  - An anonymous invoice claim writes to the admins' uids.
  - Staff write anything.

**`passes/{ref}`**
- Written by the server only.
- Reads: the holder via `where holderUid == uid`; staff via `where eventId in`, `sourceId in` and `sourceId ==`.
- Since 81b3061, staff reads and the holder fallback also go through the API (`docs/firestore-rules-passes.md`).

**`campaigns/{id}/submissions/{uid}`**
- Reads: the owner's own doc; staff use `collectionGroup('submissions')`.
- Writes: staff use `batch.update`; creators submit through the API.

## Public and anonymous collections

| Path | Reads | Browser writes |
|---|---|---|
| announcements | everyone (full listener) | staff |
| site_settings/{general, contact_info, payment_info} | everyone | staff |
| site_settings/ai_config, app_state/dashboard_config | staff | staff |
| app_state/{maintenance, maintenance_local} | everyone | staff |
| upcoming_events, volunteer_gigs, giveaways, forms | anonymous | staff; visitors `forms.responseCount` increment |
| guestlists/{id} | signed-in list; get by id | **any visitor**: `setDoc` of the parent doc and `currentSpots` increment (addGuestlistEntry) |
| guestlists/{id}/entries | staff; scanner `where bookingRef` (+ collectionGroup) | **visitor create with a client-chosen `status`**; staff update/delete |
| ticket_orders | visitor `where paymentRef`; scanner `where bookingRef` | API first; **visitor `addDoc` fallback with client status**; staff |
| coupons | visitor `where code` | **visitor `usedCount` increment** (fallback); staff |
| posts | public full listener (drafts included) | visitor `viewCount`/`shareCount` increment; staff |
| campaigns | anonymous list/get; signed-in full listener | creator transaction on `tasks` (fallback); staff |
| invoices | **public page lists the whole collection** | **anonymous** `lastOpened`, `accessLogs`, `status`, `paymentClaim`; staff |
| proposals | **public page lists the whole collection** | **anonymous** `accessLogs`, accept/reject + signature; staff |
| agreements | **public page lists the whole collection** | **anonymous** `accessLogs`, sign; staff |
| documents/{id} | anonymous get (the `isPublic` check is client-side) | staff |
| form_responses | staff | API first; visitor create fallback (`{formId}_{uid}`); staff |
| subscribers | staff (dev fallback `where email`) | fallback `addDoc` |
| client_requests | staff | any signed-in user `addDoc` |
| giveaway_entries | staff | staff (entrants use the API) |

**Staff-only collections:**
- Finance: spends, other_incomes, finance_payees, finance_bank_accounts (bank details saved from the invoice builder)
- Documents: gen_documents, messages
- Portfolio and concerts: portfolio, portfolio_categories, concerts
- Creator content: past_clients, creator_testimonials, creator_groups
- Ticketing and mail: ticket_vault, email_templates, email_campaigns, email_events, ticket_uploads

## Storage (src/lib/store.js; Cloudinary is tried first)

- **Signed-in users, possibly anonymous ones:**
  - `uploads/file_*` and `uploads/fallback_*` for any file. Callers include ArtistAnt, ProfilePanel, task proof and guestlist tasks.
- **Staff:**
  - `events/videos/*`
  - `documents/*`, with delete by `storagePath`
  - `email_templates/*`
- **Anonymous signers and staff:**
  - `signatures/proposals/*`
  - `signatures/agreements/*`

## Risks the rules must close (in order)

1. **Becoming staff.** Make sure no one can create or edit an `admins` doc with a staff role, or edit their own role, and that anonymous visitors can't list `admins`.
2. **Self-written trust fields.** Stop users writing `phoneVerified`/`isPhoneVerified`/`capabilities` on `users`, and `profileStatus`/`isVerified`/`isPhoneVerified` on `creators`. These need a field whitelist or must move to the API.
3. **Public document pages.** Stop the public pages listing whole collections, and stop anonymous writes to invoices, proposals and agreements. Allow `get` only, plus narrow field updates or an API.
4. **Global broadcasts.** Stop users creating `userId:null` notifications.
5. **Visitor writes to entries and orders.** Stop visitors choosing the `status` on guestlist entries and orders, and stop visitors incrementing `currentSpots`/`usedCount`.
6. **Client-side checks.** `documents.isPublic` and the creator `verificationToken` are checked only in the browser.

Some of these can't be closed with rules alone without breaking the app. Those code paths need to move to the API first, and the rules come after.

## Status (2026-10-19, after the browser-write fixes on redesign/integration)

Closed in code and in `firestore.rules` (not yet published; `node scripts/dev/rules-test/run.cjs` → 87/87):

- **Risk 2, phone.** The server writes the phone fields (`api/_lib/creatorApp.js` `profile-phone`), and marks a number verified only when it's the one on the Firebase Auth account. Rules refuse `phone`, `phoneNumber`, `phoneVerified`, `isPhoneVerified` and `phoneVerifiedAt` on `users`, and the phone and every verification field on `creators`. The VerifyCreator browser fallback is gone.
- **Risk 3, public documents.** The invoice, proposal and contract pages read one doc by id (`useSharedDoc`). View logs, payment claims, accept/decline and signing go through `/api/forms?type=shared-doc` (`api/_lib/sharedDocs.js`). Rules: `get` for anyone; `list` and writes for staff only.
- **Risk 4, broadcasts.** `addNotification`/`triggerNotification` need an explicit `userId` (null = everyone, staff only). Rules: read own + global, create for yourself (staff: anyone), update own `isRead`, delete own.
- **Risk 5, entries and orders.** Guestlist sign-ups use passes `register-guestlist`; orders and coupons use the ticket API only (browser fallbacks removed). Rules: guestlists, entries, `ticket_orders` and `coupons` are staff-only in the browser.

Still open: risk 6 (`documents.isPublic` is checked in the browser; `documents`/`gen_documents` are readable by anyone), and `creators` direct writes by the owner (allowed for non-trust fields; the store tries them before the API).

