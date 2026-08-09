import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Footprints,
  Route,
  Timer,
  MapPin,
  Info,
  Smartphone
} from 'lucide-react';
import {
  createStepCounter,
  StepCounter,
  haversineMeters,
  stepsToDistanceMeters,
  formatElapsed,
  formatDistance,
  formatClockTime,
  LatLng
} from '../lib/trackerUtils';
import { RouteMap, RouteMapHandle } from './RouteMap';
import { UserType } from '../types';
import {
  clearPersistedSession,
  loadPersistedSession,
  persistSession,
  type PersistedSession
} from '../utils/sessionPersistence';

/** Result of one automatically tracked activity session. */
export interface StepSession {
  steps: number;
  distanceMeters: number;
  distanceSource: 'gps' | 'estimated';
  startTime: number;
  endTime: number;
  activeSeconds: number;
  route: LatLng[];
  mapProofUrl?: string;
}

interface ActivitySessionTrackerProps {
  isJm: boolean;
  onSessionFinish: (session: StepSession) => void;
  onMapProofSaved?: (dataUrl: string) => void;
  /** Called when the tracked session is discarded or reset (form should clear its summary). */
  onSessionReset?: () => void;
}

type TrackerStatus = 'idle' | 'running' | 'paused' | 'finished';

const SIM_STEPS_PER_SECOND = 2; // walking pace used by Simulate mode (~120 steps/min)

/**
 * Automatic "Live Activity Tracker".
 *
 * Uses the device motion sensor (accelerometer) to count steps, a stopwatch
 * for active time, and GPS (with a steps × stride fallback) for distance.
 * Motion sensors only exist on real phones served over HTTPS (or localhost),
 * so desktop browsers get a small "Simulate" toggle for testing the flow.
 */
