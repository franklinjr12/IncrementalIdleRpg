import {
  ITEM_BY_ID,
  ITEMS,
  MAPS,
  MAP_BY_ID,
  MONSTER_BY_ID,
  SKILL_BY_ID,
  SKILLS,
  createEquipmentInstance,
  type AttributeKey,
  type EquipmentInstance,
  type EquipmentSlot,
  type GameState,
  type ItemDefinition,
  type MapDefinition,
  type MonsterDefinition,
  type Rarity,
  type SkillDefinition
} from './GameState';

export const UPGRADE_MULTIPLIERS = [1, 1.05, 1.1, 1.16, 1.23, 1.31, 1.4, 1.5, 1.62, 1.75, 1.9] as const;
export const UPGRADE_SUCCESS = [1, 1, 1, 0.95, 0.85, 0.75, 0.6, 0.45, 0.35, 0.25, 0.15] as const;

const RARITY_MULTIPLIER: Record<Rarity, number> = {
  common: 1,
  uncommon: 1.3,
  rare: 1.8,
  epic: 2.5,
  legendary: 4,
  mvp: 6
};

const SLOT_MATERIAL: Record<EquipmentSlot, string> = {
  weapon: 'Iron Ore',
  offhand: 'Iron Ore',
  helmet: 'Tough Hide',
  armor: 'Tough Hide',
  boots: 'Slime Core',
  accessory: 'Magic Dust'
};

const MAGE_MATERIAL = 'Magic Dust';
const RANGER_MATERIAL = 'Sharp Fang';

export type MarketCategory = 'potion' | 'buff' | 'gear' | 'material' | 'limited';
export type MarketStockType = 'unlimited' | 'daily' | 'mvp';

export type MarketEntry = {
  id: string;
  name: string;
  npc: string;
  category: MarketCategory;
  price: number;
  description: string;
  requiredLevel: number;
  stockType: MarketStockType;
  stock?: number;
  itemId?: string;
  material?: string;
  quantity?: number;
  consumableId?: string;
  effect?: {
    type: 'restore_hp' | 'restore_sp' | 'attack_buff' | 'magic_buff' | 'defense_buff' | 'speed_buff';
    amount: number;
    durationSeconds?: number;
    trigger?: string;
    cooldownSeconds?: number;
  };
};

export const MATERIAL_CATALOG = [
  { name: 'Basic Upgrade Stone', purpose: 'upgrades', market: true },
  { name: 'Iron Ore', purpose: 'Weapon and shield upgrades', market: true },
  { name: 'Tough Hide', purpose: 'Armor and helmet upgrades', market: true },
  { name: 'Magic Dust', purpose: 'Magic gear and accessory upgrades', market: true },
  { name: 'Sharp Fang', purpose: 'Ranger gear upgrades', market: false },
  { name: 'Slime Core', purpose: 'Beginner upgrades and boots', market: true },
  { name: 'Fire Fragment', purpose: 'Fire gear upgrades', market: false },
  { name: 'Frost Crystal', purpose: 'Ice gear upgrades', market: false },
  { name: 'Wind Feather', purpose: 'Ranger and Mage gear upgrades', market: false },
  { name: 'Boss Essence', purpose: 'High-level upgrades', market: false },
  { name: 'Safe Upgrade Stone', purpose: 'Prevents upgrade level loss on failure', market: 'limited' }
] as const;

