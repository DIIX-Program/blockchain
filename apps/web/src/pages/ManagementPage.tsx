import { useState, useEffect } from 'react';
import { Users, Radio, Plus, Battery, X } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function ManagementPage() {
  const { hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'devices' | 'users'>('devices');

  // Register device modal
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [deviceCode, setDeviceCode] = useState('');
  const [model, setModel] = useState('');
  const [isSimulated, setIsSimulated] = useState(true);
  const [batteryPercent, setBatteryPercent] = useState('100');
  const [deviceError, setDeviceError] = useState<string | null>(null);

  const fetchManagementData = async () => {
    try {
      setLoading(true);
      const devicesRes = await api.getDevices();
      setDevices(devicesRes.data || []);

      if (hasRole('ADMIN')) {
        const usersRes = await api.getUsers();
        setUsers(usersRes.data || []);
      }
    } catch (err) {
      console.error('Failed to load management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagementData();
  }, []);

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeviceError(null);

    try {
      await api.createDevice({
        deviceCode,
        model,
        isSimulated,
        batteryPercent: parseFloat(batteryPercent),
      });

      setDeviceModalOpen(false);
      setDeviceCode('');
      setModel('');
      fetchManagementData();
    } catch (err: any) {
      setDeviceError(err?.message || 'Failed to register device');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading enterprise users and device registry..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>
            System Administration & Fleet Registry
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Manage telemetry logger devices, RBAC security roles, and system operators
          </p>
        </div>

        {activeTab === 'devices' && (
          <button
            onClick={() => setDeviceModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #06b6d4, #0284c7)',
              border: 'none',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            <Plus size={18} /> Register Device
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '2px' }}>
        <button
          onClick={() => setActiveTab('devices')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: activeTab === 'devices' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'devices' ? '2px solid var(--primary-cyan)' : '2px solid transparent',
            color: activeTab === 'devices' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: activeTab === 'devices' ? 700 : 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
          }}
        >
          <Radio size={16} color={activeTab === 'devices' ? 'var(--primary-cyan)' : 'var(--text-muted)'} />
          Telemetry Devices ({devices.length})
        </button>

        {hasRole('ADMIN') && (
          <button
            onClick={() => setActiveTab('users')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              background: activeTab === 'users' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'users' ? '2px solid var(--primary-cyan)' : '2px solid transparent',
              color: activeTab === 'users' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: activeTab === 'users' ? 700 : 500,
              fontSize: '0.9rem',
              cursor: 'pointer',
              borderRadius: '8px 8px 0 0',
            }}
          >
            <Users size={16} color={activeTab === 'users' ? 'var(--primary-cyan)' : 'var(--text-muted)'} />
            RBAC Users & Operators ({users.length})
          </button>
        )}
      </div>

      {/* TAB: Devices */}
      {activeTab === 'devices' && (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(0, 0, 0, 0.2)' }}>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Device Code</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Hardware / Profile</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Assigned Organization</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Battery</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((dev) => (
                <tr key={dev.id} style={{ borderBottom: '1px solid var(--border-subtle)' }} className="table-row-hover">
                  <td style={{ padding: '16px 20px' }}>
                    <span className="mono" style={{ fontWeight: 700, color: 'var(--primary-cyan)' }}>
                      {dev.deviceCode}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', color: '#ffffff' }}>{dev.model}</td>
                  <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                    {dev.organization?.name || 'Unassigned'}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399' }}>
                      <Battery size={16} />
                      <span className="mono">{dev.batteryPercent ? `${Number(dev.batteryPercent)}%` : '100%'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    {dev.isSimulated ? (
                      <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>Simulated</span>
                    ) : (
                      <span className="badge badge-normal" style={{ fontSize: '0.65rem' }}>Physical Hardware</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB: Users */}
      {activeTab === 'users' && hasRole('ADMIN') && (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(0, 0, 0, 0.2)' }}>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Full Name</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Email Address</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Role</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Organization</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }} className="table-row-hover">
                  <td style={{ padding: '16px 20px', fontWeight: 600, color: '#ffffff' }}>{u.fullName}</td>
                  <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{u.email}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <span className="badge badge-cyan">{u.role}</span>
                  </td>
                  <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>{u.organization?.name || 'Global'}</td>
                  <td style={{ padding: '16px 20px' }}>
                    {u.isActive ? (
                      <span className="badge badge-normal" style={{ fontSize: '0.65rem' }}>Active</span>
                    ) : (
                      <span className="badge badge-alert" style={{ fontSize: '0.65rem' }}>Disabled</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Register Device */}
      {deviceModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '28px', background: '#0f172a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>Register Telemetry Device</h3>
              <button onClick={() => setDeviceModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {deviceError && (
              <div style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#fb7185', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.85rem' }}>
                {deviceError}
              </div>
            )}

            <form onSubmit={handleRegisterDevice} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Device Identifier (Unique Code) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DEV-TRUCK-REFRIG-02"
                  value={deviceCode}
                  onChange={(e) => setDeviceCode(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', color: '#ffffff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Hardware / Sensor Profile Model *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ESP32-SHT35-BLE-ColdLogger"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', color: '#ffffff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Battery Percentage (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={batteryPercent}
                  onChange={(e) => setBatteryPercent(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', color: '#ffffff' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  id="isSimulated"
                  checked={isSimulated}
                  onChange={(e) => setIsSimulated(e.target.checked)}
                />
                <label htmlFor="isSimulated" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Mark as simulated device profile (clearly labeled in telemetry)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setDeviceModalOpen(false)} style={{ padding: '8px 14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 18px', borderRadius: '8px', background: 'linear-gradient(135deg, #06b6d4, #0284c7)', border: 'none', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}>Register Device</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
