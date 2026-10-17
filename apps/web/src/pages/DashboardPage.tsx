import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Boxes, 
  Package, 
  Activity, 
  AlertTriangle, 
  Link as LinkIcon, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  Cpu,
  Clock,
  ExternalLink
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
          api.getBatches('?limit=5'),
          api.getProducts('?limit=5'),
          api.getAlerts('?limit=5'),
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
    return <LoadingSpinner message="Loading cold-chain telemetry & ledger overview..." />;
  }

  const activeInTransit = batches.filter((b) => b.status === 'IN_TRANSIT').length;
  const openAlerts = alerts.filter((a) => a.status === 'OPEN').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            System Operations Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Real-time multi-tier cold chain surveillance, AI anomaly telemetry & EVM ledger verification
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link
            to="/batches"
            className="badge badge-cyan"
            style={{ padding: '8px 16px', textDecoration: 'none', fontSize: '0.8rem' }}
          >
            <Boxes size={14} /> View All Batches
          </Link>
          <Link
            to="/alerts"
            className="badge badge-alert"
            style={{ padding: '8px 16px', textDecoration: 'none', fontSize: '0.8rem' }}
          >
            <AlertTriangle size={14} /> Active Incidents ({openAlerts})
          </Link>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        {/* Batches Stat */}
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Batches</span>
            <div style={{ background: 'rgba(6, 182, 212, 0.15)', padding: '8px', borderRadius: '8px' }}>
              <Boxes size={20} color="var(--primary-cyan)" />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
            {batches.length}
          </div>
          <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={14} /> {activeInTransit} batch active in-transit
          </div>
        </div>

        {/* Products Stat */}
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Catalog SKUs</span>
            <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '8px', borderRadius: '8px' }}>
              <Package size={20} color="#3b82f6" />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
            {products.length}
          </div>
          <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Temperature-controlled profiles
          </div>
        </div>

        {/* IoT Devices Stat */}
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Active Devices</span>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '8px', borderRadius: '8px' }}>
              <Activity size={20} color="#10b981" />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
            {devices.length}
          </div>
          <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#34d399' }}>
            Telemetry heartbeat synchronized
          </div>
        </div>

        {/* AI Incidents Stat */}
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>AI Anomalies</span>
            <div style={{ background: 'rgba(244, 63, 94, 0.15)', padding: '8px', borderRadius: '8px' }}>
              <AlertTriangle size={20} color="#f43f5e" />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
            {alerts.length}
          </div>
          <div style={{ marginTop: '8px', fontSize: '0.8rem', color: alerts.length > 0 ? '#fb7185' : 'var(--text-muted)' }}>
            {alerts.filter((a) => a.status === 'RESOLVED').length} resolved incidents
          </div>
        </div>
      </div>

      {/* System Infrastructure Health Strip */}
      <div
        className="glass-panel"
        style={{
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Cpu size={20} color="var(--primary-cyan)" />
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff' }}>4-Tier Architecture Status:</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-normal" style={{ fontSize: '0.7rem' }}>
              <CheckCircle2 size={12} /> REST API (Port 4000)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-normal" style={{ fontSize: '0.7rem' }}>
              <CheckCircle2 size={12} /> PostgreSQL 16 (Port 5432)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {aiHealth === 'online' ? (
              <span className="badge badge-normal" style={{ fontSize: '0.7rem' }}>
                <CheckCircle2 size={12} /> AI Isolation Forest (Port 8000)
              </span>
            ) : (
              <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                <Clock size={12} /> AI Service Standby
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
              <LinkIcon size={12} /> Hardhat EVM (Localnet)
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Recent Batches & AI Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
        {/* Recent Batches Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Boxes size={20} color="var(--primary-cyan)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>Recent Traceability Batches</h3>
            </div>
            <Link to="/batches" style={{ color: 'var(--primary-cyan)', fontSize: '0.85rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View all <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {batches.map((batch) => (
              <div
                key={batch.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                }}
              >
                <div>
                  <Link
                    to={`/batches/${batch.id}`}
                    style={{ fontWeight: 700, color: '#ffffff', textDecoration: 'none', fontSize: '0.95rem' }}
                  >
                    {batch.batchNumber}
                  </Link>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2px' }}>
                    {batch.product?.name} ({batch.quantity} units)
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <StatusBadge status={batch.status} type="batch" />
                  <Link
                    to={`/trace/${batch.batchNumber}`}
                    target="_blank"
                    title="Public QR Portal"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <ExternalLink size={16} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent AI Anomaly Alerts Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={20} color="#f43f5e" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>Recent Thermal & Route Alerts</h3>
            </div>
            <Link to="/alerts" style={{ color: '#fb7185', fontSize: '0.85rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Inspect <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {alerts.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '30px' }}>
                No active anomalies detected across current fleets.
              </p>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    padding: '14px 16px',
                    background: 'rgba(244, 63, 94, 0.04)',
                    border: '1px solid rgba(244, 63, 94, 0.15)',
                    borderRadius: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <StatusBadge status={alert.severity} type="severity" />
                      <span className="mono" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ffffff' }}>
                        {alert.ruleViolated || alert.detectionMethod}
                      </span>
                    </div>
                    <StatusBadge status={alert.status} type="alert" />
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.4 }}>
                    {alert.explanation}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>Batch: {alert.batch?.batchNumber}</span>
                    <span className="mono">{new Date(alert.createdAt).toISOString().slice(11, 19)} UTC</span>
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
