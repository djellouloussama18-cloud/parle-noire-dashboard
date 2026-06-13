import React, { useState, useEffect } from 'react';
import useNotesStore from '../store/useNotesStore';
import useSettingsStore from '../store/useSettingsStore';
import useNotification from '../hooks/useNotification';
import formatDate from '../utils/formatDate';
import {
  ClipboardList,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Info,
  AlertCircle,
  X,
  Search,
  RefreshCw,
  Package,
  TrendingUp,
  FileText,
  Calendar,
  Tag,
  Pencil,
  Save
} from 'lucide-react';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

const priorityConfig = {
  high: { label: 'عاجل', labelEn: 'Urgent', color: 'text-status-danger', bg: 'bg-status-danger/10', border: 'border-status-danger/20', icon: AlertCircle },
  medium: { label: 'متوسط', labelEn: 'Medium', color: 'text-status-warning', bg: 'bg-status-warning/10', border: 'border-status-warning/20', icon: AlertTriangle },
  low: { label: 'عادي', labelEn: 'Normal', color: 'text-accent-secondary', bg: 'bg-accent-secondary/10', border: 'border-accent-secondary/20', icon: Info }
};

const systemNoteIcons = {
  'نفد من المخزون': Package,
  'كمية منخفضة': Package,
  'ملخص مبيعات اليوم': TrendingUp,
  'مبيعاته منخفضة جداً': FileText
};

function getSystemNoteIcon(title) {
  for (const [keyword, Icon] of Object.entries(systemNoteIcons)) {
    if (title.includes(keyword)) return Icon;
  }
  return FileText;
}

