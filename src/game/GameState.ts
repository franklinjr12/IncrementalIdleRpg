import classesData from '../data/classes.json';
import itemsData from '../data/items.json';
import mapsData from '../data/maps.json';
import monstersData from '../data/monsters.json';
import skillsData from '../data/skills.json';

export type AttributeKey = 'str' | 'agi' | 'vit' | 'int' | 'dex' | 'luk';
export type ClassId = 'warrior' | 'ranger' | 'mage';
export type EquipmentSlot = 'weapon' | 'offhand' | 'helmet' | 'armor' | 'boots' | 'accessory';
export type Element = 'neutral' | 'fire' | 'water' | 'earth' | 'wind' | 'dark' | 'holy';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mvp';
export type SkillType = 'active' | 'passive' | 'buff' | 'proc';
export type DamageType = 'physical' | 'ranged' | 'magical' | 'none';

export type Attributes = Record<AttributeKey, number>;

export type ClassDefinition = {
  id: ClassId;
  name: string;
  color: number;
  description: string;
  mainStats: string;
  strength: string;
  weakness: string;
  starterMap: string;
  startingWeapon: string;
  stats: Attributes;
};

export type SkillDefinition = {
  id: string;
  classId: ClassId;
  name: string;
  type: SkillType;
  unlockLevel: number;
  description: string;
  maxLevel: number;
  affectedStats: AttributeKey[];
  damageType: DamageType;
  target: string;
  element?: Element;
  cooldownSeconds: number;
  durationSeconds: number;
  spCostBase: number;
  spCostPerLevel: number;
  powerBase?: number;
  powerPerLevel?: number;
  splashProgress?: number;
  defenseIgnore?: number;
  defenseReduction?: number;
  damageTakenIncrease?: number;
  procChanceBase?: number;
  procChancePerLevel?: number;
  formula: string;
  scaling: string;
  tags: string[];
};

export type ItemDefinition = {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: Rarity;
  level: number;
  description: string;
  sources: string[];
  classId?: ClassId;
  attack?: number;
  magicAttack?: number;
  defense?: number;
  magicDefense?: number;
  maxHp?: number;
  maxSp?: number;
  hit?: number;
  flee?: number;
  crit?: number;
  value: number;
};

export type MonsterDefinition = {
  id: string;
  name: string;
  level: number;
  race: string;
  color: number;
  element: Element;
  hp: number;
  attack: number;
  attackType: 'physical' | 'magical' | 'mixed';
  defense: number;
  magicDefense: number;
  hit: number;
  flee: number;
  exp: number;
  jobExp: number;
  gold: number;
  goldMin: number;
  goldMax: number;
  material: string;
  equipment: string[];
  rareEquipment: string[];
  card: string;
  encounterWeight: number;
  boss?: boolean;
};

export type MapDefinition = {
  id: string;
  name: string;
  level: string;
  unlockLevel: number;
  theme: string;
  element: Element;
  color: number;
  drops: string;
  mvpThreshold: number;
  mvp: string;
  monsters: string[];
};

export type EquipmentInstance = {
  uid: string;
  itemId: string;
  foundAt: number;
  upgradeLevel: number;
  locked: boolean;
  upgradeHistory: UpgradeHistoryEntry[];
};

export type UpgradeHistoryEntry = {
  from: number;
  to: number;
  success: boolean;
  goldSpent: number;
  materialsSpent: Record<string, number>;
  protected: boolean;
};

export type CharacterState = {
  name: string;
  classId: ClassId;
  level: number;
  exp: number;
  jobLevel: number;
  jobExp: number;
  statPoints: number;
  skillPoints: number;
  attributes: Attributes;
  skills: Record<string, number>;
  skillLoadout: string[];
  hp: number;
  sp: number;
};

export type CombatState = {
  enemyId: string;
  enemyHp: number;
  playerTimer: number;
  enemyTimer: number;
  elapsed: number;
  isMvp: boolean;
  skillCooldowns: Record<string, number>;
  enemyDebuffs: Record<string, number>;
  nextEnemyProgress: number;
};

export type MapProgress = {
  kills: number;
  mvpKills: number;
  deaths: number;
  killsSinceMvp: number;
  bestExpPerHour: number;
  bestGoldPerHour: number;
  bestMvpResult: 'unknown' | 'failed' | 'defeated';
  knownEnemies: string[];
  knownDrops: string[];
  discoveredCards: string[];
};

export type SessionReport = {
  startedAt: number;
  duration: number;
  mapId: string;
  kills: number;
  deaths: number;
  exp: number;
  jobExp: number;
  gold: number;
  items: string[];
  cards: string[];
  materials: Record<string, number>;
  mvpAttempts: number;
  mvpKills: number;
  levels: number;
  jobLevels: number;
  damageDealt: number;
  damageTaken: number;
  misses: number;
  attacks: number;
  diagnosis: string;
  offline?: boolean;
};

export type GameState = {
  version: 2;
  character: CharacterState | null;
  gold: number;
  currentMapId: string;
  farming: boolean;
  autoMvp: boolean;
  combat: CombatState | null;
  inventory: EquipmentInstance[];
  equipment: Record<EquipmentSlot, string | null>;
  materials: Record<string, number>;
  cards: string[];
  mapProgress: Record<string, MapProgress>;
  consumables: Record<string, number>;
  activeBuffs: Record<string, number>;
  marketStock: Record<string, number>;
  marketDayKey: string;
  currentSession: SessionReport;
  lastReport: SessionReport | null;
  combatLog: string[];
  lastSavedAt: number;
};

export const CLASSES = classesData as ClassDefinition[];
export const SKILLS = skillsData as SkillDefinition[];
export const ITEMS = itemsData as ItemDefinition[];
export const MONSTERS = monstersData as MonsterDefinition[];
export const MAPS = mapsData as MapDefinition[];

