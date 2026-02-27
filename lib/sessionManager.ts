/**
 * sessionManager.ts
 *
 * Single source of truth for an active Null session.
 * Stores to AsyncStorage so the session survives app kills.
 *
 * Keys:
 *   null_session_active  → JSON: { endTime, durationMs, startedAt }
 *   null_total_reclaimed_minutes → number (accumulated across all sessions)
 *   null_session_notes   → JSON array of notes
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_ACTIVE = "null_session_active";
const KEY_TOTAL = "null_total_reclaimed_minutes";
const KEY_NOTES = "null_session_notes";

export interface ActiveSession {
  /** Unix ms when the session should end */
  endTime: number;
  /** Total planned duration in ms */
  durationMs: number;
  /** Unix ms when the session started */
  startedAt: number;
}

export interface SessionNote {
  id: string;
  note: string;
  durationLabel: string; // e.g. "45:00"
  timestamp: string;
}

// ─── Start ────────────────────────────────────────────────────────────────────
export async function startSession(durationMs: number): Promise<ActiveSession> {
  const session: ActiveSession = {
    endTime: Date.now() + durationMs,
    durationMs,
    startedAt: Date.now(),
  };
  await AsyncStorage.setItem(KEY_ACTIVE, JSON.stringify(session));
  return session;
}

// ─── Load (crash recovery) ────────────────────────────────────────────────────
/**
 * Returns the active session if there is one and time remains, otherwise null.
 * Call this on app launch to detect a crash-interrupted session.
 */
export async function loadActiveSession(): Promise<ActiveSession | null> {
  try {
    await AsyncStorage.removeItem(KEY_ACTIVE); // TEMPORARY CLEAR
    const raw = await AsyncStorage.getItem(KEY_ACTIVE);
    if (!raw) return null;
    const session = JSON.parse(raw) as ActiveSession;
    if (Date.now() >= session.endTime) {
      // Session expired while app was dead — clean it up
      await AsyncStorage.removeItem(KEY_ACTIVE);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

// ─── Clear (on complete or cancel) ───────────────────────────────────────────
export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(KEY_ACTIVE);
}

// ─── Remaining seconds ────────────────────────────────────────────────────────
export function getRemainingSeconds(session: ActiveSession): number {
  return Math.max(0, Math.round((session.endTime - Date.now()) / 1000));
}

// ─── Total reclaimed ──────────────────────────────────────────────────────────
export async function addReclaimedMinutes(minutes: number): Promise<number> {
  const raw = await AsyncStorage.getItem(KEY_TOTAL);
  const current = raw ? parseInt(raw, 10) || 0 : 0;
  const updated = current + minutes;
  await AsyncStorage.setItem(KEY_TOTAL, String(updated));
  return updated;
}

export async function getTotalReclaimedMinutes(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEY_TOTAL);
  return raw ? parseInt(raw, 10) || 0 : 0;
}

// ─── Session notes ────────────────────────────────────────────────────────────
export async function addSessionNote(
  note: string,
  durationLabel: string,
): Promise<void> {
  const raw = await AsyncStorage.getItem(KEY_NOTES);
  const notes: SessionNote[] = raw ? JSON.parse(raw) : [];
  notes.unshift({
    id: Date.now().toString(),
    note,
    durationLabel,
    timestamp: new Date().toISOString(),
  });
  await AsyncStorage.setItem(KEY_NOTES, JSON.stringify(notes));
}

export async function getSessionNotes(): Promise<SessionNote[]> {
  const raw = await AsyncStorage.getItem(KEY_NOTES);
  return raw ? JSON.parse(raw) : [];
}
