import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../lib/store';
import { compView, fmtK, standings, teamValue } from '../lib/logic';
import { RACES, REROLL_COST, STATUS_LABEL } from '../lib/races';
import type { Player, PlayerStatus, Team } from '../lib/types';
import { ConfirmButton, Crest, Empty, NumInput, TextInput, useCoach } from '../components/ui';

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
  const { db, me, repo, run } = useStore();
  const nav = useNavigate();
  const mine = db.teams.filter(t => t.owner === me?.id);
  const others = db.teams.filter(t => t.owner !== me?.id);
  return (
    <>
      <section className="head"><div><div className="eyebrow">Franquicias</div><h1>Equipos</h1><p>Cada entrenador gestiona su propia plantilla. Los demás pueden verla pero no tocarla.</p></div></section>
      {me ? (
        <form className="card" onSubmit={async e => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          let id = '';
          if (await run(async () => { id = await repo.createTeam({ name: String(fd.get('name')).trim(), race: String(fd.get('race')), hue: Math.floor(Math.random() * 360) }); }, 'Equipo registrado')) nav(`/equipo/${id}`);
        }}>
          <h3>Registrar un equipo</h3>
          <div className="fields">
            <label>Nombre<input type="text" id="nt-name" name="name" required placeholder="Gárgolas de Roca Negra" /></label>
            <label>Raza<select id="nt-race" name="race">{RACES.map(r => <option key={r}>{r}</option>)}</select></label>
            <label style={{ alignSelf: 'end' }}><button className="btn primary" type="submit">Añadir equipo</button></label>
          </div>
        </form>
      ) : <div className="banner"><Link to="/entrar">Entra con tu cuenta</Link> para registrar tus equipos.</div>}
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
  const coach = useCoach();
  const nav = useNavigate();
  const t = db.teams.find(x => x.id === id);
  if (!t) return loading ? null : <Empty>Este equipo no existe o se ha eliminado. <Link to="/equipos">Ver equipos</Link></Empty>;
  const mine = t.owner === me?.id;
  const players = db.players.filter(p => p.team_id === t.id).sort((a, b) => a.num - b.num);
  const upT = (patch: Partial<Team>) => run(() => repo.updateTeam(t.id, patch));
  const upP = (p: Player, patch: Partial<Player>) => run(() => repo.updatePlayer(p.id, patch));
  const comps = db.competitions.filter(c => db.entries.some(e => e.competition_id === c.id && e.team_id === t.id));

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
          <label>Raza<select id="t-race" value={t.race} disabled={!mine} onChange={e => upT({ race: e.target.value })}>{RACES.map(r => <option key={r}>{r}</option>)}</select></label>
          <label>Tesorería (k)<NumInput id="t-tre" value={t.treasury} disabled={!mine} onCommit={treasury => upT({ treasury })} /></label>
          <label>Segundas oportunidades<NumInput id="t-rr" min={0} value={t.rerolls} disabled={!mine} onCommit={rerolls => upT({ rerolls })} /></label>
          <label>Factor de hinchas<NumInput id="t-fans" min={0} value={t.fans} disabled={!mine} onCommit={fans => upT({ fans })} /></label>
          <label className="check" style={{ alignSelf: 'end' }}><input type="checkbox" id="t-apo" checked={t.apothecary} disabled={!mine} onChange={e => upT({ apothecary: e.target.checked })} />Boticario</label>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}><h2>Plantilla</h2>
          <span className="note">{players.filter(p => p.status !== 'dead').length} disponibles · VE = jugadores vivos + {REROLL_COST}k por segunda oportunidad + boticario</span></div>
        <div className="scroll"><table className="roster">
          <thead><tr><th>#</th><th className="l">Nombre</th><th className="l">Posición</th><th>PE</th><th>Valor (k)</th><th className="l">Estado</th>{mine && <th />}</tr></thead>
          <tbody>
            {players.map(p => (
              <tr key={p.id} className={`st-${p.status}`}>
                <td><NumInput id={`p-${p.id}-num`} style={{ width: 52 }} value={p.num} disabled={!mine} onCommit={num => upP(p, { num })} /></td>
                <td className="l"><TextInput id={`p-${p.id}-name`} style={{ minWidth: 170 }} value={p.name} disabled={!mine} onCommit={name => upP(p, { name })} /></td>
                <td className="l"><TextInput id={`p-${p.id}-pos`} style={{ minWidth: 110 }} value={p.pos} disabled={!mine} onCommit={pos => upP(p, { pos })} /></td>
                <td><NumInput id={`p-${p.id}-spp`} style={{ width: 60 }} value={p.spp} disabled={!mine} onCommit={spp => upP(p, { spp })} /></td>
                <td><NumInput id={`p-${p.id}-val`} style={{ width: 70 }} value={p.value} disabled={!mine} onCommit={value => upP(p, { value })} /></td>
                <td className="l"><select id={`p-${p.id}-st`} value={p.status} disabled={!mine} onChange={e => upP(p, { status: e.target.value as PlayerStatus })}>
                  {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></td>
                {mine && <td><button className="btn small danger" onClick={() => run(() => repo.deletePlayer(p.id))}>Quitar</button></td>}
              </tr>))}
            {!players.length && <tr><td colSpan={7} className="note">Sin jugadores todavía.</td></tr>}
          </tbody>
        </table></div>
        {mine && (
          <form className="card" onSubmit={async e => {
            e.preventDefault();
            const f = e.currentTarget; const fd = new FormData(f);
            const num = Math.max(0, ...players.map(p => p.num)) + 1;
            if (await run(() => repo.addPlayer({ team_id: t.id, num, name: String(fd.get('name')).trim(), pos: String(fd.get('pos')).trim() || 'Línea', value: parseInt(String(fd.get('value')), 10) || 50, spp: 0, status: 'ok' }), 'Jugador fichado')) {
              (f.elements.namedItem('name') as HTMLInputElement).value = '';
            }
          }}>
            <div className="fields">
              <label>Nombre<input type="text" id="np-name" name="name" required placeholder="Nuevo jugador" /></label>
              <label>Posición<input type="text" id="np-pos" name="pos" defaultValue="Línea" /></label>
              <label>Valor (k)<input type="number" id="np-val" name="value" defaultValue={50} /></label>
              <label style={{ alignSelf: 'end' }}><button className="btn primary" type="submit">Fichar jugador</button></label>
            </div>
          </form>)}
      </div>
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
