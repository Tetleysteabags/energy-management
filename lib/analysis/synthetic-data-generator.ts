/**
 * Synthetic data generator — Long COVID Recovery Pattern Tracker (Slice 4a tests)
 * ----------------------------------------------------------------------------
 * PURPOSE
 *   Produce realistic daily symptom / load / wearable data with a KNOWN causal
 *   ground truth, so the analysis engine can be tested on questions it must get
 *   right:
 *     1. Recover an injected lagged effect (e.g. meetings(t-1) -> fatigue(t)).
 *     2. Fire NOTHING on a noise-only dataset after BH correction.
 *     3. Not be fooled by autocorrelation/trend into spurious confirmatory hits.
 *
 *   The hard part is realism: symptoms are *sticky* (autocorrelated) and drift
 *   over weeks. If the data were i.i.d. noise, the "noise fires nothing" test
 *   would be trivial and meaningless. So every series here is AR(1) with
 *   configurable persistence, and the demo at the bottom shows how naive
 *   correlation invents associations that vanish once you control for the prior
 *   value of the outcome.
 *
 * TIMING CONVENTION (documented because lag bugs are silent and deadly)
 *   All rows are dated by calendar day D.
 *     daily_symptoms[D]        = morning-of-D check-in. Reflects the night
 *                                before and the load of day D-1 and earlier.
 *     daily_loads[D]           = activity + evening behaviours DURING day D.
 *     wearable_daily_metrics[D]= sleep for the night ending on the morning of D,
 *                                and activity (steps) during day D. (Mirrors how
 *                                Fitbit attributes a sleep log to the wake date.)
 *   Therefore an injected edge "meeting_load lag 1 -> fatigue" means
 *   loads[D-1].meeting -> symptoms[D].fatigue, and "alcohol lag 1 -> resting_hr"
 *   means loads[D-1].alcohol -> wearables[D].resting_hr. Lags are CALENDAR days,
 *   so missing days are held as gaps (null), never collapsed.
 *
 * USAGE
 *   node --experimental-strip-types synthetic-data-generator.ts realistic
 *   node --experimental-strip-types synthetic-data-generator.ts noise
 *   (writes CSVs + ground-truth JSON to ./synthetic-sample/ and prints a
 *    naive-vs-controlled diagnostic table)
 *
 *   Or import { realistic, noiseOnly, generate, toCSVs } from this file.
 */

// ============================================================================
// Seeded RNG  (deterministic — tests must reproduce exactly)
// ============================================================================

import { mkdirSync, writeFileSync } from "node:fs";

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal via Box-Muller, fed by a uniform RNG. */
export function makeGaussian(rng: () => number): () => number {
  let spare: number | null = null;
  return function () {
    if (spare !== null) {
      const s = spare;
      spare = null;
      return s;
    }
    let u = 0;
    let v = 0;
    let s = 0;
    do {
      u = rng() * 2 - 1;
      v = rng() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);
    const mul = Math.sqrt((-2 * Math.log(s)) / s);
    spare = v * mul;
    return u * mul;
  };
}

// ============================================================================
// Types
// ============================================================================

export interface SymptomRow {
  date: string;
  fatigue_score: number;
  pem_score: number;
  chest_heaviness_score: number;
  muscle_soreness_score: number;
  brain_fog_score: number;
  sinus_congestion_score: number;
  subjective_sleep_quality: number; // higher = better
  overall_capacity_score: number; // higher = better
  notes: string;
}

export interface LoadRow {
  date: string;
  physical_load_score: number; // 0-3
  meeting_load_score: number; // 0-3
  talking_minutes: number;
  mental_stress_score: number; // 0-3
  pacing_quality_score: number; // 0-3, higher = better
  environment_score: number; // 0-3 (sinus/environment irritation)
  alcohol: boolean;
  alcohol_units: number;
  late_caffeine: boolean;
  late_meal: boolean;
  notes: string;
}

export interface WearableRow {
  date: string;
  source: string;
  total_sleep_minutes: number;
  sleep_start: string;
  sleep_end: string;
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
}

export interface CausalEdge {
  from: string;
  to: string;
  lag: number;
  beta: number; // standardized effect size (z of predictor -> z of outcome)
  kind: "linear" | "threshold";
  note?: string;
}

