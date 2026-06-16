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

Skip `20250615000001_ui_spec_schema.sql` on a fresh project (slice 1 already includes those columns).

## 3. Auth

Under [Authentication → Providers](https://supabase.com/dashboard/project/aruelkzwdqnpbxsqsqjp/auth/providers), ensure **Email** is enabled.

Under [Authentication → URL configuration](https://supabase.com/dashboard/project/aruelkzwdqnpbxsqsqjp/auth/url-configuration):

- **Site URL** — production app URL (e.g. `https://your-app.vercel.app`) or `http://localhost:3000` for local dev
- **Redirect URLs** — add both:
  - `http://localhost:3000/auth/callback`
  - `https://your-app.vercel.app/auth/callback`

Set `NEXT_PUBLIC_SITE_URL` in Vercel to the same production URL so confirmation emails use the correct callback.

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
  - `https://your-app.vercel.app`
- **Authorized redirect URIs** (use the Supabase callback URL from step 1):
  - `https://aruelkzwdqnpbxsqsqjp.supabase.co/auth/v1/callback`

Paste the **Client ID** and **Client secret** into the Supabase Google provider settings and save.

**3. App redirect URLs** (same as email auth above)

Ensure these are in [URL configuration](https://supabase.com/dashboard/project/aruelkzwdqnpbxsqsqjp/auth/url-configuration):

- `http://localhost:3000/auth/callback`
- `https://your-app.vercel.app/auth/callback`

The login and signup screens show **Continue with Google**, which completes sign-in via `/auth/callback`.

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
