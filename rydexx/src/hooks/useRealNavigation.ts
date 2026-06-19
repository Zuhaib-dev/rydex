"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { distanceMeters } from "@/lib/mapboxRouting";
import { generateTurnSteps, type TurnStep } from "./useNavigationSimulator";

export function useRealNavigation(
  currentLocation: [number, number] | null, // [lat, lng]
  routeCoords: [number, number][] | undefined, // [lng, lat]
  voiceMuted: boolean
) {
  const [nextTurnStep, setNextTurnStep] = useState<TurnStep | null>(null);
  const [nextTurnDistance, setNextTurnDistance] = useState<number>(0);
  
  const lastSpokenStepRef = useRef<number>(-1);
  const turnStepsRef = useRef<TurnStep[]>([]);
  const cumulativeDistancesRef = useRef<number[]>([]);

  // Initialize steps when route changes
  useEffect(() => {
    if (!routeCoords || routeCoords.length < 2) {
      setNextTurnStep(null);
      turnStepsRef.current = [];
      cumulativeDistancesRef.current = [];
      lastSpokenStepRef.current = -1;
      return;
    }

    const steps = generateTurnSteps(routeCoords);
    turnStepsRef.current = steps;

    const cumulativeDistances: number[] = [0];
    for (let i = 0; i < routeCoords.length - 1; i++) {
      const d = distanceMeters(
        [routeCoords[i][1], routeCoords[i][0]], 
        [routeCoords[i + 1][1], routeCoords[i + 1][0]]
      );
      cumulativeDistances.push(cumulativeDistances[i] + d);
    }
    cumulativeDistancesRef.current = cumulativeDistances;
  }, [routeCoords]);

  const speakInstruction = useCallback((text: string, stepIdx: number) => {
    if (voiceMuted) return;
    if (lastSpokenStepRef.current === stepIdx) return;
    lastSpokenStepRef.current = stepIdx;

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  }, [voiceMuted]);

  useEffect(() => {
    if (!currentLocation || !routeCoords || turnStepsRef.current.length === 0) return;

    // 1. Find closest segment to the driver
    let closestIdx = 0;
    let minDistance = Infinity;

    for (let i = 0; i < routeCoords.length; i++) {
      const d = distanceMeters(currentLocation, [routeCoords[i][1], routeCoords[i][0]]);
      if (d < minDistance) {
        minDistance = d;
        closestIdx = i;
      }
    }

    const currentDist = cumulativeDistancesRef.current[closestIdx];

    // 2. Find next turn
    // We look for the first step that is ahead of the driver's current distance
    const nextTurn = turnStepsRef.current.find(step => step.distanceFromStart > currentDist + 15) 
      || turnStepsRef.current[turnStepsRef.current.length - 1];
    
    // Recalculate exact distance to turn
    const distToTurn = Math.max(0, nextTurn.distanceFromStart - currentDist);

    setNextTurnStep(nextTurn);
    setNextTurnDistance(distToTurn);

    // 3. Voice triggers
    const stepIdx = turnStepsRef.current.indexOf(nextTurn);
    
    // Trigger at 120m for a turn, or 60m for destination
    if (distToTurn > 0 && distToTurn < 120 && nextTurn.type !== "destination") {
      speakInstruction(`In ${Math.round(distToTurn)} meters, ${nextTurn.instruction}`, stepIdx);
    } else if (distToTurn > 0 && distToTurn < 60 && nextTurn.type === "destination") {
      speakInstruction("Approaching your destination", stepIdx);
    }

  }, [currentLocation, routeCoords, speakInstruction]);

  return {
    nextTurnStep,
    nextTurnDistance,
  };
}