export interface GroundTruth {
  scenario: string;
  startDate: string;
  days: number;
  effectScale: number;
  reverseCausation: boolean;
  thresholdPem: { rollingDays: number; thetaZ: number; gain: number } | null;
  edges: CausalEdge[];
  placeboPairs: { from: string; to: string; lag: number }[];
  missingDates: string[];
}

export interface Dataset {
  symptoms: SymptomRow[];
  loads: LoadRow[];
  wearables: WearableRow[];
  groundTruth: GroundTruth;
}

export interface GeneratorConfig {
  days: number;
  seed: number;
  startDate: string; // YYYY-MM-DD
  effectScale: number; // 0 = no causal edges (noise), 1 = full strength
  reverseCausation: boolean; // feel bad today -> do less today (a trap)
  thresholdPem: boolean; // PEM as a nonlinear envelope breach, not linear
  missingness: { prob: number; runProb: number; maxRun: number };
  emitNotes: boolean;
}

// ============================================================================
// Small helpers
// ============================================================================

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const roundClamp = (x: number, lo: number, hi: number) => clamp(Math.round(x), lo, hi);

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function dayOfWeek(iso: string): number {
  // 0=Sun..6=Sat
  return new Date(iso + "T00:00:00Z").getUTCDay();
}
const isWeekend = (iso: string) => {
  const d = dayOfWeek(iso);
  return d === 0 || d === 6;
};

/**
 * One step of a unit-variance AR(1) process: x_t = phi*x_{t-1} + eps,
 * with eps scaled so the stationary SD stays ~1 regardless of phi.
 */
function ar1Step(prev: number, phi: number, g: () => number): number {
  const innovationSd = Math.sqrt(1 - phi * phi);
  return phi * prev + innovationSd * g();
}

// ============================================================================
// Core generator
// ============================================================================

