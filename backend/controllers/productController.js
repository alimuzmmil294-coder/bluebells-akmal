import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import AuditLog from '../models/AuditLog.js';
import { getStartingProductPrice } from '../services/productVariantService.js';

function formatProduct(product) {
  const data = typeof product.toObject === 'function'
    ? product.toObject({ flattenMaps: true })
    : { ...product };
  if (data.specifications instanceof Map) {
    data.specifications = Object.fromEntries(data.specifications);
  }
  return {
    ...data,
    id: data.customId || data._id?.toString()
  };
}

let productCache = null;
let productCacheTimestamp = 0;
const CACHE_TTL_MS = 60000; // 60 seconds

export function invalidateProductCache() {
  productCache = null;
  productCacheTimestamp = 0;
}

export async function getProducts(req, res, next) {
  try {
    let {
      page = 1,
      limit = 20,
      brand,
      category,
      q,
      search,
      sort = 'featured',
      minPrice,
      maxPrice,
      inStock,
      featured
    } = req.query;

    page = Math.max(1, parseInt(page, 10) || 1);
    limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const filter = { active: true };

    if (brand && brand !== 'All') {
      filter.brand = brand;
    }

    if (category && category !== 'All') {
      filter.category = category.toLowerCase();
    }

    const searchQuery = (search || q || '').trim();
    if (searchQuery) {
      filter.$or = [
        { name: { $regex: searchQuery, $options: 'i' } },
        { brand: { $regex: searchQuery, $options: 'i' } },
        { series: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } }
      ];
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (inStock === 'true' || inStock === true) {
      filter.stock = { $gt: 0 };
    }

    if (featured === 'true' || featured === true) {
      filter.featured = true;
    }

    const isStandardListing =
      !searchQuery &&
      !minPrice &&
      !maxPrice &&
      !inStock &&
      (!brand || brand === 'All') &&
      (!category || category === 'All') &&
      (!featured || featured === 'false') &&
      page === 1 &&
      limit >= 20;

    // Return instant cached payload if valid
    if (isStandardListing && productCache && Date.now() - productCacheTimestamp < CACHE_TTL_MS) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
      return res.status(200).json(productCache);
    }

    let sortOptions = { featured: -1, createdAt: -1 };
    switch (sort) {
      case 'price-low':
      case 'price_asc':
        sortOptions = { price: 1 };
        break;
      case 'price-high':
      case 'price_desc':
        sortOptions = { price: -1 };
        break;
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      case 'rating':
        sortOptions = { rating: -1 };
        break;
      case 'featured':
      default:
        sortOptions = { featured: -1, createdAt: -1 };
        break;
    }

    const skip = (page - 1) * limit;

    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const formattedData = products.map(formatProduct);

    const totalPages = Math.ceil(total / limit) || 1;

    const responsePayload = {
      success: true,
      data: formattedData,
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };

    if (isStandardListing) {
      productCache = responsePayload;
      productCacheTimestamp = Date.now();
    }

    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    res.status(200).json(responsePayload);
  } catch (err) {
    next(err);
  }
}

export async function getProductById(req, res, next) {
  try {
    const { id } = req.params;

    const isMongoId = mongoose.isValidObjectId(id);
    const product = await Product.findOne({
      $or: [
        { customId: id },
        ...(isMongoId ? [{ _id: id }] : [])
      ]
    }).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        error: `Product with ID "${id}" was not found.`
      });
    }

    res.status(200).json({
      success: true,
      data: formatProduct(product)
    });
  } catch (err) {
    next(err);
  }
}

