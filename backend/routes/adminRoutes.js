import express from 'express';
import {
  getAdminDashboard,
  getAdminAnalytics,
  getAdminProducts,
  getAdminOrders,
  updateOrderStatus,
  refundOrder,
  getAdminCustomers,
  getAdminInventory,
  getAdminSales,
  getAdminCoupons,
  createAdminCoupon,
  deleteAdminCoupon
} from '../controllers/adminController.js';
import { requireAdmin } from '../middleware/auth.js';

import { getSettings, updateSettings } from '../controllers/settingController.js';

const router = express.Router();

// Apply requireAdmin to ALL admin routes
router.use(requireAdmin);

router.get('/dashboard', getAdminDashboard);
router.get('/analytics', getAdminAnalytics);
router.get('/products', getAdminProducts);
router.get('/orders', getAdminOrders);
router.patch('/orders/:id/status', updateOrderStatus);
router.post('/orders/:id/refund', refundOrder);
router.get('/customers', getAdminCustomers);
router.get('/users', getAdminCustomers);
router.get('/inventory', getAdminInventory);
router.get('/sales', getAdminSales);
router.get('/coupons', getAdminCoupons);
router.post('/coupons', createAdminCoupon);
router.delete('/coupons/:id', deleteAdminCoupon);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

export default router;
