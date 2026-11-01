# Authentication setup

NutriFit uses **Supabase Auth** for email/password and Google sign-in. The app
code is already wired up; this guide covers the dashboard steps that cannot be
done from the repo.

- Supabase project URL: `https://nulbklefdrfoknlqaeqq.supabase.co`
- Supabase dashboard: https://supabase.com/dashboard/project/nulbklefdrfoknlqaeqq

> The `VITE_SUPABASE_ANON_KEY` is a public browser key and is safe to ship.
> Never put the **service role** key in a `VITE_` variable or in client code.

---

## 1. Environment variables

`.env` in the project root should contain:

```env
VITE_SUPABASE_URL=https://nulbklefdrfoknlqaeqq.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Restart `npm run dev` after changing `.env`. If these values are missing the app
stays in demo mode (no login required) and the auth page shows a configuration
notice.

---

## 2. Email + password

1. Open **Authentication → Providers → Email** in Supabase.
2. Make sure **Enable email provider** is on.
3. Decide how to handle confirmation emails:
   - **Local/dev (fastest):** turn **Confirm email** off. New accounts can sign
     in immediately.
   - **Production:** keep **Confirm email** on and configure **Authentication →
     Emails / SMTP** with your own sender. The current project has confirmation
     **on**, so a new signup receives a confirmation link and cannot sign in
     until it is clicked.

The app handles both cases:

- If confirmation is off, signup logs the user in and goes to the dashboard.
- If confirmation is on, the page shows “We sent a confirmation link to …”.

Password reset is already wired to **Forgot password?** on the sign-in form.

> Supabase intentionally returns success for a reset request even when the email
> is not registered, so the app cannot reveal that from the browser. The auth
> page shows a neutral “if this email is registered” message instead. See
> `supabase/email-templates/README.md` for the full explanation.

### 2b. Branded auth emails

Ready-to-paste HTML templates for confirmation, magic link, password reset,
email change, invites and reauthentication live in
`supabase/email-templates/`. Open that folder's `README.md` for the file-to-
template mapping, subject lines and setup steps.

### 2c. Rate limits (the `429 Too Many Requests` error)

Supabase enforces auth rate limits **on its servers**, so no browser code can
remove them. The important ones:

| Limit | Default | Can it be raised? |
| --- | --- | --- |
| Emails sent by Auth (all flows, project-wide) | **2 per hour** with the built-in mailer | Only with **custom SMTP** or a **Send Email hook** |
| Sign-ups / sign-ins / recover / resend | 30 per 5 minutes per IP | Yes, in **Authentication → Rate Limits** |
| Signup confirmation, password reset per user | 60-second cooldown | Yes, in the same page |

The built-in mailer's 2-per-hour cap is the usual cause of a `429` on signup.
For local testing you have two options:

**Option A — no email at all (recommended for dev).** Turn **Confirm email**
off. Signup then sends no email and cannot hit the mailer cap; new accounts are
active immediately.

- Dashboard: **Authentication → Providers → Email → Confirm email** off.
- Or run the helper script once:

  ```powershell
  $env:SUPABASE_ACCESS_TOKEN = "sbp_your_token"   # https://supabase.com/dashboard/account/tokens
  npm run auth:limits:dev
  ```

**Option B — keep confirmation on, add custom SMTP.** In **Authentication →
Emails / SMTP**, connect a sender such as Resend, SendGrid or Postmark. Then
raise the email limit in **Authentication → Rate Limits**. See
[2d. Custom SMTP provider](#2d-custom-smtp-provider) for exact settings.

The helper script can also raise every limit the Management API exposes:

```powershell
$env:SUPABASE_ACCESS_TOKEN = "sbp_your_token"
npm run auth:limits:check   # show current values
npm run auth:limits         # raise all rate_limit_* values
npm run auth:limits:dev     # raise limits + disable Confirm email
```

To put confirmation back on before production:

```powershell
node scripts/set-auth-rate-limits.mjs --confirm-email
```

Google sign-in does **not** send a Supabase email, so it keeps working even
while the mailer is rate-limited. The auth page also shows a 60-second
countdown after a `429` so it stops retrying.

> Setting `rate_limit_email_sent` to a huge number does not bypass the 2/hour
> built-in mailer cap. Supabase only honours a higher value when custom SMTP or
> a Send Email hook is configured.

### 2d. Custom SMTP provider

This is the “provider” that actually delivers confirmation and reset emails.
Without it, Supabase uses its own mailer and stops at 2 emails/hour.

**Recommended: Resend**

1. Create an account at https://resend.com.
2. Add your domain under **Domains** and add the DNS records Resend shows.
   For a quick test you can send from `onboarding@resend.dev`, but it only
   delivers to the Resend account owner.
3. Create an **API key**.
4. In Supabase open **Authentication → Emails / SMTP → SMTP Settings** and set:

   | Field | Value |
   | --- | --- |
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | your Resend API key (`re_...`) |
   | Sender email | `noreply@yourdomain.com` (or `onboarding@resend.dev`) |
   | Sender name | `NutriFit` |

5. Save. Then go to **Authentication → Rate Limits** and raise
   **Rate limit for sending emails** (for example 100/hour).
6. Send a test signup from the app and confirm the email arrives.

Other providers work the same way:

| Provider | Host | Port | Username | Password |
| --- | --- | --- | --- | --- |
| SendGrid | `smtp.sendgrid.net` | `587` | `apikey` | API key |
| Postmark | `smtp.postmarkapp.com` | `587` | Server token | Server token |
| Brevo | `smtp-relay.brevo.com` | `587` | Login email | SMTP key |
| Gmail | `smtp.gmail.com` | `465` | Gmail address | App password |

> Gmail works for a personal demo but has daily limits and deliverability
> issues. Use a transactional provider for real users.

You can also configure SMTP with the helper script:

```powershell
$env:SUPABASE_ACCESS_TOKEN = "sbp_your_token"
$env:SMTP_HOST = "smtp.resend.com"
$env:SMTP_PORT = "465"
$env:SMTP_USER = "resend"
$env:SMTP_PASS = "re_your_api_key"
$env:SMTP_ADMIN_EMAIL = "noreply@yourdomain.com"
$env:SMTP_SENDER_NAME = "NutriFit"
npm run auth:emails
npm run auth:limits
```

These values can also live in `.env`. The scripts load it automatically, and real
environment variables still take precedence. Keep the names **unprefixed** (no
`VITE_`) so they never reach the browser bundle:

```env
SUPABASE_ACCESS_TOKEN=sbp_your_token
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-smtp-login
SMTP_PASS=your-smtp-key
SMTP_ADMIN_EMAIL=your-verified-sender@example.com
SMTP_SENDER_NAME=NutriFit
```

**Brevo specifics.** Get the SMTP login and key from
https://app.brevo.com/settings/keys/smtp. The login is either your Brevo account
email or an auto-generated `[ID]@smtp-brevo.com` address — copy it exactly. Use
the **SMTP key**, not an API key (`xkeysib-…`). `SMTP_ADMIN_EMAIL` must be an
address verified under *Senders, Domains & IPs → Senders*; a verified single
sender works without owning a domain, but adding a domain (SPF/DKIM/DMARC)
improves deliverability.

### 2e. Branded confirmation email

The branded templates live in `supabase/email-templates/`. The confirmation one
is `confirm-signup.html`; it matches the auth screen (dark brand panel with the
logo mark and a faint watermark, condensed headline with an inverted highlight
word, light form panel, white card, black CTA). The wordmark beside the mark is
live text, so the header still reads correctly with images blocked.

The logo and watermark are PNGs served from a public Supabase Storage bucket.
Upload or refresh them with:

```powershell
npm run auth:assets        # create the bucket + upload assets/nf-mark*.png
npm run auth:assets:check  # confirm the public URLs resolve
```

That script reads `SUPABASE_ACCESS_TOKEN` from `.env`, fetches the service-role
key at runtime and never writes it to disk.

**Enforce verification:**

1. **Authentication → Providers → Email → Confirm email** must be **ON**.
2. **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:5173` for dev, or your production URL.
   - **Redirect URLs**: `http://localhost:5173/**`, `http://localhost:5174/**`,
     and `https://your-production-domain/**`.
