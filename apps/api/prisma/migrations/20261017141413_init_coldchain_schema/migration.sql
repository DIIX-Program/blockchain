-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'PRODUCER', 'TRANSPORTER', 'WAREHOUSE_OPERATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('PRODUCER', 'LOGISTICS_PROVIDER', 'WAREHOUSE', 'RETAILER', 'REGULATOR');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('CREATED', 'IN_TRANSIT', 'STORED', 'DELIVERED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('HARVEST_MANUFACTURE', 'DISPATCH', 'CHECKPOINT', 'CUSTODY_HANDOVER', 'WAREHOUSE_RECEIVE', 'FINAL_DELIVERY', 'SLA_VIOLATION');

-- CreateEnum
CREATE TYPE "DetectionMethod" AS ENUM ('RULE_BASED', 'ML_MODEL', 'HYBRID');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "AnchorStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "address" TEXT,
    "contactEmail" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(120) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "fullName" VARCHAR(120) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "organizationId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "sku" VARCHAR(60) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "tempMinC" DECIMAL(5,2) NOT NULL,
    "tempMaxC" DECIMAL(5,2) NOT NULL,
    "humidityMin" DECIMAL(5,2),
    "humidityMax" DECIMAL(5,2),
    "maxTransitHours" INTEGER,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL,
    "batchNumber" VARCHAR(64) NOT NULL,
    "productId" TEXT NOT NULL,
    "producerId" TEXT NOT NULL,
    "currentHolderId" TEXT NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'CREATED',
    "manufactureDate" TIMESTAMPTZ(6) NOT NULL,
    "expiryDate" TIMESTAMPTZ(6) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "qrCodeUrl" VARCHAR(255),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "deviceCode" VARCHAR(60) NOT NULL,
    "model" VARCHAR(80) NOT NULL,
    "isSimulated" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT,
    "lastSeenAt" TIMESTAMPTZ(6),
    "batteryPercent" DECIMAL(5,2),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensor_readings" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "sequenceNumber" BIGINT NOT NULL,
    "recordedAt" TIMESTAMPTZ(6) NOT NULL,
    "temperatureC" DECIMAL(5,2) NOT NULL,
    "humidityPercent" DECIMAL(5,2),
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "isSimulated" BOOLEAN NOT NULL DEFAULT true,
    "canonicalHash" CHAR(64),
    "anchored" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sensor_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supply_chain_events" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "eventType" "EventType" NOT NULL,
    "actorId" TEXT,
    "fromOrgId" TEXT,
    "toOrgId" TEXT,
    "locationName" VARCHAR(150) NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "notes" TEXT,
    "txHash" VARCHAR(66),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supply_chain_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anomaly_alerts" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "deviceId" TEXT,
    "detectionMethod" "DetectionMethod" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "anomalyScore" DECIMAL(5,4),
    "ruleViolated" VARCHAR(120),
    "explanation" TEXT NOT NULL,
    "readingWindowStart" TIMESTAMPTZ(6) NOT NULL,
    "readingWindowEnd" TIMESTAMPTZ(6) NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMPTZ(6),
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMPTZ(6),
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anomaly_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_anchors" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "schemaVersion" VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    "hashAlgorithm" VARCHAR(30) NOT NULL DEFAULT 'SHA-256',
    "canonicalHash" CHAR(64) NOT NULL,
    "merkleRoot" CHAR(64),
    "readingCount" INTEGER NOT NULL,
    "txHash" VARCHAR(66),
    "blockNumber" BIGINT,
    "status" "AnchorStatus" NOT NULL DEFAULT 'PENDING',
    "confirmedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_anchors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(60) NOT NULL,
    "entityId" VARCHAR(64) NOT NULL,
    "payloadBefore" JSONB,
    "payloadAfter" JSONB,
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(255),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_code_key" ON "organizations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "batches_batchNumber_key" ON "batches"("batchNumber");

-- CreateIndex
CREATE INDEX "batches_productId_idx" ON "batches"("productId");

-- CreateIndex
CREATE INDEX "batches_status_idx" ON "batches"("status");

-- CreateIndex
CREATE UNIQUE INDEX "devices_deviceCode_key" ON "devices"("deviceCode");

-- CreateIndex
CREATE INDEX "idx_reading_batch_time" ON "sensor_readings"("batchId", "recordedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "sensor_readings_deviceId_sequenceNumber_recordedAt_key" ON "sensor_readings"("deviceId", "sequenceNumber", "recordedAt");

-- CreateIndex
CREATE INDEX "supply_chain_events_batchId_createdAt_idx" ON "supply_chain_events"("batchId", "createdAt");

-- CreateIndex
CREATE INDEX "anomaly_alerts_batchId_status_idx" ON "anomaly_alerts"("batchId", "status");

-- CreateIndex
CREATE INDEX "data_anchors_batchId_createdAt_idx" ON "data_anchors"("batchId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_currentHolderId_fkey" FOREIGN KEY ("currentHolderId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_readings" ADD CONSTRAINT "sensor_readings_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_readings" ADD CONSTRAINT "sensor_readings_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supply_chain_events" ADD CONSTRAINT "supply_chain_events_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supply_chain_events" ADD CONSTRAINT "supply_chain_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supply_chain_events" ADD CONSTRAINT "supply_chain_events_fromOrgId_fkey" FOREIGN KEY ("fromOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supply_chain_events" ADD CONSTRAINT "supply_chain_events_toOrgId_fkey" FOREIGN KEY ("toOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly_alerts" ADD CONSTRAINT "anomaly_alerts_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly_alerts" ADD CONSTRAINT "anomaly_alerts_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly_alerts" ADD CONSTRAINT "anomaly_alerts_acknowledgedBy_fkey" FOREIGN KEY ("acknowledgedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly_alerts" ADD CONSTRAINT "anomaly_alerts_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_anchors" ADD CONSTRAINT "data_anchors_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
