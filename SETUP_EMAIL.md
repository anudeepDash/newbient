# How to Configure Email

## 1. Local Testing (On your computer)
1.  In your project folder, look for a file named `.env.local`.
2.  Open it and add these lines at the bottom:

```env
# Email Settings
EMAIL_USER=your-partnership@newbi.live
EMAIL_PASSWORD=part.newbi@25
EMAIL_HOST=imap.secureserver.net
EMAIL_PORT=993
```
*(Replace the values with your actual Godaddy login details)*

### Windows Users: "Operation not permitted" Error?
If `vercel dev` fails with `EPERM: operation not permitted`, this is a Windows permission setting.
**Solution:**
1.  **Recommended:** Skip local testing and **Deploy to Vercel** (see below). It is much easier.
2.  **Alternative:** Run your terminal (PowerShell/Command Prompt) as **Administrator** and try `npx vercel dev` again.

## 2. Production (On Vercel)
When you deploy to the live website, you must add these same variables to Vercel:

1.  Go to your **Vercel Dashboard**.
2.  Select your project (**newbi-entertainments**).
3.  Click **Settings** (top tab) -> **Environment Variables** (left menu).
4.  Add each variable one by one:
    *   **Key**: `EMAIL_USER` | **Value**: `info@newbi.live` (example)
    *   **Key**: `EMAIL_PASSWORD` | **Value**: `******`
    *   **Key**: `EMAIL_HOST` | **Value**: `imap.secureserver.net`
    *   **Key**: `EMAIL_PORT` | **Value**: `993`
5.  **Redeploy** your project for changes to take effect.
