"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import useSWR from "swr";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { Car, Bike, Truck, Navigation, Save, X, Activity, AlertTriangle, Crosshair } from "lucide-react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Driver {
  _id: string;
  name: string;
  location?: { coordinates: [number, number] };
  vehicleType: string;
}

interface ActiveRide {
  _id: string;
  status: string;
  pickupLocation: { coordinates: [number, number] };
  dropLocation: { coordinates: [number, number] };
  driver: string;
  sosTriggered?: boolean;
  sosTriggeredAt?: string;
}

interface SurgeZone {
  _id: string;
  name: string;
  multiplier: number;
  area: any;
}

export default function AdminLiveMap() {
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<any>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const [sosBlink, setSosBlink] = useState(false);

  // Poll live data every 5 seconds
  const { data: liveDataRes } = useSWR("/api/admin/map/live-data", fetcher, {
    refreshInterval: 5000,
  });

  // Poll heatmap data every 60 seconds
  const { data: heatmapDataRes } = useSWR("/api/admin/map/heatmap", fetcher, {
    refreshInterval: 60000,
  });

  const [activeFeature, setActiveFeature] = useState<any>(null);
  const [zoneName, setZoneName] = useState("");
  const [zoneMultiplier, setZoneMultiplier] = useState(1.5);

  const drivers: Driver[] = liveDataRes?.data?.drivers || [];
  const activeRides: ActiveRide[] = liveDataRes?.data?.activeRides || [];
  const surgeZones: SurgeZone[] = liveDataRes?.data?.surgeZones || [];
  const searchLogs = heatmapDataRes?.data || [];

  // Detect SOS emergencies
  const sosRides = activeRides.filter((r) => r.sosTriggered === true);
  const hasSos = sosRides.length > 0;

  // Blink effect for SOS
  useEffect(() => {
    if (!hasSos) return;
    const interval = setInterval(() => setSosBlink((v) => !v), 700);
    return () => clearInterval(interval);
  }, [hasSos]);

  const handleMapLoad = useCallback((e: any) => {
    setMapLoaded(true);
    mapRef.current = e.target;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
      defaultMode: "draw_polygon",
    });

    e.target.addControl(draw, "top-right");
    drawRef.current = draw;

    e.target.on("draw.create", (e: any) => {
      if (e.features.length > 0) setActiveFeature(e.features[0]);
    });
    e.target.on("draw.update", (e: any) => {
      if (e.features.length > 0) setActiveFeature(e.features[0]);
    });
    e.target.on("draw.delete", () => setActiveFeature(null));
  }, []);

  const zoomToDriver = (driverId: string) => {
    const driver = drivers.find((d) => d._id === driverId);
    if (!driver?.location || !mapRef.current) return;
    const [lng, lat] = driver.location.coordinates;
    mapRef.current.flyTo({ center: [lng, lat], zoom: 16, pitch: 45, duration: 1500 });
  };

  const saveSurgeZone = async () => {
    if (!activeFeature) return;
    try {
      const res = await fetch("/api/admin/surge-zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: zoneName || "New Surge Zone",
          multiplier: zoneMultiplier,
          area: activeFeature.geometry,
        }),
      });
      if (res.ok) {
        alert("Surge zone created!");
        setActiveFeature(null);
        setZoneName("");
        if (drawRef.current) drawRef.current.deleteAll();
      } else {
        alert("Failed to create zone");
      }
    } catch {
      alert("Error creating zone");
    }
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case "bike": return <Bike size={18} />;
      case "truck":
      case "loading": return <Truck size={18} />;
      default: return <Car size={18} />;
    }
  };

  // Heatmap GeoJSON
  const heatmapGeoJSON = {
    type: "FeatureCollection",
    features: searchLogs.map((log: any) => ({
      type: "Feature",
      properties: { weight: 1 },
      geometry: { type: "Point", coordinates: log.location.coordinates },
    })),
  };

  // Surge zones GeoJSON
  const surgeGeoJSON = {
    type: "FeatureCollection",
    features: surgeZones.map((zone: SurgeZone) => ({
      type: "Feature",
      properties: { name: zone.name, multiplier: zone.multiplier },
      geometry: zone.area,
    })),
  };

  // Normal ride lines (blue)
  const normalRideLinesGeoJSON = {
    type: "FeatureCollection",
    features: activeRides
      .filter((ride) => !ride.sosTriggered)
      .map((ride) => {
        const driver = drivers.find((d) => d._id === ride.driver);
        if (!driver?.location) return null;
        const target =
          ride.status === "arriving"
            ? ride.pickupLocation.coordinates
            : ride.dropLocation.coordinates;
        return {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [driver.location.coordinates, target],
          },
        };
      })
      .filter(Boolean),
  };

  // SOS ride lines (red)
  const sosRideLinesGeoJSON = {
    type: "FeatureCollection",
    features: sosRides
      .map((ride) => {
        const driver = drivers.find((d) => d._id === ride.driver);
        if (!driver?.location) return null;
        const target =
          ride.status === "arriving"
            ? ride.pickupLocation.coordinates
            : ride.dropLocation.coordinates;
        return {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [driver.location.coordinates, target],
          },
        };
      })
      .filter(Boolean),
  };

  if (!MAPBOX_TOKEN) return <div>Mapbox token missing</div>;

  return (
    <div className="relative w-full h-[600px] rounded-3xl overflow-hidden shadow-2xl border border-white/10 group">
      {/* ── SOS ALERT BANNER ── */}
      {hasSos && (
        <div
          className="absolute top-0 left-0 right-0 z-50 transition-opacity"
          style={{ opacity: sosBlink ? 1 : 0.6 }}
        >
          <div className="bg-red-600 px-5 py-3 flex items-center justify-between gap-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <AlertTriangle
                size={18}
                className="text-white shrink-0 animate-bounce"
              />
              <p className="text-white text-sm font-black tracking-wide">
                🚨 SOS PANIC ALERT ACTIVE —{" "}
                {sosRides.length === 1
                  ? `Ride #${String(sosRides[0]._id).slice(-6).toUpperCase()} has triggered an emergency!`
                  : `${sosRides.length} active emergencies detected!`}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              {sosRides.map((r) => (
                <button
                  key={r._id}
                  onClick={() => zoomToDriver(r.driver)}
                  className="flex items-center gap-1.5 bg-white text-red-600 px-3 py-1.5 rounded-lg text-xs font-black hover:bg-red-50 transition-colors"
                >
                  <Crosshair size={12} />
                  Zoom #{String(r._id).slice(-4).toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <Map
        initialViewState={{
          longitude: 78.9629,
          latitude: 20.5937,
          zoom: 4,
          pitch: 45,
        }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        onLoad={handleMapLoad}
      >
        {mapLoaded && (
          <>
            {/* Heatmap Layer */}
            <Source id="heatmap-data" type="geojson" data={heatmapGeoJSON as any}>
              <Layer
                id="search-heatmap"
                type="heatmap"
                paint={{
                  "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 0, 0, 1, 1],
                  "heatmap-intensity": 1,
                  "heatmap-color": [
                    "interpolate", ["linear"], ["heatmap-density"],
                    0, "rgba(33,102,172,0)",
                    0.2, "rgb(103,169,207)",
                    0.4, "rgb(209,229,240)",
                    0.6, "rgb(253,219,199)",
                    0.8, "rgb(239,138,98)",
                    1, "rgb(178,24,43)",
                  ],
                  "heatmap-radius": 30,
                  "heatmap-opacity": 0.6,
                }}
              />
            </Source>

            {/* Surge Zones Polygons */}
            <Source id="surge-zones-data" type="geojson" data={surgeGeoJSON as any}>
              <Layer
                id="surge-zones-fill"
                type="fill"
                paint={{ "fill-color": "#f87171", "fill-opacity": 0.2 }}
              />
              <Layer
                id="surge-zones-line"
                type="line"
                paint={{ "line-color": "#ef4444", "line-width": 2, "line-dasharray": [2, 2] }}
              />
            </Source>

            {/* Normal Active Ride Lines (blue) */}
            <Source id="normal-rides-lines" type="geojson" data={normalRideLinesGeoJSON as any}>
              <Layer
                id="normal-rides-path"
                type="line"
                paint={{ "line-color": "#3b82f6", "line-width": 3, "line-opacity": 0.7 }}
              />
            </Source>

            {/* SOS Emergency Ride Lines (red, dashed) */}
            <Source id="sos-rides-lines" type="geojson" data={sosRideLinesGeoJSON as any}>
              <Layer
                id="sos-rides-path"
                type="line"
                paint={{
                  "line-color": "#ef4444",
                  "line-width": 4,
                  "line-opacity": sosBlink ? 1 : 0.5,
                  "line-dasharray": [3, 2],
                }}
              />
            </Source>

            {/* Online Drivers Markers */}
            {drivers.map((driver, index) => {
              const location = driver.location;
              if (!location) return null;

              const [origLng, origLat] = location.coordinates;
              const hasOverlap = drivers.some(
                (d, idx) =>
                  idx !== index &&
                  d.location &&
                  d.location.coordinates[0] === origLng &&
                  d.location.coordinates[1] === origLat
              );
              const offsetAngle = (index * 2 * Math.PI) / (drivers.length || 1);
              const jitter = 0.00015;
              const lng = origLng + (hasOverlap ? Math.cos(offsetAngle) * jitter : 0);
              const lat = origLat + (hasOverlap ? Math.sin(offsetAngle) * jitter : 0);

              const isOnRide = activeRides.some((r) => r.driver === driver._id);
              const isSosRide = sosRides.some((r) => r.driver === driver._id);

              return (
                <Marker key={driver._id} longitude={lng} latitude={lat} anchor="center">
                  <div
                    className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 bg-black text-white shadow-lg transition-transform hover:scale-110 cursor-pointer ${
                      isSosRide
                        ? "border-red-500 shadow-red-500/60"
                        : isOnRide
                        ? "border-blue-500 shadow-blue-500/50"
                        : "border-gray-500"
                    }`}
                    onClick={() => {
                      if (mapRef.current) {
                        mapRef.current.flyTo({ center: [lng, lat], zoom: 16, pitch: 45, duration: 1200 });
                      }
                    }}
                  >
                    {isSosRide && (
                      <span className="absolute -inset-1.5 animate-ping rounded-full bg-red-500 opacity-40" />
                    )}
                    {isOnRide && !isSosRide && (
                      <span className="absolute -inset-1 animate-ping rounded-full bg-blue-400 opacity-20" />
                    )}
                    {getVehicleIcon(driver.vehicleType)}
                    {isSosRide && (
                      <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center leading-none">
                        SOS
                      </span>
                    )}
                  </div>
                </Marker>
              );
            })}
          </>
        )}
      </Map>

      {/* Surge Zone Creation UI */}
      {activeFeature && (
        <div className="absolute top-4 left-4 bg-white p-4 rounded-xl shadow-2xl w-72 z-10 animate-in slide-in-from-left">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Activity size={16} className="text-red-500" />
              New Surge Zone
            </h3>
            <button
              onClick={() => { setActiveFeature(null); drawRef.current?.deleteAll(); }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Zone Name</label>
              <input
                type="text"
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                placeholder="e.g. Downtown Peak"
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-gray-50 text-black"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">
                Multiplier ({zoneMultiplier}x)
              </label>
              <input
                type="range"
                min="1.1"
                max="3.0"
                step="0.1"
                value={zoneMultiplier}
                onChange={(e) => setZoneMultiplier(parseFloat(e.target.value))}
                className="w-full mt-1 accent-black"
              />
            </div>
            <button
              onClick={saveSurgeZone}
              className="w-full bg-black text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition"
            >
              <Save size={16} /> Save Zone
            </button>
          </div>
        </div>
      )}

      {/* SOS Emergency Sidebar Panel */}
      {hasSos && (
        <div className="absolute top-16 right-4 z-40 flex flex-col gap-2 max-w-[220px]">
          {sosRides.map((ride) => {
            const driver = drivers.find((d) => d._id === ride.driver);
            return (
              <div
                key={ride._id}
                className="bg-red-900/90 backdrop-blur-md border border-red-500/60 rounded-xl p-3 shadow-2xl"
              >
                <p className="text-red-300 text-[9px] uppercase tracking-widest font-bold mb-1">
                  🚨 Emergency
                </p>
                <p className="text-white text-xs font-bold truncate mb-0.5">
                  {driver?.name || "Unknown Driver"}
                </p>
                <p className="text-red-300 text-[10px] mb-2">
                  Ride #{String(ride._id).slice(-6).toUpperCase()}
                </p>
                <button
                  onClick={() => zoomToDriver(ride.driver)}
                  className="w-full flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-400 text-white px-3 py-1.5 rounded-lg text-[10px] font-black transition-colors"
                >
                  <Navigation size={10} /> Go to Location
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-md p-3 rounded-xl border border-white/20 text-xs text-white/80 space-y-2 pointer-events-none">
        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" /> Active Ride</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-gray-500 rounded-full" /> Available Driver</div>
        <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-red-500" /> Surge Zone</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" /> SOS Emergency</div>
      </div>
    </div>
  );
}
