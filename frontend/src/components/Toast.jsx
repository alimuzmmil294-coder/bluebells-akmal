import React from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { CheckCircle2, AlertCircle, Info, X, ShoppingBag } from 'lucide-react';

export default function Toast() {
  const { toasts, removeToast } = useStore();

  if (!toasts || toasts.length === 0) return null;

  // Strictly display only the single latest notification
  const toast = toasts[toasts.length - 1];
  if (!toast) return null;

  const isCartToast = toast.message && /cart/i.test(toast.message) && toast.type === 'success';

  return (
    <div className="toast-container" aria-live="polite">
      <div
        key={toast.id}
        className={`toast-item ${toast.type} ${isCartToast ? 'toast-cart-item' : ''}`}
      >
        <div className="toast-content">
          {toast.type === 'error' && (
            <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0 }} />
          )}
          {toast.type === 'info' && (
            <Info size={18} color="#2563EB" style={{ flexShrink: 0 }} />
          )}
          {toast.type === 'success' && (
            isCartToast ? (
              <ShoppingBag size={18} color="#2563EB" style={{ flexShrink: 0 }} />
            ) : (
              <CheckCircle2 size={18} color="#2563EB" style={{ flexShrink: 0 }} />
            )
          )}
          <span className="toast-text">{toast.message}</span>
        </div>

        <div className="toast-actions">
          {isCartToast && (
            <Link
              to="/cart"
              onClick={() => removeToast(toast.id)}
              className="toast-view-cart-btn"
              aria-label="View Shopping Cart"
            >
              View Cart &rarr;
            </Link>
          )}
          <button
            onClick={() => removeToast(toast.id)}
            className="toast-close-btn"
            aria-label="Close notification"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
