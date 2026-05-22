import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTournamentsApi, getParticipantsCountApi, joinTournamentApi } from '../../api/tournaments.api';
import useSettingsStore from '../../store/useSettingsStore';
import useNotification from '../../hooks/useNotification';
import Button from '../../components/ui/Button';

const TYPE_STYLES = {
  knockout: { label: { ar: 'إقصائي', en: 'Knockout' }, color: 'text-accent-primary' },
  league: { label: { ar: 'دوري', en: 'League' }, color: 'text-yellow-400' },
};

export default function TournamentFeedScreen() {
  const navigate = useNavigate();
  const { showError, showSuccess } = useNotification();
  const { language } = useSettingsStore();
  const isEn = language === 'en';

  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({});

  const t = (ar, en) => isEn ? en : ar;

  useEffect(() => {
    fetchTournaments();
  }, []);

  async function fetchTournaments() {
    setLoading(true);
    try {
      const data = await getTournamentsApi();
      setTournaments(data || []);

      const c = {};
      for (const t of (data || [])) {
        c[t.id] = await getParticipantsCountApi(t.id);
      }
      setCounts(c);
    } catch (err) {
      showError(t('فشل تحميل البطولات', 'Failed to load tournaments'));
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(id) {
    try {
      await joinTournamentApi(id);
      showSuccess(t('تم الانضمام للبطولة بنجاح!', 'Joined tournament!'));
      fetchTournaments();
    } catch (err) {
      showError(err.message);
    }
  }

  return (
    <div className="p-6 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-text-primary">
          {t('البطولات', 'Tournaments')}
        </h1>
        <Button onClick={() => navigate('/organizer/create')} className="text-xs font-bold h-10 px-5">
          {t('إنشاء بطولة', 'Create Tournament')}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-text-secondary text-sm">
          {t('جاري التحميل...', 'Loading...')}
        </div>
      ) : tournaments.length === 0 ? (
        <div className="text-center py-20 text-text-secondary text-sm">
          {t('لا توجد بطولات مفتوحة حالياً', 'No open tournaments right now')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tournaments.map(tournament => {
            const style = TYPE_STYLES[tournament.type] || TYPE_STYLES.knockout;
            const filled = counts[tournament.id] || 0;
            const pct = Math.round((filled / tournament.max_players) * 100);

            return (
              <div
                key={tournament.id}
                className="glass-panel rounded-2xl border border-medium p-5 flex flex-col gap-3 hover:border-accent-primary/30 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full bg-accent-primary/10 ${style.color}`}>
                    {style.label[language]}
                  </span>
                  <span className="text-[10px] font-bold text-text-secondary px-2 py-0.5 rounded-full bg-bg-secondary border border-light">
                    {tournament.status}
                  </span>
                </div>

                <h3 className="text-sm font-black text-text-primary leading-snug">
                  {tournament.title}
                </h3>

                {tournament.description && (
                  <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-2">
                    {tournament.description}
                  </p>
                )}

                {tournament.rules && (
                  <div className="text-[10px] text-text-disabled bg-bg-secondary rounded-xl px-3 py-2 border border-light">
                    <span className="font-bold">{t('القوانين:', 'Rules:')}</span> {tournament.rules}
                  </div>
                )}

                <div className="mt-auto">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-text-secondary">
                      {filled}/{tournament.max_players} {t('لاعب', 'Players')}
                    </span>
                    <span className="text-[10px] font-black text-accent-primary">{pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-primary rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-1">
                  <Button
                    onClick={() => navigate(`/tournaments/${tournament.id}`)}
                    variant="outline"
                    className="flex-1 text-[10px] font-bold h-9"
                  >
                    {t('عرض البطولة', 'View Tournament')}
                  </Button>
                  {tournament.status === 'open' && (
                    <Button
                      onClick={() => handleJoin(tournament.id)}
                      className="flex-1 text-[10px] font-bold h-9"
                    >
                      {t('انضمام', 'Join')}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
