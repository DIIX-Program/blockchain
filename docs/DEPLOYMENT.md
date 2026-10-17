# DEPLOYMENT

Monorepo: `smart-cold-chain-traceability`. Workspaces (npm, hoisted `node_modules`
at repo root): `apps/api`, `apps/web`, `contracts`, `services/simulator`.
`services/ai` is a standalone Python package (not an npm workspace).

## Prerequisites

| Dependency | Why | Version verified |
|---|---|---|
| Node.js | backend, frontend, contracts, simulator | v22.22.1 |
| npm | workspaces / deps | 9.2.0 |
| Python | AI anomaly service | ≥3.11 (venv has 3.14) |
| GNU Make (optional) | one-shot targets | — |
| Docker / Docker Compose | PostgreSQL + optional EVM gateway | — |

## Environment

Copy `.env.example` → `.env` and fill in secrets. Key variables:

```bash
# API
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/coldchain_db?schema=public"
JWT_SECRET="<64-char random hex>"
JWT_EXPIRES_IN=24h
AI_SERVICE_URL=http://localhost:8000
AI_API_KEY=            # if AI service has auth enabled; leave empty for local dev
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Simulator
SIMULATOR_API_URL=http://localhost:4000/api/v1/sensors/telemetry
SIMULATOR_INTERVAL_MS=5000
SIMULATOR_BATCH_ID=<existing batch UUID>
SIMULATOR_DEVICE_ID=<existing device UUID>

# Web
VITE_API_URL=http://localhost:4000/api/v1
```

> The default `DEPLOYER_PRIVATE_KEY` is Hardhat account #0 (local dev only).
> **Never** use it on a live chain.

## Local development (one terminal per pane)

```bash
# 1. PostgreSQL (+ seed data)
docker compose up -d postgres
cd apps/api && npm run prisma:generate && npm run prisma:migrate && npm run prisma:seed

# 2. EVM gateway (Hardhat in-memory node) — keep running
npm run dev:node          # contracts/package.json: hardhat node  (0.0.0.0:8545)
cd contracts && npx hardhat run scripts/deploy.ts --network localhost   # prints CONTRACT_ADDRESS

# 3. Backend API
npm run dev:api           # http://localhost:4000

# 4. AI anomaly service
cd services/ai && . .venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8000

# 5. Web dashboard
npm run dev:web           # http://localhost:5173
```

### Running the simulator

```bash
cd services/simulator
SIMULATOR_ONCE=false SIMULATOR_INTERVAL_MS=5000 \
SIMULATOR_BATCH_ID=<uuid> SIMULATOR_DEVICE_ID=<uuid> \
npm start
```

`SIMULATOR_ONCE=true` emits one pass over all six scenarios and exits (handy for
fixtures).

## Production notes

- Run API with `NODE_ENV=production`; the `build` script compiles to `apps/api/dist`
  (`node dist/server.js`).
- Web: `npm --prefix apps/web run build` produces a static build for any SSR/node
  host or static CDN.
- EVM: for production, point `BLOCKCHAIN_RPC_URL`/`CONTRACT_ADDRESS`/
  `DEPLOYER_PRIVATE_KEY` at your RPC (e.g. Alchemy/Infura) + deployed contract.
  Keep the key in a secret manager — never in repo.
- AI service: `uvicorn app.main:app --workers 2`. Set `AI_API_KEY` and have the
  API send it via `X-API-Key` for internal authentication.
- Health endpoints: `GET http://host:4000/api/v1/health` (API),
  `GET http://host:8000/health` (AI), `GET http://host:8545` (EVM node).

## Useful one-liners

```bash
npm run build          # build all npm workspaces
npm run dev:node       # hardhat node (EVM)
npx hardhat test       # contracts, from contracts/
. services/ai/.venv/bin/activate && pytest -q     # AI service
cd apps/api && node ../../node_modules/.bin/tsx --test test/*.test.ts
cd services/simulator && node ../../node_modules/.bin/tsx --test src/*.test.ts
npm --prefix apps/web run build
```
