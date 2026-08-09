-- ============================================================
-- Kat & Jm Workout Tracker - Map Proof Screenshot
-- Stores the captured route-map PNG (base64 data URL) that is
-- logged together with the exercise photo proof.
-- ============================================================

ALTER TABLE public.workout_logs
  ADD COLUMN IF NOT EXISTS map_proof_url TEXT;