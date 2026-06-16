import {
  ITEM_BY_ID,
  SKILL_BY_ID,
  type AttributeKey,
  type CharacterState,
  type EquipmentInstance,
  type EquipmentSlot,
  type GameState,
  type ItemDefinition
} from './GameState';
import {
  canLearnSkill,
  getItemStats,
  normalizeSkillLoadout,
  skillPointCost
} from './AlphaSystems';

export type DerivedStats = {
  maxHp: number;
  maxSp: number;
  attack: number;
  magicAttack: number;
  defense: number;
  magicDefense: number;
  hit: number;
  flee: number;
  crit: number;
  attackInterval: number;
  hpRegen: number;
  spRegen: number;
};

export function expToLevel(level: number): number {
  return Math.floor(55 * level ** 1.55);
}

export function jobExpToLevel(level: number): number {
  return Math.floor(42 * level ** 1.48);
}

export function getEquippedItems(state: GameState): ItemDefinition[] {
  return Object.values(state.equipment)
    .map((uid) => state.inventory.find((instance) => instance.uid === uid))
    .filter((instance): instance is EquipmentInstance => Boolean(instance))
    .map((instance) => ITEM_BY_ID[instance.itemId])
    .filter(Boolean);
}

export function getEquippedInstances(state: GameState): EquipmentInstance[] {
  return Object.values(state.equipment)
    .map((uid) => state.inventory.find((instance) => instance.uid === uid))
    .filter((instance): instance is EquipmentInstance => Boolean(instance));
}

function calculateAttackDamage(
  character: CharacterState,
  equipmentAttack: number,
  skill: (id: string) => number,
  activeBuffs: GameState['activeBuffs'],
  lowHp: boolean
): number {
  const a = character.attributes;
  const rangerAttackMultiplier = 1 + skill('eagle_eye') * 0.01 + skill('boss_mark') * 0.002;
  const warCry = activeBuffs.war_cry ? 1 + 0.05 + skill('war_cry') * 0.015 : 1;
  const attackMeal = activeBuffs.rare_feast ? 1.18 : activeBuffs.attack_meal ? 1.12 : 1;
  const lastStandAttack = lowHp ? 1 + 0.05 + skill('last_stand') * 0.04 : 1;

  const rangedDamage = a.dex * (character.classId === 'ranger' ? 1 : 0) * rangerAttackMultiplier;
  const meleeDamage = a.str * (character.classId === 'warrior' ? 1 : 0) * warCry;

  return Math.floor((12 + meleeDamage + rangedDamage + equipmentAttack) * attackMeal * lastStandAttack);
}

export function getDerivedStats(state: GameState): DerivedStats {
  const character = state.character;
  if (!character) {
    return {
      maxHp: 1, maxSp: 1, attack: 1, magicAttack: 1, defense: 0, magicDefense: 0,
      hit: 1, flee: 1, crit: 0, attackInterval: 1, hpRegen: 0, spRegen: 0
    };
  }

  const a = character.attributes;
  const gear = getEquippedInstances(state);
  const sum = (key: keyof ItemDefinition) => gear.reduce((total, instance) => {
    const item = ITEM_BY_ID[instance.itemId];
    return total + Number(getItemStats(item, instance.upgradeLevel)[key] ?? 0);
  }, 0);
  const skill = (id: string) => character.skills[id] ?? 0;
  const hasShield = gear.some((instance) => ITEM_BY_ID[instance.itemId]?.slot === 'offhand');
  const baseMaxHp = 100 + character.level * 18 + a.vit * 14 + sum('maxHp');
  const lowHp = character.hp > 0 && character.hp < baseMaxHp * 0.3;
  const hpMultiplier = 1 + (skill('battle_endurance') > 0 ? 0.03 + skill('battle_endurance') * 0.02 : 0);
  const elementalStudy = 1 + skill('elemental_study') * 0.018;
  const magicTea = state.activeBuffs.rare_feast ? 1.18 : state.activeBuffs.magic_tea ? 1.12 : 1;
  const guardTonic = state.activeBuffs.rare_feast ? 1.12 : state.activeBuffs.guard_tonic ? 1.12 : 1;
  const focusedAim = state.activeBuffs.focused_aim ? skill('focused_aim') : 0;
  const windwalk = state.activeBuffs.windwalk ? skill('windwalk') : 0;
  const quickStepSpeed = skill('quick_step') * 0.008;
  const windwalkSpeed = windwalk > 0 ? 0.05 + windwalk * 0.012 : 0;
  const swiftSpeed = state.activeBuffs.rare_feast ? 0.08 : state.activeBuffs.swift_juice ? 0.1 : 0;

  return {
    maxHp: Math.floor(baseMaxHp * hpMultiplier),
    maxSp: Math.floor(35 + character.level * 3 + a.int * 7 + sum('maxSp')),
    attack: calculateAttackDamage(character, sum('attack'), skill, state.activeBuffs, lowHp),
    magicAttack: Math.floor((10 + character.level * 1.8 + a.int * 3.1 + a.dex * 0.45 + sum('magicAttack')) * elementalStudy * magicTea * (1 + skill('mvp_ward') * 0.002)),
    defense: Math.floor((character.level * 1.2 + a.vit * 2.2 + sum('defense') + (skill('iron_skin') > 0 ? (5 + skill('iron_skin') * 3) * (1 + Math.floor(a.vit / 10) * 0.02) : 0) + (hasShield ? skill('shield_guard') * 2 : 0)) * guardTonic),
    magicDefense: Math.floor(character.level + a.int * 1.35 + a.vit * 0.6 + sum('magicDefense') + skill('magic_barrier') * 0.8),
    hit: Math.floor(72 + character.level * 1.3 + a.dex * 2.2 + sum('hit') + skill('eagle_eye') * 3 + (focusedAim ? 10 + focusedAim * 4 : 0)),
    flee: Math.floor(18 + character.level + a.agi * 2 + a.luk * 0.35 + sum('flee') + skill('quick_step') * 4 + (windwalk ? 10 + windwalk * 3 : 0) + (state.activeBuffs.swift_juice ? 12 : 0)),
    crit: Math.min(65, 3 + a.luk * 0.45 + sum('crit') + skill('critical_focus') * 0.8 + (focusedAim ? 2 + focusedAim * 0.8 : 0)),
    attackInterval: Math.max(0.38, (1.45 - a.agi * 0.018 - character.level * 0.003) * (1 - quickStepSpeed - windwalkSpeed - swiftSpeed)),
    hpRegen: 1.5 + a.vit * 0.35 + (skill('battle_endurance') * 0.005 * (100 + character.level * 18 + a.vit * 14)) / 60,
    spRegen: 1 + a.int * 0.22 + skill('arcane_recovery') * 0.35
  };
}

