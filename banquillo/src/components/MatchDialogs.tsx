import { useState } from 'react';
import { useStore } from '../lib/store';
import { currentTeamValue, fmtK } from '../lib/logic';
import {
  emptyPick, inducementsFor, MAX_MERCS, MAX_STARS, MERC_FEE, MERC_SKILL, pickCost, rand, SPP_LABEL, UNDERDOG_TREASURY,
  type InducementPick, type SppKey,
} from '../lib/bb2025';
import type { Match, MatchPlayer } from '../lib/types';
import { Crest } from './ui';

export type SppRow = Omit<MatchPlayer, 'match_id' | 'team_id'>;
const COUNTS: Exclude<SppKey, 'mvp'>[] = ['td', 'cas', 'cmp', 'inter', 'ttm'];
const blank = (player_id: string): SppRow => ({ player_id, td: 0, cas: 0, cmp: 0, inter: 0, ttm: 0, mvp: false });

/** Estado inicial de la experiencia de un equipo en un partido, a partir de lo ya guardado. */
export function initialSpp(matchId: string, teamId: string, db: ReturnType<typeof useStore>['db']): Record<string, SppRow> {
  const out: Record<string, SppRow> = {};
  db.players.filter(p => p.team_id === teamId && p.status !== 'dead').forEach(p => (out[p.id] = blank(p.id)));
  db.match_players.filter(x => x.match_id === matchId && x.team_id === teamId).forEach(x => (out[x.player_id] = { ...blank(x.player_id), ...x }));
  return out;
}
export const sppRowsToSave = (rows: Record<string, SppRow>) =>
  Object.values(rows).filter(r => r.mvp || COUNTS.some(k => r[k] > 0)).map(({ player_id, td, cas, cmp, inter, ttm, mvp }) => ({ player_id, td, cas, cmp, inter, ttm, mvp }));

/** Tabla para apuntar los PE que gana cada jugador de un equipo en el partido. */
export function SppEditor({ teamId, rows, onChange, td, cas }: {
  teamId: string; rows: Record<string, SppRow>; onChange: (r: Record<string, SppRow>) => void; td: number; cas: number;
}) {
  const { db } = useStore();
  const t = db.teams.find(x => x.id === teamId);
  const players = db.players.filter(p => rows[p.id]).sort((a, b) => a.num - b.num);
  const set = (id: string, patch: Partial<SppRow>) => onChange({ ...rows, [id]: { ...rows[id], ...patch } });
  const sum = (k: 'td' | 'cas') => Object.values(rows).reduce((a, r) => a + r[k], 0);
  const mvpPool = players.filter(p => p.status === 'ok');
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="team-line"><Crest team={t} /><b className="nm">Experiencia de {t?.name}</b></div>
        <button type="button" className="btn small" disabled={!mvpPool.length} title="Elige al azar el MVP entre los jugadores disponibles"
          onClick={() => { const pick = mvpPool[rand(mvpPool.length)].id; onChange(Object.fromEntries(Object.entries(rows).map(([id, r]) => [id, { ...r, mvp: id === pick }]))); }}>
          Sortear MVP</button>
      </div>
      <div className="scroll"><table className="positions">
        <thead><tr><th>#</th><th className="l">Jugador</th>{COUNTS.map(k => <th key={k} title={SPP_LABEL[k][1]}>{SPP_LABEL[k][0]}</th>)}<th title={SPP_LABEL.mvp[1]}>MVP</th></tr></thead>
        <tbody>{players.map(p => (
          <tr key={p.id}>
            <td>{p.num}</td><td className="l">{p.name}<small className="note" style={{ display: 'block' }}>{p.pos}</small></td>
            {COUNTS.map(k => <td key={k}><input type="number" min={0} aria-label={`${SPP_LABEL[k][1]} de ${p.name}`} style={{ width: 48 }}
              value={rows[p.id][k]} onChange={e => set(p.id, { [k]: Math.max(0, parseInt(e.target.value, 10) || 0) })} /></td>)}
            <td><input type="radio" name={`mvp-${teamId}`} aria-label={`MVP: ${p.name}`} checked={rows[p.id].mvp}
              onChange={() => onChange(Object.fromEntries(Object.entries(rows).map(([id, r]) => [id, { ...r, mvp: id === p.id }])))} /></td>
          </tr>))}
        </tbody></table></div>
      {(sum('td') !== td || sum('cas') > cas) && <p className="note" style={{ color: 'var(--draw)' }}>
        {sum('td') !== td && `Los touchdowns de los jugadores (${sum('td')}) no cuadran con el marcador (${td}). `}
        {sum('cas') > cas && `Hay más lesiones apuntadas a jugadores (${sum('cas')}) que en el acta (${cas}).`}</p>}
    </div>
  );
}

