"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { Marker, Source, Layer, useMap } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  bearingDegrees,
  distanceMeters,
  fetchDrivingRoute,
  routeToGeoJSON,
  type LatLng,
} from "@/lib/mapboxRouting";
import { useSmoothCoords } from "@/hooks/useSmoothCoords";
import {
  PickupMarker,
  DropMarker,
  DriverMarker,
} from "@/components/ride/RideMapMarkers";
import { useNavigationSimulator } from "@/hooks/useNavigationSimulator";
import {
  Sparkles,
  X,
  ArrowUpLeft,
  ArrowUpRight,
  ArrowUp,
  CheckCircle2,
  VolumeX,
  Volume2,
  Play,
  Pause,
  RotateCcw,
  Gauge,
  Clock,
} from "lucide-react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const MAP_STYLE = "mapbox://styles/mapbox/navigation-night-v1";

export type RideMapPhase = "arriving" | "ongoing" | "completed" | "searching";

type Props = {
  driverLocation: LatLng | null;
  pickupLocation: LatLng;
  dropLocation: LatLng;
  status: RideMapPhase;
  onStats?: (data: {
    distanceToPickup: number;
    durationToPickup: number;
    distanceToDrop: number;
    durationToDrop: number;
  }) => void;
  onPositionUpdate?: (lat: number, lng: number) => void;
};

function FitRouteBounds({
  points,
  active,
  phase,
}: {
  points: LatLng[];
  active: boolean;
  phase: RideMapPhase;
}) {
  const { current: map } = useMap();
  const fittedRef = useRef<string>("");

  useEffect(() => {
    if (!map || !active || points.length < 2) return;

    const key = `${phase}-${points.map((p) => p.join(",")).join("|")}`;
    if (fittedRef.current === key) return;
    fittedRef.current = key;

    const lngs = points.map((p) => p[1]);
    const lats = points.map((p) => p[0]);

    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      {
        padding: { top: 120, bottom: 200, left: 48, right: 48 },
        pitch: phase === "completed" ? 0 : 52,
        bearing: -18,
        duration: 1400,
        maxZoom: 16,
      },
    );
  }, [map, points, active, phase]);

  return null;
}

function FollowDriver({
  position,
  enabled,
}: {
  position: LatLng | null;
  enabled: boolean;
}) {
  const { current: map } = useMap();
  const lastFlyRef = useRef(0);

  useEffect(() => {
    if (!map || !position || !enabled) return;
    const now = Date.now();
    if (now - lastFlyRef.current < 2200) return;
    lastFlyRef.current = now;

    const zoom = Math.max(map.getZoom(), 15.2);
    map.easeTo({
      center: [position[1], position[0]],
      zoom,
      pitch: 58,
      duration: 1200,
      essential: true,
    });
  }, [map, position?.[0], position?.[1], enabled]);

  return null;
}

