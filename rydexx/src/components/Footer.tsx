import Image from "next/image";
import Link from "next/link";

// Inline SVGs — lucide-react v1+ removed brand icons
const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-[15px] h-[15px]">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[15px] h-[15px]">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
  </svg>
);
const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-[15px] h-[15px]">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);
const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-[15px] h-[15px]">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

const SOCIALS = [
  { icon: XIcon, href: "https://twitter.com", label: "X / Twitter" },
  { icon: InstagramIcon, href: "https://instagram.com", label: "Instagram" },
  { icon: LinkedInIcon, href: "https://linkedin.com", label: "LinkedIn" },
  { icon: GitHubIcon, href: "https://github.com", label: "GitHub" },
];

const NAV = [
  { label: "Home", href: "/" },
  { label: "Bookings", href: "/bookings" },
  { label: "About Us", href: "/about us" },
  { label: "Contact", href: "/contact" },
];

function Footer() {
  return (
    <footer className="bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-14">

        {/* Top row */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-10 pb-10 border-b border-white/10">

          {/* Brand */}
          <div className="flex flex-col gap-4 max-w-xs">
            <Image src="/logo.png" alt="Rydex" width={40} height={40} className="drop-shadow" />
            <p className="text-sm text-white/40 leading-relaxed">
              Fast, affordable vehicle booking — bikes, cars, trucks &amp; more. Your ride, your rules.
            </p>
          </div>

          {/* Nav links */}
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">Navigation</p>
            {NAV.map((n) => (
              <Link
                key={n.label}
                href={n.href}
                className="text-sm text-white/50 hover:text-white transition-colors"
              >
                {n.label}
              </Link>
            ))}
          </div>

          {/* Socials */}
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">Follow us</p>
            <div className="flex items-center gap-3">
              {SOCIALS.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-all"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-6 text-xs text-white/25">
          <p>© {new Date().getFullYear()} Rydex. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-white/50 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white/50 transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
