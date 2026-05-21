import React, { useState, useEffect } from 'react';
import useInventoryStore from '../store/useInventoryStore';
import useSettingsStore from '../store/useSettingsStore';
import useNotification from '../hooks/useNotification';
import formatCurrency from '../utils/formatCurrency';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Grid,
  FileSpreadsheet,
  AlertTriangle,
  QrCode,
  Image as ImageIcon,
  Gem,
  ShoppingBag,
  Sparkles,
  Watch,
  Glasses,
  Scissors,
  Shirt,
  Heart,
  Briefcase,
  Tag,
  Flame,
  Milestone,
  Flower2,
  ChevronDown
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import ConfirmModal from '../components/ui/ConfirmModal';
import Badge from '../components/ui/Badge';
import DataTable from '../components/ui/DataTable';

export default function Inventory() {
  const { showSuccess, showError, showWarning } = useNotification();

  // Zustand Store
  const {
    products,
    categories,
    isLoading,
    fetchProducts,
    fetchCategories,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    deleteCategory
  } = useInventoryStore();

  const { language } = useSettingsStore();
  const isEn = language === 'en';

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryData, setNewCategoryData] = useState({
    name_ar: '',
    name_en: '',
    color: '#00FF7F',
    icon: 'Tag'
  });

  // Form inputs
  const [formData, setFormData] = useState({
    name_ar: '',
    name_en: '',
    sku: '',
    barcode: '',
    purchase_price: '',
    sale_price: '',
    quantity: '',
    min_quantity: '',
    category_id: '',
    image_url: ''
  });
  const [dragActive, setDragActive] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [categoryOpen, setCategoryOpen] = useState(false);

  const clearFieldError = (field) => {
    setFormErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    isLoading: false
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showWarning(isEn ? 'File size exceeds 5MB limit' : 'حجم الصورة يتجاوز الحد المسموح به وهو 5 ميغابايت');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, image_url: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.type.startsWith("image/")) {
        showWarning(isEn ? "Only image files are allowed" : "يسمح فقط بملفات الصور");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showWarning(isEn ? "File size exceeds 5MB limit" : "حجم الصورة يتجاوز الحد المسموح به وهو 5 ميغابايت");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image_url: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // Filter products catalog
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name_ar.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.barcode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCat = selectedCat === 'all' || p.category_id === parseInt(selectedCat, 10);
    const matchesLow = !showLowStockOnly || p.quantity <= p.min_quantity;

    return matchesSearch && matchesCat && matchesLow;
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      name_ar: '',
      name_en: '',
      sku: '',
      barcode: '',
      purchase_price: '',
      sale_price: '',
      quantity: '',
      min_quantity: '',
      category_id: categories[0]?.id || '',
      image_url: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p) => {
    setEditingId(p.id);
    setFormData({
      name_ar: p.name_ar,
      name_en: p.name_en || '',
      sku: p.sku,
      barcode: p.barcode,
      purchase_price: String(p.purchase_price),
      sale_price: String(p.sale_price),
      quantity: String(p.quantity),
      min_quantity: String(p.min_quantity),
      category_id: String(p.category_id),
      image_url: p.image_url || ''
    });
    setIsModalOpen(true);
  };

  // Generate unique codes automatically
  const handleAutoGenerateCodes = () => {
    const rand = Math.floor(10000000 + Math.random() * 90000000);
    const skuCode = `SKU-${rand.toString().slice(0, 4)}`;
    const barcodeVal = `622${rand.toString().slice(0, 10)}`;
    setFormData(prev => ({ ...prev, sku: skuCode, barcode: barcodeVal }));
    showSuccess(isEn ? 'Codes generated successfully!' : 'تم توليد الرموز العشوائية بنجاح!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.name_ar?.trim()) errors.name_ar = isEn ? 'This field is required' : 'هذا الحقل مطلوب';
    if (!formData.sku?.trim()) errors.sku = isEn ? 'This field is required' : 'هذا الحقل مطلوب';
    if (!formData.barcode?.trim()) errors.barcode = isEn ? 'This field is required' : 'هذا الحقل مطلوب';
    if (!formData.sale_price && formData.sale_price !== 0) errors.sale_price = isEn ? 'This field is required' : 'هذا الحقل مطلوب';
    if (!formData.quantity && formData.quantity !== 0) errors.quantity = isEn ? 'This field is required' : 'هذا الحقل مطلوب';
    if (!formData.min_quantity && formData.min_quantity !== 0) errors.min_quantity = isEn ? 'This field is required' : 'هذا الحقل مطلوب';
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload = {
      ...formData,
      purchase_price: parseFloat(formData.purchase_price || 0),
      sale_price: parseFloat(formData.sale_price),
      quantity: parseInt(formData.quantity || 0, 10),
      min_quantity: parseInt(formData.min_quantity || 1, 10),
      category_id: parseInt(formData.category_id, 10)
    };

    try {
      if (editingId) {
        await updateProduct(editingId, payload);
        showSuccess(isEn ? 'Product updated successfully!' : 'تم تعديل المنتج في المخزن بنجاح!');
      } else {
        await addProduct(payload);
        showSuccess(isEn ? 'New product added successfully!' : 'تمت إضافة المنتج الجديد للمخزن!');
      }
      setIsModalOpen(false);
    } catch (err) {
      showError(err.message || (isEn ? 'Failed to save product' : 'فشل حفظ المنتج'));
    }
  };

  const handleDelete = (id, name) => {
    setConfirmModal({
      isOpen: true,
      title: isEn ? 'Confirm Deletion' : 'تأكيد الحذف',
      message: isEn ? `Are you sure you want to delete "${name}" permanently?` : `هل أنت متأكد من حذف المنتج: ${name} نهائياً؟`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        try {
          await deleteProduct(id);
          showSuccess(isEn ? 'Product deleted successfully' : 'تم حذف المنتج بنجاح');
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          showError(err.message || (isEn ? 'Failed to delete product' : 'فشل حذف المنتج'));
          setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
      },
      isLoading: false
    });
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryData.name_ar) {
      showWarning(isEn ? 'Arabic name is required' : 'اسم الفئة بالعربية مطلوب');
      return;
    }
    try {
      await addCategory(newCategoryData);
      showSuccess(isEn ? 'Category added successfully' : 'تمت إضافة الفئة بنجاح');
      setNewCategoryData({ name_ar: '', name_en: '', color: '#00FF7F', icon: 'Tag' });
    } catch (err) {
      showError(err.message || (isEn ? 'Failed to add category' : 'فشل إضافة الفئة'));
    }
  };

  const handleDeleteCategory = (id, name) => {
    setConfirmModal({
      isOpen: true,
      title: isEn ? 'Confirm Category Deletion' : 'تأكيد حذف الفئة',
      message: isEn ? `Are you sure you want to delete category "${name}"?` : `هل أنت متأكد من حذف الفئة: "${name}"؟`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        try {
          await deleteCategory(id);
          showSuccess(isEn ? 'Category deleted successfully' : 'تم حذف الفئة بنجاح');
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          showError(err.message || (isEn ? 'Failed to delete category (may contain products)' : 'فشل حذف الفئة (قد تحتوي على منتجات مرتبطة بها)'));
          setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
      },
      isLoading: false
    });
  };

  const handleExportDummyExcel = () => {
    // UTF-8 BOM + semicolon separator for proper Arabic display in Excel
    let csvContent = "\uFEFF";
    csvContent += isEn
      ? "Name (Ar);Name (En);SKU;Barcode;Purchase Price;Sale Price;Quantity;Min Stock\n"
      : "الاسم العربي;الاسم الأجنبي;SKU;الباركود;سعر الشراء;سعر البيع;الكمية;الحد الأدنى\n";
    products.forEach(p => {
      csvContent += `"${p.name_ar}";"${p.name_en || ''}";"${p.sku}";"${p.barcode}";${p.purchase_price};${p.sale_price};${p.quantity};${p.min_quantity}\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "store_inventory_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showSuccess(isEn ? 'Inventory exported successfully!' : 'تم تصدير المخزون كملف Excel/CSV بنجاح!');
  };

  const headers = isEn ? [
    'Product',
    'Barcode/SKU',
    'Category',
    'Purchase Price',
    'Sale Price',
    'Quantity',
    'Actions'
  ] : [
    'العمليات',
    'الكمية',
    'سعر البيع',
    'سعر الشراء',
    'الفئة',
    'الباركود/الرمز',
    'المنتج'
  ];

  return (
    <div className="flex flex-col gap-6 text-right pb-10 pt-6 select-none">
      
      {/* Title block */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4 ${isEn ? 'text-left' : 'text-right'}`}>
        <div className="flex flex-col">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-text-primary">{isEn ? 'Inventory Management' : 'إدارة المخزن والمستودع'}</h2>
          <p className="text-[11px] md:text-xs font-semibold text-text-secondary mt-0.5 md:mt-1">
            {isEn ? 'Add clothing, edit prices, and monitor stock levels' : 'إضافة الملابس، تعديل الأسعار، ومراقبة مستوى القطع المتبقية'}
          </p>
        </div>

        <div className={`flex gap-2 md:gap-3 w-full md:w-auto ${isEn ? 'flex-row-reverse' : 'flex-row'} flex-wrap`}>
          <Button
            onClick={handleExportDummyExcel}
            variant="secondary"
            className={`h-10 md:h-11 px-3 md:px-4 text-[10px] md:text-xs font-bold flex items-center gap-1.5 md:gap-2 ${isEn ? 'flex-row-reverse' : ''}`}
          >
            <FileSpreadsheet className="w-3.5 md:w-4.5 h-3.5 md:h-4.5" />
            <span className="hidden sm:inline">{isEn ? 'Export to Excel' : 'تصدير كملف Excel'}</span>
            <span className="sm:hidden">{isEn ? 'Export' : 'تصدير'}</span>
          </Button>

          <Button
            onClick={() => setIsCategoryModalOpen(true)}
            variant="secondary"
            className={`h-10 md:h-11 px-3 md:px-4 text-[10px] md:text-xs font-bold flex items-center gap-1.5 md:gap-2 ${isEn ? 'flex-row-reverse' : ''}`}
          >
            <Grid className="w-3.5 md:w-4.5 h-3.5 md:h-4.5" />
            <span className="hidden sm:inline">{isEn ? 'Manage Categories' : 'إدارة الفئات'}</span>
            <span className="sm:hidden">{isEn ? 'Categories' : 'الفئات'}</span>
          </Button>

          <Button
            onClick={handleOpenAdd}
            variant="primary"
            className={`h-10 md:h-11 px-4 md:px-5 text-[10px] md:text-xs font-bold flex items-center gap-1.5 md:gap-2 ${isEn ? 'flex-row-reverse' : ''}`}
          >
            <Plus className="w-3.5 md:w-4.5 h-3.5 md:h-4.5 text-on-accent" />
            <span className="hidden sm:inline">{isEn ? 'Add Product' : 'إضافة منتج جديد'}</span>
            <span className="sm:hidden">{isEn ? 'Add' : 'إضافة'}</span>
          </Button>
        </div>
      </div>

      {/* 2. Filters bar */}
      <div className={`glass-panel p-3 md:p-5 rounded-xl md:rounded-2xl border border-medium flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-5 select-none ${isEn ? 'flex-row-reverse' : ''}`}>
        
        {/* Search */}
        <div className="relative w-full md:max-w-sm">
          <div className={`absolute top-1/2 -translate-y-1/2 text-text-secondary ${isEn ? 'left-3 md:left-4' : 'right-3 md:right-4'}`}>
            <Search className="w-3.5 md:w-4.5 h-3.5 md:h-4.5" />
          </div>
          <input
            type="text"
            placeholder={isEn ? "Search by name, SKU, or barcode..." : "ابحث بالاسم، SKU، أو الباركود..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full h-10 md:h-11 bg-subtle border border-medium rounded-xl text-[10px] md:text-xs font-semibold focus:border-accent-primary outline-none transition-all ${isEn ? 'pl-9 md:pl-11 pr-3 md:pr-4 text-left' : 'pr-9 md:pr-11 pl-3 md:pl-4 text-right'}`}
          />
        </div>

        {/* Category Pills & Warnings */}
        <div className={`flex flex-wrap items-center gap-1.5 md:gap-2.5 w-full md:w-auto justify-start md:justify-end ${isEn ? 'flex-row-reverse' : ''}`}>
          {/* Low stock selector */}
          <button
            onClick={() => setShowLowStockOnly(prev => !prev)}
            className={`text-[10px] md:text-xs font-extrabold px-3 md:px-4 py-2 md:py-2.5 rounded-xl border flex items-center gap-1.5 md:gap-2 transition-all whitespace-nowrap ${
              showLowStockOnly
                ? 'bg-status-warning/15 border-status-warning text-status-warning'
                : 'border-medium text-text-secondary hover:text-text-primary'
            } ${isEn ? 'flex-row-reverse' : ''}`}
          >
            <AlertTriangle className="w-3 md:w-4 h-3 md:h-4" />
            <span className="hidden xs:inline">{isEn ? 'Low Stock Only' : 'النواقص فقط'}</span>
            <span className="xs:hidden">{isEn ? 'Low' : 'نواقص'}</span>
          </button>

          {/* Category filters pills */}
          <button
            onClick={() => setSelectedCat('all')}
            className={`text-[10px] md:text-xs font-extrabold px-3 md:px-4 py-2 md:py-2.5 rounded-xl border transition-all whitespace-nowrap ${
              selectedCat === 'all'
                ? 'bg-accent-primary text-on-accent border-accent-primary'
                : 'border-medium text-text-secondary hover:text-text-primary'
            }`}
          >
            {isEn ? 'All' : 'الكل'}
          </button>

          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(String(c.id))}
              className={`text-[10px] md:text-xs font-extrabold px-3 md:px-4 py-2 md:py-2.5 rounded-xl border transition-all whitespace-nowrap ${
                selectedCat === String(c.id)
                  ? 'bg-accent-primary text-on-accent border-accent-primary'
                  : 'border-medium text-text-secondary hover:text-text-primary'
              }`}
            >
              {c.name_ar}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Catalog Products Table */}
      <DataTable
        headers={headers}
        data={filteredProducts}
        isLoading={isLoading}
        renderRow={(p) => {
          const isLow = p.quantity <= p.min_quantity;
          const catObj = categories.find(c => c.id === p.category_id);

          // Elegant colorful quantity indicator
          let qtyColor = 'bg-accent-primary';
          if (p.quantity === 0) qtyColor = 'bg-status-danger animate-pulse';
          else if (isLow) qtyColor = 'bg-status-warning';

          return (
            <tr key={p.id} className={`hover:bg-subtle transition-colors flex md:table-row flex-col border-b border-light md:border-none ${isEn ? 'flex-col-reverse' : ''}`}>
              
              {isEn ? (
                <>
                  <td className="p-2 md:p-4 text-left">
                    <div className="flex items-center gap-2 md:gap-3.5 justify-start">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-selected border border-medium flex items-center justify-center text-accent-primary overflow-hidden">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name_en || p.name_ar} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-4 md:w-5 h-4 md:h-5 opacity-60" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-text-primary font-extrabold text-xs md:text-sm">{p.name_en || p.name_ar}</span>
                        <span className="text-[10px] text-text-disabled mt-0.5 font-medium dir-ltr">{p.name_ar}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-2 md:p-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-text-primary tracking-tight font-extrabold">{p.barcode}</span>
                      <span className="text-[10px] text-text-disabled mt-0.5 font-bold">SKU: {p.sku}</span>
                    </div>
                  </td>
                  <td className="p-2 md:p-4 text-center">
                    <Badge variant={catObj?.id === 1 ? 'primary' : catObj?.id === 2 ? 'warning' : 'success'}>
                      {catObj?.name_en || catObj?.name_ar || 'General'}
                    </Badge>
                  </td>
                  <td className="p-2 md:p-4 text-center text-text-secondary font-bold">
                    {formatCurrency(p.purchase_price)}
                  </td>
                  <td className="p-2 md:p-4 text-center text-accent-primary font-black">
                    {formatCurrency(p.sale_price)}
                  </td>
                  <td className="p-2 md:p-4 w-36 md:w-44">
                    <div className="flex flex-col gap-1.5 text-left font-bold">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-text-primary">{p.quantity} Units</span>
                        <span className={isLow ? 'text-status-warning' : 'text-text-secondary'}>
                          {isLow ? `Low (Min: ${p.min_quantity})` : 'Good Level'}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-subtle border border-light rounded-full overflow-hidden">
                        <div
                          className={`h-full ${qtyColor} rounded-full transition-all duration-300`}
                          style={{ width: `${Math.min(100, (p.quantity / (p.min_quantity * 3 || 10)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-2 md:p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 md:gap-2">
                      <button onClick={() => handleOpenEdit(p)} className="p-1.5 md:p-2 text-text-disabled hover:text-accent-primary rounded-lg bg-subtle hover:bg-selected transition-all focus:outline-none" title="Edit">
                        <Edit2 className="w-3.5 md:w-4 h-3.5 md:h-4" />
                      </button>
                      <button onClick={() => handleDelete(p.id, p.name_en || p.name_ar)} className="p-1.5 md:p-2 text-text-disabled hover:text-status-danger rounded-lg bg-status-danger/5 hover:bg-status-danger/10 transition-all focus:outline-none" title="Delete">
                        <Trash2 className="w-3.5 md:w-4 h-3.5 md:h-4" />
                      </button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td className="p-2 md:p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleOpenEdit(p)} className="p-2 text-text-disabled hover:text-accent-primary rounded-lg bg-subtle hover:bg-selected transition-all focus:outline-none" title="تعديل">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(p.id, p.name_ar)} className="p-2 text-text-disabled hover:text-status-danger rounded-lg bg-status-danger/5 hover:bg-status-danger/10 transition-all focus:outline-none" title="حذف">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="p-2 md:p-4 w-36 md:w-44">
                    <div className="flex flex-col gap-1.5 text-right font-bold">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className={isLow ? 'text-status-warning' : 'text-text-secondary'}>
                          {isLow ? `منخفض (الحد: ${p.min_quantity})` : 'مستوى ممتاز'}
                        </span>
                        <span className="text-text-primary">{p.quantity} قطع</span>
                      </div>
                      <div className="h-2 w-full bg-subtle border border-light rounded-full overflow-hidden">
                        <div
                          className={`h-full ${qtyColor} rounded-full transition-all duration-300`}
                          style={{ width: `${Math.min(100, (p.quantity / (p.min_quantity * 3 || 10)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-2 md:p-4 text-center text-accent-primary font-black">
                    {formatCurrency(p.sale_price)}
                  </td>
                  <td className="p-2 md:p-4 text-center text-text-secondary font-bold">
                    {formatCurrency(p.purchase_price)}
                  </td>
                  <td className="p-2 md:p-4 text-center">
                    <Badge variant={catObj?.id === 1 ? 'primary' : catObj?.id === 2 ? 'warning' : 'success'}>
                      {catObj?.name_ar || 'عام'}
                    </Badge>
                  </td>
                  <td className="p-2 md:p-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-text-primary tracking-tight font-extrabold">{p.barcode}</span>
                      <span className="text-[10px] text-text-disabled mt-0.5 font-bold">SKU: {p.sku}</span>
                    </div>
                  </td>
                  <td className="p-2 md:p-4 text-right">
                    <div className="flex items-center gap-2 md:gap-3.5 justify-end">
                      <div className="flex flex-col">
                        <span className="text-text-primary font-extrabold text-xs md:text-sm">{p.name_ar}</span>
                        <span className="text-[10px] text-text-disabled mt-0.5 font-medium dir-ltr">{p.name_en}</span>
                      </div>
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-selected border border-medium flex items-center justify-center text-accent-primary overflow-hidden">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name_ar} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-4 md:w-5 h-4 md:h-5 opacity-60" />
                        )}
                      </div>
                    </div>
                  </td>
                </>
              )}
            </tr>
          );
        }}
      />

      {/* 4. Add/Edit Product Modal Dialog */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? (isEn ? 'Edit Product' : 'تعديل منتج في المخزن') : (isEn ? 'Add New Product' : 'إضافة منتج جديد للمخزن')}
        size="lg"
        footer={
          <div className="flex gap-3 justify-end px-6 py-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="h-11 px-5 text-xs font-extrabold rounded-xl border-2 border-default bg-transparent text-text-secondary hover:bg-hover hover:text-text-primary hover:border-text-secondary transition-all duration-200"
            >
              {isEn ? 'Cancel' : 'إلغاء'}
            </button>
            <button
              type="submit"
              form="product-form"
              className="h-11 px-6 text-xs font-extrabold rounded-xl bg-accent-primary text-on-accent hover:brightness-110 active:scale-[0.98] shadow-lg shadow-accent-primary/20 transition-all duration-200"
            >
              {editingId ? (isEn ? 'Save Changes' : 'حفظ التعديلات') : (isEn ? 'Save Product' : 'إضافة وحفظ الصنف')}
            </button>
          </div>
        }
      >
        <form id="product-form" onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2.5">
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-[13px] font-medium text-text-secondary select-none">
                {isEn ? 'Product Name (Arabic)' : 'الاسم العربي للمنتج'} <span className="text-status-danger">*</span>
              </label>
              <input
                value={formData.name_ar}
                onChange={(e) => { setFormData(prev => ({ ...prev, name_ar: e.target.value })); clearFieldError('name_ar'); }}
                placeholder={isEn ? 'Example: Evening Dress Velvet' : 'مثال: فستان سهرة مخملي'}
                className={`w-full h-[52px] bg-subtle border rounded-xl text-text-primary text-sm font-medium outline-none transition-all duration-200 focus:border-accent-primary focus:shadow-accent px-4 ${formErrors.name_ar ? 'border-status-danger' : 'border-default'}`}
              />
              {formErrors.name_ar && <span className="text-[11px] text-status-danger font-medium">{formErrors.name_ar}</span>}
            </div>

            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-[13px] font-medium text-text-secondary select-none">
                {isEn ? 'Product Name (English)' : 'الاسم الأجنبي (اختياري)'}
              </label>
              <input
                value={formData.name_en}
                onChange={(e) => setFormData(prev => ({ ...prev, name_en: e.target.value }))}
                placeholder="Example: Evening Dress Velvet"
                className="w-full h-[52px] bg-subtle border border-default rounded-xl text-text-primary text-sm font-medium outline-none transition-all duration-200 focus:border-accent-primary focus:shadow-accent px-4"
              />
            </div>

            <div className="md:col-span-2 grid grid-cols-12 gap-3 items-start">
              <div className="col-span-12 md:col-span-8 grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-[13px] font-medium text-text-secondary select-none">
                    {isEn ? 'SKU Code' : 'الرمز الفرعي SKU'} <span className="text-status-danger">*</span>
                  </label>
                  <input
                    value={formData.sku}
                    onChange={(e) => { setFormData(prev => ({ ...prev, sku: e.target.value })); clearFieldError('sku'); }}
                    placeholder="SKU-XXXX"
                    className={`w-full h-[52px] bg-subtle border rounded-xl text-text-primary text-sm font-medium outline-none transition-all duration-200 focus:border-accent-primary focus:shadow-accent px-4 ${formErrors.sku ? 'border-status-danger' : 'border-default'}`}
                  />
                  {formErrors.sku && <span className="text-[11px] text-status-danger font-medium">{formErrors.sku}</span>}
                </div>
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-[13px] font-medium text-text-secondary select-none">
                    {isEn ? 'Barcode' : 'رقم الباركود'} <span className="text-status-danger">*</span>
                  </label>
                  <input
                    value={formData.barcode}
                    onChange={(e) => { setFormData(prev => ({ ...prev, barcode: e.target.value })); clearFieldError('barcode'); }}
                    placeholder="622XXXXXXXXXX"
                    className={`w-full h-[52px] bg-subtle border rounded-xl text-text-primary text-sm font-medium outline-none transition-all duration-200 focus:border-accent-primary focus:shadow-accent px-4 ${formErrors.barcode ? 'border-status-danger' : 'border-default'}`}
                  />
                  {formErrors.barcode && <span className="text-[11px] text-status-danger font-medium">{formErrors.barcode}</span>}
                </div>
              </div>
              <div className="col-span-12 md:col-span-4 flex items-end">
                <Button
                  onClick={handleAutoGenerateCodes}
                  variant="secondary"
                  className="w-full h-[52px] text-[11px] font-black border-accent-primary/25 flex items-center justify-center gap-2"
                >
                  <QrCode className="w-4 h-4" />
                  {isEn ? 'Auto Generate' : 'توليد عشوائي'}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-[13px] font-medium text-text-secondary select-none">
                {isEn ? 'Purchase Price' : 'سعر شراء القطعة (د.ج)'}
              </label>
              <input
                type="number"
                value={formData.purchase_price}
                onChange={(e) => setFormData(prev => ({ ...prev, purchase_price: e.target.value }))}
                placeholder="0"
                className="w-full h-[52px] bg-subtle border border-default rounded-xl text-text-primary text-sm font-medium outline-none transition-all duration-200 focus:border-accent-primary focus:shadow-accent px-4"
              />
            </div>

            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-[13px] font-medium text-text-secondary select-none">
                {isEn ? 'Sale Price' : 'سعر البيع النهائي (د.ج)'} <span className="text-status-danger">*</span>
              </label>
              <input
                type="number"
                value={formData.sale_price}
                onChange={(e) => { setFormData(prev => ({ ...prev, sale_price: e.target.value })); clearFieldError('sale_price'); }}
                placeholder="0"
                className={`w-full h-[52px] bg-subtle border rounded-xl text-text-primary text-sm font-medium outline-none transition-all duration-200 focus:border-accent-primary focus:shadow-accent px-4 ${formErrors.sale_price ? 'border-status-danger' : 'border-default'}`}
              />
              {formErrors.sale_price && <span className="text-[11px] text-status-danger font-medium">{formErrors.sale_price}</span>}
            </div>

            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-[13px] font-medium text-text-secondary select-none">
                {isEn ? 'Current Stock Quantity' : 'الكمية الحالية في المستودع'} <span className="text-status-danger">*</span>
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => { setFormData(prev => ({ ...prev, quantity: e.target.value })); clearFieldError('quantity'); }}
                placeholder="0"
                className={`w-full h-[52px] bg-subtle border rounded-xl text-text-primary text-sm font-medium outline-none transition-all duration-200 focus:border-accent-primary focus:shadow-accent px-4 ${formErrors.quantity ? 'border-status-danger' : 'border-default'}`}
              />
              {formErrors.quantity && <span className="text-[11px] text-status-danger font-medium">{formErrors.quantity}</span>}
            </div>

            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-[13px] font-medium text-text-secondary select-none">
                {isEn ? 'Minimum Stock Alert' : 'الحد الأدنى للمخزون (تحذير النواقص)'} <span className="text-status-danger">*</span>
              </label>
              <input
                type="number"
                value={formData.min_quantity}
                onChange={(e) => { setFormData(prev => ({ ...prev, min_quantity: e.target.value })); clearFieldError('min_quantity'); }}
                placeholder="5"
                className={`w-full h-[52px] bg-subtle border rounded-xl text-text-primary text-sm font-medium outline-none transition-all duration-200 focus:border-accent-primary focus:shadow-accent px-4 ${formErrors.min_quantity ? 'border-status-danger' : 'border-default'}`}
              />
              {formErrors.min_quantity && <span className="text-[11px] text-status-danger font-medium">{formErrors.min_quantity}</span>}
            </div>

            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-[13px] font-medium text-text-secondary select-none">{isEn ? 'Category' : 'فئة الصنف'}</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <button
                    type="button"
                    onClick={() => setCategoryOpen(prev => !prev)}
                    className="flex items-center justify-between w-full h-[52px] bg-subtle border border-default rounded-xl px-4 text-xs font-bold text-text-primary outline-none transition-all duration-200 focus:border-accent-primary"
                  >
                    <span>{categories.find(c => c.id === formData.category_id)
                      ? (isEn
                        ? (categories.find(c => c.id === formData.category_id).name_en || categories.find(c => c.id === formData.category_id).name_ar)
                        : categories.find(c => c.id === formData.category_id).name_ar)
                      : (isEn ? 'Select category' : 'اختر الفئة')}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform duration-200 ${categoryOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {categoryOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setCategoryOpen(false)} />
                      <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-bg-primary border border-medium rounded-xl shadow-xl shadow-black/30 overflow-hidden">
                        <div className="max-h-[220px] overflow-y-auto py-1">
                          {categories.map(c => {
                            const selected = formData.category_id === c.id;
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => { setFormData(prev => ({ ...prev, category_id: c.id })); setCategoryOpen(false); }}
                                className={`w-full text-right px-4 py-2.5 text-xs font-bold transition-all duration-150 ${
                                  selected
                                    ? 'bg-accent-primary/15 text-accent-primary'
                                    : 'text-text-primary hover:bg-hover'
                                }`}
                              >
                                {isEn ? (c.name_en || c.name_ar) : c.name_ar}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="h-[52px] w-[52px] min-w-[52px] bg-hover border border-default hover:border-accent-primary hover:bg-active rounded-xl flex items-center justify-center text-accent-primary transition-all shrink-0"
                  title={isEn ? 'Manage Categories' : 'إدارة الفئات'}
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-text-secondary select-none">
                {isEn ? 'Product Image' : 'صورة المنتج'}
              </label>
              {formData.image_url ? (
                <div className="relative group w-full h-[150px] rounded-2xl overflow-hidden bg-subtle border border-default flex items-center justify-center transition-all duration-300">
                  <img src={formData.image_url} alt="Product preview" className="w-full h-full object-contain p-2" />
                  <div className="absolute inset-0 bg-bg-primary/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                      className="p-3 bg-status-danger text-on-accent rounded-full hover:scale-110 active:scale-95 transition-all shadow-lg shadow-status-danger/30"
                      title={isEn ? 'Remove Image' : 'حذف الصورة'}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
                  onClick={() => document.getElementById('product-image-upload').click()}
                  className={`relative w-full h-[150px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 cursor-pointer select-none transition-all duration-300 ${
                    dragActive ? 'border-accent-primary bg-hover shadow-lg shadow-accent-primary/10' : 'border-default bg-subtle hover:border-accent-primary/50 hover:bg-selected'
                  }`}
                >
                  <input type="file" id="product-image-upload" accept="image/*" onChange={handleFileChange} className="hidden" />
                  <div className="w-12 h-12 rounded-full bg-hover flex items-center justify-center border border-medium text-accent-primary mb-3">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-black text-text-primary mb-1">
                    {isEn ? 'Drag & drop your image here, or browse' : 'اسحب وأفلت صورة المنتج هنا، أو اضغط للتصفح'}
                  </p>
                  <p className="text-[10px] font-bold text-text-disabled">
                    {isEn ? 'Supports PNG, JPG, JPEG (Max 5MB)' : 'صيغ PNG، JPG، JPEG (الحد الأقصى 5 ميجابايت)'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </form>
      </Modal>

      {/* 5. Manage Categories Modal Dialog */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={isEn ? 'Manage Categories' : 'إدارة الفئات والأصناف'}
        size="md"
      >
        <div className={`flex flex-col gap-6 select-none ${isEn ? 'text-left' : 'text-right'}`}>
          {/* Add Category Form */}
          <form onSubmit={handleAddCategory} className="glass-panel p-4 rounded-xl border border-medium flex flex-col gap-4">
            <h3 className="text-sm font-black text-accent-primary">
              {isEn ? 'Add New Category' : 'إضافة فئة جديدة'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={isEn ? "Category Name (Arabic)" : "اسم الفئة بالعربية"}
                placeholder={isEn ? "e.g. Perfumes" : "مثال: عطور"}
                value={newCategoryData.name_ar}
                onChange={(e) => setNewCategoryData(prev => ({ ...prev, name_ar: e.target.value }))}
                required
              />

              <Input
                label={isEn ? "Category Name (English)" : "الاسم بالإنجليزية (اختياري)"}
                placeholder="e.g. Perfumes"
                value={newCategoryData.name_en}
                onChange={(e) => setNewCategoryData(prev => ({ ...prev, name_en: e.target.value }))}
              />
            </div>

            {/* Color Tag Picker */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-text-secondary">
                {isEn ? 'Category Theme Color' : 'لون الفئة المميز'}
              </label>
              <div className="flex items-center gap-3">
                <input 
                  type="color" 
                  value={newCategoryData.color} 
                  onChange={(e) => setNewCategoryData(prev => ({ ...prev, color: e.target.value }))}
                  className="w-12 h-10 rounded-xl bg-transparent border border-default cursor-pointer p-1"
                />
                <span className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider bg-subtle border border-light px-3.5 py-2.5 rounded-lg select-all">
                  {newCategoryData.color}
                </span>
                {/* Visual Circle Preview */}
                <div 
                  className="w-4 h-4 rounded-full shadow-lg" 
                  style={{ 
                    backgroundColor: newCategoryData.color,
                    boxShadow: `0 0 12px ${newCategoryData.color}` 
                  }} 
                />
              </div>
            </div>

            {/* Icon Picker */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-text-secondary">
                {isEn ? 'Category Icon (Choose one)' : 'أيقونة الفئة (اختر واحدة)'}
              </label>
              <div className="flex flex-col gap-1.5">
                {[
                  { label: isEn ? 'Jewelry & Chains' : 'مجوهرات وسلاسل', icons: ['Gem', 'Milestone'] },
                  { label: isEn ? 'Bags & Accessories' : 'حقائب وإكسسوارات', icons: ['ShoppingBag', 'Briefcase', 'Heart'] },
                  { label: isEn ? 'Perfumes & Beauty' : 'عطور وتجميل', icons: ['Sparkles', 'Flame', 'Flower2'] },
                  { label: isEn ? 'Watches & Glasses' : 'ساعات ونظارات', icons: ['Watch', 'Glasses'] },
                  { label: isEn ? 'Sizes & Buttons' : 'مقاسات وأزرار', icons: ['Scissors', 'Shirt'] }
                ].map(group => (
                  <div key={group.label} className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-text-disabled w-28 flex-shrink-0">{group.label}</span>
                    <div className="flex gap-1">
                      {group.icons.map(iconName => {
                        const iconComponents = { Gem, ShoppingBag, Briefcase, Heart, Sparkles, Flame, Flower2, Watch, Glasses, Scissors, Shirt, Milestone, Tag };
                        const IconComp = iconComponents[iconName];
                        const isSelected = newCategoryData.icon === iconName;
                        return (
                          <button
                            key={iconName}
                            type="button"
                            onClick={() => setNewCategoryData(prev => ({ ...prev, icon: iconName }))}
                            className={`relative p-2 rounded-xl border transition-all ${
                              isSelected
                                ? 'border-accent-primary bg-accent-primary/10 shadow-accent scale-110'
                                : 'border-light bg-subtle hover:border-text-secondary hover:bg-hover'
                            }`}
                            title={iconName}
                          >
                            {IconComp && <IconComp className="w-4 h-4" style={{ color: isSelected ? newCategoryData.color : undefined }} />}
                            {isSelected && (
                              <span
                                className="absolute -inset-0.5 rounded-xl opacity-30"
                                style={{ boxShadow: `0 0 10px ${newCategoryData.color}` }}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="h-11 text-xs font-bold w-full mt-2"
            >
              {isEn ? 'Create Category' : 'تأكيد وإضافة الفئة'}
            </Button>
          </form>

          {/* Active Categories List */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-black text-text-primary border-b border-light pb-2.5">
              {isEn ? 'Active Categories List' : 'قائمة الفئات النشطة حالياً'}
            </h3>
            
            <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-1">
              {categories.map((c) => {
                const assocCount = products.filter(p => p.category_id === c.id).length;
                return (
                  <div 
                    key={c.id} 
                    className="flex justify-between items-center bg-subtle border border-light rounded-xl p-3.5 hover:border-default transition-all select-none"
                  >
                    {/* Category Label with Icon & Color */}
                    <div className="flex items-center gap-3">
                      <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-bg-card border border-default" style={{ borderColor: `${c.color}40` }}>
                        {(() => {
                          const iconComponents = { Gem: Gem, Milestone: Milestone, ShoppingBag: ShoppingBag, Briefcase: Briefcase, Heart: Heart, Sparkles: Sparkles, Flame: Flame, Flower2: Flower2, Watch: Watch, Glasses: Glasses, Scissors: Scissors, Shirt: Shirt, Tag: Tag };
                          const IconComp = iconComponents[c.icon] || Tag;
                          return <IconComp className="w-4 h-4" style={{ color: c.color || '#00FF7F' }} />;
                        })()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-text-primary">
                          {c.name_ar}
                        </span>
                        {c.name_en && (
                          <span className="text-[10px] text-text-disabled uppercase font-bold tracking-tight">
                            {c.name_en}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions and Count */}
                    <div className="flex items-center gap-4">
                      {/* Products Count pill */}
                      <span className="text-[10px] font-black bg-hover border border-medium text-accent-primary px-2.5 py-1 rounded-full">
                        {isEn ? `${assocCount} products` : `${assocCount} منتج`}
                      </span>

                      {/* Delete Category Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(c.id, c.name_ar)}
                        className="p-2 text-text-disabled hover:text-status-danger bg-status-danger/5 hover:bg-status-danger/10 rounded-lg transition-all"
                        title={isEn ? 'Delete Category' : 'حذف الفئة'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end border-t border-light pt-4 mt-2">
            <Button
              onClick={() => setIsCategoryModalOpen(false)}
              variant="ghost"
              className="h-11 text-xs font-bold"
            >
              {isEn ? 'Close' : 'إغلاق النافذة'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        isLoading={confirmModal.isLoading}
        isDestructive={true}
      />
    </div>
  );
}
