import { applyOfflineProgress } from './OfflineProgress';
import { repairLoadedState, type GameState, type SessionReport } from './GameState';

const SAVE_KEY = 'idle-rpg-save-v2';

export function saveGame(state: GameState): void {
  state.lastSavedAt = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function loadGame(): { state: GameState; offlineReport: SessionReport | null } | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;

  try {
    const state = repairLoadedState(JSON.parse(raw));
    if (!state) return null;
    const offlineReport = applyOfflineProgress(state);
    return { state, offlineReport };
  } catch {
    return null;
  }
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