export const MARKET_ITEMS: MarketEntry[] = [
  { id: 'small_hp_potion', name: 'Small HP Potion', npc: 'Potion Seller', category: 'potion', price: 25, description: 'Restores 50 HP during combat when HP drops below half.', requiredLevel: 1, stockType: 'unlimited', consumableId: 'small_hp_potion', quantity: 1, effect: { type: 'restore_hp', amount: 50, trigger: 'hp_below_50_percent', cooldownSeconds: 12 } },
  { id: 'small_sp_potion', name: 'Small SP Potion', npc: 'Potion Seller', category: 'potion', price: 30, description: 'Restores 35 SP during combat when SP is low.', requiredLevel: 1, stockType: 'unlimited', consumableId: 'small_sp_potion', quantity: 1, effect: { type: 'restore_sp', amount: 35, trigger: 'sp_below_35_percent', cooldownSeconds: 14 } },
  { id: 'recovery_bundle', name: 'Recovery Bundle', npc: 'Potion Seller', category: 'potion', price: 240, description: 'A discount pack of HP and SP potions.', requiredLevel: 1, stockType: 'unlimited', consumableId: 'recovery_bundle', quantity: 1, effect: { type: 'restore_hp', amount: 85, trigger: 'hp_below_45_percent', cooldownSeconds: 18 } },
  { id: 'attack_meal', name: 'Attack Meal', npc: 'Cook', category: 'buff', price: 120, description: 'Raises physical attack for the next farming session.', requiredLevel: 5, stockType: 'unlimited', consumableId: 'attack_meal', quantity: 1, effect: { type: 'attack_buff', amount: 0.12, durationSeconds: 900 } },
  { id: 'magic_tea', name: 'Magic Tea', npc: 'Cook', category: 'buff', price: 120, description: 'Raises magic attack for the next farming session.', requiredLevel: 5, stockType: 'unlimited', consumableId: 'magic_tea', quantity: 1, effect: { type: 'magic_buff', amount: 0.12, durationSeconds: 900 } },
  { id: 'guard_tonic', name: 'Guard Tonic', npc: 'Cook', category: 'buff', price: 110, description: 'Raises defense for the next farming session.', requiredLevel: 5, stockType: 'unlimited', consumableId: 'guard_tonic', quantity: 1, effect: { type: 'defense_buff', amount: 0.12, durationSeconds: 900 } },
  { id: 'swift_juice', name: 'Swift Juice', npc: 'Cook', category: 'buff', price: 110, description: 'Raises attack speed and flee for the next farming session.', requiredLevel: 5, stockType: 'unlimited', consumableId: 'swift_juice', quantity: 1, effect: { type: 'speed_buff', amount: 0.1, durationSeconds: 900 } },
  { id: 'market_iron_sword', name: 'Iron Sword', npc: 'Blacksmith', category: 'gear', price: 320, description: 'Starter Warrior weapon with good upgrade scaling.', requiredLevel: 8, stockType: 'unlimited', itemId: 'iron_sword' },
  { id: 'market_hunter_bow', name: 'Hunter Bow', npc: 'Blacksmith', category: 'gear', price: 360, description: 'Starter Ranger bow for accuracy and crit builds.', requiredLevel: 8, stockType: 'unlimited', itemId: 'hunter_bow' },
  { id: 'market_spell_book', name: 'Spell Book', npc: 'Blacksmith', category: 'gear', price: 330, description: 'Mage off-hand that improves spell uptime.', requiredLevel: 8, stockType: 'unlimited', itemId: 'spell_book' },
  { id: 'market_leather_vest', name: 'Leather Vest', npc: 'Blacksmith', category: 'gear', price: 260, description: 'Light defensive gear for early farming.', requiredLevel: 6, stockType: 'unlimited', itemId: 'leather_vest' },
  { id: 'mat_basic_up_stone', name: 'Basic Upgrade Stone', npc: 'Blacksmith', category: 'material', price: 45, description: 'Basic upgrade material.', requiredLevel: 1, stockType: 'unlimited', material: 'Basic Upgrade Stone', quantity: 1 },
  { id: 'mat_iron_ore', name: 'Iron Ore', npc: 'Blacksmith', category: 'material', price: 45, description: 'Basic weapon upgrade material.', requiredLevel: 1, stockType: 'unlimited', material: 'Iron Ore', quantity: 1 },
  { id: 'mat_tough_hide', name: 'Tough Hide', npc: 'Blacksmith', category: 'material', price: 45, description: 'Basic armor upgrade material.', requiredLevel: 1, stockType: 'unlimited', material: 'Tough Hide', quantity: 1 },
  { id: 'mat_magic_dust', name: 'Magic Dust', npc: 'Blacksmith', category: 'material', price: 55, description: 'Basic magic gear upgrade material.', requiredLevel: 1, stockType: 'unlimited', material: 'Magic Dust', quantity: 1 },
  { id: 'mat_slime_core', name: 'Slime Core', npc: 'Blacksmith', category: 'material', price: 30, description: 'Beginner upgrade material.', requiredLevel: 1, stockType: 'unlimited', material: 'Slime Core', quantity: 1 },
  { id: 'daily_discount_hide', name: 'Discount Tough Hide', npc: 'Traveling Merchant', category: 'limited', price: 25, description: 'Daily discounted armor material.', requiredLevel: 1, stockType: 'daily', stock: 8, material: 'Tough Hide', quantity: 1 },
  { id: 'daily_rare_meal', name: 'Rare Feast', npc: 'Traveling Merchant', category: 'limited', price: 350, description: 'A strong mixed buff for a serious farming push.', requiredLevel: 15, stockType: 'daily', stock: 2, consumableId: 'rare_feast', quantity: 1, effect: { type: 'attack_buff', amount: 0.18, durationSeconds: 900 } },
  { id: 'daily_safe_stone', name: 'Safe Upgrade Stone', npc: 'Traveling Merchant', category: 'limited', price: 900, description: 'Prevents upgrade level loss on one failed risky upgrade.', requiredLevel: 20, stockType: 'daily', stock: 1, material: 'Safe Upgrade Stone', quantity: 1 },
  { id: 'daily_class_gear', name: 'Class Gear Crate', npc: 'Traveling Merchant', category: 'limited', price: 780, description: 'A limited class-appropriate gear item.', requiredLevel: 16, stockType: 'daily', stock: 1, itemId: 'warrior_ring' }
];

