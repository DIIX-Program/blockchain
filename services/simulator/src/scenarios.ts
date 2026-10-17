/**
 * IoT telemetry simulator for the Smart Cold-Chain system.
 *
 * Each scenario produces a deterministic stream of telemetry readings given a
 * seed, so a run can be reproduced exactly (for regression tests, fixture
 * generation, and audit replay). The generators are pure functions — no I/O,
 * no timers, no network — which keeps them trivially testable without a
 * running backend or database.
 */

export type Scenario = 'normal' | 'excursion' | 'freeze' | 'humidity' | 'shock' | 'ambient';

/** The six reproducible cold-chain disturbance scenarios. */
export const SCENARIOS: readonly Scenario[] = [
  'normal',
  'excursion',
  'freeze',
  'humidity',
  'shock',
  'ambient',
];

/** A telemetry reading, shaped to match the API `POST /sensors/telemetry` body. */
export interface Reading {
  batchId: string;
  deviceId: string;
  sequenceNumber: number;
  recordedAt: string;
  temperatureC: number;
  humidityPercent: number | null;
  latitude: number | null;
  longitude: number | null;
  isSimulated: boolean;
}

export interface ScenarioOptions {
  batchId: string;
  deviceId: string;
  /** Seed for the PRNG (reproducibility). */
  seed: number;
  /** Number of readings to generate. */
  count: number;
  /** Sequence number of the first reading in this batch (continuity across runs). */
  startSequenceNumber: number;
  /** Timestamp of the first reading. */
  startAt: Date;
  /** Spacing between readings, in milliseconds. */
  intervalMs: number;
  /** Baseline GPS location of the device (jittered per reading). */
  latitude?: number;
  longitude?: number;
}

/** A temperature/humidity profile for one scenario. Pure (only reads `rng`). */
type Profile = (
  i: number,
  count: number,
  rng: () => number,
) => { tempC: number; humidity: number | null };

/** mulberry32 — a tiny, deterministic, seedable PRNG (0..1). */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function round(v: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
}

/** Maps each scenario to a deterministic temperature/humidity profile. */
const PROFILES: Record<Scenario, Profile> = {
  // Stable vaccine cold chain: 2–8 °C, 45–55 % humidity.
  normal: (_i, _n, rng) => ({
    tempC: 5 + (rng() - 0.5) * 6, // 2..8
    humidity: 45 + rng() * 10,
  }),

  // Refrigeration failure: temperature ramps 5 → 25 °C over the run.
  excursion: (i, n, rng) => ({
    tempC: 5 + (i / (n - 1)) * 20 + (rng() - 0.5) * 0.6, // 5..25
    humidity: 45 + (rng() - 0.5) * 4,
  }),

  // Freezing risk: temperature ramps 5 → -1.5 °C.
  freeze: (i, n, rng) => ({
    tempC: 5 - (i / (n - 1)) * 6.5 + (rng() - 0.5) * 0.5, // 5..-1.5
    humidity: 48 + rng() * 6,
  }),

  // Humidity breach: condensation / moisture ingress, 50 → 98 %.
  humidity: (i, n, rng) => ({
    tempC: 5 + (rng() - 0.5) * 1, // stable
    humidity: 50 + (i / (n - 1)) * 48, // 50..98
  }),

  // Transit shock: aggressive oscillation ±8 °C around 5 °C.
  shock: (i, _n, rng) => ({
    tempC: 5 + Math.sin(i * 0.5) * 8 + (rng() - 0.5) * 2,
    humidity: 50 + (rng() - 0.5) * 6,
  }),

  // Warm-chain ambient exposure: 18–22 °C, 50–60 % humidity.
  ambient: (_i, _n, rng) => ({
    tempC: 20 + (rng() - 0.5) * 4, // 18..22
    humidity: 55 + (rng() - 0.5) * 10,
  }),
};

/**
 * Generate `count` deterministic readings for a scenario.
 * Same (scenario, opts) → identical output (reproducible).
 */
export function generateScenario(scenario: Scenario, opts: ScenarioOptions): Reading[] {
  if (!SCENARIOS.includes(scenario)) {
    throw new Error(`Unknown scenario: ${scenario}. Known: ${SCENARIOS.join(', ')}`);
  }
  if (opts.count <= 0) return [];

  const rng = createRng(opts.seed);
  const profile = PROFILES[scenario];
  const baseLat = opts.latitude ?? 21.0285;
  const baseLon = opts.longitude ?? 105.8172;
  const n = opts.count;

  const readings: Reading[] = [];
  for (let i = 0; i < n; i++) {
    const { tempC, humidity } = profile(i, n, rng);
    // ~10 m GPS jitter (deterministic per reading).
    const lat = round(baseLat + (rng() - 0.5) * 0.0001, 6);
    const lon = round(baseLon + (rng() - 0.5) * 0.0001, 6);
    const ts = new Date(opts.startAt.getTime() + i * opts.intervalMs);

    readings.push({
      batchId: opts.batchId,
      deviceId: opts.deviceId,
      sequenceNumber: opts.startSequenceNumber + i,
      recordedAt: ts.toISOString(),
      temperatureC: round(tempC, 2),
      humidityPercent: humidity === null ? null : round(humidity, 2),
      latitude: lat,
      longitude: lon,
      isSimulated: true,
    });
  }
  return readings;
}

export default {
  SCENARIOS,
  generateScenario,
  createRng,
};
