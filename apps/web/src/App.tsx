import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Cpu, 
  Activity, 
  Database, 
  Layers, 
  Radio, 
  Terminal, 
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export function App() {
  const [apiHealth, setApiHealth] = useState<'checking' | 'online' | 'offline'>('checking');
  const [aiHealth, setAiHealth] = useState<'checking' | 'online' | 'offline'>('checking');
  const [timestamp, setTimestamp] = useState<string>(new Date().toISOString());

  useEffect(() => {
    // Check API health
    fetch('http://localhost:4000/health')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(() => setApiHealth('online'))
      .catch(() => setApiHealth('offline'));

    // Check AI health
    fetch('http://localhost:8000/health')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(() => setAiHealth('online'))
      .catch(() => setAiHealth('offline'));

    const interval = setInterval(() => {
      setTimestamp(new Date().toISOString());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 24px' }}>
      {/* Header */}
      <header style={{ marginBottom: '48px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ 
                background: 'linear-gradient(135deg, #06b6d4, #0284c7)', 
                padding: '10px', 
                borderRadius: '12px', 
                display: 'flex',
                boxShadow: '0 4px 15px rgba(6, 182, 212, 0.4)'
              }}>
                <ShieldCheck size={28} color="#ffffff" />
              </div>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                  Smart Cold-Chain Traceability System
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Xây dựng hệ thống truy xuất nguồn gốc chuỗi cung ứng lạnh thông minh tích hợp IoT, AI và Blockchain
                </p>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="badge badge-cyan mono">
              <Activity size={12} className="pulse-indicator" /> System Live: {timestamp.slice(11, 19)} UTC
            </span>
          </div>
        </div>
      </header>

      {/* Architecture Status Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        {/* Backend API */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Terminal size={20} color="var(--primary-cyan)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Node.js REST API</h3>
            </div>
            {apiHealth === 'online' ? (
              <span className="badge badge-normal"><CheckCircle2 size={12} /> Online</span>
            ) : apiHealth === 'offline' ? (
              <span className="badge badge-warning"><AlertTriangle size={12} /> Standby (Port 4000)</span>
            ) : (
              <span className="badge badge-cyan">Checking...</span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '12px' }}>
            Handles RBAC, RFC 8785 canonical hashing, PostgreSQL persistence, and contract interactions.
          </p>
          <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Port: 4000 | Framework: Express + Prisma
          </div>
        </div>

        {/* AI Service */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Cpu size={20} color="#a855f7" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>AI Anomaly Service</h3>
            </div>
            {aiHealth === 'online' ? (
              <span className="badge badge-normal"><CheckCircle2 size={12} /> Online</span>
            ) : aiHealth === 'offline' ? (
              <span className="badge badge-warning"><AlertTriangle size={12} /> Standby (Port 8000)</span>
            ) : (
              <span className="badge badge-cyan">Checking...</span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '12px' }}>
            Threshold violation rules combined with Scikit-learn Isolation Forest unsupervised scoring.
          </p>
          <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Port: 8000 | Framework: Python FastAPI
          </div>
        </div>

        {/* Blockchain */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Layers size={20} color="#38bdf8" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Hardhat EVM Ledger</h3>
            </div>
            <span className="badge badge-cyan">Ready</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '12px' }}>
            Solidity contract <code className="mono">ColdChainTracker.sol</code> anchoring batch digests and custody events.
          </p>
          <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            RPC: http://127.0.0.1:8545 | EVM Local
          </div>
        </div>

        {/* Database */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Database size={20} color="#10b981" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>PostgreSQL Storage</h3>
            </div>
            <span className="badge badge-normal">Configured</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '12px' }}>
            Relational storage for high-frequency sensor readings, telemetry history, and alert states.
          </p>
          <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Port: 5432 | Engine: PostgreSQL 16
          </div>
        </div>
      </div>

      {/* Module Overview & Roadmap */}
      <div className="glass-panel" style={{ padding: '32px', marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Radio size={22} color="var(--primary-cyan)" /> Core Modules & Technical Workflow
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#38bdf8', marginBottom: '6px' }}>1. Ingestion & Simulation</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Deterministic sensor simulator streaming temperature, humidity, sequence number, and GPS with idempotency guards.
            </p>
          </div>
          <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#a855f7', marginBottom: '6px' }}>2. AI Anomaly Engine</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Evaluates incoming telemetry windows against product thermal limits and Isolation Forest anomaly scores.
            </p>
          </div>
          <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#10b981', marginBottom: '6px' }}>3. Cryptographic Anchoring</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Canonical JSON normalization (RFC 8785) with SHA-256 digests committed to the Ethereum/EVM smart contract.
            </p>
          </div>
          <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f59e0b', marginBottom: '6px' }}>4. QR Verification Portal</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Public zero-login traceability badge displaying verified timeline, custody handovers, and tamper status.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', flexWrap: 'wrap', gap: '10px' }}>
        <div>Đề tài 3 — Smart Cold-Chain Traceability System • Nhóm 10</div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>Task 01: Scaffolding Complete</span>
          <span>•</span>
          <span className="mono">Ready for Task 02: Database & Migrations</span>
        </div>
      </footer>
    </div>
  );
}
