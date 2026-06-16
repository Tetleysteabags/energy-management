> **Canonical install:** `docs/ui-ux-spec.md` and `.cursor/rules/frontend-design.mdc`. This copy ships with the analysis bundle for handoff.


# UI/UX spec — Long COVID Recovery Pattern Tracker

This is the design reference for building the app's UI. It pairs with the
`.cursor/rules/insights-ux.mdc` guardrail (which is the short always-on version);
this document is the detailed spec to follow when building any screen.

---

## North star

The primary user is energy-limited: fatigue and brain fog make every tap, every
decision, every "what do I put here" a real cost. The build bar for the daily
flow is: **could someone finish this in ~15 seconds on a bad fog day without
having to think?** If logging ever feels like work, adherence collapses and the
analysis engine has no data. Optimise relentlessly for low effort and low
cognitive load over feature richness.

---

## Principles

1. **Default to yesterday; log only the delta.** Every check-in field is
   pre-filled with yesterday's value. The task is "change what's different," not
   "answer N questions." Show each field's prior value as a hint (e.g.
   "yesterday 6").
2. **One-tap floor.** A "Same as yesterday" action accepts all pre-filled values
   and completes the check-in in a single tap. It appears both on the home
   screen and at the top of the check-in form.
3. **Design against engagement.** Success = the user spends *less* time in the
   app. No streaks, no scores, no nagging notifications, no dopamine loops.
   Missing a day is fine — the engine handles gaps. Never show guilt UI.
4. **The home is a glance, not a cockpit.** It shows current status and the one
   action that's due. Trends/analysis are one layer down, opt-in.
5. **"Insufficient data" is progress.** Instead of a blank "no insights," show a
   countdown: "Building your baseline — 8 more days." Especially weeks 1–6.
6. **Progressive disclosure.** Show the few things that matter; tuck the rest
   behind "show more." Default the check-in to 3–4 fields; the full symptom set
   is reachable but not in your face.
7. **Never nudge toward more activity.** Where relevant, gently support pacing /
   the energy envelope. Suggestions are permission to rest, never pressure.
8. **Forgiving of gaps.** No broken streaks, no "you missed 3 days." Pick up
   where the user is.

---

## Tone of voice

Calm, plain, human. Never clinical-cold, never fake-cheerful.

- Allowed: "possible pattern", "watch this", "collecting data", "no reliable
  association yet", "a gentler day might help".
- Forbidden: "diagnosis", "causal", "proven", verdicts like
  "improving/declining", and any urgency/alarm framing.
