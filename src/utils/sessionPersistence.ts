import { LatLng, UserType } from '../types';

// ---------------------------------------------------------------------------
// Live activity session persistence.
//
// Reloading (or closing) the page mid-workout used to reset the Live Activity
// Tracker (timer, steps, distance, route). These helpers checkpoint one
// session snapshot per user into localStorage so the tracker — and the
// finished-but-not-yet-logged flow — can be restored on the next visit.
// ---------------------------------------------------------------------------

export interface PersistedSession {
  user: UserType;
  status: 'running' | 'paused' | 'finished';
  steps: number;
  distanceMeters: number;
  distanceSource: 'gps' | 'estimated';
  gpsMode: boolean;
  /** Epoch ms when the activity started. */
  startTime: number;
  /** Epoch ms when the activity finished (only set for status 'finished'). */
  endTime?: number;
  /** Active time (ms) captured at the moment of the last save. */
  activeMs: number;
  /** Epoch ms of the last save — used to roll active time forward on restore. */
  savedAt: number;
  route: LatLng[];
  mapProof?: string;
  simulate: boolean;
}

const storageKey = (user: UserType) => `jm_kat_active_session_v1_${user}`;

export function persistSession(session: PersistedSession): void {
  try {
    localStorage.setItem(storageKey(session.user), JSON.stringify(session));
  } catch (err) {
    console.warn('[session] Failed to persist live session:', err);
  }
}

export function loadPersistedSession(user: UserType): PersistedSession | null {
  try {
    const raw = localStorage.getItem(storageKey(user));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    if (!parsed || typeof parsed !== 'object' || !parsed.status || !Array.isArray(parsed.route)) {
      return null;
    }
    return parsed;
  } catch (err) {
    console.warn('[session] Failed to load persisted session:', err);
    return null;
  }
}

export function clearPersistedSession(user: UserType): void {
  try {
    localStorage.removeItem(storageKey(user));
  } catch (err) {
    console.warn('[session] Failed to clear persisted session:', err);
  }
}