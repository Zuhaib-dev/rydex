"use client";

import { useEffect, useState, useRef } from "react";
import Map, { Marker, Source, Layer, useMap } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation2, Plus, Minus } from "lucide-react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

type Props = {
  pickup: string;
  drop: string;
  /** When set, skip geocoding and use these coords [lat, lng] */
  pickupCoord?: [number, number] | null;
  dropCoord?: [number, number] | null;
  /** Preview only — no drag / no address reverse-geocode updates */
  previewMode?: boolean;
  onDistance?: (km: number) => void;
  onChange?: (pickup: string, drop: string) => void;
};

/* ─── FIT BOUNDS ──────────────────────────────────────────────────── */
function FitBounds({ p1, p2 }: { p1: [number, number]; p2: [number, number] }) {
  const { current: map } = useMap();
  useEffect(() => {
    if (map && p1 && p2) {
      // Calculate bounds
      const minLng = Math.min(p1[1], p2[1]);
      const maxLng = Math.max(p1[1], p2[1]);
      const minLat = Math.min(p1[0], p2[0]);
      const maxLat = Math.max(p1[0], p2[0]);

      map.fitBounds(
        [[minLng, minLat], [maxLng, maxLat]],
        { padding: 72, maxZoom: 15.5, pitch: 65, duration: 2000, essential: true }
      );
    }
  }, [p1, p2, map]);
  return null;
}

