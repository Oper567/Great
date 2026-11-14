# 🚀 cPanel Subdomain & PWA Deployment Guide for CBT Portal

This guide provides instructions to connect `cbt.greatfavourmontessori.com.ng` to your Next.js application on cPanel (CloudLinux / Phusion Passenger / Truehost).

---

## 🏗️ Architecture Overview

Your application uses a **unified single-process architecture**:
- **One Next.js Node.js process** handles both `greatfavourmontessori.com.ng` and `cbt.greatfavourmontessori.com.ng`.
- **Zero Double-RAM Penalty**: Saves ~200MB memory under CloudLinux LVE limits.
- **Smart Middleware Routing**:
  - `cbt.greatfavourmontessori.com.ng/` $\rightarrow$ CBT Student Login / Dashboard
  - `cbt.greatfavourmontessori.com.ng/dashboard` $\rightarrow$ Student Exam Hub
  - `cbt.greatfavourmontessori.com.ng/exam/:id` $\rightarrow$ Examination Terminal
  - Marketing pages on `cbt.*` are automatically redirected to the main domain.
  - CBT links on the main domain redirect directly to the subdomain.
- **Progressive Web App (PWA)**:
  - Installable on Android, Windows, Chromebooks, iPads, and iPhones.
  - Offline-safe exam buffering with local answer caching.

---

## 📋 Step 1: Create Subdomain in cPanel

1. Log in to your **cPanel Dashboard**.
2. Under the **Domains** section, click **Domains** (or **Subdomains**).
3. Click **Create A New Domain**.
4. Enter the domain name: `cbt.greatfavourmontessori.com.ng`.
5. **Document Root**:
   - **Method A (Recommended - Shared Root)**:
     Uncheck *"Share document root"* and point the Document Root to your existing application root directory:
     ```
     /home/mqqfpopx/gfms_app
     ```
     *(This directly shares the existing Passenger app configuration with zero extra configuration!)*
   - **Method B (Separate Subdomain Folder)**:
     If cPanel insists on creating a dedicated folder (e.g., `public_html/cbt` or `cbt.greatfavourmontessori.com.ng`):
     - Copy `public/cbt-subdomain.htaccess` into that folder as `.htaccess`.
     - Update the Passenger paths inside it to match your cPanel username.
6. Click **Submit**.

---

## 🔒 Step 2: Install SSL Certificate (HTTPS)

1. In cPanel, navigate to **SSL/TLS Status**.
2. Locate `cbt.greatfavourmontessori.com.ng` in the list.
3. Click **Run AutoSSL** (or install a free Let's Encrypt SSL certificate).
4. Verify that the padlock icon turns green.
   *(PWA features such as Service Workers and "Install App" require HTTPS to activate).*

---

## ⚙️ Step 3: Configure Environment Variables

1. In cPanel, open **Setup Node.js App**.
2. Click the edit (pencil) icon next to your application (`gfms_app`).
3. Under **Environment variables**, verify or add the following:

| Name | Value | Purpose |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | `https://greatfavourmontessori.com.ng` | Main school website URL |
| `NEXT_PUBLIC_CBT_URL` | `https://cbt.greatfavourmontessori.com.ng` | Dedicated CBT portal URL |
| `CBT_SUBDOMAIN_PREFIX` | `cbt` | Subdomain routing prefix |
| `COOKIE_DOMAIN` | *(Optional, leave blank or set to `.greatfavourmontessori.com.ng`)* | Cookie scope |

4. Click **Save** and then click **Restart** to apply the new environment variables.

---

## 📱 Step 4: Testing the PWA Features

### A. Testing Subdomain Isolation
- Visit `https://cbt.greatfavourmontessori.com.ng`.
- You should immediately see the clean, dark-theme **CBT Examination Terminal**.
- Notice there are no marketing headers or footers.
- Student signs in with Admission Number and Surname $\rightarrow$ redirected to `/dashboard`.

### B. Installing the App (Desktop / Android / Chromebook)
- When visiting the CBT portal on Chrome, Edge, or Android:
  - An **"Install CBT Exam App"** button appears at the bottom-left corner.
  - Click **Install** to add the application to your desktop or device home screen.
  - The app will run in full-screen standalone window mode without an address bar.

### C. Installing on iPad / iPhone (Safari)
- Tap the **Share** button in Safari.
- Select **Add to Home Screen**.
- Tap **Add**. The CBT icon will appear on the iPad home screen.

### D. Offline Resilience Testing
- Inside an active examination room, disable Wi-Fi or disconnect your internet cable.
- Notice the prominent banner:
  > **⚠️ Network Disconnected: Exam Safe Mode is active. Your answers are auto-saved in local memory. Do not close this window.**
- All answers clicked while offline are preserved in local storage.
- Re-enable Wi-Fi $\rightarrow$ banner displays **"✅ Connection Restored — Synchronized"** and saves progress to the database.

---

## 🛠️ Maintenance & Troubleshooting

- **Server Actions Origin Error**: If you see *"Invalid Server Action origin"*, verify that `cbt.greatfavourmontessori.com.ng` is present in `next.config.js` `allowedOrigins` (already added).
- **Service Worker Updates**: The service worker has `no-cache` headers configured so any updates to the CBT portal take effect immediately upon page reload.
