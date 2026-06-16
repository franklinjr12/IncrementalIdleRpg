import Phaser from 'phaser';
import {
  CLASS_BY_ID,
  CLASSES,
  ITEM_BY_ID,
  MAPS,
  MAP_BY_ID,
  MONSTER_BY_ID,
  SKILLS,
  createInitialState,
  createSession,
  type AttributeKey,
  type ClassId,
  type EquipmentInstance,
  type EquipmentSlot,
  type GameState,
  type SessionReport,
  type SkillDefinition
} from '../game/GameState';
import { advanceCombat, estimateSurvival, refreshSessionRates, startFarming, stopFarming } from '../game/CombatSimulator';
import {
  MARKET_ITEMS,
  allTargetNames,
  attemptGearUpgrade,
  buyMarketItem,
  canLearnSkill,
  dropsForMap,
  effectiveItemScore,
  equipmentCompareSummary,
  findDropTargets,
  getInstanceItem,
  getItemStats,
  getUpgradePreview,
  itemSources,
  materialSources,
  normalizeMarketStock,
  normalizeSkillLoadout,
  skillPointCost,
  statLinesForItem,
  toggleSkillLoadout,
  estimateMap,
  type MarketCategory
} from '../game/AlphaSystems';
import {
  equipmentSlotLabel,
  equipItem,
  expToLevel,
  getDerivedStats,
  getEquippedInstances,
  itemScore,
  jobExpToLevel,
  learnSkill,
  pushLog,
  sellItem,
  spendStatPoint
} from '../game/Economy';
import {
  createSave,
  deleteSave,
  getActiveSaveId,
  listSaves,
  loadSave,
  migrateLegacySaveIfNeeded,
  saveGame,
  type SaveMetadata
} from '../game/SaveSystem';
import { getOfflineCapHours } from '../game/OfflineProgress';

type ViewId = 'battle' | 'character' | 'maps' | 'inventory' | 'skills' | 'market' | 'upgrade' | 'report';
type ScreenMode = 'saves' | 'new' | 'game';
type MapTab = 'enemies' | 'drops' | 'estimate' | 'compare' | 'target';

const INVENTORY_VISIBLE_ITEMS = 7;
const INVENTORY_ITEM_HEIGHT = 58;
const INVENTORY_LIST_X = 20;
const INVENTORY_LIST_Y = 364;
const INVENTORY_LIST_WIDTH = 332;
const SAVES_VISIBLE_ITEMS = 6;

const COLORS = {
  background: 0x0d1320,
  panel: 0x182235,
  panelAlt: 0x202d43,
  border: 0x405371,
  text: '#f5f1df',
  muted: '#9fb0c7',
  gold: '#f1c75b',
  green: 0x3ba272,
  red: 0xc94f5d,
  blue: 0x3c78b5,
  purple: 0x7659ad
};

export class MainScene extends Phaser.Scene {
  private state: GameState = createInitialState();
  private root?: Phaser.GameObjects.Container;
  private screenMode: ScreenMode = 'saves';
  private view: ViewId = 'battle';
  private mapTab: MapTab = 'enemies';
  private redrawTimer = 0;
  private saveTimer = 0;
  private offlineReport: SessionReport | null = null;
  private saves: SaveMetadata[] = [];
  private saveScrollIndex = 0;
  private pendingDeleteSaveId: string | null = null;
  private newCharacterName = 'Adventurer';
  private selectedInventoryUid: string | null = null;
  private selectedUpgradeUid: string | null = null;
  private selectedSkillId: string | null = null;
  private selectedMapId = 'slime_field';
  private selectedMarketCategory: MarketCategory = 'potion';
  private compareMapIds: string[] = ['slime_field', 'forest_path'];
  private targetIndex = 0;
  private inventoryScrollIndex = 0;

  constructor() {
    super('MainScene');
  }

