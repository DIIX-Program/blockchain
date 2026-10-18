import { useState, useEffect } from 'react';
import { 
  Activity, 
  Thermometer, 
  Radio, 
  Boxes, 
  Send, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Zap
} from 'lucide-react';
import { api } from '../api/client';
import { TemperatureChart } from '../components/TemperatureChart';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function SensorMonitoringPage() {
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [readings, setReadings] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);

  // Manual telemetry injection simulator
  const [simTemp, setSimTemp] = useState('4.5');
  const [simHumid, setSimHumid] = useState('55');
  const [simulating, setSimulating] = useState(false);
  const [simMessage, setSimMessage] = useState<string | null>(null);

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

  const loadTelemetry = async (batchId: string) => {
    if (!batchId) return;
    try {
      const found = batches.find((b) => b.id === batchId);
      setSelectedBatch(found || null);

      const res = await api.getSensorReadings(batchId, '?limit=100&order=asc');
      setReadings(res.data || []);
    } catch (err) {
      console.error('Failed to load telemetry readings:', err);
    }
  };

  useEffect(() => {
    loadTelemetry(selectedBatchId);
  }, [selectedBatchId, batches]);

  const handleSimulateTelemetry = async (tempVal?: number, humidVal?: number) => {
    if (!selectedBatchId) return;
    const targetTemp = tempVal !== undefined ? tempVal : parseFloat(simTemp);
    const targetHumid = humidVal !== undefined ? humidVal : parseFloat(simHumid);

    try {
      setSimulating(true);
      setSimMessage(null);

      await api.ingestTelemetry({
        batchId: selectedBatchId,
        deviceCode: 'ESP32-DHT22-SIM',
        temperatureC: targetTemp,
        humidityPercent: targetHumid,
        latitude: 10.7769 + (Math.random() - 0.5) * 0.05,
        longitude: 106.7009 + (Math.random() - 0.5) * 0.05,
        sequenceNumber: readings.length + 1,
        isSimulated: true
      });

      setSimMessage(`Packet #${readings.length + 1} (${targetTemp}°C, ${targetHumid}%) streamed to IoT Ingestion Gateway`);
      await loadTelemetry(selectedBatchId);
    } catch (err: any) {
      setSimMessage(`Injection note: ${err?.message || 'Failed to stream reading'}`);
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Connecting to IoT telemetry channels and sensor streams..." />;
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cyan-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Real-Time Surveillance
            </span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            IoT Sensor Fleet Telemetry
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Continuous high-frequency environmental sensor ingestion (DHT22, GPS, battery RSSI) with sub-second anomaly verification.
          </p>
        </div>

        {/* Batch Target Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Boxes size={18} color="var(--cyan-400)" />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Stream:</span>
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="form-select"
            style={{ width: 'auto', fontSize: '0.9rem', fontWeight: 700, padding: '8px 14px' }}
          >
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.batchNumber} — {b.product?.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '18px 22px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={14} color="var(--cyan-400)" /> Ingested Packets
          </span>
          <p className="mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
            {readings.length} Frames
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '18px 22px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Thermometer size={14} color="#10b981" /> Average Recorded Temp
          </span>
          <p className="mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
            {avgTemp}°C
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '18px 22px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Thermometer size={14} color="#f59e0b" /> Extremes (Min / Max)
          </span>
          <p className="mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24', marginTop: '4px' }}>
            {minRecorded}°C / {maxRecorded}°C
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '18px 22px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Radio size={14} color={excursions > 0 ? '#f43f5e' : '#10b981'} /> Thermal Excursions
          </span>
          <p className="mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: excursions > 0 ? '#f43f5e' : '#10b981', marginTop: '4px' }}>
            {excursions} Breach{excursions === 1 ? '' : 'es'}
          </p>
        </div>
      </div>

      {/* Main Interactive Chart */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
              Continuous Cold-Chain Temperature Profile
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              Safe storage requirement for {selectedBatch?.product?.name}: <span className="mono" style={{ color: 'var(--cyan-300)' }}>{tempMin}°C to {tempMax}°C</span>
            </p>
          </div>
          <span className="badge badge-normal">
            Corridor: {tempMin}°C to {tempMax}°C
          </span>
        </div>
        <TemperatureChart readings={readings} tempMinC={tempMin} tempMaxC={tempMax} height={320} />
      </div>

      {/* Live IoT Sensor Simulator / Injection Panel (Great for Demoing!) */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '24px 28px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(9, 14, 26, 0.95) 100%)',
          border: '1px solid rgba(6, 182, 212, 0.25)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="var(--cyan-400)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>
                Live IoT Telemetry Simulator & Test Injector
              </h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginTop: '4px' }}>
              Inject synthetic ESP32 / DHT22 sensor readings into this batch to trigger and demonstrate real-time AI anomaly detection.
            </p>
          </div>

          {/* Quick Presets */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleSimulateTelemetry(4.2, 55)}
              disabled={simulating}
              className="btn btn-secondary btn-sm"
              style={{ color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.3)' }}
            >
              <CheckCircle2 size={13} /> Normal (+4.2°C)
            </button>
            <button
              onClick={() => handleSimulateTelemetry(7.8, 62)}
              disabled={simulating}
              className="btn btn-secondary btn-sm"
              style={{ color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.3)' }}
            >
              <AlertTriangle size={13} /> Upper Limit (+7.8°C)
            </button>
            <button
              onClick={() => handleSimulateTelemetry(14.8, 70)}
              disabled={simulating}
              className="btn btn-secondary btn-sm"
              style={{ color: '#fb7185', borderColor: 'rgba(244, 63, 94, 0.3)' }}
            >
              <AlertTriangle size={13} /> Freezer Spike (+14.8°C)
            </button>
          </div>
        </div>

        {simMessage && (
          <div 
            style={{ 
              marginBottom: '16px', 
              padding: '10px 14px', 
              borderRadius: '8px', 
              background: 'rgba(6, 182, 212, 0.12)', 
              border: '1px solid rgba(6, 182, 212, 0.25)',
              color: 'var(--cyan-300)',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Sparkles size={14} />
            <span>{simMessage}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', alignItems: 'flex-end' }}>
          <div className="form-group">
            <label className="form-label">Simulated Temperature (°C)</label>
            <input
              type="number"
              step="0.1"
              value={simTemp}
              onChange={(e) => setSimTemp(e.target.value)}
              className="form-input mono"
              placeholder="e.g. 4.5"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Relative Humidity (%)</label>
            <input
              type="number"
              step="1"
              value={simHumid}
              onChange={(e) => setSimHumid(e.target.value)}
              className="form-input mono"
              placeholder="e.g. 55"
            />
          </div>

          <div>
            <button
              onClick={() => handleSimulateTelemetry()}
              disabled={simulating}
              className="btn btn-primary"
              style={{ width: '100%', height: '42px' }}
            >
              <Send size={15} /> {simulating ? 'Injecting...' : 'Transmit Telemetry Packet'}
            </button>
          </div>
        </div>
      </div>

      {/* Telemetry Stream Data Table */}
      <div className="table-wrapper">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
            High-Frequency Telemetry Stream Log
          </h4>
          <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            UTC Timestamped & Idempotent
          </span>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Seq #</th>
              <th>Timestamp (UTC)</th>
              <th>Hardware Device</th>
              <th>Temperature</th>
              <th>Humidity</th>
              <th>GPS Coordinates</th>
              <th>Ingestion Node</th>
            </tr>
          </thead>
          <tbody>
            {readings.map((r) => {
              const temp = Number(r.temperatureC);
              const isExcursion = temp < tempMin || temp > tempMax;

              return (
                <tr key={r.id}>
                  <td className="mono" style={{ fontWeight: 600 }}>#{r.sequenceNumber}</td>
                  <td className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {new Date(r.recordedAt).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </td>
                  <td style={{ color: 'var(--cyan-300)', fontWeight: 600 }}>
                    {r.device?.deviceCode || 'DEV-AUTO'}
                  </td>
                  <td>
                    <span 
                      className="mono" 
                      style={{ 
                        fontWeight: 700, 
                        color: isExcursion ? '#fb7185' : '#34d399',
                        background: isExcursion ? 'rgba(244, 63, 94, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        border: isExcursion ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(16, 185, 129, 0.25)'
                      }}
                    >
                      {temp.toFixed(2)}°C {isExcursion && '⚠️'}
                    </span>
                  </td>
                  <td className="mono" style={{ color: '#818cf8' }}>
                    {r.humidityPercent ? `${Number(r.humidityPercent).toFixed(1)}%` : '—'}
                  </td>
                  <td className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {r.latitude && r.longitude ? `${Number(r.latitude).toFixed(4)}, ${Number(r.longitude).toFixed(4)}` : 'Stationary'}
                  </td>
                  <td>
                    {r.isSimulated ? (
                      <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>Simulated</span>
                    ) : (
                      <span className="badge badge-normal" style={{ fontSize: '0.65rem' }}>Hardware Node</span>
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
