-- ============================================================
-- Kat & Jm Workout Tracker - Automatic Session Tracking
-- Adds the metrics captured by the Live Activity Tracker:
--   steps, distance, start time, end time.
-- New columns are optional (NULL) so existing logs stay valid.
-- ============================================================

ALTER TABLE public.workout_logs
  ADD COLUMN IF NOT EXISTS steps INTEGER;

ALTER TABLE public.workout_logs
  ADD COLUMN IF NOT EXISTS distance_meters DOUBLE PRECISION;

ALTER TABLE public.workout_logs
  ADD COLUMN IF NOT EXISTS start_time BIGINT;

ALTER TABLE public.workout_logs
  ADD COLUMN IF NOT EXISTS end_time BIGINT;