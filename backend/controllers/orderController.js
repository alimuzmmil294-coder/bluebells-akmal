import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import { createOrderService, updateOrderStatusService } from '../services/orderService.js';

export async function createOrder(req, res, next) {
  try {
    const { customer, items, couponCode, paymentMethod, shippingMethod, notes } = req.body;

    const newOrder = await createOrderService({
      customer,
      items,
      couponCode,
      paymentMethod,
      shippingMethod,
      notes,
      user: req.user || null
    });

    // Store order in session so guest checkout confirmation pages function safely without public leaks
    if (req.session) {
      if (!Array.isArray(req.session.recentOrders)) {
        req.session.recentOrders = [];
      }
      req.session.recentOrders.push(newOrder.orderNumber);
      if (newOrder._id) {
        req.session.recentOrders.push(newOrder._id.toString());
      }
    }

    // Clear cart in database if cart existed
    try {
      const userId = req.session?.userId || null;
      const sessionId = req.sessionID || 'anon';
      const cartQuery = userId
        ? { $or: [{ user: userId }, { sessionId }] }
        : { sessionId };
      await Cart.updateOne(
        cartQuery,
        { $set: { items: [], couponCode: null } }
      );
    } catch (cartErr) {
      console.warn('Could not clear persistent cart after checkout:', cartErr.message);
    }

    res.status(201).json({
      success: true,
      message: `Order #${newOrder.orderNumber} placed successfully!`,
      data: {
        ...newOrder.toObject(),
        id: newOrder.orderNumber
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyOrders(req, res, next) {
  try {
    const userId = req.session?.userId;
    const userEmail = req.user?.email || req.query.email;

    if (!userId && !userEmail) {
      return res.status(200).json({ success: true, data: [] });
    }

    const query = {
      $or: [
        ...(userId ? [{ user: userId }] : []),
        ...(userEmail ? [{ 'customer.email': userEmail.toLowerCase().trim() }] : [])
      ]
    };

    const orders = await Order.find(query).sort({ createdAt: -1 }).lean();

    const formatted = orders.map((o) => ({
      ...o,
      id: o.orderNumber
    }));

    res.status(200).json({
      success: true,
      data: formatted
    });
  } catch (err) {
    next(err);
  }
}

export async function getOrderById(req, res, next) {
  try {
    const { id } = req.params;

    const order = await Order.findOne({
      $or: [
        { orderNumber: id },
        ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])
      ]
    }).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        error: `Order "${id}" was not found.`
      });
    }

    // Access control:
    // Allow access ONLY if:
    // 1. User is an admin
    // 2. Authenticated user owns the order (order.user matches req.user._id)
    // 3. Current session placed this order (in req.session.recentOrders for guest checkout)
    if (req.user?.role !== 'admin') {
      const userMatches = req.user && order.user && order.user.toString() === req.user._id.toString();
      const sessionOrderMatches = req.session?.recentOrders && (
        req.session.recentOrders.includes(order.orderNumber) ||
        (order._id && req.session.recentOrders.includes(order._id.toString()))
      );

      if (!userMatches && !sessionOrderMatches) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You do not have permission to view this order.'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        ...order,
        id: order.orderNumber
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function cancelOrder(req, res, next) {
  try {
    const { id } = req.params;

    const order = await Order.findOne({ orderNumber: id });
    if (!order) {
      return res.status(404).json({ success: false, error: `Order "${id}" not found.` });
    }

    // Check ownership
    const isOwner = req.user && (
      (order.user && order.user.toString() === req.user._id.toString()) ||
      order.customer.email.toLowerCase() === req.user.email.toLowerCase()
    );
    const sessionOrderMatches = req.session?.recentOrders && (
      req.session.recentOrders.includes(order.orderNumber) ||
      (order._id && req.session.recentOrders.includes(order._id.toString()))
    );

    if (!isOwner && !sessionOrderMatches && req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    if (order.status !== 'Processing' && order.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        error: `Order cannot be cancelled because it is already ${order.status.toLowerCase()}.`
      });
    }

    const updated = await updateOrderStatusService(id, 'Cancelled', req.user);

    res.status(200).json({
      success: true,
      message: `Order #${id} has been cancelled.`,
      data: {
        ...updated.toObject(),
        id: updated.orderNumber
      }
    });
  } catch (err) {
    next(err);
  }
}
