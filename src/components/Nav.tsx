"use client";

import { AnimatePresence, motion, spring } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { redirect, usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import AuthModel from "./AuthModel";
import { useSession, signOut } from "next-auth/react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import {
  Bike,
  Car,
  ChevronRight,
  LogOutIcon,
  MenuIcon,
  Truck,
  X,
} from "lucide-react";

function Nav() {
  const [authOpen, setAuthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const Nav_Items = ["Home", "Bookings", "About Us", "Contact"];
  const [menuOpen, setMenuOpen] = useState(false);
  const pathName = usePathname();

  const { data: session, status } = useSession();
  const { userData } = useSelector((state: RootState) => state.user);
  const user = session?.user;
  const router = useRouter();

  // Unified role check (Session role or fresh Redux role)
  const currentRole = userData?.role || user?.role;
  const isPartner = currentRole === "partner";
  const isAdmin = currentRole === "admin";
  if (status === "loading") return null;

  return (
    <>
      {/* ── Navbar pill ── */}
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="fixed top-3 left-1/2 -translate-x-1/2 w-[94%] md:w-[86%] z-50 rounded-full bg-[#0B0B0B]/90 backdrop-blur-md border border-white/10 text-white shadow-[0_20px_60px_rgba(0,0,0,0.8)] py-2.5"
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">

          {/* Logo */}
          <Image src={"/logo.png"} alt="logo" width={42} height={42} priority style={{ width: "auto", height: "auto" }} className="drop-shadow-md" />

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            {Nav_Items.map((i, index) => {
              const href = i === "Home" ? "/" : `/${i.toLowerCase()}`;
              const isActive = href === pathName;

              return (
                <Link
                  href={href}
                  key={index}
                  className="relative group flex flex-col items-center gap-0.5"
                >
                  <span
                    className={`text-sm font-medium tracking-wide transition-colors duration-200 ${
                      isActive ? "text-white" : "text-gray-400 group-hover:text-white"
                    }`}
                  >
                    {i}
                  </span>
                  {/* animated underline */}
                  <motion.span
                    layoutId="nav-underline"
                    className={`h-[2px] rounded-full bg-white transition-all duration-300 ${
                      isActive ? "w-full opacity-100" : "w-0 opacity-0 group-hover:w-full group-hover:opacity-40"
                    }`}
                  />
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3 relative">

            {/* Desktop auth / profile */}
            <div className="hidden md:block relative">
              {!user ? (
                <button
                  onClick={() => setAuthOpen(true)}
                  className="px-5 py-1.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-gray-100 active:scale-95 transition-all duration-200 shadow-sm"
                >
                  Login
                </button>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <button
                      className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center font-bold text-sm ring-2 ring-white/20 hover:ring-white/50 transition-all duration-200 shadow-md"
                      onClick={() => setProfileOpen((p) => !p)}
                    >
                      {user?.name?.[0]?.toUpperCase() || "?"}
                    </button>

                    {/* Desktop dropdown */}
                    <AnimatePresence>
                      {profileOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.97 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-12 right-0 w-[280px] bg-white text-black rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                        >
                          {/* Card header */}
                          <div className="bg-linear-to-br from-gray-900 to-gray-800 px-5 pt-5 pb-6">
                            <div className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center font-bold text-base mb-3 shadow">
                              {user?.name?.[0]?.toUpperCase() || "?"}
                            </div>
                            <p className="text-white text-sm font-semibold leading-tight">{user?.name}</p>
                            <p className="text-gray-400 text-xs mt-0.5 truncate">{user?.email}</p>
                            {currentRole && (
                              <span className="mt-2 inline-block text-[10px] font-semibold uppercase tracking-widest bg-white/10 text-white/80 px-2 py-0.5 rounded-full">
                                {currentRole}
                              </span>
                            )}
                          </div>

                          <div  className="p-3 space-y-1">
                            {!isPartner && !isAdmin && (
                              <Link 
                                href='/partner/onboarding/vehicle' 
                                onClick={() => setProfileOpen(false)}
                                className="w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-50 rounded-xl transition-colors text-sm font-medium text-gray-800"
                              >
                                <div className="flex items-center shrink-0">
                                  <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center ring-2 ring-white z-30">
                                    <Bike size={13} />
                                  </div>
                                  <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center ring-2 ring-white -ml-2 z-20">
                                    <Car size={13} />
                                  </div>
                                  <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center ring-2 ring-white -ml-2 z-10">
                                    <Truck size={13} />
                                  </div>
                                </div>
                                <span>Become a partner</span>
                                <ChevronRight size={15} className="ml-auto text-gray-400" />
                              </Link>
                            )}
                            <button
                              onClick={() => signOut({ redirect: false })}
                              className="w-full flex items-center gap-3 px-3 py-3 hover:bg-red-50 text-red-500 rounded-xl transition-colors text-sm font-medium"
                            >
                              <LogOutIcon size={15} />
                              Logout
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>

            {/* Mobile: avatar or login */}
            <div className="md:hidden">
              {!user ? (
                <button
                  onClick={() => setAuthOpen(true)}
                  className="px-4 py-1.5 rounded-full bg-white text-black text-sm font-semibold active:scale-95 transition-all duration-200"
                >
                  Login
                </button>
              ) : (
                <button
                  className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center font-bold text-sm ring-2 ring-white/20 active:scale-95 transition-all duration-200"
                  onClick={() => setProfileOpen((p) => !p)}
                >
                  {user?.name?.[0]?.toUpperCase() || "?"}
                </button>
              )}
            </div>

            {/* Hamburger */}
            <button
              className="md:hidden text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => setMenuOpen((p) => !p)}
            >
              <AnimatePresence mode="wait" initial={false}>
                {menuOpen ? (
                  <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <X size={24} />
                  </motion.span>
                ) : (
                  <motion.span key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <MenuIcon size={24} />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Mobile menu dropdown ── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="inset-0 fixed bg-black z-30 md:hidden"
            />
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed top-[78px] left-1/2 -translate-x-1/2 w-[92%] bg-[#111111] border border-white/10 rounded-2xl shadow-2xl z-40 md:hidden overflow-hidden"
            >
              {/* Menu header label */}
              <div className="px-5 pt-4 pb-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Navigation</p>
              </div>
              <div className="flex flex-col pb-2">
                {Nav_Items.map((i, index) => {
                  const href = i === "Home" ? "/" : `/${i.toLowerCase()}`;
                  const isActive = href === pathName;
                  return (
                    <Link
                      href={href}
                      key={index}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center justify-between mx-2 px-4 py-3.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                        isActive
                          ? "text-white bg-white/10"
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <span>{i}</span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Mobile profile bottom sheet ── */}
      <AnimatePresence>
        {profileOpen && user && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setProfileOpen(false)}
              className="inset-0 fixed bg-black z-40 md:hidden"
            />
            <motion.div
              initial={{ y: 400 }}
              animate={{ y: 0 }}
              exit={{ y: 400 }}
              transition={{ type: spring, damping: 28, stiffness: 280 }}
              className="fixed bottom-0 inset-x-0 bg-white rounded-t-3xl shadow-2xl z-50 md:hidden"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-200" />
              </div>

              {/* Sheet header */}
              <div className="px-5 pt-3 pb-5 bg-linear-to-br from-gray-900 to-gray-800 mx-4 mt-2 rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center font-bold text-lg mb-3 shadow">
                  {user?.name?.[0]?.toUpperCase() || "?"}
                </div>
                <p className="text-white text-sm font-semibold">{user?.name}</p>
                <p className="text-gray-400 text-xs mt-0.5 truncate">{user?.email}</p>
                {user?.role && (
                  <span className="mt-2 inline-block text-[10px] font-semibold uppercase tracking-widest bg-white/10 text-white/80 px-2 py-0.5 rounded-full">
                    {user.role}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="p-4 space-y-1">
                {user.role !== "partner" && (
                  <button onClick={()=>router.push('/partner/onboarding/vehicle')}  className="w-full flex items-center gap-3 px-4 py-4 bg-gray-50 hover:bg-gray-100 text-gray-800 rounded-xl transition-colors text-sm font-medium">
                    <div className="flex items-center shrink-0">
                      <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center ring-2 ring-white z-30">
                        <Bike size={13} />
                      </div>
                      <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center ring-2 ring-white -ml-2 z-20">
                        <Car size={13} />
                      </div>
                      <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center ring-2 ring-white -ml-2 z-10">
                        <Truck size={13} />
                      </div>
                    </div>
                    Become a partner
                    <ChevronRight size={15} className="ml-auto text-gray-400" />
                  </button>
                )}
                <button
                  onClick={() => signOut({ redirect: false })}
                  className="w-full flex items-center gap-3 px-4 py-4 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-colors text-sm font-medium"
                >
                  <LogOutIcon size={15} />
                  Logout
                </button>
              </div>

              {/* Safe area spacer */}
              <div className="pb-6" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AuthModel open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}

export default Nav;
