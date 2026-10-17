# Smart Cold-Chain Supply Chain Traceability System — Project Plan

> **Vietnamese Title**: Xây dựng hệ thống truy xuất nguồn gốc chuỗi cung ứng lạnh thông minh tích hợp IoT, AI và Blockchain.  
> **Course / Capstone**: Đề tài 3 - Smart Cold-Chain Traceability with IoT, AI & Blockchain (Nhóm 10)  
> **Author**: Senior Systems Architect & Development Team  
> **Status**: Approved Blueprint — Foundation for Implementation

---

## 1. Executive Summary & Problem Statement

### 1.1 Problem Context
Global supply chains for temperature-sensitive products (biopharmaceuticals, vaccines, premium dairy, and fresh seafood) suffer from critical vulnerabilities:
1. **Siloed & Ephemeral Data**: Traditional data loggers are read offline or stored within isolated logistics databases.
2. **Post-Incident Tampering & Repudiation**: When thermal excursion occurs during transit, parties have an incentive to alter or delete logs to evade liability.
3. **Delayed Alarm Reaction**: Threshold alarms triggered post-delivery cannot prevent spoilage in real time.
4. **Blockchain Bloat Fallacy**: Attempting to commit high-frequency raw IoT data directly to a blockchain network incurs prohibitive gas costs and degrades network throughput.

### 1.2 System Solution
This project implements a **four-layer hybrid architecture**:
1. **IoT Perception & Simulation Layer**: Continuous telemetry streaming (temperature, humidity, GPS coordinates, timestamp, sequence number) via realistic simulation with an optional physical ESP32 path.
2. **Intelligent Analytics Layer**: Hybrid anomaly detection coupling transparent, explainable threshold rules with unsupervised Machine Learning (Isolation Forest) to detect contextual micro-fluctuations and excursions.
3. **Off-Chain Storage & Data Integrity Layer**: Scalable off-chain persistence (PostgreSQL with Prisma ORM) with deterministic canonicalization (RFC 8785) producing cryptographic SHA-256 digests and Merkle Tree batch commitments.
4. **On-Chain Consensus & Smart Contract Layer**: Solidity smart contract deployed on an EVM network (Hardhat local testnet) establishing immutable anchoring of batch digests, custody handover events, and tamper verification.
5. **Consumer & Stakeholder Presentation Layer**: Polished React + TypeScript web dashboard and a zero-login public QR verification portal.

---

## 2. System Boundaries & Scope

### 2.1 Core MVP (In Scope)
- **Monorepo Architecture**: Clean separation between frontend, backend API, AI service, smart contracts, and infrastructure.
- **Role-Based Access Control (RBAC)**: `ADMIN`, `PRODUCER`, `TRANSPORTER`, `WAREHOUSE_OPERATOR`, `VIEWER`, plus public unauthenticated access to the consumer traceability endpoint.
- **Configurable IoT Simulator**: Deterministic scenarios (normal, temperature breach, thermal spike, delivery delay/stationary, packet loss, suspicious detour).
- **Explainable AI Anomaly Engine**:
  - Phase A: Deterministic threshold violation engine.
  - Phase B: Scikit-learn Isolation Forest model with anomaly scoring and versioned persistence.
- **Cryptographic Anchoring**: Canonical JSON hashing with SHA-256 and Solidity smart contract (`ColdChainTracker.sol`) verifying hash commitments.
- **Verification Engine**: Backend verification evaluating records against on-chain anchors (`MATCH`, `MISMATCH`, `PENDING`, `UNAVAILABLE`).
- **Web UI & QR Traceability**: Rich dashboard for enterprise operators and a clean public QR scan portal.
- **Complete Test Coverage**: Unit tests for backend, contracts (Hardhat/Ethers), AI service (Pytest), and end-to-end integration flows.

