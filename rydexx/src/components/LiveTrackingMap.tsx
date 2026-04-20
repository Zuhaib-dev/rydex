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

/** Converts [lng, lat] (DB format) to [lat, lng] (Leaflet format) */
const toLatLon = (coord: [number, number]): [number, number] => [coord[1], coord[0]];

/** Converts [lng, lat] (DB format) to "lng,lat" (OSRM string format) */
const toLonLatStr = (coord: [number, number]): string => `${coord[0]},${coord[1]}`;

/* ─── ICONS ────────────────────────────────────────────────────────── */

const driverIcon = new L.DivIcon({
  html: `
    <div id="car-marker" style="
      width:56px; height:56px;
      display:flex; align-items:center; justify-content:center;
      transition: transform 0.4s cubic-bezier(0.23, 1, 0.32, 1);
      filter: drop-shadow(0 8px 24px rgba(0,0,0,0.35));
    ">
      <svg width="42" height="42" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Sleek Top-view Car Body -->
        <rect x="30" y="20" width="40" height="60" rx="12" fill="#000"/>
        <rect x="32" y="25" width="36" height="15" rx="4" fill="#333"/> <!-- Windshield -->
        <rect x="32" y="55" width="36" height="10" rx="2" fill="#222"/> <!-- Rear window -->
        <!-- Roof detail -->
        <rect x="35" y="32" width="30" height="28" rx="6" fill="#111"/>
        <!-- Headlights -->
        <rect x="34" y="18" width="8" height="4" rx="1" fill="#fff" opacity="0.9"/>
        <rect x="58" y="18" width="8" height="4" rx="1" fill="#fff" opacity="0.9"/>
        <!-- Tail lights -->
        <rect x="34" y="78" width="8" height="3" rx="1" fill="#ff2d2d" opacity="0.8"/>
        <rect x="58" y="78" width="8" height="3" rx="1" fill="#ff2d2d" opacity="0.8"/>
      </svg>
    </div>`,
  className: "",
  iconSize: [56, 56],
  iconAnchor: [28, 28],
});

const pickupIcon = new L.DivIcon({
  html: `
    <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.28))">
      <div style="background:#0a0a0a;color:#fff;padding:5px 13px;border-radius:100px;font-size:10px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;white-space:nowrap;font-family:system-ui">
        PICKUP
      </div>
      <div style="width:2px;height:9px;background:#0a0a0a"></div>
      <div style="width:10px;height:10px;background:#0a0a0a;border-radius:50%;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>
    </div>`,
  className: "",
  iconSize: [80, 50],
  iconAnchor: [40, 50],
});

const dropIcon = new L.DivIcon({
  html: `
    <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.25))">
      <div style="background:#fff;color:#0a0a0a;padding:5px 13px;border-radius:100px;font-size:10px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;white-space:nowrap;border:1.5px solid #0a0a0a;font-family:system-ui">
        DROP
      </div>
      <div style="width:2px;height:9px;background:#0a0a0a"></div>
      <div style="width:10px;height:10px;background:#fff;border-radius:50%;border:2.5px solid #0a0a0a;box-shadow:0 2px 6px rgba(0,0,0,0.25)"></div>
    </div>`,
  className: "",
  iconSize: [70, 50],
  iconAnchor: [35, 50],
});

/* ─── AUTO FOLLOW ─────────────────────────────────────────────────── */

