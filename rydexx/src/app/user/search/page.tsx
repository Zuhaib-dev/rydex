"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { getMapProps, OLA_MAPS_API_KEY } from "@/lib/mapConfig";
import { sortKashmirResultsFirst, KASHMIR_CENTER_LAT, KASHMIR_CENTER_LNG, KASHMIR_RADIUS_METERS } from "@/lib/kashmirBias";
import { motion, AnimatePresence } from "framer-motion";
import { Suspense, useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  ArrowLeft, MapPin,
  Bike, Car, Truck, Clock, Route,
  RefreshCw, Info,
  Compass, CreditCard, Loader2
} from "lucide-react";
import VehicleBookingCard from "@/components/VehicleBookingCard";
import { getSocket } from "@/lib/socket";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });

type VehicleType = "bike" | "auto" | "car" | "loading" | "truck";

const VEHICLE_TYPES: readonly VehicleType[] = ["bike", "auto", "car", "loading", "truck"];

type NearbyVehicle = {
  _id: string;
  type: VehicleType;
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



type MapboxFeature = {
  place_name: string;
  center: [number, number];
};

function parseVehicleType(value: string | null): VehicleType {
  return VEHICLE_TYPES.includes(value as VehicleType)
    ? (value as VehicleType)
    : "car";
}

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

  // Kashmir bounding box coordinates alignment
  const isInKashmir = (lat: number, lng: number) =>
    lat >= 32.15 && lat <= 35.55 && lng >= 73.05 && lng <= 80.15;

  const factor = isInKashmir(pickupLat, pickupLng) || isInKashmir(dropLat, dropLng) ? 1.35 : 1.15;

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
  return Math.round(((straightMeters * factor) / 1000) * 100) / 100;
}

