import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Plus, Thermometer, Droplets, Clock, ArrowRight, X } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';

export function ProductsPage() {
  const { hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
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
      // Reset form
      setSku('');
      setName('');
      setDescription('');
      fetchProducts();
    } catch (err: any) {
      setError(err?.message || 'Failed to create product');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>
            Product Catalog & SLA Profiles
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Configure and maintain temperature-controlled pharmaceutical and perishable product thresholds
          </p>
        </div>

        {hasRole('ADMIN', 'PRODUCER') && (
          <button
            onClick={() => setModalOpen(true)}
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
              boxShadow: '0 4px 15px rgba(6, 182, 212, 0.4)',
            }}
          >
            <Plus size={18} /> Register Product
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner message="Loading registered product profiles..." />
      ) : products.length === 0 ? (
        <EmptyState
          title="No products registered yet"
          description="Create your first cold-chain product profile to establish threshold rules."
          action={
            hasRole('ADMIN', 'PRODUCER') ? (
              <button
                onClick={() => setModalOpen(true)}
                className="badge badge-cyan"
                style={{ padding: '8px 16px', cursor: 'pointer', border: 'none' }}
              >
                Register Product Now
              </button>
            ) : null
          }
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
          {products.map((prod) => (
            <div key={prod.id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--primary-cyan)', fontWeight: 600 }}>
                    {prod.sku}
                  </span>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
                    {prod.name}
                  </h3>
                </div>
                <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '8px', borderRadius: '8px' }}>
                  <Package size={20} color="var(--primary-cyan)" />
                </div>
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '20px', flex: 1 }}>
                {prod.description || 'No description provided.'}
              </p>

              {/* Threshold specifications grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  padding: '14px',
                  borderRadius: '10px',
                  marginBottom: '20px',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Thermometer size={12} color="#10b981" /> Safe Temp Zone
                  </span>
                  <p className="mono" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#34d399', marginTop: '2px' }}>
                    {Number(prod.tempMinC).toFixed(1)}°C to {Number(prod.tempMaxC).toFixed(1)}°C
                  </p>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Droplets size={12} color="#3b82f6" /> Humidity Range
                  </span>
                  <p className="mono" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#60a5fa', marginTop: '2px' }}>
                    {prod.humidityMin ? `${Number(prod.humidityMin)}% - ${Number(prod.humidityMax)}%` : 'Unregulated'}
                  </p>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> Max Transit SLA
                  </span>
                  <p className="mono" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {prod.maxTransitHours ? `${prod.maxTransitHours} Hours` : 'Standard'}
                  </p>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Batches</span>
                  <p className="mono" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {prod._count?.batches || 0} Batches
                  </p>
                </div>
              </div>

              {/* Footer action */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Org: {prod.organization?.name}
                </span>
                <Link
                  to={`/products/${prod.id}`}
                  style={{
                    color: 'var(--primary-cyan)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  View Batches <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Product */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '32px',
              background: '#0f172a',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
                Register New Cold-Chain Product
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#fb7185', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Product SKU *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PROD-VAX-MRNA-02"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', color: '#ffffff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VaxGuard mRNA Vaccine (0.5ml Single Dose)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', color: '#ffffff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Min Permitted Temp (°C) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={tempMinC}
                    onChange={(e) => setTempMinC(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', color: '#ffffff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Max Permitted Temp (°C) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={tempMaxC}
                    onChange={(e) => setTempMaxC(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', color: '#ffffff' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Min Humidity (%)
                  </label>
                  <input
                    type="number"
                    value={humidityMin}
                    onChange={(e) => setHumidityMin(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', color: '#ffffff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Max Humidity (%)
                  </label>
                  <input
                    type="number"
                    value={humidityMax}
                    onChange={(e) => setHumidityMax(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', color: '#ffffff' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Transit SLA Limit (Hours)
                </label>
                <input
                  type="number"
                  value={maxTransitHours}
                  onChange={(e) => setMaxTransitHours(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', color: '#ffffff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Description / Storage Handling Notes
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Keep protected from direct light; active refrigeration required."
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', color: '#ffffff' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ padding: '10px 16px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 20px', borderRadius: '8px', background: 'linear-gradient(135deg, #06b6d4, #0284c7)', border: 'none', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