function AutoFollow({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (pos) {
      const leafletPos = toLatLon(pos);
      const z = map.getZoom() < 15 ? 15 : map.getZoom();
      map.flyTo(leafletPos, z, { duration: 0.7, easeLinearity: 0.25 });
    }
  }, [pos, map]);
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
  const [routeToPickup, setRouteToPickup] = useState<[number, number][]>([]);
  const [routeToDrop,   setRouteToDrop]   = useState<[number, number][]>([]);
  const prevLocation = useRef<[number, number] | null>(null);
  const prevStatus   = useRef<string | null>(null);

  /*
   * Status-based display logic
   */
  const showPickupMarker = status === "arriving";
  const showPickupRoute  = status === "arriving" && routeToPickup.length > 0;
  const showDropRoute    = status !== "completed" && routeToDrop.length > 0;

  const rotateCar = (from: [number, number], to: [number, number]) => {
    // Math.atan2(deltaLat, deltaLon) returns radians from East
    // Leaflet rotate(deg) is clockwise from North (0 is North)
    const deltaLat = to[1] - from[1];
    const deltaLon = to[0] - from[0];
    const angleRad = Math.atan2(deltaLat, deltaLon);
    const angleDeg = (angleRad * 180) / Math.PI;

    // Convert from "radians from East" to "degrees from North" (clockwise)
    // 90 is East, 180 is South, 270 is West, 0/360 is North
    // atan2(0, 1) is 0deg (East) -> should be 90deg rotation
    // atan2(1, 0) is 90deg (North) -> should be 0deg rotation
    const rotation = 90 - angleDeg;

    const el = document.getElementById("car-marker");
    if (el) el.style.transform = `rotate(${rotation}deg)`;
  };

  useEffect(() => {
    if (!driverLocation) return;

    const base = "https://router.project-osrm.org/route/v1/driving/";
    const qs   = "?overview=full&geometries=geojson";
    
    const dStr = toLonLatStr(driverLocation);
    const pStr = toLonLatStr(pickupLocation);
    const drStr = toLonLatStr(dropLocation);

    const statusChanged = prevStatus.current !== status;
    prevStatus.current  = status;

    if (status === "arriving") {
      Promise.all([
        fetch(`${base}${dStr};${pStr}${qs}`).then(r => r.json()),
        fetch(`${base}${dStr};${drStr}${qs}`).then(r => r.json()),
      ]).then(([pData, dData]) => {
        if (pData.routes?.length)
          setRouteToPickup(
            pData.routes[0].geometry.coordinates.map(([lon, lat]: number[]) => [lat, lon])
          );
        if (dData.routes?.length)
          setRouteToDrop(
            dData.routes[0].geometry.coordinates.map(([lon, lat]: number[]) => [lat, lon])
          );
        onStats?.({
          distanceToPickup: (pData.routes?.[0]?.distance ?? 0) / 1000,
          durationToPickup: (pData.routes?.[0]?.duration ?? 0) / 60,
          distanceToDrop:   (dData.routes?.[0]?.distance ?? 0) / 1000,
          durationToDrop:   (dData.routes?.[0]?.duration ?? 0) / 60,
        });
      });

    } else {
      if (statusChanged) setRouteToPickup([]);

      fetch(`${base}${dStr};${drStr}${qs}`)
        .then(r => r.json())
        .then(dData => {
          if (dData.routes?.length)
            setRouteToDrop(
              dData.routes[0].geometry.coordinates.map(([lon, lat]: number[]) => [lat, lon])
            );
          onStats?.({
            distanceToPickup: 0,
            durationToPickup: 0,
            distanceToDrop:   (dData.routes?.[0]?.distance ?? 0) / 1000,
            durationToDrop:   (dData.routes?.[0]?.duration ?? 0) / 60,
          });
        });
    }

    if (prevLocation.current) rotateCar(prevLocation.current, driverLocation);
    prevLocation.current = driverLocation;
  }, [driverLocation, status]);

  return (
    <MapContainer
      center={toLatLon(pickupLocation)}
      zoom={14}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
      zoomControl={false}
    >
      <TileLayer
        attribution="© OpenStreetMap contributors © CARTO"
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />

      <AutoFollow pos={driverLocation} />

      {/* Driver */}
      {driverLocation && (
        <Marker position={toLatLon(driverLocation)} icon={driverIcon}>
          <Tooltip permanent={false} direction="top" offset={[0, -32]}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", fontFamily: "system-ui" }}>
              YOUR DRIVER
            </span>
          </Tooltip>
        </Marker>
      )}

      {/* Pickup marker */}
      {showPickupMarker && (
        <Marker position={toLatLon(pickupLocation)} icon={pickupIcon} />
      )}

      {/* Drop marker */}
      <Marker position={toLatLon(dropLocation)} icon={dropIcon} />

      {/* Dashed line → pickup */}
      {showPickupRoute && (
        <Polyline
          positions={routeToPickup}
          pathOptions={{ color: "#888", weight: 4, dashArray: "2 10", lineCap: "round" }}
        />
      )}

      {/* Solid line → drop */}
      {showDropRoute && (
        <Polyline
          positions={routeToDrop}
          pathOptions={{ color: "#000", weight: 5, lineCap: "round", lineJoin: "round" }}
        />
      )}
    </MapContainer>
  );
}