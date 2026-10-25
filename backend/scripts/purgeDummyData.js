import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../config/db.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import InventoryTx from '../models/InventoryTx.js';
import DailyAnalytics from '../models/DailyAnalytics.js';
import User from '../models/User.js';
import Setting from '../models/Setting.js';
import { ensureAdminAndSettings } from './seed.js';
import { recordDailySnapshot } from '../services/analyticsService.js';

dotenv.config();

export async function purgeDummyData() {
  console.log('[Purge] Connecting to MongoDB...');
  await connectDB();

  console.log('[Purge] Purging all store catalog, orders, carts, coupons, analytics, and non-admin users...');

  // 1. Delete all products
  const productRes = await Product.deleteMany({});
  console.log(`[Purge] Purged ${productRes.deletedCount} product(s).`);

  // 2. Delete all coupons
  const couponRes = await Coupon.deleteMany({});
  console.log(`[Purge] Purged ${couponRes.deletedCount} coupon(s).`);

  // 3. Delete all orders
  const orderRes = await Order.deleteMany({});
  console.log(`[Purge] Purged ${orderRes.deletedCount} order(s).`);

  // 4. Delete all carts
  const cartRes = await Cart.deleteMany({});
  console.log(`[Purge] Purged ${cartRes.deletedCount} active cart(s).`);

  // 5. Delete all inventory transactions
  const invRes = await InventoryTx.deleteMany({});
  console.log(`[Purge] Purged ${invRes.deletedCount} inventory journal transaction(s).`);

  // 6. Delete all daily analytics snapshots
  const analyticsRes = await DailyAnalytics.deleteMany({});
  console.log(`[Purge] Purged ${analyticsRes.deletedCount} daily analytics record(s).`);

  // 7. Delete all non-admin users
  const userRes = await User.deleteMany({ role: { $ne: 'admin' } });
  console.log(`[Purge] Purged ${userRes.deletedCount} non-admin user(s).`);

  // 8. Ensure Master Administrator account and default Setting singleton exist
  await ensureAdminAndSettings();

  // 9. Initialize fresh clean DailyAnalytics snapshot with 0 orders/revenue
  await recordDailySnapshot();
  console.log('[Purge] Initialized clean baseline DailyAnalytics snapshot.');

  const remainingProducts = await Product.countDocuments();
  const remainingCoupons = await Coupon.countDocuments();
  const remainingOrders = await Order.countDocuments();
  const remainingUsers = await User.countDocuments();
  const adminUsers = await User.find({ role: 'admin' }).select('name email role');

  console.log('============================================================');
  console.log('[Purge] Database purge completed successfully! ✨');
  console.log(`[Purge] Final Database State:`);
  console.log(`        - Products in database : ${remainingProducts}`);
  console.log(`        - Coupons in database  : ${remainingCoupons}`);
  console.log(`        - Orders in database   : ${remainingOrders}`);
  console.log(`        - Total Users in DB    : ${remainingUsers}`);
  console.log(`        - Admin accounts ready : ${adminUsers.map((a) => a.email).join(', ')}`);
  console.log('============================================================');
}

if (process.argv[1]?.endsWith('purgeDummyData.js')) {
  purgeDummyData()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[Purge] Error during database purge:', err);
      await disconnectDB();
      process.exit(1);
    });
}
