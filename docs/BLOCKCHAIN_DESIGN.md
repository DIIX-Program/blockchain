# BLOCKCHAIN DESIGN — ColdChainTracker

## 1. Purpose

The `ColdChainTracker` Solidity contract provides an **immutable, public
tamper-evidence layer** for cold-chain shipment data. The backend does not store
raw sensor data on-chain (too expensive); instead it stores a single
**RFC 8785 canonical hash** (SHA-256 of the deterministically-canonicalized
reading list) on-chain. Consumers can then independently recompute the hash from
the off-chain data and compare it to the on-chain value to prove integrity.

## 2. Contract surface (`contracts/contracts/ColdChainTracker.sol`)

| Function | Visibility | Auth | Returns |
|---|---|---|---|
| `anchorBatchData(bytes32 batchId, bytes32 dataHash, uint32 readingCount, string schemaVersion)` | external | `onlyAuthorized` | emits `BatchDataAnchored` |
| `getBatchAnchor(bytes32 batchId)` | external view | — | `(bytes32 dataHash, uint256 timestamp, address submitter, uint32 readingCount, string schemaVersion, bool exists)` struct |
| `recordCustodyEvent(bytes32 batchId, EventType, string location, address toActor)` | external | `onlyAuthorized` | emits `CustodyEventRecorded` |
| `getBatchEventsCount(bytes32 batchId)` | external view | — | `uint256` |
| `setWorkerAuthorization(address worker, bool authorized)` | external | `onlyOwner` | — |
| `owner()` / `authorizedWorkers(address)` | view | — | `address` / `bool` |

**Authorization model:** the constructor sets `owner = msg.sender` and marks the
deployer as an authorized worker (`authorizedWorkers[deployer] = true`). Any
address can be granted/revoked by the owner via `setWorkerAuthorization`.

## 3. Deterministic mapping (off-chain ↔ on-chain)

| Domain value | On-chain type | Encoding (ethers v6) |
|---|---|---|
| batch UUID (e.g. `123e4567-e89b-12d3-a456-426614174000`) | `bytes32` | `ethers.id(batchId)` = `keccak256(utf8(batchId))` |
| canonical hash (64 hex, no `0x`) | `bytes32` | `ethers.getBytes('0x' + canonicalHash)` |

> UUIDs are 36 characters (>32 bytes), so `encodeBytes32String` would throw.
> Hashing the UTF-8 bytes is the robust, length-independent mapping and is used
> consistently by both the anchor worker and the verifier.

## 4. Canonical hashing (RFC 8785 JCS)

`apps/api/src/lib/canonical.ts` implements JSON‑Canonicalization Scheme
lexicographic key ordering with ECMA‑262 number formatting, then SHA‑256:

```
canonicalize(obj)  →  canonical UTF-8 JSON string (keys sorted, nested, arrays ordered)
canonicalHash(obj) →  64-char lowercase hex SHA-256 of canonicalize(obj)
```

Normalization rules (tested, 17 cases):
- **Keys sorted recursively** (including nested objects and arrays of objects).
- **Array order preserved** (a reading list is order-sensitive).
- **Numbers** use the shortest ECMA‑262 round-trippable representation.
- `-0` → `0`; `NaN`, `Infinity`, `-Infinity`, `BigInt`, and `undefined` are **rejected**.

`computeBatchCanonicalHash(readings)` normalizes persisted readings
(Prisma `Decimal` → number, `Date` → ISO-8601, `BigInt` sequence → number) and
returns the hash that is anchored on-chain. The **same function** is used by
`POST /anchors` (anchor) and `GET /anchors/verify/:batchId` (verify), so the
on-chain and off-chain hashes are guaranteed to agree.

## 5. Backend EVM worker (`apps/api/src/lib/evm.ts`)

Exposes:

- `isEvmConfigured()` — true when `BLOCKCHAIN_RPC_URL`, `CONTRACT_ADDRESS`,
  and `DEPLOYER_PRIVATE_KEY` are all set.
- `anchorBatchToEvm(batchId, canonicalHashHex, readingCount, schemaVersion='1.0.0')`
  — signs & sends `anchorBatchData`, waits for the receipt, returns
  `{ txHash, blockNumber }`. Throws on chain errors.
- `verifyBatchOnChain(batchId, localCanonicalHashHex)` — calls
  `getBatchAnchor(ethers.id(batchId))` and returns:
  - `MATCH` — anchor exists **and** `onChainHash == localHash`.
  - `MISMATCH` — anchor exists but hashes differ (tamper evidence).
  - `PENDING` — no anchor yet (or EVM not configured).
  - `UNAVAILABLE` — RPC call failed.

## 6. Anchoring flow

```
POST /api/v1/anchors { batchId }
  │
  1. fetch unanchored SensorReading rows for the batch (ordered by sequence, time)
  2. localHash = computeBatchCanonicalHash(readings)         // RFC 8785
  3. create DataAnchor row:  status = PENDING, canonicalHash = localHash
  4. if caller supplied txHash → mark CONFIRMED (off-chain anchor accepted)
  5. else if isEvmConfigured() → anchorBatchToEvm(...) → mark CONFIRMED + txHash/blockNumber
     (catch → keep PENDING, the verification endpoint will surface UNAVAILABLE)
  6. mark all those readings anchored = true
  7. return 201 { anchor, ... }
```

## 7. Verification flow

```
GET /api/v1/anchors/verify/:batchId
  │
  1. fetch batch + confirmed anchors + all readings
  2. localHash = computeBatchCanonicalHash(readings)
  3. onChain   = verifyBatchOnChain(batchId, localHash)
  4. isVerified = (anchors exist) AND (onChain.status === 'MATCH')
  5. return { isVerified, onChain, anchors, localCanonicalHash }
```

## 8. Testability

`apps/api/test/evm_anchor.test.ts` is **DB-free**: it boots a Hardhat in-memory
node (`npx hardhat node`), deploys `ColdChainTracker` with Hardhat account #0
(owner + authorized), then asserts:
- `anchorBatchToEvm` returns a mined `{ txHash, blockNumber }`,
- `verifyBatchOnChain` returns `MATCH` for the correct hash,
- a different local hash yields `MISMATCH`,
- an un-anchored batchId yields `PENDING` (exists=false).

Contracts are independently covered by `contracts/test/ColdChainTracker.test.ts`
(`onlyAuthorized` accept/reject) and the anchor/verification round-trip is
exercised end-to-end by the Hardhat node test above.

## 9. Config

| Variable | Default | Role |
|---|---|---|
| `BLOCKCHAIN_RPC_URL` | `http://127.0.0.1:8545` | JSON-RPC (Hardhat/Anvil) |
| `CONTRACT_ADDRESS` | `0x5FbDB2...` | deployed `ColdChainTracker` |
| `DEPLOYER_PRIVATE_KEY` | Hardhat account #0 | authorized signer/wallet |
