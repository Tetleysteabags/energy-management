/**
 * Analysis engine — Long COVID Recovery Pattern Tracker (Slice 4a)
 * ----------------------------------------------------------------------------
 * The deterministic core. NO LLM anywhere in this file: the statistics decide
 * whether a pattern exists; language models (Slice 4b) only structure notes and
 * narrate results that this engine has already computed.
 *
 * Design commitments (from the plan, §2):
 *   - Robust personal baselines (median + MAD), excluding flagged days, with a
 *     minimum clean sample before any inference.
 *   - Deviations expressed as the person's own z-scores.
 *   - A small, PRE-REGISTERED set of directional, lagged hypotheses — never an
 *     open grid — corrected with Benjamini-Hochberg.
 *   - Every confirmatory effect controls for the PRIOR value of the outcome, so
 *     we measure the innovation, not the stickiness of the symptom.
 *   - Uncertainty via a MOVING-BLOCK bootstrap, because an i.i.d. bootstrap
 *     breaks the autocorrelation and understates the CI.
 *   - PEM treated as a threshold EVENT (crash) via within-person case-control,
 *     plus a load-percentile -> crash-rate view.
 *   - Same-day load -> symptom is NEVER confirmatory evidence (reverse
 *     causation). Lagged only.
 *   - Honest labels: insufficient_data / no_signal / possible_association /
 *     recurring_pattern. Never "causal".
 *
 * The engine is pure and standalone: it consumes schema-shaped rows and depends
 * on nothing else (the synthetic generator is a TEST fixture, not a dependency).
 */

// ============================================================================
// Row shapes (subset of the Supabase schema actually used here)
// ============================================================================

export interface SymptomRowLike {
  date: string;
  fatigue_score: number;
  pem_score: number;
  chest_heaviness_score: number;
  muscle_soreness_score: number;
  brain_fog_score: number;
  sinus_congestion_score: number;
  subjective_sleep_quality: number;
  overall_capacity_score: number;
  [k: string]: unknown;
}
export interface LoadRowLike {
  date: string;
  physical_load_score: number;
  meeting_load_score: number;
  talking_minutes: number;
  mental_stress_score: number;
  pacing_quality_score: number;
  environment_score: number;
  alcohol: boolean;
  alcohol_units: number;
  late_caffeine: boolean;
  late_meal: boolean;
  [k: string]: unknown;
}
export interface WearableRowLike {
  date: string;
  total_sleep_minutes: number;
  wake_minutes: number;
  sleep_efficiency: number;
  resting_hr: number;
  hrv_rmssd: number;
  respiratory_rate: number;
  spo2: number;
  temperature_deviation: number;
  steps: number;
  active_minutes: number;
  sedentary_minutes: number;
  [k: string]: unknown;
}

// ============================================================================
// Date helpers
// ============================================================================

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00Z").getTime();
  const db = new Date(b + "T00:00:00Z").getTime();
  return Math.round((db - da) / 86400000);
}

// ============================================================================
// Daily frame: merge the three tables, keep a full CALENDAR range with gaps
// ============================================================================

export interface DailyFrame {
  dates: string[]; // full calendar range, contiguous
  record: (Record<string, number> | null)[]; // merged numeric per day, null if missing
  getSeries(field: string): (number | null)[];
}

const BOOL_FIELDS = new Set(["alcohol", "late_caffeine", "late_meal"]);
const SKIP_FIELDS = new Set(["date", "notes", "source"]);

function mergeNumeric(target: Record<string, number>, row: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(row)) {
    if (SKIP_FIELDS.has(k)) continue;
    if (BOOL_FIELDS.has(k)) target[k] = v ? 1 : 0;
    else if (typeof v === "number" && Number.isFinite(v)) target[k] = v;
  }
}

