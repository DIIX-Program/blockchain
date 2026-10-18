import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, 
  Plus, 
  Thermometer, 
  Droplets, 
  Clock, 
  ArrowRight, 
  X, 
  Search,
  Building
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';

export function ProductsPage() {
  const { hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New product form
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tempMinC, setTempMinC] = useState('2.0');
  const [tempMaxC, setTempMaxC] = useState('8.0');
  const [humidityMin, setHumidityMin] = useState('30');
  const [humidityMax, setHumidityMax] = useState('65');
  const [maxTransitHours, setMaxTransitHours] = useState('72');

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.getProducts();
      setProducts(res.data || []);
    } catch (err: any) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const min = parseFloat(tempMinC);
    const max = parseFloat(tempMaxC);

    if (min >= max) {
      setError('Minimum temperature must be strictly lower than maximum temperature.');
      return;
    }

    try {
      await api.createProduct({
        sku,
        name,
        description,
        tempMinC: min,
        tempMaxC: max,
        humidityMin: humidityMin ? parseFloat(humidityMin) : null,
        humidityMax: humidityMax ? parseFloat(humidityMax) : null,
        maxTransitHours: maxTransitHours ? parseInt(maxTransitHours, 10) : null,
      });

      setModalOpen(false);
      setSku('');
      setName('');
      setDescription('');
      fetchProducts();
    } catch (err: any) {
      setError(err?.message || 'Failed to create product');
    }
  };

  const getColdClassBadge = (min: number, max: number) => {
    if (min <= -60) {
      return <span className="badge badge-alert">Ultra-Cold (-70°C)</span>;
    }
    if (min <= -15) {
      return <span className="badge badge-indigo">Deep Frozen (-20°C)</span>;
    }
    if (min >= 0 && max <= 10) {
      return <span className="badge badge-cyan">Chilled (2°C — 8°C)</span>;
    }
    return <span className="badge badge-normal">Controlled Ambient (15-25°C)</span>;
  };

  const filteredProducts = products.filter((p) => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cyan-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Temperature Master Data
            </span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Product Catalog & Cold-Chain SLA Profiles
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Configure and enforce strict temperature and humidity tolerance bounds for pharmaceuticals, biologics, and perishables.
          </p>
        </div>

        {hasRole('ADMIN', 'PRODUCER') && (
          <button
            onClick={() => setModalOpen(true)}
            className="btn btn-primary"
          >
            <Plus size={18} /> Register Product
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div className="search-bar-wrapper" style={{ width: '100%', maxWidth: '380px' }}>
          <Search size={16} className="search-bar-icon" />
          <input
            type="text"
            placeholder="Search by SKU or product title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input search-bar-input"
            style={{ fontSize: '0.85rem' }}
          />
        </div>
        <span className="mono" style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
          {filteredProducts.length} Product SKUs registered
        </span>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading registered product profiles..." />
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          title="No products match your query"
          description="Try adjusting your search or register a new cold-chain SKU."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
          {filteredProducts.map((prod) => (
            <div key={prod.id} className="glass-panel" style={{ padding: '26px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div>
                  <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--cyan-400)', fontWeight: 700 }}>
                    {prod.sku}
                  </span>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginTop: '2px', lineHeight: 1.2 }}>
                    {prod.name}
                  </h2>
                </div>
                {getColdClassBadge(Number(prod.tempMinC), Number(prod.tempMaxC))}
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '20px', flex: 1 }}>
                {prod.description || 'Clinical-grade formulation with automated temperature monitoring requirements.'}
              </p>

              {/* Specification Cards */}
              <div 
                style={{ 
                  background: 'rgba(10, 14, 23, 0.6)', 
                  padding: '14px 16px', 
                  borderRadius: '12px', 
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  marginBottom: '20px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Thermometer size={14} color="#10b981" /> Safe Band:
                  </span>
                  <span className="mono" style={{ color: '#34d399', fontWeight: 700 }}>
                    {Number(prod.tempMinC).toFixed(1)}°C — {Number(prod.tempMaxC).toFixed(1)}°C
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Droplets size={14} color="#38bdf8" /> Humidity SLA:
                  </span>
                  <span className="mono" style={{ color: '#818cf8', fontWeight: 600 }}>
                    {prod.humidityMin ? `${Number(prod.humidityMin)}% - ${Number(prod.humidityMax)}%` : 'Unconstrained'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} color="var(--text-muted)" /> Transit SLA:
                  </span>
                  <span className="mono" style={{ color: '#ffffff', fontWeight: 600 }}>
                    {prod.maxTransitHours ? `${prod.maxTransitHours} Hours` : 'No Max'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building size={14} color="var(--text-muted)" /> Producer:
                  </span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    {prod.organization?.name || 'VaxLab Biotech'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                  {prod.batches?.length || 0} Batches Registered
                </span>
                <Link
                  to={`/products/${prod.id}`}
                  className="btn btn-secondary btn-sm"
                >
                  Inspect Profile <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Register Product */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Package size={20} color="var(--cyan-400)" />
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                  Register Product SKU & Threshold
                </h2>
              </div>
              <button onClick={() => setModalOpen(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            {error && (
              <div style={{ margin: '16px 26px 0 26px', background: 'var(--status-alert-bg)', border: '1px solid var(--status-alert-border)', color: '#fb7185', padding: '12px 16px', borderRadius: '10px', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateProduct}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Product SKU *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SKU-INSULIN-01"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      className="form-input mono"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Full Product Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Human Insulin Biosimilar"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Clinical Description & Handling Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Storage specifications, light sensitivity, and pharmaceutical compliance requirements."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="form-textarea"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Min Temp (°C) *</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={tempMinC}
                      onChange={(e) => setTempMinC(e.target.value)}
                      className="form-input mono"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Max Temp (°C) *</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={tempMaxC}
                      onChange={(e) => setTempMaxC(e.target.value)}
                      className="form-input mono"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Min Humidity (%)</label>
                    <input
                      type="number"
                      value={humidityMin}
                      onChange={(e) => setHumidityMin(e.target.value)}
                      className="form-input mono"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Max Humidity (%)</label>
                    <input
                      type="number"
                      value={humidityMax}
                      onChange={(e) => setHumidityMax(e.target.value)}
                      className="form-input mono"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Max Transit Duration (Hours)</label>
                  <input
                    type="number"
                    value={maxTransitHours}
                    onChange={(e) => setMaxTransitHours(e.target.value)}
                    className="form-input mono"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Product Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
