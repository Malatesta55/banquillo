import type { Competition, DB, Match, NewMatch, Player, Team } from './types';
import { sppTable, type Stat } from './bb2025';
import { APOTHECARY_COST, rerollCost } from './rosters';

export function shuffle<T>(a: T[]): T[] {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/** Calendario de liga por el método del círculo. Un `null` significa que ese equipo descansa. */
export function roundRobin(competitionId: string, ids: string[], double: boolean): NewMatch[] {
  const t: (string | null)[] = ids.slice();
  if (t.length % 2) t.push(null);
  const n = t.length;
  const rounds: [string, string | null][][] = [];
  for (let k = 0; k < n - 1; k++) {
    const rd: [string, string | null][] = [];
    for (let i = 0; i < n / 2; i++) {
      let h = t[i], a = t[n - 1 - i];
      if (i === 0 && k % 2) [h, a] = [a, h];
      if (h === null) [h, a] = [a, h];
      rd.push([h as string, a]);
    }
    rounds.push(rd);
    t.splice(1, 0, t.pop() as string | null);
  }
  if (double) rounds.slice().forEach(rd => rounds.push(rd.map(([h, a]) => (a ? [a, h] : [h, null]))));
  return rounds.flatMap((rd, ri) => rd.map(([home, away]) => ({ competition_id: competitionId, round: ri + 1, home, away })));
}

/** Empareja la siguiente ronda suiza: orden de la clasificación, sin repetir rivales si se puede. */
export function swissRound(comp: Competition, teamIds: string[], matches: Match[], db: DB): NewMatch[] {
  const round = matches.reduce((m, x) => Math.max(m, x.round), 0) + 1;
  let order = standings(comp, teamIds, matches, db.teams).map(r => r.id);
  if (round === 1) order = shuffle(order);
  const met = new Set<string>(), byes = new Set<string>();
  matches.forEach(m => {
    if (m.away) { met.add(m.home + '|' + m.away); met.add(m.away + '|' + m.home); } else byes.add(m.home);
  });
  const out: NewMatch[] = [];
  let pool = order.slice();
  if (pool.length % 2) {
    const b = [...pool].reverse().find(id => !byes.has(id)) ?? pool[pool.length - 1];
    pool = pool.filter(x => x !== b);
    out.push({ competition_id: comp.id, round, home: b, away: null });
  }
  const pair = (p: string[], strict: boolean): [string, string][] | null => {
    if (!p.length) return [];
    const [a, ...rest] = p;
    for (let i = 0; i < rest.length; i++) {
      if (strict && met.has(a + '|' + rest[i])) continue;
      const sub = pair(rest.filter((_, j) => j !== i), strict);
      if (sub) return [[a, rest[i]], ...sub];
    }
    return null;
  };
  const pairs = pair(pool, true) ?? pair(pool, false) ?? [];
  return [...pairs.map(([home, away]) => ({ competition_id: comp.id, round, home, away })), ...out];
}

export type Row = {
  id: string; pj: number; w: number; d: number; l: number;
  tdf: number; tda: number; casf: number; casa: number; pts: number; form: ('W' | 'D' | 'L')[];
};

export const roundDone = (ms: Match[]) => ms.every(m => !m.away || m.played);

export function byRound(matches: Match[]): Match[][] {
  const out: Match[][] = [];
  matches.forEach(m => { (out[m.round - 1] ??= []).push(m); });
  return out.map(r => r ?? []);
}

export function standings(comp: Competition, teamIds: string[], matches: Match[], teams: Team[]): Row[] {
  const rows: Record<string, Row> = {};
  teamIds.forEach(id => (rows[id] = { id, pj: 0, w: 0, d: 0, l: 0, tdf: 0, tda: 0, casf: 0, casa: 0, pts: 0, form: [] }));
  byRound(matches).forEach(rd => rd.forEach(m => {
    if (!m.away) {
      const r = rows[m.home];
      if (comp.type === 'torneo' && r && roundDone(rd)) { r.pj++; r.w++; r.pts += comp.pts_w; r.form.push('W'); }
      return;
    }
    const h = rows[m.home], a = rows[m.away];
    if (!m.played || !h || !a) return;
    h.pj++; a.pj++;
    h.tdf += m.td_home; h.tda += m.td_away; a.tdf += m.td_away; a.tda += m.td_home;
    h.casf += m.cas_home; h.casa += m.cas_away; a.casf += m.cas_away; a.casa += m.cas_home;
    if (m.td_home > m.td_away) { h.w++; a.l++; h.pts += comp.pts_w; a.pts += comp.pts_l; h.form.push('W'); a.form.push('L'); }
    else if (m.td_home < m.td_away) { a.w++; h.l++; a.pts += comp.pts_w; h.pts += comp.pts_l; a.form.push('W'); h.form.push('L'); }
    else { h.d++; a.d++; h.pts += comp.pts_d; a.pts += comp.pts_d; h.form.push('D'); a.form.push('D'); }
  }));
  const name = (id: string) => teams.find(t => t.id === id)?.name ?? '';
  return Object.values(rows).sort((x, y) =>
    y.pts - x.pts || (y.tdf - y.tda) - (x.tdf - x.tda) || (y.casf - y.casa) - (x.casf - x.casa) ||
    y.tdf - x.tdf || name(x.id).localeCompare(name(y.id)));
}

export function progress(comp: Competition, teamCount: number, matches: Match[]) {
  const real = matches.filter(m => m.away);
  const done = real.filter(m => m.played).length;
  const total = comp.type === 'torneo' ? Math.floor(teamCount / 2) * comp.total_rounds : real.length;
  return { done, total };
}

export function teamValue(t: Team, db: DB): number {
  return db.players.filter(p => p.team_id === t.id && p.status !== 'dead').reduce((a, p) => a + p.value, 0)
    + t.rerolls * rerollCost(t.race) + (t.apothecary ? APOTHECARY_COST : 0);
}

export const fmtK = (n: number) => n.toLocaleString('es-ES') + 'k';

export function initials(n: string): string {
  return n.split(/\s+/).filter(w => w.length > 2 || /^[A-ZÁÉÍÓÚ]/.test(w)).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

/** Vista derivada de una competición. */
export function compView(db: DB, id: string) {
  const comp = db.competitions.find(c => c.id === id);
  if (!comp) return null;
  const teamIds = db.entries.filter(e => e.competition_id === id).map(e => e.team_id);
  const matches = db.matches.filter(m => m.competition_id === id).sort((a, b) => a.round - b.round);
  return { comp, teamIds, matches };
}

/** PE de un jugador: ajuste manual + lo apuntado en las actas, menos lo gastado en avances. */
export function sppOf(p: Player, db: DB) {
  const race = db.teams.find(t => t.id === p.team_id)?.race ?? '';
  const v = sppTable(race);
  const earned = p.spp + db.match_players.filter(x => x.player_id === p.id)
    .reduce((a, x) => a + x.td * v.td + x.cas * v.cas + x.cmp * v.cmp + x.inter * v.inter + x.ttm * v.ttm + (x.mvp ? v.mvp : 0), 0);
  const spent = (p.advances ?? []).reduce((a, x) => a + x.spp, 0);
  return { earned, spent, available: earned - spent };
}

/** Secuelas de un jugador según las actas: características perdidas y lesiones persistentes. */
export function injuriesOf(playerId: string, db: DB) {
  const rows = db.match_players.filter(x => x.player_id === playerId);
  return {
    lasting: rows.filter(x => x.injury === 'li' && x.injury_stat).map(x => x.injury_stat as Stat),
    niggling: rows.filter(x => x.injury === 'si').length,
  };
}

/** Valor de equipo actual (VEA): sin los jugadores que se pierden el próximo partido. */
export function currentTeamValue(t: Team, db: DB): number {
  return teamValue(t, db) - db.players.filter(p => p.team_id === t.id && p.status === 'mng').reduce((a, p) => a + p.value, 0);
}
