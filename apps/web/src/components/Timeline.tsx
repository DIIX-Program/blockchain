import { 
  Package, 
  Truck, 
  Warehouse, 
  CheckCircle, 
  MapPin, 
  User, 
  Link as LinkIcon, 
  AlertTriangle 
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
  if (!events || events.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
        No milestone events recorded yet.
      </div>
    );
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'HARVEST_MANUFACTURE':
        return <Package size={18} color="#06b6d4" />;
      case 'DISPATCH':
      case 'CUSTODY_HANDOVER':
        return <Truck size={18} color="#f59e0b" />;
      case 'WAREHOUSE_RECEIVE':
        return <Warehouse size={18} color="#3b82f6" />;
      case 'FINAL_DELIVERY':
        return <CheckCircle size={18} color="#10b981" />;
      case 'SLA_VIOLATION':
        return <AlertTriangle size={18} color="#f43f5e" />;
      default:
        return <MapPin size={18} color="#a855f7" />;
    }
  };

  return (
    <div style={{ position: 'relative', paddingLeft: '32px' }}>
      {/* Vertical Timeline Guide Line */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          bottom: '12px',
          left: '15px',
          width: '2px',
          background: 'linear-gradient(to bottom, #06b6d4, #3b82f6, #10b981)',
          opacity: 0.3,
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {events.map((evt, idx) => {
          const isLatest = idx === events.length - 1;

          return (
            <div key={evt.id || idx} style={{ position: 'relative' }}>
              {/* Timeline Marker Icon */}
              <div
                style={{
                  position: 'absolute',
                  left: '-32px',
                  top: '0',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--bg-main)',
                  border: isLatest ? '2px solid #10b981' : '2px solid var(--border-active)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isLatest ? '0 0 12px rgba(16, 185, 129, 0.4)' : 'none',
                }}
              >
                {getEventIcon(evt.eventType)}
              </div>

              {/* Event Content Card */}
              <div
                className="glass-panel"
                style={{
                  padding: '16px 20px',
                  borderColor: isLatest ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
                      {evt.eventType.replace(/_/g, ' ')}
                    </h4>
                    {isLatest && (
                      <span className="badge badge-normal" style={{ fontSize: '0.65rem' }}>
                        Current Milestone
                      </span>
                    )}
                  </div>
                  <span
                    className="mono"
                    style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}
                  >
                    {new Date(evt.createdAt).toISOString().replace('T', ' ').slice(0, 19)} UTC
                  </span>
                </div>

                {/* Location & Organization details */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14} color="var(--primary-cyan)" />
                    <span>{evt.locationName}</span>
                  </div>

                  {evt.fromOrg && evt.toOrg && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="mono" style={{ color: 'var(--text-muted)' }}>From:</span> {evt.fromOrg.name} ➔ <span className="mono" style={{ color: 'var(--text-muted)' }}>To:</span> {evt.toOrg.name}
                    </div>
                  )}

                  {evt.actor && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={14} color="var(--text-muted)" />
                      <span>{evt.actor.fullName} ({evt.actor.role})</span>
                    </div>
                  )}
                </div>

                {/* Operational Notes */}
                {evt.notes && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', background: 'rgba(0, 0, 0, 0.2)', padding: '8px 12px', borderRadius: '8px', marginBottom: '8px' }}>
                    {evt.notes}
                  </p>
                )}

                {/* Blockchain Proof Reference */}
                {evt.txHash && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#38bdf8' }}>
                    <LinkIcon size={12} />
                    <span>On-chain Tx: </span>
                    <span className="mono" style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                      {evt.txHash.slice(0, 12)}...{evt.txHash.slice(-8)}
                    </span>
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
