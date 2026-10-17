# Creator campaigns: apply → shortlist → submit

Everything runs on the website (admin) and the app. No Google Form is needed. Campaigns can still use one for applying or for a deliverable, as an option.

## The flow

1. **Register.** The creator signs up once in the creator portal (`/creator/apply`) and gets a Newbi ID.
2. **Drop the campaign.** In Admin → Campaigns, create the campaign, its deliverables and the WhatsApp group link (Brief → "WhatsApp group for shortlisted creators").
3. **Share the link.** `app.newbi.live/c/<id>` ("Copy link" in the admin).
4. **Apply in one tap.** Signed-in creators tap "1-click apply". Applying adds them to `joinedCampaigns` and **never** shortlists them. Campaigns set to "Google Form" or "Both" still offer the form ("I've sent the form" counts as applied).
5. **Client sheet.** On the campaign's Applicants tab, "Client sheet" downloads every applicant (Newbi ID, name, Instagram and link, followers, city, niche, college, status) with an empty **Shortlist** column. It has no phone numbers or emails, so it can go to the brand as is. "Export" is still the full internal sheet.
6. **Shortlist.** Either:
   - **Upload shortlist:** the client writes `Yes` in the Shortlist column (or deletes the rows they don't want) and sends the sheet back as CSV. Rows are matched by Newbi ID, then Instagram, email or phone. You get a preview, can skip rows, then "Shortlist N".
   - **Manually:** "Shortlist" on a row, on several ticked rows, or inside the applicant panel.
   "Considering" is the team's private list. Creators on it aren't told anything.
7. **Welcome.** Shortlisting sends the welcome unless you switch it off: email, WhatsApp, push and an in-app alert, with the group link and the campaign link. It goes once per creator; "Send the welcome again" (bulk menu) resends it.
8. **Submit.** Only shortlisted creators see the submit buttons and the deliverable's Google Form. The server checks this too (`campaign-submit` and the old `campaign-task-submit` both refuse anyone who isn't shortlisted).
   - A deliverable with a Google Form: "Mark as submitted" after sending the form, or "Send a link instead".
   - Otherwise: the post link and/or a screenshot.
   Reviews, payouts and tickets work as before.

## Data

| Field | Meaning |
| --- | --- |
| `creators.joinedCampaigns[]` | Applied |
| `creators.shortlistedCampaigns[]` | Shortlisted (only staff add to it; creators can only withdraw) |
| `creators.campaignStages[id]` | `'shortlisted'` (shown as "Considering") or `'declined'`. Admin only |
| `creators.campaignWelcome[id]` | `{ sentAt, channels }`, written by the welcome. Admin only |
| `campaigns/{id}/submissions/{uid}.tasks[taskId].via` | `'app'` or `'google_form'` |

`autoShortlistEligible` is retired. The editor no longer shows it, and the server ignores it.

## WhatsApp template to get approved

The welcome goes out on WhatsApp once Meta approves the template and `WHATSAPP_TEMPLATE_CAMPAIGN_SHORTLISTED` is set to its approved name. Until then, email, push and the in-app alert still go out, and the admin toast tells you WhatsApp was skipped. It only goes to numbers the creator verified.

- Name: `campaign_shortlisted`, category Utility, language `en` (or set `WHATSAPP_TEMPLATE_LANG`)
- Body:
  > Hi {{1}}, you're shortlisted for {{2}} on Newbi! Join the campaign group here: {{3}}. Your deliverables are in the campaign. Submit them there once they're live.
- Button: URL `https://app.newbi.live/c/{{1}}`, label "Open campaign" (the suffix is the campaign id)
- Example values: `Priya`, `Lollapalooza Hype`, `https://chat.whatsapp.com/…`, `abc123`

When a campaign has no group link, {{3}} is the campaign link.
