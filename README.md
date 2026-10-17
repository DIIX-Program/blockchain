# Smart Cold-Chain Supply Chain Traceability System

> **Vietnamese Title**: Xây dựng hệ thống truy xuất nguồn gốc chuỗi cung ứng lạnh thông minh tích hợp IoT, AI và Blockchain  
> **Course / Capstone**: Đề tài 3 — Nhóm 10  
> **Architecture**: 4-Tier Hybrid Traceability (IoT + AI + Off-chain DB + Hardhat EVM Ledger)

---

## 1. System Overview

This system provides end-to-end cold-chain traceability for temperature-sensitive products (such as pharmaceuticals, vaccines, and high-value perishable food):
1. **IoT Simulation & Ingestion**: High-frequency telemetry (temperature, humidity, sequence number, GPS coordinates) ingested with idempotency protection.
2. **AI Anomaly Detection**: Explainable threshold rule engine paired with an unsupervised Scikit-learn **Isolation Forest** model to detect subtle micro-fluctuations and excursions.
3. **Off-Chain Persistence & Canonical Hashing**: PostgreSQL 16 via Prisma ORM for raw records; RFC 8785 canonical JSON formatting with SHA-256 digests.
4. **On-Chain Immutability**: Solidity contract (`ColdChainTracker.sol`) on Hardhat EVM network anchoring batch digests and custody handovers.
5. **Presentation**: Responsive React + Vite web dashboard for enterprise operators and a zero-login public QR verification portal.

---

## 2. Monorepo Structure

```
├── apps/
│   ├── api/            # Node.js + Express + Prisma REST API (Port 4000)
│   └── web/            # React + Vite + TypeScript Web Dashboard (Port 5173)
├── services/
│   ├── ai/             # Python FastAPI Anomaly Detection Service (Port 8000)
│   └── simulator/      # Configurable IoT Telemetry Simulator
├── contracts/          # Solidity Smart Contracts & Hardhat Testnet
├── infra/              # Docker Compose & Infrastructure Configs
└── docs/               # Architecture, Data Model, Roadmap & Plans
```

---

## 3. Prerequisites

- **Node.js**: `v20.x` or later (tested on `v24.19.0`)
- **npm**: `v10.x` or later (tested on `11.17.0`)
- **Python**: `3.10` or later (tested on `3.14.7`)
- **Docker & Docker Compose**: (Optional but recommended for PostgreSQL)
- **Git**: Installed

---

## 4. Quick Start & Installation

### Step 1: Install Node.js Monorepo Dependencies
From the repository root:
```bash
npm install
```

### Step 2: Configure Environment Variables
Copy the template and adjust if necessary:
```bash
cp .env.example .env
```

### Step 3: Start PostgreSQL Database & Apply Migrations
Using Docker Compose:
```bash
docker compose up -d
```
*(If Docker is not running, ensure a local PostgreSQL 16 instance is running at `localhost:5432` with user `postgres` and password `postgres`).*

Run database migrations and seed realistic demo data:
```bash
# Apply pending Prisma migrations
npm --prefix apps/api run prisma:migrate

# Seed demo cold-chain data (organizations, users, products, batches, sensors, alerts, anchors)
npm --prefix apps/api run prisma:seed

# Optional: Run database automated tests
npm --prefix apps/api run test
```

### Step 4: Setup Python AI Service Environment
In `services/ai`:
```bash
cd services/ai
python -m venv .venv

# On Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# On macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
cd ../..
```

---

## 5. Running Services

Open separate terminals or run in background:

### 1. Backend REST API
```bash
npm run dev:api
```
- API URL: `http://localhost:4000`
- Health check: `http://localhost:4000/health`

### 2. AI Anomaly Service
```bash
cd services/ai
# Ensure venv is activated
uvicorn app.main:app --reload --port 8000
```
- AI Service URL: `http://localhost:8000`
- API Docs (Swagger): `http://localhost:8000/api/v1/docs`
- Health check: `http://localhost:8000/health`

### 3. Frontend Web Dashboard
```bash
npm run dev:web
```
- Web App URL: `http://localhost:5173`

### 4. Smart Contracts (Testing & Local Node)
To run contract tests:
```bash
npm --workspace=@coldchain/contracts run test
```
To spin up a local Hardhat EVM node:
```bash
npm run dev:node
```

### 5. Running Monorepo Automated Tests
```bash
npm test
```
Runs both the PostgreSQL database test suite and Solidity smart contract test suites across all workspaces.

---

## 6. Project Documentation Directory

- [PROJECT_PLAN.md](file:///d:/HocTap/Nam4/learn-blockchain/Nhom10_DeTai3_SMART%20COLD-CHAIN%20TRACEABILITY%20WITH%20IoT,%20AI%20&%20BLOCKCHAIN/docs/PROJECT_PLAN.md): Executive summary, scope, tech stack, risk mitigation.
- [ARCHITECTURE.md](file:///d:/HocTap/Nam4/learn-blockchain/Nhom10_DeTai3_SMART%20COLD-CHAIN%20TRACEABILITY%20WITH%20IoT,%20AI%20&%20BLOCKCHAIN/docs/ARCHITECTURE.md): Architecture diagrams, sequence models, cryptographic specification.
- [DATA_MODEL.md](file:///d:/HocTap/Nam4/learn-blockchain/Nhom10_DeTai3_SMART%20COLD-CHAIN%20TRACEABILITY%20WITH%20IoT,%20AI%20&%20BLOCKCHAIN/docs/DATA_MODEL.md): Relational database entities, ERD, indexes, and idempotency rules.
- [DATABASE_ERD.md](file:///d:/HocTap/Nam4/learn-blockchain/Nhom10_DeTai3_SMART%20COLD-CHAIN%20TRACEABILITY%20WITH%20IoT,%20AI%20&%20BLOCKCHAIN/docs/DATABASE_ERD.md): Detailed Mermaid ERD and relational constraint rules.
- [DATABASE_GUIDE.md](file:///d:/HocTap/Nam4/learn-blockchain/Nhom10_DeTai3_SMART%20COLD-CHAIN%20TRACEABILITY%20WITH%20IoT,%20AI%20&%20BLOCKCHAIN/docs/DATABASE_GUIDE.md): Migration, reset procedures, seeding, and verification guide.
- [BACKEND_API_GUIDE.md](file:///d:/HocTap/Nam4/learn-blockchain/Nhom10_DeTai3_SMART%20COLD-CHAIN%20TRACEABILITY%20WITH%20IoT,%20AI%20&%20BLOCKCHAIN/docs/BACKEND_API_GUIDE.md): REST API endpoints, server-side RBAC permissions matrix, OpenAPI/Swagger docs, and test suite.
- [FRONTEND_UI_GUIDE.md](file:///d:/HocTap/Nam4/learn-blockchain/Nhom10_DeTai3_SMART%20COLD-CHAIN%20TRACEABILITY%20WITH%20IoT,%20AI%20&%20BLOCKCHAIN/docs/FRONTEND_UI_GUIDE.md): React web dashboard architecture, design system, interactive charts, and 10-page route directory.
- [IMPLEMENTATION_ROADMAP.md](file:///d:/HocTap/Nam4/learn-blockchain/Nhom10_DeTai3_SMART%20COLD-CHAIN%20TRACEABILITY%20WITH%20IoT,%20AI%20&%20BLOCKCHAIN/docs/IMPLEMENTATION_ROADMAP.md): Detailed task backlog (Tasks 00 to 12).
