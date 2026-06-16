Below is a complete **Alpha Expansion Backlog** that builds directly on your validated MVP. I kept the scope practical: enough complexity to make builds interesting, but not so much that the game becomes impossible to balance.

# Alpha Expansion Backlog — Idle RPG Incremental Game

## 1. Alpha goal

The MVP proved that the core loop is fun:

> Choose a class → choose a map → auto-battle enemies → gain EXP/gold/items → improve character → farm harder maps and MVPs.

The alpha version should now make the game deeper by improving five major areas:

1. Full skill lists for Warrior, Ranger, and Mage.
2. Better item interface and gear comparison.
3. NPC market where players spend gold.
4. Gear improvement system using gold and materials.
5. Better map selection with enemy and drop visibility.

The alpha should make the player feel that they are no longer just leveling up. They are now building a character.

---

# 2. Design direction for alpha

## 2.1 What alpha should add

The alpha version should add more decision-making around:

* Which skill build to use.
* Which stats to prioritize.
* Which gear is actually better.
* Which map to farm for specific drops.
* Whether to spend gold on potions, buffs, gear, or upgrades.
* Whether to improve current gear or wait for a better drop.

## 2.2 What alpha should avoid

Do not add these yet:

* Skill dependency trees.
* Multiple characters.
* Trading.
* Crafting with complex recipes.
* Pets.
* Guilds.
* PvP.
* Multiplayer.
* Advanced prestige/rebirth systems.
* Too many item rarities.
* Too many maps at once.

The goal is to make the current game deeper, not wider in an uncontrolled way.

---

# 3. Skill system expansion

## 3.1 Skill design rules

For alpha, skills follow these rules:

* Skills do not depend on other skills.
* Skills are unlocked only by character level.
* Each class has active and passive skills.
* Active skills are automatically used during combat.
* Player chooses which active skills are equipped in the skill loadout.
* Passive skills are always active after being learned.
* Skills can have multiple levels.
* Skill points are gained from job levels.
* Higher-level skills cost more skill points or require more character level.
* Skills should affect class identity strongly.

## 3.2 Skill data fields

Each skill should have the following fields in data:

```json
{
  "id": "warrior_power_strike",
  "class": "warrior",
  "name": "Power Strike",
  "type": "active",
  "unlockLevel": 1,
  "maxLevel": 10,
  "description": "A heavy melee attack that deals increased physical damage.",
  "affectedStats": ["STR", "DEX"],
  "scaling": "Damage scales mainly with STR. DEX slightly improves hit chance.",
  "cooldownSeconds": 4,
  "spCost": 5,
  "target": "single_enemy",
  "damageType": "physical",
  "element": "neutral"
}
```

Recommended skill types:

| Type    | Meaning                                  |
| ------- | ---------------------------------------- |
| Active  | Auto-used in combat if equipped          |
| Passive | Always active once learned               |
| Toggle  | Player can enable/disable before farming |
| Buff    | Temporary self-buff used automatically   |
| Proc    | Passive chance-based effect              |

For alpha, avoid complicated manual timing. The player prepares the build, but the character executes automatically.

---

# 4. Warrior full skill list

## Warrior class identity

Warrior is the safest and most stable class. It should be the best at surviving difficult maps early. Warrior wins through HP, defense, sustain, physical damage, and boss endurance.

Main stats:

* STR: main damage.
* VIT: HP, defense, sustain.
* AGI: attack speed and dodge.
* DEX: hit chance.
* LUK: minor crit value.

Weaknesses:

* Less burst than Mage.
* Less farming speed than Ranger.
* Can struggle against high-defense enemies without armor penetration.
* Can be slower in low-risk farming maps.

---

## Warrior skills

| Unlock Level | Skill            | Type    | Max Level |
| -----------: | ---------------- | ------- | --------: |
|            1 | Power Strike     | Active  |        10 |
|            3 | Iron Skin        | Passive |        10 |
|            5 | Battle Endurance | Passive |        10 |
|            8 | Cleave           | Active  |        10 |
|           10 | Shield Guard     | Passive |        10 |
|           13 | Blood Recovery   | Passive |        10 |
|           16 | War Cry          | Buff    |        10 |
|           20 | Counter Stance   | Proc    |        10 |
|           24 | Armor Breaker    | Active  |        10 |
|           28 | Berserker Rhythm | Passive |        10 |
|           34 | Last Stand       | Passive |         5 |
|           40 | MVP Guard        | Passive |        10 |

---

## Warrior skill details

### 1. Power Strike

Type: Active
Unlock level: 1
Max level: 10
Cooldown: 4 seconds
SP cost: 5 + 1 per skill level
Target: Single enemy
Damage type: Physical
Element: Neutral
Affected stats: STR, DEX

Description:

A heavy melee attack that deals increased physical damage to one enemy.

Scaling:

* STR increases base damage.
* DEX improves chance to hit.
* Weapon attack strongly affects damage.

Formula:

```text
damage = physicalAttack * (1.4 + skillLevel * 0.12)
```

At level 10:

```text
damage = physicalAttack * 2.6
```

Gameplay purpose:

This is the Warrior’s basic damage skill. It should remain useful for the whole early game.

---

### 2. Iron Skin

Type: Passive
Unlock level: 3
Max level: 10
Affected stats: VIT

Description:

Hardens the Warrior’s body, increasing physical defense.

Effect:

```text
physicalDefenseBonus = 5 + skillLevel * 3
```

At level 10:

```text
+35 physical defense
```

Additional scaling:

* Every 10 VIT increases this skill’s defense bonus by 2%.

Gameplay purpose:

Improves survival in maps with many physical enemies.

---

### 3. Battle Endurance

Type: Passive
Unlock level: 5
Max level: 10
Affected stats: VIT

Description:

Increases maximum HP and slightly improves HP recovery.

Effect:

```text
maxHpBonusPercent = 3% + skillLevel * 2%
hpRegenBonus = skillLevel * 0.5% max HP per minute
```

At level 10:

```text
+23% max HP
+5% max HP regen per minute
```

Gameplay purpose:

Makes Warrior better for long idle sessions and safer offline farming.

---

### 4. Cleave

Type: Active
Unlock level: 8
Max level: 10
Cooldown: 7 seconds
SP cost: 8 + 1 per skill level
Target: Current enemy plus splash damage
Damage type: Physical
Element: Neutral
Affected stats: STR, AGI

Description:

A wide melee swing that damages the current enemy and deals reduced splash damage to nearby enemies.

Effect:

```text
mainDamage = physicalAttack * (1.1 + skillLevel * 0.08)
splashDamage = mainDamage * 0.35
```

At level 10:

```text
mainDamage = physicalAttack * 1.9
splashDamage = 35% of main damage
```

Gameplay purpose:

Improves kill speed in maps with weak enemies. This gives Warrior some farming efficiency.

