import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import useNotification from '../hooks/useNotification';
import useSettingsStore from '../store/useSettingsStore';
import { Users, UserPlus, Search, Edit, Trash2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import ConfirmModal from '../components/ui/ConfirmModal';

export default function Customers() {
  const { showSuccess, showError } = useNotification();
  const { language } = useSettingsStore();
  const isEn = language === 'en';

  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false, title: '', message: '', onConfirm: null, isLoading: false
  });

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('customers').select('*').order('id', { ascending: false });
      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      showError(isEn ? 'Failed to fetch customers' : 'فشل جلب بيانات الزبائن');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(c =>
    (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.phone && c.phone.includes(searchQuery))
  );

  const handleOpenModal = (customer = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || ''
      });
    } else {
      setEditingCustomer(null);
      setFormData({ name: '', phone: '', email: '', address: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingCustomer) {
        const { error } = await supabase.from('customers').update(formData).eq('id', editingCustomer.id);
        if (error) throw error;
        showSuccess(isEn ? 'Customer updated successfully' : 'تم تحديث بيانات الزبون بنجاح');
      } else {
        const { error } = await supabase.from('customers').insert(formData);
        if (error) throw error;
        showSuccess(isEn ? 'Customer added successfully' : 'تم إضافة الزبون بنجاح');
      }
      fetchCustomers();
      setIsModalOpen(false);
    } catch (err) {
      showError(isEn ? 'Failed to save customer' : 'فشل حفظ بيانات الزبون');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    setConfirmModal({
      isOpen: true,
      title: isEn ? 'Confirm Deletion' : 'تأكيد الحذف',
      message: isEn ? 'Are you sure you want to delete this customer?' : 'هل أنت متأكد من حذف هذا الزبون نهائياً؟',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        try {
          const { error } = await supabase.from('customers').delete().eq('id', id);
          if (error) throw error;
          showSuccess(isEn ? 'Customer deleted successfully' : 'تم حذف الزبون بنجاح');
          fetchCustomers();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          showError(isEn ? 'Failed to delete' : 'فشل الحذف');
          setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
      },
      isLoading: false
    });
  };

  return (
    <div className={`flex flex-col gap-6 pb-10 pt-6 select-none ${isEn ? 'text-left' : 'text-right'}`}>
      <div className={`flex items-center justify-between ${isEn ? 'flex-row-reverse' : ''}`}>
        <div className={`flex flex-col ${isEn ? 'items-start text-left' : 'items-start text-right'}`}>
          <h2 className={`text-2xl font-black text-text-primary flex items-center gap-3 ${isEn ? 'flex-row-reverse' : ''}`}>
            {isEn ? 'Customers CRM' : 'إدارة الزبائن (CRM)'}
            <Users className="w-8 h-8 text-accent-primary" />
          </h2>
          <p className="text-text-secondary text-sm mt-1 font-bold">{isEn ? 'Manage your loyal customers database' : 'قاعدة بيانات الزبائن وعملائك المميزين'}</p>
        </div>
        <Button onClick={() => handleOpenModal()} className={`h-12 px-6 flex items-center gap-2 text-xs font-bold ${isEn ? 'flex-row-reverse' : ''}`}>
          <UserPlus className="w-4.5 h-4.5" />
          {isEn ? 'Add Customer' : 'إضافة زبون جديد'}
        </Button>
      </div>

      <div className="glass-panel rounded-2xl border border-medium flex flex-col overflow-hidden">
        {/* Search Bar */}
        <div className={`p-5 border-b border-light flex items-center gap-5 bg-subtle ${isEn ? 'flex-row-reverse' : ''}`}>
          <div className="relative w-full max-w-md">
            <Search className={`w-4.5 h-4.5 absolute top-1/2 -translate-y-1/2 text-text-secondary ${isEn ? 'left-4' : 'right-4'}`} />
            <input
              type="text"
              placeholder={isEn ? "Search customer by name or phone..." : "ابحث عن زبون بالاسم أو الهاتف..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full h-11 bg-subtle border border-default rounded-xl text-xs font-bold text-text-primary outline-none focus:border-accent-primary transition-all ${isEn ? 'pl-11 pr-4 text-left' : 'pr-11 pl-4'}`}
            />
          </div>
          <span className="text-xs font-bold text-text-secondary">
            {isEn ? 'Total Count: ' : 'العدد الإجمالي: '}<span className="text-accent-primary font-black">{filteredCustomers.length}</span>
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className={`w-full border-collapse text-xs font-bold ${isEn ? 'text-left' : 'text-right'}`}>
            <thead>
              <tr className="border-b border-medium bg-subtle text-text-secondary select-none">
                {isEn ? (
                  <>
                    <th className="p-5">Customer Name</th>
                    <th className="p-5">Phone</th>
                    <th className="p-5">Address</th>
                    <th className="p-5 w-32 text-center">Total Purchases</th>
                    <th className="p-5 w-24 text-center">Actions</th>
                  </>
                ) : (
                  <>
                    <th className="p-5 w-24 text-center">إجراءات</th>
                    <th className="p-5 w-32 text-center">إجمالي المشتريات</th>
                    <th className="p-5">العنوان</th>
                    <th className="p-5">الهاتف</th>
                    <th className="p-5">اسم الزبون</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-light">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-text-secondary text-sm">
                    {isEn ? 'Loading...' : 'جاري التحميل...'}
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-text-secondary text-sm">
                    {isEn ? 'No customers found.' : 'لا توجد نتائج للزبائن.'}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(c => (
                  <tr key={c.id} className="hover:bg-hover transition-colors">
                    {isEn ? (
                      <>
                        <td className="p-5 text-text-primary font-extrabold">{c.name}</td>
                        <td className="p-5 text-text-secondary">{c.phone || '-'}</td>
                        <td className="p-5 text-text-secondary">{c.address || '-'}</td>
                        <td className="p-5 text-center text-accent-primary font-black">
                          {c.total_purchases || 0} {isEn ? 'Orders' : 'عملية'}
                        </td>
                        <td className="p-5 text-center flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenModal(c)}
                            className="p-1.5 text-text-secondary hover:text-accent-primary hover:bg-accent-primary/10 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="p-1.5 text-text-secondary hover:text-status-danger hover:bg-status-danger/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-5 text-center flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenModal(c)}
                            className="p-1.5 text-text-secondary hover:text-accent-primary hover:bg-accent-primary/10 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="p-1.5 text-text-secondary hover:text-status-danger hover:bg-status-danger/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="p-5 text-center text-accent-primary font-black">
                          {c.total_purchases || 0} عملية
                        </td>
                        <td className="p-5 text-text-secondary">{c.address || '-'}</td>
                        <td className="p-5 text-text-secondary dir-ltr">{c.phone || '-'}</td>
                        <td className="p-5 text-text-primary font-extrabold">{c.name}</td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer 
          ? (isEn ? 'Edit Customer Data' : 'تعديل بيانات الزبون') 
          : (isEn ? 'Add New Customer' : 'إضافة زبون جديد')
        }
      >
        <form onSubmit={handleSubmit} className={`flex flex-col gap-4 ${isEn ? 'text-left' : 'text-right'}`}>
          <Input
            label={isEn ? "Full Name" : "اسم الزبون الكامل"}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label={isEn ? "Phone Number" : "رقم الهاتف"}
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />
          <Input
            label={isEn ? "Email Address (Optional)" : "البريد الإلكتروني (اختياري)"}
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label={isEn ? "Address (Optional)" : "العنوان الجغرافي (اختياري)"}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
          <div className={`flex gap-3 mt-4 pt-4 border-t border-light ${isEn ? 'justify-start flex-row-reverse' : 'justify-end'}`}>
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="text-xs">
              {isEn ? 'Cancel' : 'إلغاء'}
            </Button>
            <Button type="submit" isLoading={isSubmitting} className="text-xs px-8">
              {editingCustomer 
                ? (isEn ? 'Save Changes' : 'حفظ التعديلات') 
                : (isEn ? 'Add Customer' : 'إضافة الزبون')
              }
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        isLoading={confirmModal.isLoading}
      />
    </div>
  );
}
