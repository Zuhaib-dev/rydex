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

function PublicHome() {
  const [authOpen, setAuthOpen] = useState(false);
  const openAuth = () => setAuthOpen(true);

  return (
    <>
      {/* 1. Cinematic hero with typewriter + parallax */}
      <HeroSection onAuthRequired={openAuth} />

      {/* 2. Dark bento features grid */}
      <LandingFeatures />

      {/* 3. Stats counter (light) */}
      <LandingStats />

      {/* 4. How it works (dark) */}
      <LandingHowItWorks />

      {/* 5. Vehicle fleet slider (light) */}
      <VehicleSlider />

      {/* 6. Testimonials (light) */}
      <LandingTestimonials />

      {/* 7. Final CTA banner (dark) */}
      <LandingCTA onAuthRequired={openAuth} />

      <AuthModel open={authOpen} onClose={() => setAuthOpen(false)} redirectTo="/user/book" />
    </>
  );
}

export default PublicHome;