### 2.2 Optional / Future Extensions (Explicitly Labeled)
- Physical ESP32 micro-controller firmware with DHT22/SHT3x sensor integration.
- Distributed IPFS off-chain storage layer (content identifier pinning).
- Sparse Merkle Tree (SMT) for cryptographic non-membership proofs.
- Zero-Knowledge Proofs (ZKP) for enterprise confidentiality preservation.

---

## 3. Technology Stack & Environment

| Component | Technology | Version / Specification | Rationale |
| :--- | :--- | :--- | :--- |
| **Monorepo Manager** | npm Workspaces | npm >= 10, Node.js >= 20 LTS (v24 tested) | Simple, dependency-free monorepo workspace orchestration |
| **Backend Framework** | Node.js + Express | Express 4.x, TypeScript 5.x | High-throughput asynchronous I/O, mature ecosystem |
| **ORM & Database** | Prisma ORM + PostgreSQL | PostgreSQL 16 (Docker Compose) | Strict relational integrity, type-safe migrations, ACID guarantees |
| **AI / ML Service** | Python + FastAPI | Python 3.12+ (3.14 compatible), FastAPI, Scikit-learn | High-performance async REST API, standardized ML toolchain |
| **Smart Contracts** | Solidity + Hardhat | Solidity ^0.8.24, Hardhat, Ethers.js v6 | Standard EVM developer tooling, fast automated testing |
| **Frontend App** | React + Vite + TypeScript | React 18/19, Vite, TailwindCSS / CSS Modules | Fast bundling, rich UI components, type safety |
| **Charts & Visualization** | Recharts / Chart.js | Canvas/SVG time-series rendering | Smooth rendering of temperature & humidity trajectories |
| **QR Code Engine** | qrcode (Node & React) | Vector SVG / Canvas QR generation | Standardized URLs pointing to public verification endpoint |

---

## 4. Proposed Repository Structure

```
.
├── .env.example                      # Centralized environment template
├── .gitignore                        # Comprehensive ignore rules
├── package.json                      # Root workspace definition
├── README.md                         # Main setup & running instructions
├── docker-compose.yml                # Local PostgreSQL and optional services
│
├── apps/
│   ├── api/                          # Node.js + Express + Prisma REST API
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # Database schema
│   │   │   └── seed.ts               # Demo seed data
│   │   ├── src/
│   │   │   ├── config/               # Environment & constants validation
│   │   │   ├── controllers/          # HTTP route handlers
│   │   │   ├── middlewares/          # Auth, RBAC, error handler, rate limit
│   │   │   ├── services/             # Business logic (hash, blockchain, AI client)
│   │   │   ├── routes/               # API route definitions
│   │   │   ├── types/                # Shared TypeScript contracts
│   │   │   └── utils/                # Canonicalization (RFC 8785), SHA-256
│   │   └── tests/                    # Vitest / Jest integration tests
│   │
│   └── web/                          # React + TypeScript + Vite Dashboard
│       ├── src/
│       │   ├── api/                  # Typed API client
│       │   ├── components/           # Reusable UI components
│       │   ├── contexts/             # AuthContext, ThemeContext
│       │   ├── pages/                # Dashboard, Batches, Monitoring, Alerts, QR
│       │   └── styles/               # CSS Design tokens & layout styles
│       └── index.html
│
├── services/
│   ├── ai/                           # Python FastAPI Anomaly Detection Service
│   │   ├── app/
│   │   │   ├── api/                  # Endpoints (/health, /predict, /analyze-batch)
│   │   │   ├── core/                 # Config & logging
│   │   │   ├── models/               # Model artifact loader & schemas
│   │   │   ├── pipelines/            # Preprocessing, feature extraction
│   │   │   └── rules/                # Deterministic threshold rule engine
│   │   ├── scripts/                  # Synthetic dataset generator & training script
│   │   ├── artifacts/                # Saved model (.joblib) & metadata
│   │   ├── tests/                    # Pytest test suite
│   │   └── requirements.txt          # Python dependencies
│   │
│   └── simulator/                    # IoT Telemetry Simulator
│       ├── src/                      # Scenarios: normal, excursion, delay, detour
│       └── package.json
│
├── contracts/                        # Hardhat EVM Smart Contract Project
│   ├── contracts/
│   │   └── ColdChainTracker.sol      # Hashes, batches, handovers, access control
│   ├── scripts/
│   │   └── deploy.ts                 # Local deployment script
│   ├── test/
│   │   └── ColdChainTracker.test.ts  # Hardhat / Ethers unit tests
│   ├── hardhat.config.ts
│   └── package.json
│
├── infra/                            # Infrastructure configurations
│   └── docker/                       # Dockerfiles & DB initialization
│
└── docs/                             # Full architectural & technical documentation
    ├── PROJECT_PLAN.md               # This document
    ├── ARCHITECTURE.md               # Complete system architecture & Mermaid diagrams
    ├── DATA_MODEL.md                 # Entity specifications & DB ERD
    ├── IMPLEMENTATION_ROADMAP.md     # Sequential task guide & deliverables
    ├── AI_PIPELINE.md                # ML feature design, training & evaluation
    ├── BLOCKCHAIN_DESIGN.md          # Contract specifications & verification rules
    └── DEMO_SCRIPT.md                # Presentation guide for academic evaluation
```

