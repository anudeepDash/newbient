# Firestore rules for passes (optional)

Passes work without these rules. When the browser can't read `passes` or `ticket_uploads`, it lists them through the API instead:
- `GET /api/forms?type=passes&action=mine` returns your own passes.
- `POST …&action=staff-list` returns staff lists, after checking you're on the `admins` list.

The API is refreshed every 15–60 s and straight after any change. Adding the holder rule below lets the app read a person's own passes directly and live.

There is no staff rule here, for two reasons:
- The staff role lives in `admins` documents that are looked up by email.
- Rules can only `get()` a document at a known path, so they can't check that role.

Staff lists stay on the API.

Paste this inside `match /databases/{database}/documents { … }` in Firebase console → Firestore → Rules. Test it in the Rules Playground, then publish:

```
// Event passes (passes/{ref}): written only by the server (api/passes, Admin SDK).
// A signed-in person can read their own passes; everything else goes through the API.
match /passes/{ref} {
  allow read: if request.auth != null && resource.data.holderUid == request.auth.uid;
  allow write: if false;
}
// Send log and de-duplication keys: server only.
match /ticket_uploads/{id} { allow read, write: if false; }
match /pass_keys/{id} { allow read, write: if false; }
```

**Playground checks:**
1. **Own pass is readable.** Location `/passes/ANYREF`, signed in as that pass's holder: a `get` on a document whose `holderUid` is your uid is **allowed**.
2. **Someone else's pass is blocked.** The same location with another uid is **denied**.

The repo still has no complete `firestore.rules` file (see `docs/audit-2026-10-17-perf-security.md`). Writing one from the live console rules is a separate task.