export const CLASS_BY_ID = Object.fromEntries(CLASSES.map((entry) => [entry.id, entry])) as Record<ClassId, ClassDefinition>;
export const SKILL_BY_ID = Object.fromEntries(SKILLS.map((entry) => [entry.id, entry])) as Record<string, SkillDefinition>;
export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((entry) => [entry.id, entry])) as Record<string, ItemDefinition>;
export const MONSTER_BY_ID = Object.fromEntries(MONSTERS.map((entry) => [entry.id, entry])) as Record<string, MonsterDefinition>;
export const MAP_BY_ID = Object.fromEntries(MAPS.map((entry) => [entry.id, entry])) as Record<string, MapDefinition>;

function emptyProgress(): MapProgress {
  return {
    kills: 0,
    mvpKills: 0,
    deaths: 0,
    killsSinceMvp: 0,
    bestExpPerHour: 0,
    bestGoldPerHour: 0,
    bestMvpResult: 'unknown',
    knownEnemies: [],
    knownDrops: [],
    discoveredCards: []
  };
}

export function createEquipmentInstance(itemId: string, prefix = 'item'): EquipmentInstance {
  return {
    uid: `${prefix}-${itemId}-${Date.now()}-${Math.floor(Math.random() * 1e9)}`,
    itemId,
    foundAt: Date.now(),
    upgradeLevel: 0,
    locked: false,
    upgradeHistory: []
  };
}

export function createSession(mapId = 'slime_field'): SessionReport {
  return {
    startedAt: Date.now(),
    duration: 0,
    mapId,
    kills: 0,
    deaths: 0,
    exp: 0,
    jobExp: 0,
    gold: 0,
    items: [],
    cards: [],
    materials: {},
    mvpAttempts: 0,
    mvpKills: 0,
    levels: 0,
    jobLevels: 0,
    damageDealt: 0,
    damageTaken: 0,
    misses: 0,
    attacks: 0,
    diagnosis: 'Start farming to receive build advice.'
  };
}

export function createInitialState(): GameState {
  return {
    version: 2,
    character: null,
    gold: 0,
    currentMapId: 'slime_field',
    farming: false,
    autoMvp: true,
    combat: null,
    inventory: [],
    equipment: { weapon: null, offhand: null, helmet: null, armor: null, boots: null, accessory: null },
    materials: {},
    cards: [],
    mapProgress: Object.fromEntries(MAPS.map((map) => [map.id, emptyProgress()])),
    consumables: {},
    activeBuffs: {},
    marketStock: {},
    marketDayKey: new Date().toISOString().slice(0, 10),
    currentSession: createSession(),
    lastReport: null,
    combatLog: ['Choose a class to begin your adventure.'],
    lastSavedAt: Date.now()
  };
}

export function createCharacter(classId: ClassId, name = 'Adventurer'): GameState {
  const state = createInitialState();
  const definition = CLASS_BY_ID[classId];
  const weapon: EquipmentInstance = {
    uid: `starter-${definition.startingWeapon}`,
    itemId: definition.startingWeapon,
    foundAt: Date.now(),
    upgradeLevel: 0,
    locked: false,
    upgradeHistory: []
  };
  state.character = {
    name,
    classId,
    level: 1,
    exp: 0,
    jobLevel: 1,
    jobExp: 0,
    statPoints: 0,
    skillPoints: 0,
    attributes: { ...definition.stats },
    skills: {},
    skillLoadout: [],
    hp: 1,
    sp: 1
  };
  state.inventory.push(weapon);
  state.equipment.weapon = weapon.uid;
  state.combatLog = [`${name} became a ${definition.name}.`, 'Select Start Farming when ready.'];
  return state;
}

export function repairLoadedState(value: unknown): GameState | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const loaded = value as Partial<GameState>;
  if (loaded.version !== 2) {
    return null;
  }
  const initial = createInitialState();
  const mapProgress = { ...initial.mapProgress, ...loaded.mapProgress };
  for (const map of MAPS) {
    const progress = mapProgress[map.id] ?? emptyProgress();
    progress.bestMvpResult ??= progress.mvpKills > 0 ? 'defeated' : 'unknown';
    progress.knownEnemies ??= [...map.monsters];
    progress.knownDrops ??= [];
    progress.discoveredCards ??= [];
    mapProgress[map.id] = progress;
  }
  const inventory = (loaded.inventory ?? []).map((instance) => ({
    ...instance,
    upgradeLevel: instance.upgradeLevel ?? 0,
    locked: instance.locked ?? false,
    upgradeHistory: instance.upgradeHistory ?? []
  }));
  const character = loaded.character
    ? { ...loaded.character, skillLoadout: loaded.character.skillLoadout ?? [] }
    : null;
  const combat = loaded.combat
    ? {
      ...loaded.combat,
      skillCooldowns: loaded.combat.skillCooldowns ?? {},
      enemyDebuffs: loaded.combat.enemyDebuffs ?? {},
      nextEnemyProgress: loaded.combat.nextEnemyProgress ?? 0
    }
    : null;
  return {
    ...initial,
    ...loaded,
    character,
    combat,
    inventory,
    equipment: { ...initial.equipment, ...loaded.equipment },
    mapProgress,
    consumables: { ...initial.consumables, ...loaded.consumables },
    activeBuffs: { ...initial.activeBuffs, ...loaded.activeBuffs },
    marketStock: { ...initial.marketStock, ...loaded.marketStock },
    marketDayKey: loaded.marketDayKey ?? initial.marketDayKey,
    currentSession: { ...createSession(loaded.currentMapId), ...loaded.currentSession },
    combatLog: loaded.combatLog?.slice(0, 8) ?? initial.combatLog
  };
}
