import { useState } from 'react';
import { useStore } from '../lib/store';
import { currentTeamValue, fmtK } from '../lib/logic';
import {
  emptyPick, fansAfter, inducementsFor, MAX_FANS, MAX_MERCS, MAX_STARS, MERC_FEE, MERC_SKILL, MISTAKE_LABEL, mistakeFor, mistakeLoss,
  pickCost, rand, sppLabel, UNDERDOG_TREASURY, winnings, type InducementPick, type Mistake, type SppKey,
  INJURY_HELP, INJURY_LABEL, injuryFromD16, isCasualty, lastingFromD6, type Injury, type Stat,
} from '../lib/bb2025';
import type { Match, MatchPlayer } from '../lib/types';
import { Crest } from './ui';

export type SppRow = Omit<MatchPlayer, 'match_id' | 'team_id'>;
const COUNTS: Exclude<SppKey, 'mvp'>[] = ['td', 'cas', 'cmp', 'inter', 'ttm'];
const INJURIES = Object.keys(INJURY_LABEL) as Injury[];
const STATS: Stat[] = ['MA', 'ST', 'AG', 'PA', 'AV'];
const blank = (player_id: string): SppRow => ({ player_id, td: 0, cas: 0, cmp: 0, inter: 0, ttm: 0, mvp: false, injury: 'none', injury_stat: null });

/** Estado inicial del acta de un equipo: los jugadores disponibles más los que ya tienen algo apuntado. */
export function initialSpp(matchId: string, teamId: string, db: ReturnType<typeof useStore>['db']): Record<string, SppRow> {
  const out: Record<string, SppRow> = {};
  db.players.filter(p => p.team_id === teamId && p.status === 'ok').forEach(p => (out[p.id] = blank(p.id)));
  db.match_players.filter(x => x.match_id === matchId && x.team_id === teamId).forEach(x => (out[x.player_id] = { ...blank(x.player_id), ...x }));
  return out;
}
export const sppRowsToSave = (rows: Record<string, SppRow>) =>
  Object.values(rows).filter(r => r.mvp || r.injury !== 'none' || COUNTS.some(k => r[k] > 0))
    .map(({ player_id, td, cas, cmp, inter, ttm, mvp, injury, injury_stat }) =>
      ({ player_id, td, cas, cmp, inter, ttm, mvp, injury, injury_stat: injury === 'li' ? injury_stat : null }));
/** Bajas que sufrió un equipo según su acta: cuentan como lesiones causadas por el rival. */
export const casualtiesSuffered = (rows: Record<string, SppRow> | undefined) => Object.values(rows ?? {}).filter(r => isCasualty(r.injury)).length;

