import { useState, useEffect } from 'react';
import { CheckCircle2, ShieldCheck, Boxes, Terminal } from 'lucide-react';
import { api } from '../api/client';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function AnchorsPage() {
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    async function initBatches() {
      try {
        setLoading(true);
        const res = await api.getBatches('?limit=50');
        const list = res.data || [];
        setBatches(list);
        if (list.length > 0) {
          setSelectedBatchId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load batches:', err);
      } finally {
        setLoading(false);
      }
    }

    initBatches();
  }, []);

  const handleVerify = async () => {
    if (!selectedBatchId) return;
    try {
      setVerifying(true);
      const res = await api.verifyBatchAnchors(selectedBatchId);
      setVerificationResult(res);
    } catch (err: any) {
      alert(err?.message || 'Verification query failed');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Querying Hardhat blockchain ledger commitments..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>
          Blockchain Cryptographic Proofs & Anchors
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Hardhat EVM smart contract immutability layer verifying off-chain RFC 8785 canonical data digests
        </p>
      </div>

      {/* Verification Tool Card */}
      <div
        className="glass-panel"
        style={{
          padding: '28px',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          boxShadow: '0 10px 30px rgba(6, 182, 212, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <ShieldCheck size={24} color="var(--primary-cyan)" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
            Cryptographic Integrity Verifier
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
          Cross-examine off-chain PostgreSQL telemetry digests against immutable Hardhat smart contract events.
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '300px' }}>
            <Boxes size={18} color="var(--primary-cyan)" />
            <select
              value={selectedBatchId}
              onChange={(e) => {
                setSelectedBatchId(e.target.value);
                setVerificationResult(null);
              }}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#0f172a',
                border: '1px solid var(--border-active)',
                color: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchNumber} — {b.product?.name} ({b.status})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleVerify}
            disabled={verifying}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #06b6d4, #0284c7)',
              border: 'none',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: verifying ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {verifying ? 'Querying EVM Ledger...' : 'Verify Cryptographic Integrity'}
          </button>
        </div>

        {/* Verification Results Display */}
        {verificationResult && (
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              background: verificationResult.isVerified ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
              border: `1px solid ${verificationResult.isVerified ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <CheckCircle2 size={24} color={verificationResult.isVerified ? '#10b981' : '#f43f5e'} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: verificationResult.isVerified ? '#34d399' : '#fb7185' }}>
                {verificationResult.isVerified ? 'Cryptographically Verified Authentic' : 'No On-Chain Proof Found'}
              </h3>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '16px' }}>
              Batch <strong>{verificationResult.batchNumber}</strong> has {verificationResult.confirmedAnchorCount} confirmed commitment(s) mined on the Hardhat ledger.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {verificationResult.anchors.map((a: any) => (
                <div key={a.id} style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '12px 16px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--primary-cyan)' }}>
                      Hash Algorithm: {a.hashAlgorithm} (RFC 8785 JSON)
                    </span>
                    <span className="mono" style={{ fontSize: '0.75rem', color: '#10b981' }}>
                      Confirmed: {new Date(a.confirmedAt).toISOString().slice(0, 19)} UTC
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#ffffff', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', marginBottom: '6px' }}>
                    Digest: {a.canonicalHash}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '12px' }}>
                    <span>Tx Hash: <span className="mono" style={{ color: '#38bdf8' }}>{a.txHash}</span></span>
                    {a.blockNumber && <span>Block Height: #{a.blockNumber}</span>}
                    <span>Committed Records: {a.readingCount} Readings</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Smart Contract Specifications */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Terminal size={20} color="var(--primary-cyan)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
            Smart Contract Architecture Reference
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', fontSize: '0.85rem' }}>
          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '16px', borderRadius: '10px' }}>
            <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Contract Artifact:</span>
            <span className="mono" style={{ color: '#ffffff', fontWeight: 600 }}>ColdChainTracker.sol</span>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '16px', borderRadius: '10px' }}>
            <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Local RPC Endpoint:</span>
            <span className="mono" style={{ color: '#ffffff', fontWeight: 600 }}>http://127.0.0.1:8545</span>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '16px', borderRadius: '10px' }}>
            <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>EVM Deployment Address:</span>
            <span className="mono" style={{ color: 'var(--primary-cyan)', fontWeight: 600 }}>0x5FbDB2315678afecb367f032d93F642f64180aa3</span>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '16px', borderRadius: '10px' }}>
            <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Commitment Event:</span>
            <span className="mono" style={{ color: '#34d399', fontWeight: 600 }}>BatchDataAnchored(batchId, hash)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
