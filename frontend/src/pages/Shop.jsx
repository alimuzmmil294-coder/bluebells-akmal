import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowUpDown, SlidersHorizontal, PackageX, Sparkles } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CATEGORIES } from '../data/categories';
import ProductGrid from '../components/ProductGrid';
import FilterSidebar from '../components/FilterSidebar';
import SearchBar from '../components/SearchBar';
import Breadcrumbs from '../components/Breadcrumbs';
import Pagination from '../components/Pagination';

export default function Shop() {
  const { products, productsLoading } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL query params
  const initialCategory = searchParams.get('category') || '';
  const initialBrand = searchParams.get('brand') || '';
  const initialSearch = searchParams.get('q') || '';
  const initialSort = searchParams.get('sort') || 'featured';

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedBrand, setSelectedBrand] = useState(initialBrand);
  const [selectedStorage, setSelectedStorage] = useState('');
  const [priceRange, setPriceRange] = useState(600000);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState(initialSort);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Sync state if query params change
  useEffect(() => {
    if (searchParams.get('category') !== null) {
      setSelectedCategory(searchParams.get('category'));
    }
    if (searchParams.get('brand') !== null) {
      setSelectedBrand(searchParams.get('brand'));
    }
    if (searchParams.get('q') !== null) {
      setSearchQuery(searchParams.get('q'));
    }
    if (searchParams.get('sort') !== null) {
      setSortBy(searchParams.get('sort'));
    }
  }, [searchParams]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedBrand('');
    setSelectedStorage('');
    setPriceRange(600000);
    setInStockOnly(false);
    setSortBy('featured');
    setCurrentPage(1);
    setSearchParams({});
  };

  // Filter & Sort logic
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchBrand = p.brand.toLowerCase().includes(q);
          const matchDesc = p.description?.toLowerCase().includes(q);
          if (!matchName && !matchBrand && !matchDesc) return false;
        }

        // Category
        if (selectedCategory && p.category !== selectedCategory) {
          return false;
        }

        // Brand
        if (selectedBrand && p.brand.toLowerCase() !== selectedBrand.toLowerCase()) {
          return false;
        }

        // Storage
        if (selectedStorage) {
          if (!p.storageOptions || !p.storageOptions.includes(selectedStorage)) {
            return false;
          }
        }

        // Price
        if (p.price > priceRange) {
          return false;
        }

        // In Stock
        if (inStockOnly && p.stock <= 0) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
        if (sortBy === 'newest') return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
        // default: featured
        return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
      });
  }, [products, searchQuery, selectedCategory, selectedBrand, selectedStorage, priceRange, inStockOnly, sortBy]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  return (
    <div style={{ backgroundColor: 'var(--bg-secondary)', minHeight: '80vh', paddingBottom: '80px' }}>
      <div className="container">
        {/* Breadcrumb Navigation */}
        <Breadcrumbs items={[{ label: 'Shop Our Collection', path: '/shop' }]} />

        {/* Page Title Banner */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            padding: '36px 32px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px'
          }}
        >
          <div>
            <span className="badge badge-yellow" style={{ marginBottom: '8px' }}>Official Catalog</span>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>
              Shop Our Collection
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '4px' }}>
              Showing {filteredProducts.length} authentic smartphones, smartwatches, and accessories.
            </p>
          </div>

          <div style={{ width: '100%', maxWidth: '360px' }}>
            <SearchBar
              value={searchQuery}
              onChange={(val) => {
                setSearchQuery(val);
                setSearchParams((prev) => {
                  if (val) prev.set('q', val);
                  else prev.delete('q');
                  return prev;
                });
              }}
              onClear={() => {
                setSearchQuery('');
                setSearchParams((prev) => {
                  prev.delete('q');
                  return prev;
                });
              }}
            />
          </div>
        </div>

        {/* Catalog Main Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '32px', alignItems: 'start' }} className="shop-layout">
          {/* Desktop Filter Sidebar */}
          <div className="desktop-filters">
            <FilterSidebar
              selectedCategory={selectedCategory}
              onSelectCategory={(slug) => {
                setSelectedCategory(slug);
                setSearchParams((prev) => {
                  if (slug) prev.set('category', slug);
                  else prev.delete('category');
                  return prev;
                });
              }}
              selectedBrand={selectedBrand}
              onSelectBrand={(brand) => {
                setSelectedBrand(brand);
                setSearchParams((prev) => {
                  if (brand) prev.set('brand', brand);
                  else prev.delete('brand');
                  return prev;
                });
              }}
              priceRange={priceRange}
              onPriceChange={setPriceRange}
              selectedStorage={selectedStorage}
              onSelectStorage={setSelectedStorage}
              inStockOnly={inStockOnly}
              onToggleInStock={setInStockOnly}
              onResetFilters={handleResetFilters}
              categories={CATEGORIES}
            />
          </div>

          {/* Catalog Content Area */}
          <div>
            {/* Sorting and Mobile Filter Bar */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                padding: '14px 20px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Mobile Filter Toggle */}
                <button
                  onClick={() => setMobileFilterOpen(true)}
                  className="btn btn-outline btn-sm mobile-filter-btn"
                  style={{ display: 'none' }}
                >
                  <SlidersHorizontal size={14} />
                  <span>Filters</span>
                </button>

                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Showing <strong style={{ color: 'var(--text-primary)' }}>{filteredProducts.length === 0 ? 0 : `${(currentPage - 1) * itemsPerPage + 1}–${Math.min(currentPage * itemsPerPage, filteredProducts.length)}`}</strong> of {filteredProducts.length} items
                </span>
              </div>

              {/* Sort Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ArrowUpDown size={15} color="#6B7280" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="featured">Featured First</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="rating">Best Rated</option>
                  <option value="newest">Newest Arrivals</option>
                </select>
              </div>
            </div>

            {/* Active Filters Badges */}
            {(selectedCategory || selectedBrand || selectedStorage || searchQuery || inStockOnly) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Active filters:</span>
                {selectedCategory && (
                  <span className="badge badge-yellow" style={{ cursor: 'pointer' }} onClick={() => setSelectedCategory('')}>
                    Category: {selectedCategory} ✕
                  </span>
                )}
                {selectedBrand && (
                  <span className="badge badge-yellow" style={{ cursor: 'pointer' }} onClick={() => setSelectedBrand('')}>
                    Brand: {selectedBrand} ✕
                  </span>
                )}
                {selectedStorage && (
                  <span className="badge badge-yellow" style={{ cursor: 'pointer' }} onClick={() => setSelectedStorage('')}>
                    Storage: {selectedStorage} ✕
                  </span>
                )}
                {inStockOnly && (
                  <span className="badge badge-yellow" style={{ cursor: 'pointer' }} onClick={() => setInStockOnly(false)}>
                    In Stock Only ✕
                  </span>
                )}
                {searchQuery && (
                  <span className="badge badge-yellow" style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')}>
                    Search: "{searchQuery}" ✕
                  </span>
                )}
                <button
                  onClick={handleResetFilters}
                  style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Product Grid */}
            <ProductGrid products={paginatedProducts} loading={productsLoading} />

            {/* Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => {
                setCurrentPage(page);
                window.scrollTo({ top: 380, behavior: 'smooth' });
              }}
              totalItems={filteredProducts.length}
              itemsPerPage={itemsPerPage}
              itemLabel="products"
            />
          </div>
        </div>
      </div>

      {/* Mobile Filters Modal */}
      {mobileFilterOpen && (
        <div className="modal-overlay" onClick={() => setMobileFilterOpen(false)}>
          <div
            className="modal-dialog"
            style={{ maxWidth: '440px', padding: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Filters</h3>
              <button onClick={() => setMobileFilterOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                ✕
              </button>
            </div>
            <div style={{ padding: '20px', maxHeight: '75vh', overflowY: 'auto' }}>
              <FilterSidebar
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                selectedBrand={selectedBrand}
                onSelectBrand={setSelectedBrand}
                priceRange={priceRange}
                onPriceChange={setPriceRange}
                selectedStorage={selectedStorage}
                onSelectStorage={setSelectedStorage}
                inStockOnly={inStockOnly}
                onToggleInStock={setInStockOnly}
                onResetFilters={handleResetFilters}
                categories={CATEGORIES}
              />
            </div>
            <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="btn btn-primary btn-block"
              >
                Apply Filters ({filteredProducts.length} Results)
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 960px) {
          .shop-layout { grid-template-columns: 1fr !important; }
          .desktop-filters { display: none; }
          .mobile-filter-btn { display: inline-flex !important; }
        }
      `}</style>
    </div>
  );
}