export const ActivitySessionTracker: React.FC<ActivitySessionTrackerProps> = ({
  isJm,
  onSessionFinish,
  onMapProofSaved,
  onSessionReset
}) => {
  const user: UserType = isJm ? 'JM' : 'KAT';
  // Display state
  const [status, setStatus] = useState<TrackerStatus>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [finalElapsedMs, setFinalElapsedMs] = useState(0);
  const [steps, setSteps] = useState(0);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [distanceSource, setDistanceSource] = useState<'gps' | 'estimated'>('estimated');
  const [sensorSupported, setSensorSupported] = useState<boolean | null>(null);
  const [gpsSupported, setGpsSupported] = useState(false);
  const [simulate, setSimulate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routePoints, setRoutePoints] = useState<LatLng[]>([]);
  const [mapProof, setMapProof] = useState<string | null>(null);

  // Mutable tracking refs (avoid stale closures inside event callbacks).
  const statusRef = useRef<TrackerStatus>('idle');
  const stepCounterRef = useRef<StepCounter>(createStepCounter());
  const activeBaseRef = useRef(0); // accumulated active ms before the current run segment
  const runStartRef = useRef(0); // performance.now() when the current run segment started
  const startedAtRef = useRef(0); // wall-clock (epoch ms) when the session started
  const gpsModeRef = useRef(false);
  const gpsDistanceRef = useRef(0);
  const lastPosRef = useRef<LatLng | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const motionHandlerRef = useRef<((e: DeviceMotionEvent) => void) | null>(null);
  const displayTimerRef = useRef<number | null>(null);
  const simTimerRef = useRef<number | null>(null);
  const routeRef = useRef<LatLng[]>([]); // recorded GPS trace (capped)
  const mapProofRef = useRef<string | null>(null); // latest map proof data URL
  const routeMapRef = useRef<RouteMapHandle | null>(null);

  const isRunning = () => statusRef.current === 'running';

  const getActiveMs = () =>
    activeBaseRef.current + (isRunning() ? performance.now() - runStartRef.current : 0);

  const getDistance = (currentSteps: number) =>
    gpsModeRef.current ? gpsDistanceRef.current : stepsToDistanceMeters(currentSteps);

  const syncDisplay = useCallback(() => {
    const currentSteps = stepCounterRef.current.steps;
    setElapsedMs(getActiveMs());
    setSteps(currentSteps);
    setDistanceMeters(getDistance(currentSteps));
    setDistanceSource(gpsModeRef.current ? 'gps' : 'estimated');
    setRoutePoints(routeRef.current.slice());
  }, []);

  /** Serializable checkpoint of the current session state (used for localStorage). */
  const buildSnapshot = (
    status: PersistedSession['status'],
    activeMs: number,
    endTime?: number
  ): PersistedSession => ({
    user,
    status,
    steps: stepCounterRef.current.steps,
    distanceMeters: Math.round(getDistance(stepCounterRef.current.steps)),
    distanceSource: gpsModeRef.current ? 'gps' : 'estimated',
    gpsMode: gpsModeRef.current,
    startTime: startedAtRef.current,
    endTime,
    activeMs,
    savedAt: Date.now(),
    route: routeRef.current.slice(),
    mapProof: mapProofRef.current || undefined,
    simulate
  });

  const stopTimers = useCallback(() => {
    if (displayTimerRef.current !== null) {
      window.clearInterval(displayTimerRef.current);
      displayTimerRef.current = null;
    }
    if (simTimerRef.current !== null) {
      window.clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
  }, []);

  const stopTracking = useCallback(() => {
    if (motionHandlerRef.current) {
      window.removeEventListener('devicemotion', motionHandlerRef.current);
      motionHandlerRef.current = null;
    }
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    stopTimers();
  }, [stopTimers]);

  // Clean up listeners/timers if the user navigates away mid-session.
  useEffect(() => stopTracking, [stopTracking]);

  // Detect sensor availability once on mount.
  useEffect(() => {
    setSensorSupported(typeof window !== 'undefined' && 'DeviceMotionEvent' in window);
  }, []);

  const resetSessionState = useCallback(() => {
    stepCounterRef.current.reset();
    activeBaseRef.current = 0;
    runStartRef.current = 0;
    startedAtRef.current = 0;
    gpsModeRef.current = false;
    gpsDistanceRef.current = 0;
    lastPosRef.current = null;
    routeRef.current = [];
    watchIdRef.current = null;
    statusRef.current = 'idle';
    setStatus('idle');
    setElapsedMs(0);
    setFinalElapsedMs(0);
    setSteps(0);
    setDistanceMeters(0);
    setDistanceSource('estimated');
    setRoutePoints([]);
    setMapProof(null);
    setError(null);
    setSimulate(false);
  }, []);

  const attachTracking = async (): Promise<boolean> => {
    const hasMotionApi = typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
    setSensorSupported(hasMotionApi);

    // iOS 13+ requires an explicit user-gesture permission before motion fires.
    if (hasMotionApi && !simulate) {
      const permissionFn = (DeviceMotionEvent as unknown as {
        requestPermission?: () => Promise<string>;
      }).requestPermission;
      if (typeof permissionFn === 'function') {
        try {
          const result = await permissionFn();
          if (result !== 'granted') {
            setError('Motion permission was denied — steps will stay at 0. Active time is still tracked.');
          }
        } catch {
          setError('Could not request motion sensor permission.');
        }
      }
    }

    if (!hasMotionApi && !simulate) {
      setError(
        'No motion sensor on this device. Step counting needs a phone over HTTPS — enable Simulate mode to test the flow.'
      );
      return false;
    }

    // Real accelerometer listener (idempotent — never double-register).
    if (hasMotionApi && !simulate && !motionHandlerRef.current) {
      const handler = (e: DeviceMotionEvent) => stepCounterRef.current.handleMotion(e);
      motionHandlerRef.current = handler;
      window.addEventListener('devicemotion', handler);
    }

    // Optional GPS path tracking (hybrid distance: GPS when allowed, else estimate).
    if (typeof navigator !== 'undefined' && navigator.geolocation && !simulate && watchIdRef.current === null) {
      setGpsSupported(true);
      try {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            if (pos.coords.accuracy > 60) return; // ignore unreliable fixes
            const current: LatLng = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
            if (!lastPosRef.current) {
              lastPosRef.current = current;
            }
            const delta = haversineMeters(lastPosRef.current, current);
            if (delta > 5) {
              gpsDistanceRef.current += delta;
              lastPosRef.current = current;
            }
            // Record the trace (skip near-duplicate fixes to reduce noise).
            if (routeRef.current.length === 0 || delta > 7) {
              routeRef.current.push(current);
              if (routeRef.current.length > 2500) routeRef.current.shift();
            }
            syncDisplay();
          },
          () => {
            // location denied/unavailable — silently fall back to step estimate
            gpsModeRef.current = false;
            setGpsSupported(false);
          },
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
        );
      } catch {
        gpsModeRef.current = false;
        setGpsSupported(false);
      }
    }

    // Simulated steps for desktop / dev testing.
    if (simulate && simTimerRef.current === null) {
      simTimerRef.current = window.setInterval(() => {
        if (statusRef.current === 'running') {
          stepCounterRef.current.addSteps(SIM_STEPS_PER_SECOND);
          // Extend the synthetic walking route (~1.3 m per tick) for the map trace.
          const last = routeRef.current[routeRef.current.length - 1];
          const lat = (last ? last.latitude : 14.599512) + 0.000012 + (Math.random() - 0.5) * 0.000008;
          const lng = (last ? last.longitude : 120.984222) + 0.000012 + (Math.random() - 0.5) * 0.000008;
          routeRef.current.push({ latitude: lat, longitude: lng });
          syncDisplay();
        }
      }, 1000);
    }

    // Display clock.
    if (displayTimerRef.current === null) {
      displayTimerRef.current = window.setInterval(syncDisplay, 250);
    }

    return true;
  };

  const handleStart = async () => {
    setError(null);
    clearPersistedSession(user);

    stepCounterRef.current.reset();
    activeBaseRef.current = 0;
    runStartRef.current = performance.now();
    startedAtRef.current = Date.now();
    gpsModeRef.current = false;
    gpsDistanceRef.current = 0;
    lastPosRef.current = null;
    routeRef.current = [];
    mapProofRef.current = null;
    setMapProof(null);

    // Seed a starting point in Simulate mode so the map has a pin to draw from.
    if (simulate) {
      routeRef.current.push({ latitude: 14.599512, longitude: 120.984222 });
    }

    const attached = await attachTracking();
    if (!attached) return; // attachTracking already set the error message

    statusRef.current = 'running';
    setStatus('running');
    syncDisplay();
    persistSession(buildSnapshot('running', 0));
  };

  const handlePause = () => {
    if (statusRef.current !== 'running') return;
    activeBaseRef.current = getActiveMs();
    statusRef.current = 'paused';
    setStatus('paused');
    syncDisplay();
    persistSession(buildSnapshot('paused', activeBaseRef.current));
  };

  const handleResume = async () => {
    if (statusRef.current !== 'paused') return;
    // Sensors/timers may have been torn down by a reload — re-attach them.
    const attached = await attachTracking();
    if (!attached) return;
    runStartRef.current = performance.now();
    statusRef.current = 'running';
    setStatus('running');
    syncDisplay();
    persistSession(buildSnapshot('running', activeBaseRef.current));
  };

  const handleFinish = async () => {
    if (statusRef.current !== 'running' && statusRef.current !== 'paused') return;
    const currentSteps = stepCounterRef.current.steps;
    const activeMs = getActiveMs();
    const session: StepSession = {
      steps: currentSteps,
      distanceMeters: Math.round(getDistance(currentSteps)),
      distanceSource: gpsModeRef.current ? 'gps' : 'estimated',
      startTime: startedAtRef.current,
      endTime: Date.now(),
      activeSeconds: Math.round(activeMs / 1000),
      route: routeRef.current.slice(),
      mapProofUrl: mapProofRef.current || undefined
    };
    statusRef.current = 'finished';
    setStatus('finished');
    setFinalElapsedMs(activeMs);
    stopTracking();
    setSteps(currentSteps);
    setDistanceMeters(session.distanceMeters);
    setDistanceSource(session.distanceSource);
    setRoutePoints(routeRef.current.slice());
    setError(null);

    // Persist the finished-but-not-yet-logged session so a reload mid-flow
    // doesn't lose it — the log form restores it and only the photo is missing.
    persistSession(buildSnapshot('finished', activeMs, session.endTime));

    onSessionFinish(session);

    // AUTO-SAVE the route map as proof — no button needed. Runs in the background
    // right when the session ends; the result is attached to the log alongside the photo.
    const url = await routeMapRef.current?.capture();
    if (url) {
      mapProofRef.current = url;
      setMapProof(url);
      onMapProofSaved?.(url);
      // Refresh the snapshot so a restore already includes the map proof.
      persistSession(buildSnapshot('finished', activeMs, session.endTime));
    }
  };

  const handleCancel = () => {
    stopTracking();
    clearPersistedSession(user);
    resetSessionState();
    onSessionReset?.();
  };

  // Restore an in-progress (or finished-but-not-logged) session saved before a
  // page reload, so the user never starts from zero.
  useEffect(() => {
    const saved = loadPersistedSession(user);
    if (!saved) return;

    // Rebuild the base tracking state so the display / finish flow sees history.
    stepCounterRef.current.addSteps(saved.steps);
    gpsDistanceRef.current = saved.distanceMeters;
    gpsModeRef.current = saved.gpsMode;
    startedAtRef.current = saved.startTime;
    routeRef.current = saved.route.slice();
    mapProofRef.current = saved.mapProof || null;
    setMapProof(saved.mapProof || null);
    setRoutePoints(saved.route.slice());
    setDistanceSource(saved.distanceSource);
    setSteps(saved.steps);
    setDistanceMeters(saved.distanceMeters);

    if (saved.status === 'finished') {
      statusRef.current = 'finished';
      setStatus('finished');
      setFinalElapsedMs(saved.activeMs);
      setElapsedMs(saved.activeMs);
      return;
    }

    // running / paused → restore totals and land in PAUSED so the user's Resume
    // tap can re-acquire motion/GPS permissions and listeners (iOS requires a
    // user gesture). Active time rolls forward from the wall-clock savedAt.
    const elapsed =
      saved.status === 'running'
        ? saved.activeMs + (Date.now() - saved.savedAt)
        : saved.activeMs;

    activeBaseRef.current = Math.max(0, elapsed);
    statusRef.current = 'paused';
    setStatus('paused');
    setElapsedMs(activeBaseRef.current);
    if (saved.simulate) setSimulate(true);

    // Rewrite as paused so a second reload keeps elapsed time stable.
    persistSession({
      ...saved,
      status: 'paused',
      activeMs: activeBaseRef.current,
      savedAt: Date.now(),
      mapProof: mapProofRef.current || undefined
    });
  }, [user]);

  // Checkpoint the live session whenever the page is closed or reloaded mid-workout.
  useEffect(() => {
    const persistOnUnload = () => {
      if (statusRef.current !== 'running' && statusRef.current !== 'paused') return;
      const activeMs = statusRef.current === 'running' ? getActiveMs() : activeBaseRef.current;
      persistSession({
        user,
        status: statusRef.current === 'running' ? 'running' : 'paused',
        steps: stepCounterRef.current.steps,
        distanceMeters: Math.round(getDistance(stepCounterRef.current.steps)),
        distanceSource: gpsModeRef.current ? 'gps' : 'estimated',
        gpsMode: gpsModeRef.current,
        startTime: startedAtRef.current,
        activeMs,
        savedAt: Date.now(),
        route: routeRef.current.slice(),
        mapProof: mapProofRef.current || undefined,
        simulate
      });
    };

    window.addEventListener('beforeunload', persistOnUnload);
    window.addEventListener('pagehide', persistOnUnload);
    return () => {
      window.removeEventListener('beforeunload', persistOnUnload);
      window.removeEventListener('pagehide', persistOnUnload);
    };
  }, [simulate, user]);

  // ---------- Theming ----------
  const mainBg = isJm ? 'bg-emerald-600' : 'bg-pink-600';
  const mainText = isJm ? 'text-emerald-600' : 'text-pink-600';
  const softBtn = isJm
    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
    : 'bg-pink-50 text-pink-700 hover:bg-pink-100 border-pink-200';
  const softBg = isJm ? 'bg-emerald-50 border-emerald-200' : 'bg-pink-50 border-pink-200';
  const softText = isJm ? 'text-emerald-800' : 'text-pink-800';
  const borderCls = isJm ? 'border-emerald-200' : 'border-pink-200';
  const glow = isJm ? 'bg-emerald-400/20' : 'bg-pink-400/20';

  const running = status === 'running';
  const paused = status === 'paused';
  const finished = status === 'finished';
  const shownElapsed = finished ? finalElapsedMs : elapsedMs;

  return (
    <div
      className={`bg-white rounded-[32px] p-6 sm:p-7 border-2 ${borderCls} shadow-xl shadow-slate-200/50 relative overflow-hidden`}
    >
      <div className={`absolute -right-10 -bottom-10 w-36 h-36 rounded-full blur-3xl pointer-events-none ${glow}`} />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 relative">
        <div className="flex items-center gap-3">
          <span className={`w-11 h-11 rounded-2xl ${mainBg} text-white flex items-center justify-center shadow-md`}>
            <Smartphone className="w-6 h-6" />
          </span>
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Live Activity Tracker</h3>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              Auto steps · active time · start/end · distance
            </p>
          </div>
        </div>

        <span
          className={`px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border ${
            finished
              ? 'bg-slate-100 text-slate-600 border-slate-200'
              : running
                ? `${softBtn} animate-pulse`
                : paused
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
          }`}
        >
          {finished ? 'Session Done' : running ? '● Running' : paused ? '❚❚ Paused' : 'Ready'}
        </span>
      </div>

{/* Idle / intro view */}
      {status === 'idle' && (
        <div className="mt-5 space-y-4 relative">
          <p className="text-xs font-medium text-slate-500 leading-relaxed">
            Press <b className="text-slate-700">Start</b> and carry your phone with you. Steps are counted
            automatically from the motion sensor, active time runs like a stopwatch, and distance uses GPS
            when allowed (otherwise it's estimated from steps).
          </p>

          {/* Sensor & GPS capability chips */}
          <div className="flex flex-wrap gap-2">
            <span
              className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl border ${
                sensorSupported === false
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : sensorSupported === null
                    ? 'bg-slate-50 text-slate-400 border-slate-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              {sensorSupported === null
                ? 'Checking sensors…'
                : sensorSupported
                  ? 'Motion sensor ready'
                  : 'No motion sensor on this device'}
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl border bg-slate-50 text-slate-500 border-slate-200">
              <MapPin className="w-3.5 h-3.5" />
              {typeof navigator !== 'undefined' && navigator.geolocation
                ? 'GPS distance available'
                : 'GPS unavailable — distance estimated from steps'}
            </span>
          </div>

          {/* Simulate toggle (desktop/dev testing) */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
            <input
              type="checkbox"
              checked={simulate}
              onChange={(e) => setSimulate(e.target.checked)}
              className="w-4 h-4 accent-emerald-600"
            />
            <span className="text-xs font-bold text-slate-700">
              Simulate steps
              <span className="block text-[10px] font-semibold text-slate-400">
                Desktop testing only — adds realistic steps while running
              </span>
            </span>
          </label>

          {error && (
            <p className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleStart}
            className={`w-full ${mainBg} text-white text-base font-black py-4 rounded-3xl shadow-lg transition flex items-center justify-center gap-2 hover:opacity-95 active:scale-98`}
          >
            <Play className="w-5 h-5 fill-current" />
            START SESSION
          </button>
        </div>
      )}
{/* Running / paused / finished view */}
      {status !== 'idle' && (
        <div className="mt-5 space-y-4 relative">
          {/* Big clock */}
          <div className="text-center py-1">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              {finished ? 'Total Active Time' : 'Active Time'}
            </p>
            <p className={`text-6xl font-black tabular-nums tracking-tight ${mainText}`}>
              {formatElapsed(shownElapsed)}
            </p>
          </div>

          {/* Live / final stats */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-2xl border text-center bg-slate-50/60 border-slate-100">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1">
                <Footprints className="w-3.5 h-3.5 text-teal-600" /> Steps
              </p>
              <p className="text-lg font-black mt-0.5 text-slate-900 tabular-nums">
                {steps.toLocaleString()}
              </p>
            </div>

            <div className="p-3 rounded-2xl border text-center bg-slate-50/60 border-slate-100">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1">
                <Route className="w-3.5 h-3.5 text-indigo-500" /> Distance
              </p>
              <p className="text-lg font-black mt-0.5 text-slate-900 tabular-nums">
                {distanceMeters > 0 ? formatDistance(distanceMeters) : '0 m'}
                <span className="block text-[9px] font-bold text-slate-400 uppercase">
                  {distanceSource === 'gps' ? 'GPS' : 'Est.'}
                </span>
              </p>
            </div>

            <div className="p-3 rounded-2xl border text-center bg-slate-50/60 border-slate-100">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1">
                <Timer className="w-3.5 h-3.5 text-amber-500" /> Started
              </p>
              <p className="text-lg font-black mt-0.5 text-slate-900 tabular-nums">
                {startedAtRef.current ? formatClockTime(startedAtRef.current) : '--:--'}
              </p>
            </div>
          </div>

          {/* Live route trace */}
          {routePoints.length > 0 ? (
            <RouteMap
              ref={routeMapRef}
              points={routePoints}
              accent={isJm ? '#10b981' : '#ec4899'}
              height={220}
              autoFit
            />
          ) : running || paused ? (
            <p className="text-[11px] font-bold text-slate-400 text-center border border-dashed border-slate-200 rounded-2xl py-4">
              📡 Waiting for GPS signal to trace your route…
            </p>
          ) : null}

          {mapProof && (
            <div className="flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-2">
              <img src={mapProof} alt="Map proof" className="w-10 h-10 rounded-lg object-cover border border-indigo-200" />
              <p className="text-[11px] font-black text-indigo-700">
                Map proof saved ✓ — it will be logged together with your photo.
              </p>
            </div>
          )}

          {(running || paused) && (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={paused ? handleResume : handlePause}
                  className={`${softBtn} border text-sm font-black py-4 rounded-2xl transition flex items-center justify-center gap-2`}
                >
                  {paused ? (
                    <>
                      <Play className="w-4 h-4 fill-current" /> RESUME
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4 fill-current" /> PAUSE
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  className="bg-slate-900 text-white text-sm font-black py-4 rounded-2xl transition flex items-center justify-center gap-2 hover:bg-slate-800"
                >
                  <Square className="w-4 h-4 fill-current" /> END & USE SESSION
                </button>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                className="w-full text-center text-xs font-bold text-slate-400 hover:text-rose-500 underline underline-offset-2 transition"
              >
                Discard session
              </button>
            </>
          )}

          {finished && (
            <>
              <div className={`flex items-start gap-2 rounded-2xl border ${softBg} px-4 py-3`}>
                <Info className={`w-4 h-4 shrink-0 mt-0.5 ${mainText}`} />
                <p className={`text-xs font-bold ${softText} leading-relaxed`}>
                  Session ready — the duration, steps, distance and times were auto-filled into the log
                  below. Finish it with a photo proof.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                className={`w-full ${softBtn} border text-sm font-black py-4 rounded-2xl transition flex items-center justify-center gap-2`}
              >
                <RotateCcw className="w-4 h-4" /> START NEW SESSION
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
