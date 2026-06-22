"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import AuthModel from "../AuthModel";
import {
  ArrowUpRight,
  ArrowRight,
  Bike,
  Car,
  Truck,
  Package,
  CarTaxiFront,
  MapPin,
  Plus,
  Asterisk,
  Check,
  Stamp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";


import Ticker from "./sections/Ticker";
import Nav from "./sections/Nav";
import Hero from "./sections/Hero";
import Specimens from "./sections/Specimens";
import Protocol from "./sections/Protocol";
import LiveDispatch from "./sections/LiveDispatch";
import Bento from "./sections/Bento";
import Manifesto from "./sections/Manifesto";
import Foot from "./sections/Foot";
import SplitFlapBoard from "./sections/SplitFlapBoard";
import Ledger from "./sections/Ledger";

export default function FaceLiftLanding() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authRedirect, setAuthRedirect] = useState("/");

  const openAuth = (redirectUrl: string = "/") => {
    if (typeof redirectUrl === 'string') {
      setAuthRedirect(redirectUrl);
    } else {
      setAuthRedirect("/");
    }
    setAuthOpen(true);
  };

  return (
    <div className="facelift-landing min-h-screen overflow-x-hidden">
      <Ticker />
      <Nav onAuthRequired={openAuth} />
      <Hero onAuthRequired={openAuth} />
      <Specimens />
      <LiveDispatch />
      <Protocol />
      <SplitFlapBoard />
      <Bento />
      <Ledger />
      <Manifesto />
      <Foot />
      <AuthModel
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        redirectTo={authRedirect}
      />
    </div>
  );
}
