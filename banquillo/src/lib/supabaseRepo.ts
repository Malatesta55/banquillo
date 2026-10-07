import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { DB, Profile, Repo } from './types';

function check<T>(r: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (r.error) throw new Error(r.error.message);
  return (r.data ?? []) as NonNullable<T>;
}
function ok(r: { error: { message: string } | null }) {
  if (r.error) throw new Error(r.error.message);
}

export function supabaseRepo(url: string, key: string): Repo {
  const sb: SupabaseClient = createClient(url, key);
  const uid = async () => (await sb.auth.getUser()).data.user?.id ?? null;

  return {
    mode: 'supabase',
    async currentUser(): Promise<Profile | null> {
      const id = await uid();
      if (!id) return null;
      const p = check(await sb.from('profiles').select('id,name').eq('id', id).maybeSingle());
      return (p as Profile | null)?.id ? (p as Profile) : { id, name: 'Entrenador' };
    },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange(() => cb());
      return () => data.subscription.unsubscribe();
    },
    async signIn(email, password) {
      ok(await sb.auth.signInWithPassword({ email, password }));
    },
    async signUp(email, password, name) {
      const r = await sb.auth.signUp({
        email, password,
        options: { data: { name }, emailRedirectTo: location.origin + location.pathname },
      });
      ok(r);
      return !r.data.session;
    },
    async signOut() { await sb.auth.signOut(); },
    async updateProfile(name) {
      const id = await uid();
      check(await sb.from('profiles').update({ name }).eq('id', id));
    },
    async load(): Promise<DB> {
      const [profiles, teams, players, competitions, entries, matches] = await Promise.all([
        sb.from('profiles').select('id,name'),
        sb.from('teams').select('*').order('created_at'),
        sb.from('players').select('*'),
        sb.from('competitions').select('*').order('created_at', { ascending: false }),
        sb.from('entries').select('competition_id,team_id'),
        sb.from('matches').select('*'),
      ]);
      return {
        profiles: check(profiles), teams: check(teams), players: check(players),
        competitions: check(competitions), entries: check(entries), matches: check(matches),
      };
    },
    subscribe(cb) {
      let t: ReturnType<typeof setTimeout> | undefined;
      const debounced = () => { clearTimeout(t); t = setTimeout(cb, 300); };
      const ch = sb.channel('banquillo');
      for (const table of ['teams', 'players', 'competitions', 'entries', 'matches', 'profiles'])
        ch.on('postgres_changes', { event: '*', schema: 'public', table }, debounced);
      ch.subscribe();
      return () => { sb.removeChannel(ch); };
    },
    async createTeam(t) {
      return check(await sb.from('teams').insert(t).select('id').single()).id;
    },
    async updateTeam(id, patch) { check(await sb.from('teams').update(patch).eq('id', id)); },
    async deleteTeam(id) {
      const r = await sb.from('teams').delete().eq('id', id);
      if (r.error?.code === '23503') throw new Error('Este equipo ya tiene partidos en una competición y no se puede eliminar.');
      check(r);
    },
    async addPlayer(p) { check(await sb.from('players').insert(p)); },
    async updatePlayer(id, patch) { check(await sb.from('players').update(patch).eq('id', id)); },
    async deletePlayer(id) { check(await sb.from('players').delete().eq('id', id)); },
    async createCompetition(c) {
      return check(await sb.from('competitions').insert(c).select('id').single()).id;
    },
    async updateCompetition(id, patch) { check(await sb.from('competitions').update(patch).eq('id', id)); },
    async deleteCompetition(id) { check(await sb.from('competitions').delete().eq('id', id)); },
    async enroll(competition_id, team_id) { check(await sb.from('entries').insert({ competition_id, team_id })); },
    async withdraw(competition_id, team_id) {
      check(await sb.from('entries').delete().eq('competition_id', competition_id).eq('team_id', team_id));
    },
    async addMatches(ms) { if (ms.length) check(await sb.from('matches').insert(ms)); },
    async deleteMatches(competition_id) { check(await sb.from('matches').delete().eq('competition_id', competition_id)); },
    async saveResult(id, r) {
      check(await sb.from('matches').update({ ...r, played: true, reported_by: await uid() }).eq('id', id));
    },
    async clearResult(id) {
      check(await sb.from('matches').update({ td_home: 0, td_away: 0, cas_home: 0, cas_away: 0, played: false, reported_by: null }).eq('id', id));
    },
  };
}
