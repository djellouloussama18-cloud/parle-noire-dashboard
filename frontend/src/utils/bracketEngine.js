import { supabase } from '../lib/supabase';

function fisherYatesShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function generateTournamentDraw(tournamentId) {
  if (!tournamentId) {
    return { success: false, error: 'Tournament ID is required.' };
  }

  // 1. Fetch tournament details
  const { data: tournament, error: tError } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  if (tError || !tournament) {
    return { success: false, error: 'Tournament not found.' };
  }

  if (tournament.status !== 'open') {
    return { success: false, error: `Tournament is already ${tournament.status}.` };
  }

  // 2. Fetch all confirmed participants
  const { data: participants, error: pError } = await supabase
    .from('participants')
    .select('user_id, username')
    .eq('tournament_id', tournamentId)
    .eq('status', 'confirmed');

  if (pError) {
    return { success: false, error: 'Failed to fetch participants.' };
  }

  const totalPlayers = participants.length;
  const expected = tournament.max_players;

  // 3. Edge case: not enough players
  if (totalPlayers < 2) {
    return {
      success: false,
      error: `Only ${totalPlayers} player(s) registered. At least 2 required to start.`,
      alert: 'alert-insufficient'
    };
  }

  if (totalPlayers !== expected) {
    return {
      success: false,
      error: `Expected ${expected} players, but only ${totalPlayers} confirmed. Fill all slots before starting.`,
      alert: 'alert-capacity-mismatch'
    };
  }

  // 4. Fisher-Yates shuffle to randomize order
  const shuffled = fisherYatesShuffle(participants);

  // 5. Generate match pairs (knockout — index 0 vs 1, 2 vs 3, ...)
  const matchInserts = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    const p1 = shuffled[i];
    const p2 = shuffled[i + 1];
    if (!p2) break;

    matchInserts.push({
      tournament_id: tournamentId,
      round_number: 1,
      player1_id: p1.user_id,
      player2_id: p2.user_id,
      status: 'pending'
    });
  }

  if (matchInserts.length === 0) {
    return { success: false, error: 'Could not generate any match pairs.' };
  }

  // 6. Insert matches
  const { error: mError } = await supabase
    .from('matches')
    .insert(matchInserts);

  if (mError) {
    return { success: false, error: 'Failed to create matches: ' + mError.message };
  }

  // 7. Mark tournament as active
  const { error: uError } = await supabase
    .from('tournaments')
    .update({ status: 'active' })
    .eq('id', tournamentId);

  if (uError) {
    return { success: false, error: 'Tournament created but failed to activate.' };
  }

  return {
    success: true,
    totalPlayers,
    matchPairs: matchInserts.length,
    message: `Tournament started with ${totalPlayers} players across ${matchInserts.length} matches.`
  };
}
