"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  IndianRupee,
  User2,
  Star,
} from "lucide-react";
import type { IBooking, PaymentStatus } from "./types";
import { PAYMENT_BADGE } from "./types";

const PASSENGER_PRAISE_TAGS = [
  "Punctual",
  "Polite",
  "Quiet",
  "Friendly",
  "Respectful",
];

export function CompletedScreen({ booking }: { booking: IBooking }) {
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
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
      if (!res.ok) throw new Error(data.message || "Failed to submit review");
      setSubmitted(true);
      setTimeout(() => {
        window.location.href = "/partner/pending-requests";
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const paymentBadge =
    PAYMENT_BADGE[booking.paymentStatus as PaymentStatus] ??
    ({ label: booking.paymentStatus, cls: "bg-zinc-700 text-zinc-300" } as const);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="h-screen w-full bg-zinc-950 flex flex-col overflow-y-auto"
    >
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Checkmark */}
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

          {/* Fare card */}
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
                className={`px-2.5 py-1 rounded-full font-semibold text-[11px] ${paymentBadge.cls}`}
              >
                {paymentBadge.label}
              </span>
            </div>
          </div>

          {/* Customer card */}
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

          {/* Route summary */}
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

          {/* Rate Passenger */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-4">
            <p className="text-zinc-400 text-sm font-semibold text-center mb-3">
              How was passenger {(booking.user as any)?.name || "Customer"}?
            </p>

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
                  {/* Praise tags */}
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

                  {/* Comment */}
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share a comment about the passenger (optional)..."
                    rows={3}
                    className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 resize-none transition-colors"
                  />

                  {error && (
                    <p className="text-red-500 text-xs text-center font-medium">
                      {error}
                    </p>
                  )}

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
            onClick={() => (window.location.href = "/partner/pending-requests")}
            className="w-full border border-zinc-700 text-zinc-400 py-4 rounded-2xl text-sm font-semibold hover:bg-zinc-900 hover:text-white transition-all duration-200"
          >
            Back to Dashboard
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
}
