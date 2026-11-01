# NutriFit auth email templates

Branded HTML emails for Supabase Auth. They match the auth screen: dark brand
panel with the logo mark and a faint watermark, condensed uppercase headline, a
light form panel with a white card and a black call-to-action.

Type is Oswald (headlines) + Poppins (body), loaded from `fonts.gstatic.com`
where the client supports webfonts, with a web-safe fallback everywhere else.

Supabase stores these in the dashboard, so this folder is the source of truth
that you paste into the template editor.

## Files and where they go

| File | Supabase template | Suggested subject |
| --- | --- | --- |
| `confirm-signup.html` | **Confirm signup** | `Confirm your NutriFit account` |
| `magic-link.html` | **Magic link** | `Your NutriFit sign-in link` |
| `reset-password.html` | **Reset password** | `Reset your NutriFit password` |
| `change-email.html` | **Change email address** | `Confirm your new NutriFit email` |
| `invite.html` | **Invite user** | `You're invited to NutriFit` |
| `reauthentication.html` | **Reauthentication** | `Your NutriFit verification code` |

## Apply automatically

You can push every template (and turn confirmation on) with the Management API
instead of pasting each one by hand:

```powershell
$env:SUPABASE_ACCESS_TOKEN = "sbp_your_token"   # https://supabase.com/dashboard/account/tokens
npm run auth:emails:dry                        # preview, no network
npm run auth:emails                            # apply all templates
npm run auth:emails:check                      # show current settings
```

That command sets `mailer_autoconfirm = false`, so **Confirm email** is ON and
new users must click the link before they can sign in. Add `--keep-autoconfirm`
if you want to leave that setting alone.

To configure SMTP in the same run, set the provider variables first:

```powershell
$env:SMTP_HOST = "smtp.resend.com"
$env:SMTP_PORT = "465"
$env:SMTP_USER = "resend"
$env:SMTP_PASS = "re_your_api_key"
$env:SMTP_ADMIN_EMAIL = "noreply@yourdomain.com"
$env:SMTP_SENDER_NAME = "NutriFit"
npm run auth:emails
npm run auth:limits
```

The same keys can go in `.env` (the scripts load it; keep them unprefixed, never
`VITE_`):

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-smtp-login
SMTP_PASS=your-smtp-key
SMTP_ADMIN_EMAIL=your-verified-sender@example.com
SMTP_SENDER_NAME=NutriFit
```

For Brevo, copy the login and **SMTP key** (not the API key) from
https://app.brevo.com/settings/keys/smtp, and verify the sender address first.

## Brand assets

The emails use two PNGs (white logo mark, plus a faded watermark) that must be
reachable at a public HTTPS URL. They live in `assets/` and are uploaded to a
public Supabase Storage bucket:

```powershell
npm run auth:assets          # create bucket + upload, prints public URLs
npm run auth:assets:check    # verify the URLs still resolve
```

Supabase Storage is used because email clients block `data:` URIs and Supabase
Auth has no way to attach inline (`cid:`) images. The bucket needs to stay
**public**, otherwise Gmail shows the alt text instead of the logo.

The service-role key is fetched from the Management API at runtime and never
written to disk, so `SUPABASE_ACCESS_TOKEN` is the only credential needed.

If you change the logo, replace the PNG in `assets/`, re-run `npm run auth:assets`
(the filenames stay stable, so the templates keep working), then re-apply the
templates.

## Set up an email provider (SMTP)

The built-in Supabase mailer only sends **2 emails per hour**, which is not
enough for real signups. Add a custom SMTP provider under
**Authentication → Emails / SMTP** in the dashboard.

| Provider | Host | Port | Username | Password | From address |
| --- | --- | --- | --- | --- | --- |
| **Resend** (easiest) | `smtp.resend.com` | `465` | `resend` | API key (`re_...`) | Verified domain, or `onboarding@resend.dev` for tests |
| **SendGrid** | `smtp.sendgrid.net` | `587` | `apikey` | API key | Verified sender |
| **Postmark** | `smtp.postmarkapp.com` | `587` | Server token | Server token | Verified sender |
| **Brevo** | `smtp-relay.brevo.com` | `587` | Login email | SMTP key | Verified sender |
| **Gmail** | `smtp.gmail.com` | `465` | Gmail address | App password | Same Gmail address |

Resend is the quickest option:

1. Create an account at https://resend.com.
2. Add and verify your domain (DNS records). For a quick test you can use
   `onboarding@resend.dev`, but it only delivers to the Resend account owner.
3. Create an API key.
4. In Supabase go to **Authentication → Emails / SMTP → SMTP Settings** and
   enter the host, port, username, password, sender email and sender name.
5. Save, then send a test signup through the app.

> Gmail is fine for a personal demo but has daily sending limits and can mark
> mail as spam. Use Resend, SendGrid, Postmark or Brevo for anything real.

After SMTP is working, raise the email limit under
**Authentication → Rate Limits**. See `AUTH_SETUP.md` section 2c.

## Enforce email confirmation

For “users must prove they registered”:

1. **Authentication → Providers → Email → Confirm email** must be **ON**.
2. The app already sends `emailRedirectTo` to `/auth`, so the link returns to
   the auth page.
3. Add your app URLs under **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:5173` for dev, or your production URL.
   - **Redirect URLs**: `http://localhost:5173/**`, `http://localhost:5174/**`,
     and `https://your-production-domain/**`.
