import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Thermometer, 
  Clock, 
  Activity, 
  AlertTriangle, 
  Link as LinkIcon, 
  ExternalLink, 
  CheckCircle2, 
  Plus, 
  QrCode,
  ShieldCheck,
  Building,
  Copy,
  Check,
  X
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { TemperatureChart } from '../components/TemperatureChart';
import { Timeline } from '../components/Timeline';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { QrCodeDisplay } from '../components/QRCode';

export function BatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [batch, setBatch] = useState<any | null>(null);
  const [readings, setReadings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'telemetry' | 'timeline' | 'alerts' | 'blockchain'>('telemetry');
  const [copiedBatch, setCopiedBatch] = useState(false);

  // Modal for recording event
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventType, setEventType] = useState('CUSTODY_HANDOVER');
  const [locationName, setLocationName] = useState('');
  const [notes, setNotes] = useState('');
  const [toOrgId, setToOrgId] = useState('');
  const [orgs, setOrgs] = useState<any[]>([]);

  // QR modal
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [anchorMessage, setAnchorMessage] = useState<string | null>(null);
  const [anchoring, setAnchoring] = useState(false);

  const loadBatchDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [batchRes, readingsRes, orgsRes] = await Promise.all([
        api.getBatch(id),
        api.getSensorReadings(id, '?limit=100&order=asc'),
        api.getOrganizations(),
      ]);

      setBatch(batchRes.batch);
      setReadings(readingsRes.data || []);
      setOrgs(orgsRes.data || []);
      if (orgsRes.data && orgsRes.data.length > 0) {
        setToOrgId(orgsRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load batch details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatchDetails();
  }, [id]);

  const handleCopyBatch = () => {
    if (batch?.batchNumber) {
      navigator.clipboard.writeText(batch.batchNumber);
      setCopiedBatch(true);
      setTimeout(() => setCopiedBatch(false), 2000);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      await api.updateBatchStatus(id, newStatus);
      loadBatchDetails();
    } catch (err: any) {
      alert(err?.message || 'Failed to update status');
    }
  };

  const handleRecordEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      await api.createEvent({
        batchId: id,
        eventType,
        locationName,
        notes,
        toOrgId: eventType.includes('HANDOVER') || eventType.includes('RECEIVE') || eventType.includes('DELIVERY') ? toOrgId : undefined,
      });

      setEventModalOpen(false);
      setLocationName('');
      setNotes('');
      loadBatchDetails();
    } catch (err: any) {
      alert(err?.message || 'Failed to record event');
    }
  };

  const handleTriggerAnchor = async () => {
    if (!id) return;
    try {
      setAnchoring(true);
      setAnchorMessage('Computing canonical RFC 8785 JSON digest & anchoring on EVM...');
      const res = await api.createAnchor({ batchId: id });
      setAnchorMessage(`Cryptographic commitment confirmed: ${res.anchor.canonicalHash.slice(0, 18)}...`);
      loadBatchDetails();
    } catch (err: any) {
      setAnchorMessage(`Anchor note: ${err?.message || 'No unanchored readings available'}`);
    } finally {
      setAnchoring(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Retrieving batch telemetry, timeline, and blockchain records..." />;
  }

  if (!batch) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <p style={{ color: 'var(--text-muted)' }}>Batch record not found.</p>
        <Link to="/batches" className="btn btn-primary" style={{ marginTop: '16px' }}>
          Back to Batches
        </Link>
      </div>
    );
  }

  const tempMin = batch.product ? Number(batch.product.tempMinC) : 2.0;
  const tempMax = batch.product ? Number(batch.product.tempMaxC) : 8.0;
  const publicTraceUrl = `${window.location.origin}/trace/${batch.batchNumber}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Back button & Hero Header */}
      <div>
        <Link
          to="/batches"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: '0.85rem',
            marginBottom: '16px',
            transition: 'color 0.15s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <ArrowLeft size={16} /> Back to All Batches
        </Link>

        {/* Hero Card */}
        <div 
          className="glass-panel" 
          style={{ 
            padding: '28px 32px',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(7, 10, 18, 0.95) 100%)',
            border: '1px solid var(--border-medium)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '20px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                {batch.batchNumber}
              </h1>
              <button
                onClick={handleCopyBatch}
                className="btn-icon"
                title="Copy batch number"
                style={{ padding: '6px' }}
              >
                {copiedBatch ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              </button>
              <StatusBadge status={batch.status} type="batch" pulse={batch.status === 'IN_TRANSIT'} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <div>
                Product: <strong style={{ color: 'var(--cyan-300)' }}>{batch.product?.name}</strong>{' '}
                <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({batch.product?.sku})</span>
              </div>
              <span style={{ color: 'var(--border-subtle)' }}>|</span>
              <div>
                Lot Size: <strong className="mono" style={{ color: '#ffffff' }}>{batch.quantity?.toLocaleString()} units</strong>
              </div>
              <span style={{ color: 'var(--border-subtle)' }}>|</span>
              <div>
                Expires: <span className="mono" style={{ color: 'var(--text-muted)' }}>{new Date(batch.expiryDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Status switcher for authorized roles */}
            {hasRole('ADMIN', 'PRODUCER', 'TRANSPORTER', 'WAREHOUSE_OPERATOR') && (
              <select
                value={batch.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="form-select"
                style={{ width: 'auto', fontSize: '0.825rem', padding: '8px 12px', fontWeight: 600 }}
              >
                <option value="CREATED">Status: CREATED</option>
                <option value="IN_TRANSIT">Status: IN TRANSIT</option>
                <option value="STORED">Status: STORED</option>
                <option value="DELIVERED">Status: DELIVERED</option>
                <option value="ALERT_FLAGGED">Status: ALERT FLAGGED</option>
                <option value="REJECTED">Status: REJECTED</option>
              </select>
            )}

            {/* QR Code button */}
            <button
              onClick={() => setQrModalOpen(true)}
              className="btn btn-secondary btn-sm"
            >
              <QrCode size={15} /> QR Code
            </button>

            {/* Public Portal link */}
            <Link
              to={`/trace/${batch.batchNumber}`}
              target="_blank"
              className="btn btn-outline-cyan btn-sm"
            >
              <ExternalLink size={14} /> Consumer Portal
            </Link>
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '18px 22px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Thermometer size={14} color="#10b981" /> Safe Threshold Band
          </span>
          <p className="mono" style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
            {tempMin}°C to {tempMax}°C
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '18px 22px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building size={14} color="var(--cyan-400)" /> Current Custodian
          </span>
          <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {batch.currentHolder?.name || 'Unassigned'}
          </p>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {batch.currentHolder?.type?.replace('_', ' ')}
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '18px 22px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={14} color="#38bdf8" /> Telemetry Samples
          </span>
          <p className="mono" style={{ fontSize: '1.3rem', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
            {readings.length} Packets
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '18px 22px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} color="#fbbf24" /> On-Chain Anchors
          </span>
          <p className="mono" style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fbbf24', marginTop: '4px' }}>
            {batch.anchors?.length || 0} Sealed
          </p>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="tabs-container" style={{ width: '100%', maxWidth: '800px' }}>
        {[
          { id: 'telemetry', label: `Telemetry & Charts (${readings.length})`, icon: Activity },
          { id: 'timeline', label: `Custody Timeline (${batch.events?.length || 0})`, icon: Clock },
          { id: 'alerts', label: `AI Anomaly Stream (${batch.alerts?.length || 0})`, icon: AlertTriangle },
          { id: 'blockchain', label: `Blockchain Ledger (${batch.anchors?.length || 0})`, icon: LinkIcon },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`tab-btn ${isActive ? 'active' : ''}`}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Telemetry & Chart */}
      {activeTab === 'telemetry' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
                  Real-Time Temperature & Humidity Surveillance
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>
                  Threshold corridors and AI excursion detection
                </p>
              </div>
            </div>
            <TemperatureChart readings={readings} tempMinC={tempMin} tempMaxC={tempMax} height={320} />
          </div>

          {/* Chronological Telemetry Table */}
          <div className="table-wrapper">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                Ingested IoT Sensor Telemetry Stream
              </h4>
              <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {readings.length} recorded frames
              </span>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Seq #</th>
                  <th>Timestamp (UTC)</th>
                  <th>Temperature</th>
                  <th>Humidity</th>
                  <th>GPS Coordinates</th>
                  <th>Ingestion Origin</th>
                </tr>
              </thead>
              <tbody>
                {readings.map((r) => {
                  const temp = Number(r.temperatureC);
                  const isViolation = temp < tempMin || temp > tempMax;

                  return (
                    <tr key={r.id}>
                      <td className="mono" style={{ fontWeight: 600 }}>#{r.sequenceNumber}</td>
                      <td className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(r.recordedAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </td>
                      <td>
                        <span 
                          className="mono" 
                          style={{ 
                            fontWeight: 700, 
                            color: isViolation ? '#fb7185' : '#34d399',
                            background: isViolation ? 'rgba(244, 63, 94, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: isViolation ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(16, 185, 129, 0.25)'
                          }}
                        >
                          {temp.toFixed(2)}°C {isViolation && '⚠️'}
                        </span>
                      </td>
                      <td className="mono" style={{ color: '#818cf8' }}>
                        {r.humidityPercent ? `${Number(r.humidityPercent).toFixed(1)}%` : '—'}
                      </td>
                      <td className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {r.latitude && r.longitude ? `${Number(r.latitude).toFixed(4)}, ${Number(r.longitude).toFixed(4)}` : 'Stationary'}
                      </td>
                      <td>
                        {r.isSimulated ? (
                          <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
                            Simulated ESP32
                          </span>
                        ) : (
                          <span className="badge badge-normal" style={{ fontSize: '0.65rem' }}>
                            Hardware Node
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Supply Chain Timeline */}
      {activeTab === 'timeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>
                Chain of Custody & Milestone Events
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                End-to-end audit trail with verified digital handovers
              </p>
            </div>

            {hasRole('ADMIN', 'PRODUCER', 'TRANSPORTER', 'WAREHOUSE_OPERATOR') && (
              <button
                onClick={() => setEventModalOpen(true)}
                className="btn btn-primary"
              >
                <Plus size={16} /> Record Handover / Milestone
              </button>
            )}
          </div>

          <Timeline events={batch.events || []} />
        </div>
      )}

      {/* TAB 3: AI Anomaly Incidents */}
      {activeTab === 'alerts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {batch.alerts && batch.alerts.length > 0 ? (
            batch.alerts.map((alert: any) => (
              <div 
                key={alert.id} 
                className="glass-panel" 
                style={{ 
                  padding: '22px 26px',
                  border: alert.status === 'OPEN' ? '1px solid rgba(244, 63, 94, 0.35)' : '1px solid var(--border-subtle)',
                  background: alert.status === 'OPEN' ? 'rgba(244, 63, 94, 0.04)' : 'var(--bg-glass-card)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <StatusBadge status={alert.severity} type="severity" />
                    <span className="mono" style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.95rem' }}>
                      {alert.ruleViolated || alert.detectionMethod}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(alert.createdAt).toLocaleString()} UTC
                    </span>
                    <StatusBadge status={alert.status} type="alert" />
                  </div>
                </div>

                <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '12px' }}>
                  {alert.explanation}
                </p>

                {alert.resolutionNotes && (
                  <div 
                    style={{ 
                      background: 'rgba(16, 185, 129, 0.08)', 
                      padding: '12px 16px', 
                      borderRadius: '10px', 
                      border: '1px solid rgba(16, 185, 129, 0.3)', 
                      fontSize: '0.85rem', 
                      color: '#34d399' 
                    }}
                  >
                    <strong>Compliance Resolution:</strong> {alert.resolutionNotes}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={36} color="#10b981" style={{ marginBottom: '12px' }} />
              <h4 style={{ color: '#ffffff', fontSize: '1.05rem', fontWeight: 700 }}>Zero Anomaly Incidents</h4>
              <p style={{ fontSize: '0.875rem', marginTop: '4px' }}>
                The Isolation Forest ML model and rule engine confirm 100% compliant storage conditions.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Blockchain Anchors */}
      {activeTab === 'blockchain' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>
                Hardhat EVM Smart Contract Cryptographic Anchors
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                RFC 8785 canonical JSON digests anchored on-chain for tamper-proof mathematical verification
              </p>
            </div>

            {hasRole('ADMIN', 'PRODUCER') && (
              <button
                onClick={handleTriggerAnchor}
                disabled={anchoring}
                className="btn btn-indigo"
              >
                <LinkIcon size={16} /> {anchoring ? 'Anchoring...' : 'Anchor Uncommitted Telemetry'}
              </button>
            )}
          </div>

          {anchorMessage && (
            <div 
              style={{ 
                padding: '12px 16px', 
                borderRadius: '10px', 
                background: 'rgba(6, 182, 212, 0.12)', 
                border: '1px solid rgba(6, 182, 212, 0.3)',
                color: '#38bdf8', 
                fontSize: '0.85rem' 
              }}
            >
              {anchorMessage}
            </div>
          )}

          {batch.anchors && batch.anchors.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {batch.anchors.map((anchor: any) => (
                <div key={anchor.id} className="glass-panel" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <CheckCircle2 size={20} color="#10b981" />
                      <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#ffffff' }}>
                        RFC 8785 Canonical Batch Digest
                      </span>
                    </div>
                    <StatusBadge status={anchor.status} type="anchor" />
                  </div>

                  <div style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '14px 18px', borderRadius: '10px', marginBottom: '14px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 700 }}>
                      SHA-256 Digest:
                    </div>
                    <span className="mono" style={{ fontSize: '0.875rem', color: 'var(--cyan-300)', wordBreak: 'break-all' }}>
                      {anchor.canonicalHash}
                    </span>
                  </div>

                  {anchor.txHash && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>EVM Tx:</span>
                        <span className="mono" style={{ color: '#ffffff', fontWeight: 600 }}>{anchor.txHash}</span>
                        {anchor.blockNumber && (
                          <span className="badge badge-indigo" style={{ fontSize: '0.68rem' }}>
                            Block #{anchor.blockNumber}
                          </span>
                        )}
                      </div>
                      <span className="badge badge-normal" style={{ fontSize: '0.68rem' }}>
                        Consensus Verified
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <LinkIcon size={36} color="var(--text-dim)" style={{ marginBottom: '12px' }} />
              <h4 style={{ color: '#ffffff', fontSize: '1.05rem', fontWeight: 700 }}>No On-Chain Anchors Yet</h4>
              <p style={{ fontSize: '0.875rem', marginTop: '4px' }}>
                Ingested telemetry can be cryptographically hashed and sealed to the Hardhat EVM ledger.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal: Record Event */}
      {eventModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={20} color="var(--cyan-400)" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                  Log Chain of Custody Event
                </h3>
              </div>
              <button onClick={() => setEventModalOpen(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordEvent}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Event Milestone Classification</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="form-select"
                  >
                    <option value="DISPATCH">DISPATCH (Loading & departure from facility)</option>
                    <option value="CUSTODY_HANDOVER">CUSTODY HANDOVER (Transporter to Warehouse)</option>
                    <option value="CHECKPOINT">CHECKPOINT (In-transit inspection station)</option>
                    <option value="WAREHOUSE_RECEIVE">WAREHOUSE RECEIVE (Cold vault intake)</option>
                    <option value="FINAL_DELIVERY">FINAL DELIVERY (Destination clinic/retailer)</option>
                  </select>
                </div>

                {(eventType.includes('HANDOVER') || eventType.includes('RECEIVE') || eventType.includes('DELIVERY')) && (
                  <div className="form-group">
                    <label className="form-label">Receiving Entity Organization</label>
                    <select
                      value={toOrgId}
                      onChange={(e) => setToOrgId(e.target.value)}
                      className="form-select"
                    >
                      {orgs.map((o) => (
                        <option key={o.id} value={o.id}>{o.name} ({o.type})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Facility / Geographical Location Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Da Nang Port Cold Logistics Gate #4"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Operational Handover Notes</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Physical seal verified intact; temperature confirmed compliant at handover."
                    className="form-textarea"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setEventModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Commit Handover Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: QR Code */}
      {qrModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px', textAlign: 'center' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <QrCode size={18} color="var(--cyan-400)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
                  Public Traceability QR
                </h3>
              </div>
              <button onClick={() => setQrModalOpen(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
                Consumers, hospitals, or border inspectors can scan this QR code to verify cold-chain integrity on the zero-login public portal.
              </p>

              {/* Local Offline-First High Resolution QR Code */}
              <div 
                style={{ 
                  background: '#ffffff', 
                  padding: '16px', 
                  borderRadius: '16px', 
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
                  marginBottom: '18px'
                }}
              >
                <QrCodeDisplay 
                  value={publicTraceUrl}
                  size={200}
                  darkColor="#070a12"
                  lightColor="#ffffff"
                />
              </div>

              <div 
                style={{ 
                  background: 'rgba(15, 23, 42, 0.8)', 
                  padding: '10px 14px', 
                  borderRadius: '10px', 
                  width: '100%', 
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}
              >
                <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--cyan-300)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {publicTraceUrl}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(publicTraceUrl);
                    alert('Public verification URL copied to clipboard!');
                  }}
                  className="btn-icon"
                  style={{ padding: '5px' }}
                  title="Copy link"
                >
                  <Copy size={13} />
                </button>
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button
                onClick={() => setQrModalOpen(false)}
                className="btn btn-secondary"
                style={{ width: '100%' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
