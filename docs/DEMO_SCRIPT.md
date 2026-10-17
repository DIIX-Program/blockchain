# DEMO SCRIPT

A reproducible, end-to-end walk-through. **Steps marked ✅ run in this sandbox
without PostgreSQL.** Steps marked ⚠️ require a running Postgres + seeded DB.

> Tip: open two terminals — one for the Hardhat EVM node (step B), one for the
> rest.

---

## A. Start the smart contract (EVM)  ✅

```bash
cd contracts
npx hardhat node                       # terminal 1: in-memory node on :8545
# in terminal 2:
npx hardhat run scripts/deploy.ts --network localhost
# → ColdChainTracker deployed to 0x5FbDB2...  (Hardhat's default first-deploy address)
npx hardhat test                       # → 3 passing (owner init, authorized anchor, unauthorized reject)
```

## B. Verify the EVM anchor round-trip  ✅

```bash
cd apps/api
node ../../node_modules/.bin/tsx --test test/evm_anchor.test.ts
# → 5 passing: anchors a batch hash on-chain, verifies MATCH, MISMATCH, PENDING
```

## C. Verify the AI anomaly service  ✅

```bash
cd services/ai
. .venv/bin/activate
uvicorn app.main:app --port 8000        # terminal
# terminal 2:
python scripts/generate_dataset.py --n 1000 --anomaly-rate 0.1
python scripts/train.py --csv datasets/synthetic_telemetry.csv
# open http://localhost:8000/api/v1/docs  (or)
cd apps/api && node ../../node_modules/.bin/tsx --test test/ai_client.test.ts
# → 4 passing: model info, normal-reading parse, 99 °C anomaly detection, alert payload
```

## D. Verify the RFC 8785 canonical hashing  ✅

```bash
cd apps/api
node ../../node_modules/.bin/tsx --test test/canonical.test.ts
# → 17 passing (lexicographic key sort, array order preserved, -0→0, NaN/Infinity/BigInt rejected)
```

## E. Verify the IoT simulator  ✅

```bash
cd services/simulator
node ../../node_modules/.bin/tsx --test src/scenarios.test.ts src/telemetryClient.test.ts
# → 48 passing (6 scenarios, reproducibility, envelope ranges, HTTP ingest + error handling)
```

## F. Spin up Postgres + the full backend stack  ⚠️ (needs Docker)

```bash
docker compose up -d postgres
cd apps/api
npm run prisma:generate
npm run prisma:migrate                 # creates schema on :5432
npm run prisma:seed                    # 5 orgs/users + a product + batch BATCH-VAX-2026-001
npm run dev:api                        # http://localhost:4000   (terminal 1)
```

## G. End-to-end (stacks A–F + seeded DB)

1. **Telemetry → AI → Alert**  ⚠️
   ```bash
   # get the seeded batch UUID + a device UUID first:
   curl -s http://localhost:4000/api/v1/auth/login \
     -H 'content-type: application/json' \
     -d '{"email":"producer@vaxlab.com","password":"password123"}'   # → { token }
   TOKEN=...; BATCH=<seeded batch uuid>; DEVICE=<seeded device uuid>
   curl -s http://localhost:4000/api/v1/sensors/telemetry -H "Authorization: Bearer $TOKEN" \
     -H 'content-type: application/json' \
     -d "{\"batchId\":\"$BATCH\",\"deviceId\":\"$DEVICE\",\"sequenceNumber\":1,\"recordedAt\":\"2026-10-17T12:00:00.000Z\",\"temperatureC\":99,\"humidityPercent\":50,\"isSimulated\":true}"
   # → 201 INGESTED; asynchronously an AnomalyAlert is persisted (temp > 50 °C).
   curl -s http://localhost:4000/api/v1/alerts -H "Authorization: Bearer $TOKEN"
   ```
2. **Anchor → verify on chain**  ⚠️ (anchor) + ✅ (verify worker)
   ```bash
   curl -sX POST http://localhost:4000/api/v1/anchors -H "Authorization: Bearer $TOKEN" \
     -H 'content-type: application/json' -d "{\"batchId\":\"$BATCH\"}"
   # → 201, anchor status CONFIRMED + txHash (anchored to the running Hardhat node via BLOCKCHAIN_RPC_URL)
   curl -s http://localhost:4000/api/v1/anchors/verify/$BATCH -H "Authorization: Bearer $TOKEN"
   # → { isVerified:true, onChain:{ status:"MATCH" } }
   ```
3. **Public traceability + QR**  ⚠️
   ```bash
   curl -s http://localhost:4000/api/v1/batches/public/BATCH-VAX-2026-001
   # → JSON incl. qrCodeUrl + blockchainAnchors{canonicalHash,txHash,...}
   # open http://localhost:5173/trace/BATCH-VAX-2026-001  → "Scan to Verify" QR + on-chain status
   ```
4. **Simulator → live backend**  ⚠️
   ```bash
   cd services/simulator
   SIMULATOR_INTERVAL_MS=2000 SIMULATOR_BATCH_ID=$BATCH SIMULATOR_DEVICE_ID=$DEVICE npm start
   ```

## H. Frontend build  ✅

```bash
npm --prefix apps/web run build      # → local preview, tsc clean
```