Implementation note:

If the current combat simulator only supports one enemy at a time, simulate Cleave as a chance to reduce the time to next enemy by applying splash progress to the next monster.

---

### 5. Shield Guard

Type: Passive
Unlock level: 10
Max level: 10
Affected stats: VIT, shield defense

Description:

Improves damage reduction when using a shield.

Effect:

```text
damageReductionWithShield = 2% + skillLevel * 1.2%
```

At level 10:

```text
14% reduced incoming physical damage while shield is equipped
```

Restriction:

Only active when using a shield or off-hand guard item.

Gameplay purpose:

Creates a defensive Warrior build path.

---

### 6. Blood Recovery

Type: Passive
Unlock level: 13
Max level: 10
Affected stats: VIT, STR

Description:

Restores HP after killing enemies.

Effect:

```text
hpRestoredOnKill = maxHp * (0.3% + skillLevel * 0.15%)
```

At level 10:

```text
1.8% max HP restored per kill
```

Bonus:

Every 25 STR adds +0.1% max HP restored per kill.

Gameplay purpose:

Makes Warrior excellent for long farming sessions against enemies it can consistently kill.

---

### 7. War Cry

Type: Buff
Unlock level: 16
Max level: 10
Cooldown: 30 seconds
Duration: 12 seconds
SP cost: 12 + 2 per skill level
Affected stats: STR

Description:

The Warrior lets out a battle cry, temporarily increasing physical attack.

Effect:

```text
attackBonusPercent = 5% + skillLevel * 1.5%
```

At level 10:

```text
+20% physical attack for 12 seconds
```

Gameplay purpose:

Improves DPS during normal farming and MVP fights.

---

### 8. Counter Stance

Type: Proc
Unlock level: 20
Max level: 10
Affected stats: AGI, STR

Description:

Gives the Warrior a chance to counterattack after receiving a physical hit.

Effect:

```text
counterChance = 4% + skillLevel * 1.5%
counterDamage = physicalAttack * 0.75
```

At level 10:

```text
19% chance to counterattack
```

Bonus:

Every 20 AGI adds +1% counter chance, capped at +10%.

Gameplay purpose:

Rewards durable builds that can survive being hit often.

---

### 9. Armor Breaker

Type: Active
Unlock level: 24
Max level: 10
Cooldown: 10 seconds
SP cost: 14 + 2 per skill level
Target: Single enemy
Damage type: Physical
Affected stats: STR, DEX

Description:

Deals damage and temporarily reduces enemy defense.

Effect:

```text
damage = physicalAttack * (1.0 + skillLevel * 0.08)
enemyDefenseReduction = 5% + skillLevel * 2%
duration = 8 seconds
```

At level 10:

```text
damage = physicalAttack * 1.8
enemy defense -25% for 8 seconds
```

Gameplay purpose:

Helps Warrior fight tanky enemies and MVPs.

---

### 10. Berserker Rhythm

Type: Passive
Unlock level: 28
Max level: 10
Affected stats: AGI, STR

Description:

The Warrior gains momentum after consecutive kills.

Effect:

Each kill grants one stack.

```text
attackSpeedBonusPerStack = 0.5% + skillLevel * 0.15%
maxStacks = 10
stackDuration = 20 seconds
```

At level 10:

```text
+2% attack speed per stack
max +20% attack speed
```

Gameplay purpose:

Rewards farming maps where the Warrior can keep a steady kill chain.

---

### 11. Last Stand

Type: Passive
Unlock level: 34
Max level: 5
Affected stats: VIT, STR

Description:

When HP is low, the Warrior becomes harder to kill and deals more damage.

Trigger:

```text
activates below 30% HP
```

Effect:

```text
damageReduction = 5% + skillLevel * 3%
attackBonus = 5% + skillLevel * 4%
```

At level 5:

```text
20% reduced damage taken
25% increased physical attack
```

Gameplay purpose:

Improves survival against MVPs and dangerous maps.

---

### 12. MVP Guard

Type: Passive
Unlock level: 40
Max level: 10
Affected stats: VIT

Description:

Specialized defensive training against boss monsters.

Effect:

```text
mvpDamageReduction = 3% + skillLevel * 1.5%
```

At level 10:

```text
18% reduced damage taken from MVPs
```

Gameplay purpose:

Makes Warrior the most reliable first MVP killer.

---

# 5. Ranger full skill list

## Ranger class identity

Ranger is the fastest farmer. It should specialize in attack speed, crit, accuracy, evasion, and rare-drop farming.

Main stats:

* DEX: ranged damage and hit chance.
* AGI: attack speed and flee.
* LUK: crit and rare drop chance.
* STR: minor carry capacity.
* VIT: survivability.

Weaknesses:

* Fragile if enemies can hit consistently.
* Lower sustain than Warrior.
* Less burst than Mage.
* Can struggle against high-defense enemies without crit or armor piercing.

---

## Ranger skills

| Unlock Level | Skill             | Type    | Max Level |
| -----------: | ----------------- | ------- | --------: |
|            1 | Double Shot       | Active  |        10 |
|            3 | Eagle Eye         | Passive |        10 |
|            5 | Quick Step        | Passive |        10 |
|            8 | Focused Aim       | Buff    |        10 |
|           10 | Critical Focus    | Passive |        10 |
|           13 | Piercing Arrow    | Active  |        10 |
|           16 | Windwalk          | Buff    |        10 |
|           20 | Hunter’s Instinct | Passive |        10 |
|           24 | Arrow Storm       | Active  |        10 |
|           28 | Weak Point Mark   | Proc    |        10 |
|           34 | Trap Preparation  | Passive |         5 |
|           40 | Boss Mark         | Passive |        10 |

---

## Ranger skill details

### 1. Double Shot

Type: Active
Unlock level: 1
Max level: 10
Cooldown: 4 seconds
SP cost: 5 + 1 per skill level
Target: Single enemy
Damage type: Physical ranged
Affected stats: DEX, AGI

Description:

Fires two quick arrows at the enemy.

Effect:

```text
hit1Damage = rangedAttack * (0.75 + skillLevel * 0.04)
hit2Damage = rangedAttack * (0.75 + skillLevel * 0.04)
```

At level 10:

```text
2 hits of 1.15x ranged attack
total = 2.3x ranged attack
```

Gameplay purpose:

Core Ranger damage skill. Strong with on-hit effects and crit builds.

---

### 2. Eagle Eye

Type: Passive
Unlock level: 3
Max level: 10
Affected stats: DEX

Description:

Improves ranged precision and attack power.

Effect:

```text
hitBonus = skillLevel * 3
rangedAttackBonusPercent = skillLevel * 1%
```

At level 10:

```text
+30 hit
+10% ranged attack
```

Gameplay purpose:

Improves consistency against evasive monsters.

---

### 3. Quick Step

