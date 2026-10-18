import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  Truck, 
  PackageCheck, 
  ShieldAlert, 
  Radio, 
  RefreshCw, 
  Ban,
  Activity
} from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  type?: 'batch' | 'alert' | 'anchor' | 'severity' | 'device';
  pulse?: boolean;
}

export function StatusBadge({ status, type = 'batch', pulse = false }: StatusBadgeProps) {
  const s = status?.toUpperCase() || 'UNKNOWN';

  // 1. Batch Status
  if (type === 'batch') {
    switch (s) {
      case 'CREATED':
        return (
          <span className="badge badge-cyan">
            <Clock size={12} /> Created
          </span>
        );
      case 'IN_TRANSIT':
        return (
          <span className="badge badge-warning">
            <Truck size={12} className={pulse ? "spinner-rotate" : ""} /> In Transit
          </span>
        );
      case 'STORED':
        return (
          <span className="badge badge-cyan">
            <PackageCheck size={12} /> Stored
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="badge badge-normal">
            <CheckCircle2 size={12} /> Delivered
          </span>
        );
      case 'ALERT_FLAGGED':
        return (
          <span className="badge badge-alert">
            <AlertTriangle size={12} /> Alert Flagged
          </span>
        );
      case 'RECALLED':
        return (
          <span className="badge badge-alert">
            <Ban size={12} /> Recalled
          </span>
        );
      case 'REJECTED':
        return (
          <span className="badge badge-alert">
            <XCircle size={12} /> Rejected
          </span>
        );
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  }

  // 2. Alert Status / Severity
  if (type === 'severity' || type === 'alert') {
    switch (s) {
      case 'CRITICAL':
        return (
          <span className="badge badge-alert">
            <ShieldAlert size={12} /> Critical
          </span>
        );
      case 'HIGH':
        return (
          <span className="badge badge-alert">
            <AlertTriangle size={12} /> High
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="badge badge-warning">
            <AlertTriangle size={12} /> Medium
          </span>
        );
      case 'LOW':
        return (
          <span className="badge badge-cyan">
            <Clock size={12} /> Low
          </span>
        );
      case 'OPEN':
        return (
          <span className="badge badge-alert">
            <span className="beacon-dot alert" style={{ width: 6, height: 6 }} /> Open
          </span>
        );
      case 'ACKNOWLEDGED':
        return (
          <span className="badge badge-warning">
            <Clock size={12} /> Acknowledged
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="badge badge-normal">
            <CheckCircle2 size={12} /> Resolved
          </span>
        );
      case 'FALSE_POSITIVE':
        return (
          <span className="badge badge-neutral">
            <CheckCircle2 size={12} /> False Positive
          </span>
        );
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  }

  // 3. Anchor Status
  if (type === 'anchor') {
    switch (s) {
      case 'CONFIRMED':
        return (
          <span className="badge badge-normal">
            <CheckCircle2 size={12} /> Confirmed on-chain
          </span>
        );
      case 'PENDING':
        return (
          <span className="badge badge-warning">
            <RefreshCw size={12} className="spinner-rotate" /> Pending Block
          </span>
        );
      case 'FAILED':
        return (
          <span className="badge badge-alert">
            <XCircle size={12} /> Failed
          </span>
        );
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  }

  // 4. Device Status
  if (type === 'device') {
    switch (s) {
      case 'ACTIVE':
        return (
          <span className="badge badge-normal">
            <span className="beacon-dot online" style={{ width: 6, height: 6 }} /> Active
          </span>
        );
      case 'INACTIVE':
        return (
          <span className="badge badge-neutral">
            <Radio size={12} /> Inactive
          </span>
        );
      case 'FAULTY':
        return (
          <span className="badge badge-alert">
            <Activity size={12} /> Faulty
          </span>
        );
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  }

  return <span className="badge badge-neutral">{status}</span>;
}
