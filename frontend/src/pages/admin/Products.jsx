import React, { useState, useMemo, useRef } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  PackageCheck,
  Star,
  ImagePlus,
  Upload,
  X
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatPrice } from '../../utils/currency';
import AdminHeader from '../../components/AdminHeader';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';

function makeStorageRows(product) {
  const storageOptions = product?.storageOptions?.length
    ? product.storageOptions
    : ['128GB', '256GB', '512GB'];

  return storageOptions.map((storage) => {
    const variants = product?.variants?.filter((variant) => variant.storage === storage) || [];
    const ptaVariant = variants.find((variant) => variant.ptaStatus === 'PTA Approved');
    const nonPtaVariant = variants.find((variant) => variant.ptaStatus === 'Non-PTA');
    const standardVariant = variants.find((variant) => variant.ptaStatus === 'Not Applicable');
    const defaultPrice = product?.price ?? '';

    return {
      storage,
      price: standardVariant?.price ?? defaultPrice,
      ptaPrice: ptaVariant ? ptaVariant.price : (product?.variants?.length ? '' : defaultPrice),
      nonPtaPrice: nonPtaVariant ? nonPtaVariant.price : ''
    };
  });
}

function makeProductForm(product = null) {
  return {
    name: product?.name || '',
    brand: product?.brand || 'Apple',
    category: product?.category || 'iphone',
    series: product?.series || '',
    sku: product?.sku || '',
    costPrice: product?.costPrice || '',
    originalPrice: product?.originalPrice || '',
    stock: product?.stock ?? 12,
    images: product?.gallery?.length
      ? product.gallery.slice(0, 3)
      : [product?.image || ''],
    description: product?.description || '',
    featured: product?.featured ?? true,
    storageVariants: makeStorageRows(product),
    colors: product?.colors?.length ? product.colors.map((color) => ({ ...color })) : [],
    specifications: Object.entries(product?.specifications || {}).map(([key, value]) => ({ key, value }))
  };
}

