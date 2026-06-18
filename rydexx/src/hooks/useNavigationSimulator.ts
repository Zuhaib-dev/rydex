"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { distanceMeters, bearingDegrees } from "@/lib/mapboxRouting";

export interface TurnStep {
  coordinate: [number, number]; // [lng, lat]
  type: "left" | "right" | "straight" | "destination";
  instruction: string;
  distanceFromStart: number;
}

export function generateTurnSteps(coords: [number, number][]): TurnStep[] {
  if (coords.length < 2) return [];

  const steps: TurnStep[] = [];
  
  // Kashmiri road names for simulation realism
  const roadNames = [
    "Residency Road", "M.A. Road", "Airport Bypass", "Lal Chowk Link", 
    "Dal Lake Boulevard", "Gupkar Road", "Karan Nagar Street", "Hyderpora Highway", 
    "Hari Singh High Street", "Nowhatta Bazar Road", "Jhelum Boulevard"
  ];

  // Helper to hash coordinates to get a consistent road name
  const getRoadName = (lng: number, lat: number, idx: number) => {
    const hash = Math.abs(Math.round((lng + lat) * 10000)) % roadNames.length;
    return roadNames[(hash + idx) % roadNames.length];
  };

  // Pre-calculate cumulative distances for each node
  const cumulativeDistances: number[] = [0];
  for (let i = 0; i < coords.length - 1; i++) {
    const d = distanceMeters(
      [coords[i][1], coords[i][0]], 
      [coords[i + 1][1], coords[i + 1][0]]
    );
    cumulativeDistances.push(cumulativeDistances[i] + d);
  }

  // Pre-calculate bearings for each segment
  const segmentBearings: number[] = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const b = bearingDegrees(
      [coords[i][1], coords[i][0]], 
      [coords[i + 1][1], coords[i + 1][0]]
    );
    segmentBearings.push(b);
  }

  // Find turns based on bearing changes between adjacent segments
  for (let i = 1; i < coords.length - 1; i++) {
    const b1 = segmentBearings[i - 1];
    const b2 = segmentBearings[i];
    let diff = b2 - b1;
    // Normalize diff to [-180, 180]
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    if (Math.abs(diff) > 28) {
      const road = getRoadName(coords[i][0], coords[i][1], i);
      const isRight = diff > 0;
      steps.push({
        coordinate: coords[i],
        type: isRight ? "right" : "left",
        instruction: `Turn ${isRight ? "right" : "left"} onto ${road}`,
        distanceFromStart: cumulativeDistances[i]
      });
    }
  }

  // Add final destination
  steps.push({
    coordinate: coords[coords.length - 1],
    type: "destination",
    instruction: "Arrive at destination",
    distanceFromStart: cumulativeDistances[coords.length - 1]
  });

  return steps;
}

