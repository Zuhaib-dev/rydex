"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { distanceMeters } from "@/lib/mapboxRouting";
import type { RouteInstruction } from "@/lib/routeInstructions";
import { generateTurnSteps, type TurnStep } from "./useNavigationSimulator";

export function useRealNavigation(
  currentLocation: [number, number] | null, // [lat, lng]
  routeCoords: [number, number][] | undefined, // [lng, lat]
  voiceMuted: boolean,
  routeInstructions?: RouteInstruction[],
) {
  const lastSpokenInstructionRef = useRef("");

  const turnSteps = useMemo(() => {
    if (!routeCoords || routeCoords.length < 2) return [];
    return routeInstructions?.length ? routeInstructions : generateTurnSteps(routeCoords);
  }, [routeCoords, routeInstructions]);

  const cumulativeDistances = useMemo(() => {
    if (!routeCoords || routeCoords.length < 2) return [];
    const distances = [0];
    for (let i = 0; i < routeCoords.length - 1; i++) {
      const distance = distanceMeters(
        [routeCoords[i][1], routeCoords[i][0]],
        [routeCoords[i + 1][1], routeCoords[i + 1][0]],
      );
      distances.push(distances[i] + distance);
    }
    return distances;
  }, [routeCoords]);

  const navigation = useMemo(() => {
    if (!currentLocation || !routeCoords || turnSteps.length === 0 || cumulativeDistances.length === 0) {
      return null;
    }

    let closestIndex = 0;
    let closestDistance = Infinity;
    for (let i = 0; i < routeCoords.length; i++) {
      const distance = distanceMeters(currentLocation, [routeCoords[i][1], routeCoords[i][0]]);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    }

    const currentDistance = cumulativeDistances[closestIndex] ?? 0;
    const nextTurn = turnSteps.find((step) => step.distanceFromStart > currentDistance + 15)
      ?? turnSteps[turnSteps.length - 1];
    return {
      nextTurnStep: nextTurn,
      nextTurnDistance: Math.max(0, nextTurn.distanceFromStart - currentDistance),
    };
  }, [currentLocation, routeCoords, turnSteps, cumulativeDistances]);

  const speakInstruction = useCallback((text: string, instructionId: string) => {
    if (voiceMuted || lastSpokenInstructionRef.current === instructionId) return;
    lastSpokenInstructionRef.current = instructionId;
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  }, [voiceMuted]);

  useEffect(() => {
    const nextTurn = navigation?.nextTurnStep;
    const distance = navigation?.nextTurnDistance ?? 0;
    if (!nextTurn || distance <= 0) return;

    if (distance < 120 && nextTurn.type !== "destination") {
      const coordinateId = nextTurn.coordinate?.map((part) => part.toFixed(4)).join(",");
      const instructionId = `${nextTurn.type}:${nextTurn.instruction}:${coordinateId ?? nextTurn.distanceFromStart.toFixed(0)}`;
      speakInstruction(`In ${Math.round(distance)} meters, ${nextTurn.instruction}`, instructionId);
    } else if (distance < 60 && nextTurn.type === "destination") {
      const coordinateId = nextTurn.coordinate?.map((part) => part.toFixed(4)).join(",");
      speakInstruction("Approaching your destination", `destination:${coordinateId ?? "end"}`);
    }
  }, [navigation, speakInstruction]);

  return {
    nextTurnStep: navigation?.nextTurnStep ?? null as TurnStep | null,
    nextTurnDistance: navigation?.nextTurnDistance ?? 0,
  };
}
