# Database Operations & Migrations Guide

This guide documents the database setup, migration commands, reset procedures, and test execution for the **Smart Cold-Chain Traceability System**.

---

## 1. Prerequisites & Environment

The database layer requires:
- **Docker & Docker Compose** (for running PostgreSQL 16 Alpine locally)
- **Node.js 20+**
- **Prisma CLI v5+**

Ensure `.env` in the root workspace has the valid connection string:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/coldchain_db?schema=public"
```

---

## 2. Starting PostgreSQL Container

To start the local database container:
```bash
docker compose up -d
```

Verify container health:
```bash
docker compose ps
# Expected status: Up (healthy)
```

To stop the database:
```bash
docker compose down
```

To remove all database data volume:
```bash
docker compose down -v
```

---

## 3. Prisma Migrations Workflow

### 3.1 Applying Migrations to Sync Database
Run Prisma Migrate to apply pending migrations or create a new migration during development:
```bash
npm --prefix apps/api run prisma:migrate
```
Or directly from the repository root:
```bash
node ./node_modules/prisma/build/index.js migrate dev --schema apps/api/prisma/schema.prisma
```

### 3.2 Generating the Prisma Client
When modifying `apps/api/prisma/schema.prisma`, regenerate the TypeScript Prisma Client:
```bash
npm --prefix apps/api run prisma:generate
```

### 3.3 Database Reset Procedure
To wipe all tables, re-run all migrations from scratch, and execute the seed script:
```bash
npm --prefix apps/api run prisma:reset
```
Or:
```bash
node ./node_modules/prisma/build/index.js migrate reset --force --schema apps/api/prisma/schema.prisma
```

---

## 4. Database Seeding

The seed script (`apps/api/prisma/seed.ts`) populates the database with realistic demo data:
- **4 Organizations**: VaxLab BioPharma (Producer), ColdTrans Logistics (Logistics), BioDepot (Warehouse), PharmaCare (Retailer).
- **5 RBAC Users**:
  - `admin@coldchain.internal` (`ADMIN`)
  - `producer@vaxlab.com` (`PRODUCER`)
  - `driver@coldtrans.com` (`TRANSPORTER`)
  - `operator@biodepot.com` (`WAREHOUSE_OPERATOR`)
  - `auditor@regulator.gov` (`VIEWER`)
  *(All test accounts use bcrypt-hashed passwords `password123`)*
- **2 Products**: VaxGuard mRNA Vaccine (2.0°C to 8.0°C) and Atlantic Salmon (-2.0°C to 2.0°C).
- **2 Batches**: `BATCH-VAX-2026-001` (In transit) and `BATCH-SALMON-2026-002` (Stored).
- **2 Telemetry Devices**: Reefer truck BLE sensor & warehouse environmental vault monitor.
- **Sensor Readings**: Compliant time-series telemetry with UTC timestamps and canonical hashes.
- **Supply Chain Events**: Manufacture, Dispatch, and Custody Handover milestones.
- **Anomaly Alert**: Resolved minor temperature fluctuation event.
- **Blockchain Anchor**: Verified on-chain hash anchor reference (`status: CONFIRMED`).
- **Audit Log**: System initialization audit entry.

Execute seeding manually:
```bash
npm --prefix apps/api run prisma:seed
```

---

## 5. Automated Database Testing

Automated tests in `apps/api/test/database.test.ts` validate:
1. **Seed Data Integrity**: Counts, foreign key links, bcrypt password verification, product temp ranges.
2. **Unique & Idempotency Constraints**: Duplicate email, device code, batch number, and telemetry `[deviceId, sequenceNumber, recordedAt]` rejection.
3. **Foreign Key Cascade & Restrict Rules**: Cascade deletion of telemetry on batch removal, and Restrict rejection when deleting products with active batches.

Run the test suite:
```bash
npm --prefix apps/api run test
```
All 11 tests execute in under 500ms against the live database.

---

## 6. Prisma Studio (GUI)

To visually inspect and query database records via web browser:
```bash
npm --prefix apps/api run prisma:studio
```
Prisma Studio opens at `http://localhost:5555`.
