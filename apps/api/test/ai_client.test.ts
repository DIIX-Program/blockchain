import { spawn } from 'node:child_process';
import { before, after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { aiClient, toAlertPayload } from '../src/lib/ai';
import type { TelemetryReading, PredictionResult } from '../src/lib/ai';

// DB-free integration test: starts the AI anomaly-detection service
// (services/ai/.venv) and exercises the real backend TypeScript client
// (`lib/ai.ts`) against its HTTP endpoints. No PostgreSQL required — the AI
// service trains/loads its Isolation Forest in memory.

const AI_DIR = path.resolve(__dirname, '../../../services/ai');
const VENV_PY = path.join(AI_DIR, '.venv', 'bin', 'python');
const AI_URL = 'http://127.0.0.1:8000';

let svc: ReturnType<typeof spawn> | null = null;
let logs = '';

async function waitForService(timeoutMs = 45000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${AI_URL}/health`);
      if (res.ok) return;
    } catch {
      // service not ready yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`AI service did not start within ${timeoutMs}ms.\nlogs:\n${logs.slice(-1500)}`);
}

describe('Task 07 — AI service client (lib/ai.ts)', { concurrency: false }, () => {
  before(async () => {
    svc = spawn(
      VENV_PY,
      ['-m', 'uvicorn', 'app.main:app', '--port', '8000', '--host', '127.0.0.1'],
      { cwd: AI_DIR, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    svc.stdout?.on('data', (d) => {
      logs += d.toString();
    });
    svc.stderr?.on('data', (d) => {
      logs += d.toString();
    });
    await waitForService();
  });

  after(() => {
    if (svc) svc.kill();
  });

  it('getModelInfo reports a trained isolation_forest', async () => {
    const info = await aiClient.getModelInfo();
    assert.equal(info.trained, true);
    assert.equal(info.type, 'isolation_forest');
    assert.ok(info.artifactPath, 'model artifact path should be reported');
  });

  it('predict parses a normal reading without rule violations', async () => {
    const reading: TelemetryReading = {
      batchId: '123e4567-e89b-12d3-a456-426614174000',
      deviceId: 'd-1',
      sequenceNumber: 1,
      recordedAt: '2026-10-17T12:00:00.000Z',
      temperatureC: 4.2,
      humidityPercent: 50,
      latitude: 21.0,
      longitude: 105.8,
      isSimulated: true,
    };
    const res: PredictionResult = await aiClient.predict(reading);
    assert.equal(typeof res.isAnomaly, 'boolean');
    assert.equal(Array.isArray(res.ruleViolations), true);
    assert.equal(Array.isArray(res.flags), true);
    assert.ok(typeof res.score === 'number' || res.score === null);
    // 4.2 C / 50 % humidity are within the cold-chain envelope → no violations.
    assert.equal(res.ruleViolations.length, 0);
  });

  it('predict flags an out-of-envelope reading (99 C) as anomalous', async () => {
    const reading: TelemetryReading = {
      batchId: '123e4567-e89b-12d3-a456-426614174000',
      deviceId: 'dev-1',
      sequenceNumber: 2,
      recordedAt: '2026-10-17T12:01:00.000Z',
      temperatureC: 99,
      humidityPercent: 50,
      latitude: 21.0,
      longitude: 105.8,
      isSimulated: true,
    };
    const res = await aiClient.predict(reading);
    assert.equal(res.isAnomaly, true);
    assert.ok(res.ruleViolations.length > 0, 'rule engine should fire for temp > 50 C');
    assert.ok(res.flags.length > 0);
  });

  it('toAlertPayload converts IF/rule signals into an alert row payload', () => {
    const reading: TelemetryReading = {
      batchId: 'b-1',
      deviceId: 'd-1',
      sequenceNumber: 1,
      recordedAt: '2026-10-17T12:00:00.000Z',
      temperatureC: 4.2,
      humidityPercent: 50,
      isSimulated: true,
    };
    const result: PredictionResult = {
      isAnomaly: true,
      score: -0.5,
      ruleViolations: [
        { code: 'TEMP_ABOVE_MAX', severity: 'critical', message: 'temperature exceeds max' },
      ],
      flags: [
        {
          source: 'rule_engine',
          code: 'TEMP_ABOVE_MAX',
          severity: 'critical',
          message: 'temperature exceeds max',
          score: -0.5,
        },
      ],
      features: { temperatureC: 4.2 },
    };
    const payload = toAlertPayload(reading, result);
    assert.equal(payload.severity, 'critical');
    assert.equal(payload.ruleViolated, 'TEMP_ABOVE_MAX');
    assert.ok(payload.explanation.includes('TEMP_ABOVE_MAX'));
    assert.equal(payload.anomalyScore, -0.5);
  });
});
