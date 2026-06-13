import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { jsPDF } from 'jspdf';
import useSettingsStore from '../store/useSettingsStore';
import useNotification from '../hooks/useNotification';
import { getMonthDataApi, getDayDataApi } from '../api/calendar.api';
import { getBreakdownApi } from '../api/reports.api';
import { deleteSaleApi, deleteSaleItemApi } from '../api/sales.api';
import formatCurrency from '../utils/formatCurrency';
import DayCell from '../components/calendar/DayCell';
import SaleDetailModal from '../components/calendar/SaleDetailModal';
import Modal from '../components/ui/Modal';
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Calendar as CalendarIcon,
  ShoppingBag, DollarSign, Award, BarChart3, X, Trash2,
  Eye, Printer, FileText, CreditCard, Loader2, AlertTriangle
} from 'lucide-react';

const translations = {
  ar: {
    title: 'تقويم المبيعات',
    today: 'اليوم',
    noSales: 'لا توجد مبيعات في هذا اليوم',
    totalRevenue: 'إجمالي الإيرادات',
    invoicesCount: 'عدد الفواتير',
    avgInvoice: 'متوسط الفاتورة',
    bestDay: 'أفضل يوم',
    workingDays: 'أيام العمل',
    dailyAvg: 'المعدل اليومي',
    deleteConfirm: 'هل أنت متأكد من حذف هذه الفاتورة؟ سيتم إعادة الكميات للمخزون.',
    deleteSuccess: 'تم حذف الفاتورة بنجاح',
    details: 'التفاصيل',
    delete: 'حذف',
    print: 'طباعة',
    customer: 'عميل عام',
    cash: 'نقداً',
    card: 'بطاقة',
    loading: 'جاري التحميل...',
    confirmDelete: 'تأكيد الحذف',
    time: 'الوقت',
    invoice: 'الفاتورة',
    amount: 'المبلغ',
    noSalesToday: 'لا توجد مبيعات',
    daySummary: 'ملخص اليوم',
    days: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
    months: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
    cogs: 'تكلفة البضاعة المباعة',
    grossProfit: 'الربح الإجمالي',
    totalExpenses: 'إجمالي المصاريف',
    netProfit: 'صافي الربح'
  },
  en: {
    title: 'Sales Calendar',
    today: 'Today',
    noSales: 'No sales on this day',
    totalRevenue: 'Total Revenue',
    invoicesCount: 'Invoices',
    avgInvoice: 'Avg. Invoice',
    bestDay: 'Best Day',
    workingDays: 'Working Days',
    dailyAvg: 'Daily Avg',
    deleteConfirm: 'Are you sure you want to delete this invoice? Stock will be restored.',
    deleteSuccess: 'Invoice deleted successfully',
    details: 'Details',
    delete: 'Delete',
    print: 'Print',
    customer: 'Walk-in Customer',
    cash: 'Cash',
    card: 'Card',
    loading: 'Loading...',
    confirmDelete: 'Confirm Deletion',
    time: 'Time',
    invoice: 'Invoice',
    amount: 'Amount',
    noSalesToday: 'No sales today',
    daySummary: 'Day Summary',
    days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    cogs: 'Cost of Goods Sold',
    grossProfit: 'Gross Profit',
    totalExpenses: 'Total Expenses',
    netProfit: 'Net Profit'
  }
};

