# Energy Management

A personal pacing and symptom-pattern tracker for people managing energy-limiting chronic conditions, built with Next.js and Supabase. Live at https://energy-management-nine.vercel.app.

Accounts are invite-only. It started as something I built for my wife, who has chronic fatigue following long covid, and is now shared with a small number of people at a time.

## What it does

Two short daily check-ins (morning and evening) capture how the day went, pre-filled from the previous day to keep the effort to a minute or so. Through the day the user can optionally log naps, walks, or other activity. Once enough check-ins accumulate, the analysis engine looks for possible correlations between activity, sleep, and next-day symptoms (e.g. "busy days tend to be followed by lower energy") and surfaces them as leads to watch, not diagnoses.

Wearables (Fitbit and Google/Pixel Watch via Google Health) can be connected for automatic, read-only sync of sleep, heart rate, SpO2, respiratory rate, and active minutes. A dedicated Reports page turns the tracked data into a clinician-facing summary.

## Architecture

Frontend: Next.js 16 (App Router) with React 19, Tailwind CSS, shadcn/ui components, Recharts for trend visualisation.

Backend/data: Supabase (Postgres + auth) accessed via Drizzle ORM and the `postgres` client; Supabase migrations tracked under supabase/migrations.

Analysis engine: lib/analysis/ contains the pacing and correlation logic (pacing.ts, analysis-engine.ts, patient-summary.ts), with its own test suite (npm run test:engine) and a synthetic data generator for local development without real health data.

Wearable sync: Google Health OAuth integration for Fitbit/Pixel Watch data (see docs/supabase-setup.md). Refresh tokens are encrypted at rest with AES-256-GCM.

Privacy and access: every table is protected by row-level security scoped to the owning user, and every query filters on user id as well. Users can export all their check-ins as CSV and delete their account and data from Settings. See docs/pre-launch-audit.md for the full review, and docs/supabase-setup.md for the setup that invite-only access depends on.

## Local development

```bash
npm install
npm run dev          # start dev server
npm run build        # production build
npm start            # run production build
npm test             # run every test suite
npm run test:engine  # analysis engine
npm run test:dates   # log-date / timezone handling
npm run test:csv     # CSV import and export
npm run seed:demo    # seed synthetic demo data
npm run db:migrate   # apply Supabase migrations
```