export type UpgradePreview = {
  item: ItemDefinition;
  currentLevel: number;
  targetLevel: number;
  goldCost: number;
  materials: Record<string, number>;
  successChance: number;
  failure: string;
  currentStats: Partial<ItemDefinition>;
  nextStats: Partial<ItemDefinition>;
};

export type FarmingEstimate = {
  survival: string;
  deathRisk: number;
  expPerHour: number;
  jobExpPerHour: number;
  goldPerHour: number;
  killsPerHour: number;
  mvpSuccessChance: number;
  potionCostPerHour: number;
  recommendedStats: string[];
  tags: string[];
};

export function skillPointCost(currentLevel: number): number {
  return currentLevel >= 7 ? 3 : currentLevel >= 4 ? 2 : 1;
}

export function canLearnSkill(state: GameState, skill: SkillDefinition): boolean {
  const character = state.character;
  if (!character || skill.classId !== character.classId) return false;
  const current = character.skills[skill.id] ?? 0;
  return character.level >= skill.unlockLevel && current < skill.maxLevel && character.skillPoints >= skillPointCost(current);
}

export function spCostForSkill(state: GameState, skill: SkillDefinition, level: number): number {
  const manaControl = state.character?.skills.mana_control ?? 0;
  const reduction = Math.min(0.5, manaControl * 0.05);
  return Math.max(1, Math.ceil((skill.spCostBase + skill.spCostPerLevel * level) * (1 - reduction)));
}

export function learnedClassSkills(state: GameState): SkillDefinition[] {
  const character = state.character;
  if (!character) return [];
  return SKILLS.filter((skill) => skill.classId === character.classId && (character.skills[skill.id] ?? 0) > 0);
}

export function normalizeSkillLoadout(state: GameState): void {
  const character = state.character;
  if (!character) return;
  const valid = new Set(
    learnedClassSkills(state)
      .filter((skill) => skill.type === 'active' || skill.type === 'buff')
      .map((skill) => skill.id)
  );
  character.skillLoadout = character.skillLoadout.filter((id) => valid.has(id)).slice(0, 4);
  const candidates = SKILLS.filter((skill) => skill.classId === character.classId && (skill.type === 'active' || skill.type === 'buff') && (character.skills[skill.id] ?? 0) > 0);
  for (const skill of candidates) {
    if (character.skillLoadout.length >= 4) break;
    if (!character.skillLoadout.includes(skill.id)) character.skillLoadout.push(skill.id);
  }
}

