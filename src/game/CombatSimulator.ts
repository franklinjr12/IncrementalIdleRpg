import {
  ITEM_BY_ID,
  MAP_BY_ID,
  MONSTER_BY_ID,
  SKILL_BY_ID,
  type Element,
  type CombatState,
  type GameState,
  type MonsterDefinition
} from './GameState';
import { addExperience, getDerivedStats, pushLog } from './Economy';
import { normalizeMarketStock, normalizeSkillLoadout, spCostForSkill, tickBuffs, triggerAutoConsumables } from './AlphaSystems';

const ELEMENT_DAMAGE: Record<Element, Partial<Record<Element, number>>> = {
  neutral: {},
  fire: { earth: 1.35, water: 0.75, fire: 0.8 },
  water: { fire: 1.35, earth: 0.8, water: 0.8 },
  earth: { wind: 1.35, fire: 0.8, earth: 0.8 },
  wind: { water: 1.35, earth: 0.75, wind: 0.8 },
  dark: { dark: 0.8, holy: 0.75 },
  holy: { dark: 1.35, holy: 0.8 }
};

function elementModifier(attacking: Element, defending: Element): number {
  return ELEMENT_DAMAGE[attacking][defending] ?? 1;
}

function hitChance(hit: number, flee: number): number {
  return Math.max(0.05, Math.min(0.95, 0.75 + (hit - flee) * 0.005));
}

function diagnose(state: GameState): string {
  const report = state.currentSession;
  if (report.deaths > 0) return 'Frequent deaths: add VIT, defense, or farm an easier map.';
  if (report.attacks > 10 && report.misses / report.attacks > 0.22) return 'Low hit chance: add DEX or accuracy equipment.';
  if (state.character && state.character.sp < getDerivedStats(state).maxSp * 0.12) return 'SP starvation: add INT or improve Mana Control.';
  if (report.mvpAttempts > report.mvpKills) return 'MVP wall: improve damage, defense, and elemental matchups.';
  if (report.duration > 60 && report.kills / report.duration < 0.12) return 'Low DPS: upgrade your weapon or offensive attributes.';
  return 'Build is stable. A harder map may improve rewards.';
}

export function startFarming(state: GameState): void {
  if (!state.character) return;
  const stats = getDerivedStats(state);
  if (state.character.hp <= 0) state.character.hp = stats.maxHp;
  if (state.character.sp <= 0) state.character.sp = stats.maxSp;
  state.farming = true;
  state.currentSession.startedAt = Date.now();
  pushLog(state, `Farming ${MAP_BY_ID[state.currentMapId].name}.`);
}

export function stopFarming(state: GameState, reason = 'Farming stopped.'): void {
  state.farming = false;
  state.combat = null;
  state.currentSession.diagnosis = diagnose(state);
  if (state.currentSession.duration > 0) {
    state.lastReport = { ...state.currentSession, items: [...state.currentSession.items], cards: [...state.currentSession.cards] };
  }
  pushLog(state, reason);
}

