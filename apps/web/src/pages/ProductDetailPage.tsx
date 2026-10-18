import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Thermometer, 
  Droplets, 
  Clock, 
  ArrowLeft, 
  Boxes, 
  ArrowRight,
  Building,
  QrCode
} from 'lucide-react';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<any | null>(null);

  useEffect(() => {
    async function loadProduct() {
      if (!id) return;
      try {
        setLoading(true);
        const res = await api.getProduct(id);
        setProduct(res.product);
      } catch (err) {
        console.error('Failed to load product details:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Loading product dossier & SLA parameters..." />;
  }

  if (!product) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <p style={{ color: 'var(--text-muted)' }}>Product record not found.</p>
        <Link to="/products" className="btn btn-primary" style={{ marginTop: '16px' }}>
          Back to Products
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Breadcrumb / Back button */}
      <div>
        <Link
          to="/products"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: '0.85rem',
            marginBottom: '16px',
            transition: 'color 0.15s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <ArrowLeft size={16} /> Back to Product Catalog
        </Link>

        <div 
          className="glass-panel" 
          style={{ 
            padding: '28px 32px',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(7, 10, 18, 0.95) 100%)',
            border: '1px solid var(--border-medium)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '20px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span className="mono badge badge-cyan" style={{ fontSize: '0.8rem', padding: '3px 8px' }}>
                {product.sku}
              </span>
              <span className="badge badge-normal">Active Catalog SKU</span>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {product.name}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '6px', maxWidth: '780px' }}>
              {product.description || 'Clinical-grade pharmaceutical product with continuous IoT surveillance requirements.'}
            </p>
          </div>

          <Link
            to={`/batches?search=${encodeURIComponent(product.sku)}`}
            className="btn btn-primary"
          >
            <Boxes size={16} /> View Batches ({product.batches?.length || 0})
          </Link>
        </div>
      </div>

      {/* Main SLA Specification Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Thermometer size={14} color="#10b981" /> Permitted Temperature
          </span>
          <p className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399', marginTop: '6px' }}>
            {Number(product.tempMinC).toFixed(1)}°C — {Number(product.tempMaxC).toFixed(1)}°C
          </p>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            Mandatory storage corridor
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Droplets size={14} color="#38bdf8" /> Humidity SLA
          </span>
          <p className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#818cf8', marginTop: '6px' }}>
            {product.humidityMin ? `${Number(product.humidityMin)}% - ${Number(product.humidityMax)}%` : 'Any'}
          </p>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            Relative atmospheric humidity
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} color="#fbbf24" /> Transit Duration SLA
          </span>
          <p className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginTop: '6px' }}>
            {product.maxTransitHours ? `${product.maxTransitHours} Hours` : 'Unbounded'}
          </p>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            Maximum allowable transit window
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building size={14} color="var(--cyan-400)" /> Certified Manufacturer
          </span>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {product.organization?.name || 'VaxLab Biotech Corp'}
          </p>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            Code: {product.organization?.code || 'ORG-01'}
          </span>
        </div>
      </div>

      {/* Associated Batches Table */}
      <div className="table-wrapper">
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Boxes size={18} color="var(--cyan-400)" />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
              Active Batches Produced Under This Specification
            </h2>
          </div>
          <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {product.batches?.length || 0} Batches
          </span>
        </div>

        {product.batches && product.batches.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Batch Number</th>
                <th>Quantity</th>
                <th>Manufacture Date</th>
                <th>Expiration Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {product.batches.map((batch: any) => (
                <tr key={batch.id}>
                  <td>
                    <Link
                      to={`/batches/${batch.id}`}
                      style={{ fontWeight: 700, color: '#ffffff', textDecoration: 'none' }}
                    >
                      {batch.batchNumber}
                    </Link>
                  </td>
                  <td className="mono" style={{ fontWeight: 600 }}>
                    {batch.quantity?.toLocaleString()} units
                  </td>
                  <td className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {new Date(batch.manufactureDate).toLocaleDateString()}
                  </td>
                  <td className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {new Date(batch.expiryDate).toLocaleDateString()}
                  </td>
                  <td>
                    <StatusBadge status={batch.status} type="batch" />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                      <Link
                        to={`/trace/${batch.batchNumber}`}
                        target="_blank"
                        className="btn btn-outline-cyan btn-sm"
                      >
                        <QrCode size={13} /> QR Seal
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
        ) : (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No batches registered under this product SKU yet.
          </div>
        )}
      </div>
    </div>
  );
}
