import { LatLng, UserProfile, UserStats, UserType, WorkoutLog } from '../types';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

// Default avatars are served from the static `public/avatars` assets so every
// user has a real photo without depending on a remote image host.
export const DEFAULT_AVATARS: Record<UserType, string> = {
  JM: '/avatars/jm.png',
  KAT: '/avatars/kat.png',
};

// Default user identities for Jm & Kat (used only as fallback if profiles
// don't exist yet in the database - these are the real users, not mockup data)
const DEFAULT_PROFILES: Record<UserType, UserProfile> = {
  JM: {
    id: 'JM',
    name: 'Jm',
    nickname: 'Jm',
    avatar: DEFAULT_AVATARS.JM,
    themeColor: 'teal',
    bgGradient: 'from-teal-500 to-emerald-600',
    weeklyGoalMins: 180,
    favExercise: 'Strength',
    bio: 'Pushing limits day by day 💪'
  },
  KAT: {
    id: 'KAT',
    name: 'Kat',
    nickname: 'Kat',
    avatar: DEFAULT_AVATARS.KAT,
    themeColor: 'rose',
    bgGradient: 'from-rose-500 to-pink-600',
    weeklyGoalMins: 150,
    favExercise: 'Pilates',
    bio: 'Consistency > Intensity ✨'
  }
};

const LOGS_STORAGE_KEY = 'jm_kat_exercise_logs_v1';
const PROFILES_STORAGE_KEY = 'jm_kat_user_profiles_v1';

// ---------------------------------------------------------------------------
// Pure date helpers
// ---------------------------------------------------------------------------

