/**
 * Plantillas oficiales de Blood Bowl 2025 (Third Season).
 * Coste en miles de monedas. AG, PA y AV son la tirada objetivo (3 = 3+); PA null = sin pase (-).
 * Categorías de habilidad: A Agilidad, D Artimañas, G General, M Mutación, P Pase, S Fuerza.
 */
export type Position = {
  name: string; max: number; cost: number;
  ma: number; st: number; ag: number; pa: number | null; av: number;
  skills: string[]; primary: string; secondary: string;
};
export type Roster = {
  race: string; reroll: number; apothecary: boolean; tier: number;
  rules: string[]; positions: Position[];
};

export const SKILL_CATS: Record<string, string> = { A: 'Agilidad', D: 'Artimañas', G: 'General', M: 'Mutación', P: 'Pase', S: 'Fuerza' };
export const APOTHECARY_COST = 50;
export const START_BUDGET = 1000;

type Row = [max: number, name: string, cost: number, ma: number, st: number, ag: number, pa: number | null, av: number, skills: string, primary: string, secondary: string];
const r = (race: string, reroll: number, apothecary: boolean, tier: number, rules: string[], rows: Row[]): Roster => ({
  race, reroll, apothecary, tier, rules,
  positions: rows.map(([max, name, cost, ma, st, ag, pa, av, skills, primary, secondary]) => ({
    max, name, cost, ma, st, ag, pa, av, skills: skills ? skills.split(', ') : [], primary, secondary,
  })),
});

const TROLL = 'Always Hungry, Loner (4+), Mighty Blow, Projectile Vomit, Really Stupid, Regeneration, Throw Team-mate';
const TRAINED_TROLL = 'Always Hungry, Mighty Blow, Projectile Vomit, Really Stupid, Regeneration, Throw Team-mate';
const OGRE = 'Bone Head, Loner (3+), Mighty Blow, Thick Skull, Throw Team-mate';
const OGRE4 = 'Bone Head, Loner (4+), Mighty Blow, Thick Skull, Throw Team-mate';
const MINOTAUR = 'Frenzy, Horns, Loner (4+), Mighty Blow, Thick Skull, Unchannelled Fury';
const RAT_OGRE = 'Animal Savagery, Frenzy, Loner (4+), Mighty Blow, Prehensile Tail';
const TREEMAN = 'Mighty Blow, Stand Firm, Strong Arm, Take Root, Thick Skull, Throw Team-mate, Timmm-ber!';
const KROXIGOR = 'Bone Head, Loner (4+), Mighty Blow, Prehensile Tail, Thick Skull';
const STUNTY = 'Dodge, Right Stuff, Stunty';

