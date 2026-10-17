import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Thermometer, Droplets, Clock, ArrowLeft, Boxes, ArrowRight } from 'lucide-react';
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
    return <LoadingSpinner message="Loading product dossier..." />;
  }

  if (!product) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <p style={{ color: 'var(--text-muted)' }}>Product not found.</p>
        <Link to="/products" style={{ color: 'var(--primary-cyan)', marginTop: '12px', display: 'inline-block' }}>
          Back to products
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
          }}
        >
          <ArrowLeft size={16} /> Back to Product Catalog
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="mono" style={{ fontSize: '0.9rem', color: 'var(--primary-cyan)', fontWeight: 700 }}>
            {product.sku}
          </span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>{product.name}</h1>
        </div>
      </div>

      {/* Main product card */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '16px' }}>
          Cold-Chain SLA Specification
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '24px', maxWidth: '800px' }}>
          {product.description || 'No specific handling remarks documented.'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '16px', borderRadius: '12px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Thermometer size={14} color="#10b981" /> Permitted Temperature
            </span>
            <p className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
              {Number(product.tempMinC).toFixed(1)}°C — {Number(product.tempMaxC).toFixed(1)}°C
            </p>
          </div>

          <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '16px', borderRadius: '12px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Droplets size={14} color="#3b82f6" /> Humidity Range
            </span>
            <p className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#60a5fa', marginTop: '4px' }}>
              {product.humidityMin ? `${Number(product.humidityMin)}% - ${Number(product.humidityMax)}%` : 'Any'}
            </p>
          </div>

          <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '16px', borderRadius: '12px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} /> Transit SLA Limit
            </span>
            <p className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
              {product.maxTransitHours ? `${product.maxTransitHours} Hours` : 'Unbounded'}
            </p>
          </div>

          <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '16px', borderRadius: '12px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registered Manufacturer</span>
            <p style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginTop: '4px' }}>
              {product.organization?.name}
            </p>
          </div>
        </div>
      </div>

      {/* Associated Batches */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <Boxes size={22} color="var(--primary-cyan)" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>
            Associated Traceability Batches
          </h3>
        </div>

        {product.batches && product.batches.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {product.batches.map((batch: any) => (
              <div
                key={batch.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                }}
              >
                <div>
                  <Link
                    to={`/batches/${batch.id}`}
                    style={{ fontWeight: 700, color: '#ffffff', textDecoration: 'none', fontSize: '1rem' }}
                  >
                    {batch.batchNumber}
                  </Link>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Manufactured: {new Date(batch.manufactureDate).toISOString().slice(0, 10)} | Quantity: {batch.quantity} units
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <StatusBadge status={batch.status} type="batch" />
                  <Link
                    to={`/batches/${batch.id}`}
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
                    Inspect <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>
            No batches created for this SKU yet.
          </p>
        )}
      </div>
    </div>
  );
}
