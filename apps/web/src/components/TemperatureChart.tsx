import { useState, useMemo } from 'react';
import { Thermometer, Droplets, AlertTriangle, ShieldCheck, MapPin } from 'lucide-react';

export interface SensorReadingPoint {
  id: string;
  sequenceNumber?: string | number;
  recordedAt: string;
  temperatureC: number | string;
  humidityPercent?: number | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  isSimulated?: boolean;
}

interface TemperatureChartProps {
  readings: SensorReadingPoint[];
  tempMinC?: number;
  tempMaxC?: number;
  height?: number;
}

export function TemperatureChart({
  readings,
  tempMinC = 2.0,
  tempMaxC = 8.0,
  height = 320,
}: TemperatureChartProps) {
  const [activeMetric, setActiveMetric] = useState<'temp' | 'humidity'>('temp');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Chronologically sort readings
  const sorted = useMemo(() => {
    if (!readings) return [];
    return [...readings].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );
  }, [readings]);

  // Statistics calculation
  const stats = useMemo(() => {
    if (sorted.length === 0) return null;
    const temps = sorted.map((r) => Number(r.temperatureC)).filter((t) => !isNaN(t));
    const humids = sorted.map((r) => Number(r.humidityPercent)).filter((h) => !isNaN(h));

    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const avgTemp = temps.reduce((a, b) => a + b, 0) / (temps.length || 1);
    const excursions = temps.filter((t) => t < tempMinC || t > tempMaxC).length;
    const currentTemp = temps[temps.length - 1];

    const minHumid = humids.length > 0 ? Math.min(...humids) : 0;
    const maxHumid = humids.length > 0 ? Math.max(...humids) : 100;
    const avgHumid = humids.length > 0 ? humids.reduce((a, b) => a + b, 0) / humids.length : 0;

    return {
      currentTemp,
      minTemp,
      maxTemp,
      avgTemp,
      excursions,
      totalReadings: sorted.length,
      minHumid,
      maxHumid,
      avgHumid,
      currentHumid: humids.length > 0 ? humids[humids.length - 1] : null,
    };
  }, [sorted, tempMinC, tempMaxC]);

  if (!readings || readings.length === 0) {
    return (
      <div
        style={{
          height: `${height}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.9rem',
          background: 'rgba(10, 14, 23, 0.5)',
          borderRadius: '16px',
          border: '1px dashed var(--border-subtle)',
          gap: '12px'
        }}
      >
        <Thermometer size={32} color="var(--text-dim)" />
        <p>No telemetry readings ingested for this batch yet.</p>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          Readings stream live from IoT sensors or simulated devices.
        </span>
      </div>
    );
  }

  // Geometry Setup
  const svgWidth = 1000;
  const svgHeight = 280;
  const paddingLeft = 56;
  const paddingRight = 30;
  const paddingTop = 26;
  const paddingBottom = 42;
  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  // Domain setup for Temperature
  const dataMinTemp = Math.min(tempMinC - 1.5, stats?.minTemp ?? tempMinC);
  const dataMaxTemp = Math.max(tempMaxC + 1.5, stats?.maxTemp ?? tempMaxC);
  const tempRange = dataMaxTemp - dataMinTemp || 1;

  // Domain setup for Humidity (0 - 100%)
  const dataMinHumid = 0;
  const dataMaxHumid = 100;
  const humidRange = 100;

  const getX = (idx: number) => {
    if (sorted.length === 1) return paddingLeft + plotWidth / 2;
    return paddingLeft + (idx / (sorted.length - 1)) * plotWidth;
  };

  const getYTemp = (val: number) => {
    return paddingTop + plotHeight - ((val - dataMinTemp) / tempRange) * plotHeight;
  };

  const getYHumid = (val: number) => {
    return paddingTop + plotHeight - ((val - dataMinHumid) / humidRange) * plotHeight;
  };

  // Safe zone rectangle coordinates
  const safeTop = getYTemp(tempMaxC);
  const safeBottom = getYTemp(tempMinC);
  const safeH = Math.max(0, safeBottom - safeTop);

  // Build smooth Bezier path helper
  const createSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length <= 1) return pts.map((p) => `M ${p.x} ${p.y}`).join(' ');
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i < pts.length - 2 ? pts[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
  };

  const points = sorted.map((r, i) => {
    const t = Number(r.temperatureC);
    const h = r.humidityPercent !== null && r.humidityPercent !== undefined ? Number(r.humidityPercent) : 50;
    const isExcursion = t < tempMinC || t > tempMaxC;
    return {
      x: getX(i),
      y: activeMetric === 'temp' ? getYTemp(t) : getYHumid(h),
      reading: r,
      isExcursion,
      t,
      h,
      idx: i,
    };
  });

  const linePathD = createSmoothPath(points);
  const areaPathD = `${linePathD} L ${points[points.length - 1].x} ${paddingTop + plotHeight} L ${points[0].x} ${paddingTop + plotHeight} Z`;

  const hoveredPoint = hoveredIdx !== null ? points[hoveredIdx] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Telemetry Stats Ribbon */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          background: 'rgba(15, 23, 42, 0.65)',
          padding: '12px 18px',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)'
        }}
      >
        {/* Current reading */}
        <div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
            Current Temp
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
            <span 
              className="mono" 
              style={{ 
                fontSize: '1.4rem', 
                fontWeight: 800, 
                color: (stats?.currentTemp ?? 0) < tempMinC || (stats?.currentTemp ?? 0) > tempMaxC 
                  ? 'var(--status-alert)' 
                  : 'var(--cyan-400)' 
              }}
            >
              {stats?.currentTemp?.toFixed(1)}°C
            </span>
          </div>
        </div>

        {/* Safe Corridor */}
        <div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
            Safe Corridor
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px' }}>
            <span className="mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {tempMinC.toFixed(1)}°C — {tempMaxC.toFixed(1)}°C
            </span>
          </div>
        </div>

        {/* Min / Max recorded */}
        <div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
            Extremes (Min / Max)
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
            <span className="mono" style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {stats?.minTemp?.toFixed(1)}°C / {stats?.maxTemp?.toFixed(1)}°C
            </span>
          </div>
        </div>

        {/* Excursions */}
        <div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
            Thermal Integrity
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            {stats?.excursions === 0 ? (
              <span className="badge badge-normal" style={{ fontSize: '0.75rem' }}>
                <ShieldCheck size={13} /> 100% Intact
              </span>
            ) : (
              <span className="badge badge-alert" style={{ fontSize: '0.75rem' }}>
                <AlertTriangle size={13} /> {stats?.excursions} Excursions
              </span>
            )}
          </div>
        </div>

        {/* Metric Selector Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
          <button
            onClick={() => setActiveMetric('temp')}
            className={`btn btn-sm ${activeMetric === 'temp' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.75rem', padding: '5px 10px' }}
          >
            <Thermometer size={13} /> Temp
          </button>
          <button
            onClick={() => setActiveMetric('humidity')}
            className={`btn btn-sm ${activeMetric === 'humidity' ? 'btn-indigo' : 'btn-secondary'}`}
            style={{ fontSize: '0.75rem', padding: '5px 10px' }}
          >
            <Droplets size={13} /> Humidity
          </button>
        </div>
      </div>

      {/* SVG Interactive Chart Box */}
      <div 
        style={{ 
          position: 'relative', 
          width: '100%', 
          background: 'rgba(8, 12, 22, 0.85)',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle)',
          padding: '12px 14px 4px 14px'
        }}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            {/* Area gradient for temperature */}
            <linearGradient id="tempAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="85%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>

            {/* Area gradient for humidity */}
            <linearGradient id="humidAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
              <stop offset="85%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>

            {/* Safe zone gradient */}
            <linearGradient id="safeZonePattern" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.04" />
            </linearGradient>
          </defs>

          {/* Background Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = paddingTop + plotHeight * ratio;
            const val = activeMetric === 'temp' 
              ? dataMaxTemp - ratio * tempRange 
              : dataMaxHumid - ratio * humidRange;
            return (
              <g key={ratio}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={paddingLeft + plotWidth}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  fill="var(--text-muted)"
                  fontSize="11"
                  textAnchor="end"
                  fontFamily="var(--font-mono)"
                >
                  {val.toFixed(0)}{activeMetric === 'temp' ? '°' : '%'}
                </text>
              </g>
            );
          })}

          {/* Safe Corridor Band (only in Temperature mode) */}
          {activeMetric === 'temp' && (
            <g>
              <rect
                x={paddingLeft}
                y={safeTop}
                width={plotWidth}
                height={safeH}
                fill="url(#safeZonePattern)"
                stroke="rgba(16, 185, 129, 0.25)"
                strokeDasharray="3 3"
              />
              {/* Max threshold label */}
              <text
                x={paddingLeft + plotWidth - 6}
                y={safeTop - 6}
                fill="#34d399"
                fontSize="10"
                fontWeight="600"
                textAnchor="end"
                fontFamily="var(--font-mono)"
              >
                Max Safe: {tempMaxC}°C
              </text>
              {/* Min threshold label */}
              <text
                x={paddingLeft + plotWidth - 6}
                y={safeBottom + 14}
                fill="#34d399"
                fontSize="10"
                fontWeight="600"
                textAnchor="end"
                fontFamily="var(--font-mono)"
              >
                Min Safe: {tempMinC}°C
              </text>
            </g>
          )}

          {/* Area Fill */}
          <path
            d={areaPathD}
            fill={activeMetric === 'temp' ? 'url(#tempAreaGradient)' : 'url(#humidAreaGradient)'}
          />

          {/* Main Telemetry Spline Line */}
          <path
            d={linePathD}
            fill="none"
            stroke={activeMetric === 'temp' ? '#06b6d4' : '#818cf8'}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((p) => {
            const isHovered = hoveredIdx === p.idx;
            const isAlert = p.isExcursion && activeMetric === 'temp';

            return (
              <g key={p.idx}>
                {/* Excursion radar ring */}
                {isAlert && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="8"
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="1.5"
                    opacity="0.6"
                    className="pulse-indicator"
                  />
                )}

                {/* Point dot */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 6 : isAlert ? 4.5 : 3}
                  fill={isAlert ? '#f43f5e' : isHovered ? '#ffffff' : activeMetric === 'temp' ? '#06b6d4' : '#818cf8'}
                  stroke={isAlert ? '#ffffff' : '#070a12'}
                  strokeWidth="2"
                  style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                  onMouseEnter={() => setHoveredIdx(p.idx)}
                />

                {/* Invisible hover trigger column */}
                <rect
                  x={p.x - plotWidth / (points.length * 2)}
                  y={paddingTop}
                  width={plotWidth / points.length}
                  height={plotHeight}
                  fill="transparent"
                  style={{ cursor: 'crosshair' }}
                  onMouseEnter={() => setHoveredIdx(p.idx)}
                />
              </g>
            );
          })}

          {/* Interactive Crosshair & Scrubbing Line */}
          {hoveredPoint && (
            <g>
              <line
                x1={hoveredPoint.x}
                y1={paddingTop}
                x2={hoveredPoint.x}
                y2={paddingTop + plotHeight}
                stroke="rgba(255, 255, 255, 0.4)"
                strokeDasharray="3 3"
                strokeWidth="1.5"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="7"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Bottom Time Axis Labels */}
          {points.length > 0 && (
            <g>
              <text
                x={paddingLeft}
                y={svgHeight - 12}
                fill="var(--text-muted)"
                fontSize="11"
                textAnchor="start"
                fontFamily="var(--font-mono)"
              >
                {new Date(sorted[0].recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </text>
              <text
                x={paddingLeft + plotWidth}
                y={svgHeight - 12}
                fill="var(--text-muted)"
                fontSize="11"
                textAnchor="end"
                fontFamily="var(--font-mono)"
              >
                {new Date(sorted[sorted.length - 1].recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </text>
            </g>
          )}
        </svg>

        {/* Floating Precision Hover Tooltip HUD */}
        {hoveredPoint && (
          <div
            style={{
              position: 'absolute',
              top: '16px',
              left: `${Math.min(Math.max(hoveredPoint.x * 0.1, 10), 80)}%`,
              transform: 'translateX(-50%)',
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(16px)',
              border: `1px solid ${hoveredPoint.isExcursion ? 'rgba(244, 63, 94, 0.5)' : 'rgba(6, 182, 212, 0.4)'}`,
              borderRadius: '12px',
              padding: '10px 14px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
              pointerEvents: 'none',
              zIndex: 20,
              minWidth: '200px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {new Date(hoveredPoint.reading.recordedAt).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </span>
              {hoveredPoint.isExcursion ? (
                <span className="badge badge-alert" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                  Excursion
                </span>
              ) : (
                <span className="badge badge-normal" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                  Normal
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'baseline' }}>
              <div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Temp</span>
                <p className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: hoveredPoint.isExcursion ? '#fb7185' : '#22d3ee' }}>
                  {hoveredPoint.t.toFixed(2)}°C
                </p>
              </div>

              {hoveredPoint.reading.humidityPercent !== null && hoveredPoint.reading.humidityPercent !== undefined && (
                <div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Humidity</span>
                  <p className="mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#818cf8' }}>
                    {Number(hoveredPoint.reading.humidityPercent).toFixed(1)}%
                  </p>
                </div>
              )}
            </div>

            {hoveredPoint.reading.latitude && hoveredPoint.reading.longitude && (
              <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <MapPin size={11} color="var(--cyan-400)" />
                <span className="mono">
                  {Number(hoveredPoint.reading.latitude).toFixed(4)}, {Number(hoveredPoint.reading.longitude).toFixed(4)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
