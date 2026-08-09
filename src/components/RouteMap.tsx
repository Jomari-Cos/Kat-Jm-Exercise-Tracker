import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as L from 'leaflet';
import html2canvas from 'html2canvas';
import 'leaflet/dist/leaflet.css';
import { Maximize2, Map as MapIcon, Satellite as SatelliteIcon, Camera as CameraIcon } from 'lucide-react';
import { LatLng } from '../types';

interface RouteMapProps {
  points: LatLng[];
  /** Hex color of the drawn route line (user theme color). */
  accent?: string;
  height?: number;
  /** Live mode: refit the view periodically so it follows the walk. */
  autoFit?: boolean;
  /** When provided, shows a "Save Map" button that captures the current view. */
  onSaveScreenshot?: (dataUrl: string) => void;
}

const START_MARKER_HTML =
  '<div style="font-size:20px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.45))">🏁</div>';
const END_MARKER_HTML =
  '<div style="font-size:20px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.45))">📍</div>';

function makeIcon(html: string): L.DivIcon {
  return L.divIcon({
    html,
    className: 'route-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 18]
  });
}

/** Imperative handle that lets the Activity Tracker auto-capture the map view. */
export interface RouteMapHandle {
  /** Capture the current map view as a PNG data URL (or null on failure/invalid). */
  capture: () => Promise<string | null>;
}

/**
 * Renders a set of GPS points as a route on a free OpenStreetMap (Leaflet)
 * map. Used live inside the Activity Tracker and to replay saved routes from
 * a workout log card.
 */
