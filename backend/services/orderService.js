import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import InventoryTx from '../models/InventoryTx.js';
import Coupon from '../models/Coupon.js';
import AuditLog from '../models/AuditLog.js';
import { recordDailySnapshot } from './analyticsService.js';
import { resolveProductVariant } from './productVariantService.js';

export async function createOrderService({
  customer,
  items,
  couponCode,
  paymentMethod = 'cod',
  shippingMethod = 'express',
  notes = '',
  user = null
}) {
  if (paymentMethod !== 'cod') {
    const error = new Error('Cash on Delivery is the only available payment method.');
    error.statusCode = 400;
    throw error;
  }

  if (!items || !items.length) {
    throw new Error('Order must contain at least one product.');
  }

  // 1. Fetch real product records from MongoDB (source of truth)
  const productIds = items.map((i) => i.id);
  const productsInDb = await Product.find({
    $or: [
      { customId: { $in: productIds } },
      { _id: { $in: productIds.filter((id) => mongoose.isValidObjectId(id)) } }
    ]
  });

  const productMap = new Map();
  productsInDb.forEach((p) => {
    productMap.set(p._id.toString(), p);
    if (p.customId) {
      productMap.set(p.customId, p);
    }
  });

  // Verify all products exist, are active, and have sufficient inventory
  const productRequestedQty = new Map();
  for (const item of items) {
    const key = item.id;
    productRequestedQty.set(key, (productRequestedQty.get(key) || 0) + (Number(item.quantity) || 1));
  }

  for (const [prodId, totalRequested] of productRequestedQty.entries()) {
    const dbProduct = productMap.get(prodId);
    if (!dbProduct) {
      const error = new Error(`Product with ID "${prodId}" could not be found.`);
      error.statusCode = 404;
      throw error;
    }
    if (!dbProduct.active) {
      const error = new Error(`Product "${dbProduct.name}" is currently inactive and unavailable for purchase.`);
      error.statusCode = 400;
      throw error;
    }
    if (dbProduct.stock < totalRequested) {
      const error = new Error(`Insufficient stock for "${dbProduct.name}". Available: ${dbProduct.stock}, Requested: ${totalRequested}`);
      error.statusCode = 400;
      throw error;
    }
  }

  const validatedItems = [];
  let calculatedSubtotal = 0;
  let calculatedCost = 0;

  for (const item of items) {
    const dbProduct = productMap.get(item.id);
    const variant = resolveProductVariant(dbProduct, item.storage, item.ptaStatus);
    if (dbProduct.variants.length && !variant) {
      const error = new Error(`The selected storage and PTA option is not available for "${dbProduct.name}".`);
      error.statusCode = 400;
      throw error;
    }

    const itemPrice = variant?.price ?? dbProduct.price;
    const itemCost = dbProduct.costPrice || Math.round(itemPrice * 0.78);
    const lineTotal = itemPrice * item.quantity;

    calculatedSubtotal += lineTotal;
    calculatedCost += itemCost * item.quantity;

    validatedItems.push({
      product: dbProduct._id,
      productId: dbProduct.customId || dbProduct._id.toString(),
      name: dbProduct.name,
      brand: dbProduct.brand,
      category: dbProduct.category,
      image: item.image || dbProduct.image,
      storage: variant?.storage || item.storage || 'Standard',
      ptaStatus: variant?.ptaStatus || item.ptaStatus || 'Not Applicable',
      color: item.color || 'Default',
      colorHex: item.colorHex || '#000000',
      price: itemPrice,
      costPrice: itemCost,
      quantity: item.quantity,
      itemTotal: lineTotal
    });
  }

  // 2. Validate Coupon if provided
  let discountAmount = 0;
  let appliedCoupon = null;
  if (couponCode) {
    const coupon = await Coupon.findOne({
      code: couponCode.trim().toUpperCase(),
      status: 'active'
    });
    if (coupon) {
      const now = new Date();
      if (!coupon.expiresAt || new Date(coupon.expiresAt) > now) {
        if (calculatedSubtotal >= (coupon.minSpend || 0)) {
          if (coupon.discountType === 'percentage') {
            discountAmount = Math.round((calculatedSubtotal * coupon.value) / 100);
          } else {
            discountAmount = Math.min(coupon.value, calculatedSubtotal);
          }
          appliedCoupon = coupon;
        }
      }
    }
  }

  // 3. Shipping fee calculation (Free above Rs. 50,000)
  const shippingFee = calculatedSubtotal >= 50000 ? 0 : 1500;
  const grandTotal = Math.max(0, calculatedSubtotal - discountAmount + shippingFee);
  const grossProfit = grandTotal - calculatedCost;

  // 4. Atomic stock updates to prevent overselling
  const productDecrements = new Map();
  for (const item of validatedItems) {
    const pId = item.product.toString();
    productDecrements.set(pId, (productDecrements.get(pId) || 0) + item.quantity);
  }

  const stockUpdatedProducts = [];
  try {
    for (const [pId, totalDecrement] of productDecrements.entries()) {
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: pId, stock: { $gte: totalDecrement } },
        { $inc: { stock: -totalDecrement } },
        { returnDocument: 'after' }
      );

      if (!updatedProduct) {
        const prod = productMap.get(pId);
        const name = prod ? prod.name : 'product';
        const err = new Error(`Inventory conflict: insufficient stock for product "${name}".`);
        err.statusCode = 400;
        throw err;
      }
      stockUpdatedProducts.push({
        product: updatedProduct,
        quantity: totalDecrement
      });
    }
  } catch (stockErr) {
    // Parallel rollback of any stock decrements that were already made
    if (stockUpdatedProducts.length > 0) {
      await Promise.all(
        stockUpdatedProducts.map(({ product, quantity }) =>
          Product.findByIdAndUpdate(product._id, { $inc: { stock: quantity } })
        )
      );
    }
    throw stockErr;
  }

  // 5. Generate unique human-readable order number
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const orderNumber = `BB-${year}-${randomSuffix}`;

  // 6. Create the order and inventory journal, restoring stock if persistence fails.
  let newOrder;
  try {
    newOrder = await Order.create({
      orderNumber,
      user: user ? user._id : null,
      customer: {
        fullName: customer.fullName,
        email: customer.email.toLowerCase().trim(),
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        state: customer.state || 'Punjab',
        postalCode: customer.postalCode || '54000'
      },
      items: validatedItems,
      subtotal: calculatedSubtotal,
      shippingFee,
      discountAmount,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      grandTotal,
      totalCost: calculatedCost,
      grossProfit,
      status: 'Processing',
      paymentStatus: 'Pending',
      paymentMethod,
      shippingMethod,
      notes
    });

    for (const updated of stockUpdatedProducts) {
      const prod = updated.product;
      await InventoryTx.create({
        product: prod._id,
        sku: prod.sku,
        type: 'SALE',
        quantityDelta: -updated.quantity,
        previousStock: prod.stock + updated.quantity,
        newStock: prod.stock,
        order: newOrder._id,
        orderNumber: newOrder.orderNumber,
        performedBy: user ? user._id : null,
        reason: `Customer Order #${newOrder.orderNumber}`
      });
    }
  } catch (orderErr) {
    const rollbackOperations = [];
    if (newOrder) {
      rollbackOperations.push(InventoryTx.deleteMany({ order: newOrder._id }));
      rollbackOperations.push(Order.deleteOne({ _id: newOrder._id }));
    }
    rollbackOperations.push(...stockUpdatedProducts.map(({ product, quantity }) =>
      Product.findByIdAndUpdate(product._id, { $inc: { stock: quantity } })
    ));

    const rollbackResults = await Promise.allSettled(rollbackOperations);
    const rollbackErrors = rollbackResults
      .filter((result) => result.status === 'rejected')
      .map((result) => result.reason);
    if (rollbackErrors.length) {
      console.error('[Orders] Order persistence failed and rollback was incomplete:', rollbackErrors);
      throw new AggregateError([orderErr, ...rollbackErrors], 'Order failed and inventory rollback was incomplete.');
    }
    throw orderErr;
  }

  // 8. Update Coupon usage count
  if (appliedCoupon) {
    try {
      await Coupon.findByIdAndUpdate(appliedCoupon._id, { $inc: { usageCount: 1 } });
    } catch (couponErr) {
      console.error('[Orders] Order was saved but coupon usage could not be updated:', couponErr.message);
    }
  }

  // 9. Update persistent Daily Analytics snapshot
  try {
    await recordDailySnapshot();
  } catch (snapErr) {
    console.error('[Analytics] Snapshot update failed:', snapErr.message);
  }

  return newOrder;
}