/** Acta de un equipo: lo que hizo cada jugador (PE) y la lesión que sufrió. */
export function SppEditor({ teamId, rows, onChange, td, cas }: {
  teamId: string; rows: Record<string, SppRow>; onChange: (r: Record<string, SppRow>) => void; td: number; cas: number;
}) {
  const { db } = useStore();
  const t = db.teams.find(x => x.id === teamId);
  const players = db.players.filter(p => rows[p.id]).sort((a, b) => a.num - b.num);
  const set = (id: string, patch: Partial<SppRow>) => onChange({ ...rows, [id]: { ...rows[id], ...patch } });
  const sum = (k: 'td' | 'cas') => Object.values(rows).reduce((a, r) => a + r[k], 0);
  const mvpPool = players.filter(p => p.status === 'ok' && rows[p.id].injury !== 'dead');
  const L = (k: SppKey) => sppLabel(t?.race ?? '', k);
  const rollInjury = (id: string) => {
    const injury = injuryFromD16(rand(16) + 1);
    set(id, { injury, injury_stat: injury === 'li' ? lastingFromD6(rand(6) + 1) : null });
  };
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="team-line"><Crest team={t} /><span className="nm"><b>{t?.name}</b>
          <small>PE: TD {L('td')[1].match(/\d+/)} · CAS {L('cas')[1].match(/\d+/)} · pase 1 · intercepción 2 · lanzar compañero 1 · MVP 4</small></span></div>
        <button type="button" className="btn small" disabled={!mvpPool.length} title="Elige al azar el MVP entre los jugadores disponibles"
          onClick={() => { const pick = mvpPool[rand(mvpPool.length)].id; onChange(Object.fromEntries(Object.entries(rows).map(([id, r]) => [id, { ...r, mvp: id === pick }]))); }}>
          Sortear MVP</button>
      </div>
      <div className="scroll"><table className="positions">
        <thead><tr><th>#</th><th className="l">Jugador</th>{COUNTS.map(k => <th key={k} title={L(k)[1]}>{L(k)[0]}</th>)}<th title={L('mvp')[1]}>MVP</th>
          <th className="l" title="Lesión que sufrió este jugador en el partido">Lesión sufrida</th></tr></thead>
        <tbody>{players.map(p => {
          const r = rows[p.id];
          return (
            <tr key={p.id} className={r.injury === 'dead' ? 'st-dead' : r.injury !== 'none' ? 'st-mng' : ''}>
              <td>{p.num}</td><td className="l">{p.name}<small className="note" style={{ display: 'block' }}>{p.pos}</small></td>
              {COUNTS.map(k => <td key={k}><input type="number" min={0} aria-label={`${L(k)[1]} de ${p.name}`} style={{ width: 48 }}
                value={r[k]} onChange={e => set(p.id, { [k]: Math.max(0, parseInt(e.target.value, 10) || 0) })} /></td>)}
              <td><input type="radio" name={`mvp-${teamId}`} aria-label={`MVP: ${p.name}`} checked={r.mvp}
                onChange={() => onChange(Object.fromEntries(Object.entries(rows).map(([id, x]) => [id, { ...x, mvp: id === p.id }])))} /></td>
              <td className="l"><div className="row" style={{ flexWrap: 'nowrap', gap: 4 }}>
                <select aria-label={`Lesión sufrida por ${p.name}`} value={r.injury} title={INJURY_HELP[r.injury]}
                  onChange={e => { const injury = e.target.value as Injury; set(p.id, { injury, injury_stat: injury === 'li' ? (r.injury_stat ?? 'AV') : null }); }}>
                  {INJURIES.map(i => <option key={i} value={i} title={INJURY_HELP[i]}>{INJURY_LABEL[i]}</option>)}</select>
                {r.injury === 'li' && <select aria-label={`Característica que pierde ${p.name}`} value={r.injury_stat ?? 'AV'} onChange={e => set(p.id, { injury_stat: e.target.value as Stat })}>
                  {STATS.map(x => <option key={x} value={x}>−1 {x}</option>)}</select>}
                <button type="button" className="btn small" title="Tirar en la tabla de lesiones (D16, y D6 si es permanente)" onClick={() => rollInjury(p.id)}>D16</button>
              </div></td>
            </tr>);
        })}
        </tbody></table></div>
      {(sum('td') !== td || sum('cas') > cas) && <p className="note" style={{ color: 'var(--draw)' }}>
        {sum('td') !== td && `Los touchdowns de los jugadores (${sum('td')}) no cuadran con el marcador (${td}). `}
        {sum('cas') > cas && `Hay más lesiones causadas apuntadas a jugadores (${sum('cas')}) que en el marcador (${cas}).`}</p>}
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

/** Secuencia de después del partido de un equipo: ganancias, hinchas fieles y errores caros. */
export function PostgameDialog({ match, teamId, onClose }: { match: Match; teamId: string; onClose: () => void }) {
  const { db, repo, run } = useStore();
  const t = db.teams.find(x => x.id === teamId)!;
  const home = match.home === teamId;
  const oppId = home ? match.away! : match.home;
  const opp = db.teams.find(x => x.id === oppId)!;
  const saved = db.postgame.find(x => x.match_id === match.id && x.team_id === teamId);
  const oppSaved = db.postgame.find(x => x.match_id === match.id && x.team_id === oppId);
  const myTd = home ? match.td_home : match.td_away, theirTd = home ? match.td_away : match.td_home;
  const outcome: 'W' | 'D' | 'L' = myTd > theirTd ? 'W' : myTd < theirTd ? 'L' : 'D';
  // Partimos de cómo estaba el equipo antes de este cierre, para poder corregirlo sin aplicarlo dos veces.
  const fans0 = saved?.fans_before ?? t.fans;
  const treasury0 = t.treasury - (saved ? saved.winnings - saved.mistake_loss : 0);
  const [ff, setFf] = useState(saved?.fan_factor ?? 0);
  const [oppFf, setOppFf] = useState(oppSaved?.fan_factor ?? 0);
  const [noStall, setNoStall] = useState(saved?.no_stalling ?? true);
  const [fanRoll, setFanRoll] = useState<number | null>(null);
  const [mRoll, setMRoll] = useState<number | null>(null);
  const [extra, setExtra] = useState<number | null>(null);
  const attendance = ff + oppFf;
  const win = winnings(attendance, myTd, noStall);
  const fans1 = outcome === 'D' ? fans0 : fanRoll === null ? null : fansAfter(fans0, outcome, fanRoll);
  const pot = treasury0 + win;
  const mistake: Mistake = pot < 100 ? 'none' : mRoll === null ? 'none' : mistakeFor(pot, mRoll);
  const needsExtra = mistake === 'minor' || mistake === 'catastrophe';
  const loss = needsExtra && extra === null ? 0 : mistakeLoss(mistake, pot, extra ?? 0);
  const missing = !ff ? 'Tira o escribe tu factor de hinchas.' : !oppFf ? 'Falta el factor de hinchas del rival.'
    : fans1 === null ? 'Tira el D6 de hinchas fieles.' : pot >= 100 && mRoll === null ? 'Tira el D6 de errores caros.'
    : needsExtra && extra === null ? `Tira el ${mistake === 'minor' ? 'D3' : '2D6'} del error caro.` : '';
  const roll = (n: number) => rand(n) + 1;

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()} onKeyDown={e => e.key === 'Escape' && onClose()}>
      <form className="dialog" style={{ width: 'min(640px,100%)' }} onSubmit={async e => {
        e.preventDefault();
        if (missing || fans1 === null) return;
        if (await run(async () => {
          await repo.savePostgame({ match_id: match.id, team_id: teamId, fan_factor: ff, no_stalling: noStall, winnings: win, fans_before: fans0, fans_after: fans1, mistake, mistake_loss: loss });
          await repo.updateTeam(teamId, { treasury: pot - loss, fans: fans1 });
        }, 'Partido cerrado')) onClose();
      }}>
        <div><div className="eyebrow">{t.name} {myTd}–{theirTd} {opp.name} · {{ W: 'Victoria', D: 'Empate', L: 'Derrota' }[outcome]}</div><h2>Después del partido</h2></div>
        {saved && <p className="note">Ya cerraste este partido. Si lo vuelves a guardar, se deshace lo anterior y se aplica lo nuevo.</p>}

        <div style={{ display: 'grid', gap: 8 }}>
          <b>1. Ganancias</b>
          <div className="fields">
            <label>Tu factor de hinchas (D3 + {fans0})<div className="row"><input type="number" min={0} style={{ width: 70 }} value={ff} onChange={e => setFf(Math.max(0, parseInt(e.target.value, 10) || 0))} />
              <button type="button" className="btn small" onClick={() => setFf(roll(3) + fans0)}>Tirar</button></div></label>
            <label>Del rival{oppSaved ? ' (lo apuntó su entrenador)' : ` (D3 + ${opp.fans})`}<div className="row"><input type="number" min={0} style={{ width: 70 }} value={oppFf} disabled={!!oppSaved} onChange={e => setOppFf(Math.max(0, parseInt(e.target.value, 10) || 0))} />
              {!oppSaved && <button type="button" className="btn small" onClick={() => setOppFf(roll(3) + opp.fans)}>Tirar</button>}</div></label>
            <label className="check" style={{ alignSelf: 'end' }}><input type="checkbox" checked={noStall} onChange={e => setNoStall(e.target.checked)} />Nadie de mi equipo hizo stalling</label>
          </div>
          <p className="note">Asistencia {attendance} · ({attendance} / 2 + {myTd} TD{noStall ? ' + 1' : ''}) × 10k = <b>{fmtK(win)}</b></p>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <b>2. Hinchas fieles ({fans0})</b>
          {outcome === 'D' ? <p className="note">Con empate no cambian.</p> : <div className="row">
            <button type="button" className="btn small" disabled={fanRoll !== null} onClick={() => setFanRoll(roll(6))}>{fanRoll === null ? 'Tirar D6' : `D6: ${fanRoll}`}</button>
            <span className="note">{outcome === 'W' ? `Has ganado: suben 1 si sacas ${fans0} o más (máximo ${MAX_FANS}).` : `Has perdido: bajan 1 si sacas menos de ${fans0} (mínimo 1).`}
              {fans1 !== null && <> Quedan en <b>{fans1}</b>.</>}</span>
          </div>}
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <b>3. Errores caros</b>
          <p className="note">Tesorería con las ganancias: <b>{fmtK(pot)}</b>.{pot >= 100 ? ' Con 100k o más hay que tirar un D6.' : ' Por debajo de 100k no se tira.'}</p>
          {pot >= 100 && <div className="row">
            <button type="button" className="btn small" disabled={mRoll !== null} onClick={() => setMRoll(roll(6))}>{mRoll === null ? 'Tirar D6' : `D6: ${mRoll}`}</button>
            {mRoll !== null && <span className="note">{MISTAKE_LABEL[mistake]}</span>}
            {needsExtra && <button type="button" className="btn small" disabled={extra !== null}
              onClick={() => setExtra(mistake === 'minor' ? roll(3) : roll(6) + roll(6))}>{extra === null ? `Tirar ${mistake === 'minor' ? 'D3' : '2D6'}` : `${mistake === 'minor' ? 'D3' : '2D6'}: ${extra}`}</button>}
          </div>}
        </div>

        <div className="meta"><span>Ganancias <b>+{fmtK(win)}</b></span><span>Errores caros <b>−{fmtK(loss)}</b></span>
          <span>Tesorería final <b>{fmtK(pot - loss)}</b></span><span>Hinchas fieles <b>{fans1 ?? fans0}</b></span></div>
        {missing && <p className="note">{missing}</p>}
        <div className="row"><button className="btn primary" type="submit" disabled={!!missing}>Aplicar al equipo</button><button className="btn" type="button" onClick={onClose}>Cancelar</button></div>
      </form>
    </div>
  );
}
