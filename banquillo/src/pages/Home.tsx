import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { compView, progress, standings } from '../lib/logic';
import { Crest, Empty, STATUS_TEXT, TeamLine, TypePill } from '../components/ui';

export default function Home() {
  const { db, me } = useStore();
  const comps = db.competitions.slice().sort((a, b) =>
    (a.status === 'finished' ? 1 : 0) - (b.status === 'finished' ? 1 : 0) || b.created_at.localeCompare(a.created_at));
  const myTeams = me ? db.teams.filter(t => t.owner === me.id) : [];
  const recent = db.matches.filter(m => m.played && m.away).slice(-8).reverse();

  return (
    <>
      <section className="head">
        <div><div className="eyebrow">Temporada en curso</div><h1>Competiciones</h1></div>
        {me && <Link className="btn primary" to="/nueva">Nueva competición</Link>}
      </section>
      {comps.length ? (
        <div className="grid">
          {comps.map(c => {
            const v = compView(db, c.id)!;
            const p = progress(c, v.teamIds.length, v.matches);
            const st = standings(c, v.teamIds, v.matches, db.teams);
            const lead = st[0]?.pj ? db.teams.find(t => t.id === st[0].id) : undefined;
            const mine = myTeams.some(t => v.teamIds.includes(t.id));
            return (
              <Link key={c.id} to={`/c/${c.id}`} className="card click" style={{ color: 'inherit', textDecoration: 'none' }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="row"><TypePill type={c.type} />{mine && <span className="tag mine">Juegas aquí</span>}</span>
                  <span className="tag">{STATUS_TEXT[c.status]}</span>
                </div>
                <h2>{c.name}</h2>
                <div className="meta"><span><b>{v.teamIds.length}</b> equipos</span>{c.status !== 'open' && <span><b>{p.done}/{p.total}</b> partidos</span>}</div>
                {c.status !== 'open' && <div className="progress"><i style={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%` }} /></div>}
                {lead
                  ? <div className="team-line"><Crest team={lead} /><span className="nm"><span className="eyebrow" style={{ display: 'block' }}>{c.status === 'finished' ? 'Campeón' : 'Líder'}</span><b>{lead.name}</b> · {st[0].pts} pts</span></div>
                  : <p className="note">{c.status === 'open' ? 'Apunta tu equipo antes de que empiece.' : 'Sin partidos jugados todavía.'}</p>}
              </Link>
            );
          })}
        </div>
      ) : <Empty>Aún no hay competiciones. {me ? 'Crea la primera con el botón de arriba.' : 'Entra con tu cuenta para crear la primera.'}</Empty>}

      <section className="split">
        <div className="card">
          <h3>Últimos resultados</h3>
          {recent.length ? <div>{recent.map(m => {
            const c = db.competitions.find(x => x.id === m.competition_id);
            return (
              <div className="result-row" key={m.id}>
                <TeamLine id={m.home} sub={false} />
                <div style={{ textAlign: 'center' }}><b>{m.td_home} – {m.td_away}</b><div className="note">{c?.name} · {c?.type === 'liga' ? 'J' : 'R'}{m.round}</div></div>
                <div className="r"><TeamLine id={m.away!} sub={false} reverse /></div>
              </div>);
          })}</div> : <p className="note">Cuando se registren resultados aparecerán aquí.</p>}
        </div>
        <div className="card">
          <h3>{me ? 'Tus equipos' : 'Únete'}</h3>
          {me ? (myTeams.length
            ? <div className="list">{myTeams.map(t => <TeamLine key={t.id} id={t.id} />)}</div>
            : <p className="note">Todavía no tienes equipos. Crea uno para inscribirte en ligas y torneos.</p>)
            : <p className="note">Crea una cuenta para registrar tus equipos, apuntarte a competiciones y meter tus resultados.</p>}
          <Link className="btn" to={me ? '/equipos' : '/entrar'} style={{ textAlign: 'center' }}>{me ? 'Gestionar equipos' : 'Entrar o registrarse'}</Link>
        </div>
      </section>
    </>
  );
}
