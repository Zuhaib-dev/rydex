"use client";

import dynamic from "next/dynamic";
import {
  Phone,
  Car,
  User2,
  ChevronUp,
  Star,
  MessageCircle,
  Clock,
  Zap,
  IndianRupee,
  XCircle,
  AlertCircle,
  CheckCircle2,
  Heart,
  Sparkles,
  Download,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import RideChat from "@/components/RideChat";
import { useRideSocket } from "@/hooks/useRideSocket";
import { useBookingRealtime } from "@/hooks/useBookingRealtime";
import type { RideMapPhase } from "@/components/LiveTrackingMap";
import { Wifi, WifiOff } from "lucide-react";
import OtpReveal from "@/components/ride/OtpReveal";
import RideToasts from "@/components/ride/RideToasts";
import type { RealtimeToast } from "@/hooks/useBookingRealtime";
import PassValidationOverlay from "@/components/ride/PassValidationOverlay";

const LiveRideMap = dynamic(() => import("@/components/LiveTrackingMap"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

const FrozenRouteMap = dynamic(
  () => import("@/components/map/FrozenRouteMap"),
  { ssr: false, loading: () => <MapSkeleton /> },
);

/* ─── TYPES ──────────────────────────────────────────────────────────── */
type BookingStatus =
  | "requested"
  | "awaiting_payment"
  | "confirmed"
  | "arriving"
  | "arrived"
  | "started"
  | "completed"
  | "cancelled"
  | "rejected"
  | "expired"
  | "scheduled";

type PaymentStatus = "pending" | "paid" | "cash" | "failed" | "pass";

interface BookingDetails {
  _id: string;
  driver?: {
    _id: string;
    name: string;
    location?: {
      type: string;
      coordinates: [number, number];
    };
  };
  vehicle?: { vehicleModel: string; number: string };
  pickupAddress: string;
  dropAddress: string;
  pickupLocation: { coordinates: [number, number] };
  dropLocation: { coordinates: [number, number] };
  routePolyline?: GeoJSON.LineString;
  tripDistanceKm?: number;
  durationMinutes?: number;
  fare: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  userMobileNumber: string;
  driverMobileNumber: string;
  pickupOtp?: string;
  dropOtp?: string;
  sosTriggered?: boolean;
  sosTriggeredAt?: string | Date;
}

/* ─── STATUS CONFIG ──────────────────────────────────────────────────── */
const STATUS_CONFIG: Record<
  BookingStatus,
  {
    label: string;
    sublabel: string;
    dot: string;
    mapStatus: "arriving" | "ongoing" | "completed";
  }
> = {
  requested: {
    label: "Finding Driver",
    sublabel: "Searching for nearby drivers",
    dot: "bg-amber-400",
    mapStatus: "arriving",
  },
  awaiting_payment: {
    label: "Payment Required",
    sublabel: "Complete payment to confirm your ride",
    dot: "bg-purple-400",
    mapStatus: "arriving",
  },
  confirmed: {
    label: "Driver on the Way",
    sublabel: "Driver is heading to pickup",
    dot: "bg-emerald-400",
    mapStatus: "arriving",
  },
  arriving: {
    label: "Driver Approaching",
    sublabel: "Your driver is on the way to pickup",
    dot: "bg-emerald-400",
    mapStatus: "arriving",
  },
  arrived: {
    label: "Driver Arrived",
    sublabel: "Share pickup OTP to start your ride",
    dot: "bg-sky-400",
    mapStatus: "arriving",
  },
  started: {
    label: "Trip in Progress",
    sublabel: "Heading to your destination",
    dot: "bg-blue-400",
    mapStatus: "ongoing",
  },
  completed: {
    label: "Ride Completed",
    sublabel: "You have reached your destination",
    dot: "bg-zinc-400",
    mapStatus: "completed",
  },
  cancelled: {
    label: "Ride Cancelled",
    sublabel: "This ride has been cancelled",
    dot: "bg-red-400",
    mapStatus: "completed",
  },
  rejected: {
    label: "Ride Rejected",
    sublabel: "Driver couldn't accept the ride",
    dot: "bg-red-400",
    mapStatus: "completed",
  },
  expired: {
    label: "Request Expired",
    sublabel: "Booking request timed out",
    dot: "bg-orange-400",
    mapStatus: "completed",
  },
  scheduled: {
    label: "Scheduled",
    sublabel: "Your ride is scheduled for later",
    dot: "bg-blue-400",
    mapStatus: "arriving",
  },
};

const PAYMENT_LABEL: Record<PaymentStatus, { label: string; cls: string }> = {
  pending: { label: "Payment Pending", cls: "bg-amber-100 text-amber-700" },
  paid: { label: "Paid", cls: "bg-emerald-100 text-emerald-700" },
  cash: { label: "Cash", cls: "bg-zinc-100 text-zinc-700" },
  pass: { label: "Smart Pass", cls: "bg-indigo-100 text-indigo-700" },
  failed: { label: "Payment Failed", cls: "bg-red-100 text-red-700" },
};

const PEEK_H = 140;

/* ══════════════════════════════════════════════════════════════════════ */
export default function RidePage() {
  const { id } = useParams();
  const router = useRouter();

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [pickupPos, setPickupPos] = useState<[number, number] | null>(null);
  const [dropPos, setDropPos] = useState<[number, number] | null>(null);
  const [distanceToPickup, setDistanceToPickup] = useState(0);
  const [etaToPickup, setEtaToPickup] = useState(0);
  const [distanceToDrop, setDistanceToDrop] = useState(0);
  const [etaToDrop, setEtaToDrop] = useState(0);
  /* chat only for confirmed status */
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [realtimeToast, setRealtimeToast] = useState<
    (RealtimeToast & { id: number }) | null
  >(null);
  const [otpBanner, setOtpBanner] = useState<"pickup" | "drop" | null>(null);
  const [otpDismissed, setOtpDismissed] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleShareTrip = () => {
    const shareLink = window.location.origin + "/share/" + id;
    navigator.clipboard.writeText(shareLink);
    showToast("Share Link Copied!");
  };

  const handleTriggerSos = async () => {
    if (!confirm("⚠️ EMERGENCY: Are you in immediate danger? Confirming will trigger an SOS alert directly to our Admin Control Tower and support dispatch.")) return;
    try {
      const res = await fetch(`/api/booking/${id}/sos`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to trigger SOS");
      showToast("🚨 SOS Emergency Alert Activated!");
      fetchBooking();
    } catch (err: any) {
      alert(err.message || "Failed to trigger SOS");
    }
  };

  const fetchBooking = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch(`/api/booking/${id}`);
      
      if (res.status === 401) {
        router.push("/");
        return;
      }

      if (res.status === 403) {
        router.push("/");
        return;
      }
      
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || "Failed to fetch booking");
      }
      
      const data = await res.json();
      setBooking(data);
      setPickupPos([
        data.pickupLocation.coordinates[1],
        data.pickupLocation.coordinates[0],
      ]);
      setDropPos([
        data.dropLocation.coordinates[1],
        data.dropLocation.coordinates[0],
      ]);
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (typeof window === "undefined") return resolve(false);
      if ((window as any).Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePaymentConfirm = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const razorpayLoaded = await loadRazorpayScript();
      if (!razorpayLoaded) {
        alert("Razorpay SDK failed to load");
        return;
      }
      const orderRes = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id }),
      });
      const orderData = await orderRes.json();
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY,
        amount: orderData.amount,
        currency: "INR",
        name: "RYDEX",
        description: "Ride Payment",
        order_id: orderData.orderId,
        handler: async function (response: any) {
          const verify = await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingId: id, ...response }),
          });
          const verifyData = await verify.json();
          if (verifyData.success) {
            showToast("Payment successful!");
            fetchBooking();
          } else {
            alert("Payment verification failed");
          }
        },
      };
      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    } catch (err) {
      console.error(err);
      alert("Payment failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const driverInitialLoc = booking?.driver?.location?.coordinates
    ? ([booking.driver.location.coordinates[1], booking.driver.location.coordinates[0]] as [number, number])
    : null;

  const { driverPosition: driverPos, connectionStatus, isLive } = useRideSocket({
    bookingId: id as string | undefined,
    enabled: Boolean(id && booking),
    initialDriverLocation: driverInitialLoc,
    driverId: booking?.driver?._id,
    status: booking?.status,
    routeGeoJSON: booking?.routePolyline,
  });

  useBookingRealtime<BookingDetails>({
    bookingId: id as string | undefined,
    enabled: Boolean(id && booking),
    setBooking,
    role: "user",
    onToast: (t) => setRealtimeToast({ ...t, id: Date.now() }),
    onReconnect: () => fetchBooking(true),
    onStatusChange: (nextStatus, bid) => {
      if (nextStatus === "awaiting_payment" && booking?.paymentStatus !== "pass" && booking?.paymentStatus !== "cash") {
        router.push(`/checkout?bookingId=${bid}`);
        return;
      }
      if (!["confirmed", "arriving", "arrived"].includes(nextStatus)) {
        setChatOpen(false);
      }
      if (nextStatus === "started" || nextStatus === "completed") {
        setOtpBanner(null);
        setOtpDismissed(false);
      }
    },
  });

  useEffect(() => {
    if (!booking || otpDismissed) return;
    if (
      booking.pickupOtp &&
      ["confirmed", "arriving", "arrived"].includes(booking.status)
    ) {
      setOtpBanner("pickup");
      return;
    }
    if (booking.dropOtp && booking.status === "started") {
      setOtpBanner("drop");
      return;
    }
    if (!booking.pickupOtp && !booking.dropOtp) {
      setOtpBanner(null);
    }
  }, [booking?.pickupOtp, booking?.dropOtp, booking?.status, otpDismissed]);

  /* ── CANCEL ── */
  const handleCancel = async () => {
    if (!confirm("Cancel this ride?")) return;
    await fetch(`/api/booking/${id}/cancel`, { method: "POST" });
    fetchBooking();
  };

  /* ── LOADING ── */
  if (loading)
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

  if (error || !booking)
    return (
      <div className="h-screen w-full bg-zinc-950 flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle size={48} className="text-red-400" />
          <p className="text-white font-bold text-lg">Failed to load ride</p>
          <p className="text-zinc-400 text-sm">
            {error || "Booking not found"}
          </p>
          <button
            onClick={() => router.back()}
            className="mt-2 bg-white text-zinc-900 px-6 py-3 rounded-xl font-semibold text-sm"
          >
            Go Back
          </button>
        </div>
      </div>
    );

  const status = booking.status as BookingStatus;
  const baseCfg = STATUS_CONFIG[status] || STATUS_CONFIG["confirmed"];
  const isFailed = ["cancelled", "rejected", "expired"].includes(status);
  const isCompleted = status === "completed";
  const isActive = !isCompleted && !isFailed;

  const nearDestination =
    status === "started" && etaToDrop > 0 && etaToDrop <= 6;

  const cfg = nearDestination
    ? {
        ...baseCfg,
        label: "Almost There",
        sublabel: `About ${Math.max(1, Math.round(etaToDrop))} min to your destination`,
        dot: "bg-violet-400",
      }
    : baseCfg;

  const mapPhase: RideMapPhase =
    status === "requested"
      ? "searching"
      : status === "started"
        ? "ongoing"
        : isCompleted || isFailed
          ? "completed"
          : baseCfg.mapStatus;

  const canChat = ["confirmed", "arriving", "arrived"].includes(status);
  const showDriver =
    ["confirmed", "arriving", "arrived", "started", "completed"].includes(status) &&
    !!booking.driver;

  const displayEta =
    mapPhase === "ongoing" || status === "started" ? etaToDrop : etaToPickup;
  const displayDistance =
    mapPhase === "ongoing" || status === "started"
      ? distanceToDrop
      : distanceToPickup;

  /* ══ COMPLETED — FULL SCREEN ══ */
  if (isCompleted) {
    return <CompletedScreen booking={booking} router={router} />;
  }

  /* ══ FAILED — FULL SCREEN ══ */
  if (isFailed) {
    return (
      <FailedScreen
        booking={booking}
        status={status}
        cfg={cfg}
        router={router}
      />
    );
  }

  const panelProps = {
    booking,
    status,
    cfg,
    isActive,
    canChat,
    showDriver,
    displayEta,
    displayDistance,
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
    onCancel: handleCancel,
    onRetryPayment: handlePaymentConfirm,
    router,
    onShareTrip: handleShareTrip,
    onTriggerSos: handleTriggerSos,
  };

  return (
    <div className="h-screen w-full bg-zinc-100 flex flex-col lg:flex-row overflow-hidden">
      {/* ══ MAP ══ */}
      <div className="relative flex-1 h-full z-0">
        {booking.routePolyline &&
        ["requested", "awaiting_payment"].includes(status) ? (
          <FrozenRouteMap
            pickup={booking.pickupLocation.coordinates}
            drop={booking.dropLocation.coordinates}
            routePolyline={booking.routePolyline}
          />
        ) : (
          <LiveRideMap
            driverLocation={driverPos}
            pickupLocation={pickupPos!}
            dropLocation={dropPos!}
            status={mapPhase}
            smoothDuration={1000}
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
          />
        )}

        {/* Pulsing red SOS banner */}
        {booking.sosTriggered && (
          <div className="absolute top-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-md z-50 animate-pulse pointer-events-auto">
            <div className="bg-red-600/95 backdrop-blur-md px-5 py-3.5 rounded-2xl shadow-xl border border-red-500 flex items-center justify-between text-white animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-black tracking-wide animate-pulse">🚨 SOS EMERGENCY PANIC ACTIVE</p>
                  <p className="text-[10px] text-red-200">Support & local authorities are alerted.</p>
                </div>
              </div>
              <a
                href="tel:112"
                className="bg-white text-red-600 px-3.5 py-1.5 rounded-xl text-xs font-black hover:bg-red-50 transition-colors shadow-sm"
              >
                CALL 112
              </a>
            </div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: booking.sosTriggered ? 68 : 0 }}
          transition={{ duration: 0.3 }}
          className="absolute top-4 left-4 right-4 z-40 flex flex-col items-center gap-2 pointer-events-none sm:left-1/2 sm:right-auto sm:-translate-x-1/2"
        >
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950/85 px-4 py-2 shadow-xl backdrop-blur-md">
              <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot} animate-pulse`} />
              <span className="text-xs font-semibold tracking-wide text-white">
                {cfg.label}
              </span>
            </div>
            {showDriver && (
              <div
                className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                  isLive
                    ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                    : connectionStatus === "connected"
                      ? "border border-white/10 bg-zinc-950/80 text-white/50"
                      : "border border-amber-500/30 bg-amber-500/10 text-amber-200"
                }`}
              >
                {isLive ? <Wifi size={12} /> : <WifiOff size={12} />}
                {isLive ? "Live GPS" : connectionStatus === "reconnecting" ? "Reconnecting" : "Syncing"}
              </div>
            )}
          </div>
          {isActive && displayEta > 0 && showDriver && (
            <motion.div
              key={Math.round(displayEta)}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-full border border-white/10 bg-white/95 px-3 py-1 text-[11px] font-bold text-zinc-900 shadow-lg"
            >
              {Math.round(displayEta)} min · {displayDistance.toFixed(1)} km
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* ══ DESKTOP PANEL ══ */}
      <motion.div
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="hidden lg:flex w-[420px] xl:w-[460px] bg-white border-l border-zinc-100 flex-col overflow-hidden"
      >
        <div className="bg-zinc-950 px-6 py-5 shrink-o">
          <p className="text-zinc-500 text-[10px] tracking-[0.2em] uppercase font-semibold mb-1">
            Live Tracking
          </p>
          <div className="flex items-center justify-between">
            <h1 className="text-white text-xl font-bold">Your Ride</h1>
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
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <PanelContent {...panelProps} />
        </div>
      </motion.div>

      {/* ══ MOBILE BOTTOM SHEET ══ */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 pointer-events-none">
        <motion.div
          className="bg-white rounded-t-3xl shadow-2xl pointer-events-auto overflow-hidden"
          animate={{ height: expanded ? "80vh" : PEEK_H }}
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
          <div className="overflow-y-auto h-full pb-10">
            <PanelContent {...panelProps} />
          </div>
        </motion.div>
      </div>
      <OtpReveal
        type={otpBanner === "drop" ? "drop" : "pickup"}
        otp={
          otpBanner === "drop"
            ? booking.dropOtp || ""
            : booking.pickupOtp || ""
        }
        visible={!!otpBanner && !otpDismissed}
        onDismiss={() => setOtpDismissed(true)}
      />

      {status === "awaiting_payment" && booking?.paymentStatus === "pass" && (
        <PassValidationOverlay bookingId={booking._id} />
      )}

      <RideToasts toast={realtimeToast} />

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-999 pointer-events-none"
          >
            <div className="bg-zinc-900/90 text-white backdrop-blur-md px-4 py-2.5 rounded-xl shadow-2xl border border-zinc-800 text-xs font-bold flex items-center gap-2">
              <span>{toastMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   COMPLETED FULL SCREEN
══════════════════════════════════════════════════════════════════════ */
function CompletedScreen({
  booking,
  router,
}: {
  booking: BookingDetails;
  router: any;
}) {
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [customTipInput, setCustomTipInput] = useState<string>("");
  const [isCustomTip, setIsCustomTip] = useState(false);

  const finalTotal = booking.fare + tipAmount;

  const DRIVER_PRAISE_TAGS = ["Clean Ride", "Safe Driver", "Punctual", "Polite", "Helpful", "Great Navigation"];

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
          tipAmount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to submit review");
      }
      setSubmitted(true);
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
      className="h-screen w-full bg-zinc-950 flex flex-col overflow-y-auto print:bg-white print:text-black"
    >
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 print:hidden">
        {/* Icon */}
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
            You've Arrived!
          </h1>
          <p className="text-zinc-500 text-sm text-center mb-8">
            Thank you for riding with us.
          </p>

          {/* Fare card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-3">
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-semibold mb-1 text-center">
              Total Fare
            </p>
            <p className="text-white text-5xl font-black flex items-center justify-center gap-1 mb-2 transition-all">
              <IndianRupee size={30} strokeWidth={2.5} /> {finalTotal}
            </p>
            <AnimatePresence>
              {tipAmount > 0 && (
                <motion.p 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  className="text-emerald-400 text-xs font-bold text-center mb-4 flex items-center justify-center gap-1"
                >
                  <Sparkles size={12} className="fill-current" /> Includes ₹{tipAmount} tip
                </motion.p>
              )}
            </AnimatePresence>
            <div className="flex items-center justify-between text-xs border-t border-zinc-800 pt-3 mt-2">
              <span className="text-zinc-500">Payment</span>
              <span
                className={`px-2.5 py-1 rounded-full font-semibold text-[11px] ${PAYMENT_LABEL[booking.paymentStatus]?.cls ?? "bg-zinc-700 text-zinc-300"}`}
              >
                {PAYMENT_LABEL[booking.paymentStatus]?.label ??
                  booking.paymentStatus}
              </span>
            </div>
          </div>

          {/* Interactive Tipping UI */}
          {!submitted && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
              <p className="text-zinc-300 text-xs font-bold mb-3 flex items-center gap-2">
                <Heart size={14} className="text-pink-500 fill-pink-500/20" /> Show your support (100% goes to driver)
              </p>
              <div className="flex gap-2 mb-3">
                {[10, 20, 50].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => { setTipAmount(amt); setIsCustomTip(false); }}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-colors border ${
                      tipAmount === amt && !isCustomTip
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                        : "bg-zinc-800 border-transparent text-zinc-400 hover:text-white"
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
                <button
                  onClick={() => setIsCustomTip(true)}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-colors border ${
                    isCustomTip
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                      : "bg-zinc-800 border-transparent text-zinc-400 hover:text-white"
                  }`}
                >
                  Custom
                </button>
              </div>
              
              {isCustomTip && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">₹</div>
                  <input
                    type="number"
                    value={customTipInput}
                    onChange={(e) => {
                      setCustomTipInput(e.target.value);
                      const parsed = parseInt(e.target.value) || 0;
                      setTipAmount(parsed);
                    }}
                    placeholder="Enter custom tip amount..."
                    className="w-full bg-zinc-950 border border-emerald-500/50 rounded-xl py-2.5 pl-8 pr-4 text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-inner"
                  />
                </motion.div>
              )}
            </div>
          )}

          {/* Driver card */}
          {booking.driver && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                <User2 size={20} className="text-zinc-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">
                  Driver
                </p>
                <p className="text-white text-sm font-bold truncate">
                  {booking.driver.name}
                </p>
              </div>
              {booking.vehicle && (
                <div className="shrink-0 bg-zinc-800 px-2.5 py-1.5 rounded-lg">
                  <p className="text-zinc-300 text-xs font-black tracking-widest font-mono">
                    {booking.vehicle.number}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Route */}
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

          {/* Rating */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-4">
            <p className="text-zinc-400 text-sm font-semibold text-center mb-3">
              How was your experience with {booking.driver?.name || "the driver"}?
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
                      What went well?
                    </p>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {DRIVER_PRAISE_TAGS.map((tag) => {
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
                      placeholder="Share a comment about the driver (optional)..."
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
                      "Submit Feedback"
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
                    Feedback Submitted!
                  </p>
                  <p className="text-zinc-500 text-[11px] text-center max-w-xs">
                    Your rating and selected tags have been applied to the driver's profile.
                  </p>
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
                    Feedback Submitted!
                  </p>
                  <p className="text-zinc-500 text-[11px] text-center max-w-xs mb-4">
                    Your rating and selected tags have been applied to the driver's profile.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => window.print()}
            className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 mb-3 shadow-lg"
          >
            <Download size={16} /> Download PDF Receipt
          </button>
          
          <button
            onClick={() => router.push("/")}
            className="w-full border border-zinc-700 text-zinc-400 py-3.5 rounded-2xl text-sm font-semibold hover:bg-zinc-900 transition-colors"
          >
            Back to Home
          </button>
        </motion.div>
      </div>

      {/* PRINT-ONLY RECEIPT TEMPLATE */}
      <div className="hidden print:flex flex-col p-8 text-black bg-white w-full max-w-2xl mx-auto h-screen font-sans">
          <div className="flex items-center justify-between border-b-2 border-black pb-6 mb-6">
            <div>
              <h1 className="text-4xl font-black tracking-tighter">RYDEX</h1>
              <p className="text-xs text-gray-500 font-mono mt-1">RECEIPT #{booking._id?.toString().slice(-8).toUpperCase()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-800">{new Date((booking as any).createdAt || Date.now()).toLocaleDateString()}</p>
              <p className="text-xs text-gray-500">{new Date((booking as any).createdAt || Date.now()).toLocaleTimeString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="border border-gray-200 p-4 rounded-xl">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Driver</p>
              <p className="text-lg font-black">{booking.driver?.name}</p>
              <p className="text-sm text-gray-600 font-mono">{booking.vehicle?.number}</p>
            </div>
            <div className="border border-gray-200 p-4 rounded-xl">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Payment</p>
              <p className="text-lg font-black">{PAYMENT_LABEL[booking.paymentStatus]?.label ?? booking.paymentStatus}</p>
            </div>
          </div>

          <div className="mb-8">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Trip Route</p>
            <div className="flex flex-col gap-4 border-l-2 border-gray-200 ml-2 pl-4 py-1">
              <div className="relative">
                <div className="absolute -left-[23px] top-1.5 w-3 h-3 bg-gray-400 rounded-full border-2 border-white" />
                <p className="text-sm font-bold text-gray-800">{booking.pickupAddress}</p>
              </div>
              <div className="relative">
                <div className="absolute -left-[23px] top-1.5 w-3 h-3 bg-black rounded-sm border-2 border-white" />
                <p className="text-sm font-bold text-gray-800">{booking.dropAddress}</p>
              </div>
            </div>
          </div>

          <div className="mt-auto border-t-2 border-black pt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Base Fare</span>
              <span className="font-bold">₹{booking.fare}</span>
            </div>
            {tipAmount > 0 && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Driver Tip</span>
                <span className="font-bold">₹{tipAmount}</span>
              </div>
            )}
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
              <span className="text-2xl font-black">Total Paid</span>
              <span className="text-3xl font-black">₹{finalTotal}</span>
            </div>
          </div>
          
          <p className="text-center text-xs text-gray-400 mt-12 font-bold tracking-widest uppercase">Thank you for riding with Rydex</p>
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
  router,
}: {
  booking: BookingDetails;
  status: BookingStatus;
  cfg: any;
  router: any;
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

        {/* Route recap */}
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

        <button
          onClick={() => router.push("/book")}
          className="w-full bg-white text-zinc-900 py-4 rounded-2xl text-sm font-bold hover:bg-zinc-100 transition-colors mb-3"
        >
          Book a New Ride
        </button>
        <button
          onClick={() => router.push("/")}
          className="w-full border border-zinc-800 text-zinc-500 py-3.5 rounded-2xl text-sm font-semibold hover:bg-zinc-900 transition-colors"
        >
          Back to Home
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   PANEL CONTENT
══════════════════════════════════════════════════════════════════════ */
function PanelContent({
  booking,
  status,
  cfg,
  isActive,
  canChat,
  showDriver,
  displayEta,
  displayDistance,
  chatOpen,
  unreadCount,
  setUnreadCount,
  setRealtimeToast,
  onChatToggle,
  onCancel,
  onRetryPayment,
  router,
  onShareTrip,
  onTriggerSos,
}: any) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.1 } },
        hidden: {},
      }}
      className="flex flex-col pt-5 pb-6 gap-3"
    >
      {/* SEARCHING (requested) */}
      {status === "requested" && (
        <div className="mx-5 lg:mx-6">
          <div className="relative overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50 p-5">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-landing-accent/10 blur-2xl" />
            <div className="relative flex items-center gap-4">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
                <span className="absolute h-12 w-12 animate-ping rounded-full bg-landing-accent/20" />
                <span className="relative h-10 w-10 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900">
                  Finding your driver
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Matching nearby partners in Kashmir…
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT (awaiting_payment) */}
      {status === "awaiting_payment" && (
        <div className="mx-5 lg:mx-6">
          <div className="bg-purple-950 rounded-2xl p-5">
            <p className="text-purple-200 text-[10px] uppercase tracking-widest font-semibold mb-1">
              Action Required
            </p>
            <p className="text-white font-bold text-lg mb-1 flex items-center gap-1">
              <IndianRupee size={18} /> {booking.fare}
            </p>
            <p className="text-purple-300 text-xs mb-4">
              Complete payment to confirm your ride
            </p>
            <button
              onClick={onRetryPayment}
              className="w-full bg-white text-purple-900 py-3 rounded-xl text-sm font-bold hover:bg-purple-50 transition-colors"
            >
              Pay Now
            </button>
          </div>
        </div>
      )}

      {/* ETA + FARE (active, not requested/payment) */}
      {isActive &&
        !["requested", "awaiting_payment"].includes(status) &&
        showDriver && (
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
                ₹{booking.fare}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* DRIVER CARD */}
      {showDriver && (
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
                  {booking.driver?.name || "Your Driver"}
                </p>
                <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full shrink-o">
                  <Star size={10} className="text-amber-400 fill-amber-400" />
                  <span className="text-white text-xs font-semibold">4.9</span>
                </div>
              </div>
              {booking.vehicle && (
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-zinc-400 text-xs">
                    {booking.vehicle.vehicleModel}
                  </span>
                  <span className="text-zinc-700 text-xs">•</span>
                  <span className="text-zinc-300 text-xs bg-white/10 px-2 py-0.5 rounded-full font-mono">
                    {booking.vehicle.number}
                  </span>
                </div>
              )}
              <div className="mt-2">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${PAYMENT_LABEL[booking.paymentStatus as PaymentStatus]?.cls}`}
                >
                  {PAYMENT_LABEL[booking.paymentStatus as PaymentStatus]?.label}
                </span>
              </div>
            </div>
          </div>

          {/* Call always when active; Message only when canChat */}
          {isActive && (
            <div className="flex gap-2 mt-2">
              {booking.driverMobileNumber && (
                <a
                  href={`tel:${booking.driverMobileNumber}`}
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
          <div className="rounded-2xl overflow-hidden border border-zinc-100 h-[460px]">
            <RideChat
              currentRole="user"
              rideId={booking._id.toString()}
              driverName={booking.driver?.name}
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
                {booking.pickupAddress || "—"}
              </p>
              {booking.pickupOtp &&
                ["confirmed", "arriving", "arrived"].includes(status) && (
                <div className="mt-1.5 inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
                  <p className="text-emerald-700 text-xs font-black tracking-widest font-mono">
                    {booking.pickupOtp}
                  </p>
                  <p className="text-emerald-600 text-[10px] font-semibold">
                    OTP
                  </p>
                </div>
              )}
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
                {booking.dropAddress || "—"}
              </p>
              {booking.dropOtp && status === "started" && (
                <div className="mt-1.5 inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
                  <p className="text-emerald-700 text-xs font-black tracking-widest font-mono">
                    {booking.dropOtp}
                  </p>
                  <p className="text-emerald-600 text-[10px] font-semibold">
                    DROP OTP
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* VEHICLE CARD */}
      {booking.vehicle && showDriver && (
        <div className="mx-5 lg:mx-6">
          <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-zinc-900 flex items-center justify-center shrink-o">
              <Car size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold mb-0.5">
                Vehicle
              </p>
              <p className="text-sm font-bold text-zinc-900 truncate">
                {booking.vehicle.vehicleModel}
              </p>
            </div>
            <div className="shrink-o bg-zinc-900 px-3 py-1.5 rounded-lg">
              <p className="text-white text-xs font-black tracking-widest font-mono">
                {booking.vehicle.number}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SAFETY & SHARING PANEL */}
      {isActive && (
        <div className="mx-5 lg:mx-6 border-t border-zinc-100 pt-5 mt-2">
          <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold mb-3">
            Safety & Sharing
          </p>
          <div className="flex flex-col gap-2.5">
            {/* Share link button */}
            <button
              onClick={onShareTrip}
              className="w-full flex items-center justify-between bg-zinc-50 hover:bg-zinc-100 active:scale-[0.99] border border-zinc-100 px-4 py-3 rounded-xl transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-200/50 flex items-center justify-center text-zinc-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98"/><path d="m15.41 6.51-6.82 3.98"/></svg>
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-zinc-800">Share Live Location</p>
                  <p className="text-[10px] text-zinc-400">Let others track your trip in real-time</p>
                </div>
              </div>
              <span className="text-[10px] bg-zinc-200/60 text-zinc-600 font-bold px-2 py-0.5 rounded-md">Copy Link</span>
            </button>

            {/* SOS Panic Trigger */}
            {booking.sosTriggered ? (
              <div className="bg-red-50 border border-red-200/60 p-4 rounded-xl flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600 animate-pulse shrink-o">
                    <AlertCircle size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-red-700">SOS Panic Mode Active</p>
                    <p className="text-[10px] text-red-500">Live coordinates are shared with support.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a
                    href="tel:112"
                    className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black py-2.5 rounded-lg transition-colors shadow-sm text-center"
                  >
                    <Phone size={12} /> Call Emergency (112)
                  </a>
                  <a
                    href={`tel:${booking.driverMobileNumber || ""}`}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold py-2.5 rounded-lg transition-colors text-center"
                  >
                    Call Driver
                  </a>
                </div>
              </div>
            ) : (
              <button
                onClick={onTriggerSos}
                className="w-full flex items-center justify-between bg-red-50 hover:bg-red-100 active:scale-[0.99] border border-red-100/60 px-4 py-3 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600 group-hover:animate-bounce">
                    <AlertCircle size={16} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-red-700">🚨 SOS Emergency Panic</p>
                    <p className="text-[10px] text-red-400">Instantly alert control room & support</p>
                  </div>
                </div>
                <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-md">Trigger</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* CANCEL BUTTON */}
      {["requested", "awaiting_payment", "confirmed", "arriving", "arrived"].includes(status) && (
        <div className="mx-5 lg:mx-6 mt-4 pt-2">
          <button
            onClick={onCancel}
            className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-3.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <XCircle size={16} /> Cancel Ride
          </button>
        </div>
      )}
    </motion.div>
  );
}

function MapSkeleton() {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#0c0f14]">
      <div className="absolute inset-0 bg-linear-to-b from-zinc-900/50 to-zinc-950" />
      <div className="relative flex flex-col items-center gap-3">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-landing-accent" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
          Loading map
        </p>
      </div>
    </div>
  );
}
