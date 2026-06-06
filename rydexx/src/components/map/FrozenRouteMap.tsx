"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import Map, { Marker, Source, Layer, MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { routeToGeoJSON, distanceMeters } from "@/lib/mapboxRouting";
import { useNavigationSimulator } from "@/hooks/useNavigationSimulator";
import {
  Navigation,
  ArrowUpLeft,
  ArrowUpRight,
  ArrowUp,
  CheckCircle2,
  Volume2,
  VolumeX,
  Pause,
  Play,
  X,
  Gauge,
  Clock,
  RotateCcw,
  Sparkles
} from "lucide-react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

type Props = {
  pickup: [number, number];
  drop: [number, number];
  routePolyline: GeoJSON.LineString;
  className?: string;
  interactive?: boolean;
};

export default function FrozenRouteMap({
  pickup,
  drop,
  routePolyline,
  className = "h-full w-full",
  interactive = false,
}: Props) {
  const mapRef = useRef<MapRef | null>(null);
  const [showSimControls, setShowSimControls] = useState(false);

  const routeFeature = useMemo(
    () => routeToGeoJSON(routePolyline),
    [routePolyline],
  );

  const coords = useMemo(() => routePolyline.coordinates as [number, number][], [routePolyline]);

  const {
    currentPosition,
    bearing,
    speedKmh,
    nextTurnStep,
    nextTurnDistance,
    distanceRemaining,
    etaRemainingSeconds,
    progress,
    isActive,
    isPaused,
    speedMultiplier,
    setSpeedMultiplier,
    voiceMuted,
    setVoiceMuted,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    stopSimulation,
  } = useNavigationSimulator(coords);

  const bounds = useMemo(() => {
    const lngs = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    return {
      minLng: Math.min(...lngs, pickup[0], drop[0]),
      maxLng: Math.max(...lngs, pickup[0], drop[0]),
      minLat: Math.min(...lats, pickup[1], drop[1]),
      maxLat: Math.max(...lats, pickup[1], drop[1]),
    };
  }, [coords, pickup, drop]);

  const completedRouteFeature = useMemo(() => {
    if (!currentPosition) return null;
    let idx = 0;
    while (
      idx < coords.length - 2 && 
      distanceMeters(
        [coords[idx][1], coords[idx][0]], 
        [currentPosition[1], currentPosition[0]]
      ) > 10
    ) {
      idx++;
    }
    const completedCoords = [...coords.slice(0, idx), currentPosition];
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: completedCoords,
      },
    };
  }, [currentPosition, coords]);

  const centerLng = (bounds.minLng + bounds.maxLng) / 2;
  const centerLat = (bounds.minLat + bounds.maxLat) / 2;

  // Auto-pan/rotate camera to follow the simulated vehicle marker
  useEffect(() => {
    if (isActive && currentPosition && mapRef.current) {
      mapRef.current.easeTo({
        center: [currentPosition[0], currentPosition[1]],
        zoom: 15.8,
        pitch: 55,
        bearing: bearing,
        duration: 350,
        essential: true,
      });
    }
  }, [currentPosition, isActive, bearing]);

  // Refit map bounds on simulation exit
  const handleExitSimulation = () => {
    stopSimulation();
    setShowSimControls(false);
    
    if (mapRef.current) {
      mapRef.current.easeTo({
        pitch: 45,
        bearing: -15,
        duration: 800,
      });
      
      mapRef.current.fitBounds(
        [
          [bounds.minLng, bounds.minLat],
          [bounds.maxLng, bounds.maxLat],
        ],
        { padding: 56, maxZoom: 14, duration: 1000 },
      );
    }
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
    <div className={`relative ${className} bg-[#0c0f14]`}>
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: centerLng,
          latitude: centerLat,
          zoom: 12,
          pitch: 45,
          bearing: -15,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/navigation-night-v1"
        interactive={interactive || isActive}
        scrollZoom={interactive || isActive}
        dragPan={interactive || isActive}
        onLoad={(e) => {
          e.target.fitBounds(
            [
              [bounds.minLng, bounds.minLat],
              [bounds.maxLng, bounds.maxLat],
            ],
            { padding: 56, maxZoom: 14, duration: 0 },
          );
        }}
      >
        <Source id="frozen-route" type="geojson" data={routeFeature}>
          <Layer
            id="frozen-route-line-glow"
            type="line"
            paint={{
              "line-color": "#9eff6b",
              "line-width": 10,
              "line-opacity": 0.15,
              "line-blur": 3,
            }}
            layout={{ "line-join": "round", "line-cap": "round" }}
          />
          <Layer
            id="frozen-route-line"
            type="line"
            paint={{
              "line-color": isActive ? "#4b5563" : "#9eff6b",
              "line-width": isActive ? 4 : 5,
              "line-opacity": isActive ? 0.4 : 0.95,
            }}
            layout={{ "line-join": "round", "line-cap": "round" }}
          />
        </Source>

        {/* Render animated route history path */}
        {isActive && completedRouteFeature && (
          <Source
            id="route-completed"
            type="geojson"
            data={completedRouteFeature}
          >
            <Layer
              id="route-completed-line"
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

        {/* Pickup & Drop markers */}
        <Marker longitude={pickup[0]} latitude={pickup[1]} anchor="bottom">
          <div className="flex flex-col items-center">
            <div className="px-2 py-1 bg-zinc-900 border border-zinc-800 text-white text-[9px] font-bold rounded-md mb-1 uppercase tracking-wider shadow-md">
              Pickup
            </div>
            <div className="w-4.5 h-4.5 rounded-full bg-zinc-950 border-2 border-white shadow-lg flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-landing-accent" />
            </div>
          </div>
        </Marker>
        <Marker longitude={drop[0]} latitude={drop[1]} anchor="bottom">
          <div className="flex flex-col items-center">
            <div className="px-2 py-1 bg-landing-accent border border-green-400 text-zinc-950 text-[9px] font-bold rounded-md mb-1 uppercase tracking-wider shadow-md">
              Dropoff
            </div>
            <div className="w-4.5 h-4.5 rounded-full bg-zinc-950 border-2 border-white shadow-lg flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-sm bg-rose-500 animate-pulse" />
            </div>
          </div>
        </Marker>

        {/* Simulated Vehicle Marker */}
        {isActive && currentPosition && (
          <Marker
            longitude={currentPosition[0]}
            latitude={currentPosition[1]}
            anchor="center"
          >
            <div className="relative group cursor-pointer">
              <span className="absolute -inset-2 rounded-full bg-landing-accent/20 animate-ping opacity-75" />
              <div
                className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-950 text-landing-accent shadow-2xl border-2 border-landing-accent transition-transform duration-100 hover:scale-105"
                style={{ transform: `rotate(${bearing}deg)` }}
              >
                <Navigation size={18} className="fill-current text-landing-accent" />
              </div>
            </div>
          </Marker>
        )}
      </Map>

      {/* Floating turn-by-turn Navigation Panel */}
      {showSimControls && (
        <div className="absolute top-4 left-4 right-4 md:left-6 md:right-auto md:w-[360px] bg-zinc-950/90 border border-zinc-800 text-white p-5 rounded-3xl shadow-2xl backdrop-blur-md z-50 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl shrink-0">
              {nextTurnStep ? getTurnIcon(nextTurnStep.type) : <ArrowUp className="h-6 w-6 text-landing-accent" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase font-bold tracking-widest text-landing-accent">
                {nextTurnDistance > 0 ? `In ${Math.round(nextTurnDistance)} meters` : "Arrived"}
              </p>
              <h4 className="text-sm font-black truncate text-white">
                {nextTurnStep ? nextTurnStep.instruction : "Arriving at Destination"}
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
              className="bg-linear-to-r from-landing-accent to-emerald-400 h-full rounded-full transition-all duration-300"
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
                onClick={isPaused ? resumeSimulation : pauseSimulation}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white transition-colors border border-zinc-800"
                title={isPaused ? "Play" : "Pause"}
              >
                {isPaused ? <Play size={14} className="fill-current" /> : <Pause size={14} />}
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
      {!showSimControls && (
        <button
          onClick={handleStartSimulation}
          className="absolute bottom-4 right-4 z-40 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold transition-all hover:scale-105"
        >
          <Sparkles size={14} className="text-landing-accent animate-pulse" />
          <span>Simulate Navigation</span>
        </button>
      )}
    </div>
  );
}

// Helper: Calculate cumulative distance along coords
function cumulativeDistancesOfCoords(coords: [number, number][]): number[] {
  const distances: number[] = [0];
  for (let i = 0; i < coords.length - 1; i++) {
    distances.push(
      distances[i] + distanceMeters([coords[i][1], coords[i][0]], [coords[i + 1][1], coords[i + 1][0]])
    );
  }
  return distances;
}
