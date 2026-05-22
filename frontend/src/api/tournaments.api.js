import { supabase } from '../lib/supabase';

export const getTournamentsApi = async (status = 'open') => {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .in('status', ['open', 'active'])
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

export const createTournamentApi = async (tournamentData) => {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('tournaments')
    .insert({ ...tournamentData, created_by: user?.id })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const getParticipantsCountApi = async (tournamentId) => {
  const { count, error } = await supabase
    .from('participants')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId)
    .eq('status', 'confirmed');

  if (error) throw new Error(error.message);
  return count || 0;
};

export const getParticipantsApi = async (tournamentId) => {
  const { data, error } = await supabase
    .from('participants')
    .select('*, profiles:user_id(username, full_name)')
    .eq('tournament_id', tournamentId)
    .eq('status', 'confirmed');

  if (error) throw new Error(error.message);
  return data;
};

export const joinTournamentApi = async (tournamentId) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('participants')
    .insert({ tournament_id: tournamentId, user_id: user.id, username: user.email })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const updateTournamentStatusApi = async (tournamentId, status) => {
  const { data, error } = await supabase
    .from('tournaments')
    .update({ status })
    .eq('id', tournamentId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};
