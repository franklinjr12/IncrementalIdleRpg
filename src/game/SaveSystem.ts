import { applyOfflineProgress } from './OfflineProgress';
import { CLASS_BY_ID, MAP_BY_ID, createCharacter, repairLoadedState, type ClassId, type GameState, type SessionReport } from './GameState';

const LEGACY_SAVE_KEY = 'idle-rpg-save-v2';
const SAVE_SLOTS_KEY = 'idle-rpg-save-slots-v1';
const ACTIVE_SAVE_KEY = 'idle-rpg-active-save-id-v1';
const SAVE_PREFIX = 'idle-rpg-save-v2:';

export type SaveMetadata = {
  id: string;
  name: string;
  classId: ClassId;
  level: number;
  jobLevel: number;
  gold: number;
  currentMapId: string;
  lastSavedAt: number;
  createdAt: number;
};

export function listSaves(): SaveMetadata[] {
  return readSlots()
    .filter((slot) => Boolean(localStorage.getItem(saveKey(slot.id))))
    .sort((a, b) => b.lastSavedAt - a.lastSavedAt);
}

export function loadSave(saveId: string): { state: GameState; offlineReport: SessionReport | null } | null {
  const raw = localStorage.getItem(saveKey(saveId));
  if (!raw) return null;

  try {
    const state = repairLoadedState(JSON.parse(raw));
    if (!state || !state.character) return null;
    const offlineReport = applyOfflineProgress(state);
    selectSave(saveId);
    saveStateForId(saveId, state, metadataForState(saveId, state, existingCreatedAt(saveId)));
    return { state, offlineReport };
  } catch {
    return null;
  }
}

export function saveGame(state: GameState): void {
  const saveId = getActiveSaveId();
  if (!saveId || !state.character) return;
  state.lastSavedAt = Date.now();
  saveStateForId(saveId, state, metadataForState(saveId, state, existingCreatedAt(saveId)));
}

export function createSave(classId: ClassId, name: string): GameState {
  const state = createCharacter(classId, sanitizeName(name));
  const saveId = createSaveId();
  const now = Date.now();
  state.lastSavedAt = now;
  selectSave(saveId);
  saveStateForId(saveId, state, metadataForState(saveId, state, now));
  return state;
}

export function deleteSave(saveId: string): void {
  localStorage.removeItem(saveKey(saveId));
  writeSlots(readSlots().filter((slot) => slot.id !== saveId));
  if (getActiveSaveId() === saveId) {
    const next = listSaves()[0]?.id;
    if (next) selectSave(next);
    else localStorage.removeItem(ACTIVE_SAVE_KEY);
  }
}

export function selectSave(saveId: string): void {
  localStorage.setItem(ACTIVE_SAVE_KEY, saveId);
}

export function getActiveSaveId(): string | null {
  return localStorage.getItem(ACTIVE_SAVE_KEY);
}

export function migrateLegacySaveIfNeeded(): void {
  if (localStorage.getItem(SAVE_SLOTS_KEY)) return;

  const raw = localStorage.getItem(LEGACY_SAVE_KEY);
  if (!raw) {
    writeSlots([]);
    return;
  }

  try {
    const state = repairLoadedState(JSON.parse(raw));
    if (!state || !state.character) {
      writeSlots([]);
      return;
    }
    const saveId = createSaveId();
    const createdAt = state.lastSavedAt || Date.now();
    saveStateForId(saveId, state, metadataForState(saveId, state, createdAt));
    selectSave(saveId);
  } catch {
    writeSlots([]);
  }
}

export function clearSave(): void {
  const saveId = getActiveSaveId();
  if (saveId) deleteSave(saveId);
}

function saveKey(saveId: string): string {
  return `${SAVE_PREFIX}${saveId}`;
}

function readSlots(): SaveMetadata[] {
  const raw = localStorage.getItem(SAVE_SLOTS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSaveMetadata);
  } catch {
    return [];
  }
}

function writeSlots(slots: SaveMetadata[]): void {
  localStorage.setItem(SAVE_SLOTS_KEY, JSON.stringify(slots));
}

function saveStateForId(saveId: string, state: GameState, metadata: SaveMetadata): void {
  localStorage.setItem(saveKey(saveId), JSON.stringify(state));
  const slots = readSlots().filter((slot) => slot.id !== saveId);
  writeSlots([metadata, ...slots]);
}

function metadataForState(saveId: string, state: GameState, createdAt: number): SaveMetadata {
  const character = state.character;
  const fallbackClass = 'warrior';
  const classId = character?.classId ?? fallbackClass;
  return {
    id: saveId,
    name: sanitizeName(character?.name ?? CLASS_BY_ID[classId].name),
    classId,
    level: character?.level ?? 1,
    jobLevel: character?.jobLevel ?? 1,
    gold: Math.floor(state.gold),
    currentMapId: MAP_BY_ID[state.currentMapId] ? state.currentMapId : 'slime_field',
    lastSavedAt: state.lastSavedAt,
    createdAt
  };
}

function existingCreatedAt(saveId: string): number {
  return readSlots().find((slot) => slot.id === saveId)?.createdAt ?? Date.now();
}

function createSaveId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `save-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

function sanitizeName(name: string): string {
  const trimmed = name.trim().slice(0, 20);
  return trimmed || 'Adventurer';
}

function isSaveMetadata(value: unknown): value is SaveMetadata {
  if (!value || typeof value !== 'object') return false;
  const slot = value as Partial<SaveMetadata>;
  return typeof slot.id === 'string'
    && typeof slot.name === 'string'
    && (slot.classId === 'warrior' || slot.classId === 'ranger' || slot.classId === 'mage')
    && typeof slot.level === 'number'
    && typeof slot.jobLevel === 'number'
    && typeof slot.gold === 'number'
    && typeof slot.currentMapId === 'string'
    && typeof slot.lastSavedAt === 'number'
    && typeof slot.createdAt === 'number';
}