export function buildFrame(
  symptoms: SymptomRowLike[],
  loads: LoadRowLike[],
  wearables: WearableRowLike[]
): DailyFrame {
  const byDate = new Map<string, Record<string, number>>();
  const touch = (date: string) => {
    let r = byDate.get(date);
    if (!r) {
      r = {};
      byDate.set(date, r);
    }
    return r;
  };
  for (const r of symptoms) mergeNumeric(touch(r.date), r as Record<string, unknown>);
  for (const r of loads) mergeNumeric(touch(r.date), r as Record<string, unknown>);
  for (const r of wearables) mergeNumeric(touch(r.date), r as Record<string, unknown>);

  const allDates = [...byDate.keys()].sort();
  if (allDates.length === 0) return { dates: [], record: [], getSeries: () => [] };
  const start = allDates[0];
  const end = allDates[allDates.length - 1];
  const span = daysBetween(start, end) + 1;

  const dates: string[] = [];
  const record: (Record<string, number> | null)[] = [];
  for (let i = 0; i < span; i++) {
    const d = addDays(start, i);
    dates.push(d);
    record.push(byDate.get(d) ?? null);
  }
  return {
    dates,
    record,
    getSeries(field: string) {
      return record.map((r) => (r && field in r ? r[field] : null));
    },
  };
}

// ============================================================================
// Robust statistics
// ============================================================================

function median(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function mad(xs: number[], med?: number): number {
  if (xs.length === 0) return NaN;
  const m = med ?? median(xs);
  return median(xs.map((x) => Math.abs(x - m)));
}
function mean(xs: number[]): number {
  return xs.reduce((s, v) => s + v, 0) / xs.length;
}
function sd(xs: number[]): number {
  if (xs.length < 2) return NaN;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, v) => s + (v - m) * (v - m), 0) / (xs.length - 1));
}
function zscore(xs: number[]): number[] {
  const m = mean(xs);
  const s = sd(xs) || 1e-9;
  return xs.map((v) => (v - m) / s);
}
function pearson(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return NaN;
  const mx = mean(x);
  const my = mean(y);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = x[i] - mx;
    const b = y[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  return num / Math.sqrt(dx * dy || 1e-12);
}

/** Normal CDF via Abramowitz-Stegun erf approximation. */
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(z / Math.SQRT2));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-((z / Math.SQRT2) * (z / Math.SQRT2)));
  const erf = z >= 0 ? y : -y;
  return 0.5 * (1 + erf);
}

