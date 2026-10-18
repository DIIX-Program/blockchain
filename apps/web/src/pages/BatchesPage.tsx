import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  ArrowRight, 
  X, 
  Boxes, 
  Filter, 
  LayoutGrid, 
  Table as TableIcon,
  CheckCircle2,
  Truck,
  AlertTriangle,
  QrCode
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';

export function BatchesPage() {
  const { hasRole } = useAuth();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
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
    if (initialSearch) {
      setSearch(initialSearch);
      fetchBatches();
    }
  }, [initialSearch]);

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

  const inTransitCount = batches.filter((b) => b.status === 'IN_TRANSIT').length;
  const alertCount = batches.filter((b) => b.status === 'ALERT_FLAGGED' || b.status === 'REJECTED').length;
  const deliveredCount = batches.filter((b) => b.status === 'DELIVERED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cyan-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Traceability Management
            </span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Cold-Chain Batches
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Monitor lifecycle stages, custodial handovers, and cryptographic integrity proof across all clinical and food shipments.
          </p>
        </div>

        {hasRole('ADMIN', 'PRODUCER') && (
          <button
            onClick={() => setModalOpen(true)}
            className="btn btn-primary"
          >
            <Plus size={18} /> Initialize New Batch
          </button>
        )}
      </div>

      {/* Summary KPI Pills */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div 
          onClick={() => setStatusFilter('')}
          style={{ 
            cursor: 'pointer',
            padding: '8px 16px', 
            borderRadius: '10px', 
            background: statusFilter === '' ? 'rgba(6, 182, 212, 0.18)' : 'rgba(15, 23, 42, 0.6)', 
            border: statusFilter === '' ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid var(--border-subtle)',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: statusFilter === '' ? '#ffffff' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Boxes size={14} color="var(--cyan-400)" />
          <span>All ({batches.length})</span>
        </div>

        <div 
          onClick={() => setStatusFilter('IN_TRANSIT')}
          style={{ 
            cursor: 'pointer',
            padding: '8px 16px', 
            borderRadius: '10px', 
            background: statusFilter === 'IN_TRANSIT' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(15, 23, 42, 0.6)', 
            border: statusFilter === 'IN_TRANSIT' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-subtle)',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: statusFilter === 'IN_TRANSIT' ? '#fbbf24' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Truck size={14} color="#fbbf24" />
          <span>In Transit ({inTransitCount})</span>
        </div>

        <div 
          onClick={() => setStatusFilter('DELIVERED')}
          style={{ 
            cursor: 'pointer',
            padding: '8px 16px', 
            borderRadius: '10px', 
            background: statusFilter === 'DELIVERED' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(15, 23, 42, 0.6)', 
            border: statusFilter === 'DELIVERED' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-subtle)',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: statusFilter === 'DELIVERED' ? '#34d399' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CheckCircle2 size={14} color="#34d399" />
          <span>Delivered ({deliveredCount})</span>
        </div>

        {alertCount > 0 && (
          <div 
            onClick={() => setStatusFilter('ALERT_FLAGGED')}
            style={{ 
              cursor: 'pointer',
              padding: '8px 16px', 
              borderRadius: '10px', 
              background: statusFilter === 'ALERT_FLAGGED' ? 'rgba(244, 63, 94, 0.18)' : 'rgba(15, 23, 42, 0.6)', 
              border: statusFilter === 'ALERT_FLAGGED' ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid var(--border-subtle)',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: statusFilter === 'ALERT_FLAGGED' ? '#fb7185' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AlertTriangle size={14} color="#fb7185" />
            <span>Excursion Flagged ({alertCount})</span>
          </div>
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
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px' }}>
          <div className="search-bar-wrapper" style={{ width: '100%', maxWidth: '380px' }}>
            <Search size={16} className="search-bar-icon" />
            <input
              type="text"
              placeholder="Search batch code (e.g. BATCH-VAX)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input search-bar-input"
              style={{ fontSize: '0.85rem' }}
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(''); fetchBatches(); }}
                style={{ position: 'absolute', right: 12, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button type="submit" className="btn btn-secondary btn-sm">
            Search
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Status Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={15} color="var(--text-muted)" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-select"
              style={{ width: 'auto', fontSize: '0.825rem', padding: '7px 12px' }}
            >
              <option value="">All Statuses</option>
              <option value="CREATED">CREATED</option>
              <option value="IN_TRANSIT">IN TRANSIT</option>
              <option value="STORED">STORED</option>
              <option value="DELIVERED">DELIVERED</option>
              <option value="ALERT_FLAGGED">ALERT FLAGGED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="tabs-container">
            <button
              onClick={() => setViewMode('table')}
              className={`tab-btn ${viewMode === 'table' ? 'active' : ''}`}
              style={{ padding: '6px 10px' }}
              title="Table View"
            >
              <TableIcon size={15} />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`tab-btn ${viewMode === 'cards' ? 'active' : ''}`}
              style={{ padding: '6px 10px' }}
              title="Cards Grid View"
            >
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Batches Content */}
      {loading ? (
        <LoadingSpinner message="Querying batch registry & telemetry logs..." />
      ) : batches.length === 0 ? (
        <EmptyState
          title="No batches found"
          description="Try clearing your search query or status filter, or initialize a new batch."
        />
      ) : viewMode === 'table' ? (
        /* Modern Data Table View */
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Batch Number</th>
                <th>Product SKU & Cold Requirement</th>
                <th>Current Custodian</th>
                <th>Units</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr key={batch.id}>
                  <td>
                    <Link
                      to={`/batches/${batch.id}`}
                      style={{ fontWeight: 700, color: '#ffffff', textDecoration: 'none', fontSize: '0.95rem' }}
                    >
                      {batch.batchNumber}
                    </Link>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Mfg: {new Date(batch.manufactureDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="mono badge badge-cyan" style={{ fontSize: '0.72rem', padding: '2px 6px' }}>
                        {batch.product?.sku}
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {batch.product?.name}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Required: <span className="mono" style={{ color: 'var(--cyan-300)' }}>{batch.product?.tempMinC}°C to {batch.product?.tempMaxC}°C</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {batch.currentHolder?.name || 'Unassigned'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {batch.currentHolder?.type?.replace('_', ' ')}
                    </div>
                  </td>
                  <td>
                    <span className="mono" style={{ fontWeight: 700, color: '#ffffff' }}>
                      {batch.quantity?.toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={batch.status} type="batch" />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                      <Link
                        to={`/trace/${batch.batchNumber}`}
                        target="_blank"
                        title="Consumer Public QR Portal"
                        className="btn btn-outline-cyan btn-sm"
                      >
                        <QrCode size={13} /> Public QR
                      </Link>
                      <Link
                        to={`/batches/${batch.id}`}
                        className="btn btn-secondary btn-sm"
                      >
                        Inspect <ArrowRight size={13} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid Cards View */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {batches.map((batch) => (
            <div key={batch.id} className="glass-panel" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <Link
                    to={`/batches/${batch.id}`}
                    style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', textDecoration: 'none' }}
                  >
                    {batch.batchNumber}
                  </Link>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {batch.product?.name}
                  </p>
                </div>
                <StatusBadge status={batch.status} type="batch" />
              </div>

              <div 
                style={{ 
                  background: 'rgba(10, 14, 23, 0.6)', 
                  padding: '12px 14px', 
                  borderRadius: '10px', 
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Required Temp:</span>
                  <span className="mono" style={{ color: 'var(--cyan-300)', fontWeight: 600 }}>
                    {batch.product?.tempMinC}°C to {batch.product?.tempMaxC}°C
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Quantity:</span>
                  <span className="mono" style={{ color: '#ffffff', fontWeight: 600 }}>
                    {batch.quantity?.toLocaleString()} units
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Custodian:</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    {batch.currentHolder?.name || 'Unassigned'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Link
                  to={`/trace/${batch.batchNumber}`}
                  target="_blank"
                  className="btn btn-outline-cyan btn-sm"
                >
                  <QrCode size={13} /> QR Seal
                </Link>
                <Link
                  to={`/batches/${batch.id}`}
                  className="btn btn-primary btn-sm"
                >
                  View Details <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Initialize New Batch */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Boxes size={20} color="var(--cyan-400)" />
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                  Initialize Traceability Batch
                </h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="btn-icon"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div style={{ margin: '16px 26px 0 26px', background: 'var(--status-alert-bg)', border: '1px solid var(--status-alert-border)', color: '#fb7185', padding: '12px 16px', borderRadius: '10px', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateBatch}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">
                    Unique Batch Identifier *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BATCH-VAX-2026-003"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="form-input"
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Standard cold-chain GTIN/lot serialization syntax
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Product Catalog Specification *
                  </label>
                  <select
                    required
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="form-select"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.name} ({p.tempMinC}°C to {p.tempMaxC}°C)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Initial Lot Quantity (Units) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="form-input mono"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">
                      Manufacture Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={manufactureDate}
                      onChange={(e) => setManufactureDate(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Expiry Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
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