export function getTodayDateStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDatePretty(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);

  const today = getTodayDateStr();
  if (dateStr === today) {
    return 'Today, ' + dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  if (dateStr === yesterdayStr) {
    return 'Yesterday, ' + dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// DB row <-> TS interface mappers
// ---------------------------------------------------------------------------

interface WorkoutLogRow {
  id: string;
  user: UserType;
  date: string;
  timestamp: number;
  exercise_type: string;
  custom_name: string | null;
  duration_mins: number;
  calories_burned: number | null;
  notes: string | null;
  proof_photo_url: string | null;
  ai_feedback: string | null;
  mood: string | null;
  location: string | null;
  steps: number | null;
  distance_meters: number | null;
  start_time: number | null;
  end_time: number | null;
  route: LatLng[] | null;
}

/** Normalize the `route` column (JSONB array or JSON-encoded text) into LatLng[]. */
function parseRoute(value: unknown): LatLng[] | undefined {
  if (Array.isArray(value)) {
    const points = value.filter(
      (p): p is LatLng =>
        typeof p === 'object' && p !== null &&
        typeof (p as LatLng).latitude === 'number' &&
        typeof (p as LatLng).longitude === 'number'
    );
    return points.length > 0 ? points : undefined;
  }
  if (typeof value === 'string') {
    try {
      return parseRoute(JSON.parse(value));
    } catch {
      return undefined;
    }
  }
  return undefined;
}

const rowToWorkoutLog = (row: WorkoutLogRow): WorkoutLog => ({
  id: row.id,
  user: row.user,
  date: row.date,
  timestamp: row.timestamp,
  exerciseType: row.exercise_type as WorkoutLog['exerciseType'],
  customName: row.custom_name ?? undefined,
  durationMins: row.duration_mins,
  caloriesBurned: row.calories_burned ?? undefined,
  notes: row.notes ?? undefined,
  proofPhotoUrl: row.proof_photo_url ?? undefined,
  aiFeedback: row.ai_feedback ?? undefined,
  mood: row.mood ?? undefined,
  location: row.location ?? undefined,
  steps: row.steps ?? undefined,
  distanceMeters: row.distance_meters ?? undefined,
  startTime: row.start_time ?? undefined,
  endTime: row.end_time ?? undefined,
  route: parseRoute(row.route),
});

const workoutLogToRow = (log: WorkoutLog): Omit<WorkoutLogRow, 'date'> & { date: string } => {
  const row: Record<string, unknown> = {
    id: log.id,
    user: log.user,
    date: log.date,
    timestamp: log.timestamp,
    exercise_type: log.exerciseType,
    custom_name: log.customName ?? null,
    duration_mins: log.durationMins,
    calories_burned: log.caloriesBurned ?? null,
    notes: log.notes ?? null,
    proof_photo_url: log.proofPhotoUrl ?? null,
    ai_feedback: log.aiFeedback ?? null,
    mood: log.mood ?? null,
    location: log.location ?? null
  };

  // Auto-tracking columns are only sent when present, so databases that haven't
  // received migration 0002 can still accept ordinary (manual) workout logs.
  if (log.steps !== undefined) row.steps = log.steps;
  if (log.distanceMeters !== undefined) row.distance_meters = log.distanceMeters;
  if (log.startTime !== undefined) row.start_time = log.startTime;
  if (log.endTime !== undefined) row.end_time = log.endTime;
  if (log.route && log.route.length > 0) row.route = log.route;

  return row as Omit<WorkoutLogRow, 'date'> & { date: string };
};

interface UserProfileRow {
  id: UserType;
  name: string;
  nickname: string;
  avatar: string;
  theme_color: string;
  bg_gradient: string;
  weekly_goal_mins: number;
  fav_exercise: string;
  bio: string;
}

const rowToUserProfile = (row: UserProfileRow): UserProfile => ({
  id: row.id,
  name: row.name,
  nickname: row.nickname,
  avatar: row.avatar,
  themeColor: row.theme_color,
  bgGradient: row.bg_gradient,
  weeklyGoalMins: row.weekly_goal_mins,
  favExercise: row.fav_exercise as UserProfile['favExercise'],
  bio: row.bio ?? DEFAULT_PROFILES[row.id as UserType]?.bio ?? '',
});

const userProfileToRow = (profile: UserProfile): UserProfileRow => ({
  id: profile.id,
  name: profile.name,
  nickname: profile.nickname,
  avatar: profile.avatar,
  theme_color: profile.themeColor,
  bg_gradient: profile.bgGradient,
  weekly_goal_mins: profile.weeklyGoalMins,
  fav_exercise: profile.favExercise,
  bio: profile.bio,
});

// ---------------------------------------------------------------------------
// localStorage fallback (used only when Supabase is not configured)
// ---------------------------------------------------------------------------

const lsGetAllLogs = (): WorkoutLog[] => {
  try {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (err) {
    console.error('Failed to load exercise logs from storage:', err);
    return [];
  }
};

const lsSaveAllLogs = (logs: WorkoutLog[]): void => {
  try {
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
  } catch (err) {
    console.error('Failed to save exercise logs:', err);
  }
};

const lsGetUserProfiles = (): Record<UserType, UserProfile> => {
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    // fallback to defaults
  }
  return DEFAULT_PROFILES;
};

const lsSaveUserProfile = (user: UserType, profile: UserProfile): void => {
  const profiles = lsGetUserProfiles();
  profiles[user] = profile;
  localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
};

// ---------------------------------------------------------------------------
// Supabase implementation (async) - real data only, no seeding
// ---------------------------------------------------------------------------

const LOGS_TABLE = 'workout_logs';
const PROFILES_TABLE = 'user_profiles';

const dbGetAllLogs = async (): Promise<WorkoutLog[]> => {
  const sb = await getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from(LOGS_TABLE)
    .select('*')
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('[supabase] Failed to fetch exercise logs:', error.message);
    return [];
  }

  return (data ?? []).map(rowToWorkoutLog);
};

const TRACKING_COLUMNS = ['steps', 'distance_meters', 'start_time', 'end_time', 'route'];

/**
 * Insert workout log row(s) into Supabase, gracefully retrying without the
 * auto-tracking columns if the database hasn't been migrated yet (0002). This
 * lets sessions still log even when the new columns don't exist yet — they
 * simply won't persist steps/distance/time until the migration is applied.
 */
async function dbInsertWorkoutLogs(
  sb: NonNullable<Awaited<ReturnType<typeof getSupabase>>>,
  rows: Array<Omit<WorkoutLogRow, 'date'> & { date: string }>
): Promise<void> {
  let { error } = await sb.from(LOGS_TABLE).insert(rows);

  if (error && /could not find the '[a-z_]+' column of 'workout_logs' in the schema cache/i.test(error.message)) {
    console.warn(
      '[supabase] workout_logs is missing auto-tracking columns (run migration 0002_add_session_tracking.sql). ' +
        'Retrying insert without steps/distance/time.'
    );
    const stripped = rows.map((row) => {
      const base: Record<string, unknown> = { ...row };
      for (const key of TRACKING_COLUMNS) delete base[key];
      return base;
    });
    ({ error } = await sb.from(LOGS_TABLE).insert(stripped));
  }

  if (error) {
    throw new Error(error.message);
  }
}

const dbAddWorkoutLog = async (logData: Omit<WorkoutLog, 'id' | 'timestamp'>): Promise<WorkoutLog> => {
  const sb = await getSupabase();
  if (!sb) {
    throw new Error('Supabase is not configured.');
  }

  const newLog: WorkoutLog = {
    ...logData,
    id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    timestamp: Date.now()
  };

  try {
    await dbInsertWorkoutLogs(sb, [workoutLogToRow(newLog)]);
  } catch (err) {
    console.error('[supabase] Failed to insert workout log:', err instanceof Error ? err.message : String(err));
    throw err;
  }

  return newLog;
};

const dbUpdateWorkoutLog = async (updatedLog: WorkoutLog): Promise<void> => {
  const sb = await getSupabase();
  if (!sb) return;

  const { error } = await sb
    .from(LOGS_TABLE)
    .update(workoutLogToRow(updatedLog))
    .eq('id', updatedLog.id);

  if (error) {
    console.error('[supabase] Failed to update workout log:', error.message);
    throw new Error(error.message);
  }
};

const dbDeleteWorkoutLog = async (id: string): Promise<void> => {
  const sb = await getSupabase();
  if (!sb) return;

  const { error } = await sb
    .from(LOGS_TABLE)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[supabase] Failed to delete workout log:', error.message);
    throw new Error(error.message);
  }
};