function spawnEnemy(state: GameState, random: () => number): void {
  const map = MAP_BY_ID[state.currentMapId];
  const progress = state.mapProgress[map.id];
  const mvpReady = progress.killsSinceMvp >= map.mvpThreshold;
  const isMvp = mvpReady && state.autoMvp;
  let enemyId = map.monsters[0];
  if (isMvp) {
    enemyId = map.mvp;
  } else {
    const weighted = map.monsters.map((id) => MONSTER_BY_ID[id]);
    const totalWeight = weighted.reduce((sum, enemy) => sum + enemy.encounterWeight, 0);
    let roll = random() * totalWeight;
    for (const enemy of weighted) {
      roll -= enemy.encounterWeight;
      if (roll <= 0) {
        enemyId = enemy.id;
        break;
      }
    }
  }
  const enemy = MONSTER_BY_ID[enemyId];
  if (isMvp) {
    progress.killsSinceMvp = 0;
    state.currentSession.mvpAttempts += 1;
    const trapLevel = state.character?.skills.trap_preparation ?? 0;
    if (trapLevel > 0) {
      const stats = getDerivedStats(state);
      const trapDamage = Math.floor(stats.attack * (1.5 + trapLevel * 0.5));
      pushLog(state, `Traps opened for ${trapDamage} damage.`);
    }
    pushLog(state, `MVP warning: ${enemy.name} appeared!`);
  }
  state.combat = { enemyId, enemyHp: enemy.hp, playerTimer: 0, enemyTimer: 0.35, elapsed: 0, isMvp, skillCooldowns: {}, enemyDebuffs: {}, nextEnemyProgress: 0 };
  const progressDrops = state.mapProgress[map.id];
  if (!progressDrops.knownEnemies.includes(enemy.id)) progressDrops.knownEnemies.push(enemy.id);
  if (!progressDrops.knownDrops.includes(enemy.material)) progressDrops.knownDrops.push(enemy.material);
  if (isMvp && (state.character?.skills.trap_preparation ?? 0) > 0 && state.combat) {
    const level = state.character!.skills.trap_preparation;
    state.combat.enemyHp = Math.max(1, state.combat.enemyHp - Math.floor(getDerivedStats(state).attack * (1.5 + level * 0.5)));
    state.combat.enemyDebuffs.trap_slow = 10;
  }
}

function choosePlayerAttack(state: GameState, enemy: MonsterDefinition, random: () => number) {
  const character = state.character!;
  const stats = getDerivedStats(state);
  const combat = state.combat!;
  normalizeSkillLoadout(state);
  const loadoutSkills = character.skillLoadout
    .map((id) => SKILL_BY_ID[id])
    .filter((skill) => skill && (skill.type === 'active' || skill.type === 'buff') && (character.skills[skill.id] ?? 0) > 0);
  const skill = loadoutSkills.find((entry) => {
    const level = character.skills[entry.id] ?? 0;
    return (combat.skillCooldowns[entry.id] ?? 0) <= 0 && character.sp >= spCostForSkill(state, entry, level);
  });
  const skillLevel = skill ? character.skills[skill.id] : 0;

  if (skill && skill.type === 'buff') {
    const spCost = spCostForSkill(state, skill, skillLevel);
    character.sp -= spCost;
    state.activeBuffs[skill.id] = skill.durationSeconds;
    combat.skillCooldowns[skill.id] = skill.cooldownSeconds;
    return { damage: 0, label: skill.name, skillId: skill.id };
  }

  const trigger = Boolean(skill && skill.type === 'active');
  const isMagic = skill?.damageType === 'magical';
  const isRanged = skill?.damageType === 'ranged';
  const multiplier = trigger ? (skill?.powerBase ?? 1) + skillLevel * (skill?.powerPerLevel ?? 0) : 1;
  let element = trigger ? (skill?.element ?? 'neutral') : 'neutral';
  if (skill?.id === 'elemental_burst') {
    const candidates: Element[] = ['fire', 'water', 'wind', 'earth', 'neutral'];
    element = candidates.sort((a, b) => elementModifier(b, enemy.element) - elementModifier(a, enemy.element))[0];
  }
  if (trigger && skill) {
    character.sp -= spCostForSkill(state, skill, skillLevel);
    combat.skillCooldowns[skill.id] = skill.cooldownSeconds;
  }

  state.currentSession.attacks += 1;
  if (random() > hitChance(stats.hit, enemy.flee)) {
    state.currentSession.misses += 1;
    return { damage: 0, label: 'Miss', skillId: skill?.id };
  }

  const raw = (isMagic ? stats.magicAttack : stats.attack) * multiplier;
  const ignore = trigger && skill?.defenseIgnore ? skill.defenseIgnore + skillLevel * 0.03 : 0;
  const armorBreak = combat.enemyDebuffs.armor_breaker ? 1 - (0.05 + (character.skills.armor_breaker ?? 0) * 0.02) : 1;
  const defense = (isMagic ? enemy.magicDefense : enemy.defense) * Math.max(0.1, armorBreak) * (1 - ignore);
  const criticalDamage = 1.5 + (character.skills.critical_focus ?? 0) * 0.03 + Math.floor(character.attributes.luk / 20) * 0.01;
  const critical = !isMagic && random() < stats.crit / 100;
  const marked = combat.enemyDebuffs.weak_point_mark ? 1 + 0.05 + (character.skills.weak_point_mark ?? 0) * 0.01 : 1;
  const mvpBonus = combat.isMvp
    ? 1 + (character.skills.boss_mark ?? 0) * 0.016 + (character.skills.mvp_ward ?? 0) * 0.012
    : 1;
  const damage = Math.max(1, Math.floor(raw * (100 / (100 + defense)) * elementModifier(element, enemy.element) * (critical ? criticalDamage : 1) * marked * mvpBonus));
  if (trigger && skill?.splashProgress) combat.nextEnemyProgress += damage * skill.splashProgress;
  if (trigger && skill?.defenseReduction) combat.enemyDebuffs.armor_breaker = skill.durationSeconds;
  if (!trigger && character.skills.weak_point_mark && random() < 0.04 + character.skills.weak_point_mark * 0.012) {
    combat.enemyDebuffs.weak_point_mark = 6;
  }
  let totalDamage = damage;
  if (isMagic && character.skills.spell_echo && random() < 0.06 + character.skills.spell_echo * 0.012) {
    const echo = Math.floor(damage * 0.35);
    totalDamage += echo;
  }
  return { damage: totalDamage, label: trigger ? skill!.name : critical ? 'Critical' : isRanged ? 'Shot' : 'Attack', skillId: skill?.id };
}

