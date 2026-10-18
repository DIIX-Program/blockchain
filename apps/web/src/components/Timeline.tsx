import { useState } from 'react';
import { 
  Package, 
  Truck, 
  Warehouse, 
  CheckCircle, 
  MapPin, 
  User, 
  Link as LinkIcon, 
  AlertTriangle,
  Copy,
  Check,
  ShieldCheck,
  Clock
} from 'lucide-react';

export interface TimelineEvent {
  id: string;
  eventType: string;
  locationName: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  notes?: string | null;
  txHash?: string | null;
  createdAt: string;
  actor?: {
    fullName: string;
    role: string;
  };
  fromOrg?: {
    name: string;
    code: string;
  };
  toOrg?: {
    name: string;
    code: string;
  };
}

interface TimelineProps {
  events: TimelineEvent[];
}

export function Timeline({ events }: TimelineProps) {
  const [copiedTx, setCopiedTx] = useState<string | null>(null);

  if (!events || events.length === 0) {
    return (
      <div 
        style={{ 
          textAlign: 'center', 
          padding: '40px 20px', 
          color: 'var(--text-muted)',
          background: 'rgba(15, 23, 42, 0.4)',
          borderRadius: '16px',
          border: '1px dashed var(--border-subtle)'
        }}
      >
        <Clock size={32} color="var(--text-dim)" style={{ marginBottom: '8px' }} />
        <p>No custody handover events logged for this batch yet.</p>
      </div>
    );
  }

  const handleCopyTx = (tx: string) => {
    navigator.clipboard.writeText(tx);
    setCopiedTx(tx);
    setTimeout(() => setCopiedTx(null), 2000);
  };

  const getEventStyling = (type: string) => {
    switch (type) {
      case 'HARVEST_MANUFACTURE':
        return {
          icon: <Package size={17} color="#22d3ee" />,
          borderColor: 'rgba(6, 182, 212, 0.6)',
          bgGlow: 'rgba(6, 182, 212, 0.2)',
          label: 'Manufacturing & Packaging',
        };
      case 'DISPATCH':
        return {
          icon: <Truck size={17} color="#38bdf8" />,
          borderColor: 'rgba(14, 165, 233, 0.6)',
          bgGlow: 'rgba(14, 165, 233, 0.2)',
          label: 'Fleet Dispatch',
        };
      case 'CUSTODY_HANDOVER':
        return {
          icon: <Truck size={17} color="#fbbf24" />,
          borderColor: 'rgba(245, 158, 11, 0.6)',
          bgGlow: 'rgba(245, 158, 11, 0.2)',
          label: 'Custody Handover',
        };
      case 'WAREHOUSE_RECEIVE':
        return {
          icon: <Warehouse size={17} color="#818cf8" />,
          borderColor: 'rgba(99, 102, 241, 0.6)',
          bgGlow: 'rgba(99, 102, 241, 0.2)',
          label: 'Cold Warehouse Intake',
        };
      case 'FINAL_DELIVERY':
        return {
          icon: <CheckCircle size={17} color="#34d399" />,
          borderColor: 'rgba(16, 185, 129, 0.6)',
          bgGlow: 'rgba(16, 185, 129, 0.25)',
          label: 'Recipient Delivery',
        };
      case 'SLA_VIOLATION':
        return {
          icon: <AlertTriangle size={17} color="#fb7185" />,
          borderColor: 'rgba(244, 63, 94, 0.6)',
          bgGlow: 'rgba(244, 63, 94, 0.25)',
          label: 'Temperature SLA Violation',
        };
      default:
        return {
          icon: <MapPin size={17} color="var(--cyan-400)" />,
          borderColor: 'rgba(6, 182, 212, 0.4)',
          bgGlow: 'rgba(6, 182, 212, 0.15)',
          label: type.replace(/_/g, ' '),
        };
    }
  };

  return (
    <div style={{ position: 'relative', paddingLeft: '36px' }}>
      {/* Vertical Animated Luminous Track */}
      <div
        style={{
          position: 'absolute',
          top: '18px',
          bottom: '24px',
          left: '17px',
          width: '2px',
          background: 'linear-gradient(to bottom, var(--cyan-500) 0%, var(--indigo-500) 50%, #10b981 100%)',
          boxShadow: '0 0 10px rgba(6, 182, 212, 0.3)',
          opacity: 0.5,
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {events.map((evt, idx) => {
          const isLatest = idx === events.length - 1;
          const { icon, borderColor, bgGlow, label } = getEventStyling(evt.eventType);

          return (
            <div key={evt.id || idx} style={{ position: 'relative' }}>
              {/* Glowing Node Marker */}
              <div
                style={{
                  position: 'absolute',
                  left: '-36px',
                  top: '12px',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#070a12',
                  border: `2px solid ${borderColor}`,
                  boxShadow: `0 0 16px ${bgGlow}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                }}
              >
                {icon}
              </div>

              {/* Event Card */}
              <div
                className="glass-panel"
                style={{
                  padding: '20px 24px',
                  borderColor: isLatest ? 'rgba(16, 185, 129, 0.35)' : 'var(--border-glass)',
                  boxShadow: isLatest ? '0 12px 30px -10px rgba(16, 185, 129, 0.2)' : 'var(--shadow-md)',
                  background: isLatest ? 'rgba(13, 22, 38, 0.85)' : 'var(--bg-glass-card)'
                }}
              >
                {/* Header Row */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '10px',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' }}>
                      {label}
                    </h3>
                    {isLatest && (
                      <span className="badge badge-normal" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                        <ShieldCheck size={12} /> Current Station
                      </span>
                    )}
                  </div>

                  <span
                    className="mono"
                    style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '6px' }}
                  >
                    {new Date(evt.createdAt).toLocaleString([], {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })} UTC
                  </span>
                </div>

                {/* Location & Organization details */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={15} color="var(--cyan-400)" />
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{evt.locationName}</span>
                  </div>

                  {evt.fromOrg && evt.toOrg && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Transfer:</span>
                      <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>{evt.fromOrg.name}</span>
                      <span style={{ color: 'var(--cyan-400)' }}>➔</span>
                      <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>{evt.toOrg.name}</span>
                    </div>
                  )}

                  {evt.actor && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={14} color="var(--text-muted)" />
                      <span>{evt.actor.fullName}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>({evt.actor.role})</span>
                    </div>
                  )}
                </div>

                {/* Operational Notes */}
                {evt.notes && (
                  <div 
                    style={{ 
                      fontSize: '0.85rem', 
                      color: 'var(--text-primary)', 
                      background: 'rgba(10, 14, 23, 0.6)', 
                      padding: '10px 14px', 
                      borderRadius: '10px', 
                      marginBottom: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}
                  >
                    {evt.notes}
                  </div>
                )}

                {/* Blockchain Proof Footnote */}
                {evt.txHash && (
                  <div 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(6, 182, 212, 0.07)',
                      border: '1px solid rgba(6, 182, 212, 0.2)',
                      fontSize: '0.76rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <LinkIcon size={13} color="var(--cyan-400)" />
                      <span style={{ color: 'var(--text-secondary)' }}>On-Chain EVM Tx:</span>
                      <span className="mono" style={{ color: 'var(--cyan-300)', fontWeight: 600 }}>
                        {evt.txHash.slice(0, 14)}...{evt.txHash.slice(-10)}
                      </span>
                    </div>

                    <button
                      onClick={() => evt.txHash && handleCopyTx(evt.txHash)}
                      className="btn-icon"
                      style={{ padding: '3px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="Copy transaction hash"
                    >
                      {copiedTx === evt.txHash ? (
                        <>
                          <Check size={12} color="#10b981" />
                          <span style={{ color: '#10b981' }}>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