function SearchContent() {
  const params = useSearchParams();
  const router = useRouter();
  const userData = useSelector((state: RootState) => state.user.userData);

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
  const [selectedType, setSelectedType] = useState<VehicleType>(
    parseVehicleType(params.get("vehicle"))
  );
  const [vehicles, setVehicles] = useState<NearbyVehicle[]>([]);
  const [nearbyCount, setNearbyCount] = useState(0);
  const [searchRadiusKm, setSearchRadiusKm] = useState<number | null>(null);
  const [km, setKm] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshingAvailability, setRefreshingAvailability] = useState(false);
  const [lockingFare, setLockingFare] = useState(false);

  // Autocomplete suggestions state
  const [activeInput, setActiveInput] = useState<"pickup" | "drop" | null>(null);
  const [suggestions, setSuggestions] = useState<{ name: string; lat: number; lng: number }[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);

  // Bottom Sheet Height state for mobile (peeking, half-height, or fully-expanded)
  const [paymentMethod, setPaymentMethod] = useState<"card" | "upi" | "cash">("upi");
  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const [notification, setNotification] = useState<string | null>(null);
  // Geo-fence state — set when quote API returns cashOnly flag
  const [cashOnlyZone, setCashOnlyZone] = useState<{ reason: string; zoneName?: string } | null>(null);

  const triggerToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const fallbackTripKm = useMemo(
    () => estimateRoadKm(pickupLat, pickupLng, dropLat, dropLng),
    [pickupLat, pickupLng, dropLat, dropLng],
  );
  const rawTripKm = km ?? fallbackTripKm;
  const tripKm = rawTripKm !== null ? Number(rawTripKm.toFixed(1)) : null;
  const eta = tripKm !== null ? Math.max(3, Math.round((tripKm / 25) * 60)) : null;

  const hasPickupCoordinates = Number.isFinite(pickupLat) && Number.isFinite(pickupLng) && pickupLat !== 0;
  const hasRouteCoordinates = hasPickupCoordinates && Number.isFinite(dropLat) && Number.isFinite(dropLng) && dropLat !== 0;

  // Nearby vehicles fetcher
  const fetchNearbyVehicles = useCallback(async (
    lat: number,
    lng: number,
    type: string,
    options: { silent?: boolean } = {},
  ) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0) return;

    try {
      if (options.silent) {
        setRefreshingAvailability(true);
      } else {
        setLoading(true);
      }
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
      setRefreshingAvailability(false);
    }
  }, []);

  useEffect(() => {
    if (!hasPickupCoordinates) return;
    fetchNearbyVehicles(pickupLat, pickupLng, selectedType);
  }, [fetchNearbyVehicles, hasPickupCoordinates, pickupLat, pickupLng, selectedType]);

  useEffect(() => {
    if (!hasPickupCoordinates) return;

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const refreshNearby = () => {
      if (refreshTimer) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        void fetchNearbyVehicles(pickupLat, pickupLng, selectedType, { silent: true });
      }, 250);
    };

    const socket = getSocket();
    socket.on("driver-availability-updated", refreshNearby);
    socket.on("connect", refreshNearby);

    const interval = window.setInterval(refreshNearby, 5000);
    const handleVisibility = () => {
      if (!document.hidden) refreshNearby();
    };
    window.addEventListener("focus", refreshNearby);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshNearby);
      document.removeEventListener("visibilitychange", handleVisibility);
      socket.off("driver-availability-updated", refreshNearby);
      socket.off("connect", refreshNearby);
    };
  }, [fetchNearbyVehicles, hasPickupCoordinates, pickupLat, pickupLng, selectedType]);

  // Autocomplete Geocoding lookup
  const handleQueryChange = async (query: string, inputType: "pickup" | "drop") => {
    if (inputType === "pickup") {
      setPickup(query);
      setPickupLat(0);
      setPickupLng(0);
    } else {
      setDrop(query);
      setDropLat(0);
      setDropLng(0);
    }

    if (!query || query.trim().length < 1 || !OLA_MAPS_API_KEY) {
      setSuggestions([]);
      return;
    }

    try {
      setSuggestLoading(true);
      const res = await fetch(
        `https://api.olamaps.io/places/v1/autocomplete?input=${encodeURIComponent(query.trim())}&api_key=${OLA_MAPS_API_KEY}&location=${KASHMIR_CENTER_LAT},${KASHMIR_CENTER_LNG}&radius=${KASHMIR_RADIUS_METERS}`
      );
      const data = await res.json();
      if (data.predictions) {
        const list: { name: string; lat: number; lng: number }[] = data.predictions.map((f: any) => {
          return { name: f.description as string, lat: (f.geometry?.location?.lat || 0) as number, lng: (f.geometry?.location?.lng || 0) as number };
        });

        const sorted = sortKashmirResultsFirst(list).slice(0, 5);

        setSuggestions(sorted);
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

  const selectShortcut = (address: string, lat: number, lng: number, defaultType: "pickup" | "drop") => {
    const targetType = activeInput || defaultType;
    if (targetType === "pickup") {
      setPickup(address);
      setPickupLat(lat);
      setPickupLng(lng);
      fetchNearbyVehicles(lat, lng, selectedType);
    } else {
      setDrop(address);
      setDropLat(lat);
      setDropLng(lng);
    }
    triggerToast(`Set ${targetType} shortcut: ${address.split(",")[0]}`);
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

        if (OLA_MAPS_API_KEY) {
          try {
            const res = await fetch(
              `https://api.olamaps.io/places/v1/reverse-geocode?latlng=${latitude},${longitude}&api_key=${OLA_MAPS_API_KEY}`
            );
            const data = await res.json();
            if (data.results?.length) {
              setPickup(data.results[0].formatted_address);
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

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    if (vehicles.length === 0) {
      triggerToast("No vehicle available to apply coupon");
      return;
    }
    
    setApplyingCoupon(true);
    setCouponError(null);
    
    const estFare = Math.round((vehicles[0].baseFare || 0) + (tripKm || 0) * (vehicles[0].perKmRate || 0));
    
    try {
      const res = await fetch(`/api/coupon/validate?code=${encodeURIComponent(couponCode.trim())}&fare=${estFare}`);
      const data = await res.json();
      
      if (res.ok && data.success) {
        setAppliedCoupon(data.code);
        setDiscountAmount(data.discountAmount);
        triggerToast(`Coupon ${data.code} applied! ₹${data.discountAmount} discount.`);
      } else {
        setAppliedCoupon(null);
        setDiscountAmount(0);
        setCouponError(data.message || "Invalid coupon code");
        triggerToast(data.message || "Invalid coupon code");
      }
    } catch (err) {
      console.error(err);
      setAppliedCoupon(null);
      setDiscountAmount(0);
      setCouponError("Failed to validate coupon");
      triggerToast("Failed to validate coupon");
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleClearCoupon = () => {
    setCouponCode("");
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponError(null);
    triggerToast("Coupon cleared");
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
          passengers: Number(params.get("passengers")) || 1,
          notes: params.get("notes") || "",
          scheduledAt: params.get("scheduledAt") || undefined,
          promoCode: appliedCoupon || undefined,
        }),
      });
      const data = await res.json();

      // Geo-fence: blocked zone
      if (res.status === 403 && data.code === "GEO_BLOCKED") {
        alert(`🚫 ${data.message}`);
        return;
      }

      if (!res.ok || !data.quoteId) {
        alert(data.message || "Could not lock fare");
        return;
      }

      // Geo-fence: cash-only zone — update payment method and show notice
      if (data.cashOnly) {
        setPaymentMethod("cash");
        setCashOnlyZone({ reason: data.cashOnlyReason, zoneName: data.cashOnlyZone });
      } else {
        setCashOnlyZone(null);
      }

      const url = new URLSearchParams({
        quoteId: data.quoteId,
        mobileNumber: params.get("mobileNumber") || "",
        ...(data.cashOnly ? { cashOnly: "true" } : {}),
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
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 transition"
          >
            <ArrowLeft size={16} />
          </motion.button>
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
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={useCurrentLocation}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black transition"
                title="Use current location"
              >
                <Compass size={14} />
              </motion.button>
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
                  <motion.button
                    key={idx}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => selectSuggestion(item)}
                    className="w-full text-left text-xs font-semibold p-2.5 hover:bg-zinc-50 rounded-xl flex items-start gap-2 text-zinc-800 transition"
                  >
                    <MapPin size={13} className="text-zinc-400 shrink-0 mt-0.5" />
                    <span className="truncate">{item.name}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Saved places shortcuts */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {[
              ...(userData?.savedPlaces || []).map((p: any) => ({
                name: p.label, address: p.address, lat: p.lat, lng: p.lng, defaultType: "pickup" as const
              })),
              { name: "Chadoora (Budgam)", address: "Chadoora, Budgam, J&K", lat: 33.9189, lng: 74.7979, defaultType: "pickup" as const },
              { name: "Chanapora (Srinagar)", address: "Chanapora, Srinagar, J&K", lat: 34.0298, lng: 74.8052, defaultType: "drop" as const },
              { name: "Dal Lake (Srinagar)", address: "Dal Lake, Srinagar, J&K", lat: 34.0772, lng: 74.8727, defaultType: "drop" as const },
            ].map((item, idx) => {
              const targetType = activeInput || item.defaultType;
              return (
                <motion.button
                  key={`${item.name}-${idx}`}
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
        </div>

        {/* Categories Tab Selector */}
        <div className="p-6 border-b border-zinc-100">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-3">Vehicle Categories</label>
          <div className="grid grid-cols-5 gap-2 bg-zinc-100 p-1 rounded-2xl">
            {(["bike", "auto", "car", "loading", "truck"] as const).map((type) => (
              <motion.button
                key={type}
                whileTap={{ scale: 0.94 }}
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
              </motion.button>
            ))}
          </div>
        </div>

        {/* Vehicle Selection Roster List */}
        <div className="p-6 flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Available Quotes</h3>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
              {refreshingAvailability && <RefreshCw size={9} className="animate-spin" />}
              {refreshingAvailability
                ? "Live updating"
                : vehicles.length > 0
                  ? `${nearbyCount} nearby within ${searchRadiusKm ?? "?"} km`
                  : "No vehicle"}
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
                discountAmount={discountAmount}
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

          {/* Cash-Only Zone Notice Banner */}
          <AnimatePresence>
            {cashOnlyZone && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3"
              >
                <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider">Cash-Only Zone{cashOnlyZone.zoneName ? ` — ${cashOnlyZone.zoneName}` : ""}</p>
                  <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">{cashOnlyZone.reason}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard size={14} />
              Payment Method
            </span>
            <div className="flex bg-zinc-200/60 p-0.5 rounded-lg text-3xs">
              <motion.button
                whileTap={!cashOnlyZone ? { scale: 0.95 } : undefined}
                onClick={() => !cashOnlyZone && setPaymentMethod("upi")}
                disabled={!!cashOnlyZone}
                className={`px-2 py-1 rounded transition ${paymentMethod === "upi" ? "bg-white shadow-xs font-black" : "text-gray-500"} ${cashOnlyZone ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                UPI
              </motion.button>
              <motion.button
                whileTap={!cashOnlyZone ? { scale: 0.95 } : undefined}
                onClick={() => !cashOnlyZone && setPaymentMethod("card")}
                disabled={!!cashOnlyZone}
                className={`px-2 py-1 rounded transition ${paymentMethod === "card" ? "bg-white shadow-xs font-black" : "text-gray-500"} ${cashOnlyZone ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                Card
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setPaymentMethod("cash")}
                className={`px-2 py-1 rounded transition ${paymentMethod === "cash" ? "bg-white shadow-xs font-black" : "text-gray-500"}`}
              >
                Cash
              </motion.button>
            </div>
          </div>

          {/* Coupon inputs */}
          <div className="space-y-1.5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Apply Coupon (e.g. RYDEX50)"
                  disabled={!!appliedCoupon || applyingCoupon}
                  className="w-full text-xs font-bold bg-white border border-zinc-200 rounded-xl px-3 py-2 focus:ring-black focus:border-black uppercase disabled:opacity-60"
                />
              </div>
              {appliedCoupon ? (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleClearCoupon}
                  className="px-4 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 text-xs font-bold rounded-xl transition"
                >
                  Clear
                </motion.button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleApplyCoupon}
                  disabled={applyingCoupon}
                  className="px-4 bg-zinc-900 hover:bg-black disabled:opacity-50 text-white text-xs font-bold rounded-xl transition"
                >
                  {applyingCoupon ? "Applying..." : "Apply"}
                </motion.button>
              )}
            </div>
            {couponError && (
              <p className="text-[10px] text-red-600 font-bold ml-1">{couponError}</p>
            )}
            {appliedCoupon && (
              <p className="text-[10px] text-green-600 font-bold ml-1">
                ✓ Coupon {appliedCoupon} applied (Saved ₹{discountAmount})
              </p>
            )}
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
                <motion.button
                  key={type}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedType(type)}
                  className={`py-1.5 rounded-lg flex flex-col items-center gap-1 transition ${
                    selectedType === type ? "bg-white shadow-xs text-black font-black" : "text-gray-400"
                  }`}
                >
                  <span className="text-[10px] capitalize">{type}</span>
                </motion.button>
              ))}
            </div>

            {/* Quote details & checkout */}
            {loading ? (
              <div className="py-6 text-center text-xs text-zinc-400 animate-pulse">Searching nearby rides...</div>
            ) : vehicles.length > 0 ? (
              <div className="flex flex-col gap-3">
                {refreshingAvailability && (
                  <div className="flex items-center justify-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    <RefreshCw size={11} className="animate-spin" />
                    Live updating partners
                  </div>
                )}
                <div className="flex justify-between items-center bg-zinc-50 border border-zinc-100 p-3 rounded-2xl">
                  <div>
                    <h4 className="text-xs font-black text-gray-900">{vehicles[0].vehicleModel}</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">{vehicles[0].vehicleNumber}</p>
                  </div>
                  <span className="text-base font-black text-zinc-900 font-mono">
                    {discountAmount > 0 ? (
                      <span className="flex items-center gap-1.5">
                        <span className="text-zinc-400 text-xs font-bold line-through">
                          ₹{Math.round((vehicles[0].baseFare || 0) + (tripKm || 0) * (vehicles[0].perKmRate || 0))}
                        </span>
                        <span>
                          ₹{Math.max(0, Math.round((vehicles[0].baseFare || 0) + (tripKm || 0) * (vehicles[0].perKmRate || 0) - discountAmount))}
                        </span>
                      </span>
                    ) : (
                      `₹${Math.round((vehicles[0].baseFare || 0) + (tripKm || 0) * (vehicles[0].perKmRate || 0))}`
                    )}
                  </span>
                </div>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleBooking}
                  disabled={lockingFare}
                  className="flex-1 bg-zinc-900 text-white text-sm font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-black transition-colors disabled:opacity-70 disabled:cursor-wait"
                >
                  {lockingFare ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Securing...</span>
                    </>
                  ) : (
                    "Book Ride"
                  )}
                </motion.button>
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
