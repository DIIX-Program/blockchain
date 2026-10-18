import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Cpu, 
  CheckCircle2, 
  Filter, 
  X
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';

export function AlertsPage() {
  const { hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      let query = '?limit=50';
      if (statusFilter) query += `&status=${statusFilter}`;
      if (severityFilter) query += `&severity=${severityFilter}`;

      const res = await api.getAlerts(query);
      setAlerts(res.data || []);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter, severityFilter]);

  const handleAcknowledge = async (id: string) => {
    try {
      await api.acknowledgeAlert(id);
      fetchAlerts();
    } catch (err: any) {
      alert(err?.message || 'Failed to acknowledge alert');
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlertId) return;

    try {
      await api.resolveAlert(selectedAlertId, resolutionNotes);
      setResolveModalOpen(false);
      setSelectedAlertId(null);
      setResolutionNotes('');
      fetchAlerts();
    } catch (err: any) {
      alert(err?.message || 'Failed to resolve alert');
    }
  };

  const openCount = alerts.filter((a) => a.status === 'OPEN').length;
  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const resolvedCount = alerts.filter((a) => a.status === 'RESOLVED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fb7185', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Machine Learning & Rules Engine
          </span>
        </div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
          AI Anomaly Surveillance & Incident Triage
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Continuous dual-layer evaluation: Scikit-learn unsupervised Isolation Forest ML outlier scoring paired with hard SLA threshold rule verification.
        </p>
      </div>

      {/* KPI Stats Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div 
          onClick={() => { setStatusFilter(''); setSeverityFilter(''); }}
          className="glass-panel" 
          style={{ padding: '18px 22px', cursor: 'pointer' }}
        >
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Total Incidents Logged
          </span>
          <p className="mono" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
            {alerts.length}
          </p>
        </div>

        <div 
          onClick={() => { setStatusFilter('OPEN'); }}
          className="glass-panel" 
          style={{ 
            padding: '18px 22px', 
            cursor: 'pointer',
            borderColor: openCount > 0 ? 'rgba(244, 63, 94, 0.4)' : 'var(--border-subtle)',
            background: openCount > 0 ? 'rgba(244, 63, 94, 0.08)' : 'var(--bg-glass-card)'
          }}
        >
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: openCount > 0 ? '#fb7185' : 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className={openCount > 0 ? "beacon-dot alert" : "beacon-dot"} style={{ width: 6, height: 6 }} /> Active Open Alerts
          </span>
          <p className="mono" style={{ fontSize: '1.6rem', fontWeight: 800, color: openCount > 0 ? '#fb7185' : '#ffffff', marginTop: '4px' }}>
            {openCount}
          </p>
        </div>

        <div 
          onClick={() => { setSeverityFilter('CRITICAL'); }}
          className="glass-panel" 
          style={{ padding: '18px 22px', cursor: 'pointer' }}
        >
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Critical Temperature Spikes
          </span>
          <p className="mono" style={{ fontSize: '1.6rem', fontWeight: 800, color: criticalCount > 0 ? '#fb7185' : '#34d399', marginTop: '4px' }}>
            {criticalCount}
          </p>
        </div>

        <div 
          onClick={() => { setStatusFilter('RESOLVED'); }}
          className="glass-panel" 
          style={{ padding: '18px 22px', cursor: 'pointer' }}
        >
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Resolved Compliance Cases
          </span>
          <p className="mono" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
            {resolvedCount}
          </p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={15} color="var(--text-muted)" />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-select"
              style={{ width: 'auto', fontSize: '0.825rem', padding: '6px 12px' }}
            >
              <option value="">All Statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="form-select"
              style={{ width: 'auto', fontSize: '0.825rem', padding: '6px 12px' }}
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>
        </div>

        <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {alerts.length} Incident{alerts.length === 1 ? '' : 's'} registered in registry
        </span>
      </div>

      {/* Alerts Stream */}
      {loading ? (
        <LoadingSpinner message="Scanning AI telemetry anomaly logs..." />
      ) : alerts.length === 0 ? (
        <EmptyState
          title="No incident alerts registered"
          description="All active cold-chain shipments are operating safely within verified thermal bounds."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="glass-panel"
              style={{
                padding: '24px 28px',
                borderColor: alert.severity === 'CRITICAL' || alert.severity === 'HIGH' 
                  ? 'rgba(244, 63, 94, 0.35)' 
                  : 'var(--border-glass)',
                background: alert.status === 'RESOLVED' 
                  ? 'rgba(15, 23, 42, 0.6)' 
                  : alert.status === 'OPEN' 
                    ? 'rgba(24, 16, 26, 0.85)' 
                    : 'var(--bg-glass-card)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <StatusBadge status={alert.severity} type="severity" />
                  <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>
                    <Cpu size={12} /> {alert.detectionMethod}
                  </span>
                  <span className="mono" style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
                    {alert.ruleViolated || 'ANOMALY_EXCURSION'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <StatusBadge status={alert.status} type="alert" />

                  {/* Actions based on role and status */}
                  {alert.status === 'OPEN' && hasRole('ADMIN', 'PRODUCER', 'TRANSPORTER', 'WAREHOUSE_OPERATOR') && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.3)' }}
                    >
                      Acknowledge
                    </button>
                  )}

                  {alert.status !== 'RESOLVED' && hasRole('ADMIN', 'PRODUCER', 'WAREHOUSE_OPERATOR') && (
                    <button
                      onClick={() => {
                        setSelectedAlertId(alert.id);
                        setResolveModalOpen(true);
                      }}
                      className="btn btn-primary btn-sm"
                      style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                    >
                      Resolve Incident
                    </button>
                  )}
                </div>
              </div>

              {/* Anomaly explanation */}
              <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '16px' }}>
                {alert.explanation}
              </p>

              {/* Anomaly Metrics Grid */}
              <div 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '12px', 
                  background: 'rgba(10, 14, 23, 0.65)', 
                  padding: '14px 18px', 
                  borderRadius: '12px', 
                  fontSize: '0.825rem', 
                  border: '1px solid var(--border-subtle)' 
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Target Batch:</span>{' '}
                  <Link 
                    to={`/batches/${alert.batchId}`} 
                    style={{ color: 'var(--cyan-300)', fontWeight: 700, textDecoration: 'none' }}
                  >
                    {alert.batch?.batchNumber}
                  </Link>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)' }}>IoT Device:</span>{' '}
                  <span className="mono" style={{ color: '#ffffff', fontWeight: 600 }}>
                    {alert.device?.deviceCode || 'DEV-AUTO'}
                  </span>
                </div>

                {alert.anomalyScore !== null && alert.anomalyScore !== undefined && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Isolation Forest Score:</span>{' '}
                    <span className="mono" style={{ color: '#fb7185', fontWeight: 800 }}>
                      {Number(alert.anomalyScore).toFixed(4)}
                    </span>
                  </div>
                )}

                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Timestamp:</span>{' '}
                  <span className="mono" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(alert.createdAt).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })} UTC
                  </span>
                </div>
              </div>

              {/* Resolution details if resolved */}
              {alert.resolutionNotes && (
                <div 
                  style={{ 
                    marginTop: '16px', 
                    padding: '14px 18px', 
                    borderRadius: '10px', 
                    background: 'rgba(16, 185, 129, 0.08)', 
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#34d399', marginBottom: '4px' }}>
                    Compliance Resolution Log:
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    {alert.resolutionNotes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Resolve Alert */}
      {resolveModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={20} color="#10b981" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                  Resolve Cold-Chain Incident
                </h3>
              </div>
              <button onClick={() => setResolveModalOpen(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">
                    Root Cause Analysis & Corrective Actions Log *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="e.g. Inspector inspected reefer container seal; auxiliary cooling compressor activated; temperature restored within 2-8°C corridor. Verified batch viability."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    className="form-textarea"
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Regulatory audit log under GxP / FDA 21 CFR Part 11 requirements
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setResolveModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                  Confirm Compliance Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
