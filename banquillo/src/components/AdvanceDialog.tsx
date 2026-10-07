import { useState } from 'react';
import { useStore } from '../lib/store';
import { fmtK, sppOf } from '../lib/logic';
import { positionOf, SKILL_CATS } from '../lib/rosters';
import {
  ADV_COST, ADV_LABEL, currentProfile, ELITE, LEVELS, MAX_ADVANCES, rand, SKILLS, skillValue, STAT_ROLL, STAT_VALUE, statTimes,
  type AdvKind, type Advance, type Stat,
} from '../lib/bb2025';
import type { Player, Team } from '../lib/types';

/** Comprar un avance con PE siguiendo la tabla de BB2025. */
export function AdvanceDialog({ team: t, player: p, onClose }: { team: Team; player: Player; onClose: () => void }) {
  const { db, repo, run } = useStore();
  const base = positionOf(t.race, p.pos);
  const prof = currentProfile(base, p.advances);
  const spp = sppOf(p, db);
  const n = p.advances.length; // avances ya comprados
  const [kind, setKind] = useState<AdvKind>('random');
  const [cat, setCat] = useState('');
  const [skill, setSkill] = useState('');
  const [roll, setRoll] = useState<number | null>(null);
  const [stat, setStat] = useState<Stat | ''>('');
  const [adj, setAdj] = useState(p.spp);

  const cost = n < MAX_ADVANCES ? ADV_COST[kind][n] : Infinity;
  const cats = (kind === 'secondary' ? base?.secondary : base?.primary)?.split('') ?? [];
  const has = new Set(prof?.skills.map(s => s.replace(/ \(.*\)$/, '')) ?? []);
  const options = cat ? SKILLS[cat].filter(s => !has.has(s)) : [];
  const statOk = (s: Stat) => statTimes(p.advances, s) < 2 && !(s === 'PA' && prof?.pa === 1) && !(s === 'AG' && prof?.ag === 1);
  const choice: Advance | null = kind === 'stat'
    ? (stat ? { kind, stat, spp: cost, value: STAT_VALUE[stat] } : null)
    : (skill ? { kind, skill, spp: cost, value: skillValue(kind, skill) } : null);
  const error = !base ? 'La posición de este jugador no está en la plantilla BB2025 de su raza; cámbiala primero.'
    : n >= MAX_ADVANCES ? 'Este jugador ya es una Leyenda: no admite más avances.'
    : spp.available < cost ? `Le faltan PE: necesita ${cost} y tiene ${spp.available}.` : '';
  const reset = (k: AdvKind) => { setKind(k); setCat(''); setSkill(''); setRoll(null); setStat(''); };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()} onKeyDown={e => e.key === 'Escape' && onClose()}>
      <form className="dialog" style={{ width: 'min(620px,100%)' }} onSubmit={async e => {
        e.preventDefault();
        if (error || !choice) return;
        if (await run(() => repo.updatePlayer(p.id, { advances: [...p.advances, choice], value: p.value + choice.value }),
          `${p.name} sube a ${LEVELS[n + 1]}`)) onClose();
      }}>
        <div><div className="eyebrow">{p.pos} · {LEVELS[n]} · {spp.available} PE disponibles</div><h2>Mejorar a {p.name}</h2></div>

        <div className="scroll"><table>
          <thead><tr><th className="l">Avance</th>{LEVELS.slice(1).map((l, i) => <th key={l} className={i === n ? 'pts' : ''}>{i + 1}.º</th>)}<th className="l">Valor</th></tr></thead>
          <tbody>{(Object.keys(ADV_COST) as AdvKind[]).map(k => (
            <tr key={k}><td className="l">{ADV_LABEL[k]}</td>{ADV_COST[k].map((c, i) => <td key={i} className={i === n ? 'pts' : ''}>{c}</td>)}
              <td className="l note">{k === 'stat' ? 'MA/PA +20k, AG +30k, ST +60k, AV +10k' : k === 'secondary' ? '+40k' : '+20k'}</td></tr>))}
          </tbody></table></div>
        <p className="note">Las habilidades de élite ({ELITE.join(', ')}) suben 10k más. Cada característica se puede mejorar como mucho dos veces.</p>

        {!error && <>
          <div className="row" role="radiogroup">
            {(Object.keys(ADV_COST) as AdvKind[]).map(k => (
              <label key={k} className="check"><input type="radio" name="adv-kind" checked={kind === k} disabled={spp.available < ADV_COST[k][n]} onChange={() => reset(k)} />
                {ADV_LABEL[k]} ({ADV_COST[k][n]} PE)</label>))}
          </div>

          {kind !== 'stat' && <div className="fields">
            <label>Categoría<select id="adv-cat" value={cat} onChange={e => { setCat(e.target.value); setSkill(''); }}>
              <option value="">Elige…</option>{cats.map(c => <option key={c} value={c}>{SKILL_CATS[c]}</option>)}</select></label>
            {kind === 'random'
              ? <label>Habilidad<button type="button" className="btn" disabled={!cat || !!skill || !options.length} onClick={() => setSkill(options[rand(options.length)])}>
                  {skill || 'Tirar al azar'}</button></label>
              : <label>Habilidad<select id="adv-skill" value={skill} disabled={!cat} onChange={e => setSkill(e.target.value)}>
                  <option value="">Elige…</option>{options.map(s => <option key={s}>{s}{ELITE.includes(s) ? ' (élite)' : ''}</option>)}</select></label>}
          </div>}

          {kind === 'stat' && <div className="fields">
            <label>Tirada D8<button type="button" className="btn" disabled={roll !== null} onClick={() => setRoll(rand(8) + 1)}>{roll ?? 'Tirar D8'}</button></label>
            {roll !== null && <label>Característica<select id="adv-stat" value={stat} onChange={e => setStat(e.target.value as Stat)}>
              <option value="">Elige…</option>
              {STAT_ROLL[roll].map(s => <option key={s} value={s} disabled={!statOk(s)}>{s} (+{STAT_VALUE[s]}k){statOk(s) ? '' : ' · ya no se puede'}</option>)}
            </select></label>}
          </div>}
          {kind === 'stat' && roll !== null && !STAT_ROLL[roll].some(statOk) && <p className="note">Ninguna de las características de esta tirada se puede mejorar ya.</p>}
        </>}
        {error && <p className="note" style={{ color: 'var(--loss)' }}>{error}</p>}

        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="row">
            <button className="btn primary" type="submit" disabled={!!error || !choice}>{choice ? `Comprar por ${cost} PE (+${fmtK(choice.value)})` : 'Comprar avance'}</button>
            <button className="btn" type="button" onClick={onClose}>Cerrar</button>
          </div>
          {p.advances.length > 0 && <button className="btn danger" type="button" title="Deshace el último avance y devuelve sus PE"
            onClick={() => { const last = p.advances[p.advances.length - 1]; run(() => repo.updatePlayer(p.id, { advances: p.advances.slice(0, -1), value: p.value - last.value }), 'Avance deshecho').then(ok => ok && onClose()); }}>
            Deshacer último avance</button>}
        </div>

        <details>
          <summary className="note">Ajuste manual de PE</summary>
          <div className="row" style={{ marginTop: 8 }}>
            <label>PE ganados fuera de las actas<input type="number" id="adv-adj" value={adj} onChange={e => setAdj(parseInt(e.target.value, 10) || 0)} /></label>
            <button className="btn small" type="button" onClick={() => run(() => repo.updatePlayer(p.id, { spp: adj }), 'PE ajustados')}>Guardar ajuste</button>
          </div>
          <p className="note">PE ganados {spp.earned} (de ellos {p.spp} de ajuste) · gastados {spp.spent}.</p>
        </details>
      </form>
    </div>
  );
}
