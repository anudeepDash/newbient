# Deployment Guide - NewBi Entertainment

This guide explains how to host your React application for free using **Vercel** (recommended) or **Netlify**, configure your custom domain `newbi.live`, and manage Admin access securely.

## 0. Prerequisites (Critical)
Before you begin, ensure you have **Git** installed.
- **Check**: Run `git --version` in your terminal.
- **Install**: If you see an error like "git is not recognized", download it here: [https://git-scm.com/downloads](https://git-scm.com/downloads).
- **Restart**: After installing, **you must restart VS Code** (close and reopen the window) for the command to work.

## 1. Push to GitHub
You need to push your local code to a GitHub repository.
1. Create a new repository on [GitHub](https://github.com/new).
2. Copy the URL of your new repository (e.g., `https://github.com/your-username/newbi-entertainments.git`).
3. Run the following commands in your terminal ( VS Code terminal):
   ```bash
   git remote add origin https://github.com/your-username/newbi-entertainments.git
   git branch -M main
   git push -u origin main
   ```

## 2. Deploy on Vercel (Recommended)
Vercel is the best platform for React/Vite apps.

1. Go to [Vercel](https://vercel.com) and Sign Up/Login with GitHub.
2. Click **"Add New..."** -> **"Project"**.
3. Select your `newbi-entertainments` repository from the list.
4. **Configure Project**:
   - **Framework Preset**: Vite (should be auto-detected).
   - **Environment Variables** (REQUIRED for Admin Access):
     - Click to expand "Environment Variables".
     - Add `VITE_ADMIN_USERNAME` with value `admin` (or your preferred username).
     - Add `VITE_ADMIN_PASSWORD` with value `newbi2024!` (or your preferred password).
     - **Note**: If you do not set these, the Admin login will show a security error in production.
5. Click **Deploy**.

## 3. Connect Custom Domain (newbi.live)
Once deployed on Vercel:
1. Go to your project **Settings** -> **Domains**.
2. Enter `newbi.live` and click **Add**.
3. Vercel will give you DNS records to add.
   - **Type**: A Record
   - **Name**: @
   - **Value**: 76.76.21.21 (Vercel IP)
   - *OR* use Nameservers if you want Vercel to manage DNS.
4. Log in to your domain registrar (GoDaddy, Namecheap, etc.) and add these records.

## 3.5 Troubleshooting "Reviewing / Not Secure" (SSL)
If your site says "Not Secure" or "Your connection is not private":
1. **Wait**: SSL generation on Vercel takes time after DNS connects. It typically takes **15 minutes to 1 hour**, but can take up to 24 hours.
2. **Check Status**: 
   - Go to Vercel Dashboard -> Settings -> Domains.
   - Look at `newbi.live`. It should have a blue checkmark.
   - If it says "Invalid Configuration" or "Pending", check your DNS records again.
3. **Force HTTPS**:
   - Ensure you are visiting `https://newbi.live` (not `http`).
   - Try a different browser or Incognito window to clear cached "Not Secure" states.


## 4. Admin Access for Core Team
- **Credentials**: Share the username and password you set in the Environment Variables with your core team.
- **Login URL**: `https://newbi.live/admin` (or just click "Admin" in the footer).
- **CMS Persistence**: 
  - **IMPORTANT**: Currently, changes made in the Admin panel (like adding announcements or changing phone numbers) are saved to **Local Storage**. 
  - This means if *you* make a change, *only you* will see it on your device. It does not update the live site for everyone else.
  - **To make real-time updates for everyone**, we need to connect a Backend (like Firebase or Supabase) in Phase 2.
  - For now, to update site content permanently, you must edit the code (e.g., `src/lib/store.js`) and push to GitHub. Vercel will auto-deploy the changes.

## 5. Future Roadmap
See `FUTURE_PLANS.md` for the upcoming features list.
