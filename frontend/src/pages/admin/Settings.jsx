import React, { useState, useEffect } from 'react';
import { Save, Store, Truck, Bell, Phone, Mail, MapPin } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import AdminHeader from '../../components/AdminHeader';

export default function AdminSettings() {
  const { settings, updateSettings } = useStore();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    storeName: settings?.storeName || 'Blue Bells Electronics',
    tagline: settings?.tagline || 'Certified & Official Member of Official iPhone Shop',
    currency: settings?.currency || 'PKR',
    currencySymbol: settings?.currencySymbol || 'Rs.',
    standardShippingFee: settings?.standardShippingFee || 1500,
    freeShippingThreshold: settings?.freeShippingThreshold || 50000,
    announcementText: settings?.announcementText || '⭐ Certified & Official Member of Official iPhone Shop | Blue Bells Electronics, Peshawar Cantt. | WhatsApp: 03005902425',
    announcementActive: settings?.announcementActive !== undefined ? settings?.announcementActive : true,
    supportEmail: settings?.supportEmail || 'nomanjvd9@gmail.com',
    supportPhone: settings?.supportPhone || '03005902425',
    storeAddress: settings?.storeAddress || 'Blue Bells Electronics, Shop # 33, Sattagadai Plaza, 32 The Mall, Peshawar Cantt.'
  });

  useEffect(() => {
    if (settings) {
      setForm({
        storeName: settings.storeName || 'Blue Bells Electronics',
        tagline: settings.tagline || 'Certified & Official Member of Official iPhone Shop',
        currency: settings.currency || 'PKR',
        currencySymbol: settings.currencySymbol || 'Rs.',
        standardShippingFee: settings.standardShippingFee ?? 1500,
        freeShippingThreshold: settings.freeShippingThreshold ?? 50000,
        announcementText: settings.announcementText || '⭐ Certified & Official Member of Official iPhone Shop | Blue Bells Electronics, Peshawar Cantt. | WhatsApp: 03005902425',
        announcementActive: settings.announcementActive !== undefined ? settings.announcementActive : true,
        supportEmail: settings.supportEmail || 'nomanjvd9@gmail.com',
        supportPhone: settings.supportPhone || '03005902425',
        storeAddress: settings.storeAddress || 'Blue Bells Electronics, Shop # 33, Sattagadai Plaza, 32 The Mall, Peshawar Cantt.'
      });
    }
  }, [settings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings({
        ...form,
        standardShippingFee: Number(form.standardShippingFee),
        freeShippingThreshold: Number(form.freeShippingThreshold)
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <AdminHeader
        title="Store Configuration & Settings"
        subtitle="Configure general store details, shipping thresholds, and announcement banner text."
      />

      <div className="admin-main">
        <form onSubmit={handleSubmit} style={{ maxWidth: '840px' }}>
          {/* General Information */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              padding: '28px',
              marginBottom: '24px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--border-color)' }}>
              <Store size={20} color="var(--primary-blue)" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>General Store Information</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="form-row-2">
              <div className="form-group">
                <label className="form-label">Store Brand Name</label>
                <input
                  type="text"
                  value={form.storeName}
                  onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Brand Tagline</label>
                <input
                  type="text"
                  value={form.tagline}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="form-row-2">
              <div className="form-group">
                <label className="form-label">Support Email</label>
                <input
                  type="email"
                  value={form.supportEmail}
                  onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Support Phone</label>
                <input
                  type="text"
                  value={form.supportPhone}
                  onChange={(e) => setForm({ ...form, supportPhone: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Flagship Store Pavilion Address</label>
              <input
                type="text"
                value={form.storeAddress}
                onChange={(e) => setForm({ ...form, storeAddress: e.target.value })}
                className="form-input"
                required
              />
            </div>
          </div>

          {/* Shipping & Thresholds */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              padding: '28px',
              marginBottom: '24px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--border-color)' }}>
              <Truck size={20} color="var(--primary-blue)" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Delivery &amp; Freight Configuration</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="form-row-2">
              <div className="form-group">
                <label className="form-label">Standard Shipping Fee (PKR)</label>
                <input
                  type="number"
                  value={form.standardShippingFee}
                  onChange={(e) => setForm({ ...form, standardShippingFee: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Free Shipping Minimum Threshold (PKR)</label>
                <input
                  type="number"
                  value={form.freeShippingThreshold}
                  onChange={(e) => setForm({ ...form, freeShippingThreshold: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
            </div>
          </div>

          {/* Top Announcement Bar */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              padding: '28px',
              marginBottom: '32px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--border-color)' }}>
              <Bell size={20} color="var(--primary-blue)" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Announcement Bar</h3>
            </div>

            <div className="form-group">
              <label className="form-label">Banner Message Text</label>
              <textarea
                rows={2}
                value={form.announcementText}
                onChange={(e) => setForm({ ...form, announcementText: e.target.value })}
                className="form-textarea"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={form.announcementActive}
                  onChange={(e) => setForm({ ...form, announcementActive: e.target.checked })}
                  style={{ accentColor: 'var(--primary-blue)', width: '18px', height: '18px' }}
                />
                <span>Enable Announcement Bar on top of storefront pages</span>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <button type="submit" className="btn btn-primary btn-lg" style={{ gap: '10px' }} disabled={saving}>
            <Save size={18} />
            <span>{saving ? 'Saving Configuration...' : 'Save All Configuration Changes'}</span>
          </button>
        </form>
      </div>

      <style>{`
        @media (max-width: 600px) {
          .form-row-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