Type: Passive
Unlock level: 5
Max level: 10
Affected stats: AGI

Description:

Improves movement and evasion.

Effect:

```text
fleeBonus = skillLevel * 4
attackSpeedBonus = skillLevel * 0.8%
```

At level 10:

```text
+40 flee
+8% attack speed
```

Gameplay purpose:

Improves Ranger survival and farming speed.

---

### 4. Focused Aim

Type: Buff
Unlock level: 8
Max level: 10
Cooldown: 25 seconds
Duration: 10 seconds
SP cost: 10 + 1 per skill level
Affected stats: DEX, LUK

Description:

The Ranger focuses on precision, increasing hit and critical chance.

Effect:

```text
hitBonus = 10 + skillLevel * 4
critBonus = 2% + skillLevel * 0.8%
```

At level 10:

```text
+50 hit
+10% crit chance
```

Gameplay purpose:

Useful against high-flee monsters and MVPs.

---

### 5. Critical Focus

Type: Passive
Unlock level: 10
Max level: 10
Affected stats: LUK

Description:

Improves critical chance and critical damage.

Effect:

```text
critChanceBonus = skillLevel * 0.8%
critDamageBonus = skillLevel * 3%
```

At level 10:

```text
+8% crit chance
+30% crit damage
```

Bonus:

Every 20 LUK adds +1% additional crit damage.

Gameplay purpose:

Enables crit-based Ranger builds.

---

### 6. Piercing Arrow

Type: Active
Unlock level: 13
Max level: 10
Cooldown: 8 seconds
SP cost: 9 + 2 per skill level
Target: Single enemy
Damage type: Physical ranged
Affected stats: DEX

Description:

Fires an armor-piercing arrow that ignores part of the enemy’s defense.

Effect:

```text
damage = rangedAttack * (1.0 + skillLevel * 0.1)
defenseIgnored = 10% + skillLevel * 3%
```

At level 10:

```text
damage = rangedAttack * 2.0
ignores 40% enemy defense
```

Gameplay purpose:

Helps Ranger fight armored enemies and MVPs.

---

### 7. Windwalk

Type: Buff
Unlock level: 16
Max level: 10
Cooldown: 35 seconds
Duration: 15 seconds
SP cost: 12 + 2 per skill level
Affected stats: AGI

Description:

Temporarily increases attack speed and flee.

Effect:

```text
attackSpeedBonus = 5% + skillLevel * 1.2%
fleeBonus = 10 + skillLevel * 3
```

At level 10:

```text
+17% attack speed
+40 flee
```

Gameplay purpose:

Excellent for farming maps where Ranger can dodge most attacks.

---

### 8. Hunter’s Instinct

Type: Passive
Unlock level: 20
Max level: 10
Affected stats: LUK

Description:

Improves rare drop chance and monster tracking.

Effect:

```text
rareDropBonus = skillLevel * 0.5%
cardDropBonus = skillLevel * 0.2%
```

At level 10:

```text
+5% relative rare drop chance
+2% relative card drop chance
```

Important balancing note:

This should be a relative bonus, not flat. For example, a 1% rare drop becomes 1.05%, not 6%.

Gameplay purpose:

Makes Ranger the best long-term farming class.

---

### 9. Arrow Storm

Type: Active
Unlock level: 24
Max level: 10
Cooldown: 12 seconds
SP cost: 16 + 2 per skill level
Target: Multi-target simulation
Damage type: Physical ranged
Affected stats: DEX, AGI

Description:

Fires a rain of arrows, improving clear speed against groups.

Effect:

```text
damage = rangedAttack * (1.2 + skillLevel * 0.1)
nextEnemyProgress = damage * 0.25
```

At level 10:

```text
damage = rangedAttack * 2.2
25% simulated splash toward next enemy
```

Gameplay purpose:

Ranger’s farming accelerator skill.

---

### 10. Weak Point Mark

Type: Proc
Unlock level: 28
Max level: 10
Affected stats: DEX, LUK

Description:

Basic attacks have a chance to mark enemy weak points, increasing damage taken.

Effect:

```text
markChance = 4% + skillLevel * 1.2%
damageTakenIncrease = 5% + skillLevel * 1%
duration = 6 seconds
```

At level 10:

```text
16% chance to mark
enemy takes +15% damage for 6 seconds
```

Gameplay purpose:

Improves sustained DPS and boss performance.

---

### 11. Trap Preparation

Type: Passive
Unlock level: 34
Max level: 5
Affected stats: DEX, INT

Description:

Before each MVP fight, the Ranger prepares traps that damage and slow the boss.

Effect:

```text
mvpOpeningDamage = rangedAttack * (1.5 + skillLevel * 0.5)
mvpAttackSpeedReduction = 4% + skillLevel * 2%
duration = 10 seconds
```

At level 5:

```text
opening damage = rangedAttack * 4.0
MVP attack speed -14% for 10 seconds
```

Gameplay purpose:

Gives Ranger a special MVP preparation tool without requiring manual play.

---

### 12. Boss Mark

Type: Passive
Unlock level: 40
Max level: 10
Affected stats: DEX, LUK

Description:

Increases damage against MVP enemies.

Effect:

```text
mvpDamageBonus = 4% + skillLevel * 1.6%
```

At level 10:

```text
+20% damage against MVPs
```

Gameplay purpose:

Lets Ranger transition from pure farmer to boss hunter.

---

# 6. Mage full skill list

## Mage class identity

Mage is the strongest elemental burst class. It should reward choosing the correct map and exploiting monster weaknesses.

Main stats:

* INT: magic damage, max SP, SP regen.
* DEX: cast speed and hit reliability for spells.
* VIT: survival.
* LUK: minor crit/rare value if magic crit exists later.

Weaknesses:

* Low physical defense.
* SP-dependent.
* Can perform badly on maps with wrong elemental matchups.
* Needs preparation more than Warrior or Ranger.

---

## Mage skills

| Unlock Level | Skill           | Type    | Max Level |
| -----------: | --------------- | ------- | --------: |
|            1 | Fire Bolt       | Active  |        10 |
|            3 | Frost Bolt      | Active  |        10 |
|            5 | Lightning Bolt  | Active  |        10 |
|            8 | Mana Control    | Passive |        10 |
|           10 | Arcane Recovery | Passive |        10 |
|           13 | Stone Spike     | Active  |        10 |
|           16 | Elemental Study | Passive |        10 |
|           20 | Magic Barrier   | Buff    |        10 |
|           24 | Meteor Spark    | Active  |        10 |
|           28 | Frost Nova      | Active  |        10 |
|           34 | Spell Echo      | Proc    |         5 |
|           40 | Elemental Burst | Passive |        10 |

---

## Mage skill details

### 1. Fire Bolt

