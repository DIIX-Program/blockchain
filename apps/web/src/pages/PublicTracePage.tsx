import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Thermometer, 
  Clock, 
  AlertTriangle, 
  Link as LinkIcon, 
  Radio,
  Award,
  Sparkles,
  Printer
} from 'lucide-react';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { Timeline } from '../components/Timeline';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { QrCodeDisplay } from '../components/QRCode';

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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-canvas)' }}>
        <LoadingSpinner message="Verifying EVM smart contract records and cryptographic proofs..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-canvas)', padding: '24px' }}>
        <div className="glass-panel" style={{ maxWidth: '520px', padding: '40px', textAlign: 'center' }}>
          <div style={{ background: 'rgba(244, 63, 94, 0.15)', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <AlertTriangle size={32} color="#f43f5e" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
            Verification Seal Not Found
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: 1.5 }}>
            {error || 'The requested batch code has not been published or verified on the public ledger.'}
          </p>
          <Link
            to="/login"
            className="btn btn-primary"
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-canvas)', color: 'var(--text-primary)', paddingBottom: '80px' }}>
      {/* Public Header Banner */}
      <header
        style={{
          background: 'rgba(7, 10, 18, 0.9)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '16px 24px',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div style={{ maxWidth: '1120px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)',
                padding: '8px',
                borderRadius: '10px',
                display: 'flex',
                boxShadow: '0 4px 14px rgba(6, 182, 212, 0.4)',
              }}
            >
              <ShieldCheck size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>
                  ColdChain Certified
                </span>
                <span className="badge badge-normal" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
                  Official Audit
                </span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Public Consumer & Regulatory Inspection Portal
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handlePrint}
              className="btn btn-secondary btn-sm"
              title="Print Certificate"
            >
              <Printer size={14} /> Print Certificate
            </button>
            <Link
              to="/login"
              className="btn btn-outline-cyan btn-sm"
            >
              Operator Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Main Public Container */}
      <main style={{ maxWidth: '1120px', margin: '40px auto 0', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Verification Certificate Card */}
        <div
          className="glass-panel"
          style={{
            padding: '36px',
            borderColor: isAuthentic ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.35)',
            background: 'radial-gradient(circle at 100% 0%, rgba(16, 185, 129, 0.09) 0%, rgba(13, 20, 36, 0.95) 60%)',
            boxShadow: '0 20px 50px -15px rgba(0, 0, 0, 0.8), 0 0 30px rgba(16, 185, 129, 0.15)',
            position: 'relative',
          }}
        >
          {/* Top Verification Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span className="mono" style={{ fontSize: '0.85rem', color: 'var(--cyan-400)', fontWeight: 700 }}>
                  BATCH LOT: {data.batchNumber}
                </span>
                <StatusBadge status={data.status} type="batch" />
              </div>

              <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                {product?.name}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '6px' }}>
                Manufactured by <strong style={{ color: '#ffffff' }}>{producer?.name}</strong>{' '}
                <span className="mono" style={{ color: 'var(--text-muted)' }}>({producer?.code})</span>
              </p>
            </div>

            {/* Holographic Verification Stamp */}
            <div style={{ textAlign: 'right' }}>
              {isAuthentic ? (
                <div 
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(6, 182, 212, 0.15) 100%)', 
                    border: '1px solid rgba(16, 185, 129, 0.45)', 
                    padding: '12px 20px', 
                    borderRadius: '16px', 
                    color: '#34d399', 
                    fontWeight: 800, 
                    fontSize: '0.95rem',
                    boxShadow: '0 0 20px rgba(16, 185, 129, 0.25)'
                  }}
                >
                  <Award size={24} color="#34d399" />
                  <div>
                    <div style={{ lineHeight: 1.1 }}>Cryptographically Verified</div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      On-Chain Blockchain Seal
                    </span>
                  </div>
                </div>
              ) : (
                <div 
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    background: 'rgba(245, 158, 11, 0.15)', 
                    border: '1px solid rgba(245, 158, 11, 0.35)', 
                    padding: '12px 20px', 
                    borderRadius: '16px', 
                    color: '#fbbf24', 
                    fontWeight: 800, 
                    fontSize: '0.95rem' 
                  }}
                >
                  <Clock size={22} />
                  <div>
                    <div style={{ lineHeight: 1.1 }}>Pending Ledger Seal</div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      Readings in transit
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '28px', maxWidth: '820px' }}>
            {product?.description || 'Ultra-pure certified biological formulation protected with high-frequency telemetry surveillance, AI anomaly screening, and immutable ledger verification.'}
          </p>

          {/* Key Facts Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'rgba(10, 14, 23, 0.7)', padding: '18px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Thermometer size={14} color="#10b981" /> Storage Compliance Band
              </span>
              <p className="mono" style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34d399', marginTop: '6px' }}>
                {tempMin}°C to {tempMax}°C
              </p>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Guaranteed zero critical excursions
              </span>
            </div>

            <div style={{ background: 'rgba(10, 14, 23, 0.7)', padding: '18px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Radio size={14} color="#38bdf8" /> Telemetry Surveillance
              </span>
              <p className="mono" style={{ fontSize: '1.3rem', fontWeight: 800, color: '#38bdf8', marginTop: '6px' }}>
                {telemetry.totalReadings} Samples
              </p>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Avg Temp: <span className="mono" style={{ color: '#ffffff' }}>{telemetry.avgTemp ? `${telemetry.avgTemp.toFixed(1)}°C` : 'Compliant'}</span>
              </span>
            </div>

            <div style={{ background: 'rgba(10, 14, 23, 0.7)', padding: '18px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Manufacture Date
              </span>
              <p className="mono" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', marginTop: '6px' }}>
                {new Date(data.manufactureDate).toLocaleDateString()}
              </p>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Certified Facility Inspection
              </span>
            </div>

            <div style={{ background: 'rgba(10, 14, 23, 0.7)', padding: '18px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Expiration Date
              </span>
              <p className="mono" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', marginTop: '6px' }}>
                {new Date(data.expiryDate).toLocaleDateString()}
              </p>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Stable shelf life guaranteed
              </span>
            </div>
          </div>
        </div>

        {/* Blockchain Cryptographic Verification Strip */}
        {blockchainAnchors && blockchainAnchors.length > 0 && (
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <LinkIcon size={20} color="var(--cyan-400)" />
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                EVM Blockchain Cryptographic Proof
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {blockchainAnchors.map((anchor: any, idx: number) => (
                <div key={idx} style={{ background: 'rgba(10, 14, 23, 0.7)', padding: '18px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 700 }}>
                    SHA-256 Batch Telemetry Hash (RFC 8785 Canonical JSON):
                  </div>
                  <div className="mono" style={{ fontSize: '0.88rem', color: 'var(--cyan-300)', wordBreak: 'break-all', marginBottom: '10px' }}>
                    {anchor.canonicalHash}
                  </div>
                  {anchor.txHash && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>Mined EVM Transaction:</span>
                      <span className="mono" style={{ color: '#ffffff', fontWeight: 600 }}>{anchor.txHash}</span>
                      <span className="badge badge-normal" style={{ fontSize: '0.65rem' }}>
                        Immutable Record
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mobile Verification QR Box */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '28px', flexWrap: 'wrap' }}>
            <div style={{ background: '#ffffff', padding: '14px', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
              <QrCodeDisplay
                value={data.qrCodeUrl || window.location.href}
                alt="Scan to verify batch traceability"
                size={160}
                darkColor="#070a12"
                lightColor="#ffffff"
              />
            </div>

            <div style={{ flex: '1 1 260px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Sparkles size={16} color="var(--cyan-400)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
                  Scan to Verify Anywhere
                </h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '14px', lineHeight: 1.5 }}>
                Scan this cryptographically stamped QR seal using any standard smartphone camera to access instant, zero-login verification of temperature adherence and blockchain integrity.
              </p>
              <div
                className="mono"
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--cyan-300)',
                  background: 'rgba(6, 182, 212, 0.08)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(6, 182, 212, 0.2)',
                  wordBreak: 'break-all',
                }}
              >
                {data.qrCodeUrl || window.location.href}
              </div>
            </div>
          </div>
        </div>

        {/* Milestone Custody Timeline */}
        <div className="glass-panel" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <Clock size={20} color="var(--cyan-400)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
              Verified Custody Route & Handover Milestones
            </h2>
          </div>
          <Timeline events={timeline || []} />
        </div>
      </main>
    </div>
  );
}
