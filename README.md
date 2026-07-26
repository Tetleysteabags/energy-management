# Energy Management

A personal pacing and symptom-pattern tracker for people managing energy-limiting chronic conditions, built with Next.js and Supabase. Live at https://energy-management-nine.vercel.app.

Currently accounts are limited as I am testing this out with my wife who has chronic fatigue as a result of long covid.

## What it does

Two short daily check-ins (morning and evening) capture how the day went, pre-filled from the previous day to keep the effort to a minute or so. Through the day the user can optionally log naps, walks, or other activity. Once enough check-ins accumulate, the analysis engine looks for possible correlations between activity, sleep, and next-day symptoms (e.g. "busy days tend to be followed by lower energy") and surfaces them as leads to watch, not diagnoses.

Wearables (Fitbit and Google/Pixel Watch via Google Health) can be connected for automatic, read-only sync of sleep, heart rate, SpO2, respiratory rate, and active minutes. A dedicated Reports page turns the tracked data into a clinician-facing summary.

## Architecture

Frontend: Next.js 16 (App Router) with React 19, Tailwind CSS, shadcn/ui components, Recharts for trend visualisation.

Backend/data: Supabase (Postgres + auth) accessed via Drizzle ORM and the `postgres` client; Supabase migrations tracked under supabase/migrations.

Analysis engine: lib/analysis/ contains the pacing and correlation logic (pacing.ts, analysis-engine.ts, patient-summary.ts), with its own test suite (npm run test:engine) and a synthetic data generator for local development without real health data.

Wearable sync: Google Health OAuth integration for Fitbit/Pixel Watch data (see docs/supabase-setup.md).

## Local development

```bash
npm install
npm run dev          # start dev server
npm run build        # production build
npm start            # run production build
npm run test:engine  # run the analysis engine test suite
npm run seed:demo    # seed synthetic demo data
npm run db:migrate   # apply Supabase migrations
```