Type: Active
Unlock level: 1
Max level: 10
Cooldown: 4 seconds
SP cost: 6 + 1 per skill level
Target: Single enemy
Damage type: Magical
Element: Fire
Affected stats: INT, DEX

Description:

Casts a fire spell against one enemy.

Effect:

```text
damage = magicAttack * (1.25 + skillLevel * 0.12)
```

At level 10:

```text
damage = magicAttack * 2.45
```

Scaling:

* INT increases magic attack.
* DEX reduces cast delay or improves spell reliability.
* Element modifier can greatly increase or reduce damage.

Gameplay purpose:

Strong against earth, plant, insect, and ice-themed enemies.

---

### 2. Frost Bolt

Type: Active
Unlock level: 3
Max level: 10
Cooldown: 4 seconds
SP cost: 6 + 1 per skill level
Target: Single enemy
Damage type: Magical
Element: Water/Ice
Affected stats: INT, DEX

Description:

Casts an ice spell against one enemy.

Effect:

```text
damage = magicAttack * (1.2 + skillLevel * 0.11)
slowChance = 5% + skillLevel * 1%
slowDuration = 4 seconds
```

At level 10:

```text
damage = magicAttack * 2.3
15% chance to slow
```

Gameplay purpose:

Good against fire enemies and useful for survival due to slow chance.

---

### 3. Lightning Bolt

Type: Active
Unlock level: 5
Max level: 10
Cooldown: 5 seconds
SP cost: 7 + 1 per skill level
Target: Single enemy
Damage type: Magical
Element: Wind
Affected stats: INT, DEX

Description:

Casts a lightning spell with high variance and high burst potential.

Effect:

```text
damage = magicAttack * random(1.0, 1.4 + skillLevel * 0.13)
```

At level 10:

```text
damage = magicAttack * random(1.0, 2.7)
```

Gameplay purpose:

Strong burst spell, especially useful against water enemies.

---

### 4. Mana Control

Type: Passive
Unlock level: 8
Max level: 10
Affected stats: INT

Description:

Reduces SP cost of active spells.

Effect:

```text
spCostReduction = 3% + skillLevel * 2%
```

At level 10:

```text
23% reduced SP cost
```

Gameplay purpose:

Core Mage sustain skill for long idle sessions.

---

### 5. Arcane Recovery

Type: Passive
Unlock level: 10
Max level: 10
Affected stats: INT

Description:

Improves SP regeneration.

Effect:

```text
spRegenBonus = 5% + skillLevel * 4%
```

At level 10:

```text
+45% SP regeneration
```

Bonus:

Every 25 INT adds +2% additional SP regen.

Gameplay purpose:

Allows Mage to farm longer without running out of SP.

---

### 6. Stone Spike

Type: Active
Unlock level: 13
Max level: 10
Cooldown: 7 seconds
SP cost: 10 + 1 per skill level
Target: Single enemy
Damage type: Magical
Element: Earth
Affected stats: INT, DEX

Description:

Summons stone spikes under the enemy. Deals moderate damage and has a chance to stun.

Effect:

```text
damage = magicAttack * (1.1 + skillLevel * 0.1)
stunChance = 3% + skillLevel * 1%
stunDuration = 2 seconds
```

At level 10:

```text
damage = magicAttack * 2.1
13% stun chance
```

Gameplay purpose:

Defensive spell for dangerous enemies.

---

### 7. Elemental Study

Type: Passive
Unlock level: 16
Max level: 10
Affected stats: INT

Description:

Increases elemental advantage damage.

Effect:

```text
weaknessDamageBonus = 4% + skillLevel * 1.6%
```

At level 10:

```text
+20% damage when hitting enemy weakness
```

Gameplay purpose:

Makes map preparation and skill loadout choices matter more.

---

### 8. Magic Barrier

Type: Buff
Unlock level: 20
Max level: 10
Cooldown: 35 seconds
Duration: 12 seconds
SP cost: 14 + 2 per skill level
Affected stats: INT, VIT

Description:

Creates a magical barrier that reduces incoming damage.

Effect:

```text
damageReduction = 5% + skillLevel * 1.5%
```

At level 10:

```text
20% reduced incoming damage for 12 seconds
```

Bonus:

Every 30 INT adds +1% extra damage reduction, capped at +10%.

Gameplay purpose:

Gives Mage a survival tool without making it as naturally tanky as Warrior.

---

### 9. Meteor Spark

Type: Active
Unlock level: 24
Max level: 10
Cooldown: 12 seconds
SP cost: 18 + 3 per skill level
Target: Multi-target simulation
Damage type: Magical
Element: Fire
Affected stats: INT

Description:

Calls down a small meteor burst, damaging the current enemy and improving clear speed.

Effect:

```text
damage = magicAttack * (1.5 + skillLevel * 0.15)
nextEnemyProgress = damage * 0.3
```

At level 10:

```text
damage = magicAttack * 3.0
30% simulated splash toward next enemy
```

Gameplay purpose:

Mage’s main farming burst skill.

---

### 10. Frost Nova

Type: Active
Unlock level: 28
Max level: 10
Cooldown: 14 seconds
SP cost: 16 + 2 per skill level
Target: Current enemy
Damage type: Magical
Element: Water/Ice
Affected stats: INT, DEX

Description:

Explodes frost around the enemy, dealing damage and reducing incoming damage pressure.

Effect:

```text
damage = magicAttack * (1.2 + skillLevel * 0.1)
enemyAttackSpeedReduction = 5% + skillLevel * 1.5%
duration = 8 seconds
```

At level 10:

```text
damage = magicAttack * 2.2
enemy attack speed -20% for 8 seconds
```

Gameplay purpose:

Useful in maps where Mage dies from repeated attacks.

---

### 11. Spell Echo

Type: Proc
Unlock level: 34
Max level: 5
Affected stats: INT, DEX

Description:

Offensive spells have a chance to repeat at reduced power.

Effect:

```text
echoChance = 4% + skillLevel * 3%
echoDamage = 40% + skillLevel * 5%
```

At level 5:

```text
19% chance to echo
echo deals 65% of original spell damage
```

Gameplay purpose:

Strong scaling passive for spell-heavy builds.

---

### 12. Elemental Burst

Type: Passive
Unlock level: 40
Max level: 10
Affected stats: INT

Description:

Greatly increases damage against MVPs when using their elemental weakness.

Effect:

```text
mvpWeaknessDamageBonus = 5% + skillLevel * 2%
```

At level 10:

```text
+25% damage against MVPs when hitting elemental weakness
```

Gameplay purpose:

Makes Mage the best class for properly prepared elemental MVP burst.

---

# 7. Skill loadout menu backlog

## Epic 1 — Skill list UI

### Goal

Allow the player to inspect, level, and equip skills.

### User stories

#### Story 1.1 — View skills by class

As a player, I want to view my class skill list so that I understand my progression options.

Acceptance criteria:

* Skills are listed by unlock level.
* Locked skills are visible but grayed out.
* Locked skills show required character level.
* Each skill shows:

  * Name.
  * Type.
  * Current level.
  * Max level.
  * Unlock level.
  * SP cost.
  * Cooldown.
  * Damage or effect.
  * Affected stats.
  * Description.

#### Story 1.2 — Level up skills

As a player, I want to spend skill points on skills.

Acceptance criteria:

* Player can level any unlocked skill.
* Skills do not require other skills.
* Player cannot exceed max skill level.
* UI shows before/after effect when increasing level.
* Skill point cost is displayed.

#### Story 1.3 — Equip active skills

As a player, I want to choose which active skills my character uses.

Acceptance criteria:

* Player has limited active skill slots.
* Start with 2 active slots.
* Unlock more slots later:

  * Slot 3 at level 20.
  * Slot 4 at level 40.
* Buff skills count as active skills.
* Passive and proc skills do not need to be equipped.
* Skill loadout can be changed only outside active combat.

#### Story 1.4 — Skill simulation preview

As a player, I want to preview how my skills affect farming.

Acceptance criteria:

* Skill menu shows estimated changes:

  * DPS.
  * SP consumption per minute.
  * Sustain time.
  * MVP success chance.
  * EXP/hour estimate.
* Estimates update when changing skill loadout.

---

# 8. Improved item interface backlog

## Epic 2 — Item detail panel

### Goal

Make item decisions clear and satisfying.

### User stories

#### Story 2.1 — Item stats display

As a player, I want to inspect an item and see all its stats.

Acceptance criteria:

Each item detail panel displays:

* Item name.
* Rarity.
* Item type.
* Equipment slot.
* Required level.
* Required class.
* Sell value.
* Upgrade level.
* Card slots.
* Description/lore text.
* Main stats.
* Secondary stats.
* Special effects.
* Source hint, if discovered.

Example item panel:

```text
Iron Hunter Bow +2
Rare Bow
Required Level: 18
Class: Ranger

Attack: +42
DEX: +3
Attack Speed: +4%
Critical Chance: +2%

Card Slots: 1
Sell Value: 320 gold

Description:
A sturdy bow used by forest hunters. Reliable, simple, and easy to improve.
```

#### Story 2.2 — Gear comparison

As a player, I want to compare a new item against my current equipped item.

Acceptance criteria:

When hovering/selecting an equippable item, show:

* Current equipped item on the left.
* New item on the right.
* Stat differences.
* Positive changes in green.
* Negative changes in red.
* Neutral changes in gray.
* Derived stat changes:

  * HP.
  * SP.
  * Attack.
  * Magic attack.
  * Defense.
  * Magic defense.
  * Hit.
  * Flee.
  * Crit.
  * Attack speed.
  * Estimated DPS.
  * Estimated survival.
  * Estimated EXP/hour.

#### Story 2.3 — Build impact summary

As a player, I want a simple summary of what changes if I equip an item.

Acceptance criteria:

Comparison panel shows a summary:

```text
Equipping this item:
+ Increases DPS by 8.4%
+ Increases hit chance by 5%
- Reduces max HP by 3.1%
Estimated result on current map:
+ EXP/hour: 1,240 → 1,335
+ MVP success chance: 42% → 48%
```

#### Story 2.4 — Item description and source

As a player, I want item descriptions so that loot feels less generic.

Acceptance criteria:

* Each item has a short description.
* If the player has found the item before, show known sources.
* If not found, show “Unknown source.”
* For discovered items, show:

  * Dropped by which monsters.
  * Sold by which NPC.
  * Created by which upgrade path, if applicable.

#### Story 2.5 — Item lock

As a player, I want to lock important items.

Acceptance criteria:

* Player can lock/unlock items.
* Locked items cannot be sold.
* Locked items cannot be used as upgrade material.
* Locked item icon is visible.

---

# 9. NPC market backlog

## Epic 3 — NPC market menu

### Goal

Give gold more value by allowing players to buy useful items.

### User stories

#### Story 3.1 — Open market menu

As a player, I want to open the NPC market from town.

Acceptance criteria:

* Market is accessible from the main town/menu screen.
* Market has categories:

  * Potions.
  * Buff consumables.
  * Gear.
  * Materials.
  * Special goods.
* Each item shows:

  * Name.
  * Price.
  * Description.
  * Effect.
  * Stock status.
  * Required level, if any.

#### Story 3.2 — Buy potions

As a player, I want to buy potions to improve survival during farming.

Initial potion list:

| Item             |    Price | Effect                                  |
| ---------------- | -------: | --------------------------------------- |
| Small HP Potion  |  25 gold | Restores 50 HP when HP drops below 50%  |
| Medium HP Potion | 100 gold | Restores 200 HP when HP drops below 50% |
| Large HP Potion  | 400 gold | Restores 750 HP when HP drops below 50% |
| Small SP Potion  |  35 gold | Restores 30 SP when SP drops below 30%  |
| Medium SP Potion | 140 gold | Restores 120 SP when SP drops below 30% |
| Large SP Potion  | 560 gold | Restores 450 SP when SP drops below 30% |

Potion rules:

* Potions are consumed automatically in combat.
* Player can configure which potion type to use.
* Player can enable/disable potion use per farming session.
* Potions have a cooldown to prevent instant spam.

Recommended cooldown:

```text
HP potion cooldown = 12 seconds
SP potion cooldown = 15 seconds
```

#### Story 3.3 — Buy buff consumables

As a player, I want to buy temporary buffs before farming.

Initial buff item list:

| Item              |    Price |   Duration | Effect                      |
| ----------------- | -------: | ---------: | --------------------------- |
| Attack Meal       | 250 gold | 30 minutes | +8% physical attack         |
| Magic Tea         | 250 gold | 30 minutes | +8% magic attack            |
| Guard Tonic       | 250 gold | 30 minutes | +8% defense                 |
| Focus Candy       | 250 gold | 30 minutes | +20 hit                     |
| Swift Juice       | 250 gold | 30 minutes | +6% attack speed            |
| Lucky Charm       | 500 gold | 30 minutes | +3% relative rare drop rate |
| Boss Hunter Badge | 750 gold | 15 minutes | +8% MVP damage              |

Buff rules:

* Buffs tick down only while farming.
* Buffs persist through normal enemy fights.
* Buffs are removed on death or when timer ends.
* Only one food buff and one special buff can be active at the same time.

#### Story 3.4 — Buy starter gear

As a player, I want the market to sell basic gear so that bad luck does not block progression.

Initial gear list:

