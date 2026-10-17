import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Server } from 'http';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

describe('Task 03 — Backend Foundation and RBAC Integration Test Suite', () => {
  let server: Server;
  let baseUrl: string;

  // Cached tokens for different roles
  let adminToken: string;
  let producerToken: string;
  let transporterToken: string;
  let warehouseToken: string;
  let viewerToken: string;

  before(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          baseUrl = `http://localhost:${address.port}/api/v1`;
        }
        resolve();
      });
    });

    // Obtain tokens by logging in with seed accounts
    const loginUser = async (email: string) => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      });
      const data = (await res.json()) as any;
      assert.equal(res.status, 200, `Failed to login as ${email}: ${JSON.stringify(data)}`);
      return data.token as string;
    };

    adminToken = await loginUser('admin@coldchain.internal');
    producerToken = await loginUser('producer@vaxlab.com');
    transporterToken = await loginUser('driver@coldtrans.com');
    warehouseToken = await loginUser('operator@biodepot.com');
    viewerToken = await loginUser('auditor@regulator.gov');
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await prisma.$disconnect();
  });

  describe('1. Authentication Module & JWT Lifecycle', () => {
    it('should reject login with invalid password (HTTP 401)', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@coldchain.internal', password: 'wrongpassword' }),
      });
      assert.equal(res.status, 401);
      const data = (await res.json()) as any;
      assert.equal(data.error, 'UnauthorizedError');
    });

    it('should reject login for non-existent email (HTTP 401)', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'unknown@example.com', password: 'password123' }),
      });
      assert.equal(res.status, 401);
    });

    it('should return current user profile on /auth/me for authenticated user', async () => {
      const res = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${producerToken}` },
      });
      assert.equal(res.status, 200);
      const data = (await res.json()) as any;
      assert.equal(data.user.email, 'producer@vaxlab.com');
      assert.equal(data.user.role, 'PRODUCER');
      assert.ok(data.user.organization);
    });

    it('should reject access to protected endpoint without token (HTTP 401)', async () => {
      const res = await fetch(`${baseUrl}/auth/me`);
      assert.equal(res.status, 401);
      const data = (await res.json()) as any;
      assert.equal(data.error, 'UnauthorizedError');
    });

    it('should reject malformed or expired Bearer token (HTTP 401)', async () => {
      const res = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: 'Bearer this.is.an.invalid.token' },
      });
      assert.equal(res.status, 401);
    });
  });

  describe('2. Server-Side RBAC Enforcement', () => {
    it('should allow ADMIN to list all users, but reject VIEWER (HTTP 403)', async () => {
      // 1. ADMIN access -> should succeed
      const adminRes = await fetch(`${baseUrl}/users`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(adminRes.status, 200);
      const adminData = (await adminRes.json()) as any;
      assert.ok(Array.isArray(adminData.data));
      assert.ok(adminData.data.length >= 5);

      // 2. VIEWER access -> should return 403 Forbidden
      const viewerRes = await fetch(`${baseUrl}/users`, {
        headers: { Authorization: `Bearer ${viewerToken}` },
      });
      assert.equal(viewerRes.status, 403);
      const viewerData = (await viewerRes.json()) as any;
      assert.equal(viewerData.error, 'ForbiddenError');
    });

    it('should allow ADMIN to create organizations, but reject PRODUCER (HTTP 403)', async () => {
      const payload = {
        name: 'Unauthorized Org Attempt',
        code: `ORG-UNAUTH-${Date.now()}`,
        type: 'PRODUCER',
        contactEmail: 'unauth@test.com',
      };

      const producerRes = await fetch(`${baseUrl}/organizations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${producerToken}`,
        },
        body: JSON.stringify(payload),
      });
      assert.equal(producerRes.status, 403);

      const adminRes = await fetch(`${baseUrl}/organizations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      });
      assert.equal(adminRes.status, 201);
      const adminData = (await adminRes.json()) as any;
      assert.equal(adminData.organization.name, payload.name);

      // Cleanup
      await prisma.organization.delete({ where: { id: adminData.organization.id } });
    });

    it('should allow PRODUCER to create products, but reject TRANSPORTER (HTTP 403)', async () => {
      const payload = {
        sku: `SKU-RBAC-${Date.now()}`,
        name: 'Test RBAC Vaccine',
        tempMinC: 2.0,
        tempMaxC: 8.0,
      };

      const transRes = await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${transporterToken}`,
        },
        body: JSON.stringify(payload),
      });
      assert.equal(transRes.status, 403);

      const prodRes = await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${producerToken}`,
        },
        body: JSON.stringify(payload),
      });
      assert.equal(prodRes.status, 201);

      // Cleanup
      const prodData = (await prodRes.json()) as any;
      await prisma.product.delete({ where: { id: prodData.product.id } });
    });
  });

  describe('3. Request Schema Validation (Zod)', () => {
    it('should reject product creation when tempMinC >= tempMaxC with structured validation error (HTTP 400)', async () => {
      const invalidProduct = {
        sku: 'SKU-INVALID-TEMP',
        name: 'Invalid Temp Product',
        tempMinC: 15.0,
        tempMaxC: 5.0, // Invalid: min > max
      };

      const res = await fetch(`${baseUrl}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${producerToken}`,
        },
        body: JSON.stringify(invalidProduct),
      });

      assert.equal(res.status, 400);
      const data = (await res.json()) as any;
      assert.equal(data.error, 'ValidationError');
      assert.ok(Array.isArray(data.details));
      assert.ok(data.details.some((d: any) => d.field === 'tempMinC'));
    });

    it('should reject malformed JSON body (HTTP 400)', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ malformed json: true, ',
      });
      assert.equal(res.status, 400);
      const data = (await res.json()) as any;
      assert.equal(data.error, 'MalformedJsonError');
    });
  });

  describe('4. Public Traceability Portal', () => {
    it('should serve public batch journey without authentication', async () => {
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
    });

    it('should return HTTP 404 for non-existent public batch', async () => {
      const res = await fetch(`${baseUrl}/batches/public/NON-EXISTENT-BATCH-999`);
      assert.equal(res.status, 404);
      const data = (await res.json()) as any;
      assert.equal(data.error, 'NotFoundError');
    });
  });

  describe('5. Telemetry Ingestion & Idempotency', () => {
    it('should ingest telemetry and ignore duplicate submissions idempotently', async () => {
      const batch = await prisma.batch.findFirstOrThrow();
      const device = await prisma.device.findFirstOrThrow();

      const telemetry = {
        batchId: batch.id,
        deviceId: device.id,
        sequenceNumber: 77777,
        recordedAt: '2026-10-17T12:00:00.000Z',
        temperatureC: 4.5,
        humidityPercent: 50.0,
      };

      // 1. Initial ingestion -> 201 Created
      const res1 = await fetch(`${baseUrl}/sensors/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(telemetry),
      });
      assert.equal(res1.status, 201);
      const data1 = (await res1.json()) as any;
      assert.equal(data1.status, 'INGESTED');

      // 2. Duplicate ingestion -> 200 OK (idempotent ignore)
      const res2 = await fetch(`${baseUrl}/sensors/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(telemetry),
      });
      assert.equal(res2.status, 200);
      const data2 = (await res2.json()) as any;
      assert.equal(data2.status, 'DUPLICATE_IGNORED');

      // Cleanup
      await prisma.sensorReading.deleteMany({
        where: { sequenceNumber: BigInt(77777), deviceId: device.id },
      });
    });
  });

  describe('6. Transactional Custody Handover Events', () => {
    it('should update batch currentHolder and status atomically during custody handover', async () => {
      const batch = await prisma.batch.findUniqueOrThrow({
        where: { batchNumber: 'BATCH-VAX-2026-001' },
      });
      const warehouseOrg = await prisma.organization.findUniqueOrThrow({
        where: { code: 'ORG-WH-CENTRAL' },
      });

      const handoverPayload = {
        batchId: batch.id,
        eventType: 'CUSTODY_HANDOVER',
        toOrgId: warehouseOrg.id,
        locationName: 'Long Bien Warehouse Receiving Gate',
        notes: 'Handover verification in integration test',
      };

      const res = await fetch(`${baseUrl}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${transporterToken}`,
        },
        body: JSON.stringify(handoverPayload),
      });

      assert.equal(res.status, 201);
      const data = (await res.json()) as any;
      assert.equal(data.event.eventType, 'CUSTODY_HANDOVER');

      // Verify database updated batch currentHolder atomically
      const updatedBatch = await prisma.batch.findUniqueOrThrow({ where: { id: batch.id } });
      assert.equal(updatedBatch.currentHolderId, warehouseOrg.id);

      // Clean up event and revert holder
      await prisma.supplyChainEvent.delete({ where: { id: data.event.id } });
      await prisma.batch.update({
        where: { id: batch.id },
        data: { currentHolderId: batch.currentHolderId },
      });
    });
  });

  describe('7. OpenAPI Documentation Generation', () => {
    it('should serve valid OpenAPI 3.0 specification json', async () => {
      const res = await fetch(`${baseUrl}/docs/openapi.json`);
      assert.equal(res.status, 200);
      const spec = (await res.json()) as any;
      assert.equal(spec.openapi, '3.0.3');
      assert.ok(spec.paths['/auth/login']);
      assert.ok(spec.paths['/batches/public/{batchNumber}']);
      assert.ok(spec.paths['/sensors/telemetry']);
    });

    it('should serve interactive Swagger UI documentation page', async () => {
      const res = await fetch(`${baseUrl}/docs`);
      assert.equal(res.status, 200);
      const html = await res.text();
      assert.ok(html.includes('swagger-ui'));
    });
  });
});
