"use client";

import dynamic from "next/dynamic";
import {
  Phone,
  User2,
  Car,
  IndianRupee,
  ChevronUp,
  Clock,
  Zap,
  CheckCircle2,
  KeyRound,
  ArrowRight,
  MapPin,
  Navigation,
  MessageCircle,
  AlertCircle,
  XCircle,
  Star,
} from "lucide-react";
import { getSocket } from "@/lib/socket";
import { useBookingRealtime } from "@/hooks/useBookingRealtime";
import type { RealtimeToast } from "@/hooks/useBookingRealtime";
import RideToasts from "@/components/ride/RideToasts";
import { snapToRoute, checkRouteDeviation } from "@/lib/routeDeviation";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IUser } from "@/models/user.model";
import { IVehicle } from "@/models/vehicle.model";
import RideChat from "@/components/RideChat";

const LiveRideMap = dynamic(() => import("@/components/LiveTrackingMap"), {
  ssr: false,
});

/* ─── TYPES ──────────────────────────────────────────────────────────── */
export type BookingStatus =
  | "requested"
  | "awaiting_payment"
  | "confirmed"
  | "arriving"
  | "arrived"
  | "started"
  | "completed"
  | "cancelled"
  | "rejected"
  | "expired";

export type PaymentStatus = "pending" | "paid" | "cash" | "failed";

export interface IBooking {
  _id: string;
  user: IUser;
  driver: IUser;
  vehicle: IVehicle;
  pickupAddress: string;
  dropAddress: string;
  pickupLocation?: { type: "Point"; coordinates: [number, number] };
  dropLocation?: { type: "Point"; coordinates: [number, number] };
  routePolyline?: GeoJSON.LineString;
  fare: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  pickupOtp?: string;
  dropOtp?: string;
  paymentDeadline?: Date;
  userMobileNumber: string;
  driverMobileNumber: string;
  createdAt: Date;
  updatedAt: Date;
}

/* ─── CONFIG ──────────────────────────────────────────────────────────── */
const MAP_STATUS: Record<BookingStatus, "arriving" | "ongoing" | "completed"> =
  {
    requested: "arriving",
    awaiting_payment: "arriving",
    confirmed: "arriving",
    arriving: "arriving",
    arrived: "arriving",
    started: "ongoing",
    completed: "completed",
    cancelled: "completed",
    rejected: "completed",
    expired: "completed",
  };

const STATUS_LABEL: Record<
  BookingStatus,
  { label: string; sublabel: string; dot: string }
> = {
  requested: {
    label: "Awaiting Confirmation",
    sublabel: "Booking is being processed",
    dot: "bg-amber-400",
  },
  awaiting_payment: {
    label: "Payment Pending",
    sublabel: "Customer payment is pending",
    dot: "bg-purple-400",
  },
  confirmed: {
    label: "Heading to Pickup",
    sublabel: "Drive to the pickup location",
    dot: "bg-amber-400",
  },
  arriving: {
    label: "Heading to Pickup",
    sublabel: "Drive to the pickup location",
    dot: "bg-amber-400",
  },
  arrived: {
    label: "At Pickup",
    sublabel: "Verify pickup OTP to start",
    dot: "bg-blue-400",
  },
  started: {
    label: "Ride in Progress",
    sublabel: "Heading to drop location",
    dot: "bg-emerald-400",
  },
  completed: {
    label: "Ride Completed",
    sublabel: "Trip has ended successfully",
    dot: "bg-zinc-400",
  },
  cancelled: {
    label: "Ride Cancelled",
    sublabel: "This ride was cancelled",
    dot: "bg-red-400",
  },
  rejected: {
    label: "Ride Rejected",
    sublabel: "Ride was rejected",
    dot: "bg-red-400",
  },
  expired: {
    label: "Request Expired",
    sublabel: "Booking timed out",
    dot: "bg-orange-400",
  },
};

const PAYMENT_BADGE: Record<PaymentStatus, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-700" },
  paid: { label: "Paid", cls: "bg-emerald-100 text-emerald-700" },
  cash: { label: "Cash", cls: "bg-zinc-100 text-zinc-700" },
  failed: { label: "Failed", cls: "bg-red-100 text-red-700" },
};

const TERMINAL = ["completed", "cancelled", "rejected", "expired"];
const PEEK_H = 220;