const dbGetUserProfiles = async (): Promise<Record<UserType, UserProfile>> => {
  const sb = await getSupabase();
  if (!sb) return DEFAULT_PROFILES;

  const { data, error } = await sb
    .from(PROFILES_TABLE)
    .select('*');

  if (error) {
    console.error('[supabase] Failed to fetch user profiles:', error.message);
    return DEFAULT_PROFILES;
  }

  const profiles = {} as Record<UserType, UserProfile>;
  for (const row of (data ?? []) as UserProfileRow[]) {
    profiles[row.id] = rowToUserProfile(row);
  }

  // Ensure both users present even if one row is missing
  return {
    ...DEFAULT_PROFILES,
    ...profiles
  };
};

const dbSaveUserProfile = async (user: UserType, profile: UserProfile): Promise<void> => {
  const sb = await getSupabase();
  if (!sb) return;

  const { error } = await sb
    .from(PROFILES_TABLE)
    .upsert(userProfileToRow(profile), { onConflict: 'id' });

  if (error) {
    console.error('[supabase] Failed to save user profile:', error.message);
    throw new Error(error.message);
  }
};

const dbClearAllLogs = async (): Promise<void> => {
  const sb = await getSupabase();
  if (!sb) return;

  const { error: deleteLogsError } = await sb
    .from(LOGS_TABLE)
    .delete()
    .neq('id', '');

  if (deleteLogsError) {
    console.error('[supabase] Failed to clear workout logs:', deleteLogsError.message);
    throw new Error(deleteLogsError.message);
  }
};

// ---------------------------------------------------------------------------
// Public data access API (async, Supabase first, localStorage fallback)
// ---------------------------------------------------------------------------

export async function getAllLogs(): Promise<WorkoutLog[]> {
  if (await isSupabaseConfigured()) {
    return dbGetAllLogs();
  }
  return lsGetAllLogs();
}

export async function getLogsForUser(user: UserType): Promise<WorkoutLog[]> {
  const logs = await getAllLogs();
  return logs
    .filter(l => l.user === user)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.timestamp - a.timestamp);
}

export async function addWorkoutLog(logData: Omit<WorkoutLog, 'id' | 'timestamp'>): Promise<WorkoutLog> {
  if (await isSupabaseConfigured()) {
    return dbAddWorkoutLog(logData);
  }

  const logs = lsGetAllLogs();
  const newLog: WorkoutLog = {
    ...logData,
    id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    timestamp: Date.now()
  };

  const updated = [newLog, ...logs];
  lsSaveAllLogs(updated);
  return newLog;
}

export async function updateWorkoutLog(updatedLog: WorkoutLog): Promise<void> {
  if (await isSupabaseConfigured()) {
    return dbUpdateWorkoutLog(updatedLog);
  }

  const logs = lsGetAllLogs();
  const idx = logs.findIndex(l => l.id === updatedLog.id);
  if (idx !== -1) {
    logs[idx] = updatedLog;
    lsSaveAllLogs(logs);
  }
}

export async function deleteWorkoutLog(id: string): Promise<void> {
  if (await isSupabaseConfigured()) {
    return dbDeleteWorkoutLog(id);
  }

  const logs = lsGetAllLogs();
  const filtered = logs.filter(l => l.id !== id);
  lsSaveAllLogs(filtered);
}

export async function getUserProfiles(): Promise<Record<UserType, UserProfile>> {
  if (await isSupabaseConfigured()) {
    return dbGetUserProfiles();
  }
  return lsGetUserProfiles();
}

export async function saveUserProfile(user: UserType, profile: UserProfile): Promise<void> {
  if (await isSupabaseConfigured()) {
    return dbSaveUserProfile(user, profile);
  }
  lsSaveUserProfile(user, profile);
}