  create(): void {
    migrateLegacySaveIfNeeded();
    this.refreshSaveList();
    this.cameras.main.setBackgroundColor(COLORS.background);
    this.root = this.add.container(0, 0);
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
      if (this.screenMode === 'saves') {
        const inSaves = pointer.x >= 20 && pointer.x <= 700 && pointer.y >= 226 && pointer.y <= 226 + SAVES_VISIBLE_ITEMS * 132;
        if (inSaves) this.scrollSaves(deltaY > 0 ? 1 : -1);
        return;
      }
      if (this.view !== 'inventory') return;
      const inBag = pointer.x >= INVENTORY_LIST_X && pointer.x <= INVENTORY_LIST_X + INVENTORY_LIST_WIDTH
        && pointer.y >= 326 && pointer.y <= INVENTORY_LIST_Y + INVENTORY_VISIBLE_ITEMS * INVENTORY_ITEM_HEIGHT;
      if (inBag) this.scrollInventory(deltaY > 0 ? 1 : -1);
    });
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => this.handleNameKey(event));
    this.render();

    window.addEventListener('beforeunload', () => this.saveActiveGame());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.saveActiveGame();
    });
  }

  update(_time: number, delta: number): void {
    if (this.screenMode !== 'game') return;
    if (this.state.farming) {
      advanceCombat(this.state, delta / 1000);
      refreshSessionRates(this.state);
    }
    this.redrawTimer += delta;
    this.saveTimer += delta;
    if (this.redrawTimer >= 250) {
      this.redrawTimer = 0;
      this.render();
    }
    if (this.saveTimer >= 5000) {
      this.saveTimer = 0;
      saveGame(this.state);
    }
  }

  private render(): void {
    this.root?.removeAll(true);
    if (this.screenMode === 'saves') {
      this.renderSaveSelection();
      return;
    }
    if (this.screenMode === 'new') {
      this.renderClassSelection();
      return;
    }
    if (!this.state.character) {
      this.screenMode = 'saves';
      this.renderSaveSelection();
      return;
    }

    this.renderHeader();
    if (this.view === 'battle') this.renderBattle();
    if (this.view === 'character') this.renderCharacter();
    if (this.view === 'maps') this.renderMaps();
    if (this.view === 'inventory') this.renderInventory();
    if (this.view === 'skills') this.renderSkills();
    if (this.view === 'market') this.renderMarket();
    if (this.view === 'upgrade') this.renderUpgrade();
    if (this.view === 'report') this.renderReport();
    this.renderNavigation();
  }

  private renderSaveSelection(): void {
    this.refreshSaveList();
    this.text(360, 62, 'IDLE REALMS', 38, COLORS.gold, 'center', true);
    this.text(360, 108, 'Choose a character save', 22, COLORS.text, 'center');
    this.text(360, 142, 'Continue an adventurer or begin a new one.', 15, COLORS.muted, 'center');
    this.button(240, 170, 240, 52, 'New Character', () => this.beginNewCharacter(), COLORS.green);

    if (this.saves.length === 0) {
      this.panel(40, 270, 640, 300, COLORS.blue);
      this.text(360, 358, 'No character saves yet', 26, COLORS.text, 'center', true);
      this.text(360, 414, 'Create a character to start farming.', 17, COLORS.muted, 'center');
      return;
    }

    this.clampSaveScroll();
    const visible = this.saves.slice(this.saveScrollIndex, this.saveScrollIndex + SAVES_VISIBLE_ITEMS);
    visible.forEach((save, index) => {
      const y = 226 + index * 132;
      const definition = CLASS_BY_ID[save.classId];
      const map = MAP_BY_ID[save.currentMapId];
      const pendingDelete = this.pendingDeleteSaveId === save.id;
      this.panel(20, y, 680, 112, pendingDelete ? COLORS.red : definition.color);
      this.box(42, y + 18, 74, 74, definition.color, definition.name.toUpperCase());
      this.text(136, y + 14, save.name, 22, COLORS.text, 'left', true, 300);
      this.text(136, y + 46, `${definition.name}  |  Base ${save.level}  Job ${save.jobLevel}`, 14, COLORS.gold);
      this.text(136, y + 73, `${Math.floor(save.gold).toLocaleString()} G  |  ${map?.name ?? save.currentMapId}  |  ${this.relativeTime(save.lastSavedAt)}`, 13, COLORS.muted, 'left', false, 360);
      this.button(508, y + 18, 76, 74, 'Play', () => this.playSave(save.id), COLORS.green);
      this.button(598, y + 18, 78, 74, pendingDelete ? 'Confirm' : 'Delete', () => this.deleteSaveWithConfirmation(save.id), pendingDelete ? COLORS.red : COLORS.panelAlt);
    });

    if (this.saves.length > SAVES_VISIBLE_ITEMS) {
      this.text(360, 1032, `${this.saveScrollIndex + 1}-${Math.min(this.saveScrollIndex + SAVES_VISIBLE_ITEMS, this.saves.length)} / ${this.saves.length}`, 14, COLORS.muted, 'center');
      this.button(224, 1062, 124, 44, 'Up', () => this.scrollSaves(-1), this.saveScrollIndex > 0 ? COLORS.panelAlt : COLORS.panel);
      this.button(372, 1062, 124, 44, 'Down', () => this.scrollSaves(1), this.saveScrollIndex < this.saves.length - SAVES_VISIBLE_ITEMS ? COLORS.panelAlt : COLORS.panel);
    }
  }

  private renderClassSelection(): void {
    this.text(360, 62, 'IDLE REALMS', 38, COLORS.gold, 'center', true);
    this.text(360, 108, 'Create a new character', 22, COLORS.text, 'center');
    this.text(360, 142, 'Name your adventurer, then choose a class.', 15, COLORS.muted, 'center');
    this.panel(80, 166, 560, 62, COLORS.blue);
    this.text(104, 184, 'Name', 14, COLORS.gold, 'left', true);
    this.text(186, 181, `${this.newCharacterName}_`, 20, COLORS.text, 'left', true, 360);
    this.button(534, 176, 82, 42, 'Back', () => {
      this.screenMode = 'saves';
      this.pendingDeleteSaveId = null;
      this.render();
    }, COLORS.panelAlt);

    CLASSES.forEach((definition, index) => {
      const y = 258 + index * 276;
      this.panel(28, y, 664, 268, definition.color);
      this.box(74, y + 48, 112, 112, definition.color, definition.name.toUpperCase());
      this.text(212, y + 34, definition.name, 28, COLORS.text, 'left', true);
      this.text(212, y + 73, definition.description, 16, COLORS.muted, 'left', false, 430);
      this.text(54, y + 150, `Main stats: ${definition.mainStats}`, 16, COLORS.gold);
      this.text(54, y + 178, `Strength: ${definition.strength}`, 15, '#b8e5c9');
      this.text(54, y + 204, `Weakness: ${definition.weakness}`, 15, '#efadb4');
      this.button(510, y + 224, 154, 54, 'Choose', () => this.chooseClass(definition.id), COLORS.green);
    });

    this.text(360, 1130, 'Progress is saved locally. Offline farming cap: 8 hours.', 15, COLORS.muted, 'center');
  }

  private chooseClass(classId: ClassId): void {
    this.state = createSave(classId, this.newCharacterName);
    const stats = getDerivedStats(this.state);
    this.state.character!.hp = stats.maxHp;
    this.state.character!.sp = stats.maxSp;
    this.screenMode = 'game';
    this.view = 'battle';
    this.offlineReport = null;
    normalizeMarketStock(this.state);
    normalizeSkillLoadout(this.state);
    this.selectedMapId = this.state.currentMapId;
    this.selectedInventoryUid = this.state.equipment.weapon;
    this.selectedUpgradeUid = this.state.equipment.weapon;
    saveGame(this.state);
    this.render();
  }

  private renderHeader(): void {
    const character = this.state.character!;
    const definition = CLASS_BY_ID[character.classId];
    this.panel(0, 0, 720, 76, definition.color);
    this.text(20, 14, `${character.name}  |  ${definition.name}`, 21, COLORS.text, 'left', true);
    this.text(20, 43, `Base ${character.level}  Job ${character.jobLevel}`, 15, COLORS.muted);
    this.text(592, 18, `${Math.floor(this.state.gold).toLocaleString()} G`, 19, COLORS.gold, 'right', true);
    this.text(592, 45, this.state.farming ? 'AUTO-FARMING' : 'IN TOWN', 13, this.state.farming ? '#83e6ad' : COLORS.muted, 'right', true);
    this.button(612, 18, 86, 40, 'Saves', () => this.returnToSaves(), COLORS.panelAlt);
  }

  private renderBattle(): void {
    const character = this.state.character!;
    const stats = getDerivedStats(this.state);
    const map = MAP_BY_ID[this.state.currentMapId];
    const progress = this.state.mapProgress[map.id];
    const enemy = this.state.combat ? MONSTER_BY_ID[this.state.combat.enemyId] : null;

    this.text(28, 92, map.name, 25, COLORS.text, 'left', true);
    this.text(692, 97, `MVP ${Math.min(progress.killsSinceMvp, map.mvpThreshold)}/${map.mvpThreshold}`, 15, COLORS.gold, 'right');
    this.bar(28, 130, 664, 12, progress.killsSinceMvp / map.mvpThreshold, COLORS.purple);

    this.panel(20, 160, 680, 368, map.color);
    this.text(360, 178, enemy?.boss ? 'MVP ENCOUNTER' : map.theme, 15, enemy?.boss ? '#ffcf66' : COLORS.muted, 'center', true);
    this.box(70, 238, 210, 155, CLASS_BY_ID[character.classId].color, `${CLASS_BY_ID[character.classId].name}\nLV ${character.level}`);
    this.box(440, 238, 210, 155, enemy?.color ?? 0x313e52, enemy ? `${enemy.name}\nLV ${enemy.level}` : 'WAITING\nFOR TARGET');
    this.text(70, 412, `HP ${Math.ceil(character.hp)} / ${stats.maxHp}`, 14, COLORS.text);
    this.bar(70, 434, 210, 18, character.hp / stats.maxHp, COLORS.red);
    this.text(70, 462, `SP ${Math.ceil(character.sp)} / ${stats.maxSp}`, 14, COLORS.text);
    this.bar(70, 484, 210, 14, character.sp / stats.maxSp, COLORS.blue);
    const enemyHp = this.state.combat && enemy ? this.state.combat.enemyHp / enemy.hp : 0;
    this.text(440, 412, enemy ? `HP ${Math.max(0, Math.ceil(this.state.combat!.enemyHp))} / ${enemy.hp}` : 'No target', 14, COLORS.text);
    this.bar(440, 434, 210, 18, enemyHp, enemy?.boss ? 0xd49b34 : COLORS.green);
    this.text(440, 462, enemy ? `${enemy.race} | ${enemy.element.toUpperCase()} | ${enemy.attackType}` : 'Start farming below', 14, COLORS.muted);

    this.panel(20, 548, 680, 125);
    this.text(40, 566, 'LOADOUT', 15, COLORS.gold, 'left', true);
    const loadout = character.skillLoadout.map((id) => SKILL_BY_ID_SAFE(id)?.name ?? id).join('  |  ') || 'No active skills equipped';
    this.text(40, 602, loadout, 15, COLORS.text, 'left', false, 630);
    const buffs = Object.entries(this.state.activeBuffs).map(([id, sec]) => `${SKILL_BY_ID_SAFE(id)?.name ?? MARKET_ITEMS.find((entry) => entry.consumableId === id)?.name ?? id} ${Math.ceil(sec)}s`);
    this.text(40, 634, buffs.join('  |  ') || 'No buffs active', 13, COLORS.muted, 'left', false, 630);

    this.panel(20, 694, 680, 176);
    this.text(40, 712, 'COMBAT LOG', 15, COLORS.gold, 'left', true);
    this.state.combatLog.slice(0, 5).forEach((line, index) => this.text(42, 742 + index * 24, line, 14, index === 0 ? COLORS.text : COLORS.muted));

    const session = this.state.currentSession;
    this.panel(20, 892, 680, 156);
    this.text(40, 910, 'CURRENT SESSION', 15, COLORS.gold, 'left', true);
    this.text(40, 940, `Time ${this.duration(session.duration)}   Kills ${session.kills}   Gold ${session.gold}`, 16, COLORS.text);
    this.text(40, 970, `EXP ${session.exp}   Job EXP ${session.jobExp}   MVPs ${session.mvpKills}/${session.mvpAttempts}`, 15, COLORS.muted);
    this.text(40, 1000, session.diagnosis, 14, '#c7d5e8', 'left', false, 630);

    this.button(40, 1070, 302, 72, this.state.farming ? 'Stop Farming' : 'Start Farming', () => {
      if (this.state.farming) stopFarming(this.state);
      else {
        if (this.state.currentSession.duration > 0) this.state.currentSession = createSession(this.state.currentMapId);
        startFarming(this.state);
      }
      saveGame(this.state);
      this.render();
    }, this.state.farming ? COLORS.red : COLORS.green);
    this.button(364, 1070, 150, 72, this.state.autoMvp ? 'MVP ON' : 'MVP OFF', () => {
      this.state.autoMvp = !this.state.autoMvp;
      saveGame(this.state);
      this.render();
    }, this.state.autoMvp ? COLORS.purple : COLORS.panelAlt);
    this.button(536, 1070, 144, 72, 'Report', () => {
      this.view = 'report';
      this.render();
    }, COLORS.blue);
  }

  private renderCharacter(): void {
    const character = this.state.character!;
    const stats = getDerivedStats(this.state);
    this.text(28, 94, 'Character', 28, COLORS.text, 'left', true);
    this.text(692, 101, `${character.statPoints} stat points`, 16, COLORS.gold, 'right', true);

    this.panel(20, 140, 680, 226);
    const statLines = [
      `HP ${stats.maxHp}     SP ${stats.maxSp}`,
      `Attack ${stats.attack}     Magic ${stats.magicAttack}`,
      `Defense ${stats.defense}     M.Def ${stats.magicDefense}`,
      `Hit ${stats.hit}     Flee ${stats.flee}`,
      `Crit ${stats.crit.toFixed(1)}%     APS ${(1 / stats.attackInterval).toFixed(2)}`
    ];
    statLines.forEach((line, index) => this.text(45, 166 + index * 36, line, 18, index === 0 ? COLORS.text : COLORS.muted));

    this.text(28, 390, 'Attributes', 22, COLORS.text, 'left', true);
    const attributes: { key: AttributeKey; effect: string }[] = [
      { key: 'str', effect: 'melee damage and Warrior sustain' },
      { key: 'agi', effect: 'speed, flee, and counters' },
      { key: 'vit', effect: 'HP, defense, and safety' },
      { key: 'int', effect: 'magic, SP, and Mage sustain' },
      { key: 'dex', effect: 'hit, ranged damage, cast reliability' },
      { key: 'luk', effect: 'crit and rare drops' }
    ];
    attributes.forEach((entry, index) => {
      const y = 430 + index * 82;
      this.panel(20, y, 680, 66);
      this.text(42, y + 12, entry.key.toUpperCase(), 19, COLORS.gold, 'left', true);
      this.text(116, y + 13, `${character.attributes[entry.key]}`, 19, COLORS.text, 'left', true);
      this.text(180, y + 16, entry.effect, 14, COLORS.muted);
      this.button(618, y + 9, 60, 48, '+', () => {
        if (spendStatPoint(this.state, entry.key)) {
          saveGame(this.state);
          this.render();
        }
      }, character.statPoints > 0 ? COLORS.green : COLORS.panelAlt);
    });

    this.panel(20, 942, 680, 188);
    this.text(42, 960, `Base EXP  ${character.exp} / ${expToLevel(character.level)}`, 15, COLORS.text);
    this.bar(42, 987, 636, 14, character.exp / expToLevel(character.level), COLORS.green);
    this.text(42, 1016, `Job EXP   ${character.jobExp} / ${jobExpToLevel(character.jobLevel)}`, 15, COLORS.text);
    this.bar(42, 1043, 636, 14, character.jobExp / jobExpToLevel(character.jobLevel), COLORS.blue);
    this.text(42, 1077, `Skill points fuel unlocked skills. Higher skill levels cost 2-3 points.`, 14, COLORS.muted, 'left', false, 630);
  }

  private renderInventory(): void {
    this.text(28, 94, 'Inventory & Equipment', 28, COLORS.text, 'left', true);
    this.text(692, 101, `${this.state.inventory.length} items`, 15, COLORS.gold, 'right');

    this.panel(20, 136, 680, 166);
    this.text(42, 154, 'EQUIPPED', 15, COLORS.gold, 'left', true);
    (Object.keys(this.state.equipment) as EquipmentSlot[]).forEach((slot, index) => {
      const uid = this.state.equipment[slot];
      const instance = this.state.inventory.find((entry) => entry.uid === uid);
      const item = instance ? ITEM_BY_ID[instance.itemId] : null;
      const x = 42 + (index % 2) * 326;
      const y = 188 + Math.floor(index / 2) * 36;
      this.text(x, y, `${equipmentSlotLabel(slot)}:`, 13, COLORS.muted);
      this.text(x + 88, y, item ? `${item.name} +${instance!.upgradeLevel}` : 'Empty', 13, item ? this.rarityColor(item.rarity) : '#65758b', 'left', Boolean(item));
    });

    const sortedItems = this.sortedInventory();
    this.clampInventoryScroll(sortedItems);
    const items = sortedItems.slice(this.inventoryScrollIndex, this.inventoryScrollIndex + INVENTORY_VISIBLE_ITEMS);
    if (!this.selectedInventoryUid && items[0]) this.selectedInventoryUid = items[0].uid;
    this.text(28, 326, 'Bag', 22, COLORS.text, 'left', true);
    this.text(238, 332, `${Math.min(this.inventoryScrollIndex + 1, sortedItems.length)}-${Math.min(this.inventoryScrollIndex + INVENTORY_VISIBLE_ITEMS, sortedItems.length)} / ${sortedItems.length}`, 12, COLORS.muted, 'right');
    if (sortedItems.length > INVENTORY_VISIBLE_ITEMS) {
      this.button(246, 324, 50, 28, 'Up', () => this.scrollInventory(-1), this.inventoryScrollIndex > 0 ? COLORS.panelAlt : COLORS.panel);
      this.button(302, 324, 50, 28, 'Down', () => this.scrollInventory(1), this.inventoryScrollIndex < sortedItems.length - INVENTORY_VISIBLE_ITEMS ? COLORS.panelAlt : COLORS.panel);
      const trackHeight = INVENTORY_VISIBLE_ITEMS * INVENTORY_ITEM_HEIGHT - 10;
      const thumbHeight = Math.max(32, trackHeight * (INVENTORY_VISIBLE_ITEMS / sortedItems.length));
      const thumbY = INVENTORY_LIST_Y + 5 + (trackHeight - thumbHeight) * (this.inventoryScrollIndex / (sortedItems.length - INVENTORY_VISIBLE_ITEMS));
      this.panel(356, INVENTORY_LIST_Y, 8, INVENTORY_VISIBLE_ITEMS * INVENTORY_ITEM_HEIGHT, COLORS.border);
      const thumb = this.add.rectangle(357, thumbY, 6, thumbHeight, COLORS.gold, 0.85).setOrigin(0);
      this.root?.add(thumb);
    }
    items.forEach((instance, index) => {
      const item = getInstanceItem(instance);
      const y = INVENTORY_LIST_Y + index * INVENTORY_ITEM_HEIGHT;
      const selected = instance.uid === this.selectedInventoryUid;
      const equipped = Object.values(this.state.equipment).includes(instance.uid);
      this.panel(20, y, 332, 48, selected ? COLORS.blue : COLORS.panel);
      this.text(38, y + 8, `${item.name} +${instance.upgradeLevel}${instance.locked ? ' [L]' : ''}`, 14, this.rarityColor(item.rarity), 'left', true, 220);
      this.text(38, y + 28, `${equipmentSlotLabel(item.slot)} | Power ${Math.floor(effectiveItemScore(instance))}`, 11, COLORS.muted);
      this.button(286, y + 7, 48, 34, 'View', () => {
        this.selectedInventoryUid = instance.uid;
        this.render();
      }, selected ? COLORS.green : COLORS.panelAlt);
      if (equipped) this.text(346, y + 15, '*', 18, '#83e6ad', 'right', true);
    });

    this.renderItemDetail(374, 326, 326, 522, this.selectedInventoryUid);

    const materials = Object.entries(this.state.materials).sort((a, b) => b[1] - a[1]).slice(0, 6);
    this.panel(20, 870, 680, 94);
    this.text(42, 888, `MATERIALS  ${materials.map(([name, count]) => `${name} x${count}`).join('  |  ') || 'None yet'}`, 13, COLORS.muted, 'left', false, 636);
    this.text(42, 930, `CARDS  ${this.state.cards.length > 0 ? this.state.cards.slice(-5).join('  |  ') : 'No cards found yet'}`, 13, '#d8b7ff', 'left', false, 636);

    this.panel(20, 984, 680, 146);
    const consumables = Object.entries(this.state.consumables).filter(([, count]) => count > 0);
    this.text(42, 1002, 'CONSUMABLES', 15, COLORS.gold, 'left', true);
    this.text(42, 1034, consumables.map(([id, count]) => `${MARKET_ITEMS.find((entry) => entry.consumableId === id)?.name ?? id} x${count}`).join('  |  ') || 'Buy potions and meals in the market.', 13, COLORS.muted, 'left', false, 630);
  }

  private renderItemDetail(x: number, y: number, width: number, height: number, uid: string | null): void {
    this.panel(x, y, width, height, COLORS.purple);
    const instance = this.state.inventory.find((entry) => entry.uid === uid);
    if (!instance) {
      this.text(x + width / 2, y + 210, 'Select an item', 18, COLORS.muted, 'center');
      return;
    }
    const item = getInstanceItem(instance);
    const current = this.equippedForSlot(item.slot);
    const comparison = equipmentCompareSummary(current?.uid === instance.uid ? null : current, instance);
    const dps = this.estimateDpsChange(instance);
    const survival = this.estimateSurvivalChange(instance);
    const expHour = this.estimateExpHourChange(instance);
    this.text(x + 18, y + 18, `${item.name} +${instance.upgradeLevel}`, 18, this.rarityColor(item.rarity), 'left', true, width - 36);
    this.text(x + 18, y + 48, `${item.rarity.toUpperCase()} ${equipmentSlotLabel(item.slot)} | LV ${item.level}`, 12, COLORS.gold);
    this.text(x + 18, y + 74, item.description, 12, COLORS.muted, 'left', false, width - 36);
    statLinesForItem(item, instance.upgradeLevel).slice(0, 7).forEach((line, index) => this.text(x + 18, y + 136 + index * 22, line, 13, COLORS.text));
    this.text(x + 18, y + 300, `Power delta ${comparison.scoreDelta >= 0 ? '+' : ''}${comparison.scoreDelta.toFixed(1)}`, 14, comparison.scoreDelta >= 0 ? '#83e6ad' : '#efadb4', 'left', true);
    comparison.lines.slice(0, 3).forEach((line, index) => this.text(x + 18, y + 326 + index * 21, line, 12, COLORS.muted, 'left', false, width - 36));
    this.text(x + 18, y + 398, `DPS ${dps.before.toFixed(1)} -> ${dps.after.toFixed(1)}   Survival ${survival.before} -> ${survival.after}`, 12, COLORS.text, 'left', false, width - 36);
    this.text(x + 18, y + 428, `EXP/h ${dps.integer(expHour.before)} -> ${dps.integer(expHour.after)}`, 12, COLORS.gold);
    this.text(x + 18, y + 454, `Sources: ${itemSources(item.id).slice(0, 3).join(', ')}`, 11, COLORS.muted, 'left', false, width - 36);
    this.button(x + 18, y + height - 50, 82, 36, 'Equip', () => {
      if (equipItem(this.state, instance.uid)) {
        saveGame(this.state);
        this.render();
      }
    }, COLORS.blue);
    this.button(x + 108, y + height - 50, 74, 36, instance.locked ? 'Unlock' : 'Lock', () => {
      instance.locked = !instance.locked;
      saveGame(this.state);
      this.render();
    }, instance.locked ? COLORS.purple : COLORS.panelAlt);
    this.button(x + 190, y + height - 50, 82, 36, 'Sell', () => {
      const beforeSellItems = this.sortedInventory();
      const soldIndex = beforeSellItems.findIndex((entry) => entry.uid === instance.uid);
      if (sellItem(this.state, instance.uid)) {
        const afterSellItems = this.sortedInventory();
        this.selectedInventoryUid = afterSellItems[Math.min(soldIndex, afterSellItems.length - 1)]?.uid ?? null;
        if (this.selectedInventoryUid) {
          const selectedIndex = afterSellItems.findIndex((entry) => entry.uid === this.selectedInventoryUid);
          this.scrollInventoryToInclude(selectedIndex);
        }
        this.clampInventoryScroll(afterSellItems);
        saveGame(this.state);
        this.render();
      }
    }, instance.locked || Object.values(this.state.equipment).includes(instance.uid) ? COLORS.panelAlt : COLORS.red);
  }

  private renderSkills(): void {
    const character = this.state.character!;
    const classSkills = SKILLS.filter((skill) => skill.classId === character.classId);
    if (!this.selectedSkillId) this.selectedSkillId = classSkills[0]?.id ?? null;
    this.text(28, 94, `${CLASS_BY_ID[character.classId].name} Skills`, 28, COLORS.text, 'left', true);
    this.text(692, 101, `${character.skillPoints} skill points`, 16, COLORS.gold, 'right', true);

    classSkills.forEach((skill, index) => {
      const y = 136 + index * 46;
      const level = character.skills[skill.id] ?? 0;
      const unlocked = character.level >= skill.unlockLevel;
      const selected = skill.id === this.selectedSkillId;
      this.panel(20, y, 330, 38, selected ? COLORS.blue : unlocked ? COLORS.panel : 0x121a29);
      this.text(36, y + 7, `${skill.name}`, 13, unlocked ? COLORS.text : COLORS.muted, 'left', true, 190);
      this.text(232, y + 8, `${level}/${skill.maxLevel}`, 12, COLORS.gold);
      this.button(286, y + 5, 48, 28, 'Info', () => {
        this.selectedSkillId = skill.id;
        this.render();
      }, selected ? COLORS.green : COLORS.panelAlt);
    });

    this.panel(374, 136, 326, 552, COLORS.purple);
    const skill = classSkills.find((entry) => entry.id === this.selectedSkillId) ?? classSkills[0];
    if (skill) this.renderSkillDetail(skill, 392, 154, 290);

    this.panel(20, 712, 680, 170);
    this.text(42, 730, 'ACTIVE LOADOUT', 15, COLORS.gold, 'left', true);
    normalizeSkillLoadout(this.state);
    const loadout = character.skillLoadout;
    for (let i = 0; i < 4; i += 1) {
      const id = loadout[i];
      this.panel(42 + i * 160, 770, 140, 60, id ? COLORS.purple : COLORS.panelAlt);
      this.text(112 + i * 160, 788, id ? SKILL_BY_ID_SAFE(id)?.name ?? id : 'Empty', 12, COLORS.text, 'center', true, 124);
    }
    this.text(42, 848, 'Equipped active and buff skills fire automatically during combat when SP and cooldown allow.', 13, COLORS.muted, 'left', false, 630);

    this.panel(20, 906, 680, 224);
    this.text(42, 924, 'BUILD DIRECTIONS', 15, COLORS.gold, 'left', true);
    const builds = character.classId === 'warrior'
      ? ['Tank Farmer: Iron Skin, Battle Endurance, Blood Recovery', 'DPS Warrior: Power Strike, War Cry, Armor Breaker', 'MVP Warrior: Shield Guard, Last Stand, MVP Guard']
      : character.classId === 'ranger'
        ? ['Fast Farmer: Double Shot, Quick Step, Arrow Storm', 'Crit Hunter: Critical Focus, Weak Point Mark, Focused Aim', "Drop Hunter: Hunter's Instinct, Windwalk, Eagle Eye"]
        : ['Element Farmer: Bolts and Elemental Study', 'Mana Sustain: Mana Control, Arcane Recovery', 'MVP Burst: Spell Echo, Elemental Burst, Magic Barrier'];
    builds.forEach((line, index) => this.text(42, 964 + index * 46, line, 14, COLORS.muted, 'left', false, 620));
  }

  private renderSkillDetail(skill: SkillDefinition, x: number, y: number, width: number): void {
    const character = this.state.character!;
    const level = character.skills[skill.id] ?? 0;
    const unlocked = character.level >= skill.unlockLevel;
    const cost = skillPointCost(level);
    const inLoadout = character.skillLoadout.includes(skill.id);
    this.text(x, y, skill.name, 20, COLORS.text, 'left', true, width);
    this.text(x, y + 34, `${skill.type.toUpperCase()} | Unlock LV ${skill.unlockLevel} | ${level}/${skill.maxLevel}`, 12, unlocked ? COLORS.gold : '#efadb4');
    this.text(x, y + 66, skill.description, 13, COLORS.muted, 'left', false, width);
    this.text(x, y + 136, `Stats: ${skill.affectedStats.map((stat) => stat.toUpperCase()).join(', ') || 'None'}`, 12, COLORS.text);
    this.text(x, y + 162, `Element: ${(skill.element ?? 'neutral').toUpperCase()} | Target: ${skill.target}`, 12, COLORS.muted);
    this.text(x, y + 190, `Formula: ${skill.formula}`, 12, COLORS.muted, 'left', false, width);
    this.text(x, y + 250, `Scaling: ${skill.scaling}`, 12, COLORS.muted, 'left', false, width);
    this.text(x, y + 318, `Tags: ${skill.tags.join(', ')}`, 12, COLORS.gold, 'left', false, width);
    this.text(x, y + 352, `Next level cost: ${cost} point${cost > 1 ? 's' : ''}`, 12, COLORS.text);
    this.button(x, y + 386, 126, 42, level >= skill.maxLevel ? 'MAX' : unlocked ? 'Learn +1' : `LV ${skill.unlockLevel}`, () => {
      if (learnSkill(this.state, skill.id)) {
        saveGame(this.state);
        this.render();
      }
    }, canLearnSkill(this.state, skill) ? COLORS.green : COLORS.panelAlt);
    if (skill.type === 'active' || skill.type === 'buff') {
      this.button(x + 144, y + 386, 126, 42, inLoadout ? 'Unequip' : 'Equip', () => {
        if (toggleSkillLoadout(this.state, skill.id)) {
          saveGame(this.state);
          this.render();
        }
      }, level > 0 ? COLORS.blue : COLORS.panelAlt);
    }
  }

  private renderMarket(): void {
    normalizeMarketStock(this.state);
    this.text(28, 94, 'Town Market', 28, COLORS.text, 'left', true);
    this.text(692, 101, 'Potions, buffs, gear, materials', 14, COLORS.muted, 'right');
    const categories: MarketCategory[] = ['potion', 'buff', 'gear', 'material', 'limited'];
    categories.forEach((category, index) => {
      this.button(22 + index * 136, 136, 126, 44, category.toUpperCase(), () => {
        this.selectedMarketCategory = category;
        this.render();
      }, this.selectedMarketCategory === category ? COLORS.blue : COLORS.panelAlt);
    });

    const entries = MARKET_ITEMS.filter((entry) => entry.category === this.selectedMarketCategory);
    entries.slice(0, 8).forEach((entry, index) => {
      const y = 202 + index * 92;
      const stock = entry.stockType === 'unlimited' ? 'Unlimited' : `${this.state.marketStock[entry.id] ?? 0} left`;
      const canBuy = this.state.gold >= entry.price && this.state.character!.level >= entry.requiredLevel && (entry.stockType === 'unlimited' || (this.state.marketStock[entry.id] ?? 0) > 0);
      this.panel(20, y, 680, 78, entry.stockType === 'unlimited' ? undefined : COLORS.purple);
      this.text(42, y + 10, `${entry.name} - ${entry.price} G`, 16, COLORS.text, 'left', true);
      this.text(42, y + 36, `${entry.npc} | ${stock} | LV ${entry.requiredLevel}`, 12, COLORS.gold);
      this.text(250, y + 14, entry.description, 12, COLORS.muted, 'left', false, 300);
      this.button(596, y + 17, 82, 44, 'Buy', () => {
        const message = buyMarketItem(this.state, entry.id);
        pushLog(this.state, message);
        saveGame(this.state);
        this.render();
      }, canBuy ? COLORS.green : COLORS.panelAlt);
    });

    this.panel(20, 966, 680, 164);
    this.text(42, 984, 'OWNED CONSUMABLES', 15, COLORS.gold, 'left', true);
    const consumables = Object.entries(this.state.consumables).filter(([, count]) => count > 0).slice(0, 4);
    consumables.forEach(([id, count], index) => {
      const entry = MARKET_ITEMS.find((item) => item.consumableId === id);
      const x = 42 + index * 160;
      this.text(x, 1024, `${entry?.name ?? id} x${count}`, 12, COLORS.text, 'left', false, 138);
      this.button(x, 1066, 128, 38, 'Use', () => {
        const message = this.useConsumable(id);
        pushLog(this.state, message);
        saveGame(this.state);
        this.render();
      }, entry?.category === 'buff' || entry?.id === 'daily_rare_meal' ? COLORS.blue : COLORS.panelAlt);
    });
    if (consumables.length === 0) this.text(42, 1032, 'Potions auto-trigger in combat after purchase. Buff food can be activated here.', 14, COLORS.muted, 'left', false, 630);
  }

  private useConsumable(id: string): string {
    const entry = MARKET_ITEMS.find((item) => item.consumableId === id);
    if (!entry || !entry.effect || (this.state.consumables[id] ?? 0) <= 0) return 'Consumable unavailable.';
    if (entry.effect.type === 'restore_hp' || entry.effect.type === 'restore_sp') return `${entry.name} will auto-trigger during combat.`;
    this.state.consumables[id] -= 1;
    this.state.activeBuffs[id] = entry.effect.durationSeconds ?? 900;
    return `${entry.name} activated.`;
  }

  private renderUpgrade(): void {
    this.text(28, 94, 'Gear Improvement', 28, COLORS.text, 'left', true);
    this.text(692, 101, 'Upgrade +0 to +10', 14, COLORS.muted, 'right');
    const items = this.sortedInventoryForUpgrade().slice(0, 9);
    if (!this.selectedUpgradeUid && items[0]) this.selectedUpgradeUid = items[0].uid;
    items.forEach((instance, index) => {
      const item = getInstanceItem(instance);
      const y = 140 + index * 54;
      const selected = instance.uid === this.selectedUpgradeUid;
      this.panel(20, y, 322, 44, selected ? COLORS.blue : COLORS.panel);
      this.text(38, y + 7, `${item.name} +${instance.upgradeLevel}`, 13, this.rarityColor(item.rarity), 'left', true, 200);
      this.text(236, y + 8, Math.floor(effectiveItemScore(instance)).toString(), 12, COLORS.gold);
      this.button(286, y + 6, 42, 32, 'Pick', () => {
        this.selectedUpgradeUid = instance.uid;
        this.render();
      }, selected ? COLORS.green : COLORS.panelAlt);
    });

    this.renderUpgradePreview(364, 140, 336, 724);
    this.panel(20, 902, 680, 228);
    this.text(42, 920, 'MATERIAL SOURCE HINTS', 15, COLORS.gold, 'left', true);
    const instance = this.state.inventory.find((entry) => entry.uid === this.selectedUpgradeUid);
    const preview = instance ? getUpgradePreview(instance) : null;
    if (preview) {
      Object.entries(preview.materials).forEach(([name, amount], index) => {
        const owned = this.state.materials[name] ?? 0;
        this.text(42, 958 + index * 46, `${name}: owned ${owned}, need ${amount}`, 13, owned >= amount ? '#83e6ad' : '#efadb4');
        this.text(280, 958 + index * 46, materialSources(name).slice(0, 2).join(' | ') || 'No known source', 12, COLORS.muted, 'left', false, 390);
      });
    } else {
      this.text(42, 978, 'Select upgradeable gear to see material sources and market availability.', 14, COLORS.muted, 'left', false, 620);
    }
  }

  private renderUpgradePreview(x: number, y: number, width: number, height: number): void {
    this.panel(x, y, width, height, COLORS.purple);
    const instance = this.state.inventory.find((entry) => entry.uid === this.selectedUpgradeUid);
    const preview = instance ? getUpgradePreview(instance) : null;
    if (!instance || !preview) {
      this.text(x + width / 2, y + 280, instance ? 'Item is already +10' : 'Select gear', 18, COLORS.muted, 'center');
      return;
    }
    this.text(x + 18, y + 18, `${preview.item.name} +${preview.currentLevel} -> +${preview.targetLevel}`, 18, COLORS.text, 'left', true, width - 36);
    this.text(x + 18, y + 52, `${preview.item.rarity.toUpperCase()} ${equipmentSlotLabel(preview.item.slot)} | Success ${Math.round(preview.successChance * 100)}%`, 12, COLORS.gold);
    const keys = ['attack', 'magicAttack', 'defense', 'magicDefense', 'maxHp', 'maxSp', 'hit', 'flee', 'crit'] as const;
    let row = 0;
    for (const key of keys) {
      const before = Number(preview.currentStats[key] ?? 0);
      const after = Number(preview.nextStats[key] ?? 0);
      if (before === after) continue;
      const label = key === 'maxHp' ? 'HP' : key === 'maxSp' ? 'SP' : key.replace(/[A-Z]/g, (letter) => ` ${letter}`).replace(/^./, (letter) => letter.toUpperCase());
      this.text(x + 18, y + 96 + row * 26, `${label}: ${before} -> ${after}`, 13, COLORS.text);
      row += 1;
    }
    const dps = this.estimateUpgradeDps(instance);
    const currentEstimate = estimateMap(this.state, this.state.currentMapId, getDerivedStats(this.state));
    this.text(x + 18, y + 316, `Estimated DPS ${dps.before.toFixed(1)} -> ${dps.after.toFixed(1)}`, 13, COLORS.text);
    this.text(x + 18, y + 344, `EXP/hour on current map: ${currentEstimate.expPerHour.toLocaleString()} -> ${Math.floor(currentEstimate.expPerHour * (1 + Math.max(0, dps.after - dps.before) / Math.max(1, dps.before) * 0.35)).toLocaleString()}`, 12, COLORS.gold, 'left', false, width - 36);
    this.text(x + 18, y + 374, `MVP success chance: ${currentEstimate.mvpSuccessChance}% -> ${Math.min(95, currentEstimate.mvpSuccessChance + Math.ceil(Math.max(0, dps.after - dps.before) / 8))}%`, 12, COLORS.gold);
    this.text(x + 18, y + 420, `Cost: ${preview.goldCost.toLocaleString()} G`, 14, COLORS.text, 'left', true);
    Object.entries(preview.materials).forEach(([name, amount], index) => {
      const owned = this.state.materials[name] ?? 0;
      this.text(x + 18, y + 450 + index * 24, `${name}: ${owned}/${amount}`, 12, owned >= amount ? '#83e6ad' : '#efadb4');
    });
    this.text(x + 18, y + 548, `Failure: ${preview.failure}`, 12, '#efadb4', 'left', false, width - 36);
    const safeOwned = this.state.materials['Safe Upgrade Stone'] ?? 0;
    this.button(x + 18, y + height - 58, 130, 42, 'Upgrade', () => {
      pushLog(this.state, attemptGearUpgrade(this.state, instance.uid, false));
      saveGame(this.state);
      this.render();
    }, COLORS.green);
    this.button(x + 166, y + height - 58, 138, 42, `Safe (${safeOwned})`, () => {
      pushLog(this.state, attemptGearUpgrade(this.state, instance.uid, true));
      saveGame(this.state);
      this.render();
    }, safeOwned > 0 ? COLORS.blue : COLORS.panelAlt);
  }

  private renderMaps(): void {
    const character = this.state.character!;
    this.text(28, 94, 'Map Strategy', 28, COLORS.text, 'left', true);
    this.text(692, 101, 'Enemies, drops, estimates, targets', 14, COLORS.muted, 'right');
    MAPS.forEach((map, index) => {
      const y = 134 + index * 82;
      const unlocked = character.level >= map.unlockLevel;
      const selected = map.id === this.selectedMapId;
      this.panel(20, y, 680, 68, selected ? map.color : COLORS.panel);
      this.text(42, y + 10, map.name, 17, unlocked ? COLORS.text : COLORS.muted, 'left', true);
      this.text(42, y + 36, `LV ${map.level} | ${estimateSurvival(this.state, map.id)} | ${map.drops}`, 12, COLORS.muted, 'left', false, 470);
      this.button(548, y + 11, 60, 42, 'Info', () => {
        this.selectedMapId = map.id;
        this.render();
      }, selected ? COLORS.green : COLORS.panelAlt);
      this.button(620, y + 11, 58, 42, map.id === this.state.currentMapId ? 'Here' : 'Farm', () => {
        if (!unlocked) return;
        if (this.state.farming) stopFarming(this.state, 'Returned to town to change maps.');
        this.state.currentMapId = map.id;
        this.selectedMapId = map.id;
        this.state.currentSession = createSession(map.id);
        saveGame(this.state);
        this.render();
      }, unlocked ? COLORS.blue : COLORS.panelAlt);
    });

    const tabs: MapTab[] = ['enemies', 'drops', 'estimate', 'compare', 'target'];
    tabs.forEach((tab, index) => {
      this.button(22 + index * 136, 482, 126, 40, tab.toUpperCase(), () => {
        this.mapTab = tab;
        this.render();
      }, this.mapTab === tab ? COLORS.blue : COLORS.panelAlt);
    });
    this.renderMapDetail(20, 542, 680, 588);
  }

  private renderMapDetail(x: number, y: number, width: number, height: number): void {
    const map = MAP_BY_ID[this.selectedMapId] ?? MAP_BY_ID[this.state.currentMapId];
    this.panel(x, y, width, height, map.color);
    this.text(x + 22, y + 18, map.name, 22, COLORS.text, 'left', true);
    this.text(x + 22, y + 50, `${map.theme} | MVP: ${MONSTER_BY_ID[map.mvp].name}`, 13, COLORS.gold);
    if (this.mapTab === 'enemies') this.renderMapEnemies(x, y, map);
    if (this.mapTab === 'drops') this.renderMapDrops(x, y, map);
    if (this.mapTab === 'estimate') this.renderMapEstimate(x, y, map);
    if (this.mapTab === 'compare') this.renderMapCompare(x, y);
    if (this.mapTab === 'target') this.renderTargetFarm(x, y);
  }

  private renderMapEnemies(x: number, y: number, map = MAP_BY_ID[this.selectedMapId]): void {
    [...map.monsters, map.mvp].forEach((id, index) => {
      const enemy = MONSTER_BY_ID[id];
      const rowY = y + 92 + index * 82;
      this.panel(x + 22, rowY, 636, 66, enemy.boss ? COLORS.purple : COLORS.panelAlt);
      this.text(x + 38, rowY + 8, `${enemy.name} LV ${enemy.level}`, 15, COLORS.text, 'left', true);
      this.text(x + 38, rowY + 32, `${enemy.race} | ${enemy.element} | HP ${enemy.hp} | ${enemy.attackType}`, 12, COLORS.gold);
      this.text(x + 318, rowY + 10, `EXP ${enemy.exp}/${enemy.jobExp} | Gold ${enemy.goldMin}-${enemy.goldMax}`, 12, COLORS.muted);
      this.text(x + 318, rowY + 34, `Drops: ${enemy.material}, ${enemy.equipment.map((itemId) => ITEM_BY_ID[itemId]?.name ?? itemId).slice(0, 2).join(', ')}`, 11, COLORS.muted, 'left', false, 320);
    });
  }

  private renderMapDrops(x: number, y: number, map = MAP_BY_ID[this.selectedMapId]): void {
    const drops = dropsForMap(map);
    const groups = [
      ['Common materials', drops.common],
      ['Equipment', drops.equipment],
      ['Rare equipment', drops.rare],
      ['Cards', drops.cards],
      ['MVP drops', drops.mvp]
    ] as const;
    groups.forEach(([label, values], index) => {
      const rowY = y + 92 + index * 88;
      this.text(x + 38, rowY, label, 15, COLORS.gold, 'left', true);
      this.text(x + 38, rowY + 28, values.join(', ') || 'None', 13, COLORS.muted, 'left', false, 610);
    });
  }

  private renderMapEstimate(x: number, y: number, map = MAP_BY_ID[this.selectedMapId]): void {
    const estimate = estimateMap(this.state, map.id, getDerivedStats(this.state));
    const lines = [
      `EXP/hour: ${estimate.expPerHour.toLocaleString()}     Job EXP/hour: ${estimate.jobExpPerHour.toLocaleString()}`,
      `Gold/hour: ${estimate.goldPerHour.toLocaleString()}     Kills/hour: ${estimate.killsPerHour.toLocaleString()}`,
      `Survival: ${estimate.survival}     Death risk: ${estimate.deathRisk}% per hour`,
      `MVP success chance: ${estimate.mvpSuccessChance}%     Potion cost/hour: ${estimate.potionCostPerHour} G`,
      `Recommended stats: ${estimate.recommendedStats.join(', ')}`,
      `Tags: ${estimate.tags.join(' | ')}`
    ];
    lines.forEach((line, index) => this.text(x + 38, y + 104 + index * 54, line, 16, index < 2 ? COLORS.text : COLORS.muted, 'left', false, 610));
  }

  private renderMapCompare(x: number, y: number): void {
    MAPS.forEach((map, index) => {
      this.button(x + 32 + index * 160, y + 92, 142, 38, this.compareMapIds.includes(map.id) ? `* ${map.name.split(' ')[0]}` : map.name.split(' ')[0], () => {
        if (this.compareMapIds.includes(map.id)) this.compareMapIds = this.compareMapIds.filter((id) => id !== map.id);
        else if (this.compareMapIds.length < 3) this.compareMapIds.push(map.id);
        this.render();
      }, this.compareMapIds.includes(map.id) ? COLORS.green : COLORS.panelAlt);
    });
    this.compareMapIds.slice(0, 3).forEach((id, index) => {
      const map = MAP_BY_ID[id];
      const estimate = estimateMap(this.state, id, getDerivedStats(this.state));
      const colX = x + 38 + index * 212;
      this.panel(colX, y + 160, 190, 330, map.color);
      this.text(colX + 14, y + 176, map.name, 15, COLORS.text, 'left', true, 160);
      this.text(colX + 14, y + 220, `EXP/h ${estimate.expPerHour.toLocaleString()}`, 13, COLORS.gold);
      this.text(colX + 14, y + 252, `Gold/h ${estimate.goldPerHour.toLocaleString()}`, 13, COLORS.gold);
      this.text(colX + 14, y + 284, `Risk ${estimate.deathRisk}%`, 13, COLORS.muted);
      this.text(colX + 14, y + 316, `MVP ${estimate.mvpSuccessChance}%`, 13, COLORS.muted);
      this.text(colX + 14, y + 348, `Potions ${estimate.potionCostPerHour} G/h`, 12, COLORS.muted);
      this.text(colX + 14, y + 386, dropsForMap(map).common.slice(0, 3).join(', '), 12, COLORS.muted, 'left', false, 160);
      const progress = this.state.mapProgress[id];
      this.text(colX + 14, y + 444, `Best ${Math.floor(progress.bestExpPerHour)} EXP/h`, 12, COLORS.text);
    });
  }

  private renderTargetFarm(x: number, y: number): void {
    const targets = allTargetNames();
    if (this.targetIndex >= targets.length) this.targetIndex = 0;
    const target = targets[this.targetIndex] ?? '';
    this.button(x + 38, y + 92, 90, 40, 'Prev', () => {
      this.targetIndex = (this.targetIndex + targets.length - 1) % targets.length;
      this.render();
    }, COLORS.panelAlt);
    this.text(x + 146, y + 102, `Target: ${target}`, 17, COLORS.text, 'left', true, 400);
    this.button(x + 548, y + 92, 90, 40, 'Next', () => {
      this.targetIndex = (this.targetIndex + 1) % targets.length;
      this.render();
    }, COLORS.panelAlt);
    const results = findDropTargets(target);
    if (results.length === 0) {
      this.text(x + 38, y + 170, 'No known source yet.', 16, COLORS.muted);
      return;
    }
    results.slice(0, 5).forEach((result, index) => {
      const rowY = y + 158 + index * 78;
      const estimate = estimateMap(this.state, result.map.id, getDerivedStats(this.state));
      this.panel(x + 38, rowY, 604, 62, index === 0 ? COLORS.green : COLORS.panelAlt);
      this.text(x + 54, rowY + 8, `${result.map.name} - ${result.enemy.name}`, 14, COLORS.text, 'left', true);
      this.text(x + 54, rowY + 32, `${result.reason} Kills/h ${estimate.killsPerHour}. Survival ${estimate.survival}.`, 12, COLORS.muted, 'left', false, 560);
    });
  }

  private renderReport(): void {
    const report = this.offlineReport ?? this.state.lastReport ?? this.state.currentSession;
    const map = MAP_BY_ID[report.mapId] ?? MAP_BY_ID[this.state.currentMapId];
    const hours = Math.max(report.duration / 3600, 1 / 3600);
    this.text(28, 94, report.offline ? 'Offline Report' : 'Session Report', 28, COLORS.text, 'left', true);
    this.text(692, 101, map.name, 15, COLORS.gold, 'right');
    if (report.duration <= 0) {
      this.panel(20, 160, 680, 280);
      this.text(360, 250, 'No farming results yet', 26, COLORS.text, 'center', true);
      this.text(360, 304, 'Start a session from the Battle screen.', 17, COLORS.muted, 'center');
      return;
    }
    this.panel(20, 140, 680, 210, COLORS.green);
    this.text(42, 160, 'REWARDS', 15, COLORS.gold, 'left', true);
    this.text(42, 198, `${report.kills} monsters defeated`, 25, COLORS.text, 'left', true);
    this.text(42, 237, `+${report.exp} EXP     +${report.jobExp} Job EXP`, 17, COLORS.muted);
    this.text(42, 270, `+${report.gold} gold     ${report.items.length} equipment     ${report.cards.length} cards`, 17, COLORS.muted);
    this.text(42, 305, `${report.levels} base levels     ${report.jobLevels} job levels     ${report.mvpKills}/${report.mvpAttempts} MVP wins`, 15, COLORS.gold);

    this.panel(20, 372, 680, 290);
    this.text(42, 390, 'EFFICIENCY', 15, COLORS.gold, 'left', true);
    const efficiency = [
      ['Duration', this.duration(report.duration)],
      ['EXP / hour', Math.floor(report.exp / hours).toLocaleString()],
      ['Job EXP / hour', Math.floor(report.jobExp / hours).toLocaleString()],
      ['Gold / hour', Math.floor(report.gold / hours).toLocaleString()],
      ['Kills / hour', Math.floor(report.kills / hours).toLocaleString()],
      ['Average kill time', report.kills > 0 ? `${(report.duration / report.kills).toFixed(1)}s` : '-']
    ];
    efficiency.forEach(([label, value], index) => {
      const cellX = 42 + (index % 2) * 330;
      const cellY = 430 + Math.floor(index / 2) * 68;
      this.text(cellX, cellY, label, 13, COLORS.muted);
      this.text(cellX, cellY + 23, value, 20, COLORS.text, 'left', true);
    });

    this.panel(20, 684, 680, 198, COLORS.purple);
    this.text(42, 704, 'BUILD DIAGNOSIS', 15, COLORS.gold, 'left', true);
    this.text(42, 743, report.diagnosis, 19, COLORS.text, 'left', true, 630);
    const accuracy = report.attacks > 0 ? ((1 - report.misses / report.attacks) * 100).toFixed(0) : '100';
    this.text(42, 818, `Accuracy ${accuracy}%   Damage dealt ${Math.floor(report.damageDealt)}   Damage taken ${Math.floor(report.damageTaken)}`, 14, COLORS.muted);

    this.panel(20, 906, 680, 148);
    this.text(42, 925, `Notable loot: ${report.items.slice(-4).join(', ') || 'No equipment this session'}`, 15, COLORS.muted, 'left', false, 630);
    this.text(42, 980, `Cards: ${report.cards.join(', ') || 'No cards this session'}`, 15, '#d8b7ff', 'left', false, 630);
    if (report.offline) this.text(42, 1023, `Offline simulation is capped at ${getOfflineCapHours()} hours.`, 13, COLORS.gold);

    this.button(40, 1080, 300, 62, 'Continue Same Map', () => {
      this.offlineReport = null;
      this.state.currentSession = createSession(this.state.currentMapId);
      startFarming(this.state);
      this.view = 'battle';
      saveGame(this.state);
      this.render();
    }, COLORS.green);
    this.button(362, 1080, 318, 62, 'Change Map', () => {
      this.offlineReport = null;
      this.view = 'maps';
      this.render();
    }, COLORS.blue);
  }

  private renderNavigation(): void {
    const entries: { id: ViewId; label: string }[] = [
      { id: 'battle', label: 'Battle' },
      { id: 'character', label: 'Stats' },
      { id: 'maps', label: 'Maps' },
      { id: 'inventory', label: 'Gear' },
      { id: 'skills', label: 'Skills' },
      { id: 'market', label: 'Market' },
      { id: 'upgrade', label: 'Upgrade' },
      { id: 'report', label: 'Report' }
    ];
    this.panel(0, 1172, 720, 108);
    entries.forEach((entry, index) => {
      const x = 5 + index * 89;
      this.button(x, 1186, 84, 72, entry.label, () => {
        this.view = entry.id;
        if (entry.id !== 'report') this.offlineReport = null;
        normalizeMarketStock(this.state);
        this.render();
      }, this.view === entry.id ? COLORS.blue : COLORS.panelAlt);
    });
  }

  private refreshSaveList(): void {
    this.saves = listSaves();
    this.clampSaveScroll();
  }

  private beginNewCharacter(): void {
    this.saveActiveGame();
    this.state = createInitialState();
    this.newCharacterName = 'Adventurer';
    this.pendingDeleteSaveId = null;
    this.screenMode = 'new';
    this.render();
  }

  private playSave(saveId: string): void {
    this.saveActiveGame();
    const loaded = loadSave(saveId);
    if (!loaded) {
      this.refreshSaveList();
      this.render();
      return;
    }
    this.state = loaded.state;
    this.offlineReport = loaded.offlineReport;
    this.screenMode = 'game';
    this.view = loaded.offlineReport ? 'report' : 'battle';
    this.pendingDeleteSaveId = null;
    this.selectedMapId = this.state.currentMapId;
    this.selectedInventoryUid = this.state.equipment.weapon;
    this.selectedUpgradeUid = this.state.equipment.weapon;
    this.selectedSkillId = null;
    this.inventoryScrollIndex = 0;
    normalizeMarketStock(this.state);
    normalizeSkillLoadout(this.state);
    this.render();
  }

  private deleteSaveWithConfirmation(saveId: string): void {
    if (this.pendingDeleteSaveId !== saveId) {
      this.pendingDeleteSaveId = saveId;
      this.render();
      return;
    }
    const deletedActiveSave = getActiveSaveId() === saveId;
    deleteSave(saveId);
    if (deletedActiveSave) {
      this.state = createInitialState();
    }
    this.pendingDeleteSaveId = null;
    this.refreshSaveList();
    this.render();
  }

  private returnToSaves(): void {
    this.saveActiveGame();
    this.screenMode = 'saves';
    this.offlineReport = null;
    this.pendingDeleteSaveId = null;
    this.refreshSaveList();
    this.render();
  }

  private saveActiveGame(): void {
    if (this.screenMode === 'game' && this.state.character) saveGame(this.state);
  }

  private scrollSaves(direction: number): void {
    this.saveScrollIndex += direction;
    this.clampSaveScroll();
    this.render();
  }

  private clampSaveScroll(): void {
    const maxScrollIndex = Math.max(0, this.saves.length - SAVES_VISIBLE_ITEMS);
    this.saveScrollIndex = Phaser.Math.Clamp(this.saveScrollIndex, 0, maxScrollIndex);
  }

  private handleNameKey(event: KeyboardEvent): void {
    if (this.screenMode !== 'new') return;
    if (event.key === 'Backspace') {
      this.newCharacterName = this.newCharacterName.slice(0, -1);
      this.render();
      return;
    }
    if (event.key === 'Enter') return;
    if (event.key.length !== 1 || this.newCharacterName.length >= 20) return;
    if (!/^[a-z0-9 _-]$/i.test(event.key)) return;
    this.newCharacterName += event.key;
    this.render();
  }

  private sortedInventory(): EquipmentInstance[] {
    return [...this.state.inventory].sort((a, b) => Number(Object.values(this.state.equipment).includes(b.uid)) - Number(Object.values(this.state.equipment).includes(a.uid)) || b.foundAt - a.foundAt);
  }

  private sortedInventoryForUpgrade(): EquipmentInstance[] {
    return [...this.state.inventory].sort((a, b) => Number(Object.values(this.state.equipment).includes(b.uid)) - Number(Object.values(this.state.equipment).includes(a.uid)) || b.upgradeLevel - a.upgradeLevel || effectiveItemScore(b) - effectiveItemScore(a));
  }

  private scrollInventory(direction: number): void {
    const items = this.sortedInventory();
    this.inventoryScrollIndex += direction;
    this.clampInventoryScroll(items);
    this.render();
  }

  private clampInventoryScroll(items = this.sortedInventory()): void {
    const maxScrollIndex = Math.max(0, items.length - INVENTORY_VISIBLE_ITEMS);
    this.inventoryScrollIndex = Phaser.Math.Clamp(this.inventoryScrollIndex, 0, maxScrollIndex);
  }

  private scrollInventoryToInclude(index: number): void {
    if (index < 0) return;
    if (index < this.inventoryScrollIndex) this.inventoryScrollIndex = index;
    if (index >= this.inventoryScrollIndex + INVENTORY_VISIBLE_ITEMS) {
      this.inventoryScrollIndex = index - INVENTORY_VISIBLE_ITEMS + 1;
    }
  }

  private equippedForSlot(slot: EquipmentSlot): EquipmentInstance | null {
    const uid = this.state.equipment[slot];
    return this.state.inventory.find((entry) => entry.uid === uid) ?? null;
  }

  private estimateDpsChange(candidate: EquipmentInstance): { before: number; after: number; integer: (value: number) => string } {
    return this.estimateWithEquipment(candidate);
  }

  private estimateUpgradeDps(instance: EquipmentInstance): { before: number; after: number } {
    const before = this.basicDps(getDerivedStats(this.state));
    const upgraded = { ...instance, upgradeLevel: Math.min(10, instance.upgradeLevel + 1) };
    const inventory = this.state.inventory.map((entry) => entry.uid === instance.uid ? upgraded : entry);
    const simulated = { ...this.state, inventory } as GameState;
    return { before, after: this.basicDps(getDerivedStats(simulated)) };
  }

  private estimateWithEquipment(candidate: EquipmentInstance): { before: number; after: number; integer: (value: number) => string } {
    const before = this.basicDps(getDerivedStats(this.state));
    const item = getInstanceItem(candidate);
    const simulated = { ...this.state, equipment: { ...this.state.equipment, [item.slot]: candidate.uid } } as GameState;
    return { before, after: this.basicDps(getDerivedStats(simulated)), integer: (value: number) => Math.floor(value).toLocaleString() };
  }

  private estimateSurvivalChange(candidate: EquipmentInstance): { before: string; after: string } {
    const before = estimateSurvival(this.state, this.state.currentMapId);
    const item = getInstanceItem(candidate);
    const simulated = { ...this.state, equipment: { ...this.state.equipment, [item.slot]: candidate.uid } } as GameState;
    return { before, after: estimateSurvival(simulated, simulated.currentMapId) };
  }

  private estimateExpHourChange(candidate: EquipmentInstance): { before: number; after: number } {
    const before = estimateMap(this.state, this.state.currentMapId, getDerivedStats(this.state)).expPerHour;
    const item = getInstanceItem(candidate);
    const simulated = { ...this.state, equipment: { ...this.state.equipment, [item.slot]: candidate.uid } } as GameState;
    const after = estimateMap(simulated, simulated.currentMapId, getDerivedStats(simulated)).expPerHour;
    return { before, after };
  }

  private basicDps(stats: { attack: number; magicAttack: number; crit: number; attackInterval: number }): number {
    const character = this.state.character;
    const offense = character?.classId === 'mage' ? stats.magicAttack : stats.attack;
    return offense * (1 + stats.crit / 200) / stats.attackInterval;
  }

  private panel(x: number, y: number, width: number, height: number, accent?: number): Phaser.GameObjects.Rectangle {
    const rectangle = this.add.rectangle(x, y, width, height, COLORS.panel, 0.98).setOrigin(0);
    rectangle.setStrokeStyle(accent ? 3 : 1, accent ?? COLORS.border, accent ? 0.85 : 0.55);
    this.root?.add(rectangle);
    return rectangle;
  }

  private box(x: number, y: number, width: number, height: number, color: number, label: string): void {
    const rectangle = this.add.rectangle(x, y, width, height, color, 0.9).setOrigin(0);
    rectangle.setStrokeStyle(3, 0xffffff, 0.2);
    this.root?.add(rectangle);
    this.text(x + width / 2, y + height / 2, label, 15, '#ffffff', 'center', true, width - 16).setOrigin(0.5);
  }

  private button(x: number, y: number, width: number, height: number, label: string, action: () => void, color = COLORS.blue): void {
    const rectangle = this.add.rectangle(x, y, width, height, color, 1).setOrigin(0).setInteractive({ useHandCursor: true });
    rectangle.setStrokeStyle(2, 0xffffff, 0.15);
    rectangle.on('pointerdown', action);
    rectangle.on('pointerover', () => rectangle.setAlpha(0.82));
    rectangle.on('pointerout', () => rectangle.setAlpha(1));
    this.root?.add(rectangle);
    const fontSize = label.length > 11 ? 11 : 13;
    this.text(x + width / 2, y + height / 2, label, fontSize, '#ffffff', 'center', true, width - 8).setOrigin(0.5);
  }

  private bar(x: number, y: number, width: number, height: number, ratio: number, color: number): void {
    const background = this.add.rectangle(x, y, width, height, 0x090d14, 0.95).setOrigin(0);
    const fill = this.add.rectangle(x + 2, y + 2, Math.max(0, (width - 4) * Phaser.Math.Clamp(ratio, 0, 1)), height - 4, color, 1).setOrigin(0);
    background.setStrokeStyle(1, COLORS.border, 0.8);
    this.root?.add([background, fill]);
  }

  private text(x: number, y: number, value: string, size = 16, color = COLORS.text, align: 'left' | 'center' | 'right' = 'left', bold = false, wrapWidth?: number): Phaser.GameObjects.Text {
    const text = this.add.text(x, y, value, {
      fontFamily: 'Trebuchet MS, Arial, sans-serif',
      fontSize: `${size}px`,
      fontStyle: bold ? 'bold' : 'normal',
      color,
      align,
      wordWrap: wrapWidth ? { width: wrapWidth, useAdvancedWrap: true } : undefined,
      lineSpacing: 4
    });
    if (align === 'center') text.setOrigin(0.5, 0);
    if (align === 'right') text.setOrigin(1, 0);
    this.root?.add(text);
    return text;
  }

  private rarityColor(rarity: string): string {
    if (rarity === 'mvp') return '#ffcf66';
    if (rarity === 'legendary') return '#ff9b6b';
    if (rarity === 'epic') return '#c69cff';
    if (rarity === 'rare') return '#72b6ff';
    if (rarity === 'uncommon') return '#76dfa0';
    return '#e1e5ea';
  }

  private duration(seconds: number): string {
    const total = Math.floor(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m ${secs}s`;
  }

  private relativeTime(timestamp: number): string {
    const elapsed = Math.max(0, Date.now() - timestamp);
    const minutes = Math.floor(elapsed / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  }
}

function SKILL_BY_ID_SAFE(id: string): SkillDefinition | undefined {
  return SKILLS.find((skill) => skill.id === id);
}
