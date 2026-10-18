import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  AlertCircle, 
  ArrowRight, 
  Sparkles,
  QrCode,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@coldchain.internal');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Failed to authenticate. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { role: 'ADMIN', email: 'admin@coldchain.internal', title: 'System Controller', color: 'var(--cyan-400)' },
    { role: 'PRODUCER', email: 'producer@vaxlab.com', title: 'Pharma Producer', color: '#38bdf8' },
    { role: 'TRANSPORTER', email: 'driver@coldtrans.com', title: 'Fleet Logistics Driver', color: '#fbbf24' },
    { role: 'WAREHOUSE', email: 'operator@biodepot.com', title: 'Cold Vault Operator', color: '#818cf8' },
    { role: 'AUDITOR', email: 'auditor@regulator.gov', title: 'FDA / QA Inspector', color: '#34d399' },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'radial-gradient(circle at 50% 25%, rgba(6, 182, 212, 0.12) 0%, rgba(99, 102, 241, 0.05) 40%, #070a12 80%)',
        position: 'relative'
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '40px 36px',
          borderColor: 'rgba(6, 182, 212, 0.28)',
          boxShadow: '0 24px 60px -15px rgba(0, 0, 0, 0.9), 0 0 30px rgba(6, 182, 212, 0.2)',
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(9, 14, 26, 0.98) 100%)',
        }}
      >
        {/* Brand Icon & Heading */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(6, 182, 212, 0.45)',
              marginBottom: '16px',
              position: 'relative'
            }}
          >
            <ShieldCheck size={32} color="#ffffff" />
            <div 
              style={{
                position: 'absolute',
                top: -3,
                right: -3,
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 8px #10b981'
              }}
            />
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            ColdChain <span style={{ color: 'var(--cyan-400)' }}>3.0</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '6px' }}>
            Enterprise IoT Telemetry, AI Surveillance & EVM Ledger Gateway
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div
            style={{
              background: 'var(--status-alert-bg)',
              border: '1px solid var(--status-alert-border)',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#fb7185',
              fontSize: '0.85rem',
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={18}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="operator@coldchain.internal"
                className="form-input"
                style={{ paddingLeft: '42px' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={18}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="form-input"
                style={{ paddingLeft: '42px' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: '4px' }}
          >
            {loading ? 'Authenticating Credentials...' : 'Sign In to Command Center'}
            <ArrowRight size={16} />
          </button>
        </form>

        {/* 1-Click Demo Accounts Quick-Fill */}
        <div style={{ marginTop: '28px', paddingTop: '22px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <Sparkles size={14} color="var(--cyan-400)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Quick Demo Accounts (1-Click Fill)
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
            {demoAccounts.map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => {
                  setEmail(acc.email);
                  setPassword('password123');
                }}
                style={{
                  background: email === acc.email ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                  border: email === acc.email ? '1px solid var(--cyan-500)' : '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: acc.color }}>
                  {acc.role}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {acc.title}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Public Portal Link */}
        <div style={{ marginTop: '22px', textAlign: 'center' }}>
          <Link
            to="/trace/BATCH-VAX-2026-001"
            target="_blank"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              color: 'var(--cyan-400)',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            <QrCode size={14} />
            <span>Open Public QR Verification Portal (No login required)</span>
            <ExternalLink size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}
