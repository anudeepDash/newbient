# Instagram verification: setup

Creators verify their Instagram through Meta's official APIs only, and only Professional (Creator or Business) accounts can be verified. Until you finish the steps below, the check stays **off**. While it's off:

- creators type their handle and follower count;
- every application goes to admin review;
- nothing is scraped and no third-party API is called.

The code is `api/_lib/instagram.js` and `api/_lib/creatorApp.js`. Both are served by `api/creator-join.js`, because the project is at the Vercel function limit.

## How it works

1. **Step A: username check.**
   - While the creator types their handle, the server looks it up with Meta's Business Discovery API, through Newbi's own Instagram Business account.
   - The lookup returns the exact follower count, the profile picture and Instagram's numeric id.
   - Results are cached for 24 hours in `instagram_profiles`.
   - A personal account comes back as "not found". The app then shows how to switch to a free Professional account.
2. **Step B: Connect Instagram.** This uses Instagram Login with the `instagram_business_basic` scope.
   - The connected account's `user_id` must match the account found in step A.
   - The follower count comes from Meta, never from the app.
   - The token is stored only in `private/instagram_tokens/users/{uid}`.
   - One Instagram account belongs to one person, tracked in `instagram_owners/{igUserId}`.
3. **Approval.** The application is approved automatically when Instagram is connected and the account has at least `minInstagramFollowersToJoin` followers. Otherwise it goes to review.
4. **When Meta is down.**
   - Every call has one 3-second timeout and no retries. If Meta doesn't answer, the application is saved as `pending_verification`.
   - The daily cron (`/api/cron/refresh-instagram`) retries those applications. It also refreshes stored tokens before their 60-day expiry and updates follower counts.
   - Errors are logged to `integration_log`.

## What you need to set up

1. **Meta developer app.**
   - At developers.facebook.com, create an app and add the **Instagram API with Instagram Login** product.
   - Add the redirect URI `https://app.newbi.live/api/instagram/callback`.
   - Submit `instagram_business_basic` for App Review. Until it's approved, only Instagram accounts with a tester role on the app can connect.
2. **Business Discovery (step A).**
   - Newbi's Instagram must be a Business account linked to a Facebook Page.
   - Create a long-lived Page token or System User token with `instagram_basic` and `pages_read_engagement`.
   - Note Newbi's Instagram Business account id (`GET /{page-id}?fields=instagram_business_account`).
3. **Vercel environment variables (Production).** These are server-only, so never give them a `VITE_` prefix.

   | Name | Value |
   |---|---|
   | `IG_APP_ID` | The Instagram app id (Instagram Login product) |
   | `IG_APP_SECRET` | The Instagram app secret |
   | `IG_REDIRECT_URI` | `https://app.newbi.live/api/instagram/callback` |
   | `META_GRAPH_TOKEN` | The long-lived token from step 2 |
   | `NEWBI_IG_USER_ID` | Newbi's Instagram Business account id |
   | `LINK_SIGNING_SECRET` | 32 or more random characters (also used by the mail links) |
   | `CRON_SECRET` | A random string (also used by the mail worker) |
   | `PUBLIC_APP_URL` | `https://app.newbi.live` |
   | `META_GRAPH_VERSION` | Optional. Defaults to `v21.0` |

   The old `RAPIDAPI_*` and `APIFY_*` variables are no longer used, so you can delete them.
4. **Switch it on.** In Admin → Creators → Settings → Instagram check, turn on **Verify through Instagram (Meta)**. This sets `site_settings/general.instagramMetaVerification`.
5. **Test before you announce it.**
   - Connect a tester Professional account and check that it comes back connected with the right follower count.
   - Try a personal account and check that the switch-to-Professional guide shows.

## Firestore rules to add

```
// Server only: tokens, ownership, caches and logs.
match /private/{document=**} { allow read, write: if false; }
match /instagram_owners/{id} { allow read, write: if false; }
match /instagram_profiles/{id} { allow read, write: if false; }
match /integration_log/{id} { allow read: if isStaff(); allow write: if false; }

// App task submissions: written by the server; the creator reads their own; staff read and review.
match /campaigns/{campaignId}/submissions/{uid} {
  allow read: if request.auth.uid == uid || isStaff();
  allow update: if isStaff();
  allow create, delete: if false;
}
// The admin reads every campaign's submissions in one collection-group query.
match /{path=**}/submissions/{uid} { allow read: if isStaff(); }

// users/{uid}: the creator flag and status come from the server only.
// (add to the existing users rule)
//   !request.resource.data.diff(resource.data).affectedKeys().hasAny(['capabilities.creator', 'creatorStatus', 'instagram', 'role'])
// Note: `capabilities` is a map, so in practice compare request.resource.data.capabilities.creator
// with resource.data.capabilities.creator.

// creators/{uid}: creators must not write profileStatus, isVerified, igUserId, instagramVerified
// or shortlistedCampaigns directly; the app does these through the API. (joinedCampaigns can be
// locked down too once ProfilePanel's old campaign modal is gone in Phase 5.)
```

## Existing creators

Creators verified before this change keep their status. When the check is on, their creator home shows "Reconnect your Instagram" with a **Connect Instagram** button. Admins can tell who hasn't moved over: those creators have no `instagramVerifiedVia: 'oauth'` on their creator doc.