export default function AdminProducts() {
  const { products, addProduct, updateProduct, deleteProduct, addToast } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Form Fields
  const [formData, setFormData] = useState(() => makeProductForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const [imageFiles, setImageFiles] = useState([]);
  const isPhoneCategory = formData.category === 'iphone' || formData.category === 'samsung';

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.brand.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (selectedBrand !== 'All' && p.brand !== selectedBrand) {
        return false;
      }
      if (selectedCategory !== 'All' && p.category !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [products, searchQuery, selectedBrand, selectedCategory]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData(makeProductForm());
    setImageFiles([]);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (prod) => {
    setEditingProduct(prod);
    setFormData(makeProductForm(prod));
    const existing = (prod.gallery?.length ? prod.gallery : [prod.image]).filter(Boolean).map((url, i) => ({
      id: `existing-${i}-${url}`,
      previewUrl: url,
      isExisting: true
    }));
    setImageFiles(existing);
    setIsFormOpen(true);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setImageFiles((prev) => {
      const remainingSlots = 3 - prev.length;
      if (remainingSlots <= 0) {
        addToast('A product can have a maximum of 3 images.', 'error');
        return prev;
      }
      const filesToAdd = files.slice(0, remainingSlots);
      if (files.length > remainingSlots) {
        addToast(`Only ${remainingSlots} more image(s) could be added (max 3 images).`, 'info');
      }
      const newItems = filesToAdd.map((file) => ({
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        isExisting: false
      }));
      return [...prev, ...newItems];
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setImageFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || isSubmitting) return;

    if (imageFiles.length === 0) {
      addToast('Please upload at least one product image from your computer.', 'error');
      return;
    }
    if (imageFiles.length > 3) {
      addToast('A product can have a maximum of 3 images.', 'error');
      return;
    }

    const storageVariants = formData.storageVariants.map((row) => ({
      ...row,
      storage: row.storage.trim()
    }));
    if (storageVariants.some((row) => !row.storage)) {
      addToast('Enter a storage option for every price row.', 'error');
      return;
    }
    if (new Set(storageVariants.map((row) => row.storage.toLowerCase())).size !== storageVariants.length) {
      addToast('Storage options must be unique.', 'error');
      return;
    }

    const variants = storageVariants.flatMap((row) => {
      if (isPhoneCategory) {
        const rowVariants = [];
        const ptaPrice = row.ptaPrice !== '' && row.ptaPrice !== null && row.ptaPrice !== undefined ? Number(row.ptaPrice) : null;
        const nonPtaPrice = row.nonPtaPrice !== '' && row.nonPtaPrice !== null && row.nonPtaPrice !== undefined ? Number(row.nonPtaPrice) : null;

        if (ptaPrice !== null && Number.isFinite(ptaPrice) && ptaPrice > 0) {
          rowVariants.push({ storage: row.storage, ptaStatus: 'PTA Approved', price: ptaPrice });
        }
        if (nonPtaPrice !== null && Number.isFinite(nonPtaPrice) && nonPtaPrice > 0) {
          rowVariants.push({ storage: row.storage, ptaStatus: 'Non-PTA', price: nonPtaPrice });
        }
        return rowVariants;
      }
      return [{ storage: row.storage, ptaStatus: 'Not Applicable', price: Number(row.price) }];
    });

    if (isPhoneCategory) {
      for (const row of storageVariants) {
        const hasPta = row.ptaPrice !== '' && !isNaN(Number(row.ptaPrice)) && Number(row.ptaPrice) > 0;
        const hasNonPta = row.nonPtaPrice !== '' && !isNaN(Number(row.nonPtaPrice)) && Number(row.nonPtaPrice) > 0;
        if (!hasPta && !hasNonPta) {
          addToast(`Enter at least one price (PTA or Non-PTA) for storage "${row.storage}".`, 'error');
          return;
        }
      }
    } else {
      if (variants.some((variant) => !Number.isFinite(variant.price) || variant.price <= 0)) {
        addToast('Enter a valid price for every option.', 'error');
        return;
      }
    }

    if (variants.length === 0) {
      addToast('Enter at least one valid price.', 'error');
      return;
    }

    // Construct FormData for multipart submission
    const formDataToSend = new FormData();
    formDataToSend.append('name', formData.name.trim());
    formDataToSend.append('brand', formData.brand);
    formDataToSend.append('category', formData.category);
    formDataToSend.append('series', formData.series.trim());
    formDataToSend.append('price', String(Math.min(...variants.map((v) => v.price))));
    formDataToSend.append('costPrice', String(formData.costPrice ? Number(formData.costPrice) : 0));
    formDataToSend.append('originalPrice', String(formData.originalPrice ? Number(formData.originalPrice) : 0));
    formDataToSend.append('stock', String(Number(formData.stock) || 0));
    formDataToSend.append('description', formData.description.trim());
    formDataToSend.append('featured', String(Boolean(formData.featured)));
    if (formData.sku.trim()) {
      formDataToSend.append('sku', formData.sku.trim().toUpperCase());
    }

    formDataToSend.append('variants', JSON.stringify(variants));
    formDataToSend.append('storageOptions', JSON.stringify(storageVariants.map((r) => r.storage)));
    formDataToSend.append('colors', JSON.stringify(
      formData.colors.filter((c) => c.name.trim()).map((c) => ({ name: c.name.trim(), hex: c.hex }))
    ));
    formDataToSend.append('specifications', JSON.stringify(
      Object.fromEntries(
        formData.specifications
          .filter((s) => s.key.trim())
          .map((s) => [s.key.trim(), s.value.trim()])
      )
    ));

    const existingUrls = imageFiles.filter((item) => item.isExisting).map((item) => item.previewUrl);
    formDataToSend.append('existingImages', JSON.stringify(existingUrls));

    imageFiles.forEach((item) => {
      if (item.file) {
        formDataToSend.append('images', item.file, item.file.name);
      }
    });

    setIsSubmitting(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, formDataToSend);
      } else {
        await addProduct(formDataToSend);
      }
      setIsFormOpen(false);
    } catch (err) {
      // Toast already dispatched
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmId) {
      try {
        await deleteProduct(deleteConfirmId);
      } finally {
        setDeleteConfirmId(null);
      }
    }
  };

  return (
    <div>
      <AdminHeader
        title="Product Inventory Management"
        subtitle="Create, update, or remove mobile catalog listings. Synchronized with MongoDB."
      />

      <div className="admin-main">
        {/* Controls & Search Bar */}
        <div
          className="admin-controls-card"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            padding: '24px',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          {/* Search & Filters */}
          <div style={{ display: 'flex', gap: '12px', flex: '1 1 360px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 200px' }}>
              <input
                type="text"
                placeholder="Search products by title or brand..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '38px', height: '42px', fontSize: '0.9rem' }}
              />
              <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="form-select"
              style={{ width: 'auto', height: '42px', fontSize: '0.88rem' }}
            >
              <option value="All">All Brands</option>
              <option value="Apple">Apple</option>
              <option value="Samsung">Samsung</option>
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="form-select"
              style={{ width: 'auto', height: '42px', fontSize: '0.88rem' }}
            >
              <option value="All">All Categories</option>
              <option value="iphone">iPhone</option>
              <option value="samsung">Samsung</option>
              <option value="apple-watch">Apple Watch</option>
              <option value="audio">Audio</option>
              <option value="accessories">Accessories</option>
            </select>
          </div>

          {/* Add Product Button */}
          <button onClick={handleOpenAdd} className="btn btn-primary" style={{ gap: '8px' }}>
            <Plus size={18} />
            <span>Add New Product</span>
          </button>
        </div>

        {/* Product Inventory Table */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            overflow: 'hidden'
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '14px 20px' }}>Product</th>
                  <th style={{ padding: '14px 20px' }}>Brand / Category</th>
                  <th style={{ padding: '14px 20px' }}>Price</th>
                  <th style={{ padding: '14px 20px' }}>Stock Level</th>
                  <th style={{ padding: '14px 20px' }}>Featured</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {/* Image & Title */}
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-secondary)', padding: '4px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
                          <img src={p.image} alt={p.name} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{p.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {p.id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Brand & Category */}
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontWeight: 600 }}>{p.brand}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                        {p.category.replace('-', ' ')}
                      </div>
                    </td>

                    {/* Price */}
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                        {p.variants?.length ? `From ${formatPrice(p.price)}` : formatPrice(p.price)}
                      </div>
                      {p.originalPrice && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                          {formatPrice(p.originalPrice)}
                        </div>
                      )}
                    </td>

                    {/* Stock */}
                    <td style={{ padding: '14px 20px' }}>
                      {p.stock > 5 ? (
                        <span className="badge badge-success">{p.stock} units</span>
                      ) : p.stock > 0 ? (
                        <span className="badge badge-yellow">Low ({p.stock})</span>
                      ) : (
                        <span className="badge badge-sale">Out of stock</span>
                      )}
                    </td>

                    {/* Featured */}
                    <td style={{ padding: '14px 20px' }}>
                      {p.featured ? (
                        <span style={{ color: '#D97706', fontWeight: 700, fontSize: '0.85rem' }}>★ Yes</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="btn btn-outline btn-sm"
                          style={{ padding: '6px 10px' }}
                          title="Edit product"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(p.id)}
                          className="btn btn-outline btn-sm"
                          style={{ padding: '6px 10px', color: '#DC2626', borderColor: '#FECDD3' }}
                          title="Delete product"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredProducts.length}
          itemsPerPage={itemsPerPage}
          itemLabel="products"
        />
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingProduct ? `Edit Product: ${editingProduct.name}` : 'Add New Product'}
        maxWidth="760px"
      >
        <form onSubmit={handleFormSubmit}>
          <div className="form-group">
            <label className="form-label">Product Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Samsung Galaxy Z Fold 6"
              className="form-input"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="admin-product-form-grid">
            <div className="form-group">
              <label className="form-label">Brand *</label>
              <select
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="form-select"
              >
                <option value="Apple">Apple</option>
                <option value="Samsung">Samsung</option>
                <option value="Google">Google</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="form-select"
              >
                <option value="iphone">iPhone</option>
                <option value="samsung">Samsung Galaxy</option>
                <option value="apple-watch">Apple Watch</option>
                <option value="audio">Audio / Earbuds</option>
                <option value="accessories">Accessories</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="admin-product-form-grid">
            <div className="form-group">
              <label className="form-label">Series / Model Line</label>
              <input
                type="text"
                value={formData.series}
                onChange={(e) => setFormData({ ...formData, series: e.target.value })}
                placeholder="e.g. iPhone 16 Pro"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">SKU <span className="admin-product-help">(auto-generated if blank)</span></label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Optional product SKU"
                className="form-input"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }} className="admin-product-form-grid">
            <div className="form-group">
              <label className="form-label">Cost Price (PKR)</label>
              <input
                type="number"
                min="0"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                placeholder="Optional"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Compare-at Price (PKR)</label>
              <input
                type="number"
                value={formData.originalPrice}
                onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                placeholder="Optional"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Available Stock Quantity</label>
              <input
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                placeholder="10"
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <div className="admin-product-section-heading">
              <label className="form-label">Product Images (Upload from Computer)</label>
              <span style={{ fontWeight: 700, color: 'var(--primary-blue)' }}>{imageFiles.length}/3 images</span>
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              multiple
              style={{ display: 'none' }}
            />

            {/* Upload Images Button */}
            {imageFiles.length < 3 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-outline"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    borderColor: 'var(--primary-blue)',
                    color: 'var(--primary-blue)',
                    fontWeight: 700,
                    padding: '10px 18px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--blue-light)',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <Upload size={18} />
                  <span>Upload Images</span>
                </button>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Select PNG, JPG, or WEBP from your local computer ({3 - imageFiles.length} slots remaining)
                </span>
              </div>
            )}

            {/* Selected Images Preview Grid */}
            {imageFiles.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '14px',
                  marginTop: '10px'
                }}
              >
                {imageFiles.map((item, index) => (
                  <div
                    key={item.id}
                    style={{
                      position: 'relative',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      border: index === 0 ? '2px solid var(--primary-blue)' : '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                      aspectRatio: '1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '8px',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <img
                      src={item.previewUrl}
                      alt={`Preview ${index + 1}`}
                      style={{
                        maxHeight: '100%',
                        maxWidth: '100%',
                        objectFit: 'contain'
                      }}
                    />

                    {index === 0 && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '6px',
                          left: '6px',
                          backgroundColor: 'var(--primary-blue)',
                          color: '#FFFFFF',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          textTransform: 'uppercase'
                        }}
                      >
                        Main
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(15, 23, 42, 0.75)',
                        color: '#FFFFFF',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                      title="Remove image"
                      aria-label={`Remove image ${index + 1}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '32px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'var(--bg-secondary)',
                  marginTop: '8px',
                  transition: 'border-color 0.15s ease'
                }}
              >
                <Upload size={28} color="var(--primary-blue)" style={{ margin: '0 auto 8px auto' }} />
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                  Click to select and upload product images from your computer
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  PNG, JPG, or WEBP supported (up to 3 images)
                </div>
              </div>
            )}
            <div className="admin-product-help" style={{ marginTop: '10px' }}>
              Images rotate automatically on the product page every three seconds. First image is the main catalog thumbnail.
            </div>
          </div>

          <div className="form-group">
            <div className="admin-product-section-heading">
              <label className="form-label">Storage &amp; Variant Pricing</label>
              <span>{isPhoneCategory ? 'Set PTA price, Non-PTA price, or both for each storage' : 'Set a price for each option'}</span>
            </div>
            <div className="admin-storage-options">
              {formData.storageVariants.map((row, index) => (
                <div className={`admin-variant-row ${isPhoneCategory ? 'pta-pricing' : ''}`} key={index}>
                  <input
                    type="text"
                    value={row.storage}
                    onChange={(e) => setFormData((previous) => ({
                      ...previous,
                      storageVariants: previous.storageVariants.map((item, rowIndex) => rowIndex === index ? { ...item, storage: e.target.value } : item)
                    }))}
                    placeholder="Storage / option"
                    className="form-input"
                    aria-label={`Storage option ${index + 1}`}
                    required
                  />
                  {isPhoneCategory ? (
                    <>
                      <label className="admin-price-input">
                        <span>PTA-approved price</span>
                        <input
                          type="number"
                          min="1"
                          value={row.ptaPrice}
                          onChange={(e) => setFormData((previous) => ({
                            ...previous,
                            storageVariants: previous.storageVariants.map((item, rowIndex) => rowIndex === index ? { ...item, ptaPrice: e.target.value } : item)
                          }))}
                          placeholder="PKR (Optional)"
                          className="form-input"
                        />
                      </label>
                      <label className="admin-price-input">
                        <span>Non-PTA price</span>
                        <input
                          type="number"
                          min="1"
                          value={row.nonPtaPrice}
                          onChange={(e) => setFormData((previous) => ({
                            ...previous,
                            storageVariants: previous.storageVariants.map((item, rowIndex) => rowIndex === index ? { ...item, nonPtaPrice: e.target.value } : item)
                          }))}
                          placeholder="PKR (Optional)"
                          className="form-input"
                        />
                      </label>
                    </>
                  ) : (
                    <label className="admin-price-input">
                      <span>Price (PKR)</span>
                      <input
                        type="number"
                        min="1"
                        value={row.price}
                        onChange={(e) => setFormData((previous) => ({
                          ...previous,
                          storageVariants: previous.storageVariants.map((item, rowIndex) => rowIndex === index ? { ...item, price: e.target.value } : item)
                        }))}
                        placeholder="PKR"
                        className="form-input"
                        required
                      />
                    </label>
                  )}
                  {formData.storageVariants.length > 1 && (
                    <button
                      type="button"
                      className="admin-remove-option"
                      onClick={() => setFormData((previous) => ({
                        ...previous,
                        storageVariants: previous.storageVariants.filter((_, rowIndex) => rowIndex !== index)
                      }))}
                      aria-label={`Remove storage option ${index + 1}`}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              className="admin-add-option"
              onClick={() => setFormData((previous) => ({
                ...previous,
                storageVariants: [...previous.storageVariants, { storage: '', price: '', ptaPrice: '', nonPtaPrice: '' }]
              }))}
            >
              <Plus size={16} />
              Add storage option
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Hardware specs, camera details, and titanium build details..."
              className="form-textarea"
            />
          </div>

          <div className="form-group">
            <div className="admin-product-section-heading">
              <label className="form-label">Colors / Finishes</label>
            </div>
            <div className="admin-product-images">
              {formData.colors.map((color, index) => (
                <div className="admin-color-row" key={index}>
                  <input
                    type="text"
                    value={color.name}
                    onChange={(e) => setFormData((previous) => ({
                      ...previous,
                      colors: previous.colors.map((item, colorIndex) => colorIndex === index ? { ...item, name: e.target.value } : item)
                    }))}
                    placeholder="Color name"
                    className="form-input"
                  />
                  <input
                    type="color"
                    value={color.hex || '#171717'}
                    onChange={(e) => setFormData((previous) => ({
                      ...previous,
                      colors: previous.colors.map((item, colorIndex) => colorIndex === index ? { ...item, hex: e.target.value } : item)
                    }))}
                    aria-label={`Color swatch for ${color.name || `option ${index + 1}`}`}
                  />
                  <button
                    type="button"
                    className="admin-remove-option"
                    onClick={() => setFormData((previous) => ({
                      ...previous,
                      colors: previous.colors.filter((_, colorIndex) => colorIndex !== index)
                    }))}
                    aria-label={`Remove color ${index + 1}`}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="admin-add-option"
              onClick={() => setFormData((previous) => ({
                ...previous,
                colors: [...previous.colors, { name: '', hex: '#171717' }]
              }))}
            >
              <Plus size={16} />
              Add color
            </button>
          </div>

          <div className="form-group">
            <div className="admin-product-section-heading">
              <label className="form-label">Specifications</label>
            </div>
            <div className="admin-product-images">
              {formData.specifications.map((specification, index) => (
                <div className="admin-specification-row" key={index}>
                  <input
                    type="text"
                    value={specification.key}
                    onChange={(e) => setFormData((previous) => ({
                      ...previous,
                      specifications: previous.specifications.map((item, specIndex) => specIndex === index ? { ...item, key: e.target.value } : item)
                    }))}
                    placeholder="Specification"
                    className="form-input"
                  />
                  <input
                    type="text"
                    value={specification.value}
                    onChange={(e) => setFormData((previous) => ({
                      ...previous,
                      specifications: previous.specifications.map((item, specIndex) => specIndex === index ? { ...item, value: e.target.value } : item)
                    }))}
                    placeholder="Value"
                    className="form-input"
                  />
                  <button
                    type="button"
                    className="admin-remove-option"
                    onClick={() => setFormData((previous) => ({
                      ...previous,
                      specifications: previous.specifications.filter((_, specIndex) => specIndex !== index)
                    }))}
                    aria-label={`Remove specification ${index + 1}`}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="admin-add-option"
              onClick={() => setFormData((previous) => ({
                ...previous,
                specifications: [...previous.specifications, { key: '', value: '' }]
              }))}
            >
              <Plus size={16} />
              Add specification
            </button>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={formData.featured}
                onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                style={{ accentColor: 'var(--primary-blue)', width: '18px', height: '18px' }}
              />
              <span>Mark as Featured Product (displayed on storefront home page)</span>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" onClick={() => setIsFormOpen(false)} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingProduct ? 'Save Product Changes' : 'Publish Product to Store'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Confirm Inventory Deletion"
        maxWidth="440px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#DC2626' }}>
            <AlertTriangle size={24} />
            <strong style={{ fontSize: '1rem' }}>Are you sure you want to delete this listing?</strong>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            This item will be permanently removed from your local catalog and storefront.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button onClick={() => setDeleteConfirmId(null)} className="btn btn-outline btn-sm">
              Cancel
            </button>
            <button onClick={handleDeleteConfirm} className="btn btn-dark btn-sm" style={{ backgroundColor: '#DC2626', color: '#FFFFFF' }}>
              Delete Listing
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