/* ─── ZOOM CONTROLS ───────────────────────────────────────────────── */
function ZoomControlsWrapper() {
  const { current: map } = useMap();
  return (
    <div
      style={{ position: "absolute", bottom: 24, right: 16, zIndex: 500, display: "flex", flexDirection: "column", gap: 6 }}
      onClick={e => e.stopPropagation()}
    >
      {[
        { icon: <Plus size={18} />, action: () => map?.zoomIn() },
        { icon: <Minus size={18} />, action: () => map?.zoomOut() },
      ].map((btn, i) => (
        <button
          key={i}
          onClick={btn.action}
          style={{
            width: 40, height: 40,
            background: "#fff",
            border: "1.5px solid #e4e4e7",
            borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#0a0a0a",
            boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
            transition: "background 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#f4f4f5"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.14)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#fff";    e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.1)";  }}
        >{btn.icon}</button>
      ))}
    </div>
  );
}

/* ─── MAIN ────────────────────────────────────────────────────────── */
export default function RouteMap({
  pickup,
  drop,
  pickupCoord,
  dropCoord,
  previewMode = false,
  onDistance,
  onChange,
}: Props) {
  const [p1,    setP1]    = useState<[number, number] | null>(null);
  const [p2,    setP2]    = useState<[number, number] | null>(null);
  const [route, setRoute] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [km,    setKm]    = useState<number | null>(null);

  const geocode = async (q: string): Promise<[number, number] | null> => {
    if (!MAPBOX_TOKEN) return null;
    try {
      const r = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${MAPBOX_TOKEN}&limit=1`);
      const d = await r.json();
      if (!d?.features?.length) return null;
      const [lon, lat] = d.features[0].center;
      return [lat, lon];
    } catch {
      return null;
    }
  };

  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    if (!MAPBOX_TOKEN) return "";
    try {
      const r = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`);
      const d = await r.json();
      if (!d?.features?.length) return "";
      return d.features[0].place_name;
    } catch {
      return "";
    }
  };

  const loadRoute = async (a: [number, number], b: [number, number]) => {
    if (!MAPBOX_TOKEN) return;
    try {
      const r = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${a[1]},${a[0]};${b[1]},${b[0]}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
      );
      const d = await r.json();
      if (!d?.routes?.length) return;
      
      setRoute({
        type: "Feature",
        properties: {},
        geometry: d.routes[0].geometry,
      });
      
      const distKm = +((d.routes[0].distance / 1000).toFixed(2));
      setKm(distKm);
      onDistance?.(distKm);
    } catch (err) {
      console.warn("Mapbox Route failed", err);
    }
  };

  useEffect(() => {
    setReady(false);
    setRoute(null);
    (async () => {
      let a: [number, number] | null = pickupCoord ?? null;
      let b: [number, number] | null = dropCoord ?? null;

      if (!a) a = await geocode(pickup);
      if (!b) b = await geocode(drop);
      if (!a || !b) return;
      setP1(a);
      setP2(b);
      await loadRoute(a, b);
      setReady(true);

      if (!pickupCoord) {
        try {
          await fetch("/api/metrics/search-log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude: a[0], longitude: a[1] }),
          });
        } catch {
          /* ignore */
        }
      }
    })();
  }, [pickup, drop, pickupCoord?.[0], pickupCoord?.[1], dropCoord?.[0], dropCoord?.[1]]);

  const onDragPickup = previewMode
    ? undefined
    : async (e: any) => {
    const lngLat = e.lngLat;
    const lat = lngLat.lat;
    const lon = lngLat.lng;
    
    setP1([lat, lon]);
    const addr = await reverseGeocode(lat, lon);
    onChange?.(addr, drop);
    if (p2) loadRoute([lat, lon], p2);
  };

  const onDragDrop = previewMode
    ? undefined
    : async (e: any) => {
    const lngLat = e.lngLat;
    const lat = lngLat.lat;
    const lon = lngLat.lng;
    
    setP2([lat, lon]);
    const addr = await reverseGeocode(lat, lon);
    onChange?.(pickup, addr);
    if (p1) loadRoute(p1, [lat, lon]);
  };

  const pickupDraggable = !previewMode;
  const dropDraggable = !previewMode;

  return (
    <div className="relative h-full w-full bg-[#e8eae9]">

      {/* ── MAP ── */}
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: p1 ? p1[1] : 74.7973, // Srinagar coordinates fallback
          latitude: p1 ? p1[0] : 34.0837,
          zoom: p1 ? 14 : 12,
          pitch: 65,
          bearing: -20,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        terrain={{ source: "mapbox-dem", exaggeration: 1.5 }}
        interactive={true}
      >
        <Source
          id="mapbox-dem"
          type="raster-dem"
          url="mapbox://mapbox.mapbox-terrain-dem-v1"
          tileSize={512}
          maxzoom={14}
        />
        
        {/* Sky for 3D realism */}
        <Layer
          id="sky"
          type="sky"
          paint={{
            "sky-type": "atmosphere",
            "sky-atmosphere-sun": [0.0, 90.0],
            "sky-atmosphere-sun-intensity": 15
          }}
        />

        {p1 && p2 && <FitBounds p1={p1} p2={p2} />}

        {p1 && (
          <Marker
            longitude={p1[1]}
            latitude={p1[0]}
            draggable={pickupDraggable}
            onDragEnd={onDragPickup}
            anchor="bottom"
            pitchAlignment="map"
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", filter: "drop-shadow(0 12px 16px rgba(0,0,0,0.4))", cursor: "grab" }}>
              <div style={{ background: "#0a0a0a", color: "#fff", padding: "6px 14px", borderRadius: "10px", fontSize: "11px", fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap", fontFamily: "system-ui", boxShadow: "0 6px 0 #000" }}>PICKUP</div>
              <div style={{ width: "4px", height: "16px", background: "#0a0a0a", marginTop: "-2px" }}></div>
              <div style={{ width: "16px", height: "16px", background: "#0a0a0a", borderRadius: "50%", border: "4px solid #fff", boxShadow: "0 0 0 2px rgba(0,0,0,0.15), 0 3px 10px rgba(0,0,0,0.3)" }}></div>
            </div>
          </Marker>
        )}

        {p2 && (
          <Marker
            longitude={p2[1]}
            latitude={p2[0]}
            draggable={dropDraggable}
            onDragEnd={onDragDrop}
            anchor="bottom"
            pitchAlignment="map"
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", filter: "drop-shadow(0 12px 16px rgba(0,0,0,0.4))", cursor: "grab" }}>
              <div style={{ background: "#fff", color: "#0a0a0a", padding: "6px 14px", borderRadius: "10px", fontSize: "11px", fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap", fontFamily: "system-ui", border: "2px solid #0a0a0a", boxShadow: "0 6px 0 rgba(0,0,0,0.25)" }}>DROP</div>
              <div style={{ width: "4px", height: "16px", background: "#0a0a0a", marginTop: "-2px" }}></div>
              <div style={{ width: "16px", height: "16px", background: "#fff", borderRadius: "50%", border: "4px solid #0a0a0a", boxShadow: "0 0 0 2px rgba(0,0,0,0.08), 0 3px 10px rgba(0,0,0,0.2)" }}></div>
            </div>
          </Marker>
        )}

        {/* Route — glowing blue layer on navigation map */}
        {route && (
          <Source type="geojson" data={route}>
            <Layer
              id="route-bg"
              type="line"
              layout={{ "line-join": "round", "line-cap": "round" }}
              paint={{ "line-color": "#2563eb", "line-width": 16, "line-opacity": 0.15 }}
            />
            <Layer
              id="route-mg"
              type="line"
              layout={{ "line-join": "round", "line-cap": "round" }}
              paint={{ "line-color": "#3b82f6", "line-width": 8, "line-opacity": 0.4 }}
            />
            <Layer
              id="route-fg"
              type="line"
              layout={{ "line-join": "round", "line-cap": "round" }}
              paint={{ "line-color": "#1d4ed8", "line-width": 4.5, "line-opacity": 1 }}
            />
          </Source>
        )}

        <ZoomControlsWrapper />
      </Map>

      {/* ── LOADING OVERLAY ── */}
      <AnimatePresence>
        {!ready && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            className="absolute inset-0 z-999 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center gap-4"
          >
            <div className="relative w-14 h-14 flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-2 border-transparent border-t-zinc-900"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-2 rounded-full border border-transparent border-t-zinc-300"
              />
              <MapPin size={15} className="text-zinc-800" />
            </div>
            <div className="text-center">
              <p className="text-zinc-900 text-xs font-black tracking-[0.22em] uppercase">Loading Map</p>
              <p className="text-zinc-400 text-[10px] font-medium tracking-wider mt-0.5">Plotting your route…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ROUTE BADGE (bottom left) ── */}
      <AnimatePresence>
        {ready && km !== null && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-6 left-4 z-500 flex items-center gap-2 bg-white border border-zinc-200 px-3.5 py-2 rounded-xl shadow-lg"
          >
            <Navigation2 size={13} className="text-zinc-900" />
            <span className="text-zinc-900 text-xs font-bold">{km} km</span>
            <span className="w-px h-3 bg-zinc-200" />
            <span className="text-zinc-400 text-xs font-medium">
              ~{Math.max(3, Math.round((km / 25) * 60))} min
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {!previewMode && (
        <AnimatePresence>
          {ready && <DragHintBadge />}
        </AnimatePresence>
      )}
    </div>
  );
}

/* ── Drag hint auto-hides after 3s ── */
function DragHintBadge() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 3200);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ delay: 0.5, duration: 0.35 }}
          className="absolute top-14 left-1/2 -translate-x-1/2 z-500 pointer-events-none flex items-center gap-2 bg-white border border-zinc-200 shadow-md px-3 py-1.5 rounded-full"
        >
          <motion.div
            animate={{ x: [0, 4, 0, -4, 0] }}
            transition={{ duration: 1.2, repeat: 2, ease: "easeInOut" }}
          >
            <MapPin size={11} className="text-zinc-500" />
          </motion.div>
          <span className="text-zinc-500 text-[10px] font-semibold tracking-wide">Drag pins to adjust</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