export async function updateOrderStatusService(orderNumberOrId, newStatus, adminUser = null) {
  const query = mongoose.isValidObjectId(orderNumberOrId)
    ? { _id: orderNumberOrId }
    : { orderNumber: orderNumberOrId };

  const order = await Order.findOne(query);
  if (!order) {
    throw new Error(`Order "${orderNumberOrId}" not found.`);
  }

  const previousStatus = order.status;
  if (previousStatus === newStatus) {
    return order;
  }

  // Handle cancellation: restore inventory if moving to Cancelled
  if (newStatus === 'Cancelled' && previousStatus !== 'Cancelled') {
    await Promise.all(
      order.items.map(async (item) => {
        const restored = await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: item.quantity } },
          { returnDocument: 'after' }
        );
        if (restored) {
          await InventoryTx.create({
            product: restored._id,
            sku: restored.sku,
            type: 'CANCEL_RESTORE',
            quantityDelta: item.quantity,
            previousStock: restored.stock - item.quantity,
            newStock: restored.stock,
            order: order._id,
            orderNumber: order.orderNumber,
            performedBy: adminUser ? adminUser._id : null,
            reason: `Order #${order.orderNumber} cancelled by admin`
          });
        }
      })
    );
    order.cancelledAt = new Date();
  }

  order.status = newStatus;
  await order.save();

  // Audit log
  await AuditLog.create({
    action: 'ORDER_STATUS_CHANGED',
    performedBy: adminUser ? adminUser._id : null,
    adminEmail: adminUser ? adminUser.email : 'system',
    targetType: 'Order',
    targetId: order.orderNumber,
    details: { previousStatus, newStatus }
  });

  // Reconcile daily snapshot
  await recordDailySnapshot(order.createdAt);

  return order;
}