| Item             |    Price | Class   | Purpose              |
| ---------------- | -------: | ------- | -------------------- |
| Iron Sword       | 500 gold | Warrior | Basic weapon upgrade |
| Iron Shield      | 450 gold | Warrior | Survival option      |
| Hunter Bow       | 500 gold | Ranger  | Basic weapon upgrade |
| Leather Vest     | 400 gold | Ranger  | Early armor          |
| Apprentice Staff | 500 gold | Mage    | Basic magic weapon   |
| Woven Robe       | 400 gold | Mage    | Early magic armor    |
| Traveler Boots   | 300 gold | Any     | Small flee bonus     |
| Copper Ring      | 350 gold | Any     | Small stat bonus     |

Market gear rule:

* Market gear should be reliable but not best-in-slot.
* Dropped gear should usually have better potential.
* Upgraded market gear can carry players through unlucky periods.

#### Story 3.5 — Buy materials

As a player, I want to buy basic materials for gear improvement.

Initial material list:

| Material            |    Price | Purpose                        |
| ------------------- | -------: | ------------------------------ |
| Iron Ore            |  75 gold | Weapon upgrades                |
| Tough Hide          |  75 gold | Armor upgrades                 |
| Magic Dust          |  90 gold | Mage gear upgrades             |
| Sharp Fang          |  90 gold | Ranger gear upgrades           |
| Reinforced Thread   | 100 gold | Boots/robes/accessories        |
| Basic Upgrade Stone | 250 gold | Required for +1 to +3 upgrades |

Material rules:

* Basic materials are unlimited.
* Advanced materials are locked by map progression.
* Rare materials should mostly come from farming, not shop buying.

#### Story 3.6 — Limited stock items

As a player, I want some market items to feel special.

Acceptance criteria:

* Market can have limited stock items.
* Stock refreshes daily or after MVP kills.
* Limited items include:

  * Discounted materials.
  * Rare buff consumables.
  * Special gear.
  * Upgrade protection items.

For alpha, implement simple stock refresh on real-world day or game-day cycle.

---

# 10. Gear improvement backlog

## Epic 4 — Gear improvement menu

### Goal

Allow the player to invest gold and materials into improving equipment.

### User stories

#### Story 4.1 — Open gear improvement menu

As a player, I want to open a gear improvement menu from town.

Acceptance criteria:

* Menu lists all upgradeable gear.
* Equipped gear is shown first.
* Locked gear can be upgraded.
* Each item shows current upgrade level.
* Selecting item shows:

  * Current stats.
  * Next upgrade stats.
  * Required gold.
  * Required materials.
  * Success chance.
  * Failure result.

#### Story 4.2 — Upgrade gear levels

As a player, I want to upgrade gear to increase its power.

Acceptance criteria:

* Gear can be upgraded from +0 to +10.
* Upgrade increases item main stat.
* Weapons gain attack or magic attack.
* Armor gains defense or magic defense.
* Boots/accessories gain smaller stat improvements.

Recommended scaling:

| Upgrade level | Stat multiplier |
| ------------: | --------------: |
|            +0 |           1.00x |
|            +1 |           1.05x |
|            +2 |           1.10x |
|            +3 |           1.16x |
|            +4 |           1.23x |
|            +5 |           1.31x |
|            +6 |           1.40x |
|            +7 |           1.50x |
|            +8 |           1.62x |
|            +9 |           1.75x |
|           +10 |           1.90x |

#### Story 4.3 — Upgrade cost

As a player, I want gear improvement to cost both gold and materials.

Acceptance criteria:

Upgrade cost depends on:

* Item rarity.
* Item level.
* Current upgrade level.
* Item slot.

Example cost formula:

```text
goldCost = baseItemLevel * rarityMultiplier * (upgradeLevel + 1)^2 * 10
materialCost = 1 + floor(upgradeLevel / 2)
```

Rarity multipliers:

| Rarity    | Multiplier |
| --------- | ---------: |
| Common    |        1.0 |
| Uncommon  |        1.3 |
| Rare      |        1.8 |
| Epic      |        2.5 |
| Legendary |        4.0 |
| MVP       |        6.0 |

#### Story 4.4 — Upgrade success chance

As a player, I want upgrading to become riskier at high levels.

Acceptance criteria:

Recommended success chances:

| Target level | Success chance | Failure result          |
| -----------: | -------------: | ----------------------- |
|           +1 |           100% | None                    |
|           +2 |           100% | None                    |
|           +3 |            95% | Materials lost          |
|           +4 |            85% | Materials lost          |
|           +5 |            75% | Materials lost          |
|           +6 |            60% | Materials and gold lost |
|           +7 |            45% | Item drops 1 level      |
|           +8 |            35% | Item drops 1 level      |
|           +9 |            25% | Item drops 1–2 levels   |
|          +10 |            15% | Item drops 2 levels     |

Alpha recommendation:

Do not destroy items on failure. Losing the item may feel too punishing for an idle game.

#### Story 4.5 — Safe upgrade stones

As a player, I want protection items for risky upgrades.

Acceptance criteria:

* Add Safe Upgrade Stone.
* Prevents upgrade level loss on failure.
* Still consumes gold/materials.
* Rare drop from MVPs.
* Occasionally sold in limited market stock.

#### Story 4.6 — Upgrade preview

As a player, I want to know what the upgrade will change before paying.

Acceptance criteria:

Preview shows:

```text
Iron Sword +2 → Iron Sword +3

Attack: 48 → 51
Estimated DPS: 122 → 129
EXP/hour on current map: 2,340 → 2,415
MVP success chance: 36% → 39%

Cost:
Gold: 1,200
Iron Ore: 3
Basic Upgrade Stone: 1
Success Chance: 95%
Failure: materials lost
```

#### Story 4.7 — Upgrade material sources

As a player, I want to know where to farm missing materials.

Acceptance criteria:

If player lacks materials, menu shows:

* Required material.
* Amount owned.
* Amount needed.
* Known drop sources.
* Market availability.
* Button to view maps that drop the material.

---

# 11. Improved map selection backlog

## Epic 5 — Map details screen

### Goal

Make map selection a strategic choice.

### User stories

#### Story 5.1 — Show enemies on map

As a player, I want to see which enemies exist on each map.

Acceptance criteria:

Map detail screen shows enemy list.

For each enemy:

* Name.
* Level.
* Race/type.
* Element.
* HP.
* Main attack type.
* EXP.
* Job EXP.
* Gold range.
* Main drops.
* Rare drops.
* Card drop.
* Encounter weight.

Example:

```text
Forest Path

Enemies:
Wolf Pup
Level: 9
Type: Beast
Element: Neutral
HP: 180
Attack: Physical
EXP: 32
Job EXP: 18
Gold: 8–14
Drops: Wolf Fang, Leather Scrap, Hunter Bow
Rare Drop: Wolf Claw Necklace
Card: Wolf Pup Card
Encounter Rate: Common
```

#### Story 5.2 — Show map drop table

As a player, I want to see all important drops available on a map.

Acceptance criteria:

Map screen has Drops tab.

