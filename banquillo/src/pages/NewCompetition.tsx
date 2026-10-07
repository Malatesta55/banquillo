import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import type { CompType } from '../lib/types';

export default function NewCompetition() {
  const { repo, run, toast } = useStore();
  const nav = useNavigate();
  const [type, setType] = useState<CompType>('liga');

  return (
    <>
      <section className="head"><div><div className="eyebrow">Tú organizas</div><h1>Nueva competición</h1>
        <p>Se crea con la inscripción abierta. Cada entrenador apunta su equipo y tú das comienzo cuando estén todos.</p></div></section>
      <form className="card" style={{ gap: 18 }} onSubmit={async e => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const name = String(fd.get('name')).trim();
        if (!name) { toast('Ponle un nombre a la competición'); return; }
        let id = '';
        const ok = await run(async () => {
          id = await repo.createCompetition({
            name, type, double_round: !!fd.get('double'),
            total_rounds: Math.max(1, parseInt(String(fd.get('rounds')), 10) || 5),
            pts_w: parseInt(String(fd.get('w')), 10) || 0, pts_d: parseInt(String(fd.get('d')), 10) || 0, pts_l: parseInt(String(fd.get('l')), 10) || 0,
          });
        }, 'Competición creada. Ya pueden inscribirse.');
        if (ok) nav(`/c/${id}/equipos`);
      }}>
        <div className="fields"><label>Nombre<input type="text" id="nc-name" name="name" required placeholder="Liga de Primavera 2027" /></label></div>
        <div style={{ display: 'grid', gap: 6 }}>
          <span className="eyebrow">Formato</span>
          <div className="seg">
            <label><input type="radio" name="type" checked={type === 'liga'} onChange={() => setType('liga')} />Liga (todos contra todos)</label>
            <label><input type="radio" name="type" checked={type === 'torneo'} onChange={() => setType('torneo')} />Torneo (sistema suizo)</label>
          </div>
          <p className="note">{type === 'liga'
            ? 'Al empezar se generan todas las jornadas de una vez.'
            : 'Cada ronda se empareja según la clasificación al cerrar la anterior, evitando repetir rivales.'}</p>
        </div>
        <div className="fields">
          {type === 'liga'
            ? <label className="check"><input type="checkbox" id="nc-double" name="double" />Ida y vuelta</label>
            : <label>Rondas del torneo<input type="number" id="nc-rounds" name="rounds" min={1} max={15} defaultValue={5} /></label>}
          <label>Puntos por victoria<input type="number" id="nc-w" name="w" defaultValue={3} /></label>
          <label>Puntos por empate<input type="number" id="nc-d" name="d" defaultValue={1} /></label>
          <label>Puntos por derrota<input type="number" id="nc-l" name="l" defaultValue={0} /></label>
        </div>
        <div className="row"><button className="btn primary" type="submit">Crear y abrir inscripción</button><button type="button" className="btn" onClick={() => nav('/')}>Cancelar</button></div>
      </form>
    </>
  );
}
