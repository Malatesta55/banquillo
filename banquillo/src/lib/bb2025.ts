/** Reglas de liga de Blood Bowl 2025: experiencia, avances e incentivos. */
import { rosterOf, type Position } from './rosters';

export const SKILLS: Record<string, string[]> = {
  A: ['Catch', 'Defensive', 'Diving Catch', 'Diving Tackle', 'Dodge', 'Hit and Run', 'Jump Up', 'Leap', 'Safe Pair of Hands', 'Sidestep', 'Sprint', 'Sure Feet'],
  D: ['Dirty Player', 'Eye Gouge', 'Fumblerooski', 'Lethal Flight', 'Lone Fouler', 'Pile Driver', 'Put the Boot In', 'Quick Foul', 'Saboteur', 'Shadowing', 'Sneaky Git', 'Violent Innovator'],
  G: ['Block', 'Dauntless', 'Fend', 'Frenzy', 'Kick', 'Pro', 'Steady Footing', 'Strip Ball', 'Sure Hands', 'Tackle', 'Taunt', 'Wrestle'],
  M: ['Big Hand', 'Claws', 'Disturbing Presence', 'Extra Arms', 'Foul Appearance', 'Horns', 'Iron Hard Skin', 'Monstrous Mouth', 'Prehensile Tail', 'Tentacles', 'Two Heads', 'Very Long Legs'],
  P: ['Accurate', 'Cannoneer', 'Cloud Burster', 'Dump-off', 'Give and Go', 'Hail Mary Pass', 'Leader', 'Nerves of Steel', 'On the Ball', 'Pass', 'Punt', 'Safe Pass'],
  S: ['Arm Bar', 'Brawler', 'Break Tackle', 'Bullseye', 'Grab', 'Guard', 'Juggernaut', 'Mighty Blow', 'Multiple Block', 'Stand Firm', 'Strong Arm', 'Thick Skull'],
};
/** Habilidades de élite: suben 10k más el valor del jugador. */
export const ELITE = ['Block', 'Dodge', 'Guard', 'Mighty Blow'];

// ---------- Experiencia (PE / SPP) ----------
export const SPP = { td: 3, cas: 2, cmp: 1, inter: 2, ttm: 1, mvp: 4 } as const;
export type SppKey = keyof typeof SPP;
export const SPP_LABEL: Record<SppKey, [string, string]> = {
  td: ['TD', 'Touchdown (3 PE)'],
  cas: ['CAS', 'Lesión causada con un placaje (2 PE)'],
  cmp: ['Pase', 'Pase completo y preciso (1 PE)'],
  inter: ['Int.', 'Intercepción (2 PE)'],
  ttm: ['LCE', 'Lanzar compañero con éxito, o aterrizar bien tras ser lanzado (1 PE cada vez)'],
  mvp: ['MVP', 'Jugador más valioso (4 PE)'],
};

// ---------- Avances ----------
export type AdvKind = 'random' | 'primary' | 'secondary' | 'stat';
export type Stat = 'MA' | 'ST' | 'AG' | 'PA' | 'AV';
export type Advance = { kind: AdvKind; skill?: string; stat?: Stat; spp: number; value: number };

export const ADV_LABEL: Record<AdvKind, string> = {
  random: 'Habilidad primaria aleatoria', primary: 'Habilidad primaria elegida',
  secondary: 'Habilidad secundaria elegida', stat: 'Mejora de característica',
};
/** Coste en PE según el número de avance (1.º a 6.º). */
export const ADV_COST: Record<AdvKind, number[]> = {
  random: [3, 4, 6, 8, 10, 15],
  primary: [6, 8, 12, 16, 20, 30],
  secondary: [10, 12, 16, 20, 24, 34],
  stat: [14, 16, 20, 24, 28, 38],
};
export const LEVELS = ['Novato', 'Experimentado', 'Veterano', 'Estrella emergente', 'Estrella', 'Superestrella', 'Leyenda'];
export const MAX_ADVANCES = 6;
export const STAT_VALUE: Record<Stat, number> = { MA: 20, PA: 20, AG: 30, ST: 60, AV: 10 };
export const skillValue = (kind: AdvKind, skill: string) => (kind === 'secondary' ? 40 : 20) + (ELITE.includes(skill) ? 10 : 0);

