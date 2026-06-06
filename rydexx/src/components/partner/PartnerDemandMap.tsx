"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import useSWR from "swr";
import axios from "axios";
import { useSession } from "next-auth/react";
import { getSocket } from "@/lib/socket";
import { motion, AnimatePresence } from "motion/react";
import { Zap, Compass, MapPin, CheckCircle, Navigation, Play, RefreshCw, X } from "lucide-react";
import toast from "react-hot-toast";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PartnerDemandMap() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [mapLoaded, setMapLoaded] = useState(false);
  const [driverPos, setDriverPos] = useState<[number, number] | null>(null); // [lng, lat]
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(5); // multiplier
  const [activeRecommendationId, setActiveRecommendationId] = useState<string | null>(null);
  const [guidanceAccepted, setGuidanceAccepted] = useState(false);
  const [hasArrived, setHasArrived] = useState(false);
  
  const mapRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);
  const socketRef = useRef<any>(null);

  // Fetch hotspots and customized recommendation
  const { data: demandData, mutate: refreshDemand, error } = useSWR(
    "/api/partner/demand",
    fetcher,
    {
      refreshInterval: 12000,
      revalidateOnFocus: true,
    }
  );

  const hotspots = demandData?.hotspots || [];
  const recommendation = demandData?.recommendation;

  // Set driver initial position when API loads
  useEffect(() => {
    if (recommendation && !driverPos && !isSimulating && !hasArrived) {
      // API returns recommendation coordinates or fallbacks. We can locate driver near center of Srinagar
      // driverPos must be [lng, lat]
      // Let's seed driver location ~1.5km away from recommended target if not already online
      const target = recommendation.recommendedLocation; // [lng, lat]
      if (target) {
        // Driver position is offset slightly if not set in DB
        const startLng = target[0] - 0.015;
        const startLat = target[1] - 0.01;
        setDriverPos([startLng, startLat]);
      }
    }
  }, [recommendation, driverPos, isSimulating, hasArrived]);

  // Connect socket
  useEffect(() => {
    if (userId) {
      socketRef.current = getSocket();
      socketRef.current.emit("identity", userId);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [userId]);

  // Map representation of Heatmap GeoJSON
  const heatmapGeoJSON: GeoJSON.FeatureCollection<GeoJSON.Point> = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: hotspots.map((coord: [number, number]) => ({
        type: "Feature" as const,
        properties: { weight: 1 },
        geometry: {
          type: "Point" as const,
          coordinates: coord,
        },
      })),
    };
  }, [hotspots]);

  // Dashed connector line GeoJSON
  const connectorGeoJSON: GeoJSON.FeatureCollection<GeoJSON.LineString> = useMemo(() => {
    if (!driverPos || !recommendation?.recommendedLocation) {
      return { type: "FeatureCollection", features: [] };
    }
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [driverPos, recommendation.recommendedLocation],
          },
        },
      ],
    };
  }, [driverPos, recommendation]);

  // Accept Guidance button handler
  const handleAcceptGuidance = async () => {
    if (!recommendation || !driverPos) return;
    const toastId = toast.loading("Accepting guidance recommendation...");
    try {
      const res = await axios.post("/api/partner/recommendations", {
        currentLocation: { type: "Point", coordinates: driverPos },
        recommendedLocation: { type: "Point", coordinates: recommendation.recommendedLocation },
        recommendedPlaceName: recommendation.recommendedPlaceName,
        distanceKm: recommendation.distanceKm,
        multiplier: recommendation.multiplier,
      });

      if (res.data?.success) {
        setActiveRecommendationId(res.data.data._id);
        setGuidanceAccepted(true);
        toast.success("Guidance logged. Relocation route marked!", { id: toastId });
      } else {
        throw new Error(res.data?.error || "Failed");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to log recommendation index", { id: toastId });
    }
  };

  // Relocation animation simulator
  const startRelocation = () => {
    if (!driverPos || !recommendation?.recommendedLocation || !activeRecommendationId) return;
    
    setIsSimulating(true);
    setHasArrived(false);
    toast.success("Simulation triggered. Moving vehicle...");

    const startLng = driverPos[0];
    const startLat = driverPos[1];
    const [destLng, destLat] = recommendation.recommendedLocation;

    let step = 0;
    const totalSteps = 200; // Animation duration steps

    const animate = () => {
      // Speed multiplier influences step progression
      step += 1 * (simulationSpeed / 5);

      if (step >= totalSteps) {
        // Arrival
        setDriverPos([destLng, destLat]);
        setIsSimulating(false);
        setHasArrived(true);

        // Notify socket of exact arrival coordinate
        socketRef.current?.emit("update-location", {
          userId,
          latitude: destLat,
          longitude: destLng,
        });

        // Update recommendation status to followed in backend
        axios.put(`/api/partner/recommendations/${activeRecommendationId}`, {
          status: "followed",
        }).then(() => {
          toast.success(`Arrived at ${recommendation.recommendedPlaceName}! Guidance index updated.`);
          void refreshDemand();
        }).catch(err => {
          console.error("Arrival logging failed:", err);
        });

        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        return;
      }

      // Linear interpolation
      const ratio = step / totalSteps;
      const currentLng = startLng + (destLng - startLng) * ratio;
      const currentLat = startLat + (destLat - startLat) * ratio;

      setDriverPos([currentLng, currentLat]);

      // Emit coordinate updates via socket for live Admin tracking
      socketRef.current?.emit("update-location", {
        userId,
        latitude: currentLat,
        longitude: currentLng,
      });

      // Camera follow
      if (mapRef.current) {
        mapRef.current.easeTo({
          center: [currentLng, currentLat],
          duration: 100,
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  const cancelSimulation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setIsSimulating(false);
    setGuidanceAccepted(false);
    setHasArrived(false);
    setActiveRecommendationId(null);
    // Refresh to rebuild baseline
    void refreshDemand();
  };

  if (!MAPBOX_TOKEN) {
    return (
      <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-200 text-sm font-semibold">
        Mapbox credentials are not configured in environment variables.
      </div>
    );
  }

  // Calculate current dynamic message
  const displayDistance = useMemo(() => {
    if (!driverPos || !recommendation?.recommendedLocation) return 0;
    // Simple math distance
    const dx = recommendation.recommendedLocation[0] - driverPos[0];
    const dy = recommendation.recommendedLocation[1] - driverPos[1];
    // Scale distance relative to original distance
    const currentDistance = Math.sqrt(dx * dx + dy * dy) * 100; // rough km scaling
    return parseFloat(currentDistance.toFixed(1));
  }, [driverPos, recommendation]);

  return (
    <div className="relative w-full h-[550px] rounded-[32px] overflow-hidden border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
      
      {/* Mapbox Instance */}
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: driverPos ? driverPos[0] : 74.7973,
          latitude: driverPos ? driverPos[1] : 34.0837,
          zoom: 13,
          pitch: 30,
        }}
        onLoad={() => setMapLoaded(true)}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        style={{ width: "100%", height: "100%" }}
      >
        {mapLoaded && (
          <>
            {/* Surge Heatmap Layer */}
            <Source id="heatmap-data" type="geojson" data={heatmapGeoJSON}>
              <Layer
                id="demand-heatmap"
                type="heatmap"
                paint={{
                  "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 0, 0, 1, 1],
                  "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 15, 3],
                  "heatmap-color": [
                    "interpolate", ["linear"], ["heatmap-density"],
                    0, "rgba(168, 85, 247, 0)", // Violet theme
                    0.2, "rgba(168, 85, 247, 0.25)",
                    0.4, "rgba(236, 72, 153, 0.5)", // Pink
                    0.6, "rgba(244, 63, 94, 0.75)", // Rose
                    0.8, "rgba(251, 146, 60, 0.9)", // Orange
                    1, "rgba(253, 224, 71, 1)", // Yellow (Core)
                  ],
                  "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 5, 9, 20, 15, 55],
                  "heatmap-opacity": 0.85,
                }}
              />
            </Source>

            {/* Path line to target destination */}
            {guidanceAccepted && !hasArrived && (
              <Source id="connector-route" type="geojson" data={connectorGeoJSON}>
                <Layer
                  id="route-line"
                  type="line"
                  paint={{
                    "line-color": "#a855f7",
                    "line-width": 3,
                    "line-dasharray": [2, 2],
                  }}
                />
              </Source>
            )}

            {/* Target Destination Pin */}
            {recommendation?.recommendedLocation && (
              <Marker
                longitude={recommendation.recommendedLocation[0]}
                latitude={recommendation.recommendedLocation[1]}
                anchor="bottom"
              >
                <div className="flex flex-col items-center group cursor-pointer">
                  <div className="bg-purple-600 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-lg border border-purple-400/30 mb-1 z-20">
                    {recommendation.recommendedPlaceName}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 border-2 border-purple-500 flex items-center justify-center animate-pulse shadow-2xl">
                    <MapPin className="text-white" size={16} />
                  </div>
                </div>
              </Marker>
            )}

            {/* Driver Vehicle Marker */}
            {driverPos && (
              <Marker
                longitude={driverPos[0]}
                latitude={driverPos[1]}
                anchor="center"
              >
                <div className="relative flex items-center justify-center">
                  <span className="absolute inline-flex h-9 w-9 rounded-full bg-emerald-400/30 animate-ping" />
                  <div className="relative w-7 h-7 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-xl text-black">
                    <Navigation className="fill-black rotate-45 transform -translate-y-[1px]" size={14} />
                  </div>
                </div>
              </Marker>
            )}
          </>
        )}
      </Map>

      {/* Glassmorphic Dispatcher Card (Overlay) */}
      <div className="absolute top-6 left-6 z-10 w-90 max-w-[90vw]">
        <AnimatePresence mode="wait">
          {hasArrived ? (
            <motion.div
              key="success-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950/95 backdrop-blur-md border border-white/10 shadow-2xl rounded-3xl p-5 text-white flex flex-col gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <CheckCircle size={22} />
                </div>
                <div>
                  <h4 className="font-black text-sm uppercase tracking-wider text-emerald-400">Guidance Completed</h4>
                  <p className="text-2xs text-gray-400 uppercase tracking-widest mt-0.5">High Demand Area Reached</p>
                </div>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed font-semibold">
                You are now located in **{recommendation?.recommendedPlaceName}**. Customer demand searches are currently **{recommendation?.multiplier}x** higher. Stay in this zone to receive priorities first!
              </p>
              <button
                onClick={cancelSimulation}
                className="w-full py-2.5 bg-white text-zinc-900 rounded-xl text-xs font-black uppercase tracking-wider transition hover:bg-gray-100"
              >
                Reset Map
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="guidance-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-white/95 backdrop-blur-md border border-gray-100 shadow-[0_15px_40px_rgba(0,0,0,0.12)] rounded-3xl p-5 text-zinc-950 flex flex-col gap-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
                  <Compass size={11} className="animate-spin" />
                  Smart Dispatcher
                </span>
                <span className="text-2xs font-bold text-zinc-400">Srinagar District</span>
              </div>

              <div>
                <h3 className="text-base font-black tracking-tight text-zinc-900">
                  {recommendation?.isInside || displayDistance <= 0.4 ? "High Demand Active" : "Relocation Recommended"}
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed font-semibold mt-1">
                  {isSimulating
                    ? `Relocating to ${recommendation?.recommendedPlaceName}. Distance remaining: ${displayDistance} km...`
                    : recommendation?.message || "Analyzing demand insights in your sector..."}
                </p>
              </div>

              {guidanceAccepted && !hasArrived && (
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-3.5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest block">Sim Speed</span>
                    <span className="text-xs font-black text-purple-950 block">{simulationSpeed}x speed multiplier</span>
                  </div>
                  <div className="flex bg-purple-100 p-0.5 rounded-lg">
                    {[1, 5, 15].map((sp) => (
                      <button
                        key={sp}
                        onClick={() => setSimulationSpeed(sp)}
                        className={`px-2 py-1 text-[10px] font-black rounded-md transition ${
                          simulationSpeed === sp ? "bg-purple-600 text-white shadow-sm" : "text-purple-600 hover:bg-purple-200"
                        }`}
                      >
                        {sp}x
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {!guidanceAccepted ? (
                  <button
                    onClick={handleAcceptGuidance}
                    className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-zinc-900/10"
                  >
                    <Zap size={14} className="fill-amber-400 text-amber-400" />
                    Accept Guidance
                  </button>
                ) : (
                  <>
                    <button
                      onClick={cancelSimulation}
                      className="px-3 border border-zinc-200 text-zinc-400 hover:text-zinc-600 hover:border-zinc-300 rounded-xl transition flex items-center justify-center"
                      title="Cancel Guidance"
                    >
                      <X size={15} />
                    </button>
                    <button
                      onClick={startRelocation}
                      disabled={isSimulating}
                      className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/10"
                    >
                      <Play size={14} className="fill-white" />
                      {isSimulating ? "Simulating..." : "Simulate Relocation"}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dynamic legend */}
      <div className="absolute bottom-6 right-6 z-10 bg-zinc-950/80 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-white/10 text-white text-[10px] font-bold flex gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse" />
          <span>High Demand</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500/60" />
          <span>Low</span>
        </div>
      </div>

    </div>
  );
}
