"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-[15px] w-[15px]">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-[15px] w-[15px]">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);
const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-[15px] w-[15px]">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

const SOCIALS = [
  { icon: XIcon, href: "https://x.com/xuhaib_x9", label: "X / Twitter" },
  {
    icon: LinkedInIcon,
    href: "https://www.linkedin.com/in/zuhaib-rashid-661345318/",
    label: "LinkedIn",
  },
  { icon: GitHubIcon, href: "https://github.com/Zuhaib-dev", label: "GitHub" },
];

const NAV = [
  { label: "Home", href: "/" },
  { label: "Bookings", href: "/bookings" },
  { label: "Fleet", href: "/fleet" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

function Footer() {
  return (
    <footer className="relative overflow-hidden bg-landing-bg text-white landing-noise">
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
      <div className="landing-container py-16 sm:py-20">
        <div className="grid gap-12 border-b border-white/8 pb-12 sm:grid-cols-2 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <Image
              src="/logo.png"
              alt="Rydex"
              width={44}
              height={44}
              className="h-11 w-11 object-contain"
            />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/40">
              Fast, affordable vehicle booking — bikes, cars, trucks and more.
              Your ride, on your terms.
            </p>
            <a
              href="https://rydexx.netlify.app"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-landing-accent transition hover:text-landing-accent-muted"
            >
              Visit live app
              <ArrowUpRight size={14} />
            </a>
          </div>

          <div className="lg:col-span-3">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-white/30">
              Navigation
            </p>
            <ul className="mt-4 space-y-2.5">
              {NAV.map((n) => (
                <li key={n.label}>
                  <Link
                    href={n.href}
                    className="text-sm text-white/50 transition-colors hover:text-white"
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-4">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-white/30">
              Connect
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {SOCIALS.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/4 text-white/45 transition hover:-translate-y-0.5 hover:border-white/25 hover:text-white"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 pt-8 text-xs text-white/30 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Rydex. Created by{" "}
            <a
              href="https://zuhaibrashid.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-white/50 underline-offset-2 transition hover:text-white hover:underline"
            >
              Zuhaib Rashid
            </a>
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="transition hover:text-white/55">
              Privacy
            </Link>
            <Link href="/terms" className="transition hover:text-white/55">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
