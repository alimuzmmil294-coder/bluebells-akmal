import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import dotenv from 'dotenv';

dotenv.config();

// Ensure test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '5001';

const { app, server } = await import('../server.js');
const { default: User } = await import('../models/User.js');
const { default: Product } = await import('../models/Product.js');
const { default: Order } = await import('../models/Order.js');
const { default: InventoryTx } = await import('../models/InventoryTx.js');
const { default: DailyAnalytics } = await import('../models/DailyAnalytics.js');

let testServer;
let baseUrl;
let userCookie = '';
let adminCookie = '';

// Helper to make HTTP requests
async function request(endpoint, options = {}) {
  const url = `${baseUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...options.headers
  };

  const config = {
    method: options.method || 'GET',
    headers
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, config);
  const data = await res.json().catch(() => ({}));

  // Capture cookies
  const setCookie = res.headers.get('set-cookie');

  return {
    status: res.status,
    headers: res.headers,
    cookie: setCookie,
    data
  };
}

test.before(async () => {
  const { seedDatabase } = await import('../scripts/seed.js');
  await seedDatabase();
  await new Promise((resolve) => {
    testServer = server.listen(5001, () => {
      baseUrl = 'http://localhost:5001/api';
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => testServer.close(resolve));
  const { disconnectDB } = await import('../config/db.js');
  await disconnectDB();
  setTimeout(() => process.exit(0), 100);
});

test('1. Health check returns 200 OK', async () => {
  const res = await request('/health');
  assert.equal(res.status, 200);
  assert.equal(res.data.status, 'healthy');
});

test('Root route reports the API service status', async () => {
  const response = await fetch(baseUrl.replace(/\/api$/, '/'));
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.message, 'BlueBells API is running');
});

test('CORS allows configured storefront origins with credentials and rejects dashboard origins', async () => {
  const preflightResponse = await fetch(`${baseUrl}/auth/login`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:5173',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type'
    }
  });
  assert.equal(preflightResponse.status, 204);
  assert.equal(preflightResponse.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  assert.match(preflightResponse.headers.get('access-control-allow-methods'), /POST/);

  const allowedResponse = await fetch(`${baseUrl}/health`, {
    headers: { Origin: 'http://localhost:5173' }
  });
  assert.equal(allowedResponse.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  assert.equal(allowedResponse.headers.get('access-control-allow-credentials'), 'true');

  const deployedOriginResponse = await fetch(`${baseUrl}/health`, {
    headers: { Origin: 'https://bluebells-akmal-5st6.vercel.app' }
  });
  assert.equal(
    deployedOriginResponse.headers.get('access-control-allow-origin'),
    'https://bluebells-akmal-5st6.vercel.app'
  );

  const rejectedResponse = await fetch(`${baseUrl}/health`, {
    headers: { Origin: 'https://vercel.com' }
  });
  assert.equal(rejectedResponse.headers.get('access-control-allow-origin'), null);

  const unconfiguredOriginResponse = await fetch(`${baseUrl}/health`, {
    headers: { Origin: 'https://untrusted.example' }
  });
  assert.equal(unconfiguredOriginResponse.headers.get('access-control-allow-origin'), null);
});

test('Vercel serverless handler forwards API requests to Express', async () => {
  const { default: handler } = await import('../api/[...path].js');
  const serverlessServer = http.createServer(handler);
  await new Promise((resolve) => serverlessServer.listen(0, '127.0.0.1', resolve));

  try {
    const { port } = serverlessServer.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/health`);
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.status, 'healthy');
  } finally {
    await new Promise((resolve, reject) => {
      serverlessServer.close((err) => (err ? reject(err) : resolve()));
    });
  }
});

