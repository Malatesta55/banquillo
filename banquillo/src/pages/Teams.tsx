import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../lib/store';
import { compView, fmtK, injuriesOf, sppOf, standings, teamValue } from '../lib/logic';
import { RACES, STATUS_LABEL } from '../lib/races';
import { APOTHECARY_COST, fmtTarget, positionOf, rerollCost, rosterOf, START_BUDGET } from '../lib/rosters';
import type { Player, PlayerStatus, Team } from '../lib/types';
import { ConfirmButton, Crest, Empty, NumInput, TextInput, useCoach } from '../components/ui';
import { RosterFacts, RosterTable } from '../components/RosterTable';
import { AdvanceDialog } from '../components/AdvanceDialog';
import { currentProfile, LEVELS } from '../lib/bb2025';

const MAX_PLAYERS = 16, MIN_PLAYERS = 11;

function NewTeamForm() {
  const { repo, run } = useStore();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [race, setRace] = useState(RACES[0]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [rerolls, setRerolls] = useState(0);
  const [apo, setApo] = useState(false);
  const roster = rosterOf(race)!;
  const hired = roster.positions.flatMap(p => Array<typeof p>(qty[p.name] ?? 0).fill(p));
  const spent = hired.reduce((a, p) => a + p.cost, 0) + rerolls * roster.reroll + (apo && roster.apothecary ? APOTHECARY_COST : 0);
  const left = START_BUDGET - spent;
  const error = left < 0 ? `Te pasas del presupuesto en ${fmtK(-left)}.`
    : hired.length > MAX_PLAYERS ? `Máximo ${MAX_PLAYERS} jugadores.` : '';
  return (
    <form className="card" onSubmit={async e => {
      e.preventDefault();
      if (error) return;
      let id = '';
      const ok = await run(async () => {
        id = await repo.createTeam({ name: name.trim(), race, hue: Math.floor(Math.random() * 360) });
        await repo.updateTeam(id, { treasury: left, rerolls, apothecary: apo && roster.apothecary });
        for (const [i, p] of hired.entries()) {
          await repo.addPlayer({ team_id: id, num: i + 1, name: `Jugador ${i + 1}`, pos: p.name, value: p.cost, spp: 0, status: 'ok' });
        }
      }, 'Equipo registrado');
      if (ok) nav(`/equipo/${id}`);
    }}>
      <h3>Registrar un equipo</h3>
      <div className="fields">
        <label>Nombre<input type="text" id="nt-name" required value={name} onChange={e => setName(e.target.value)} placeholder="Gárgolas de Roca Negra" /></label>
        <label>Raza<select id="nt-race" value={race} onChange={e => { setRace(e.target.value); setQty({}); setApo(false); }}>{RACES.map(r => <option key={r}>{r}</option>)}</select></label>
        <label>Segundas oportunidades ({fmtK(roster.reroll)})<input type="number" id="nt-rr" min={0} max={8} value={rerolls} onChange={e => setRerolls(Math.max(0, Math.min(8, parseInt(e.target.value, 10) || 0)))} /></label>
        <label className="check" style={{ alignSelf: 'end' }}><input type="checkbox" id="nt-apo" checked={apo && roster.apothecary} disabled={!roster.apothecary} onChange={e => setApo(e.target.checked)} />Boticario {roster.apothecary ? `(${fmtK(APOTHECARY_COST)})` : '(no disponible)'}</label>
      </div>
      <RosterFacts roster={roster} />
      <RosterTable roster={roster} qty={qty} onQty={(p, n) => setQty(q => ({ ...q, [p.name]: n }))} />
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="meta">
          <span>Jugadores <b>{hired.length}</b>/{MAX_PLAYERS}</span>
          <span>Gastado <b>{fmtK(spent)}</b> de {fmtK(START_BUDGET)}</span>
          <span>Tesorería inicial <b>{fmtK(left)}</b></span>
        </span>
        <button className="btn primary" type="submit" disabled={!!error}>Añadir equipo</button>
      </div>
      {error ? <p className="note" style={{ color: 'var(--loss)' }}>{error}</p>
        : hired.length < MIN_PLAYERS && <p className="note">Para jugar necesitas al menos {MIN_PLAYERS} jugadores. Puedes ficharlos ahora o más tarde.</p>}
    </form>
  );
}

function TeamCard({ t }: { t: Team }) {
  const { db, me } = useStore();
  const coach = useCoach();
  return (
    <Link to={`/equipo/${t.id}`} className="card click" style={{ color: 'inherit', textDecoration: 'none' }}>
      <div className="team-line"><Crest team={t} lg /><span className="nm"><b style={{ fontSize: 16 }}>{t.name}</b><small>{t.race}</small></span></div>
      <div className="meta">
        <span>Entrenador <b>{coach(t.owner)}</b>{t.owner === me?.id && <> <span className="tag mine">Tuyo</span></>}</span>
        <span>VE <b>{fmtK(teamValue(t, db))}</b></span>
        <span><b>{db.players.filter(p => p.team_id === t.id && p.status !== 'dead').length}</b> jugadores</span>
      </div>
    </Link>
  );
}

export function Teams() {
  const { db, me } = useStore();
  const mine = db.teams.filter(t => t.owner === me?.id);
  const others = db.teams.filter(t => t.owner !== me?.id);
  return (
    <>
      <section className="head"><div><div className="eyebrow">Franquicias</div><h1>Equipos</h1><p>Cada entrenador gestiona su propia plantilla. Los demás pueden verla pero no tocarla.</p></div></section>
      {me ? <NewTeamForm />
        : <div className="banner"><Link to="/entrar">Entra con tu cuenta</Link> para registrar tus equipos.</div>}
      {me && <section style={{ display: 'grid', gap: 12 }}><h2>Tus equipos</h2>
        {mine.length ? <div className="grid">{mine.map(t => <TeamCard key={t.id} t={t} />)}</div> : <Empty>Aún no tienes equipos.</Empty>}</section>}
      <section style={{ display: 'grid', gap: 12 }}><h2>{me ? 'Resto de equipos' : 'Todos los equipos'}</h2>
        {others.length ? <div className="grid">{others.map(t => <TeamCard key={t.id} t={t} />)}</div> : <Empty>No hay más equipos.</Empty>}</section>
    </>
  );
}

export function TeamPage() {
  const { id = '' } = useParams();
  const { db, me, repo, run, loading } = useStore();
  const [adv, setAdv] = useState<Player | null>(null);
  const coach = useCoach();
  const nav = useNavigate();
  const t = db.teams.find(x => x.id === id);
  if (!t) return loading ? null : <Empty>Este equipo no existe o se ha eliminado. <Link to="/equipos">Ver equipos</Link></Empty>;
  const mine = t.owner === me?.id;
  const players = db.players.filter(p => p.team_id === t.id).sort((a, b) => a.num - b.num);
  const upT = (patch: Partial<Team>) => run(() => repo.updateTeam(t.id, patch));
  const upP = (p: Player, patch: Partial<Player>) => run(() => repo.updatePlayer(p.id, patch));
  const comps = db.competitions.filter(c => db.entries.some(e => e.competition_id === c.id && e.team_id === t.id));
  const roster = rosterOf(t.race);
  const alive = players.filter(p => p.status !== 'dead');
  const taken: Record<string, number> = {};
  alive.forEach(p => { taken[p.pos] = (taken[p.pos] ?? 0) + 1; });

  return (
    <>
      <section className="head">
        <div className="team-line" style={{ gap: 14 }}><Crest team={t} lg /><div><div className="eyebrow">{t.race} · Entrenador {coach(t.owner)}{mine ? ' (tú)' : ''}</div><h1>{t.name}</h1></div></div>
        <Link className="btn" to="/equipos">Todos los equipos</Link>
      </section>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}><h3>Datos del equipo</h3><span className="meta"><span>Valor de equipo <b>{fmtK(teamValue(t, db))}</b></span></span></div>
        <div className="fields">
          <label>Nombre<TextInput id="t-name" value={t.name} disabled={!mine} onCommit={name => upT({ name })} /></label>
          <label>Raza<select id="t-race" value={t.race} disabled={!mine || players.length > 0} title={players.length ? 'Para cambiar de raza, quita antes a los jugadores' : undefined} onChange={e => upT({ race: e.target.value })}>{RACES.map(r => <option key={r}>{r}</option>)}</select></label>
          <label>Tesorería (k)<NumInput id="t-tre" value={t.treasury} disabled={!mine} onCommit={treasury => upT({ treasury })} /></label>
          <label>Segundas oportunidades<NumInput id="t-rr" min={0} value={t.rerolls} disabled={!mine} onCommit={rerolls => upT({ rerolls })} /></label>
          <label>Hinchas fieles<NumInput id="t-fans" min={0} value={t.fans} disabled={!mine} onCommit={fans => upT({ fans })} /></label>
          <label className="check" style={{ alignSelf: 'end' }}><input type="checkbox" id="t-apo" checked={t.apothecary} disabled={!mine || (!t.apothecary && roster?.apothecary === false)} onChange={e => upT({ apothecary: e.target.checked })} />Boticario{roster?.apothecary === false && ' (no disponible)'}</label>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}><h2>Plantilla</h2>
          <span className="note">{alive.length} disponibles · VE = jugadores vivos + {rerollCost(t.race)}k por segunda oportunidad + boticario</span></div>
        <div className="scroll"><table className="roster">
          <thead><tr><th>#</th><th className="l">Nombre</th><th className="l">Posición</th><th>MA</th><th>ST</th><th>AG</th><th>PA</th><th>AV</th><th className="l">Habilidades</th><th>PE</th><th>Valor (k)</th><th className="l">Estado</th>{mine && <th />}</tr></thead>
          <tbody>
            {players.map(p => (
              <tr key={p.id} className={`st-${p.status}`}>
                <td><NumInput id={`p-${p.id}-num`} style={{ width: 52 }} value={p.num} disabled={!mine} onCommit={num => upP(p, { num })} /></td>
                <td className="l"><TextInput id={`p-${p.id}-name`} style={{ minWidth: 170 }} value={p.name} disabled={!mine} onCommit={name => upP(p, { name })} /></td>
                <td className="l">{roster
                  ? <select id={`p-${p.id}-pos`} style={{ minWidth: 170 }} value={p.pos} disabled={!mine} onChange={e => upP(p, { pos: e.target.value })}>
                      {!positionOf(t.race, p.pos) && <option>{p.pos}</option>}
                      {roster.positions.map(x => <option key={x.name}>{x.name}</option>)}</select>
                  : <TextInput id={`p-${p.id}-pos`} style={{ minWidth: 110 }} value={p.pos} disabled={!mine} onCommit={pos => upP(p, { pos })} />}</td>
                <PosStats race={t.race} player={p} />
                <td title={`Ganados ${sppOf(p, db).earned} · gastados ${sppOf(p, db).spent}`}><b>{sppOf(p, db).available}</b>{p.advances.length > 0 && <small className="note" style={{ display: 'block' }}>{LEVELS[p.advances.length]}</small>}</td>
                <td><NumInput id={`p-${p.id}-val`} style={{ width: 70 }} value={p.value} disabled={!mine} onCommit={value => upP(p, { value })} /></td>
                <td className="l"><select id={`p-${p.id}-st`} value={p.status} disabled={!mine} onChange={e => upP(p, { status: e.target.value as PlayerStatus })}>
                  {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></td>
                {mine && <td><div className="row" style={{ flexWrap: 'nowrap' }}><button className="btn small" onClick={() => setAdv(p)}>Mejorar</button><button className="btn small danger" onClick={() => run(() => repo.deletePlayer(p.id))}>Quitar</button></div></td>}
              </tr>))}
            {!players.length && <tr><td colSpan={13} className="note">Sin jugadores todavía.</td></tr>}
          </tbody>
        </table></div>
        {mine && <HireForm team={t} players={players} taken={taken} />}
        {roster && <div className="card"><h3>Posiciones de {t.race} (BB2025)</h3><RosterFacts roster={roster} /><RosterTable roster={roster} taken={taken} /></div>}
      </div>
      {adv && <AdvanceDialog team={t} player={db.players.find(x => x.id === adv.id) ?? adv} onClose={() => setAdv(null)} />}
      <div className="card"><h3>Trayectoria</h3>
        {comps.length ? <div className="scroll" style={{ border: 0 }}><table>
          <thead><tr><th className="l">Competición</th><th>Pos.</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>TD</th><th>CAS</th><th>Pts</th></tr></thead>
          <tbody>{comps.map(c => {
            const v = compView(db, c.id)!;
            const st = standings(c, v.teamIds, v.matches, db.teams);
            const i = st.findIndex(r => r.id === t.id); const r = st[i];
            return <tr key={c.id}><td className="l"><Link className="link" to={`/c/${c.id}`}>{c.name}</Link></td><td>{i + 1}º</td><td>{r.pj}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td><td>{r.tdf}:{r.tda}</td><td>{r.casf}:{r.casa}</td><td className="pts">{r.pts}</td></tr>;
          })}</tbody></table></div> : <p className="note">Este equipo no participa en ninguna competición.</p>}
      </div>
      {mine && <div className="row"><ConfirmButton label="Eliminar equipo" confirm="Pulsa otra vez para eliminarlo"
        onConfirm={async () => { if (await run(() => repo.deleteTeam(t.id), 'Equipo eliminado')) nav('/equipos'); }} /></div>}
    </>
  );
}

