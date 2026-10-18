import { ShieldCheck } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = 'Loading cold-chain telemetry...' }: LoadingSpinnerProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 20px', gap: '18px' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div 
          style={{ 
            width: 52, 
            height: 52, 
            borderRadius: '50%', 
            border: '2px solid rgba(6, 182, 212, 0.2)',
            borderTopColor: 'var(--cyan-400)',
            animation: 'spinRotate 0.9s linear infinite',
            boxShadow: '0 0 16px rgba(6, 182, 212, 0.3)'
          }} 
        />
        <div style={{ position: 'absolute' }}>
          <ShieldCheck size={20} color="var(--cyan-300)" />
        </div>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 500, letterSpacing: '0.01em' }}>
        {message}
      </p>
    </div>
  );
}