/** Tabla de mejora de característica (D8): qué características se pueden subir con cada resultado. */
export const STAT_ROLL: Record<number, Stat[]> = {
  1: ['AV'], 2: ['AV', 'PA'], 3: ['AV', 'MA', 'PA'], 4: ['AV', 'MA', 'PA'],
  5: ['MA', 'PA'], 6: ['AG', 'MA'], 7: ['AG', 'ST'], 8: ['MA', 'ST', 'AG', 'PA', 'AV'],
};

export type Profile = { ma: number; st: number; ag: number; pa: number | null; av: number; skills: string[] };

/** Perfil actual de un jugador: el de su posición más los avances comprados. */
export function currentProfile(base: Position | undefined, advances: Advance[]): Profile | null {
  if (!base) return null;
  const p: Profile = { ma: base.ma, st: base.st, ag: base.ag, pa: base.pa, av: base.av, skills: [...base.skills] };
  for (const a of advances) {
    if (a.skill) p.skills.push(a.skill);
    if (a.stat === 'MA') p.ma++;
    if (a.stat === 'ST') p.st++;
    if (a.stat === 'AV') p.av++;
    if (a.stat === 'AG') p.ag--;
    if (a.stat === 'PA') p.pa = p.pa === null ? 6 : p.pa - 1;
  }
  return p;
}
/** Una característica no puede mejorarse más de dos veces. */
export const statTimes = (advances: Advance[], s: Stat) => advances.filter(a => a.stat === s).length;

export const rand = (n: number) => Math.floor(Math.random() * n);

// ---------- Incentivos ----------
export type Inducement = { id: string; name: string; desc: string; max: number; cost: number; only?: (rules: string[], apothecary: boolean) => boolean; cheap?: [rule: string, cost: number, max?: number] };
export const INDUCEMENTS: Inducement[] = [
  { id: 'prayers', name: 'Plegarias a Nuffle', desc: 'Una tirada en la tabla de plegarias por cada una.', max: 3, cost: 10 },
  { id: 'cheer', name: 'Animadoras temporales', desc: '+1 animadora para este partido.', max: 5, cost: 5 },
  { id: 'coach', name: 'Ayudantes a tiempo parcial', desc: '+1 ayudante del entrenador para este partido.', max: 5, cost: 20 },
  { id: 'mascot', name: 'Mascota del equipo', desc: 'Puede dar una segunda oportunidad extra en cada parte.', max: 1, cost: 25 },
  { id: 'weather', name: 'Mago del tiempo', desc: 'Una vez por partido modifica la tirada de clima.', max: 1, cost: 25 },
  { id: 'kegs', name: "Barriles de Blitzer's Best", desc: '+1 a las tiradas para recuperarse de KO.', max: 2, cost: 50 },
  { id: 'bribes', name: 'Sobornos', desc: 'Evita una expulsión con 2+.', max: 3, cost: 100, cheap: ['Bribery and Corruption', 50, 6] },
  { id: 'training', name: 'Entrenamiento extra', desc: '+1 segunda oportunidad de equipo para este partido.', max: 8, cost: 100 },
  { id: 'apo', name: 'Boticario ambulante', desc: 'Funciona como un boticario una vez por partido.', max: 2, cost: 100, only: (_, apo) => apo },
  { id: 'mortuary', name: 'Ayudante de la morgue', desc: 'Repite una tirada de Regeneración fallida.', max: 1, cost: 100, only: r => r.includes('Masters of Undeath') },
  { id: 'plague', name: 'Médico de la peste', desc: 'Repite Regeneración o hace de boticario.', max: 1, cost: 100, only: r => r.some(x => x.includes('Nurgle')) },
  { id: 'staff', name: 'Cuerpo técnico infame', desc: '+1 a recuperarse de KO y recolocar jugadores antes de la patada.', max: 1, cost: 100 },
  { id: 'referee', name: 'Árbitro parcial', desc: 'Expulsa a los rivales que hagan faltas con 5+ y +1 a protestar.', max: 1, cost: 120, cheap: ['Bribery and Corruption', 80] },
  { id: 'rookies', name: 'Novatos alborotadores', desc: '2D3+1 jugadores eventuales extra.', max: 1, cost: 150, only: r => r.includes('Low Cost Linemen') },
  { id: 'wizard', name: 'Hechicero deportivo', desc: 'Un hechizo (Bola de fuego o ¡Zap!) por partido.', max: 1, cost: 150 },
  { id: 'chef', name: 'Cocinero halfling', desc: 'Cada parte puede robar segundas oportunidades al rival.', max: 1, cost: 300, cheap: ['Halfling Thimble Cup', 100] },
];
export const MAX_STARS = 2, MAX_MERCS = 3, MERC_FEE = 30, MERC_SKILL = 50, UNDERDOG_TREASURY = 50;

