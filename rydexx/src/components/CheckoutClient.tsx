"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Navigation, ShieldCheck,
  Bike, Car, Truck, Loader2, CheckCircle2,
  XCircle, Clock, CreditCard, Banknote,
  ArrowRight, RotateCcw, AlertCircle, Wallet,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useBookingRealtime } from "@/hooks/useBookingRealtime";

const VEHICLE_ICONS: Record<string, any> = {
  bike: Bike, auto: Car, car: Car, loading: Truck, truck: Truck,
};

type Status =
  | "idle" | "requested" | "awaiting_payment"
  | "rejected" | "expired" | "cancelled"
  | "payment" | "confirmed";

export default function CheckoutClient() {
  const params = useSearchParams();

  const pickup    = params.get("pickup")    || "Pickup Location";
  const drop      = params.get("drop")      || "Drop Location";
  const vehicle   = params.get("vehicle")   || "car";
  const vehicleId = params.get("vehicleId");
  const fare      = Number(params.get("fare")) || 249;
  const mobileNumber = params.get("mobileNumber") || "";
  const driverId  = params.get("driverId");
  const pickupLat = Number(params.get("pickupLat"));
  const pickupLng = Number(params.get("pickupLng"));
  const dropLat   = Number(params.get("dropLat"));
  const dropLng   = Number(params.get("dropLng"));

  const VehicleIcon = VEHICLE_ICONS[vehicle.toLowerCase()] || Car;

  const [loading,       setLoading]       = useState(false);
  const [bookingId,     setBookingId]     = useState<string | null>(null);
  const [status,        setStatus]        = useState<Status>("idle");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online" | null>(null);

  /* ── CREATE BOOKING ── */
  const handleCreateBooking = async () => {
    try {
      setLoading(true);
      const res  = await fetch("/api/booking/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId, driverId,
          pickupAddress: pickup, dropAddress: drop,
          pickupLocation: { type: "Point", coordinates: [pickupLng, pickupLat] },
          dropLocation:   { type: "Point", coordinates: [dropLng,   dropLat]   },
          fare, mobileNumber,
        }),
      });
      const data = await res.json();
      if (data.success) { setBookingId(data.booking._id); setStatus("requested"); }
      else alert(data.message || "Booking failed");
    } catch { alert("Something went wrong"); }
    finally { setLoading(false); }
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

  /* ── SOCKET ── */
  useEffect(() => {
    const socket = getSocket();
    const handleBookingUpdated = (data: { bookingId?: string; status?: Status }) => {
      if (bookingId && data.bookingId && data.bookingId !== bookingId) return;
      if (data.status === "awaiting_payment") setStatus("awaiting_payment");
      if (data.status === "rejected")         setStatus("rejected");
      if (data.status === "confirmed")        setStatus("confirmed");
    };

    socket.on("booking-updated", handleBookingUpdated);
    return () => { socket.off("booking-updated", handleBookingUpdated); };
  }, [bookingId]);

  /* ── RESTORE ── */
  useEffect(() => {
    (async () => {
      const res  = await fetch("/api/booking/my-active");
      const data = await res.json();
      if (data.booking) { setBookingId(data.booking._id); setStatus(data.booking.status); }
    })();
  }, []);

  /* ── awaiting_payment → payment after 2s ── */
  useEffect(() => {
    if (status !== "awaiting_payment") return;
    const t = setTimeout(() => setStatus("payment"), 2000);
    return () => clearTimeout(t);
  }, [status]);

  /* ── label ── */
  const vehicleLabel = vehicle.charAt(0).toUpperCase() + vehicle.slice(1);

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
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px w-8 bg-zinc-900" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Booking</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-900">Checkout</h1>
          <p className="text-zinc-400 text-sm mt-1.5 font-medium">Review your ride and confirm</p>
        </motion.div>

        {/* rest of JSX is same as page.tsx... */}

      </div>
    </div>
  );
}
