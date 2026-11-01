import { describe, expect, it } from "vitest";
import {
  normalizeMapboxSteps,
  normalizeOlaSteps,
  normalizeOrsSteps,
} from "@/lib/routeInstructions";

describe("route instruction normalization", () => {
  it("uses Ola maneuver text and accumulates distance to real turn points", () => {
    const steps = normalizeOlaSteps([{
      steps: [
        { instructions: "Head north", maneuver: "depart", distance: 100 },
        {
          instructions: "Turn right onto Main Road",
          maneuver: "turn-right",
          distance: 200,
          start_location: { lng: 74.8, lat: 34.1 },
        },
        { instructions: "Arrive at destination", maneuver: "arrive", distance: 0 },
      ],
    }]);

    expect(steps).toEqual([
      {
        instruction: "Turn right onto Main Road",
        type: "right",
        distanceFromStart: 100,
        coordinate: [74.8, 34.1],
      },
      {
        instruction: "Arrive at destination",
        type: "destination",
        distanceFromStart: 300,
        coordinate: undefined,
      },
    ]);
  });

  it("normalizes Mapbox step maneuvers", () => {
    const steps = normalizeMapboxSteps([{
      steps: [
        { distance: 120, maneuver: { type: "depart", location: [74.8, 34.1] } },
        {
          distance: 240,
          name: "Residency Road",
          maneuver: { type: "turn", modifier: "left", location: [74.81, 34.11] },
        },
        { distance: 0, maneuver: { type: "arrive", location: [74.82, 34.12] } },
      ],
    }]);

    expect(steps.map(({ type, instruction, distanceFromStart }) => ({
      type,
      instruction,
      distanceFromStart,
    }))).toEqual([
      { type: "left", instruction: "Turn left onto Residency Road", distanceFromStart: 120 },
      { type: "destination", instruction: "Arrive at your destination", distanceFromStart: 360 },
    ]);
  });

  it("uses ORS maneuver instructions and route coordinates", () => {
    const steps = normalizeOrsSteps(
      [{ steps: [{ instruction: "Turn left onto the bridge", type: 1, distance: 90, way_points: [1, 3] }] }],
      [[74.8, 34.1], [74.81, 34.11], [74.82, 34.12]],
    );

    expect(steps).toEqual([{
      instruction: "Turn left onto the bridge",
      type: "left",
      distanceFromStart: 0,
      coordinate: [74.81, 34.11],
    }]);
  });
});