export function toggleSkillLoadout(state: GameState, skillId: string): boolean {
  const character = state.character;
  const skill = SKILL_BY_ID[skillId];
  if (!character || !skill || (skill.type !== 'active' && skill.type !== 'buff') || (character.skills[skillId] ?? 0) <= 0) return false;
  const index = character.skillLoadout.indexOf(skillId);
  if (index >= 0) {
    character.skillLoadout.splice(index, 1);
    return true;
  }
  if (character.skillLoadout.length >= 4) return false;
  character.skillLoadout.push(skillId);
  return true;
}

export function getItemStats(item: ItemDefinition, upgradeLevel = 0): Partial<ItemDefinition> {
  const multiplier = UPGRADE_MULTIPLIERS[Math.max(0, Math.min(10, upgradeLevel))];
  const scaled: Partial<ItemDefinition> = {};
  for (const key of ['attack', 'magicAttack', 'defense', 'magicDefense', 'maxHp', 'maxSp', 'hit', 'flee', 'crit'] as const) {
    const value = item[key];
    if (typeof value === 'number') {
      const slotFactor = item.slot === 'accessory' || item.slot === 'boots' ? 0.7 : 1;
      scaled[key] = Math.round(value * (1 + (multiplier - 1) * slotFactor));
    }
  }
  return scaled;
}

export function getInstanceItem(instance: EquipmentInstance): ItemDefinition {
  return ITEM_BY_ID[instance.itemId];
}

export function effectiveItemScore(instance: EquipmentInstance): number {
  const item = getInstanceItem(instance);
  const stats = getItemStats(item, instance.upgradeLevel);
  return (stats.attack ?? 0) * 2 + (stats.magicAttack ?? 0) * 2 + (stats.defense ?? 0) * 1.5
    + (stats.magicDefense ?? 0) + (stats.maxHp ?? 0) * 0.12 + (stats.maxSp ?? 0) * 0.15
    + (stats.hit ?? 0) + (stats.flee ?? 0) + (stats.crit ?? 0) * 2;
}

export function statLinesForItem(item: ItemDefinition, upgradeLevel = 0): string[] {
  const stats = getItemStats(item, upgradeLevel);
  return ([
    ['Attack', stats.attack],
    ['Magic Attack', stats.magicAttack],
    ['Defense', stats.defense],
    ['Magic Defense', stats.magicDefense],
    ['HP', stats.maxHp],
    ['SP', stats.maxSp],
    ['Hit', stats.hit],
    ['Flee', stats.flee],
    ['Crit', stats.crit]
  ] as const)
    .filter(([, value]) => typeof value === 'number' && value !== 0)
    .map(([label, value]) => `${label} ${value! > 0 ? '+' : ''}${value}`);
}

export function mainUpgradeMaterial(item: ItemDefinition): string {
  if (item.classId === 'mage') return MAGE_MATERIAL;
  if (item.classId === 'ranger') return RANGER_MATERIAL;
  return SLOT_MATERIAL[item.slot];
}

export function getUpgradePreview(instance: EquipmentInstance): UpgradePreview | null {
  const item = getInstanceItem(instance);
  if (!item || instance.upgradeLevel >= 10) return null;
  const currentLevel = instance.upgradeLevel;
  const targetLevel = currentLevel + 1;
  const materialCost = 1 + Math.floor(currentLevel / 2);
  const materials: Record<string, number> = {
    [mainUpgradeMaterial(item)]: materialCost,
    'Basic Upgrade Stone': Math.max(1, Math.ceil(targetLevel / 3))
  };
  if (targetLevel >= 8) materials['Boss Essence'] = 1;
  const slotMultiplier = item.slot === 'weapon' ? 1.15 : item.slot === 'accessory' ? 0.9 : 1;
  const goldCost = Math.floor(item.level * RARITY_MULTIPLIER[item.rarity] * targetLevel ** 2 * 10 * slotMultiplier);
  const failure = targetLevel <= 2 ? 'None'
    : targetLevel <= 5 ? 'Materials lost'
      : targetLevel === 6 ? 'Materials and gold lost'
        : targetLevel <= 8 ? 'Item drops 1 level'
          : targetLevel === 9 ? 'Item drops 1-2 levels'
            : 'Item drops 2 levels';
  return {
    item,
    currentLevel,
    targetLevel,
    goldCost,
    materials,
    successChance: UPGRADE_SUCCESS[targetLevel],
    failure,
    currentStats: getItemStats(item, currentLevel),
    nextStats: getItemStats(item, targetLevel)
  };
}

