"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

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
    if (!isAuthenticated) { onAuthRequired(); return; }
    router.push("/user/book");
  };

  return (
    <section className="w-full bg-[#080808] py-24 sm:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-[2.5rem] bg-white px-8 py-16 sm:px-16 sm:py-20 text-black"
        >
          {/* Decorative gradient blobs */}
          <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-violet-300/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-sky-300/30 blur-3xl" />
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-emerald-200/20 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10">
            <div className="max-w-lg">
              {/* Eyebrow */}
              <div className="flex items-center gap-3 mb-5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
                  Ready when you are
                </span>
              </div>

              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-zinc-900 leading-[0.92] tracking-tight">
                Your next ride
                <br />
                <span className="bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-400 bg-clip-text text-transparent">
                  starts here.
                </span>
              </h2>

              <p className="mt-5 text-base text-zinc-500 max-w-sm leading-relaxed">
                Join thousands of riders already using Rydex. Book your first ride in under 60 seconds — completely free to start.
              </p>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-4 shrink-0">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleBook}
                className="group flex items-center justify-center gap-3 rounded-full bg-zinc-900 px-10 py-4 text-sm font-bold text-white shadow-xl hover:shadow-2xl transition-shadow"
              >
                Book a Ride
                <ArrowRight
                  size={16}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </motion.button>

              <motion.a
                href="/partner/onboarding/vehicle"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center justify-center gap-3 rounded-full border-2 border-zinc-200 px-10 py-4 text-sm font-bold text-zinc-700 hover:border-zinc-400 hover:text-zinc-900 transition-all"
              >
                Become a Partner
              </motion.a>
            </div>
          </div>

          {/* Bottom marquee strip */}
          <div className="relative mt-14 overflow-hidden border-t border-zinc-100 pt-8">
            <div className="flex gap-8 whitespace-nowrap overflow-hidden">
              <motion.div
                className="flex gap-8 shrink-0"
                animate={{ x: ["0%", "-50%"] }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
              >
                {[
                  "Bikes", "Cars", "SUVs", "Trucks", "Vans", "Minivans",
                  "Bikes", "Cars", "SUVs", "Trucks", "Vans", "Minivans",
                ].map((v, i) => (
                  <span key={i} className="text-sm font-black uppercase tracking-widest text-zinc-200">
                    {v} <span className="text-zinc-300">·</span>
                  </span>
                ))}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
