# System Architecture Specification

> **System**: Smart Cold-Chain Supply Chain Traceability System Using IoT, AI, and Blockchain  
> **Document**: Technical Architecture, Integration Protocols, and Sequence Models  
> **Status**: Approved Baseline

---

## 1. High-Level System Architecture

The system uses a **four-layer hybrid architecture** designed to solve the trade-off between IoT telemetry frequency and public/private blockchain transaction cost:
- High-frequency time-series telemetry is ingested and retained **off-chain** in a relational PostgreSQL database.
- Cryptographic fingerprints (canonical SHA-256 digests and Merkle Tree batch commitments) are anchored **on-chain** to provide tamper-evidence and non-repudiation.
- The AI service operates asynchronously over telemetry windows to flag violations without impeding real-time ingestion throughput.

```mermaid
graph TB
    subgraph Layer1["1. IoT Perception & Simulation Layer"]
        Sim["IoT Telemetry Simulator<br/>(Normal, Spike, Delay, Detour)"]
        ESP["Physical ESP32 / DHT22 Sensor<br/>(Optional Hardware Extension)"]
    end

    subgraph Layer2["2. Ingestion & Application Backend (Node.js + Express)"]
        Ingest["Ingestion Controller<br/>(Idempotency & Range Checks)"]
        Auth["RBAC & Auth Service<br/>(JWT, Bcrypt, Role Guards)"]
        Canon["Canonicalization Engine<br/>(RFC 8785 Normalized JSON)"]
        AnchorSvc["Blockchain Anchoring Worker<br/>(Ethers.js v6)"]
        VerifySvc["Integrity Verification Engine<br/>(MATCH / MISMATCH Evaluator)"]
    end

    subgraph Layer3["3. Off-Chain Storage & AI Analytics"]
        DB[("PostgreSQL 16 Database<br/>(Prisma ORM)")]
        AISvc["AI Anomaly Detection Service<br/>(FastAPI + Scikit-learn)"]
        RuleEng["Rule-Based Threshold Engine"]
        IsoForest["Isolation Forest Model Engine"]
    end

    subgraph Layer4["4. Distributed Ledger Layer (EVM Local Testnet)"]
        Node["Hardhat EVM Local Network<br/>(RPC: http://127.0.0.1:8545)"]
        Contract["ColdChainTracker.sol<br/>(Hash Commitments & Handovers)"]
    end

    subgraph Layer5["5. Stakeholder & Consumer Presentation"]
        AdminUI["Operator & Admin Dashboard<br/>(React + Vite + Charts)"]
        PublicQR["Public QR Verification Portal<br/>(Zero-Login Consumer Page)"]
    end

    %% Flows
    Sim -->|"HTTP POST /api/v1/sensors/telemetry"| Ingest
    ESP -.->|"HTTP POST /api/v1/sensors/telemetry"| Ingest
    Ingest -->|"Persist raw reading"| DB
    Ingest -->|"Trigger async evaluation"| AISvc
    AISvc --> RuleEng
    AISvc --> IsoForest
    AISvc -->|"Store Anomaly Alerts"| DB

    DB -->|"Select Batch Readings"| Canon
    Canon -->|"Compute SHA-256 / Merkle Root"| AnchorSvc
    AnchorSvc -->|"anchorBatchHash() tx"| Contract
    Contract --- Node
    Contract -->|"Confirmed Event"| AnchorSvc
    AnchorSvc -->|"Update DataAnchor status"| DB

    AdminUI -->|"REST API + JWT"| Auth
    VerifySvc -->|"Fetch On-Chain Commit"| Contract
    VerifySvc -->|"Re-hash off-chain records"| DB
    PublicQR -->|"GET /api/v1/public/trace/:batchId"| VerifySvc
```

---

## 2. Component Boundaries & Responsibilities

| Subsystem | Primary Responsibilities | Boundaries & Non-Goals |
| :--- | :--- | :--- |
| **IoT Simulator (`services/simulator`)** | Generates realistic, reproducible sensor readings (batchId, deviceId, sequenceNumber, temperature, humidity, coordinates). Emulates failure modes. | Does not talk directly to database or blockchain; sends standard HTTP JSON payloads. |
| **Backend API (`apps/api`)** | Validates payloads, enforces RBAC, computes RFC 8785 canonical hashes, manages database transactions, communicates with AI service and smart contract. | Does not train ML models; does not store sensitive keys in client-accessible responses. |
| **Database (`PostgreSQL`)** | Persists users, organizations, products, batches, sensor readings, anomaly alerts, anchors, and audit trails. | Enforces relational constraints; never stores plaintext passwords. |
| **AI Service (`services/ai`)** | Evaluates sensor windows against configurable threshold rules and scikit-learn Isolation Forest model; outputs anomaly scores and explanation metadata. | Does not alter database records directly; responds to REST requests from the backend API. |
| **Smart Contract (`contracts`)** | Records immutable cryptographic commitments (`bytes32` hash, batch ID, event type, timestamp, sender); emits indexing events. | Does not store raw sensor readings or personal identifiable information. |
| **Web Dashboard (`apps/web`)** | Provides visual monitoring, time-series charts, batch creation, handover tracking, alert management, and QR code generation. | Enforces route guards; relies on backend API for actual RBAC authorization. |
| **Public QR Portal (`apps/web`)** | Accessible without authentication; displays product journey, storage compliance, anomaly notices, and cryptographic integrity verification. | Restricts access to public batch metadata only; no internal user or system logs exposed. |