function enemyAttack(state: GameState, enemy: MonsterDefinition, random: () => number): number {
  const stats = getDerivedStats(state);
  if (random() > hitChance(enemy.hit, stats.flee)) return 0;
  const burst = enemy.boss && random() < 0.16 ? 1.75 : 1;
  const character = state.character!;
  const shieldReduction = character.skills.shield_guard && Object.values(state.equipment).some((uid) => {
    const instance = state.inventory.find((entry) => entry.uid === uid);
    return instance ? ITEM_BY_ID[instance.itemId]?.slot === 'offhand' : false;
  }) ? 1 - (0.02 + character.skills.shield_guard * 0.012) : 1;
  const barrierReduction = state.activeBuffs.magic_barrier ? 1 - (0.08 + (character.skills.magic_barrier ?? 0) * 0.014) : 1;
  const mvpReduction = enemy.boss
    ? 1 - (character.skills.mvp_guard ?? 0) * 0.015 - (character.skills.mvp_ward ?? 0) * 0.012
    : 1;
  const lowHpReduction = character.hp < stats.maxHp * 0.3 ? 1 - (character.skills.last_stand ?? 0) * 0.03 : 1;
  return Math.max(1, Math.floor(enemy.attack * burst * (100 / (100 + stats.defense)) * shieldReduction * barrierReduction * mvpReduction * lowHpReduction));
}

