"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";

type Props = {
  driverLocation: [number, number] | null;
  pickupLocation: [number, number];
  dropLocation: [number, number];
  status: "arriving" | "ongoing" | "completed";
  onStats?: (data: {
    distanceToPickup: number;
    durationToPickup: number;
    distanceToDrop: number;
    durationToDrop: number;
  }) => void;
};

/* ─── HELPERS ──────────────────────────────────────────────────────── */

/** Standardizes coordinates to Leaflet [lat, lng] format */
const toLatLon = (coord: [number, number]): [number, number] => coord;

/** Converts [lat, lng] to "lng,lat" (OSRM string format) */
const toLonLatStr = (coord: [number, number]): string => `${coord[1]},${coord[0]}`;

/* ─── ICONS ────────────────────────────────────────────────────────── */

const driverIcon = new L.DivIcon({
  html: `
    <div id="car-marker-container" style="
      width:60px; height:60px;
      display:flex; align-items:center; justify-content:center;
      transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
      filter: drop-shadow(0 12px 28px rgba(0,0,0,0.5));
    ">
      <div id="car-marker-rotate" style="transition: transform 0.5s ease-out;">
        <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="50" cy="50" rx="30" ry="45" fill="rgba(0,0,0,0.3)" filter="blur(10px)"/>
          <rect x="32" y="18" width="36" height="64" rx="14" fill="#1a1a1a"/>
          <rect x="34" y="20" width="32" height="60" rx="12" fill="#000"/>
          <path d="M36 32 C36 28, 64 28, 64 32 L62 48 C62 52, 38 52, 38 48 Z" fill="#222"/>
          <rect x="37" y="58" width="26" height="12" rx="3" fill="#111"/>
          <rect x="35" y="22" width="6" height="2" rx="1" fill="#fff" opacity="0.8"/>
          <rect x="59" y="22" width="6" height="2" rx="1" fill="#fff" opacity="0.8"/>
          <rect x="36" y="78" width="6" height="2" rx="1" fill="#ff4d4d" opacity="0.9"/>
          <rect x="58" y="78" width="6" height="2" rx="1" fill="#ff4d4d" opacity="0.9"/>
          <rect x="42" y="38" width="16" height="25" rx="4" stroke="#333" stroke-width="1.5" fill="none"/>
        </svg>
      </div>
    </div>`,
  className: "",
  iconSize: [60, 60],
  iconAnchor: [30, 30],
});

const pickupIcon = new L.DivIcon({
  html: `
    <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 8px 16px rgba(0,0,0,0.4))">
      <div style="background:#fff;color:#000;padding:6px 14px;border-radius:12px;font-size:11px;font-weight:900;letter-spacing:0.08em;text-transform:uppercase;white-space:nowrap;font-family:system-ui;border:2px solid #000;box-shadow:0 4px 0 #000">
        PICKUP
      </div>
      <div style="width:3px;height:12px;background:#000;margin-top:-2px"></div>
      <div style="width:12px;height:12px;background:#000;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 2px #000"></div>
    </div>`,
  className: "",
  iconSize: [100, 60],
  iconAnchor: [50, 60],
});

const dropIcon = new L.DivIcon({
  html: `
    <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 8px 16px rgba(0,0,0,0.4))">
      <div style="background:#000;color:#fff;padding:6px 14px;border-radius:12px;font-size:11px;font-weight:900;letter-spacing:0.08em;text-transform:uppercase;white-space:nowrap;font-family:system-ui;border:2px solid #fff;box-shadow:0 4px 0 rgba(255,255,255,0.2)">
        DROP
      </div>
      <div style="width:3px;height:12px;background:#fff;margin-top:-2px"></div>
      <div style="width:12px;height:12px;background:#fff;border-radius:50%;border:3px solid #000;box-shadow:0 0 0 2px #fff"></div>
    </div>`,
  className: "",
  iconSize: [100, 60],
  iconAnchor: [50, 60],
});

/* ─── AUTO FOLLOW ─────────────────────────────────────────────────── */

function AutoFollow({ pos, active }: { pos: [number, number] | null; active: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (pos && active) {
      const leafletPos = toLatLon(pos);
      const z = map.getZoom() < 16 ? 16 : map.getZoom();
      map.flyTo(leafletPos, z, { duration: 1.2, easeLinearity: 0.1 });
    }
  }, [pos, map, active]);
  return null;
}

/* ─── MAIN ────────────────────────────────────────────────────────── */