Drop categories:

* Common materials.
* Equipment.
* Rare equipment.
* Cards.
* MVP drops.
* MVP card.

Each drop shows:

* Source enemy.
* Drop chance, if discovered.
* Unknown chance, if not discovered.
* Whether already collected.

#### Story 5.3 — Map farming estimates

As a player, I want to know whether my character can farm a map safely.

Acceptance criteria:

Map screen shows estimated:

* Survival chance.
* EXP/hour.
* Job EXP/hour.
* Gold/hour.
* Kills/hour.
* Death risk.
* MVP success chance.
* Potion cost/hour.
* Recommended stats.

Display examples:

```text
Estimated Result:
EXP/hour: 4,200
Gold/hour: 860
Survival: Risky
Death Risk: 18% per hour
MVP Success Chance: 22%
Potion Cost/hour: 180 gold
```

#### Story 5.4 — Map recommendation tags

As a player, I want the game to explain why a map is good or bad for my character.

Acceptance criteria:

Maps can display tags:

| Tag                 | Meaning                                  |
| ------------------- | ---------------------------------------- |
| Safe                | Low death risk                           |
| Good EXP            | Strong leveling map                      |
| Good Gold           | Strong money map                         |
| Card Farm           | Useful card available                    |
| Gear Farm           | Useful equipment available               |
| Risky               | Character may die                        |
| Bad Element Matchup | Current skills are weak here             |
| MVP Ready           | Good chance to defeat MVP                |
| Avoid MVP           | Farming is fine but MVP likely kills you |
| Potion Heavy        | Consumes many potions                    |

#### Story 5.5 — Map comparison

As a player, I want to compare maps.

Acceptance criteria:

Allow selecting 2–3 maps and comparing:

* EXP/hour.
* Gold/hour.
* Death risk.
* MVP chance.
* Desired drops.
* Potion usage.
* Best known session.

#### Story 5.6 — Target farming

As a player, I want to choose a drop target and see where to farm it.

Acceptance criteria:

* Player can select an item/card/material.
* Game shows known maps where it drops.
* Game recommends best map based on:

  * Drop source.
  * Kill speed.
  * Survival chance.
  * Encounter rate.
  * MVP chance if relevant.

Example:

```text
Target: Wolf Pup Card

Best known source:
Forest Path

Reason:
Wolf Pup encounter rate is common.
Your survival chance is high.
Estimated kills/hour: 420.
```

---

# 12. Data model additions

## 12.1 Skill model

```json
{
  "id": "string",
  "classId": "warrior | ranger | mage",
  "name": "string",
  "type": "active | passive | buff | proc",
  "unlockLevel": 1,
  "maxLevel": 10,
  "description": "string",
  "affectedStats": ["STR", "DEX"],
  "damageType": "physical | magical | none",
  "element": "neutral | fire | water | wind | earth | dark | holy",
  "cooldownSeconds": 0,
  "durationSeconds": 0,
  "spCostBase": 0,
  "spCostPerLevel": 0,
  "formula": "string",
  "tags": ["single_target", "farming", "mvp", "survival"]
}
```

## 12.2 Market item model

```json
{
  "id": "small_hp_potion",
  "name": "Small HP Potion",
  "category": "potion",
  "price": 25,
  "description": "Restores a small amount of HP during combat.",
  "effect": {
    "type": "restore_hp",
    "amount": 50,
    "trigger": "hp_below_50_percent",
    "cooldownSeconds": 12
  },
  "requiredLevel": 1,
  "stockType": "unlimited"
}
```

## 12.3 Gear upgrade model

```json
{
  "itemInstanceId": "abc123",
  "upgradeLevel": 3,
  "upgradeHistory": [
    {
      "from": 2,
      "to": 3,
      "success": true,
      "goldSpent": 1200,
      "materialsSpent": {
        "iron_ore": 3,
        "basic_upgrade_stone": 1
      }
    }
  ]
}
```

## 12.4 Map enemy visibility model

```json
{
  "mapId": "forest_path",
  "knownEnemies": ["wolf_pup", "beetle", "sporeling"],
  "knownDrops": ["wolf_fang", "leather_scrap", "hunter_bow"],
  "discoveredCards": ["wolf_pup_card"],
  "bestExpPerHour": 4200,
  "bestGoldPerHour": 860,
  "bestMvpResult": "defeated"
}
```

---

# 13. Alpha implementation milestones

## Milestone A1 — Full skill data

Goal:

Add the complete skill list for Warrior, Ranger, and Mage.

Tasks:

1. Create skills data file.
2. Add unlock-level logic.
3. Add skill leveling.
4. Add passive skill effects.
5. Add active skill effects.
6. Add buff skill effects.
7. Add proc skill effects.
8. Add skill loadout slots.
9. Add skill details UI.
10. Add skill impact preview.

Definition of done:

* Each class has 12 skills.
* Skills unlock by character level only.
* Player can level unlocked skills.
* Active skills can be equipped.
* Passive skills affect derived stats.
* Combat uses equipped active skills.

---

## Milestone A2 — Improved item interface

Goal:

Make item decisions readable.

Tasks:

1. Build item detail panel.
2. Add item descriptions.
3. Add item stat display.
4. Add current-vs-new comparison.
5. Add derived stat diff.
6. Add DPS estimate diff.
7. Add survival estimate diff.
8. Add current-map EXP/hour estimate diff.
9. Add item source display.
10. Add item locking.

Definition of done:

* Player can inspect any item.
* Player can clearly see whether an item is better or worse.
* Item UI shows practical farming impact.

---

## Milestone A3 — NPC market

Goal:

Give gold clear uses.

Tasks:

1. Add town market screen.
2. Add market categories.
3. Add buy flow.
4. Add potion items.
5. Add buff items.
6. Add starter gear.
7. Add basic materials.
8. Add limited stock system.
9. Add inventory integration.
10. Add gold validation.

Definition of done:

* Player can spend gold on potions, buffs, gear, and materials.
* Purchased items appear in inventory.
* Potions and buffs affect farming.

---

## Milestone A4 — Gear improvement

Goal:

Create long-term gear investment.

Tasks:

1. Add gear upgrade level.
2. Add upgrade menu.
3. Add upgrade cost calculation.
4. Add material requirements.
5. Add success chance logic.
6. Add failure logic.
7. Add safe upgrade stone.
8. Add upgrade preview.
9. Add material source hints.
10. Add upgraded stat calculation.

Definition of done:

* Player can upgrade gear from +0 to +10.
* Upgrades cost gold and materials.
* Upgrade preview shows exact improvement.
* Failure is possible at higher levels.
* Items are not destroyed on failure.

---

## Milestone A5 — Improved map selection

Goal:

Make maps strategic and transparent.

Tasks:

