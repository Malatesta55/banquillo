import type { Advance, Injury, InducementPick, Stat } from './bb2025';
export type Profile = { id: string; name: string };
export type PlayerStatus = 'ok' | 'mng' | 'dead';
export type Team = {
  id: string; owner: string; name: string; race: string; hue: number;
  treasury: number; rerolls: number; apothecary: boolean; fans: number; created_at: string;
};
export type Player = {
  id: string; team_id: string; num: number; name: string; pos: string;
  spp: number; value: number; status: PlayerStatus;
  /** Avances comprados con experiencia (BB2025). */
  advances: Advance[];
};
/** Experiencia que gana un jugador en un partido. */
export type MatchPlayer = {
  match_id: string; player_id: string; team_id: string;
  td: number; cas: number; cmp: number; inter: number; ttm: number; mvp: boolean;
  /** Lesión que sufrió en el partido y, si es permanente, la característica que pierde. */
  injury: Injury; injury_stat: Stat | null;
};
/** Lo que pasa tras el partido para un equipo (ganancias, hinchas, errores caros). */
export type Postgame = {
  match_id: string; team_id: string; fan_factor: number; no_stalling: boolean; winnings: number;
  fans_before: number; fans_after: number; mistake: string; mistake_loss: number;
};
export type MatchInducement = { match_id: string; team_id: string; pick: InducementPick; treasury_spent: number };
export type CompType = 'liga' | 'torneo';
export type CompStatus = 'open' | 'running' | 'finished';
export type Competition = {
  id: string; organizer: string; name: string; type: CompType; double_round: boolean;
  total_rounds: number; pts_w: number; pts_d: number; pts_l: number;
  status: CompStatus; created_at: string;
};
export type Entry = { competition_id: string; team_id: string };
export type Match = {
  id: string; competition_id: string; round: number; home: string; away: string | null;
  td_home: number; td_away: number; cas_home: number; cas_away: number;
  played: boolean; reported_by: string | null;
};
export type DB = {
  profiles: Profile[]; teams: Team[]; players: Player[];
  competitions: Competition[]; entries: Entry[]; matches: Match[];
  match_players: MatchPlayer[]; inducements: MatchInducement[]; postgame: Postgame[];
};
export type NewMatch = Pick<Match, 'competition_id' | 'round' | 'home' | 'away'>;
export type Result = Pick<Match, 'td_home' | 'td_away' | 'cas_home' | 'cas_away'>;

export interface Repo {
  mode: 'supabase' | 'demo';
  currentUser(): Promise<Profile | null>;
  onAuthChange(cb: () => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  /** Devuelve true si hay que confirmar el email antes de entrar. */
  signUp(email: string, password: string, name: string): Promise<boolean>;
  signOut(): Promise<void>;
  updateProfile(name: string): Promise<void>;
  load(): Promise<DB>;
  subscribe(cb: () => void): () => void;

  createTeam(t: Pick<Team, 'name' | 'race' | 'hue'>): Promise<string>;
  updateTeam(id: string, patch: Partial<Team>): Promise<void>;
  deleteTeam(id: string): Promise<void>;
  addPlayer(p: Omit<Player, 'id' | 'advances'>): Promise<void>;
  updatePlayer(id: string, patch: Partial<Player>): Promise<void>;
  deletePlayer(id: string): Promise<void>;

  createCompetition(c: Omit<Competition, 'id' | 'organizer' | 'status' | 'created_at'>): Promise<string>;
  updateCompetition(id: string, patch: Partial<Competition>): Promise<void>;
  deleteCompetition(id: string): Promise<void>;
  enroll(competitionId: string, teamId: string): Promise<void>;
  withdraw(competitionId: string, teamId: string): Promise<void>;
  addMatches(ms: NewMatch[]): Promise<void>;
  deleteMatches(competitionId: string): Promise<void>;
  saveResult(matchId: string, r: Result): Promise<void>;
  clearResult(matchId: string): Promise<void>;
  /** Sustituye la experiencia de los jugadores de un equipo en un partido. */
  saveMatchPlayers(matchId: string, teamId: string, rows: Omit<MatchPlayer, 'match_id' | 'team_id'>[]): Promise<void>;
  saveInducements(matchId: string, teamId: string, pick: InducementPick, treasurySpent: number): Promise<void>;
  savePostgame(row: Postgame): Promise<void>;
}
