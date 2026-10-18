/**
 * E2E Integration Test — Tasks 09 & 11
 *
 * Spins up the three live services required for end-to-end verification:
 *   1. Hardhat in-memory EVM node (deploys ColdChainTracker)
 *   2. Python AI anomaly-detection service (FastAPI + uvicorn)
 *   3. Express API server (createApp) with config pointed at both
 *
 * Then exercises six E2E scenarios from task.md:
 *   A — Normal shipment: create batch → ingest readings → handover → anchor → verify
 *   B — Temperature excursion: ingest hot reading → AI alert persisted → dashboard-visible
 *   C — Tampered record: modify reading → on-chain verification returns MISMATCH
 *   D — Unauthorized access: wrong-role + unauthenticated → 403 / 401
 *   E — Service outage: AI service killed → telemetry still ingests (non-blocking)
 *   F — QR traceability: public batch endpoint returns consistent data + qrCodeUrl
 *
 * Prerequisites (must be running before this test):
 *   - PostgreSQL at localhost:5432 with coldchain_db seeded (prisma:seed)
 */
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import { before, after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Server } from 'http';
import fs from 'node:fs';
import path from 'node:path';
import { ethers } from 'ethers';
import { createApp } from '../src/app';
import { config } from '../src/config';

const CONTRACTS_DIR = path.resolve(__dirname, '../../../contracts');
const ARTIFACT_PATH = path.join(
  CONTRACTS_DIR,
  'artifacts/contracts/ColdChainTracker.sol/ColdChainTracker.json',
);
const HARDHAT_BIN = path.resolve(
  CONTRACTS_DIR,
  '../node_modules/hardhat/internal/cli/bootstrap.js',
);
const AI_DIR = path.resolve(__dirname, '../../../services/ai');
const VENV_PY =
  process.platform === 'win32'
    ? path.join(AI_DIR, '.venv', 'Scripts', 'python.exe')
    : path.join(AI_DIR, '.venv', 'bin', 'python');

const RPC_URL = 'http://127.0.0.1:8545';
const DEPLOYER_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

let hardhatNode: ChildProcessWithoutNullStreams | null = null;
let aiService: ChildProcessWithoutNullStreams | null = null;
let apiServer: Server | null = null;
let baseUrl: string;
let contractAddress: string;

// ---- Auth tokens (populated in before()) ----
let adminToken: string;
let producerToken: string;

