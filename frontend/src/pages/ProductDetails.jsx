import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Star,
  Heart,
  ShoppingBag,
  Zap,
  Truck,
  RotateCcw,
  ShieldCheck,
  Check,
  PackageCheck,
  Minus,
  Plus,
  ArrowLeft
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { formatPrice, calculateDiscount } from '../utils/currency';
import Breadcrumbs from '../components/Breadcrumbs';
import ProductGrid from '../components/ProductGrid';
import PageLoader from '../components/PageLoader';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, loading: productsLoading, addToast } = useStore();
  const { addToCart, cartItems } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const product = products.find((p) => p.id === id);

  const [selectedImage, setSelectedImage] = useState('');
  const [selectedStorage, setSelectedStorage] = useState('');
  const [selectedPtaStatus, setSelectedPtaStatus] = useState('PTA Approved');
  const [selectedColor, setSelectedColor] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addedAnim, setAddedAnim] = useState(false);
  const [activeTab, setActiveTab] = useState('specs'); // 'specs' | 'reviews' | 'shipping'
  const [newReviewText, setNewReviewText] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [reviewsList, setReviewsList] = useState([
    {
      id: 1,
      author: 'Shahmeer Ali',
      city: 'Lahore',
      rating: 5,
      date: '3 days ago',
      content: 'Received 100% genuine sealed box within 24 hours via express insured rider in Lahore. PTA approval verified instantly on checkcoverage. Outstanding customer service from BlueBells!'
    },
    {
      id: 2,
      author: 'Fatima Zahra',
      city: 'Karachi',
      rating: 5,
      date: '1 week ago',
      content: 'Flawless condition, stunning packaging. The titanium feels unreal in the hand. Highly recommended to anyone looking for authentic smartphones in Pakistan.'
    }
  ]);

  const galleryImages = product?.gallery?.length
    ? product.gallery.slice(0, 3)
    : product?.image
      ? [product.image]
      : [];

  // Set default selections when product loads or changes
  useEffect(() => {
    if (product) {
      const firstStorage = product.storageOptions?.[0] || product.variants?.[0]?.storage || 'Standard';
      const firstStorageVariants = product.variants?.filter((variant) => variant.storage === firstStorage) || [];
      setSelectedImage(galleryImages[0] || product.image);
      setSelectedStorage(firstStorage);
      setSelectedPtaStatus(
        firstStorageVariants.find((variant) => variant.ptaStatus === 'PTA Approved')?.ptaStatus ||
        firstStorageVariants.find((variant) => variant.ptaStatus === 'Not Applicable')?.ptaStatus ||
        firstStorageVariants[0]?.ptaStatus ||
        'PTA Approved'
      );
      setSelectedColor(product.colors?.[0] || { name: 'Standard', hex: '#171717' });
      setQuantity(1);
      window.scrollTo(0, 0);
    }
  }, [product, id]);

  useEffect(() => {
    if (galleryImages.length < 2) return undefined;

    const intervalId = window.setInterval(() => {
      setSelectedImage((currentImage) => {
        const currentIndex = galleryImages.indexOf(currentImage);
        return galleryImages[(currentIndex + 1) % galleryImages.length];
      });
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [product?.id, galleryImages.join('|')]);

  if (!product) {
    if (productsLoading) {
      return <PageLoader text="Loading Flagship Specifications..." />;
    }
    return (
      <div className="container" style={{ padding: '80px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '16px' }}>Product Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          The smartphone or accessory you requested could not be located in our catalog.
        </p>
        <Link to="/shop" className="btn btn-primary">
          Back to Shop
        </Link>
      </div>
    );
  }

  const inWishlist = isInWishlist(product.id);
  const ptaStatuses = [...new Set((product.variants || []).map((variant) => variant.ptaStatus))];
  const hasPtaOptions = ptaStatuses.includes('PTA Approved') && ptaStatuses.includes('Non-PTA');
  const selectedVariant = product.variants?.find(
    (variant) => variant.storage === selectedStorage && variant.ptaStatus === selectedPtaStatus
  );
  const selectedPrice = selectedVariant?.price ?? product.price;
  const selectedOriginalPrice = selectedVariant?.originalPrice || product.originalPrice;
  const discount = calculateDiscount(selectedPrice, selectedOriginalPrice);

  const availableStock = typeof product.stock === 'number' ? product.stock : Infinity;
  const currentCartItemId = `${product.id}_${selectedStorage}_${selectedVariant?.ptaStatus || selectedPtaStatus}_${selectedColor?.name || 'Default'}`.replace(/\s+/g, '-');
  const inCartQty = cartItems?.find(
    (i) => i.cartItemId === currentCartItemId || (i.productId === product.id && i.storage === selectedStorage && i.color === selectedColor?.name && i.ptaStatus === (selectedVariant?.ptaStatus || selectedPtaStatus))
  )?.quantity || 0;
  const isOutOfStock = availableStock === 0;
  const isMaxInCart = availableStock > 0 && inCartQty >= availableStock;

  const handleAddToCart = async () => {
    if (isOutOfStock || isMaxInCart) return;
    const maxPermitted = availableStock - inCartQty;
    const qtyToAdd = Math.min(quantity, maxPermitted);
    if (qtyToAdd <= 0) return;

    setAddedAnim(true);
    setTimeout(() => setAddedAnim(false), 2400);
    await addToCart(
      product,
      qtyToAdd,
      selectedStorage,
      selectedColor?.name,
      selectedColor?.hex,
      selectedVariant?.ptaStatus
    );
  };

  const handleBuyNow = async () => {
    if (isOutOfStock || isMaxInCart) return;
    const maxPermitted = availableStock - inCartQty;
    const qtyToAdd = Math.min(quantity, maxPermitted);
    if (qtyToAdd <= 0) return;

    const added = await addToCart(
      product,
      qtyToAdd,
      selectedStorage,
      selectedColor?.name,
      selectedColor?.hex,
      selectedVariant?.ptaStatus
    );
    if (added) navigate('/checkout');
  };

  const handleAddReview = (e) => {
    e.preventDefault();
    if (!newReviewText.trim()) return;
    const rev = {
      id: Date.now(),
      author: 'Verified Customer',
      city: 'Pakistan',
      rating: newReviewRating,
      date: 'Just now',
      content: newReviewText.trim()
    };
    setReviewsList([rev, ...reviewsList]);
    setNewReviewText('');
    addToast('Thank you! Your verified review has been posted.', 'success');
  };

  // Related products
  const relatedProducts = products
    .filter((p) => p.id !== product.id && (p.category === product.category || p.brand === product.brand))
    .slice(0, 4);

  return (
    <div style={{ backgroundColor: '#FFFFFF', paddingBottom: '80px' }}>
      <div className="container">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Shop', path: '/shop' },
            { label: product.brand, path: `/shop?brand=${product.brand.toLowerCase()}` },
            { label: product.name }
          ]}
        />

        {/* Main Product Stage */}
        <div className="product-stage-grid">
          {/* Left: Gallery */}
          <div className="product-gallery-column">
            {/* Primary Main Image Frame */}
            <div
              className="product-stage-image-frame"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--border-color)',
                padding: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '420px',
                position: 'relative'
              }}
            >
              {discount > 0 && (
                <span className="badge badge-sale" style={{ position: 'absolute', top: '20px', left: '20px' }}>
                  Save {discount}%
                </span>
              )}

              <img
                src={selectedImage || product.image}
                alt={product.name}
                className="product-stage-main-image"
                style={{
                  maxHeight: '340px',
                  maxWidth: '100%',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.1))',
                  transition: 'transform 0.25s ease'
                }}
              />
            </div>

            {/* Thumbnails Row */}
            {galleryImages.length > 1 && (
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
                {galleryImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(img)}
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-secondary)',
                      border: selectedImage === img ? '2px solid var(--primary-blue)' : '1px solid var(--border-color)',
                      padding: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      outline: 'none',
                      transition: 'border-color 0.15s ease'
                    }}
                  >
                    <img src={img} alt="Thumbnail" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Buy Box & Options */}
          <div className="product-buy-box">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '1px' }}>
                {product.brand} Official
              </span>
              <button
                onClick={() => toggleWishlist(product.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: inWishlist ? '#DC2626' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.88rem'
                }}
              >
                <Heart size={20} fill={inWishlist ? '#DC2626' : 'none'} />
                <span>{inWishlist ? 'In Wishlist' : 'Add to Wishlist'}</span>
              </button>
            </div>

            <h1 className="product-details-title">
              {product.name}
            </h1>

            {/* Ratings & Reviews */}
            <div className="product-details-ratings-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--blue-light)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
                <Star size={15} fill="#3B82F6" color="#3B82F6" />
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--primary-blue)' }}>{product.rating || 4.9}</span>
              </div>
              <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Based on {product.reviewCount || 120} verified reviews
              </span>
              <span className="bullet-sep" style={{ color: 'var(--border-color)' }}>•</span>
              <span style={{ fontSize: '0.88rem', color: 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <PackageCheck size={16} />
                {product.stock > 0 ? `In Stock (${product.stock} units)` : 'Sold Out'}
              </span>
            </div>

            {/* Price block */}
            <div className="product-details-price-box">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
                <span className="product-price-current">
                  {formatPrice(selectedPrice)}
                </span>
                {selectedOriginalPrice > selectedPrice && (
                  <span className="product-price-original">
                    {formatPrice(selectedOriginalPrice)}
                  </span>
                )}
                {discount > 0 && (
                  <span className="badge badge-sale">Save {discount}%</span>
                )}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.4 }}>
                Official brand sealed box{selectedVariant?.ptaStatus === 'PTA Approved' ? ' • PTA Approved' : selectedVariant?.ptaStatus === 'Non-PTA' ? ' • Non-PTA' : ''} • Nationwide insured courier delivery
              </div>
            </div>

            {/* Storage Selection */}
            {product.storageOptions && product.storageOptions.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, marginBottom: '10px' }}>
                  Storage Capacity: <span style={{ color: '#D97706' }}>{selectedStorage}</span>
                </label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {product.storageOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSelectedStorage(opt)}
                      style={{
                        padding: '10px 18px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: selectedStorage === opt ? '2px solid var(--primary-blue)' : '1px solid var(--border-color)',
                        backgroundColor: selectedStorage === opt ? 'var(--blue-light)' : '#FFFFFF',
                        color: selectedStorage === opt ? 'var(--primary-blue)' : 'var(--text-primary)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {hasPtaOptions && (
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, marginBottom: '10px' }}>
                  PTA Status: <span style={{ color: 'var(--primary-blue)' }}>{selectedPtaStatus}</span>
                </label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {['PTA Approved', 'Non-PTA'].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setSelectedPtaStatus(status)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: selectedPtaStatus === status ? '2px solid var(--primary-blue)' : '1px solid var(--border-color)',
                        backgroundColor: selectedPtaStatus === status ? 'var(--blue-light)' : '#FFFFFF',
                        color: selectedPtaStatus === status ? 'var(--primary-blue)' : 'var(--text-primary)'
                      }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Swatch Selection */}
            {product.colors && product.colors.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, marginBottom: '10px' }}>
                  Finish / Color: <span style={{ color: 'var(--text-secondary)' }}>{selectedColor?.name}</span>
                </label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {product.colors.map((c, i) => {
                    const isSelected = selectedColor?.name === c.name;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedColor(c)}
                        title={c.name}
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          backgroundColor: c.hex,
                          border: isSelected ? '3px solid var(--primary-blue)' : '1px solid #D1D5DB',
                          boxShadow: isSelected ? '0 0 0 2px var(--blue-subtle)' : 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'transform 0.15s ease'
                        }}
                      >
                        {isSelected && <Check size={16} color={c.hex === '#FFFFFF' || c.hex === '#F2F2F2' ? '#171717' : '#FFFFFF'} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Inventory Status Message */}
            <div style={{ marginBottom: '14px' }}>
              {isOutOfStock ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#DC2626', fontWeight: 700, fontSize: '0.92rem' }}>
                  <span>Out of Stock</span>
                </div>
              ) : isMaxInCart ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#DC2626', fontWeight: 700, fontSize: '0.88rem' }}>
                  <span>Maximum available quantity reached ({availableStock} in cart)</span>
                </div>
              ) : availableStock <= 5 && availableStock > 0 ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#D97706', fontWeight: 700, fontSize: '0.9rem' }}>
                  <span>Only {availableStock} units available</span>
                </div>
              ) : null}
            </div>

            {/* Quantity Selector & Primary CTAs */}
            <div className="product-actions-group">
              {/* Stepper */}
              <div className="product-stepper">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || isOutOfStock || isMaxInCart}
                  style={{
                    padding: '0 14px',
                    background: 'none',
                    border: 'none',
                    cursor: (quantity <= 1 || isOutOfStock || isMaxInCart) ? 'not-allowed' : 'pointer',
                    opacity: (quantity <= 1 || isOutOfStock || isMaxInCart) ? 0.3 : 1,
                    height: '100%'
                  }}
                  aria-label="Decrease quantity"
                >
                  <Minus size={16} />
                </button>
                <span style={{ fontWeight: 800, fontSize: '1rem', minWidth: '32px', textAlign: 'center' }}>
                  {isOutOfStock ? 0 : quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(Math.max(1, availableStock - inCartQty), q + 1))}
                  disabled={isOutOfStock || isMaxInCart || quantity >= (availableStock - inCartQty)}
                  style={{
                    padding: '0 14px',
                    background: 'none',
                    border: 'none',
                    cursor: (isOutOfStock || isMaxInCart || quantity >= (availableStock - inCartQty)) ? 'not-allowed' : 'pointer',
                    opacity: (isOutOfStock || isMaxInCart || quantity >= (availableStock - inCartQty)) ? 0.3 : 1,
                    height: '100%'
                  }}
                  aria-label="Increase quantity"
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Add to Cart */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock || isMaxInCart}
                className={`btn btn-primary btn-lg product-add-btn ${addedAnim ? 'btn-added' : ''}`}
                style={{
                  flex: '1 1 180px',
                  gap: '10px',
                  cursor: (isOutOfStock || isMaxInCart) ? 'not-allowed' : 'pointer',
                  opacity: (isOutOfStock || isMaxInCart) ? 0.5 : 1
                }}
              >
                {isOutOfStock ? (
                  <span>Out of Stock</span>
                ) : isMaxInCart ? (
                  <span>Max In Cart</span>
                ) : addedAnim ? (
                  <>
                    <Check size={20} />
                    <span>Added to Cart!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag size={20} />
                    <span>Add to Cart</span>
                  </>
                )}
              </button>

              {/* Buy Now */}
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={isOutOfStock || isMaxInCart}
                className="btn btn-dark btn-lg product-buy-now-btn"
                style={{
                  flex: '1 1 160px',
                  gap: '10px',
                  cursor: (isOutOfStock || isMaxInCart) ? 'not-allowed' : 'pointer',
                  opacity: (isOutOfStock || isMaxInCart) ? 0.5 : 1
                }}
              >
                <Zap size={20} color="#FFFFFF" />
                <span>Buy Now</span>
              </button>
            </div>

            {/* Trust Assurances */}
            <div className="product-trust-assurances">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '0.85rem' }}>
                <div style={{ backgroundColor: 'var(--blue-light)', padding: '8px', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}>
                  <Truck size={18} color="var(--primary-blue)" />
                </div>
                <div>
                  <strong>Insured Express Delivery</strong>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '2px' }}>
                    24-48 Hours across Pakistan
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '0.85rem' }}>
                <div style={{ backgroundColor: 'var(--blue-light)', padding: '8px', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}>
                  <ShieldCheck size={18} color="var(--primary-blue)" />
                </div>
                <div>
                  <strong>1-Year Brand Warranty</strong>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '2px' }}>
                    Official manufacturer care
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabbed Info Section: Specs, Reviews, Shipping */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '40px', marginBottom: '64px' }}>
          {/* Tab Headers */}
          <div className="product-info-tabs">
            <button
              onClick={() => setActiveTab('specs')}
              className={`product-tab-btn ${activeTab === 'specs' ? 'active' : ''}`}
            >
              Technical Specifications
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`product-tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
            >
              Customer Reviews ({reviewsList.length})
            </button>
            <button
              onClick={() => setActiveTab('shipping')}
              className={`product-tab-btn ${activeTab === 'shipping' ? 'active' : ''}`}
            >
              Shipping &amp; Replacement
            </button>
          </div>

          {/* Specs Content */}
          {activeTab === 'specs' && (
            <div>
              <p style={{ fontSize: '1.05rem', lineHeight: 1.7, color: 'var(--text-secondary)', marginBottom: '32px', maxWidth: '800px' }}>
                {product.description}
              </p>

              {product.specifications && (
                <div className="product-specs-container">
                  {Object.entries(product.specifications).map(([key, val], idx) => (
                    <div
                      key={key}
                      className="product-spec-row"
                      style={{
                        borderBottom: idx !== Object.keys(product.specifications).length - 1 ? '1px solid var(--border-color)' : 'none',
                        backgroundColor: idx % 2 === 0 ? '#FFFFFF' : 'var(--bg-secondary)',
                        fontSize: '0.92rem'
                      }}
                    >
                      <strong style={{ color: 'var(--text-primary)' }}>{key}</strong>
                      <span style={{ color: 'var(--text-secondary)' }}>{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reviews Content */}
          {activeTab === 'reviews' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' }} className="reviews-grid">
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '20px' }}>Verified Buyer Feedback</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {reviewsList.map((rev) => (
                    <div
                      key={rev.id}
                      style={{
                        padding: '20px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                          <strong style={{ fontSize: '0.95rem' }}>{rev.author}</strong>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>({rev.city})</span>
                        </div>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{rev.date}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                        {[...Array(rev.rating)].map((_, i) => (
                          <Star key={i} size={14} fill="#3B82F6" color="#3B82F6" />
                        ))}
                      </div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {rev.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Write Review Form */}
              <div style={{ backgroundColor: '#FFFFFF', padding: '28px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', height: 'fit-content' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '12px' }}>Share Your Experience</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
                  Have you tested this device? Help fellow luxury smartphone enthusiasts make an informed decision.
                </p>

                <form onSubmit={handleAddReview}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>Rating</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setNewReviewRating(num)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                        >
                          <Star size={22} fill={num <= newReviewRating ? '#3B82F6' : 'none'} color="#3B82F6" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>Your Feedback</label>
                    <textarea
                      rows={4}
                      value={newReviewText}
                      onChange={(e) => setNewReviewText(e.target.value)}
                      placeholder="Write your honest review on build quality, camera, battery, or delivery speed..."
                      className="form-textarea"
                      required
                    />
                  </div>

                  <button type="submit" className="btn btn-primary btn-block">
                    Submit Verified Review
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Shipping & Replacement Tab */}
          {activeTab === 'shipping' && (
            <div style={{ maxWidth: '800px', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                Nationwide Express Insured Delivery
              </h3>
              <p style={{ marginBottom: '16px' }}>
                Orders placed before 4:00 PM (PKT) in Lahore and Karachi are scheduled for expedited same-day or next-morning dispatch. Deliveries to Islamabad, Rawalpindi, Faisalabad, Peshawar, and other major hubs take 24–48 hours via TCS Express &amp; Leopards Courier.
              </p>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '24px', marginBottom: '12px' }}>
                7-Day Replacement Guarantee
              </h4>
              <p style={{ marginBottom: '16px' }}>
                All devices are delivered in pristine, factory-sealed boxes with official seal stickers. If there is any manufacturing malfunction verified upon unboxing, BlueBells offers a direct replacement within 7 days of delivery.
              </p>
            </div>
          )}
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div style={{ marginTop: '60px' }}>
            <div className="section-header">
              <div>
                <span className="badge badge-yellow" style={{ marginBottom: '8px' }}>Similar Options</span>
                <h2 className="section-title">You May Also Consider</h2>
              </div>
            </div>
            <ProductGrid products={relatedProducts} />
          </div>
        )}
      </div>

      <style>{`
        .product-stage-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 52px;
          margin-top: 16px;
          margin-bottom: 64px;
          align-items: start;
        }
        @media (min-width: 901px) {
          .product-buy-box {
            position: sticky;
            top: 90px;
            align-self: start;
          }
        }
        .product-details-title {
          font-size: clamp(1.4rem, 3.2vw, 2.2rem);
          font-weight: 900;
          line-height: 1.25;
          color: var(--text-primary);
          margin-bottom: 14px;
          word-break: break-word;
        }
        .product-details-ratings-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .product-details-price-box {
          padding: 18px 20px;
          background-color: var(--bg-secondary);
          border-radius: var(--radius-md);
          margin-bottom: 24px;
          border: 1px solid var(--border-color);
        }
        .product-price-current {
          font-size: clamp(1.5rem, 3.8vw, 2.2rem);
          font-weight: 900;
          color: var(--text-primary);
        }
        .product-price-original {
          font-size: clamp(1rem, 2.5vw, 1.15rem);
          color: var(--text-muted);
          text-decoration: line-through;
        }
        .product-actions-group {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 28px;
          flex-wrap: wrap;
        }
        .product-stepper {
          display: flex;
          align-items: center;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background-color: var(--bg-secondary);
          height: 48px;
          flex-shrink: 0;
        }
        .btn-added {
          background-color: #10B981 !important;
          color: #FFFFFF !important;
          border-color: #10B981 !important;
          transform: scale(1.02);
          transition: all 0.2s ease;
        }
        .product-trust-assurances {
          padding: 18px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          background-color: #FFFFFF;
        }
        .product-info-tabs {
          display: flex;
          gap: 28px;
          border-bottom: 2px solid var(--border-subtle);
          margin-bottom: 32px;
          overflow-x: auto;
          white-space: nowrap;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .product-info-tabs::-webkit-scrollbar {
          display: none;
        }
        .product-tab-btn {
          padding-bottom: 14px;
          font-weight: 700;
          font-size: 1.05rem;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-secondary);
          border-bottom: 3px solid transparent;
          margin-bottom: -2px;
          flex-shrink: 0;
          transition: color 0.15s ease, border-color 0.15s ease;
        }
        .product-tab-btn.active {
          color: var(--primary-blue);
          border-bottom-color: var(--primary-blue);
        }
        .product-specs-container {
          background-color: var(--bg-secondary);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-color);
          overflow: hidden;
        }
        .product-spec-row {
          display: grid;
          grid-template-columns: 240px 1fr;
          padding: 16px 24px;
          gap: 16px;
        }
        @media (max-width: 900px) {
          .product-stage-grid {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
          .reviews-grid {
            grid-template-columns: 1fr !important;
          }
          .product-buy-box {
            position: static !important;
          }
          .product-stage-image-frame {
            min-height: 320px !important;
            padding: 24px 20px !important;
          }
          .product-stage-main-image {
            max-height: 270px !important;
            max-width: 100% !important;
            height: auto !important;
            object-fit: contain !important;
          }
        }
        @media (max-width: 640px) {
          .product-trust-assurances {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
            padding: 14px !important;
          }
          .product-spec-row {
            grid-template-columns: 1fr !important;
            gap: 4px !important;
            padding: 12px 16px !important;
          }
          .bullet-sep {
            display: none !important;
          }
          .product-info-tabs {
            gap: 16px !important;
            margin-bottom: 20px !important;
          }
          .product-tab-btn {
            font-size: 0.95rem;
            padding-bottom: 10px;
          }
        }
        @media (max-width: 520px) {
          .product-stage-image-frame {
            min-height: 240px !important;
            padding: 16px 12px !important;
          }
          .product-stage-main-image {
            max-height: 210px !important;
            max-width: 100% !important;
            width: auto !important;
            height: auto !important;
            object-fit: contain !important;
          }
          .product-actions-group {
            flex-direction: column;
            align-items: stretch;
          }
          .product-stepper {
            justify-content: center;
            width: 100%;
          }
          .product-add-btn,
          .product-buy-now-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
