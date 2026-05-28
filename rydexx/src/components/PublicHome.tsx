"use client";

import React, { useState } from "react";
import HeroSection from "./HeroSection";
import VehicleSlider from "./VehicleSlider";
import AuthModel from "./AuthModel";
import LandingFeatures from "./LandingFeatures";
import LandingStats from "./LandingStats";
import LandingHowItWorks from "./LandingHowItWorks";
import LandingTestimonials from "./LandingTestimonials";
import LandingCTA from "./LandingCTA";
import LandingTrustBar from "./landing/LandingTrustBar";

function PublicHome() {
  const [authOpen, setAuthOpen] = useState(false);
  const openAuth = () => setAuthOpen(true);

  return (
    <main className="overflow-x-hidden bg-[#fafafa]">
      <HeroSection onAuthRequired={openAuth} />
      <LandingTrustBar />
      <LandingFeatures />
      <LandingStats />
      <LandingHowItWorks />
      <VehicleSlider />
      <LandingTestimonials />
      <LandingCTA onAuthRequired={openAuth} />
      <AuthModel
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        redirectTo="/user/book"
      />
    </main>
  );
}

export default PublicHome;
