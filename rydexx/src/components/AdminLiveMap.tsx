"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import type { Map as MapboxMap } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import useSWR from "swr";
import { useAdminRealtimeRefresh } from "@/hooks/useAdminRealtime";
import { getSocket } from "@/lib/socket";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { motion, AnimatePresence } from "motion/react";
import { 
  Car, Bike, Truck, Navigation, Save, X, Activity, AlertTriangle, 
  Crosshair, Radio, ShieldAlert, Layers, Clock3, Search, 
  Compass, Map as MapIcon, Battery, Gauge, Phone, ShieldCheck,
  ChevronLeft, ChevronRight, CheckCircle2, Lock, RefreshCw
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Driver {
  _id: string;
  name: string;
  email: string;
  location?: { type?: "Point"; coordinates: [number, number] };
  vehicleType: string;
  lastLocationAt?: string;
  isOnline?: boolean;
}

interface ActiveRide {
  _id: string;
  status: string;
  pickupLocation: { coordinates: [number, number] };
  dropLocation: { coordinates: [number, number] };
  pickupAddress?: string;
  dropAddress?: string;
  fare?: number;
  paymentStatus?: string;
  driver: string;
  user?: string;
  sosTriggered?: boolean;
  sosTriggeredAt?: string;
}

interface SurgeZone {
  _id: string;
  name: string;
  multiplier: number;
  area: GeoJSON.Geometry;
}

interface SearchLogPoint {
  location?: { coordinates?: [number, number] };
}

interface LiveMapResponse {
  success: boolean;
  data?: {
    drivers: Driver[];
    activeRides: ActiveRide[];
    surgeZones: SurgeZone[];
    updatedAt?: string;
  };
}

interface DrawEvent {
  features?: GeoJSON.Feature[];
}

// Bezier Curve generator for curved routes
function getBezierCurveCoordinates(start: [number, number], end: [number, number], segments = 30) {
  const [lng1, lat1] = start;
  const [lng2, lat2] = end;
  
  // Midpoint
  const midLng = (lng1 + lng2) / 2;
  const midLat = (lat1 + lat2) / 2;
  
  // Offset perpendicular to create a curve
  const dx = lng2 - lng1;
  const dy = lat2 - lat1;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  // Perpendicular vector offset (proportional to distance)
  const offsetScale = 0.12;
  const pLng = -dy * offsetScale;
  const pLat = dx * offsetScale;
  
  // Control point
  const cLng = midLng + pLng;
  const cLat = midLat + pLat;
  
  const coords: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const u = 1 - t;
    const x = u * u * lng1 + 2 * u * t * cLng + t * t * lng2;
    const y = u * u * lat1 + 2 * u * t * cLat + t * t * lat2;
    coords.push([x, y]);
  }
  return coords;
}

