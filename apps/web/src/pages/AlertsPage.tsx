import { useState, useEffect } from 'react';
import { Cpu, X } from 'lucide-react';
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>
          AI Anomaly Detection & Incident Center
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Hybrid rule-engine violations and Scikit-learn Isolation Forest ML outlier detections
        </p>
      </div>

      {/* Filters */}
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
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', background: '#0f172a', border: '1px solid var(--border-subtle)', color: '#ffffff', fontSize: '0.85rem' }}
            >
              <option value="">All Statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Severity:</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', background: '#0f172a', border: '1px solid var(--border-subtle)', color: '#ffffff', fontSize: '0.85rem' }}
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>
        </div>

        <span className="mono" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {alerts.length} Incident{alerts.length === 1 ? '' : 's'} registered
        </span>
      </div>

      {/* Alerts Stream */}
      {loading ? (
        <LoadingSpinner message="Scanning AI telemetry anomaly logs..." />
      ) : alerts.length === 0 ? (
        <EmptyState
          title="No incident alerts"
          description="All active cold-chain shipments are operating within verified thermal limits."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="glass-panel"
              style={{
                padding: '24px',
                borderColor: alert.severity === 'CRITICAL' || alert.severity === 'HIGH' ? 'rgba(244, 63, 94, 0.3)' : 'var(--border-subtle)',
                background: alert.status === 'RESOLVED' ? 'rgba(18, 24, 38, 0.6)' : 'rgba(18, 24, 38, 0.9)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <StatusBadge status={alert.severity} type="severity" />
                  <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                    <Cpu size={12} /> {alert.detectionMethod}
                  </span>
                  <span className="mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                    {alert.ruleViolated || 'ANOMALY_EXCURSION'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <StatusBadge status={alert.status} type="alert" />

                  {/* Actions based on role and status */}
                  {alert.status === 'OPEN' && hasRole('ADMIN', 'PRODUCER', 'TRANSPORTER', 'WAREHOUSE_OPERATOR') && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        color: '#fbbf24',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
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
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', background: 'rgba(0, 0, 0, 0.25)', padding: '12px 16px', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Target Batch:</span>{' '}
                  <strong style={{ color: '#ffffff' }}>{alert.batch?.batchNumber}</strong>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Sensor Device:</span>{' '}
                  <span className="mono" style={{ color: 'var(--primary-cyan)' }}>{alert.device?.deviceCode || 'DEV-AUTO'}</span>
                </div>

                {alert.anomalyScore !== null && alert.anomalyScore !== undefined && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>ML Anomaly Score:</span>{' '}
                    <span className="mono" style={{ color: '#fb7185', fontWeight: 700 }}>{Number(alert.anomalyScore).toFixed(4)}</span>
                  </div>
                )}

                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Incident Time:</span>{' '}
                  <span className="mono">{new Date(alert.createdAt).toISOString().replace('T', ' ').slice(0, 19)} UTC</span>
                </div>
              </div>

              {/* Resolution details if resolved */}
              {alert.resolutionNotes && (
                <div style={{ marginTop: '14px', padding: '12px 16px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.08)', borderLeft: '3px solid #10b981' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#34d399', marginBottom: '4px' }}>
                    Resolved by {alert.resolvedByUser?.fullName || 'Quality Officer'}:
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{alert.resolutionNotes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Resolve Alert */}
      {resolveModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '28px', background: '#0f172a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>Resolve Cold-Chain Incident</h3>
              <button onClick={() => setResolveModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Root Cause Analysis & Corrective Actions Log *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. Driver verified reefer unit auxiliary compressor restarted; temperature normalized below 5°C within 10 minutes."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', color: '#ffffff', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setResolveModalOpen(false)} style={{ padding: '8px 14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 18px', borderRadius: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}>Confirm Resolution</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
