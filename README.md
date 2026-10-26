# Lorapay website

Lorapay's public website: the landing page, the waitlist, About & contact, Security, Privacy policy
and Terms. Built with [Astro](https://astro.build) as plain static files and hosted on **Vercel**. Waitlist sign-ups and contact messages go to a **Google
Sheet** through a small Google Apps Script ([apps-script/README.md](apps-script/README.md)).

| Page | File |
|---|---|
| `/` landing page (with the waitlist form) | `src/pages/index.astro` |
| `/waitlist` waitlist on its own (for WhatsApp and social links) | `src/pages/waitlist.astro` |
| `/about` mission, team, contact form | `src/pages/about.astro` |
| `/security` how payments are protected; how to report a vulnerability | `src/pages/security.astro` |
| `/privacy` website and waitlist privacy policy | `src/pages/privacy.astro` |
| `/app-privacy` app privacy policy (the URL for the Play Store listing) | `src/pages/app-privacy.astro` |
| `/terms` terms of use | `src/pages/terms.astro` |

## Keep up to date

- **`src/content/company.ts`:** Bridgewise Limited's details, the policy date and the partner line. Make sure the `hello@`, `privacy@` and `security@lorapay.io` mailboxes exist and are read.
- **Patent:** once the Registry acknowledges the application, put its number in `patentApplication` in `company.ts`. The footer then shows "Patent pending". Until the application is filed, don't add technical detail about how offline payments are protected to any page.
- **Privacy policies:** change `policyDate` whenever either policy changes. When the servers move to a Nigerian host, update "Data stored outside Nigeria" in `app-privacy.astro`. Have a Nigerian lawyer review both policies and the terms (NDPA 2023).
- **`src/pages/about.astro`:** add a one-line `bio` for each founder if you want one shown.
- **`public/.well-known/security.txt`, `public/robots.txt`:** renew the `Expires` date each year.

## Run it on your PC

Needs **Node.js 22** (`node -v`). From this folder:

```
npm install
copy .env.example .env      (Windows; on Mac/Linux: cp .env.example .env)
npm run dev
```

Open http://localhost:4321. To try the forms locally, put the Apps Script URL in `.env` first.

## Check it

```
npm run check        (types)
npm run build:test   (builds with a fake form address the tests answer)
npm run test:install (first time only: downloads the test browser)
npm test             (form backend tests + browser tests on a phone and a desktop screen)
```

The browser tests serve the site with the same security headers as production. A script or
style the Content-Security-Policy would block makes them fail.

## Deploy to Vercel

`vercel.json` already sets the build (`npm run build` into `dist/`), clean URLs (`/about`, not
`/about.html`) and the security headers. Vercel picks Node 22 from `engines` in `package.json`.

### 1. Put the site in its own GitHub repository

```
git init
git add -A
git commit -m "Lorapay website"
git branch -M main
git remote add origin https://github.com/<you>/lorapay-website.git
git push -u origin main
```

### 2. Import it into Vercel

1. In Vercel, click **Add New → Project** and import `lorapay-website`. Vercel detects **Astro**; keep the defaults.
2. Before the first deploy, open **Environment Variables** and add both of these for **Production** and **Preview**:
   - `PUBLIC_FORMS_ENDPOINT`: the Apps Script web app URL (see [apps-script/README.md](apps-script/README.md))
   - `SITE_URL`: `https://lorapay.io` (your real domain)
3. Click **Deploy**. Every push to `main` deploys to production; every pull request gets its own preview link.

`PUBLIC_FORMS_ENDPOINT` is built into the pages. If you add it or change it later, redeploy:
**Deployments → ⋯ → Redeploy**.

### 3. Add your domain

**Settings → Domains → Add** `lorapay.io` (and `www.lorapay.io`, set to redirect to it). Vercel
shows the DNS records to add at your domain registrar: an A record for the root and a CNAME for
`www`. HTTPS turns on automatically once DNS is in place.

### 4. Check it's live

- **Pages:** open `/`, `/waitlist`, `/about`, `/security`, `/privacy` and `/terms`.
- **Waitlist:** join it with your own number and check that a row appears in the Google Sheet.
- **Security headers:** check them at https://securityheaders.com with your domain. You should get an A.
- **Share preview:** paste the link into WhatsApp and check the preview image appears.

### Deploying from your PC instead (optional)

```
npm i -g vercel
vercel login
vercel link          (first time: pick or create the project)
vercel --prod
```

## Notes

- **No tracking.** There are no analytics or cookies, which the privacy policy states. If you add analytics later (for example Vercel Web Analytics), update the privacy policy and the `connect-src`/`script-src` lists in `vercel.json`.
- **Fonts are served from the site** (Schibsted Grotesk and IBM Plex Mono via Fontsource), so no Google Fonts requests.
- **Brand assets** (`public/images`) come from the app (`mobile-app/src/assets/brand`).
