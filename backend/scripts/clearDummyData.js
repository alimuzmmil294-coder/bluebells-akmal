import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../config/db.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import InventoryTx from '../models/InventoryTx.js';
import User from '../models/User.js';
import { SEED_PRODUCTS, SEED_COUPONS, ensureAdminAndSettings } from './seed.js';
import { removeDemoSeedData } from '../services/demoDataCleanup.js';
import { recordDailySnapshot } from '../services/analyticsService.js';

dotenv.config();

export async function clearDummyData() {
  console.log('[Cleanup] Connecting to MongoDB at process.env.MONGODB_URI...');
  await connectDB();

  const clearAllProducts = process.argv.includes('--all-products') || process.argv.includes('--force-all');
  const clearAllCoupons = process.argv.includes('--all-coupons') || process.argv.includes('--force-all');

  const dummyCustomIds = SEED_PRODUCTS.map((p) => p.customId);
  const dummyProductNames = SEED_PRODUCTS.map((p) => p.name);
  const dummyCouponCodes = SEED_COUPONS.map((c) => c.code);

  console.log('[Cleanup] Identifying and deleting seeded dummy records...');

  // 1. Delete dummy or all products
  const productFilter = clearAllProducts
    ? {}
    : {
        $or: [
          { customId: { $in: dummyCustomIds } },
          { name: { $in: dummyProductNames } }
        ]
      };

  const productDeleteRes = await Product.deleteMany(productFilter);
  console.log(`[Cleanup] Deleted ${productDeleteRes.deletedCount} dummy catalog product(s).`);

  // 2. Delete dummy coupons
  const couponFilter = clearAllCoupons ? {} : { code: { $in: dummyCouponCodes } };
  const couponDeleteRes = await Coupon.deleteMany(couponFilter);
  console.log(`[Cleanup] Deleted ${couponDeleteRes.deletedCount} dummy coupon(s).`);

  // 3. Delete demo orders and test inventory transactions
  await removeDemoSeedData();

  // If there are any orphaned inventory transactions from deleted dummy products, clean them
  const remainingInventoryTx = await InventoryTx.deleteMany({
    productCustomId: { $in: dummyCustomIds }
  });
  if (remainingInventoryTx.deletedCount > 0) {
    console.log(`[Cleanup] Deleted ${remainingInventoryTx.deletedCount} demo inventory transaction(s).`);
  }

  // 4. Ensure Master Admin user and default Setting singleton exist and are preserved
  await ensureAdminAndSettings();

  // 5. Reconcile DailyAnalytics snapshot
  await recordDailySnapshot();
  console.log('[Cleanup] Reconciled DailyAnalytics metrics.');

  const remainingProducts = await Product.countDocuments();
  const remainingCoupons = await Coupon.countDocuments();
  const adminCount = await User.countDocuments({ role: 'admin' });

  console.log('------------------------------------------------------------');
  console.log('[Cleanup] Database cleanup completed successfully! ✨');
  console.log(`[Cleanup] Active Store Status:`);
  console.log(`          - Products remaining in DB : ${remainingProducts}`);
  console.log(`          - Coupons remaining in DB  : ${remainingCoupons}`);
  console.log(`          - Admin accounts preserved : ${adminCount}`);
  console.log('------------------------------------------------------------');
}

// Execute directly if run as a script
if (process.argv[1]?.endsWith('clearDummyData.js')) {
  clearDummyData()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[Cleanup] Error during database cleanup:', err);
      await disconnectDB();
      process.exit(1);
    });
}
