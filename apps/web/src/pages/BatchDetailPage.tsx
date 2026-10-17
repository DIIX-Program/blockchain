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
  Building
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { TemperatureChart } from '../components/TemperatureChart';
import { Timeline } from '../components/Timeline';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function BatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [batch, setBatch] = useState<any | null>(null);
  const [readings, setReadings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'telemetry' | 'timeline' | 'alerts' | 'blockchain'>('telemetry');

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
      setAnchorMessage('Computing canonical SHA-256 digest and creating commitment...');
      const res = await api.createAnchor({ batchId: id });
      setAnchorMessage(`Anchor commitment recorded: ${res.anchor.canonicalHash.slice(0, 16)}...`);
      loadBatchDetails();
    } catch (err: any) {
      setAnchorMessage(`Error: ${err?.message || 'No unanchored readings available'}`);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Retrieving batch telemetry, timeline, and blockchain records..." />;
  }

  if (!batch) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <p style={{ color: 'var(--text-muted)' }}>Batch record not found.</p>
        <Link to="/batches" style={{ color: 'var(--primary-cyan)', marginTop: '12px', display: 'inline-block' }}>
          Back to batches
        </Link>
      </div>
    );
  }

  const tempMin = batch.product ? Number(batch.product.tempMinC) : 2.0;
  const tempMax = batch.product ? Number(batch.product.tempMaxC) : 8.0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Back button & Header */}
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
          }}
        >
          <ArrowLeft size={16} /> Back to All Batches
        </Link>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>{batch.batchNumber}</h1>
              <StatusBadge status={batch.status} type="batch" />
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
              SKU: <strong style={{ color: 'var(--primary-cyan)' }}>{batch.product?.sku}</strong> ({batch.product?.name})
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Status switcher for authorized roles */}
            {hasRole('ADMIN', 'PRODUCER', 'TRANSPORTER', 'WAREHOUSE_OPERATOR') && (
              <select
                value={batch.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: '#0f172a',
                  border: '1px solid var(--border-active)',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                <option value="CREATED">Mark as CREATED</option>
                <option value="IN_TRANSIT">Mark as IN TRANSIT</option>
                <option value="STORED">Mark as STORED</option>
                <option value="DELIVERED">Mark as DELIVERED</option>
                <option value="REJECTED">Mark as REJECTED</option>
              </select>
            )}

            {/* QR Code button */}
            <button
              onClick={() => setQrModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              <QrCode size={16} /> QR Code
            </button>

            {/* Public Portal link */}
            <Link
              to={`/trace/${batch.batchNumber}`}
              target="_blank"
              className="badge badge-cyan"
              style={{ padding: '8px 14px', textDecoration: 'none', fontSize: '0.8rem' }}
            >
              <ExternalLink size={14} /> Open Public Portal
            </Link>
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Thermometer size={14} color="#10b981" /> Safe Threshold Band
          </span>
          <p className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
            {tempMin}°C to {tempMax}°C
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building size={14} color="var(--primary-cyan)" /> Current Custodian
          </span>
          <p style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {batch.currentHolder?.name}
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={14} color="#3b82f6" /> Telemetry Readings
          </span>
          <p className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#60a5fa', marginTop: '4px' }}>
            {readings.length} Samples
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} color="#f59e0b" /> Blockchain Anchors
          </span>
          <p className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fbbf24', marginTop: '4px' }}>
            {batch.anchors?.length || 0} Anchored
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '2px' }}>
        {[
          { id: 'telemetry', label: `Telemetry & Charts (${readings.length})`, icon: Activity },
          { id: 'timeline', label: `Supply Chain Timeline (${batch.events?.length || 0})`, icon: Clock },
          { id: 'alerts', label: `AI Anomaly Incidents (${batch.alerts?.length || 0})`, icon: AlertTriangle },
          { id: 'blockchain', label: `Blockchain Proofs (${batch.anchors?.length || 0})`, icon: LinkIcon },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 18px',
                background: isActive ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--primary-cyan)' : '2px solid transparent',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                borderRadius: '8px 8px 0 0',
              }}
            >
              <Icon size={16} color={isActive ? 'var(--primary-cyan)' : 'var(--text-muted)'} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Telemetry & Chart */}
      {activeTab === 'telemetry' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '16px' }}>
              Temperature Profile & Real-Time Cold-Chain Band
            </h3>
            <TemperatureChart readings={readings} tempMinC={tempMin} tempMaxC={tempMax} height={300} />
          </div>

          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(0, 0, 0, 0.2)' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>Chronological Sensor Telemetry Packets</h4>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px 16px' }}>Seq #</th>
                  <th style={{ padding: '12px 16px' }}>Timestamp (UTC)</th>
                  <th style={{ padding: '12px 16px' }}>Temperature</th>
                  <th style={{ padding: '12px 16px' }}>Humidity</th>
                  <th style={{ padding: '12px 16px' }}>Coordinates</th>
                  <th style={{ padding: '12px 16px' }}>Data Origin</th>
                </tr>
              </thead>
              <tbody>
                {readings.map((r) => {
                  const temp = Number(r.temperatureC);
                  const isViolation = temp < tempMin || temp > tempMax;

                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border-subtle)' }} className="table-row-hover">
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>{r.sequenceNumber}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>
                        {new Date(r.recordedAt).toISOString().replace('T', ' ').slice(0, 19)}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: isViolation ? '#f43f5e' : '#34d399' }}>
                        {temp.toFixed(2)}°C {isViolation && '⚠️'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#60a5fa' }}>
                        {r.humidityPercent ? `${Number(r.humidityPercent).toFixed(1)}%` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {r.latitude && r.longitude ? `${Number(r.latitude).toFixed(3)}, ${Number(r.longitude).toFixed(3)}` : 'Stationary'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {r.isSimulated ? (
                          <span className="badge badge-cyan" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                            Simulated
                          </span>
                        ) : (
                          <span className="badge badge-normal" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                            Hardware
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>
              Chain of Custody & Milestone Events
            </h3>

            {hasRole('ADMIN', 'PRODUCER', 'TRANSPORTER', 'WAREHOUSE_OPERATOR') && (
              <button
                onClick={() => setEventModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #06b6d4, #0284c7)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
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
              <div key={alert.id} className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <StatusBadge status={alert.severity} type="severity" />
                    <span className="mono" style={{ fontWeight: 700, color: '#ffffff' }}>{alert.ruleViolated}</span>
                  </div>
                  <StatusBadge status={alert.status} type="alert" />
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '12px' }}>
                  {alert.explanation}
                </p>
                {alert.resolutionNotes && (
                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #10b981', fontSize: '0.85rem', color: '#34d399' }}>
                    <strong>Resolution Log:</strong> {alert.resolutionNotes}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No anomaly incidents recorded for this batch. All readings within specification!
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
                Hardhat EVM Cryptographic Commitments
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                RFC 8785 canonical JSON digests anchored on-chain for tamper detection
              </p>
            </div>

            {hasRole('ADMIN', 'PRODUCER') && (
              <button
                onClick={handleTriggerAnchor}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #06b6d4, #0284c7)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                <LinkIcon size={16} /> Anchor Uncommitted Readings
              </button>
            )}
          </div>

          {anchorMessage && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.1)', color: '#38bdf8', fontSize: '0.85rem' }}>
              {anchorMessage}
            </div>
          )}

          {batch.anchors && batch.anchors.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {batch.anchors.map((anchor: any) => (
                <div key={anchor.id} className="glass-panel" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <CheckCircle2 size={18} color="#10b981" />
                      <span style={{ fontWeight: 700, color: '#ffffff' }}>SHA-256 Canonical Batch Digest</span>
                    </div>
                    <StatusBadge status={anchor.status} type="anchor" />
                  </div>

                  <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Off-chain Canonical Digest:</div>
                    <span className="mono" style={{ fontSize: '0.85rem', color: 'var(--primary-cyan)', wordBreak: 'break-all' }}>
                      {anchor.canonicalHash}
                    </span>
                  </div>

                  {anchor.txHash && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>EVM Tx Hash:</span>
                      <span className="mono" style={{ color: '#ffffff' }}>{anchor.txHash}</span>
                      {anchor.blockNumber && <span>(Block #{anchor.blockNumber})</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No on-chain anchors have been confirmed for this batch yet.
            </div>
          )}
        </div>
      )}

      {/* Modal: Record Event */}
      {eventModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '28px', background: '#0f172a' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', marginBottom: '16px' }}>
              Record Supply Chain Event
            </h3>
            <form onSubmit={handleRecordEvent} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Event Type</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#0f172a', border: '1px solid var(--border-subtle)', color: '#ffffff' }}
                >
                  <option value="DISPATCH">DISPATCH (Loading & departure)</option>
                  <option value="CUSTODY_HANDOVER">CUSTODY HANDOVER (Transporter to Warehouse)</option>
                  <option value="CHECKPOINT">CHECKPOINT (Route verification)</option>
                  <option value="WAREHOUSE_RECEIVE">WAREHOUSE RECEIVE (Vault check-in)</option>
                  <option value="FINAL_DELIVERY">FINAL DELIVERY (Destination clinic/retailer)</option>
                </select>
              </div>

              {(eventType.includes('HANDOVER') || eventType.includes('RECEIVE') || eventType.includes('DELIVERY')) && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Receiving Organization</label>
                  <select
                    value={toOrgId}
                    onChange={(e) => setToOrgId(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#0f172a', border: '1px solid var(--border-subtle)', color: '#ffffff' }}
                  >
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>{o.name} ({o.type})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Facility / Location Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Da Nang Port Freight Gate #4"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', color: '#ffffff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Notes / Handover Details</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Temperature verified compliant; reefer truck sealed."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', color: '#ffffff' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setEventModalOpen(false)} style={{ padding: '8px 14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 18px', borderRadius: '8px', background: 'linear-gradient(135deg, #06b6d4, #0284c7)', border: 'none', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}>Record Event</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: QR Code */}
      {qrModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '28px', background: '#0f172a', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
              Public Traceability QR
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Consumers and auditors can scan this code to inspect cold-chain integrity on the public portal.
            </p>

            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', display: 'inline-block', marginBottom: '20px' }}>
              {/* Scalable Vector QR representation */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=http://localhost:5173/trace/${batch.batchNumber}`}
                alt={`QR code for ${batch.batchNumber}`}
                style={{ width: '200px', height: '200px', display: 'block' }}
              />
            </div>

            <p className="mono" style={{ fontSize: '0.8rem', color: 'var(--primary-cyan)', marginBottom: '20px' }}>
              http://localhost:5173/trace/{batch.batchNumber}
            </p>

            <button
              onClick={() => setQrModalOpen(false)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
