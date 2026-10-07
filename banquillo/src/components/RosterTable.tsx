import { fmtK } from '../lib/logic';
import { fmtTarget, SKILL_CATS, type Position, type Roster } from '../lib/rosters';

const cats = (s: string) => <span title={s.split('').map(c => SKILL_CATS[c] ?? c).join(', ')}>{s || '—'}</span>;

/** Tabla de posiciones de una raza. Con `qty` y `onQty` sirve para elegir cuántos jugadores fichar. */
export function RosterTable({ roster, qty, onQty, taken }: {
  roster: Roster; qty?: Record<string, number>; onQty?: (pos: Position, n: number) => void; taken?: Record<string, number>;
}) {
  return (
    <div className="scroll"><table className="positions">
      <thead><tr>
        {onQty && <th>Fichar</th>}
        <th>Cant.</th><th className="l">Posición</th><th>Coste</th><th>MA</th><th>ST</th><th>AG</th><th>PA</th><th>AV</th>
        <th className="l">Habilidades</th><th>Prim.</th><th>Sec.</th>
      </tr></thead>
      <tbody>{roster.positions.map(p => (
        <tr key={p.name}>
          {onQty && <td><input type="number" aria-label={`Cantidad de ${p.name}`} style={{ width: 58 }} min={0} max={p.max}
            value={qty?.[p.name] ?? 0} onChange={e => onQty(p, Math.max(0, Math.min(p.max, parseInt(e.target.value, 10) || 0)))} /></td>}
          <td>{taken ? `${taken[p.name] ?? 0}/${p.max}` : `0-${p.max}`}</td>
          <td className="l"><b>{p.name}</b></td>
          <td>{fmtK(p.cost)}</td>
          <td>{p.ma}</td><td>{p.st}</td><td>{fmtTarget(p.ag)}</td><td>{fmtTarget(p.pa)}</td><td>{fmtTarget(p.av)}</td>
          <td className="l skills">{p.skills.join(', ') || '—'}</td>
          <td>{cats(p.primary)}</td><td>{cats(p.secondary)}</td>
        </tr>))}
      </tbody>
    </table></div>
  );
}

export function RosterFacts({ roster }: { roster: Roster }) {
  return (
    <div className="meta">
      <span>Segunda oportunidad <b>{fmtK(roster.reroll)}</b></span>
      <span>Boticario <b>{roster.apothecary ? fmtK(50) : 'No'}</b></span>
      <span>Nivel <b>{roster.tier}</b></span>
      <span>Reglas <b>{roster.rules.join(' · ')}</b></span>
    </div>
  );
}