export function canPayMaterials(state: GameState, materials: Record<string, number>, useSafeStone: boolean): boolean {
  for (const [name, amount] of Object.entries(materials)) {
    if ((state.materials[name] ?? 0) < amount) return false;
  }
  return !useSafeStone || (state.materials['Safe Upgrade Stone'] ?? 0) > 0;
}

export function attemptGearUpgrade(state: GameState, uid: string, useSafeStone: boolean, random: () => number = Math.random): string {
  const instance = state.inventory.find((entry) => entry.uid === uid);
  if (!instance) return 'Item not found.';
  const preview = getUpgradePreview(instance);
  if (!preview) return 'This item is already +10.';
  if (state.gold < preview.goldCost) return 'Not enough gold.';
  if (!canPayMaterials(state, preview.materials, useSafeStone)) return 'Missing upgrade materials.';

  state.gold -= preview.goldCost;
  for (const [name, amount] of Object.entries(preview.materials)) {
    state.materials[name] = Math.max(0, (state.materials[name] ?? 0) - amount);
  }
  if (useSafeStone) state.materials['Safe Upgrade Stone'] = Math.max(0, (state.materials['Safe Upgrade Stone'] ?? 0) - 1);

  const from = instance.upgradeLevel;
  const success = random() <= preview.successChance;
  if (success) {
    instance.upgradeLevel = preview.targetLevel;
  } else if (!useSafeStone && preview.targetLevel >= 7) {
    const loss = preview.targetLevel >= 10 ? 2 : preview.targetLevel >= 9 ? (random() < 0.5 ? 1 : 2) : 1;
    instance.upgradeLevel = Math.max(0, instance.upgradeLevel - loss);
  }

  instance.upgradeHistory.push({
    from,
    to: instance.upgradeLevel,
    success,
    goldSpent: preview.goldCost,
    materialsSpent: preview.materials,
    protected: useSafeStone
  });
  return success
    ? `${preview.item.name} upgraded to +${instance.upgradeLevel}.`
    : useSafeStone
      ? `${preview.item.name} upgrade failed, but the Safe Upgrade Stone prevented level loss.`
      : `${preview.item.name} upgrade failed. ${preview.failure}.`;
}

export function normalizeMarketStock(state: GameState): void {
  const today = new Date().toISOString().slice(0, 10);
  if (state.marketDayKey !== today) {
    state.marketDayKey = today;
    state.marketStock = {};
  }
  for (const entry of MARKET_ITEMS) {
    if (entry.stockType !== 'unlimited' && state.marketStock[entry.id] === undefined) {
      state.marketStock[entry.id] = entry.stock ?? 0;
    }
  }
}

