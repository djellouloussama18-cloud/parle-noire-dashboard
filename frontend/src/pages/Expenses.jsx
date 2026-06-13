import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import useSettingsStore from '../store/useSettingsStore';
import useNotification from '../hooks/useNotification';
import expensesApi, {
  getExpenses, getExpensesSummary, getExpensesCategories,
  createExpense, updateExpense, deleteExpense
} from '../api/expenses.api';
import * as reportsApi from '../api/reports.api';
import formatCurrency from '../utils/formatCurrency';
import KpiCard from '../components/ui/KpiCard';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import {
  TrendingDown, DollarSign, PieChart, Percent, Search,
  Plus, X, Loader2, AlertTriangle, Trash2, Edit3,
  Home, Users, Zap, Package, Megaphone, Wrench, Truck,
  Receipt, MoreHorizontal, CreditCard, Ban, RotateCcw
} from 'lucide-react';
import { PieChart as RPieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const translations = {
  ar: {
    title: 'المصاريف والتكاليف',
    addExpense: 'إضافة مصروف',
    editExpense: 'تعديل مصروف',
    totalExpenses: 'إجمالي المصاريف',
    netProfit: 'صافي الربح',
    topCategory: 'أكبر فئة إنفاق',
    expenseRatio: 'نسبة المصاريف',
    thisMonth: 'هذا الشهر',
    lastMonth: 'الشهر الماضي',
    custom: 'مخصص',
    allCategories: 'كل التصنيفات',
    allPayments: 'كل طرق الدفع',
    expenseTitle: 'عنوان المصروف',
    amount: 'المبلغ',
    category: 'التصنيف',
    paymentMethod: 'طريقة الدفع',
    date: 'التاريخ',
    notes: 'ملاحظات',
    isRecurring: 'مصروف متكرر',
    recurringType: 'نوع التكرار',
    noRecurrence: 'بلا تكرار',
    daily: 'يومي',
    weekly: 'أسبوعي',
    biweekly: 'نصف شهري',
    monthly: 'شهري',
    quarterly: 'ربعي',
    yearly: 'سنوي',
    cash: 'نقداً',
    card: 'بطاقة',
    transfer: 'تحويل بنكي',
    save: 'حفظ',
    cancel: 'إلغاء',
    edit: 'تعديل',
    delete: 'حذف',
    deleteConfirm: 'هل أنت متأكد من حذف هذا المصروف؟',
    deleteSuccess: 'تم حذف المصروف بنجاح',
    addSuccess: 'تم إضافة المصروف بنجاح',
    editSuccess: 'تم تعديل المصروف بنجاح',
    noExpenses: 'لا توجد مصاريف مسجلة',
    noExpensesDesc: 'ابدأ بإضافة مصاريفك لتتبع أرباحك الحقيقية',
    fromRevenue: 'من الإيرادات',
    profitPositive: 'ربح',
    profitNegative: 'خسارة',
    expenseDistribution: 'توزيع المصاريف',
    recurring: 'متكرر',
    startDate: 'من تاريخ',
    endDate: 'إلى تاريخ',
    loading: 'جاري التحميل...',
    confirmDelete: 'تأكيد الحذف',
    previous: 'السابق',
    next: 'التالي',
    page: 'صفحة',
    of: 'من',
    costOfGoodsSold: 'تكلفة البضاعة المباعة',
    grossProfit: 'الربح الإجمالي',
    grossMargin: 'هامش الربح الإجمالي',
    netMargin: 'هامش صافي الربح',
    totalRevenue: 'إجمالي المبيعات',
    profitBreakdown: 'تفاصيل الربح',
    startDateLabel: 'تاريخ البداية',
    endDateLabel: 'تاريخ الانتهاء (اختياري)',
    ongoing: 'مستمر',
    categories: {
      rent: 'إيجار', salaries: 'رواتب', utilities: 'فواتير ومرافق',
      inventory: 'شراء بضاعة', marketing: 'تسويق وإعلان',
      maintenance: 'صيانة', transport: 'نقل وشحن', taxes: 'ضرائب ورسوم', other: 'أخرى'
    }
  },
  en: {
    title: 'Expenses & Costs',
    addExpense: 'Add Expense',
    editExpense: 'Edit Expense',
    totalExpenses: 'Total Expenses',
    netProfit: 'Net Profit',
    topCategory: 'Top Spending Category',
    expenseRatio: 'Expense Ratio',
    thisMonth: 'This Month',
    lastMonth: 'Last Month',
    custom: 'Custom',
    allCategories: 'All Categories',
    allPayments: 'All Payment Methods',
    expenseTitle: 'Expense Title',
    amount: 'Amount',
    category: 'Category',
    paymentMethod: 'Payment Method',
    date: 'Date',
    notes: 'Notes',
    isRecurring: 'Recurring Expense',
    recurringType: 'Recurrence Type',
    noRecurrence: 'No Recurrence',
    daily: 'Daily',
    weekly: 'Weekly',
    biweekly: 'Biweekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly',
    cash: 'Cash',
    card: 'Card',
    transfer: 'Bank Transfer',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    deleteConfirm: 'Are you sure you want to delete this expense?',
    deleteSuccess: 'Expense deleted successfully',
    addSuccess: 'Expense added successfully',
    editSuccess: 'Expense updated successfully',
    noExpenses: 'No expenses recorded',
    noExpensesDesc: 'Start adding your expenses to track your real profit',
    fromRevenue: 'of revenue',
    profitPositive: 'Profit',
    profitNegative: 'Loss',
    expenseDistribution: 'Expense Distribution',
    recurring: 'Recurring',
    startDate: 'From Date',
    endDate: 'To Date',
    loading: 'Loading...',
    confirmDelete: 'Confirm Deletion',
    previous: 'Previous',
    next: 'Next',
    page: 'Page',
    of: 'of',
    costOfGoodsSold: 'Cost of Goods Sold',
    grossProfit: 'Gross Profit',
    grossMargin: 'Gross Margin',
    netMargin: 'Net Margin',
    totalRevenue: 'Total Revenue',
    profitBreakdown: 'Profit Breakdown',
    startDateLabel: 'Start Date',
    endDateLabel: 'End Date (optional)',
    ongoing: 'Ongoing',
    categories: {
      rent: 'Rent', salaries: 'Salaries', utilities: 'Utilities',
      inventory: 'Inventory Purchase', marketing: 'Marketing',
      maintenance: 'Maintenance', transport: 'Transport', taxes: 'Taxes & Fees', other: 'Other'
    }
  }
};

function getDailyRate(amount, recurringType) {
  const map = { daily: 1, weekly: 7, biweekly: 14, monthly: 30, quarterly: 90, yearly: 365 };
  const divisor = map[recurringType] || 30;
  return divisor > 0 ? amount / divisor : 0;
}

function getPeriodDateRange(p) {
  const today = new Date();
  let sDate;
  switch (p) {
    case 'day':
      sDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      break;
    case 'week':
      sDate = new Date(today);
      sDate.setDate(today.getDate() - 6);
      break;
    case 'month':
      sDate = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case 'year':
      sDate = new Date(today.getFullYear(), 0, 1);
      break;
    case 'all':
      sDate = new Date(2000, 0, 1);
      break;
    default:
      sDate = new Date(today.getFullYear(), today.getMonth(), 1);
  }
  return {
    start: sDate.toISOString().split('T')[0],
    end: today.toISOString().split('T')[0]
  };
}

const categoryMeta = {
  rent: { icon: Home, color: '#6366f1' },
  salaries: { icon: Users, color: '#f59e0b' },
  utilities: { icon: Zap, color: '#10b981' },
  inventory: { icon: Package, color: '#3b82f6' },
  marketing: { icon: Megaphone, color: '#ec4899' },
  maintenance: { icon: Wrench, color: '#f97316' },
  transport: { icon: Truck, color: '#8b5cf6' },
  taxes: { icon: Receipt, color: '#ef4444' },
  other: { icon: MoreHorizontal, color: '#6b7280' }
};

export default function Expenses() {
  const { language } = useSettingsStore();
  const isEn = language === 'en';
  const { showSuccess, showError } = useNotification();
  const t = translations[isEn ? 'en' : 'ar'];

  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [filters, setFilters] = useState({ category: '', payment_method: '' });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [period, setPeriod] = useState('day');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [formData, setFormData] = useState({
    title: '', amount: '', category: 'other', payment_method: 'cash',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    date: new Date().toISOString().split('T')[0], notes: '', is_recurring: false, recurring_type: 'monthly'
  });
  const [formErrors, setFormErrors] = useState({});
  const [periodSummary, setPeriodSummary] = useState(null);

  const showErrorRef = useRef(showError);
  showErrorRef.current = showError;
  const isEnRef = useRef(isEn);
  isEnRef.current = isEn;

  const loadData = useCallback(async (p, pageNum) => {
    const range = getPeriodDateRange(p);
    const pg = pageNum != null ? pageNum : pagination.page;
    setStartDate(range.start);
    setEndDate(range.end);
    setPeriodSummary(null);
    setCategories(prev => prev.map(c => ({ ...c, total_this_month: 0, percentage: 0 })));
    setIsLoading(true);

    try {
      const [expData, summaryData] = await Promise.all([
        expensesApi.getAll({
          startDate: range.start, endDate: range.end,
          page: pg, limit: pagination.limit,
          ...(filters.category && { category: filters.category }),
          ...(filters.payment_method && { payment_method: filters.payment_method })
        }),
        expensesApi.getSummaryInPeriod(range.start, range.end)
      ]);

      setExpenses(expData.expenses || []);
      setPagination(expData.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
      setPeriodSummary(summaryData);

      if (summaryData && summaryData.byCategoryList) {
        setCategories(prev => {
          const merged = prev.map(pc => {
            const match = summaryData.byCategoryList.find(c => c.category === pc.key);
            return match ? { ...pc, total_this_month: match.total, percentage: match.percentage } : { ...pc, total_this_month: 0, percentage: 0 };
          });
          return merged.length > 0 ? merged : prev;
        });
      }
    } catch (err) {
      console.error('❌ loadData error:', err);
      showErrorRef.current(err.message || 'Failed to load data');
      setExpenses([]);
      setPeriodSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, [filters.category, filters.payment_method, pagination.page]);

  const handlePeriodChange = useCallback((p) => {
    setPeriod(p);
    loadData(p, 1);
  }, [loadData]);

  useEffect(() => {
    expensesApi.getCategories().then(catData => setCategories(catData || [])).catch(() => setCategories([]));
    loadData(period);
  }, []);

  useEffect(() => {
    if (!period) return;
    const range = getPeriodDateRange(period);
    setIsLoading(true);
    expensesApi.getAll({
      startDate: range.start, endDate: range.end,
      page: pagination.page, limit: pagination.limit,
      ...(filters.category && { category: filters.category }),
      ...(filters.payment_method && { payment_method: filters.payment_method })
    }).then(expData => {
      setExpenses(expData.expenses || []);
      setPagination(expData.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
    }).catch(err => {
      console.error('❌ fetchExpenses error:', err);
      showErrorRef.current(err.message || 'Failed to load expenses');
      setExpenses([]);
    }).finally(() => setIsLoading(false));
  }, [filters.category, filters.payment_method, pagination.page]);

  const handleOpenAdd = () => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedExpense(null);
    setFormData({
      title: '', amount: '', category: 'other', payment_method: 'cash',
      start_date: today, end_date: '', date: today,
      notes: '', is_recurring: false, recurring_type: 'monthly'
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (exp) => {
    setSelectedExpense(exp);
    setFormData({
      title: exp.title,
      amount: String(exp.amount),
      category: exp.category,
      payment_method: exp.payment_method,
      start_date: exp.start_date || exp.date,
      end_date: exp.end_date || '',
      date: exp.date,
      notes: exp.notes || '',
      is_recurring: !!exp.is_recurring,
      recurring_type: exp.recurring_type || 'monthly'
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.title.trim()) errors.title = isEnRef.current ? 'Title is required' : 'العنوان مطلوب';
    if (!formData.amount || isNaN(formData.amount) || Number(formData.amount) <= 0) errors.amount = isEnRef.current ? 'Enter a valid amount' : 'أدخل مبلغاً صحيحاً';
    if (!formData.start_date) errors.start_date = isEnRef.current ? 'Start date is required' : 'تاريخ البداية مطلوب';
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        amount: Math.round(Number(formData.amount) * 100) / 100,
        category: formData.category,
        payment_method: formData.payment_method,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        date: formData.start_date,
        notes: formData.notes.trim(),
        is_recurring: formData.is_recurring,
        recurring_type: formData.is_recurring ? formData.recurring_type : null
      };

      if (selectedExpense) {
        const result = await updateExpense(selectedExpense.id, payload);
        const updated = result.data || result;
        setExpenses(prev => prev.map(e => e.id === selectedExpense.id ? { ...e, ...updated } : e));
        showSuccess(t.editSuccess);
      } else {
        const result = await createExpense(payload);
        const created = result.data || result;
        setExpenses(prev => [created, ...prev]);
        showSuccess(t.addSuccess);
      }
      setIsModalOpen(false);
      loadData(period);
    } catch (err) {
      showErrorRef.current(err.message || (isEnRef.current ? 'Failed to save expense' : 'فشل حفظ المصروف'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteExpense(deleteConfirmId);
      setExpenses(prev => prev.filter(e => e.id !== deleteConfirmId));
      showSuccess(t.deleteSuccess);
      setDeleteConfirmId(null);
      loadData(period);
    } catch (err) {
      showErrorRef.current(err.message || (isEnRef.current ? 'Failed to delete expense' : 'فشل حذف المصروف'));
    }
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const topCategory = useMemo(() => {
    if (!periodSummary || !periodSummary.byCategory) return null;
    const entries = Object.entries(periodSummary.byCategory).filter(([k, v]) => v > 0);
    if (entries.length === 0) return null;
    const [topKey, topVal] = entries.reduce((max, entry) => entry[1] > max[1] ? entry : max);
    return { category: topKey, total: topVal };
  }, [periodSummary]);

  const periodProfit = useMemo(() => {
    if (!periodSummary) return { net: 0, profit_margin: 0, total_revenue: 0 };
    const totalRevenue = periodSummary.totalRevenue || 0;
    const netVal = periodSummary.netProfit ?? 0;
    const margin = periodSummary.profitMargin != null ? periodSummary.profitMargin : (totalRevenue > 0 ? Math.round((netVal / totalRevenue) * 10000) / 100 : 0);
    return { net: netVal, profit_margin: margin, total_revenue: totalRevenue };
  }, [periodSummary]);

  const donutData = useMemo(() => {
    if (!categories || categories.length === 0) return [];
    return categories.map(entry => ({
      name: isEn ? entry.name_en : entry.name_ar,
      value: entry.total_this_month || 0,
      color: entry.color
    })).filter(entry => entry.value > 0);
  }, [categories, isEn]);

  const getCategoryName = (cat) => {
    const m = categoryMeta[cat];
    return isEn ? (translations.en.categories[cat] || cat) : (translations.ar.categories[cat] || cat);
  };

  const getPaymentLabel = (method) => {
    if (method === 'cash') return t.cash;
    if (method === 'card') return t.card;
    return t.transfer;
  };

  const getRecurringTypeLabel = (type) => {
    switch (type) {
      case 'daily': return t.daily;
      case 'weekly': return t.weekly;
      case 'biweekly': return t.biweekly;
      case 'monthly': return t.monthly;
      case 'quarterly': return t.quarterly;
      case 'yearly': return t.yearly;
      default: return type;
    }
  };

  const getDailyEquivalent = (exp) => {
    if (!exp.is_recurring || !exp.recurring_type) return null;
    return getDailyRate(Number(exp.amount) || 0, exp.recurring_type);
  };

  const renderForm = () => (
    <div className="space-y-4" dir={isEn ? 'ltr' : 'rtl'}>
      <div>
        <label className="text-xs font-bold text-text-secondary block mb-1.5">{t.expenseTitle} *</label>
        <input
          type="text" value={formData.title}
          onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
          className="w-full h-[48px] bg-subtle border border-default rounded-xl px-4 text-sm text-text-primary font-medium outline-none focus:border-accent-primary transition-all"
          placeholder={isEn ? 'e.g. Store Rent' : 'مثال: إيجار المحل'}
        />
        {formErrors.title && <span className="text-xs text-status-danger mt-1 block">{formErrors.title}</span>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-text-secondary block mb-1.5">{t.amount} *</label>
          <input
            type="number" step="0.01" min="0" value={formData.amount}
            onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))}
            className="w-full h-[48px] bg-subtle border border-default rounded-xl px-4 text-sm text-text-primary font-medium outline-none focus:border-accent-primary transition-all"
          />
          {formErrors.amount && <span className="text-xs text-status-danger mt-1 block">{formErrors.amount}</span>}
        </div>
        <div>
          <label className="text-xs font-bold text-text-secondary block mb-1.5">{t.category} *</label>
          <Select
            value={formData.category}
            onChange={v => setFormData(p => ({ ...p, category: v }))}
            options={Object.entries(translations[isEn ? 'en' : 'ar'].categories).map(([key, label]) => ({ value: key, label }))}
            dir={isEn ? 'ltr' : 'rtl'}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-text-secondary block mb-1.5">{t.paymentMethod}</label>
          <Select
            value={formData.payment_method}
            onChange={v => setFormData(p => ({ ...p, payment_method: v }))}
            options={[
              { value: 'cash', label: t.cash },
              { value: 'card', label: t.card },
              { value: 'transfer', label: t.transfer }
            ]}
            dir={isEn ? 'ltr' : 'rtl'}
          />
        </div>
        <div>
          <label className="text-xs font-bold text-text-secondary block mb-1.5">{t.startDateLabel} *</label>
          <input
            type="date" value={formData.start_date}
            onChange={e => setFormData(p => ({ ...p, start_date: e.target.value }))}
            className="w-full h-[48px] bg-subtle border border-default rounded-xl px-4 text-sm text-text-primary font-medium outline-none focus:border-accent-primary transition-all"
          />
          {formErrors.start_date && <span className="text-xs text-status-danger mt-1 block">{formErrors.start_date}</span>}
        </div>
        <div>
          <label className="text-xs font-bold text-text-secondary block mb-1.5">{t.endDateLabel}</label>
          <input
            type="date" value={formData.end_date}
            onChange={e => setFormData(p => ({ ...p, end_date: e.target.value }))}
            className="w-full h-[48px] bg-subtle border border-default rounded-xl px-4 text-sm text-text-primary font-medium outline-none focus:border-accent-primary transition-all"
          />
          {formData.end_date && formData.end_date < formData.start_date && (
            <span className="text-xs text-status-danger mt-1 block">{isEn ? 'End date must be after start date' : 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية'}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="checkbox" id="isRecurring" checked={formData.is_recurring}
          onChange={e => setFormData(p => ({ ...p, is_recurring: e.target.checked }))}
          className="w-4 h-4 rounded accent-accent-primary"
        />
        <label htmlFor="isRecurring" className="text-xs font-bold text-text-secondary">{t.isRecurring}</label>
      </div>
      {formData.is_recurring && (
        <div>
          <label className="text-xs font-bold text-text-secondary block mb-1.5">{t.recurringType}</label>
          <Select
            value={formData.recurring_type}
            onChange={v => setFormData(p => ({ ...p, recurring_type: v }))}
            options={[
              { value: 'daily', label: t.daily },
              { value: 'weekly', label: t.weekly },
              { value: 'biweekly', label: t.biweekly },
              { value: 'monthly', label: t.monthly },
              { value: 'quarterly', label: t.quarterly },
              { value: 'yearly', label: t.yearly }
            ]}
            dir={isEn ? 'ltr' : 'rtl'}
          />
          <p className="text-xs text-slate-400 mt-1">
            {formData.recurring_type === 'daily' && (isEn ? 'Amount is per day' : 'المبلغ لكل يوم')}
            {formData.recurring_type === 'weekly' && (isEn ? 'Amount is per week' : 'المبلغ لكل أسبوع')}
            {formData.recurring_type === 'biweekly' && (isEn ? 'Amount is every 2 weeks' : 'المبلغ كل أسبوعين')}
            {formData.recurring_type === 'monthly' && (isEn ? 'Amount is per month' : 'المبلغ لكل شهر')}
            {formData.recurring_type === 'quarterly' && (isEn ? 'Amount is per quarter' : 'المبلغ كل ربع سنة')}
            {formData.recurring_type === 'yearly' && (isEn ? 'Amount is per year' : 'المبلغ لكل سنة')}
          </p>
        </div>
      )}
      <div>
        <label className="text-xs font-bold text-text-secondary block mb-1.5">{t.notes}</label>
        <textarea
          value={formData.notes}
          onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
          className="w-full h-[80px] bg-subtle border border-default rounded-xl px-4 py-3 text-sm text-text-primary font-medium outline-none focus:border-accent-primary transition-all resize-none"
        />
      </div>
    </div>
  );

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto" dir={isEn ? 'ltr' : 'rtl'}>
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-black text-text-primary">{t.title}</h1>
        <button onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-primary text-on-accent text-sm font-bold hover:brightness-110 transition-all">
          <Plus className="w-4 h-4" />
          {t.addExpense}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard title={t.totalExpenses}
          value={formatCurrency(periodSummary?.totalExpenses ?? 0)}
          icon={TrendingDown}
          trendText={periodSummary?.totalRevenue > 0 ? `${Math.round((periodSummary.totalExpenses / periodSummary.totalRevenue) * 100)}% ${t.fromRevenue}` : ''}
          trendType="neutral"
          isLoading={isLoading}
          iconColorClass="text-status-danger bg-status-danger/10" />
        <KpiCard title={t.netProfit} value={formatCurrency(periodProfit.net)}
          icon={DollarSign}
          trendText={periodProfit.total_revenue > 0 ? `${periodProfit.profit_margin}% ${t.fromRevenue}` : (periodProfit.net < 0 ? t.profitNegative : '')}
          trendType={periodProfit.net > 0 ? 'up' : periodProfit.net < 0 ? 'down' : 'neutral'}
          isLoading={isLoading}
          iconColorClass={periodProfit.net > 0 ? 'text-emerald-400 bg-emerald-400/10' : periodProfit.net < 0 ? 'text-red-400 bg-red-400/10' : 'text-sky-400 bg-sky-400/10'} />
        <KpiCard title={t.topCategory} value={topCategory ? (isEn ? translations.en.categories[topCategory.category] || topCategory.category : translations.ar.categories[topCategory.category] || topCategory.category) : '-'}
          icon={PieChart}
          trendText={topCategory ? formatCurrency(topCategory.total) : ''}
          trendType="neutral"
          isLoading={isLoading}
          iconColorClass="text-amber-400 bg-amber-400/10" />
        <KpiCard title={t.expenseRatio}
          value={(() => {
            const totalRev = periodProfit.total_revenue;
            const totalExp = periodSummary?.totalExpenses ?? 0;
            if (totalRev > 0) return `${Math.round((totalExp / totalRev) * 100)}%`;
            if (totalExp > 0) return '—';
            return '0%';
          })()}
          icon={Percent}
          trendText={periodProfit.total_revenue === 0 && (periodSummary?.totalExpenses ?? 0) > 0 ? (isEn ? 'No revenue this period' : 'لا توجد إيرادات في هذه الفترة') : ''}
          trendType={periodProfit.total_revenue === 0 && (periodSummary?.totalExpenses ?? 0) > 0 ? 'down' : 'neutral'}
          isLoading={isLoading}
          iconColorClass="text-sky-400 bg-sky-400/10" />
      </div>

      {periodSummary && periodSummary.totalRevenue != null && (
        <div className="p-4 rounded-2xl bg-bg-card border border-medium" dir={isEn ? 'ltr' : 'rtl'}>
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-accent-primary" />
            <h3 className="text-sm font-bold text-text-primary">{t.profitBreakdown}</h3>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between py-1">
              <span className="text-text-secondary">{t.totalRevenue}</span>
              <span className="flex items-center gap-1.5 font-bold text-accent-primary">
                <span className="text-[10px] text-accent-primary/60">+</span>
                {formatCurrency(periodSummary.totalRevenue)}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-text-secondary">{t.costOfGoodsSold}</span>
              <span className="flex items-center gap-1.5 font-bold text-text-primary">
                <span className="text-[10px] text-status-danger/60">−</span>
                {formatCurrency(periodSummary.cogs || 0)}
              </span>
            </div>
            <div className="border-t border-dashed border-medium my-1" />
            <div className="flex items-center justify-between py-1">
              <span className="text-text-secondary font-medium">{t.grossProfit}</span>
              <span className={`flex items-center gap-2 font-bold ${(periodSummary.grossProfit || 0) >= 0 ? 'text-emerald-400' : 'text-status-danger'}`}>
                <span className="text-[10px] opacity-60">=</span>
                {formatCurrency(periodSummary.grossProfit || 0)}
                <span className="text-[10px] text-text-disabled">({periodSummary.totalRevenue > 0 ? Math.round(((periodSummary.grossProfit || 0) / periodSummary.totalRevenue) * 10000) / 100 + '%' : '—'})</span>
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-text-secondary">{t.totalExpenses}</span>
              <span className="flex items-center gap-1.5 font-bold text-status-danger">
                <span className="text-[10px] text-status-danger/60">−</span>
                {formatCurrency(periodSummary.totalExpenses || 0)}
              </span>
            </div>
            <div className="border-t border-dashed border-medium my-1" />
            <div className="flex items-center justify-between py-1.5">
              <span className="text-sm font-black text-text-primary">{t.netProfit}</span>
              <span className={`flex items-center gap-2 font-black ${periodProfit.net > 0 ? 'text-emerald-400' : periodProfit.net < 0 ? 'text-status-danger' : 'text-text-primary'}`}>
                <span className="text-[10px] opacity-60">=</span>
                {formatCurrency(periodProfit.net)}
                <span className="text-[10px] text-text-disabled">({periodProfit.total_revenue > 0 ? periodProfit.profit_margin + '%' : (periodProfit.net !== 0 ? '—' : '0%')})</span>
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 rounded-2xl bg-bg-card border border-medium">
        <div className="flex gap-2 mb-4">
          {['day', 'week', 'month', 'year', 'all'].map(p => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={`text-[10px] font-extrabold px-3 py-1.5 rounded-full border transition-all duration-200 ${
                period === p
                  ? 'bg-accent-primary text-on-accent border-accent-primary shadow-accent'
                  : 'border-default text-text-secondary hover:bg-hover hover:text-text-primary'
              }`}
            >
              {p === 'day' && (isEn ? 'Today' : 'اليوم')}
              {p === 'week' && (isEn ? 'Week' : 'الأسبوع')}
              {p === 'month' && (isEn ? 'Month' : 'الشهر')}
              {p === 'year' && (isEn ? 'Year' : 'السنة')}
              {p === 'all' && (isEn ? 'All' : 'الكل')}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex-1" />
          <Select
            value={filters.category}
            onChange={v => setFilters(p => ({ ...p, category: v }))}
            options={[
              { value: '', label: t.allCategories },
              ...Object.entries(translations[isEn ? 'en' : 'ar'].categories).map(([key, label]) => ({ value: key, label }))
            ]}
            size="sm"
            dir={isEn ? 'ltr' : 'rtl'}
          />
          <Select
            value={filters.payment_method}
            onChange={v => setFilters(p => ({ ...p, payment_method: v }))}
            options={[
              { value: '', label: t.allPayments },
              { value: 'cash', label: t.cash },
              { value: 'card', label: t.card },
              { value: 'transfer', label: t.transfer }
            ]}
            size="sm"
            dir={isEn ? 'ltr' : 'rtl'}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
              </div>
            ) : expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-text-disabled">
                <TrendingDown className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg font-bold">{t.noExpenses}</p>
                <p className="text-xs mt-1">{t.noExpensesDesc}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {expenses.map(exp => {
                  const catMeta = categoryMeta[exp.category] || categoryMeta.other;
                  const CatIcon = catMeta.icon;
                  return (
                    <div key={exp.id} className="flex items-center gap-3 p-3 rounded-xl bg-bg-secondary border border-medium hover:border-accent-primary/20 transition-all">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: catMeta.color + '20' }}>
                        <CatIcon className="w-5 h-5" style={{ color: catMeta.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-text-primary truncate">{exp.title}</span>
                          {exp.is_recurring && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20 flex items-center gap-0.5 whitespace-nowrap">
                              <RotateCcw className="w-2.5 h-2.5" />
                              {isEn
                                ? (exp.recurring_type === 'monthly' ? 'Monthly recurring' : exp.recurring_type === 'yearly' ? 'Yearly recurring' : getRecurringTypeLabel(exp.recurring_type))
                                : (exp.recurring_type === 'monthly' ? 'متكرر شهري' : exp.recurring_type === 'yearly' ? 'متكرر سنوي' : getRecurringTypeLabel(exp.recurring_type))}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-text-secondary mt-0.5">
                          <span>{getCategoryName(exp.category)}</span>
                          <span>•</span>
                          <span>{exp.start_date || exp.date}{exp.end_date ? ` → ${exp.end_date}` : ` → ${t.ongoing}`}</span>
                          <span>•</span>
                          <span>{getPaymentLabel(exp.payment_method)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-black text-text-primary">{formatCurrency(exp.amount)}</span>
                        {exp.is_recurring && (
                          <span className="text-xs text-slate-400">
                            ≈ {formatCurrency(Math.round(getDailyEquivalent(exp) * 100) / 100)} {isEn ? '/day' : '/يوم'}
                          </span>
                        )}
                      </div>
                      <button onClick={() => handleOpenEdit(exp)} className="p-2 rounded-lg bg-selected border border-medium text-text-secondary hover:text-accent-primary transition-all" title={t.edit}>
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteConfirmId(exp.id)} className="p-2 rounded-lg bg-status-danger/10 border border-status-danger/20 text-status-danger hover:bg-status-danger/20 transition-all" title={t.delete}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button disabled={pagination.page <= 1} onClick={() => handlePageChange(pagination.page - 1)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-selected border border-medium text-text-secondary hover:bg-hover disabled:opacity-40 transition-all">
                  {t.previous}
                </button>
                <span className="text-xs text-text-secondary">{t.page} {pagination.page} {t.of} {pagination.pages}</span>
                <button disabled={pagination.page >= pagination.pages} onClick={() => handlePageChange(pagination.page + 1)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-selected border border-medium text-text-secondary hover:bg-hover disabled:opacity-40 transition-all">
                  {t.next}
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="p-4 rounded-xl bg-bg-secondary border border-medium">
              <h3 className="text-sm font-bold text-text-primary mb-4 text-center">{t.expenseDistribution}</h3>
              {donutData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-text-disabled">
                  <PieChart className="w-12 h-12 mb-2 opacity-30" />
                  <p className="text-xs">{isEn ? 'No data' : 'لا توجد بيانات'}</p>
                </div>
              ) : (
                <div className="w-full h-[250px] select-none dir-ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <RPieChart>
                      <Tooltip content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-bg-card border border-medium rounded-xl p-3 text-xs shadow-xl">
                              <p className="font-bold text-text-primary mb-1">{payload[0].name}</p>
                              <p className="text-accent-primary font-extrabold">{formatCurrency(payload[0].value)}</p>
                            </div>
                          );
                        }
                        return null;
                      }} />
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                        {donutData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="var(--color-chart-stroke)" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Legend content={({ payload }) => (
                        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2 text-xs text-text-secondary">
                          {payload.map((entry, i) => (
                            <div key={i} className="flex items-center gap-1.5" style={{ color: entry.color }}>
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                              <span>{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      )} />
                    </RPieChart>
                  </ResponsiveContainer>
                </div>
              )}
              {categories.filter(c => c.total_this_month > 0).length > 0 && (
                <div className="mt-4 space-y-2">
                  {(() => {
                    const totalExp = periodSummary?.totalExpenses ?? categories.reduce((s, c) => s + (c.total_this_month || 0), 0);
                    return categories.filter(c => c.total_this_month > 0).map(c => {
                      const pct = totalExp > 0 ? Math.round((c.total_this_month / totalExp) * 100) : 0;
                      return (
                        <div key={c.key} className="flex items-center justify-between text-xs">
                          <span className="text-text-secondary flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                            {isEn ? c.name_en : c.name_ar}
                          </span>
                          <span className="font-bold text-text-primary">
                            {formatCurrency(c.total_this_month)}
                            <span className="text-text-disabled mr-1">({pct}%)</span>
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={selectedExpense ? t.editExpense : t.addExpense} size="md"
        footer={
          <div className="flex gap-3 p-4 justify-end" dir={isEn ? 'ltr' : 'rtl'}>
            <button onClick={() => setIsModalOpen(false)}
              className="px-6 py-2.5 rounded-xl bg-selected border border-medium text-text-secondary hover:bg-hover transition-all text-sm font-bold" disabled={isSubmitting}>
              {t.cancel}
            </button>
            <button onClick={handleSubmit}
              className="px-6 py-2.5 rounded-xl bg-accent-primary text-on-accent hover:brightness-110 transition-all text-sm font-bold flex items-center gap-2" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t.save}
            </button>
          </div>
        }>
        {renderForm()}
      </Modal>

      <Modal isOpen={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)}
        title={t.confirmDelete} size="sm"
        footer={
          <div className="flex gap-3 p-4 justify-end" dir={isEn ? 'ltr' : 'rtl'}>
            <button onClick={() => setDeleteConfirmId(null)}
              className="px-6 py-2.5 rounded-xl bg-selected border border-medium text-text-secondary hover:bg-hover transition-all text-sm font-bold">
              {t.cancel}
            </button>
            <button onClick={handleDelete}
              className="px-6 py-2.5 rounded-xl bg-status-danger text-white hover:brightness-110 transition-all text-sm font-bold flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              {t.delete}
            </button>
          </div>
        }>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <AlertTriangle className="w-12 h-12 text-status-danger" />
          <p className="text-sm text-text-primary font-bold">{t.deleteConfirm}</p>
        </div>
      </Modal>
    </div>
  );
}
