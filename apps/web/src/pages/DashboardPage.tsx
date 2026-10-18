import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Boxes, 
  Package, 
  AlertTriangle, 
  Link as LinkIcon, 
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Cpu,
  Clock,
  ExternalLink,
  Radio,
  QrCode
} from 'lucide-react';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [aiHealth, setAiHealth] = useState<'online' | 'offline'>('online');

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [batchesRes, productsRes, alertsRes, devicesRes] = await Promise.all([
          api.getBatches('?limit=8'),
          api.getProducts('?limit=6'),
          api.getAlerts('?limit=6'),
          api.getDevices('?limit=10'),
        ]);

        setBatches(batchesRes.data || []);
        setProducts(productsRes.data || []);
        setAlerts(alertsRes.data || []);
        setDevices(devicesRes.data || []);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }

      // Check subservice health
      fetch('http://localhost:8000/health')
        .then((res) => (res.ok ? setAiHealth('online') : setAiHealth('offline')))
        .catch(() => setAiHealth('offline'));
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Connecting to cryogenic telemetry streams & ledger..." />;
  }

  const activeInTransit = batches.filter((b) => b.status === 'IN_TRANSIT').length;
  const openAlerts = alerts.filter((a) => a.status === 'OPEN').length;
  const activeDevices = devices.filter((d) => d.status === 'ACTIVE').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Hero Command Center Header */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start', 
          flexWrap: 'wrap', 
          gap: '20px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(7, 10, 18, 0.95) 100%)',
          padding: '28px 32px',
          borderRadius: '20px',
          border: '1px solid var(--border-medium)',
          boxShadow: '0 12px 36px -10px rgba(0,0,0,0.7), 0 0 24px rgba(6, 182, 212, 0.15)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span className="beacon-dot online" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cyan-400)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Live Operations Control
            </span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Cold-Chain Surveillance Fleet
            </span>
          </div>

          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
            Smart Cold-Chain Operations Command
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '6px', maxWidth: '780px' }}>
            Unified real-time IoT multi-parameter telemetry, Scikit-learn AI anomaly surveillance, and Hardhat EVM ledger cryptographic anchoring.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link
            to="/batches"
            className="btn btn-primary"
            style={{ fontSize: '0.85rem' }}
          >
            <Boxes size={15} /> All Batches ({batches.length})
          </Link>
          <Link
            to="/alerts"
            className={`btn ${openAlerts > 0 ? 'btn-danger' : 'btn-secondary'}`}
            style={{ fontSize: '0.85rem' }}
          >
            <AlertTriangle size={15} /> Incidents ({openAlerts})
          </Link>
          <Link
            to="/trace/BATCH-VAX-2026-001"
            target="_blank"
            className="btn btn-outline-cyan"
            style={{ fontSize: '0.85rem' }}
          >
            <QrCode size={15} /> Scan Public QR
          </Link>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        {/* Batches Stat */}
        <div className="glass-panel" style={{ padding: '22px 26px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Monitored Batches
              </span>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.1, marginTop: '4px' }}>
                {batches.length}
              </div>
            </div>
            <div style={{ background: 'rgba(6, 182, 212, 0.15)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
              <Boxes size={22} color="var(--cyan-400)" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#fbbf24' }}>
            <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
              <TrendingUp size={12} /> {activeInTransit} in-transit
            </span>
            <span style={{ color: 'var(--text-muted)' }}>active routes</span>
          </div>
        </div>

        {/* Products Stat */}
        <div className="glass-panel" style={{ padding: '22px 26px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Product SKUs
              </span>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.1, marginTop: '4px' }}>
                {products.length}
              </div>
            </div>
            <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <Package size={22} color="#38bdf8" />
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Biologics, vaccines & perishables
          </div>
        </div>

        {/* IoT Devices Stat */}
        <div className="glass-panel" style={{ padding: '22px 26px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                IoT Telemetry Fleet
              </span>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.1, marginTop: '4px' }}>
                {devices.length}
              </div>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <Radio size={22} color="#10b981" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#34d399' }}>
            <span className="badge badge-normal" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
              {activeDevices} Active
            </span>
            <span style={{ color: 'var(--text-muted)' }}>sensors streaming</span>
          </div>
        </div>

        {/* AI Incidents Stat */}
        <div className="glass-panel" style={{ padding: '22px 26px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                AI Anomaly Triage
              </span>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: openAlerts > 0 ? '#fb7185' : '#34d399', lineHeight: 1.1, marginTop: '4px' }}>
                {openAlerts}
              </div>
            </div>
            <div style={{ background: openAlerts > 0 ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)', padding: '10px', borderRadius: '12px', border: openAlerts > 0 ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)' }}>
              <AlertTriangle size={22} color={openAlerts > 0 ? '#f43f5e' : '#10b981'} />
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {alerts.filter((a) => a.status === 'RESOLVED').length} resolved by compliance
          </div>
        </div>
      </div>

      {/* 4-Tier Hybrid Architecture Status Strip */}
      <div
        className="glass-panel"
        style={{
          padding: '18px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Cpu size={18} color="var(--cyan-400)" />
          <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#ffffff', letterSpacing: '0.02em' }}>
            4-Tier Architecture Operational Status:
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span className="badge badge-normal" style={{ fontSize: '0.72rem' }}>
            <span className="beacon-dot online" style={{ width: 6, height: 6 }} /> Tier 1: IoT Simulators & DHT22
          </span>
          <span className="badge badge-normal" style={{ fontSize: '0.72rem' }}>
            <span className="beacon-dot online" style={{ width: 6, height: 6 }} /> Tier 2: PostgreSQL 16 (Port 5432)
          </span>
          {aiHealth === 'online' ? (
            <span className="badge badge-normal" style={{ fontSize: '0.72rem' }}>
              <span className="beacon-dot online" style={{ width: 6, height: 6 }} /> Tier 3: AI Isolation Forest (Port 8000)
            </span>
          ) : (
            <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>
              <Clock size={11} /> Tier 3: AI Service Standby
            </span>
          )}
          <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>
            <LinkIcon size={11} /> Tier 4: EVM Hardhat (Network 31337)
          </span>
        </div>
      </div>

      {/* Two Column Grid: Recent Batches & AI Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px' }}>
        {/* Recent Batches Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Boxes size={20} color="var(--cyan-400)" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>Active Batches in Transit & Storage</h2>
            </div>
            <Link to="/batches" style={{ color: 'var(--cyan-400)', fontSize: '0.825rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View all <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {batches.slice(0, 5).map((batch) => (
              <div
                key={batch.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: 'rgba(15, 23, 42, 0.55)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  transition: 'all 0.18s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Link
                      to={`/batches/${batch.id}`}
                      style={{ fontWeight: 700, color: '#ffffff', textDecoration: 'none', fontSize: '0.95rem' }}
                    >
                      {batch.batchNumber}
                    </Link>
                    <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {batch.quantity} units
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '2px' }}>
                    {batch.product?.name} • <span className="mono">{batch.product?.tempMinC}°C to {batch.product?.tempMaxC}°C</span>
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <StatusBadge status={batch.status} type="batch" />
                  <Link
                    to={`/trace/${batch.batchNumber}`}
                    target="_blank"
                    title="Public QR Verification Portal"
                    className="btn-icon"
                    style={{ padding: '6px' }}
                  >
                    <ExternalLink size={14} color="var(--cyan-400)" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent AI Anomaly Alerts Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={20} color="#f43f5e" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>AI Thermal Anomaly Stream</h2>
            </div>
            <Link to="/alerts" style={{ color: '#fb7185', fontSize: '0.825rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Triage alerts <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {alerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={32} color="#10b981" style={{ marginBottom: '8px' }} />
                <p>All active cold chains running within verified limits.</p>
              </div>
            ) : (
              alerts.slice(0, 4).map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    padding: '14px 18px',
                    background: 'rgba(244, 63, 94, 0.04)',
                    border: '1px solid rgba(244, 63, 94, 0.2)',
                    borderRadius: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <StatusBadge status={alert.severity} type="severity" />
                      <span className="mono" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>
                        {alert.ruleViolated || alert.detectionMethod}
                      </span>
                    </div>
                    <StatusBadge status={alert.status} type="alert" />
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', lineHeight: 1.4 }}>
                    {alert.explanation}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    <span>Batch: <span className="mono" style={{ color: 'var(--text-secondary)' }}>{alert.batch?.batchNumber}</span></span>
                    <span className="mono">{new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} UTC</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
