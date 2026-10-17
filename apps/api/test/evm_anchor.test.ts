import { spawn } from 'node:child_process';
import { before, after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ethers } from 'ethers';
import { config } from '../src/config';
import {
  batchIdBytes32,
  isEvmConfigured,
  anchorBatchToEvm,
  verifyBatchOnChain,
} from '../src/lib/evm';
import { canonicalHash, computeBatchCanonicalHash } from '../src/lib/canonical';

// DB-free integration test: spins up a Hardhat in-memory node, deploys the
// ColdChainTracker contract, then exercises the real ethers.js worker
// (anchor → verify) against it. No PostgreSQL required.

const CONTRACTS_DIR = path.resolve(__dirname, '../../../contracts');
const ARTIFACT_PATH = path.join(
  CONTRACTS_DIR,
  'artifacts/contracts/ColdChainTracker.sol/ColdChainTracker.json',
);
const HARDHAT_BIN = path.resolve(CONTRACTS_DIR, '../node_modules/hardhat/internal/cli/bootstrap.js');
const RPC_URL = 'http://127.0.0.1:8545';
const DEPLOYER_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

let node: ReturnType<typeof spawn> | null = null;
let childStdout = '';
let childStderr = '';

async function waitForNode(timeoutMs = 30000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
      });
      if (res.ok) {
        const body = (await res.json()) as { result?: string };
        if (typeof body.result === 'string') return;
      }
    } catch {
      // node not ready yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(
    `Hardhat node did not respond within ${timeoutMs}ms.\nstdout: ${childStdout.slice(-2000)}\nstderr: ${childStderr.slice(-2000)}`,
  );
}

describe('Task 09 — EVM anchoring worker (ethers.js)', { concurrency: false }, () => {
  before(async () => {
    if (!fs.existsSync(ARTIFACT_PATH)) {
      throw new Error(`Contract artifact not found at ${ARTIFACT_PATH}. Run 'npx hardhat compile' in contracts/`);
    }

    node = spawn(process.execPath, [HARDHAT_BIN, 'node'], {
      cwd: CONTRACTS_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, HARDHAT_NETWORK: 'hardhat' },
    });
    node.stdout?.on('data', (d) => {
      childStdout += d.toString();
    });
    node.stderr?.on('data', (d) => {
      childStderr += d.toString();
    });

    await waitForNode();

    // Deploy ColdChainTracker with the Hardhat first signer. The constructor
    // sets `owner = msg.sender` and authorizes the deployer automatically, so
    // the same signer can call `anchorBatchData` (onlyAuthorized).
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(DEPLOYER_KEY, provider);
    const artifact = JSON.parse(fs.readFileSync(ARTIFACT_PATH, 'utf8'));
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    const deployedAddress = await contract.getAddress();

    // Point the API config at the freshly deployed instance + Hardhat node.
    config.BLOCKCHAIN_RPC_URL = RPC_URL;
    config.CONTRACT_ADDRESS = deployedAddress;
    config.DEPLOYER_PRIVATE_KEY = DEPLOYER_KEY;
  });

  after(() => {
    if (node) {
      node.kill();
    }
  });

  it('batchIdBytes32 maps a UUID to a 0x-prefixed 32-byte value', () => {
    const b = batchIdBytes32('123e4567-e89b-12d3-a456-426614174000');
    assert.equal(b.slice(0, 2), '0x');
    assert.equal(b.length, 66); // 0x + 64 hex chars
  });

  it('isEvmConfigured reflects env presence', () => {
    assert.equal(isEvmConfigured(), true);
  });

  it('anchors a batch hash on-chain and verifies a MATCH', async () => {
    const batchId = '123e4567-e89b-12d3-a456-426614174000';
    const readings = [
      {
        batchId,
        deviceId: 'd-1',
        humidityPercent: 50,
        latitude: 21.0,
        longitude: 105.8,
        recordedAt: '2026-10-17T12:00:00.000Z',
        sequenceNumber: 1,
        temperatureC: 4.2,
      },
      {
        batchId,
        deviceId: 'd-1',
        humidityPercent: null,
        latitude: null,
        longitude: null,
        recordedAt: '2026-10-17T12:01:00.000Z',
        sequenceNumber: 2,
        temperatureC: 4.4,
      },
    ];
    const localHash = computeBatchCanonicalHash(readings);

    const anchored = await anchorBatchToEvm(batchId, localHash, readings.length);
    assert.match(anchored.txHash, /^0x[0-9a-f]{64}$/);
    assert.equal(typeof anchored.blockNumber, 'number');
    assert.ok(anchored.blockNumber > 0);

    const result = await verifyBatchOnChain(batchId, localHash);
    assert.equal(result.status, 'MATCH');
    assert.equal(result.exists, true);
    assert.equal(result.onChainHash!.toLowerCase(), localHash.toLowerCase());
    assert.equal(result.readingCount, 2);
  });

  it('reports MISMATCH when the local hash differs from the on-chain hash', async () => {
    const batchId = '123e4567-e89b-12d3-a456-426614174000';
    const otherHash = canonicalHash({ tampered: true, batchId, timestamp: 'x' });
    const result = await verifyBatchOnChain(batchId, otherHash);
    assert.equal(result.status, 'MISMATCH');
    assert.equal(result.exists, true);
  });

  it('reports PENDING for a batch that has not been anchored yet', async () => {
    const result = await verifyBatchOnChain('never-anchored-batch', '0'.repeat(64));
    assert.equal(result.status, 'PENDING');
    assert.equal(result.exists, false);
    assert.equal(result.onChainHash, null);
  });
});
