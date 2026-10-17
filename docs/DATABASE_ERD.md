# Cold-Chain Database Entity Relationship Diagram (ERD)

This document specifies the PostgreSQL relational data model for the **Smart Cold-Chain Traceability System**, managed via Prisma ORM.

---

## 1. Entity-Relationship Overview

```mermaid
erDiagram
    ORGANIZATION ||--o{ USER : "employs"
    ORGANIZATION ||--o{ PRODUCT : "owns"
    ORGANIZATION ||--o{ DEVICE : "manages"
    ORGANIZATION ||--o{ BATCH : "produces"
    ORGANIZATION ||--o{ BATCH : "holds currently"
    ORGANIZATION ||--o{ SUPPLY_CHAIN_EVENT : "originates from"
    ORGANIZATION ||--o{ SUPPLY_CHAIN_EVENT : "delivers to"

    PRODUCT ||--o{ BATCH : "categorizes"

    USER ||--o{ SUPPLY_CHAIN_EVENT : "logs"
    USER ||--o{ ANOMALY_ALERT : "acknowledges"
    USER ||--o{ ANOMALY_ALERT : "resolves"
    USER ||--o{ AUDIT_LOG : "triggers"

    BATCH ||--o{ SENSOR_READING : "tracks telemetry"
    BATCH ||--o{ SUPPLY_CHAIN_EVENT : "milestones"
    BATCH ||--o{ ANOMALY_ALERT : "flagged by AI"
    BATCH ||--o{ DATA_ANCHOR : "anchored on-chain"

    DEVICE ||--o{ SENSOR_READING : "records"
    DEVICE ||--o{ ANOMALY_ALERT : "subject of"

    ORGANIZATION {
        UUID id PK
        VARCHAR name
        VARCHAR code UK
        ENUM type "PRODUCER | LOGISTICS_PROVIDER | WAREHOUSE | RETAILER | REGULATOR"
        TEXT address
        VARCHAR contactEmail
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    USER {
        UUID id PK
        VARCHAR email UK
        VARCHAR passwordHash
        VARCHAR fullName
        ENUM role "ADMIN | PRODUCER | TRANSPORTER | WAREHOUSE_OPERATOR | VIEWER"
        UUID organizationId FK
        BOOLEAN isActive
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    PRODUCT {
        UUID id PK
        VARCHAR sku UK
        VARCHAR name
        TEXT description
        NUMERIC tempMinC
        NUMERIC tempMaxC
        NUMERIC humidityMin
        NUMERIC humidityMax
        INT maxTransitHours
        UUID organizationId FK
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    BATCH {
        UUID id PK
        VARCHAR batchNumber UK
        UUID productId FK
        UUID producerId FK
        UUID currentHolderId FK
        ENUM status "CREATED | IN_TRANSIT | STORED | DELIVERED | REJECTED"
        TIMESTAMPTZ manufactureDate
        TIMESTAMPTZ expiryDate
        INT quantity
        VARCHAR qrCodeUrl
        TIMESTAMPTZ createdAt
        TIMESTAMPTZ updatedAt
    }

    DEVICE {
        UUID id PK
        VARCHAR deviceCode UK
        VARCHAR model
        BOOLEAN isSimulated
        UUID organizationId FK
        TIMESTAMPTZ lastSeenAt
        NUMERIC batteryPercent
        TIMESTAMPTZ createdAt
    }

    SENSOR_READING {
        UUID id PK
        UUID batchId FK
        UUID deviceId FK
        BIGINT sequenceNumber
        TIMESTAMPTZ recordedAt
        NUMERIC temperatureC
        NUMERIC humidityPercent
        NUMERIC latitude
        NUMERIC longitude
        BOOLEAN isSimulated
        CHAR canonicalHash
        BOOLEAN anchored
        TIMESTAMPTZ createdAt
    }

    SUPPLY_CHAIN_EVENT {
        UUID id PK
        UUID batchId FK
        ENUM eventType "HARVEST_MANUFACTURE | DISPATCH | CHECKPOINT | CUSTODY_HANDOVER | WAREHOUSE_RECEIVE | FINAL_DELIVERY | SLA_VIOLATION"
        UUID actorId FK
        UUID fromOrgId FK
        UUID toOrgId FK
        VARCHAR locationName
        NUMERIC latitude
        NUMERIC longitude
        TEXT notes
        VARCHAR txHash
        TIMESTAMPTZ createdAt
    }

    ANOMALY_ALERT {
        UUID id PK
        UUID batchId FK
        UUID deviceId FK
        ENUM detectionMethod "RULE_BASED | ML_MODEL | HYBRID"
        ENUM severity "LOW | MEDIUM | HIGH | CRITICAL"
        NUMERIC anomalyScore
        VARCHAR ruleViolated
        TEXT explanation
        TIMESTAMPTZ readingWindowStart
        TIMESTAMPTZ readingWindowEnd
        ENUM status "OPEN | ACKNOWLEDGED | RESOLVED"
        UUID acknowledgedBy FK
        TIMESTAMPTZ acknowledgedAt
        UUID resolvedBy FK
        TIMESTAMPTZ resolvedAt
        TEXT resolutionNotes
        TIMESTAMPTZ createdAt
    }

    DATA_ANCHOR {
        UUID id PK
        UUID batchId FK
        VARCHAR schemaVersion
        VARCHAR hashAlgorithm
        CHAR canonicalHash
        CHAR merkleRoot
        INT readingCount
        VARCHAR txHash
        BIGINT blockNumber
        ENUM status "PENDING | CONFIRMED | FAILED"
        TIMESTAMPTZ confirmedAt
        TIMESTAMPTZ createdAt
    }

    AUDIT_LOG {
        UUID id PK
        UUID userId FK
        VARCHAR action
        VARCHAR entityType
        VARCHAR entityId
        JSONB payloadBefore
        JSONB payloadAfter
        VARCHAR ipAddress
        VARCHAR userAgent
        TIMESTAMPTZ createdAt
    }
```