export function addExperience(state: GameState, exp: number, jobExp: number): void {
  const character = state.character;
  if (!character) return;

  character.exp += exp;
  character.jobExp += jobExp;
  state.currentSession.exp += exp;
  state.currentSession.jobExp += jobExp;

  while (character.exp >= expToLevel(character.level)) {
    character.exp -= expToLevel(character.level);
    character.level += 1;
    const points = 3 + Math.floor(character.level / 5);
    character.statPoints += points;
    state.currentSession.levels += 1;
    pushLog(state, `Base level ${character.level}! +${points} stat points.`);
  }

  while (character.jobExp >= jobExpToLevel(character.jobLevel)) {
    character.jobExp -= jobExpToLevel(character.jobLevel);
    character.jobLevel += 1;
    character.skillPoints += 1;
    state.currentSession.jobLevels += 1;
    pushLog(state, `Job level ${character.jobLevel}! +1 skill point.`);
  }

  const stats = getDerivedStats(state);
  character.hp = Math.min(character.hp, stats.maxHp);
  character.sp = Math.min(character.sp, stats.maxSp);
}

export function spendStatPoint(state: GameState, stat: AttributeKey): boolean {
  const character = state.character;
  if (!character || character.statPoints <= 0) return false;
  character.attributes[stat] += 1;
  character.statPoints -= 1;
  return true;
}

export function learnSkill(state: GameState, skillId: string): boolean {
  const character = state.character;
  const skill = SKILL_BY_ID[skillId];
  if (!character || !skill || skill.classId !== character.classId) return false;
  const current = character.skills[skillId] ?? 0;
  if (!canLearnSkill(state, skill)) return false;
  character.skills[skillId] = current + 1;
  character.skillPoints -= skillPointCost(current);
  normalizeSkillLoadout(state);
  return true;
}

export function canEquip(state: GameState, instance: EquipmentInstance): boolean {
  const item = ITEM_BY_ID[instance.itemId];
  return Boolean(state.character && item && (!item.classId || item.classId === state.character.classId));
}

export function equipItem(state: GameState, uid: string): boolean {
  const instance = state.inventory.find((entry) => entry.uid === uid);
  if (!instance || !canEquip(state, instance)) return false;
  const item = ITEM_BY_ID[instance.itemId];
  state.equipment[item.slot] = uid;
  pushLog(state, `Equipped ${item.name}.`);
  return true;
}

export function sellItem(state: GameState, uid: string): boolean {
  if (Object.values(state.equipment).includes(uid)) return false;
  const index = state.inventory.findIndex((entry) => entry.uid === uid);
  if (index < 0) return false;
  const [instance] = state.inventory.splice(index, 1);
  if (instance.locked) {
    state.inventory.splice(index, 0, instance);
    return false;
  }
  state.gold += Math.floor(ITEM_BY_ID[instance.itemId].value * (1 + instance.upgradeLevel * 0.08));
  return true;
}

export function itemScore(item: ItemDefinition): number {
  const stats = getItemStats(item, 0);
  return (stats.attack ?? 0) * 2 + (stats.magicAttack ?? 0) * 2 + (stats.defense ?? 0) * 1.5
    + (stats.magicDefense ?? 0) + (stats.maxHp ?? 0) * 0.12 + (stats.maxSp ?? 0) * 0.15
    + (stats.hit ?? 0) + (stats.flee ?? 0) + (stats.crit ?? 0) * 2;
}

export function equipmentSlotLabel(slot: EquipmentSlot): string {
  return slot === 'offhand' ? 'Off-hand' : slot[0].toUpperCase() + slot.slice(1);
}

export function pushLog(state: GameState, message: string): void {
  state.combatLog.unshift(message);
  state.combatLog = state.combatLog.slice(0, 8);
}