async function waitForHttp(url: string, timeoutMs = 30000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not ready
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Service at ${url} did not become ready within ${timeoutMs}ms`);
}

async function login(email: string): Promise<string> {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123' }),
  });
  assert.equal(res.status, 200, `Login failed for ${email}`);
  const data = (await res.json()) as { token: string };
  return data.token;
}

// ---- Test data shared across scenarios ----
const unique = Date.now().toString();
const testBatchNumber = `E2E-BATCH-${unique}`;
const testDeviceCode = `E2E-DEV-${unique}`;

describe('E2E — Tasks 09 & 11 (Hardhat node + AI service + API)', { concurrency: false }, () => {
  before(async () => {
    // 1. Start Hardhat in-memory node
    if (!fs.existsSync(ARTIFACT_PATH)) {
      throw new Error(`Contract artifact not found. Run 'npx hardhat compile' in contracts/`);
    }

    hardhatNode = spawn(process.execPath, [HARDHAT_BIN, 'node'], {
      cwd: CONTRACTS_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, HARDHAT_NETWORK: 'hardhat' },
    });
    let nodeReady = false;
    const nodeCheck = async () => {
      try {
        const res = await fetch(RPC_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
        });
        if (res.ok) {
          const body = (await res.json()) as { result?: string };
          if (typeof body.result === 'string') nodeReady = true;
        }
      } catch {
        // not ready
      }
    };
    const nodeStart = Date.now();
    while (!nodeReady && Date.now() - nodeStart < 30000) {
      await nodeCheck();
      if (!nodeReady) await new Promise((r) => setTimeout(r, 300));
    }
    if (!nodeReady) throw new Error('Hardhat node failed to start');

    // Deploy ColdChainTracker
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(DEPLOYER_KEY, provider);
    const artifact = JSON.parse(fs.readFileSync(ARTIFACT_PATH, 'utf8'));
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    contractAddress = await contract.getAddress();

    // Wire config to point at the deployed contract + Hardhat node
    config.BLOCKCHAIN_RPC_URL = RPC_URL;
    config.CONTRACT_ADDRESS = contractAddress;
    config.DEPLOYER_PRIVATE_KEY = DEPLOYER_KEY;

    // 2. Start AI service
    aiService = spawn(
      VENV_PY,
      ['-m', 'uvicorn', 'app.main:app', '--port', '8000', '--host', '127.0.0.1'],
      { cwd: AI_DIR, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    await waitForHttp('http://127.0.0.1:8000/health', 45000);

    // 3. Start API server (createApp picks up config via the module-level singleton)
    const app = createApp();
    apiServer = app.listen(0);
    const address = apiServer.address();
    if (address && typeof address === 'object') {
      baseUrl = `http://localhost:${address.port}/api/v1`;
    }

    // 4. Get auth tokens
    adminToken = await login('admin@coldchain.internal');
    producerToken = await login('producer@vaxlab.com');

    // 5. Seed test batch + device (needed since seed is idempotent and may have been run)
    const { prisma } = await import('../src/lib/prisma');
    const prod = await prisma.product.findFirstOrThrow({ where: { sku: 'PROD-VAX-MRNA-01' } });
    const orgProd = await prisma.organization.findUniqueOrThrow({ where: { code: 'ORG-PROD-VAX' } });
    const orgCarrier = await prisma.organization.findUniqueOrThrow({ where: { code: 'ORG-CARRIER-01' } });

    // Create or reuse a test device
    await prisma.device.upsert({
      where: { deviceCode: testDeviceCode },
      create: {
        deviceCode: testDeviceCode,
        model: 'Simulated-Teltonika-TMT250-BLE',
        isSimulated: true,
        organizationId: orgCarrier.id,
      },
      update: { organizationId: orgCarrier.id },
    });
  });

  after(async () => {
    if (apiServer) await new Promise<void>((r) => apiServer!.close(() => r()));
    if (aiService) aiService.kill();
    if (hardhatNode) hardhatNode.kill();

    // Clean up test data
    const { prisma } = await import('../src/lib/prisma');
    await prisma.sensorReading.deleteMany({
      where: { batch: { batchNumber: testBatchNumber } },
    });
    await prisma.anomalyAlert.deleteMany({
      where: { batch: { batchNumber: testBatchNumber } },
    });
    await prisma.dataAnchor.deleteMany({
      where: { batch: { batchNumber: testBatchNumber } },
    });
    await prisma.supplyChainEvent.deleteMany({
      where: { batch: { batchNumber: testBatchNumber } },
    });
    await prisma.batch.deleteMany({ where: { batchNumber: testBatchNumber } });
    await prisma.device.deleteMany({ where: { deviceCode: testDeviceCode } });
    await prisma.$disconnect();
  });

  describe('Scenario A — Normal shipment lifecycle', () => {
    it('creates a batch, ingests telemetry, records handover, anchors, and verifies MATCH', async () => {
      const prod = await (await import('../src/lib/prisma')).prisma.product.findFirstOrThrow({
        where: { sku: 'PROD-VAX-MRNA-01' },
      });

      // 1. Create batch
      const createRes = await fetch(`${baseUrl}/batches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${producerToken}` },
        body: JSON.stringify({
          batchNumber: testBatchNumber,
          productId: prod.id,
          manufactureDate: '2026-10-17T08:00:00.000Z',
          expiryDate: '2027-04-15T08:00:00.000Z',
          quantity: 1000,
        }),
      });
      assert.equal(createRes.status, 201);
      const batchData = (await createRes.json()) as { batch: any };
      const batchId = batchData.batch.id;

      // 2. Ingest 3 compliant readings
      const device = await (await import('../src/lib/prisma')).prisma.device.findUniqueOrThrow({
        where: { deviceCode: testDeviceCode },
      });
      for (let i = 0; i < 3; i++) {
        const res = await fetch(`${baseUrl}/sensors/telemetry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batchId,
            deviceId: device.id,
            sequenceNumber: 2000 + i,
            recordedAt: new Date(Date.now() + i * 60000).toISOString(),
            temperatureC: 4.2 + i * 0.1,
            humidityPercent: 50,
          }),
        });
        assert.equal(res.status, 201);
      }

      // 3. Record custody handover (transporter → warehouse)
      const warehouseOrg = await (await import('../src/lib/prisma')).prisma.organization.findUniqueOrThrow({
        where: { code: 'ORG-WH-CENTRAL' },
      });
      const transporterToken = await login('driver@coldtrans.com');
      const handoverRes = await fetch(`${baseUrl}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${transporterToken}` },
        body: JSON.stringify({
          batchId,
          eventType: 'CUSTODY_HANDOVER',
          toOrgId: warehouseOrg.id,
          locationName: 'E2E Test Handover Point',
          notes: 'Integration test handover',
        }),
      });
      assert.equal(handoverRes.status, 201);

      // 4. Anchor unanchored readings to EVM
      const anchorRes = await fetch(`${baseUrl}/anchors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${producerToken}` },
        body: JSON.stringify({ batchId }),
      });
      assert.equal(anchorRes.status, 201);
      const anchorData = (await anchorRes.json()) as { anchor: any };
      assert.ok(anchorData.anchor.txHash);
      assert.ok(anchorData.anchor.blockNumber);
      assert.equal(anchorData.anchor.status, 'CONFIRMED');

      // 5. Verify on-chain integrity
      const verifyRes = await fetch(`${baseUrl}/anchors/verify/${batchId}`, {
        headers: { Authorization: `Bearer ${producerToken}` },
      });
      const verifyData = (await verifyRes.json()) as any;
      assert.equal(verifyData.onChain.status, 'MATCH');
      assert.equal(verifyData.isVerified, true);
    });
  });

  describe('Scenario C — Tampered record produces MISMATCH', () => {
    it('modifying an anchored reading causes on-chain verification to return MISMATCH', async () => {
      const { prisma } = await import('../src/lib/prisma');
      const batch = await prisma.batch.findUniqueOrThrow({ where: { batchNumber: testBatchNumber } });

      // Verify currently MATCH
      const beforeRes = await fetch(`${baseUrl}/anchors/verify/${batch.id}`, {
        headers: { Authorization: `Bearer ${producerToken}` },
      });
      const beforeData = (await beforeRes.json()) as any;
      assert.equal(beforeData.onChain.status, 'MATCH');

      // Tamper: update a reading's temperature
      await prisma.sensorReading.updateMany({
        where: { batchId: batch.id, anchored: true },
        data: { temperatureC: 99.99 },
      });

      // Verify now MISMATCH
      const afterRes = await fetch(`${baseUrl}/anchors/verify/${batch.id}`, {
        headers: { Authorization: `Bearer ${producerToken}` },
      });
      const afterData = (await afterRes.json()) as any;
      assert.equal(afterData.onChain.status, 'MISMATCH');
      assert.equal(afterData.isVerified, false);

      // Restore
      await prisma.sensorReading.updateMany({
        where: { batchId: batch.id, anchored: true },
        data: { temperatureC: 4.2 },
      });
    });
  });

  describe('Scenario D — Unauthorized access is denied', () => {
    it('rejects protected operations by wrong role (403) and unauthenticated (401)', async () => {
      const viewerToken = await login('auditor@regulator.gov');

      // 403: VIEWER tries to create a batch
      const res403 = await fetch(`${baseUrl}/batches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${viewerToken}` },
        body: JSON.stringify({
          batchNumber: 'SHOULD-FAIL-403',
          productId: 'nonexistent',
          manufactureDate: '2026-01-01T00:00:00.000Z',
          expiryDate: '2027-01-01T00:00:00.000Z',
          quantity: 1,
        }),
      });
      assert.equal(res403.status, 403);

      // 401: No token
      const res401 = await fetch(`${baseUrl}/batches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      assert.equal(res401.status, 401);
    });
  });

  describe('Scenario B — Temperature excursion triggers AI alert', () => {
    it('ingests a hot reading and an AnomalyAlert is persisted with explanation', async () => {
      const { prisma } = await import('../src/lib/prisma');
      const batch = await prisma.batch.findUniqueOrThrow({ where: { batchNumber: testBatchNumber } });
      const device = await prisma.device.findUniqueOrThrow({ where: { deviceCode: testDeviceCode } });

      const alertCountBefore = await prisma.anomalyAlert.count({ where: { batchId: batch.id } });

      // Ingest a temperature excursion (99°C >> TEMP_MAX_C of 8°C)
      const res = await fetch(`${baseUrl}/sensors/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: batch.id,
          deviceId: device.id,
          sequenceNumber: 99999,
          recordedAt: new Date().toISOString(),
          temperatureC: 99,
          humidityPercent: 50,
        }),
      });
      assert.equal(res.status, 201);

      // Wait for async AI analysis + alert persistence
      let alertCount = alertCountBefore;
      const start = Date.now();
      while (alertCount === alertCountBefore && Date.now() - start < 15000) {
        await new Promise((r) => setTimeout(r, 500));
        alertCount = await prisma.anomalyAlert.count({ where: { batchId: batch.id } });
      }
      assert.ok(alertCount > alertCountBefore, 'Expected an anomaly alert to be persisted');

      // Verify the alert has explanation + severity + detection method
      const alerts = await prisma.anomalyAlert.findMany({
        where: { batchId: batch.id },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });
      const latest = alerts[0];
      assert.equal(latest.severity, 'CRITICAL' /* temp out of range is critical */);
      assert.ok(latest.explanation, 'Alert should have an explanation');
      assert.ok(latest.detectionMethod);

      // Cleanup the excursion reading
      await prisma.sensorReading.deleteMany({
        where: { batchId: batch.id, sequenceNumber: BigInt(99999) },
      });
    });
  });

  describe('Scenario E — AI service outage does not block telemetry', () => {
    it('succeeds 201 ingestion even when AI service is unreachable', async () => {
      const { prisma } = await import('../src/lib/prisma');
      const batch = await prisma.batch.findUniqueOrThrow({ where: { batchNumber: testBatchNumber } });
      const device = await prisma.device.findUniqueOrThrow({ where: { deviceCode: testDeviceCode } });

      // Point AI client at a dead port (service outage simulation)
      const aiMod = await import('../src/lib/ai');
      const originalUrl = config.AI_SERVICE_URL;
      config.AI_SERVICE_URL = 'http://127.0.0.1:9999';
      aiMod.aiClient.setBaseUrl('http://127.0.0.1:9999');

      try {
        const res = await fetch(`${baseUrl}/sensors/telemetry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batchId: batch.id,
            deviceId: device.id,
            sequenceNumber: 88888,
            recordedAt: new Date().toISOString(),
            temperatureC: 4.5,
            humidityPercent: 50,
          }),
        });
        // Ingestion must succeed regardless of AI-service availability
        assert.equal(res.status, 201);
        const data = (await res.json()) as any;
        assert.equal(data.status, 'INGESTED');
      } finally {
        config.AI_SERVICE_URL = originalUrl;
        aiMod.aiClient.setBaseUrl(originalUrl);
      }

      // Cleanup
      await prisma.sensorReading.deleteMany({
        where: { batchId: batch.id, sequenceNumber: BigInt(88888) },
      });
    });
  });

  describe('Scenario F — Public QR traceability endpoint', () => {
    it('serves public batch data without authentication and includes qrCodeUrl', async () => {
      // Use the seeded public batch
      const res = await fetch(`${baseUrl}/batches/public/BATCH-VAX-2026-001`);
      assert.equal(res.status, 200);
      const data = (await res.json()) as any;
      assert.equal(data.batchNumber, 'BATCH-VAX-2026-001');
      assert.ok(data.product);
      assert.ok(data.producer);
      assert.ok(data.currentHolder);
      assert.ok(Array.isArray(data.timeline));
      assert.ok(Array.isArray(data.blockchainAnchors));
      assert.equal(data.isAuthentic, true);
      assert.ok(data.qrCodeUrl, 'qrCodeUrl should be present for QR scanning');
      assert.ok(data.qrCodeUrl.includes('/trace/BATCH-VAX-2026-001'));
    });

    it('returns 404 for non-existent batch', async () => {
      const res = await fetch(`${baseUrl}/batches/public/NOPE-99999`);
      assert.equal(res.status, 404);
    });
  });
});
