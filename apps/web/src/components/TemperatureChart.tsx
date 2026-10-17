import { useState } from 'react';
import { Thermometer, Droplets, Clock } from 'lucide-react';

interface SensorReadingPoint {
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
  height = 280,
}: TemperatureChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<SensorReadingPoint | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  if (!readings || readings.length === 0) {
    return (
      <div
        style={{
          height: `${height}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.9rem',
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
        }}
      >
        No telemetry readings available for this batch yet.
      </div>
    );
  }

  // Sort readings chronologically
  const sorted = [...readings].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );

  const temps = sorted.map((r) => Number(r.temperatureC));
  const minTemp = Math.min(tempMinC - 2, Math.min(...temps));
  const maxTemp = Math.max(tempMaxC + 2, Math.max(...temps));
  const range = maxTemp - minTemp || 1;

  // Chart layout geometry
  const width = 800;
  const paddingLeft = 50;
  const paddingRight = 30;
  const paddingTop = 30;
  const paddingBottom = 40;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  const getX = (index: number) => {
    if (sorted.length === 1) return paddingLeft + plotWidth / 2;
    return paddingLeft + (index / (sorted.length - 1)) * plotWidth;
  };

  const getY = (val: number) => {
    return paddingTop + plotHeight - ((val - minTemp) / range) * plotHeight;
  };

  // Safe zone bounds
  const safeZoneTop = getY(tempMaxC);
  const safeZoneBottom = getY(tempMinC);
  const safeZoneHeight = Math.max(0, safeZoneBottom - safeZoneTop);

  // Generate SVG path for line and area
  const points = sorted.map((r, i) => ({
    x: getX(i),
    y: getY(Number(r.temperatureC)),
    reading: r,
  }));

  const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${paddingTop + plotHeight} L ${points[0].x} ${
    paddingTop + plotHeight
  } Z`;

  return (
    <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
      {/* Chart Legend */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '0.8rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary-cyan)' }}>
            <span style={{ width: '12px', height: '3px', background: '#06b6d4', borderRadius: '2px' }} />
            Temperature Profile (°C)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981' }}>
            <span
              style={{
                width: '12px',
                height: '8px',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px dashed #10b981',
                borderRadius: '2px',
              }}
            />
            Target Safe Band ({tempMinC}°C to {tempMaxC}°C)
          </span>
        </div>
        <div style={{ color: 'var(--text-muted)' }}>
          Showing {sorted.length} time-series sample{sorted.length > 1 ? 's' : ''} (UTC)
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
      >
        <defs>
          {/* Gradient for area fill */}
          <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Safe Operating Temperature Zone */}
        <rect
          x={paddingLeft}
          y={safeZoneTop}
          width={plotWidth}
          height={safeZoneHeight}
          fill="rgba(16, 185, 129, 0.08)"
          stroke="rgba(16, 185, 129, 0.3)"
          strokeDasharray="4 4"
        />

        {/* Max Threshold Reference Line */}
        <line
          x1={paddingLeft}
          y1={safeZoneTop}
          x2={paddingLeft + plotWidth}
          y2={safeZoneTop}
          stroke="#10b981"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <text
          x={paddingLeft + plotWidth - 4}
          y={safeZoneTop - 6}
          textAnchor="end"
          fill="#34d399"
          fontSize="10"
          fontFamily="var(--font-mono)"
          fontWeight="bold"
        >
          MAX: {tempMaxC.toFixed(1)}°C
        </text>

        {/* Min Threshold Reference Line */}
        <line
          x1={paddingLeft}
          y1={safeZoneBottom}
          x2={paddingLeft + plotWidth}
          y2={safeZoneBottom}
          stroke="#10b981"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <text
          x={paddingLeft + plotWidth - 4}
          y={safeZoneBottom + 14}
          textAnchor="end"
          fill="#34d399"
          fontSize="10"
          fontFamily="var(--font-mono)"
          fontWeight="bold"
        >
          MIN: {tempMinC.toFixed(1)}°C
        </text>

        {/* Grid lines and Y-axis labels */}
        {[minTemp, (minTemp + maxTemp) / 2, maxTemp].map((t, idx) => {
          const y = getY(t);
          return (
            <g key={idx}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={paddingLeft + plotWidth}
                y2={y}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 8}
                y={y + 4}
                textAnchor="end"
                fill="var(--text-muted)"
                fontSize="11"
                fontFamily="var(--font-mono)"
              >
                {t.toFixed(1)}°
              </text>
            </g>
          );
        })}

        {/* Temperature Area & Line */}
        <path d={areaD} fill="url(#tempGradient)" />
        <path d={pathD} fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" />

        {/* Data points */}
        {points.map((p, idx) => {
          const tempVal = Number(p.reading.temperatureC);
          const isExcursion = tempVal < tempMinC || tempVal > tempMaxC;

          return (
            <g
              key={idx}
              onMouseEnter={() => {
                setHoveredPoint(p.reading);
                setHoverPos({ x: p.x, y: p.y });
              }}
              onMouseLeave={() => {
                setHoveredPoint(null);
                setHoverPos(null);
              }}
              style={{ cursor: 'pointer' }}
            >
              {/* Outer ring for excursion points */}
              {isExcursion && (
                <circle cx={p.x} cy={p.y} r="8" fill="none" stroke="#f43f5e" strokeWidth="2" opacity="0.8" />
              )}
              <circle
                cx={p.x}
                cy={p.y}
                r={hoveredPoint?.id === p.reading.id ? '6' : '4'}
                fill={isExcursion ? '#f43f5e' : '#06b6d4'}
                stroke="#0a0e17"
                strokeWidth="2"
              />
            </g>
          );
        })}

        {/* X-axis date labels */}
        {sorted.length > 0 && (
          <>
            <text
              x={paddingLeft}
              y={height - 12}
              fill="var(--text-muted)"
              fontSize="10"
              fontFamily="var(--font-mono)"
            >
              {new Date(sorted[0].recordedAt).toISOString().slice(5, 16).replace('T', ' ')}
            </text>
            {sorted.length > 1 && (
              <text
                x={paddingLeft + plotWidth}
                y={height - 12}
                textAnchor="end"
                fill="var(--text-muted)"
                fontSize="10"
                fontFamily="var(--font-mono)"
              >
                {new Date(sorted[sorted.length - 1].recordedAt).toISOString().slice(5, 16).replace('T', ' ')}
              </text>
            )}
          </>
        )}
      </svg>

      {/* Floating Hover Tooltip */}
      {hoveredPoint && hoverPos && (
        <div
          style={{
            position: 'absolute',
            top: `${Math.max(10, hoverPos.y - 120)}px`,
            left: `${Math.min(hoverPos.x + 10, 580)}px`,
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid var(--primary-cyan)',
            padding: '12px 16px',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
            pointerEvents: 'none',
            zIndex: 30,
            minWidth: '200px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} /> {new Date(hoveredPoint.recordedAt).toISOString().replace('T', ' ').slice(0, 19)} UTC
            </span>
            {hoveredPoint.isSimulated && (
              <span className="badge badge-cyan" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                Simulated
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
            <Thermometer size={18} color={Number(hoveredPoint.temperatureC) > tempMaxC || Number(hoveredPoint.temperatureC) < tempMinC ? '#f43f5e' : '#06b6d4'} />
            {Number(hoveredPoint.temperatureC).toFixed(2)}°C
            {(Number(hoveredPoint.temperatureC) > tempMaxC || Number(hoveredPoint.temperatureC) < tempMinC) && (
              <span style={{ color: '#f43f5e', fontSize: '0.75rem', fontWeight: 600 }}>Excursion!</span>
            )}
          </div>
          {hoveredPoint.humidityPercent !== null && hoveredPoint.humidityPercent !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              <Droplets size={14} color="#3b82f6" />
              Humidity: {Number(hoveredPoint.humidityPercent).toFixed(1)}%
            </div>
          )}
          {hoveredPoint.latitude && hoveredPoint.longitude && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
              GPS: {Number(hoveredPoint.latitude).toFixed(4)}, {Number(hoveredPoint.longitude).toFixed(4)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