export async function getBrands(req, res, next) {
  try {
    const brands = await Product.aggregate([
      { $match: { active: true } },
      { $group: { _id: '$brand', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    res.status(200).json({
      success: true,
      data: brands.map((b) => ({ brand: b._id, count: b.count }))
    });
  } catch (err) {
    next(err);
  }
}

export async function getCategories(req, res, next) {
  try {
    const categories = await Product.aggregate([
      { $match: { active: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    res.status(200).json({
      success: true,
      data: categories.map((c) => ({ category: c._id, count: c.count }))
    });
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req, res, next) {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access forbidden. Administrator privileges are required to create products.'
      });
    }

    const productData = req.body;

    // Generate safe customId / SKU if not provided
    const sku = (productData.sku || `BB-${productData.brand?.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`).toUpperCase();
    const customId = (productData.customId || productData.id || productData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')).toLowerCase();

    // Ensure storageOptions and colors format
    const storageOptions = Array.isArray(productData.storageOptions)
      ? productData.storageOptions
      : (productData.storageOptions || '128GB, 256GB').split(',').map((s) => s.trim()).filter(Boolean);
    const gallery = Array.isArray(productData.gallery)
      ? productData.gallery.slice(0, 3)
      : [productData.image];
    const variants = Array.isArray(productData.variants) ? productData.variants : [];
    const price = getStartingProductPrice(variants, productData.price);

    const product = await Product.create({
      ...productData,
      sku,
      customId,
      storageOptions,
      gallery,
      image: gallery[0] || productData.image,
      variants,
      price,
      originalPrice: Number(productData.originalPrice || 0),
      stock: Number(productData.stock || 0),
      active: productData.active !== undefined ? productData.active : true
    });

    // Record audit log
    await AuditLog.create({
      action: 'PRODUCT_CREATED',
      performedBy: req.user?._id || null,
      adminEmail: req.user?.email || 'admin',
      targetType: 'Product',
      targetId: product._id.toString(),
      details: { name: product.name, price: product.price, sku: product.sku }
    });

    invalidateProductCache();

    const formattedProduct = formatProduct(product);

    res.status(201).json({
      success: true,
      message: `Product "${product.name}" created successfully.`,
      data: formattedProduct
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req, res, next) {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access forbidden. Administrator privileges are required to update products.'
      });
    }

    const { id } = req.params;
    const isMongoId = mongoose.isValidObjectId(id);

    const product = await Product.findOne({
      $or: [
        { customId: id },
        ...(isMongoId ? [{ _id: id }] : [])
      ]
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: `Product with ID "${id}" was not found.`
      });
    }

    const updates = req.body;
    if (updates.gallery !== undefined && (!Array.isArray(updates.gallery) || updates.gallery.length < 1 || updates.gallery.length > 3)) {
      return res.status(400).json({
        success: false,
        error: 'A product must have between one and three images.'
      });
    }
    if (updates.variants !== undefined && !Array.isArray(updates.variants)) {
      return res.status(400).json({
        success: false,
        error: 'Product variants must be provided as an array.'
      });
    }

    if (updates.name) product.name = updates.name;
    if (updates.brand) product.brand = updates.brand;
    if (updates.category) product.category = updates.category;
    if (updates.series !== undefined) product.series = updates.series;
    if (updates.sku) product.sku = updates.sku;
    if (updates.description !== undefined) product.description = updates.description;
    if (updates.price !== undefined) product.price = Number(updates.price);
    if (updates.originalPrice !== undefined) product.originalPrice = Number(updates.originalPrice);
    if (updates.costPrice !== undefined) product.costPrice = Number(updates.costPrice);
    if (updates.stock !== undefined) product.stock = Number(updates.stock);
    if (updates.gallery !== undefined) {
      product.gallery = updates.gallery.slice(0, 3);
      product.image = product.gallery[0] || updates.image || product.image;
    } else if (updates.image) {
      product.image = updates.image;
    }
    if (updates.variants !== undefined) {
      product.variants = updates.variants;
      if (updates.variants.length) {
        product.price = getStartingProductPrice(updates.variants, product.price);
      }
    }
    if (updates.colors !== undefined) product.colors = updates.colors;
    if (updates.specifications !== undefined) product.specifications = updates.specifications;
    if (updates.featured !== undefined) product.featured = updates.featured;
    if (updates.active !== undefined) product.active = updates.active;
    if (updates.storageOptions) {
      product.storageOptions = Array.isArray(updates.storageOptions)
        ? updates.storageOptions
        : updates.storageOptions.split(',').map((s) => s.trim()).filter(Boolean);
    }

    await product.save();
    invalidateProductCache();

    await AuditLog.create({
      action: 'PRODUCT_UPDATED',
      performedBy: req.user?._id || null,
      adminEmail: req.user?.email || 'admin',
      targetType: 'Product',
      targetId: product._id.toString(),
      details: updates
    });

    const formatted = formatProduct(product);

    res.status(200).json({
      success: true,
      message: `Product "${product.name}" updated successfully.`,
      data: formatted
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access forbidden. Administrator privileges are required to delete products.'
      });
    }

    const { id } = req.params;
    const isMongoId = mongoose.isValidObjectId(id);

    const product = await Product.findOne({
      $or: [
        { customId: id },
        ...(isMongoId ? [{ _id: id }] : [])
      ]
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: `Product with ID "${id}" was not found.`
      });
    }

    // Check if product is referenced by existing orders
    const orderCount = await Order.countDocuments({
      'items.product': product._id
    });

    if (orderCount > 0) {
      // Soft deletion to preserve order integrity
      product.active = false;
      await product.save();
      invalidateProductCache();

      await AuditLog.create({
        action: 'PRODUCT_DEACTIVATED',
        performedBy: req.user?._id || null,
        adminEmail: req.user?.email || 'admin',
        targetType: 'Product',
        targetId: product._id.toString(),
        details: { reason: `Referenced by ${orderCount} order(s); soft-deactivated.` }
      });

      return res.status(200).json({
        success: true,
        message: `Product "${product.name}" is referenced by ${orderCount} historical order(s). It has been safely deactivated from the storefront.`,
        data: { id: product.customId || product._id.toString(), active: false }
      });
    }

    // Safe to delete permanently
    await Product.deleteOne({ _id: product._id });
    invalidateProductCache();

    await AuditLog.create({
      action: 'PRODUCT_DELETED_PERMANENTLY',
      performedBy: req.user?._id || null,
      adminEmail: req.user?.email || 'admin',
      targetType: 'Product',
      targetId: product._id.toString(),
      details: { name: product.name }
    });

    res.status(200).json({
      success: true,
      message: `Product "${product.name}" deleted successfully.`,
      data: { id: product.customId || product._id.toString() }
    });
  } catch (err) {
    next(err);
  }
}
