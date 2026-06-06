"use client";

import { motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { EASE, PrimaryButton } from "./landing/ui";

const MARQUEE = [
  "Bikes",
  "Cars",
  "SUVs",
  "Trucks",
  "Vans",
  "Minivans",
  "Auto",
  "Cargo",
];

export default function LandingCTA({
  onAuthRequired,
}: {
  onAuthRequired: () => void;
}) {
  const { userData } = useSelector((state: RootState) => state.user);
  const { status } = useSession();
  const router = useRouter();
  const isAuthenticated = status === "authenticated" || !!userData;

  const handleBook = () => {
    if (!isAuthenticated) {
      onAuthRequired();
      return;
    }
    router.push("/user/book");
  };

  return (
    <section className="landing-section overflow-hidden bg-landing-bg landing-noise">
      <div className="landing-container">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, ease: EASE }}
          className="relative overflow-hidden rounded-4xl border border-white/8 bg-white px-8 py-14 sm:rounded-[2.5rem] sm:px-14 sm:py-16"
        >
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-landing-accent/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.4]"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, rgba(158,255,107,0.08), transparent 50%)`,
            }}
          />

          <div className="relative z-10 flex flex-col items-start justify-between gap-10 lg:flex-row lg:items-center">
            <div className="max-w-xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5">
                <Sparkles size={12} className="text-landing-accent" />
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Ready when you are
                </span>
              </div>

              <h2 className="font-display text-4xl font-bold leading-[0.95] tracking-[-0.03em] text-zinc-950 sm:text-5xl lg:text-6xl">
                Your next ride
                <br />
                <span className="text-accent-gradient">starts here.</span>
              </h2>

              <p className="mt-5 max-w-md text-base leading-relaxed text-zinc-500">
                Join thousands of riders on Rydex. Book your first trip in under
                60 seconds — free to start, no commitment.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row lg:flex-col">
              <PrimaryButton
                variant="dark"
                onClick={handleBook}
                className="px-9! py-4!"
              >
                Book a ride
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </PrimaryButton>

              <motion.a
                href="/partner/onboarding/vehicle"
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-zinc-200 px-9 py-4 text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-400 hover:text-zinc-950"
              >
                Become a partner
              </motion.a>
            </div>
          </div>

          <div className="relative mt-12 overflow-hidden border-t border-zinc-100 pt-8">
            <motion.div
              className="flex w-max gap-10"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
            >
              {[...MARQUEE, ...MARQUEE].map((v, i) => (
                <span
                  key={`${v}-${i}`}
                  className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300"
                >
                  {v}
                  <span className="mx-6 text-zinc-200">·</span>
                </span>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