export async function processRefundService(orderNumberOrId, { refundAmount, reason = '', restoreInventory = true, adminUser = null }) {
  const query = mongoose.isValidObjectId(orderNumberOrId)
    ? { _id: orderNumberOrId }
    : { orderNumber: orderNumberOrId };

  const order = await Order.findOne(query);
  if (!order) {
    throw new Error(`Order "${orderNumberOrId}" not found.`);
  }

  const effectiveRefund = Math.min(refundAmount || order.grandTotal, order.grandTotal);
  order.refundAmount = effectiveRefund;
  order.refundedAt = new Date();
  order.paymentStatus = 'Refunded';
  order.status = 'Refunded';
  order.cancelReason = reason || 'Customer refund processed';

  if (restoreInventory) {
    await Promise.all(
      order.items.map(async (item) => {
        const restored = await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: item.quantity } },
          { returnDocument: 'after' }
        );
        if (restored) {
          await InventoryTx.create({
            product: restored._id,
            sku: restored.sku,
            type: 'RETURN_REFUND',
            quantityDelta: item.quantity,
            previousStock: restored.stock - item.quantity,
            newStock: restored.stock,
            order: order._id,
            orderNumber: order.orderNumber,
            performedBy: adminUser ? adminUser._id : null,
            reason: `Refund for Order #${order.orderNumber}`
          });
        }
      })
    );
  }

  await order.save();

  await AuditLog.create({
    action: 'ORDER_REFUNDED',
    performedBy: adminUser ? adminUser._id : null,
    adminEmail: adminUser ? adminUser.email : 'system',
    targetType: 'Order',
    targetId: order.orderNumber,
    details: { refundAmount: effectiveRefund, reason, restoreInventory }
  });

  await recordDailySnapshot(order.createdAt);
  return order;
}
