import { HashRouter, Link, NavLink, Route, Routes } from 'react-router-dom';
import { StoreProvider, useStore } from './lib/store';
import Home from './pages/Home';
import CompetitionPage from './pages/Competition';
import NewCompetition from './pages/NewCompetition';
import { TeamPage, Teams } from './pages/Teams';
import { Account, Login } from './pages/Account';

function Shell() {
  const { me, repo } = useStore();
  return (
    <>
      <header className="bar"><div className="wrap">
        <Link className="brand" to="/" style={{ textDecoration: 'none' }}><b>Banquillo</b><span>Ligas de Blood Bowl</span></Link>
        <nav>
          <NavLink to="/" end>{({ isActive }) => <button tabIndex={-1} aria-current={isActive}>Competiciones</button>}</NavLink>
          <NavLink to="/equipos">{({ isActive }) => <button tabIndex={-1} aria-current={isActive}>Equipos</button>}</NavLink>
          <NavLink to={me ? '/cuenta' : '/entrar'}>{({ isActive }) => <button tabIndex={-1} aria-current={isActive}>{me ? me.name : 'Entrar'}</button>}</NavLink>
        </nav>
      </div></header>
      <main className="wrap">
        {repo.mode === 'demo' && <div className="banner">Estás viendo la <b>demo local</b>: los datos solo se guardan en este navegador. Conecta Supabase para que todos los entrenadores compartan la misma liga.</div>}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/nueva" element={<NewCompetition />} />
          <Route path="/c/:id/:tab?" element={<CompetitionPage />} />
          <Route path="/equipos" element={<Teams />} />
          <Route path="/equipo/:id" element={<TeamPage />} />
          <Route path="/entrar" element={<Login />} />
          <Route path="/cuenta" element={<Account />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return <HashRouter><StoreProvider><Shell /></StoreProvider></HashRouter>;
}