4. Unconfirmed users who try to sign in get “Please confirm your email first.”
   The auth page also shows a **Resend confirmation email** button.

## How to apply

1. Open the Supabase dashboard for the project.
2. Go to **Authentication → Emails** (older dashboards: **Auth → Email Templates**).
3. Pick the template from the table above.
4. Set the **Subject** line.
5. Paste the whole contents of the matching `.html` file into the **Message body**.
6. Save, then send yourself a test email from that flow.

The templates use Supabase's Go-template variables:

- `{{ .ConfirmationURL }}` — the action link (confirmation, recovery, magic link, invite).
- `{{ .Token }}` — the one-time code (reauthentication only).
- `{{ .Email }}` — the account email.
- `{{ .NewEmail }}` — the new address (change-email only).
- `{{ .SiteURL }}` — the configured site URL, used for the brand link and footer.

Do not rename or re-case these variables. If you edit the templates, keep the
`{{ ... }}` placeholders intact.

## Design notes

- **Hosted images, with fallbacks.** The logo mark and the faint watermark are
  PNGs on Supabase Storage. The wordmark next to the mark is live text, so the
  header still reads `NUTRIFIT` when a client blocks images.
- **Gmail can't do background images.** The watermark is therefore a real
  `<img>` in the panel (right of the headline) rather than a CSS
  `background-image`, which Gmail strips. Apple Mail and Outlook.com also drop
  the grid gradient, leaving a flat `#0b0b0b` panel.
- **Email-safe layout.** Tables and inline styles only. The card is fluid
  (`width: 100%; max-width: 560px`) so it fits any phone, with a fixed 560px
  table wrapped in an MSO conditional for Outlook. A mobile breakpoint at 620px
  shrinks the padding, headline and watermark. No flexbox, grid or external CSS.
- **Dark canvas hardening.** The page colour is declared three times — `<body
  bgcolor>`, a 100%-wide wrapper table, and that table's cell — because Gmail's
  mobile app drops `<body>` styles. The footer also lives *inside* the card, so
  no light-coloured text is ever left sitting on the client's own background.
- **One rounded card.** The outer `<td>` carries the `20px` radius (with the
  matching top and bottom radii on the panel and footer tables), so the whole
  email reads as a single rounded surface instead of a stack of bands.
- **Sizes tuned for a phone, not a desktop preview.** Body text is 14px, notes
  11px and the buttons 12px with a 15px tap target. Tiny 7–8px type looks fine
  in a browser but is unreadable on a handset, which is what most recipients
  actually use.
- **Webfonts are progressive.** Oswald and Poppins load from Google's font CDN
  in Apple Mail, iOS Mail and Outlook for Mac. Gmail ignores `@font-face` and
  falls back to Arial Narrow / Segoe UI, which keeps the same condensed display
  look.
- **Forced light rendering.** `color-scheme: light only` keeps the white card
  and black text from being inverted by dark-mode clients.
- **Plain-link fallback.** Every action email repeats the full tokenised URL
  under the button in small muted text, so the action still works if the button
  is stripped. Keep it — it is the difference between a broken email and a
  recoverable one on locked-down clients.
- **Accessible.** The card is a real heading/paragraph hierarchy, and the code
  email uses a monospace block for easy reading.

## Testing checklist

1. **Confirm signup** — create an account with a real address, open the link,
   confirm you land back on `/auth` and can sign in.
2. **Reset password** — use **Forgot password?** on `/auth`, open the link,
   set a new password, then sign in with it.
3. **Change email** — change the address in the account settings and confirm
   both the old and new address receive the expected message.
4. **Mobile** — preview at 360px and 390px wide. The card should fill the
   screen, the headline should wrap cleanly, the watermark should still be
   visible at 72px, and the button should be full width.
5. **Images off** — the header should still read `NUTRIFIT` with the tagline,
   and no broken-image boxes should appear.
6. **Dark mode** — the email should stay light (white card, black text).

## Reset-password behaviour (important)

Supabase deliberately does **not** reveal whether an email is registered when a
reset is requested. That prevents attackers from using the form to discover
valid accounts. Because of that, the app shows:

> If `name@example.com` is registered, a reset link is on its way.

If your project ever returns a `user_not_found` error, the app shows a specific
"no account registered" message instead. Do not disable Supabase's email
enumeration protection just to get that message — the neutral copy is the safe
default. If you truly need a "this email is not registered" check, do it in a
server-side Edge Function with the service-role key and a rate limit, never in
the browser.

## Customising

- Brand colours live inline in each file: `#050505` page, `#0b0b0b` brand panel
  and footer, `#f2f2f2` form panel, `#ffffff` card, `#3d3d3d` body text, `#8a8a8a`
  muted text.
- The footer year is `2026` in every file. Update it when the year changes.
- Fonts: change `FONT` / `DISPLAY` in the generator and the `@font-face` URLs if
  you swap the brand type. Keep the web-safe names in the stack — they are what
  Gmail and Outlook actually render.
- To change the watermark strength, regenerate `assets/nf-mark-watermark.png`
  with a different alpha (currently 13%) and re-run `npm run auth:assets`.
- Keep one `<h1>` per email and keep the preheader text at the top of `<body>`.
