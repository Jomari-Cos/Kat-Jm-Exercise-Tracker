/*
 * Shared low-level helpers for automatic activity tracking:
 * step counting (device accelerometer), GPS distance and formatting.
 * Used by the ActivitySessionTracker component.
 */

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface StepCounter {
  readonly steps: number;
  reset(): void;
  /** Manually add steps — used ONLY by the desktop Simulate mode. */
  addSteps(count: number): void;
  handleMotion(event: DeviceMotionEvent): void;
}

// Average adult walking stride used for distance estimation when GPS is
// unavailable (~2.5 ft ≈ 0.762 m, the commonly recommended value).
export const DEFAULT_STRIDE_METERS = 0.762;

/**
 * Minimal adaptive-threshold pedometer.
 *
 * Reads the phone's accelerometer (`devicemotion`), computes the
 * acceleration magnitude, maintains a slow-moving baseline (EMA) and
 * counts a step when the magnitude spikes above that baseline by a
 * meaningful amount. A short refractory window ensures each foot strike
 * bumps the counter exactly once.
 */
export function createStepCounter(): StepCounter {
  let steps = 0;
  let baseline = 0;
  let previousAbove = false;
  let lastStepAt = 0;

  const DELTA = 1.4; // g units above the adaptive baseline
  const REFRACTORY_MS = 260; // min gap between steps (~3.8 steps/sec max)
  const EMA_ALPHA = 0.04;

  const handleMotion = (event: DeviceMotionEvent): void => {
    // Prefer gravity-free acceleration; fall back to including-gravity on
    // platforms (e.g. iOS) where `acceleration` is often null.
    const acc =
      event.acceleration && event.acceleration.x !== null
        ? event.acceleration
        : event.accelerationIncludingGravity;

    if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

    const magnitude = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);

    if (baseline === 0) {
      baseline = magnitude;
      return;
    }

    baseline = baseline * (1 - EMA_ALPHA) + magnitude * EMA_ALPHA;
    const now = event.timeStamp || performance.now();

    if (magnitude - baseline > DELTA) {
      if (!previousAbove && now - lastStepAt > REFRACTORY_MS) {
        steps++;
        lastStepAt = now;
      }
      previousAbove = true;
    } else if (magnitude - baseline < 0) {
      previousAbove = false;
    }
  };

  return {
    get steps() {
      return steps;
    },
    reset() {
      steps = 0;
      baseline = 0;
      previousAbove = false;
      lastStepAt = 0;
    },
    addSteps(count: number) {
      steps += Math.max(0, Math.floor(count || 0));
    },
    handleMotion
  };
}

/** Great-circle distance between two coordinates, in meters. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Estimate distance (meters) from a step count and stride length. */
export function stepsToDistanceMeters(
  steps: number,
  strideMeters: number = DEFAULT_STRIDE_METERS
): number {
  return Math.round(steps * strideMeters);
}

/** "mm:ss" or "hh:mm:ss" clock for elapsed / duration displays. */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Local wall-clock like "7:42 AM" — used for start/end time display. */
export function formatClockTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** Convert active seconds to whole minutes (minimum 1) for the duration field. */
export function activeSecondsToMins(seconds: number): number {
  return Math.max(1, Math.round(seconds / 60));
}

/** Human-friendly distance: "850 m" or "1.25 km". */
export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}