---

## 3. Core Sequence Models

### 3.1 Telemetry Ingestion and AI Anomaly Evaluation Flow

```mermaid
sequenceDiagram
    autonumber
    participant Dev as IoT Simulator / Device
    participant API as Backend Ingestion API
    participant DB as PostgreSQL
    participant AI as AI FastAPI Service

    Dev->>API: POST /api/v1/sensors/telemetry {batchId, deviceId, seq, temp, hum, lat, lon, timestamp}
    API->>API: Validate schema & idempotency key
    API->>DB: Check if reading exists (deviceId + seq + recordedAt)
    alt Duplicate Reading
        DB-->>API: Duplicate record found
        API-->>Dev: HTTP 200 OK (idempotent ignore)
    else New Reading
        API->>DB: INSERT INTO SensorReading (...)
        DB-->>API: Persisted (readingId)
        API-->>Dev: HTTP 201 Created {id, status: "INGESTED"}
        
        Note over API,AI: Asynchronous Anomaly Evaluation
        API->>AI: POST /api/v1/ai/evaluate-reading {batchId, currentReading, recentWindow}
        AI->>AI: Execute Rule-Based Engine (temp/humidity bounds)
        AI->>AI: Execute Isolation Forest Inference (anomaly score)
        alt Anomaly Detected
            AI-->>API: {isAnomaly: true, method: "HYBRID", score: 0.82, reason: "Temp excursion > 8°C"}
            API->>DB: INSERT INTO AnomalyAlert (batchId, severity: "HIGH", evidence)
        else Normal Reading
            AI-->>API: {isAnomaly: false, score: 0.12}
        end
    end
```

---

### 3.2 Custody Handover & Cryptographic Anchoring Flow

```mermaid
sequenceDiagram
    autonumber
    participant User as Transporter / Warehouse Operator
    participant API as Backend Core API
    participant DB as PostgreSQL
    participant ETH as Smart Contract (Hardhat EVM)

    User->>API: POST /api/v1/batches/:batchId/events (Custody Handover Event)
    API->>API: Verify User Role (RBAC: TRANSPORTER / WAREHOUSE_OPERATOR)
    API->>DB: BEGIN Transaction
    API->>DB: INSERT INTO SupplyChainEvent (...)
    API->>DB: UPDATE Batch SET status = 'IN_TRANSIT', currentHolderId = ...
    
    Note over API,DB: Canonical Hash Computation
    API->>DB: SELECT * FROM SensorReading WHERE batchId = :batchId AND anchored = false
    API->>API: Canonicalize records (RFC 8785) & compute SHA-256 digest
    API->>DB: INSERT INTO DataAnchor (batchId, hash, status: 'PENDING')
    API->>DB: COMMIT Transaction
    API-->>User: HTTP 200 OK (Event logged, anchor initiated)

    Note over API,ETH: Asynchronous On-Chain Commitment
    API->>ETH: anchorBatchData(batchId, bytes32 canonicalHash, eventType, timestamp)
    ETH->>ETH: Check caller permissions (authorized worker)
    ETH->>ETH: Store anchor & emit BatchDataAnchored(batchId, hash, timestamp)
    ETH-->>API: Transaction Receipt (txHash, blockNumber)
    API->>DB: UPDATE DataAnchor SET status = 'CONFIRMED', txHash = ..., blockNumber = ...
```

---

### 3.3 Public QR Code Scan & Hash Integrity Verification Flow

```mermaid
sequenceDiagram
    autonumber
    participant Consumer as Consumer / Inspector (Mobile Browser)
    participant UI as Public Web App (/trace/:batchId)
    participant API as Public Traceability API
    participant DB as PostgreSQL
    participant ETH as Smart Contract

    Consumer->>UI: Scan QR Code (Navigates to /trace/BATCH-2026-001)
    UI->>API: GET /api/v1/public/batches/BATCH-2026-001/verify
    API->>DB: Fetch Batch, Product info, SupplyChainEvents, SensorReadings, and Anchor records
    API->>API: Re-canonicalize off-chain sensor readings (RFC 8785)
    API->>API: Compute fresh SHA-256 digest
    
    API->>ETH: Call getBatchAnchor(batchId)
    alt Blockchain Unreachable / Network Error
        API-->>UI: Return verificationState: "UNAVAILABLE"
    else Anchor Not Yet Submitted
        API-->>UI: Return verificationState: "PENDING"
    else Anchor Found on Blockchain
        ETH-->>API: onChainHash, blockTimestamp, txBlock
        alt freshHash == onChainHash
            API-->>UI: Return verificationState: "MATCH" (Integrity Verified)
        else freshHash != onChainHash
            API-->>UI: Return verificationState: "MISMATCH" (Tampering Detected!)
        end
    end
    UI->>Consumer: Render Verified Journey, Sensor Graph, and Blockchain Proof Badge
```

