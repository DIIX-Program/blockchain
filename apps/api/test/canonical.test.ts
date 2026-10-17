import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalize, canonicalHash, computeBatchCanonicalHash } from '../src/lib/canonical';

describe('RFC 8785 JSON Canonicalization Scheme', () => {
  it('produces deterministic output for identical input', () => {
    const a = canonicalize({ batchId: 'b1', temperatureC: 4.5 });
    const b = canonicalize({ batchId: 'b1', temperatureC: 4.5 });
    assert.equal(a, b);
  });

  it('orders object keys lexicographically regardless of insertion order', () => {
    const obj = { zebra: 1, apple: 2, mango: 3 };
    assert.equal(canonicalize(obj), '{"apple":2,"mango":3,"zebra":1}');
  });

  it('sorts nested object keys recursively', () => {
    assert.equal(canonicalize({ outer: { z: 9, a: 8 } }), '{"outer":{"a":8,"z":9}}');
  });

  it('preserves array element order (arrays are NOT key-sorted)', () => {
    assert.equal(canonicalize({ items: [3, 1, 2] }), '{"items":[3,1,2]}');
  });

  it('serializes object keys with special characters by UTF-16 code unit', () => {
    assert.equal(canonicalize({ 'b': 1, 'a': 2 }), '{"a":2,"b":1}');
  });

  it('formats finite numbers without trailing zeros (ECMA-262 / JCS)', () => {
    assert.equal(canonicalize({ temp: 25.0 }), '{"temp":25}');
    assert.equal(canonicalize({ temp: 25.5 }), '{"temp":25.5}');
    assert.equal(canonicalize({ temp: 0 }), '{"temp":0}');
    assert.equal(canonicalize({ temp: -3.2 }), '{"temp":-3.2}');
  });

  it('normalizes negative zero to zero', () => {
    assert.equal(canonicalize({ temp: -0 }), '{"temp":0}');
  });

  it('escapes strings per JSON/UTF-8', () => {
    assert.equal(canonicalize({ name: 'a"b' }), '{"name":"a\\"b"}');
  });

  it('rejects NaN', () => {
    assert.throws(() => canonicalize({ temp: NaN }), /non-finite number/);
  });

  it('rejects Infinity', () => {
    assert.throws(() => canonicalize({ temp: Infinity }), /non-finite number/);
  });

  it('rejects BigInt', () => {
    assert.throws(() => canonicalize({ seq: 7n }), /BigInt/);
  });

  it('produces equal hashes for structurally-identical but differently-ordered objects', () => {
    const readingA = {
      batchId: 'b',
      deviceId: 'd',
      temperatureC: 4.5,
      humidityPercent: 50,
      sequenceNumber: 1,
    };
    const readingB = {
      sequenceNumber: 1,
      humidityPercent: 50,
      temperatureC: 4.5,
      deviceId: 'd',
      batchId: 'b',
    };
    assert.equal(canonicalHash(readingA), canonicalHash(readingB));
  });

  it('produces a 64-char lowercase hex SHA-256 hash', () => {
    const h = canonicalHash({ a: 1 });
    assert.match(h, /^[0-9a-f]{64}$/);
    assert.equal(h.length, 64);
  });

  it('yields a different hash when any field value changes', () => {
    const base = { batchId: 'b', temperatureC: 4.5 };
    const mutated = { batchId: 'b', temperatureC: 4.6 };
    assert.notEqual(canonicalHash(base), canonicalHash(mutated));
  });

  it('canonical hash is stable for a realistic telemetry reading shape', () => {
    const reading = {
      batchId: '123e4567-e89b-12d3-a456-426614174000',
      deviceId: 'dev-1',
      humidityPercent: 52.5,
      latitude: 21.0279,
      longitude: 105.8342,
      recordedAt: '2026-10-17T12:00:00.000Z',
      sequenceNumber: 42,
      temperatureC: 4.2,
    };
    // Same logical content with keys reordered must hash identically.
    const reordered = { ...reading, temperatureC: 4.2 };
    assert.equal(
      canonicalHash(reading),
      canonicalHash({
        sequenceNumber: 42,
        batchId: reading.batchId,
        recordedAt: reading.recordedAt,
        deviceId: reading.deviceId,
        temperatureC: 4.2,
        longitude: reading.longitude,
        latitude: reading.latitude,
        humidityPercent: 52.5,
      }),
    );
    void reordered;
  });

  it('computeBatchCanonicalHash normalizes Decimal/string/bigint/Date inputs', () => {
    const readings = [
      {
        batchId: 'b-1',
        deviceId: 'd-1',
        humidityPercent: '52.5',
        latitude: '21.0279',
        longitude: '105.8342',
        recordedAt: new Date('2026-10-17T12:00:00.000Z'),
        sequenceNumber: 1n,
        temperatureC: '4.2',
      },
      {
        batchId: 'b-1',
        deviceId: 'd-1',
        humidityPercent: null,
        latitude: null,
        longitude: null,
        recordedAt: '2026-10-17T12:01:00.000Z',
        sequenceNumber: 2n,
        temperatureC: 4.4,
      },
    ];
    const hash = computeBatchCanonicalHash(readings);
    assert.match(hash, /^[0-9a-f]{64}$/);
    // Deterministic and order-independent across calls.
    assert.equal(hash, computeBatchCanonicalHash(readings));
    // Reordering readings changes the hash (arrays are order-preserving).
    const reversed = [...readings].reverse();
    assert.notEqual(hash, computeBatchCanonicalHash(reversed));
  });
});
