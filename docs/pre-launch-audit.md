# Pre-launch audit — inviting users beyond the first account

Audit date: 2026-08-01. Commit audited: `ceac92b`.

Scope: application code, data model and RLS, authentication, third-party data
flows, and the operational/legal gaps that only appear once someone other than
the author's household is using the app.

Verification run during the audit:

| Check | Result |
| --- | --- |
| `npm run build` | passes |
| `npx tsc --noEmit` | clean |
| `npm run test:engine` | 16 passed, 0 failed |
| `npx eslint .` | 10 errors, 4 warnings (all style / React-hooks lint, no correctness defects) |
| Secret scan of working tree + full git history | no secrets committed |

---

## Summary

The security foundation is genuinely good — better than most side projects that
handle health data. Every table has row-level security scoped to the owning
user, every query redundantly filters on `user_id`, auth is enforced at four
layers, and OAuth tokens are encrypted at rest. Nothing here lets one user read
another user's data.

The problems are of a different kind. They are the things that are invisible
when the entire user base is one person who lives in the same timezone as the
author, shares a household with him, and can ask him directly when something
breaks. Four of them should be fixed before invites go out.

---

## Blockers — fix before inviting anyone

### 1. Log dates are computed in UTC, which silently corrupts data for users outside Europe

`lib/check-in/log-date.ts:5`

```ts
export function todayLogDate(): string {
  return new Date().toISOString().slice(0, 10);
}
```

`toISOString()` is always UTC. On Vercel the server clock is UTC too, so "today"
means "today in UTC" for every user regardless of where they are.

Verified behaviour:

| User | Wall clock when they log | Row it writes to | Correct row |
| --- | --- | --- | --- |
| Los Angeles (UTC-7) | 6:30pm, Aug 1 | **2026-08-02** | 2026-08-01 |
| Nicosia (UTC+3) | 1:30am, Aug 2 | **2026-08-01** | 2026-08-02 |

For anyone west of UTC this is not a cosmetic off-by-one. An evening check-in
filed at 6:30pm lands on *tomorrow's* row, so the day's exertion is recorded
against the following day's symptoms. That inverts the exact day-D-load →
day-D+1-symptom lag the analysis engine is built to detect. The engine will
keep producing confident-sounding findings from misaligned data, and a user in
the US would have no way to tell.

It has gone unnoticed because Cyprus is UTC+2/+3: the only window where it
misfires is between midnight and 3am, when the intended user is asleep.

The same UTC assumption appears in `app/actions/settings.ts:28` (crash rule
`active_from`), `app/api/wearables/google/callback/route.ts:77`, and the
wearable sync date windows in `lib/wearables/google-health/`.

Note that `profiles.timezone` already exists in the schema
(`supabase/migrations/20250615000000_slice1_schema.sql:9`, defaulting to
`Europe/Nicosia`) — but **no code anywhere reads it**. The intent was there; the
wiring was never done.