---

## 4. Cryptographic Integrity Specification

### 4.1 Canonical Data Format (RFC 8785)
To ensure identical input yields identical SHA-256 hashes across different platforms, sensor readings are serialized into Canonical JSON:
1. **Key Ordering**: All object keys sorted lexicographically by UTF-16 code units.
2. **Whitespace**: No whitespace outside of string literals (compact serialization).
3. **Number Formatting**: Decimals serialized with fixed precision (e.g. 2 decimal places for temperature and humidity: `4.50`).
4. **Timestamp Standardization**: UTC ISO-8601 strings ending in `Z` with millisecond precision: `YYYY-MM-DDTHH:mm:ss.sssZ`.
5. **Character Encoding**: Strict UTF-8.

#### Canonical Telemetry Object Example:
```json
{"batchId":"BATCH-2026-001","deviceId":"DEV-COLD-01","humidityPercent":65.20,"latitude":10.7626,"longitude":106.6601,"recordedAt":"2026-10-17T13:30:00.000Z","sequenceNumber":101,"temperatureC":4.20}
```
**Canonical Digest**: `SHA-256(canonical_bytes)` -> `0x3a7b9c...` (`bytes32`).

### 4.2 Verification State Machine

```
      +-----------------------------+
      |      Compute Fresh Hash     |
      +-----------------------------+
                     |
                     v
      +-----------------------------+
      |  Fetch On-Chain Commitment  |
      +-----------------------------+
        /            |            \
       /             |             \
[RPC Offline]   [Not Found]    [Found Hash]
      |              |              |
      v              v              v
+-----------+  +-----------+        |
|UNAVAILABLE|  |  PENDING  |        |
+-----------+  +-----------+        |
                                    v
                     +-----------------------------+
                     | Does Fresh Hash == On-Chain?|
                     +-----------------------------+
                                /         \
                             [Yes]        [No]
                              /             \
                             v               v
                      +-----------+    +-----------+
                      |   MATCH   |    | MISMATCH  |
                      | (Intact)  |    | (Tampered)|
                      +-----------+    +-----------+
```

---

## 5. Smart Contract Design (`ColdChainTracker.sol`)

### 5.1 Storage Structures
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ColdChainTracker {
    enum EventType { CREATED, DISPATCHED, IN_TRANSIT, HANDOVER, DELIVERED, ALERT }

    struct AnchorRecord {
        bytes32 dataHash;       // SHA-256 canonical digest or Merkle Root
        uint256 timestamp;      // Block timestamp of commitment
        address submitter;      // Authorized account that anchored the hash
        uint32 readingCount;    // Number of telemetry records encapsulated
        string schemaVersion;   // E.g., "1.0.0"
        bool exists;
    }

    struct CustodyEvent {
        bytes32 batchId;
        EventType eventType;
        string location;
        address fromActor;
        address toActor;
        uint256 timestamp;
    }

    // batchId => latest AnchorRecord
    mapping(bytes32 => AnchorRecord) public batchAnchors;
    // batchId => array of custody handover events
    mapping(bytes32 => CustodyEvent[]) public batchEvents;

    event BatchDataAnchored(bytes32 indexed batchId, bytes32 indexed dataHash, address indexed submitter, uint256 timestamp);
    event CustodyTransferred(bytes32 indexed batchId, EventType eventType, address indexed fromActor, address indexed toActor, uint256 timestamp);
}
```

---

## 6. Security & Threat Model

1. **Tampering in Transit (Database Injection)**: An attacker who modifies database values will alter the freshly computed hash. The next verification against `ColdChainTracker.sol` immediately produces `MISMATCH`.
2. **Replay / Duplicate Sensor Attacks**: The ingestion API enforces unique index constraints `(deviceId, sequenceNumber, recordedAt)`. Duplicated packets are dropped or acknowledged idempotently without distorting history.
3. **Privilege Escalation**: Backend endpoints enforce token authentication with role-based checks. Even if a user crafts a valid JWT, their role must have permission for the specific action (`PRODUCER` can create batches; only `ADMIN` can register new devices).
4. **Physical Oracle Limitation (Acknowledged Principle)**: Cryptographic verification guarantees that the off-chain records are **identical to what was anchored at time $T$**. It does **not** prove the physical DHT22 sensor was calibrated truthfully. This limitation is prominently surfaced in the UI and academic reporting.
