-- ============================================================
-- Kat & Jm Workout Tracker - Initial Schema
-- Mirrors database.md entities: WorkoutLog & UserProfile
-- ============================================================

-- ---------- workout_logs ----------
CREATE TABLE IF NOT EXISTS public.workout_logs (
  id                TEXT PRIMARY KEY,          -- e.g. 'log-1722800000000-a1b2c'
  "user"            TEXT NOT NULL CHECK ("user" IN ('JM', 'KAT')),
  date              DATE NOT NULL,             -- YYYY-MM-DD
  timestamp         BIGINT NOT NULL,           -- Unix epoch ms
  exercise_type     TEXT NOT NULL,
  custom_name       TEXT,
  duration_mins     INTEGER NOT NULL,
  calories_burned   INTEGER,
  notes             TEXT,
  proof_photo_url   TEXT,                      -- base64 data URL or photo link
  ai_feedback       TEXT,
  mood              TEXT,
  location          TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date
  ON public.workout_logs ("user", date);

CREATE INDEX IF NOT EXISTS idx_workout_logs_user_timestamp
  ON public.workout_logs ("user", timestamp);

-- ---------- user_profiles ----------
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id                TEXT PRIMARY KEY,          -- 'JM' | 'KAT'
  name              TEXT NOT NULL,
  nickname          TEXT NOT NULL,
  avatar            TEXT NOT NULL,
  theme_color       TEXT NOT NULL,
  bg_gradient       TEXT NOT NULL,
  weekly_goal_mins  INTEGER NOT NULL,
  fav_exercise      TEXT NOT NULL,
  bio               TEXT NOT NULL,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Cleanup: Remove any previously seeded mockup/placeholder data.
-- Real user data is never auto-inserted; profiles and workout
-- logs are created by the app users themselves.
-- ============================================================

-- Remove mockup workout logs (ids prefixed with 'seed-')
DELETE FROM public.workout_logs WHERE id LIKE 'seed-%';