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

For local dev, you can disable “Confirm email” so signup works instantly.

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
