import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'store_settings',
      unique: true,
      index: true
    },
    storeName: {
      type: String,
      default: 'Blue Bells Electronics'
    },
    tagline: {
      type: String,
      default: 'Certified & Official Member of Official iPhone Shop'
    },
    currency: {
      type: String,
      default: 'PKR'
    },
    currencySymbol: {
      type: String,
      default: 'Rs.'
    },
    standardShippingFee: {
      type: Number,
      default: 1500
    },
    freeShippingThreshold: {
      type: Number,
      default: 50000
    },
    supportEmail: {
      type: String,
      default: 'nomanjvd9@gmail.com'
    },
    supportPhone: {
      type: String,
      default: '03005902425'
    },
    whatsappNumber: {
      type: String,
      default: '03005902425'
    },
    storeAddress: {
      type: String,
      default: 'Blue Bells Electronics, Shop # 33, Sattagadai Plaza, 32 The Mall, Peshawar Cantt.'
    },
    city: {
      type: String,
      default: 'Peshawar'
    },
    announcementText: {
      type: String,
      default: '⭐ Certified & Official Member of Official iPhone Shop | Blue Bells Electronics, Peshawar Cantt. | WhatsApp: 03005902425'
    },
    announcementActive: {
      type: Boolean,
      default: true
    },
    isCertifiedIPhoneShop: {
      type: Boolean,
      default: true
    },
    certificationText: {
      type: String,
      default: 'Certified & Official Member of Official iPhone Shop'
    },
    taxRate: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.models.Setting || mongoose.model('Setting', settingSchema);