export const ROSTERS: Roster[] = [
  r('Alianza del Viejo Mundo', 70, true, 1, ['Old World Classic'], [
    [16, 'Human Lineman', 50, 6, 3, 3, 4, 9, '', 'G', 'AS'],
    [3, 'Halfling Hopeful', 30, 5, 2, 3, 4, 7, STUNTY, 'A', 'GS'],
    [3, 'Dwarf Lineman', 70, 4, 3, 4, 5, 10, 'Block, Defensive, Thick Skull', 'DG', 'S'],
    [1, 'Human Thrower', 75, 6, 3, 3, 3, 9, 'Pass, Sure Hands', 'GP', 'AS'],
    [1, 'Human Catcher', 75, 8, 3, 3, 4, 8, 'Catch, Dodge', 'AG', 'PS'],
    [1, 'Dwarf Runner', 80, 6, 3, 3, 4, 9, 'Sprint, Sure Hands, Thick Skull', 'GP', 'AS'],
    [1, 'Human Blitzer', 85, 7, 3, 3, 4, 9, 'Block, Tackle', 'GS', 'A'],
    [1, 'Troll Slayer', 95, 5, 3, 4, 5, 9, 'Block, Dauntless, Frenzy, Hatred (Troll), Thick Skull', 'GS', 'A'],
    [1, 'Dwarf Blitzer', 100, 5, 3, 4, 4, 10, 'Block, Diving Tackle, Tackle, Thick Skull', 'GS', 'P'],
    [1, 'Altern Forest Treeman', 120, 2, 6, 5, 5, 11, 'Loner (4+), ' + TREEMAN, 'S', 'AGP'],
    [1, 'Ogre', 140, 5, 5, 4, 5, 10, OGRE, 'S', 'AG'],
  ]),
  r('Altos Elfos', 50, true, 1, ['Elven Kingdoms League'], [
    [16, 'High Elf Lineman', 65, 6, 3, 2, 3, 9, '', 'AG', 'S'],
    [2, 'Phoenix Warrior', 90, 6, 3, 2, 2, 9, 'Cloud Burster, Pass, Safe Pass', 'AGP', 'S'],
    [2, 'White Lion', 110, 7, 3, 2, 3, 9, 'Claws, Wrestle', 'AG', 'PS'],
    [2, 'Dragon Prince', 110, 8, 3, 2, 4, 9, 'Block, My Ball, Steady Footing', 'AG', 'S'],
  ]),
  r('Amazonas', 60, true, 1, ['Lustrian Superleague'], [
    [16, 'Eagle Warrior Linewoman', 50, 6, 3, 3, 4, 8, 'Dodge', 'G', 'AS'],
    [2, 'Python Warrior Thrower', 80, 6, 3, 3, 3, 8, 'Dodge, On the Ball, Pass, Safe Pass', 'GP', 'AS'],
    [2, 'Piranha Warrior Blitzer', 90, 7, 3, 3, 4, 8, 'Dodge, Hit and Run, Jump Up', 'AG', 'S'],
    [2, 'Jaguar Warrior Blocker', 110, 6, 4, 3, 4, 9, 'Defensive, Dodge', 'GS', 'A'],
  ]),
  r('Bretonianos', 60, true, 2, ['Old World Classic'], [
    [16, 'Squire', 50, 6, 3, 3, 4, 8, 'Wrestle', 'G', 'AS'],
    [2, 'Knight Thrower', 80, 6, 3, 3, 3, 9, 'Dauntless, Nerves of Steel, Pass', 'GP', 'AS'],
    [2, 'Knight Catcher', 85, 7, 3, 3, 4, 9, 'Catch, Dauntless, Nerves of Steel', 'AG', 'S'],
    [2, 'Grail Knight', 95, 7, 3, 3, 4, 10, 'Block, Dauntless, Steady Footing', 'GS', 'A'],
  ]),
  r('Caos Elegido', 50, true, 3, ['Chaos Clash', 'Favoured of… (Khorne, Nurgle, Slaanesh, Tzeentch, Hashut o Caos Absoluto)'], [
    [16, 'Beastman Runner Lineman', 55, 6, 3, 3, 3, 9, 'Horns, Thick Skull', 'GM', 'ADPS'],
    [4, 'Chosen Blocker', 100, 5, 4, 3, 5, 10, 'Arm Bar', 'GMS', 'AD'],
    [1, 'Chaos Troll', 115, 4, 5, 5, 5, 10, TROLL, 'MS', 'AGP'],
    [1, 'Chaos Ogre', 140, 5, 5, 4, 5, 10, OGRE4, 'MS', 'AG'],
    [1, 'Minotaur', 150, 5, 5, 4, 6, 9, MINOTAUR, 'MS', 'AG'],
  ]),
  r('Elfos Oscuros', 50, true, 1, ['Elven Kingdoms League'], [
    [16, 'Dark Elf Lineman', 65, 6, 3, 2, 3, 9, '', 'AG', 'DS'],
    [2, 'Runner', 80, 7, 3, 2, 3, 8, 'Dump-off, Punt', 'AGP', 'DS'],
    [2, 'Assassin', 90, 7, 3, 2, 4, 8, 'Hit and Run, Shadowing, Stab', 'AD', 'GS'],
    [2, 'Blitzer', 105, 7, 3, 2, 3, 9, 'Block', 'AG', 'DPS'],
    [2, 'Witch Elf', 110, 7, 3, 2, 4, 8, 'Dodge, Frenzy, Jump Up', 'AG', 'DS'],
  ]),
  r('Elfos Silvanos', 50, true, 1, ['Elven Kingdoms League', 'Woodland League'], [
    [12, 'Wood Elf Lineman', 65, 7, 3, 2, 3, 8, '', 'AG', 'S'],
    [2, 'Wood Elf Thrower', 85, 7, 3, 2, 2, 8, 'Pass, Safe Pair of Hands', 'AGP', 'S'],
    [2, 'Wood Elf Catcher', 90, 8, 2, 2, 3, 8, 'Catch, Dodge, Sprint', 'AG', 'PS'],
    [2, 'Wardancer', 130, 8, 3, 2, 3, 8, 'Block, Dodge, Leap', 'AG', 'PS'],
    [1, 'Loren Forest Treeman', 120, 2, 6, 5, 5, 11, 'Loner (4+), Mighty Blow, Stand Firm, Strong Arm, Take Root, Thick Skull, Throw Team-mate', 'S', 'AGP'],
  ]),
  r('Elfos Unidos', 50, true, 2, ['Elven Kingdoms League'], [
    [16, 'Elven Union Lineman', 65, 6, 3, 2, 3, 8, 'Fumblerooski', 'AG', 'S'],
    [2, 'Elven Union Thrower', 75, 6, 3, 2, 2, 8, 'Hail Mary Pass, Pass', 'AGP', 'S'],
    [2, 'Elven Union Catcher', 100, 8, 3, 2, 4, 8, 'Catch, Diving Catch, Nerves of Steel', 'AG', 'S'],
    [2, 'Elven Union Blitzer', 115, 7, 3, 2, 3, 9, 'Block, Sidestep', 'AG', 'PS'],
  ]),
  r('Enanos', 60, true, 1, ["Worlds Edge Superleague", 'Bribery and Corruption', "Brawlin' Brutes"], [
    [16, 'Dwarf Blocker Lineman', 70, 4, 3, 4, 5, 10, 'Block, Defensive, Thick Skull', 'DG', 'S'],
    [2, 'Dwarf Runner', 80, 6, 3, 3, 4, 9, 'Sprint, Sure Hands, Thick Skull', 'GP', 'AS'],
    [2, 'Troll Slayer', 95, 5, 3, 4, 5, 9, 'Block, Dauntless, Frenzy, Hatred (Troll), Thick Skull', 'GS', 'D'],
    [2, 'Dwarf Blitzer', 100, 5, 3, 4, 4, 10, 'Block, Diving Tackle, Tackle, Thick Skull', 'GS', 'P'],
    [1, 'Deathroller', 170, 5, 7, 5, null, 11, 'Break Tackle, Dirty Player, Juggernaut, Loner (4+), Mighty Blow, No Ball, Secret Weapon, Stand Firm', 'DS', 'G'],
  ]),
  r('Enanos del Caos', 70, true, 1, ['Badlands Brawl', 'Chaos Clash', 'Favoured of Hashut'], [
    [16, 'Hobgoblin Lineman', 40, 6, 3, 3, 4, 8, '', 'D', 'AGS'],
    [2, 'Hobgoblin Sneaky Stabba', 60, 6, 3, 3, 5, 8, 'Shadowing, Stab', 'DG', 'AS'],
    [4, 'Chaos Dwarf Blocker', 70, 4, 3, 4, 6, 10, 'Block, Iron Hard Skin, Thick Skull', 'GS', 'ADM'],
    [2, 'Chaos Dwarf Flamesmith', 80, 5, 3, 4, 6, 10, 'Brawler, Breathe Fire, Disturbing Presence, Thick Skull', 'GS', 'ADM'],
    [2, 'Bull Centaur Blitzer', 130, 6, 4, 4, 6, 10, 'Sprint, Sure Feet, Thick Skull, Unsteady', 'GS', 'ADM'],
    [1, 'Minotaur', 150, 5, 5, 4, 6, 9, MINOTAUR, 'MS', 'AG'],
  ]),
  r('Gnomos', 50, true, 4, ['Halfling Thimble Cup', 'Woodland League'], [
    [16, 'Gnome Lineman', 40, 5, 2, 3, 4, 7, 'Jump Up, Right Stuff, Stunty, Wrestle', 'A', 'DGS'],
    [2, 'Gnome Illusionist', 50, 5, 2, 3, 3, 7, 'Jump Up, Stunty, Trickster, Wrestle', 'AP', 'DG'],
    [2, 'Woodland Fox', 50, 7, 2, 2, null, 6, 'Dodge, My Ball, Sidestep, Stunty', 'A', ''],
    [2, 'Gnome Beastmaster', 55, 5, 2, 3, 4, 8, 'Guard, Jump Up, Stunty, Wrestle', 'A', 'DGS'],
    [2, 'Altern Forest Treeman', 120, 2, 6, 5, 5, 11, TREEMAN, 'S', 'AGP'],
  ]),
  r('Goblins', 60, true, 4, ['Badlands Brawl', 'Underworld Challenge', 'Bribery and Corruption'], [
    [16, 'Goblin Lineman', 40, 6, 2, 3, 4, 8, STUNTY, 'AD', 'GPS'],
    [1, 'Looney', 40, 6, 2, 3, null, 8, 'Chainsaw, No Ball, Secret Weapon, Stunty', 'D', 'AGS'],
    [1, 'Bomma', 45, 6, 2, 3, 4, 8, 'Bombardier, Dodge, Secret Weapon, Stunty', 'DP', 'AGS'],
    [1, "'Ooligan", 60, 6, 2, 3, 5, 8, 'Dirty Player, Disturbing Presence, Dodge, Right Stuff, Stunty, Taunt', 'AD', 'GS'],
    [1, 'Doom Diver', 65, 6, 2, 3, 6, 8, 'Dodge, Right Stuff, Stunty, Swoop', 'A', 'DGS'],
    [1, 'Fanatic', 70, 3, 7, 3, null, 8, 'Ball and Chain, No Ball, Secret Weapon, Stunty', 'DS', 'AG'],
    [1, 'Pogoer', 75, 7, 2, 3, 4, 8, 'Dodge, Pogo Stick, Stunty', 'A', 'DGS'],
    [2, 'Trained Troll', 115, 4, 5, 5, 5, 10, TRAINED_TROLL, 'S', 'AGP'],
  ]),
  r('Halflings', 60, true, 4, ['Halfling Thimble Cup', 'Woodland League'], [
    [16, 'Halfling Hopeful Lineman', 30, 5, 2, 3, 4, 7, STUNTY, 'A', 'DGS'],
    [2, 'Halfling Hefty', 50, 5, 2, 3, 3, 8, 'Dodge, Fend, Stunty', 'AP', 'DGS'],
    [2, 'Halfling Catcher', 55, 5, 2, 3, 4, 7, 'Catch, Dodge, Right Stuff, Sprint, Stunty', 'A', 'DGS'],
    [2, 'Altern Forest Treeman', 120, 2, 6, 5, 5, 11, TREEMAN, 'S', 'AGP'],
  ]),
  r('Hombres Lagarto', 70, true, 1, ['Lustrian Superleague'], [
    [16, 'Skink Runner Lineman', 60, 8, 2, 3, 4, 8, 'Dodge, Stunty', 'A', 'DGPS'],
    [2, 'Chameleon Skink', 70, 7, 2, 3, 3, 8, 'Dodge, On the Ball, Shadowing, Stunty', 'AP', 'DGS'],
    [6, 'Saurus Blocker', 90, 6, 4, 5, 6, 10, 'Juggernaut, Unsteady', 'GS', 'A'],
    [1, 'Kroxigor', 140, 6, 5, 5, 6, 10, KROXIGOR, 'S', 'AG'],
  ]),
  r('Humanos', 50, true, 2, ['Old World Classic', 'Team Captain'], [
    [16, 'Human Lineman', 50, 6, 3, 3, 4, 9, '', 'G', 'ADS'],
    [3, 'Halfling Hopeful', 30, 5, 2, 3, 4, 7, STUNTY, 'A', 'DGS'],
    [2, 'Human Thrower', 75, 6, 3, 3, 3, 9, 'Pass, Sure Hands', 'GP', 'ADS'],
    [2, 'Human Catcher', 75, 8, 3, 3, 4, 8, 'Catch, Dodge', 'AG', 'DPS'],
    [2, 'Human Blitzer', 85, 7, 3, 3, 4, 9, 'Block, Tackle', 'GS', 'AD'],
    [1, 'Ogre', 140, 5, 5, 4, 5, 10, OGRE, 'S', 'AG'],
  ]),
  r('Inframundo', 70, true, 1, ['Underworld Challenge', 'Bribery and Corruption'], [
    [16, 'Underworld Goblin Lineman', 40, 6, 2, 3, 4, 8, STUNTY, 'ADM', 'GPS'],
    [6, 'Underworld Snotling', 15, 5, 1, 3, 4, 6, 'Dodge, Insignificant, Right Stuff, Sidestep, Stunty, Titchy', 'ADM', 'G'],
    [3, 'Skaven Clanrat', 50, 7, 3, 3, 4, 8, 'Animosity (Underworld Goblin Linemen)', 'DGM', 'AS'],
    [1, 'Skaven Thrower', 80, 7, 3, 3, 2, 8, 'Animosity (Underworld Goblin Linemen), Pass, Sure Hands', 'GMP', 'ADS'],
    [1, 'Gutter Runner', 85, 9, 2, 2, 4, 8, 'Animosity (Underworld Goblin Linemen), Dodge, Stab', 'ADGM', 'S'],
    [1, 'Skaven Blitzer', 90, 8, 3, 3, 4, 9, 'Animosity (Underworld Goblin Linemen), Block, Strip Ball', 'GMS', 'AD'],
    [1, 'Underworld Troll', 115, 4, 5, 5, 5, 10, TROLL, 'MS', 'AGP'],
    [1, 'Mutant Rat Ogre', 150, 6, 5, 4, 6, 9, RAT_OGRE, 'MS', 'AG'],
  ]),
  r('Khorne', 60, true, 3, ['Chaos Clash', 'Favoured of Khorne', "Brawlin' Brutes"], [
    [16, 'Bloodborn Marauder Lineman', 50, 6, 3, 3, 4, 8, 'Frenzy', 'GM', 'ADS'],
    [2, 'Khorngor', 70, 6, 3, 3, 4, 9, 'Horns, Juggernaut, Jump Up, Thick Skull', 'GMS', 'ADP'],
    [4, 'Bloodseeker', 105, 5, 4, 4, 6, 10, 'Frenzy', 'GMS', 'AD'],
    [1, 'Bloodspawn', 160, 5, 5, 4, 6, 9, 'Claws, Frenzy, Loner (4+), Mighty Blow, Unchannelled Fury', 'MS', 'AG'],
  ]),
  r('Nigromantes', 70, false, 2, ['Sylvanian Spotlight', 'Masters of Undeath'], [
    [16, 'Zombie Lineman', 40, 4, 3, 4, 6, 9, 'Eye Gouge, Regeneration, Unsteady', 'DG', 'AS'],
    [2, 'Ghoul Runner', 75, 7, 3, 3, 3, 8, 'Dodge, Regeneration', 'AG', 'DPS'],
    [2, 'Wraith', 85, 6, 3, 3, null, 9, 'Block, Foul Appearance, No Ball, Regeneration, Sidestep', 'GS', 'AD'],
    [2, 'Flesh Golem', 110, 4, 4, 4, 6, 10, 'Regeneration, Stand Firm, Thick Skull, Unsteady', 'GS', 'AD'],
    [2, 'Werewolf', 120, 8, 3, 3, 3, 9, 'Claws, Frenzy, Regeneration', 'AG', 'DPS'],
  ]),
  r('No Muertos', 70, false, 2, ['Sylvanian Spotlight', 'Masters of Undeath'], [
    [16, 'Skeleton Lineman', 40, 5, 3, 4, 6, 8, 'Regeneration, Thick Skull', 'G', 'ADS'],
    [16, 'Zombie Lineman', 40, 4, 3, 4, 6, 9, 'Eye Gouge, Regeneration, Unsteady', 'DG', 'AS'],
    [2, 'Ghoul Runner', 75, 7, 3, 3, 3, 8, 'Dodge, Regeneration', 'AG', 'DPS'],
    [2, 'Wight Blitzer', 95, 6, 3, 3, 5, 9, 'Block, Regeneration, Tackle, Thick Skull', 'GS', 'AD'],
    [2, 'Mummy', 125, 3, 5, 5, 6, 10, 'Mighty Blow, Regeneration', 'S', 'AG'],
  ]),
  r('Nobleza Imperial', 60, true, 2, ['Old World Classic'], [
    [16, 'Imperial Retainer Lineman', 45, 6, 3, 3, 4, 8, 'Fend', 'G', 'AS'],
    [2, 'Imperial Thrower', 75, 6, 3, 3, 2, 9, 'Give and Go, Pass, Pro', 'GP', 'AS'],
    [4, 'Bodyguard', 85, 5, 3, 3, 4, 9, 'Stand Firm, Wrestle', 'GS', 'A'],
    [2, 'Noble Blitzer', 90, 7, 3, 3, 4, 9, 'Block, Catch, Pro', 'AG', 'PS'],
    [1, 'Ogre', 140, 5, 5, 4, 5, 10, OGRE, 'S', 'AG'],
  ]),
  r('Nórdicos', 60, true, 1, ['Old World Classic', 'Chaos Clash', 'Favoured of Khorne'], [
    [16, 'Norse Raider Lineman', 50, 6, 3, 3, 4, 8, 'Block, Drunkard, Thick Skull, Unsteady', 'G', 'APS'],
    [2, 'Beer Boar', 20, 5, 1, 3, null, 6, 'Dodge, No Ball, Pick-me-up, Stunty, Titchy', 'A', ''],
    [2, 'Norse Berserker', 90, 6, 3, 3, 5, 8, 'Block, Frenzy, Jump Up', 'GS', 'AP'],
    [2, 'Valkyrie', 95, 7, 3, 3, 3, 8, 'Catch, Dauntless, Pass, Strip Ball', 'AGP', 'S'],
    [2, 'Ulfwerener', 105, 6, 4, 4, 6, 9, 'Frenzy, Unsteady', 'GS', 'A'],
    [1, 'Yhetee', 140, 5, 5, 4, 6, 9, 'Claws, Disturbing Presence, Frenzy, Loner (4+), Unchannelled Fury', 'S', 'AG'],
  ]),
  r('Nurgle', 60, false, 3, ['Chaos Clash', 'Favoured of Nurgle', "Brawlin' Brutes"], [
    [16, 'Rotter Lineman', 40, 5, 3, 4, 6, 9, 'Decay, Plague Ridden', 'DGM', 'AS'],
    [2, 'Pestigor', 70, 6, 3, 3, 4, 9, 'Horns, Plague Ridden, Regeneration, Steady Footing, Thick Skull', 'GMS', 'ADP'],
    [4, 'Bloater', 110, 4, 4, 4, 6, 10, 'Disturbing Presence, Foul Appearance, Plague Ridden, Regeneration, Stand Firm, Unsteady', 'GMS', 'AD'],
    [1, 'Rotspawn', 140, 4, 5, 5, 6, 10, 'Disturbing Presence, Foul Appearance, Loner (4+), Mighty Blow, Pick-me-up, Plague Ridden, Really Stupid, Regeneration, Tentacles', 'S', 'DGM'],
  ]),
  r('Ogros', 70, true, 4, ['Badlands Brawl', 'Worlds Edge Superleague', 'Low Cost Linemen', "Brawlin' Brutes"], [
    [16, 'Gnoblar Lineman', 15, 5, 1, 3, 4, 6, 'Dodge, Right Stuff, Sidestep, Stunty, Titchy', 'AD', 'G'],
    [5, 'Ogre Blocker', 140, 5, 5, 4, 5, 10, 'Bone Head, Mighty Blow, Thick Skull, Throw Team-mate', 'S', 'ADGP'],
    [1, 'Ogre Runt Punter', 145, 5, 5, 4, 4, 10, 'Bone Head, Kick Team-mate, Mighty Blow, Thick Skull', 'PS', 'ADG'],
  ]),
  r('Orcos', 60, true, 2, ['Badlands Brawl', "Brawlin' Brutes", 'Team Captain'], [
    [16, 'Orc Lineman', 50, 5, 3, 3, 4, 10, '', 'GS', 'AD'],
    [4, 'Goblin', 40, 6, 2, 3, 4, 8, STUNTY, 'AD', 'GPS'],
    [2, 'Orc Thrower', 75, 6, 3, 3, 3, 9, 'Pass, Sure Hands', 'GP', 'ADS'],
    [2, 'Orc Blitzer', 85, 6, 3, 3, 4, 10, 'Block, Break Tackle', 'GS', 'AD'],
    [2, "Big Un Blocker", 95, 5, 4, 4, 6, 10, 'Mighty Blow, Taunt, Thick Skull, Unsteady', 'GS', 'AD'],
    [1, 'Untrained Troll', 115, 4, 5, 5, 5, 10, TROLL, 'S', 'AGP'],
  ]),
  r('Orcos Negros', 60, true, 3, ['Badlands Brawl', 'Bribery and Corruption', "Brawlin' Brutes"], [
    [16, 'Goblin Bruiser Lineman', 45, 6, 2, 3, 4, 8, 'Dodge, Right Stuff, Stunty, Thick Skull', 'AD', 'GPS'],
    [6, 'Black Orc', 90, 4, 4, 4, 5, 10, 'Brawler, Grab', 'GS', 'AD'],
    [1, 'Trained Troll', 115, 4, 5, 5, 5, 10, TRAINED_TROLL, 'S', 'AGP'],
  ]),
  r('Renegados del Caos', 70, true, 3, ['Chaos Clash', 'Favoured of… (Khorne, Nurgle, Slaanesh, Tzeentch o Caos Absoluto)'], [
    [16, 'Renegade Human Lineman', 50, 6, 3, 3, 4, 9, 'Animosity (All)', 'DGM', 'AS'],
    [1, 'Renegade Goblin', 40, 6, 2, 3, 4, 8, 'Animosity (All), Dodge, Right Stuff, Stunty', 'ADM', 'GP'],
    [1, 'Renegade Orc', 50, 5, 3, 3, 4, 10, 'Animosity (All)', 'DGM', 'AS'],
    [1, 'Renegade Skaven', 50, 7, 3, 3, 4, 8, 'Animosity (All)', 'DGM', 'AS'],
    [1, 'Renegade Dark Elf', 65, 6, 3, 2, 3, 9, 'Animosity (All)', 'ADGM', 'S'],
    [1, 'Renegade Human Thrower', 75, 6, 3, 3, 3, 9, 'Animosity (All), Pass, Sure Hands', 'DGMP', 'AS'],
    [1, 'Renegade Troll', 115, 4, 5, 5, 5, 10, TROLL, 'S', 'AGMP'],
    [1, 'Renegade Ogre', 140, 5, 5, 4, 5, 10, OGRE4, 'S', 'AGM'],
    [1, 'Renegade Minotaur', 150, 5, 5, 4, 6, 9, MINOTAUR, 'S', 'AGM'],
    [1, 'Renegade Rat Ogre', 150, 6, 5, 4, 6, 9, RAT_OGRE, 'S', 'AGM'],
  ]),
  r('Reyes Funerarios', 60, false, 2, ['Sylvanian Spotlight', 'Masters of Undeath'], [
    [16, 'Skeleton Lineman', 40, 5, 3, 4, 6, 8, 'Regeneration, Thick Skull', 'G', 'ADS'],
    [2, 'Anointed Thrower', 65, 6, 3, 4, 3, 9, 'Pass, Regeneration, Sure Hands, Thick Skull', 'GP', 'ADS'],
    [2, 'Anointed Blitzer', 85, 6, 3, 4, 5, 9, 'Block, Regeneration, Thick Skull', 'GS', 'AD'],
    [4, 'Tomb Guardian', 115, 4, 5, 5, 6, 10, 'Brawler, Decay, Regeneration', 'S', 'AG'],
  ]),
  r('Skaven', 50, true, 2, ['Underworld Challenge'], [
    [16, 'Skaven Clanrat Lineman', 50, 7, 3, 3, 4, 8, '', 'DG', 'AMS'],
    [2, 'Skaven Thrower', 80, 7, 3, 3, 2, 8, 'Pass, Sure Hands', 'GP', 'ADMS'],
    [2, 'Gutter Runner', 85, 9, 2, 2, 4, 8, 'Dodge, Stab', 'ADG', 'MS'],
    [2, 'Skaven Blitzer', 90, 8, 3, 3, 4, 9, 'Block, Strip Ball', 'GS', 'ADM'],
    [1, 'Rat Ogre', 150, 6, 5, 4, 6, 9, RAT_OGRE, 'S', 'AGM'],
  ]),
  r('Slann', 50, true, 3, ['Lustrian Superleague'], [
    [16, 'Slann Lineman', 60, 6, 3, 3, 4, 9, 'Pogo Stick', 'G', 'AS'],
    [2, 'Slann Catcher', 80, 7, 2, 2, 3, 8, 'Diving Catch, On the Ball, Pogo Stick, Very Long Legs', 'AG', 'PS'],
    [2, 'Slann Blitzer', 100, 7, 3, 3, 4, 9, 'Diving Tackle, Hit and Run, Jump Up, Pogo Stick', 'AGS', 'P'],
    [1, 'Kroxigor', 140, 6, 5, 5, 6, 10, KROXIGOR, 'S', 'AG'],
  ]),
  r('Snotlings', 70, true, 4, ['Underworld Challenge', 'Bribery and Corruption', 'Low Cost Linemen', 'Swarming'], [
    [16, 'Snotling Lineman', 15, 5, 1, 3, 4, 6, 'Dodge, Insignificant, Right Stuff, Sidestep, Stunty, Titchy', 'AD', 'G'],
    [2, 'Fun-hoppa', 20, 6, 1, 3, 4, 6, 'Dodge, Pogo Stick, Right Stuff, Sidestep, Stunty', 'AD', 'G'],
    [2, 'Stilty Runna', 20, 6, 1, 3, 4, 6, 'Dodge, Right Stuff, Sidestep, Sprint, Stunty', 'AD', 'G'],
    [2, 'Fungus Flinga', 30, 5, 1, 3, 4, 6, 'Bombardier, Dodge, Right Stuff, Secret Weapon, Sidestep, Stunty, Titchy', 'ADP', 'G'],
    [2, 'Pump Wagon', 100, 5, 5, 5, 6, 9, 'Dirty Player, Juggernaut, Mighty Blow, Really Stupid, Stand Firm', 'DS', 'AG'],
    [2, 'Trained Troll', 115, 4, 5, 5, 5, 10, TRAINED_TROLL, 'S', 'AGP'],
  ]),
  r('Vampiros', 60, true, 2, ['Sylvanian Spotlight', 'Masters of Undeath'], [
    [16, 'Thrall Lineman', 40, 6, 3, 3, 4, 8, '', 'G', 'AS'],
    [2, 'Vampire Runner', 100, 8, 3, 2, 3, 8, 'Bloodlust (2+), Hypnotic Gaze, Regeneration', 'AG', 'PS'],
    [2, 'Vampire Thrower', 110, 6, 4, 2, 2, 9, 'Bloodlust (2+), Hypnotic Gaze, Pass, Regeneration', 'AGP', 'S'],
    [2, 'Vampire Blitzer', 110, 6, 4, 2, 4, 9, 'Bloodlust (3+), Hypnotic Gaze, Juggernaut, Regeneration', 'AGS', ''],
    [1, 'Vargheist', 150, 5, 5, 4, 6, 10, 'Bloodlust (3+), Claws, Frenzy, Loner (4+), Regeneration', 'S', 'AG'],
  ]),
];

const BY_RACE = new Map(ROSTERS.map(x => [x.race, x]));
export const RACES = ROSTERS.map(x => x.race);
export const rosterOf = (race: string) => BY_RACE.get(race);
export const positionOf = (race: string, pos: string) => rosterOf(race)?.positions.find(p => p.name === pos);
/** Coste de cada segunda oportunidad al crear el equipo (60k si la raza no tiene plantilla). */
export const rerollCost = (race: string) => rosterOf(race)?.reroll ?? 60;
export const fmtTarget = (n: number | null) => (n === null ? '-' : n + '+');

/** Once jugadores de ejemplo: uno de cada posición especial (hasta 6) y el resto de la primera posición. */
export function starterLineup(race: string): Position[] {
  const ps = rosterOf(race)?.positions ?? [];
  if (!ps.length) return [];
  const out = ps.slice(1).filter(p => p.max < 16).slice(0, 6);
  while (out.length < 11) out.push(ps[0]);
  return out;
}
