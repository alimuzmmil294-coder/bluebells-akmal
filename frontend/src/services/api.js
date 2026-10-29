// Use '/api' as canonical base URL:
// - In dev: Vite dev server proxies '/api' to http://127.0.0.1:5000 (vite.config.js)
// - In prod: Vercel edge proxies '/api/:path*' to https://bluebells-akmal.vercel.app/api/:path* (vercel.json)
// Explicit VITE_API_URL or VITE_API_BASE_URL (e.g. direct https://bluebells-akmal.vercel.app/api) is respected when provided.
const rawApiUrl = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').trim().replace(
  'https://bluebells-backend.vercel.app',
  'https://bluebells-akmal.vercel.app'
);
const defaultBaseUrl = '/api';
const BASE_URL = (rawApiUrl || defaultBaseUrl).replace(/\/+$/, '');

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const token = typeof window !== 'undefined' ? localStorage.getItem('bluebells_auth_token') : null;

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers = {
    Accept: 'application/json',
    ...options.headers
  };

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    credentials: 'include',
    headers
  };

  if (options.body && typeof options.body === 'object' && !isFormData) {
    config.body = JSON.stringify(options.body);
  } else if (isFormData) {
    config.body = options.body;
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
      const error = new Error(errorMsg);
      error.status = response.status;
      error.details = data.details || null;
      throw error;
    }

    return data;
  } catch (err) {
    throw err;
  }
}

export const api = {
  // Auth
  auth: {
    login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
    register: (userData) => request('/auth/register', { method: 'POST', body: userData }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    me: () => request('/auth/me', { method: 'GET' }),
    updateProfile: (profileData) => request('/auth/profile', { method: 'PUT', body: profileData })
  },

  // Products
  products: {
    getAll: (params = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          qs.append(key, val);
        }
      });
      const queryString = qs.toString() ? `?${qs.toString()}` : '';
      return request(`/products${queryString}`);
    },
    getById: (id) => request(`/products/${encodeURIComponent(id)}`),
    getBrands: () => request('/products/brands'),
    getCategories: () => request('/products/categories'),
    create: (productData) => request('/products', { method: 'POST', body: productData }),
    update: (id, productData) => request(`/products/${encodeURIComponent(id)}`, { method: 'PUT', body: productData }),
    delete: (id) => request(`/products/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },

  // Cart
  cart: {
    get: () => request('/cart'),
    addItem: (item) => request('/cart/items', { method: 'POST', body: item }),
    updateQuantity: (cartItemId, delta) => request(`/cart/items/${encodeURIComponent(cartItemId)}`, { method: 'PUT', body: { delta } }),
    removeItem: (cartItemId) => request(`/cart/items/${encodeURIComponent(cartItemId)}`, { method: 'DELETE' }),
    clear: () => request('/cart', { method: 'DELETE' }),
    applyCoupon: (code) => request('/cart/coupon', { method: 'POST', body: { code } }),
    removeCoupon: () => request('/cart/coupon', { method: 'DELETE' })
  },

  // Orders
  orders: {
    create: (orderData) => request('/orders', { method: 'POST', body: orderData }),
    getMyOrders: (email) => {
      const q = email ? `?email=${encodeURIComponent(email)}` : '';
      return request(`/orders/my-orders${q}`);
    },
    getById: (id, email) => {
      const q = email ? `?email=${encodeURIComponent(email)}` : '';
      return request(`/orders/${id}${q}`);
    },
    cancel: (id) => request(`/orders/${id}/cancel`, { method: 'PATCH' })
  },

  // Admin Portal APIs
  admin: {
    getDashboard: () => request('/admin/dashboard'),
    getAnalytics: () => request('/admin/analytics'),
    getProducts: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/admin/products${qs ? `?${qs}` : ''}`);
    },
    getOrders: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/admin/orders${qs ? `?${qs}` : ''}`);
    },
    updateOrderStatus: (id, status) => request(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status } }),
    refundOrder: (id, refundData = {}) => request(`/admin/orders/${id}/refund`, { method: 'POST', body: refundData }),
    getCustomers: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/admin/customers${qs ? `?${qs}` : ''}`);
    },
    getInventory: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/admin/inventory${qs ? `?${qs}` : ''}`);
    },
    getSales: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/admin/sales${qs ? `?${qs}` : ''}`);
    },
    getCoupons: () => request('/admin/coupons'),
    createCoupon: (couponData) => request('/admin/coupons', { method: 'POST', body: couponData }),
    deleteCoupon: (id) => request(`/admin/coupons/${id}`, { method: 'DELETE' }),
    getSettings: () => request('/admin/settings'),
    updateSettings: (settingsData) => request('/admin/settings', { method: 'PUT', body: settingsData })
  },

  // Store Settings (Public & Admin)
  settings: {
    get: () => request('/settings'),
    update: (settingsData) => request('/admin/settings', { method: 'PUT', body: settingsData })
  }
};

export default api;
