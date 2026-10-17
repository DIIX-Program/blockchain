import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  title = 'No records found',
  description = 'There are currently no items matching your criteria in the cold-chain registry.',
  action,
}: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '50px 20px',
        textAlign: 'center',
        border: '1px dashed var(--border-subtle)',
        borderRadius: '16px',
        background: 'rgba(18, 24, 38, 0.4)',
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
        }}
      >
        <Inbox size={28} color="var(--text-muted)" />
      </div>
      <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
        {title}
      </h4>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '420px', marginBottom: action ? '20px' : '0' }}>
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
