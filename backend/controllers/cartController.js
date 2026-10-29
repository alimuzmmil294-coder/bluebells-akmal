import mongoose from 'mongoose';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import { resolveProductVariant } from '../services/productVariantService.js';

const cartQueues = new Map();

function queueCartOperation(req, fn) {
  const queueKey = req.session?.userId || req.sessionID || 'anon';
  const prevPromise = cartQueues.get(queueKey) || Promise.resolve();
  const currentPromise = prevPromise
    .then(fn)
    .finally(() => {
      if (cartQueues.get(queueKey) === currentPromise) {
        cartQueues.delete(queueKey);
      }
    });
  cartQueues.set(queueKey, currentPromise);
  return currentPromise;
}

function sanitizeCartItems(items) {
  if (!Array.isArray(items)) return [];
  const map = new Map();
  for (const item of items) {
    const raw = typeof item.toObject === 'function' ? item.toObject() : { ...item };
    const key = raw.cartItemId;
    if (map.has(key)) {
      const existing = map.get(key);
      existing.quantity += raw.quantity;
    } else {
      map.set(key, { ...raw });
    }
  }
  return Array.from(map.values());
}

async function enrichCartItemsWithStock(items) {
  if (!items || !items.length) return [];
  const productIds = items.map((i) => i.productId);
  const products = await Product.find({
    $or: [
      { customId: { $in: productIds } },
      { _id: { $in: productIds.filter((id) => mongoose.isValidObjectId(id)) } }
    ]
  }).select('customId _id stock active').lean();

  const stockMap = new Map();
  for (const p of products) {
    if (p.customId) stockMap.set(p.customId, p.stock);
    stockMap.set(p._id.toString(), p.stock);
  }

  return items.map((item) => {
    const raw = typeof item.toObject === 'function' ? item.toObject() : { ...item };
    const stock = stockMap.has(raw.productId) ? stockMap.get(raw.productId) : 0;
    return {
      ...raw,
      stock,
      availableStock: stock
    };
  });
}

async function findOrCreateCart(req) {
  // Persist the session ID so anonymous carts can be found on the next request.
  req.session.cartInitialized = true;
  const userId = req.session?.userId || null;
  const sessionId = req.sessionID || 'anon';

  let cart = null;
  if (userId) {
    cart = await Cart.findOne({ user: userId });
  }
  if (!cart) {
    cart = await Cart.findOne({ sessionId: sessionId });
  }
  if (!cart) {
    cart = await Cart.create({
      user: userId,
      sessionId: sessionId,
      items: []
    });
  } else if (userId && !cart.user) {
    cart.user = userId;
    await cart.save();
  }

  return cart;
}

export async function getCart(req, res, next) {
  try {
    const result = await queueCartOperation(req, async () => {
      const cart = await findOrCreateCart(req);
      const originalLength = cart.items.length;
      cart.items = sanitizeCartItems(cart.items);

      if (cart.items.length !== originalLength) {
        cart.lastAccessedAt = new Date();
        await cart.save();
      }

      const enrichedItems = await enrichCartItemsWithStock(cart.items);
      return {
        items: enrichedItems,
        couponCode: cart.couponCode
      };
    });

    res.status(200).json({
      success: true,
      data: {
        items: result.items,
        couponCode: result.couponCode
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function addItem(req, res, next) {
  try {
    const result = await queueCartOperation(req, async () => {
      const {
        productId,
        quantity = 1,
        storage,
        ptaStatus,
        color = 'Default',
        colorHex = '#000000'
      } = req.body;

      const requestedQty = Math.max(1, parseInt(quantity, 10) || 1);

      const product = await Product.findOne({
        $or: [
          { customId: productId },
          ...(mongoose.isValidObjectId(productId) ? [{ _id: productId }] : [])
        ]
      });

      if (!product) {
        const error = new Error('Product not found.');
        error.statusCode = 404;
        throw error;
      }

      if (!product.active) {
        const error = new Error(`Product "${product.name}" is currently unavailable.`);
        error.statusCode = 400;
        throw error;
      }

      const availableStock = typeof product.stock === 'number' ? product.stock : 0;
      if (availableStock <= 0) {
        const error = new Error(`Product "${product.name}" is currently out of stock.`);
        error.statusCode = 400;
        throw error;
      }

      const variant = resolveProductVariant(product, storage, ptaStatus);
      if (product.variants.length && !variant) {
        const error = new Error('The selected storage and PTA option is not available for this product.');
        error.statusCode = 400;
        throw error;
      }

      const selectedStorage = variant?.storage || storage || product.storageOptions?.[0] || 'Standard';
      const selectedPtaStatus = variant?.ptaStatus || ptaStatus || 'Not Applicable';
      const selectedPrice = variant?.price ?? product.price;
      const selectedOriginalPrice = variant?.originalPrice || product.originalPrice || 0;
      const cart = await findOrCreateCart(req);

      // Clean existing duplicates first
      cart.items = sanitizeCartItems(cart.items);

      const cartItemId = `${product.customId || product._id}_${selectedStorage}_${selectedPtaStatus}_${color}`.replace(/\s+/g, '-');

      const existingIndex = cart.items.findIndex((i) => i.cartItemId === cartItemId);
      const currentQty = existingIndex > -1 ? cart.items[existingIndex].quantity : 0;

      if (currentQty >= availableStock) {
        const error = new Error(`Maximum available quantity reached (${availableStock} in stock).`);
        error.statusCode = 400;
        throw error;
      }

      if (currentQty + requestedQty > availableStock) {
        const error = new Error(`Only ${availableStock} units available for "${product.name}" (${currentQty} already in your cart).`);
        error.statusCode = 400;
        throw error;
      }

      if (existingIndex > -1) {
        cart.items[existingIndex].quantity = Math.min(availableStock, currentQty + requestedQty);
      } else {
        cart.items.push({
          cartItemId,
          productId: product.customId || product._id.toString(),
          productRef: product._id,
          name: product.name,
          brand: product.brand,
          category: product.category,
          price: selectedPrice,
          originalPrice: selectedOriginalPrice,
          image: product.image,
          storage: selectedStorage,
          ptaStatus: selectedPtaStatus,
          color,
          colorHex,
          quantity: Math.min(availableStock, requestedQty)
        });
      }

      cart.lastAccessedAt = new Date();
      await cart.save();

      const enrichedItems = await enrichCartItemsWithStock(cart.items);
      return {
        message: `Added "${product.name}" to cart.`,
        items: enrichedItems,
        couponCode: cart.couponCode
      };
    });

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        items: result.items,
        couponCode: result.couponCode
      }
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, error: err.message });
    }
    next(err);
  }
}

export async function updateQuantity(req, res, next) {
  try {
    const result = await queueCartOperation(req, async () => {
      const { productId: cartItemId } = req.params;
      const { delta } = req.body;
      const numDelta = Number(delta) || 0;

      const cart = await findOrCreateCart(req);
      cart.items = sanitizeCartItems(cart.items);

      const itemIndex = cart.items.findIndex((i) => i.cartItemId === cartItemId || i.productId === cartItemId);

      if (itemIndex > -1) {
        const item = cart.items[itemIndex];
        const product = await Product.findOne({
          $or: [
            { customId: item.productId },
            ...(mongoose.isValidObjectId(item.productId) ? [{ _id: item.productId }] : [])
          ]
        });

        const availableStock = product ? (typeof product.stock === 'number' ? product.stock : 0) : Infinity;

        if (numDelta > 0) {
          if (item.quantity + numDelta > availableStock) {
            const error = new Error(`Maximum available quantity reached (${availableStock} in stock).`);
            error.statusCode = 400;
            throw error;
          }
          item.quantity += numDelta;
        } else if (numDelta < 0) {
          const newQty = item.quantity + numDelta;
          if (newQty > 0) {
            item.quantity = newQty;
          } else {
            cart.items.splice(itemIndex, 1);
          }
        }

        cart.lastAccessedAt = new Date();
        await cart.save();
      }

      const enrichedItems = await enrichCartItemsWithStock(cart.items);
      return {
        items: enrichedItems,
        couponCode: cart.couponCode
      };
    });

    res.status(200).json({
      success: true,
      data: {
        items: result.items,
        couponCode: result.couponCode
      }
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, error: err.message });
    }
    next(err);
  }
}