export function useNavigationSimulator(
  coords: [number, number][] | undefined,
  onFinish?: () => void
) {
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null);
  const [bearing, setBearing] = useState<number>(0);
  const [speedKmh, setSpeedKmh] = useState<number>(0);
  const [nextTurnStep, setNextTurnStep] = useState<TurnStep | null>(null);
  const [nextTurnDistance, setNextTurnDistance] = useState<number>(0);
  const [distanceRemaining, setDistanceRemaining] = useState<number>(0);
  const [etaRemainingSeconds, setEtaRemainingSeconds] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(15); // Default to 15x speed for snappy demo
  const [voiceMuted, setVoiceMutedState] = useState<boolean>(true); // Default to muted

  // Initialize from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("rydex_nav_muted");
      if (saved !== null) {
        setVoiceMutedState(saved === "true");
      }
    }
  }, []);

  const setVoiceMuted = useCallback((muted: boolean) => {
    setVoiceMutedState(muted);
    if (typeof window !== "undefined") {
      localStorage.setItem("rydex_nav_muted", String(muted));
    }
  }, []);

  const animationRef = useRef<number | null>(null);
  const currentDistanceRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const lastSpokenStepRef = useRef<number>(-1);

  // Re-initialize state when coords change
  useEffect(() => {
    if (!coords || coords.length === 0) {
      setCurrentPosition(null);
      setBearing(0);
      setNextTurnStep(null);
      setIsActive(false);
      return;
    }
    setCurrentPosition(coords[0]);
    currentDistanceRef.current = 0;
    setProgress(0);
  }, [coords]);

  const startSimulation = useCallback(() => {
    if (!coords || coords.length < 2) return;
    setIsActive(true);
    setIsPaused(false);
    lastTimeRef.current = performance.now();
    lastSpokenStepRef.current = -1;
  }, [coords]);

  const pauseSimulation = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeSimulation = useCallback(() => {
    setIsPaused(false);
    lastTimeRef.current = performance.now();
  }, []);

  const stopSimulation = useCallback(() => {
    setIsActive(false);
    setIsPaused(false);
    currentDistanceRef.current = 0;
    setProgress(0);
    setSpeedKmh(0);
    if (coords && coords.length > 0) {
      setCurrentPosition(coords[0]);
      setBearing(0);
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, [coords]);

  // Voice announcement helper
  const speakInstruction = useCallback((text: string, stepIdx: number) => {
    if (voiceMuted) return;
    if (lastSpokenStepRef.current === stepIdx) return;
    lastSpokenStepRef.current = stepIdx;

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel(); // Cancel current speaking queue
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  }, [voiceMuted]);

  useEffect(() => {
    if (!isActive || isPaused || !coords || coords.length < 2) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    // Generate turn steps list
    const turnSteps = generateTurnSteps(coords);

    // Calculate total path distance and segment-specific distances
    const cumulativeDistances: number[] = [0];
    for (let i = 0; i < coords.length - 1; i++) {
      const d = distanceMeters(
        [coords[i][1], coords[i][0]], 
        [coords[i + 1][1], coords[i + 1][0]]
      );
      cumulativeDistances.push(cumulativeDistances[i] + d);
    }
    const totalDistance = cumulativeDistances[cumulativeDistances.length - 1];

    const tick = (now: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = now;
      const deltaTimeSeconds = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      // Find segment matching current simulated distance
      let currentDist = currentDistanceRef.current;
      let segIdx = 0;
      while (
        segIdx < coords.length - 2 && 
        currentDist > cumulativeDistances[segIdx + 1]
      ) {
        segIdx++;
      }

      // Check distance to the next turn step
      const nextTurn = turnSteps.find(step => step.distanceFromStart > currentDist) || turnSteps[turnSteps.length - 1];
      const distToTurn = nextTurn.distanceFromStart - currentDist;

      // Adaptive speed calculation (accelerate on straight segments, slow down for upcoming turns)
      let targetSpeedKmh = 55; // default cruising speed
      if (nextTurn.type !== "destination" && distToTurn < 100) {
        // Slow down to a safe turn speed (e.g. 18 km/h) as we get closer to a turn
        targetSpeedKmh = 18 + (55 - 18) * (distToTurn / 100);
      } else if (nextTurn.type === "destination" && distToTurn < 60) {
        // Slow down to a complete halt at destination
        targetSpeedKmh = 5 + (55 - 5) * (distToTurn / 60);
      }

      // Smooth current speed toward target
      const speedDiff = targetSpeedKmh - speedKmh;
      const newSpeedKmh = speedKmh + speedDiff * Math.min(deltaTimeSeconds * 3, 1);
      setSpeedKmh(newSpeedKmh);

      // Speed in meters per second (including the simulation speed multiplier)
      const speedMps = (newSpeedKmh * 1000) / 3600;
      const simulatedDeltaDistance = speedMps * deltaTimeSeconds * speedMultiplier;
      currentDist += simulatedDeltaDistance;

      // Stop if reached destination
      if (currentDist >= totalDistance) {
        currentDist = totalDistance;
        setCurrentPosition(coords[coords.length - 1]);
        setDistanceRemaining(0);
        setEtaRemainingSeconds(0);
        setProgress(100);
        setSpeedKmh(0);
        setIsActive(false);
        if (onFinish) onFinish();
        return;
      }

      currentDistanceRef.current = currentDist;

      // Re-find segment if it changed due to distance advancement
      while (
        segIdx < coords.length - 2 && 
        currentDist > cumulativeDistances[segIdx + 1]
      ) {
        segIdx++;
      }

      // Interpolate position [lng, lat]
      const segStartDist = cumulativeDistances[segIdx];
      const segEndDist = cumulativeDistances[segIdx + 1];
      const segLength = segEndDist - segStartDist;
      const t = segLength > 0 ? (currentDist - segStartDist) / segLength : 0;

      const pStart = coords[segIdx];
      const pEnd = coords[segIdx + 1];
      const interpolatedLng = pStart[0] + t * (pEnd[0] - pStart[0]);
      const interpolatedLat = pStart[1] + t * (pEnd[1] - pStart[1]);
      setCurrentPosition([interpolatedLng, interpolatedLat]);

      // Calculate bearing with transition smoothing
      const baseBearing = bearingDegrees(
        [pStart[1], pStart[0]], 
        [pEnd[1], pEnd[0]]
      );
      
      let finalBearing = baseBearing;
      // If close to turn, interpolate bearing smoothly to the next segment's bearing
      if (t > 0.8 && segIdx < coords.length - 2) {
        const nextStart = coords[segIdx + 1];
        const nextEnd = coords[segIdx + 2];
        const nextBearing = bearingDegrees(
          [nextStart[1], nextStart[0]], 
          [nextEnd[1], nextEnd[0]]
        );
        let diff = nextBearing - baseBearing;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        const ratio = (t - 0.8) / 0.2; // 0 to 1 in the last 20% of the segment
        finalBearing = (baseBearing + diff * ratio + 360) % 360;
      }
      setBearing(finalBearing);

      // Update Turn instructions
      const stepIdx = turnSteps.indexOf(nextTurn);
      setNextTurnStep(nextTurn);
      setNextTurnDistance(distToTurn);

      // Trigger voice guidelines if within 120m
      if (distToTurn < 120 && nextTurn.type !== "destination") {
        speakInstruction(`In ${Math.round(distToTurn)} meters, ${nextTurn.instruction}`, stepIdx);
      } else if (distToTurn < 60 && nextTurn.type === "destination") {
        speakInstruction("Approaching your destination", stepIdx);
      }

      // Update overall trip details
      const distLeft = Math.max(0, totalDistance - currentDist);
      setDistanceRemaining(distLeft);
      setProgress((currentDist / totalDistance) * 100);

      // ETA remaining = distance left divided by average speed (say 40 km/h = 11.1 mps)
      const avgMps = (40 * 1000) / 3600;
      setEtaRemainingSeconds(distLeft / avgMps);

      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isActive, isPaused, coords, speedMultiplier, voiceMuted, speakInstruction, onFinish, speedKmh]);

  return {
    currentPosition,
    bearing,
    speedKmh,
    nextTurnStep,
    nextTurnDistance,
    distanceRemaining,
    etaRemainingSeconds,
    progress,
    isActive,
    isPaused,
    speedMultiplier,
    setSpeedMultiplier,
    voiceMuted,
    setVoiceMuted,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    stopSimulation,
  };
}
