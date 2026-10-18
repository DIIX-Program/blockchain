import { useState, useEffect } from 'react';
import { 
  Users, 
  Radio, 
  Plus, 
  Battery, 
  X
} from 'lucide-react';
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cyan-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Administration & Access Control
            </span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            System Administration & Fleet Registry
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Manage telemetry logger devices, RBAC security roles, and authorized supply chain operators.
          </p>
        </div>

        {activeTab === 'devices' && (
          <button
            onClick={() => setDeviceModalOpen(true)}
            className="btn btn-primary"
          >
            <Plus size={18} /> Register Device
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs-container" style={{ width: 'auto' }}>
        <button
          onClick={() => setActiveTab('devices')}
          className={`tab-btn ${activeTab === 'devices' ? 'active' : ''}`}
        >
          <Radio size={16} />
          Telemetry Devices ({devices.length})
        </button>

        {hasRole('ADMIN') && (
          <button
            onClick={() => setActiveTab('users')}
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          >
            <Users size={16} />
            RBAC Users & Operators ({users.length})
          </button>
        )}
      </div>

      {/* TAB: Devices */}
      {activeTab === 'devices' && (
        <div className="table-wrapper">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
              Provisioned Hardware & Simulator Loggers
            </h2>
            <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {devices.length} Devices Registered
            </span>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Device Code</th>
                <th>Hardware / Profile</th>
                <th>Assigned Organization</th>
                <th>Battery Level</th>
                <th>Node Type</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((dev) => (
                <tr key={dev.id}>
                  <td>
                    <span className="mono" style={{ fontWeight: 700, color: 'var(--cyan-300)' }}>
                      {dev.deviceCode}
                    </span>
                  </td>
                  <td style={{ color: '#ffffff', fontWeight: 600 }}>{dev.model}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {dev.organization?.name || 'Global Shared'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Battery size={16} color="#34d399" />
                      <span className="mono" style={{ color: '#34d399', fontWeight: 600 }}>
                        {dev.batteryPercent ? `${Number(dev.batteryPercent)}%` : '100%'}
                      </span>
                    </div>
                  </td>
                  <td>
                    {dev.isSimulated ? (
                      <span className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>
                        Simulated ESP32
                      </span>
                    ) : (
                      <span className="badge badge-normal" style={{ fontSize: '0.68rem' }}>
                        Physical Sensor
                      </span>
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
        <div className="table-wrapper">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
              Role-Based Access Control (RBAC) Accounts
            </h2>
            <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {users.length} Users
            </span>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Email Address</th>
                <th>Role</th>
                <th>Organization</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600, color: '#ffffff' }}>{u.fullName}</td>
                  <td className="mono" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {u.email}
                  </td>
                  <td>
                    <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {u.organization?.name || 'Global Controller'}
                  </td>
                  <td>
                    {u.isActive ? (
                      <span className="badge badge-normal" style={{ fontSize: '0.68rem' }}>Active</span>
                    ) : (
                      <span className="badge badge-alert" style={{ fontSize: '0.68rem' }}>Disabled</span>
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
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Radio size={20} color="var(--cyan-400)" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                  Register Telemetry Device
                </h3>
              </div>
              <button onClick={() => setDeviceModalOpen(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            {deviceError && (
              <div style={{ margin: '16px 26px 0 26px', background: 'var(--status-alert-bg)', border: '1px solid var(--status-alert-border)', color: '#fb7185', padding: '12px 16px', borderRadius: '10px', fontSize: '0.85rem' }}>
                {deviceError}
              </div>
            )}

            <form onSubmit={handleRegisterDevice}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">
                    Device Identifier Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DEV-TRUCK-REFRIG-02"
                    value={deviceCode}
                    onChange={(e) => setDeviceCode(e.target.value)}
                    className="form-input mono"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Hardware / Sensor Model Specification *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ESP32-SHT35-BLE-ColdLogger"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Battery Health Percentage (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={batteryPercent}
                    onChange={(e) => setBatteryPercent(e.target.value)}
                    className="form-input mono"
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                  <input
                    type="checkbox"
                    id="isSimulated"
                    checked={isSimulated}
                    onChange={(e) => setIsSimulated(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--cyan-500)', cursor: 'pointer' }}
                  />
                  <label htmlFor="isSimulated" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    Mark as simulated virtual logger profile
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setDeviceModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Register Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
