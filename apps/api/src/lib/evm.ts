import { ethers } from 'ethers';
import { config } from '../config';
import { ReadableReading, computeBatchCanonicalHash } from './canonical';

/**
 * Minimal ABI for the ColdChainTracker surface the backend anchors / verifies.
 * Inlined (rather than imported from TypeChain artifacts) so this module has
 * no runtime file dependency and stays type-safe via ethers itself.
 */
const COLDCHAIN_ABI = [
  'function anchorBatchData(bytes32 batchId, bytes32 dataHash, uint32 readingCount, string calldata schemaVersion) external',
  'function recordCustodyEvent(bytes32 batchId, uint8 eventType, string calldata location, address toActor) external',
  'function getBatchAnchor(bytes32 batchId) external view returns (bytes32 dataHash, uint256 timestamp, address submitter, uint32 readingCount, string memory schemaVersion, bool exists)',
  'function getBatchEventsCount(bytes32 batchId) external view returns (uint256)',
  'function setWorkerAuthorization(address worker, bool authorized) external',
  'function owner() view returns (address)',
] as const;

/** The on-chain anchor verification status returned by `verifyBatchOnChain`. */
export type OnChainStatus = 'MATCH' | 'MISMATCH' | 'PENDING' | 'UNAVAILABLE';

export interface EvmAnchorResult {
  txHash: string;
  blockNumber: number;
}

export interface OnChainVerification {
  status: OnChainStatus;
  /** On-chain dataHash (64-char hex, no 0x), or null if not anchored. */
  onChainHash: string | null;
  localHash: string | null;
  readingCount: number;
  exists: boolean;
  error?: string;
}

export class EvmConfigError extends Error {
  constructor(
    message = 'EVM anchoring is not configured. Set BLOCKCHAIN_RPC_URL, CONTRACT_ADDRESS and DEPLOYER_PRIVATE_KEY.',
  ) {
    super(message);
    this.name = 'EvmConfigError';
  }
}

/** Whether the required EVM config is present. */
export function isEvmConfigured(): boolean {
  return Boolean(
    config.BLOCKCHAIN_RPC_URL &&
      config.CONTRACT_ADDRESS &&
      config.DEPLOYER_PRIVATE_KEY,
  );
}

function createProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(config.BLOCKCHAIN_RPC_URL);
}

function createSigner(): ethers.Wallet {
  if (!config.DEPLOYER_PRIVATE_KEY) {
    throw new EvmConfigError();
  }
  return new ethers.Wallet(config.DEPLOYER_PRIVATE_KEY, createProvider());
}

/** Connected (signer-backed) ColdChainTracker contract instance. */
export function getColdChainContract(): ethers.Contract {
  if (!config.CONTRACT_ADDRESS) {
    throw new EvmConfigError();
  }
  return new ethers.Contract(config.CONTRACT_ADDRESS, [...COLDCHAIN_ABI], createSigner());
}

/**
 * Map a UUID/string batchId → on-chain `bytes32` key using `keccak256(utf8)`.
 * Deterministic and 32 bytes; UUIDs (which are > 32 UTF-8 bytes) cannot use
 * `encodeBytes32String`, so hashing is the robust choice.
 */
export function batchIdBytes32(batchId: string): string {
  return ethers.id(batchId);
}

/**
 * Compute the local RFC 8785 canonical hash for a batch's readings.
 * Thin wrapper kept here so the same normalization powers both the anchor
 * submission and the on-chain verification.
 */
export function computeLocalBatchHash(readings: ReadableReading[]): string {
  return computeBatchCanonicalHash(readings);
}

/**
 * Anchor a batch's canonical hash on-chain.
 *
 * @param batchId          UUID of the batch (mapped to bytes32 via keccak256).
 * @param canonicalHashHex 64-char lowercase hex SHA-256 (no 0x) of the batch
 *                         readings (RFC 8785 canonical form).
 * @param readingCount     Number of readings covered by the hash.
 * @param schemaVersion    Canonicalization schema version (stored on chain).
 */
export async function anchorBatchToEvm(
  batchId: string,
  canonicalHashHex: string,
  readingCount: number,
  schemaVersion = '1.0.0',
): Promise<EvmAnchorResult> {
  const contract = getColdChainContract();
  const dataHash = ethers.getBytes('0x' + canonicalHashHex);
  const tx = await contract.anchorBatchData(
    batchIdBytes32(batchId),
    dataHash,
    readingCount,
    schemaVersion,
  );
  const receipt = await tx.wait();
  return {
    txHash: receipt.hash,
    blockNumber: Number(receipt.blockNumber),
  };
}

/**
 * Query the chain for a batch's anchor and compare the on-chain `dataHash` to
 * the locally-computed canonical hash.
 *
 * - `MATCH`     : on-chain hash == local hash (data integrity verified).
 * - `MISMATCH`  : anchor exists but hash differs (data tampered after anchor).
 * - `PENDING`   : no anchor on chain yet (or EVM not configured).
 * - `UNAVAILABLE`: RPC/call failed.
 */
export async function verifyBatchOnChain(
  batchId: string,
  localCanonicalHashHex: string,
): Promise<OnChainVerification> {
  if (!isEvmConfigured()) {
    return {
      status: 'PENDING',
      onChainHash: null,
      localHash: localCanonicalHashHex,
      readingCount: 0,
      exists: false,
      error: 'EVM not configured (CONTRACT_ADDRESS/BLOCKCHAIN_RPC_URL/DEPLOYER_PRIVATE_KEY unset)',
    };
  }

  try {
    const contract = getColdChainContract();
    const record = await contract.getBatchAnchor(batchIdBytes32(batchId));
    if (!record.exists) {
      return {
        status: 'PENDING',
        onChainHash: null,
        localHash: localCanonicalHashHex,
        readingCount: 0,
        exists: false,
      };
    }
    // ethers returns bytes as a Uint8Array; normalize to a 64-char hex string.
    const onChainHex = ethers.hexlify(record.dataHash).slice(2);
    const match = onChainHex.toLowerCase() === localCanonicalHashHex.toLowerCase();
    return {
      status: match ? 'MATCH' : 'MISMATCH',
      onChainHash: onChainHex,
      localHash: localCanonicalHashHex,
      readingCount: Number(record.readingCount),
      exists: true,
    };
  } catch (err) {
    return {
      status: 'UNAVAILABLE',
      onChainHash: null,
      localHash: localCanonicalHashHex,
      readingCount: 0,
      exists: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
