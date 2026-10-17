import crypto from 'crypto';

/**
 * RFC 8785 — "JSON Canonicalization Scheme (JCS)".
 *
 * Produces a deterministic, canonical UTF-8 JSON serialization that is
 * independent of property insertion order, so it can be fed to a
 * cryptographic hash (SHA-256) to produce a verifiable data anchor.
 *
 * How this differs from a raw `JSON.stringify` (which the ingestion/anchor
 * routes previously used and which is NOT canonical):
 *  - Object member keys are serialized in lexicographic (UTF-16 code unit)
 *    order regardless of insertion order.
 *  - `undefined`, functions and symbols are rejected rather than silently
 *    omitted.
 *  - `NaN`, `Infinity` and `-Infinity` are rejected (JCS only allows finite
 *    JSON numbers; `JSON.stringify` would silently coerce them to `null`).
 *  - `-0` is normalized to `0` (JCS §3.2.2.3).
 *
 * String escaping and finite-number formatting delegate to the ECMAScript
 * `JSON.stringify` algorithm, which JCS normatively references (ECMA-262),
 * so outputs match the RFC test vectors.
 */

/** True when `typeof value === 'object'` and not an array / null. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Recursively walk the value graph and reject anything JCS cannot represent
 * as a canonical JSON number or string. This catches the cases where
 * `JSON.stringify` would silently produce `null`/drop the value.
 */
function validate(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      validate(item);
    }
    return;
  }
  if (isPlainObject(value)) {
    for (const item of Object.values(value)) {
      validate(item);
    }
    return;
  }
  if (typeof value === 'number') {
    if (Number.isNaN(value) || value === Infinity || value === -Infinity) {
      throw new TypeError(`JCS cannot canonicalize non-finite number: ${value}`);
    }
    return;
  }
  if (typeof value === 'bigint') {
    throw new TypeError('JCS cannot canonicalize BigInt values');
  }
  if (value === undefined) {
    throw new TypeError('JCS cannot canonicalize undefined');
  }
  if (typeof value === 'function' || typeof value === 'symbol') {
    throw new TypeError('JCS cannot canonicalize functions or symbols');
  }
}

/** Recursively sort object keys lexicographically (UTF-16 code unit order). */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (isPlainObject(value)) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortKeys(value[key]);
    }
    return sorted;
  }
  // Normalize -0 to 0 per JCS §3.2.2.3 (Object.is distinguishes -0 from 0).
  if (Object.is(value, -0)) {
    return 0;
  }
  return value;
}

/**
 * Canonicalize a JSON-compatible value into its RFC 8785 canonical string
 * form. Throws if the value contains non-finite numbers, BigInt, undefined,
 * functions or symbols.
 */
export function canonicalize(value: unknown): string {
  if (value === undefined) {
    throw new TypeError('JCS cannot canonicalize undefined');
  }
  validate(value);
  return JSON.stringify(sortKeys(value));
}

/**
 * SHA-256 hash (lowercase hex) of the RFC 8785 canonical JSON serialization
 * of `value`, encoded as UTF-8 bytes. This is the value that gets anchored on
 * chain so that any party can recompute it deterministically.
 */
export function canonicalHash(value: unknown): string {
  return crypto.createHash('sha256').update(canonicalize(value), 'utf8').digest('hex');
}

/**
 * Shape of a raw sensor reading as persisted (Prisma Decimal fields arrive as
 * `Decimal`/`string`/`number`, sequenceNumber as `bigint`, recordedAt as `Date`).
 * Numeric fields are typed `unknown` so any Prisma scalar representation is
 * accepted; normalization coerces them via `Number()` at runtime.
 */
export interface ReadableReading {
  batchId: string;
  deviceId: string;
  humidityPercent: unknown;
  latitude: unknown;
  longitude: unknown;
  recordedAt: Date | string;
  sequenceNumber: unknown;
  temperatureC: unknown;
}

function asNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Compute the RFC 8785 canonical SHA-256 digest of a batch's reading list.
 *
 * This is the value that gets anchored on-chain: both `POST /anchors` and the
 * on-chain verifier must produce identical bytes, so the normalization
 * (Decimal→number, Date→ISO, null handling) lives here in one tested place
 * rather than being duplicated per route.
 */
export function computeBatchCanonicalHash(readings: ReadableReading[]): string {
  const canonical = readings.map((r) => ({
    batchId: r.batchId,
    deviceId: r.deviceId,
    humidityPercent: asNumber(r.humidityPercent),
    latitude: asNumber(r.latitude),
    longitude: asNumber(r.longitude),
    recordedAt:
      r.recordedAt instanceof Date ? r.recordedAt.toISOString() : String(r.recordedAt),
    sequenceNumber: Number(r.sequenceNumber),
    temperatureC: asNumber(r.temperatureC),
  }));
  return canonicalHash(canonical);
}
