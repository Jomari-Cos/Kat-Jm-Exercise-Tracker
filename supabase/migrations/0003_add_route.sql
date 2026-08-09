-- ============================================================
-- Kat & Jm Workout Tracker - GPS Route Tracing
-- Stores the walked/running trace as a JSONB array of
-- { latitude, longitude } points.
-- ============================================================

ALTER TABLE public.workout_logs
  ADD COLUMN IF NOT EXISTS route JSONB;