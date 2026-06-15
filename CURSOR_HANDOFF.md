# Cursor handoff — Long COVID Recovery Pattern Tracker

Everything built so far is framework-agnostic TypeScript and drops into a
Next.js repo unchanged. This doc covers where files go, project setup, two
gotchas, and how to drive Cursor's agent.

---

## 1. Target repo layout

```
recovery-tracker/
├── .cursor/
│   └── rules/
│       ├── 00-core.mdc           # always-applied guardrails
│       ├── analysis-engine.mdc   # protects the frozen engine
│       ├── insights-ux.mdc       # insight language & UX tone
│       └── data-security.mdc     # schema, RLS, secrets
├── docs/
│   └── implementation-plan.md    # the v2 plan
├── lib/
│   └── analysis/                 # ALREADY BUILT — treat as frozen
│       ├── analysis-engine.ts
│       ├── synthetic-data-generator.ts
│       └── analysis-engine.test.ts
├── app/                          # Cursor builds this, slice by slice
├── components/
├── .env.local                    # never commit
└── package.json
```

Drop the four `.mdc` files into `.cursor/rules/`, the plan into `docs/`, and the
three analysis files into `lib/analysis/`. Commit the rules — they are how the
agent stays aligned across every chat.

---

## 2. Setup steps

1. **Scaffold:** `npx create-next-app@latest recovery-tracker --typescript --tailwind --app --eslint`
2. **UI + libs:** init shadcn/ui; add `recharts`, `drizzle-orm`, `postgres`,
   `@supabase/supabase-js`, `@supabase/ssr`; dev: `tsx`, `drizzle-kit`.
3. **Supabase project:** create it in an **EU region** (this is special-category
   health data under GDPR, and you're in Cyprus). Turn on RLS.
4. **Env (`.env.local`, never commit):**
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...      # server only
   DATABASE_URL=postgres://...        # for Drizzle migrations
   ```
5. **Place the existing files** per the layout above.
6. **Wire the acceptance gate** (see gotchas) and confirm it passes before
   building anything.

---

## 3. Two gotchas to fix before the first build

**a. Test import extensions.** In `analysis-engine.test.ts`, change the two
local imports from `./analysis-engine.ts` and `./synthetic-data-generator.ts`
to extensionless `./analysis-engine` and `./synthetic-data-generator`. The `.ts`
extensions were only for running under Node directly; TypeScript's checker
rejects them by default. Then add a script and run it:

```json
// package.json
"scripts": {
  "test:engine": "tsx lib/analysis/analysis-engine.test.ts"
}
```
`npm run test:engine` must print `0 failed`. This is your regression gate — run
it after any change near `lib/analysis/`.

**b. Keep the generator/test out of client bundles.** The generator imports
`node:fs` and is server/dev tooling only. Never import it (or the test) into a
client component. The engine itself (`analysis-engine.ts`) has no Node
dependencies and is safe in any server context.

---

## 4. How to drive the agent

Cursor's agent builds far better one slice at a time than "build the app."
Work the slices from the plan in order; after each, run `test:engine` and
sanity-check before moving on.

**Kickoff prompt for Slice 1 (paste into the agent):**

> Read `docs/implementation-plan.md` and the `.cursor/rules`. Build **Slice 1
> only**: Supabase Auth, the schema + RLS for the Slice 1 tables, the dashboard
> shell, navigation, and the morning + evening check-in forms. The analysis
> engine in `lib/analysis/` is already built and tested — do **not** modify it
> or its statistics; `analysis-engine.test.ts` is a frozen acceptance gate that
> must stay green. Do not scaffold later slices. Forms must complete in under 30
> seconds with slider inputs and a "same as yesterday" default. Show me the
> migration SQL and the two forms first.

**Per-slice loop after that:** "Build Slice N only, per the plan and rules.
Don't touch `lib/analysis/`. Run `npm run test:engine` and confirm it's green
before you finish." For Slice 4 wiring, point the agent at the engine's
`analyze()` entry point — it returns confirmatory results, case-control
results, the crash-rate envelope, composites, and the insight feed ready for
the dashboard.

---

## 5. Slice order (from the plan)

1. Shell + DB + manual logging (auth, schema, RLS, dashboard shell, the two
   check-in forms) — **usable on its own; log real data on it for a week.**
2. Events + supplements + honest trends.
3. CSV import (so the engine has history to work on).
4. **4a** analysis engine UI wiring (already-built engine → `/dashboard`,
   `/analysis`, `/explore`); **4b** notes-tagging layer (opt-in).
5. Mock wearable provider + provider abstraction.
6. Real GoogleHealthProvider (OAuth, last — under the 100-user review threshold).
7. Reports (CSV + printable doctor summary).
