"use client";

import { useMemo, useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getMapProps, OLA_MAPS_API_KEY } from "@/lib/mapConfig";
import { sortKashmirResultsFirst, KASHMIR_CENTER_LAT, KASHMIR_CENTER_LNG, KASHMIR_RADIUS_METERS } from "@/lib/kashmirBias";
import dynamic from "next/dynamic";
import {
  ArrowLeft, ArrowRight, MapPin, Navigation,
  Bike, Car, Truck, LocateFixed, Phone,
  Calendar, User, FileText, Info, Compass, Clock
} from "lucide-react";


const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });
import WeatherWidget from "@/components/WeatherWidget";

interface LocationData {
  address: string;
  lat: number;
  lng: number;
  id?: string;
}

type VehicleType = "bike" | "auto" | "car" | "loading" | "truck";

interface MapboxFeature {
  id: string;
  place_name: string;
  center: [number, number];
}

interface MapboxGeocodingResponse {
  features: MapboxFeature[];
}

// Helper hook for debouncing input
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const VEHICLES = [
  { id: "bike",    label: "Bike",    Icon: Bike,  desc: "Quick & affordable", capacity: "1 Pax" },
  { id: "auto",    label: "Auto",    Icon: Car,   desc: "Everyday rides",     capacity: "3 Pax" },
  { id: "car",     label: "Car",     Icon: Car,   desc: "Comfort rides",      capacity: "4 Pax" },
  { id: "loading", label: "Loading", Icon: Truck, desc: "Small cargo",        capacity: "500 kg" },
  { id: "truck",   label: "Truck",   Icon: Truck, desc: "Heavy transport",    capacity: "2 tons" },
];



const stepVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const getMaxSeats = (type: VehicleType | null): number => {
  if (!type) return 4;
  if (type === "bike") return 2;
  if (type === "auto") return 3;
  if (type === "car") return 4;
  return 2; // loading, truck
};

import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

