import React, { useState, useMemo } from 'react';
import { Sparkles, ShieldCheck, Cpu } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import ProductGrid from '../components/ProductGrid';
import SearchBar from '../components/SearchBar';
import Breadcrumbs from '../components/Breadcrumbs';
import Pagination from '../components/Pagination';

export default function Samsung() {
  const { products, productsLoading } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeries, setSelectedSeries] = useState('All');
  const [sortBy, setSortBy] = useState('featured');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const samsungProducts = useMemo(() => {
    return products.filter((p) => p.brand === 'Samsung' || p.category === 'samsung');
  }, [products]);

  const filteredSamsung = useMemo(() => {
    return samsungProducts
      .filter((p) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          if (!p.name.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) {
            return false;
          }
        }
        if (selectedSeries === 'S Series') {
          return p.name.includes('S24') || p.name.includes('S23');
        }
        if (selectedSeries === 'Z Fold') {
          return p.name.includes('Fold') || p.name.includes('Flip');
        }
        if (selectedSeries === 'A Series') {
          return p.name.includes('A55') || p.name.includes('A35') || p.name.includes('A15');
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
        return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
      });
  }, [samsungProducts, searchQuery, selectedSeries, sortBy]);

  const totalPages = Math.ceil(filteredSamsung.length / itemsPerPage) || 1;
  const paginatedSamsung = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSamsung.slice(start, start + itemsPerPage);
  }, [filteredSamsung, currentPage, itemsPerPage]);

  const seriesOptions = ['All', 'S Series', 'Z Fold', 'A Series'];

  return (
    <div style={{ backgroundColor: 'var(--bg-secondary)', minHeight: '80vh', paddingBottom: '80px' }}>
      <div className="container">
        <Breadcrumbs items={[{ label: 'Samsung Galaxy Collection', path: '/samsung' }]} />

        {/* Samsung Promotional Banner */}
        <div
          style={{
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            borderRadius: 'var(--radius-xl)',
            padding: '50px 40px',
            marginBottom: '40px',
            position: 'relative',
            overflow: 'hidden',
            display: 'grid',
            gridTemplateColumns: '1.2fr 0.8fr',
            gap: '32px',
            alignItems: 'center',
            border: '2px solid var(--primary-blue)'
          }}
          className="samsung-banner-grid"
        >
          <div style={{ position: 'relative', zIndex: 2 }}>
            <span className="badge badge-yellow" style={{ marginBottom: '12px' }}>
              Galaxy AI is Here
            </span>
            <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, lineHeight: 1.15, marginBottom: '16px' }}>
              Samsung Galaxy Series
            </h1>
            <p style={{ color: '#E2E8F0', fontSize: '1.05rem', lineHeight: 1.6, maxWidth: '520px', marginBottom: '24px' }}>
              Unleash unprecedented intelligence with Galaxy AI, titanium craftsmanship, embedded S Pen precision, and jaw-dropping Nightography zoom cameras. Official Samsung Pakistan warranty with PTA clearance.
            </p>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#60A5FA', fontWeight: 600 }}>
                <Cpu size={18} />
                <span>Snapdragon 8 Gen 3 for Galaxy</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#60A5FA', fontWeight: 600 }}>
                <ShieldCheck size={18} />
                <span>Official PTA Approved</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <img
              src="https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?q=80&w=900&auto=format&fit=crop"
              alt="Samsung Galaxy S24 Ultra"
              style={{ maxHeight: '280px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.5))' }}
            />
          </div>
        </div>

        {/* Filters and Controls */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            padding: '20px 24px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          {/* Series Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Series:</span>
            {seriesOptions.map((series) => (
              <button
                key={series}
                onClick={() => setSelectedSeries(series)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: selectedSeries === series ? '1px solid var(--primary-blue)' : '1px solid var(--border-color)',
                  backgroundColor: selectedSeries === series ? 'var(--primary-blue)' : '#FFFFFF',
                  color: selectedSeries === series ? '#FFFFFF' : 'var(--text-primary)',
                  boxShadow: selectedSeries === series ? 'var(--shadow-blue)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {series}
              </button>
            ))}
          </div>

          {/* Search & Sort */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 300px', justifyContent: 'flex-end' }}>
            <div style={{ maxWidth: '240px', width: '100%' }}>
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search Galaxy devices..."
                onClear={() => setSearchQuery('')}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="featured">Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <ProductGrid
          products={paginatedSamsung}
          loading={productsLoading}
          emptyMessage="No Samsung Galaxy devices match your search or filter. Try clearing filters."
        />

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => {
            setCurrentPage(page);
            window.scrollTo({ top: 380, behavior: 'smooth' });
          }}
          totalItems={filteredSamsung.length}
          itemsPerPage={itemsPerPage}
          itemLabel="Samsung devices"
        />
      </div>

      <style>{`
        @media (max-width: 860px) {
          .samsung-banner-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
