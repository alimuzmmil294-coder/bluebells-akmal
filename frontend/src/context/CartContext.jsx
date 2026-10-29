import React, { createContext, useContext, useState, useEffect } from 'react';
import { getStorageItem, setStorageItem } from '../utils/storage';
import { calculateCartTotals } from '../utils/calculations';
import { useStore } from './StoreContext';
import api from '../services/api';

const CartContext = createContext(null);

let cartSyncQueue = Promise.resolve();
const queueSync = (syncFn) => {
  cartSyncQueue = cartSyncQueue
    .then(syncFn)
    .catch((err) => {
      console.warn('[Cart] Sync error:', err?.message || err);
    });
  return cartSyncQueue;
};

function deduplicateCartItems(items) {
  if (!Array.isArray(items)) return [];
  const map = new Map();
  for (const item of items) {
    if (!item) continue;
    const key = item.cartItemId || `${item.id || item.productId}_${item.storage || 'Standard'}_${item.ptaStatus || 'Not Applicable'}_${item.color || 'Default'}`.replace(/\s+/g, '-');
    if (map.has(key)) {
      const existing = map.get(key);
      existing.quantity += item.quantity;
      if (typeof item.stock === 'number') existing.stock = item.stock;
    } else {
      map.set(key, {
        ...item,
        cartItemId: key,
        id: item.id || item.productId,
        productId: item.productId || item.id
      });
    }
  }
  return Array.from(map.values());
}