/** Seeded RNG so bootstrap/permutation results are reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** OLS via normal equations + Gaussian elimination. X includes the intercept. */
function ols(y: number[], X: number[][]): number[] {
  const k = X[0].length;
  const A = Array.from({ length: k }, () => new Array(k).fill(0));
  const b = new Array(k).fill(0);
  for (let i = 0; i < y.length; i++) {
    for (let a = 0; a < k; a++) {
      b[a] += X[i][a] * y[i];
      for (let c = 0; c < k; c++) A[a][c] += X[i][a] * X[i][c];
    }
  }
  for (let col = 0; col < k; col++) {
    let piv = col;
    for (let r = col + 1; r < k; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
    [A[col], A[piv]] = [A[piv], A[col]];
    [b[col], b[piv]] = [b[piv], b[col]];
    const d = A[col][col] || 1e-9;
    for (let r = 0; r < k; r++) {
      if (r === col) continue;
      const f = A[r][col] / d;
      for (let c = 0; c < k; c++) A[r][c] -= f * A[col][c];
      b[r] -= f * b[col];
    }
  }
  return b.map((v, i) => v / (A[i][i] || 1e-9));
}

// ============================================================================
// Baselines & personal z-scores  (§2.1, §2.2)
// ============================================================================

export interface BaselineOpts {
  windowDays?: number; // trailing window, default 21
  minSample?: number; // min clean days before a baseline exists, default 10
}

export interface CrashCondition {
  field: string;
  op: ">=" | "<=" | ">" | "<";
  value: number;
}
export interface CrashRule {
  combine: "AND" | "OR";
  conditions: CrashCondition[];
  version?: string;
  activeFrom?: string;
}

export const DEFAULT_CRASH_RULE: CrashRule = {
  combine: "OR",
  conditions: [
    { field: "pem_score", op: ">=", value: 7 },
    { field: "overall_capacity_score", op: "<=", value: 3 },
  ],
  version: "v1-default",
};

function evalCondition(rec: Record<string, number>, c: CrashCondition): boolean {
  const v = rec[c.field];
  if (v === undefined) return false;
  switch (c.op) {
    case ">=":
      return v >= c.value;
    case "<=":
      return v <= c.value;
    case ">":
      return v > c.value;
    case "<":
      return v < c.value;
  }
}

/** Per-day crash flags using a (versioned) crash rule. Missing day -> false. */
export function flagCrashes(frame: DailyFrame, rule: CrashRule = DEFAULT_CRASH_RULE): boolean[] {
  return frame.record.map((r) => {
    if (!r) return false;
    const results = rule.conditions.map((c) => evalCondition(r, c));
    return rule.combine === "AND" ? results.every(Boolean) : results.some(Boolean);
  });
}

/** Flag days to exclude from baselines: crashes + explicit is_excluded. */
function exclusionFlags(frame: DailyFrame, crashRule: CrashRule): boolean[] {
  const crash = flagCrashes(frame, crashRule);
  return frame.record.map((r, i) => crash[i] || (r ? r["is_excluded"] === 1 : false));
}

export interface BaselineSeries {
  median: (number | null)[];
  robustSd: (number | null)[]; // 1.4826 * MAD
  z: (number | null)[]; // (value - median) / robustSd
}

/** Trailing robust baseline for a field, excluding flagged days. */
export function computeBaseline(
  frame: DailyFrame,
  field: string,
  crashRule: CrashRule = DEFAULT_CRASH_RULE,
  opts: BaselineOpts = {}
): BaselineSeries {
  const W = opts.windowDays ?? 21;
  const minSample = opts.minSample ?? 10;
  const series = frame.getSeries(field);
  const excluded = exclusionFlags(frame, crashRule);
  const n = series.length;
  const medArr: (number | null)[] = new Array(n).fill(null);
  const sdArr: (number | null)[] = new Array(n).fill(null);
  const zArr: (number | null)[] = new Array(n).fill(null);

  for (let i = 0; i < n; i++) {
    const window: number[] = [];
    for (let j = Math.max(0, i - W); j < i; j++) {
      const v = series[j];
      if (v !== null && !excluded[j]) window.push(v);
    }
    if (window.length < minSample) continue;
    const med = median(window);
    const rsd = 1.4826 * mad(window, med);
    medArr[i] = med;
    sdArr[i] = rsd;
    const cur = series[i];
    if (cur !== null && rsd > 1e-9) zArr[i] = (cur - med) / rsd;
  }
  return { median: medArr, robustSd: sdArr, z: zArr };
}

// ============================================================================
// Confirmatory hypotheses  (§2.3)  — pre-registered, directional, lagged
// ============================================================================

export interface Hypothesis {
  id: string;
  label: string;
  predictor: string;
  outcome: string;
  lag: number; // calendar days
  direction: 1 | -1; // expected sign of effect
}

export const DEFAULT_HYPOTHESES: Hypothesis[] = [
  { id: "H1a", label: "Meeting/talking load → next-day fatigue", predictor: "meeting_load_score", outcome: "fatigue_score", lag: 1, direction: 1 },
  { id: "H1b", label: "Meeting/talking load → next-day PEM", predictor: "meeting_load_score", outcome: "pem_score", lag: 1, direction: 1 },
  { id: "H2", label: "Poor sleep quality → next-day fatigue", predictor: "subjective_sleep_quality", outcome: "fatigue_score", lag: 1, direction: -1 },
  { id: "H3", label: "Sinus/environment irritation → worse sleep quality", predictor: "environment_score", outcome: "subjective_sleep_quality", lag: 1, direction: -1 },
  { id: "H4a", label: "Alcohol → next-day resting HR", predictor: "alcohol_units", outcome: "resting_hr", lag: 1, direction: 1 },
  { id: "H4b", label: "Alcohol → next-day HRV", predictor: "alcohol_units", outcome: "hrv_rmssd", lag: 1, direction: -1 },
  { id: "H4c", label: "Alcohol → next-night total sleep", predictor: "alcohol_units", outcome: "total_sleep_minutes", lag: 1, direction: -1 },
  { id: "H5", label: "Physical load → next-day PEM", predictor: "physical_load_score", outcome: "pem_score", lag: 1, direction: 1 },
];

export type ConfidenceLabel =
  | "insufficient_data"
  | "no_signal"
  | "possible_association"
  | "recurring_pattern";

export interface ConfirmatoryResult {
  hypothesis: Hypothesis;
  n: number;
  beta: number; // standardized partial slope (predictor, controlling prior outcome)
  ci: [number, number]; // 95% block-bootstrap percentile interval
  seBoot: number;
  pOneSided: number; // toward the hypothesised direction
  qBH: number; // BH-adjusted q-value
  survivesBH: boolean;
  directionMatches: boolean;
  label: ConfidenceLabel;
  plainEnglish: string;
}

export interface ConfirmatoryOpts {
  minN?: number; // min complete pairs for inference, default 20
  strongN?: number; // n needed for a "recurring_pattern", default 30
  effectFloor?: number; // |beta| floor for "recurring_pattern", default 0.2
  alpha?: number; // BH level, default 0.05
  bootstrap?: number; // B replicates, default 500
  seed?: number;
}

interface AlignedRow {
  p: number; // predictor[t-lag], standardized later
  o: number; // outcome[t]
  oprev: number; // outcome[t-1]
}

function alignPairs(frame: DailyFrame, h: Hypothesis): AlignedRow[] {
  const p = frame.getSeries(h.predictor);
  const o = frame.getSeries(h.outcome);
  const rows: AlignedRow[] = [];
  for (let t = Math.max(h.lag, 1); t < o.length; t++) {
    const pv = p[t - h.lag];
    const ov = o[t];
    const oprev = o[t - 1];
    if (pv !== null && ov !== null && oprev !== null) rows.push({ p: pv, o: ov, oprev });
  }
  return rows;
}

/** Standardize the aligned columns and fit outcome ~ predictor + prior outcome. */
function fitBeta(rows: AlignedRow[]): number {
  const zp = zscore(rows.map((r) => r.p));
  const zo = zscore(rows.map((r) => r.o));
  const zprev = zscore(rows.map((r) => r.oprev));
  const X = zo.map((_, i) => [1, zp[i], zprev[i]]);
  return ols(zo, X)[1];
}

/** Moving-block bootstrap of beta — preserves short-range autocorrelation. */
function blockBootstrapBeta(rows: AlignedRow[], B: number, rng: () => number): number[] {
  const n = rows.length;
  const L = Math.max(2, Math.round(Math.cbrt(n))); // block length ~ n^(1/3)
  const nBlocks = Math.ceil(n / L);
  const betas: number[] = [];
  for (let b = 0; b < B; b++) {
    const sample: AlignedRow[] = [];
    for (let k = 0; k < nBlocks; k++) {
      const start = Math.floor(rng() * Math.max(1, n - L + 1));
      for (let j = 0; j < L && sample.length < n; j++) sample.push(rows[(start + j) % n]);
    }
    betas.push(fitBeta(sample));
  }
  return betas;
}

function benjaminiHochberg(ps: number[], alpha: number): { q: number[]; reject: boolean[] } {
  const m = ps.length;
  const order = ps.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  const q = new Array(m).fill(1);
  let prev = 1;
  for (let rank = m; rank >= 1; rank--) {
    const { p, i } = order[rank - 1];
    const val = Math.min(prev, (p * m) / rank);
    q[i] = val;
    prev = val;
  }
  const reject = q.map((qi) => qi <= alpha);
  return { q, reject };
}

export function runConfirmatory(
  frame: DailyFrame,
  hypotheses: Hypothesis[] = DEFAULT_HYPOTHESES,
  opts: ConfirmatoryOpts = {}
): ConfirmatoryResult[] {
  const minN = opts.minN ?? 20;
  const strongN = opts.strongN ?? 30;
  const floor = opts.effectFloor ?? 0.2;
  const alpha = opts.alpha ?? 0.05;
  const B = opts.bootstrap ?? 500;
  const rng = mulberry32(opts.seed ?? 1234);

  // First pass: fit + bootstrap each hypothesis that has enough data.
  type Pre = {
    h: Hypothesis;
    n: number;
    beta: number;
    ci: [number, number];
    se: number;
    p: number | null; // null => insufficient
    dirMatch: boolean;
  };
  const pre: Pre[] = hypotheses.map((h) => {
    const rows = alignPairs(frame, h);
    const n = rows.length;
    if (n < minN) {
      return { h, n, beta: NaN, ci: [NaN, NaN], se: NaN, p: null, dirMatch: false };
    }
    const beta = fitBeta(rows);
    const boot = blockBootstrapBeta(rows, B, rng).sort((a, b) => a - b);
    const lo = boot[Math.floor(0.025 * boot.length)];
    const hi = boot[Math.floor(0.975 * boot.length)];
    const se = sd(boot);
    const z = beta / (se || 1e-9);
    // one-sided p toward the hypothesised direction
    const p = h.direction === 1 ? 1 - normalCdf(z) : normalCdf(z);
    const dirMatch = Math.sign(beta) === h.direction;
    return { h, n, beta, ci: [lo, hi], se, p, dirMatch };
  });

  // BH across only the tests that were actually performed.
  const performed = pre.filter((x) => x.p !== null);
  const bh = benjaminiHochberg(performed.map((x) => x.p as number), alpha);
  const qById = new Map<string, { q: number; reject: boolean }>();
  performed.forEach((x, i) => qById.set(x.h.id, { q: bh.q[i], reject: bh.reject[i] }));

  return pre.map((x) => {
    const q = qById.get(x.h.id);
    const survivesBH = q ? q.reject : false;
    const qBH = q ? q.q : 1;
    let label: ConfidenceLabel;
    if (x.p === null) label = "insufficient_data";
    else if (survivesBH && x.dirMatch && Math.abs(x.beta) >= floor && x.n >= strongN)
      label = "recurring_pattern";
    else if ((x.p as number) < alpha && x.dirMatch) label = "possible_association";
    else label = "no_signal";

    return {
      hypothesis: x.h,
      n: x.n,
      beta: x.beta,
      ci: x.ci,
      seBoot: x.se,
      pOneSided: x.p ?? NaN,
      qBH,
      survivesBH,
      directionMatches: x.dirMatch,
      label,
      plainEnglish: renderConfirmatory(x.h, x.beta, x.ci, x.n, label),
    };
  });
}

function renderConfirmatory(
  h: Hypothesis,
  beta: number,
  ci: [number, number],
  n: number,
  label: ConfidenceLabel
): string {
  if (label === "insufficient_data")
    return `${h.label}: not enough overlapping days yet (n=${n}). Still collecting.`;
  const strength = Math.abs(beta) >= 0.4 ? "a clear" : Math.abs(beta) >= 0.2 ? "a moderate" : "a small";
  const ciStr = `[${ci[0].toFixed(2)}, ${ci[1].toFixed(2)}]`;
  if (label === "recurring_pattern")
    return `Recurring pattern: ${h.label.toLowerCase()} shows ${strength} association (effect ${beta.toFixed(2)}, 95% CI ${ciStr}, n=${n}), holding up after correcting for multiple comparisons. This is an association, not proof of cause — watch whether it persists.`;
  if (label === "possible_association")
    return `Possible pattern: ${h.label.toLowerCase()} (effect ${beta.toFixed(2)}, 95% CI ${ciStr}, n=${n}). It did not survive multiple-comparison correction, so treat it as a lead to watch, not a finding.`;
  return `${h.label}: no reliable association in the data so far (effect ${beta.toFixed(2)}, n=${n}).`;
}

// ============================================================================
// PEM as a threshold event: within-person case-control  (§2.4)
// ============================================================================

export interface CaseControlResult {
  signal: string;
  lookbackDays: number;
  nCrashWindows: number;
  nControlWindows: number;
  meanBeforeCrash: number;
  meanBeforeControl: number;
  standardizedDiff: number; // (crash - control) / pooled SD
  pPermutation: number;
  qBH: number; // BH-adjusted across the precursor signals
  survivesBH: boolean;
  plainEnglish: string;
}

export interface CaseControlOpts {
  lookbackDays?: number; // precursor window length, default 2
  signals?: string[];
  permutations?: number; // default 1000
  alpha?: number; // BH level, default 0.05
  seed?: number;
}

const DEFAULT_PRECURSOR_SIGNALS = [
  "physical_load_score",
  "steps",
  "meeting_load_score",
  "hrv_rmssd",
  "resting_hr",
  "total_sleep_minutes",
];

/** Mean of a signal over the `lookback` days immediately BEFORE day t. */
function precursorMean(series: (number | null)[], t: number, lookback: number): number | null {
  const vals: number[] = [];
  for (let k = 1; k <= lookback; k++) {
    const idx = t - k;
    if (idx >= 0 && series[idx] !== null) vals.push(series[idx] as number);
  }
  return vals.length ? mean(vals) : null;
}

export function runCaseControl(
  frame: DailyFrame,
  crashRule: CrashRule = DEFAULT_CRASH_RULE,
  opts: CaseControlOpts = {}
): CaseControlResult[] {
  const lookback = opts.lookbackDays ?? 2;
  const signals = opts.signals ?? DEFAULT_PRECURSOR_SIGNALS;
  const perms = opts.permutations ?? 1000;
  const rng = mulberry32(opts.seed ?? 99);
  const crash = flagCrashes(frame, crashRule);
  const n = crash.length;

  // Controls exclude days within `lookback` AFTER a crash (recovery contamination).
  const contaminated = new Array(n).fill(false);
  for (let i = 0; i < n; i++) {
    if (crash[i]) for (let k = 0; k <= lookback; k++) if (i + k < n) contaminated[i + k] = true;
  }

  const alpha = opts.alpha ?? 0.05;
  const raw = signals.map((sig) => {
    const series = frame.getSeries(sig);
    const caseVals: number[] = [];
    const controlVals: number[] = [];
    const precursors: number[] = [];
    for (let t = lookback; t < n; t++) {
      const pm = precursorMean(series, t, lookback);
      if (pm === null) continue;
      if (crash[t]) {
        caseVals.push(pm);
        precursors.push(pm);
      } else if (!contaminated[t]) {
        controlVals.push(pm);
        precursors.push(pm);
      }
    }
    const mc = caseVals.length ? mean(caseVals) : NaN;
    const mk = controlVals.length ? mean(controlVals) : NaN;
    const pooled =
      Math.sqrt(((sd(caseVals) || 0) ** 2 + (sd(controlVals) || 0) ** 2) / 2) || 1e-9;
    const stdDiff = (mc - mk) / pooled;

    const observed = Math.abs(mc - mk);
    let extreme = 0;
    const nCase = caseVals.length;
    if (nCase >= 3 && controlVals.length >= 5) {
      for (let b = 0; b < perms; b++) {
        const idx = precursors.map((_, i) => i);
        for (let i = idx.length - 1; i > 0; i--) {
          const j = Math.floor(rng() * (i + 1));
          [idx[i], idx[j]] = [idx[j], idx[i]];
        }
        let sc = 0;
        let scN = 0;
        let kc = 0;
        let kcN = 0;
        for (let i = 0; i < idx.length; i++) {
          if (i < nCase) {
            sc += precursors[idx[i]];
            scN++;
          } else {
            kc += precursors[idx[i]];
            kcN++;
          }
        }
        const diff = Math.abs(sc / scN - kc / kcN);
        if (diff >= observed) extreme++;
      }
    } else {
      extreme = perms;
    }
    const pPerm = (extreme + 1) / (perms + 1);
    return { sig, stdDiff, pPerm, caseVals, controlVals, eligible: nCase >= 3 && controlVals.length >= 5 };
  });

  // BH across the eligible precursor signals — same discipline as confirmatory.
  const eligible = raw.filter((r) => r.eligible);
  const bh = benjaminiHochberg(eligible.map((r) => r.pPerm), alpha);
  const bhBySig = new Map<string, { q: number; reject: boolean }>();
  eligible.forEach((r, i) => bhBySig.set(r.sig, { q: bh.q[i], reject: bh.reject[i] }));

  return raw.map((r) => {
    const q = bhBySig.get(r.sig);
    return {
      signal: r.sig,
      lookbackDays: lookback,
      nCrashWindows: r.caseVals.length,
      nControlWindows: r.controlVals.length,
      meanBeforeCrash: r.caseVals.length ? mean(r.caseVals) : NaN,
      meanBeforeControl: r.controlVals.length ? mean(r.controlVals) : NaN,
      standardizedDiff: r.stdDiff,
      pPermutation: r.pPerm,
      qBH: q ? q.q : 1,
      survivesBH: q ? q.reject : false,
      plainEnglish: renderCaseControl(r.sig, r.stdDiff, r.pPerm, r.caseVals.length),
    };
  });
}

function renderCaseControl(sig: string, stdDiff: number, p: number, nCrash: number): string {
  if (nCrash < 3) return `${sig}: too few crash days to compare yet (n=${nCrash}).`;
  const dir = stdDiff > 0 ? "higher" : "lower";
  const sig5 = p < 0.05 ? "notably " : "";
  return `Before crashes, ${sig.replace(/_/g, " ")} ran ${sig5}${dir} than usual (std diff ${stdDiff.toFixed(2)}, p≈${p.toFixed(3)}, ${nCrash} crash days).`;
}

/** Load-percentile -> crash-rate: the "how much is too much" envelope view. */
export interface CrashRateBin {
  label: string;
  exertionRange: [number, number];
  nDays: number;
  crashRate: number; // fraction of days followed by a crash within `horizon`
}

export function loadPercentileCrashRate(
  frame: DailyFrame,
  crashRule: CrashRule = DEFAULT_CRASH_RULE,
  opts: { exertionField?: string; rollingDays?: number; horizon?: number; bins?: number } = {}
): CrashRateBin[] {
  const field = opts.exertionField ?? "physical_load_score";
  const roll = opts.rollingDays ?? 2;
  const horizon = opts.horizon ?? 2;
  const nbins = opts.bins ?? 3;
  const series = frame.getSeries(field);
  const crash = flagCrashes(frame, crashRule);
  const n = series.length;

  const points: { exertion: number; crashed: boolean }[] = [];
  for (let t = roll - 1; t < n - horizon; t++) {
    const w: number[] = [];
    for (let k = 0; k < roll; k++) {
      const v = series[t - k];
      if (v !== null) w.push(v);
    }
    if (w.length < roll) continue;
    const exertion = w.reduce((s, v) => s + v, 0);
    let crashed = false;
    for (let h = 1; h <= horizon; h++) if (crash[t + h]) crashed = true;
    points.push({ exertion, crashed });
  }
  if (points.length < nbins * 4) return [];
  points.sort((a, b) => a.exertion - b.exertion);
  const bins: CrashRateBin[] = [];
  const per = Math.floor(points.length / nbins);
  const names = nbins === 3 ? ["low", "moderate", "high"] : Array.from({ length: nbins }, (_, i) => `q${i + 1}`);
  for (let i = 0; i < nbins; i++) {
    const slice = points.slice(i * per, i === nbins - 1 ? points.length : (i + 1) * per);
    const rate = slice.filter((p) => p.crashed).length / slice.length;
    bins.push({
      label: names[i],
      exertionRange: [slice[0].exertion, slice[slice.length - 1].exertion],
      nDays: slice.length,
      crashRate: rate,
    });
  }
  return bins;
}

// ============================================================================
// Exploratory grid (§2.5) — FIREWALLED: raw stats only, no labels, no insights
// ============================================================================

export interface ExploratoryAssoc {
  predictor: string;
  outcome: string;
  lag: number;
  naiveR: number;
  controlledBeta: number;
  n: number;
}

export interface ExploratoryReport {
  warning: string;
  nTests: number;
  associations: ExploratoryAssoc[];
}

export function runExploratory(
  frame: DailyFrame,
  predictors: string[],
  outcomes: string[],
  lags: number[] = [1, 2]
): ExploratoryReport {
  const associations: ExploratoryAssoc[] = [];
  for (const pr of predictors) {
    for (const ou of outcomes) {
      for (const lag of lags) {
        const rows = alignPairs(frame, { id: "", label: "", predictor: pr, outcome: ou, lag, direction: 1 });
        if (rows.length < 10) continue;
        const naiveR = pearson(
          rows.map((r) => r.p),
          rows.map((r) => r.o)
        );
        const controlledBeta = fitBeta(rows);
        associations.push({ predictor: pr, outcome: ou, lag, naiveR, controlledBeta, n: rows.length });
      }
    }
  }
  return {
    warning:
      "EXPLORATORY — hypothesis-generating only. These are uncorrected, multi-tested associations; many will be false positives. Nothing here is evidence until promoted to a pre-registered hypothesis and confirmed.",
    nTests: associations.length,
    associations,
  };
}

// ============================================================================
// Composite scores (§2.6) — demoted: components are primary, score is secondary
// ============================================================================

export interface CompositeComponent {
  name: string;
  z: number | null;
  weight: number;
}
export interface CompositeScores {
  recoveryStrain: (number | null)[];
  loadScore: (number | null)[];
  strainComponents: { date: string; components: CompositeComponent[] }[];
}

function squash0to100(weightedZ: number): number {
  // logistic map so ~0 -> 25, +2 -> ~75
  return Math.round(100 / (1 + Math.exp(-0.9 * weightedZ)));
}

export function computeCompositeScores(
  frame: DailyFrame,
  crashRule: CrashRule = DEFAULT_CRASH_RULE,
  opts: BaselineOpts = {}
): CompositeScores {
  const z = (f: string) => computeBaseline(frame, f, crashRule, opts).z;
  const hrvZ = z("hrv_rmssd");
  const rhrZ = z("resting_hr");
  const sleepZ = z("total_sleep_minutes");
  const wakeZ = z("wake_minutes");
  const tempZ = z("temperature_deviation");
  const respZ = z("respiratory_rate");
  const physZ = z("physical_load_score");
  const meetZ = z("meeting_load_score");
  const stressZ = z("mental_stress_score");
  const stepsZ = z("steps");

  const n = frame.dates.length;
  const recoveryStrain: (number | null)[] = new Array(n).fill(null);
  const loadScore: (number | null)[] = new Array(n).fill(null);
  const strainComponents: { date: string; components: CompositeComponent[] }[] = [];

  for (let i = 0; i < n; i++) {
    const comps: CompositeComponent[] = [
      { name: "HRV below baseline", z: neg(hrvZ[i]), weight: 0.3 },
      { name: "Resting HR above baseline", z: rhrZ[i], weight: 0.25 },
      { name: "Sleep below baseline", z: neg(sleepZ[i]), weight: 0.2 },
      { name: "Wakefulness above baseline", z: wakeZ[i], weight: 0.1 },
      { name: "Temp deviation above baseline", z: tempZ[i], weight: 0.1 },
      { name: "Respiratory rate above baseline", z: respZ[i], weight: 0.05 },
    ];
    strainComponents.push({ date: frame.dates[i], components: comps });
    const sw = weightedZ(comps);
    if (sw !== null) recoveryStrain[i] = squash0to100(sw);

    const loadComps: CompositeComponent[] = [
      { name: "Physical load", z: physZ[i], weight: 0.3 },
      { name: "Meeting load", z: meetZ[i], weight: 0.3 },
      { name: "Mental stress", z: stressZ[i], weight: 0.2 },
      { name: "Steps above baseline", z: stepsZ[i], weight: 0.2 },
    ];
    const lw = weightedZ(loadComps);
    if (lw !== null) loadScore[i] = squash0to100(lw);
  }
  return { recoveryStrain, loadScore, strainComponents };
}

function neg(z: number | null): number | null {
  return z === null ? null : -z;
}
function weightedZ(comps: CompositeComponent[]): number | null {
  let sum = 0;
  let wsum = 0;
  for (const c of comps) {
    if (c.z === null) continue;
    sum += c.z * c.weight;
    wsum += c.weight;
  }
  return wsum > 0 ? sum / wsum : null;
}

// ============================================================================
// Top-level convenience: run everything for the dashboard / tests
// ============================================================================

export interface Insight {
  kind: "confirmatory" | "case_control";
  severity: "info" | "watch" | "caution";
  title: string;
  text: string;
}

export interface EngineReport {
  confirmatory: ConfirmatoryResult[];
  caseControl: CaseControlResult[];
  crashRateBins: CrashRateBin[];
  composites: CompositeScores;
  insights: Insight[];
  meta: { days: number; observedDays: number; crashDays: number };
}

export function analyze(
  frame: DailyFrame,
  opts: {
    crashRule?: CrashRule;
    hypotheses?: Hypothesis[];
    confirmatory?: ConfirmatoryOpts;
    baseline?: BaselineOpts;
  } = {}
): EngineReport {
  const crashRule = opts.crashRule ?? DEFAULT_CRASH_RULE;
  const confirmatory = runConfirmatory(frame, opts.hypotheses ?? DEFAULT_HYPOTHESES, opts.confirmatory);
  const caseControl = runCaseControl(frame, crashRule);
  const crashRateBins = loadPercentileCrashRate(frame, crashRule);
  const composites = computeCompositeScores(frame, crashRule, opts.baseline);

  const insights: Insight[] = [];
  for (const r of confirmatory) {
    // Only BH-surviving findings reach the insight feed. `possible_association`
    // results stay in `confirmatory[]` as a separate "watching" tier the UI can
    // show, but are never promoted to a finding.
    if (r.label === "recurring_pattern")
      insights.push({ kind: "confirmatory", severity: "caution", title: r.hypothesis.label, text: r.plainEnglish });
  }
  for (const c of caseControl) {
    if (c.survivesBH && c.nCrashWindows >= 8 && Math.abs(c.standardizedDiff) >= 0.6)
      insights.push({ kind: "case_control", severity: "watch", title: `Crash precursor: ${c.signal}`, text: c.plainEnglish });
  }

  const crash = flagCrashes(frame, crashRule);
  return {
    confirmatory,
    caseControl,
    crashRateBins,
    composites,
    insights,
    meta: {
      days: frame.dates.length,
      observedDays: frame.record.filter((r) => r !== null).length,
      crashDays: crash.filter(Boolean).length,
    },
  };
}
