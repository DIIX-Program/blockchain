import { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  ShieldCheck, 
  Boxes, 
  Terminal, 
  Copy, 
  Check, 
  Link as LinkIcon
} from 'lucide-react';
import { api } from '../api/client';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function AnchorsPage() {
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  if (loading) {
    return <LoadingSpinner message="Querying Hardhat blockchain ledger commitments..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--indigo-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Consensus & Cryptographic Proofs
          </span>
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
          Blockchain Cryptographic Anchors & EVM Ledger
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Tamper-evident mathematical verification: RFC 8785 canonical JSON telemetry digests sealed to Hardhat EVM smart contract (`ColdChainTracker.sol`).
        </p>
      </div>

      {/* Verification Tool Card */}
      <div
        className="glass-panel"
        style={{
          padding: '28px 32px',
          border: '1px solid rgba(99, 102, 241, 0.35)',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(13, 16, 32, 0.95) 100%)',
          boxShadow: '0 12px 36px -10px rgba(0,0,0,0.7), 0 0 24px rgba(99, 102, 241, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <ShieldCheck size={24} color="var(--cyan-400)" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
            Cryptographic Integrity Verifier
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '22px' }}>
          Audit off-chain PostgreSQL telemetry digests against immutable on-chain Ethereum Hardhat smart contract events.
        </p>

        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '320px' }}>
            <Boxes size={18} color="var(--indigo-400)" />
            <select
              value={selectedBatchId}
              onChange={(e) => {
                setSelectedBatchId(e.target.value);
                setVerificationResult(null);
              }}
              className="form-select"
              style={{ fontWeight: 600 }}
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
            className="btn btn-indigo"
          >
            <ShieldCheck size={16} />
            {verifying ? 'Querying EVM Ledger...' : 'Verify Cryptographic Integrity'}
          </button>
        </div>

        {/* Verification Results Display */}
        {verificationResult && (
          <div
            style={{
              padding: '24px',
              borderRadius: '16px',
              background: verificationResult.isVerified ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
              border: `1px solid ${verificationResult.isVerified ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)'}`,
              animation: 'fadeIn 0.25s ease-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <CheckCircle2 size={24} color={verificationResult.isVerified ? '#10b981' : '#f43f5e'} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: verificationResult.isVerified ? '#34d399' : '#fb7185' }}>
                {verificationResult.isVerified ? 'Cryptographically Verified Authentic & Untampered' : 'No On-Chain Anchor Found'}
              </h3>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '18px' }}>
              Batch <strong>{verificationResult.batchNumber}</strong> has {verificationResult.confirmedAnchorCount} confirmed commitment(s) mined on the Hardhat ledger.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {verificationResult.anchors.map((a: any) => (
                <div key={a.id} style={{ background: 'rgba(10, 14, 23, 0.75)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--cyan-300)', fontWeight: 600 }}>
                      Hash Algorithm: {a.hashAlgorithm} (RFC 8785 Canonical JSON)
                    </span>
                    <span className="mono" style={{ fontSize: '0.78rem', color: '#10b981' }}>
                      Confirmed: {new Date(a.confirmedAt).toLocaleString()} UTC
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: '8px', marginBottom: '10px' }}>
                    <span className="mono" style={{ fontSize: '0.825rem', color: '#ffffff', wordBreak: 'break-all' }}>
                      {a.canonicalHash}
                    </span>
                    <button
                      onClick={() => handleCopy(a.canonicalHash)}
                      className="btn-icon"
                      title="Copy hash"
                      style={{ padding: '4px' }}
                    >
                      {copiedHash === a.canonicalHash ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    </button>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <LinkIcon size={13} color="var(--cyan-400)" />
                      <span>EVM Tx: <span className="mono" style={{ color: '#38bdf8' }}>{a.txHash}</span></span>
                    </div>
                    {a.blockNumber && (
                      <span className="badge badge-indigo" style={{ fontSize: '0.68rem' }}>
                        Block Height #{a.blockNumber}
                      </span>
                    )}
                    <span style={{ color: 'var(--text-muted)' }}>
                      Committed: {a.readingCount} telemetry readings
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Smart Contract Specifications Architecture Reference */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <Terminal size={20} color="var(--cyan-400)" />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
            Hardhat EVM Smart Contract Architecture Reference
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'rgba(10, 14, 23, 0.6)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              Contract Artifact:
            </span>
            <span className="mono" style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.95rem' }}>
              ColdChainTracker.sol
            </span>
          </div>

          <div style={{ background: 'rgba(10, 14, 23, 0.6)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              Local RPC Node:
            </span>
            <span className="mono" style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.95rem' }}>
              http://127.0.0.1:8545 (ChainID 31337)
            </span>
          </div>

          <div style={{ background: 'rgba(10, 14, 23, 0.6)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              Contract Deployment:
            </span>
            <span className="mono" style={{ color: 'var(--cyan-300)', fontWeight: 700, fontSize: '0.85rem' }}>
              0x5FbDB2315678afecb367f032d93F642f64180aa3
            </span>
          </div>

          <div style={{ background: 'rgba(10, 14, 23, 0.6)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
              Consensus Event:
            </span>
            <span className="mono" style={{ color: '#34d399', fontWeight: 700, fontSize: '0.85rem' }}>
              BatchDataAnchored(batchId, hash)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