/* ══════════════════════════════════════════════════════════════════════ */
export default function DriverRidePage() {
  const [booking, setBooking] = useState<IBooking | null>(null);
  const [fetchDone, setFetchDone] = useState(false);
  const [driverPos, setDriverPos] = useState<[number, number] | null>(null);
  const [pickupPos, setPickupPos] = useState<[number, number] | null>(null);
  const [dropPos, setDropPos] = useState<[number, number] | null>(null);
  const [etaToPickup, setEtaToPickup] = useState(0);
  const [etaToDrop, setEtaToDrop] = useState(0);
  const [distanceToPickup, setDistanceToPickup] = useState(0);
  const [distanceToDrop, setDistanceToDrop] = useState(0);

  /* Pickup OTP */
  const [otpMode, setOtpMode] = useState(false);
  const [otp, setOtp] = useState("");
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [sendingPickupOtp, setSendingPickupOtp] = useState(false);

  /* Drop OTP */
  const [dropOtpMode, setDropOtpMode] = useState(false);
  const [dropOtp, setDropOtp] = useState("");
  const [loadingDropOtp, setLoadingDropOtp] = useState(false);
  const [dropOtpError, setDropOtpError] = useState("");
  const [sendingDropOtp, setSendingDropOtp] = useState(false);

  /* Chat & Sheet */
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const originalTitle = document.title || "Active Ride | Rydex";
    const updateTitle = () => {
      if (document.visibilityState === "hidden" && unreadCount > 0) {
        document.title = `(${unreadCount}) New Message | Rydex`;
      } else {
        document.title = originalTitle;
      }
    };
    updateTitle();
    document.addEventListener("visibilitychange", updateTitle);
    return () => {
      document.title = originalTitle;
      document.removeEventListener("visibilitychange", updateTitle);
    };
  }, [unreadCount]);
  const [expanded, setExpanded] = useState(false);
  const [realtimeToast, setRealtimeToast] = useState<
    (RealtimeToast & { id: number }) | null
  >(null);

  /* Keep latest booking in a ref so GPS callback never has stale closure */
  const bookingRef = useRef<IBooking | null>(null);
  bookingRef.current = booking;

  /* ── FETCH ── */
  const fetchActiveBooking = useCallback((silent = false) => {
    if (!silent) setFetchDone(false);
    fetch("/api/partner/bookings/active")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data._id) {
          setBooking(data);
          if (data.pickupLocation?.coordinates) {
            setPickupPos([
              data.pickupLocation.coordinates[1],
              data.pickupLocation.coordinates[0],
            ]);
          }
          if (data.dropLocation?.coordinates) {
            setDropPos([
              data.dropLocation.coordinates[1],
              data.dropLocation.coordinates[0],
            ]);
          }
          if (data.driver?.location?.coordinates) {
            setDriverPos([
              data.driver.location.coordinates[1],
              data.driver.location.coordinates[0],
            ]);
          }
          if (data.status === "started") {
            setOtpVerified(true);
            setOtpMode(false);
          }
          if (data.status === "completed") {
            setOtpVerified(true);
          }
        } else {
          setBooking(null);
        }
      })
      .catch((err) => console.error("Fetch error:", err))
      .finally(() => {
        if (!silent) setFetchDone(true);
      });
  }, []);

  useEffect(() => {
    fetchActiveBooking();
  }, [fetchActiveBooking]);

  /* ── WAKE LOCK to keep screen awake ── */
  useEffect(() => {
    if (typeof window === "undefined" || !("wakeLock" in navigator)) return;
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        wakeLock = await (navigator as any).wakeLock.request("screen");
        console.log("Wake Lock active.");
      } catch (err: any) {
        console.warn(`Wake Lock failed: ${err.message}`);
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (wakeLock !== null && document.visibilityState === "visible") {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().then(() => {
          wakeLock = null;
          console.log("Wake Lock released.");
        });
      }
    };
  }, []);

  /* ── GPS — only for active rides, uses ref to avoid stale closure ── */
  useEffect(() => {
    if (!booking?._id) return;
    if (TERMINAL.includes(booking.status)) return;
    if (!navigator.geolocation) return;

    const socket = getSocket();

    const handlePositionUpdate = (pos: GeolocationPosition) => {
      const b = bookingRef.current;
      if (!b?._id || TERMINAL.includes(b.status)) return;
      let lat = pos.coords.latitude;
      let lng = pos.coords.longitude;

      if (b.routePolyline) {
        const deviated = checkRouteDeviation([lat, lng], b.routePolyline, 50);
        if (deviated) {
          socket.emit("route-deviation", {
            bookingId: b._id,
            driverId: b.driver?._id,
            latitude: lat,
            longitude: lng,
          });
        }

        // Snap for smooth visual rendering
        const snapped = snapToRoute([lat, lng], b.routePolyline);
        lat = snapped[0];
        lng = snapped[1];
      }

      setDriverPos([lat, lng]);
      socket.emit("driver-location-update", {
        bookingId: b._id,
        latitude: lat,
        longitude: lng,
        status: b.status,
      });
    };

    const watchId = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      (err) => {
        console.warn("GPS watch position error:", err.code, err.message);
      },
      { enableHighAccuracy: true, maximumAge: 5000 },
    );

    // Fallback interval (getCurrentPosition) every 8 seconds to bypass OS suspension/throttling
    const fallbackInterval = setInterval(() => {
      const b = bookingRef.current;
      if (!b?._id || TERMINAL.includes(b.status)) return;
      navigator.geolocation.getCurrentPosition(
        handlePositionUpdate,
        (err) => {
          console.warn("GPS fallback getCurrentPosition error:", err.code, err.message);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 5000 }
      );
    }, 8000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(fallbackInterval);
    };
  }, [booking?._id, booking?.status]);

  useBookingRealtime<IBooking>({
    bookingId: booking?._id,
    enabled: Boolean(booking?._id && !TERMINAL.includes(booking.status)),
    setBooking,
    role: "partner",
    onToast: (t) => setRealtimeToast({ ...t, id: Date.now() }),
    onReconnect: () => fetchActiveBooking(true),
    onStatusChange: (nextStatus) => {
      if (nextStatus === "started") {
        setOtpVerified(true);
        setOtpMode(false);
        setOtp("");
      }
      if (nextStatus === "completed") {
        setOtpVerified(true);
        setDropOtpMode(false);
      }
    },
  });

  /* ── SOCKET location relay (partner GPS) ── */
  useEffect(() => {
    if (!booking?._id) return;
    if (TERMINAL.includes(booking.status)) return;
    const socket = getSocket();
    const handleDriverLocation = (d: { bookingId?: string; latitude?: number; longitude?: number }) => {
      if (d.bookingId && String(d.bookingId) !== String(booking._id)) return;
      if (typeof d.latitude !== "number" || typeof d.longitude !== "number") return;
      setDriverPos([d.latitude, d.longitude]);
    };
    socket.on("driver-location", handleDriverLocation);
    return () => {
      socket.off("driver-location", handleDriverLocation);
    };
  }, [booking?._id, booking?.status]);

  useEffect(() => {
    if (realtimeToast) {
      const timer = setTimeout(() => {
        setRealtimeToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [realtimeToast]);

  /* ── OTP HANDLERS ── */
  const sendPickupOtp = async () => {
    if (!booking?._id) return;
    setSendingPickupOtp(true);
    try {
      await fetch("/api/partner/bookings/send-pickup-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking._id }),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSendingPickupOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) return;
    setOtpError("");
    try {
      setLoadingOtp(true);
      const res = await fetch("/api/partner/bookings/verify-pickup-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking?._id, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.message || "Invalid OTP");
        return;
      }
      setOtpVerified(true);
      setOtpMode(false);
      setOtp("");
      setChatOpen(false);
      setBooking((prev) => (prev ? { ...prev, status: "started" } : prev));
    } catch {
      setOtpError("Verification failed");
    } finally {
      setLoadingOtp(false);
    }
  };

  const sendDropOtp = async () => {
    if (!booking?._id) return;
    setSendingDropOtp(true);
    try {
      await fetch("/api/partner/bookings/send-drop-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking._id }),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSendingDropOtp(false);
    }
  };

  const handleVerifyDropOtp = async () => {
    if (!dropOtp || dropOtp.length < 4) return;
    setDropOtpError("");
    try {
      setLoadingDropOtp(true);
      const res = await fetch("/api/partner/bookings/verify-drop-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking?._id, otp: dropOtp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDropOtpError(data.message || "Invalid OTP");
        return;
      }
      setDropOtp("");
      setDropOtpMode(false);
      setBooking((prev) => (prev ? { ...prev, status: "completed" } : prev));
    } catch {
      setDropOtpError("Verification failed");
    } finally {
      setLoadingDropOtp(false);
    }
  };

  const handleMockGPS = () => {
    if (!booking?._id) return;
    const targetPos = booking.status === "started" ? dropPos : pickupPos;
    if (!targetPos) return;

    // Offset slightly (approx. 100-150m) to allow simulating the final arrival
    const mockLat = targetPos[0] + 0.0012;
    const mockLng = targetPos[1] + 0.0012;
    setDriverPos([mockLat, mockLng]);

    const socket = getSocket();
    socket.emit("driver-location-update", {
      bookingId: booking._id,
      latitude: mockLat,
      longitude: mockLng,
      status: booking.status,
    });

    setRealtimeToast({
      message: booking.status === "started" ? "GPS mocked near dropoff!" : "GPS mocked near pickup!",
      type: "success",
      id: Date.now(),
    });
  };

  /* ══════════════════════════════════════════════════════════════════
     RENDER LOGIC — all hooks above, early returns below
  ══════════════════════════════════════════════════════════════════ */

  /* Loading */
  if (!fetchDone)
    return (
      <div className="h-screen w-full bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          <p className="text-white/40 text-sm tracking-widest uppercase font-medium">
            Loading ride…
          </p>
        </div>
      </div>
    );

  /* No active booking */
  if (!booking)
    return (
      <div className="h-screen w-full bg-zinc-950 flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <div className="w-28 h-28 rounded-full bg-zinc-800/60 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-zinc-700/60 flex items-center justify-center">
              <Car size={40} className="text-zinc-500" />
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="text-center"
        >
          <h1 className="text-white text-2xl font-black mb-2">
            No Active Ride
          </h1>
          <p className="text-zinc-500 text-sm mb-8 max-w-xs">
            You don't have any active booking right now. Go online to start
            receiving ride requests.
          </p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => (window.location.href = "/")}
            className="bg-white text-zinc-900 px-8 py-4 rounded-2xl text-sm font-bold hover:bg-zinc-100 transition-colors"
          >
            Back to Dashboard
          </motion.button>
        </motion.div>
      </div>
    );

  const status = (booking?.status ?? "confirmed") as BookingStatus;
  const cfg = STATUS_LABEL[status];
  const mapStatus = MAP_STATUS[status];

  /* ── COMPLETED — full screen, no map ── */
  if (status === "completed" && booking) {
    return <CompletedScreen booking={booking} />;
  }

  /* ── FAILED (cancelled / rejected / expired) — full screen, no map ── */
  if (TERMINAL.includes(status) && status !== "completed" && booking) {
    return <FailedScreen booking={booking} status={status} cfg={cfg} />;
  }

  /* No booking found after fetch */
  if (!booking || !pickupPos || !dropPos)
    return (
      <div className="h-screen w-full bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          <p className="text-white/40 text-sm tracking-widest uppercase font-medium">
            Loading ride…
          </p>
        </div>
      </div>
    );

  const isActive = ["confirmed", "arriving", "arrived", "started"].includes(status);
  const canChat = ["confirmed", "arriving", "arrived"].includes(status);
  const displayEta = mapStatus === "arriving" ? etaToPickup : etaToDrop;
  const displayDistance =
    mapStatus === "arriving" ? distanceToPickup : distanceToDrop;

  const panelProps = {
    booking,
    status,
    cfg,
    isActive,
    canChat,
    displayEta,
    displayDistance,
    otpMode,
    otp,
    loadingOtp,
    otpVerified,
    otpError,
    setOtpMode,
    setOtp,
    setOtpError,
    handleVerifyOtp,
    sendPickupOtp,
    dropOtpMode,
    dropOtp,
    loadingDropOtp,
    dropOtpError,
    setDropOtpMode,
    setDropOtp,
    setDropOtpError,
    handleVerifyDropOtp,
    sendDropOtp,
    sendingPickupOtp,
    sendingDropOtp,
    chatOpen,
    unreadCount,
    setUnreadCount,
    setRealtimeToast,
    onChatToggle: () => {
      if (!canChat) return;
      setChatOpen((v) => {
        const next = !v;
        if (next) setUnreadCount(0);
        return next;
      });
    },
  };

  return (
    <div className="h-screen w-full bg-zinc-100 flex flex-col lg:flex-row overflow-hidden">
      {/* MAP */}
      <div className="relative flex-1 h-full z-0">
        <LiveRideMap
          driverLocation={driverPos}
          pickupLocation={pickupPos}
          dropLocation={dropPos}
          status={mapStatus}
          onStats={({
            distanceToPickup,
            durationToPickup,
            distanceToDrop,
            durationToDrop,
          }) => {
            setDistanceToPickup(distanceToPickup);
            setEtaToPickup(durationToPickup);
            setDistanceToDrop(distanceToDrop);
            setEtaToDrop(durationToDrop);
          }}
          onPositionUpdate={(lat, lng) => {
            const b = bookingRef.current;
            if (!b?._id) return;
            setDriverPos([lat, lng]);
            const socket = getSocket();
            socket.emit("driver-location-update", {
              bookingId: b._id,
              latitude: lat,
              longitude: lng,
              status: b.status,
            });
          }}
        />
        {/* Mock GPS button for testing */}
        <button
          onClick={handleMockGPS}
          className="absolute top-20 right-4 z-40 bg-zinc-950/95 hover:bg-zinc-900 border border-zinc-850 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold transition-all hover:scale-105 active:scale-95"
        >
          <MapPin size={14} className="text-amber-400 animate-pulse" />
          <span>{booking.status === "started" ? "Mock GPS near Drop" : "Mock GPS near Pickup"}</span>
        </button>
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-500 pointer-events-none"
        >
          <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-zinc-100">
            <span className={`w-2 h-2 rounded-full ${cfg.dot} animate-pulse`} />
            <span className="text-xs font-semibold tracking-wide text-zinc-900">
              {cfg.label}
            </span>
          </div>
        </motion.div>
      </div>

      {/* DESKTOP PANEL */}
      <motion.div
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="hidden lg:flex w-105 xl:w-115 bg-white border-l border-zinc-100 flex-col overflow-hidden"
      >
        <div className="bg-zinc-950 px-6 py-5 shrink-o">
          <p className="text-zinc-500 text-[10px] tracking-[0.2em] uppercase font-semibold mb-1">
            Driver Panel
          </p>
          <div className="flex items-center justify-between">
            <h1 className="text-white text-xl font-bold">Active Ride</h1>
            {isActive && (
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                <Zap size={12} className="text-amber-400" />
                <span className="text-white text-xs font-semibold">
                  {Math.round(displayEta)} min
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <PanelContent {...panelProps} />
          </div>
          <ActionBar {...panelProps} />
        </div>
      </motion.div>

      {/* MOBILE BOTTOM SHEET */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 pointer-events-none">
        <motion.div
          className="bg-white rounded-t-3xl shadow-2xl pointer-events-auto overflow-hidden flex flex-col"
          animate={{ height: expanded ? "82vh" : PEEK_H }}
          transition={{ type: "spring", stiffness: 320, damping: 38 }}
        >
          <div
            className="shrink-o cursor-pointer select-none"
            onClick={() => setExpanded((v) => !v)}
            onPointerDown={(e) => {
              const startY = e.clientY;
              const onUp = (ev: PointerEvent) => {
                if (ev.clientY - startY < -30) setExpanded(true);
                if (ev.clientY - startY > 30) setExpanded(false);
                window.removeEventListener("pointerup", onUp);
              };
              window.addEventListener("pointerup", onUp);
            }}
          >
            <div className="pt-3 pb-1">
              <div className="w-10 h-1 bg-zinc-200 rounded-full mx-auto" />
            </div>
            <div className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-o ${cfg.dot}`}
                />
                <div>
                  <p className="text-sm font-bold text-zinc-900 leading-tight">
                    {cfg.label}
                  </p>
                  <p className="text-xs text-zinc-400 leading-tight">
                    {cfg.sublabel}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isActive && (
                  <div className="text-right">
                    <p className="text-2xl font-black text-zinc-900 leading-none">
                      {Math.round(displayEta)}
                    </p>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider">
                      min
                    </p>
                  </div>
                )}
                <motion.div
                  animate={{ rotate: expanded ? 180 : 0 }}
                  transition={{ duration: 0.28 }}
                  className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center"
                >
                  <ChevronUp size={16} className="text-zinc-600" />
                </motion.div>
              </div>
            </div>
            <div className="h-px bg-zinc-100 mx-5" />
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <PanelContent {...panelProps} />
          </div>
          <ActionBar {...panelProps} />
        </motion.div>
      </div>
      <RideToasts toast={realtimeToast} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   ACTION BAR
══════════════════════════════════════════════════════════════════════ */
function ActionBar({
  status,
  otpMode,
  otp,
  loadingOtp,
  otpVerified,
  otpError,
  setOtpMode,
  setOtp,
  setOtpError,
  handleVerifyOtp,
  sendPickupOtp,
  dropOtpMode,
  dropOtp,
  loadingDropOtp,
  dropOtpError,
  setDropOtpMode,
  setDropOtp,
  setDropOtpError,
  handleVerifyDropOtp,
  sendDropOtp,
  sendingPickupOtp,
  sendingDropOtp,
}: any) {
  const canVerifyPickup = ["confirmed", "arriving", "arrived"].includes(status);
  if (![...["confirmed", "arriving", "arrived"], "started"].includes(status)) return null;

  return (
    <div className="shrink-o border-t border-zinc-100 bg-white px-5 py-4">
      <AnimatePresence mode="wait">
        {/* STATE 1 — Arrived */}
        {canVerifyPickup && !otpMode && !otpVerified && (
          <motion.button
            key="arrived"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            disabled={sendingPickupOtp}
            onClick={async () => {
              await sendPickupOtp();
              setOtpMode(true);
            }}
            className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 active:scale-[0.97] text-white py-4 rounded-2xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2"
          >
            {sendingPickupOtp ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending OTP…
              </span>
            ) : (
              <>
                <MapPin size={16} /> I've Arrived at Pickup{" "}
                <ArrowRight size={15} className="ml-1" />
              </>
            )}
          </motion.button>
        )}

        {/* STATE 2 — Pickup OTP */}
        {canVerifyPickup && otpMode && !otpVerified && (
          <motion.div
            key="pickup-otp"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="bg-zinc-50 border border-zinc-200 rounded-2xl overflow-hidden"
          >
            <div className="bg-zinc-950 px-4 py-3 flex items-center gap-2">
              <KeyRound size={14} className="text-amber-400" />
              <p className="text-white text-xs font-bold tracking-wide uppercase">
                Enter Customer OTP
              </p>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-zinc-500">
                Ask the customer for their 4-digit OTP to start the ride.
              </p>
              <div className="flex justify-center">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, ""));
                    setOtpError("");
                  }}
                  placeholder="· · · ·"
                  className="w-48 border-2 border-zinc-200 focus:border-zinc-900 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-black outline-none transition-colors"
                />
              </div>
              {otpError && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-500 text-xs text-center font-medium"
                >
                  {otpError}
                </motion.p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setOtpMode(false);
                    setOtp("");
                    setOtpError("");
                  }}
                  className="flex-1 border border-zinc-200 bg-white text-zinc-700 py-2.5 rounded-xl text-sm font-semibold active:scale-[0.97] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerifyOtp}
                  disabled={loadingOtp || otp.length < 4}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-bold active:scale-[0.97] transition-all"
                >
                  {loadingOtp ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying…
                    </span>
                  ) : (
                    "Verify OTP"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* STATE 3 — Pickup verified */}
        {otpVerified && canVerifyPickup && (
          <motion.div
            key="pickup-verified"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-2.5 rounded-xl">
              <CheckCircle2 size={15} className="text-emerald-600 shrink-o" />
              <p className="text-emerald-700 text-xs font-semibold">
                OTP Verified — Ride has started
              </p>
            </div>
          </motion.div>
        )}

        {/* STATE 4 — Mark as Dropped */}
        {status === "started" && !dropOtpMode && (
          <motion.button
            key="drop-btn"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            disabled={sendingDropOtp}
            onClick={async () => {
              await sendDropOtp();
              setDropOtpMode(true);
            }}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 active:scale-[0.97] text-white py-4 rounded-2xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2"
          >
            {sendingDropOtp ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending OTP…
              </span>
            ) : (
              <>
                <Navigation size={16} /> Mark as Dropped <ArrowRight size={15} />
              </>
            )}
          </motion.button>
        )}

        {/* STATE 5 — Drop OTP */}
        {status === "started" && dropOtpMode && (
          <motion.div
            key="drop-otp"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="bg-zinc-50 border border-zinc-200 rounded-2xl overflow-hidden"
          >
            <div className="bg-emerald-700 px-4 py-3 flex items-center gap-2">
              <KeyRound size={14} className="text-white" />
              <p className="text-white text-xs font-bold tracking-wide uppercase">
                Confirm Drop OTP
              </p>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-zinc-500">
                Ask the customer for their drop OTP to complete the ride.
              </p>
              <div className="flex justify-center">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={dropOtp}
                  onChange={(e) => {
                    setDropOtp(e.target.value.replace(/\D/g, ""));
                    setDropOtpError("");
                  }}
                  placeholder="· · · ·"
                  className="w-48 border-2 border-zinc-200 focus:border-emerald-600 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-black outline-none transition-colors"
                />
              </div>
              {dropOtpError && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-500 text-xs text-center font-medium"
                >
                  {dropOtpError}
                </motion.p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setDropOtpMode(false);
                    setDropOtp("");
                    setDropOtpError("");
                  }}
                  className="flex-1 border border-zinc-200 bg-white text-zinc-700 py-2.5 rounded-xl text-sm font-semibold active:scale-[0.97] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerifyDropOtp}
                  disabled={loadingDropOtp || dropOtp.length < 4}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-bold active:scale-[0.97] transition-all"
                >
                  {loadingDropOtp ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying…
                    </span>
                  ) : (
                    "Complete Ride"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   PANEL CONTENT
══════════════════════════════════════════════════════════════════════ */
function PanelContent({
  booking,
  status,
  isActive,
  canChat,
  displayEta,
  chatOpen,
  unreadCount,
  setUnreadCount,
  setRealtimeToast,
  onChatToggle,
}: any) {
  return (
    <div className="flex flex-col pt-5 pb-4 gap-3">
      {/* ETA + FARE */}
      {isActive && (
        <div className="mx-5 lg:mx-6 grid grid-cols-2 gap-2">
          <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center shrink-o">
              <Clock size={16} className="text-zinc-600" />
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                ETA
              </p>
              <p className="text-lg font-black text-zinc-900 leading-none mt-0.5">
                {Math.round(displayEta)}
                <span className="text-xs font-normal text-zinc-400 ml-0.5">
                  min
                </span>
              </p>
            </div>
          </div>
          <div className="bg-zinc-950 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-o">
              <IndianRupee size={16} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                Fare
              </p>
              <p className="text-lg font-black text-white leading-none mt-0.5">
                ₹{booking?.fare ?? "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER CARD */}
      {booking?.user && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-5 lg:mx-6"
        >
          <div className="bg-zinc-950 rounded-2xl p-4 flex items-center gap-4">
            <div className="relative shrink-o">
              <div className="w-14 h-14 rounded-xl bg-zinc-800 flex items-center justify-center">
                <User2 size={26} className="text-zinc-300" />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-400 w-4 h-4 rounded-full border-2 border-zinc-950" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-white font-bold text-base truncate">
                  {(booking.user as any)?.name || "Customer"}
                </p>
                <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full shrink-o">
                  <IndianRupee size={10} className="text-amber-400" />
                  <span className="text-white text-xs font-semibold">
                    {booking.fare}
                  </span>
                </div>
              </div>
              {booking.paymentStatus && (
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${PAYMENT_BADGE[booking.paymentStatus as PaymentStatus]?.cls ?? "bg-zinc-700 text-zinc-300"}`}
                  >
                    {PAYMENT_BADGE[booking.paymentStatus as PaymentStatus]
                      ?.label ?? booking.paymentStatus}
                  </span>
                </div>
              )}
            </div>
          </div>

          {isActive && (
            <div className="flex gap-2 mt-2">
              {booking.userMobileNumber && (
                <a
                  href={`tel:${booking.userMobileNumber}`}
                  className={`flex items-center justify-center gap-2 bg-zinc-100 hover:bg-zinc-200 active:scale-[0.97] transition-all text-zinc-900 py-3 rounded-xl text-sm font-semibold ${canChat ? "flex-1" : "w-full"}`}
                >
                  <Phone size={15} /> Call
                </a>
              )}
              {canChat && (
                <button
                  onClick={onChatToggle}
                  className={`relative flex-1 flex items-center justify-center gap-2 active:scale-[0.97] transition-all py-3 rounded-xl text-sm font-semibold ${chatOpen ? "bg-zinc-200 text-zinc-900" : "bg-zinc-900 hover:bg-zinc-800 text-white"}`}
                >
                  <MessageCircle size={15} />
                  {chatOpen ? "Close Chat" : "Message"}
                  {!chatOpen && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-md">
                      {unreadCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* CHAT — confirmed only */}
      {canChat && (
        <motion.div
          animate={{
            height: chatOpen ? "auto" : 0,
            opacity: chatOpen ? 1 : 0,
            marginBottom: chatOpen ? 12 : 0,
          }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mx-5 lg:mx-6 overflow-hidden"
        >
          <div className="rounded-2xl overflow-hidden border border-zinc-100 h-115">
            <RideChat
              currentRole="driver"
              rideId={booking._id}
              userName={(booking?.user as any)?.name}
              chatOpen={chatOpen}
              onNewMessage={(msg) => {
                if (!chatOpen) {
                  setUnreadCount((prev: number) => prev + 1);
                  setRealtimeToast({
                    message: `New message: "${msg.text}"`,
                    type: "info",
                    id: Date.now(),
                  });
                }
              }}
            />
          </div>
        </motion.div>
      )}

      {/* VEHICLE CARD */}
      {booking?.vehicle && (
        <div className="mx-5 lg:mx-6">
          <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-zinc-900 flex items-center justify-center shrink-o">
              <Car size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                Your Vehicle
              </p>
              <p className="text-sm font-bold text-zinc-900 truncate">
                {(booking.vehicle as any).vehicleModel}
              </p>
            </div>
            {(booking.vehicle as any).number && (
              <div className="shrink-o bg-zinc-900 px-3 py-1.5 rounded-lg">
                <p className="text-white text-xs font-black tracking-widest font-mono">
                  {(booking.vehicle as any).number}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ROUTE CARD */}
      <div className="mx-5 lg:mx-6">
        <div className="bg-zinc-50 border border-zinc-100 rounded-2xl overflow-hidden">
          <div className="flex gap-3 p-4 border-b border-zinc-100">
            <div className="flex flex-col items-center shrink-o pt-1">
              <div className="w-3 h-3 rounded-full bg-zinc-900 border-2 border-white shadow-sm" />
              <div className="w-px bg-zinc-200 mt-1" style={{ height: 20 }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">
                Pickup
              </p>
              <p className="text-sm text-zinc-800 leading-snug">
                {booking?.pickupAddress || "—"}
              </p>
            </div>
          </div>
          <div className="flex gap-3 p-4">
            <div className="shrink-o pt-1">
              <div className="w-3 h-3 rounded-sm bg-zinc-900 border-2 border-white shadow-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">
                Drop
              </p>
              <p className="text-sm text-zinc-800 leading-snug">
                {booking?.dropAddress || "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* BOOKING PARAMETERS (Seats, Scheduled, Instructions) */}
      {(booking?.passengers || booking?.scheduledAt || booking?.notes) && (
        <div className="mx-5 lg:mx-6">
          <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-4 text-xs font-semibold text-zinc-600">
              {booking.passengers && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase text-zinc-400">Seats:</span>
                  <span className="text-zinc-900 font-bold bg-zinc-200/60 px-2 py-0.5 rounded-md">{booking.passengers} Pax</span>
                </div>
              )}
              {booking.scheduledAt && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase text-zinc-400">Schedule:</span>
                  <span className="text-zinc-900 font-bold bg-zinc-200/60 px-2 py-0.5 rounded-md">
                    {new Date(booking.scheduledAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              )}
            </div>
            {booking.notes && (
              <div className="text-xs border-t border-zinc-200/40 pt-2.5">
                <span className="text-[10px] font-black uppercase text-zinc-400 block mb-1">Driver Instructions:</span>
                <p className="text-zinc-800 font-medium italic">"{booking.notes}"</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   COMPLETED FULL SCREEN
══════════════════════════════════════════════════════════════════════ */
function CompletedScreen({ booking }: { booking: IBooking }) {
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const PASSENGER_PRAISE_TAGS = ["Punctual", "Polite", "Quiet", "Friendly", "Respectful"];

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmitReview = async () => {
    if (selectedRating === 0) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking._id,
          rating: selectedRating,
          praiseTags: selectedTags,
          comment,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to submit review");
      }
      setSubmitted(true);
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="h-screen w-full bg-zinc-950 flex flex-col overflow-y-auto"
    >
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <div className="w-32 h-32 rounded-full bg-emerald-400/10 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-emerald-400/20 flex items-center justify-center">
              <CheckCircle2 size={52} className="text-emerald-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <p className="text-zinc-400 text-xs uppercase tracking-[0.25em] font-semibold text-center mb-2">
            Trip Complete
          </p>
          <h1 className="text-white text-3xl font-black text-center mb-1">
            Ride Completed!
          </h1>
          <p className="text-zinc-500 text-sm text-center mb-8">
            You have successfully dropped the customer.
          </p>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-3">
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-semibold mb-1 text-center">
              Fare Collected
            </p>
            <p className="text-white text-5xl font-black flex items-center justify-center gap-1 mb-4">
              <IndianRupee size={30} strokeWidth={2.5} /> {booking.fare}
            </p>
            <div className="flex items-center justify-between text-xs border-t border-zinc-800 pt-3">
              <span className="text-zinc-500">Payment Status</span>
              <span
                className={`px-2.5 py-1 rounded-full font-semibold text-[11px] ${PAYMENT_BADGE[booking.paymentStatus]?.cls ?? "bg-zinc-700 text-zinc-300"}`}
              >
                {PAYMENT_BADGE[booking.paymentStatus]?.label ??
                  booking.paymentStatus}
              </span>
            </div>
          </div>

          {booking.user && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                <User2 size={20} className="text-zinc-400" />
              </div>
              <div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">
                  Customer
                </p>
                <p className="text-white text-sm font-bold">
                  {(booking.user as any)?.name || "Customer"}
                </p>
              </div>
            </div>
          )}

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-6">
            <div className="flex gap-3 p-4 border-b border-zinc-800">
              <div className="flex flex-col items-center shrink-0 pt-1">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-500 border-2 border-zinc-900" />
                <div className="w-px bg-zinc-700 mt-1" style={{ height: 18 }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-0.5">
                  Pickup
                </p>
                <p className="text-sm text-zinc-300 leading-snug">
                  {booking.pickupAddress || "—"}
                </p>
              </div>
            </div>
            <div className="flex gap-3 p-4">
              <div className="shrink-0 pt-1">
                <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400 border-2 border-zinc-900" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-0.5">
                  Drop
                </p>
                <p className="text-sm text-zinc-300 leading-snug">
                  {booking.dropAddress || "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Rate Passenger Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-4">
            <p className="text-zinc-400 text-sm font-semibold text-center mb-3">
              How was passenger {(booking.user as any)?.name || "Customer"}?
            </p>

            {/* Stars Selector */}
            <div 
              className="flex justify-center gap-2 mb-4"
              onMouseLeave={() => setHoveredRating(0)}
            >
              {[1, 2, 3, 4, 5].map((n) => {
                const active = (hoveredRating || selectedRating) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    onMouseEnter={() => !submitted && setHoveredRating(n)}
                    onClick={() => !submitted && setSelectedRating(n)}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
                      active
                        ? "bg-amber-400/10 border-2 border-amber-400 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.15)] scale-105"
                        : "bg-zinc-800/50 border-2 border-transparent text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 hover:scale-102"
                    }`}
                  >
                    <Star size={24} className={active ? "fill-amber-400" : ""} />
                  </button>
                );
              })}
            </div>

            <AnimatePresence>
              {selectedRating > 0 && !submitted && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden space-y-4 pt-2"
                >
                  {/* Praise Tags */}
                  <div className="space-y-2">
                    <p className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold text-center">
                      Quick Praise Tags
                    </p>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {PASSENGER_PRAISE_TAGS.map((tag) => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all duration-200 ${
                              isSelected
                                ? "bg-amber-400/20 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.1)]"
                                : "bg-zinc-800/40 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Feedback Comment */}
                  <div className="space-y-1.5">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Share a comment about the passenger (optional)..."
                      rows={3}
                      className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 resize-none transition-colors"
                    />
                  </div>

                  {/* Error display */}
                  {error && (
                    <p className="text-red-500 text-xs text-center font-medium">
                      {error}
                    </p>
                  )}

                  {/* Submit Button */}
                  <button
                    type="button"
                    onClick={handleSubmitReview}
                    disabled={loading}
                    className="w-full bg-white text-zinc-900 py-3 rounded-xl text-sm font-bold hover:bg-zinc-100 transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-5 h-5 rounded-full border-2 border-zinc-900 border-t-transparent animate-spin" />
                    ) : (
                      "Submit Review"
                    )}
                  </button>
                </motion.div>
              )}

              {submitted && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center gap-1.5 py-4"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-1">
                    <CheckCircle2 size={20} className="text-emerald-400" />
                  </div>
                  <p className="text-emerald-400 text-sm font-bold">
                    Review Submitted!
                  </p>
                  <p className="text-zinc-500 text-[11px] text-center max-w-xs">
                    Redirecting you to the dashboard...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => (window.location.href = "/")}
            className="w-full border border-zinc-700 text-zinc-400 py-4 rounded-2xl text-sm font-semibold hover:bg-zinc-900 hover:text-white transition-all duration-200"
          >
            Back to Dashboard
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   FAILED FULL SCREEN (cancelled / rejected / expired)
══════════════════════════════════════════════════════════════════════ */
function FailedScreen({
  booking,
  status,
  cfg,
}: {
  booking: IBooking;
  status: BookingStatus;
  cfg: { label: string; sublabel: string; dot: string };
}) {
  const isExpired = status === "expired";
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="h-screen w-full bg-zinc-950 flex flex-col items-center justify-center px-6"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8"
      >
        <div
          className={`w-28 h-28 rounded-full flex items-center justify-center ${isExpired ? "bg-orange-400/10" : "bg-red-400/10"}`}
        >
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center ${isExpired ? "bg-orange-400/20" : "bg-red-400/20"}`}
          >
            {isExpired ? (
              <AlertCircle size={44} className="text-orange-400" />
            ) : (
              <XCircle size={44} className="text-red-400" />
            )}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="w-full max-w-sm text-center"
      >
        <h1 className="text-white text-2xl font-black mb-2">{cfg.label}</h1>
        <p className="text-zinc-500 text-sm mb-8">{cfg.sublabel}</p>

        {booking.user && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3 mb-4 text-left">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-o">
              <User2 size={18} className="text-zinc-400" />
            </div>
            <div>
              <p className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">
                Customer
              </p>
              <p className="text-white text-sm font-bold">
                {(booking.user as any)?.name || "Customer"}
              </p>
            </div>
          </div>
        )}

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-6 text-left">
          <div className="flex gap-3 p-4 border-b border-zinc-800">
            <div className="flex flex-col items-center shrink-o pt-1">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
              <div className="w-px bg-zinc-700 mt-1" style={{ height: 18 }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-0.5">
                Pickup
              </p>
              <p className="text-sm text-zinc-300 leading-snug">
                {booking.pickupAddress || "—"}
              </p>
            </div>
          </div>
          <div className="flex gap-3 p-4">
            <div className="shrink-o pt-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-zinc-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-0.5">
                Drop
              </p>
              <p className="text-sm text-zinc-300 leading-snug">
                {booking.dropAddress || "—"}
              </p>
            </div>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => (window.location.href = "/")}
          className="w-full bg-white text-zinc-900 py-4 rounded-2xl text-sm font-bold hover:bg-zinc-100 transition-colors"
        >
          Back to Dashboard
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
