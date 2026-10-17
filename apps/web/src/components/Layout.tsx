import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  Package, 
  Boxes, 
  Activity, 
  AlertTriangle, 
  Link as LinkIcon, 
  Settings, 
  LogOut, 
  ExternalLink,
  Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>(new Date().toISOString());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toISOString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'Products', path: '/products', icon: Package },
    { name: 'Batches', path: '/batches', icon: Boxes },
    { name: 'IoT Telemetry', path: '/sensors', icon: Activity },
    { name: 'AI Alerts', path: '/alerts', icon: AlertTriangle },
    { name: 'Blockchain Anchors', path: '/anchors', icon: LinkIcon },
    ...(hasRole('ADMIN', 'PRODUCER', 'TRANSPORTER', 'WAREHOUSE_OPERATOR')
      ? [{ name: 'Management', path: '/admin', icon: Settings }]
      : []),
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
      {/* Sidebar Navigation */}
      <aside
        style={{
          width: '260px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 40,
          transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(0)',
          transition: 'transform 0.3s ease',
        }}
        className="sidebar-desktop"
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '24px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #06b6d4, #0284c7)',
              padding: '8px',
              borderRadius: '10px',
              display: 'flex',
              boxShadow: '0 4px 12px rgba(6, 182, 212, 0.4)',
            }}
          >
            <ShieldCheck size={24} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
              ColdChain 3.0
            </h2>
            <span style={{ fontSize: '0.7rem', color: 'var(--primary-cyan)', fontWeight: 600 }}>
              IoT • AI • Blockchain
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ padding: '20px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  background: isActive ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                  border: isActive ? '1px solid var(--border-active)' : '1px solid transparent',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.2s ease',
                }}
              >
                <Icon size={18} color={isActive ? 'var(--primary-cyan)' : 'var(--text-muted)'} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}

          {/* Public Portal external link */}
          <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
            <NavLink
              to="/trace/BATCH-VAX-2026-001"
              target="_blank"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.03)',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontSize: '0.8rem',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ExternalLink size={14} color="var(--primary-cyan)" />
                Public QR Portal
              </span>
              <span className="badge badge-normal" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>Live</span>
            </NavLink>
          </div>
        </nav>

        {/* User Card & Logout */}
        {user && (
          <div
            style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ overflow: 'hidden' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {user.fullName}
                </p>
                <span className="badge badge-cyan" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                  {user.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
            {user.organization && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.organization.name}
              </p>
            )}
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, marginLeft: '260px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header Bar */}
        <header
          style={{
            height: '64px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(10, 14, 23, 0.8)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 32px',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Smart Cold-Chain Traceability System (IoT + AI + Blockchain)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* UTC Clock */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
              }}
            >
              <Clock size={14} color="var(--primary-cyan)" />
              <span className="mono">{currentTime.slice(11, 19)} UTC</span>
            </div>

            {/* Health pill */}
            <span className="badge badge-normal" style={{ fontSize: '0.7rem' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              Ledger Active
            </span>
          </div>
        </header>

        {/* Page Inner Container */}
        <main style={{ flex: 1, padding: '32px', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
