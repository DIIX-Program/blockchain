import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Thermometer, 
  Clock, 
  AlertTriangle, 
  Link as LinkIcon, 
  Radio
} from 'lucide-react';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { Timeline } from '../components/Timeline';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function PublicTracePage() {
  const { batchNumber } = useParams<{ batchNumber: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPublicData() {
      if (!batchNumber) return;
      try {
        setLoading(true);
        setError(null);
        const res = await api.getPublicBatch(batchNumber);
        setData(res);
      } catch (err: any) {
        setError(err?.message || `Batch '${batchNumber}' could not be verified in the traceability registry.`);
      } finally {
        setLoading(false);
      }
    }

    loadPublicData();
  }, [batchNumber]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <LoadingSpinner message="Verifying batch cryptographic proofs from public registry..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', padding: '24px' }}>
        <div className="glass-panel" style={{ maxWidth: '520px', padding: '36px', textAlign: 'center' }}>
          <AlertTriangle size={48} color="#f43f5e" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
            Traceability Verification Failed
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
            {error || 'The requested batch code does not exist.'}
          </p>
          <Link
            to="/login"
            style={{
              display: 'inline-flex',
              padding: '10px 20px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #06b6d4, #0284c7)',
              color: '#ffffff',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.9rem',
            }}
          >
            Access Operator Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { product, producer, telemetry, timeline, blockchainAnchors, isAuthentic } = data;
  const tempMin = product ? Number(product.tempMinC) : 2.0;
  const tempMax = product ? Number(product.tempMaxC) : 8.0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)', paddingBottom: '60px' }}>
      {/* Public Header Banner */}
      <header
        style={{
          background: 'rgba(15, 23, 42, 0.9)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '20px 24px',
          position: 'sticky',
          top: 0,
          zIndex: 30,
          backdropFilter: 'blur(12px)',
        }}
      >
        <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, #06b6d4, #0284c7)',
                padding: '8px',
                borderRadius: '10px',
                display: 'flex',
                boxShadow: '0 4px 12px rgba(6, 182, 212, 0.4)',
              }}
            >
              <ShieldCheck size={22} color="#ffffff" />
            </div>
            <div>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>ColdChain Certified</span>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Public Consumer & Auditor Verification Portal</p>
            </div>
          </div>

          <Link
            to="/login"
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            Operator Sign In
          </Link>
        </div>
      </header>

      {/* Main Public Container */}
      <main style={{ maxWidth: '1080px', margin: '36px auto 0', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {/* Verification Certificate Card */}
        <div
          className="glass-panel"
          style={{
            padding: '32px',
            borderColor: isAuthentic ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-subtle)',
            background: 'radial-gradient(circle at 100% 0%, rgba(16, 185, 129, 0.08) 0%, rgba(18, 24, 38, 0.95) 70%)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="mono" style={{ fontSize: '0.85rem', color: 'var(--primary-cyan)', fontWeight: 700 }}>
                  BATCH: {data.batchNumber}
                </span>
                <StatusBadge status={data.status} type="batch" />
              </div>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff' }}>{product?.name}</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
                Manufactured by <strong style={{ color: '#ffffff' }}>{producer?.name}</strong> ({producer?.code})
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              {isAuthentic ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '8px 16px', borderRadius: '12px', color: '#34d399', fontWeight: 700, fontSize: '0.9rem' }}>
                  <CheckCircle2 size={20} /> Verified On Blockchain
                </div>
              ) : (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '8px 16px', borderRadius: '12px', color: '#fbbf24', fontWeight: 700, fontSize: '0.9rem' }}>
                  <Clock size={20} /> Pending Blockchain Anchor
                </div>
              )}
            </div>
          </div>

          <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '24px' }}>
            {product?.description || 'Ultra-pure certified formulation tracked with automated temperature logging.'}
          </p>

          {/* Key Facts Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '16px', borderRadius: '10px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Thermometer size={14} color="#10b981" /> Storage Compliance Band
              </span>
              <p className="mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
                {tempMin}°C to {tempMax}°C
              </p>
            </div>

            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '16px', borderRadius: '10px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Radio size={14} color="#3b82f6" /> Telemetry Surveillance
              </span>
              <p className="mono" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#60a5fa', marginTop: '4px' }}>
                {telemetry.totalReadings} Readings Logged
              </p>
            </div>

            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '16px', borderRadius: '10px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Manufacture Date</span>
              <p className="mono" style={{ fontSize: '0.95rem', color: '#ffffff', marginTop: '4px' }}>
                {new Date(data.manufactureDate).toISOString().slice(0, 10)}
              </p>
            </div>

            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '16px', borderRadius: '10px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expiration Date</span>
              <p className="mono" style={{ fontSize: '0.95rem', color: '#ffffff', marginTop: '4px' }}>
                {new Date(data.expiryDate).toISOString().slice(0, 10)}
              </p>
            </div>
          </div>
        </div>

        {/* Blockchain Cryptographic Verification Strip */}
        {blockchainAnchors && blockchainAnchors.length > 0 && (
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <LinkIcon size={20} color="var(--primary-cyan)" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
                Hardhat EVM Blockchain Proof Commitment
              </h3>
            </div>
            {blockchainAnchors.map((anchor: any, idx: number) => (
              <div key={idx} style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '14px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>SHA-256 Batch Telemetry Hash:</div>
                <div className="mono" style={{ fontSize: '0.85rem', color: 'var(--primary-cyan)', wordBreak: 'break-all', marginBottom: '8px' }}>
                  {anchor.canonicalHash}
                </div>
                {anchor.txHash && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Mined Transaction Hash: <span className="mono" style={{ color: '#ffffff' }}>{anchor.txHash}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Milestone Timeline */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Clock size={20} color="var(--primary-cyan)" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>
              Custody Journey & Milestone Verifications
            </h3>
          </div>
          <Timeline events={timeline || []} />
        </div>
      </main>
    </div>
  );
}