export function generate(cfg: GeneratorConfig): Dataset {
  const rng = mulberry32(cfg.seed);
  const g = makeGaussian(rng);
  const N = cfg.days;
  const s = cfg.effectScale;

  // --- persistence (autocorrelation) of each latent driver ---
  const PHI = {
    meeting: 0.45,
    physical: 0.5,
    stress: 0.55,
    sinus: 0.8, // sinus/environment drifts slowly (seasonal-ish)
    fatigueNoise: 0.7, // symptom baselines are sticky
    pemNoise: 0.5,
    chestNoise: 0.6,
    brainNoise: 0.65,
    soreNoise: 0.55,
    sleepNoise: 0.4,
    rhrNoise: 0.6,
    hrvNoise: 0.25, // HRV is jumpy night-to-night even at baseline
    capNoise: 0.6,
  };

  // latent arrays (z-scale, mean 0) kept full-length for lag alignment
  const meeting: number[] = [];
  const physical: number[] = [];
  const stress: number[] = [];
  const sinus: number[] = [];
  const alcoholUnits: number[] = []; // raw units (0 if none)
  const lateCaf: number[] = [];
  const lateMeal: number[] = [];

  const fatigueL: number[] = [];
  const pemL: number[] = [];
  const chestL: number[] = [];
  const brainL: number[] = [];
  const soreL: number[] = [];
  const sinusSymptomL: number[] = [];
  const sleepQualL: number[] = [];
  const capL: number[] = [];

  const totalSleepL: number[] = [];
  const rhrL: number[] = [];
  const hrvL: number[] = [];
  const tempDevL: number[] = [];

  // noise carriers
  let nMeet = 0, nPhys = 0, nStress = 0, nSinus = 0;
  let nFat = 0, nPem = 0, nChest = 0, nBrain = 0, nSore = 0, nSleepQ = 0, nCap = 0;
  let nSleep = 0, nRhr = 0, nHrv = 0;

  const thr = cfg.thresholdPem ? { rollingDays: 2, thetaZ: 1.4, gain: 2.6 } : null;

  for (let t = 0; t < N; t++) {
    const date = addDays(cfg.startDate, t);
    const weekend = isWeekend(date);

    // ---- Step 1: symptoms (morning of day t) ----
    // depend on YESTERDAY's loads (already finalised) + threshold PEM from
    // exertion on the prior 1-2 days + last night's sleep.
    nFat = ar1Step(nFat, PHI.fatigueNoise, g);
    nPem = ar1Step(nPem, PHI.pemNoise, g);
    nChest = ar1Step(nChest, PHI.chestNoise, g);
    nBrain = ar1Step(nBrain, PHI.brainNoise, g);
    nSore = ar1Step(nSore, PHI.soreNoise, g);
    nSleepQ = ar1Step(nSleepQ, PHI.sleepNoise, g);
    nCap = ar1Step(nCap, PHI.capNoise, g);

    const meetY1 = t >= 1 ? meeting[t - 1] : 0; // H1
    const physY1 = t >= 1 ? physical[t - 1] : 0;
    const physY2 = t >= 2 ? physical[t - 2] : 0;
    const alcY1 = t >= 1 ? (alcoholUnits[t - 1] || 0) / 2.5 : 0; // ~z
    const sinusToday = t >= 1 ? sinus[t - 1] : 0; // evening-before sinus -> tonight's sleep
    const lowSleepQualY1 = t >= 1 ? -sleepQualL[t - 1] : 0; // poor sleep quality last night -> worse today (H2)

    // threshold PEM: rolling exertion over the prior `rollingDays`
    let pemThresholdBoost = 0;
    let underRecovery = 0; // shared signature: RHR up / HRV down / temp up on crash
    if (thr) {
      let roll = 0;
      for (let k = 1; k <= thr.rollingDays; k++) roll += t >= k ? physical[t - k] : 0;
      const excess = roll - thr.thetaZ;
      if (excess > 0) {
        pemThresholdBoost = s * thr.gain * excess;
        underRecovery = s * 0.9 * excess;
      }
    }

    fatigueL[t] =
      0.6 * nFat +
      s * 0.35 * meetY1 + // H1
      s * 0.25 * lowSleepQualY1 + // H2
      s * 0.20 * pemThresholdBoost;
    pemL[t] =
      0.5 * nPem +
      s * 0.25 * meetY1 + // H1
      pemThresholdBoost + // H5 (nonlinear)
      s * 0.20 * lowSleepQualY1; // H2
    chestL[t] = 0.7 * nChest + s * 0.15 * pemThresholdBoost;
    brainL[t] = 0.7 * nBrain + s * 0.20 * meetY1;
    soreL[t] = 0.7 * nSore + s * 0.30 * physY1 + s * 0.20 * physY2; // H5 linear bit
    // sleep quality (morning report of last night): hurt by alcohol & sinus (H3)
    sleepQualL[t] = 0.6 * nSleepQ - s * 0.40 * alcY1 - s * 0.45 * sinusToday;
    sinusSymptomL[t] = sinusToday + 0.3 * g(); // morning stuffiness tracks env
    capL[t] = 0.6 * nCap - 0.5 * fatigueL[t] - 0.4 * pemL[t]; // inverse of symptoms

    // ---- Step 2: loads (during day t) ----
    nMeet = ar1Step(nMeet, PHI.meeting, g);
    nPhys = ar1Step(nPhys, PHI.physical, g);
    nStress = ar1Step(nStress, PHI.stress, g);
    nSinus = ar1Step(nSinus, PHI.sinus, g);

    const weekdayMeet = weekend ? -0.8 : 0.4; // meetings cluster on weekdays
    // reverse causation: feel bad this morning -> do less today (a real trap)
    const burden = (fatigueL[t] + pemL[t] + chestL[t]) / 3;
    const rc = cfg.reverseCausation ? -0.55 * burden : 0;

    meeting[t] = nMeet + weekdayMeet + rc * 0.6;
    physical[t] = nPhys + rc; // strongest reverse-causation channel
    stress[t] = nStress + (weekend ? -0.2 : 0.2) + rc * 0.3;
    sinus[t] = nSinus;

    // alcohol: more likely at weekends; units if present
    const pAlc = weekend ? 0.5 : 0.18;
    const drank = rng() < pAlc;
    alcoholUnits[t] = drank ? clamp(1 + Math.floor(rng() * 4) + rng(), 0.5, 6) : 0;
    lateCaf[t] = rng() < 0.2 ? 1 : 0;
    lateMeal[t] = rng() < 0.3 ? 1 : 0;

    // ---- Step 3: wearables (night ending morning t, activity during t) ----
    nSleep = ar1Step(nSleep, PHI.rhrNoise, g);
    nRhr = ar1Step(nRhr, PHI.rhrNoise, g);
    nHrv = ar1Step(nHrv, PHI.hrvNoise, g);

    // total sleep hurt by last night's alcohol / late caffeine
    totalSleepL[t] =
      0.7 * nSleep -
      s * 0.45 * alcY1 - // H4
      s * 0.20 * (t >= 1 ? lateCaf[t - 1] : 0);
    // resting HR up / HRV down with alcohol and under-recovery (H4 + crash signature)
    rhrL[t] = 0.7 * nRhr + s * 0.40 * alcY1 + 0.9 * underRecovery;
    hrvL[t] =
      0.5 * nHrv + // already jumpy
      0.6 * g() * 0.6 - // extra single-night noise: HRV is the least reliable signal
      s * 0.35 * alcY1 -
      0.9 * underRecovery;
    tempDevL[t] = 0.3 * g() + 0.7 * underRecovery;
  }

  // -------- map latent -> display rows --------
  const symptoms: SymptomRow[] = [];
  const loads: LoadRow[] = [];
  const wearables: WearableRow[] = [];

  for (let t = 0; t < N; t++) {
    const date = addDays(cfg.startDate, t);

    const fatigue = roundClamp(5 + 2 * fatigueL[t], 0, 10);
    const pem = roundClamp(3 + 2 * pemL[t], 0, 10);
    const chest = roundClamp(3 + 1.6 * chestL[t], 0, 10);
    const sore = roundClamp(3 + 1.6 * soreL[t], 0, 10);
    const brain = roundClamp(4 + 2 * brainL[t], 0, 10);
    const sinusSym = roundClamp(3 + 2 * sinusSymptomL[t], 0, 10);
    const sleepQ = roundClamp(6 + 2 * sleepQualL[t], 0, 10);
    const capacity = roundClamp(6 + 2 * capL[t], 0, 10);

    const phys = roundClamp(1.5 + 1.0 * physical[t], 0, 3);
    const meet = roundClamp(1.5 + 1.0 * meeting[t], 0, 3);
    const stressD = roundClamp(1.5 + 1.0 * stress[t], 0, 3);
    const env = roundClamp(1.0 + 1.0 * sinus[t], 0, 3);
    const pacing = roundClamp(2.0 - 0.7 * physical[t] + 0.5 * g() * 0, 0, 3); // better pacing when load lower
    const talking = Math.max(0, Math.round(meet * 45 + 15 * (meeting[t]) + 10));

    const totalSleep = roundClamp(420 + 50 * totalSleepL[t], 240, 600);
    const eff = clamp(0.9 + 0.04 * totalSleepL[t], 0.7, 0.99);
    const wake = Math.round((totalSleep / eff) - totalSleep);
    const rhr = Math.round((58 + 4 * rhrL[t]) * 10) / 10;
    const hrv = Math.round(clamp(45 + 12 * hrvL[t], 10, 110) * 10) / 10;
    const resp = Math.round((15 + 0.8 * (-hrvL[t] * 0.3 + 0.3 * g())) * 10) / 10;
    const spo2 = Math.round(clamp(97 + 0.8 * g() - 0.4 * Math.max(0, tempDevL[t]), 92, 100) * 10) / 10;
    const tempDev = Math.round((0.0 + 0.25 * tempDevL[t]) * 100) / 100;
    const steps = roundClamp(6000 + 2500 * physical[t] + 600 * g(), 0, 20000);
    const active = roundClamp(35 + 18 * physical[t] + 5 * g(), 0, 240);
    const sedentary = roundClamp(700 - active - 0.02 * steps, 200, 900);

    // sleep_start / sleep_end timestamps
    const bedHour = 23.5 + 0.4 * g();
    const startDt = new Date(date + "T00:00:00Z");
    startDt.setUTCDate(startDt.getUTCDate() - 1);
    startDt.setUTCHours(Math.floor(bedHour), Math.round((bedHour % 1) * 60), 0, 0);
    const endDt = new Date(startDt.getTime() + (totalSleep + wake) * 60000);

    // ---- notes (for the 4b tagging layer) ----
    let notesSym = "";
    let notesLoad = "";
    if (cfg.emitNotes) {
      const bits: string[] = [];
      if (pem >= 7) bits.push("crashed hard today, flat on the sofa, brain like soup");
      else if (fatigue >= 7) bits.push("running on empty, heavy limbs all morning");
      if (chest >= 6) bits.push("chest felt tight and heavy");
      if (sinusSym >= 6) bits.push("sinuses blocked, stuffy and congested");
      if (brain >= 7) bits.push("couldn't focus, words wouldn't come");
      notesSym = bits.slice(0, 2).join("; ");

      const lb: string[] = [];
      if (meet >= 3) lb.push("back-to-back calls, did a lot of talking");
      if (phys >= 3) lb.push("overdid it — long walk plus chores");
      if (loadsAlcohol(alcoholUnits[t])) lb.push("had a couple of glasses of wine with dinner");
      if (pacing >= 3) lb.push("kept it slow and paced well");
      notesLoad = lb.slice(0, 2).join("; ");
    }

    symptoms.push({
      date,
      fatigue_score: fatigue,
      pem_score: pem,
      chest_heaviness_score: chest,
      muscle_soreness_score: sore,
      brain_fog_score: brain,
      sinus_congestion_score: sinusSym,
      subjective_sleep_quality: sleepQ,
      overall_capacity_score: capacity,
      notes: notesSym,
    });
    loads.push({
      date,
      physical_load_score: phys,
      meeting_load_score: meet,
      talking_minutes: talking,
      mental_stress_score: stressD,
      pacing_quality_score: pacing,
      environment_score: env,
      alcohol: alcoholUnits[t] > 0,
      alcohol_units: Math.round(alcoholUnits[t] * 10) / 10,
      late_caffeine: lateCaf[t] > 0,
      late_meal: lateMeal[t] > 0,
      notes: notesLoad,
    });
    wearables.push({
      date,
      source: "mock",
      total_sleep_minutes: totalSleep,
      sleep_start: startDt.toISOString(),
      sleep_end: endDt.toISOString(),
      wake_minutes: wake,
      sleep_efficiency: Math.round(eff * 1000) / 1000,
      resting_hr: rhr,
      hrv_rmssd: hrv,
      respiratory_rate: resp,
      spo2,
      temperature_deviation: tempDev,
      steps,
      active_minutes: active,
      sedentary_minutes: sedentary,
    });
  }

  // -------- missingness (drop days, keep calendar gaps) --------
  const missingDates: string[] = [];
  const keep = new Array(N).fill(true);
  let t = 0;
  while (t < N) {
    if (rng() < cfg.missingness.runProb) {
      const run = 1 + Math.floor(rng() * cfg.missingness.maxRun);
      for (let k = 0; k < run && t < N; k++, t++) keep[t] = false;
    } else {
      if (rng() < cfg.missingness.prob) keep[t] = false;
      t++;
    }
  }
  for (let i = 0; i < N; i++) if (!keep[i]) missingDates.push(addDays(cfg.startDate, i));

  const groundTruth: GroundTruth = {
    scenario: s === 0 ? "noise" : "causal",
    startDate: cfg.startDate,
    days: N,
    effectScale: s,
    reverseCausation: cfg.reverseCausation,
    thresholdPem: thr,
    edges:
      s === 0
        ? []
        : [
            { from: "meeting_load_score", to: "fatigue_score", lag: 1, beta: 0.35, kind: "linear", note: "H1" },
            { from: "meeting_load_score", to: "pem_score", lag: 1, beta: 0.25, kind: "linear", note: "H1" },
            { from: "subjective_sleep_quality", to: "fatigue_score", lag: 1, beta: -0.25, kind: "linear", note: "H2 (better sleep -> less fatigue)" },
            { from: "environment_score", to: "subjective_sleep_quality", lag: 1, beta: -0.45, kind: "linear", note: "H3" },
            { from: "alcohol_units", to: "resting_hr", lag: 1, beta: 0.40, kind: "linear", note: "H4" },
            { from: "alcohol_units", to: "hrv_rmssd", lag: 1, beta: -0.35, kind: "linear", note: "H4" },
            { from: "alcohol_units", to: "total_sleep_minutes", lag: 1, beta: -0.45, kind: "linear", note: "H4" },
            { from: "physical_load_score", to: "pem_score", lag: 1, beta: 0, kind: "threshold", note: "H5 (envelope breach)" },
          ],
    placeboPairs: [
      { from: "brain_fog_score", to: "steps", lag: 1 },
      { from: "chest_heaviness_score", to: "meeting_load_score", lag: 2 },
      { from: "spo2", to: "muscle_soreness_score", lag: 1 },
      { from: "late_meal", to: "brain_fog_score", lag: 1 },
    ],
    missingDates,
  };

  return {
    symptoms: symptoms.filter((_, i) => keep[i]),
    loads: loads.filter((_, i) => keep[i]),
    wearables: wearables.filter((_, i) => keep[i]),
    groundTruth,
  };
}

