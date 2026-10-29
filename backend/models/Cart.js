import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
  {
    cartItemId: { type: String, required: true },
    productId: { type: String, required: true },
    productRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    brand: { type: String, default: '' },
    category: { type: String, default: '' },
    price: { type: Number, required: true },
    originalPrice: { type: Number, default: 0 },
    image: { type: String, default: '' },
    storage: { type: String, default: 'Standard' },
    ptaStatus: { type: String, default: 'Not Applicable' },
    color: { type: String, default: 'Default' },
    colorHex: { type: String, default: '#000000' },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    addedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      sparse: true
    },
    sessionId: {
      type: String,
      index: true,
      sparse: true
    },
    items: [cartItemSchema],
    couponCode: {
      type: String,
      default: null
    },
    clearedAt: {
      type: Date,
      default: null
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now,
      expires: 60 * 60 * 24 * 30 // TTL auto-clean after 30 days of inactivity
    }
  },
  {
    timestamps: true
  }
);

cartSchema.index({ user: 1, sessionId: 1 });

const Cart = mongoose.models.Cart || mongoose.model('Cart', cartSchema);
export default Cart;
