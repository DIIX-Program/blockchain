# LIMITATIONS & FUTURE WORK

## Sandbox constraints (this environment)

- **PostgreSQL — now available.** A locally-extracted PostgreSQL 16 binary
  runs on port 5432 via `LD_LIBRARY_PATH`-redirected system libraries. All
  DB-runtime suites (`auth_rbac`, `database`, and `e2e.test.ts`) execute green.
  The binary path is `/tmp/pg16/usr/lib/postgresql/16/bin/postgres`; the data
  directory is `/tmp/pgdata`; the unix socket is at `/tmp/pgsocket`. To
  restart:
  ```bash
  LD_LIBRARY_PATH=/tmp/pg_libs2/usr/lib/x86_64-linux-gnu:/usr/lib/x86_64-linux-gnu:/lib/x86_64-linux-gnu \
    /tmp/pg16/usr/lib/postgresql/16/bin/pg_ctl -D /tmp/pgdata -l /tmp/pglog start \
    -o "-p 5432 -k /tmp/pgsocket"
  ```
- **Local EVM is simulated.** There is no Sep-olia/mainnet RPC. The on-chain
  paths are validated against Hardhat's in-memory node (`npx hardhat node`),
  which is equivalent for anchoring/verification/testing but is **not a real
  chain** — gas costs, re-orgs, and finality semantics differ.
- **`.env` is gitignored and secrets are redacted** in this session; all
  private keys cited are the standard Hardhat development account #0.

## Design trade-offs

- **Hash-only anchoring.** We anchor an RFC 8785 SHA-256 digest, not raw
  readings. This keeps gas bounded but means consumers must re-fetch the
  off-chain readings (from the API or an archive) to recompute the hash and
  verify integrity. A future **Merkle‑tree** root over sorted readings would
  let light clients verify a single reading against the anchor without the full
  set.
- **Async, best-effort AI scoring.** Telemetry ingestion never blocks on the AI
  service; anomaly detection is fire-and-forget. If the AI service is down,
  readings are still recorded and a later re-scan/anchor can recompute alerts.
  A durable outbox queue (Redis/PostgreSQL) would make this resumable.
- **Single signer for anchoring.** The backend uses one deployer/operator key
  (`DEPLOYER_PRIVATE_KEY`). Production should route anchors through a
  multi-sig / keeper network and rotate the worker key via the contract's
  `setWorkerAuthorization`.
- **QR = URL reference, not embedded proof.** The QR encodes a traceability URL;
  it is a discovery entry-point, not a self-contained Merkle proof. A future
  enhancement embeds a verifiable credential (e.g. W3C VC / signed JWT) in the
  QR payload for offline verification.

## Future work (out of current scope)

- Batch analysis trigger (`POST /analysis/analyze-batch` for a whole batch at
  once) — the client exists (`aiClient.analyzeBatch`) but no batching route is
  wired yet.
- On-chain custody events — `recordCustodyEvent` exists in the contract but no
  route emits it; tie it to `POST /events` (CUSTODY_HANDOVER).
- Merkle root field (`DataAnchor.merkleRoot`) is currently nullable/unsed —
  populate it for per-reading membership proofs.
- Web: replace the pure-SVG temperature chart with an interactive chart library
  and add authenticated wallet connection for the anchor panel.
- CI: add GitHub Actions running the full matrix (contracts, AI, API DB-free,
  simulator, web build) plus the DB suites against a Postgres service container.
- The repo-root `DESIGN.md` is a stray template unrelated to this project
  (Airbnb license token). It should be deleted or replaced with the project's
  own architecture/design doc.