function rewardKill(state: GameState, enemy: MonsterDefinition, random: () => number): void {
  const character = state.character!;
  const map = MAP_BY_ID[state.currentMapId];
  const progress = state.mapProgress[map.id];
  const rareRelativeBonus = 1 + (character.skills.hunters_instinct ?? 0) * 0.005 + character.attributes.luk * 0.0005;
  const exp = Math.floor(enemy.exp * (1 + Math.min(0.12, progress.kills / 4000)));
  const jobExp = enemy.jobExp;
  const gold = Math.floor(enemy.goldMin + random() * Math.max(1, enemy.goldMax - enemy.goldMin));

  addExperience(state, exp, jobExp);
  const stats = getDerivedStats(state);
  state.gold += gold;
  state.currentSession.gold += gold;
  state.currentSession.kills += 1;
  progress.kills += 1;
  if (!enemy.boss) progress.killsSinceMvp += 1;

  state.materials[enemy.material] = (state.materials[enemy.material] ?? 0) + 1;
  state.currentSession.materials[enemy.material] = (state.currentSession.materials[enemy.material] ?? 0) + 1;
  if (!progress.knownDrops.includes(enemy.material)) progress.knownDrops.push(enemy.material);

  const allEquipment = [...enemy.equipment, ...enemy.rareEquipment];
  const equipmentChance = (enemy.boss ? 0.7 : 0.025) * rareRelativeBonus;
  if (allEquipment.length > 0 && random() < equipmentChance) {
    const itemId = allEquipment[Math.floor(random() * allEquipment.length)];
    const item = ITEM_BY_ID[itemId];
    if (item) {
      state.inventory.push({ uid: `${Date.now()}-${Math.floor(random() * 1e9)}`, itemId, foundAt: Date.now(), upgradeLevel: 0, locked: false, upgradeHistory: [] });
      state.currentSession.items.push(item.name);
      if (!progress.knownDrops.includes(item.name)) progress.knownDrops.push(item.name);
      pushLog(state, `${item.rarity.toUpperCase()} DROP: ${item.name}`);
    } else if (itemId === 'safe_upgrade_stone') {
      state.materials['Safe Upgrade Stone'] = (state.materials['Safe Upgrade Stone'] ?? 0) + 1;
      pushLog(state, 'MVP DROP: Safe Upgrade Stone');
    }
  }

  const cardChance = (enemy.boss ? 0.025 : 0.001) * (1 + (character.skills.hunters_instinct ?? 0) * 0.002);
  if (random() < cardChance) {
    state.cards.push(enemy.card);
    state.currentSession.cards.push(enemy.card);
    if (!progress.discoveredCards.includes(enemy.card)) progress.discoveredCards.push(enemy.card);
    pushLog(state, `CARD DROP: ${enemy.card}`);
  }
  if (character.skills.blood_recovery) {
    const restored = stats.maxHp * (0.003 + character.skills.blood_recovery * 0.0015 + Math.floor(character.attributes.str / 25) * 0.001);
    character.hp = Math.min(stats.maxHp, character.hp + restored);
  }
  if (character.skills.arcane_recovery) {
    character.sp = Math.min(stats.maxSp, character.sp + stats.maxSp * (0.004 + character.skills.arcane_recovery * 0.002));
  }
  if (character.skills.berserker_rhythm) {
    state.activeBuffs.berserker_rhythm = 20;
  }

  if (enemy.boss) {
    progress.mvpKills += 1;
    progress.bestMvpResult = 'defeated';
    state.currentSession.mvpKills += 1;
    normalizeMarketStock(state);
    for (const entry of Object.keys(state.marketStock)) {
      if (entry.includes('daily_safe')) state.marketStock[entry] = Math.max(state.marketStock[entry], 1);
    }
    pushLog(state, `MVP defeated: ${enemy.name}!`);
  } else {
    pushLog(state, `${enemy.name} defeated. +${exp} EXP, +${gold} gold.`);
  }
}

function handleDeath(state: GameState, enemy: MonsterDefinition): void {
  const map = MAP_BY_ID[state.currentMapId];
  state.mapProgress[map.id].deaths += 1;
  state.mapProgress[map.id].bestMvpResult = enemy.boss ? 'failed' : state.mapProgress[map.id].bestMvpResult;
  state.currentSession.deaths += 1;
  state.currentSession.diagnosis = enemy.boss
    ? `MVP burst was too high. Add VIT and defense before fighting ${enemy.name}.`
    : 'Your HP and defense were too low for this map.';
  state.lastReport = { ...state.currentSession };
  state.farming = false;
  state.combat = null;
  pushLog(state, `${enemy.name} defeated you. No items were lost.`);
}