test('Namespaced Vercel handler forwards nested auth routes to Express', async () => {
  const { default: handler } = await import('../api/auth/[...path].js');
  const namespacedServer = http.createServer(handler);
  await new Promise((resolve) => namespacedServer.listen(0, '127.0.0.1', resolve));

  try {
    const { port } = namespacedServer.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/auth/me`);
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.success, true);
  } finally {
    await new Promise((resolve, reject) => {
      namespacedServer.close((err) => (err ? reject(err) : resolve()));
    });
  }
});

test('2. User Registration and Password Hashing with bcrypt', async () => {
  const email = `testuser_${Date.now()}@example.com`;
  const res = await request('/auth/register', {
    method: 'POST',
    body: {
      name: 'Test Customer',
      email,
      password: 'mypassword123',
      phone: '+92 300 9999999'
    }
  });

  assert.equal(res.status, 201);
  assert.equal(res.data.success, true);
  assert.equal(res.data.user.email, email.toLowerCase());
  assert.equal(res.data.user.role, 'user');
  assert.equal(res.data.user.password, undefined); // Password must NEVER be returned

  // Verify hash in MongoDB
  const dbUser = await User.findOne({ email }).select('+password');
  assert.notEqual(dbUser.password, 'mypassword123');
  assert.ok(dbUser.password.startsWith('$2')); // bcrypt salt
});

test('3. Login with correct credentials returns 200 and sets session cookie', async () => {
  const email = `login_test_${Date.now()}@example.com`;
  await request('/auth/register', {
    method: 'POST',
    body: { name: 'Login User', email, password: 'securePassword789' }
  });

  const res = await request('/auth/login', {
    method: 'POST',
    body: { email, password: 'securePassword789' }
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  assert.ok(res.cookie, 'Session cookie should be set');
  userCookie = res.cookie.split(';')[0];
});

test('4. Login with invalid password returns 401 Unauthorized', async () => {
  const res = await request('/auth/login', {
    method: 'POST',
    body: { email: 'admin@bluebells.pk', password: 'wrongPasswordXYZ' }
  });
  assert.equal(res.status, 401);
  assert.equal(res.data.success, false);
});

test('5. Session Persistence via /api/auth/me', async () => {
  const res = await request('/auth/me', {
    headers: { Cookie: userCookie }
  });
  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  assert.ok(res.data.user);
  assert.equal(res.data.user.role, 'user');
});

test('6. Role Authorization: Regular user cannot access /api/admin/dashboard', async () => {
  const res = await request('/admin/dashboard', {
    headers: { Cookie: userCookie }
  });
  assert.equal(res.status, 403);
  assert.equal(res.data.success, false);
});

test('Admin routes reject unauthenticated requests and client-supplied admin claims', async () => {
  const anonymousResponse = await request('/admin/dashboard');
  assert.equal(anonymousResponse.status, 401);

  const forgedHeaderResponse = await request('/admin/dashboard', {
    headers: { 'x-admin-auth': 'true', 'x-admin': 'true' }
  });
  assert.equal(forgedHeaderResponse.status, 401);

  const invalidBearerResponse = await request('/admin/dashboard', {
    headers: { Authorization: 'Bearer not-a-session' }
  });
  assert.equal(invalidBearerResponse.status, 401);
});

test('7. Admin Login and Access to /api/admin/dashboard', async () => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@bluebells.pk';
  const adminPassword = process.env.ADMIN_PASSWORD || 'adminpass';
  const adminRes = await request('/auth/login', {
    method: 'POST',
    body: { email: adminEmail, password: adminPassword }
  });

  assert.equal(adminRes.status, 200);
  assert.ok(adminRes.cookie);
  adminCookie = adminRes.cookie.split(';')[0];

  const dashRes = await request('/admin/dashboard', {
    headers: { Cookie: adminCookie }
  });

  assert.equal(dashRes.status, 200);
  assert.equal(dashRes.data.success, true);
  assert.ok(dashRes.data.data.totalProductsInInventory >= 1);
});

test('8. Server-side Pagination for Product Catalog', async () => {
  const res = await request('/products?page=1&limit=4');
  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  assert.equal(res.data.page, 1);
  assert.equal(res.data.limit, 4);
  assert.equal(res.data.data.length, 4);
  assert.ok(res.data.total >= 4);
  assert.ok(res.data.totalPages >= 1);
  assert.equal(res.data.hasNextPage, true);
  assert.equal(res.data.hasPrevPage, false);
});

test('9. Admin Product Creation, Update, and Safe Deactivation', async () => {
  const customId = `test-flagship-${Date.now()}`;
  const createRes = await request('/products', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: {
      customId,
      name: 'Test Prototype Pro Max',
      brand: 'Apple',
      category: 'iphone',
      price: 499000,
      stock: 15,
      image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569'
    }
  });

  assert.equal(createRes.status, 201);
  assert.equal(createRes.data.data.name, 'Test Prototype Pro Max');
  const prodId = createRes.data.data.id;

  // Update
  const updateRes = await request(`/products/${prodId}`, {
    method: 'PUT',
    headers: { Cookie: adminCookie },
    body: { price: 510000, stock: 20 }
  });
  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.data.data.price, 510000);
  assert.equal(updateRes.data.data.stock, 20);

  // Delete
  const delRes = await request(`/products/${prodId}`, {
    method: 'DELETE',
    headers: { Cookie: adminCookie }
  });
  assert.equal(delRes.status, 200);
  assert.equal(delRes.data.success, true);
});

test('Product options keep image limits and use the selected PTA storage price in cart and orders', async () => {
  const customId = `variant-phone-${Date.now()}`;
  const createRes = await request('/products', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: {
      customId,
      name: 'Variant Pricing Test Phone',
      brand: 'Apple',
      category: 'iphone',
      series: 'Variant Series',
      price: 500,
      stock: 5,
      colors: [{ name: 'Midnight', hex: '#171717' }],
      specifications: { Display: '6.1-inch OLED' },
      image: 'https://images.example.com/phone-front.jpg',
      gallery: [
        'https://images.example.com/phone-front.jpg',
        'https://images.example.com/phone-back.jpg',
        'https://images.example.com/phone-side.jpg'
      ],
      storageOptions: ['64GB', '128GB'],
      variants: [
        { storage: '64GB', ptaStatus: 'PTA Approved', price: 500 },
        { storage: '64GB', ptaStatus: 'Non-PTA', price: 400 },
        { storage: '128GB', ptaStatus: 'PTA Approved', price: 700 },
        { storage: '128GB', ptaStatus: 'Non-PTA', price: 600 }
      ]
    }
  });

  assert.equal(createRes.status, 201);
  assert.equal(createRes.data.data.price, 500);
  assert.equal(createRes.data.data.gallery.length, 3);
  assert.equal(createRes.data.data.colors[0].name, 'Midnight');
  assert.equal(createRes.data.data.specifications.Display, '6.1-inch OLED');

  const tooManyImagesRes = await request('/products', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: {
      name: 'Too Many Images',
      brand: 'Apple',
      category: 'iphone',
      price: 1,
      stock: 1,
      image: 'https://images.example.com/one.jpg',
      gallery: [
        'https://images.example.com/one.jpg',
        'https://images.example.com/two.jpg',
        'https://images.example.com/three.jpg',
        'https://images.example.com/four.jpg'
      ]
    }
  });
  assert.equal(tooManyImagesRes.status, 400);

  const updateRes = await request(`/products/${customId}`, {
    method: 'PUT',
    headers: { Cookie: adminCookie },
    body: {
      gallery: [
        'https://images.example.com/phone-front.jpg',
        'https://images.example.com/phone-back.jpg'
      ],
      variants: [
        { storage: '64GB', ptaStatus: 'PTA Approved', price: 500 },
        { storage: '64GB', ptaStatus: 'Non-PTA', price: 400 },
        { storage: '128GB', ptaStatus: 'PTA Approved', price: 700 },
        { storage: '128GB', ptaStatus: 'Non-PTA', price: 600 }
      ],
      series: 'Updated Variant Series',
      colors: [{ name: 'Graphite', hex: '#333333' }],
      specifications: { Display: 'Updated OLED' }
    }
  });
  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.data.data.gallery.length, 2);
  assert.equal(updateRes.data.data.series, 'Updated Variant Series');
  assert.equal(updateRes.data.data.colors[0].name, 'Graphite');
  assert.equal(updateRes.data.data.specifications.Display, 'Updated OLED');

  const invalidCartRes = await request('/cart/items', {
    method: 'POST',
    headers: { Cookie: userCookie },
    body: { productId: customId, storage: '256GB', ptaStatus: 'Non-PTA' }
  });
  assert.equal(invalidCartRes.status, 400);

  const cartRes = await request('/cart/items', {
    method: 'POST',
    headers: { Cookie: userCookie },
    body: {
      productId: customId,
      quantity: 1,
      storage: '64GB',
      ptaStatus: 'Non-PTA'
    }
  });
  assert.equal(cartRes.status, 200);
  assert.equal(cartRes.data.data.items[0].price, 400);
  assert.equal(cartRes.data.data.items[0].ptaStatus, 'Non-PTA');

  const simulatedPaymentRes = await request('/orders', {
    method: 'POST',
    headers: { Cookie: userCookie },
    body: { paymentMethod: 'bank_transfer', items: [{ id: customId }] }
  });
  assert.equal(simulatedPaymentRes.status, 400);

  const orderRes = await request('/orders', {
    method: 'POST',
    headers: { Cookie: userCookie },
    body: {
      customer: {
        fullName: 'Variant Test Customer',
        email: 'variant-test@example.com',
        phone: '+92 300 0000000',
        address: 'Test street',
        city: 'Lahore'
      },
      items: [{
        id: customId,
        quantity: 1,
        storage: '64GB',
        ptaStatus: 'Non-PTA',
        price: 1
      }]
    }
  });

  assert.equal(orderRes.status, 201);
  assert.equal(orderRes.data.data.items[0].price, 400);
  assert.equal(orderRes.data.data.items[0].ptaStatus, 'Non-PTA');
});

test('10. Order Placement with Atomic Stock Decrement & Inventory Journal', async () => {
  // Find a product with stock
  let prod = await Product.findOne({ customId: 'iphone-16-pro-max' });
  assert.ok(prod, 'Sample iPhone 16 Pro Max exists in database');
  if (prod.stock < 5) {
    prod.stock = 25;
    await prod.save();
  }
  const initialStock = prod.stock;

  const orderRes = await request('/orders', {
    method: 'POST',
    headers: { Cookie: userCookie },
    body: {
      customer: {
        fullName: 'Zainab Qasim',
        email: 'zainab.q@example.com',
        phone: '+92 300 7788990',
        address: '42 Main Boulevard',
        city: 'Lahore'
      },
      items: [
        {
          id: 'iphone-16-pro-max',
          quantity: 2,
          storage: '256GB',
          color: 'Desert Titanium'
        }
      ],
      paymentMethod: 'cod'
    }
  });

  assert.equal(orderRes.status, 201);
  assert.equal(orderRes.data.success, true);
  assert.ok(orderRes.data.data.orderNumber.startsWith('BB-2026-'));

  const adminOrdersRes = await request(
    `/admin/orders?search=${encodeURIComponent(orderRes.data.data.orderNumber)}`,
    { headers: { Cookie: adminCookie } }
  );
  assert.equal(adminOrdersRes.status, 200);
  assert.equal(adminOrdersRes.data.total, 1);
  assert.equal(adminOrdersRes.data.data[0].orderNumber, orderRes.data.data.orderNumber);
  assert.equal(adminOrdersRes.data.data[0].customer.fullName, 'Zainab Qasim');
  assert.equal(adminOrdersRes.data.data[0].customer.email, 'zainab.q@example.com');
  assert.equal(adminOrdersRes.data.data[0].items[0].quantity, 2);
  assert.equal(adminOrdersRes.data.data[0].items[0].price, prod.price);
  assert.equal(adminOrdersRes.data.data[0].subtotal, prod.price * 2);
  assert.equal(adminOrdersRes.data.data[0].grandTotal, orderRes.data.data.grandTotal);

  // Verify atomic stock decrement in MongoDB
  const updatedProd = await Product.findOne({ customId: 'iphone-16-pro-max' });
  assert.equal(updatedProd.stock, initialStock - 2);

  // Verify persistent InventoryTx record
  const tx = await InventoryTx.findOne({
    orderNumber: orderRes.data.data.orderNumber,
    type: 'SALE'
  });
  assert.ok(tx, 'Inventory transaction journaled');
  assert.equal(tx.quantityDelta, -2);
  assert.equal(tx.newStock, initialStock - 2);
});

test('Admin analytics reports sales by brand from recorded orders', async () => {
  const response = await request('/admin/analytics', {
    headers: { Cookie: adminCookie }
  });

  assert.equal(response.status, 200);
  assert.equal(response.data.success, true);
  assert.ok(Array.isArray(response.data.data.brandShare));
  assert.ok(Array.isArray(response.data.data.categoryShare));
  assert.equal(response.data.data.monthlyData.length, 6);

  const appleSales = response.data.data.brandShare.find((brand) => brand.key === 'apple');
  assert.ok(appleSales, 'Apple sales are included in the brand breakdown');
  assert.ok(appleSales.amount > 0);
  assert.ok(appleSales.share > 0);

  const dashboardResponse = await request('/admin/dashboard', {
    headers: { Cookie: adminCookie }
  });
  assert.equal(dashboardResponse.status, 200);
  assert.ok(dashboardResponse.data.data.recentOrders.every((order) => order.id === order.orderNumber));

  const customersResponse = await request('/admin/customers?page=1&limit=10', {
    headers: { Cookie: adminCookie }
  });
  assert.equal(customersResponse.status, 200);
  assert.equal(customersResponse.data.success, true);
  assert.ok(Array.isArray(customersResponse.data.data));
  assert.equal(customersResponse.data.page, 1);
  assert.equal(customersResponse.data.limit, 10);
  assert.ok(typeof customersResponse.data.total === 'number');
});

test('11. Failed inventory journaling rolls back the order and reserved stock', async () => {
  const prod = await Product.findOne({ customId: 'iphone-16-pro-max' });
  const initialStock = prod.stock;
  const initialSaleTxCount = await InventoryTx.countDocuments({ product: prod._id, type: 'SALE' });
  const email = `rollback_${Date.now()}@example.com`;
  const originalCreate = InventoryTx.create;
  InventoryTx.create = async () => {
    throw new Error('Simulated inventory journal failure');
  };

  let response;
  try {
    response = await request('/orders', {
      method: 'POST',
      headers: { Cookie: userCookie },
      body: {
        customer: {
          fullName: 'Rollback Test',
          email,
          phone: '+92 300 0000000',
          address: 'Test street',
          city: 'Lahore'
        },
        items: [{ id: 'iphone-16-pro-max', quantity: 1 }]
      }
    });
  } finally {
    InventoryTx.create = originalCreate;
  }

  assert.equal(response.status, 500);
  assert.equal((await Product.findById(prod._id)).stock, initialStock);
  assert.equal(await Order.countDocuments({ 'customer.email': email }), 0);
  assert.equal(await InventoryTx.countDocuments({ product: prod._id, type: 'SALE' }), initialSaleTxCount);
});

test('12. Anonymous cart persists, coupon removal retains items, and login adopts the cart', async () => {
  const initialCart = await request('/cart');
  assert.equal(initialCart.status, 200);
  assert.ok(initialCart.cookie, 'Anonymous cart should initialize a persistent session');
  const guestCookie = initialCart.cookie.split(';')[0];

  const addRes = await request('/cart/items', {
    method: 'POST',
    headers: { Cookie: guestCookie },
    body: {
      productId: 'iphone-16-pro-max',
      quantity: 1,
      storage: '256GB',
      color: 'Desert Titanium'
    }
  });
  assert.equal(addRes.status, 200);
  assert.equal(addRes.data.data.items.length, 1);

  const removeItemRes = await request(
    `/cart/items/${encodeURIComponent(addRes.data.data.items[0].cartItemId)}`,
    { method: 'DELETE', headers: { Cookie: guestCookie } }
  );
  assert.equal(removeItemRes.status, 200);
  assert.equal(removeItemRes.data.success, true);
  assert.equal(removeItemRes.data.data.items.length, 0);

  const reAddRes = await request('/cart/items', {
    method: 'POST',
    headers: { Cookie: guestCookie },
    body: {
      productId: 'iphone-16-pro-max',
      quantity: 1,
      storage: '256GB',
      color: 'Desert Titanium'
    }
  });
  assert.equal(reAddRes.status, 200);
  assert.equal(reAddRes.data.data.items.length, 1);

  const couponRes = await request('/cart/coupon', {
    method: 'POST',
    headers: { Cookie: guestCookie },
    body: { code: 'BLUEBELLS10' }
  });
  assert.equal(couponRes.status, 200);
  assert.equal(couponRes.data.data.coupon.minSpend, 50000);

  const removeCouponRes = await request('/cart/coupon', {
    method: 'DELETE',
    headers: { Cookie: guestCookie }
  });
  assert.equal(removeCouponRes.status, 200);
  assert.equal(removeCouponRes.data.data.items.length, 1);
  assert.equal(removeCouponRes.data.data.couponCode, null);

  const cartUserEmail = `cart_migration_${Date.now()}@example.com`;
  const registerRes = await request('/auth/register', {
    method: 'POST',
    headers: { Cookie: guestCookie },
    body: { name: 'Cart Migration Customer', email: cartUserEmail, password: 'securePassword789' }
  });
  assert.equal(registerRes.status, 201);

  const loginRes = await request('/auth/login', {
    method: 'POST',
    headers: { Cookie: guestCookie },
    body: { email: cartUserEmail, password: 'securePassword789' }
  });
  assert.equal(loginRes.status, 200);
  const authenticatedCookie = loginRes.cookie.split(';')[0];

  const authenticatedCart = await request('/cart', {
    headers: { Cookie: authenticatedCookie }
  });
  assert.equal(authenticatedCart.status, 200);
  assert.equal(authenticatedCart.data.data.items.length, 1);
  assert.equal(authenticatedCart.data.data.items[0].productId, 'iphone-16-pro-max');
});

test('13. Persistent Daily Analytics Snapshot', async () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const snap = await DailyAnalytics.findOne({ date: todayStr });
  assert.ok(snap, 'Daily analytics snapshot exists');

  const startOfDay = new Date(todayStr);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(todayStr);
  endOfDay.setHours(23, 59, 59, 999);
  const actualOrders = await Order.find({
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  }).lean();
  const qualifyingOrders = actualOrders.filter((order) => !['Cancelled', 'Refunded'].includes(order.status));
  const expectedSales = qualifyingOrders.reduce((total, order) => total + order.subtotal, 0);
  const expectedProfit = qualifyingOrders.reduce((total, order) => total + order.grandTotal - order.totalCost, 0);

  assert.equal(snap.orderCount, qualifyingOrders.length);
  assert.equal(snap.grossSales, expectedSales);
  assert.equal(snap.grossProfit, expectedProfit);
});

test('14. Admin Order Refund restores inventory and updates DailyAnalytics', async () => {
  const prod = await Product.findOne({ customId: 'samsung-galaxy-s24-ultra' });
  const stockBefore = prod.stock;

  const orderRes = await request('/orders', {
    method: 'POST',
    headers: { Cookie: userCookie },
    body: {
      customer: {
        fullName: 'Refund Test Customer',
        email: 'refund.test@example.com',
        phone: '+92 300 1122334',
        address: 'Test Address',
        city: 'Lahore'
      },
      items: [{ id: 'samsung-galaxy-s24-ultra', quantity: 1 }],
      paymentMethod: 'cod'
    }
  });

  assert.equal(orderRes.status, 201);
  const orderNumber = orderRes.data.data.orderNumber;

  // Process refund as admin
  const refundRes = await request(`/admin/orders/${orderNumber}/refund`, {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: {
      refundAmount: orderRes.data.data.grandTotal,
      reason: 'Defective screen unit returned',
      restoreInventory: true
    }
  });

  assert.equal(refundRes.status, 200);
  assert.equal(refundRes.data.data.status, 'Refunded');
  assert.equal(refundRes.data.data.paymentStatus, 'Refunded');

  // Verify stock was restored
  const restoredProd = await Product.findOne({ customId: 'samsung-galaxy-s24-ultra' });
  assert.equal(restoredProd.stock, stockBefore);

  // Verify RETURN_REFUND inventory transaction
  const refundTx = await InventoryTx.findOne({
    orderNumber,
    type: 'RETURN_REFUND'
  });
  assert.ok(refundTx, 'RETURN_REFUND inventory transaction journaled');
  assert.equal(refundTx.quantityDelta, 1);
});

test('15. Security: Unauthenticated product mutation routes return 401 Unauthorized', async () => {
  const postRes = await request('/products', {
    method: 'POST',
    body: { name: 'Unauthorized Prototype', brand: 'Apple', price: 100 }
  });
  assert.equal(postRes.status, 401);

  const putRes = await request('/products/iphone-16-pro-max', {
    method: 'PUT',
    body: { price: 1 }
  });
  assert.equal(putRes.status, 401);

  const deleteRes = await request('/products/iphone-16-pro-max', {
    method: 'DELETE'
  });
  assert.equal(deleteRes.status, 401);
});

test('16. Security: Insecure email query param on order detail returns 403 (Anti-IDOR)', async () => {
  const orderRes = await request('/orders', {
    method: 'POST',
    body: {
      customer: {
        fullName: 'Private Customer',
        email: 'private.user@example.com',
        phone: '+92 300 5551234',
        address: 'Secret Residence',
        city: 'Islamabad'
      },
      items: [{ id: 'iphone-16-pro-max', quantity: 1 }],
      paymentMethod: 'cod'
    }
  });
  assert.equal(orderRes.status, 201);
  const orderNumber = orderRes.data.data.orderNumber;
  const guestCookie = orderRes.cookie ? orderRes.cookie.split(';')[0] : '';

  // Attempt to access from a separate anonymous requester using ?email query
  const intruderRes = await request(`/orders/${orderNumber}?email=private.user@example.com`);
  assert.equal(intruderRes.status, 403);
  assert.equal(intruderRes.data.success, false);

  // The session that placed the order CAN access it
  if (guestCookie) {
    const ownerRes = await request(`/orders/${orderNumber}`, {
      headers: { Cookie: guestCookie }
    });
    assert.equal(ownerRes.status, 200);
    assert.equal(ownerRes.data.data.orderNumber, orderNumber);
  }

  // And an admin CAN access it
  const adminAccessRes = await request(`/orders/${orderNumber}`, {
    headers: { Cookie: adminCookie }
  });
  assert.equal(adminAccessRes.status, 200);
  assert.equal(adminAccessRes.data.data.orderNumber, orderNumber);
});

test('17. Store Settings: Public GET and Admin-protected PUT persist in database', async () => {
  const getRes = await request('/settings');
  assert.equal(getRes.status, 200);
  assert.equal(getRes.data.success, true);
  assert.ok(getRes.data.data.storeName);

  // Unauthenticated PUT should return 401
  const unauthPut = await request('/settings', {
    method: 'PUT',
    body: { storeName: 'Hacked Store' }
  });
  assert.equal(unauthPut.status, 401);

  // Admin PUT should update settings
  const adminPut = await request('/admin/settings', {
    method: 'PUT',
    headers: { Cookie: adminCookie },
    body: {
      storeName: 'BlueBells Flagship Peshawar',
      standardShippingFee: 1200,
      freeShippingThreshold: 60000
    }
  });
  assert.equal(adminPut.status, 200);
  assert.equal(adminPut.data.success, true);
  assert.equal(adminPut.data.data.storeName, 'BlueBells Flagship Peshawar');
  assert.equal(adminPut.data.data.standardShippingFee, 1200);
  assert.equal(adminPut.data.data.freeShippingThreshold, 60000);

  // Subsequent public GET reflects persisted changes
  const updatedGet = await request('/settings');
  assert.equal(updatedGet.status, 200);
  assert.equal(updatedGet.data.data.storeName, 'BlueBells Flagship Peshawar');
});