3. The app already sends `emailRedirectTo` to `/auth`, so the confirmation link
   returns to the auth page.
4. Unconfirmed sign-ins show “Please confirm your email first.” and a
   **Resend confirmation email** button.

**Apply the templates:**

- Dashboard: **Authentication → Emails → Confirm signup**, set the subject to
  `Confirm your NutriFit account`, and paste the full contents of
  `confirm-signup.html` into the message body. Repeat for the other templates.
- Or apply all six at once:

  ```powershell
  $env:SUPABASE_ACCESS_TOKEN = "sbp_your_token"
  npm run auth:emails
  ```

  The script sets confirmation ON, applies every template and subject, and can
  configure SMTP in the same run. Use `npm run auth:emails:dry` to preview and
  `npm run auth:emails:check` to inspect the current settings.

See `supabase/email-templates/README.md` for the full mapping and provider
table.

---

## 3. Google sign-in

### 3a. Create a Google OAuth client

1. Go to https://console.cloud.google.com/apis/credentials.
2. Create (or pick) a project, then configure the **OAuth consent screen**
   (External is fine; add yourself as a test user while the app is unverified).
3. Click **Create credentials → OAuth client ID → Web application**.
4. Add **Authorized redirect URIs**:

   ```
   https://nulbklefdrfoknlqaeqq.supabase.co/auth/v1/callback
   ```

   This is the Supabase callback, **not** your app URL. It is the same for every
   environment.

