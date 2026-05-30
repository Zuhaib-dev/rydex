"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Suspense, useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  ArrowLeft, MapPin, Navigation,
  Bike, Car, Truck, Clock, Route,
  Zap, Search, RefreshCw, Star, Info,
  Compass, CreditCard, Ticket, Check
} from "lucide-react";
import VehicleBookingCard from "@/components/VehicleBookingCard";

const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });

type VehicleMeta = {
  label: string;
  Icon: typeof Bike;
};

type NearbyVehicle = {
  _id: string;
  type: "bike" | "auto" | "car" | "loading" | "truck";
  vehicleModel: string;
  vehicleNumber: string;
  imageUrl?: string;
  baseFare?: number;
  perKmRate?: number;
  waitingCharge?: number;
  distanceMeters?: number;
  distanceKm?: number;
  owner?:
    | {
        _id: string;
        name: string;
        ratingAverage?: number;
        ratingCount?: number;
        praiseTags?: Record<string, number>;
      }
    | string;
};

const VEHICLE_META: Record<string, VehicleMeta> = {
  bike:    { label: "Bike",    Icon: Bike  },
  auto:    { label: "Auto",    Icon: Car   },
  car:     { label: "Car",     Icon: Car   },
  loading: { label: "Loading", Icon: Truck },
  truck:   { label: "Truck",   Icon: Truck },
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

function estimateRoadKm(
  pickupLat: number,
  pickupLng: number,
  dropLat: number,
  dropLng: number,
) {
  if (
    !Number.isFinite(pickupLat) ||
    !Number.isFinite(pickupLng) ||
    !Number.isFinite(dropLat) ||
    !Number.isFinite(dropLng)
  ) {
    return null;
  }

  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthMeters = 6371000;
  const dLat = toRad(dropLat - pickupLat);
  const dLng = toRad(dropLng - pickupLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(pickupLat)) *
      Math.cos(toRad(dropLat)) *
      Math.sin(dLng / 2) ** 2;
  const straightMeters = 2 * earthMeters * Math.asin(Math.sqrt(a));
  return Math.round(((straightMeters * 1.15) / 1000) * 100) / 100;
}

function SearchContent() {
  const params = useSearchParams();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Search parameters & address states
  const [pickup, setPickup] = useState(params.get("pickup") || "");
  const [drop, setDrop] = useState(params.get("drop") || "");
  const [pickupLat, setPickupLat] = useState(Number(params.get("pickupLat")) || 0);
  const [pickupLng, setPickupLng] = useState(Number(params.get("pickupLng")) || 0);
  const [dropLat, setDropLat] = useState(Number(params.get("dropLat")) || 0);
  const [dropLng, setDropLng] = useState(Number(params.get("dropLng")) || 0);

  // Discovery UI States
  const [selectedType, setSelectedType] = useState<"bike" | "auto" | "car" | "loading" | "truck">(
    (params.get("vehicle") as any) || "car"
  );
  const [vehicles, setVehicles] = useState<NearbyVehicle[]>([]);
  const [nearbyCount, setNearbyCount] = useState(0);
  const [searchRadiusKm, setSearchRadiusKm] = useState<number | null>(null);
  const [km, setKm] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [lockingFare, setLockingFare] = useState(false);

  // Autocomplete suggestions state
  const [activeInput, setActiveInput] = useState<"pickup" | "drop" | null>(null);
  const [suggestions, setSuggestions] = useState<{ name: string; lat: number; lng: number }[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);

  // Bottom Sheet Height state for mobile (peeking, half-height, or fully-expanded)
  const [sheetState, setSheetState] = useState<"peek" | "half" | "full">("half");

  const [paymentMethod, setPaymentMethod] = useState<"card" | "upi" | "cash">("upi");
  const [couponCode, setCouponCode] = useState("");
  const [discountApplied, setDiscountApplied] = useState(false);

  const [notification, setNotification] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const meta = VEHICLE_META[selectedType];
  const fallbackTripKm = useMemo(
    () => estimateRoadKm(pickupLat, pickupLng, dropLat, dropLng),
    [pickupLat, pickupLng, dropLat, dropLng],
  );
  const tripKm = km ?? fallbackTripKm;
  const eta = tripKm !== null ? Math.max(3, Math.round((tripKm / 25) * 60)) : null;

  const hasPickupCoordinates = Number.isFinite(pickupLat) && Number.isFinite(pickupLng) && pickupLat !== 0;
  const hasRouteCoordinates = hasPickupCoordinates && Number.isFinite(dropLat) && Number.isFinite(dropLng) && dropLat !== 0;

  // Nearby vehicles fetcher
  const fetchNearbyVehicles = useCallback(async (lat: number, lng: number, type: string) => {
    try {
      setLoading(true);
      const res = await fetch("/api/vehicles/nearby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lng, vehicleType: type }),
      });
      const data = await res.json();
      if (data.success) {
        const list = (data.vehicles || []).sort(
          (a: { distanceMeters?: number }, b: { distanceMeters?: number }) =>
            (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0),
        );
        setVehicles(list);
        setNearbyCount(data.nearbyCount ?? list.length);
        setSearchRadiusKm(data.searchRadiusKm ?? null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasPickupCoordinates) return;
    fetchNearbyVehicles(pickupLat, pickupLng, selectedType);
  }, [fetchNearbyVehicles, hasPickupCoordinates, pickupLat, pickupLng, selectedType]);

  // Autocomplete Geocoding lookup
  const handleQueryChange = async (query: string, inputType: "pickup" | "drop") => {
    if (inputType === "pickup") setPickup(query);
    else setDrop(query);

    if (!query || query.length < 3 || !MAPBOX_TOKEN) {
      setSuggestions([]);
      return;
    }

    try {
      setSuggestLoading(true);
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=5`
      );
      const data = await res.json();
      if (data.features) {
        const list = data.features.map((f: any) => {
          const [lng, lat] = f.center;
          return { name: f.place_name, lat, lng };
        });
        setSuggestions(list);
      }
    } catch (err) {
      console.warn("Geocoding failed:", err);
    } finally {
      setSuggestLoading(false);
    }
  };

  // Click handler for suggestions
  const selectSuggestion = (item: { name: string; lat: number; lng: number }) => {
    if (activeInput === "pickup") {
      setPickup(item.name);
      setPickupLat(item.lat);
      setPickupLng(item.lng);
      fetchNearbyVehicles(item.lat, item.lng, selectedType);
    } else {
      setDrop(item.name);
      setDropLat(item.lat);
      setDropLng(item.lng);
    }
    setSuggestions([]);
    setActiveInput(null);
  };

  const selectShortcut = (address: string, lat: number, lng: number, inputType: "pickup" | "drop") => {
    if (inputType === "pickup") {
      setPickup(address);
      setPickupLat(lat);
      setPickupLng(lng);
      fetchNearbyVehicles(lat, lng, selectedType);
    } else {
      setDrop(address);
      setDropLat(lat);
      setDropLng(lng);
    }
    triggerToast(`Set ${inputType} to ${address}`);
  };

  // Current location geolocator
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setPickupLat(latitude);
        setPickupLng(longitude);
        setPickup("Current Coordinates Location");
        fetchNearbyVehicles(latitude, longitude, selectedType);

        if (MAPBOX_TOKEN) {
          try {
            const res = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}&limit=1`
            );
            const data = await res.json();
            if (data.features?.length) {
              setPickup(data.features[0].place_name);
            }
          } catch {
            /* ignore */
          }
        }
      },
      () => {
        alert("Failed to access your device location");
      }
    );
  };

  // Lock Fare Booking Handler
  const handleBooking = async () => {
    if (vehicles.length === 0) return;
    const v = vehicles[0];
    if (!hasRouteCoordinates) {
      alert("Please select both Pickup and Drop locations first.");
      return;
    }
    try {
      setLockingFare(true);
      const res = await fetch("/api/booking/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickupAddress: pickup,
          dropAddress: drop,
          pickupLat,
          pickupLng,
          dropLat,
          dropLng,
          vehicleId: v._id,
          driverId: typeof v.owner === "object" ? v.owner?._id : v.owner,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.quoteId) {
        alert(data.message || "Could not lock fare");
        return;
      }
      const url = new URLSearchParams({
        quoteId: data.quoteId,
        mobileNumber: params.get("mobileNumber") || "",
      });
      router.push(`/checkout?${url.toString()}`);
    } catch {
      alert("Could not lock fare. Try again.");
    } finally {
      setLockingFare(false);
    }
  };

  if (!mounted) {
    return <div className="min-h-screen bg-zinc-50" />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 grid grid-cols-1 lg:grid-cols-12 h-screen overflow-hidden">
      
      {/* ── ALERTS NOTIFICATION POPUP ── */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-6 py-3 rounded-full text-xs font-bold shadow-2xl flex items-center gap-2"
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* ── LEFT SIDEBAR (DESKTOP CONTROL CENTER) ── */}
      <div className="hidden lg:flex lg:col-span-4 bg-white border-r border-zinc-200 z-10 flex-col h-full overflow-y-auto shadow-2xl relative">
        {/* Top Header */}
        <div className="p-6 border-b border-zinc-100 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 transition"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tight text-zinc-900">Rydex Discovery</h1>
            <p className="text-3xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Secure Fares & Drivers</p>
          </div>
        </div>

        {/* Dynamic Route Inputs */}
        <div className="p-6 border-b border-zinc-100 space-y-4">
          <div className="relative">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Pickup Location</label>
            <div className="relative">
              <input
                type="text"
                value={pickup}
                onFocus={() => setActiveInput("pickup")}
                onChange={(e) => handleQueryChange(e.target.value, "pickup")}
                placeholder="Enter pickup address..."
                className="w-full text-xs font-bold bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-3 pr-8 focus:ring-black focus:border-black"
              />
              <button
                onClick={useCurrentLocation}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black transition"
                title="Use current location"
              >
                <Compass size={14} />
              </button>
            </div>
          </div>

          <div className="relative">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Dropoff Location</label>
            <input
              type="text"
              value={drop}
              onFocus={() => setActiveInput("drop")}
              onChange={(e) => handleQueryChange(e.target.value, "drop")}
              placeholder="Enter destination address..."
              className="w-full text-xs font-bold bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-3 focus:ring-black focus:border-black"
            />
          </div>

          {/* Autocomplete Suggestions Box */}
          <AnimatePresence>
            {activeInput && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute left-6 right-6 z-50 bg-white border border-zinc-200 rounded-2xl shadow-2xl p-2 max-h-60 overflow-y-auto"
              >
                {suggestLoading && (
                  <div className="p-3 text-center text-xs text-zinc-400">Loading suggestions...</div>
                )}
                {suggestions.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectSuggestion(item)}
                    className="w-full text-left text-xs font-semibold p-2.5 hover:bg-zinc-50 rounded-xl flex items-start gap-2 text-zinc-800 transition"
                  >
                    <MapPin size={13} className="text-zinc-400 shrink-0 mt-0.5" />
                    <span className="truncate">{item.name}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Saved places shortcuts */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => selectShortcut("Chadoora, Budgam, J&K", 33.9189, 74.7979, "pickup")}
              className="px-3 py-1.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-3xs font-black uppercase tracking-wider rounded-lg text-zinc-600 transition"
            >
              📍 Chadoora (Budgam)
            </button>
            <button
              onClick={() => selectShortcut("Chanapora, Srinagar, J&K", 34.0298, 74.8052, "drop")}
              className="px-3 py-1.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-3xs font-black uppercase tracking-wider rounded-lg text-zinc-600 transition"
            >
              📍 Chanapora (Srinagar)
            </button>
            <button
              onClick={() => selectShortcut("Dal Lake, Srinagar, J&K", 34.0772, 74.8727, "drop")}
              className="px-3 py-1.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-3xs font-black uppercase tracking-wider rounded-lg text-zinc-600 transition"
            >
              ⛵ Dal Lake (Srinagar)
            </button>
          </div>
        </div>

        {/* Categories Tab Selector */}
        <div className="p-6 border-b border-zinc-100">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-3">Vehicle Categories</label>
          <div className="grid grid-cols-5 gap-2 bg-zinc-100 p-1 rounded-2xl">
            {(["bike", "auto", "car", "loading", "truck"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`py-2 rounded-xl flex flex-col items-center gap-1 transition ${
                  selectedType === type ? "bg-white shadow-xs text-black font-black" : "text-gray-400 hover:text-black"
                }`}
              >
                {type === "bike" && <Bike size={14} />}
                {type === "auto" && <Car size={14} />}
                {type === "car" && <Car size={14} />}
                {type === "loading" && <Truck size={14} />}
                {type === "truck" && <Truck size={14} />}
                <span className="text-[9px] capitalize">{type}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Vehicle Selection Roster List */}
        <div className="p-6 flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Available Quotes</h3>
            <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-bold">
              {vehicles.length > 0 ? "Best price locked" : "No vehicle"}
            </span>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-400 text-xs">
                <RefreshCw size={20} className="animate-spin text-zinc-300" />
                Searching best quotes nearby...
              </div>
            ) : vehicles.length > 0 ? (
              <VehicleBookingCard
                vehicle={vehicles[0]}
                bookingDisabled={lockingFare}
                distanceKm={tripKm ?? undefined}
                isRecommended={true}
                onBook={handleBooking}
              />
            ) : (
              <div className="border border-dashed border-zinc-200 p-8 rounded-3xl text-center text-xs text-zinc-400">
                No nearby drivers matching category found. Try adjusting radius or swapping category.
              </div>
            )}
          </div>
        </div>

        {/* Payment & Coupon footer splits */}
        <div className="p-6 bg-zinc-50 border-t border-zinc-200 space-y-4">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard size={14} />
              Payment Method
            </span>
            <div className="flex bg-zinc-200/60 p-0.5 rounded-lg text-3xs">
              <button
                onClick={() => setPaymentMethod("upi")}
                className={`px-2 py-1 rounded transition ${paymentMethod === "upi" ? "bg-white shadow-xs font-black" : "text-gray-500"}`}
              >
                UPI
              </button>
              <button
                onClick={() => setPaymentMethod("card")}
                className={`px-2 py-1 rounded transition ${paymentMethod === "card" ? "bg-white shadow-xs font-black" : "text-gray-500"}`}
              >
                Card
              </button>
              <button
                onClick={() => setPaymentMethod("cash")}
                className={`px-2 py-1 rounded transition ${paymentMethod === "cash" ? "bg-white shadow-xs font-black" : "text-gray-500"}`}
              >
                Cash
              </button>
            </div>
          </div>

          {/* Coupon inputs */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Apply Coupon (e.g. RYDEX50)"
                className="w-full text-xs font-bold bg-white border border-zinc-200 rounded-xl px-3 py-2 focus:ring-black focus:border-black uppercase"
              />
            </div>
            <button
              onClick={() => {
                if (couponCode.toUpperCase() === "RYDEX50") {
                  setDiscountApplied(true);
                  triggerToast("Coupon RYDEX50 applied! 50% discount locked.");
                } else {
                  triggerToast("Invalid Coupon Code");
                }
              }}
              className="px-4 bg-zinc-900 hover:bg-black text-white text-xs font-bold rounded-xl transition"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL (MAP VIEWPORT) ── */}
      <div className="col-span-12 lg:col-span-8 h-full relative z-0">
        
        {/* Back button override for Mobile (floating) */}
        <div className="absolute top-5 left-5 z-40 lg:hidden">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => router.back()}
            className="w-11 h-11 rounded-full bg-white border border-zinc-200 shadow-md flex items-center justify-center hover:bg-zinc-50"
          >
            <ArrowLeft size={17} className="text-zinc-900" />
          </motion.button>
        </div>

        {/* Route Map WebGL Layer */}
        <div className="absolute inset-0 z-0">
          <RouteMap
            pickup={pickup}
            drop={drop}
            pickupCoord={hasPickupCoordinates ? [pickupLat, pickupLng] : null}
            dropCoord={hasRouteCoordinates ? [dropLat, dropLng] : null}
            previewMode
            onDistance={setKm}
            onChange={(p, d) => {
              setPickup(p);
              setDrop(d);
            }}
          />
        </div>

        {/* Dynamic Route Metrics Overlay HUD (Floating) */}
        <AnimatePresence>
          {hasRouteCoordinates && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-5 left-1/2 -translate-x-1/2 flex items-center gap-2 z-40"
            >
              <div className="flex items-center gap-2 bg-black/90 backdrop-blur-md border border-white/10 shadow-2xl px-4 py-2 rounded-full text-2xs font-bold text-white tracking-widest uppercase">
                <Route size={12} className="text-emerald-400" />
                <span>{tripKm ? `${tripKm} km` : "Calculating…"}</span>
              </div>
              <div className="flex items-center gap-2 bg-black/90 backdrop-blur-md border border-white/10 shadow-2xl px-4 py-2 rounded-full text-2xs font-bold text-white tracking-widest uppercase">
                <Clock size={12} className="text-blue-400 animate-pulse" />
                <span>{eta ? `${eta} min ETA` : "—"}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── MOBILE / TABLET OVERLAY SHEET ── */}
        <div className="lg:hidden absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end bg-transparent pointer-events-none">
          <motion.div
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-t-[32px] shadow-2xl border-t border-zinc-200 p-5 pb-12 pointer-events-auto flex flex-col gap-4"
          >
            {/* Drag Handle HUD */}
            <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto" />

            {/* Inputs summary */}
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 font-bold uppercase tracking-wider">Route summary</span>
                <span className="text-3xs font-black bg-zinc-200 px-2 py-0.5 rounded-full">{tripKm ? `${tripKm} km` : "—"}</span>
              </div>
              <p className="text-xs font-bold text-zinc-800 truncate">From: {pickup || "—"}</p>
              <p className="text-xs font-bold text-zinc-800 truncate">To: {drop || "—"}</p>
            </div>

            {/* Selector list for Mobile */}
            <div className="grid grid-cols-5 gap-1 bg-zinc-100 p-1 rounded-xl">
              {(["bike", "auto", "car", "loading", "truck"] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`py-1.5 rounded-lg flex flex-col items-center gap-1 transition ${
                    selectedType === type ? "bg-white shadow-xs text-black font-black" : "text-gray-400"
                  }`}
                >
                  <span className="text-[10px] capitalize">{type}</span>
                </button>
              ))}
            </div>

            {/* Quote details & checkout */}
            {loading ? (
              <div className="py-6 text-center text-xs text-zinc-400 animate-pulse">Searching nearby rides...</div>
            ) : vehicles.length > 0 ? (
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center bg-zinc-50 border border-zinc-100 p-3 rounded-2xl">
                  <div>
                    <h4 className="text-xs font-black text-gray-900">{vehicles[0].vehicleModel}</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">{vehicles[0].vehicleNumber}</p>
                  </div>
                  <span className="text-base font-black text-zinc-900 font-mono">₹{Math.round((vehicles[0].baseFare || 0) + (tripKm || 0) * (vehicles[0].perKmRate || 0))}</span>
                </div>
                <button
                  onClick={handleBooking}
                  disabled={lockingFare}
                  className="w-full py-4 bg-zinc-950 hover:bg-black text-white font-black rounded-2xl text-xs transition"
                >
                  {lockingFare ? "Locking fare..." : "Book Ride"}
                </button>
              </div>
            ) : (
              <div className="p-4 border border-dashed rounded-2xl text-center text-xs text-zinc-400">No vehicles available nearby.</div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-100" />}>
      <SearchContent />
    </Suspense>
  );
}