export default function LiveRideMap({
  driverLocation,
  pickupLocation,
  dropLocation,
  status,
  onStats,
}: Props) {
  const [routePD, setRoutePD] = useState<[number, number][]>([]); // Pickup to Drop
  const [routeDP, setRouteDP] = useState<[number, number][]>([]); // Driver to Pickup
  const [routeDD, setRouteDD] = useState<[number, number][]>([]); // Driver to Drop

  const prevLocation = useRef<[number, number] | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const rotateCar = (from: [number, number], to: [number, number]) => {
    const deltaLat = to[0] - from[0];
    const deltaLon = to[1] - from[1];
    if (Math.abs(deltaLat) < 0.00001 && Math.abs(deltaLon) < 0.00001) return;

    const angleRad = Math.atan2(deltaLat, deltaLon);
    const angleDeg = (angleRad * 180) / Math.PI;
    const rotation = 90 - angleDeg;

    const el = document.getElementById("car-marker-rotate");
    if (el) el.style.transform = `rotate(${rotation}deg)`;
  };

  // 1. Fetch BASIC route (Pickup -> Drop) once
  useEffect(() => {
    const base = "https://router.project-osrm.org/route/v1/driving/";
    const qs   = "?overview=full&geometries=geojson";
    const pStr = toLonLatStr(pickupLocation);
    const dStr = toLonLatStr(dropLocation);

    fetch(`${base}${pStr};${dStr}${qs}`)
      .then(r => r.json())
      .then(data => {
        if (data.routes?.length) {
          setRoutePD(data.routes[0].geometry.coordinates.map(([lon, lat]: any) => [lat, lon]));
        }
      });
  }, [pickupLocation, dropLocation]);

  // 2. Fetch DRIVER routes (Driver -> Pickup, Driver -> Drop)
  useEffect(() => {
    if (!driverLocation) return;

    const base = "https://router.project-osrm.org/route/v1/driving/";
    const qs   = "?overview=full&geometries=geojson";
    const drStr = toLonLatStr(driverLocation);
    const pStr  = toLonLatStr(pickupLocation);
    const dStr  = toLonLatStr(dropLocation);

    Promise.all([
      fetch(`${base}${drStr};${pStr}${qs}`).then(r => r.json()),
      fetch(`${base}${drStr};${dStr}${qs}`).then(r => r.json()),
    ]).then(([pData, dData]) => {
      if (pData.routes?.length) {
        setRouteDP(pData.routes[0].geometry.coordinates.map(([lon, lat]: any) => [lat, lon]));
      }
      if (dData.routes?.length) {
        setRouteDD(dData.routes[0].geometry.coordinates.map(([lon, lat]: any) => [lat, lon]));
      }

      onStats?.({
        distanceToPickup: (pData.routes?.[0]?.distance ?? 0) / 1000,
        durationToPickup: (pData.routes?.[0]?.duration ?? 0) / 60,
        distanceToDrop:   (dData.routes?.[0]?.distance ?? 0) / 1000,
        durationToDrop:   (dData.routes?.[0]?.duration ?? 0) / 60,
      });
    });

    if (prevLocation.current) rotateCar(prevLocation.current, driverLocation);
    prevLocation.current = driverLocation;
  }, [driverLocation, pickupLocation, dropLocation]);

  return (
    <div className="relative w-full h-full bg-white">
      <MapContainer
        center={toLatLon(pickupLocation)}
        zoom={15}
        style={{ height: "100%", width: "100%", background: "#f8f8f8" }}
        scrollWheelZoom
        zoomControl={false}
        whenReady={() => setMapLoaded(true)}
      >
        <TileLayer
          attribution="&copy; <a href='https://carto.com/'>CARTO</a>"
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        <AutoFollow pos={driverLocation || pickupLocation} active={mapLoaded} />

        {/* Driver */}
        {driverLocation && (
          <Marker position={toLatLon(driverLocation)} icon={driverIcon} zIndexOffset={1000}>
            <Tooltip permanent={false} direction="top" offset={[0, -35]} className="custom-tooltip">
              <div className="flex items-center gap-2 px-2 py-1 bg-white text-black border border-zinc-200 rounded-md text-[9px] font-black tracking-widest uppercase shadow-sm">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Driver
              </div>
            </Tooltip>
          </Marker>
        )}

        <Marker position={toLatLon(pickupLocation)} icon={pickupIcon} />
        <Marker position={toLatLon(dropLocation)} icon={dropIcon} />

        {/* Path: Driver -> Pickup (Dashed, only if arriving) */}
        {status === "arriving" && routeDP.length > 0 && (
          <Polyline
            positions={routeDP}
            pathOptions={{ color: "#000", weight: 3, dashArray: "1 12", opacity: 0.6, lineCap: "round" }}
          />
        )}

        {/* Path: Pickup -> Drop (Main Route, always show) */}
        {routePD.length > 0 && (
          <>
            <Polyline
              positions={routePD}
              pathOptions={{ color: "#000", weight: 8, opacity: 0.05, lineCap: "round" }}
            />
            <Polyline
              positions={routePD}
              pathOptions={{ color: "#000", weight: 3, opacity: 0.8, lineCap: "round" }}
            />
          </>
        )}

        {/* Path: Driver -> Drop (Active Glow, if ongoing) */}
        {status === "ongoing" && routeDD.length > 0 && (
          <Polyline
            positions={routeDD}
            pathOptions={{ color: "#000", weight: 4, opacity: 1, lineCap: "round", lineJoin: "round" }}
          />
        )}
      </MapContainer>

      <style jsx global>{`
        .custom-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .leaflet-container {
          filter: contrast(1.05);
        }
      `}</style>
    </div>
  );
}