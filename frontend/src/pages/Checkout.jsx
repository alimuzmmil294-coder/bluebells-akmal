import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../utils/currency';
import Breadcrumbs from '../components/Breadcrumbs';

export default function Checkout() {
  const { cartItems, totals, clearCart, cartLoading, appliedCouponCode } = useCart();
  const { currentUser, createOrder, addToast, settings, products } = useStore();
  const navigate = useNavigate();

  // Shipping Form State
  const [formData, setFormData] = useState({
    fullName: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    address: currentUser?.address || '',
    city: currentUser?.city || '',
    state: currentUser?.state || '',
    postalCode: currentUser?.postalCode || '',
    shippingMethod: 'express', // 'express' | 'priority'
    paymentMethod: 'cod',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    setFormData((previous) => ({
      ...previous,
      fullName: previous.fullName || currentUser.name || '',
      email: previous.email || currentUser.email || '',
      phone: previous.phone || currentUser.phone || '',
      address: previous.address || currentUser.address || '',
      city: previous.city || currentUser.city || '',
      state: previous.state || currentUser.state || '',
      postalCode: previous.postalCode || currentUser.postalCode || ''
    }));
  }, [currentUser]);

  if (cartLoading) {
    return <div className="container" style={{ padding: '80px 24px', textAlign: 'center' }}>Loading your cart...</div>;
  }

  // Redirect if cart is empty
  if (cartItems.length === 0) {
    return (
      <div className="container" style={{ padding: '80px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '16px' }}>Your Cart is Empty</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Please add items to your cart before proceeding to checkout.
        </p>
        <Link to="/shop" className="btn btn-primary">
          Browse Products
        </Link>
      </div>
    );
  }

  const validate = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim() || !formData.email.includes('@')) newErrors.email = 'Valid email is required';
    if (!formData.phone.trim() || formData.phone.length < 8) newErrors.phone = 'Valid phone number is required';
    if (!formData.address.trim()) newErrors.address = 'Street address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State / Province is required';
    if (!formData.postalCode.trim()) newErrors.postalCode = 'Postal code is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const stockConflict = cartItems.find((item) => {
    const prod = products?.find((p) => String(p.id) === String(item.id) || String(p.id) === String(item.productId));
    const availableStock = prod ? prod.stock : (typeof item.stock === 'number' ? item.stock : Infinity);
    return typeof availableStock === 'number' && item.quantity > availableStock;
  });

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!validate()) {
      addToast('Please complete all required shipping fields', 'error');
      return;
    }

    if (stockConflict) {
      const prod = products?.find((p) => String(p.id) === String(stockConflict.id) || String(p.id) === String(stockConflict.productId));
      const available = prod ? prod.stock : (typeof stockConflict.stock === 'number' ? stockConflict.stock : 0);
      addToast(`Cannot place order: "${stockConflict.name}" has only ${available} units available in stock. Please adjust quantity.`, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const orderPayload = {
        customer: {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode
        },
        items: cartItems.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          storage: item.storage,
          ptaStatus: item.ptaStatus,
          color: item.color,
          image: item.image
        })),
        couponCode: appliedCouponCode,
        paymentMethod: 'cod',
        shippingMethod: formData.shippingMethod,
        notes: formData.notes
      };

      const placedOrder = await createOrder(orderPayload);
      await clearCart();
      addToast('Order placed successfully!', 'success');
      navigate(`/order-confirmation/${placedOrder.id || placedOrder.orderNumber}`, {
        state: { order: placedOrder }
      });
    } catch (err) {
      addToast(err.message || 'Failed to place order. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-secondary)', minHeight: '80vh', paddingBottom: '80px' }}>
      <div className="container">
        <Breadcrumbs
          items={[
            { label: 'Cart', path: '/cart' },
            { label: 'Checkout', path: '/checkout' }
          ]}
        />

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-0.5px' }}>
            Checkout
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Complete your order delivery information.
          </p>
        </div>

        {/* Payment notice */}
        <div
          style={{
            backgroundColor: '#FEF3C7',
            border: '1px solid #F59E0B',
            borderRadius: 'var(--radius-md)',
            padding: '14px 20px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#92400E'
          }}
        >
          <ShieldAlert size={20} color="#D97706" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.88rem', lineHeight: 1.5 }}>
            <strong>Secure checkout:</strong> Your order and inventory are saved by BlueBells. No payment card details are collected; payment is due in cash upon delivery.
          </div>
        </div>

        {/* Form & Summary 2-Col Layout */}
        <form onSubmit={handlePlaceOrder}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 0.8fr',
              gap: '36px',
              alignItems: 'start'
            }}
            className="checkout-grid"
          >
            {/* Left: Shipping & Payment Forms */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {/* Shipping Information Card */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                  padding: '32px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--primary-blue)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', boxShadow: 'var(--shadow-blue)' }}>
                    1
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Shipping Address</h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="e.g. Hamza Malik"
                      className={`form-input ${errors.fullName ? 'error' : ''}`}
                    />
                    {errors.fullName && <div className="form-error">{errors.fullName}</div>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="e.g. hamza@example.com"
                      className={`form-input ${errors.email ? 'error' : ''}`}
                    />
                    {errors.email && <div className="form-error">{errors.email}</div>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number (For Courier Contact) *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="e.g. +92 300 1234567"
                    className={`form-input ${errors.phone ? 'error' : ''}`}
                  />
                  {errors.phone && <div className="form-error">{errors.phone}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label">Street Address / House / Suite *</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="e.g. House 45, Street 12, Phase 5 DHA"
                    className={`form-input ${errors.address ? 'error' : ''}`}
                  />
                  {errors.address && <div className="form-error">{errors.address}</div>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }} className="form-row-3">
                  <div className="form-group">
                    <label className="form-label">City *</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="e.g. Lahore"
                      className={`form-input ${errors.city ? 'error' : ''}`}
                    />
                    {errors.city && <div className="form-error">{errors.city}</div>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Province / State *</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      placeholder="e.g. Punjab"
                      className={`form-input ${errors.state ? 'error' : ''}`}
                    />
                    {errors.state && <div className="form-error">{errors.state}</div>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Postal Code *</label>
                    <input
                      type="text"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      placeholder="e.g. 54792"
                      className={`form-input ${errors.postalCode ? 'error' : ''}`}
                    />
                    {errors.postalCode && <div className="form-error">{errors.postalCode}</div>}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Delivery Instructions (Optional)</label>
                  <textarea
                    rows={2}
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Special instructions for rider (e.g. Call before arrival, leave with receptionist)..."
                    className="form-textarea"
                  />
                </div>
              </div>

              {/* Delivery & Payment Selection */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                  padding: '32px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--primary-blue)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', boxShadow: 'var(--shadow-blue)' }}>
                    2
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Payment Method</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      border: formData.paymentMethod === 'cod' ? '2px solid var(--primary-blue)' : '1px solid var(--border-color)',
                      backgroundColor: formData.paymentMethod === 'cod' ? 'var(--blue-light)' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={formData.paymentMethod === 'cod'}
                      onChange={handleInputChange}
                      style={{ accentColor: 'var(--primary-blue)', width: '18px', height: '18px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Cash on Delivery (COD)</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Inspect sealed parcel and pay cash upon personal handover.
                      </div>
                    </div>
                  </label>

                </div>
              </div>
            </div>

            {/* Right: Order Review */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
                padding: '28px',
                position: 'sticky',
                top: '100px'
              }}
            >
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '20px' }}>Your Order Review</h3>

              {/* Items List preview */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '280px', overflowY: 'auto', marginBottom: '20px', paddingRight: '4px' }}>
                {cartItems.map((item) => (
                  <div key={item.cartItemId} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-secondary)', padding: '4px', flexShrink: 0, border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={item.image} alt={item.name} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h5 style={{ fontSize: '0.88rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.name}
                      </h5>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Qty: {item.quantity} • {item.storage}{item.ptaStatus && item.ptaStatus !== 'Not Applicable' ? ` • ${item.ptaStatus}` : ''}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Summary Calculations */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Subtotal</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatPrice(totals.subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>Insured Shipping</span>
                  <span style={{ fontWeight: 600, color: totals.shippingFee === 0 ? 'var(--color-success)' : 'var(--text-primary)' }}>
                    {totals.shippingFee === 0 ? 'FREE' : formatPrice(totals.shippingFee)}
                  </span>
                </div>
                {totals.discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-success)' }}>
                    <span>Discounts</span>
                    <span style={{ fontWeight: 700 }}>-{formatPrice(totals.discountAmount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: '12px', borderTop: '2px solid var(--border-color)', marginTop: '4px' }}>
                  <span style={{ fontSize: '1.05rem', fontWeight: 800 }}>Total</span>
                  <span style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                    {formatPrice(totals.grandTotal)}
                  </span>
                </div>
              </div>

              {/* Stock Conflict Warning */}
              {stockConflict && (
                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #F87171',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    marginBottom: '16px',
                    fontSize: '0.85rem',
                    color: '#B91C1C',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <ShieldAlert size={16} style={{ flexShrink: 0 }} />
                  <span>Some items exceed available stock. Return to cart to adjust quantities.</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || Boolean(stockConflict)}
                className="btn btn-primary btn-block btn-lg"
                style={{
                  width: '100%',
                  marginBottom: '14px',
                  opacity: stockConflict ? 0.6 : 1,
                  cursor: stockConflict ? 'not-allowed' : 'pointer'
                }}
              >
                <Lock size={18} />
                <span>{isSubmitting ? 'Placing Order...' : stockConflict ? 'Insufficient Stock' : 'Place Order'}</span>
              </button>

              <Link
                to="/cart"
                className="btn btn-outline btn-block btn-sm"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <ArrowLeft size={14} />
                <span>Return to Cart</span>
              </Link>
            </div>
          </div>
        </form>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .checkout-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .form-row-2, .form-row-3 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