- Numbers shown to the user are the actionable ones (e.g. "next-day fatigue 6.8
  vs 4.9"). Statistical detail (effect size, CI, p/q) NEVER appears in the
  patient view — it belongs only in the doctor report.

---

## Confidence scale (use consistently everywhere)

Maps directly to the engine's labels. One quiet visual token each:

| Engine label | UI label | Token |
|---|---|---|
| `recurring_pattern` | "Recurring pattern" | info tint pill (`background-info` / `text-info`) |
| `possible_association` | "Possible" | warning tint pill (`background-warning` / `text-warning`) |
| `insufficient_data` | "Collecting data" | neutral (`background-secondary` / `text-tertiary`) |

Every surfaced insight shows its `n` (e.g. "18 days") and a "not proof of
cause" caveat. Never hide uncertainty. Red is reserved — never use alarm colours
for insights; even "caution" stays a soft amber.

---

## Wearable timing convention

A `wearable_daily_metrics` row dated day **D** holds two different windows — not
one blended "yesterday":

| Window | Metrics | Meaning |
|---|---|---|
| **Night ending on D's morning** | sleep, resting HR, HRV (respiratory / SpO₂ / temp if shown) | Overnight recovery attributed to wake date **D** |
| **Daytime of D** | steps, active minutes | Activity during calendar day **D** |

On the home screen for today **T**:

- **Last night** card → row **T** (overnight recovery).
- **Yesterday** card group → row **T−1** (daytime activity).

Never file daytime steps under "last night". Adapters, seed data, and sync code
must all follow this convention (mirrors Fitbit-style wake-date sleep attribution).

---

## Core components

### Time-aware home
The home is the daily hub: glanceable status plus the lightweight things a person
does throughout the day. Keep each section compact so it stays calm, not a cockpit.
- Greeting + date; quiet.
- Status line: contextual to time of day (morning → "Morning check-in"; evening →
  "Evening check-in"; done → "all logged today / nothing else needed").
- **Wearable card (last night + yesterday):** ONE compact card with two
  labelled groups, because the windows genuinely differ. **Last night**
  (overnight recovery) — sleep, resting HR, HRV (and respiratory / SpO₂ / temp
  if shown). **Yesterday** (daytime activity) — steps, active minutes. Never
  file daytime steps under "last night". Missing values show "—"; one gentle
  plain-language note when relevant ("sleep a little below your usual; HRV
  hasn't synced yet"). Read-only glance, not a dashboard.
- **Today card (inline events):** quick-add chips for common events (rest, nap,
  walk, meeting, work, +) that log at the current time with one tap. Duration is
  set with **preset chips** (15m · 30m · 1h · 1h30 · 2h · 3h · custom) shown the
  moment an event is added — NOT a − / + stepper (stepping to 3h is a dozen
  taps). Each type carries a sensible default duration; point-events (supplement,
  symptom flare) show no duration. Tapping a duration re-opens the presets;
  remove is one tap. Primary logging spot — keep it near-zero-friction;
  `/events` holds the full history.
- Optional pacing line when recovery strain is elevated (soft, neutral): "a
  gentler day might help." Never suggests more activity.
- "Same as yesterday" one-tap shortcut near the check-in status.
- "What we're watching": at most one or two insight cards (see anatomy). Cards
  use `patientSummary()` — short sentence + pill + `n` + caveat, never raw stats.
- Bottom nav: Home / Trends / More. Quiet; active item only is full-contrast.

### Check-in field (symptoms, 0–10)
- Pre-filled slider at yesterday's value; large thumb; `step="1"`.
- Row: label left; live value + plain word right (e.g. "6 · moderate").
- Word scale (symptoms): 0 none · 1–2 minimal · 3–4 mild · 5–6 moderate · 7–8
  high · 9–10 severe. Capacity inverts: very low → full.
- Hint line below: "yesterday N".

### Load field (0–3) and booleans
- 0–3 loads render as **four big segmented buttons** (None / Light / Moderate /
  Heavy), not sliders — faster and lower-precision-effort.
- Booleans (alcohol, late caffeine, late meal) are single toggle chips.
- Alcohol "yes" reveals a tiny units stepper inline.

### "Same as yesterday"
- Prominent on the check-in (full-width, soft info fill, with a check icon) and
  as a text shortcut on home. On tap, confirm with a calm "Logged for today"
  state — no celebration.

### Notes
- Always optional, collapsed behind "Add a note (optional)". Never required.
  Dictation-friendly (plain textarea). If `llm_notes_enabled` is on, tags are
  extracted later and shown for confirmation — never auto-applied.

### Insight card anatomy
- Confidence pill (top-left) + `n` (top-right, e.g. "146 days").
- One short, friendly sentence stating the association (from a per-hypothesis
  `friendly` phrase / `patientSummary()`), e.g. "Busy meeting days tend to be
  followed by lower-energy days."
- A one-line caveat: "A lead to watch — not proof of cause."
- Optionally expandable to a detail view (see analysis screen).
- **NEVER render the engine's `plainEnglish` string, `beta`, `ci`, `p`, or `q`
  on a patient card.** Those carry statistics and belong only in `/reports`.
  Patient cards read from the structured result, not the raw text.

### Analysis screen ("Your patterns")
- **Plain language first.** Findings are sentences, ordered Recurring → Watching.
  Charts are never the default.
- **Detail on expand** uses a high-vs-low **comparison**, not a scatter:
  e.g. two soft bars "after lighter meeting days 4.9" vs "after busy days 6.8".
  Far more intuitive than a correlation coefficient.
- A "See the data" affordance reveals an optional small scatter for the curious;
  off by default.
- **"How much is too much" (envelope):** crash-rate-by-exertion as a few bars
  (lighter / moderate / heavier days → crash %), with a plain takeaway. This is
  the most actionable pacing view — give it prominence.
- **"Still watching":** the `possible_association` tier, quieter and smaller.
- Footer link to the firewalled **Explore** view, explicitly labelled
  "not evidence". Explore is raw, uncorrected, hypothesis-generating only.

### Calendar heatmap ("How you've been")
- Leads the `/trends` screen. Needs nothing from the analysis engine — it's
  pure logged data, so it can ship as soon as logging works.
- One cell per day, coloured by **capacity** (the holistic self-rating), laid
  out as weeks × days-of-week so weekly patterns are visible.
- **Calm, muted clay→teal diverging scale** (tougher → steadier). NEVER a
  green→red alarm scale — a wall of red across a rough patch is distressing.
  Suggested stops: `#F0997B`, `#F5C4B3`, `#D3D1C7`, `#9FE1CB`, `#5DCAA5`.
- Crash days get a small unobtrusive dot, not a louder fill.
- Missing days are left blank (thin outline); tapping one says "no entry —
  that's fine". No guilt.
- A single plain sentence above does the interpreting ("steadier than the month
  before"). Tapping a day shows its one-line summary.
- Simple single-metric line charts (fatigue, sleep, etc.) sit *below* the
  heatmap for anyone who wants to go deeper.

### Supplement chips (evening)
- The person's regular stack is pre-listed as toggle chips, pre-filled to "taken"
  from yesterday. Tap to deselect any not taken. "Add" for an occasional extra.
  Never a long blank checklist.

### Crash-rule builder (settings)
- Ships with a working default (PEM ≥ 7 OR capacity ≤ 3) so the user never has
  to touch it. Editing is optional and entirely plain-language.
- Reads as sentences: "Mark a day as a crash when [any / all] of these are
  true," followed by condition rows like "PEM is at least 7 (high)". Threshold
  set with a slider/stepper that shows the plain word, not just the number.
- **Live preview:** "About 4 of your last 30 days would count" — concrete
  feedback so the effect of the rule is legible before saving.
- **Versioning is explicit:** changing the rule applies from today forward; past
  crashes keep the definition that was active then. Offer an explicit "re-check
  past days with this rule" action — never silently relabel history.

### Wearable connection (settings)
- Two states. **Before connecting** leads with *trust*, not mechanics: exactly
  what's read (a read-only list — sleep, RHR, HRV, steps, SpO₂/temp), a plain
  privacy line ("read-only, never sold or shared, disconnect any time"), then the
  connect button, with a CSV-import fallback below.
- **Connected** shows: sync status ("last synced 7:14, syncs each morning"), the
  metrics flowing in with last values, a calm missing-data note ("no HRV last
  night — your watch may not have synced; it'll fill in"), and Sync now / Manage.
- A stale token shows a calm "reconnect" prompt, never a red error.

### Events timeline (`/events`)
- Optional granular logging — the daily check-ins are the backbone, so this never
  feels mandatory. Framed as "optional, a tap each".
- **One-tap quick-add chips** for common events (rest, nap, walk, meeting, work,
  supplement, + more) drop an event at the current time. Duration is set with
  **preset chips** (15m · 30m · 1h · 1h30 · 2h · 3h · custom), not a slow − / +
  stepper; point-events (supplement, flare) carry no duration. Plus optional
  intensity / note. The same quick-add + edit lives on the home "Today" card
  (the primary logging spot); `/events` is the full history.
- Reverse-chronological, grouped under soft day headers; each row is time · icon
  · label · optional muted detail. Scannable, never dense.

### Explore grid (`/explore`)
- Firewalled and visually distinct from `/analysis`. A **permanent "not
  evidence" banner** (raw, uncorrected, coincidence-prone) that never dismisses.
- Query builder: pick predictor / outcome / timing (same day / next day / two
  days). Result is a raw high-vs-low comparison with a standing coincidence
  caveat. No confidence labels, no BH, no insight generation here.
- **Built-in reverse-causation guard:** a same-day activity→symptom query shows a
  warning ("on rough days you do less, so this looks backwards — try the next
  day") instead of a misleading result.
- The ONLY bridge to evidence is **"Watch this question"**, which promotes a
  hunch into a pre-registered hypothesis the engine then tests with correction.
  Exploration never becomes a finding on its own.

---

## Screen inventory

- `/` (home) — glance + the due action. Calm.
- `/check-in/morning` — symptoms; pre-filled; one-tap floor.
- `/check-in/evening` — loads (segmented) + booleans + supplements.
- `/analysis` — confirmed findings + envelope + watching (above).
- `/events` — optional granular log; one-tap quick-add, grouped by day.
- `/wearables` — connection + sync status; trust-led before connecting.
- `/explore` — firewalled grid; banner "hypothesis-generating only, not evidence".
- `/trends` — calendar heatmap of capacity (leads), then simple single-series
  charts below. Calm, not a dashboard.
- `/reports` — doctor summary; this is the ONLY place statistical detail
  (effect sizes, CIs, n, BH results) appears.
- Settings — crash-rule builder (versioned), wearable connection, notes-LLM
  opt-in (default off).

---

## Forbidden patterns

- Streaks, badges, points, goals, "crush it" framing — any gamification.
- Nagging notifications or re-engagement nudges.
- Charts, dashboards, or multiple data series on the home screen.
- Any nudge toward more activity.
- "Diagnosis", "causal", "proven", or improving/declining verdicts.
- Raw statistics (effect/CI/p) anywhere in the patient-facing views.
- Alarm/red treatment for insights.
- Required fields beyond the bare minimum; long forms without pre-fill.

---

## Visual system

- Flat, calm, generous whitespace. White/secondary surfaces, 0.5px borders,
  rounded-lg cards. No gradients, no shadows, no neon.
- Muted palette; one soft accent (info/blue) for primary actions; amber only for
  "watch"; gray for "collecting". Red reserved for genuine errors, not insights.
- Mobile-first, single column, large tap targets (≥44px).
- Two font weights only (400 / 500). Sentence case everywhere.
- Accessibility: every control labelled; respects reduced-motion; readable in
  both light and dark mode.
