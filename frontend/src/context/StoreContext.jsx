import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { INITIAL_SETTINGS } from '../data/demoData';
import { getStorageItem, setStorageItem } from '../utils/storage';
import api from '../services/api';

const CACHE_VERSION = 'bluebells_cache_v2_clean';
// Immediately purge legacy dummy caches from previous sessions
if (typeof window !== 'undefined') {
  try {
    const currentVersion = localStorage.getItem('bluebells_cache_version');
    if (currentVersion !== CACHE_VERSION) {
      localStorage.removeItem('bluebells_products');
      localStorage.removeItem('bluebells_orders');
      localStorage.removeItem('bluebells_customers');
      localStorage.removeItem('bluebells_coupons');
      localStorage.setItem('bluebells_cache_version', CACHE_VERSION);
    }
  } catch (e) {
    // Ignore storage quota or access errors
  }
}

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  // Products - initialized with client-side SWR cache for instant first paint
  const [products, setProducts] = useState(() => {
    const cached = getStorageItem('bluebells_products_cache', []);
    return Array.isArray(cached) ? cached : [];
  });
  const [productsLoading, setProductsLoading] = useState(() => {
    const cached = getStorageItem('bluebells_products_cache', []);
    return !(Array.isArray(cached) && cached.length > 0);
  });
  const [productsPagination, setProductsPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  });
  const lastCatalogFetchRef = useRef(0);

  // Orders - strictly database-backed
  const [orders, setOrders] = useState([]);

  // Customers - strictly database-backed
  const [customers, setCustomers] = useState([]);

  // Coupons - strictly database-backed
  const [coupons, setCoupons] = useState([]);

  // Store Settings (Storefront contact/address metadata from MongoDB)
  const [settings, setSettings] = useState(() => {
    const cached = getStorageItem('bluebells_settings', null);
    if (!cached || cached.storeAddress?.includes('Gulberg') || cached.supportPhone?.includes('1234567') || !cached.storeAddress?.includes('Peshawar')) {
      return INITIAL_SETTINGS;
    }
    return { ...INITIAL_SETTINGS, ...cached };
  });

  // Auth / User State
  const [currentUser, setCurrentUser] = useState(() => {
    return getStorageItem('bluebells_current_user', null);
  });
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    const cached = getStorageItem('bluebells_current_user', null);
    return cached?.role === 'admin';
  });
  const [authLoading, setAuthLoading] = useState(true);

  // Live Admin Dashboard Statistics
  const [adminMetrics, setAdminMetrics] = useState(null);

  // Toast System - Single active toast with 2.5s auto-dismiss and timeout reset
  const [toasts, setToasts] = useState([]);
  const toastTimeoutRef = useRef(null);

  const removeToast = useCallback((id) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    setToasts((prev) => (id ? prev.filter((t) => t.id !== id) : []));
  }, []);

  const addToast = useCallback((message, type = 'success', duration = 2500) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    // Replace previous notifications so only one toast appears at a time without stacking
    setToasts([{ id, message, type }]);

    toastTimeoutRef.current = setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Sync settings cache for offline / instant render
  useEffect(() => {
    setStorageItem('bluebells_settings', settings);
  }, [settings]);

  // Fetch products from database
  const fetchProducts = useCallback(async (params = {}, options = {}) => {
    const isBackground = options.background;
    if (!isBackground) {
      setProductsLoading(true);
    }
    try {
      const res = await api.products.getAll(params);
      if (res.success && Array.isArray(res.data)) {
        setProducts(res.data);
        lastCatalogFetchRef.current = Date.now();
        setStorageItem('bluebells_products_cache', res.data);
        setProductsPagination({
          page: res.page,
          limit: res.limit,
          total: res.total,
          totalPages: res.totalPages,
          hasNextPage: res.hasNextPage,
          hasPrevPage: res.hasPrevPage
        });
      }
    } catch (err) {
      console.warn('[Store] Could not fetch products from database:', err.message);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const fetchMyOrders = useCallback(async (email) => {
    try {
      const response = await api.orders.getMyOrders(email);
      if (response.success && Array.isArray(response.data)) {
        setOrders(response.data);
      }
    } catch (err) {
      console.warn('[Store] Could not fetch customer orders:', err.message);
    }
  }, []);

  // Fetch admin dashboard & orders
  const fetchAdminData = useCallback(async () => {
    if (!isAdminLoggedIn) return;
    try {
      const [dashRes, ordersRes, custRes, coupRes, productsRes] = await Promise.allSettled([
        api.admin.getDashboard(),
        api.admin.getOrders({ limit: 50 }),
        api.admin.getCustomers({ limit: 50 }),
        api.admin.getCoupons(),
        api.admin.getProducts({ limit: 100 })
      ]);

      if (dashRes.status === 'fulfilled' && dashRes.value?.success) {
        setAdminMetrics(dashRes.value.data);
      }
      if (ordersRes.status === 'fulfilled' && ordersRes.value?.success) {
        setOrders(ordersRes.value.data);
      }
      if (custRes.status === 'fulfilled' && custRes.value?.success) {
        setCustomers(custRes.value.data);
      }
      if (coupRes.status === 'fulfilled' && coupRes.value?.success) {
        setCoupons(coupRes.value.data);
      }
      if (productsRes.status === 'fulfilled' && productsRes.value?.success) {
        setProducts(productsRes.value.data);
        setProductsPagination({
          page: productsRes.value.page,
          limit: productsRes.value.limit,
          total: productsRes.value.total,
          totalPages: productsRes.value.totalPages,
          hasNextPage: productsRes.value.hasNextPage,
          hasPrevPage: productsRes.value.hasPrevPage
        });
      }
    } catch (err) {
      console.warn('[Store] Could not fetch admin data:', err.message);
    }
  }, [isAdminLoggedIn]);

  // Fetch store settings from database
  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.settings.get();
      if (res.success && res.data) {
        setSettings((prev) => ({ ...prev, ...res.data }));
        setStorageItem('bluebells_settings', { ...INITIAL_SETTINGS, ...res.data });
      }
    } catch (err) {
      console.warn('[Store] Could not fetch settings from database, using cached fallback:', err.message);
    }
  }, []);

  // Initial authentication check & product loading
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const authRes = await api.auth.me();
        if (isMounted && authRes.success && authRes.user) {
          setCurrentUser(authRes.user);
          if (authRes.token) {
            setStorageItem('bluebells_auth_token', authRes.token);
          }
          setStorageItem('bluebells_current_user', authRes.user);
          if (authRes.user.role === 'admin') {
            setIsAdminLoggedIn(true);
          } else {
            await fetchMyOrders(authRes.user.email);
          }
        } else if (isMounted) {
          setStorageItem('bluebells_auth_token', null);
          setStorageItem('bluebells_current_user', null);
          setCurrentUser(null);
          setIsAdminLoggedIn(false);
        }
      } catch (err) {
        // Fallback to cached session if network temporarily fails
        const cachedUser = getStorageItem('bluebells_current_user', null);
        if (isMounted && cachedUser) {
          setCurrentUser(cachedUser);
          if (cachedUser.role === 'admin') {
            setIsAdminLoggedIn(true);
          }
        }
      } finally {
        if (isMounted) setAuthLoading(false);
      }
    }

    initSession();
    fetchProducts({ limit: 100 });
    fetchSettings();

    return () => {
      isMounted = false;
    };
  }, [fetchProducts, fetchMyOrders, fetchSettings]);

  // Fetch admin data when admin is logged in, only when tab is visible
  useEffect(() => {
    if (!isAdminLoggedIn) return undefined;

    fetchAdminData();

    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchAdminData();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityOrFocus);
      window.addEventListener('focus', handleVisibilityOrFocus);
    }

    // Calm 90-second polling interval strictly guarded by tab visibility
    const refreshTimer = window.setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        fetchAdminData();
      }
    }, 90000);

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
        window.removeEventListener('focus', handleVisibilityOrFocus);
      }
      window.clearInterval(refreshTimer);
    };
  }, [isAdminLoggedIn, fetchAdminData]);

  // Refresh the public catalog on window focus or visibility, throttled to 60s
  useEffect(() => {
    if (isAdminLoggedIn) return undefined;

    const handleWindowFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastCatalogFetchRef.current > 60000) {
          fetchProducts({ limit: 100 }, { background: true });
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleWindowFocus);
      document.addEventListener('visibilitychange', handleWindowFocus);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleWindowFocus);
        document.removeEventListener('visibilitychange', handleWindowFocus);
      }
    };
  }, [isAdminLoggedIn, fetchProducts]);

  // Product Operations (Database-backed)
  const addProduct = async (newProduct) => {
    try {
      const res = await api.products.create(newProduct);
      if (res.success && res.data) {
        setProducts((prev) => [res.data, ...prev.filter((p) => p.id !== res.data.id)]);
        addToast(`"${res.data.name}" added to catalog!`, 'success');
        return res.data;
      }
    } catch (err) {
      addToast(err.message || 'Failed to create product', 'error');
      throw err;
    }
  };

  const updateProduct = async (id, updatedFields) => {
    try {
      const res = await api.products.update(id, updatedFields);
      if (res.success && res.data) {
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, ...res.data } : p))
        );
        addToast('Product updated successfully', 'success');
        return res.data;
      }
    } catch (err) {
      addToast(err.message || 'Failed to update product', 'error');
      throw err;
    }
  };

  const deleteProduct = async (id) => {
    try {
      const res = await api.products.delete(id);
      if (res.success) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        addToast(res.message || 'Product deleted from inventory', 'info');
        return res.data;
      }
    } catch (err) {
      addToast(err.message || 'Failed to delete product', 'error');
      throw err;
    }
  };

  // Order Operations (Database-backed)
  const createOrder = async (orderData) => {
    try {
      const res = await api.orders.create(orderData);
      if (res.success && res.data) {
        const savedOrder = res.data;
        setOrders((prev) => [savedOrder, ...prev]);

        // Refetch catalog to update stocks
        fetchProducts({ limit: 100 });
        return savedOrder;
      }
    } catch (err) {
      addToast(err.message || 'Could not place order', 'error');
      throw err;
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await api.admin.updateOrderStatus(orderId, newStatus);
      if (res.success && res.data) {
        setOrders((prev) =>
          prev.map((ord) => (ord.id === orderId ? res.data : ord))
        );
        addToast(`Order #${orderId} status set to ${newStatus}`, 'success');
        fetchProducts({ limit: 100 });
        return res.data;
      }
    } catch (err) {
      addToast(err.message || 'Failed to update order status', 'error');
      throw err;
    }
  };

  // Coupon Operations (Database-backed)
  const addCoupon = async (newCoupon) => {
    try {
      const res = await api.admin.createCoupon(newCoupon);
      if (res.success && res.data) {
        setCoupons((prev) => [res.data, ...prev]);
        addToast(`Coupon "${res.data.code}" created`, 'success');
        return res.data;
      }
    } catch (err) {
      addToast(err.message || 'Failed to create coupon', 'error');
      throw err;
    }
  };

  const deleteCoupon = async (id) => {
    try {
      const res = await api.admin.deleteCoupon(id);
      if (res.success) {
        setCoupons((prev) => prev.filter((c) => c.id !== id && c._id !== id));
        addToast('Coupon deleted', 'info');
      }
    } catch (err) {
      addToast(err.message || 'Failed to delete coupon', 'error');
      throw err;
    }
  };

  // Settings (Database-backed with localStorage fallback)
  const updateSettings = async (newSettings) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    try {
      const res = await api.settings.update(newSettings);
      if (res.success && res.data) {
        setSettings((prev) => ({ ...prev, ...res.data }));
        setStorageItem('bluebells_settings', { ...INITIAL_SETTINGS, ...res.data });
        addToast('Store settings saved to database', 'success');
        return res.data;
      }
    } catch (err) {
      addToast(err.message || 'Failed to save settings to server', 'error');
      throw err;
    }
  };

  // Profile Update
  const updateProfile = async (updatedFields) => {
    try {
      const res = await api.auth.updateProfile(updatedFields);
      const user = res.user || res.data;
      if (res.success && user) {
        setCurrentUser(user);
        addToast('Profile updated', 'success');
        return user;
      }
    } catch (err) {
      addToast(err.message || 'Could not update profile', 'error');
      throw err;
    }
  };

  // Authentication Operations
  const login = async (email, password, expectedRole) => {
    try {
      const res = await api.auth.login(email, password);
      if (res.success && res.user) {
        if (expectedRole && res.user.role !== expectedRole) {
          await api.auth.logout();
          addToast(
            expectedRole === 'admin'
              ? 'This account is not an administrator. Choose customer sign in instead.'
              : 'This is an administrator account. Choose admin sign in instead.',
            'error'
          );
          return false;
        }

        if (res.token) {
          setStorageItem('bluebells_auth_token', res.token);
        }
        setStorageItem('bluebells_current_user', res.user);

        setCurrentUser(res.user);
        const isAdmin = res.user.role === 'admin';
        setIsAdminLoggedIn(isAdmin);
        if (isAdmin) {
          addToast('Welcome to BlueBells Admin Portal', 'success');
        } else {
          addToast('Signed in successfully', 'success');
          await fetchMyOrders(res.user.email);
        }
        return true;
      }
    } catch (err) {
      addToast(err.message || 'Invalid credentials', 'error');
      return false;
    }
  };

  const register = async (userData) => {
    try {
      const res = await api.auth.register(userData);
      if (res.success && res.user) {
        if (res.token) {
          setStorageItem('bluebells_auth_token', res.token);
        }
        setStorageItem('bluebells_current_user', res.user);

        setCurrentUser(res.user);
        setIsAdminLoggedIn(false);
        await fetchMyOrders(res.user.email);
        addToast('Account created successfully!', 'success');
        return true;
      }
    } catch (err) {
      addToast(err.message || 'Registration failed', 'error');
      return false;
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (err) {
      // Local state cleanup
    } finally {
      setStorageItem('bluebells_auth_token', null);
      setStorageItem('bluebells_current_user', null);
      setIsAdminLoggedIn(false);
      setCurrentUser(null);
      setOrders([]);
      addToast('You have been logged out', 'info');
    }
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        productsLoading,
        productsPagination,
        fetchProducts,
        orders,
        customers,
        coupons,
        settings,
        currentUser,
        isAdminLoggedIn,
        authLoading,
        adminMetrics,
        fetchAdminData,
        toasts,
        addToast,
        removeToast,
        addProduct,
        updateProduct,
        deleteProduct,
        createOrder,
        updateOrderStatus,
        addCoupon,
        deleteCoupon,
        updateSettings,
        fetchSettings,
        updateProfile,
        login,
        register,
        logout,
        setIsAdminLoggedIn
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