Fix: capture the user's IANA timezone at signup into `profiles.timezone`, and
derive log dates from it (`Intl.DateTimeFormat` with `timeZone`, or pass the
browser's resolved timezone into the server action). Also decide what to do
about existing rows — the partner's historical data is very close to correct
and probably should not be migrated.

### 2. There is no password reset

There is no `resetPasswordForEmail` call, no `/auth/reset` route, and no "Forgot
password?" link on the sign-in page (`app/(auth)/login/page.tsx`). A user who
signs up with email and password and forgets it is permanently locked out of
their own health record, with no self-service path back in.

Today the workaround is Google sign-in, or the author manually intervening in
the Supabase dashboard. Neither scales past people who can text him.

Fix: add a reset-request page calling
`supabase.auth.resetPasswordForEmail(email, { redirectTo })`, and an update-password
page behind the recovery callback. `handleAuthCallback` already handles
`token_hash` + `type`, so `type=recovery` will flow through it — it just needs a
destination page that calls `supabase.auth.updateUser({ password })`.

### 3. No account deletion, and no privacy policy or terms

The app stores special-category health data under UK/EU GDPR: daily symptom
scores, free-text notes, menstrual cycle tracking (`on_period`), and synced
wearable biometrics.

Currently missing:

- **Deletion.** No way for a user to delete their account or their data. Under
  GDPR Article 17 this is an obligation, not a feature request. Two RLS gaps
  block even a manual implementation: `wearable_daily_metrics` has no `DELETE`
  policy and `crash_rule_versions` has neither `UPDATE` nor `DELETE`
  (`supabase/migrations/20250616000000_slices_2_7_schema.sql:202`, `:99`). A
  user cannot delete those rows even through the app's own client.
- **Privacy notice.** Nothing states what is collected, the lawful basis, where
  it is stored, how long it is kept, or who the data controller is. The strongest
  statements the app makes are marketing copy — "Health data stays private",
  "never sold or shared" — with no policy behind them.
- **Terms / medical disclaimer.** The in-app language around findings is
  careful and well done ("associations, not diagnoses"), but there is no
  disclaimer at the point of signup.

Once the users are strangers rather than a partner, "I know where the data is"
stops being an answer.

Fix: a `/privacy` page linked from signup and `/how-it-works`; a delete-account
action (Supabase `auth.admin.deleteUser` from a server route — the `ON DELETE
CASCADE` foreign keys to `auth.users` will clear every table); and the two
missing RLS policies.

### 4. Signup is fully open — the "private app" framing is not enforced

`/how-it-works` tells visitors:

> This is a private app. If you'd like to use it, submit a short request —
> someone will follow up when a spot is available.

Directly beneath that request form is a **Create account** button linking to
`/signup`, which is a completely open, unauthenticated Supabase email/password
signup. Anyone with the URL can create an account without being invited. The
access-request form is decorative.

The README also still says "accounts are limited as I am testing this out with
my wife", which is not true of the deployed app.

Fix, in rough order of effort:

- Turn off public signups in Supabase (Authentication → Sign-ups) and invite
  users via **Authentication → Invite user**. Zero code, matches the stated
  model exactly.
- Or gate `/signup` behind an invite code checked in a server action.
- Or keep open signup, and remove the "private app / request access" copy so the
  page is honest about what it is.

---

## Should fix before invites

### 5. The doctor-summary CSV export produces malformed files

`app/api/reports/export/route.ts:39` only wraps a field in quotes if it contains
a comma. Verified outputs:

| Notes content | Emitted as | Result |
| --- | --- | --- |
| `Rough day.\nSlept badly.` | unquoted, newline intact | **row splits in two — every following column misaligns** |
| `Felt "wired but tired"` | `Felt ""wired but tired""` | renders literally, with doubled quotes |
| `=HYPERLINK("http://x","c")` | passed through | becomes a live formula in Excel |

The newline case is the serious one: notes are a free-text field on a form users
type into at the end of the day, so multi-line notes are likely, and the file is
specifically meant to be handed to a clinician. It will be visibly broken.

Fix: always quote, escape `"` as `""`, and prefix any value starting with
`= + - @` with a `'` to defuse formula interpretation.

### 6. The "LLM note tagging" toggle does nothing

`/settings/notes` offers an "Enable LLM note tagging" button that writes
`user_settings.llm_notes_enabled`, and the `note_tags` table exists — but no
code anywhere reads the flag or generates tags. There is no LLM integration in
the codebase at all.

For the current user this is a known unbuilt feature. For an invited user it is
a switch that claims to send their health notes to a language model and then
appears broken. Either hide it behind the dev-only check already used on
`/wearables` for the mock provider, or label it as coming soon.

(The upside: because it is unimplemented, **no user data leaves Supabase**. The
only outbound calls in the entire app are Google OAuth/Health and the Formspree
access form.)

### 7. Raw internal errors are shown to users

`app/actions/wearables.ts:210` redirects with
`?sync_error=${encodeURIComponent(result.error)}`, and `/wearables` renders that
string directly. The message can originate from a Postgres error or a Google API
error response. React escapes it so there is no XSS, but it does surface
internal detail to end users. Map to friendly messages the way `ERROR_MESSAGES`
already does for the OAuth failure cases.

### 8. Supplement intake accepts another user's supplement ID

`app/actions/supplements.ts:29` writes `supplement_id` straight from the client,
and the RLS policy on `daily_supplement_intake` only checks `user_id`. A crafted
request can create an intake row referencing another user's supplement row.

Impact is low — the attacker cannot read the referenced supplement's name, and
the join in `lib/supplements/queries.ts` is user-scoped — but it is a real gap.
Fix by verifying ownership in the action, or adding an RLS `WITH CHECK` that
confirms the supplement belongs to `auth.uid()`.

### 9. Wearable tokens are encrypted with a key that falls back to the service-role key

`lib/wearables/token-crypto.ts:11`

```ts
const secret = process.env.WEARABLE_TOKEN_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
```

The encryption itself is correct — AES-256-GCM, random 12-byte IV per payload,
auth tag verified on decrypt. The problem is operational: if `WEARABLE_TOKEN_SECRET`
is not set in Vercel, the key is derived from the Supabase service-role key.
Rotating that key — routine hygiene, and mandatory if it ever leaks — would
silently make every stored wearable token undecryptable, and every user's
wearable connection would break with no obvious cause.

Fix: set an explicit `WEARABLE_TOKEN_SECRET` in Vercel now, before there are
tokens encrypted under the fallback.

---

## Verify in the Supabase / Vercel dashboards

These cannot be checked from the repository:

- [ ] **Project region is in the EU.** `CURSOR_HANDOFF.md` called for this; worth
      confirming it actually happened, since it is hard to change later.
- [ ] **Email confirmation is ON in production.** `docs/supabase-setup.md`
      suggests disabling it "for local dev only" — confirm production wasn't left that way.
- [ ] **Leaked-password protection enabled** (Supabase checks HaveIBeenPwned).
      The 8-character minimum on the signup form is client-side only.
- [ ] **Auth redirect allowlist is tight.** Only the two known callback URLs
      should be listed, so the recovery/confirmation flows cannot be pointed elsewhere.
- [ ] **Point-in-time recovery / backups.** With more users, "restore one
      person's data" becomes a request you will eventually get.
- [ ] **`WEARABLE_TOKEN_SECRET` set** (see finding 9).
- [ ] **Auth rate limits** — Supabase's defaults are generous; tighten the
      signup and email-send limits now that `/signup` is publicly reachable.

---

## What's solid

Worth recording, because it is the part that would be expensive to retrofit:

- **RLS on every table**, own-row only, `auth.uid() = user_id` throughout —
  `profiles`, `daily_logs`, `user_settings`, `supplements`,
  `daily_supplement_intake`, `events`, `crash_rule_versions`, `day_crashes`,
  `note_tags`, `watched_hypotheses`, `wearable_connections`,
  `wearable_daily_metrics`.
- **Defence in depth on top of RLS.** Every one of the 70 `.from()` calls in the
  codebase additionally filters by `user_id` — verified exhaustively. Even a
  misconfigured RLS policy would not leak data.
- **Auth enforced at four layers**: middleware, the `(dashboard)` layout, each
  page, and each server action. No server action trusts a client-supplied user ID.
- **No service-role key in request paths.** It appears only in `scripts/`
  (local tooling). All runtime access goes through the anon key with RLS.
- **OAuth done properly**: `state` in an httpOnly, `secure`, `sameSite=lax`
  cookie with a 10-minute TTL, verified on callback; `include_granted_scopes=false`;
  read-only scopes; tokens never logged.
- **Server Action CSRF and body limits** are Next.js defaults and are not
  overridden — `next.config.ts` is empty, so the 1MB action body limit bounds
  the CSV import.
- **`safeNextPath`** in `lib/supabase/auth-callback.ts:5` correctly blocks
  open-redirect via `//evil.com`.
- **Clean secret history.** No `.env` file has ever been committed; `.gitignore`
  covers `.env*`.
- **No third-party data egress.** Health data goes to Supabase and nowhere else.

---

## Smaller items

- **No Content-Security-Policy or other security headers.** `next.config.ts` is
  empty. Vercel supplies HSTS. A CSP would need a nonce for the inline theme
  script in `app/layout.tsx:22`. Hardening, not a blocker.
- **CSV import does not validate values** (`lib/csv/import.ts`). Out-of-range or
  malformed dates hit the DB constraints and surface as a raw Postgres error;
  the whole batch fails rather than reporting which row was bad.
- **The CSV import parser drops all quotes** (`parseCsvLine`, line 31) and does
  not handle `""` escapes, so a notes field exported from this app will not
  round-trip back through import.
- **`notes` has `maxLength={2000}` client-side only** — no server or DB
  constraint. Bounded in practice by the 1MB action limit.
- **10 ESLint errors**, all `react-hooks/set-state-in-effect` in client
  components plus three `no-explicit-any` in the engine test. No correctness
  impact; worth clearing so lint stays a useful signal.
- **No error monitoring.** With one user, a crash gets reported over dinner.
  With invited users it just looks like the app is broken. Vercel's built-in
  logging or Sentry would cover this.
- **No support or contact route** for an invited user who hits a problem.
- **README is out of date** — still describes the app as limited to the author's
  wife.

---

## Suggested order

1. Timezone handling (finding 1) — it is the only one that corrupts data, and
   every day of invited-user logging before the fix produces data that has to be
   thrown away.
2. Close signup / switch to Supabase invites (finding 4) — one dashboard toggle,
   and it makes everything else less urgent by controlling who arrives.
3. Password reset (finding 2).
4. Privacy policy + delete account + the two missing RLS policies (finding 3).
5. CSV export escaping (finding 5), then the rest.

Findings 2 and 4 interact usefully: if you invite users via Supabase and they
sign in with Google, password reset matters less on day one — but it will matter
the first time someone signs up with an email and password.
