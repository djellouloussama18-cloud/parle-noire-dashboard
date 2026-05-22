import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getParticipantsApi, getParticipantsCountApi } from '../../api/tournaments.api';
import { generateTournamentDraw } from '../../utils/bracketEngine';
import useSettingsStore from '../../store/useSettingsStore';
import useNotification from '../../hooks/useNotification';
import Button from '../../components/ui/Button';

export default function TournamentDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const { language } = useSettingsStore();
  const isEn = language === 'en';

  const t = (ar, en) => isEn ? en : ar;

  const [tournament, setTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [filled, setFilled] = useState(0);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  async function fetchDetail() {
    setLoading(true);
    try {
      const { data: tData } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();
      setTournament(tData);

      const pData = await getParticipantsApi(id);
      setParticipants(pData || []);

      const count = await getParticipantsCountApi(id);
      setFilled(count);
    } catch (err) {
      showError(t('فشل تحميل تفاصيل البطولة', 'Failed to load tournament'));
    } finally {
      setLoading(false);
    }
  }

  async function handleStart() {
    setStarting(true);
    try {
      const result = await generateTournamentDraw(Number(id));
      if (result.success) {
        showSuccess(t('تم انطلاق البطولة!', 'Tournament started!'));
        fetchDetail();
      } else {
        // Show the specific error from the engine
        showError(t(result.error, result.error));
      }
    } catch (err) {
      showError(t('فشل تشغيل البطولة', 'Failed to start tournament'));
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center">
        <span className="text-sm text-text-secondary">{t('جاري التحميل...', 'Loading...')}</span>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center">
        <span className="text-sm text-text-secondary">{t('البطولة غير موجودة', 'Tournament not found')}</span>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate('/tournaments')}
          className="text-xs font-bold text-text-secondary hover:text-text-primary mb-4 transition-colors"
        >
          ← {t('العودة للبطولات', 'Back to Tournaments')}
        </button>

        <div className="glass-panel rounded-2xl border border-medium p-6 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-black text-text-primary">{tournament.title}</h1>
            <span className={`text-[10px] font-black px-3 py-1 rounded-full ${
              tournament.status === 'active' ? 'bg-accent-primary/10 text-accent-primary' :
              tournament.status === 'completed' ? 'bg-green-500/10 text-green-400' :
              'bg-yellow-500/10 text-yellow-400'
            }`}>
              {tournament.status === 'active' ? t('نشط', 'Active') :
               tournament.status === 'completed' ? t('منتهي', 'Completed') :
               t('مفتوح', 'Open')}
            </span>
          </div>

          {tournament.description && (
            <p className="text-xs text-text-secondary mb-3 leading-relaxed">{tournament.description}</p>
          )}

          {tournament.rules && (
            <div className="text-[10px] text-text-disabled bg-bg-secondary rounded-xl px-3 py-2 border border-light mb-4">
              <span className="font-bold">{t('القوانين:', 'Rules:')}</span> {tournament.rules}
            </div>
          )}

          <div className="flex flex-wrap gap-4 text-xs font-bold text-text-secondary mb-4">
            <span>{t('النوع:', 'Type:')} {tournament.type === 'knockout' ? t('إقصائي', 'Knockout') : t('دوري', 'League')}</span>
            <span>{t('السعة:', 'Capacity:')} {tournament.max_players}</span>
            <span>{t('المشاركون:', 'Players:')} {filled}/{tournament.max_players}</span>
          </div>

          {tournament.status === 'open' && (
            <Button
              onClick={handleStart}
              isLoading={starting}
              disabled={filled < 2}
              className="w-full text-xs font-bold h-12 mt-2"
            >
              {filled < 2
                ? t('يحتاج 2 لاعبين على الأقل', 'Need at least 2 players')
                : t('بدء البطولة', 'Start Tournament')}
            </Button>
          )}
          {tournament.status === 'active' && (
            <div className="text-xs font-bold text-accent-primary text-center py-3 bg-accent-primary/5 rounded-xl">
              {t('البطولة قيد التنفيذ', 'Tournament is in progress')}
            </div>
          )}
        </div>

        <div className="glass-panel rounded-2xl border border-medium p-6">
          <h2 className="text-sm font-black text-text-primary mb-4">
            {t('قائمة المشاركين', 'Participants')} ({participants.length})
          </h2>

          {participants.length === 0 ? (
            <p className="text-xs text-text-secondary text-center py-6">
              {t('لا يوجد مشاركون بعد', 'No participants yet')}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {participants.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-bg-secondary border border-light"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-accent-primary/10 text-accent-primary text-[10px] font-black flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-xs font-bold text-text-primary">
                      {p.profiles?.username || p.username || t('لاعب', 'Player')}
                    </span>
                  </div>
                  <span className="text-[10px] text-text-secondary">{t('مؤكد', 'Confirmed')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
