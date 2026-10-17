import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, ExternalLink, ArrowRight, X } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';

export function BatchesPage() {
  const { hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New batch form
  const [batchNumber, setBatchNumber] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1000');
  const [manufactureDate, setManufactureDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10)
  );

  const fetchBatches = async () => {
    try {
      setLoading(true);
      let query = '?limit=50';
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (statusFilter) query += `&status=${statusFilter}`;

      const res = await api.getBatches(query);
      setBatches(res.data || []);
    } catch (err) {
      console.error('Failed to load batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [statusFilter]);

  useEffect(() => {
    // Load products for creation modal dropdown
    api.getProducts().then((res) => {
      setProducts(res.data || []);
      if (res.data && res.data.length > 0) {
        setProductId(res.data[0].id);
      }
    });
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBatches();
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await api.createBatch({
        batchNumber,
        productId,
        quantity: parseInt(quantity, 10),
        manufactureDate: new Date(manufactureDate).toISOString(),
        expiryDate: new Date(expiryDate).toISOString(),
      });

      setModalOpen(false);
      setBatchNumber('');
      fetchBatches();
    } catch (err: any) {
      setError(err?.message || 'Failed to create batch');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>
            Traceability Batches
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Trace temperature compliance, custody handovers, and cryptographic proofs across all active lots
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
            <Plus size={18} /> Initialize New Batch
          </button>
        )}
      </div>

      {/* Filters & Search Toolbar */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search batch identifier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                color: '#ffffff',
                fontSize: '0.875rem',
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Search
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              background: '#0f172a',
              border: '1px solid var(--border-subtle)',
              color: '#ffffff',
              fontSize: '0.85rem',
            }}
          >
            <option value="">All Statuses</option>
            <option value="CREATED">CREATED</option>
            <option value="IN_TRANSIT">IN TRANSIT</option>
            <option value="STORED">STORED</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
      </div>

      {/* Batches Table */}
      {loading ? (
        <LoadingSpinner message="Querying batch registry & telemetry logs..." />
      ) : batches.length === 0 ? (
        <EmptyState
          title="No batches found"
          description="Try clearing your search or status filter, or initialize a new batch."
        />
      ) : (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(0, 0, 0, 0.2)' }}>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Batch Number</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Product SKU</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Current Custodian</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Units</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr
                  key={batch.id}
                  style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.2s ease' }}
                  className="table-row-hover"
                >
                  <td style={{ padding: '16px 20px' }}>
                    <Link
                      to={`/batches/${batch.id}`}
                      style={{ fontWeight: 700, color: '#ffffff', textDecoration: 'none' }}
                    >
                      {batch.batchNumber}
                    </Link>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span className="mono" style={{ color: 'var(--primary-cyan)', fontSize: '0.85rem' }}>
                      {batch.product?.sku}
                    </span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{batch.product?.name}</div>
                  </td>
                  <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                    {batch.currentHolder?.name}
                  </td>
                  <td style={{ padding: '16px 20px', fontFamily: 'var(--font-mono)' }}>
                    {batch.quantity}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <StatusBadge status={batch.status} type="batch" />
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
                      <Link
                        to={`/trace/${batch.batchNumber}`}
                        target="_blank"
                        title="Consumer Public QR Portal"
                        style={{ color: 'var(--primary-cyan)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', textDecoration: 'none' }}
                      >
                        <ExternalLink size={14} /> Public Portal
                      </Link>
                      <Link
                        to={`/batches/${batch.id}`}
                        style={{
                          color: '#ffffff',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        Inspect <ArrowRight size={14} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Create Batch */}
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
              maxWidth: '520px',
              padding: '32px',
              background: '#0f172a',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
                Initialize New Traceability Batch
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

            <form onSubmit={handleCreateBatch} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Unique Batch Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BATCH-VAX-2026-003"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', color: '#ffffff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Product Catalog Specification *
                </label>
                <select
                  required
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#0f172a', border: '1px solid var(--border-subtle)', color: '#ffffff' }}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.name} ({p.tempMinC}°C to {p.tempMaxC}°C)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Initial Production Quantity (Units) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', color: '#ffffff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Manufacture Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={manufactureDate}
                    onChange={(e) => setManufactureDate(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', color: '#ffffff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', color: '#ffffff' }}
                  />
                </div>
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
                  Initialize Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
