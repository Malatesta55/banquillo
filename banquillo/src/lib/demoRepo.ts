import type { DB, Match, Profile, Repo } from './types';
import { roundRobin } from './logic';
import { starterLineup } from './rosters';

/** Modo demo: todo en localStorage, con cuentas ficticias. Sirve para probar la app sin Supabase. */
const KEY = 'banquillo-demo-v4';
const uid = () => crypto.randomUUID();
type Store = DB & { users: Record<string, string>; session: string | null };

function rng(seed: number) { return () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296); }

function seed(): Store {
  const r = rng(7);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const first = ['Grimm', 'Ulla', 'Brok', 'Tasha', 'Krug', 'Fen', 'Morra', 'Dagg', 'Ilsa', 'Rurik', 'Zeb', 'Hilda', 'Snag', 'Orla', 'Vex', 'Tor'];
  const last = ['Rompehuesos', 'Pies Ligeros', 'Mano Firme', 'el Tuerto', 'Cabezahierro', 'Colmillo', 'Barbaroja', 'Saltamuros', 'Trueno', 'Garra'];
  const coaches = ['Andrés', 'Marta', 'Javi', 'Lucía', 'Pablo', 'Sergio'];
  const profiles: Profile[] = coaches.map(name => ({ id: uid(), name }));
  const users: Record<string, string> = {};
  profiles.forEach(p => (users[p.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') + '@demo'] = p.id));
  const defs: [string, string, number][] = [['Martillos de Piedrafría', 'Enanos', 28], ['Colmillos del Pantano', 'Hombres Lagarto', 140], ['Rata Veloz', 'Skaven', 95], ['Lanzas de Plata', 'Altos Elfos', 205], ['Carniceros de Valle Negro', 'Orcos', 8], ['Hijos del Trueno', 'Nórdicos', 190]];
  const now = Date.now();
  const teams = defs.map(([name, race, hue], i) => ({
    id: uid(), owner: profiles[i].id, name, race, hue, treasury: Math.round(r() * 8) * 10,
    rerolls: 2 + Math.floor(r() * 2), apothecary: r() > 0.4, fans: 1 + Math.floor(r() * 3), created_at: new Date(now + i).toISOString(),
  }));
  const players = teams.flatMap(t => starterLineup(t.race).map((p, i) => ({
    id: uid(), team_id: t.id, num: i + 1, name: pick(first) + ' ' + pick(last), pos: p.name, value: p.cost,
    spp: Math.floor(r() * 14), status: (r() > 0.93 ? 'mng' : 'ok') as 'ok' | 'mng', advances: [],
  })));
  const liga = { id: uid(), organizer: profiles[0].id, name: 'Liga de Otoño 2026', type: 'liga' as const, double_round: false, total_rounds: 0, pts_w: 3, pts_d: 1, pts_l: 0, status: 'running' as const, created_at: new Date(now).toISOString() };
  const copa = { id: uid(), organizer: profiles[1].id, name: 'Copa del Mamporro', type: 'torneo' as const, double_round: false, total_rounds: 3, pts_w: 3, pts_d: 1, pts_l: 0, status: 'open' as const, created_at: new Date(now + 1).toISOString() };
  const entries = [...teams.map(t => ({ competition_id: liga.id, team_id: t.id })), ...teams.slice(1, 4).map(t => ({ competition_id: copa.id, team_id: t.id }))];
  const matches: Match[] = roundRobin(liga.id, teams.map(t => t.id), false).map(m => ({
    ...m, id: uid(), td_home: 0, td_away: 0, cas_home: 0, cas_away: 0, played: false, reported_by: null,
  }));
  matches.filter(m => m.round <= 2 && m.away).forEach(m => Object.assign(m, {
    played: true, td_home: Math.floor(r() * r() * 4), td_away: Math.floor(r() * r() * 4),
    cas_home: Math.floor(r() * 3), cas_away: Math.floor(r() * 3), reported_by: profiles[0].id,
  }));
  return { profiles, teams, players, competitions: [liga, copa], entries, matches, match_players: [], inducements: [], users, session: null };
}

export function demoRepo(): Repo {
  let s: Store;
  try { s = JSON.parse(localStorage.getItem(KEY) ?? 'null') ?? seed(); } catch { s = seed(); }
  const listeners = new Set<() => void>();
  const authListeners = new Set<() => void>();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* sin almacenamiento */ } listeners.forEach(f => f()); };
  const me = () => { if (!s.session) throw new Error('Inicia sesión para hacer cambios.'); return s.session; };
  const deny = () => { throw new Error('No tienes permiso para hacer este cambio.'); };
  const compOf = (id: string) => s.competitions.find(c => c.id === id);
  const teamOf = (id: string) => s.teams.find(t => t.id === id);
  const ownsTeam = (id: string) => teamOf(id)?.owner === me();
  const organizes = (compId: string) => compOf(compId)?.organizer === me();

  return {
    mode: 'demo',
    async currentUser() { return s.profiles.find(p => p.id === s.session) ?? null; },
    onAuthChange(cb) { authListeners.add(cb); return () => authListeners.delete(cb); },
    async signIn(email) {
      const id = s.users[email.trim().toLowerCase()];
      if (!id) throw new Error('No hay ninguna cuenta demo con ese email. Prueba con andres@demo o crea una.');
      s.session = id; save(); authListeners.forEach(f => f());
    },
    async signUp(email, _password, name) {
      const e = email.trim().toLowerCase();
      if (s.users[e]) throw new Error('Ya existe una cuenta con ese email.');
      const p = { id: uid(), name: name.trim() || 'Entrenador' };
      s.profiles.push(p); s.users[e] = p.id; s.session = p.id; save(); authListeners.forEach(f => f());
      return false;
    },
    async signOut() { s.session = null; save(); authListeners.forEach(f => f()); },
    async updateProfile(name) { const p = s.profiles.find(x => x.id === me()); if (p) p.name = name; save(); },
    async load() {
      const { profiles, teams, players, competitions, entries, matches, match_players = [], inducements = [] } = structuredClone(s);
      return { profiles, teams, players: players.map(p => ({ ...p, advances: p.advances ?? [] })), competitions, entries, matches, match_players, inducements };
    },
    subscribe(cb) { listeners.add(cb); return () => listeners.delete(cb); },

    async createTeam(t) {
      const id = uid();
      s.teams.push({ ...t, id, owner: me(), treasury: 1000, rerolls: 0, apothecary: false, fans: 1, created_at: new Date().toISOString() });
      save(); return id;
    },
    async updateTeam(id, patch) { if (!ownsTeam(id)) deny(); Object.assign(teamOf(id)!, patch); save(); },
    async deleteTeam(id) {
      if (!ownsTeam(id)) deny();
      if (s.matches.some(m => m.home === id || m.away === id)) throw new Error('Este equipo ya tiene partidos en una competición y no se puede eliminar.');
      s.teams = s.teams.filter(t => t.id !== id); s.players = s.players.filter(p => p.team_id !== id);
      s.entries = s.entries.filter(e => e.team_id !== id); save();
    },
    async addPlayer(p) { if (!ownsTeam(p.team_id)) deny(); s.players.push({ ...p, advances: [], id: uid() }); save(); },
    async updatePlayer(id, patch) {
      const p = s.players.find(x => x.id === id); if (!p || !ownsTeam(p.team_id)) deny();
      Object.assign(p!, patch); save();
    },
    async deletePlayer(id) {
      const p = s.players.find(x => x.id === id); if (!p || !ownsTeam(p.team_id)) deny();
      s.players = s.players.filter(x => x.id !== id); save();
    },
    async createCompetition(c) {
      const id = uid();
      s.competitions.unshift({ ...c, id, organizer: me(), status: 'open', created_at: new Date().toISOString() });
      save(); return id;
    },
    async updateCompetition(id, patch) { if (!organizes(id)) deny(); Object.assign(compOf(id)!, patch); save(); },
    async deleteCompetition(id) {
      if (!organizes(id)) deny();
      s.competitions = s.competitions.filter(c => c.id !== id);
      s.entries = s.entries.filter(e => e.competition_id !== id);
      s.matches = s.matches.filter(m => m.competition_id !== id); save();
    },
    async enroll(competition_id, team_id) {
      if (!(ownsTeam(team_id) && compOf(competition_id)?.status === 'open') && !organizes(competition_id)) deny();
      if (!s.entries.some(e => e.competition_id === competition_id && e.team_id === team_id)) s.entries.push({ competition_id, team_id });
      save();
    },
    async withdraw(competition_id, team_id) {
      if (!ownsTeam(team_id) && !organizes(competition_id)) deny();
      s.entries = s.entries.filter(e => !(e.competition_id === competition_id && e.team_id === team_id)); save();
    },
    async addMatches(ms) {
      ms.forEach(m => { if (!organizes(m.competition_id)) deny(); });
      s.matches.push(...ms.map(m => ({ ...m, id: uid(), td_home: 0, td_away: 0, cas_home: 0, cas_away: 0, played: false, reported_by: null })));
      save();
    },
    async deleteMatches(cid) { if (!organizes(cid)) deny(); s.matches = s.matches.filter(m => m.competition_id !== cid); save(); },
    async saveResult(id, r) {
      const m = s.matches.find(x => x.id === id)!;
      if (!organizes(m.competition_id) && !ownsTeam(m.home) && !(m.away && ownsTeam(m.away))) deny();
      Object.assign(m, r, { played: true, reported_by: me() }); save();
    },
    async clearResult(id) {
      const m = s.matches.find(x => x.id === id)!;
      if (!organizes(m.competition_id) && !ownsTeam(m.home) && !(m.away && ownsTeam(m.away))) deny();
      Object.assign(m, { td_home: 0, td_away: 0, cas_home: 0, cas_away: 0, played: false, reported_by: null }); save();
    },
    async saveMatchPlayers(match_id, team_id, rows) {
      const m = s.matches.find(x => x.id === match_id);
      if (!m || (m.home !== team_id && m.away !== team_id) || !ownsTeam(team_id)) deny();
      s.match_players = (s.match_players ?? []).filter(x => !(x.match_id === match_id && x.team_id === team_id))
        .concat(rows.map(r => ({ ...r, match_id, team_id })));
      save();
    },
    async saveInducements(match_id, team_id, pick, treasury_spent) {
      const m = s.matches.find(x => x.id === match_id);
      if (!m || (m.home !== team_id && m.away !== team_id) || !ownsTeam(team_id)) deny();
      s.inducements = (s.inducements ?? []).filter(x => !(x.match_id === match_id && x.team_id === team_id))
        .concat([{ match_id, team_id, pick, treasury_spent }]);
      save();
    },
  };
}

export function resetDemo() { try { localStorage.removeItem(KEY); } catch { /* nada */ } location.reload(); }
