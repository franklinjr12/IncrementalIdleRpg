import { advanceCombat, refreshSessionRates } from './CombatSimulator';
import { createSession, type GameState, type SessionReport } from './GameState';

const OFFLINE_CAP_SECONDS = 8 * 60 * 60;

export function applyOfflineProgress(state: GameState, now = Date.now()): SessionReport | null {
  const elapsed = Math.min(OFFLINE_CAP_SECONDS, Math.max(0, (now - state.lastSavedAt) / 1000));
  if (!state.farming || !state.character || elapsed < 5) {
    state.lastSavedAt = now;
    return null;
  }

  const previousSession = state.currentSession;
  state.currentSession = createSession(state.currentMapId);
  state.currentSession.offline = true;

  let simulated = 0;
  while (simulated < elapsed && state.farming) {
    const step = Math.min(0.5, elapsed - simulated);
    advanceCombat(state, step);
    simulated += step;
  }
  refreshSessionRates(state);
  const report = { ...state.currentSession, duration: simulated, offline: true };
  state.lastReport = report;
  state.currentSession = previousSession.duration > 0 ? previousSession : createSession(state.currentMapId);
  state.lastSavedAt = now;
  return report;
}

export function getOfflineCapHours(): number {
  return OFFLINE_CAP_SECONDS / 3600;
}
