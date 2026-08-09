import React, { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Maximize2 } from 'lucide-react';
import { LatLng } from '../types';

interface RouteMapProps {
  points: LatLng[];
  /** Hex color of the drawn route line (user theme color). */
  accent?: string;
  height?: number;
  /** Live mode: refit the view periodically so it follows the walk. */
  autoFit?: boolean;
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

/**
 * Renders a set of GPS points as a route on a free OpenStreetMap (Leaflet)
 * map. Used live inside the Activity Tracker and to replay saved routes from
 * a workout log card.
 */
export const RouteMap: React.FC<RouteMapProps> = ({
  points,
  accent = '#6366f1',
  height = 240,
  autoFit = false
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);
  const hasFitBoundsRef = useRef(false);

  // Create the Leaflet map exactly once.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = L.map(container, { zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    mapRef.current = map;

    // Keep the map correctly sized if its container grows/shrinks.
    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      polylineRef.current = null;
      startMarkerRef.current = null;
      endMarkerRef.current = null;
      hasFitBoundsRef.current = false;
    };
  }, []);

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
    </div>
  );
};