export default function BookPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const userData = useSelector((state: RootState) => state.user.userData);

  // Client Hydration Check
  useEffect(() => {
    setMounted(true);
  }, []);

  // Form Parameters
  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [vehicle, setVehicle] = useState<VehicleType | null>(null);
  const [mobile, setMobile] = useState("");
  
  useEffect(() => {
    if (userData?.mobileNumber) {
      setMobile(userData.mobileNumber);
    }
  }, [userData?.mobileNumber]);
  const [passengerCount, setPassengerCount] = useState(1);
  const [notes, setNotes] = useState("");

  // Coordinates
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [dropLat, setDropLat] = useState<number | null>(null);
  const [dropLng, setDropLng] = useState<number | null>(null);

  // Search Results
  const [pickupResults, setPickupResults] = useState<LocationData[]>([]);
  const [dropResults, setDropResults] = useState<LocationData[]>([]);
  const [activeInput, setActiveInput] = useState<"pickup" | "drop" | null>(null);

  // Debounced Values
  const debouncedPickup = useDebounce(pickup, 300);
  const debouncedDrop = useDebounce(drop, 300);

  // Scheduling Toggles
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  // Geocoder Refs
  const pickupContainerRef = useRef<HTMLDivElement>(null);
  const dropContainerRef = useRef<HTMLDivElement>(null);

  // Status & Validation Error states
  const [locating, setLocating] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [continuing, setContinuing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const maxSeats = useMemo(() => {
    return getMaxSeats(vehicle);
  }, [vehicle]);

  useEffect(() => {
    const max = getMaxSeats(vehicle);
    if (passengerCount > max) {
      setPassengerCount(max);
    }
  }, [vehicle, passengerCount]);

  useEffect(() => {
    if (scheduleMode === "later" && !scheduleDate && !scheduleTime) {
      const now = new Date();
      const future = new Date(now.getTime() + 30 * 60 * 1000);
      
      const yyyy = future.getFullYear();
      const mm = String(future.getMonth() + 1).padStart(2, '0');
      const dd = String(future.getDate()).padStart(2, '0');
      setScheduleDate(`${yyyy}-${mm}-${dd}`);
      
      const hh = String(future.getHours()).padStart(2, '0');
      const min = String(future.getMinutes()).padStart(2, '0');
      setScheduleTime(`${hh}:${min}`);
    }
  }, [scheduleMode, scheduleDate, scheduleTime]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Optimized Mapbox Search implementation
  const searchAddress = useCallback(async (query: string, setResults: React.Dispatch<React.SetStateAction<LocationData[]>>) => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setSearchError(null);
      return;
    }

    if (!OLA_MAPS_API_KEY) {
      setSearchError("Ola Maps token is missing.");
      return;
    }

    try {
      setSearchError(null);
      const url = new URL(`https://api.olamaps.io/places/v1/autocomplete`);
      url.searchParams.append("input", query.trim());
      url.searchParams.append("api_key", OLA_MAPS_API_KEY);
      url.searchParams.append("location", `${KASHMIR_CENTER_LAT},${KASHMIR_CENTER_LNG}`);
      url.searchParams.append("radius", String(KASHMIR_RADIUS_METERS));

      const res = await fetch(url.toString(), {
        headers: { 'Accept': 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`Ola Maps API error: ${res.status}`);
      }

      const data = await res.json();
      
      if (!data.predictions || data.predictions.length === 0) {
        setResults([]);
        setSearchError("No results found in operational area.");
        return;
      }

      const sortedPredictions = sortKashmirResultsFirst(data.predictions);

      const results: LocationData[] = sortedPredictions.map((f: any) => {
        return {
          id: f.place_id,
          address: f.description,
          lat: f.geometry?.location?.lat || 0,
          lng: f.geometry?.location?.lng || 0,
        };
      });

      setResults(sortKashmirResultsFirst(results));
    } catch (error) {
      console.error("Address search failed:", error);
      setSearchError("Network error. Could not fetch suggestions.");
      setResults([]);
    }
  }, []);

  // Trigger search when debounced values change
  useEffect(() => {
    if (activeInput === "pickup") {
      // Only search if coordinates are null (meaning user typed manually, not selected from list)
      if (pickupLat === null || pickupLng === null) {
        searchAddress(debouncedPickup, setPickupResults);
      }
    }
  }, [debouncedPickup, activeInput, searchAddress, pickupLat, pickupLng]);

  useEffect(() => {
    if (activeInput === "drop") {
      if (dropLat === null || dropLng === null) {
        searchAddress(debouncedDrop, setDropResults);
      }
    }
  }, [debouncedDrop, activeInput, searchAddress, dropLat, dropLng]);

  const handleQueryChange = (query: string, inputType: "pickup" | "drop") => {
    if (inputType === "pickup") {
      setPickup(query);
      setPickupLat(null);
      setPickupLng(null);
    } else {
      setDrop(query);
      setDropLat(null);
      setDropLng(null);
    }
  };

  const selectSuggestion = (p: LocationData, type: "pickup" | "drop") => {
    if (type === "pickup") {
      setPickup(p.address);
      setPickupLat(p.lat);
      setPickupLng(p.lng);
      setPickupResults([]);
    } else {
      setDrop(p.address);
      setDropLat(p.lat);
      setDropLng(p.lng);
      setDropResults([]);
    }
    setActiveInput(null);
    setSearchError(null);
  };

  // Pre-configured Kashmir Location Shortcuts (Chadoora, Chanapora, Dal Lake)
  const selectShortcut = (address: string, lat: number, lng: number, defaultType: "pickup" | "drop") => {
    const targetType = activeInput || defaultType;
    if (targetType === "pickup") {
      setPickup(address);
      setPickupLat(lat);
      setPickupLng(lng);
    } else {
      setDrop(address);
      setDropLat(lat);
      setDropLng(lng);
    }
    triggerToast(`Set ${targetType} shortcut: ${address.split(",")[0]}`);
  };

  // Geolocator coordinates lookup
  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    setValidationError("");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          if (OLA_MAPS_API_KEY) {
            const res = await fetch(
              `https://api.olamaps.io/places/v1/reverse-geocode?latlng=${coords.latitude},${coords.longitude}&api_key=${OLA_MAPS_API_KEY}`
            );
            const data = await res.json();
            if (data?.results?.length) {
              const placeName = data.results[0].formatted_address;
              setPickup(placeName);
              setPickupLat(coords.latitude);
              setPickupLng(coords.longitude);
              return;
            }
          }

          // Komoot fallback
          const res = await fetch(`https://photon.komoot.io/reverse?lat=${coords.latitude}&lon=${coords.longitude}&limit=1`);
          const data = await res.json();
          if (data?.features?.length) {
            const p = data.features[0].properties;
            const addr = [p.name, p.street, p.city, p.state, p.country].filter(Boolean).join(", ");
            setPickup(addr);
            setPickupLat(coords.latitude);
            setPickupLng(coords.longitude);
          }
        } catch {
          setValidationError("Could not reverse-geocode coordinates. Search manually.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setValidationError("Failed to acquire location. Choose pickup location manually.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Form validations & redirection
  const handleContinue = async () => {
    setValidationError("");
    if (!vehicle) {
      setValidationError("Please select a vehicle class to check rates.");
      return;
    }
    if (mobile.length < 10) {
      setValidationError("A valid 10-digit mobile number is required.");
      return;
    }
    if (!pickup) {
      setValidationError("Pickup location is required.");
      return;
    }
    if (!drop) {
      setValidationError("Dropoff location is required.");
      return;
    }

    // Coords duplicate checks
    if (pickupLat && dropLat && Math.abs(pickupLat - dropLat) < 0.0001 && Math.abs((pickupLng || 0) - (dropLng || 0)) < 0.0001) {
      setValidationError("Pickup and destination coordinates cannot be identical.");
      return;
    }

    // Schedule checks
    if (scheduleMode === "later") {
      if (!scheduleDate || !scheduleTime) {
        setValidationError("Please specify both date and time for scheduled booking.");
        return;
      }
      const sched = new Date(`${scheduleDate}T${scheduleTime}`);
      if (sched.getTime() < Date.now() + 5 * 60 * 1000) {
        setValidationError("Scheduled booking time must be in the future (minimum 10 mins).");
        return;
      }
    }

    setContinuing(true);
    try {
      const resolvedPickupLat = pickupLat;
      const resolvedPickupLng = pickupLng;
      const resolvedDropLat = dropLat;
      const resolvedDropLng = dropLng;

      // Geocode fallbacks if pins not resolved
      if (resolvedPickupLat == null || resolvedPickupLng == null) {
        setValidationError("Please choose a valid pickup from autocomplete suggestions.");
        setContinuing(false);
        return;
      }
      if (resolvedDropLat == null || resolvedDropLng == null) {
        setValidationError("Please choose a valid dropoff from autocomplete suggestions.");
        setContinuing(false);
        return;
      }

      const urlParams: Record<string, string> = {
        pickup,
        drop,
        vehicle,
        mobileNumber: mobile,
        pickupLat: String(resolvedPickupLat),
        pickupLng: String(resolvedPickupLng),
        dropLat: String(resolvedDropLat),
        dropLng: String(resolvedDropLng),
        passengers: String(passengerCount),
        ...(notes ? { notes } : {}),
        ...(scheduleMode === "later" ? { scheduledAt: `${scheduleDate}T${scheduleTime}` } : {}),
      };

      const url = new URLSearchParams(urlParams);
      router.push(`/user/search?${url.toString()}`);
    } catch {
      setValidationError("Geocoding failed. Select from suggested results.");
    } finally {
      setContinuing(false);
    }
  };

  const progress = [!!vehicle, !!(mobile.length >= 10), !!pickup, !!drop].filter(Boolean).length;

  if (!mounted) {
    return <div className="min-h-screen bg-zinc-50" />;
  }

  return (
    <div className="min-h-dvh bg-zinc-50 text-zinc-900 grid grid-cols-1 lg:grid-cols-12 lg:h-dvh lg:overflow-hidden relative">
      
      {/* ── ALERTS TOAST POPUP ── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-6 py-3 rounded-full text-xs font-bold shadow-2xl flex items-center gap-2"
          >
            <Info size={12} className="text-emerald-400" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LEFT PANEL: PREMIUM BOOKING FORM PANEL ── */}
      <div className="col-span-12 lg:col-span-5 bg-white border-r border-zinc-200 z-10 flex min-h-dvh flex-col overflow-y-auto shadow-2xl relative lg:h-full lg:min-h-0">
        
        {/* Top Header */}
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => router.back()}
              className="w-10 h-10 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 transition"
            >
              <ArrowLeft size={16} />
            </motion.button>
            <div>
              <h1 className="text-lg font-black tracking-tight text-zinc-900">Book a Ride</h1>
              <p className="text-3xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Secure pricing on request</p>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5 shrink-0">
            {[0, 1, 2, 3].map(i => (
              <motion.div
                key={i}
                animate={{ width: i < progress ? 18 : 6, background: i < progress ? "#000" : "#e4e4e7" }}
                transition={{ duration: 0.3 }}
                className="h-1.5 rounded-full"
              />
            ))}
          </div>
        </div>

        <div className="p-6 space-y-8 flex-1">
          {/* Real-time Location Weather */}
          <WeatherWidget lat={pickupLat} lng={pickupLng} />
          
          {/* ══ STEP 1: CHOOSE VEHICLE ══ */}
          <motion.div variants={stepVariants} initial="hidden" animate="visible">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-black">1</span>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Choose Vehicle</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2.5">
              {VEHICLES.map((v, i) => {
                const active = vehicle === v.id;
                return (
                  <motion.button
                    key={v.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setVehicle(v.id as VehicleType)}
                    className={`relative p-3.5 rounded-2xl border flex items-center gap-3 text-left transition-all ${
                      active ? "bg-black border-black text-white shadow-lg" : "bg-zinc-50 border-zinc-200 hover:border-zinc-300 text-zinc-800"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${active ? "bg-white text-black" : "bg-zinc-200 text-zinc-600"}`}>
                      <v.Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate leading-tight">{v.label}</p>
                      <p className={`text-[9px] mt-0.5 truncate ${active ? "text-zinc-400" : "text-zinc-400"}`}>{v.capacity}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* DIVIDER */}
          <div className="h-px bg-zinc-100" />

          {/* ══ STEP 2: PASSENGER DETAILS ══ */}
          <motion.div variants={stepVariants} initial="hidden" animate="visible" transition={{ delay: 0.1 }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-black">2</span>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Contact & Notes</p>
            </div>

            <div className="space-y-3">
              {/* Mobile Phone */}
              <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 focus-within:border-black focus-within:bg-white transition-all">
                <Phone size={14} className="text-zinc-400 shrink-0" />
                <input
                  type="tel"
                  value={mobile}
                  onChange={e => setMobile(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter 10-digit phone number"
                  className="flex-1 bg-transparent text-xs font-bold text-zinc-900 outline-none placeholder:text-zinc-400"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Passenger Count */}
                <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3">
                  <User size={14} className="text-zinc-400 shrink-0" />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-2xs font-bold text-zinc-500">Seat count:</span>
                    <select
                      value={passengerCount}
                      onChange={e => setPassengerCount(Number(e.target.value))}
                      className="bg-transparent text-xs font-bold text-zinc-900 outline-none"
                    >
                      {Array.from({ length: maxSeats }, (_, i) => i + 1).map(n => (
                        <option key={n} value={n}>{n} Seat{n > 1 ? "s" : ""}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Driver Instructions */}
                <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 focus-within:border-black focus-within:bg-white transition-all">
                  <FileText size={14} className="text-zinc-400 shrink-0" />
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Instructions for driver (luggage, etc)"
                    className="flex-1 bg-transparent text-xs font-bold text-zinc-900 outline-none placeholder:text-zinc-400"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* DIVIDER */}
          <div className="h-px bg-zinc-100" />

          {/* ══ STEP 3: ROUTE INPUTS ══ */}
          <motion.div variants={stepVariants} initial="hidden" animate="visible" transition={{ delay: 0.15 }} className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-black">3</span>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Route Selection</p>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl">
              {/* Pickup location */}
              <div className="relative">
                <div className="flex items-center gap-3 px-4 py-3.5 focus-within:bg-white rounded-t-2xl transition">
                  <div className="w-2.5 h-2.5 rounded-full bg-black border-2 border-white shadow shrink-0" />
                  <input
                    value={pickup}
                    onFocus={() => setActiveInput("pickup")}
                    onChange={e => handleQueryChange(e.target.value, "pickup")}
                    placeholder="Enter pickup address"
                    className="flex-1 bg-transparent text-xs font-bold text-zinc-900 outline-none placeholder:text-zinc-400"
                  />
                  <motion.button
                    whileTap={{ scale: 0.90 }}
                    onClick={useCurrentLocation}
                    disabled={locating}
                    className="w-8 h-8 rounded-xl bg-zinc-200 hover:bg-zinc-300 transition flex items-center justify-center shrink-0"
                    title="Locate coordinates"
                  >
                    <LocateFixed size={13} className={`text-zinc-700 ${locating ? "animate-spin" : ""}`} />
                  </motion.button>
                </div>

                <AnimatePresence>
                  {activeInput === "pickup" && pickupResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-2xl shadow-2xl max-h-48 overflow-y-auto z-50 p-1"
                    >
                      {pickupResults.map(p => (
                        <motion.button
                          key={p.id}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => selectSuggestion(p, "pickup")}
                          className="w-full text-left text-xs font-semibold p-2.5 hover:bg-zinc-50 rounded-xl flex items-start gap-2 text-zinc-800 transition"
                        >
                          <MapPin size={12} className="text-zinc-400 shrink-0 mt-0.5" />
                          <span className="truncate">{p.address}</span>
                        </motion.button>
                      ))}
                      {searchError && (
                        <div className="p-3 text-xs text-zinc-500 font-medium text-center">
                          {searchError}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Separator Line */}
              <div className="h-px bg-zinc-200 mx-4" />

              {/* Drop location */}
              <div className="relative">
                <div className="flex items-center gap-3 px-4 py-3.5 focus-within:bg-white rounded-b-2xl transition">
                  <div className="w-2.5 h-2.5 rounded-sm bg-black border-2 border-white shadow shrink-0" />
                  <input
                    value={drop}
                    onFocus={() => setActiveInput("drop")}
                    onChange={e => handleQueryChange(e.target.value, "drop")}
                    placeholder="Enter destination address"
                    className="flex-1 bg-transparent text-xs font-bold text-zinc-900 outline-none placeholder:text-zinc-400"
                  />
                </div>

                <AnimatePresence>
                  {activeInput === "drop" && dropResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-2xl shadow-2xl max-h-48 overflow-y-auto z-50 p-1"
                    >
                      {dropResults.map(p => (
                        <motion.button
                          key={p.id}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => selectSuggestion(p, "drop")}
                          className="w-full text-left text-xs font-semibold p-2.5 hover:bg-zinc-50 rounded-xl flex items-start gap-2 text-zinc-800 transition"
                        >
                          <Navigation size={12} className="text-zinc-400 shrink-0 mt-0.5" />
                          <span className="truncate">{p.address}</span>
                        </motion.button>
                      ))}
                      {searchError && (
                        <div className="p-3 text-xs text-zinc-500 font-medium text-center">
                          {searchError}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Kashmir Quick Pins shortcuts */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[
                { name: "Chadoora (Budgam)", address: "Chadoora, Budgam, J&K", lat: 33.9189, lng: 74.7979, defaultType: "pickup" as const },
                { name: "Chanapora (Srinagar)", address: "Chanapora, Srinagar, J&K", lat: 34.0298, lng: 74.8052, defaultType: "drop" as const },
                { name: "Dal Lake (Srinagar)", address: "Dal Lake, Srinagar, J&K", lat: 34.0772, lng: 74.8727, defaultType: "drop" as const },
              ].map((item) => {
                const targetType = activeInput || item.defaultType;
                return (
                  <motion.button
                    key={item.name}
                    type="button"
                    whileTap={{ scale: 0.93 }}
                    onClick={() => selectShortcut(item.address, item.lat, item.lng, item.defaultType)}
                    className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all border ${
                      activeInput === "pickup"
                        ? "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700"
                        : activeInput === "drop"
                        ? "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                        : "bg-zinc-100 hover:bg-zinc-200 border-zinc-200/60 text-zinc-600"
                    }`}
                  >
                    {item.name} {activeInput ? `→ ${activeInput}` : ""}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* DIVIDER */}
          <div className="h-px bg-zinc-100" />

          {/* ══ STEP 4: SCHEDULING SELECTION ══ */}
          <motion.div variants={stepVariants} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-black">4</span>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Schedule Options</p>
            </div>

            <div className="flex bg-zinc-100 p-1 rounded-2xl mb-4">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setScheduleMode("now")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${scheduleMode === "now" ? "bg-white shadow-xs font-black text-black" : "text-gray-400"}`}
              >
                Book Now (Instant)
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setScheduleMode("later")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${scheduleMode === "later" ? "bg-white shadow-xs font-black text-black" : "text-gray-400"}`}
              >
                Schedule Ride
              </motion.button>
            </div>

            <AnimatePresence>
              {scheduleMode === "later" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-3"
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3">
                      <Calendar size={14} className="text-zinc-400" />
                      <input
                        type="date"
                        value={scheduleDate}
                        min={new Date().toISOString().split("T")[0]}
                        onChange={e => setScheduleDate(e.target.value)}
                        className="bg-transparent text-xs font-bold text-zinc-900 outline-none w-full"
                      />
                    </div>
                    <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3">
                      <Clock size={14} className="text-zinc-400" />
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={e => setScheduleTime(e.target.value)}
                        className="bg-transparent text-xs font-bold text-zinc-900 outline-none w-full"
                      />
                    </div>
                  </div>

                  {(() => {
                    if (!scheduleDate || !scheduleTime) return null;
                    const d = new Date(`${scheduleDate}T${scheduleTime}`);
                    if (isNaN(d.getTime())) return null;
                    return (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-emerald-50 border border-emerald-100 p-3 py-2.5 rounded-2xl text-[10px] text-emerald-800 font-bold flex items-center gap-2"
                      >
                        <Clock size={12} className="text-emerald-600 animate-pulse shrink-0" />
                        <span className="truncate">
                          Scheduled pickup: {d.toLocaleString("en-US", {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </motion.div>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

        </div>

        {/* Dynamic validation messages and booking confirm CTA */}
        <div className="p-6 bg-zinc-50 border-t border-zinc-200 space-y-4">
          <AnimatePresence>
            {validationError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-rose-50 border border-rose-100 p-3.5 rounded-2xl text-xs text-rose-600 font-bold flex items-start gap-2"
              >
                <Info size={14} className="shrink-0 mt-0.5" />
                <span>{validationError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleContinue}
            disabled={continuing}
            className="w-full h-14 bg-zinc-950 hover:bg-black text-white font-black rounded-2xl text-xs tracking-wider uppercase transition flex items-center justify-center gap-2 shadow-lg"
          >
            {continuing ? "Pre-routing..." : scheduleMode === "later" ? "Schedule Ride & Search Fares" : "Search Rates & Drivers"}
            <ArrowRight size={14} />
          </motion.button>
        </div>

      </div>

      {/* ── RIGHT PANEL: INTERACTIVE ROUTE MAP PREVIEW ── */}
      <div className="hidden lg:block lg:col-span-7 h-full relative z-0 bg-zinc-50">
        {pickupLat && pickupLng ? (
          <RouteMap
            pickup={pickup}
            drop={drop}
            pickupCoord={[pickupLat, pickupLng]}
            dropCoord={dropLat && dropLng ? [dropLat, dropLng] : null}
            previewMode={true}
            onDistance={() => {}}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-12 relative overflow-hidden bg-zinc-50">
            {/* Subtle premium radar / wave pulse */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ backgroundImage: "radial-gradient(circle, #e4e4e7 1px, transparent 1px)", backgroundSize: "32px 32px", opacity: 0.6 }}
            />
            <div className="absolute w-[500px] h-[500px] rounded-full border border-zinc-200/50 flex items-center justify-center animate-[ping_8s_infinite_ease-in-out]">
              <div className="w-[300px] h-[300px] rounded-full border border-zinc-200/70" />
            </div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-sm text-center relative z-10 space-y-6"
            >
              <div className="w-16 h-16 rounded-3xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-zinc-200/80 flex items-center justify-center mx-auto">
                <Compass size={24} className="text-zinc-400 animate-spin" style={{ animationDuration: '15s' }} />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-black tracking-tight text-zinc-800">Map Route Preview</h3>
                <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                  Enter a pickup address or choose a coordinate shortcut to initialize the Kashmir satellite route map.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </div>

    </div>
  );
}
