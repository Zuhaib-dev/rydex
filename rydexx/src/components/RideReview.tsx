"use client";

import { useState, useEffect, useCallback } from "react";

const PRAISE_TAGS = [
  "Smooth Driver",
  "On Time",
  "Clean Vehicle",
  "Safe",
  "Friendly",
  "Professional",
  "Good Navigation",
  "Comfortable Ride",
];

interface RideReviewProps {
  bookingId: string;
  /** "user" = rider reviewing driver, "partner" = driver reviewing rider */
  role: "user" | "partner";
  driverName?: string;
  userName?: string;
}

export default function RideReview({ bookingId, role, driverName, userName }: RideReviewProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const revieweeName = role === "user" ? (driverName ?? "your driver") : (userName ?? "your rider");

  // Check if already reviewed on mount
  useEffect(() => {
    if (!bookingId) return;
    fetch(`/api/reviews?bookingId=${bookingId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.hasReviewed) {
          // Small delay so it doesn't appear before the "Completed" status renders
          setTimeout(() => setVisible(true), 1200);
        }
      })
      .catch(() => {});
  }, [bookingId]);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Please select a star rating.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          rating,
          praiseTags: selectedTags,
          comment: comment.trim(),
        }),
      });
      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => setVisible(false), 2500);
      } else {
        const data = await res.json();
        setError(data.message || "Failed to submit review.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible || dismissed) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
          zIndex: 9998,
          animation: "fadeIn 0.3s ease",
        }}
        onClick={() => setDismissed(true)}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)",
          borderRadius: "24px 24px 0 0",
          padding: "28px 24px 40px",
          animation: "slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            width: 40,
            height: 4,
            background: "rgba(255,255,255,0.2)",
            borderRadius: 99,
            margin: "0 auto 20px",
          }}
        />

        {submitted ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>⭐</div>
            <h3 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>
              Review Submitted!
            </h3>
            <p style={{ color: "rgba(255,255,255,0.6)", margin: 0 }}>
              Thanks for rating {revieweeName}.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  margin: "0 auto 12px",
                }}
              >
                {role === "user" ? "🚗" : "👤"}
              </div>
              <h3
                style={{
                  color: "#fff",
                  fontSize: 20,
                  fontWeight: 700,
                  margin: "0 0 4px",
                }}
              >
                How was your ride?
              </h3>
              <p style={{ color: "rgba(255,255,255,0.55)", margin: 0, fontSize: 14 }}>
                Rate {revieweeName}
              </p>
            </div>

            {/* Star Rating */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 8,
                marginBottom: 24,
              }}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 42,
                    padding: 0,
                    lineHeight: 1,
                    transition: "transform 0.15s ease",
                    transform: (hovered || rating) >= star ? "scale(1.15)" : "scale(1)",
                    filter: (hovered || rating) >= star ? "none" : "grayscale(1) opacity(0.4)",
                  }}
                  aria-label={`${star} star`}
                >
                  ⭐
                </button>
              ))}
            </div>

            {/* Praise Tags */}
            {rating > 0 && (
              <>
                <p
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 13,
                    margin: "0 0 10px",
                    textAlign: "center",
                  }}
                >
                  What did you like? <span style={{ opacity: 0.5 }}>(optional)</span>
                </p>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    justifyContent: "center",
                    marginBottom: 20,
                  }}
                >
                  {PRAISE_TAGS.map((tag) => {
                    const selected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        style={{
                          padding: "7px 14px",
                          borderRadius: 99,
                          border: `1.5px solid ${selected ? "#6366f1" : "rgba(255,255,255,0.15)"}`,
                          background: selected
                            ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
                            : "rgba(255,255,255,0.06)",
                          color: "#fff",
                          fontSize: 13,
                          fontWeight: selected ? 600 : 400,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>

                {/* Comment */}
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment… (optional)"
                  maxLength={300}
                  rows={3}
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    border: "1.5px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#fff",
                    fontSize: 14,
                    padding: "12px 14px",
                    resize: "none",
                    outline: "none",
                    boxSizing: "border-box",
                    marginBottom: 16,
                    fontFamily: "inherit",
                  }}
                />
              </>
            )}

            {error && (
              <p
                style={{
                  color: "#f87171",
                  fontSize: 13,
                  textAlign: "center",
                  margin: "0 0 12px",
                }}
              >
                {error}
              </p>
            )}

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setDismissed(true)}
                style={{
                  flex: 1,
                  padding: "14px",
                  borderRadius: 12,
                  border: "1.5px solid rgba(255,255,255,0.15)",
                  background: "transparent",
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 15,
                  cursor: "pointer",
                }}
              >
                Skip
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || rating === 0}
                style={{
                  flex: 2,
                  padding: "14px",
                  borderRadius: 12,
                  border: "none",
                  background:
                    rating === 0
                      ? "rgba(99,102,241,0.3)"
                      : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: rating === 0 ? "not-allowed" : "pointer",
                  opacity: submitting ? 0.7 : 1,
                  transition: "opacity 0.2s",
                }}
              >
                {submitting ? "Submitting…" : "Submit Review"}
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </>
  );
}