function PosStats({ race, player }: { race: string; player: Player }) {
  const { db } = useStore();
  const inj = injuriesOf(player.id, db);
  const x = currentProfile(positionOf(race, player.pos), player.advances, inj.lasting);
  const gained = new Set(player.advances.map(a => a.skill));
  if (!x) return <><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td className="l note">—</td></>;
  return <><td>{x.ma}</td><td>{x.st}</td><td>{fmtTarget(x.ag)}</td><td>{fmtTarget(x.pa)}</td><td>{fmtTarget(x.av)}</td>
    <td className="l skills">{x.skills.length ? x.skills.map((s, i) => <span key={s}>{i > 0 && ', '}{gained.has(s) ? <b style={{ color: 'var(--accent)' }}>{s}</b> : s}</span>) : '—'}
      {(inj.lasting.length > 0 || inj.niggling > 0) && <span style={{ color: 'var(--loss)', display: 'block' }}>
        {inj.lasting.map(s => `−1 ${s}`).join(', ')}{inj.lasting.length > 0 && inj.niggling > 0 && ' · '}{inj.niggling > 0 && `Lesión persistente${inj.niggling > 1 ? ` ×${inj.niggling}` : ''}`}</span>}</td></>;
}

function HireForm({ team: t, players, taken }: { team: Team; players: Player[]; taken: Record<string, number> }) {
  const { repo, run } = useStore();
  const roster = rosterOf(t.race);
  const free = (name: string) => (positionOf(t.race, name)?.max ?? 99) - (taken[name] ?? 0);
  const [pos, setPos] = useState(roster?.positions[0].name ?? 'Línea');
  const [custom, setCustom] = useState(50);
  const [name, setName] = useState('');
  const def = positionOf(t.race, pos);
  const cost = def ? def.cost : custom;
  const full = players.filter(p => p.status !== 'dead').length >= MAX_PLAYERS;
  const error = full ? `La plantilla ya tiene ${MAX_PLAYERS} jugadores.`
    : def && free(pos) <= 0 ? `Ya tienes el máximo de ${pos} (${def.max}).`
    : cost > t.treasury ? `No hay tesorería suficiente: cuesta ${fmtK(cost)} y tienes ${fmtK(t.treasury)}.` : '';
  return (
    <form className="card" onSubmit={async e => {
      e.preventDefault();
      if (error) return;
      const num = Math.max(0, ...players.map(p => p.num)) + 1;
      if (await run(async () => {
        await repo.addPlayer({ team_id: t.id, num, name: name.trim() || `Jugador ${num}`, pos, value: cost, spp: 0, status: 'ok' });
        await repo.updateTeam(t.id, { treasury: t.treasury - cost });
      }, 'Jugador fichado')) setName('');
    }}>
      <div className="fields">
        <label>Nombre<input type="text" id="np-name" value={name} onChange={e => setName(e.target.value)} placeholder="Nuevo jugador" /></label>
        <label>Posición{roster
          ? <select id="np-pos" value={pos} onChange={e => setPos(e.target.value)}>
              {roster.positions.map(x => <option key={x.name} value={x.name} disabled={free(x.name) <= 0}>{x.name} · {fmtK(x.cost)} ({free(x.name)} libres)</option>)}</select>
          : <input type="text" id="np-pos" value={pos} onChange={e => setPos(e.target.value)} />}</label>
        {!def && <label>Valor (k)<input type="number" id="np-val" value={custom} onChange={e => setCustom(parseInt(e.target.value, 10) || 0)} /></label>}
        <label style={{ alignSelf: 'end' }}><button className="btn primary" type="submit" disabled={!!error}>Fichar por {fmtK(cost)}</button></label>
      </div>
      {error && <p className="note" style={{ color: 'var(--loss)' }}>{error}</p>}
    </form>
  );
}
