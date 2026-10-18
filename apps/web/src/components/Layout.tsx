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
  Clock,
  Search,
  Cpu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>(new Date().toISOString());
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const query = searchQuery.trim();
    if (query.toUpperCase().startsWith('BATCH-') || query.length >= 6) {
      navigate(`/batches?search=${encodeURIComponent(query)}`);
    } else {
      navigate(`/batches?search=${encodeURIComponent(query)}`);
    }
  };

  const navSections = [
    {
      title: 'OPERATIONS',
      items: [
        { name: 'Overview', path: '/', icon: LayoutDashboard },
        { name: 'Batches', path: '/batches', icon: Boxes },
        { name: 'Products Catalog', path: '/products', icon: Package },
      ]
    },
    {
      title: 'INTELLIGENCE & IOT',
      items: [
        { name: 'IoT Telemetry', path: '/sensors', icon: Activity },
        { name: 'AI Anomaly Alerts', path: '/alerts', icon: AlertTriangle },
      ]
    },
    {
      title: 'TRUST & VERIFICATION',
      items: [
        { name: 'Blockchain Anchors', path: '/anchors', icon: LinkIcon },
      ]
    },
    ...(hasRole('ADMIN', 'PRODUCER', 'TRANSPORTER', 'WAREHOUSE_OPERATOR')
      ? [{
          title: 'GOVERNANCE',
          items: [
            { name: 'Management & Admin', path: '/admin', icon: Settings },
          ]
        }]
      : [])
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-canvas)' }}>
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            zIndex: 45,
          }}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        style={{
          width: '270px',
          background: 'linear-gradient(180deg, rgba(13, 19, 33, 0.98) 0%, rgba(7, 10, 18, 0.99) 100%)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 50,
          transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(0)',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: '4px 0 24px rgba(0,0,0,0.4)'
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '24px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)',
                padding: '9px',
                borderRadius: '12px',
                display: 'flex',
                boxShadow: '0 4px 16px rgba(6, 182, 212, 0.45)',
                position: 'relative',
              }}
            >
              <ShieldCheck size={22} color="#ffffff" />
              <div 
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 6px #10b981'
                }}
              />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h1 style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', lineHeight: 1.1 }}>
                  ColdChain <span style={{ color: 'var(--cyan-400)' }}>3.0</span>
                </h1>
              </div>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: '2px' }}>
                IoT • AI • Blockchain
              </p>
            </div>
          </div>

          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="btn-icon"
            style={{ display: 'none' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Sections */}
        <nav 
          style={{ 
            padding: '16px 14px', 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '18px',
            overflowY: 'auto'
          }}
        >
          {navSections.map((section) => (
            <div key={section.title}>
              <div 
                style={{ 
                  fontSize: '0.68rem', 
                  fontWeight: 700, 
                  color: 'var(--text-muted)', 
                  letterSpacing: '0.08em', 
                  padding: '0 10px 8px 10px',
                  textTransform: 'uppercase'
                }}
              >
                {section.title}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || 
                    (item.path !== '/' && location.pathname.startsWith(item.path));

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        color: isActive ? '#ffffff' : 'var(--text-secondary)',
                        background: isActive 
                          ? 'linear-gradient(90deg, rgba(6, 182, 212, 0.16) 0%, rgba(2, 132, 199, 0.08) 100%)' 
                          : 'transparent',
                        border: isActive ? '1px solid rgba(6, 182, 212, 0.35)' : '1px solid transparent',
                        textDecoration: 'none',
                        fontSize: '0.875rem',
                        fontWeight: isActive ? 600 : 500,
                        transition: 'all 0.18s ease',
                      }}
                    >
                      <Icon 
                        size={18} 
                        color={isActive ? 'var(--cyan-400)' : 'var(--text-muted)'} 
                      />
                      <span style={{ flex: 1 }}>{item.name}</span>
                      {isActive && (
                        <div 
                          style={{ 
                            width: 6, 
                            height: 6, 
                            borderRadius: '50%', 
                            background: 'var(--cyan-400)',
                            boxShadow: '0 0 8px var(--cyan-400)'
                          }} 
                        />
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Public Portal Showcase Card */}
          <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
            <NavLink
              to="/trace/BATCH-VAX-2026-001"
              target="_blank"
              style={{
                display: 'block',
                padding: '14px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(99, 102, 241, 0.1) 100%)',
                border: '1px solid rgba(6, 182, 212, 0.25)',
                textDecoration: 'none',
                color: 'var(--text-primary)',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cyan-300)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Public Portal
                </span>
                <span className="badge badge-normal" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
                  Live QR
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                Scan & verify tamper-proof blockchain seal without login.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', fontSize: '0.75rem', color: 'var(--cyan-400)', fontWeight: 600 }}>
                <span>Inspect Certificate</span>
                <ExternalLink size={13} />
              </div>
            </NavLink>
          </div>
        </nav>

        {/* User Profile Bar */}
        {user ? (
          <div
            style={{
              padding: '16px 18px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'rgba(6, 10, 18, 0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(99, 102, 241, 0.25) 100%)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: 'var(--cyan-300)',
                  flexShrink: 0
                }}
              >
                {user.fullName ? user.fullName.slice(0, 2).toUpperCase() : 'CC'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {user.fullName || 'Operator'}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="badge badge-cyan" style={{ fontSize: '0.62rem', padding: '1px 5px', textTransform: 'capitalize' }}>
                    {user.role ? user.role.toLowerCase().replace('_', ' ') : 'User'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="btn-icon"
              style={{ flexShrink: 0 }}
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border-subtle)' }}>
            <NavLink to="/login" className="btn btn-primary btn-sm" style={{ width: '100%' }}>
              Sign In
            </NavLink>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, marginLeft: '270px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header Bar */}
        <header
          style={{
            height: '68px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(7, 10, 18, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 32px',
            position: 'sticky',
            top: 0,
            zIndex: 40,
          }}
        >
          {/* Left search & title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <form onSubmit={handleSearchSubmit} className="search-bar-wrapper" style={{ width: '320px' }}>
              <Search size={16} className="search-bar-icon" />
              <input
                type="text"
                placeholder="Search batch code (e.g. BATCH-VAX)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input search-bar-input"
                style={{ fontSize: '0.825rem', padding: '8px 12px 8px 36px', height: '38px', borderRadius: '10px' }}
              />
              <span className="search-shortcut-badge">↵</span>
            </form>
          </div>

          {/* Right Status Pill & Network Monitor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* System Status Indicators */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {/* Hardhat EVM */}
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  fontSize: '0.75rem', 
                  color: 'var(--text-secondary)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  padding: '5px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <span className="beacon-dot online" style={{ width: 6, height: 6 }} />
                <span>EVM Ledger</span>
                <span className="mono" style={{ color: 'var(--cyan-400)', fontWeight: 600 }}>#31337</span>
              </div>

              {/* AI Sentinel */}
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  fontSize: '0.75rem', 
                  color: 'var(--text-secondary)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  padding: '5px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <Cpu size={13} color="var(--indigo-400)" />
                <span>AI Anomaly:</span>
                <span style={{ color: '#34d399', fontWeight: 600 }}>Active</span>
              </div>
            </div>

            {/* Live Clock */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                background: 'rgba(255, 255, 255, 0.04)',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <Clock size={14} color="var(--cyan-400)" />
              <span className="mono" style={{ fontWeight: 600 }}>
                {currentTime.slice(11, 19)} <span style={{ color: 'var(--text-muted)' }}>UTC</span>
              </span>
            </div>
          </div>
        </header>

        {/* Page Inner Container */}
        <main 
          style={{ 
            flex: 1, 
            padding: '32px', 
            maxWidth: '1540px', 
            width: '100%', 
            margin: '0 auto',
            boxSizing: 'border-box'
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