export default function AdminLiveMap() {
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<MapboxMap | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const [sosBlink, setSosBlink] = useState(false);

  // Redesign Layout State
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [followMode, setFollowMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "available" | "active" | "sos">("all");
  const [mapStyle, setMapStyle] = useState("mapbox://styles/mapbox/dark-v11");
  const [resolvingSosId, setResolvingSosId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"assets" | "pending">("assets");
  const [dispatchTargetRideId, setDispatchTargetRideId] = useState<string | null>(null);

  const { data: liveDataRes, mutate: mutateLive } = useSWR(
    "/api/admin/map/live-data",
    fetcher,
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
      dedupingInterval: 1200,
    },
  );

  const { data: heatmapDataRes, mutate: mutateHeatmap } = useSWR(
    "/api/admin/map/heatmap",
    fetcher,
    { revalidateOnFocus: false },
  );

  useAdminRealtimeRefresh("map", () => {
    void mutateLive();
    void mutateHeatmap();
  });

  const drivers: Driver[] = liveDataRes?.data?.drivers || [];
  const activeRides: ActiveRide[] = liveDataRes?.data?.activeRides?.filter((r: ActiveRide) => r.status !== "requested") || [];
  const pendingRides: ActiveRide[] = liveDataRes?.data?.activeRides?.filter((r: ActiveRide) => r.status === "requested") || [];
  const surgeZones: SurgeZone[] = liveDataRes?.data?.surgeZones || [];
  const searchLogs: SearchLogPoint[] = heatmapDataRes?.data || [];

  const activeRideDriverIds = useMemo(() => new Set(activeRides.map((ride) => String(ride.driver))), [activeRides]);
  const sosRides = useMemo(() => activeRides.filter((r) => r.sosTriggered === true), [activeRides]);
  const sosDriverIds = useMemo(() => new Set(sosRides.map(r => String(r.driver))), [sosRides]);
  const hasSos = sosRides.length > 0;

  // Real-time socket updates with follow camera mode integration
  useEffect(() => {
    const socket = getSocket();

    const handleDriverLocation = (payload: {
      driverId?: string;
      latitude?: number;
      longitude?: number;
      at?: number;
    }) => {
      if (
        !payload.driverId ||
        typeof payload.latitude !== "number" ||
        typeof payload.longitude !== "number"
      ) {
        return;
      }

      // If followMode is active and this is our selected driver, pan map
      if (followMode && selectedDriverId === payload.driverId && mapRef.current) {
        mapRef.current.easeTo({
          center: [payload.longitude, payload.latitude],
          zoom: mapRef.current.getZoom(),
          duration: 800
        });
      }

      void mutateLive((current: LiveMapResponse | undefined) => {
        const currentDrivers = current?.data?.drivers;
        if (!Array.isArray(currentDrivers)) return current;
        const currentData = current?.data;
        if (!currentData) return current;

        const hasDriver = currentDrivers.some(
          (driver: Driver) => String(driver._id) === String(payload.driverId),
        );
        if (!hasDriver) {
          void mutateLive();
          return current;
        }

        return {
          ...current,
          data: {
            ...currentData,
            drivers: currentDrivers.map((driver: Driver) =>
              String(driver._id) === String(payload.driverId)
                ? {
                    ...driver,
                    location: {
                      type: "Point",
                      coordinates: [payload.longitude, payload.latitude],
                    },
                    lastLocationAt: new Date(payload.at ?? Date.now()).toISOString(),
                  }
                : driver,
            ),
          },
        };
      }, false);
    };

    socket.on("admin-driver-location", handleDriverLocation);
    return () => {
      socket.off("admin-driver-location", handleDriverLocation);
    };
  }, [mutateLive, followMode, selectedDriverId]);

  const [activeFeature, setActiveFeature] = useState<GeoJSON.Feature | null>(null);
  const [zoneName, setZoneName] = useState("");
  const [zoneMultiplier, setZoneMultiplier] = useState(1.5);

  const availableDrivers = drivers.filter(
    (driver) => !activeRideDriverIds.has(String(driver._id)),
  );
  const lastMapSync = liveDataRes?.data?.updatedAt || liveDataRes?.updatedAt;

  // Blink effect for SOS alerts
  useEffect(() => {
    if (!hasSos) return;
    const interval = setInterval(() => setSosBlink((v) => !v), 700);
    return () => clearInterval(interval);
  }, [hasSos]);

  const handleMapLoad = useCallback((e: { target: MapboxMap }) => {
    setMapLoaded(true);
    mapRef.current = e.target;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
      defaultMode: "draw_polygon",
    });

    e.target.addControl(draw, "top-right");
    drawRef.current = draw;

    e.target.on("draw.create", (e: DrawEvent) => {
      if (e.features?.length) setActiveFeature(e.features[0]);
    });
    e.target.on("draw.update", (e: DrawEvent) => {
      if (e.features?.length) setActiveFeature(e.features[0]);
    });
    e.target.on("draw.delete", () => setActiveFeature(null));
  }, []);

  const selectAndZoomToDriver = (driverId: string) => {
    setSelectedDriverId(driverId);
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
        setActiveFeature(null);
        setZoneName("");
        if (drawRef.current) drawRef.current.deleteAll();
        void mutateLive();
      } else {
        alert("Failed to create zone");
      }
    } catch {
      alert("Error creating zone");
    }
  };

  const handleResolveSos = async (bookingId: string) => {
    setResolvingSosId(bookingId);
    try {
      await axios.post(`/api/admin/bookings/${bookingId}/resolve-sos`);
      void mutateLive();
    } catch (err) {
      console.error("Resolve SOS failed:", err);
      alert("Failed to resolve SOS emergency.");
    } finally {
      setResolvingSosId(null);
    }
  };

  const handleForceDispatch = async (partnerId: string, partnerName: string) => {
    if (!dispatchTargetRideId) return;
    
    if (!confirm(`Force dispatch this ride to ${partnerName}?`)) {
      setDispatchTargetRideId(null);
      return;
    }

    const toastId = toast.loading("Dispatching ride...");
    try {
      const res = await axios.post("/api/admin/bookings/force-dispatch", {
        bookingId: dispatchTargetRideId,
        partnerId
      });
      if (res.data.success) {
        toast.success(res.data.message || "Dispatched successfully", { id: toastId });
        setDispatchTargetRideId(null);
        void mutateLive();
      } else {
        throw new Error(res.data.error || "Failed");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || "Failed to dispatch", { id: toastId });
      setDispatchTargetRideId(null);
    }
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case "bike": return <Bike size={16} />;
      case "truck":
      case "loading": return <Truck size={16} />;
      default: return <Car size={16} />;
    }
  };

  // Curved paths for normal and emergency active rides
  const normalRideLinesGeoJSON = useMemo(() => {
    const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];
    activeRides
      .filter((ride) => !ride.sosTriggered)
      .forEach((ride) => {
        const driver = drivers.find((d) => d._id === ride.driver);
        if (!driver?.location) return;
        const target = ride.status === "arriving"
          ? ride.pickupLocation.coordinates
          : ride.dropLocation.coordinates;
        
        try {
          const curveCoords = getBezierCurveCoordinates(driver.location.coordinates, target);
          features.push({
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: curveCoords,
            },
          });
        } catch (e) {
          // Fallback to straight line
          features.push({
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [driver.location.coordinates, target],
            },
          });
        }
      });
    return { type: "FeatureCollection" as const, features };
  }, [activeRides, drivers]);

  const sosRideLinesGeoJSON = useMemo(() => {
    const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];
    sosRides.forEach((ride) => {
      const driver = drivers.find((d) => d._id === ride.driver);
      if (!driver?.location) return;
      const target = ride.status === "arriving"
        ? ride.pickupLocation.coordinates
        : ride.dropLocation.coordinates;
      
      try {
        const curveCoords = getBezierCurveCoordinates(driver.location.coordinates, target);
        features.push({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: curveCoords,
          },
        });
      } catch (e) {
        features.push({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [driver.location.coordinates, target],
          },
        });
      }
    });
    return { type: "FeatureCollection" as const, features };
  }, [sosRides, drivers]);

  // Heatmap GeoJSON
  const heatmapGeoJSON: GeoJSON.FeatureCollection<GeoJSON.Point> = {
    type: "FeatureCollection",
    features: searchLogs
      .filter((log) => log.location?.coordinates)
      .map((log) => ({
        type: "Feature" as const,
        properties: { weight: 1 },
        geometry: {
          type: "Point" as const,
          coordinates: log.location?.coordinates ?? [0, 0],
        },
      })),
  };

  // Surge zones GeoJSON
  const surgeGeoJSON: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: surgeZones.map((zone: SurgeZone) => ({
      type: "Feature" as const,
      properties: { name: zone.name, multiplier: zone.multiplier },
      geometry: zone.area,
    })),
  };

  // Filter and Search Drivers
  const filteredDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      const matchesSearch = 
        (driver.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (driver.email?.toLowerCase() || "").includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      const isOnRide = activeRideDriverIds.has(String(driver._id));
      const isSos = sosDriverIds.has(String(driver._id));

      if (filterStatus === "available") return !isOnRide;
      if (filterStatus === "active") return isOnRide && !isSos;
      if (filterStatus === "sos") return isSos;
      return true;
    });
  }, [drivers, searchQuery, filterStatus, activeRideDriverIds, sosDriverIds]);

  const selectedDriver = useMemo(() => {
    return drivers.find(d => d._id === selectedDriverId) || null;
  }, [selectedDriverId, drivers]);

  const selectedDriverRide = useMemo(() => {
    if (!selectedDriverId) return null;
    return activeRides.find(r => String(r.driver) === String(selectedDriverId)) || null;
  }, [selectedDriverId, activeRides]);

  // Generate mock statistics for inspector
  const simulatedTelemetry = useMemo(() => {
    if (!selectedDriverId) return null;
    // Derive numbers deterministically from ID hash
    const charCodeSum = selectedDriverId.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const speed = selectedDriverRide ? 35 + (charCodeSum % 25) : 0;
    const battery = 50 + (charCodeSum % 46);
    return { speed, battery };
  }, [selectedDriverId, selectedDriverRide]);

  if (!MAPBOX_TOKEN) return <div>Mapbox token missing</div>;

  return (
    <div className="flex h-[700px] w-full rounded-[2.5rem] overflow-hidden border border-gray-100 bg-white shadow-2xl relative text-black">
      {/* ── LEFT PANEL: ASSET DIRECTORY ── */}
      <aside className={`h-full border-r border-gray-100 flex flex-col bg-white transition-all duration-300 relative z-30 shrink-0 ${
        leftPanelOpen ? "w-[310px]" : "w-0 overflow-hidden border-r-0"
      }`}>
        <div className="p-5 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="font-black text-sm uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
              <Compass size={16} />
              Control Console
            </h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">
              {activeTab === "assets" ? `${filteredDrivers.length} units listed` : `${pendingRides.length} pending rides`}
            </p>
          </div>
          <button 
            onClick={() => setLeftPanelOpen(false)}
            className="h-8 w-8 rounded-lg border border-gray-100 text-gray-400 hover:text-black flex items-center justify-center"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Console Tabs */}
        <div className="flex border-b border-gray-50">
          <button
            onClick={() => setActiveTab("assets")}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === "assets" ? "text-black border-b-2 border-black" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Assets
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === "pending" ? "text-black border-b-2 border-black" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Pending ({pendingRides.length})
          </button>
        </div>

        {activeTab === "assets" ? (
          <>
            {/* Search Input */}
            <div className="px-5 py-3.5 border-b border-gray-50">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search driver email, name..."
                  className="w-full h-10 pl-9 pr-3 bg-gray-50 border border-gray-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-black/5 focus:bg-white transition-all"
                />
                <Search size={14} className="absolute left-3 top-3 text-gray-400" />
              </div>
            </div>

            {/* Quick Filter Tabs */}
            <div className="px-4 py-2 border-b border-gray-50 flex gap-1 overflow-x-auto scrollbar-hide shrink-0">
              {(["all", "available", "active", "sos"] as const).map((statusVal) => (
                <button
                  key={statusVal}
                  onClick={() => setFilterStatus(statusVal)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    filterStatus === statusVal
                      ? "bg-black text-white"
                      : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                  }`}
                >
                  {statusVal}
                </button>
              ))}
            </div>

            {/* Scrollable Asset Cards List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredDrivers.map((driver) => {
                const isOnJob = activeRideDriverIds.has(String(driver._id));
                const isSos = sosDriverIds.has(String(driver._id));
                const isSelected = selectedDriverId === driver._id;

                return (
                  <div
                    key={driver._id}
                    onClick={() => selectAndZoomToDriver(driver._id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected 
                        ? "bg-black border-black text-white shadow-lg shadow-black/5" 
                        : isSos
                        ? "bg-red-50/50 border-red-100 hover:border-red-200"
                        : "bg-white border-gray-100/70 hover:border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                        isSelected
                          ? "bg-white/10 text-white"
                          : isSos
                          ? "bg-red-100 text-red-600 border border-red-200"
                          : isOnJob
                          ? "bg-blue-50 text-blue-600 border border-blue-100"
                          : "bg-gray-50 text-gray-500 border border-gray-200"
                      }`}>
                        {getVehicleIcon(driver.vehicleType)}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${isSelected ? "text-white" : "text-gray-900"}`}>
                          {driver.name}
                        </p>
                        <p className={`text-[10px] truncate ${isSelected ? "text-white/60" : "text-gray-400"}`}>
                          {driver.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${
                        isSos
                          ? "bg-red-500 animate-pulse"
                          : isOnJob
                          ? "bg-blue-500 animate-pulse"
                          : "bg-green-500"
                      }`} />
                    </div>
                  </div>
                );
              })}

              {filteredDrivers.length === 0 && (
                <div className="p-8 text-center text-xs text-gray-400 font-semibold">
                  No matching assets online
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {dispatchTargetRideId && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-2">
                <p className="text-xs text-amber-800 font-bold mb-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  DISPATCH MODE ACTIVE
                </p>
                <p className="text-[10px] text-amber-700">
                  Select an idle driver on the map to force dispatch this ride.
                </p>
                <button
                  onClick={() => setDispatchTargetRideId(null)}
                  className="mt-2 text-[10px] font-bold text-red-600 uppercase hover:underline"
                >
                  Cancel Mode
                </button>
              </div>
            )}
            
            {pendingRides.map(ride => (
              <div 
                key={ride._id}
                className={`p-3 border rounded-xl cursor-pointer transition-all ${
                  dispatchTargetRideId === ride._id 
                    ? "border-amber-400 bg-amber-50/50 shadow-md" 
                    : "border-gray-100 hover:border-amber-200"
                }`}
                onClick={() => {
                  setDispatchTargetRideId(ride._id);
                  if (mapRef.current) {
                    mapRef.current.flyTo({
                      center: ride.pickupLocation.coordinates,
                      zoom: 15,
                      pitch: 45
                    });
                  }
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-md text-[9px] font-black uppercase">
                    Pending
                  </span>
                  <span className="text-[10px] font-bold text-gray-500 text-right max-w-[120px] truncate">
                    User: {ride.user}
                  </span>
                </div>
                <div className="text-xs font-semibold text-gray-900 line-clamp-2 mb-1">
                  Pick: {ride.pickupAddress || "Location coordinate"}
                </div>
                <div className="text-[10px] text-gray-500 line-clamp-1 mb-2">
                  Drop: {ride.dropAddress || "Location coordinate"}
                </div>
                {!dispatchTargetRideId && (
                  <button className="w-full py-1.5 bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-wider">
                    Force Dispatch
                  </button>
                )}
              </div>
            ))}
            
            {pendingRides.length === 0 && (
              <div className="p-8 text-center text-xs text-gray-400 font-semibold">
                No pending rides
              </div>
            )}
          </div>
        )}
      </aside>

      {/* ── EXPAND SIDEBAR BUTTON ── */}
      {!leftPanelOpen && (
        <button
          onClick={() => setLeftPanelOpen(true)}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-40 h-10 w-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:text-black shadow-lg"
          title="Open Asset directory"
        >
          <ChevronRight size={18} />
        </button>
      )}

      {/* ── CENTRAL MAP VIEWPORT ── */}
      <div className="flex-1 h-full relative bg-gray-100">
        {/* Floating Top Dashboard Stats Bar */}
        <div className="absolute left-4 top-4 z-40 grid w-[min(540px,calc(100%-32px))] grid-cols-2 gap-2 sm:grid-cols-4 pointer-events-auto">
          <ControlTowerMetric
            icon={<Radio size={12} />}
            label="Online"
            value={drivers.length}
            tone="emerald"
          />
          <ControlTowerMetric
            icon={<Car size={12} />}
            label="Available"
            value={availableDrivers.length}
            tone="zinc"
          />
          <ControlTowerMetric
            icon={<Layers size={12} />}
            label="Active"
            value={activeRides.length}
            tone="blue"
          />
          <ControlTowerMetric
            icon={<ShieldAlert size={12} />}
            label="SOS Emerg"
            value={sosRides.length}
            tone={hasSos ? "red" : "zinc"}
          />
        </div>

        {/* Dynamic Last Sync Tag */}
        <div className="absolute right-4 top-4 z-40 hidden rounded-full border border-gray-100 bg-white/95 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-gray-700 shadow-sm backdrop-blur-md sm:flex sm:items-center sm:gap-2">
          <Clock3 size={11} className="text-gray-400" />
          {lastMapSync ? `Synced ${formatMapTime(lastMapSync)}` : "Live sync"}
        </div>

        {/* Map Style Picker */}
        <div className="absolute right-4 bottom-4 z-40 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-gray-100 p-2 flex flex-col gap-1">
          {[
            { id: "mapbox://styles/mapbox/dark-v11", label: "Dark Mode", icon: Lock },
            { id: "mapbox://styles/mapbox/light-v11", label: "Light Mode", icon: Compass },
            { id: "mapbox://styles/mapbox/satellite-streets-v12", label: "Satellite", icon: Layers },
            { id: "mapbox://styles/mapbox/streets-v12", label: "Streets Map", icon: MapIcon }
          ].map((style) => (
            <button
              key={style.id}
              onClick={() => setMapStyle(style.id)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
                mapStyle === style.id
                  ? "bg-black text-white"
                  : "text-gray-400 hover:bg-gray-50 hover:text-gray-700"
              }`}
              title={style.label}
            >
              <style.icon size={16} />
            </button>
          ))}
        </div>

        {/* SOS Alert Banner */}
        {hasSos && (
          <div
            className="absolute top-20 left-4 right-4 z-40 transition-opacity pointer-events-auto"
            style={{ opacity: sosBlink ? 1 : 0.7 }}
          >
            <div className="bg-red-600 rounded-xl px-4 py-3 flex items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-white shrink-0 animate-bounce" />
                <p className="text-white text-xs font-black tracking-wide">
                  CRITICAL: SOS EMERGENCIES DETECTED ({sosRides.length} active)
                </p>
              </div>
              <div className="flex gap-1.5">
                {sosRides.map((r) => (
                  <button
                    key={r._id}
                    onClick={() => selectAndZoomToDriver(r.driver)}
                    className="flex items-center gap-1 bg-white text-red-600 px-2 py-1 rounded-lg text-[9px] font-black uppercase hover:bg-red-50 transition-colors shadow"
                  >
                    <Crosshair size={10} />
                    Inspect
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
          mapStyle={mapStyle}
          mapboxAccessToken={MAPBOX_TOKEN}
          onLoad={handleMapLoad}
        >
          {mapLoaded && (
            <>
              {/* Heatmap Layer */}
              <Source id="heatmap-data" type="geojson" data={heatmapGeoJSON}>
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
                    "heatmap-opacity": 0.5,
                  }}
                />
              </Source>

              {/* Surge Zones polygons */}
              <Source id="surge-zones-data" type="geojson" data={surgeGeoJSON}>
                <Layer
                  id="surge-zones-fill"
                  type="fill"
                  paint={{ "fill-color": "#f87171", "fill-opacity": 0.15 }}
                />
                <Layer
                  id="surge-zones-line"
                  type="line"
                  paint={{ "line-color": "#ef4444", "line-width": 1.5, "line-dasharray": [2, 2] }}
                />
              </Source>

              {/* Curved Active Ride Paths (Blue) */}
              <Source id="normal-rides-lines" type="geojson" data={normalRideLinesGeoJSON}>
                <Layer
                  id="normal-rides-path"
                  type="line"
                  paint={{ "line-color": "#3b82f6", "line-width": 2.5, "line-opacity": 0.6 }}
                />
              </Source>

              {/* Curved Emergency Active Ride Paths (Red, Dashed) */}
              <Source id="sos-rides-lines" type="geojson" data={sosRideLinesGeoJSON}>
                <Layer
                  id="sos-rides-path"
                  type="line"
                  paint={{
                    "line-color": "#ef4444",
                    "line-width": 3,
                    "line-opacity": sosBlink ? 0.9 : 0.4,
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

                const isOnRide = activeRideDriverIds.has(String(driver._id));
                const isSosRide = sosDriverIds.has(String(driver._id));
                const isSelected = selectedDriverId === driver._id;

                return (
                  <Marker key={driver._id} longitude={lng} latitude={lat} anchor="center">
                    <div
                      className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 bg-black text-white shadow-lg transition-transform hover:scale-110 cursor-pointer ${
                        isSosRide
                          ? "border-red-500 shadow-red-500/60"
                          : isSelected
                          ? "border-amber-400 ring-4 ring-amber-400/25"
                          : isOnRide
                          ? "border-blue-500 shadow-blue-500/50"
                          : "border-gray-500"
                      }`}
                      onClick={() => {
                        if (dispatchTargetRideId) {
                          if (isOnRide) {
                            toast.error("This driver is already on a ride.");
                            return;
                          }
                          handleForceDispatch(driver._id, driver.name);
                        } else {
                          setSelectedDriverId(driver._id);
                          if (mapRef.current) {
                            mapRef.current.flyTo({ center: [lng, lat], zoom: 16, pitch: 45, duration: 1200 });
                          }
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

        {/* Surge Zone Custom Drawer UI */}
        {activeFeature && (
          <div className="absolute top-20 left-4 bg-white p-4 rounded-2xl shadow-2xl w-72 z-40 border border-gray-100 animate-in slide-in-from-left">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Activity size={14} className="text-red-500" />
                Define Surge Zone
              </h3>
              <button
                onClick={() => { setActiveFeature(null); drawRef.current?.deleteAll(); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 text-black">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Zone Label</label>
                <input
                  type="text"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  placeholder="e.g. Surge Area A"
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:outline-none"
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <span>Multiplier</span>
                  <span>{zoneMultiplier}x</span>
                </div>
                <input
                  type="range"
                  min="1.1"
                  max="3.0"
                  step="0.1"
                  value={zoneMultiplier}
                  onChange={(e) => setZoneMultiplier(parseFloat(e.target.value))}
                  className="w-full mt-1 accent-black cursor-pointer"
                />
              </div>
              <button
                onClick={saveSurgeZone}
                className="w-full h-10 bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Save size={14} /> Commit Zone
              </button>
            </div>
          </div>
        )}

        {/* Mini Legend Overlay */}
        <div className="absolute bottom-4 left-4 bg-black/85 backdrop-blur-md px-3.5 py-3 rounded-2xl border border-white/10 text-[10px] text-white/80 space-y-2 pointer-events-none shadow-xl">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span>Active Ride Path</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span>Available Driver</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span>SOS Emergency Active</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-1 bg-red-400 rounded-sm inline-block" />
            <span>Surge pricing zone</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: TELEMETRY INSPECTOR ── */}
      <AnimatePresence>
        {selectedDriver && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="w-[300px] border-l border-gray-100 flex flex-col bg-white shrink-0 relative z-30 h-full"
          >
            <div className="p-5 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm uppercase tracking-wider text-gray-900">
                  Unit Inspector
                </h3>
                <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Asset ID: #{selectedDriver._id.slice(-6).toUpperCase()}</p>
              </div>
              <button 
                onClick={() => { setSelectedDriverId(null); setFollowMode(false); }}
                className="h-8 w-8 rounded-lg border border-gray-100 text-gray-400 hover:text-black flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Profile Card */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center font-bold">
                  {selectedDriver.name[0].toUpperCase()}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 leading-tight">{selectedDriver.name}</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">{selectedDriver.email}</p>
                </div>
              </div>

              {/* Live Telematics Mock Stats */}
              {simulatedTelemetry && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Telemetry Stream</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400 uppercase mb-1">
                        <Gauge size={12} className="text-blue-500" />
                        <span>Velocity</span>
                      </div>
                      <p className="text-sm font-black text-gray-900 font-mono">{simulatedTelemetry.speed} km/h</p>
                    </div>

                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400 uppercase mb-1">
                        <Battery size={12} className="text-emerald-500" />
                        <span>Energy</span>
                      </div>
                      <p className="text-sm font-black text-gray-900 font-mono">{simulatedTelemetry.battery}%</p>
                    </div>
                  </div>

                  {/* Camera follow mode toggle */}
                  <label className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Crosshair size={12} className={followMode ? "text-amber-500 animate-spin" : "text-gray-400"} />
                      <span className="text-xs font-bold text-gray-600">Lock Camera Follow</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={followMode}
                      onChange={(e) => setFollowMode(e.target.checked)}
                      className="rounded border-gray-300 accent-black focus:ring-black cursor-pointer"
                    />
                  </label>
                </div>
              )}

              {/* Active Booking Details */}
              {selectedDriverRide ? (
                <div className="space-y-3 border-t border-gray-100 pt-5 text-xs text-black">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Job Details</h4>
                  
                  {selectedDriverRide.sosTriggered && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-700">
                      <AlertTriangle size={16} className="shrink-0 animate-bounce" />
                      <div>
                        <p className="text-[10px] font-black uppercase">SOS Triggered</p>
                        <p className="text-[9px] font-medium leading-relaxed mt-0.5">Emergency button activated by driver or rider.</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex justify-between py-1 border-b border-gray-50">
                      <span className="text-gray-400 font-semibold">Ride Status</span>
                      <span className="font-bold text-gray-900 uppercase">{selectedDriverRide.status}</span>
                    </div>
                    {selectedDriverRide.fare && (
                      <div className="flex justify-between py-1 border-b border-gray-50">
                        <span className="text-gray-400 font-semibold">Est Fare</span>
                        <span className="font-bold text-gray-900 font-mono">₹{selectedDriverRide.fare}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1 border-b border-gray-50">
                      <span className="text-gray-400 font-semibold">Payment</span>
                      <span className="font-bold text-gray-900 uppercase">{selectedDriverRide.paymentStatus || "N/A"}</span>
                    </div>
                    {selectedDriverRide.pickupAddress && (
                      <div className="py-1.5 border-b border-gray-50">
                        <span className="text-gray-400 font-semibold block mb-0.5">Pickup</span>
                        <span className="font-medium text-gray-900 leading-normal">{selectedDriverRide.pickupAddress}</span>
                      </div>
                    )}
                    {selectedDriverRide.dropAddress && (
                      <div className="py-1.5">
                        <span className="text-gray-400 font-semibold block mb-0.5">Dropoff</span>
                        <span className="font-medium text-gray-900 leading-normal">{selectedDriverRide.dropAddress}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions inside inspector */}
                  {selectedDriverRide.sosTriggered && (
                    <div className="pt-2">
                      <button
                        onClick={() => handleResolveSos(selectedDriverRide._id)}
                        disabled={resolvingSosId === selectedDriverRide._id}
                        className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                      >
                        {resolvingSosId === selectedDriverRide._id ? (
                          <>
                            <RefreshCw size={12} className="animate-spin" />
                            Resolving...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={14} />
                            Resolve Incident
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 border-t border-gray-100 pt-5 text-center p-6 text-xs text-gray-400 font-semibold">
                  This unit is currently idle and available for bookings.
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

function ControlTowerMetric({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "emerald" | "blue" | "red" | "zinc";
}) {
  const toneClass = {
    emerald: "border-green-100 bg-green-50/90 text-green-700 shadow-sm",
    blue: "border-blue-100 bg-blue-50/90 text-blue-700 shadow-sm",
    red: "border-red-150 bg-red-500 text-white shadow-lg shadow-red-200 animate-pulse",
    zinc: "border-gray-100 bg-white/95 text-gray-700 shadow-sm",
  }[tone];

  return (
    <div className={`rounded-xl border px-3 py-2 flex flex-col justify-center backdrop-blur-md ${toneClass}`}>
      <div className="flex items-center justify-between gap-1.5">
        <span className="opacity-70">{icon}</span>
        <span className="text-base font-black tracking-tight tabular-nums leading-none">{value}</span>
      </div>
      <p className="mt-1 text-[8px] font-black uppercase tracking-wider opacity-60">
        {label}
      </p>
    </div>
  );
}

function formatMapTime(value: string | number | Date) {
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return "just now";
  const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}
