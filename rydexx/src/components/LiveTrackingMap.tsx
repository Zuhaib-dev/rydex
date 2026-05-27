"use client";

import { useEffect, useRef, useState } from "react";
import Map, { Marker, Source, Layer, useMap } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useSpring } from "framer-motion";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

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

const toLonLatStr = (coord: [number, number]): string => `${coord[1]},${coord[0]}`;

/* ─── AUTO FOLLOW ─────────────────────────────────────────────────── */

function AutoFollow({ pos, active }: { pos: [number, number] | null; active: boolean }) {
  const { current: map } = useMap();
  
  useEffect(() => {
    if (pos && active && map) {
      const z = map.getZoom() < 15 ? 15.5 : map.getZoom();
      map.flyTo({ center: [pos[1], pos[0]], zoom: z, pitch: 60, duration: 2000, essential: true });
    }
  }, [pos, map, active]);
  
  return null;
}

/* ─── SMOOTH LOCATION HOOK ────────────────────────────────────────── */
function useSmoothLocation(location: [number, number] | null) {
  const latSpring = useSpring(location?.[0] ?? 0, { stiffness: 60, damping: 20 });
  const lngSpring = useSpring(location?.[1] ?? 0, { stiffness: 60, damping: 20 });

  const [current, setCurrent] = useState<[number, number] | null>(location);
  const isFirst = useRef(true);

  useEffect(() => {
    if (location) {
      if (isFirst.current) {
        latSpring.set(location[0]);
        lngSpring.set(location[1]);
        setCurrent(location);
        isFirst.current = false;
      } else {
        latSpring.set(location[0]);
        lngSpring.set(location[1]);
      }
    }
  }, [location, latSpring, lngSpring]);

  useEffect(() => {
    const unsubLat = latSpring.on("change", (v) => setCurrent((prev) => prev ? [v, prev[1]] : [v, 0]));
    const unsubLng = lngSpring.on("change", (v) => setCurrent((prev) => prev ? [prev[0], v] : [0, v]));
    return () => { unsubLat(); unsubLng(); }
  }, [latSpring, lngSpring]);

  return current;
}


/* ─── MAIN ────────────────────────────────────────────────────────── */