export default function Notes() {
  const { showSuccess, showError } = useNotification();
  const { language } = useSettingsStore();
  const isEn = language === 'en';

  const {
    notes, unreadCount, isLoading,
    fetchNotes, fetchUnreadCount, createNote, updateNote, deleteNote, markAsRead
  } = useNotesStore();

  const [activeTab, setActiveTab] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newNote, setNewNote] = useState({ title: '', content: '', priority: 'medium' });
  const [isCreating, setIsCreating] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', content: '', priority: 'medium' });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchNotes();
    fetchUnreadCount();
  }, []);

  const filteredNotes = notes.filter(note => {
    if (activeTab === 'system' && note.type !== 'system') return false;
    if (activeTab === 'merchant' && note.type !== 'merchant') return false;
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      return (
        (note.title || '').toLowerCase().includes(t) ||
        (note.content || '').toLowerCase().includes(t)
      );
    }
    return true;
  });

  const handleCreateNote = async () => {
    if (!newNote.title.trim()) {
      showError(isEn ? 'Title is required' : 'العنوان مطلوب');
      return;
    }
    setIsCreating(true);
    try {
      await createNote({
        type: 'merchant',
        title: newNote.title.trim(),
        content: newNote.content.trim(),
        priority: newNote.priority
      });
      showSuccess(isEn ? 'Note created successfully' : 'تم إنشاء الملاحظة بنجاح');
      setNewNote({ title: '', content: '', priority: 'medium' });
      setShowCreateModal(false);
    } catch (err) {
      showError(err.response?.data?.message || (isEn ? 'Failed to create note' : 'فشل إنشاء الملاحظة'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleMarkRead = async (id) => {
    setIsReading(true);
    try {
      await markAsRead(id);
    } catch (err) {
      console.error(err);
    } finally {
      setIsReading(false);
    }
  };

  const handleDelete = async (id) => {
    setIsDeleting(true);
    try {
      await deleteNote(id);
      const deletedSelected = selectedNote?.id === id;
      if (deletedSelected) { setShowViewModal(false); setSelectedNote(null); }
      showSuccess(isEn ? 'Note deleted' : 'تم حذف الملاحظة');
    } catch (err) {
      showError(err.response?.data?.message || (isEn ? 'Failed to delete' : 'فشل الحذف'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenNote = (note) => {
    setSelectedNote(note);
    setEditForm({ title: note.title, content: note.content || '', priority: note.priority || 'medium' });
    setShowViewModal(true);
  };

  const handleUpdateNote = async () => {
    if (!editForm.title.trim()) {
      showError(isEn ? 'Title is required' : 'العنوان مطلوب');
      return;
    }
    setIsUpdating(true);
    try {
      const updated = await updateNote(selectedNote.id, {
        title: editForm.title.trim(),
        content: editForm.content.trim(),
        priority: editForm.priority
      });
      setSelectedNote(updated);
      showSuccess(isEn ? 'Note updated successfully' : 'تم تحديث الملاحظة بنجاح');
    } catch (err) {
      showError(err.response?.data?.message || (isEn ? 'Failed to update note' : 'فشل تحديث الملاحظة'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRefresh = async () => {
    await fetchNotes();
    await fetchUnreadCount();
    showSuccess(isEn ? 'Notes refreshed' : 'تم تحديث الملاحظات');
  };

  const tabs = [
    { key: 'all', label: isEn ? 'All' : 'الكل', count: filteredNotes.length },
    { key: 'system', label: isEn ? 'System' : 'النظام', count: notes.filter(n => n.type === 'system').length, icon: ClipboardList },
    { key: 'merchant', label: isEn ? 'My Notes' : 'ملاحظاتي', count: notes.filter(n => n.type === 'merchant').length, icon: FileText }
  ];

  const totalUnread = unreadCount.total || 0;

  return (
    <div className={`flex flex-col gap-6 pb-10 pt-6 select-none ${isEn ? 'text-left' : 'text-right'}`}>

      {/* Header */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isEn ? 'flex-row-reverse' : ''}`}>
        <div className="flex flex-col">
          <h2 className="text-2xl lg:text-3xl font-black text-text-primary flex items-center gap-3">
            <ClipboardList className="w-7 h-7 text-accent-primary" />
            {isEn ? 'Notes' : 'دفتر الملاحظات'}
          </h2>
          <p className="text-xs font-semibold text-text-secondary mt-1">
            {isEn ? 'System alerts and your personal notes' : 'تنبيهات النظام وملاحظاتك الشخصية'}
            {totalUnread > 0 && (
              <span className="mr-2 px-2 py-0.5 rounded-full bg-status-danger/15 text-status-danger text-[10px] font-black">
                {totalUnread} {isEn ? 'unread' : 'غير مقروءة'}
              </span>
            )}
          </p>
        </div>

        <div className={`flex gap-2.5 ${isEn ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={handleRefresh}
            className={`h-11 px-4 text-xs font-bold bg-bg-card border-default text-accent-primary rounded-xl hover:bg-hover flex items-center gap-2 focus:outline-none ${isEn ? 'flex-row-reverse' : ''}`}
          >
            <RefreshCw className="w-4.5 h-4.5" />
            {isEn ? 'Refresh' : 'تحديث'}
          </button>
          <Button onClick={() => setShowCreateModal(true)} className="h-11 text-xs font-bold flex items-center gap-2">
            <Plus className="w-4.5 h-4.5" />
            {isEn ? 'New Note' : 'ملاحظة جديدة'}
          </Button>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="glass-panel rounded-2xl border-medium p-5">
        <div className={`flex flex-col md:flex-row gap-4 justify-between ${isEn ? 'flex-row-reverse' : ''}`}>
          <div className={`flex gap-2 ${isEn ? 'flex-row-reverse' : ''}`}>
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                    activeTab === tab.key
                      ? 'bg-accent-primary text-on-accent shadow-accent'
                      : 'bg-subtle border-medium text-text-secondary hover:border-accent-primary/40 hover:text-text-primary'
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {tab.label}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                    activeTab === tab.key ? 'bg-bg-primary/20' : 'bg-selected'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none right-3" />
            <input
              type="text"
              placeholder={isEn ? 'Search notes...' : 'البحث في الملاحظات...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="h-10 bg-subtle border-default rounded-xl pr-10 pl-4 text-sm font-bold focus:border-accent-primary outline-none transition-all w-64"
            />
          </div>
        </div>
      </div>

      {/* Notes List */}
      <div className="flex flex-col gap-3">
        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && filteredNotes.length === 0 && (
          <div className="glass-panel rounded-2xl border-light p-16 flex flex-col items-center justify-center text-text-disabled gap-3">
            <ClipboardList className="w-16 h-16 opacity-10" />
            <span className="text-sm font-bold">
              {isEn ? 'No notes found' : 'لا توجد ملاحظات'}
            </span>
          </div>
        )}

        {!isLoading && filteredNotes.map(note => {
          const pConfig = priorityConfig[note.priority] || priorityConfig.medium;
          const PriorityIcon = pConfig.icon;
          const NoteIcon = note.type === 'system' ? getSystemNoteIcon(note.title) : FileText;

          return (
            <div
              key={note.id}
              className={`glass-panel rounded-2xl border p-5 transition-all duration-300 hover:shadow-lg ${
                !note.read
                  ? `${pConfig.border} ${pConfig.bg}`
                  : 'border-light'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Icon column */}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  note.type === 'system' ? 'bg-accent-primary/10' : 'bg-hover'
                }`}>
                  <NoteIcon className={`w-5 h-5 ${note.type === 'system' ? 'text-accent-primary' : 'text-text-secondary'}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className={`text-sm font-bold ${!note.read ? 'text-text-primary' : 'text-text-secondary'}`}>
                      {note.title}
                    </h4>
                    {!note.read && (
                      <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
                    )}
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${pConfig.bg} ${pConfig.color} ${pConfig.border} border`}>
                      <PriorityIcon className="w-3 h-3 inline mr-0.5" />
                      {isEn ? pConfig.labelEn : pConfig.label}
                    </span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                      note.type === 'system'
                        ? 'bg-accent-primary/10 text-accent-primary'
                        : 'bg-hover text-text-secondary'
                    }`}>
                      {note.type === 'system' ? (isEn ? 'System' : 'النظام') : (isEn ? 'Personal' : 'شخصي')}
                    </span>
                    {note.product_id && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-subtle text-text-disabled border-light flex items-center gap-1">
                        <Package className="w-2.5 h-2.5" />
                        {isEn ? 'Product' : 'منتج'}
                      </span>
                    )}
                  </div>

                  {note.content && (
                    <p className={`text-xs mt-2 leading-relaxed ${
                      !note.read ? 'text-text-secondary' : 'text-text-disabled'
                    }`}>
                      {note.content}
                    </p>
                  )}

                  <div className={`flex items-center gap-3 mt-2 text-[10px] text-text-disabled ${isEn ? 'flex-row-reverse' : ''}`}>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(note.created_at)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className={`flex flex-col gap-1.5 flex-shrink-0 ${isEn ? 'flex-row-reverse' : ''}`}>
                  {!note.read && note.type === 'merchant' && (
                    <button
                      onClick={() => handleMarkRead(note.id)}
                      className="p-2 rounded-lg hover:bg-accent-primary/10 text-text-secondary hover:text-accent-primary transition-colors"
                      title={isEn ? 'Mark as read' : 'تحديد كمقروءة'}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenNote(note)}
                    className="p-2 rounded-lg hover:bg-accent-primary/10 text-text-secondary hover:text-accent-primary transition-colors"
                    title={isEn ? 'View / Edit' : 'عرض / تعديل'}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {note.type === 'merchant' && (
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-2 rounded-lg hover:bg-status-danger/10 text-text-secondary hover:text-status-danger transition-colors"
                      title={isEn ? 'Delete' : 'حذف'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Note Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title={isEn ? 'New Note' : 'ملاحظة جديدة'} size="md">
        <div className="flex flex-col gap-4 py-2">
          <div>
            <label className={`text-xs font-bold text-text-secondary block mb-1.5 ${isEn ? 'text-left' : ''}`}>
              {isEn ? 'Title' : 'العنوان'}
            </label>
            <input
              type="text"
              value={newNote.title}
              onChange={e => setNewNote(prev => ({ ...prev, title: e.target.value }))}
              placeholder={isEn ? 'Enter note title...' : 'أدخل عنوان الملاحظة...'}
              className={`w-full h-11 bg-subtle border-default rounded-xl px-4 text-sm font-bold focus:border-accent-primary outline-none transition-all ${isEn ? 'text-left' : ''}`}
            />
          </div>

          <div>
            <label className={`text-xs font-bold text-text-secondary block mb-1.5 ${isEn ? 'text-left' : ''}`}>
              {isEn ? 'Content' : 'المحتوى'}
            </label>
            <textarea
              value={newNote.content}
              onChange={e => setNewNote(prev => ({ ...prev, content: e.target.value }))}
              placeholder={isEn ? 'Write your note...' : 'اكتب ملاحظتك...'}
              rows={5}
              className={`w-full bg-subtle border-default rounded-xl p-4 text-sm font-bold focus:border-accent-primary outline-none transition-all resize-none ${isEn ? 'text-left' : ''}`}
            />
          </div>

          <div>
            <label className={`text-xs font-bold text-text-secondary block mb-1.5 ${isEn ? 'text-left' : ''}`}>
              {isEn ? 'Priority' : 'الأولوية'}
            </label>
            <div className={`flex gap-2 ${isEn ? 'flex-row-reverse' : ''}`}>
              {['low', 'medium', 'high'].map(p => {
                const cfg = priorityConfig[p];
                const Icon = cfg.icon;
                return (
                  <button
                    key={p}
                    onClick={() => setNewNote(prev => ({ ...prev, priority: p }))}
                    className={`flex-1 h-10 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
                      newNote.priority === p
                        ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                        : 'border-medium text-text-secondary hover:border-text-secondary'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {isEn ? cfg.labelEn : cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleCreateNote} isLoading={isCreating} className="flex-1 h-11 text-xs font-bold">
              <CheckCircle className="w-4 h-4" />
              {isEn ? 'Create Note' : 'إنشاء الملاحظة'}
            </Button>
            <Button onClick={() => setShowCreateModal(false)} variant="secondary" className="flex-1 h-11 text-xs font-bold">
              <X className="w-4 h-4" />
              {isEn ? 'Cancel' : 'إلغاء'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* View / Edit Note Modal */}
      <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)}
        title={selectedNote?.type === 'system' ? (isEn ? 'View System Note' : 'عرض ملاحظة النظام') : (isEn ? 'Edit Note' : 'تعديل الملاحظة')}
        size="md">
        {selectedNote && (
          <div className="flex flex-col gap-4 py-2">
            {/* Note metadata bar */}
            <div className={`flex items-center gap-2 flex-wrap text-[10px] text-text-disabled ${isEn ? 'flex-row-reverse' : ''}`}>
              <span className={`px-2 py-0.5 rounded-full font-bold ${
                selectedNote.type === 'system' ? 'bg-accent-primary/10 text-accent-primary' : 'bg-hover text-text-secondary'
              }`}>
                {selectedNote.type === 'system' ? (isEn ? 'System' : 'النظام') : (isEn ? 'Personal' : 'شخصي')}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(selectedNote.created_at)}
              </span>
              {selectedNote.product_id && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-subtle">
                  <Package className="w-2.5 h-2.5" />
                  {isEn ? 'Product #' : 'منتج رقم '}{selectedNote.product_id}
                </span>
              )}
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${priorityConfig[selectedNote.priority]?.bg} ${priorityConfig[selectedNote.priority]?.color}`}>
                {isEn ? priorityConfig[selectedNote.priority]?.labelEn : priorityConfig[selectedNote.priority]?.label}
              </span>
            </div>

            {/* Title */}
            <div>
              <label className={`text-xs font-bold text-text-secondary block mb-1.5 ${isEn ? 'text-left' : ''}`}>
                {isEn ? 'Title' : 'العنوان'}
              </label>
              <input
                type="text"
                value={editForm.title}
                onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                readOnly={selectedNote.type === 'system'}
                className={`w-full h-11 bg-subtle border-default rounded-xl px-4 text-sm font-bold focus:border-accent-primary outline-none transition-all ${isEn ? 'text-left' : ''} ${selectedNote.type === 'system' ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </div>

            {/* Content */}
            <div>
              <label className={`text-xs font-bold text-text-secondary block mb-1.5 ${isEn ? 'text-left' : ''}`}>
                {isEn ? 'Content' : 'المحتوى'}
              </label>
              <textarea
                value={editForm.content}
                onChange={e => setEditForm(prev => ({ ...prev, content: e.target.value }))}
                readOnly={selectedNote.type === 'system'}
                rows={6}
                className={`w-full bg-subtle border-default rounded-xl p-4 text-sm font-bold focus:border-accent-primary outline-none transition-all resize-none ${isEn ? 'text-left' : ''} ${selectedNote.type === 'system' ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </div>

            {/* Priority (merchant only) */}
            {selectedNote.type === 'merchant' && (
              <div>
                <label className={`text-xs font-bold text-text-secondary block mb-1.5 ${isEn ? 'text-left' : ''}`}>
                  {isEn ? 'Priority' : 'الأولوية'}
                </label>
                <div className={`flex gap-2 ${isEn ? 'flex-row-reverse' : ''}`}>
                  {['low', 'medium', 'high'].map(p => {
                    const cfg = priorityConfig[p];
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={p}
                        onClick={() => setEditForm(prev => ({ ...prev, priority: p }))}
                        className={`flex-1 h-10 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
                          editForm.priority === p
                            ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                            : 'border-medium text-text-secondary hover:border-text-secondary'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {isEn ? cfg.labelEn : cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Read status */}
            {!selectedNote.read && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent-primary/10 text-accent-primary text-xs font-bold">
                <AlertCircle className="w-4 h-4" />
                {isEn ? 'This note has not been read yet' : 'هذه الملاحظة لم تُقرأ بعد'}
              </div>
            )}

            {/* Actions */}
            <div className={`flex gap-3 pt-2 ${isEn ? 'flex-row-reverse' : ''}`}>
              {selectedNote.type === 'merchant' ? (
                <Button onClick={handleUpdateNote} isLoading={isUpdating} className="flex-1 h-11 text-xs font-bold">
                  <Save className="w-4 h-4" />
                  {isEn ? 'Save Changes' : 'حفظ التغييرات'}
                </Button>
              ) : (
                <Button onClick={async () => {
                  if (!selectedNote.read) {
                    await handleMarkRead(selectedNote.id);
                    setSelectedNote(prev => ({ ...prev, read: true }));
                  }
                  setShowViewModal(false);
                }} disabled={isReading} className="flex-1 h-11 text-xs font-bold">
                  <CheckCircle className="w-4 h-4" />
                  {isEn ? 'Mark as Read' : 'تحديد كمقروءة'}
                </Button>
              )}
              {selectedNote.type === 'merchant' && !selectedNote.read && (
                <Button onClick={async () => {
                  await handleMarkRead(selectedNote.id);
                  setSelectedNote(prev => ({ ...prev, read: true }));
                }} variant="secondary" disabled={isReading} className="h-11 text-xs font-bold">
                  <CheckCircle className="w-4 h-4" />
                  {isEn ? 'Mark Read' : 'تحديد مقروءة'}
                </Button>
              )}
              <Button onClick={() => { handleDelete(selectedNote.id); }} variant="danger" disabled={isDeleting} className="h-11 text-xs font-bold">
                <Trash2 className="w-4 h-4" />
                {isEn ? 'Delete' : 'حذف'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