function loadsAlcohol(units: number): boolean {
  return units > 0;
}

// ============================================================================
// Scenario presets
// ============================================================================

export function realistic(days = 180, seed = 7): Dataset {
  return generate({
    days,
    seed,
    startDate: "2025-09-01",
    effectScale: 1,
    reverseCausation: true,
    thresholdPem: true,
    missingness: { prob: 0.06, runProb: 0.015, maxRun: 4 },
    emitNotes: true,
  });
}

export function noiseOnly(days = 180, seed = 42): Dataset {
  return generate({
    days,
    seed,
    startDate: "2025-09-01",
    effectScale: 0, // NO causal edges, NO threshold PEM
    reverseCausation: false,
    thresholdPem: false,
    missingness: { prob: 0.06, runProb: 0.015, maxRun: 4 },
    emitNotes: true,
  });
}

/** A clean single-edge dataset for the "must recover injected lag" test. */
export function knownLag(opts?: { days?: number; seed?: number }): Dataset {
  const ds = generate({
    days: opts?.days ?? 240,
    seed: opts?.seed ?? 11,
    startDate: "2025-09-01",
    effectScale: 1,
    reverseCausation: false, // isolate the forward effects
    thresholdPem: true, // include the H5 envelope-breach edge
    missingness: { prob: 0, runProb: 0, maxRun: 0 },
    emitNotes: false,
  });
  return ds;
}

