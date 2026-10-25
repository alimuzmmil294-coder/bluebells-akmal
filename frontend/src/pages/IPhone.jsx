import React, { useState, useMemo } from 'react';
import { ArrowUpDown, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import ProductGrid from '../components/ProductGrid';
import SearchBar from '../components/SearchBar';
import Breadcrumbs from '../components/Breadcrumbs';
import Pagination from '../components/Pagination';

export default function IPhone() {
  const { products, productsLoading } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStorage, setSelectedStorage] = useState('All');
  const [sortBy, setSortBy] = useState('featured');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const iphoneProducts = useMemo(() => {
    return products.filter((p) => p.brand === 'Apple' || p.category === 'iphone');
  }, [products]);

  const filteredIPhones = useMemo(() => {
    return iphoneProducts
      .filter((p) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          if (!p.name.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) {
            return false;
          }
        }
        if (selectedStorage !== 'All') {
          if (!p.storageOptions || !p.storageOptions.includes(selectedStorage)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
        return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
      });
  }, [iphoneProducts, searchQuery, selectedStorage, sortBy]);

  const totalPages = Math.ceil(filteredIPhones.length / itemsPerPage) || 1;
  const paginatedIPhones = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredIPhones.slice(start, start + itemsPerPage);
  }, [filteredIPhones, currentPage, itemsPerPage]);

  const storages = ['All', '128GB', '256GB', '512GB', '1TB'];

  return (
    <div style={{ backgroundColor: 'var(--bg-secondary)', minHeight: '80vh', paddingBottom: '80px' }}>
      <div className="container">
        <Breadcrumbs items={[{ label: 'Apple iPhone Collection', path: '/iphone' }]} />

        {/* Premium iPhone Collection Banner */}
        <div
          style={{
            backgroundColor: '#171717',
            color: '#FFFFFF',
            borderRadius: 'var(--radius-xl)',
            padding: '50px 40px',
            marginBottom: '40px',
            position: 'relative',
            overflow: 'hidden',
            display: 'grid',
            gridTemplateColumns: '1.2fr 0.8fr',
            gap: '32px',
            alignItems: 'center'
          }}
          className="iphone-banner-grid"
        >
          <div style={{ position: 'relative', zIndex: 2 }}>
            <span className="badge badge-yellow" style={{ marginBottom: '12px' }}>
              Official Apple Collection
            </span>
            <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, lineHeight: 1.15, marginBottom: '16px' }}>
              Apple iPhone Lineup
            </h1>
            <p style={{ color: '#D1D5DB', fontSize: '1.05rem', lineHeight: 1.6, maxWidth: '520px', marginBottom: '24px' }}>
              Experience aerospace-grade titanium, the groundbreaking A18 Pro chip, and intelligent 48MP Pro camera systems. Sealed in original Apple packaging with 1-Year International &amp; Local Warranty.
            </p>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#60A5FA', fontWeight: 600 }}>
                <ShieldCheck size={18} />
                <span>PTA Approved Tax Paid</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#60A5FA', fontWeight: 600 }}>
                <Zap size={18} />
                <span>Physical Dual SIM &amp; eSIM Ready</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <img
              src="https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=900&auto=format&fit=crop"
              alt="iPhone 16 Pro Max"
              style={{ maxHeight: '280px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.5))' }}
            />
          </div>
        </div>

        {/* Filter and Control Bar */}
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
          {/* Storage Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Storage:</span>
            {storages.map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStorage(st)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: selectedStorage === st ? '1px solid var(--primary-blue)' : '1px solid var(--border-color)',
                  backgroundColor: selectedStorage === st ? 'var(--primary-blue)' : '#FFFFFF',
                  color: selectedStorage === st ? '#FFFFFF' : 'var(--text-primary)',
                  boxShadow: selectedStorage === st ? 'var(--shadow-blue)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Search & Sort */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 300px', justifyContent: 'flex-end' }}>
            <div style={{ maxWidth: '240px', width: '100%' }}>
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search iPhone models..."
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
          products={paginatedIPhones}
          loading={productsLoading}
          emptyMessage="No Apple iPhone models match your selected storage or query. Try clearing your filters."
        />

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => {
            setCurrentPage(page);
            window.scrollTo({ top: 380, behavior: 'smooth' });
          }}
          totalItems={filteredIPhones.length}
          itemsPerPage={itemsPerPage}
          itemLabel="iPhone models"
        />
      </div>

      <style>{`
        @media (max-width: 860px) {
          .iphone-banner-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