export async function removeItem(req, res, next) {
  try {
    const result = await queueCartOperation(req, async () => {
      const { productId: cartItemId } = req.params;
      const cart = await findOrCreateCart(req);

      cart.items = sanitizeCartItems(cart.items).filter((i) => i.cartItemId !== cartItemId && i.productId !== cartItemId);
      cart.lastAccessedAt = new Date();
      await cart.save();

      const enrichedItems = await enrichCartItemsWithStock(cart.items);
      return {
        items: enrichedItems,
        couponCode: cart.couponCode
      };
    });

    res.status(200).json({
      success: true,
      message: 'Item removed from cart.',
      data: {
        items: result.items,
        couponCode: result.couponCode
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function clearCart(req, res, next) {
  try {
    const result = await queueCartOperation(req, async () => {
      const cart = await findOrCreateCart(req);
      cart.items = [];
      cart.couponCode = null;
      cart.lastAccessedAt = new Date();
      await cart.save();

      const userId = req.session?.userId || null;
      const sessionId = req.sessionID || 'anon';
      if (userId) {
        await Cart.updateMany({ user: userId }, { $set: { items: [], couponCode: null, lastAccessedAt: new Date() } });
      }
      if (sessionId && sessionId !== 'anon') {
        await Cart.updateMany({ sessionId }, { $set: { items: [], couponCode: null, lastAccessedAt: new Date() } });
      }

      return { items: [], couponCode: null };
    });

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully.',
      data: result
    });
  } catch (err) {
    next(err);
  }
}

export async function applyCoupon(req, res, next) {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: 'Coupon code is required.' });
    }

    const coupon = await Coupon.findOne({
      code: code.trim().toUpperCase(),
      status: 'active'
    });

    if (!coupon) {
      return res.status(404).json({ success: false, error: 'Invalid or inactive promotional code.' });
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return res.status(400).json({ success: false, error: 'This coupon has expired.' });
    }

    const cart = await findOrCreateCart(req);
    const subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (subtotal < (coupon.minSpend || 0)) {
      return res.status(400).json({
        success: false,
        error: `This coupon requires a minimum spend of Rs. ${coupon.minSpend.toLocaleString()}. Current cart subtotal: Rs. ${subtotal.toLocaleString()}`
      });
    }

    cart.couponCode = coupon.code;
    await cart.save();

    res.status(200).json({
      success: true,
      message: `Coupon "${coupon.code}" applied successfully!`,
      data: {
        coupon: {
          code: coupon.code,
          discountType: coupon.discountType,
          value: coupon.value,
          minSpend: coupon.minSpend,
          status: coupon.status,
          expiresAt: coupon.expiresAt,
          description: coupon.description
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function removeCoupon(req, res, next) {
  try {
    const cart = await findOrCreateCart(req);
    cart.couponCode = null;
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Coupon removed.',
      data: {
        items: cart.items,
        couponCode: null
      }
    });
  } catch (err) {
    next(err);
  }
}