export async function calculateUserStats(user: UserType): Promise<UserStats> {
  const userLogs = await getLogsForUser(user);
  const todayStr = getTodayDateStr();

  const totalMins = userLogs.reduce((acc, l) => acc + (l.durationMins || 0), 0);
  const totalWorkouts = userLogs.length;

  const todayLog = userLogs.find(l => l.date === todayStr);
  const loggedToday = !!todayLog;

  // Streak calculation
  const datesLogged = Array.from(new Set(userLogs.map(l => l.date))).sort().reverse();

  let currentStreak = 0;
  let checkDate = new Date();

  // If not logged today, check if logged yesterday to maintain streak count
  const todayInList = datesLogged.includes(todayStr);
  if (!todayInList) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
    if (datesLogged.includes(dateStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate best streak historically
  let bestStreak = currentStreak;
  let tempStreak = 0;
  if (datesLogged.length > 0) {
    const sortedAsc = [...datesLogged].sort();
    let prevDate: Date | null = null;

    for (const dStr of sortedAsc) {
      const curDate = new Date(dStr);
      if (prevDate) {
        const diffDays = Math.round((curDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }
      if (tempStreak > bestStreak) {
        bestStreak = tempStreak;
      }
      prevDate = curDate;
    }
  }

  // Weekly & Monthly mins
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday as start or 7 days back
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const thisWeekMins = userLogs
    .filter(l => new Date(l.date).getTime() >= startOfWeek.getTime())
    .reduce((acc, l) => acc + l.durationMins, 0);

  const thisMonthMins = userLogs
    .filter(l => new Date(l.date).getTime() >= startOfMonth.getTime())
    .reduce((acc, l) => acc + l.durationMins, 0);

  const avgDurationMins = totalWorkouts > 0 ? Math.round(totalMins / totalWorkouts) : 0;

  return {
    totalMins,
    totalWorkouts,
    currentStreak,
    bestStreak,
    thisWeekMins,
    thisMonthMins,
    avgDurationMins,
    loggedToday,
    todayLog
  };
}

export async function clearAllLogs(): Promise<void> {
  if (await isSupabaseConfigured()) {
    return dbClearAllLogs();
  }

  localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify([]));
}

// ---------------------------------------------------------------------------
// Sync status (used to surface whether data is cloud-synced or device-only)
// ---------------------------------------------------------------------------

export interface SyncStatus {
  mode: 'cloud' | 'local';
  connected: boolean;
  error: string | null;
}

export async function checkSyncStatus(): Promise<SyncStatus> {
  if (!(await isSupabaseConfigured())) {
    return {
      mode: 'local',
      connected: false,
      error: 'Supabase not configured (missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). Data is stored only in this browser.'
    };
  }

  try {
    const sb = await getSupabase();
    const { error } = await sb!.from(LOGS_TABLE).select('id').limit(1);
    if (error) {
      return {
        mode: 'cloud',
        connected: false,
        error: error.message
      };
    }
    return { mode: 'cloud', connected: true, error: null };
  } catch (err) {
    return {
      mode: 'cloud',
      connected: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

// ---------------------------------------------------------------------------
// One-time migration: push any device-local (localStorage) history to the
// cloud when Supabase becomes available. This recovers logs that were saved
// in a browser while the deployed app was running without cloud credentials.
//
// It is idempotent: existing cloud rows are never duplicated (matched by id),
// and localStorage is cleared only after a fully successful upload.
// ---------------------------------------------------------------------------

export async function syncLocalLogsToCloud(): Promise<{ uploaded: number; total: number }> {
  const localLogs = lsGetAllLogs();
  if (localLogs.length === 0) {
    return { uploaded: 0, total: 0 };
  }

  if (!(await isSupabaseConfigured())) {
    return { uploaded: 0, total: localLogs.length };
  }

  const sb = await getSupabase();
  const { data, error } = await sb!
    .from(LOGS_TABLE)
    .select('id');

  if (error) {
    console.error('[sync] Failed to read existing cloud log ids:', error.message);
    throw new Error(error.message);
  }

  const existingIds = new Set<string>((data ?? []).map(r => (r as { id: string }).id));
  const missing = localLogs.filter(l => !existingIds.has(l.id));

  if (missing.length > 0) {
    try {
      await dbInsertWorkoutLogs(sb!, missing.map(workoutLogToRow));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[sync] Failed to upload local history:', message);
      throw new Error(message);
    }
  }

  // Only clear localStorage after the upload succeeded so nothing is lost.
  lsSaveAllLogs([]);

  console.log(`[sync] Uploaded ${missing.length} local workout log(s) to the cloud.`);
  return { uploaded: missing.length, total: localLogs.length };
}