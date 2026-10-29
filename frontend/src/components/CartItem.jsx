import React from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { formatPrice } from '../utils/currency';

export default function CartItem({ item, onUpdateQuantity, onRemove, availableStock }) {
  if (!item) return null;

  const stockLimit = typeof availableStock === 'number' ? availableStock : (typeof item.stock === 'number' ? item.stock : Infinity);
  const isAtMaxStock = item.quantity >= stockLimit;
  const exceedsStock = item.quantity > stockLimit;

  const lineTotal = item.price * item.quantity;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        padding: '20px 0',
        borderBottom: '1px solid var(--border-color)',
        flexWrap: 'wrap'
      }}
    >
      {/* Product Image & Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 280px' }}>
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px',
            flexShrink: 0,
            border: '1px solid var(--border-color)'
          }}
        >
          <img
            src={item.image}
            alt={item.name}
            style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
          />
        </div>

        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
            {item.brand}
          </span>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1.3, marginBottom: '6px' }}>
            <Link to={`/product/${item.id}`} style={{ color: 'var(--text-primary)' }}>
              {item.name}
            </Link>
          </h4>

          {/* Variant tags */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {item.storage && (
              <span style={{ fontSize: '0.78rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                {item.storage}
              </span>
            )}
            {item.ptaStatus && item.ptaStatus !== 'Not Applicable' && (
              <span style={{ fontSize: '0.78rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                {item.ptaStatus}
              </span>
            )}
            {item.color && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.colorHex || '#171717' }} />
                {item.color}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Unit Price */}
      <div style={{ minWidth: '110px', textAlign: 'left' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Unit Price</span>
        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{formatPrice(item.price)}</span>
        {exceedsStock && stockLimit < Infinity ? (
          <span style={{ fontSize: '0.72rem', color: '#DC2626', fontWeight: 700, display: 'block', marginTop: '4px' }}>
            Only {stockLimit} available!
          </span>
        ) : isAtMaxStock && stockLimit < Infinity ? (
          <span style={{ fontSize: '0.72rem', color: '#D97706', fontWeight: 600, display: 'block', marginTop: '4px' }}>
            Max reached ({stockLimit})
          </span>
        ) : null}
      </div>

      {/* Quantity Stepper */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: '#FFFFFF'
        }}
      >
        <button
          onClick={() => onUpdateQuantity(item.cartItemId || item.id || item.productId, -1)}
          disabled={item.quantity <= 1}
          style={{
            padding: '8px 12px',
            background: 'none',
            border: 'none',
            cursor: item.quantity <= 1 ? 'not-allowed' : 'pointer',
            opacity: item.quantity <= 1 ? 0.3 : 1,
            display: 'flex',
            alignItems: 'center'
          }}
          aria-label="Decrease quantity"
        >
          <Minus size={14} />
        </button>

        <span style={{ padding: '0 8px', fontWeight: 700, fontSize: '0.9rem', minWidth: '28px', textAlign: 'center' }}>
          {item.quantity}
        </span>

        <button
          onClick={() => onUpdateQuantity(item.cartItemId || item.id || item.productId, 1)}
          disabled={isAtMaxStock}
          style={{
            padding: '8px 12px',
            background: 'none',
            border: 'none',
            cursor: isAtMaxStock ? 'not-allowed' : 'pointer',
            opacity: isAtMaxStock ? 0.3 : 1,
            display: 'flex',
            alignItems: 'center'
          }}
          aria-label="Increase quantity"
          title={isAtMaxStock ? `Maximum available quantity reached (${stockLimit} in stock)` : "Increase quantity"}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Line Subtotal */}
      <div style={{ minWidth: '120px', textAlign: 'right' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Subtotal</span>
        <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
          {formatPrice(lineTotal)}
        </span>
      </div>

      {/* Remove Button */}
      <button
        onClick={() => onRemove(item.cartItemId || item.id || item.productId)}
        style={{
          background: 'none',
          border: 'none',
          color: '#9CA3AF',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: 'var(--radius-sm)',
          transition: 'color 0.15s ease'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#DC2626')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#9CA3AF')}
        title="Remove item"
        aria-label="Remove item"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}
