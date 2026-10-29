import React from 'react';
import ProductCard from './ProductCard';
import { PackageOpen } from 'lucide-react';

export default function ProductGrid({
  products,
  loading = false,
  emptyMessage = "No smartphones or accessories found matching your criteria."
}) {
  if (loading) {
    return (
      <div className="product-grid" aria-busy="true" aria-label="Loading products">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
          <div key={n} className="product-card-skeleton">
            <div className="skeleton-image-wrap">
              <div className="skeleton-image skeleton-shimmer" />
            </div>
            <div className="skeleton-body">
              <div className="skeleton-brand skeleton-shimmer" />
              <div className="skeleton-title skeleton-shimmer" />
              <div className="skeleton-rating skeleton-shimmer" />
              <div className="skeleton-footer">
                <div className="skeleton-price skeleton-shimmer" />
                <div className="skeleton-button skeleton-shimmer" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div
        style={{
          padding: '64px 24px',
          textAlign: 'center',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px dashed var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px'
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <PackageOpen size={32} color="#9CA3AF" />
        </div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>No Products Found</h3>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', fontSize: '0.95rem' }}>
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