export function buyMarketItem(state: GameState, entryId: string): string {
  normalizeMarketStock(state);
  const character = state.character;
  const entry = MARKET_ITEMS.find((item) => item.id === entryId);
  if (!character || !entry) return 'Item is unavailable.';
  if (character.level < entry.requiredLevel) return `Requires base level ${entry.requiredLevel}.`;
  if (entry.stockType !== 'unlimited' && (state.marketStock[entry.id] ?? 0) <= 0) return 'Out of stock.';
  if (state.gold < entry.price) return 'Not enough gold.';

  state.gold -= entry.price;
  if (entry.stockType !== 'unlimited') state.marketStock[entry.id] = Math.max(0, (state.marketStock[entry.id] ?? 0) - 1);

  if (entry.itemId) {
    let itemId = entry.itemId;
    if (entry.id === 'daily_class_gear') {
      itemId = character.classId === 'warrior' ? 'warrior_ring' : character.classId === 'ranger' ? 'falcon_ring' : 'arcane_ring';
    }
    state.inventory.push(createEquipmentInstance(itemId, 'market'));
    return `Bought ${ITEM_BY_ID[itemId].name}.`;
  }
  if (entry.material) {
    state.materials[entry.material] = (state.materials[entry.material] ?? 0) + (entry.quantity ?? 1);
    return `Bought ${entry.material} x${entry.quantity ?? 1}.`;
  }
  if (entry.consumableId) {
    state.consumables[entry.consumableId] = (state.consumables[entry.consumableId] ?? 0) + (entry.quantity ?? 1);
    return `Bought ${entry.name}.`;
  }
  return `Bought ${entry.name}.`;
}

export function activateConsumable(state: GameState, consumableId: string): string {
  const entry = MARKET_ITEMS.find((item) => item.consumableId === consumableId);
  if (!entry || !entry.effect || (state.consumables[consumableId] ?? 0) <= 0) return 'Consumable unavailable.';
  state.consumables[consumableId] -= 1;
  if (entry.effect.type === 'restore_hp' || entry.effect.type === 'restore_sp') return `${entry.name} will trigger automatically in combat.`;
  state.activeBuffs[consumableId] = entry.effect.durationSeconds ?? 900;
  return `${entry.name} active for ${Math.floor((entry.effect.durationSeconds ?? 900) / 60)} minutes.`;
}

export function tickBuffs(state: GameState, seconds: number): void {
  for (const [id, remaining] of Object.entries(state.activeBuffs)) {
    const next = remaining - seconds;
    if (next <= 0) delete state.activeBuffs[id];
    else state.activeBuffs[id] = next;
  }
}

export function triggerAutoConsumables(state: GameState, maxHp = 1, maxSp = 1): string | null {
  const character = state.character;
  if (!character) return null;
  let message: string | null = null;
  for (const entry of MARKET_ITEMS) {
    if (!entry.effect || !entry.consumableId || (state.consumables[entry.consumableId] ?? 0) <= 0) continue;
    if (entry.effect.type === 'restore_hp' && character.hp < maxHp * 0.5) {
      state.consumables[entry.consumableId] -= 1;
      character.hp += entry.effect.amount;
      message = `${entry.name} restored ${entry.effect.amount} HP.`;
      break;
    }
    if (entry.effect.type === 'restore_sp' && character.sp < maxSp * 0.35) {
      state.consumables[entry.consumableId] -= 1;
      character.sp += entry.effect.amount;
      message = `${entry.name} restored ${entry.effect.amount} SP.`;
      break;
    }
  }
  return message;
}

export function materialSources(material: string): string[] {
  const sources = new Set<string>();
  for (const map of MAPS) {
    for (const enemyId of [...map.monsters, map.mvp]) {
      const enemy = MONSTER_BY_ID[enemyId];
      if (!enemy) continue;
      if (enemy.material === material || enemy.rareEquipment.includes(material.toLowerCase().replaceAll(' ', '_'))) sources.add(`${map.name}: ${enemy.name}`);
    }
  }
  for (const entry of MARKET_ITEMS) {
    if (entry.material === material) sources.add(`${entry.npc}: ${entry.name}`);
  }
  return [...sources];
}

export function itemSources(itemId: string): string[] {
  const item = ITEM_BY_ID[itemId];
  if (!item) return [];
  const sources = new Set(item.sources);
  for (const map of MAPS) {
    for (const enemyId of [...map.monsters, map.mvp]) {
      const enemy = MONSTER_BY_ID[enemyId];
      if (enemy?.equipment.includes(itemId) || enemy?.rareEquipment.includes(itemId)) sources.add(`${map.name}: ${enemy.name}`);
    }
  }
  return [...sources];
}

