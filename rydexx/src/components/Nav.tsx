"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import {
  Menu,
  X,
  LogOut,
  Bike,
  Car,
  Truck,
  ChevronRight,
  Mail,
  Phone,
  ShieldCheck,
  CalendarDays,
  ClipboardList,
  Star,
} from "lucide-react";
import AuthModal from "./AuthModel";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import { signOut, useSession } from "next-auth/react";
import { setUserData } from "@/redux/userSlice";
import axios from "axios";
import { getSocket } from "@/lib/socket";
import NotificationBell from "./NotificationBell";
import { playNotificationSound, triggerHapticFeedback } from "@/lib/chatEffects";

const NAV_ITEMS = ["Home", "Bookings", "Fleet", "FAQ", "Contact"];
const subscribeHydration = () => () => {};

type ProfileUser = {
  name?: string | null;
  email?: string | null;
  role?: string | null;
  mobileNumber?: string | null;
  partnerStatus?: string | null;
  isEmailVerified?: boolean | null;
  createdAt?: string | Date | null;
  ratingAverage?: number;
  ratingCount?: number;
  praiseTags?: Record<string, number> | Map<string, number> | any;
};

type ProfileContentProps = {
  userData: ProfileUser;
  profileImage?: string | null;
  profileName: string;
  handleLogout: () => Promise<void>;
  router: {
    push: (href: string) => void;
  };
  mobile?: boolean;
};

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authRedirectTo, setAuthRedirectTo] = useState<string | undefined>();
  const [profileOpen, setProfileOpen] = useState(false);

  const [pendingCount, setPendingCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);

  const { data: session, status } = useSession();
  const isHydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const pathname = usePathname();
  const router = useRouter();
  const profileRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Lock scroll when either menu or mobile profile sheet is open
  useScrollLock(menuOpen || profileOpen);
  useFocusTrap(mobileMenuRef, menuOpen);
  useFocusTrap(profileRef, profileOpen);

  // Global Escape Listener for menus
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (menuOpen) setMenuOpen(false);
        if (profileOpen) setProfileOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [menuOpen, profileOpen]);

  const dispatch = useDispatch<AppDispatch>();
  const { userData } = useSelector((state: RootState) => state.user);
  const profileUser = userData || session?.user || null;
  const profileImage = userData?.image || session?.user?.image || null;
  const profileName = userData?.name || session?.user?.name || "User";
  const isLoggedIn = Boolean(profileUser) || status === "authenticated";
  const shouldGateBookings = isHydrated && !isLoggedIn;
  const isLandingHome =
    pathname === "/" &&
    userData?.role !== "partner" &&
    userData?.role !== "admin";

  /* Scroll */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Fetch vendor counts and listen for realtime updates */
  useEffect(() => {
    if (userData?.role !== "partner") return;

    const fetchCounts = async () => {
      try {
        const res = await axios.get("/api/partner/bookings/counts");
        setPendingCount(res.data.pending || 0);
        setActiveCount(res.data.active || 0);
      } catch {}
    };

    fetchCounts();

    const socket = getSocket();

    const handleNewBooking = () => {
      setTimeout(fetchCounts, 500);
      if (pathname !== "/partner/pending-requests") {
        playNotificationSound("request");
        triggerHapticFeedback();
      }
    };

    const handleBookingUpdated = () => {
      setTimeout(fetchCounts, 500);
    };

    socket.on("new-booking", handleNewBooking);
    socket.on("booking-updated", handleBookingUpdated);
 
    return () => {
      socket.off("new-booking", handleNewBooking);
      socket.off("booking-updated", handleBookingUpdated);
    };
  }, [userData]);

  /* Close on route change */
  useEffect(() => {
    const id = window.setTimeout(() => {
      setMenuOpen(false);
      setProfileOpen(false);
    }, 0);

    return () => window.clearTimeout(id);
  }, [pathname]);

  /* Desktop outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    dispatch(setUserData(null));
    setProfileOpen(false);
    router.push("/");
  };

  const openAuth = (redirectTo?: string) => {
    setAuthRedirectTo(redirectTo);
    setAuthOpen(true);
  };

  const handleBookingsClick = () => {
    setMenuOpen(false);
    openAuth("/bookings");
  };

  const renderNavItems = () => {
    if (userData?.role === "partner") {
      return (
        <>
         <Link
            href="/partner/active-ride"
            className="relative text-sm font-medium text-gray-300 hover:text-white transition"
          >
            Active Ride
            {pendingCount > 0 && (
              <span className="absolute -top-2 -right-5 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {pendingCount}
              </span>
            )}
          </Link>

          <Link
            href="/partner/pending-requests"
            className="relative text-sm font-medium text-gray-300 hover:text-white transition"
          >
            Pending Requests
            {pendingCount > 0 && (
              <span className="absolute -top-2 -right-5 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {pendingCount}
              </span>
            )}
          </Link>

          <Link
            href="/partner/bookings"
            className="relative text-sm font-medium text-gray-300 hover:text-white transition"
          >
            My Bookings
            {activeCount > 0 && (
              <span className="absolute -top-2 -right-5 w-6 h-6 bg-green-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {activeCount}
              </span>
            )}
          </Link>

          <Link
            href="/partner/vehicle"
            className="relative text-sm font-medium text-gray-300 hover:text-white transition"
          >
            My Vehicle
          </Link>
        </>
      );
    }

    return NAV_ITEMS.map((item) => {
      const href = item === "Home" ? "/" : `/${item.toLowerCase()}`;
      const active = pathname === href;
      if (item === "Bookings" && shouldGateBookings) {
        return (
          <button
            key={item}
            type="button"
            onClick={handleBookingsClick}
            className="text-sm font-medium text-gray-400 hover:text-white transition"
          >
            {item}
          </button>
        );
      }

      return (
        <Link
          key={item}
          href={href}
          className={`text-sm font-medium transition ${
            active
              ? "text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          {item}
        </Link>
      );
    });
  };

  return (
    <>
      {/* ================= NAVBAR ================= */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-3 left-1/2 z-50 w-[94%] -translate-x-1/2 rounded-full text-white transition-all duration-500 md:w-[86%] ${
          isLandingHome && !scrolled
            ? "border border-white/10 bg-landing-bg/55 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.25)] backdrop-blur-xl"
            : "bg-[#0B0B0B] shadow-[0_15px_50px_rgba(0,0,0,0.7)]"
        } ${scrolled ? "py-2" : "py-3"}`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">

          {/* LOGO */}
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="RYDEX" width={44} height={44} priority className="h-11 w-11 object-contain" />
          </Link>

          {/* DESKTOP NAV */}
          <div className="hidden md:flex items-center gap-10">
            {renderNavItems()}
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-3 relative">
            {isLoggedIn && <NotificationBell />}

            {/* DESKTOP PROFILE */}
            <div className="hidden md:block relative" ref={profileRef}>
              {!isLoggedIn ? (
                <button
                  onClick={() => openAuth()}
                  className="rounded-full border border-white/20 px-6 py-2.5 text-sm font-semibold transition hover:border-landing-accent/40 hover:bg-white hover:text-black"
                >
                  Login
                </button>
              ) : (
                <>
                  <button
                    aria-haspopup="true"
                    aria-expanded={profileOpen}
                    aria-controls="profile-menu"
                    onClick={() => setProfileOpen((p) => !p)}
                    className="w-11 h-11 rounded-full overflow-hidden border border-white/20 flex items-center justify-center bg-white text-black font-bold shrink-0 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    aria-label="Open profile menu"
                  >
                    <UserAvatar image={profileImage} name={profileName} />
                  </button>

                  <AnimatePresence>
                    {profileOpen && profileUser && (
                      <motion.div
                        id="profile-menu"
                        role="dialog"
                        aria-label="User Profile Menu"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-14 right-0 w-[340px] overflow-hidden rounded-2xl border border-black/10 bg-white text-black shadow-[0_24px_80px_rgba(0,0,0,0.22)]"
                      >
                        <ProfileContent userData={profileUser} profileImage={profileImage} profileName={profileName} handleLogout={handleLogout} router={router} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>

            {/* MOBILE PROFILE BUTTON */}
            <div className="md:hidden">
              {!isLoggedIn ? (
                <button onClick={() => openAuth()} className="px-4 py-1.5 rounded-full bg-white text-black text-sm">
                  Login
                </button>
              ) : (
                <button
                    aria-haspopup="true"
                    aria-expanded={profileOpen}
                    aria-controls="profile-menu-mobile"
                    onClick={() => setProfileOpen(true)}
                    className="w-9 h-9 rounded-full overflow-hidden border border-white/20 flex items-center justify-center bg-white text-black font-bold shrink-0 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    aria-label="Open profile menu"
                  >
                    <UserAvatar image={profileImage} name={profileName} />
                  </button>
              )}
            </div>

            {/* BURGER */}
            <button
              aria-label="Toggle navigation menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((p) => !p)}
              className="md:hidden text-white focus-visible:ring-2 focus-visible:ring-white rounded p-1 relative"
            >
              {menuOpen ? <X size={26} /> : <Menu size={26} />}
              {pendingCount > 0 && !menuOpen && (
                <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#0B0B0B]" />
              )}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* MOBILE MENU */}
      {/* MOBILE MENU */}
<AnimatePresence>
  {menuOpen && (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        exit={{ opacity: 0 }}
        onClick={() => setMenuOpen(false)}
        className="fixed inset-0 bg-black z-30 md:hidden"
      />

      {/* Menu Panel */}
      <motion.div
        id="mobile-menu"
        ref={mobileMenuRef}
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
        className="
          fixed top-[85px] left-1/2 -translate-x-1/2
          w-[92%]
          bg-[#0B0B0B]
          rounded-2xl
          shadow-2xl
          z-40
          md:hidden
          overflow-hidden
        "
      >
        <div className="flex flex-col divide-y divide-white/10">

          {userData?.role === "partner" ? (
            <>
            <Link
                href="/partner/active-ride"
                className="flex justify-between items-center px-6 py-4 text-gray-300 hover:bg-white/5"
                onClick={() => setMenuOpen(false)}
              >
                <span>Active Ride</span>
               
              </Link>
              <Link
                href="/partner/pending-requests"
                className="flex justify-between items-center px-6 py-4 text-gray-300 hover:bg-white/5"
                onClick={() => setMenuOpen(false)}
              >
                <span>Pending Requests</span>
                {pendingCount > 0 && (
                  <span className="w-6 h-6 bg-red-500 text-xs rounded-full flex items-center justify-center font-bold text-white">
                    {pendingCount}
                  </span>
                )}
              </Link>

              <Link
                href="/partner/bookings"
                className="flex justify-between items-center px-6 py-4 text-gray-300 hover:bg-white/5"
                onClick={() => setMenuOpen(false)}
              >
                <span>My Bookings</span>
                {activeCount > 0 && (
                  <span className="w-6 h-6 bg-green-500 text-xs rounded-full flex items-center justify-center font-bold text-white">
                    {activeCount}
                  </span>
                )}
              </Link>

              <Link
                href="/partner/vehicle"
                className="flex justify-between items-center px-6 py-4 text-gray-300 hover:bg-white/5"
                onClick={() => setMenuOpen(false)}
              >
                <span>My Vehicle</span>
              </Link>
            </>
          ) : (
            NAV_ITEMS.map((item) => {
              const href = item === "Home" ? "/" : `/${item.toLowerCase()}`;
              if (item === "Bookings" && shouldGateBookings) {
                return (
                  <button
                    key={item}
                    type="button"
                    className="px-6 py-4 text-left text-gray-300 hover:bg-white/5"
                    onClick={handleBookingsClick}
                  >
                    {item}
                  </button>
                );
              }

              return (
                <Link
                  key={item}
                  href={href}
                  className="px-6 py-4 text-gray-300 hover:bg-white/5"
                  onClick={() => setMenuOpen(false)}
                >
                  {item}
                </Link>
              );
            })
          )}

        </div>
      </motion.div>
    </>
  )}
</AnimatePresence>

      {/* MOBILE PROFILE SHEET */}
      <AnimatePresence>
        {profileOpen && profileUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setProfileOpen(false)}
              className="fixed inset-0 bg-black z-40 md:hidden"
            />
            <motion.div
              id="profile-menu-mobile"
              role="dialog"
              aria-label="User Profile Menu"
              initial={{ y: 400 }}
              animate={{ y: 0 }}
              exit={{ y: 400 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl z-50 md:hidden"
            >
              <ProfileContent userData={profileUser} profileImage={profileImage} profileName={profileName} handleLogout={handleLogout} router={router} mobile />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} redirectTo={authRedirectTo} />
    </>
  );
}

function UserAvatar({ image, name }: { image?: string | null; name: string }) {
  if (image) {
    return (
      <Image
        src={image}
        alt={name}
        width={44}
        height={44}
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }

  return <>{name.charAt(0).toUpperCase()}</>;
}

function ProfileContent({
  userData,
  profileImage,
  profileName,
  handleLogout,
  router,
  mobile,
}: ProfileContentProps) {
  const role = userData.role || "user";
  const email = userData.email || "Email not available";
  const joinedDate = userData.createdAt
    ? new Date(userData.createdAt).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className={`${mobile ? "p-5 pb-8" : "p-0"}`}>
      <div className="bg-black px-5 py-5 text-white">
        <div className="flex items-center gap-4">
          {profileImage ? (
            <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-white/25 bg-white">
              <Image
                src={profileImage}
                alt={profileName}
                width={64}
                height={64}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/20 bg-white text-2xl font-bold text-black">
              {profileName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold leading-tight">{profileName}</p>
            <p className="mt-1 truncate text-sm text-white/65">{email}</p>
            {userData.ratingCount && userData.ratingCount > 0 ? (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400">
                <Star size={12} className="fill-amber-400" />
                <span className="font-bold text-white">{userData.ratingAverage?.toFixed(1)}</span>
                <span className="text-white/65">({userData.ratingCount} reviews)</span>
              </div>
            ) : (
              <p className="mt-2 text-xs text-white/45">No ratings yet</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-black">
                {role}
              </span>
              {userData.isEmailVerified && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/40 bg-emerald-400/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-100">
                  <ShieldCheck size={12} />
                  Verified
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 px-5 py-4">
        <ProfileDetail icon={<Mail size={16} />} label="Email" value={email} preserveCase />
        <ProfileDetail icon={<ShieldCheck size={16} />} label="Account role" value={role} />
        {userData.mobileNumber && (
          <ProfileDetail icon={<Phone size={16} />} label="Phone" value={userData.mobileNumber} />
        )}
        {userData.partnerStatus && role === "partner" && (
          <ProfileDetail icon={<ClipboardList size={16} />} label="Partner status" value={userData.partnerStatus} />
        )}
        {joinedDate && (
          <ProfileDetail icon={<CalendarDays size={16} />} label="Joined" value={joinedDate} />
        )}
        {userData.praiseTags && (
          (() => {
            const tagsObj = userData.praiseTags instanceof Map
              ? Object.fromEntries(userData.praiseTags)
              : userData.praiseTags;
            const entries = Object.entries(tagsObj || {});
            if (entries.length === 0) return null;
            return (
              <div className="pt-3 border-t border-gray-200/50 mt-1.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Top Praise Badges</p>
                <div className="flex flex-wrap gap-1.5">
                  {entries
                    .sort((a: any, b: any) => b[1] - a[1])
                    .slice(0, 4)
                    .map(([tag, count]: any) => (
                      <span key={tag} className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        👍 {tag} ({count})
                      </span>
                    ))}
                </div>
              </div>
            );
          })()
        )}
      </div>

      <div className="border-t border-gray-100 px-3 py-3">
        <button
          onClick={() => router.push("/bookings")}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-100"
        >
          <ClipboardList size={17} />
          My Bookings
          <ChevronRight size={16} className="ml-auto text-gray-400" />
        </button>

      {role !== "partner" && (
        <button
          onClick={() => router.push("/partner/onboarding/vehicle")}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-100"
        >
          <VehicleStack />
          Become a Partner
          <ChevronRight size={16} className="ml-auto text-gray-400" />
        </button>
      )}

      {role === "partner" && (
        <button
          onClick={() => router.push("/partner/vehicle")}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-100"
        >
          <VehicleStack />
          My Vehicle
          <ChevronRight size={16} className="ml-auto text-gray-400" />
        </button>
      )}

      <button
        onClick={handleLogout}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
      >
        <LogOut size={16} />
        Logout
      </button>
      </div>
    </div>
  );
}

function ProfileDetail({
  icon,
  label,
  value,
  preserveCase,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  preserveCase?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
        <p className={`truncate text-sm font-semibold text-gray-900 ${preserveCase ? "" : "capitalize"}`}>{value}</p>
      </div>
    </div>
  );
}

function VehicleStack() {
  return (
    <div className="flex -space-x-2">
      <Icon><Bike size={14} /></Icon>
      <Icon><Car size={14} /></Icon>
      <Icon><Truck size={14} /></Icon>
    </div>
  );
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center">
      {children}
    </div>
  );
}
