"use client"
import React, { useState } from 'react'
import HeroSection from './HeroSection'
import VehcileSlider from './VehcileSlider'
import AuthModel from './AuthModel'

function PublicHome() {
    const [authOpen, setAuthOpen] = useState(true)
  return (
    <>
    <HeroSection />
    <VehcileSlider />
    <AuthModel open={authOpen} onClose={()=>setAuthOpen(false)}  />
      
    </>
  )
}

export default PublicHome