export function CartProvider({ children }) {
  const { settings, addToast, currentUser } = useStore();

  const [cartItems, setCartItems] = useState(() => {
    const raw = getStorageItem('bluebells_cart', []);
    return deduplicateCartItems(raw);
  });

  const [cartLoading, setCartLoading] = useState(true);
  const [activeCoupon, setActiveCoupon] = useState(null);
  const [appliedCouponCode, setAppliedCouponCode] = useState(() => {
    return getStorageItem('bluebells_applied_coupon', null);
  });

  // Keep LocalStorage synchronized
  useEffect(() => {
    setStorageItem('bluebells_cart', cartItems);
  }, [cartItems]);

  useEffect(() => {
    setStorageItem('bluebells_applied_coupon', appliedCouponCode);
  }, [appliedCouponCode]);

  // Calculate totals
  const totals = calculateCartTotals(
    cartItems,
    activeCoupon,
    settings.standardShippingFee || 1500,
    settings.freeShippingThreshold || 50000
  );

  const updateCartFromResponse = (response) => {
    const items = response?.data?.items;
    if (Array.isArray(items)) {
      setCartItems(deduplicateCartItems(items));
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function loadCart() {
      setCartLoading(true);
      try {
        const response = await api.cart.get();
        if (!isMounted) return;
        updateCartFromResponse(response);
        const couponCode = response.data?.couponCode || null;
        setAppliedCouponCode(couponCode);
        if (couponCode) {
          const couponResponse = await api.cart.applyCoupon(couponCode);
          if (isMounted) setActiveCoupon(couponResponse.data?.coupon || null);
        } else {
          setActiveCoupon(null);
        }
      } catch (err) {
        console.warn('[Cart] Could not load server cart, using cached cart:', err.message);
      } finally {
        if (isMounted) setCartLoading(false);
      }
    }

    loadCart();
    return () => {
      isMounted = false;
    };
  }, [currentUser?._id, currentUser?.email]);

  const addToCart = async (product, quantity = 1, storage = null, color = null, colorHex = null, ptaStatus = null) => {
    if (!product) return false;

    const availableStock = typeof product.stock === 'number' ? product.stock : Infinity;
    if (availableStock <= 0) {
      addToast(`"${product.name}" is out of stock`, 'error');
      return false;
    }

    const selectedStorage = storage || (product.storageOptions && product.storageOptions[0]) || 'Standard';
    const selectedColor = color || (product.colors && product.colors[0]?.name) || 'Default';
    const selectedColorHex = colorHex || (product.colors && product.colors[0]?.hex) || '#171717';
    const storageVariants = product.variants?.filter((v) => v.storage === selectedStorage) || [];
    let variant = ptaStatus ? storageVariants.find((v) => v.ptaStatus === ptaStatus) : null;
    if (!variant && storageVariants.length === 1) {
      variant = storageVariants[0];
    }
    if (!variant && storageVariants.length > 0) {
      variant = storageVariants.find((v) => v.ptaStatus === 'PTA Approved') ||
                storageVariants.find((v) => v.ptaStatus === 'Not Applicable') ||
                storageVariants[0];
    }
    const selectedPtaStatus = variant?.ptaStatus || ptaStatus || 'Not Applicable';
    const selectedPrice = variant?.price ?? product.price;
    const selectedOriginalPrice = variant?.originalPrice || product.originalPrice || 0;
    const cartItemId = `${product.id}_${selectedStorage}_${selectedPtaStatus}_${selectedColor}`.replace(/\s+/g, '-');

    const existingItem = cartItems.find(
      (i) => i.cartItemId === cartItemId || (i.productId === product.id && i.storage === selectedStorage && i.color === selectedColor && i.ptaStatus === selectedPtaStatus)
    );
    const currentQty = existingItem ? existingItem.quantity : 0;

    if (currentQty >= availableStock) {
      addToast(`Maximum available quantity reached (${availableStock} in stock)`, 'warning');
      return false;
    }

    const requestedQty = Math.max(1, Number(quantity) || 1);
    const quantityToAdd = Math.min(requestedQty, availableStock - currentQty);

    // Instant optimistic update (0ms perceived latency!)
    const optimisticItem = {
      cartItemId,
      id: product.id,
      productId: product.id,
      name: product.name,
      brand: product.brand || '',
      category: product.category || '',
      price: selectedPrice,
      originalPrice: selectedOriginalPrice,
      image: product.image || (product.gallery && product.gallery[0]) || '',
      storage: selectedStorage,
      ptaStatus: selectedPtaStatus,
      color: selectedColor,
      colorHex: selectedColorHex,
      quantity: quantityToAdd,
      stock: availableStock
    };

    setCartItems((prev) => {
      const clean = deduplicateCartItems(prev);
      const existingIdx = clean.findIndex(
        (i) => i.cartItemId === cartItemId || (i.productId === product.id && i.storage === selectedStorage && i.color === selectedColor && i.ptaStatus === selectedPtaStatus)
      );
      if (existingIdx > -1) {
        const updated = [...clean];
        const newQty = Math.min(availableStock, updated[existingIdx].quantity + quantityToAdd);
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: newQty,
          stock: availableStock
        };
        return updated;
      }
      return [optimisticItem, ...clean];
    });

    addToast('Added to cart!', 'success');

    // Serialized background sync with server
    queueSync(async () => {
      try {
        const response = await api.cart.addItem({
          productId: product.id,
          quantity: quantityToAdd,
          storage: selectedStorage,
          ptaStatus: selectedPtaStatus,
          color: selectedColor,
          colorHex: selectedColorHex
        });
        updateCartFromResponse(response);
      } catch (err) {
        console.warn('[Cart] Server add item sync failed; saved locally:', err.message);
      }
    });

    return true;
  };

  const updateQuantity = async (cartItemId, delta) => {
    const target = cartItems.find((i) => i.cartItemId === cartItemId || i.productId === cartItemId || i.id === cartItemId);
    const itemStock = target ? (typeof target.stock === 'number' ? target.stock : Infinity) : Infinity;
    const numDelta = Number(delta) || 0;

    if (numDelta > 0 && target && target.quantity >= itemStock) {
      addToast(`Maximum available quantity reached (${itemStock} in stock)`, 'warning');
      return;
    }

    // Instant optimistic quantity update
    setCartItems((prev) => {
      const clean = deduplicateCartItems(prev);
      return clean
        .map((item) => {
          if (item.cartItemId === cartItemId || item.productId === cartItemId || item.id === cartItemId) {
            const limit = typeof item.stock === 'number' ? item.stock : Infinity;
            const newQty = Math.min(limit, item.quantity + numDelta);
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean);
    });

    queueSync(async () => {
      try {
        const response = await api.cart.updateQuantity(cartItemId, delta);
        updateCartFromResponse(response);
      } catch (err) {
        console.warn('[Cart] Server update quantity failed; saved locally:', err.message);
      }
    });
  };

  const removeFromCart = async (cartItemId) => {
    // Instant optimistic deletion
    setCartItems((prev) =>
      prev.filter((item) => item.cartItemId !== cartItemId && item.productId !== cartItemId && item.id !== cartItemId)
    );
    addToast('Item removed from cart', 'info');

    queueSync(async () => {
      try {
        const response = await api.cart.removeItem(cartItemId);
        updateCartFromResponse(response);
      } catch (err) {
        console.warn('[Cart] Server remove item failed; saved locally:', err.message);
      }
    });
  };

  const clearCart = async () => {
    try {
      const response = await api.cart.clear();
      updateCartFromResponse(response);
      setAppliedCouponCode(null);
      setActiveCoupon(null);
    } catch (err) {
      addToast(err.message || 'Could not clear cart', 'error');
    }
  };

  const applyCoupon = async (code) => {
    if (!code || !code.trim()) {
      addToast('Please enter a promo code', 'error');
      return false;
    }
    const cleanCode = code.trim().toUpperCase();
    try {
      const response = await api.cart.applyCoupon(cleanCode);
      setActiveCoupon(response.data?.coupon || null);
      setAppliedCouponCode(cleanCode);
      addToast(response.message || `Promo code "${cleanCode}" applied successfully!`, 'success');
      return true;
    } catch (err) {
      addToast(err.message || `Promo code "${cleanCode}" could not be applied`, 'error');
      return false;
    }
  };

  const removeCoupon = async () => {
    try {
      const response = await api.cart.removeCoupon();
      updateCartFromResponse(response);
      setAppliedCouponCode(null);
      setActiveCoupon(null);
      addToast('Promo code removed', 'info');
    } catch (err) {
      addToast(err.message || 'Could not remove promo code', 'error');
    }
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartLoading,
        appliedCoupon: activeCoupon,
        appliedCouponCode,
        totals,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        applyCoupon,
        removeCoupon
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
