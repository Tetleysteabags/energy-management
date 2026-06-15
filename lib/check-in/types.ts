/** Symptom / capacity sliders: 0–10. Loads: 0–3 (None → Heavy). */

export type MorningCheckInValues = {
  sleepQuality: number;
  sleepHours: number | null;
  restedScore: number;
  morningFatigue: number;
  morningBrainFog: number;
  morningPain: number;
  morningDysautonomia: number;
};

export type EveningCheckInValues = {
  physicalLoad: number;
  cognitiveLoad: number;
  socialLoad: number;
  capacity: number;
  eveningFatigue: number;
  eveningBrainFog: number;
  eveningPain: number;
  pem: number;
  alcohol: boolean;
  alcoholUnits: number;
  lateCaffeine: boolean;
  lateMeal: boolean;
  notes: string;
};

export const DEFAULT_MORNING: MorningCheckInValues = {
  sleepQuality: 5,
  sleepHours: null,
  restedScore: 5,
  morningFatigue: 4,
  morningBrainFog: 4,
  morningPain: 2,
  morningDysautonomia: 2,
};

export const DEFAULT_EVENING: EveningCheckInValues = {
  physicalLoad: 1,
  cognitiveLoad: 1,
  socialLoad: 0,
  capacity: 5,
  eveningFatigue: 4,
  eveningBrainFog: 4,
  eveningPain: 2,
  pem: 2,
  alcohol: false,
  alcoholUnits: 0,
  lateCaffeine: false,
  lateMeal: false,
  notes: "",
};
