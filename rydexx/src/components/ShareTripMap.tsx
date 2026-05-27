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
  status: string;
  sosActive?: boolean;
  vehicleType?: string;
};

/* ── Auto-follow driver ─────────────────────────────────────────────── */
function AutoFollow({ pos }: { pos: [number, number] | null }) {
  const { current: map } = useMap();
  useEffect(() => {
    if (pos && map) {
      const z = map.getZoom() < 14 ? 15 : map.getZoom();
      map.flyTo({ center: [pos[1], pos[0]], zoom: z, pitch: 55, duration: 2000, essential: true });
    }
  }, [pos, map]);
  return null;
}

/* ── Smooth spring location ─────────────────────────────────────────── */
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
    const u1 = latSpring.on("change", (v) => setCurrent((p) => (p ? [v, p[1]] : [v, 0])));
    const u2 = lngSpring.on("change", (v) => setCurrent((p) => (p ? [p[0], v] : [0, v])));
    return () => { u1(); u2(); };
  }, [latSpring, lngSpring]);

  return current;
}

/* ── Main ───────────────────────────────────────────────────────────── */
export default function ShareTripMap({
  driverLocation,
  pickupLocation,
  dropLocation,
  status,
  sosActive = false,
  vehicleType = "car",
}: Props) {
  const [routePD, setRoutePD] = useState<any>(null);
  const [routeDD, setRouteDD] = useState<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const smoothDriver = useSmoothLocation(driverLocation);

  const toLonLat = (c: [number, number]) => `${c[1]},${c[0]}`;

  // Pickup → Drop route (always shown)
  useEffect(() => {
    if (!MAPBOX_TOKEN) return;
    fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${toLonLat(pickupLocation)};${toLonLat(dropLocation)}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.routes?.length) {
          setRoutePD({ type: "Feature", properties: {}, geometry: d.routes[0].geometry });
        }
      })
      .catch(() => {});
  }, [pickupLocation, dropLocation]);

  // Driver → destination route (live-updating)
  useEffect(() => {
    if (!driverLocation || !MAPBOX_TOKEN) return;
    const dest =
      status === "arriving" || status === "confirmed" ? pickupLocation : dropLocation;
    fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${toLonLat(driverLocation)};${toLonLat(dest)}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.routes?.length) {
          setRouteDD({ type: "Feature", properties: {}, geometry: d.routes[0].geometry });
        }
      })
      .catch(() => {});
  }, [driverLocation, pickupLocation, dropLocation, status]);

  const isOngoing = status === "started";
  const isArriving = ["arriving", "confirmed", "arrived"].includes(status);

  return (
    <div className="relative w-full h-full">
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: pickupLocation[1],
          latitude: pickupLocation[0],
          zoom: 14,
          pitch: 55,
          bearing: -15,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        onLoad={() => setMapLoaded(true)}
      >
        {mapLoaded && (
          <>
            <AutoFollow pos={driverLocation} />

            {/* Background route (pickup → drop) */}
            {routePD && (
              <Source type="geojson" data={routePD}>
                <Layer
                  id="route-bg"
                  type="line"
                  layout={{ "line-join": "round", "line-cap": "round" }}
                  paint={{ "line-color": "#d1d5db", "line-width": 6, "line-opacity": 0.5 }}
                />
              </Source>
            )}

            {/* Active driver route */}
            {routeDD && (
              <Source type="geojson" data={routeDD}>
                <Layer
                  id="route-driver"
                  type="line"
                  layout={{ "line-join": "round", "line-cap": "round" }}
                  paint={{
                    "line-color": sosActive ? "#ef4444" : isOngoing ? "#10b981" : "#2563eb",
                    "line-width": 4.5,
                    "line-opacity": 0.9,
                  }}
                />
              </Source>
            )}

            {/* Pickup marker */}
            <Marker longitude={pickupLocation[1]} latitude={pickupLocation[0]} anchor="bottom">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", filter: "drop-shadow(0 8px 12px rgba(0,0,0,0.3))" }}>
                <div style={{ background: "#fff", color: "#000", padding: "5px 12px", borderRadius: "10px", fontSize: "11px", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", border: "2px solid #000", boxShadow: "0 4px 0 #000", whiteSpace: "nowrap", fontFamily: "system-ui" }}>
                  PICKUP
                </div>
                <div style={{ width: "3px", height: "12px", background: "#000" }} />
                <div style={{ width: "12px", height: "12px", background: "#000", borderRadius: "50%", border: "2px solid #fff", boxShadow: "0 0 0 2px #000" }} />
              </div>
            </Marker>

            {/* Drop marker */}
            <Marker longitude={dropLocation[1]} latitude={dropLocation[0]} anchor="bottom">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", filter: "drop-shadow(0 8px 12px rgba(0,0,0,0.3))" }}>
                <div style={{ background: "#000", color: "#fff", padding: "5px 12px", borderRadius: "10px", fontSize: "11px", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", border: "2px solid #fff", boxShadow: "0 4px 0 rgba(255,255,255,0.25)", whiteSpace: "nowrap", fontFamily: "system-ui" }}>
                  DROP
                </div>
                <div style={{ width: "3px", height: "12px", background: "#fff" }} />
                <div style={{ width: "12px", height: "12px", background: "#10b981", borderRadius: "50%", border: "2px solid #000", boxShadow: "0 0 0 2px #10b981" }} />
              </div>
            </Marker>

            {/* Driver marker */}
            {smoothDriver && (
              <Marker longitude={smoothDriver[1]} latitude={smoothDriver[0]} anchor="center" style={{ zIndex: 1000 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.5))" }}>
                  {/* SOS ring */}
                  {sosActive && (
                    <span
                      style={{
                        position: "absolute",
                        inset: "-10px",
                        borderRadius: "50%",
                        background: "#ef4444",
                        opacity: 0.35,
                        animation: "ping 1s cubic-bezier(0,0,0.2,1) infinite",
                      }}
                    />
                  )}
                  <div
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "50%",
                      background: sosActive ? "#ef4444" : "#000",
                      border: `3px solid ${sosActive ? "#fca5a5" : "#fff"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: `0 8px 24px ${sosActive ? "rgba(239,68,68,0.6)" : "rgba(0,0,0,0.4)"}`,
                      position: "relative",
                    }}
                  >
                    {/* Simple car SVG */}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 17H3V12L5 7H19L21 12V17H19" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M3 12H21" stroke="white" strokeWidth="1.5"/>
                      <circle cx="7.5" cy="17.5" r="1.5" fill="white"/>
                      <circle cx="16.5" cy="17.5" r="1.5" fill="white"/>
                    </svg>
                  </div>
                  {/* Live badge */}
                  <div
                    style={{
                      position: "absolute",
                      top: "-32px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: sosActive ? "#ef4444" : "white",
                      color: sosActive ? "white" : "#000",
                      fontSize: "10px",
                      fontWeight: 900,
                      padding: "3px 10px",
                      borderRadius: "100px",
                      whiteSpace: "nowrap",
                      border: sosActive ? "1px solid #fca5a5" : "1.5px solid #e5e7eb",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      fontFamily: "system-ui",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {sosActive ? "🚨 SOS" : "● LIVE"}
                  </div>
                </div>
              </Marker>
            )}
          </>
        )}
      </Map>
    </div>
  );
}
