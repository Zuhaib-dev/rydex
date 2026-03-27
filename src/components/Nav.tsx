"use client";

import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { redirect, usePathname } from "next/navigation";
import { useState } from "react";
import AuthModel from "./AuthModel";
import { useSession, signOut } from "next-auth/react";
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
  const user = session?.user;

  if (status === "loading") return null;

  return (
    <>
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-3 left-1/2 -translate-x-1/2 w-[94%] md:w-[86%] z-50 rounded-full bg-[#0B0B0B] text-white shadow-[0_15px_50px_rgba(0,0,0,0.7)] py-3"
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
          <Image src={"/logo.png"} alt="logo" width={44} height={44} priority />

          <div className="hidden md:flex items-center gap-10">
            {Nav_Items.map((i, index) => {
              const href = i === "Home" ? "/" : `/${i.toLowerCase()}`;
              const isActive = href === pathName;

              return (
                <Link
                  href={href}
                  key={index}
                  className={`text-sm font-medium transition ${
                    isActive ? "text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  {i}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3 relative">
            <div className="hidden md:block relative">
              {!user ? (
                <button
                  onClick={() => setAuthOpen(true)}
                  className="px-4 py-1.5 rounded-full bg-white text-black text-sm"
                >
                  Login
                </button>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <button
                      className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center font-semibold"
                      onClick={() => setProfileOpen((p) => !p)}
                    >
                      {user?.name?.[0]?.toUpperCase() || "?"}
                    </button>
                    <AnimatePresence>
                      {profileOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="absolute top-14 right-0 w-[300px] bg-white text-black rounded-2xl shadow-xl border"
                        >
                          <div className="p-5">
                            <p className="text-sm font-medium">{user?.name}</p>
                            <p className="text-xs text-gray-500">
                              {user?.email}
                            </p>
                            <p className="text-xs text-gray-500">
                              {user?.role}
                            </p>
                            {user.role != "partner" && (
                              <div className="w-full flex items-center gap-3 py-3 hover:bg-gray-100 rounded-xl">
                                <div className="flex items-center">
                                  <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center ring-2 ring-white z-30">
                                    <Bike size={14} />
                                  </div>
                                  <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center ring-2 ring-white -ml-2 z-20">
                                    <Car size={14} />
                                  </div>
                                  <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center ring-2 ring-white -ml-2 z-10">
                                    <Truck size={14} />
                                  </div>
                                </div>
                                Become a partner
                                <ChevronRight size={16} className="ml-auto" />
                              </div>
                            )}
                            <button
                              onClick={() => signOut({ redirect: false })}
                              className="w-full flex items-center gap-3 py-3 hover:bg-gray-100 rounded-xl mt-2"
                            >
                              <LogOutIcon size={16} />
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
            {/* for mobile */}
            <div className="md:hidden">
              {!user ? (
                <button
                  onClick={() => setAuthOpen(true)}
                  className="px-4 py-1.5 rounded-full bg-white text-black text-sm"
                >
                  Login
                </button>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <button
                      className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center font-semibold"
                      onClick={() => setProfileOpen((p) => !p)}
                    >
                      {user?.name?.[0]?.toUpperCase() || "?"}
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              className="md:hidden text-white"
              onClick={() => setMenuOpen((p) => !p)}
            >
              {menuOpen ? <X size={26} /> : <MenuIcon size={26} />}
            </button>
          </div>
        </div>
      </motion.div>
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="inset-0 fixed bg-black z-30 md:hidden"
            />
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="fixed top-[85px] left-1/2 -translate-x-1/2 w-[92%] bg-[#0B0B0B] rounded-2xl shadow-2xl z-40 md:hidden overflow-hidden"
            >
              <div className="flex flex-col divide-y divide-white/10 ">
                {Nav_Items.map((i, index) => {
                  const href = i === "Home" ? "/" : `/${i.toLowerCase()}`;
                  const isActive = href === pathName;
                  return (
                    <Link
                      href={href}
                      key={index}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center justify-between px-5 py-4 text-sm font-medium transition-colors ${
                        isActive
                          ? "text-white bg-white/5"
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {i}
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {profileOpen && user && (
          <>
          <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="inset-0 fixed bg-black z-30 md:hidden"
            />
            <motion.div
            initial={{}}
            animate={{}}
            transition={{}}
            exit={{}}
            className=""
            >

            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AuthModel open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}

export default Nav;
