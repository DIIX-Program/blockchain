import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { Prisma, UserRole, OrganizationType, BatchStatus, EventType, AlertSeverity, AlertStatus, AnchorStatus } from '@prisma/client';

describe('Database and Migrations Test Suite (Task 02)', () => {
  after(async () => {
    // Clean up any test records created during test execution
    await prisma.sensorReading.deleteMany({
      where: { batch: { batchNumber: { startsWith: 'TEST-BATCH-' } } },
    });
    await prisma.dataAnchor.deleteMany({
      where: { batch: { batchNumber: { startsWith: 'TEST-BATCH-' } } },
    });
    await prisma.anomalyAlert.deleteMany({
      where: { batch: { batchNumber: { startsWith: 'TEST-BATCH-' } } },
    });
    await prisma.supplyChainEvent.deleteMany({
      where: { batch: { batchNumber: { startsWith: 'TEST-BATCH-' } } },
    });
    await prisma.batch.deleteMany({
      where: { batchNumber: { startsWith: 'TEST-BATCH-' } },
    });
    await prisma.device.deleteMany({
      where: { deviceCode: { startsWith: 'TEST-DEV-' } },
    });
    await prisma.product.deleteMany({
      where: { sku: { startsWith: 'TEST-SKU-' } },
    });
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'test-user-' } },
    });

    await prisma.$disconnect();
  });

  describe('1. Seed Data Integrity & Schema Structure', () => {
    it('should have seeded all 4 required organizations', async () => {
      const orgs = await prisma.organization.findMany();
      assert.ok(orgs.length >= 4, 'Expected at least 4 organizations');
      const codes = orgs.map((o) => o.code);
      assert.ok(codes.includes('ORG-PROD-VAX'));
      assert.ok(codes.includes('ORG-CARRIER-01'));
      assert.ok(codes.includes('ORG-WH-CENTRAL'));
      assert.ok(codes.includes('ORG-RETAIL-01'));
    });

    it('should have seeded all 5 RBAC users with hashed passwords', async () => {
      const users = await prisma.user.findMany({
        include: { organization: true },
      });
      assert.ok(users.length >= 5, 'Expected at least 5 users');

      const roles = users.map((u) => u.role);
      assert.ok(roles.includes(UserRole.ADMIN));
      assert.ok(roles.includes(UserRole.PRODUCER));
      assert.ok(roles.includes(UserRole.TRANSPORTER));
      assert.ok(roles.includes(UserRole.WAREHOUSE_OPERATOR));
      assert.ok(roles.includes(UserRole.VIEWER));

      // Passwords MUST be bcrypt-hashed, NEVER plaintext
      for (const u of users) {
        assert.ok(u.passwordHash.startsWith('$2'), `User ${u.email} does not have a bcrypt hash!`);
        assert.notEqual(u.passwordHash, 'password123', 'Password stored as plaintext!');
      }
    });

    it('should have products with valid cold-chain temperature thresholds', async () => {
      const products = await prisma.product.findMany();
      assert.ok(products.length >= 2, 'Expected at least 2 products');

      for (const p of products) {
        assert.ok(
          Number(p.tempMinC) < Number(p.tempMaxC),
          `Product ${p.sku} has invalid temp thresholds: min ${p.tempMinC} >= max ${p.tempMaxC}`
        );
      }
    });

    it('should have batches linked to products, producers, and holders', async () => {
      const batches = await prisma.batch.findMany({
        include: {
          product: true,
          producer: true,
          currentHolder: true,
          sensorReadings: true,
          events: true,
          alerts: true,
          anchors: true,
        },
      });

      assert.ok(batches.length >= 2, 'Expected at least 2 batches');
      const vaxBatch = batches.find((b) => b.batchNumber === 'BATCH-VAX-2026-001');
      assert.ok(vaxBatch, 'BATCH-VAX-2026-001 not found');
      assert.equal(vaxBatch.product.sku, 'PROD-VAX-MRNA-01');
      assert.equal(vaxBatch.producer.code, 'ORG-PROD-VAX');
      assert.equal(vaxBatch.currentHolder.code, 'ORG-CARRIER-01');
      assert.ok(vaxBatch.sensorReadings.length >= 3, 'Expected at least 3 sensor readings');
      assert.ok(vaxBatch.events.length >= 3, 'Expected at least 3 supply chain events');
      assert.ok(vaxBatch.alerts.length >= 1, 'Expected at least 1 anomaly alert');
      assert.ok(vaxBatch.anchors.length >= 1, 'Expected at least 1 blockchain anchor');
    });

    it('should verify blockchain data anchor attributes', async () => {
      const anchors = await prisma.dataAnchor.findMany();
      assert.ok(anchors.length >= 1, 'Expected at least 1 anchor');

      const anchor = anchors[0];
      assert.equal(anchor.hashAlgorithm, 'SHA-256');
      assert.equal(anchor.canonicalHash.length, 64);
      assert.equal(anchor.status, AnchorStatus.CONFIRMED);
      assert.ok(anchor.txHash && anchor.txHash.startsWith('0x'));
      assert.ok(anchor.blockNumber !== null);
      assert.ok(anchor.confirmedAt !== null);
    });
  });

  describe('2. Idempotency & Unique Constraints', () => {
    it('should reject duplicate user emails', async () => {
      await assert.rejects(
        async () => {
          await prisma.user.create({
            data: {
              email: 'admin@coldchain.internal', // already exists
              passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz012345',
              fullName: 'Duplicate Admin',
              role: UserRole.ADMIN,
            },
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof Prisma.PrismaClientKnownRequestError);
          assert.equal(err.code, 'P2002', 'Expected P2002 unique constraint violation');
          return true;
        }
      );
    });

    it('should reject duplicate device codes', async () => {
      await assert.rejects(
        async () => {
          await prisma.device.create({
            data: {
              deviceCode: 'DEV-TRUCK-REFRIG-01', // already exists
              model: 'Duplicate-Model',
            },
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof Prisma.PrismaClientKnownRequestError);
          assert.equal(err.code, 'P2002', 'Expected P2002 unique constraint violation');
          return true;
        }
      );
    });

    it('should reject duplicate batch numbers', async () => {
      const prod = await prisma.product.findFirstOrThrow();
      const org = await prisma.organization.findFirstOrThrow();

      await assert.rejects(
        async () => {
          await prisma.batch.create({
            data: {
              batchNumber: 'BATCH-VAX-2026-001', // already exists
              productId: prod.id,
              producerId: org.id,
              currentHolderId: org.id,
              manufactureDate: new Date(),
              expiryDate: new Date(Date.now() + 86400000),
              quantity: 100,
            },
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof Prisma.PrismaClientKnownRequestError);
          assert.equal(err.code, 'P2002', 'Expected P2002 unique constraint violation');
          return true;
        }
      );
    });

    it('should enforce IoT sensor reading idempotency (deviceId, sequenceNumber, recordedAt)', async () => {
      const reading = await prisma.sensorReading.findFirstOrThrow();

      await assert.rejects(
        async () => {
          // Attempt duplicate submission with exact same device, sequence, and timestamp
          await prisma.sensorReading.create({
            data: {
              batchId: reading.batchId,
              deviceId: reading.deviceId,
              sequenceNumber: reading.sequenceNumber,
              recordedAt: reading.recordedAt,
              temperatureC: 99.9,
              isSimulated: true,
            },
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof Prisma.PrismaClientKnownRequestError);
          assert.equal(err.code, 'P2002', 'Expected P2002 idempotency collision');
          return true;
        }
      );
    });
  });

  describe('3. Foreign Keys & Cascading / Restrict Semantics', () => {
    it('should prevent deleting a product that has active batches (Restrict)', async () => {
      const prod = await prisma.product.findFirstOrThrow({
        where: { sku: 'PROD-VAX-MRNA-01' },
      });

      await assert.rejects(
        async () => {
          await prisma.product.delete({
            where: { id: prod.id },
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof Prisma.PrismaClientKnownRequestError);
          assert.equal(err.code, 'P2003', 'Expected P2003 foreign key restrict violation');
          return true;
        }
      );
    });

    it('should cascade delete child telemetry, alerts, and anchors when a batch is deleted', async () => {
      const prod = await prisma.product.findFirstOrThrow();
      const org = await prisma.organization.findFirstOrThrow();
      const device = await prisma.device.findFirstOrThrow();

      // Create a test batch
      const testBatch = await prisma.batch.create({
        data: {
          batchNumber: `TEST-BATCH-${Date.now()}`,
          productId: prod.id,
          producerId: org.id,
          currentHolderId: org.id,
          manufactureDate: new Date(),
          expiryDate: new Date(Date.now() + 86400000 * 30),
          quantity: 250,
        },
      });

      // Attach a test reading
      const testReading = await prisma.sensorReading.create({
        data: {
          batchId: testBatch.id,
          deviceId: device.id,
          sequenceNumber: BigInt(999999),
          recordedAt: new Date(),
          temperatureC: 3.5,
          isSimulated: true,
        },
      });

      // Attach a test alert
      const testAlert = await prisma.anomalyAlert.create({
        data: {
          batchId: testBatch.id,
          deviceId: device.id,
          detectionMethod: 'RULE_BASED',
          severity: AlertSeverity.LOW,
          explanation: 'Test cascade alert',
          readingWindowStart: new Date(),
          readingWindowEnd: new Date(),
        },
      });

      // Attach a test anchor
      const testAnchor = await prisma.dataAnchor.create({
        data: {
          batchId: testBatch.id,
          canonicalHash: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
          readingCount: 1,
        },
      });

      // Now delete the batch
      await prisma.batch.delete({
        where: { id: testBatch.id },
      });

      // Verify that reading, alert, and anchor were cascade deleted
      const foundReading = await prisma.sensorReading.findUnique({ where: { id: testReading.id } });
      const foundAlert = await prisma.anomalyAlert.findUnique({ where: { id: testAlert.id } });
      const foundAnchor = await prisma.dataAnchor.findUnique({ where: { id: testAnchor.id } });

      assert.equal(foundReading, null, 'SensorReading should have been cascade deleted');
      assert.equal(foundAlert, null, 'AnomalyAlert should have been cascade deleted');
      assert.equal(foundAnchor, null, 'DataAnchor should have been cascade deleted');
    });
  });
});