/** Contratar incentivos para un partido con el dinero de bolsillo y la tesorería, según BB2025. */
export function InducementsDialog({ match, teamId, onClose }: { match: Match; teamId: string; onClose: () => void }) {
  const { db, repo, run } = useStore();
  const t = db.teams.find(x => x.id === teamId)!;
  const oppId = match.home === teamId ? match.away! : match.home;
  const opp = db.teams.find(x => x.id === oppId)!;
  const saved = db.inducements.find(x => x.match_id === match.id && x.team_id === teamId);
  const oppSaved = db.inducements.find(x => x.match_id === match.id && x.team_id === oppId);
  const [pick, setPick] = useState<InducementPick>(saved?.pick ?? emptyPick());
  const mine = currentTeamValue(t, db), theirs = currentTeamValue(opp, db);
  const underdog = mine < theirs;
  const petty = underdog ? theirs - mine + (oppSaved?.treasury_spent ?? 0) : 0;
  const prevSpent = saved?.treasury_spent ?? 0;
  const treasury = t.treasury + prevSpent; // lo que habría sin la compra anterior
  const list = inducementsFor(t.race, t.apothecary);
  const total = pickCost(pick, t.race, t.apothecary);
  const fromTreasury = Math.max(0, total - petty);
  const treasuryCap = underdog ? Math.min(UNDERDOG_TREASURY, treasury) : treasury;
  const stars = pick.hires.filter(h => h.kind === 'star').length, mercs = pick.hires.filter(h => h.kind === 'merc').length;
  const error = fromTreasury > treasuryCap ? (underdog
    ? `Te pasas: tienes ${fmtK(petty)} de dinero de bolsillo y puedes añadir como mucho ${fmtK(treasuryCap)} de tu tesorería.`
    : `No tienes tesorería suficiente (${fmtK(treasury)}).`) : '';
  const setItem = (id: string, n: number) => setPick(p => ({ ...p, items: { ...p.items, [id]: n } }));
  const setHire = (i: number, patch: Partial<InducementPick['hires'][number]>) => setPick(p => ({ ...p, hires: p.hires.map((h, j) => (j === i ? { ...h, ...patch } : h)) }));

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()} onKeyDown={e => e.key === 'Escape' && onClose()}>
      <form className="dialog" style={{ width: 'min(720px,100%)' }} onSubmit={async e => {
        e.preventDefault();
        if (error) return;
        if (await run(async () => {
          await repo.saveInducements(match.id, teamId, pick, fromTreasury);
          if (fromTreasury !== prevSpent) await repo.updateTeam(teamId, { treasury: treasury - fromTreasury });
        }, 'Incentivos guardados')) onClose();
      }}>
        <div><div className="eyebrow">{t.name} contra {opp.name}</div><h2>Incentivos</h2></div>
        <div className="meta">
          <span>Tu VEA <b>{fmtK(mine)}</b></span><span>VEA rival <b>{fmtK(theirs)}</b></span>
          <span>Dinero de bolsillo <b>{fmtK(petty)}</b></span><span>Tesorería <b>{fmtK(treasury)}</b></span>
        </div>
        <p className="note">{underdog
          ? `Como tu equipo vale menos, recibes la diferencia de VEA${oppSaved?.treasury_spent ? ' más lo que el rival ha gastado de su tesorería' : ''} como dinero de bolsillo, y puedes añadir hasta ${fmtK(UNDERDOG_TREASURY)} de tu tesorería. Lo que no gastes se pierde.`
          : 'Como tu equipo no vale menos que el rival, no recibes dinero de bolsillo: todo sale de tu tesorería, y lo que gastes se suma al dinero de bolsillo del rival. Guarda antes que tu rival para que lo vea.'}</p>

        <div className="scroll"><table className="positions">
          <thead><tr><th>Cant.</th><th className="l">Incentivo</th><th>Máx.</th><th>Coste</th><th className="l">Qué hace</th></tr></thead>
          <tbody>{list.map(i => (
            <tr key={i.id}>
              <td><input type="number" min={0} max={i.max} style={{ width: 52 }} aria-label={i.name} value={pick.items[i.id] ?? 0}
                onChange={e => setItem(i.id, Math.max(0, Math.min(i.max, parseInt(e.target.value, 10) || 0)))} /></td>
              <td className="l"><b>{i.name}</b></td><td>{i.max}</td><td>{fmtK(i.cost)}</td><td className="l skills">{i.desc}</td>
            </tr>))}
          </tbody></table></div>

        <div style={{ display: 'grid', gap: 8 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <b>Jugadores estrella y mercenarios</b>
            <div className="row">
              <button type="button" className="btn small" disabled={stars >= MAX_STARS} onClick={() => setPick(p => ({ ...p, hires: [...p.hires, { kind: 'star', name: '', cost: 0 }] }))}>+ Estrella</button>
              <button type="button" className="btn small" disabled={mercs >= MAX_MERCS} onClick={() => setPick(p => ({ ...p, hires: [...p.hires, { kind: 'merc', name: '', cost: MERC_FEE }] }))}>+ Mercenario</button>
            </div>
          </div>
          {pick.hires.map((h, i) => (
            <div className="row" key={i}>
              <span className="tag">{h.kind === 'star' ? 'Estrella' : 'Mercenario'}</span>
              <input type="text" placeholder={h.kind === 'star' ? 'Nombre del jugador estrella' : 'Posición contratada'} value={h.name} onChange={e => setHire(i, { name: e.target.value })} />
              <label className="row">Coste (k)<input type="number" min={0} style={{ width: 80 }} value={h.cost} onChange={e => setHire(i, { cost: Math.max(0, parseInt(e.target.value, 10) || 0) })} /></label>
              <button type="button" className="btn small danger" onClick={() => setPick(p => ({ ...p, hires: p.hires.filter((_, j) => j !== i) }))}>Quitar</button>
            </div>))}
          <p className="note">Hasta {MAX_STARS} estrellas (coste de su ficha) y {MAX_MERCS} mercenarios: coste de la posición de tu plantilla + {MERC_FEE}k, y +{MERC_SKILL}k si le das una habilidad primaria.</p>
        </div>

        <div className="meta"><span>Total <b>{fmtK(total)}</b></span><span>De bolsillo <b>{fmtK(Math.min(total, petty))}</b></span><span>De tesorería <b>{fmtK(fromTreasury)}</b></span></div>
        {error && <p className="note" style={{ color: 'var(--loss)' }}>{error}</p>}
        <div className="row"><button className="btn primary" type="submit" disabled={!!error}>Guardar incentivos</button><button className="btn" type="button" onClick={onClose}>Cancelar</button></div>
      </form>
    </div>
  );
}
