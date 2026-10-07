import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../lib/store';
import { byRound, compView, progress, roundDone, roundRobin, shuffle, standings, swissRound } from '../lib/logic';
import type { Competition, Match } from '../lib/types';
import { InducementsDialog, initialSpp, SppEditor, sppRowsToSave, type SppRow } from '../components/MatchDialogs';
import { ConfirmButton, Crest, Empty, NumInput, STATUS_TEXT, TeamLine, TextInput, TypePill, useCoach } from '../components/ui';

type Tab = 'tabla' | 'jornadas' | 'equipos' | 'ajustes';

export default function CompetitionPage() {
  const { id = '', tab } = useParams();
  const { db, me, loading } = useStore();
  const nav = useNavigate();
  const coach = useCoach();
  const v = compView(db, id);
  if (!v) return loading ? null : <Empty>Esta competición no existe o se ha eliminado. <Link to="/">Volver</Link></Empty>;
  const { comp, teamIds, matches } = v;
  const isOrg = me?.id === comp.organizer;
  const current: Tab = (tab as Tab) || (comp.status === 'open' ? 'equipos' : 'tabla');
  const p = progress(comp, teamIds.length, matches);
  const tabs: [Tab, string][] = [['tabla', 'Clasificación'], ['jornadas', comp.type === 'liga' ? 'Jornadas' : 'Rondas'], ['equipos', comp.status === 'open' ? 'Inscripciones' : 'Equipos']];
  if (isOrg) tabs.push(['ajustes', 'Ajustes']);

  return (
    <>
      <section className="head">
        <div>
          <div className="row"><TypePill type={comp.type} /><span className="tag">{STATUS_TEXT[comp.status]}</span></div>
          <h1 style={{ marginTop: 6 }}>{comp.name}</h1>
          <p>Organiza {coach(comp.organizer)}{isOrg ? ' (tú)' : ''} · {teamIds.length} equipos{comp.status !== 'open' && ` · ${p.done} de ${p.total} partidos`} · Victoria {comp.pts_w} / Empate {comp.pts_d} / Derrota {comp.pts_l}</p>
        </div>
        <Link className="btn" to="/">Volver</Link>
      </section>
      {comp.status !== 'open' && <div className="progress" style={{ marginTop: -14 }}><i style={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%` }} /></div>}
      <div style={{ display: 'grid', gap: 16 }}>
        <div className="tabs" role="tablist">
          {tabs.map(([t, l]) => <button key={t} role="tab" aria-selected={current === t} onClick={() => nav(`/c/${id}/${t}`)}>{l}</button>)}
        </div>
        {current === 'tabla' && <Table comp={comp} teamIds={teamIds} matches={matches} />}
        {current === 'jornadas' && <Rounds comp={comp} teamIds={teamIds} matches={matches} />}
        {current === 'equipos' && <Entries comp={comp} teamIds={teamIds} />}
        {current === 'ajustes' && isOrg && <Settings comp={comp} />}
      </div>
    </>
  );
}

function Table({ comp, teamIds, matches }: { comp: Competition; teamIds: string[]; matches: Match[] }) {
  const { db } = useStore();
  const st = standings(comp, teamIds, matches, db.teams);
  if (!teamIds.length) return <Empty>Todavía no hay equipos inscritos.</Empty>;
  return (
    <>
      <div className="scroll"><table>
        <thead><tr><th>#</th><th className="l">Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th title="Touchdowns a favor">TD+</th><th title="Touchdowns en contra">TD−</th><th>Dif.</th><th title="Lesiones causadas">CAS+</th><th title="Lesiones sufridas">CAS−</th><th className="l">Racha</th><th>Pts</th></tr></thead>
        <tbody>{st.map((r, i) => (
          <tr key={r.id} className={i === 0 && r.pj ? 'lead' : ''}>
            <td className="pos">{i + 1}</td><td className="l"><TeamLine id={r.id} /></td>
            <td>{r.pj}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td><td>{r.tdf}</td><td>{r.tda}</td>
            <td>{r.tdf - r.tda > 0 ? '+' : ''}{r.tdf - r.tda}</td><td>{r.casf}</td><td>{r.casa}</td>
            <td className="l">{r.form.slice(-5).map((f, k) => <span key={k} className={`form-pip ${f}`}>{{ W: 'G', D: 'E', L: 'P' }[f]}</span>)}</td>
            <td className="pts">{r.pts}</td>
          </tr>))}</tbody>
      </table></div>
      <p className="note">Desempate: puntos, diferencia de touchdowns, diferencia de lesiones y touchdowns a favor.{comp.type === 'torneo' && ' Descansar cuenta como victoria cuando se cierra la ronda.'}</p>
    </>
  );
}

function Rounds({ comp, teamIds, matches }: { comp: Competition; teamIds: string[]; matches: Match[] }) {
  const { db, me, repo, run } = useStore();
  const [editing, setEditing] = useState<Match | null>(null);
  const [inducing, setInducing] = useState<{ m: Match; team: string } | null>(null);
  const isOrg = me?.id === comp.organizer;
  const rounds = byRound(matches);
  if (comp.status === 'open') return <Empty>El calendario se genera cuando la organización da comienzo a la competición.</Empty>;
  const label = comp.type === 'liga' ? 'Jornada' : 'Ronda';
  const firstOpen = rounds.findIndex(rd => !roundDone(rd));
  const canNext = comp.type === 'torneo' && comp.status === 'running' && rounds.length < comp.total_rounds && (rounds.length === 0 || roundDone(rounds[rounds.length - 1]));
  const owns = (tid: string | null) => !!tid && db.teams.find(t => t.id === tid)?.owner === me?.id;
  const canReport = (m: Match) => comp.status === 'running' && (isOrg || owns(m.home) || owns(m.away));
  const allDone = progress(comp, teamIds.length, matches).done >= progress(comp, teamIds.length, matches).total;
  const order = rounds.map((rd, ri) => ({ rd, ri })).sort((a, b) => (a.ri === firstOpen ? -1 : 0) - (b.ri === firstOpen ? -1 : 0) || a.ri - b.ri);

  return (
    <>
      {isOrg && (canNext || (allDone && comp.status === 'running')) && (
        <div className="banner row" style={{ justifyContent: 'space-between' }}>
          {canNext ? <>
            <span>Ronda {rounds.length} cerrada. Puedes emparejar la siguiente según la clasificación.</span>
            <button className="btn primary" onClick={() => run(() => repo.addMatches(swissRound(comp, teamIds, matches, db)), `Ronda ${rounds.length + 1} emparejada`)}>Emparejar ronda {rounds.length + 1}</button>
          </> : <>
            <span>Se han jugado todos los partidos.</span>
            <button className="btn primary" onClick={() => run(() => repo.updateCompetition(comp.id, { status: 'finished' }), 'Competición finalizada')}>Cerrar competición</button>
          </>}
        </div>
      )}
      {comp.type === 'torneo' && <p className="note">{rounds.length} de {comp.total_rounds} rondas emparejadas.{!isOrg && comp.status === 'running' && rounds.length < comp.total_rounds && ' La organización empareja cada ronda al cerrarse la anterior.'}</p>}
      {order.map(({ rd, ri }) => (
        <section className="round" key={ri}>
          <div className="round-head"><h3>{label} {ri + 1}{ri === firstOpen ? ' · en juego' : ''}</h3><span className="note">{rd.filter(m => m.played).length}/{rd.filter(m => m.away).length} jugados</span></div>
          {rd.map(m => m.away ? (
            <div className="match" key={m.id}>
              <div className="home"><TeamLine id={m.home} /></div>
              <div className={'score' + (m.played ? '' : ' pending')}>{m.played ? <>{m.td_home} – {m.td_away}<small>CAS {m.cas_home}–{m.cas_away}</small></> : 'vs'}</div>
              <div className="away"><TeamLine id={m.away} reverse /></div>
              <div className="act">
                {comp.status === 'running' && !m.played && [m.home, m.away].filter(owns).map(tid => {
                  const n = db.inducements.find(x => x.match_id === m.id && x.team_id === tid);
                  const count = n ? Object.values(n.pick.items).reduce((a, b) => a + b, 0) + n.pick.hires.length : 0;
                  return <button key={tid} className="btn small" onClick={() => setInducing({ m, team: tid! })}>Incentivos{count ? ` (${count})` : ''}</button>;
                })}
                {canReport(m) && <button className={'btn small' + (m.played ? '' : ' primary')} onClick={() => setEditing(m)}>{m.played ? 'Editar' : 'Resultado'}</button>}</div>
            </div>
          ) : (
            <div className="match" key={m.id}><div><TeamLine id={m.home} /></div><div className="score pending">—</div><div className="bye">Descansa</div><div /></div>
          ))}
        </section>
      ))}
      {editing && <ResultDialog comp={comp} match={editing} onClose={() => setEditing(null)} />}
      {inducing && <InducementsDialog match={inducing.m} teamId={inducing.team} onClose={() => setInducing(null)} />}
    </>
  );
}

function ResultDialog({ comp, match, onClose }: { comp: Competition; match: Match; onClose: () => void }) {
  const { db, me, repo, run } = useStore();
  const [r, setR] = useState({ td_home: match.td_home, td_away: match.td_away, cas_home: match.cas_home, cas_away: match.cas_away });
  const mineIds = [match.home, match.away!].filter(id => db.teams.find(t => t.id === id)?.owner === me?.id);
  const [spp, setSpp] = useState<Record<string, Record<string, SppRow>>>(() => Object.fromEntries(mineIds.map(id => [id, initialSpp(match.id, id, db)])));
  const set = (k: keyof typeof r) => (e: React.ChangeEvent<HTMLInputElement>) => setR({ ...r, [k]: Math.max(0, parseInt(e.target.value, 10) || 0) });
  const side = (tid: string, td: 'td_home' | 'td_away', cas: 'cas_home' | 'cas_away') => {
    const t = db.teams.find(x => x.id === tid);
    return (
      <div className="side">
        <div className="team-line"><Crest team={t} /><b className="nm">{t?.name}</b></div>
        <label>Touchdowns<input type="number" min={0} id={`r-${td}`} value={r[td]} onChange={set(td)} autoFocus={td === 'td_home'} /></label>
        <label>Lesiones causadas<input type="number" min={0} id={`r-${cas}`} value={r[cas]} onChange={set(cas)} /></label>
      </div>);
  };
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()} onKeyDown={e => e.key === 'Escape' && onClose()}>
      <form className="dialog" style={mineIds.length ? { width: 'min(760px,100%)' } : undefined} onSubmit={async e => {
        e.preventDefault();
        if (await run(async () => {
          await repo.saveResult(match.id, r);
          for (const id of mineIds) await repo.saveMatchPlayers(match.id, id, sppRowsToSave(spp[id]));
        }, 'Resultado guardado')) onClose();
      }}>
        <div><div className="eyebrow">{comp.name} · {comp.type === 'liga' ? 'Jornada' : 'Ronda'} {match.round}</div><h2>Acta del partido</h2></div>
        <div className="duel">{side(match.home, 'td_home', 'cas_home')}{side(match.away!, 'td_away', 'cas_away')}</div>
        {mineIds.map(id => <SppEditor key={id} teamId={id} rows={spp[id]} onChange={rows => setSpp(x => ({ ...x, [id]: rows }))}
          td={id === match.home ? r.td_home : r.td_away} cas={id === match.home ? r.cas_home : r.cas_away} />)}
        {mineIds.length > 0 && <p className="note">Cada entrenador apunta la experiencia de sus propios jugadores: TD 3 PE, lesión 2, pase completo 1, intercepción 2, lanzar compañero 1 (y 1 al lanzado si aterriza bien), MVP 4.</p>}
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="row"><button className="btn primary" type="submit">Guardar resultado</button><button className="btn" type="button" onClick={onClose}>Cancelar</button></div>
          {match.played && <button className="btn danger" type="button" onClick={async () => { if (await run(async () => { await repo.clearResult(match.id); for (const id of mineIds) await repo.saveMatchPlayers(match.id, id, []); }, 'Resultado anulado')) onClose(); }}>Anular</button>}
        </div>
      </form>
    </div>
  );
}

function Entries({ comp, teamIds }: { comp: Competition; teamIds: string[] }) {
  const { db, me, repo, run } = useStore();
  const isOrg = me?.id === comp.organizer;
  const myTeams = me ? db.teams.filter(t => t.owner === me.id) : [];
  const open = comp.status === 'open';

  const start = () => run(async () => {
    const ms = comp.type === 'liga'
      ? roundRobin(comp.id, shuffle(teamIds), comp.double_round)
      : swissRound(comp, teamIds, [], db);
    await repo.addMatches(ms);
    await repo.updateCompetition(comp.id, { status: 'running' });
  }, 'Competición en marcha: calendario generado');

  return (
    <>
      {open && (
        <div className="card">
          <h3>Inscripción</h3>
          {!me && <p className="note"><Link to="/entrar">Entra con tu cuenta</Link> para apuntar a tu equipo.</p>}
          {me && !myTeams.length && <p className="note">No tienes equipos. <Link to="/equipos">Crea uno</Link> y vuelve aquí para inscribirlo.</p>}
          {myTeams.length > 0 && <div className="list">{myTeams.map(t => {
            const inIt = teamIds.includes(t.id);
            return (
              <div key={t.id} className="row" style={{ justifyContent: 'space-between' }}>
                <TeamLine id={t.id} />
                {inIt
                  ? <button className="btn small" onClick={() => run(() => repo.withdraw(comp.id, t.id), 'Inscripción retirada')}>Retirar</button>
                  : <button className="btn small primary" onClick={() => run(() => repo.enroll(comp.id, t.id), 'Equipo inscrito')}>Inscribir</button>}
              </div>);
          })}</div>}
          {isOrg && (
            <div className="banner row" style={{ justifyContent: 'space-between' }}>
              <span>Eres la organización. Cuando estén todos, da comienzo para generar {comp.type === 'liga' ? 'el calendario completo' : 'la primera ronda'}. Después ya no se admiten inscripciones.</span>
              <button className="btn primary" disabled={teamIds.length < 2} onClick={start}>Empezar con {teamIds.length} equipos</button>
            </div>)}
        </div>
      )}
      <div className="grid">
        {teamIds.map(tid => {
          const t = db.teams.find(x => x.id === tid);
          if (!t) return null;
          return (
            <div key={tid} className="card">
              <TeamLine id={tid} />
              {open && isOrg && t.owner !== me?.id && <button className="btn small danger" style={{ justifySelf: 'start' }} onClick={() => run(() => repo.withdraw(comp.id, tid), 'Equipo retirado')}>Quitar de la competición</button>}
            </div>);
        })}
      </div>
      {!teamIds.length && <Empty>Nadie se ha inscrito todavía.</Empty>}
    </>
  );
}

function Settings({ comp }: { comp: Competition }) {
  const { repo, run } = useStore();
  const nav = useNavigate();
  const up = (patch: Partial<Competition>) => run(() => repo.updateCompetition(comp.id, patch), 'Guardado');
  return (
    <>
      <div className="card"><h3>Reglas</h3>
        <div className="fields">
          <label>Nombre<TextInput id="c-name" value={comp.name} onCommit={name => up({ name })} /></label>
          <label>Puntos por victoria<NumInput id="c-w" value={comp.pts_w} onCommit={pts_w => up({ pts_w })} /></label>
          <label>Puntos por empate<NumInput id="c-d" value={comp.pts_d} onCommit={pts_d => up({ pts_d })} /></label>
          <label>Puntos por derrota<NumInput id="c-l" value={comp.pts_l} onCommit={pts_l => up({ pts_l })} /></label>
          {comp.type === 'torneo' && <label>Rondas totales<NumInput id="c-r" min={1} value={comp.total_rounds} onCommit={n => up({ total_rounds: Math.max(1, n) })} /></label>}
        </div>
        <p className="note">Los cambios de puntuación recalculan la clasificación al momento para todos.</p>
      </div>
      <div className="card"><h3>Calendario</h3>
        <p className="note">Volver a inscripción borra el calendario y todos los resultados, y deja apuntados a los mismos equipos.</p>
        <div className="row">
          {comp.status !== 'open' && <ConfirmButton className="btn" label="Volver a inscripción" confirm="Pulsa otra vez para borrar el calendario"
            onConfirm={() => run(async () => { await repo.deleteMatches(comp.id); await repo.updateCompetition(comp.id, { status: 'open' }); }, 'Calendario borrado')} />}
          {comp.status === 'finished' && <button className="btn" onClick={() => up({ status: 'running' })}>Reabrir competición</button>}
          <ConfirmButton label="Eliminar competición" confirm="Pulsa otra vez para eliminarla"
            onConfirm={async () => { if (await run(() => repo.deleteCompetition(comp.id), 'Competición eliminada')) nav('/'); }} />
        </div>
      </div>
    </>
  );
}
