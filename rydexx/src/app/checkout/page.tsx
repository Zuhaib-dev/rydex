"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Navigation, ShieldCheck,
  Bike, Car, Truck, Loader2, CheckCircle2,
  XCircle, Clock, CreditCard, Banknote,
  ArrowLeft, ArrowRight, RotateCcw, AlertCircle, Wallet,
  Users, Calendar, FileText,
} from "lucide-react";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useBookingRealtime } from "@/hooks/useBookingRealtime";
import MatchingStatusBanner from "@/components/matching/MatchingStatusBanner";
import { useBookingSnapshot } from "@/hooks/useBookingSnapshot";
import dynamic from "next/dynamic";

const FrozenRouteMap = dynamic(
  () => import("@/components/map/FrozenRouteMap"),
  { ssr: false, loading: () => <MapSkeleton /> }
);

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

type VehicleIconMap = Record<string, any>;
const VEHICLE_ICONS: VehicleIconMap = {
  bike: Bike, auto: Car, car: Car, loading: Truck, truck: Truck,
};

type Status =
  | "idle" | "requested" | "awaiting_payment"
  | "rejected" | "expired" | "cancelled"
  | "payment" | "confirmed";

function CheckoutContent() {
  const router = useRouter();
  const params = useSearchParams();

  const quoteId = params.get("quoteId");
  const mobileNumber = params.get("mobileNumber") || "";
  const { snapshot, loading: quoteLoading, error: quoteError } =
    useBookingSnapshot(quoteId);

  const pickup = snapshot?.pickupAddress ?? "Pickup";
  const drop = snapshot?.dropAddress ?? "Drop";
  const vehicle = snapshot?.vehicleType ?? "car";
  const fare = snapshot?.fare ?? 0;
  const tripDistanceKm = snapshot?.tripDistanceKm ?? 0;
  const durationMinutes = snapshot?.durationMinutes ?? 0;

  const VehicleIcon = VEHICLE_ICONS[vehicle.toLowerCase()] || Car;

  const [loading, setLoading] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online" | null>(
    null,
  );
  const [bootstrapped, setBootstrapped] = useState(false);

  /* ── CREATE BOOKING (uses locked quote only) ── */
  const handleCreateBooking = async () => {
    if (!quoteId) {
      alert("Fare expired. Please search again.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/booking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId, mobileNumber }),
      });
      const data = await res.json();
      if (data.success) {
        setBookingId(data.booking._id);
        setStatus("requested");
      } else alert(data.message || "Booking failed");
    } catch {
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  function loadRazorpayScript() {
  return new Promise((resolve) => {

    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
}

  /* ── PAYMENT CONFIRM ── */
 const handlePaymentConfirm = async () => {

  if (!bookingId || !paymentMethod) return;

  setLoading(true);

  try {

    if (paymentMethod === "cash") {

      const res = await fetch(`/api/booking/${bookingId}/confirm-payment`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ method:"cash" })
      });

      const data = await res.json();

      if(data.success){
        window.location.href = `/ride/${bookingId}`;
      }

      return;
    }

    /* LOAD RAZORPAY SCRIPT */

    const razorpayLoaded = await loadRazorpayScript();

    if (!razorpayLoaded) {
      alert("Razorpay SDK failed to load");
      return;
    }

    /* CREATE ORDER */

    const orderRes = await fetch("/api/payment/create",{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ bookingId })
    });

    const orderData = await orderRes.json();

    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY,
      amount: orderData.amount,
      currency: "INR",
      name: "RYDEX",
      description: "Ride Payment",
      order_id: orderData.orderId,

      handler: async function (response:any) {

        const verify = await fetch("/api/payment/verify",{
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body:JSON.stringify({
            bookingId,
            ...response
          })
        });

        const verifyData = await verify.json();

        if(verifyData.success){
          window.location.href = `/ride/${bookingId}`;
        }

      }
    };

    const paymentObject = new (window as any).Razorpay(options);
    paymentObject.open();

  }

  catch(err){
    console.error(err);
    alert("Payment failed");
  }

  finally{
    setLoading(false);
  }
};

  /* ── CANCEL ── */
  const handleCancelBooking = async () => {
    if (!bookingId) return;
    await fetch(`/api/booking/${bookingId}/cancel`, { method: "POST" });
    setStatus("cancelled");
  };

  const [matchSearch, setMatchSearch] = useState<{
    message?: string;
    radiusKm?: number;
    etaMinutes?: number;
  }>({});

  const [, setLiveBooking] = useState<{
    _id: string;
    status: Status;
  } | null>(null);

  useEffect(() => {
    if (bookingId) setLiveBooking({ _id: bookingId, status });
  }, [bookingId, status]);

  useBookingRealtime<{ _id: string; status: Status }>({
    bookingId: bookingId ?? undefined,
    enabled: Boolean(bookingId),
    setBooking: setLiveBooking,
    onPatch: (patch) => {
      setMatchSearch({
        message: patch.searchingMessage as string | undefined,
        radiusKm: patch.matchRadiusKm as number | undefined,
        etaMinutes: patch.dispatchEtaMinutes as number | undefined,
      });
    },
    onStatusChange: (nextStatus, bid) => {
      setStatus(nextStatus as Status);
      if (nextStatus === "awaiting_payment") setStatus("awaiting_payment");
      if (nextStatus === "rejected") setStatus("rejected");
      if (
        nextStatus === "confirmed" ||
        nextStatus === "arriving" ||
        nextStatus === "started"
      ) {
        router.push(`/ride/${bid}`);
      }
    },
  });

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/booking/my-active");
      const data = await res.json();
      if (data.booking) {
        setBookingId(data.booking._id);
        setStatus(data.booking.status);
      }
      setBootstrapped(true);
    })();
  }, []);

  useEffect(() => {
    if (!bootstrapped) return;
    if (!quoteId && !bookingId && status === "idle") {
      router.replace("/user/book");
    }
  }, [bootstrapped, quoteId, bookingId, status, router]);

  /* ── awaiting_payment → payment after 2s ── */
  useEffect(() => {
    if (status !== "awaiting_payment") return;
    const t = setTimeout(() => setStatus("payment"), 2000);
    return () => clearTimeout(t);
  }, [status]);

  const vehicleLabel = vehicle.charAt(0).toUpperCase() + vehicle.slice(1);

  if ((!bootstrapped || quoteLoading) && !bookingId) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (quoteError && !bookingId) {
    return (
      <div className="min-h-screen bg-zinc-100 flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-zinc-600 text-center">{quoteError}</p>
        <button
          onClick={() => router.push("/user/book")}
          className="px-5 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-semibold"
        >
          Start new booking
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 px-4 py-12">

      {/* subtle dot grid */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, #d4d4d8 1px, transparent 1px)", backgroundSize: "28px 28px", opacity: 0.45 }}
      />

      <div className="relative max-w-6xl mx-auto z-10">

        {/* ── PAGE HEADER ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10"
        >
          <button
            onClick={() => router.back()}
            className="mb-6 w-11 h-11 rounded-2xl bg-white border border-zinc-200 shadow-sm flex items-center justify-center hover:bg-zinc-50 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={17} className="text-zinc-900" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px w-8 bg-zinc-900" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Booking</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-900">Checkout</h1>
          <p className="text-zinc-400 text-sm mt-1.5 font-medium">Review your ride and confirm</p>
        </motion.div>

        {/* ── GRID ── */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* ══ LEFT — RIDE DETAILS ══ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.07)]"
          >
            {/* Top bar */}
            <div className="h-1 bg-zinc-900" />

            {snapshot?.routePolyline && (
              <div className="h-44 border-b border-zinc-100">
                <FrozenRouteMap
                  pickup={snapshot.pickupLocation.coordinates}
                  drop={snapshot.dropLocation.coordinates}
                  routePolyline={snapshot.routePolyline}
                />
              </div>
            )}

            <div className="p-8 sm:p-10">
              {/* Vehicle row */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-1">Selected Vehicle</p>
                  <h2 className="text-3xl font-black tracking-tight text-zinc-900">{vehicleLabel}</h2>
                </div>
                <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center shadow-lg">
                  <VehicleIcon size={28} className="text-white" />
                </div>
              </div>

              {/* Route */}
              <div className="bg-zinc-50 border border-zinc-100 rounded-2xl overflow-hidden mb-8">
                <div className="flex gap-4 px-5 py-4 border-b border-zinc-100">
                  <div className="flex flex-col items-center shrink-0 pt-0.5">
                    <div className="w-3 h-3 rounded-full bg-zinc-900 border-2 border-white ring-1 ring-zinc-300" />
                    <div className="w-px flex-1 bg-zinc-300 my-1" style={{ minHeight: 12 }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-0.5">Pickup</p>
                    <p className="text-sm font-semibold text-zinc-900 leading-snug truncate">{pickup}</p>
                  </div>
                  <MapPin size={14} className="text-zinc-400 shrink-0 mt-1" />
                </div>
                <div className="flex gap-4 px-5 py-4">
                  <div className="shrink-0 pt-0.5">
                    <div className="w-3 h-3 rounded-sm bg-zinc-900 border-2 border-white ring-1 ring-zinc-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-0.5">Drop</p>
                    <p className="text-sm font-semibold text-zinc-900 leading-snug truncate">{drop}</p>
                  </div>
                  <Navigation size={14} className="text-zinc-400 shrink-0 mt-1" />
                </div>
              </div>

              {/* Additional Details: Passengers, Scheduled Time, Notes */}
              {(snapshot?.passengers || snapshot?.scheduledAt || snapshot?.notes) && (
                <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-5 mb-8 space-y-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-1">Booking Parameters</p>
                  <div className="grid grid-cols-2 gap-4">
                    {snapshot?.passengers && (
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-zinc-200/60 flex items-center justify-center text-zinc-600 shrink-0">
                          <Users size={14} />
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.1em] text-zinc-400">Seats Reserved</p>
                          <p className="text-xs font-bold text-zinc-800">{snapshot.passengers} Seat{snapshot.passengers > 1 ? "s" : ""}</p>
                        </div>
                      </div>
                    )}
                    {snapshot?.scheduledAt && (
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-zinc-200/60 flex items-center justify-center text-zinc-600 shrink-0">
                          <Calendar size={14} />
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.1em] text-zinc-400">Scheduled For</p>
                          <p className="text-xs font-bold text-zinc-800">
                            {new Date(snapshot.scheduledAt).toLocaleDateString([], { month: "short", day: "numeric" })} @ {new Date(snapshot.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  {snapshot?.notes && (
                    <div className="flex items-start gap-2.5 pt-3 border-t border-zinc-200/50">
                      <div className="w-8 h-8 rounded-xl bg-zinc-200/60 flex items-center justify-center text-zinc-600 shrink-0">
                        <FileText size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.1em] text-zinc-400">Driver Instructions</p>
                        <p className="text-xs font-bold text-zinc-800 italic leading-snug break-words">"{snapshot.notes}"</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Fare */}
              <div className="flex items-end justify-between pt-6 border-t border-zinc-100">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-1">Total Fare</p>
                  <p className="text-zinc-400 text-xs font-medium">
                    Locked · {tripDistanceKm} km · ~{durationMinutes} min
                  </p>
                </div>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                  className="flex items-baseline gap-1"
                >
                  <span className="text-zinc-400 text-lg font-black">₹</span>
                  <span className="text-zinc-900 text-5xl font-black tracking-tight leading-none">{fare}</span>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* ══ RIGHT — STATUS PANEL ══ */}
          <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14, duration: 0.5, ease: [0.22, 1, 0.36, 1], layout: { type: "spring", stiffness: 300, damping: 30 } }}
            className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.07)] flex flex-col"
          >
            <motion.div layout className="h-1 bg-zinc-900" />

            <div className="flex-1 p-8 sm:p-10 flex flex-col">
              <AnimatePresence mode="wait">

                {/* ── IDLE ── */}
                {status === "idle" && (
                  <motion.div key="idle" layout
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col flex-1 justify-between"
                  >
                    <motion.div layout>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-1">Ready to go?</p>
                      <h3 className="text-2xl font-black text-zinc-900 mb-6">Confirm Your Ride</h3>
                      <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-5 space-y-3">
                        {[
                          { icon: <Clock size={14} />, text: "Driver will respond within 20 seconds" },
                          { icon: <ShieldCheck size={14} />, text: "Verified & insured drivers only" },
                          { icon: <CreditCard size={14} />, text: "Pay after driver accepts" },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-xl bg-zinc-200 flex items-center justify-center text-zinc-600 shrink-0">{item.icon}</div>
                            <p className="text-zinc-500 text-xs font-medium">{item.text}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      whileHover={{ scale: 1.02 }}
                      onClick={handleCreateBooking}
                      disabled={loading}
                      className="w-full h-14 mt-8 bg-zinc-900 hover:bg-black disabled:opacity-40 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2.5 transition-colors shadow-md"
                    >
                      {loading ? (
                        <><Loader2 size={17} className="animate-spin" /> Requesting…</>
                      ) : (
                        <><span>Request Ride</span><ArrowRight size={17} /></>
                      )}
                    </motion.button>
                  </motion.div>
                )}

                {/* ── REQUESTED ── */}
                {status === "requested" && (
                  <motion.div key="requested" layout
                    initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="flex flex-col flex-1 items-center justify-center gap-6 text-center"
                  >
                    {/* High fidelity pulsing ring */}
                    <div className="relative flex items-center justify-center w-24 h-24">
                      <motion.div
                        animate={{ scale: [1, 2, 1], opacity: [0.4, 0, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-0 rounded-full bg-zinc-900/10 border-2 border-zinc-900/30"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0.1, 0.6] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                        className="absolute w-16 h-16 rounded-full bg-zinc-950/5 border border-zinc-900/20"
                      />
                      <div className="relative w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center shadow-lg">
                        <Loader2 size={20} className="text-white animate-spin" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-zinc-900 mb-1">Searching nearby riders…</h3>
                      <p className="text-zinc-400 text-sm font-medium">Matching you with live {vehicle} partners near pickup</p>
                    </div>
                    <MatchingStatusBanner
                      message={matchSearch.message}
                      radiusKm={matchSearch.radiusKm}
                      etaMinutes={matchSearch.etaMinutes}
                    />
                    {/* Animated dots */}
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map(i => (
                        <motion.div key={i}
                          animate={{ opacity: [0.2, 1, 0.2] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                          className="w-2 h-2 rounded-full bg-zinc-900"
                        />
                      ))}
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCancelBooking}
                      className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-zinc-900 transition-colors border border-zinc-200 hover:border-zinc-400 px-4 py-2.5 rounded-xl"
                    >
                      <XCircle size={13} /> Cancel Request
                    </motion.button>
                  </motion.div>
                )}

                {/* ── AWAITING PAYMENT ── */}
                {status === "awaiting_payment" && (
                  <motion.div key="awaiting_payment" layout
                    initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="flex flex-col flex-1 items-center justify-center gap-5 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 16 }}
                      className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10"
                    >
                      <CheckCircle2 size={36} className="text-emerald-600" />
                    </motion.div>
                    <div>
                      <h3 className="text-xl font-black text-zinc-900 mb-1">Driver found! Heading your way.</h3>
                      <p className="text-zinc-400 text-sm font-medium">Preparing payment options…</p>
                    </div>
                    <div className="w-48 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: "100%" }}
                        transition={{ duration: 2 }}
                        className="h-full bg-zinc-900 rounded-full"
                      />
                    </div>
                  </motion.div>
                )}
                {/* ── PAYMENT ── */}
                {status === "payment" && (
                  <motion.div key="payment" layout
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col flex-1 gap-6"
                  >
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 mb-1">Almost there</p>
                      <h3 className="text-2xl font-black text-zinc-900">Select Payment</h3>
                    </div>

                    <div className="space-y-3">
                      {[
                        { id: "cash",   Icon: Banknote,    title: "Cash",           sub: "Pay driver after ride" },
                        { id: "online", Icon: Wallet,      title: "Online Payment",  sub: "UPI · Card · Netbanking" },
                      ].map(({ id, Icon, title, sub }) => {
                        const active = paymentMethod === id;
                        return (
                          <motion.button
                            key={id}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setPaymentMethod(id as any)}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                              active ? "bg-zinc-900 border-zinc-900" : "bg-zinc-50 border-zinc-200 hover:border-zinc-400"
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                              active ? "bg-white/10" : "bg-zinc-200"
                            }`}>
                              <Icon size={18} className={active ? "text-white" : "text-zinc-600"} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-bold ${active ? "text-white" : "text-zinc-900"}`}>{title}</p>
                              <p className={`text-xs font-medium ${active ? "text-zinc-400" : "text-zinc-400"}`}>{sub}</p>
                            </div>
                            <AnimatePresence>
                              {active && (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                  <CheckCircle2 size={16} className="text-white shrink-0" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.button>
                        );
                      })}
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      whileHover={paymentMethod ? { scale: 1.02 } : {}}
                      disabled={!paymentMethod || loading}
                      onClick={handlePaymentConfirm}
                      className="w-full h-14 bg-zinc-900 hover:bg-black disabled:opacity-30 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2.5 transition-colors shadow-md mt-auto"
                    >
                      {loading
                        ? <Loader2 size={17} className="animate-spin" />
                        : paymentMethod === "cash"
                        ? <><Banknote size={16} /><span>Confirm Cash Ride</span></>
                        : paymentMethod === "online"
                        ? <><span>Proceed to Payment</span><ArrowRight size={16} /></>
                        : <span>Select a Method</span>
                      }
                    </motion.button>
                  </motion.div>
                )}

                {/* ── CONFIRMED ── */}
                {status === "confirmed" && (
                  <motion.div key="confirmed" layout
                    initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col flex-1 items-center justify-center gap-6 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 240, damping: 14, delay: 0.1 }}
                      className="relative"
                    >
                      <div className="w-24 h-24 rounded-full bg-zinc-100 border-2 border-zinc-200 flex items-center justify-center">
                        <CheckCircle2 size={44} className="text-zinc-900" />
                      </div>
                      {/* Confetti rings */}
                      {[0, 1].map(i => (
                        <motion.div key={i}
                          initial={{ scale: 1, opacity: 0.5 }}
                          animate={{ scale: 2.2 + i * 0.6, opacity: 0 }}
                          transition={{ duration: 0.9, delay: 0.2 + i * 0.15 }}
                          className="absolute inset-0 rounded-full border-2 border-zinc-900"
                        />
                      ))}
                    </motion.div>
                    <div>
                      <motion.h3
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        className="text-2xl font-black text-zinc-900 mb-1"
                      >Ride Confirmed!</motion.h3>
                      <motion.p
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                        className="text-zinc-400 text-sm font-medium max-w-xs"
                      >Your driver is on the way. Track live from the ride screen.</motion.p>
                    </div>
                    <motion.button
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                      whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.03 }}
                      onClick={() => { window.location.href = `/ride/${bookingId}`; }}
                      className="flex items-center gap-2.5 bg-zinc-900 hover:bg-black text-white font-black text-sm px-8 py-4 rounded-2xl transition-colors shadow-md"
                    >
                      Track Your Ride <ArrowRight size={16} />
                    </motion.button>
                  </motion.div>
                )}

                {/* ── CANCELLED ── */}
                {status === "cancelled" && (
                  <motion.div key="cancelled"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col flex-1 items-center justify-center gap-5 text-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-zinc-100 border-2 border-zinc-200 flex items-center justify-center">
                      <XCircle size={34} className="text-zinc-900" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-zinc-900 mb-1">Booking Cancelled</h3>
                      <p className="text-zinc-400 text-sm font-medium">Your request has been cancelled successfully.</p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}
                      onClick={() => { setBookingId(null); setStatus("idle"); setPaymentMethod(null); }}
                      className="flex items-center gap-2 bg-zinc-900 text-white font-black text-sm px-6 py-3.5 rounded-2xl hover:bg-black transition-colors"
                    >
                      <RotateCcw size={14} /> Book Again
                    </motion.button>
                  </motion.div>
                )}

                {/* ── REJECTED ── */}
                {status === "rejected" && (
                  <motion.div key="rejected"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col flex-1 items-center justify-center gap-5 text-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-zinc-100 border-2 border-zinc-200 flex items-center justify-center">
                      <XCircle size={34} className="text-red-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-zinc-900 mb-1">Request Rejected</h3>
                      <p className="text-zinc-400 text-sm font-medium">Driver declined this booking. Try another driver.</p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}
                      onClick={() => { setBookingId(null); setStatus("idle"); setPaymentMethod(null); }}
                      className="flex items-center gap-2 bg-zinc-900 text-white font-black text-sm px-6 py-3.5 rounded-2xl hover:bg-black transition-colors"
                    >
                      <RotateCcw size={14} /> Try Again
                    </motion.button>
                  </motion.div>
                )}

                {/* ── EXPIRED ── */}
                {status === "expired" && (
                  <motion.div key="expired"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col flex-1 items-center justify-center gap-5 text-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-zinc-100 border-2 border-zinc-200 flex items-center justify-center">
                      <AlertCircle size={34} className="text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-zinc-900 mb-1">Request Timed Out</h3>
                      <p className="text-zinc-400 text-sm font-medium">No response from driver. Please try again.</p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}
                      onClick={() => { setBookingId(null); setStatus("idle"); setPaymentMethod(null); }}
                      className="flex items-center gap-2 bg-zinc-900 text-white font-black text-sm px-6 py-3.5 rounded-2xl hover:bg-black transition-colors"
                    >
                      <RotateCcw size={14} /> Try Again
                    </motion.button>
                  </motion.div>
                )}

              </AnimatePresence>

              {/* Footer trust badge */}
              <div className="flex items-center justify-center gap-2 pt-6 mt-auto border-t border-zinc-100">
                <ShieldCheck size={13} className="text-zinc-400" />
                <span className="text-zinc-400 text-[10px] font-semibold tracking-wide uppercase">Secure & Verified Booking</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-100" />}>
      <CheckoutContent />
    </Suspense>
  );
}
