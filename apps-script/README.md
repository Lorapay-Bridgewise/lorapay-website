# Waitlist and contact form → Google Sheet

The website is static, so its forms post to a small **Google Apps Script web app** that adds a
row to a Google Sheet. There's no server for you to run.

## Set up (about 10 minutes, once)

1. **Make the sheet.** Use the Google account that should own the data (ideally a Lorapay
   Workspace account with two-step verification on). Create a Google Sheet called
   *Lorapay waitlist*. The script creates the **Waitlist** and **Messages** tabs on the first sign-up.
2. **Add the script.** In the sheet, open **Extensions → Apps Script**, delete what's there, paste
   in everything from [`Code.gs`](Code.gs), and press **Save**.
3. **Optional: email alerts for contact messages.** Open **Project Settings → Script properties**
   and add `NOTIFY_EMAIL` with the address that should receive website messages.
4. **Deploy it.** Click **Deploy → New deployment**, choose the type **Web app**, and set:
   - *Execute as:* **Me**
   - *Who has access:* **Anyone**

   Then click **Deploy** and approve the permissions it asks for (it needs this sheet, plus email
   if you set `NOTIFY_EMAIL`). Copy the **Web app URL**; it ends in `/exec`.
5. **Connect the website.** Set `PUBLIC_FORMS_ENDPOINT` to that URL:
   - locally, in `.env` (copy `.env.example`);
   - on Vercel, in **Project → Settings → Environment Variables** (all environments).

   Then rebuild and redeploy the site.
6. **Test it.** Open the URL from step 4 in a browser: it should show
   `{"ok":true,"service":"lorapay-forms"}`. Then join the waitlist on the site and check that a row
   appears.

## Changing the script later

Edit `Code.gs`, then use **Deploy → Manage deployments → edit (pencil) → Version: New version → Deploy**.
That keeps the same URL. Creating a *new deployment* gives a new URL, which would need a site rebuild.

## What it protects against

- **Bots:** a hidden field people leave empty (the honeypot). Bots that fill it are ignored.
- **Duplicates:** one row per phone number. Joining again says "you're already on the list".
- **Floods:** at most 120 entries a minute in all, and 3 messages an hour from one email address.
- **Spreadsheet formulas:** values starting with `=`, `+`, `-` or `@` are stored as plain text.
- **Bad data:** names, phone numbers, emails, states and choices are checked again here, not just in the browser.

## Privacy

The sheet holds personal data (names and phone numbers):

- Share it only with the people who need it.
- Keep two-step verification on the owning account.
- When someone asks to be removed, delete their row.

See the website's privacy policy (`src/pages/privacy.astro`).
