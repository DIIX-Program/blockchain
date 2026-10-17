import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS, generateScenario, createRng, type Scenario, type Reading } from './scenarios';

// DB-free unit tests for the deterministic scenario generators.

const BATCH_ID = '123e4567-e89b-12d3-a456-426614174000';
const DEVICE_ID = 'aaaa1111-2222-3333-4444-555555555555';
const START = new Date('2026-10-17T12:00:00.000Z');
const INTERVAL = 300_000; // 5 minutes

const baseOpts = {
  batchId: BATCH_ID,
  deviceId: DEVICE_ID,
  seed: 42,
  count: 24,
  startSequenceNumber: 0,
  startAt: START,
  intervalMs: INTERVAL,
  latitude: 21.0285,
  longitude: 105.8172,
};

function temps(r: Reading[]) {
  return r.map((x) => x.temperatureC);
}
function hums(r: Reading[]) {
  return r.map((x) => x.humidityPercent).filter((h): h is number => h !== null);
}
function minMax(r: Reading[]) {
  return { min: Math.min(...temps(r)), max: Math.max(...temps(r)) };
}

describe('Task 04 — IoT simulator scenarios', () => {
  for (const scenario of SCENARIOS) {
    describe(`scenario "${scenario}"`, () => {
      test('generates the requested number of readings', () => {
        assert.equal(generateScenario(scenario, baseOpts).length, 24);
      });

      test('produces structurally valid readings', () => {
        const readings = generateScenario(scenario, baseOpts);
        for (const r of readings) {
          assert.equal(r.batchId, BATCH_ID);
          assert.equal(r.deviceId, DEVICE_ID);
          assert.equal(typeof r.sequenceNumber, 'number');
          // valid ISO datetime
          assert.equal(new Date(r.recordedAt).toISOString(), r.recordedAt);
          assert.equal(typeof r.temperatureC, 'number');
          assert.equal(typeof r.latitude, 'number');
          assert.equal(typeof r.longitude, 'number');
          assert.equal(r.isSimulated, true);
        }
      });

      test('sequence numbers are contiguous and start at startSequenceNumber', () => {
        const readings = generateScenario(scenario, { ...baseOpts, startSequenceNumber: 100 });
        for (let i = 0; i < readings.length; i++) {
          assert.equal(readings[i].sequenceNumber, 100 + i);
        }
      });

      test('recordedAt increments by intervalMs', () => {
        const readings = generateScenario(scenario, baseOpts);
        for (let i = 1; i < readings.length; i++) {
          const prev = new Date(readings[i - 1].recordedAt).getTime();
          const cur = new Date(readings[i].recordedAt).getTime();
          assert.equal(cur - prev, INTERVAL);
        }
      });

      test('is fully reproducible (same seed → identical output)', () => {
        const a = generateScenario(scenario, baseOpts);
        const b = generateScenario(scenario, baseOpts);
        assert.deepEqual(a, b);
      });

      test('changes with a different seed', () => {
        const a = generateScenario(scenario, baseOpts);
        const b = generateScenario(scenario, { ...baseOpts, seed: 999 });
        assert.notDeepEqual(a, b);
      });

      test('envelope matches the scenario profile', () => {
        const r = generateScenario(scenario, { ...baseOpts, count: 40 });
        const { min, max } = minMax(r);
        switch (scenario) {
          case 'normal':
            // Stable vaccine cold chain: 2–8 °C.
            assert.ok(min >= 2 && max <= 8, `normal temp out of envelope [${min}, ${max}]`);
            assert.ok(Math.min(...hums(r)) >= 45 && Math.max(...hums(r)) <= 55);
            break;
          case 'excursion':
            // Ramps toward ~25 °C by the end.
            assert.ok(max > 20, `excursion max too low: ${max}`);
            break;
          case 'freeze':
            // Ends below 0 °C.
            assert.ok(min < 0, `freeze min not below 0: ${min}`);
            break;
          case 'humidity': {
            const h = hums(r);
            assert.ok(Math.max(...h) > 90, `humidity spike not reached: ${Math.max(...h)}`);
            break;
          }
          case 'shock':
            // Oscillating profile must show wide swing.
            assert.ok(max - min > 10, `shock swing too small: ${max - min}`);
            break;
          case 'ambient':
            // Warm chain, above refrigeration range.
            assert.ok(min > 18 && max < 22, `ambient temp out of envelope [${min}, ${max}]`);
            break;
        }
      });
    });
  }

  test('createRng is deterministic for the same seed', () => {
    const a = createRng(7);
    const b = createRng(7);
    for (let i = 0; i < 200; i++) {
      assert.equal(a(), b());
    }
    assert.notEqual(createRng(7)(), createRng(8)());
  });

  test('generateScenario throws on an unknown scenario', () => {
    assert.throws(() => generateScenario('bogus' as Scenario, baseOpts));
  });

  test('empty count yields no readings', () => {
    for (const s of SCENARIOS) {
      assert.equal(generateScenario(s, { ...baseOpts, count: 0 }).length, 0);
    }
  });
});