export function dropsForMap(map: MapDefinition): { common: string[]; equipment: string[]; rare: string[]; cards: string[]; mvp: string[] } {
  const common = new Set<string>();
  const equipment = new Set<string>();
  const rare = new Set<string>();
  const cards = new Set<string>();
  const mvp = new Set<string>();
  for (const enemyId of map.monsters) {
    const enemy = MONSTER_BY_ID[enemyId];
    common.add(enemy.material);
    enemy.equipment.forEach((id) => equipment.add(ITEM_BY_ID[id]?.name ?? id));
    enemy.rareEquipment.forEach((id) => rare.add(ITEM_BY_ID[id]?.name ?? id));
    cards.add(enemy.card);
  }
  const boss = MONSTER_BY_ID[map.mvp];
  if (boss) {
    mvp.add(boss.material);
    boss.equipment.forEach((id) => mvp.add(ITEM_BY_ID[id]?.name ?? id));
    boss.rareEquipment.forEach((id) => mvp.add(ITEM_BY_ID[id]?.name ?? id));
    mvp.add(boss.card);
  }
  return { common: [...common], equipment: [...equipment], rare: [...rare], cards: [...cards], mvp: [...mvp] };
}

export function findDropTargets(query: string): { label: string; map: MapDefinition; enemy: MonsterDefinition; reason: string }[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  const results: { label: string; map: MapDefinition; enemy: MonsterDefinition; reason: string }[] = [];
  for (const map of MAPS) {
    for (const enemyId of [...map.monsters, map.mvp]) {
      const enemy = MONSTER_BY_ID[enemyId];
      const names = [enemy.material, enemy.card, ...enemy.equipment.map((id) => ITEM_BY_ID[id]?.name ?? id), ...enemy.rareEquipment.map((id) => ITEM_BY_ID[id]?.name ?? id)];
      for (const name of names) {
        if (name.toLowerCase().includes(normalized)) {
          const rate = enemy.boss ? 'MVP source' : enemy.encounterWeight >= 30 ? 'common source' : enemy.encounterWeight >= 20 ? 'normal source' : 'uncommon source';
          results.push({ label: name, map, enemy, reason: `${enemy.name} is a ${rate} on ${map.name}.` });
        }
      }
    }
  }
  return results.slice(0, 12);
}

