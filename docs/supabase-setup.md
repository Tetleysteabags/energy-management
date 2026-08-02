# Supabase setup (project `aruelkzwdqnpbxsqsqjp`)

## 1. API keys

Open [API settings](https://supabase.com/dashboard/project/aruelkzwdqnpbxsqsqjp/settings/api) and copy into `.env.local`:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` (already filled)
- **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (server / seed script only — never commit)

## 2. Run migrations

In [SQL editor](https://supabase.com/dashboard/project/aruelkzwdqnpbxsqsqjp/sql/new), run each file **in order**:

1. `supabase/migrations/20250615000000_slice1_schema.sql`
2. `supabase/migrations/20250616000000_slices_2_7_schema.sql`
3. `supabase/migrations/20250616100000_wearable_active_minutes.sql`
4. `supabase/migrations/20250616120000_evening_chest_feeling.sql`
5. `supabase/migrations/20250618120000_wearable_sleep_resp.sql`
6. `supabase/migrations/20250618130000_cycle_tracking.sql`
7. `supabase/migrations/20260801000000_profile_timezone.sql`
8. `supabase/migrations/20260801000001_account_deletion.sql`
9. `supabase/migrations/20260801000002_supplement_intake_ownership.sql`
10. `supabase/migrations/20260801000003_error_reports.sql`

Skip `20250615000001_ui_spec_schema.sql` on a fresh project (slice 1 already includes those columns).

The four `20260801*` migrations are required before inviting anyone: they make
`profiles.timezone` authoritative, add the `delete_own_account` function behind
the account-deletion UI, close the supplement-ownership gap in RLS, and create
the `error_reports` table the crash log writes to.

## 3. Auth

Under [Authentication → Providers](https://supabase.com/dashboard/project/aruelkzwdqnpbxsqsqjp/auth/providers), ensure **Email** is enabled.

Under [Authentication → URL configuration](https://supabase.com/dashboard/project/aruelkzwdqnpbxsqsqjp/auth/url-configuration):

- **Site URL** — `https://energy-management-nine.vercel.app` (or `http://localhost:3000` for local dev)
- **Redirect URLs** — add both:
  - `http://localhost:3000/auth/callback`
  - `https://energy-management-nine.vercel.app/auth/callback`

Set `NEXT_PUBLIC_SITE_URL=https://energy-management-nine.vercel.app` in Vercel (Project → Settings → Environment Variables) for Production and Preview.

The app completes email confirmation at `/auth/callback`. If a link says "invalid or expired", use **Resend confirmation email** on the signup or login screen — only the **latest** email's link will work.

For local dev only, you can disable “Confirm email” so signup works instantly.

### Google sign-in (recommended)

Google skips email confirmation — useful when confirmation links are failing.

**1. Supabase dashboard**

Open [Authentication → Providers → Google](https://supabase.com/dashboard/project/aruelkzwdqnpbxsqsqjp/auth/providers?provider=Google) and enable Google. Copy the **Callback URL** shown there (you'll need it for Google Cloud).

**2. Google Cloud Console**

In [Google Auth Platform → Clients](https://console.cloud.google.com/auth/clients):

- Create an **OAuth client ID** → **Web application**
- **Authorized JavaScript origins:**
  - `http://localhost:3000`
  - `https://energy-management-nine.vercel.app`
- **Authorized redirect URIs** (use the Supabase callback URL from step 1):
  - `https://aruelkzwdqnpbxsqsqjp.supabase.co/auth/v1/callback`

Paste the **Client ID** and **Client secret** into the Supabase Google provider settings and save.

**3. App redirect URLs** (same as email auth above)

Ensure these are in [URL configuration](https://supabase.com/dashboard/project/aruelkzwdqnpbxsqsqjp/auth/url-configuration):

- `http://localhost:3000/auth/callback`
- `https://energy-management-nine.vercel.app/auth/callback`

### Google Health / Fitbit wearables

Wearables use the **Google Health API** (Fitbit/Pixel Watch data via Google sign-in). This is separate from app login Google OAuth — use a dedicated OAuth client or the same Google Cloud project with extra scopes enabled.

**1. Google Cloud**

- Enable **Google Health API** on your project
- Create (or reuse) a **Web application** OAuth client
- **Authorized JavaScript origins:** `https://energy-management-nine.vercel.app`, `http://localhost:3000`
- **Authorized redirect URIs:** `https://energy-management-nine.vercel.app/api/wearables/google/callback`, `http://localhost:3000/api/wearables/google/callback`

**2. Vercel environment variables**

```
GOOGLE_HEALTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_HEALTH_CLIENT_SECRET=your-client-secret
WEARABLE_TOKEN_SECRET=long-random-string-at-least-32-chars
NEXT_PUBLIC_ACCESS_REQUEST_URL=https://formspree.io/f/mzdnqoqb
```

`NEXT_PUBLIC_ACCESS_REQUEST_URL` powers the **Request access** button on `/how-it-works` and the login screen. The app also falls back to this Formspree form if the env var is unset.

(`GOOGLE_OAUTH_CLIENT_*` works as a fallback alias.)

**`WEARABLE_TOKEN_SECRET` is required** for wearables to work at all — the
Connect button stays hidden without it. Generate one with:

```bash
openssl rand -base64 32
```

It must be a dedicated value of at least 32 characters. It used to fall back to
`SUPABASE_SERVICE_ROLE_KEY`; that is now rejected, because rotating the service
key would have silently made every stored refresh token undecryptable. If you
ever change this secret, existing wearable connections stop working and users
have to reconnect — there is no way to re-encrypt what you can no longer read.

**3. Connect flow**

Users tap **Connect Fitbit / Google Health** on `/wearables` → Google consent (read-only health scopes) → callback stores encrypted tokens → first sync runs.

The old **Connect Google Health** button that only marked the DB as connected without OAuth was a dev stub and is removed.

## 4. Local app

```bash
npm install
npm run dev
```

Sign up once at http://localhost:3000/signup with the email you put in `SEED_USER_EMAIL`.

## 5. Demo data

```bash
npm run seed:demo
```

This loads ~6 months of `realistic()` synthetic history (shifted so yesterday is the latest day). **Today stays empty** so you can demo the check-in flow.

Optional env:

- `SEED_DAYS=120` — shorter history
- `SEED_RANDOM=7` — fixed seed (reproducible)

## 6. Walkthrough order

1. **Home** — insights, pacing, due check-in
2. **Trends** — capacity heatmap
3. **Analysis** — recurring patterns
4. **Reports** — summary / export
5. **Check-in** — live morning or evening form

## 6. Invite-only access

The app is meant to be shared with a handful of people at a time. Two things
control that, and **only the first is a real boundary**.

### a. Turn off public sign-ups (this is the one that matters)

In [Authentication → Sign In / Providers](https://supabase.com/dashboard/project/aruelkzwdqnpbxsqsqjp/auth/providers),
disable **Allow new users to sign up**. Then invite people from
**Authentication → Users → Invite user**.

Without this, Supabase's sign-up endpoint is reachable directly with the public
anon key — which every browser has — so anyone who knows the project URL can
create an account regardless of what the app's own UI does.

### b. Set an invite code (a UI gate, not a security control)

```
SIGNUP_INVITE_CODE=some-phrase-you-share-with-invitees
```

With this set, `/signup` asks for the code before creating an account, and
invite links can carry it: `/signup?invite=some-phrase-you-share-with-invitees`.

**Without this variable set, `/signup` shows an "invite only" message and offers
no form at all.** That is deliberate — sign-up fails closed rather than open. If
you want people to be able to self-serve with a code, set it; if you would
rather invite everyone from the Supabase dashboard, leave it unset.

## 7. Privacy page

Two optional variables fill in details the privacy notice otherwise leaves vague:

```
NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL=you@example.com
NEXT_PUBLIC_DATA_REGION=the EU (Frankfurt)
```

Without the contact address, `/privacy` tells people to contact whoever invited
them. Without the region, it says to ask which region the database runs in.
Both are worth setting before inviting anyone who isn't a friend.

## 8. Before you invite people — dashboard checklist

Things that cannot be set from this repository:

- [ ] Project region is in the **EU** (special-category health data under GDPR).
- [ ] **Confirm email** is ON in production.
- [ ] **Leaked password protection** enabled (Authentication → Policies). The
      8-character minimum on the sign-up form is client-side only.
- [ ] **Redirect URLs** limited to the two known callbacks, so the recovery and
      confirmation flows cannot be pointed elsewhere.
- [ ] **Public sign-ups disabled** (see §6a).
- [ ] **Point-in-time recovery / backups** enabled.
- [ ] Auth **rate limits** reviewed for sign-up and email sending.

## 9. Reading the crash log

Failures are recorded in two places, neither of which needs a third-party
service:

1. **Vercel logs** — one structured JSON line per failure, tagged
   `"event":"app_error"`, with the route, the release SHA and a scrubbed
   message. Filter on that string. This copy survives the database being the
   thing that broke.
2. **`error_reports` in Supabase** — the durable copy, which outlives Vercel's
   log retention. Read it in the SQL editor:

   ```sql
   select occurred_at, source, route, digest, release, message
   from error_reports
   order by occurred_at desc
   limit 50;
   ```

The table is **write-only from the app**: there is no select policy, so no
account can read it through the anon key. You read it from the dashboard, which
uses the service role.

Messages are scrubbed before they are stored — emails, JWTs, bearer tokens,
Google secrets, our own wearable token envelope and long digit runs are all
redacted, and the text is capped at 2000 characters. `lib/observability/scrub.ts`
holds the rules and `npm run test:scrub` covers them.

Note that Next.js also writes its own unscrubbed stack traces to stderr. That is
the server log, where the real detail belongs — but it means Vercel's raw logs
can contain more than the scrubbed copy does.

### Nothing pushes a notification

Both destinations have to be checked; neither emails or pages you. That was a
deliberate trade to avoid adding a data processor to a health app. If you want
push alerting later, `reportError` and `reportUnattributedError` in
`lib/observability/report-error.ts` are the single seam to extend — but adding
Sentry or similar means updating the privacy notice's "Who else is involved"
list, since crash context would then leave the current set of processors.

## 10. Inviting people (Authentication → Users → Invite user)

With public sign-up disabled, this is how new accounts get created. Supabase
emails a link that signs the recipient straight in — with no password and no
linked sign-in provider yet, since an invite skips the normal signup form
entirely.

That link now lands on `/welcome`, which offers the choice: set a password, or
link Google to the account via `supabase.auth.linkIdentity()`. Either way the
person ends up able to sign back in after the invite session expires. If they
skip both, "Forgot password" on `/login` still works — Supabase's recovery flow
sets a password whether or not one existed before — but `/welcome` is the
smoother path, and it stays reachable later from Settings → Your account &
data → Manage sign-in options.

**The Google option needs one setting enabled first:** in the Supabase
dashboard, under Authentication, turn on manual identity linking (the exact
label may read "Manual Linking" or similar, depending on dashboard version —
search Authentication settings for "linking"). Without it, `linkIdentity()`
fails and the page falls back to suggesting a password instead — so this isn't
a hard blocker, just a worse first run until it's turned on.