// ============================================================================
// CSV output (column names match the Supabase schema for Slice 3 import)
// ============================================================================

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const str = String(v);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}
function toCSV<T extends object>(rows: T[]): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const head = cols.join(",");
  const body = rows.map((r) => cols.map((c) => csvCell((r as Record<string, unknown>)[c])).join(","));
  return [head, ...body].join("\n");
}
export function toCSVs(ds: Dataset): { symptoms: string; loads: string; wearables: string } {
  return {
    symptoms: toCSV(ds.symptoms),
    loads: toCSV(ds.loads),
    wearables: toCSV(ds.wearables),
  };
}

// ============================================================================
// Diagnostic helpers  (NOT the analysis engine — a sanity aid for the demo)
//   Show that naive lag-correlation invents associations on placebo pairs,
//   while controlling for the prior outcome value makes them disappear.
// ============================================================================

/** Build a calendar-aligned series (length = days) with null for missing days. */
function extractSeries(ds: Dataset, field: string): (number | null)[] {
  const { startDate, days } = ds.groundTruth;
  const map = new Map<string, number>();
  const scan = (rows: Record<string, unknown>[]) => {
    for (const r of rows) {
      if (field in r && typeof r[field] === "number") map.set(r["date"] as string, r[field] as number);
      if (field in r && typeof r[field] === "boolean") map.set(r["date"] as string, (r[field] ? 1 : 0));
    }
  };
  scan(ds.symptoms as unknown as Record<string, unknown>[]);
  scan(ds.loads as unknown as Record<string, unknown>[]);
  scan(ds.wearables as unknown as Record<string, unknown>[]);
  const out: (number | null)[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(startDate, i);
    out.push(map.has(d) ? (map.get(d) as number) : null);
  }
  return out;
}