export function estimateMap(state: GameState, mapId: string, stats: { maxHp: number; attack: number; magicAttack: number; defense: number; magicDefense: number; hit: number; flee: number; crit: number; attackInterval: number }): FarmingEstimate {
  const map = MAP_BY_ID[mapId];
  const enemies = map.monsters.map((id) => MONSTER_BY_ID[id]);
  const avgHp = enemies.reduce((sum, enemy) => sum + enemy.hp, 0) / enemies.length;
  const avgDefense = enemies.reduce((sum, enemy) => sum + enemy.defense, 0) / enemies.length;
  const avgAttack = enemies.reduce((sum, enemy) => sum + enemy.attack, 0) / enemies.length;
  const avgExp = enemies.reduce((sum, enemy) => sum + enemy.exp, 0) / enemies.length;
  const avgJobExp = enemies.reduce((sum, enemy) => sum + enemy.jobExp, 0) / enemies.length;
  const avgGold = enemies.reduce((sum, enemy) => sum + (enemy.goldMin + enemy.goldMax) / 2, 0) / enemies.length;
  const offensive = state.character?.classId === 'mage' ? stats.magicAttack : stats.attack;
  const dps = Math.max(1, offensive * (100 / (100 + avgDefense)) * (1 + stats.crit / 220) / stats.attackInterval);
  const killTime = Math.max(1.4, avgHp / dps + 0.45);
  const incomingDps = avgAttack * (100 / (100 + stats.defense)) / 1.55;
  const sustain = stats.maxHp / Math.max(1, incomingDps * killTime * 4);
  const survival = sustain > 2.2 ? 'Excellent' : sustain > 1.35 ? 'Good' : sustain > 0.8 ? 'Risky' : 'Deadly';
  const survivalFactor = survival === 'Excellent' ? 1 : survival === 'Good' ? 0.95 : survival === 'Risky' ? 0.72 : 0.38;
  const killsPerHour = Math.floor((3600 / killTime) * survivalFactor);
  const deathRisk = survival === 'Excellent' ? 1 : survival === 'Good' ? 6 : survival === 'Risky' ? 18 : 45;
  const boss = MONSTER_BY_ID[map.mvp];
  const mvpDpsWindow = dps * 55;
  const mvpSurvival = stats.maxHp / Math.max(1, boss.attack * (100 / (100 + stats.defense)) * 14);
  const mvpSuccessChance = Math.max(2, Math.min(95, Math.floor((mvpDpsWindow / boss.hp) * 55 + mvpSurvival * 22)));
  const potionCostPerHour = Math.floor(deathRisk * 8 + Math.max(0, incomingDps - stats.maxHp / 90) * 10);
  const recommendedStats: AttributeKey[] = deathRisk > 12 ? ['vit', 'dex'] : state.character?.classId === 'mage' ? ['int', 'dex'] : state.character?.classId === 'ranger' ? ['dex', 'agi'] : ['str', 'vit'];
  const tags = [
    survival === 'Excellent' || survival === 'Good' ? 'Safe' : 'Risky',
    avgExp * killsPerHour > 18000 ? 'Good EXP' : '',
    avgGold * killsPerHour > 6500 ? 'Good Gold' : '',
    dropsForMap(map).cards.length > 0 ? 'Card Farm' : '',
    dropsForMap(map).equipment.length > 0 ? 'Gear Farm' : '',
    mvpSuccessChance >= 60 ? 'MVP Ready' : 'Avoid MVP',
    potionCostPerHour > 250 ? 'Potion Heavy' : '',
    state.character?.classId === 'mage' && map.element === 'fire' && (state.character.skills.fire_bolt ?? 0) > (state.character.skills.frost_bolt ?? 0) ? 'Bad Element Matchup' : ''
  ].filter(Boolean);
  return {
    survival,
    deathRisk,
    expPerHour: Math.floor(avgExp * killsPerHour),
    jobExpPerHour: Math.floor(avgJobExp * killsPerHour),
    goldPerHour: Math.floor(avgGold * killsPerHour),
    killsPerHour,
    mvpSuccessChance,
    potionCostPerHour,
    recommendedStats: recommendedStats.map((stat) => stat.toUpperCase()),
    tags
  };
}

export function equipmentCompareSummary(current: EquipmentInstance | null, candidate: EquipmentInstance): { scoreDelta: number; lines: string[] } {
  const currentScore = current ? effectiveItemScore(current) : 0;
  const nextScore = effectiveItemScore(candidate);
  const currentStats = current ? getItemStats(getInstanceItem(current), current.upgradeLevel) : {};
  const nextStats = getItemStats(getInstanceItem(candidate), candidate.upgradeLevel);
  const lines = (['attack', 'magicAttack', 'defense', 'magicDefense', 'maxHp', 'maxSp', 'hit', 'flee', 'crit'] as const)
    .map((key) => {
      const before = Number(currentStats[key] ?? 0);
      const after = Number(nextStats[key] ?? 0);
      const diff = after - before;
      if (diff === 0) return '';
      const label = key === 'maxHp' ? 'HP' : key === 'maxSp' ? 'SP' : key.replace(/[A-Z]/g, (letter) => ` ${letter}`).replace(/^./, (letter) => letter.toUpperCase());
      return `${label}: ${before} -> ${after} (${diff > 0 ? '+' : ''}${diff})`;
    })
    .filter(Boolean);
  return { scoreDelta: nextScore - currentScore, lines };
}

export function allTargetNames(): string[] {
  const names = new Set<string>();
  ITEMS.forEach((item) => names.add(item.name));
  MATERIAL_CATALOG.forEach((material) => names.add(material.name));
  Object.values(MONSTER_BY_ID).forEach((enemy) => names.add(enemy.card));
  return [...names].sort();
}