5. Optionally add **Authorized JavaScript origins** for the origins you use:

   ```
   http://localhost:5173
   http://127.0.0.1:5173
   https://7hc6mr2t-8100.asse.devtunnels.ms
   ```

6. Copy the **Client ID** and **Client secret**.

### 3b. Enable Google in Supabase

1. Open **Authentication → Providers → Google**.
2. Enable the provider.
3. Paste the **Client ID** and **Client secret** from Google.
4. Save.

The app requests `prompt=select_account`, so users can pick which Google account
to use.

---

## 4. Redirect URLs in Supabase

Open **Authentication → URL Configuration**:

- **Site URL**: the main origin you use, for example `http://localhost:5173`.
- **Redirect URLs** — add every origin the app runs on, with a wildcard path:

  ```
  http://localhost:5173/**
  http://127.0.0.1:5173/**
  https://7hc6mr2t-8100.asse.devtunnels.ms/**
  ```

  Add your production domain the same way when you deploy.

If these are missing, Google sign-in fails with `redirect_uri_mismatch` or
Supabase rejects the redirect. The app surfaces a friendly error telling you to
check this file.

> VS Code dev tunnels get a new hostname when they are recreated. If the tunnel
> URL changes, add the new origin to Supabase redirect URLs and to Google's
> authorized origins.

---

## 5. How it works in the app

| File | Purpose |
| --- | --- |
| `src/services/supabase.js` | Creates the Supabase client from `.env`. |
| `src/services/auth.js` | Email signup/login, Google OAuth, password reset, sign-out, friendly errors. |
| `src/composables/useAuth.js` | Shared reactive session/user state, password-recovery detection. |
| `src/router/index.js` | Redirects guests to `/auth?redirect=…`; sends signed-in users away from `/auth`. |
| `src/views/AuthPage.vue` | Login/register forms, Google button, forgot-password and new-password UI. |
| `src/components/HeaderBar.vue` | Shows the signed-in user's name and avatar. |
| `src/views/ProfilePage.vue` | Shows the real email and signs the user out. |

Auth state is restored before the first protected route resolves, and
`supabase-js` handles the OAuth/recovery hash automatically on redirect back.

---

## 6. Test checklist

1. `npm run dev`, open `http://localhost:5173/dashboard` while signed out →
   you should land on `/auth?redirect=/dashboard`.
2. Register with email → either you enter the app (confirmation off) or you see
   the “check your email” message (confirmation on).
3. Sign in with the same credentials → dashboard.
4. Click **Google** → Google account chooser → back on the app → dashboard.
5. **Forgot password?** with an email filled in → reset email → open the link →
   the auth page shows “Set a new password”.
6. **Profile → Sign out** → back on `/auth`.

### Common errors

| Message | Fix |
| --- | --- |
| `Google sign-in is not enabled yet` | Enable the Google provider in Supabase. |
| `redirect_uri_mismatch` | Add the Supabase callback URL to the Google OAuth client. |
| `Email not confirmed` | Click the confirmation link, or turn off **Confirm email** for local dev. |
| `Invalid login credentials` | Wrong password, or the account was created with Google only. |
| `429 Too Many Requests` on signup/reset | Supabase is rate-limiting the project. The built-in mailer is capped at 2 emails/hour. For local testing turn **Confirm email** off; for production add custom SMTP. See [2c. Rate limits](#2c-rate-limits-the-429-too-many-requests-error) and run `npm run auth:limits:check`. |
| `403 Missing required permission(s): auth_config_write, project_admin_write` | The Management API token is scoped. Regenerate it with **Project Settings** and **Auth Config** both set to **Read and write**, or use a full-access (Legacy) token. |
| `525 5.7.1 Unauthorized IP address` (Brevo) | Brevo is blocking the SMTP key by IP. Supabase sends from its own (non-fixed) servers, so whitelisting your machine is not enough: open **Settings → Security → Authorized IPs** and deactivate IP blocking for **SMTP keys**, or the mail will fail the same way in production. |
| Logo missing / broken-image icon in the email | The `email-assets` bucket is no longer public, or the files were moved. Run `npm run auth:assets` to re-upload, then `npm run auth:assets:check`. Gmail also hides remote images until the reader clicks “Show images”. |
| `manifest.json` CORS error on a dev tunnel | The tunnel is redirecting the manifest fetch to its GitHub login. The manifest link is removed in dev by `vite.config.js`; for preview/PWA testing, set the port visibility to **Public** in the VS Code Ports panel. |
| `Authentication is not configured` | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` missing from `.env`. |