---

## 5. Security, Access Control & Integrity Principles

1. **Defense-in-Depth Authentication & RBAC**:
   - Passwords securely hashed with `bcrypt` (12 rounds) or `argon2`.
   - Stateless JWT tokens signed with a strong secret, carrying user ID, role, and organization ID.
   - Server-side RBAC guards on every mutating endpoint. Frontend guards only serve UI presentation.
2. **Canonical Data Hashing (RFC 8785)**:
   - Data records must be normalized: UTF-8 encoding, deterministic key ordering, UTC timestamps formatted as `YYYY-MM-DDTHH:mm:ss.sssZ`, integers and fixed decimals.
   - Hashing is strictly deterministic: `SHA-256(canonical_json)`.
3. **Honest Blockchain Representation**:
   - The blockchain guarantees **data immutability since the commitment transaction**.
   - It **does not prove physical reality** (an adversary with a corrupt physical sensor could hash inaccurate readings). This crucial distinction is explicitly highlighted in the documentation and UI.
4. **Zero Secret Leakage**:
   - `.env` files are excluded via `.gitignore`.
   - `.env.example` provides clean mock keys with clear instructions.
   - No private keys or JWT secrets are bundled into client code.

---

## 6. Risk Assessment & Mitigation Matrix

| Risk | Likelihood | Impact | Mitigation Strategy |
| :--- | :---: | :---: | :--- |
| **1. Blockchain Latency & Gas Costs** | High | High | Anchor batch summaries and Merkle roots rather than individual sensor records. Keep high-frequency telemetry off-chain in PostgreSQL. |
| **2. AI False Positives on Normal Excursions** | Medium | Medium | Implement two-tier evaluation: threshold-based rules provide transparent alerts; Isolation Forest provides continuous contextual anomaly scores. |
| **3. Duplicate Ingestion from IoT Retries** | High | Medium | Enforce database-level uniqueness on `(deviceId, sequenceNumber, recordedAt)` and idempotency tokens. |
| **4. AI Service Downtime / Crash** | Medium | High | Async/decoupled architecture: sensor ingestion succeeds even if AI service is temporarily offline. Analysis jobs are queued and retried without data loss. |
| **5. Environment Drift on Windows / Docker** | Low | Medium | Standardize on Node.js 20+, Python virtualenv, and Docker Compose for PostgreSQL. All scripts tested across PowerShell. |

---

## 7. Recommended Next Task

Proceed to **TASK 01 — PROJECT SCAFFOLDING**:
- Create monorepo folders (`apps/web`, `apps/api`, `services/ai`, `contracts`, `infra`, `docs`).
- Initialize root `package.json`, `.gitignore`, `.env.example`, and `docker-compose.yml`.
- Configure health check endpoints for API and AI service.
- Verify environment setup and test compilation.