export function pearson(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return NaN;
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { sx += x[i]; sy += y[i]; }
  const mx = sx / n, my = sy / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = x[i] - mx, b = y[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  return num / Math.sqrt(dx * dy);
}

/** Naive lag correlation: predictor[t-lag] vs outcome[t], complete pairs only. */
export function naiveLagCorrelation(ds: Dataset, predictor: string, outcome: string, lag: number): { r: number; n: number } {
  const p = extractSeries(ds, predictor);
  const o = extractSeries(ds, outcome);
  const xs: number[] = [], ys: number[] = [];
  for (let t = lag; t < o.length; t++) {
    const pv = p[t - lag], ov = o[t];
    if (pv !== null && ov !== null) { xs.push(pv); ys.push(ov); }
  }
  return { r: pearson(xs, ys), n: xs.length };
}

/** Tiny OLS via normal equations + Gaussian elimination. X includes intercept. */
function ols(y: number[], X: number[][]): number[] {
  const k = X[0].length;
  const XtX = Array.from({ length: k }, () => new Array(k).fill(0));
  const Xty = new Array(k).fill(0);
  for (let i = 0; i < y.length; i++) {
    for (let a = 0; a < k; a++) {
      Xty[a] += X[i][a] * y[i];
      for (let b = 0; b < k; b++) XtX[a][b] += X[i][a] * X[i][b];
    }
  }
  // solve XtX beta = Xty
  for (let col = 0; col < k; col++) {
    let piv = col;
    for (let r = col + 1; r < k; r++) if (Math.abs(XtX[r][col]) > Math.abs(XtX[piv][col])) piv = r;
    [XtX[col], XtX[piv]] = [XtX[piv], XtX[col]];
    [Xty[col], Xty[piv]] = [Xty[piv], Xty[col]];
    const d = XtX[col][col] || 1e-9;
    for (let r = 0; r < k; r++) {
      if (r === col) continue;
      const f = XtX[r][col] / d;
      for (let c = 0; c < k; c++) XtX[r][c] -= f * XtX[col][c];
      Xty[r] -= f * Xty[col];
    }
  }
  return Xty.map((v, i) => v / (XtX[i][i] || 1e-9));
}

/** Slope of predictor[t-lag] after controlling for outcome[t-1].
 *  Inputs are z-scored so the slope is a standardized partial coefficient
 *  (comparable across pairs, on roughly the same scale as a correlation). */
export function priorControlledSlope(ds: Dataset, predictor: string, outcome: string, lag: number): { slope: number; n: number } {
  const p = extractSeries(ds, predictor);
  const o = extractSeries(ds, outcome);
  const rawP: number[] = [];
  const rawO: number[] = [];
  const rawPrev: number[] = [];
  for (let t = Math.max(lag, 1); t < o.length; t++) {
    const pv = p[t - lag], ov = o[t], oPrev = o[t - 1];
    if (pv !== null && ov !== null && oPrev !== null) {
      rawP.push(pv); rawO.push(ov); rawPrev.push(oPrev);
    }
  }
  if (rawO.length < 10) return { slope: NaN, n: rawO.length };
  const z = (a: number[]): number[] => {
    const m = a.reduce((s, v) => s + v, 0) / a.length;
    const sd = Math.sqrt(a.reduce((s, v) => s + (v - m) * (v - m), 0) / a.length) || 1e-9;
    return a.map((v) => (v - m) / sd);
  };
  const zP = z(rawP), zO = z(rawO), zPrev = z(rawPrev);
  const X = zO.map((_, i) => [1, zP[i], zPrev[i]]);
  const beta = ols(zO, X);
  return { slope: beta[1], n: zO.length };
}

// ============================================================================
// CLI
// ============================================================================

function fmt(x: number, p = 3): string {
  if (Number.isNaN(x)) return "  n/a";
  const s = x.toFixed(p);
  return (x >= 0 ? " " : "") + s;
}

function runCli(): void {
  const arg = (process.argv[2] || "realistic").toLowerCase();
  const ds = arg.startsWith("noise") ? noiseOnly() : arg.startsWith("known") ? knownLag() : realistic();
  const gt = ds.groundTruth;

  console.log(`\n=== Synthetic dataset: ${arg} ===`);
  console.log(`days=${gt.days}  emitted=${ds.symptoms.length}  missing=${gt.missingDates.length}  reverseCausation=${gt.reverseCausation}  thresholdPEM=${gt.thresholdPem ? "on" : "off"}`);

  // descriptive sanity
  const fat = ds.symptoms.map((r) => r.fatigue_score);
  const pem = ds.symptoms.map((r) => r.pem_score);
  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  const crashes = pem.filter((v) => v >= 7).length;
  console.log(`fatigue mean=${mean(fat).toFixed(2)}  pem mean=${mean(pem).toFixed(2)}  crash-days(pem>=7)=${crashes}`);

  // autocorrelation check (lag-1 of fatigue) — should be clearly > 0
  const fatSeries = extractSeries(ds, "fatigue_score").filter((v): v is number => v !== null);
  const r1 = pearson(fatSeries.slice(1), fatSeries.slice(0, -1));
  console.log(`fatigue lag-1 autocorrelation = ${r1.toFixed(3)}  (this is why naive correlation is dangerous)`);

  console.log(`\n--- TRUE edges (ground truth) : naive r  vs  prior-controlled slope ---`);
  for (const e of gt.edges) {
    const nv = naiveLagCorrelation(ds, e.from, e.to, e.lag);
    const cv = priorControlledSlope(ds, e.from, e.to, e.lag);
    console.log(`  ${e.note?.padEnd(22) ?? ""} ${e.from} (t-${e.lag}) -> ${e.to}`);
    console.log(`      naive r=${fmt(nv.r)} (n=${nv.n})   controlled slope=${fmt(cv.slope)} (n=${cv.n})`);
  }

  console.log(`\n--- PLACEBO pairs (no true edge) : naive r  vs  prior-controlled slope ---`);
  for (const pp of gt.placeboPairs) {
    const nv = naiveLagCorrelation(ds, pp.from, pp.to, pp.lag);
    const cv = priorControlledSlope(ds, pp.from, pp.to, pp.lag);
    const flag = Math.abs(nv.r) > 0.12 ? "  <- naive sees a 'pattern'" : "";
    console.log(`  ${pp.from} (t-${pp.lag}) -> ${pp.to}`);
    console.log(`      naive r=${fmt(nv.r)} (n=${nv.n})   controlled slope=${fmt(cv.slope)} (n=${cv.n})${flag}`);
  }

  // The reverse-causation trap: same-day load vs symptoms. Feeling bad ->
  // doing less makes naive SAME-DAY correlation NEGATIVE, which a careless
  // analyst reads as "activity protects me." This is why the engine bans
  // same-day load->symptom as evidence and only trusts lagged effects.
  if (gt.reverseCausation) {
    const sameDay = naiveLagCorrelation(ds, "physical_load_score", "fatigue_score", 0);
    const lagged = naiveLagCorrelation(ds, "physical_load_score", "pem_score", 1);
    console.log(`\n--- Reverse-causation trap (why same-day is banned) ---`);
    console.log(`  physical_load (t-0) -> fatigue : naive r=${fmt(sameDay.r)}  <- misleadingly NEGATIVE (do less when ill)`);
    console.log(`  physical_load (t-1) -> pem      : naive r=${fmt(lagged.r)}  <- the real, lagged effect`);
  }

  // write files
  const outDir = "./synthetic-sample";
  mkdirSync(outDir, { recursive: true });
  const csvs = toCSVs(ds);
  writeFileSync(`${outDir}/daily_symptoms.csv`, csvs.symptoms);
  writeFileSync(`${outDir}/daily_loads.csv`, csvs.loads);
  writeFileSync(`${outDir}/wearable_daily_metrics.csv`, csvs.wearables);
  writeFileSync(`${outDir}/ground_truth.json`, JSON.stringify(gt, null, 2));
  console.log(`\nWrote CSVs + ground_truth.json to ${outDir}/\n`);
}

// run only when executed directly
const isMain = (() => {
  try {
    return import.meta.url === `file://${process.argv[1]}`;
  } catch {
    return false;
  }
})();
if (isMain) runCli();