export default function LiveRideMap({
  driverLocation,
  pickupLocation,
  dropLocation,
  status,
  onStats,
}: Props) {
  const [routePD, setRoutePD] = useState<any>(null); // Pickup to Drop
  const [routeDP, setRouteDP] = useState<any>(null); // Driver to Pickup
  const [routeDD, setRouteDD] = useState<any>(null); // Driver to Drop

  const [etaPickup, setEtaPickup] = useState(0);
  const [etaDrop, setEtaDrop] = useState(0);

  const prevLocation = useRef<[number, number] | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Smooth driver location!
  const smoothDriverLocation = useSmoothLocation(driverLocation);

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
    if (!MAPBOX_TOKEN) return;
    const pStr = toLonLatStr(pickupLocation);
    const dStr = toLonLatStr(dropLocation);

    fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${pStr};${dStr}?geometries=geojson&access_token=${MAPBOX_TOKEN}`)
      .then(r => r.json())
      .then(data => {
        if (data.routes?.length) {
          setRoutePD({
            type: "Feature",
            properties: {},
            geometry: data.routes[0].geometry,
          });
        }
      })
      .catch(err => console.warn("Mapbox Route PD failed:", err));
  }, [pickupLocation, dropLocation]);

  // 2. Fetch DRIVER routes (Driver -> Pickup, Driver -> Drop)
  useEffect(() => {
    if (!driverLocation || !MAPBOX_TOKEN) return;

    const drStr = toLonLatStr(driverLocation);
    const pStr  = toLonLatStr(pickupLocation);
    const dStr  = toLonLatStr(dropLocation);

    Promise.all([
      fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${drStr};${pStr}?geometries=geojson&access_token=${MAPBOX_TOKEN}`).then(r => r.json()).catch(() => ({})),
      fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${drStr};${dStr}?geometries=geojson&access_token=${MAPBOX_TOKEN}`).then(r => r.json()).catch(() => ({})),
    ]).then(([pData, dData]) => {
      if (pData?.routes?.length) {
        setRouteDP({
          type: "Feature",
          properties: {},
          geometry: pData.routes[0].geometry,
        });
      }
      if (dData?.routes?.length) {
        setRouteDD({
          type: "Feature",
          properties: {},
          geometry: dData.routes[0].geometry,
        });
      }

      const durP = (pData?.routes?.[0]?.duration ?? 0) / 60;
      const durD = (dData?.routes?.[0]?.duration ?? 0) / 60;
      setEtaPickup(durP);
      setEtaDrop(durD);

      onStats?.({
        distanceToPickup: (pData?.routes?.[0]?.distance ?? 0) / 1000,
        durationToPickup: durP,
        distanceToDrop:   (dData?.routes?.[0]?.distance ?? 0) / 1000,
        durationToDrop:   durD,
      });
    }).catch(err => console.warn("Mapbox Route Driver failed:", err));

    if (prevLocation.current) rotateCar(prevLocation.current, driverLocation);
    prevLocation.current = driverLocation;
  }, [driverLocation, pickupLocation, dropLocation, onStats]);

  const currentEta = status === "arriving" ? etaPickup : etaDrop;

  return (
    <div className="relative w-full h-full bg-[#e8eae9]">
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: pickupLocation[1],
          latitude: pickupLocation[0],
          zoom: 15.5,
          pitch: 65,
          bearing: -20,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/navigation-day-v1"
        terrain={{ source: "mapbox-dem", exaggeration: 1.5 }}
        onLoad={() => setMapLoaded(true)}
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

        <AutoFollow pos={driverLocation || pickupLocation} active={mapLoaded} />

        {/* Path: Driver -> Pickup (Dashed, only if arriving) */}
        {status === "arriving" && routeDP && (
          <Source type="geojson" data={routeDP}>
            <Layer
              id="route-dp"
              type="line"
              layout={{ "line-join": "round", "line-cap": "round" }}
              paint={{
                "line-color": "#2563eb",
                "line-width": 4,
                "line-dasharray": [2, 2],
                "line-opacity": 0.8,
              }}
            />
          </Source>
        )}

        {/* Path: Pickup -> Drop (Main Route - Background Track) */}
        {routePD && status !== "ongoing" && (
          <Source type="geojson" data={routePD}>
            <Layer
              id="route-pd-bg"
              type="line"
              layout={{ "line-join": "round", "line-cap": "round" }}
              paint={{
                "line-color": "#000",
                "line-width": 7,
                "line-opacity": 0.15,
              }}
            />
            <Layer
              id="route-pd-fg"
              type="line"
              layout={{ "line-join": "round", "line-cap": "round" }}
              paint={{
                "line-color": "#000",
                "line-width": 4,
                "line-opacity": 0.8,
              }}
            />
          </Source>
        )}

        {/* Path: Driver -> Drop (Active path during trip) */}
        {status === "ongoing" && routeDD && (
          <Source type="geojson" data={routeDD}>
            <Layer
              id="route-dd-bg"
              type="line"
              layout={{ "line-join": "round", "line-cap": "round" }}
              paint={{
                "line-color": "#10b981",
                "line-width": 7,
                "line-opacity": 0.25,
              }}
            />
            <Layer
              id="route-dd-fg"
              type="line"
              layout={{ "line-join": "round", "line-cap": "round" }}
              paint={{
                "line-color": "#10b981",
                "line-width": 4.5,
                "line-opacity": 1,
              }}
            />
          </Source>
        )}

        {/* Pickup Marker */}
        <Marker longitude={pickupLocation[1]} latitude={pickupLocation[0]} anchor="bottom" pitchAlignment="map">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", filter: "drop-shadow(0 12px 16px rgba(0,0,0,0.5))" }}>
            <div style={{ background: "#fff", color: "#000", padding: "6px 14px", borderRadius: "12px", fontSize: "12px", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap", fontFamily: "system-ui", border: "2px solid #000", boxShadow: "0 6px 0 #000" }}>
              PICKUP
            </div>
            <div style={{ width: "4px", height: "16px", background: "#000", marginTop: "-2px" }}></div>
            <div style={{ width: "14px", height: "14px", background: "#000", borderRadius: "50%", border: "3px solid #fff", boxShadow: "0 0 0 2px #000" }}></div>
          </div>
        </Marker>

        {/* Drop Marker */}
        <Marker longitude={dropLocation[1]} latitude={dropLocation[0]} anchor="bottom" pitchAlignment="map">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", filter: "drop-shadow(0 12px 16px rgba(0,0,0,0.5))" }}>
            <div style={{ background: "#000", color: "#fff", padding: "6px 14px", borderRadius: "12px", fontSize: "12px", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap", fontFamily: "system-ui", border: "2px solid #fff", boxShadow: "0 6px 0 rgba(255,255,255,0.3)" }}>
              DROP
            </div>
            <div style={{ width: "4px", height: "16px", background: "#fff", marginTop: "-2px" }}></div>
            <div style={{ width: "14px", height: "14px", background: "#fff", borderRadius: "50%", border: "3px solid #000", boxShadow: "0 0 0 2px #fff" }}></div>
          </div>
        </Marker>

        {/* Driver Marker - Uses Smooth coordinates */}
        {smoothDriverLocation && (
          <Marker longitude={smoothDriverLocation[1]} latitude={smoothDriverLocation[0]} anchor="center" style={{ zIndex: 1000 }} pitchAlignment="map">
            <div id="car-marker-container" style={{
              width: "60px", height: "60px",
              display: "flex", alignItems: "center", justifyContent: "center",
              filter: "drop-shadow(0 16px 24px rgba(0,0,0,0.4))"
            }}>
              <div id="car-marker-rotate" style={{ transition: "transform 0.4s ease-out" }}>
                <svg width="60" height="60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* shadow */}
                  <ellipse cx="50" cy="50" rx="30" ry="45" fill="rgba(0,0,0,0.4)" filter="blur(8px)"/>
                  <rect x="32" y="18" width="36" height="64" rx="14" fill="#1a1a1a"/>
                  <rect x="34" y="20" width="32" height="60" rx="12" fill="#000"/>
                  <path d="M36 32 C36 28, 64 28, 64 32 L62 48 C62 52, 38 52, 38 48 Z" fill="#222"/>
                  <rect x="37" y="58" width="26" height="12" rx="3" fill="#111"/>
                  <rect x="35" y="22" width="6" height="2" rx="1" fill="#fff" opacity="0.9"/>
                  <rect x="59" y="22" width="6" height="2" fill="#fff" opacity="0.9"/>
                  <rect x="36" y="78" width="6" height="2" fill="#ff4d4d" opacity="0.9"/>
                  <rect x="58" y="78" width="6" height="2" fill="#ff4d4d" opacity="0.9"/>
                  <rect x="42" y="38" width="16" height="25" rx="4" stroke="#333" strokeWidth="1.5" fill="none"/>
                </svg>
              </div>
            </div>
            
            {/* Live ETA Tooltip floating above car */}
            <div style={{
              position: "absolute",
              top: "-42px",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 12px",
              background: "white",
              color: "black",
              borderRadius: "100px",
              fontSize: "12px",
              fontWeight: 900,
              letterSpacing: "0.05em",
              boxShadow: "0 8px 16px rgba(0,0,0,0.15)",
              whiteSpace: "nowrap",
              border: "2px solid #e5e7eb"
            }}>
              <div style={{ width: "8px", height: "8px", background: "#3b82f6", borderRadius: "50%" }} className="animate-pulse" />
              {currentEta > 0 ? `${Math.ceil(currentEta)} MIN AWAY` : "ARRIVING"}
            </div>
          </Marker>
        )}

      </Map>
    </div>
  );
}
