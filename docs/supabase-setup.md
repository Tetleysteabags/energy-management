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
```

(`GOOGLE_OAUTH_CLIENT_*` works as a fallback alias. `WEARABLE_TOKEN_SECRET` encrypts refresh tokens at rest; on Vercel use a dedicated random string.)

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
