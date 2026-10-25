import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import InventoryTx from '../models/InventoryTx.js';
import Coupon from '../models/Coupon.js';
import AuditLog from '../models/AuditLog.js';
import { getDashboardMetrics } from '../services/analyticsService.js';
import { updateOrderStatusService, processRefundService } from '../services/orderService.js';

export async function getAdminDashboard(req, res, next) {
  try {
    const metrics = await getDashboardMetrics();
    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (err) {
    next(err);
  }
}

export async function getAdminAnalytics(req, res, next) {
  try {
    const metrics = await getDashboardMetrics();
    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (err) {
    next(err);
  }
}

export async function getAdminProducts(req, res, next) {
  try {
    let { page = 1, limit = 20, search, brand, category, stockStatus } = req.query;

    page = Math.max(1, parseInt(page, 10) || 1);
    limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const filter = {};

    if (brand && brand !== 'All') {
      filter.brand = brand;
    }
    if (category && category !== 'All') {
      filter.category = category.toLowerCase();
    }
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { brand: { $regex: q, $options: 'i' } },
        { sku: { $regex: q, $options: 'i' } }
      ];
    }
    if (stockStatus === 'low') {
      filter.stock = { $gt: 0, $lte: 5 };
    } else if (stockStatus === 'out') {
      filter.stock = { $lte: 0 };
    }

    const skip = (page - 1) * limit;

    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const formatted = products.map((p) => ({
      ...p,
      id: p.customId || p._id.toString()
    }));

    const totalPages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      success: true,
      data: formatted,
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    });
  } catch (err) {
    next(err);
  }
}

export async function getAdminOrders(req, res, next) {
  try {
    let { page = 1, limit = 20, status, search } = req.query;

    page = Math.max(1, parseInt(page, 10) || 1);
    limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const filter = {};
    if (status && status !== 'All') {
      filter.status = status;
    }
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { orderNumber: { $regex: q, $options: 'i' } },
        { 'customer.fullName': { $regex: q, $options: 'i' } },
        { 'customer.email': { $regex: q, $options: 'i' } },
        { 'customer.phone': { $regex: q, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [total, orders] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const formatted = orders.map((o) => ({
      ...o,
      id: o.orderNumber
    }));

    const totalPages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      success: true,
      data: formatted,
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    });
  } catch (err) {
    next(err);
  }
}

export async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const updated = await updateOrderStatusService(id, status, req.user);

    res.status(200).json({
      success: true,
      message: `Order #${id} status updated to ${status}.`,
      data: {
        ...updated.toObject(),
        id: updated.orderNumber
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function refundOrder(req, res, next) {
  try {
    const { id } = req.params;
    const { refundAmount, reason, restoreInventory } = req.body;
    const updated = await processRefundService(id, {
      refundAmount: refundAmount ? Number(refundAmount) : undefined,
      reason,
      restoreInventory: restoreInventory !== undefined ? Boolean(restoreInventory) : true,
      adminUser: req.user
    });

    res.status(200).json({
      success: true,
      message: `Refund of Rs. ${updated.refundAmount.toLocaleString()} processed for Order #${updated.orderNumber}.`,
      data: {
        ...updated.toObject(),
        id: updated.orderNumber
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getAdminCustomers(req, res, next) {
  try {
    let { page = 1, limit = 50, search } = req.query;
    page = Math.max(1, parseInt(page, 10) || 1);
    limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    const filter = { role: 'user' };

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { city: { $regex: q, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    // Database-level pagination for the User collection
    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    // Targeted aggregation for only the requested page of users
    const userEmails = users.map((u) => u.email.toLowerCase());
    const userIds = users.map((u) => u._id);

    const orderAggregates = userEmails.length > 0
      ? await Order.aggregate([
          {
            $match: {
              $or: [
                { 'customer.email': { $in: userEmails } },
                { user: { $in: userIds } }
              ]
            }
          },
          {
            $group: {
              _id: { $toLower: '$customer.email' },
              orderCount: { $sum: 1 },
              totalSpent: { $sum: '$grandTotal' },
              firstOrderDate: { $min: '$createdAt' }
            }
          }
        ])
      : [];

    const statsMap = new Map(orderAggregates.map((agg) => [agg._id, agg]));

    const formattedCustomers = users.map((u) => {
      const emailLower = u.email.toLowerCase();
      const stats = statsMap.get(emailLower);
      return {
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        phone: u.phone || 'N/A',
        city: u.city || 'Lahore',
        orderCount: stats?.orderCount || 0,
        totalSpent: stats?.totalSpent || 0,
        joinedDate: new Date(stats?.firstOrderDate || u.createdAt).toISOString().split('T')[0]
      };
    });

    const totalPages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      success: true,
      data: formattedCustomers,
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    });
  } catch (err) {
    next(err);
  }
}

export async function getAdminInventory(req, res, next) {
  try {
    let { page = 1, limit = 50 } = req.query;
    page = Math.max(1, parseInt(page, 10) || 1);
    limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    const skip = (page - 1) * limit;

    const [total, products, recentTx] = await Promise.all([
      Product.countDocuments({}),
      Product.find({})
        .select('name brand category sku stock price costPrice active')
        .sort({ stock: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InventoryTx.find({})
        .populate('product', 'name sku')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      success: true,
      data: products.map((p) => ({ ...p, id: p.customId || p._id.toString() })),
      recentTransactions: recentTx,
      page,
      limit,
      total,
      totalPages
    });
  } catch (err) {
    next(err);
  }
}

export async function getAdminSales(req, res, next) {
  try {
    let { page = 1, limit = 50 } = req.query;
    page = Math.max(1, parseInt(page, 10) || 1);
    limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    const skip = (page - 1) * limit;

    const [total, orders] = await Promise.all([
      Order.countDocuments({ status: { $ne: 'Cancelled' } }),
      Order.find({ status: { $ne: 'Cancelled' } })
        .select('orderNumber customer grandTotal subtotal totalCost grossProfit status paymentStatus createdAt items')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      success: true,
      data: orders.map((o) => ({ ...o, id: o.orderNumber })),
      page,
      limit,
      total,
      totalPages
    });
  } catch (err) {
    next(err);
  }
}

export async function getAdminCoupons(req, res, next) {
  try {
    const coupons = await Coupon.find({}).sort({ createdAt: -1 }).lean();
    res.status(200).json({
      success: true,
      data: coupons.map((c) => ({ ...c, id: c._id.toString() }))
    });
  } catch (err) {
    next(err);
  }
}

export async function createAdminCoupon(req, res, next) {
  try {
    const { code, discountType, value, minSpend, description, expiresAt } = req.body;

    const existing = await Coupon.findOne({ code: code.trim().toUpperCase() });
    if (existing) {
      return res.status(409).json({ success: false, error: 'A coupon with this code already exists.' });
    }

    const coupon = await Coupon.create({
      code: code.trim().toUpperCase(),
      discountType: discountType || 'percentage',
      value: Number(value),
      minSpend: Number(minSpend || 0),
      description: description || '',
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      status: 'active'
    });

    res.status(201).json({
      success: true,
      message: `Coupon "${coupon.code}" created successfully.`,
      data: { ...coupon.toObject(), id: coupon._id.toString() }
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteAdminCoupon(req, res, next) {
  try {
    const { id } = req.params;
    await Coupon.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
}
