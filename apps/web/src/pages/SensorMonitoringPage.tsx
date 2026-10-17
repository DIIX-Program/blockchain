import { useState, useEffect } from 'react';
import { Activity, Thermometer, Radio, Boxes } from 'lucide-react';
import { api } from '../api/client';
import { TemperatureChart } from '../components/TemperatureChart';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function SensorMonitoringPage() {
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [readings, setReadings] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);

  useEffect(() => {
    async function initBatches() {
      try {
        setLoading(true);
        const res = await api.getBatches('?limit=50');
        const list = res.data || [];
        setBatches(list);
        if (list.length > 0) {
          setSelectedBatchId(list[0].id);
          setSelectedBatch(list[0]);
        }
      } catch (err) {
        console.error('Failed to load batches:', err);
      } finally {
        setLoading(false);
      }
    }

    initBatches();
  }, []);

  useEffect(() => {
    async function loadTelemetry() {
      if (!selectedBatchId) return;
      try {
        const found = batches.find((b) => b.id === selectedBatchId);
        setSelectedBatch(found || null);

        const res = await api.getSensorReadings(selectedBatchId, '?limit=100&order=asc');
        setReadings(res.data || []);
      } catch (err) {
        console.error('Failed to load telemetry readings:', err);
      }
    }

    loadTelemetry();
  }, [selectedBatchId, batches]);

  if (loading) {
    return <LoadingSpinner message="Connecting to IoT telemetry channels..." />;
  }

  const tempMin = selectedBatch?.product ? Number(selectedBatch.product.tempMinC) : 2.0;
  const tempMax = selectedBatch?.product ? Number(selectedBatch.product.tempMaxC) : 8.0;

  const temps = readings.map((r) => Number(r.temperatureC));
  const avgTemp = temps.length > 0 ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(2) : '—';
  const maxRecorded = temps.length > 0 ? Math.max(...temps).toFixed(2) : '—';
  const minRecorded = temps.length > 0 ? Math.min(...temps).toFixed(2) : '—';
  const excursions = temps.filter((t) => t < tempMin || t > tempMax).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header & Batch Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>
            IoT Sensor Surveillance & Telemetry
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            High-frequency continuous temperature, relative humidity, and geolocation data streams
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Boxes size={18} color="var(--primary-cyan)" />
          <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Target Batch:</label>
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              background: '#0f172a',
              border: '1px solid var(--border-active)',
              color: '#ffffff',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          >
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.batchNumber} — {b.product?.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={14} color="var(--primary-cyan)" /> Recorded Telemetry Points
          </span>
          <p className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
            {readings.length} Packets
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Thermometer size={14} color="#10b981" /> Average Recorded Temp
          </span>
          <p className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
            {avgTemp}°C
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Thermometer size={14} color="#f59e0b" /> Min / Max Observed
          </span>
          <p className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fbbf24', marginTop: '4px' }}>
            {minRecorded}°C / {maxRecorded}°C
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Radio size={14} color={excursions > 0 ? '#f43f5e' : '#10b981'} /> Thermal Excursions
          </span>
          <p className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: excursions > 0 ? '#f43f5e' : '#10b981', marginTop: '4px' }}>
            {excursions} Breach{excursions === 1 ? '' : 'es'}
          </p>
        </div>
      </div>

      {/* Main Chart */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
            Continuous Cold-Chain Temperature Profile
          </h3>
          <span className="badge badge-normal" style={{ fontSize: '0.7rem' }}>
            Band: {tempMin}°C to {tempMax}°C
          </span>
        </div>
        <TemperatureChart readings={readings} tempMinC={tempMin} tempMaxC={tempMax} height={320} />
      </div>

      {/* Data Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(0, 0, 0, 0.2)' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>Telemetry Packet Stream (UTC Timestamps)</h4>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '12px 16px' }}>Seq #</th>
              <th style={{ padding: '12px 16px' }}>Timestamp (UTC)</th>
              <th style={{ padding: '12px 16px' }}>Device</th>
              <th style={{ padding: '12px 16px' }}>Temperature</th>
              <th style={{ padding: '12px 16px' }}>Humidity</th>
              <th style={{ padding: '12px 16px' }}>Coordinates</th>
              <th style={{ padding: '12px 16px' }}>Source Mode</th>
            </tr>
          </thead>
          <tbody>
            {readings.map((r) => {
              const temp = Number(r.temperatureC);
              const isExcursion = temp < tempMin || temp > tempMax;

              return (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border-subtle)' }} className="table-row-hover">
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>{r.sequenceNumber}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>
                    {new Date(r.recordedAt).toISOString().replace('T', ' ').slice(0, 19)}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--primary-cyan)' }}>
                    {r.device?.deviceCode || 'DEV-AUTO'}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: isExcursion ? '#f43f5e' : '#34d399' }}>
                    {temp.toFixed(2)}°C {isExcursion && '⚠️'}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#60a5fa' }}>
                    {r.humidityPercent ? `${Number(r.humidityPercent).toFixed(1)}%` : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {r.latitude && r.longitude ? `${Number(r.latitude).toFixed(3)}, ${Number(r.longitude).toFixed(3)}` : 'Stationary'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {r.isSimulated ? (
                      <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>Simulated</span>
                    ) : (
                      <span className="badge badge-normal" style={{ fontSize: '0.65rem' }}>Hardware</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