export default function SalesCalendar() {
  const { language, currency } = useSettingsStore();
  const isEn = language === 'en';
  const { showSuccess, showError } = useNotification();
  const t = translations[isEn ? 'en' : 'ar'];

  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [monthData, setMonthData] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayData, setDayData] = useState(null);
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);
  const [isLoadingDay, setIsLoadingDay] = useState(false);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, saleId: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [breakdown, setBreakdown] = useState(null);

  const isEnRef = useRef(isEn);
  isEnRef.current = isEn;
  const showErrorRef = useRef(showError);
  showErrorRef.current = showError;

  const fetchMonthData = useCallback(async (year, month) => {
    setIsLoadingMonth(true);
    try {
      const data = await getMonthDataApi(year, month);
      setMonthData(data || {});
    } catch (err) {
      showErrorRef.current(err.message || (isEnRef.current ? 'Failed to load month data' : 'فشل تحميل بيانات الشهر'));
    } finally {
      setIsLoadingMonth(false);
    }
  }, []);

  const fetchDayData = useCallback(async (year, month, day) => {
    setIsLoadingDay(true);
    try {
      const data = await getDayDataApi(year, month, day);
      setDayData(data);
    } catch (err) {
      showErrorRef.current(err.message || (isEnRef.current ? 'Failed to load day data' : 'فشل تحميل بيانات اليوم'));
    } finally {
      setIsLoadingDay(false);
    }
  }, []);

  const getMonthRange = useCallback((year, month) => {
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { from, to };
  }, []);

  const loadBreakdown = useCallback((year, month) => {
    const { from, to } = getMonthRange(year, month);
    getBreakdownApi({ from, to }).then(data => { if (data) setBreakdown(data); }).catch(() => {});
  }, [getMonthRange]);

  useEffect(() => {
    fetchMonthData(currentYear, currentMonth);
    loadBreakdown(currentYear, currentMonth);
  }, [currentYear, currentMonth, loadBreakdown, fetchMonthData]);

  const refreshAll = useCallback(() => {
    fetchMonthData(currentYear, currentMonth);
    loadBreakdown(currentYear, currentMonth);
  }, [currentYear, currentMonth, fetchMonthData, loadBreakdown]);

  useEffect(() => {
    const handleRefresh = () => refreshAll();
    window.addEventListener('dashboard-refresh', handleRefresh);
    window.addEventListener('sale-completed', handleRefresh);
    return () => {
      window.removeEventListener('dashboard-refresh', handleRefresh);
      window.removeEventListener('sale-completed', handleRefresh);
    };
  }, [refreshAll]);

  const daysInMonth = useMemo(() => new Date(currentYear, currentMonth, 0).getDate(), [currentYear, currentMonth]);
  const firstDayOfWeek = useMemo(() => new Date(currentYear, currentMonth - 1, 1).getDay(), [currentYear, currentMonth]);

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const monthStats = useMemo(() => {
    const entries = Object.entries(monthData);
    let totalRevenue = 0;
    let workingDays = 0;
    let bestDay = { date: '', revenue: 0 };

    for (const [date, d] of entries) {
      const rev = Number(d.total_revenue) || 0;
      totalRevenue += rev;
      if (rev > 0) workingDays++;
      if (rev > bestDay.revenue) {
        bestDay = { date, revenue: rev };
      }
    }

    const dailyAvg = workingDays > 0 ? totalRevenue / workingDays : 0;
    return { totalRevenue, workingDays, bestDay, dailyAvg };
  }, [monthData]);

  const maxRevenue = useMemo(() => {
    let max = 0;
    for (const d of Object.values(monthData)) {
      const rev = Number(d.total_revenue) || 0;
      if (rev > max) max = rev;
    }
    return max;
  }, [monthData]);

  const handleDayClick = useCallback(async (day) => {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setIsDayModalOpen(true);
    await fetchDayData(currentYear, currentMonth, day);
  }, [currentYear, currentMonth, fetchDayData]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear(y => y - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth(m => m - 1);
    }
    setIsDayModalOpen(false);
    setDayData(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear(y => y + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth(m => m + 1);
    }
    setIsDayModalOpen(false);
    setDayData(null);
  };

  const handleViewDetails = (sale) => {
    setSelectedSale(sale);
    setIsDetailModalOpen(true);
  };

  const handleDeleteClick = (saleId) => {
    setDeleteConfirm({ isOpen: true, saleId });
  };

  const handleDeleteConfirm = async () => {
    const saleId = deleteConfirm.saleId;
    if (!saleId) return;
    setIsDeleting(true);
    try {
      await deleteSaleApi(saleId);
      showSuccess(t.deleteSuccess);

      if (dayData) {
        const deletedSale = dayData.sales.find(s => s.id === saleId);
        const newSales = dayData.sales.filter(s => s.id !== saleId);
        const removedAmount = deletedSale ? Number(deletedSale.final_amount || 0) : 0;
        const newCount = newSales.length;
        const newRevenue = (Number(dayData.summary.total_revenue) || 0) - removedAmount;
        setDayData({
          sales: newSales,
          summary: {
            total_revenue: newRevenue,
            sales_count: newCount,
            avg_invoice: newCount > 0 ? Math.round((newRevenue / newCount) * 100) / 100 : 0
          }
        });

        if (selectedDate && monthData[selectedDate]) {
          const existing = monthData[selectedDate];
          const newDayCount = Math.max(0, (Number(existing.sales_count) || 0) - 1);
          const newDayRevenue = Math.max(0, (Number(existing.total_revenue) || 0) - removedAmount);
          setMonthData(prev => ({
            ...prev,
            [selectedDate]: {
              sales_count: newDayCount,
              total_revenue: newDayRevenue
            }
          }));
        }
      }

      setDeleteConfirm({ isOpen: false, saleId: null });
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));
    } catch (err) {
      showError(err.message || (isEn ? 'Failed to delete sale' : 'فشل حذف الفاتورة'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteItem = async (sale, item) => {
    if (isDeletingItem) return;
    setIsDeletingItem(true);
    try {
      const result = await deleteSaleItemApi(sale.id, item.id);
      setSelectedSale(prev => {
        if (!prev || prev.id !== sale.id) return prev;
        return {
          ...prev,
          items: (prev.items || []).filter(i => i.id !== item.id),
          total_amount: result.total_amount ?? prev.total_amount,
          final_amount: result.final_amount ?? prev.final_amount
        };
      });
      showSuccess(isEn ? 'Item deleted successfully' : 'تم حذف الصنف بنجاح');
      if (selectedDate) {
        const parts = selectedDate.split('-');
        await fetchDayData(Number(parts[0]), Number(parts[1]), Number(parts[2]));
      }
    } catch (err) {
      showError(err.message || (isEn ? 'Failed to delete item' : 'فشل حذف الصنف'));
    } finally {
      setIsDeletingItem(false);
    }
  };

  const handlePrintPDF = () => {
    if (!dayData || !dayData.sales || dayData.sales.length === 0) return;
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    let y = 20;

    pdf.setFontSize(16);
    pdf.text(t.daySummary, pageWidth / 2, y, { align: 'center' });
    y += 10;
    pdf.setFontSize(10);
    pdf.text(`${selectedDate}`, pageWidth / 2, y, { align: 'center' });
    y += 8;

    pdf.setFontSize(11);
    pdf.text(`${t.totalRevenue}: ${formatCurrency(dayData.summary.total_revenue)}`, 14, y);
    y += 6;
    pdf.text(`${t.invoicesCount}: ${dayData.summary.sales_count}`, 14, y);
    y += 6;
    pdf.text(`${t.avgInvoice}: ${formatCurrency(dayData.summary.avg_invoice)}`, 14, y);
    y += 10;

    for (const sale of dayData.sales) {
      if (y > 260) {
        pdf.addPage();
        y = 20;
      }
      const time = sale.created_at ? new Date(sale.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
      pdf.setFontSize(10);
      pdf.text(`${sale.invoice_number} | ${time} | ${sale.payment_method === 'card' ? t.card : t.cash}`, 14, y);
      y += 5;
      pdf.text(`${t.customer}: ${sale.customer_name || t.customer}`, 20, y);
      y += 5;
      pdf.text(`${t.amount}: ${formatCurrency(sale.final_amount)}`, 20, y);
      y += 8;
    }

    pdf.save(`sales-${selectedDate}.pdf`);
  };

  const renderDayModal = () => {
    return (
      <Modal isOpen={isDayModalOpen} onClose={() => { setIsDayModalOpen(false); setDayData(null); }} title={selectedDate || ''} size="full">
        {isLoadingDay ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
          </div>
        ) : dayData && dayData.sales && dayData.sales.length > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-bg-card border border-medium text-center">
                <FileText className="w-5 h-5 text-accent-primary mx-auto mb-1" />
                <span className="text-xs text-text-disabled block">{t.invoicesCount}</span>
                <span className="text-lg font-black text-text-primary">{dayData.summary.sales_count}</span>
              </div>
              <div className="p-4 rounded-xl bg-bg-card border border-medium text-center">
                <DollarSign className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                <span className="text-xs text-text-disabled block">{t.totalRevenue}</span>
                <span className="text-lg font-black text-text-primary">{formatCurrency(dayData.summary.total_revenue)}</span>
              </div>
              <div className="p-4 rounded-xl bg-bg-card border border-medium text-center">
                <BarChart3 className="w-5 h-5 text-sky-400 mx-auto mb-1" />
                <span className="text-xs text-text-disabled block">{t.avgInvoice}</span>
                <span className="text-lg font-black text-text-primary">{formatCurrency(dayData.summary.avg_invoice)}</span>
              </div>
            </div>

            <div className="flex justify-end mb-4">
              <button
                onClick={handlePrintPDF}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-primary/10 border border-accent-primary/30 text-accent-primary hover:bg-accent-primary/20 transition-all text-sm font-bold"
              >
                <Printer className="w-4 h-4" />
                {t.print}
              </button>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {dayData.sales.map(sale => {
                const time = sale.created_at ? new Date(sale.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
                return (
                  <div key={sale.id} className="p-4 rounded-xl bg-bg-secondary border border-medium flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-text-primary">{sale.invoice_number}</span>
                        <span className="text-[10px] text-text-disabled">{time}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-text-secondary">
                        <span className="flex items-center gap-1">
                          <UserIcon />
                          {sale.customer_name || t.customer}
                        </span>
                        <span className="flex items-center gap-1">
                          {sale.payment_method === 'card' ? <CreditCard className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                          {sale.payment_method === 'card' ? t.card : t.cash}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-black text-accent-primary">{formatCurrency(sale.final_amount)}</span>
                    <button
                      onClick={() => handleViewDetails(sale)}
                      className="p-2 rounded-lg bg-selected border border-medium text-text-secondary hover:text-accent-primary transition-all"
                      title={t.details}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(sale.id)}
                      className="p-2 rounded-lg bg-status-danger/10 border border-status-danger/20 text-status-danger hover:bg-status-danger/20 transition-all"
                      title={t.delete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-text-disabled">
            <CalendarIcon className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-bold">{t.noSales}</p>
          </div>
        )}
      </Modal>
    );
  };

  const calendarGrid = useMemo(() => {
    const cells = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push(<DayCell key={`empty-${i}`} day={null} isEn={isEn} />);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const data = monthData[dateStr];
      const isToday = dateStr === todayStr;
      cells.push(
        <DayCell
          key={day}
          day={day}
          data={data}
          maxRevenue={maxRevenue}
          isToday={isToday}
          onClick={() => handleDayClick(day)}
          isEn={isEn}
        />
      );
    }
    return cells;
  }, [firstDayOfWeek, daysInMonth, currentYear, currentMonth, monthData, maxRevenue, todayStr, handleDayClick, isEn]);

  return (
    <div className="p-3 md:p-6 space-y-4 max-w-6xl mx-auto" dir={isEn ? 'ltr' : 'rtl'}>
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-black text-text-primary">{t.title}</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-bg-card border border-medium">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-text-disabled">{t.totalRevenue}</span>
          </div>
          <span className="text-lg font-black text-text-primary">{formatCurrency(breakdown ? breakdown.revenue : monthStats.totalRevenue)}</span>
        </div>
        <div className="p-4 rounded-xl bg-bg-card border border-medium">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-status-danger" />
            <span className="text-xs font-bold text-text-disabled">{t.cogs}</span>
          </div>
          <span className={`text-lg font-black ${(breakdown ? breakdown.cogs : 0) > 0 ? 'text-status-danger' : 'text-text-primary'}`}>{formatCurrency(breakdown ? breakdown.cogs : 0)}</span>
        </div>
        <div className="p-4 rounded-xl bg-bg-card border border-medium">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-bold text-text-disabled">{t.totalExpenses}</span>
          </div>
          <span className={`text-lg font-black ${(breakdown ? breakdown.expenses : 0) > 0 ? 'text-status-danger' : 'text-text-primary'}`}>{formatCurrency(breakdown ? breakdown.expenses : 0)}</span>
        </div>
        <div className="p-4 rounded-xl bg-bg-card border border-medium">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-text-disabled">{t.netProfit}</span>
          </div>
          <span className={`text-lg font-black ${(breakdown ? breakdown.net_profit : 0) > 0 ? 'text-emerald-400' : (breakdown ? breakdown.net_profit : 0) < 0 ? 'text-status-danger' : 'text-text-primary'}`}>
            {formatCurrency(breakdown ? breakdown.net_profit : 0)}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-bg-card border border-medium">
          <div className="flex items-center gap-2 mb-2">
            <CalendarIcon className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold text-text-disabled">{t.workingDays}</span>
          </div>
          <span className="text-lg font-black text-text-primary">{breakdown ? breakdown.working_days : monthStats.workingDays}</span>
        </div>
        <div className="p-4 rounded-xl bg-bg-card border border-medium">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-text-disabled">{t.bestDay}</span>
          </div>
          <span className="text-sm font-black text-text-primary leading-tight block">
            {(breakdown ? breakdown.best_day.date : monthStats.bestDay.date) ? (breakdown ? breakdown.best_day.date.slice(5) : monthStats.bestDay.date.slice(5)) : '-'}
          </span>
          <span className="text-xs font-bold text-emerald-400">
            {(breakdown ? breakdown.best_day.value : monthStats.bestDay.revenue) > 0 ? formatCurrency(breakdown ? breakdown.best_day.value : monthStats.bestDay.revenue) : ''}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-bg-card border border-medium">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-text-disabled">{t.dailyAvg}</span>
          </div>
          <span className="text-lg font-black text-text-primary">{formatCurrency(breakdown ? breakdown.daily_average : monthStats.dailyAvg)}</span>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-bg-card border border-medium">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl bg-selected border border-medium text-text-secondary hover:text-accent-primary transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <span className="text-base font-black text-text-primary">
            {t.months[currentMonth - 1]} {currentYear}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl bg-selected border border-medium text-text-secondary hover:text-accent-primary transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {t.days.map((d, i) => (
            <div key={i} className="text-center text-[10px] font-bold text-text-disabled py-1">
              {d}
            </div>
          ))}
        </div>

        {isLoadingMonth ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1.5">
            {calendarGrid}
          </div>
        )}
      </div>

      {renderDayModal()}

      <SaleDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => { setIsDetailModalOpen(false); setSelectedSale(null); }}
        sale={selectedSale}
        isEn={isEn}
        onDeleteItem={handleDeleteItem}
      />

      <Modal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, saleId: null })}
        title={t.confirmDelete}
        size="sm"
        footer={
          <div className="flex gap-3 p-4 justify-end" dir={isEn ? 'ltr' : 'rtl'}>
            <button
              onClick={() => setDeleteConfirm({ isOpen: false, saleId: null })}
              className="px-6 py-2 rounded-xl bg-selected border border-medium text-text-secondary hover:bg-hover transition-all text-sm font-bold"
              disabled={isDeleting}
            >
              {isEn ? 'Cancel' : 'إلغاء'}
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="px-6 py-2 rounded-xl bg-status-danger text-white hover:bg-status-danger/90 transition-all text-sm font-bold flex items-center gap-2"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEn ? 'Delete' : 'حذف'}
            </button>
          </div>
        }
      >
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <AlertTriangle className="w-12 h-12 text-status-danger" />
          <p className="text-sm text-text-primary font-bold">{t.deleteConfirm}</p>
        </div>
      </Modal>
    </div>
  );
}

function UserIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
