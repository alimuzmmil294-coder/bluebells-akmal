import Setting from '../models/Setting.js';

export async function getSettings(req, res, next) {
  try {
    let setting = await Setting.findOne({ key: 'store_settings' }).lean();
    if (!setting) {
      setting = await Setting.create({ key: 'store_settings' });
      setting = setting.toObject();
    }
    return res.status(200).json({
      success: true,
      data: setting
    });
  } catch (err) {
    next(err);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const allowedFields = [
      'storeName',
      'tagline',
      'currency',
      'currencySymbol',
      'standardShippingFee',
      'freeShippingThreshold',
      'supportEmail',
      'supportPhone',
      'whatsappNumber',
      'storeAddress',
      'city',
      'announcementText',
      'announcementActive',
      'isCertifiedIPhoneShop',
      'certificationText',
      'taxRate'
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const updated = await Setting.findOneAndUpdate(
      { key: 'store_settings' },
      { $set: updates },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Store settings updated successfully.',
      data: updated
    });
  } catch (err) {
    next(err);
  }
}