export default function LiveRideMap({
  driverLocation,
  pickupLocation,
  dropLocation,
  status,
  onStats,
  onPositionUpdate,
}: Props) {
  const mapRef = useRef<MapRef | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [routePD, setRoutePD] = useState<GeoJSON.Feature | null>(null);
  const [routeActive, setRouteActive] = useState<GeoJSON.Feature | null>(null);
  const [etaPickup, setEtaPickup] = useState(0);
  const [etaDrop, setEtaDrop] = useState(0);
  const [bearing, setBearing] = useState(0);
  const [showSimControls, setShowSimControls] = useState(false);

  const smoothDriver = useSmoothCoords(driverLocation, 1000);
  const prevDriverRef = useRef<LatLng | null>(null);
  const routeAbortRef = useRef<AbortController | null>(null);
  const lastRouteFetchRef = useRef(0);
  const lastRoutePosRef = useRef<LatLng | null>(null);

  const onStatsRef = useRef(onStats);
  onStatsRef.current = onStats;

  // Active leg coordinates (geojson geometry) for simulation path
  const activeLegCoords = useMemo(() => {
    if (routeActive && routeActive.geometry && routeActive.geometry.type === "LineString") {
      return routeActive.geometry.coordinates as [number, number][];
    }
    return undefined;
  }, [routeActive]);

  const {
    currentPosition: simPosition,
    bearing: simBearing,
    speedKmh,
    nextTurnStep,
    nextTurnDistance,
    distanceRemaining,
    etaRemainingSeconds,
    progress,
    isActive: isSimActive,
    isPaused: isSimPaused,
    speedMultiplier,
    setSpeedMultiplier,
    voiceMuted,
    setVoiceMuted,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    stopSimulation,
  } = useNavigationSimulator(activeLegCoords);

  // Synchronize simulated driver position with the server/socket
  const lastEmitRef = useRef(0);
  useEffect(() => {
    if (isSimActive && simPosition && onPositionUpdate) {
      const now = Date.now();
      // Emit update at most once every 2 seconds to prevent overloading DB/Redis
      if (now - lastEmitRef.current > 2000) {
        lastEmitRef.current = now;
        // simPosition is [longitude, latitude]
        onPositionUpdate(simPosition[1], simPosition[0]);
      }
    }
  }, [simPosition, isSimActive, onPositionUpdate]);

  // Dynamic values that switch between live GPS updates and simulator updates
  const displayPosition = (isSimActive && simPosition) ? [simPosition[1], simPosition[0]] as LatLng : smoothDriver;
  const displayBearing = (isSimActive && simPosition) ? simBearing : bearing;

  const simCompletedRouteFeature = useMemo(() => {
    if (!simPosition || !activeLegCoords) return null;
    let idx = 0;
    while (
      idx < activeLegCoords.length - 2 &&
      distanceMeters(
        [activeLegCoords[idx][1], activeLegCoords[idx][0]],
        [simPosition[1], simPosition[0]]
      ) > 12
    ) {
      idx++;
    }
    const completedCoords = [...activeLegCoords.slice(0, idx), simPosition];
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: completedCoords,
      },
    };
  }, [simPosition, activeLegCoords]);
  const displayEta = isSimActive
    ? Math.round(etaRemainingSeconds / 60)
    : (status === "arriving" ? etaPickup : etaDrop);

  const boundsPoints = useMemo(() => {
    if (status === "arriving") {
      const pts: LatLng[] = [pickupLocation];
      if (displayPosition) pts.push(displayPosition);
      return pts;
    } else if (status === "ongoing") {
      const pts: LatLng[] = [dropLocation];
      if (displayPosition) pts.push(displayPosition);
      return pts;
    } else {
      const pts: LatLng[] = [pickupLocation, dropLocation];
      if (displayPosition) pts.push(displayPosition);
      return pts;
    }
  }, [pickupLocation, dropLocation, displayPosition, status]);

  // Pickup → Drop baseline route
  useEffect(() => {
    const ac = new AbortController();
    void fetchDrivingRoute([pickupLocation, dropLocation], {
      signal: ac.signal,
    }).then((r) => {
      if (r) setRoutePD(routeToGeoJSON(r.geometry));
    });
    return () => ac.abort();
  }, [pickupLocation, dropLocation]);

  const refreshDriverRoutes = useCallback(
    async (driver: LatLng, force = false) => {
      const now = Date.now();
      const moved =
        lastRoutePosRef.current &&
        distanceMeters(lastRoutePosRef.current, driver) > 45;
      if (
        !force &&
        !moved &&
        now - lastRouteFetchRef.current < 12000
      ) {
        return;
      }

      lastRouteFetchRef.current = now;
      lastRoutePosRef.current = driver;

      routeAbortRef.current?.abort();
      const ac = new AbortController();
      routeAbortRef.current = ac;

      const [toPickup, toDrop] = await Promise.all([
        fetchDrivingRoute([driver, pickupLocation], { signal: ac.signal }),
        fetchDrivingRoute([driver, dropLocation], { signal: ac.signal }),
      ]);

      if (ac.signal.aborted) return;

      if (status === "arriving" && toPickup) {
        setRouteActive(routeToGeoJSON(toPickup.geometry));
        setEtaPickup(toPickup.durationMinutes);
      } else if (status === "ongoing" && toDrop) {
        setRouteActive(routeToGeoJSON(toDrop.geometry));
        setEtaDrop(toDrop.durationMinutes);
      }

      if (toPickup && toDrop) {
        onStatsRef.current?.({
          distanceToPickup: toPickup.distanceKm,
          durationToPickup: toPickup.durationMinutes,
          distanceToDrop: toDrop.distanceKm,
          durationToDrop: toDrop.durationMinutes,
        });
      }
    },
    [pickupLocation, dropLocation, status],
  );

  useEffect(() => {
    if (!driverLocation) return;
    if (prevDriverRef.current) {
      setBearing(bearingDegrees(prevDriverRef.current, driverLocation));
    }
    prevDriverRef.current = driverLocation;
    void refreshDriverRoutes(driverLocation);
  }, [driverLocation, refreshDriverRoutes]);

  useEffect(() => {
    if (driverLocation) {
      void refreshDriverRoutes(driverLocation, true);
    } else {
      setRouteActive(null);
    }
  }, [status, driverLocation, refreshDriverRoutes]);

  // Auto-pan/rotate camera to follow the simulated vehicle marker in real-time
  useEffect(() => {
    if (isSimActive && simPosition && mapRef.current) {
      mapRef.current.easeTo({
        center: [simPosition[0], simPosition[1]],
        zoom: 16,
        pitch: 55,
        bearing: simBearing,
        duration: 350,
        essential: true,
      });
    }
  }, [simPosition, isSimActive, simBearing]);

  const followDriver =
    mapLoaded && !!displayPosition && status !== "completed" && status !== "searching";
  
  const followDriverEnabled = followDriver && !isSimActive;

  const handleExitSimulation = () => {
    stopSimulation();
    setShowSimControls(false);
  };

  const handleStartSimulation = () => {
    setShowSimControls(true);
    startSimulation();
  };

  const getTurnIcon = (type: string) => {
    switch (type) {
      case "left":
        return <ArrowUpLeft className="h-6 w-6 text-landing-accent" />;
      case "right":
        return <ArrowUpRight className="h-6 w-6 text-landing-accent" />;
      case "destination":
        return <CheckCircle2 className="h-6 w-6 text-emerald-400 animate-pulse" />;
      default:
        return <ArrowUp className="h-6 w-6 text-landing-accent" />;
    }
  };

  const formatEta = (seconds: number) => {
    if (seconds <= 0) return "0s";
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <div className="relative h-full w-full bg-[#0c0f14]">
      {!MAPBOX_TOKEN && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950 text-sm text-white/50">
          Map token missing
        </div>
      )}

      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: pickupLocation[1],
          latitude: pickupLocation[0],
          zoom: 14,
          pitch: 50,
          bearing: -20,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={MAP_STYLE}
        attributionControl={false}
        onLoad={() => setMapLoaded(true)}
      >
        <FitRouteBounds
          points={boundsPoints}
          active={mapLoaded && !isSimActive}
          phase={status}
        />
        <FollowDriver position={displayPosition} enabled={followDriverEnabled} />

        {/* Planned route glow */}
        {routePD && (
          <Source id="route-pd" type="geojson" data={routePD}>
            <Layer
              id="route-pd-glow"
              type="line"
              paint={{
                "line-color": "#9eff6b",
                "line-width": 10,
                "line-opacity": 0.12,
                "line-blur": 4,
              }}
            />
            <Layer
              id="route-pd-line"
              type="line"
              layout={{ "line-join": "round", "line-cap": "round" }}
              paint={{
                "line-color": status === "ongoing" ? "#4b5563" : "#e5e7eb",
                "line-width": status === "ongoing" ? 3 : 5,
                "line-opacity": status === "ongoing" ? 0.35 : 0.85,
              }}
            />
          </Source>
        )}

        {/* Active leg (driver → pickup or drop) */}
        {routeActive && (
          <Source id="route-active" type="geojson" data={routeActive}>
            <Layer
              id="route-active-glow"
              type="line"
              paint={{
                "line-color": "#9eff6b",
                "line-width": 12,
                "line-opacity": 0.2,
                "line-blur": 3,
              }}
            />
            <Layer
              id="route-active-line"
              type="line"
              layout={{ "line-join": "round", "line-cap": "round" }}
              paint={{
                "line-color": isSimActive ? "#4b5563" : "#9eff6b",
                "line-width": 5,
                "line-opacity": isSimActive ? 0.4 : 0.95,
              }}
            />
          </Source>
        )}

        {/* Completed route track overlay during simulation */}
        {isSimActive && simCompletedRouteFeature && (
          <Source
            id="sim-completed-route"
            type="geojson"
            data={simCompletedRouteFeature}
          >
            <Layer
              id="sim-completed-line"
              type="line"
              paint={{
                "line-color": "#9eff6b",
                "line-width": 5,
                "line-opacity": 0.95,
              }}
              layout={{ "line-join": "round", "line-cap": "round" }}
            />
          </Source>
        )}

        {status !== "ongoing" && status !== "completed" && (
          <Marker
            longitude={pickupLocation[1]}
            latitude={pickupLocation[0]}
            anchor="bottom"
          >
            <PickupMarker />
          </Marker>
        )}

        <Marker
          longitude={dropLocation[1]}
          latitude={dropLocation[0]}
          anchor="bottom"
        >
          <DropMarker />
        </Marker>

        {displayPosition && status !== "searching" && (
          <Marker
            longitude={displayPosition[1]}
            latitude={displayPosition[0]}
            anchor="center"
          >
            <DriverMarker
              bearing={displayBearing}
              etaMinutes={displayEta}
              label={isSimActive ? "Simulated" : (status === "ongoing" ? "En route" : "Driver")}
            />
          </Marker>
        )}
      </Map>

      {/* Floating turn-by-turn Navigation Panel */}
      {showSimControls && (
        <div className="absolute top-20 left-4 right-4 md:left-6 md:right-auto md:w-[360px] bg-zinc-950/90 border border-zinc-800 text-white p-5 rounded-3xl shadow-2xl backdrop-blur-md z-50 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl shrink-0">
              {nextTurnStep ? getTurnIcon(nextTurnStep.type) : <ArrowUp className="h-6 w-6 text-landing-accent" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase font-bold tracking-widest text-landing-accent">
                {nextTurnDistance > 0 ? `In ${Math.round(nextTurnDistance)} meters` : "Arrived"}
              </p>
              <h4 className="text-sm font-black truncate text-white">
                {nextTurnStep ? nextTurnStep.instruction : "Arrived at destination"}
              </h4>
            </div>
            <button
              onClick={handleExitSimulation}
              className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors border border-zinc-800"
            >
              <X size={14} />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="bg-linear-to-r from-landing-accent to-emerald-400 h-full rounded-full transition-all duration-350"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400 border-t border-zinc-900 pt-3">
            <div className="flex items-center gap-1.5">
              <Gauge size={13} className="text-landing-accent" />
              <span className="font-semibold text-white">{speedKmh.toFixed(0)} <span className="text-[10px] text-zinc-500 font-medium">km/h</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={13} className="text-landing-accent" />
              <span className="font-semibold text-white">{formatEta(etaRemainingSeconds)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-white">{Math.round(distanceRemaining)} <span className="text-[10px] text-zinc-500 font-medium">m left</span></span>
            </div>
          </div>

          {/* Control Bar */}
          <div className="flex items-center justify-between border-t border-zinc-900 pt-3">
            <div className="flex items-center gap-2">
              <button
                onClick={isSimPaused ? resumeSimulation : pauseSimulation}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white transition-colors border border-zinc-800"
                title={isSimPaused ? "Play" : "Pause"}
              >
                {isSimPaused ? <Play size={14} className="fill-current" /> : <Pause size={14} />}
              </button>
              <button
                onClick={() => startSimulation()}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white transition-colors border border-zinc-800"
                title="Restart"
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={() => setVoiceMuted(!voiceMuted)}
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors border ${
                  voiceMuted 
                    ? "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300" 
                    : "bg-emerald-950 border-emerald-900/60 text-emerald-400"
                }`}
                title={voiceMuted ? "Unmute Voice" : "Mute Voice"}
              >
                {voiceMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
            </div>

            {/* Speed Selector */}
            <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-xl border border-zinc-800">
              {[1, 5, 15, 30].map(mult => (
                <button
                  key={mult}
                  onClick={() => setSpeedMultiplier(mult)}
                  className={`px-2.5 py-1 text-[9px] font-black rounded-lg transition-all ${
                    speedMultiplier === mult 
                      ? "bg-landing-accent text-zinc-950" 
                      : "text-zinc-400 hover:text-white hover:bg-zinc-850"
                  }`}
                >
                  {mult}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating Simulation Trigger Button */}
      {!showSimControls && status !== "completed" && status !== "searching" && activeLegCoords && (
        <button
          onClick={handleStartSimulation}
          className="absolute bottom-4 right-4 z-40 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold transition-all hover:scale-105"
        >
          <Sparkles size={14} className="text-landing-accent animate-pulse" />
          <span>Simulate Ride</span>
        </button>
      )}

      {/* Vignette for depth */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 100%, transparent 40%, rgba(0,0,0,0.35) 100%)",
        }}
      />
    </div>
  );
}
