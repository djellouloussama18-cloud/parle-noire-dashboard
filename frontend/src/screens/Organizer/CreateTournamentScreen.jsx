import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTournamentApi } from '../../api/tournaments.api';
import { generateTournamentDraw } from '../../utils/bracketEngine';
import useSettingsStore from '../../store/useSettingsStore';
import useNotification from '../../hooks/useNotification';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const CAPACITY_OPTIONS = [8, 16, 32, 64];

export default function CreateTournamentScreen() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const { language } = useSettingsStore();
  const isEn = language === 'en';

  const t = (ar, en) => isEn ? en : ar;

  const [form, setForm] = useState({
    title: '',
    description: '',
    rules: '',
    max_players: 16,
    type: 'knockout',
  });
  const [saving, setSaving] = useState(false);

  function handleChange(field) {
    return (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      showError(t('يرجى إدخال عنوان البطولة', 'Please enter a tournament title'));
      return;
    }

    setSaving(true);
    try {
      const tournament = await createTournamentApi({
        title: form.title,
        description: form.description,
        rules: form.rules,
        max_players: Number(form.max_players),
        type: form.type,
      });

      showSuccess(t('تم إنشاء البطولة بنجاح!', 'Tournament created!'));
      navigate(`/tournaments/${tournament.id}`);
    } catch (err) {
      showError(t('فشل إنشاء البطولة', 'Failed to create tournament'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="text-xs font-bold text-text-secondary hover:text-text-primary mb-4 transition-colors"
        >
          ← {t('العودة', 'Back')}
        </button>

        <div className="glass-panel rounded-2xl border border-medium p-8">
          <h1 className="text-xl font-black text-text-primary mb-6">
            {t('إنشاء بطولة جديدة', 'Create New Tournament')}
          </h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
              label={t('عنوان البطولة', 'Tournament Title')}
              value={form.title}
              onChange={handleChange('title')}
              placeholder={t('مثال: بطولة الشتاء', 'e.g. Winter Championship')}
              required
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-secondary">
                {t('الوصف', 'Description')}
              </label>
              <textarea
                value={form.description}
                onChange={handleChange('description')}
                rows={3}
                className="w-full bg-bg-primary border border-medium rounded-xl px-4 py-3 text-xs font-bold text-text-primary placeholder-text-disabled outline-none transition-all focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary resize-none"
                placeholder={t('وصف تفصيلي للبطولة...', 'Detailed tournament description...')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-secondary">
                {t('القوانين', 'Rules')}
              </label>
              <textarea
                value={form.rules}
                onChange={handleChange('rules')}
                rows={2}
                className="w-full bg-bg-primary border border-medium rounded-xl px-4 py-3 text-xs font-bold text-text-primary placeholder-text-disabled outline-none transition-all focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary resize-none"
                placeholder={t('الشروط والقوانين...', 'Terms and rules...')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-text-secondary">
                  {t('السعة القصوى', 'Max Players')}
                </label>
                <select
                  value={form.max_players}
                  onChange={(e) => setForm(prev => ({ ...prev, max_players: Number(e.target.value) }))}
                  className="w-full bg-bg-primary border border-medium rounded-xl px-4 py-3 text-xs font-bold text-text-primary outline-none transition-all focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary"
                >
                  {CAPACITY_OPTIONS.map(n => (
                    <option key={n} value={n}>{n} {t('لاعب', 'Players')}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-text-secondary">
                  {t('نظام البطولة', 'Structure')}
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full bg-bg-primary border border-medium rounded-xl px-4 py-3 text-xs font-bold text-text-primary outline-none transition-all focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary"
                >
                  <option value="knockout">{t('إقصائي', 'Knockout')}</option>
                  <option value="league">{t('دوري', 'League')}</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <Button
                type="submit"
                isLoading={saving}
                className="flex-1 text-xs font-bold h-12"
              >
                {t('إنشاء البطولة', 'Create Tournament')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="text-xs font-bold h-12 px-6"
              >
                {t('إلغاء', 'Cancel')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
