import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { TelemetryClient } from './telemetryClient';
import type { Reading } from './scenarios';

// DB-free test: starts in-process HTTP echo servers (no backend/DB needed) and
// verifies the TelemetryClient POSTs well-formed JSON and parses responses.

let okServer: http.Server;
let okPort = 0;
let lastBody: unknown = null;
let lastMethod = '';
let lastUrl = '';

function sampleReading(): Reading {
  return {
    batchId: '123e4567-e89b-12d3-a456-426614174000',
    deviceId: 'aaaa1111-2222-3333-4444-555555555555',
    sequenceNumber: 7,
    recordedAt: '2026-10-17T12:00:00.000Z',
    temperatureC: 4.2,
    humidityPercent: 50,
    latitude: 21.0285,
    longitude: 105.8172,
    isSimulated: true,
  };
}

before(async () => {
  okServer = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      lastMethod = req.method ?? '';
      lastUrl = req.url ?? '';
      lastBody = body ? JSON.parse(body) : null;
      res.writeHead(201, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'INGESTED', message: 'ok', readingId: 'reading-123' }));
    });
  });
  await new Promise<void>((resolve) => okServer.listen(0, resolve));
  const addr = okServer.address();
  okPort = typeof addr === 'object' && addr ? addr.port : 0;
});

after(async () => {
  await new Promise<void>((resolve) => okServer.close(() => resolve()));
});

describe('Task 04 — TelemetryClient', () => {
  test('POSTs a well-formed reading and parses a 201 response', async () => {
    const client = new TelemetryClient(`http://127.0.0.1:${okPort}/api/v1/sensors/telemetry`);
    const reading = sampleReading();
    const res = await client.post(reading);

    assert.equal(res.accepted, true);
    assert.equal(res.status, 201);
    assert.equal(res.outcome, 'INGESTED');
    assert.equal(res.readingId, 'reading-123');
    assert.equal(res.message, 'ok');
    assert.equal(lastMethod, 'POST');
    assert.equal(lastUrl, '/api/v1/sensors/telemetry');
    assert.deepEqual(lastBody, reading);
  });

  test('reports a network error when the server is unreachable', async () => {
    // Reserve a port then close the server → guaranteed nothing listening.
    const tmp = http.createServer();
    await new Promise<void>((resolve) => tmp.listen(0, resolve));
    const port = (tmp.address() as { port: number }).port;
    await new Promise<void>((resolve) => tmp.close(() => resolve()));

    const client = new TelemetryClient(`http://127.0.0.1:${port}/api/v1/sensors/telemetry`);
    const res = await client.post(sampleReading());

    assert.equal(res.accepted, false);
    assert.equal(res.status, 0);
    assert.equal(res.outcome, 'ERROR');
    assert.ok(res.message, 'should surface an error message');
  });

  test('parses a non-2xx response as not accepted', async () => {
    const fail = http.createServer((_req, res) => {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'ERROR', message: 'not found' }));
    });
    await new Promise<void>((resolve) => fail.listen(0, resolve));
    const port = ((await fail.address?.()) as any)?.port ?? 0;
    try {
      const client = new TelemetryClient(`http://127.0.0.1:${port}/api/v1/sensors/telemetry`);
      const res = await client.post(sampleReading());
      assert.equal(res.accepted, false);
      assert.equal(res.status, 404);
      assert.equal(res.outcome, 'ERROR');
    } finally {
      await new Promise<void>((resolve) => fail.close(() => resolve()));
    }
  });
});