---

## 2. Relational Schema Details & Constraints

### 2.1 Core Entities & Primary Keys
All entities use universally unique identifiers (UUID v4) as synthetic primary keys (`@id @default(uuid())`). Natural business keys (`code`, `email`, `sku`, `batchNumber`, `deviceCode`) are declared as `UNIQUE`.

### 2.2 Traceability & Foreign Key Integrity
- **Batches**:
  - `productId -> Product.id` (`onDelete: Restrict`): Products cannot be deleted if active batches exist.
  - `producerId -> Organization.id` (`onDelete: Restrict`): Producer orgs cannot be purged while batch records exist.
  - `currentHolderId -> Organization.id` (`onDelete: Restrict`): Current custodian organization is required.
- **SensorReadings**:
  - `batchId -> Batch.id` (`onDelete: Cascade`): Traceability telemetry is tied to batch lifecycle.
  - `deviceId -> Device.id` (`onDelete: Cascade`): Tied to originating device.
  - **Unique Idempotency Constraint**: `@@unique([deviceId, sequenceNumber, recordedAt], name: "idx_reading_idempotency")` guarantees that telemetry packets sent over unstable networks cannot be duplicated.
- **SupplyChainEvents**:
  - `batchId -> Batch.id` (`onDelete: Cascade`)
  - `actorId -> User.id` (`onDelete: SetNull`)
  - `fromOrgId, toOrgId -> Organization.id` (`onDelete: SetNull`)
- **AnomalyAlerts**:
  - `batchId -> Batch.id` (`onDelete: Cascade`)
  - `deviceId -> Device.id` (`onDelete: SetNull`)
  - `acknowledgedBy, resolvedBy -> User.id` (`onDelete: SetNull`)
- **DataAnchors**:
  - `batchId -> Batch.id` (`onDelete: Cascade`)
  - Tracks `hashAlgorithm` (default `SHA-256`), `canonicalHash`, `merkleRoot`, `txHash`, and `blockNumber`.

---

## 3. Indexing Strategy

| Table | Index Columns | Purpose |
| :--- | :--- | :--- |
| `batches` | `productId`, `status` | Fast filtering on catalog & logistics dashboard |
| `sensor_readings` | `[deviceId, sequenceNumber, recordedAt]` (UNIQUE) | Strict ingestion idempotency |
| `sensor_readings` | `[batchId, recordedAt DESC]` | Ultra-fast time-series queries for charts & AI analysis |
| `supply_chain_events` | `[batchId, createdAt]` | Chronological audit trail and timeline generation |
| `anomaly_alerts` | `[batchId, status]` | Filtering unresolved cold-chain incidents per batch |
| `data_anchors` | `[batchId, createdAt DESC]` | Efficient on-chain anchoring verification & proof lookup |
| `audit_logs` | `[entityType, entityId]`, `[createdAt]` | Compliance and forensic query acceleration |

---

## 4. Timestamps & Enums
- All timestamps use PostgreSQL `TIMESTAMPTZ(6)` to guarantee explicit UTC storage and timezone awareness.
- Domain enums guarantee type safety across API and database: `UserRole`, `OrganizationType`, `BatchStatus`, `EventType`, `DetectionMethod`, `AlertSeverity`, `AlertStatus`, `AnchorStatus`.
