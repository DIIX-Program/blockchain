#!/usr/bin/env node
/**
 * IoT Telemetry Simulator — entry point.
 *
 * Reads configuration from environment variables, generates reproducible
 * telemetry for the configured scenarios, and POSTs each reading to the
 * backend ingestion endpoint (SIMULATOR_API_URL).
 *
 * Env vars:
 *   SIMULATOR_API_URL               Ingestion endpoint (default: http://localhost:4000/api/v1/sensors/telemetry)
 *   SIMULATOR_BATCH_ID              UUID of an existing batch (required)
 *   SIMULATOR_DEVICE_ID             UUID of an existing device (required)
 *   SIMULATOR_SEED                  Base PRNG seed (default: 42)
 *   SIMULATOR_INTERVAL_MS           Cadence between readings (default: 5000)
 *   SIMULATOR_READINGS_PER_SCENARIO Readings to emit per scenario pass (default: 24)
 *   SIMULATOR_SCENARIOS             Comma-separated subset (default: all 6)
 *   SIMULATOR_START_SEQUENCE        First sequenceNumber to emit (default: 0)
 *   SIMULATOR_ONCE                  If "true", run one pass and exit (default: loop)
 */
import dotenv from 'dotenv';
dotenv.config();

import { SCENARIOS, generateScenario, type Reading, type Scenario } from './scenarios';
import { TelemetryClient } from './telemetryClient';

interface SimEnv {
  apiUrl: string;
  batchId: string;
  deviceId: string;
  seed: number;
  intervalMs: number;
  perScenario: number;
  scenarios: Scenario[];
  startSequence: number;
  once: boolean;
}

function loadEnv(): SimEnv {
  const apiUrl =
    process.env.SIMULATOR_API_URL ||
    'http://localhost:4000/api/v1/sensors/telemetry';
  const batchId = process.env.SIMULATOR_BATCH_ID || '';
  const deviceId = process.env.SIMULATOR_DEVICE_ID || '';
  const seed = Number(process.env.SIMULATOR_SEED ?? 42);
  const intervalMs = Number(process.env.SIMULATOR_INTERVAL_MS ?? 5000);
  const perScenario = Number(process.env.SIMULATOR_READINGS_PER_SCENARIO ?? 24);
  const scenarios = (
    process.env.SIMULATOR_SCENARIOS ||
    SCENARIOS.join(',')
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as Scenario[];
  return {
    apiUrl,
    batchId,
    deviceId,
    seed,
    intervalMs,
    perScenario,
    scenarios,
    startSequence: Number(process.env.SIMULATOR_START_SEQUENCE ?? 0),
    once: /^true|1|yes$/i.test(process.env.SIMULATOR_ONCE ?? 'false'),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const env = loadEnv();
  const client = new TelemetryClient(env.apiUrl);

  if (!env.batchId || !env.deviceId) {
    console.error(
      '✗ SIMULATOR_BATCH_ID and SIMULATOR_DEVICE_ID (UUIDs of an existing batch & device) must be set.',
    );
    console.error('  Example: SIMULATOR_BATCH_ID=<batch-uuid> SIMULATOR_DEVICE_ID=<device-uuid> npm start');
    process.exit(1);
  }
  for (const s of env.scenarios) {
    if (!SCENARIOS.includes(s)) {
      console.error(`✗ Unknown scenario "${s}". Available: ${SCENARIOS.join(', ')}`);
      process.exit(1);
    }
  }

  console.log(
    `📡 [IoT Simulator] target=${env.apiUrl} seed=${env.seed} scenarios=[${env.scenarios.join(',')}] interval=${env.intervalMs}ms/count=${env.perScenario}`,
  );

  let seq = env.startSequence;
  let tsBase = Date.now();

  while (true) {
    for (const scenario of env.scenarios) {
      const readings: Reading[] = generateScenario(scenario, {
        batchId: env.batchId,
        deviceId: env.deviceId,
        seed: env.seed + seq,
        count: env.perScenario,
        startSequenceNumber: seq,
        startAt: new Date(tsBase),
        intervalMs: env.intervalMs,
      });
      seq += readings.length;
      tsBase += readings.length * env.intervalMs;

      for (const r of readings) {
        const res = await client.post(r);
        if (!res.accepted) {
          console.warn(
            `⚠ POST failed [${res.outcome}] ${res.status} ${res.statusText} seq=${r.sequenceNumber}`,
          );
        } else {
          console.log(
            `→ ${scenario.padEnd(10)} seq=${r.sequenceNumber
              .toString()
              .padStart(4)} temp=${r.temperatureC.toString().padStart(5)}°C hum=${r.humidityPercent
              ? r.humidityPercent.toString().padStart(3)
              : 'n/a'}% [${res.outcome}]`,
          );
        }
        await sleep(env.intervalMs);
      }
    }

    if (env.once) {
      console.log('🏁 SIMULATOR_ONCE set — one pass complete, exiting.');
      break;
    }
    console.log(`⏱ waiting ${env.intervalMs}ms before next cycle...`);
    await sleep(env.intervalMs);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