export function inducementsFor(race: string, apothecary: boolean) {
  const ro = rosterOf(race);
  const rules = ro?.rules ?? [];
  const canApo = ro ? ro.apothecary : apothecary;
  return INDUCEMENTS.filter(i => !i.only || i.only(rules, canApo)).map(i => {
    const c = i.cheap && rules.includes(i.cheap[0]) ? i.cheap : null;
    return { ...i, cost: c ? c[1] : i.cost, max: c?.[2] ?? i.max };
  });
}

/** Contratación de un partido: incentivos por id, estrellas y mercenarios con su coste total. */
export type InducementPick = { items: Record<string, number>; hires: { kind: 'star' | 'merc'; name: string; cost: number }[] };
export const emptyPick = (): InducementPick => ({ items: {}, hires: [] });
export function pickCost(p: InducementPick, race: string, apo: boolean) {
  const list = inducementsFor(race, apo);
  return Object.entries(p.items).reduce((a, [id, n]) => a + (list.find(i => i.id === id)?.cost ?? 0) * n, 0)
    + p.hires.reduce((a, h) => a + h.cost, 0);
}

// ---------- Después del partido ----------
/** Ganancias (k): asistencia / 2 + touchdowns propios + 1 si nadie hizo stalling, todo por 10k. */
export const winnings = (attendance: number, td: number, noStalling: boolean) => (attendance / 2 + td + (noStalling ? 1 : 0)) * 10;
export const MAX_FANS = 7, MIN_FANS = 1;
/** Hinchas fieles tras el partido: si ganas, suben con un D6 igual o mayor; si pierdes, bajan con un D6 menor. */
export function fansAfter(fans: number, outcome: 'W' | 'D' | 'L', d6: number) {
  if (outcome === 'W' && d6 >= fans) return Math.min(MAX_FANS, fans + 1);
  if (outcome === 'L' && d6 < fans) return Math.max(MIN_FANS, fans - 1);
  return fans;
}
export type Mistake = 'none' | 'averted' | 'minor' | 'major' | 'catastrophe';
export const MISTAKE_LABEL: Record<Mistake, string> = {
  none: 'Menos de 100k en tesorería: no se tira', averted: 'Crisis evitada', minor: 'Incidente menor (pierdes D3 × 10k)',
  major: 'Incidente grave (pierdes la mitad de la tesorería)', catastrophe: 'Catástrofe (solo te quedan 2D6 × 10k)',
};
const M: Mistake[][] = [ // filas por tramo de tesorería, columnas D6 = 1, 2, 3, 4, 5, 6
  ['minor', 'averted', 'averted', 'averted', 'averted', 'averted'],
  ['minor', 'minor', 'minor', 'averted', 'averted', 'averted'],
  ['major', 'minor', 'minor', 'averted', 'averted', 'averted'],
  ['major', 'major', 'major', 'minor', 'minor', 'averted'],
  ['catastrophe', 'major', 'major', 'minor', 'minor', 'minor'],
  ['catastrophe', 'catastrophe', 'catastrophe', 'major', 'major', 'minor'],
];
/** Errores caros: resultado según la tesorería (k) y un D6. */
export const mistakeFor = (treasury: number, d6: number): Mistake => (treasury < 100 ? 'none' : M[Math.min(5, Math.floor(treasury / 100) - 1)][d6 - 1]);
/** Lo que se pierde (k). `extra` es la tirada que pide el resultado: D3 en el menor, 2D6 en la catástrofe. */
export function mistakeLoss(m: Mistake, treasury: number, extra: number) {
  if (m === 'minor') return Math.min(treasury, extra * 10);
  if (m === 'major') return Math.floor(treasury / 2 / 5) * 5;
  if (m === 'catastrophe') return Math.max(0, treasury - extra * 10);
  return 0;
}
