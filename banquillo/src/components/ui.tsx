import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Team } from '../lib/types';
import { initials } from '../lib/logic';
import { useStore } from '../lib/store';

export function Crest({ team, lg }: { team?: Team; lg?: boolean }) {
  if (!team) return null;
  return <span className={'crest' + (lg ? ' lg' : '')} style={{ background: `hsl(${team.hue} 55% 36%)` }}>{initials(team.name)}</span>;
}

export function useCoach() {
  const { db } = useStore();
  return (id?: string) => db.profiles.find(p => p.id === id)?.name || 'Entrenador';
}

export function TeamLine({ id, sub = true, reverse = false }: { id: string; sub?: boolean; reverse?: boolean }) {
  const { db, me } = useStore();
  const coach = useCoach();
  const t = db.teams.find(x => x.id === id);
  if (!t) return <span className="bye">Equipo eliminado</span>;
  return (
    <span className="team-line" style={reverse ? { flexDirection: 'row-reverse', textAlign: 'right' } : undefined}>
      <Crest team={t} />
      <span className="nm">
        <Link className="link" to={`/equipo/${t.id}`}>{t.name}</Link>
        {sub && <small>{coach(t.owner)}{t.owner === me?.id ? ' (tú)' : ''} · {t.race}</small>}
      </span>
    </span>
  );
}

/** Botón que pide una segunda pulsación antes de una acción que no se puede deshacer. */
export function ConfirmButton({ label, confirm, onConfirm, className = 'btn danger' }:
  { label: string; confirm: string; onConfirm: () => void; className?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 4000); return () => clearTimeout(t); }, [armed]);
  return armed
    ? <button type="button" className="btn armed" onClick={() => { setArmed(false); onConfirm(); }}>{confirm}</button>
    : <button type="button" className={className} onClick={() => setArmed(true)}>{label}</button>;
}

export function Empty({ children }: { children: ReactNode }) { return <div className="empty">{children}</div>; }

export function TypePill({ type }: { type: 'liga' | 'torneo' }) {
  return <span className={`pill ${type}`}>{type === 'liga' ? 'Liga' : 'Torneo suizo'}</span>;
}

export const STATUS_TEXT = { open: 'Inscripción abierta', running: 'En juego', finished: 'Finalizada' } as const;

export function NumInput({ value, onCommit, disabled, id, style, min }:
  { value: number; onCommit: (n: number) => void; disabled?: boolean; id: string; style?: React.CSSProperties; min?: number }) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  return <input type="number" id={id} style={style} min={min} value={v} disabled={disabled}
    onChange={e => setV(e.target.value)}
    onBlur={() => { const n = parseInt(v, 10); if (Number.isFinite(n) && n !== value) onCommit(n); else setV(String(value)); }} />;
}

export function TextInput({ value, onCommit, disabled, id, style }:
  { value: string; onCommit: (s: string) => void; disabled?: boolean; id: string; style?: React.CSSProperties }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return <input type="text" id={id} style={style} value={v} disabled={disabled}
    onChange={e => setV(e.target.value)}
    onBlur={() => { const s = v.trim(); if (s && s !== value) onCommit(s); else setV(value); }} />;
}