1. Add map details screen.
2. Add enemy list per map.
3. Add enemy stats display.
4. Add enemy drop display.
5. Add map drop table tab.
6. Add discovered/undiscovered drops.
7. Add farming estimate calculation.
8. Add map recommendation tags.
9. Add map comparison.
10. Add target farming search.

Definition of done:

* Player can inspect enemies and drops before farming.
* Player can choose maps based on goals.
* Player can target farm specific items/cards/materials.

---

# 14. Suggested alpha content additions

## 14.1 New items

Add enough gear to support the new upgrade system.

### Warrior gear

| Item          | Type      | Effect                      |
| ------------- | --------- | --------------------------- |
| Iron Sword    | Weapon    | Basic STR weapon            |
| Broad Axe     | Weapon    | Higher attack, slower speed |
| Guard Shield  | Off-hand  | Defense and block           |
| Soldier Armor | Armor     | HP and defense              |
| Heavy Boots   | Boots     | Defense, lower flee         |
| Warrior Ring  | Accessory | STR and VIT                 |

### Ranger gear

| Item          | Type      | Effect                  |
| ------------- | --------- | ----------------------- |
| Hunter Bow    | Weapon    | DEX and ranged attack   |
| Quick Dagger  | Weapon    | AGI and attack speed    |
| Leather Vest  | Armor     | Flee and light defense  |
| Scout Boots   | Boots     | Flee and movement       |
| Falcon Ring   | Accessory | Crit and DEX            |
| Lucky Feather | Accessory | LUK and rare drop bonus |

### Mage gear

| Item             | Type      | Effect               |
| ---------------- | --------- | -------------------- |
| Apprentice Staff | Weapon    | Magic attack         |
| Spell Book       | Off-hand  | INT and SP           |
| Woven Robe       | Armor     | Magic defense and SP |
| Mana Sandals     | Boots     | SP regen             |
| Arcane Ring      | Accessory | INT                  |
| Crystal Charm    | Accessory | Elemental damage     |

---

## 14.2 New materials

| Material           | Source                | Purpose             |
| ------------------ | --------------------- | ------------------- |
| Iron Ore           | Cave enemies, market  | Weapon upgrades     |
| Tough Hide         | Beast enemies, market | Armor upgrades      |
| Magic Dust         | Mage enemies, market  | Magic gear upgrades |
| Sharp Fang         | Beast enemies         | Ranger gear         |
| Slime Core         | Slime enemies         | Beginner upgrades   |
| Fire Fragment      | Fire enemies          | Fire gear           |
| Frost Crystal      | Water/ice enemies     | Ice gear            |
| Wind Feather       | Flying enemies        | Ranger/mage gear    |
| Boss Essence       | MVPs                  | High-level upgrades |
| Safe Upgrade Stone | MVPs, limited market  | Upgrade protection  |

---

## 14.3 New market NPC categories

### Potion seller

Sells:

* HP potions.
* SP potions.
* Recovery bundles.

### Cook

Sells:

* Attack Meal.
* Magic Tea.
* Guard Tonic.
* Swift Juice.

### Blacksmith

Sells:

* Basic weapons.
* Basic armor.
* Upgrade stones.
* Basic materials.

### Traveling merchant

Sells limited stock:

* Rare materials.
* Discount items.
* Buff items.
* Safe upgrade stones.
* Class-specific gear.

---

# 15. Alpha balancing recommendations

## 15.1 Gold economy

Gold should now have four competing uses:

1. Potions for survival.
2. Buffs for faster farming.
3. Gear from the market.
4. Gear improvement.

This creates a good player decision:

> “Do I spend gold to survive this map now, or save it to upgrade my weapon?”

## 15.2 Gear upgrade balance

Early upgrades should feel good and safe.

Recommended:

* +1 and +2 should be cheap and guaranteed.
* +3 should be easy.
* +4 and +5 should be common goals.
* +6 and above should feel like investment.
* +8 and above should require MVP farming.

## 15.3 Skill balance

Each class should have at least three viable builds.

### Warrior builds

| Build       | Main skills                                 | Focus              |
| ----------- | ------------------------------------------- | ------------------ |
| Tank Farmer | Iron Skin, Battle Endurance, Blood Recovery | Safe long sessions |
| DPS Warrior | Power Strike, War Cry, Armor Breaker        | Faster kills       |
| MVP Warrior | Shield Guard, Last Stand, MVP Guard         | Boss survival      |

### Ranger builds

| Build       | Main skills                                  | Focus             |
| ----------- | -------------------------------------------- | ----------------- |
| Fast Farmer | Double Shot, Quick Step, Arrow Storm         | EXP/hour          |
| Crit Hunter | Critical Focus, Weak Point Mark, Focused Aim | Damage scaling    |
| Drop Hunter | Hunter’s Instinct, Windwalk, Eagle Eye       | Rare/card farming |

### Mage builds

| Build          | Main skills                                | Focus               |
| -------------- | ------------------------------------------ | ------------------- |
| Element Farmer | Fire/Frost/Lightning, Elemental Study      | Map-specific damage |
| Mana Sustain   | Mana Control, Arcane Recovery              | Long sessions       |
| MVP Burst      | Spell Echo, Elemental Burst, Magic Barrier | Boss kills          |

---

# 16. Recommended implementation order

For the best development flow, implement in this order:

1. Item detail and comparison UI.
2. Skill data and skill UI.
3. Skill effects in combat.
4. NPC market with potions and gear.
5. Potion/buff combat integration.
6. Gear improvement system.
7. Improved map screen with enemies and drops.
8. Target farming search.
9. Map comparison.
10. Balance pass.

Reason:

The item UI should come first because the market, gear upgrading, and map drops all depend on the player understanding item value.

---

# 17. Definition of alpha complete

The alpha version is complete when:

* Each class has a full skill list.
* Skills unlock by character level.
* Player can level and equip skills.
* Gear comparison is clear and useful.
* Items have descriptions and visible stats.
* NPC market sells potions, buffs, gear, and materials.
* Potions and buffs work in combat.
* Gear can be upgraded using gold and materials.
* Upgrade preview shows stat and farming impact.
* Map selection shows enemies, drops, cards, MVP, and expected farming results.
* Player can target farm known drops.
* Gold has meaningful spending decisions.
* Each class has at least three viable build directions.
* The game feels more like a real idle RPG, not just a leveling prototype.

---

# 18. Alpha success criteria

The alpha is successful if players start asking questions like:

* “Which map should I farm for this card?”
* “Is this bow better than my upgraded one?”
* “Should I spend gold on potions or save for upgrades?”
* “Can my Mage survive this map if I buy Magic Barrier?”
* “Should my Ranger focus on crit or rare drops?”
* “Is my Warrior ready to auto-attempt this MVP?”
* “Should I upgrade this item or wait for a better drop?”

Those questions mean the game now has real buildcraft and strategic idle progression.