export function advanceCombat(state: GameState, seconds: number, random: () => number = Math.random): void {
  if (!state.farming || !state.character || seconds <= 0) return;
  const character = state.character;
  const stats = getDerivedStats(state);
  character.hp = Math.min(stats.maxHp, character.hp + stats.hpRegen * seconds);
  character.sp = Math.min(stats.maxSp, character.sp + stats.spRegen * seconds);
  tickBuffs(state, seconds);
  state.currentSession.duration += seconds;

  if (!state.combat) spawnEnemy(state, random);
  const combat = state.combat;
  if (!combat) return;
  const enemy = MONSTER_BY_ID[combat.enemyId];
  combat.elapsed += seconds;
  combat.playerTimer -= seconds;
  combat.enemyTimer -= seconds;
  for (const [id, remaining] of Object.entries(combat.skillCooldowns)) {
    combat.skillCooldowns[id] = Math.max(0, remaining - seconds);
  }
  for (const [id, remaining] of Object.entries(combat.enemyDebuffs)) {
    const next = remaining - seconds;
    if (next <= 0) delete combat.enemyDebuffs[id];
    else combat.enemyDebuffs[id] = next;
  }

  while (combat.playerTimer <= 0 && combat.enemyHp > 0) {
    const result = choosePlayerAttack(state, enemy, random);
    combat.enemyHp -= result.damage;
    state.currentSession.damageDealt += result.damage;
    combat.playerTimer += stats.attackInterval;
    if (result.damage > 0 && combat.elapsed < 1.5) pushLog(state, `${result.label}: ${result.damage} damage.`);
  }

  if (combat.enemyHp <= 0) {
    const splashProgress = combat.nextEnemyProgress;
    rewardKill(state, enemy, random);
    state.combat = null;
    if (state.farming && splashProgress > 0) {
      spawnEnemy(state, random);
      const nextCombat = state.combat as CombatState | null;
      if (nextCombat && !nextCombat.isMvp) {
        const nextEnemy = MONSTER_BY_ID[nextCombat.enemyId];
        nextCombat.enemyHp = Math.max(1, nextEnemy.hp - Math.floor(splashProgress));
      }
    }
    return;
  }

  const slow = combat.enemyDebuffs.trap_slow ? 1 + (character.skills.trap_preparation ?? 0) * 0.02 + 0.04 : 1;
  const enemyInterval = Math.max(0.65, 1.65 - enemy.level * 0.008) * slow;
  while (combat.enemyTimer <= 0 && character.hp > 0) {
    const damage = enemyAttack(state, enemy, random);
    character.hp -= damage;
    state.currentSession.damageTaken += damage;
    if (damage > 0 && character.skills.counter_stance && random() < Math.min(0.29, 0.04 + character.skills.counter_stance * 0.015 + Math.floor(character.attributes.agi / 20) * 0.01)) {
      const counterDamage = Math.floor(getDerivedStats(state).attack * 0.75);
      combat.enemyHp -= counterDamage;
      state.currentSession.damageDealt += counterDamage;
    }
    const currentStats = getDerivedStats(state);
    const potionLog = triggerAutoConsumables(state, currentStats.maxHp, currentStats.maxSp);
    if (potionLog) pushLog(state, potionLog);
    combat.enemyTimer += enemyInterval;
  }

  if (character.hp <= 0) {
    character.hp = 0;
    handleDeath(state, enemy);
  }
}

export function estimateSurvival(state: GameState, mapId: string): string {
  if (!state.character) return 'Unknown';
  const stats = getDerivedStats(state);
  const map = MAP_BY_ID[mapId];
  const averageAttack = map.monsters.reduce((sum, id) => sum + MONSTER_BY_ID[id].attack, 0) / map.monsters.length;
  const incoming = averageAttack * (100 / (100 + stats.defense));
  const ratio = stats.maxHp / Math.max(1, incoming * 8);
  if (ratio > 2.2) return 'Excellent';
  if (ratio > 1.35) return 'Good';
  if (ratio > 0.8) return 'Risky';
  return 'Deadly';
}

export function refreshSessionRates(state: GameState): void {
  const report = state.currentSession;
  const hours = report.duration / 3600;
  if (hours <= 0.002) return;
  const progress = state.mapProgress[report.mapId];
  progress.bestExpPerHour = Math.max(progress.bestExpPerHour, report.exp / hours);
  progress.bestGoldPerHour = Math.max(progress.bestGoldPerHour, report.gold / hours);
  report.diagnosis = diagnose(state);
}
