import { body } from 'express-validator';

export const validateProduct = [
  body('name')
    .trim()
    .notEmpty().withMessage('Product name is required')
    .isLength({ max: 200 }).withMessage('Product name cannot exceed 200 characters'),
  body('brand')
    .trim()
    .notEmpty().withMessage('Brand is required')
    .isIn(['Apple', 'Samsung', 'Google', 'Other']).withMessage('Brand must be Apple, Samsung, Google, or Other'),
  body('category')
    .trim()
    .notEmpty().withMessage('Category is required'),
  body('price')
    .notEmpty().withMessage('Selling price is required')
    .isFloat({ min: 0 }).withMessage('Selling price must be a positive number'),
  body('originalPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Original price must be a positive number'),
  body('stock')
    .notEmpty().withMessage('Stock quantity is required')
    .isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
  body('image')
    .trim()
    .notEmpty().withMessage('Main product image is required')
    .custom((val) => {
      if (typeof val === 'string' && (val.startsWith('/uploads/') || val.startsWith('data:image/') || /^https?:\/\//i.test(val))) {
        return true;
      }
      throw new Error('Main product image must be an uploaded file or valid URL.');
    }),
  body('gallery')
    .optional()
    .isArray({ min: 1, max: 3 }).withMessage('A product must have between one and three images.'),
  body('gallery.*')
    .optional()
    .custom((val) => {
      if (typeof val === 'string' && (val.startsWith('/uploads/') || val.startsWith('data:image/') || /^https?:\/\//i.test(val))) {
        return true;
      }
      throw new Error('Product images must be an uploaded file or valid URL.');
    }),
  body('variants')
    .optional()
    .isArray({ min: 1 }).withMessage('At least one product variant is required when variants are provided.')
    .bail()
    .custom((variants, { req }) => {
      const seen = new Set();
      const statusByStorage = new Map();
      for (const variant of variants) {
        if (
          !variant ||
          typeof variant.storage !== 'string' ||
          !variant.storage.trim() ||
          !['PTA Approved', 'Non-PTA', 'Not Applicable'].includes(variant.ptaStatus) ||
          !Number.isFinite(Number(variant.price)) ||
          Number(variant.price) < 0
        ) {
          throw new Error('Each product variant requires storage, PTA status, and a valid price.');
        }
        const key = `${variant.storage.trim().toLowerCase()}|${variant.ptaStatus}`;
        if (seen.has(key)) {
          throw new Error('Product variants cannot repeat the same storage and PTA status.');
        }
        seen.add(key);
        const statuses = statusByStorage.get(variant.storage.trim()) || new Set();
        statuses.add(variant.ptaStatus);
        statusByStorage.set(variant.storage.trim(), statuses);
      }
      if (['iphone', 'samsung'].includes(req.body.category?.toLowerCase())) {
        const declaredOptions = Array.isArray(req.body.storageOptions)
          ? req.body.storageOptions
          : typeof req.body.storageOptions === 'string'
            ? req.body.storageOptions.split(',').map((s) => s.trim()).filter(Boolean)
            : [];

        for (const storage of declaredOptions) {
          const statuses = statusByStorage.get(storage.trim()) || new Set();
          const hasPta = statuses.has('PTA Approved');
          const hasNonPta = statuses.has('Non-PTA');
          if (!hasPta && !hasNonPta && !statuses.has('Not Applicable')) {
            throw new Error(`Phone storage "${storage}" needs at least one price (PTA-approved or Non-PTA).`);
          }
        }

        for (const [storage, statuses] of statusByStorage) {
          const hasPta = statuses.has('PTA Approved');
          const hasNonPta = statuses.has('Non-PTA');
          if (!hasPta && !hasNonPta && !statuses.has('Not Applicable')) {
            throw new Error(`Phone storage "${storage}" needs at least one price (PTA-approved or Non-PTA).`);
          }
        }
      }
      return true;
    }),
  body('description')
    .optional()
    .trim()
];
