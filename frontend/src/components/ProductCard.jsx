import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Star, Eye } from 'lucide-react';
import { formatPrice, calculateDiscount } from '../utils/currency';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

export default function ProductCard({ product }) {
  const [imageError, setImageError] = useState(false);
  const { addToCart, cartItems } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  if (!product) return null;

  const inWishlist = isInWishlist(product.id);
  const discount = calculateDiscount(product.price, product.originalPrice);

  const availableStock = typeof product.stock === 'number' ? product.stock : Infinity;
  const inCartQty = cartItems
    ?.filter((i) => i.productId === product.id || i.id === product.id)
    .reduce((sum, i) => sum + i.quantity, 0) || 0;
  const isOutOfStock = availableStock === 0;
  const isMaxInCart = availableStock > 0 && inCartQty >= availableStock;

  const handleQuickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock || isMaxInCart) return;

    const defaultVariant = product.variants
      ?.filter((variant) => variant.ptaStatus !== 'Non-PTA')
      .sort((a, b) => a.price - b.price)[0];
    const defaultStorage = defaultVariant?.storage || product.storageOptions?.[0] || 'Standard';
    const defaultColor = product.colors?.[0]?.name || 'Default';
    const defaultColorHex = product.colors?.[0]?.hex || '#171717';
    addToCart(product, 1, defaultStorage, defaultColor, defaultColorHex, defaultVariant?.ptaStatus);
  };

  const handleWishlistClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  // Fallback image SVG if image URL fails or is unavailable
  const fallbackImage = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300" fill="%23F8F9FB"><rect width="300" height="300" fill="%23F8F9FB"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%239CA3AF">${encodeURIComponent(product.name)}</text></svg>`;

  return (
    <div className="product-card">
      <div className="product-card-image-wrap">
        {/* Badges */}
        <div className="product-card-badges">
          {product.isNew && <span className="badge badge-new">New</span>}
          {discount > 0 && <span className="badge badge-sale">-{discount}%</span>}
          {product.featured && <span className="badge badge-yellow">Featured</span>}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={handleWishlistClick}
          className={`product-card-wishlist ${inWishlist ? 'active' : ''}`}
          title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
          aria-label="Wishlist"
        >
          <Heart size={18} fill={inWishlist ? "#DC2626" : "none"} />
        </button>

        {/* Main Product Image */}
        <Link to={`/product/${product.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          <img
            src={imageError ? fallbackImage : (product.image || fallbackImage)}
            alt={product.name}
            loading="lazy"
            className="product-card-image"
            onError={() => setImageError(true)}
          />
        </Link>
      </div>

      <div className="product-card-body">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span className="product-card-brand">{product.brand}</span>
          {isOutOfStock ? (
            <span style={{ fontSize: '0.72rem', color: '#DC2626', fontWeight: 600 }}>
              Out of stock
            </span>
          ) : isMaxInCart ? (
            <span style={{ fontSize: '0.72rem', color: '#DC2626', fontWeight: 600 }}>
              Max in cart
            </span>
          ) : product.stock <= 5 && product.stock > 0 ? (
            <span style={{ fontSize: '0.72rem', color: '#D97706', fontWeight: 600 }}>
              Only {product.stock} left
            </span>
          ) : null}
        </div>

        <h3 className="product-card-title">
          <Link to={`/product/${product.id}`} title={product.name}>
            {product.name}
          </Link>
        </h3>

        {/* Rating */}
        <div className="product-card-rating">
          <div className="rating-stars">
            <Star size={14} fill="#3B82F6" color="#3B82F6" />
          </div>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{product.rating || 4.8}</span>
          <span style={{ color: 'var(--text-muted)' }}>({product.reviewCount || 45})</span>
        </div>

        {/* Color swatches preview if available */}
        {product.colors && product.colors.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', alignItems: 'center' }}>
            {product.colors.slice(0, 4).map((c, i) => (
              <span
                key={i}
                title={c.name}
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: c.hex,
                  border: '1px solid #D1D5DB'
                }}
              />
            ))}
            {product.colors.length > 4 && (
              <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>+{product.colors.length - 4}</span>
            )}
          </div>
        )}

        {/* Price and Add button */}
        <div className="product-card-footer">
          <div className="product-card-price-block">
            <span className="product-card-price">
              {product.variants?.length ? 'From ' : ''}{formatPrice(product.price)}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="product-card-original-price">{formatPrice(product.originalPrice)}</span>
            )}
          </div>

          <button
            onClick={handleQuickAdd}
            className="product-card-add-btn"
            title={isOutOfStock ? "Out of Stock" : isMaxInCart ? `Maximum quantity in cart (${product.stock} in stock)` : "Quick Add to Cart"}
            aria-label="Add to cart"
            disabled={isOutOfStock || isMaxInCart}
            style={{
              opacity: (isOutOfStock || isMaxInCart) ? 0.5 : 1,
              cursor: (isOutOfStock || isMaxInCart) ? 'not-allowed' : 'pointer'
            }}
          >
            <ShoppingBag size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