export const RouteMap = forwardRef<RouteMapHandle, RouteMapProps>(function RouteMap(
  { points, accent = '#6366f1', height = 240, autoFit = false, onSaveScreenshot },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);
  const hasFitBoundsRef = useRef(false);
  const standardLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLayerRef = useRef<L.TileLayer | null>(null);
  const [baseMap, setBaseMap] = useState<'standard' | 'satellite'>('standard');
  const [isCapturing, setIsCapturing] = useState(false);

  // Create the Leaflet map exactly once.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = L.map(container, { zoomControl: true });

    const standard = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution:
          'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
      }
    );

    standard.addTo(map);
    standardLayerRef.current = standard;
    satelliteLayerRef.current = satellite;
    mapRef.current = map;

    // Keep the map correctly sized if its container grows/shrinks.
    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      standardLayerRef.current = null;
      satelliteLayerRef.current = null;
      polylineRef.current = null;
      startMarkerRef.current = null;
      endMarkerRef.current = null;
      hasFitBoundsRef.current = false;
    };
  }, []);

  // Switch between the Standard and Satellite base layers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const show = baseMap === 'standard' ? standardLayerRef.current : satelliteLayerRef.current;
    const hide = baseMap === 'standard' ? satelliteLayerRef.current : standardLayerRef.current;
    if (show && !map.hasLayer(show)) show.addTo(map);
    if (hide && map.hasLayer(hide)) map.removeLayer(hide);
  }, [baseMap]);

  /** Capture the current map view as a PNG data URL (or null on failure). */
  const capture = useCallback(async (): Promise<string | null> => {
    const container = containerRef.current;
    if (!container || isCapturing) return null;
    setIsCapturing(true);
    try {
      // Let any in-flight map tiles finish loading first — html2canvas bakes
      // the DOM as-is, so a half-loaded tile would come out as a gray/blank
      // patch (or a CORS error) and silently drop the proof.
      const images = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
      await Promise.race([
        Promise.all(
          images.map((img: HTMLImageElement) =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>((resolve) => {
                  img.addEventListener('load', () => resolve(), { once: true });
                  img.addEventListener('error', () => resolve(), { once: true });
                })
          )
        ),
        new Promise<void>((resolve) => setTimeout(resolve, 2500))
      ]);
      // Give Leaflet a tick to settle its panes/layout after the tiles arrive.
      await new Promise((r) => setTimeout(r, 150));

      // Both the OSM and Esri tile servers send Access-Control-Allow-Origin:*,
      // so useCORS can rebuild the map image cross-origin without tainting.
      const canvas = await html2canvas(container, {
        useCORS: true,
        allowTaint: false,
        scale: 2,
        backgroundColor: '#f1f5f9',
        logging: false
      });
      return canvas.toDataURL('image/png');
    } catch (err) {
      console.error('Failed to capture map screenshot:', err);
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing]);

  useImperativeHandle(ref, () => ({ capture }), [capture]);

  // Draw / update the polyline and markers whenever points change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // No points → clear any drawn layers.
    if (points.length === 0) {
      polylineRef.current?.remove();
      polylineRef.current = null;
      startMarkerRef.current?.remove();
      startMarkerRef.current = null;
      endMarkerRef.current?.remove();
      endMarkerRef.current = null;
      hasFitBoundsRef.current = false;
      return;
    }

    const latlngs = points.map((p) => [p.latitude, p.longitude] as [number, number]);

    if (latlngs.length >= 2) {
      if (!polylineRef.current) {
        polylineRef.current = L.polyline(latlngs, {
          color: accent,
          weight: 4,
          opacity: 0.9,
          lineJoin: 'round'
        }).addTo(map);
      } else {
        polylineRef.current.setLatLngs(latlngs);
      }

      if (!startMarkerRef.current) {
        startMarkerRef.current = L.marker(latlngs[0], { icon: makeIcon(START_MARKER_HTML) }).addTo(map);
      } else {
        startMarkerRef.current.setLatLng(latlngs[0]);
      }

      if (!endMarkerRef.current) {
        endMarkerRef.current = L.marker(latlngs[latlngs.length - 1], { icon: makeIcon(END_MARKER_HTML) }).addTo(map);
      } else {
        endMarkerRef.current.setLatLng(latlngs[latlngs.length - 1]);
      }

      // Fit the route into view without constant re-zooming.
      const shouldFit = autoFit
        ? latlngs.length === 2 || latlngs.length === 5 || latlngs.length % 10 === 0
        : !hasFitBoundsRef.current;

      if (shouldFit) {
        map.fitBounds(L.latLngBounds(latlngs), { padding: [28, 28], maxZoom: 18 });
        hasFitBoundsRef.current = true;
      }
    } else {
      // Single point so far — drop a pin and center on it.
      if (!endMarkerRef.current) {
        endMarkerRef.current = L.marker(latlngs[0], { icon: makeIcon(END_MARKER_HTML) }).addTo(map);
      } else {
        endMarkerRef.current.setLatLng(latlngs[0]);
      }
      if (!hasFitBoundsRef.current) {
        map.setView(latlngs[0], 16);
        hasFitBoundsRef.current = true;
      }
    }
  }, [points, accent, autoFit]);

  const handleRecenter = () => {
    const map = mapRef.current;
    if (!map || points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], 16);
    } else {
      map.fitBounds(
        L.latLngBounds(points.map((p) => [p.latitude, p.longitude] as [number, number])),
        { padding: [28, 28], maxZoom: 18 }
      );
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
      <div ref={containerRef} className="w-full" style={{ height }} />

      {/* Basemap toggle: Standard map vs Satellite imagery */}
      <div className="absolute top-2 left-2 z-[1000] flex bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
        <button
          type="button"
          onClick={() => setBaseMap('standard')}
          className={`px-2.5 py-1.5 text-[11px] font-black flex items-center gap-1 transition ${
            baseMap === 'standard' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <MapIcon className="w-3.5 h-3.5" /> Map
        </button>
        <button
          type="button"
          onClick={() => setBaseMap('satellite')}
          className={`px-2.5 py-1.5 text-[11px] font-black flex items-center gap-1 transition ${
            baseMap === 'satellite' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <SatelliteIcon className="w-3.5 h-3.5" /> Satellite
        </button>
      </div>

      {points.length > 0 && (
        <button
          type="button"
          onClick={handleRecenter}
          className="absolute top-2 right-2 z-[1000] bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl p-2 shadow-md transition"
          title="Recenter map"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      )}

      {onSaveScreenshot && points.length > 0 && (
        <button
          type="button"
          onClick={async () => {
            const url = await capture();
            if (url && onSaveScreenshot) onSaveScreenshot(url);
          }}
          disabled={isCapturing}
          className="absolute bottom-2 left-2 z-[1000] bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl px-3 py-1.5 text-[11px] font-black shadow-md transition flex items-center gap-1.5"
          title="Save this map view as proof"
        >
          <CameraIcon className="w-3.5 h-3.5" />
          {isCapturing ? 'Saving…' : 'Save Map'}
        </button>
      )}
    </div>
  );
});