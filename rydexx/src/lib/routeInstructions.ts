export type ManeuverType = "left" | "right" | "straight" | "destination";

export type RouteInstruction = {
  instruction: string;
  type: ManeuverType;
  distanceFromStart: number;
  coordinate?: [number, number]; // [longitude, latitude]
};

type DataRecord = Record<string, unknown>;

function asRecord(value: unknown): DataRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as DataRecord
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function classifyManeuver(maneuver: unknown, instruction: unknown): ManeuverType | null {
  const action = `${String(maneuver ?? "")} ${String(instruction ?? "")}`.toLowerCase();
  if (/\b(arrive|destination|you have reached)\b/.test(action)) return "destination";
  if (/\b(left|u-turn-left)\b/.test(action)) return "left";
  if (/\b(right|u-turn-right)\b/.test(action)) return "right";
  if (/\b(continue|straight|head|depart|merge|ramp|roundabout|keep|exit|fork)\b/.test(action)) return "straight";
  return null;
}

function coordinateFrom(value: unknown): [number, number] | undefined {
  if (Array.isArray(value) && value.length >= 2) {
    const longitude = Number(value[0]);
    const latitude = Number(value[1]);
    if (Number.isFinite(longitude) && Number.isFinite(latitude)) return [longitude, latitude];
  }

  const point = asRecord(value);
  const longitude = Number(point.lng);
  const latitude = Number(point.lat);
  if (Number.isFinite(longitude) && Number.isFinite(latitude)) return [longitude, latitude];
  return undefined;
}

/** Convert Ola Maps' route steps into the small, provider-neutral shape used by the ride HUD. */
export function normalizeOlaSteps(legs: unknown[] = []): RouteInstruction[] {
  const result: RouteInstruction[] = [];
  let distanceFromStart = 0;

  for (const legValue of legs) {
    const leg = asRecord(legValue);
    for (const stepValue of asArray(leg.steps)) {
      const step = asRecord(stepValue);
      const instruction = (text(step.instructions) || text(step.instruction)).trim();
      const maneuver = text(step.maneuver);
      const type = classifyManeuver(maneuver, instruction);
      if (type && !/\b(depart|start|head)\b/i.test(maneuver) && instruction) {
        result.push({
          instruction,
          type,
          distanceFromStart,
          coordinate: coordinateFrom(step.start_location ?? step.end_location),
        });
      }
      const distance = Number(step.distance);
      if (Number.isFinite(distance) && distance > 0) distanceFromStart += distance;
    }
  }

  return result;
}

/** Convert Mapbox Directions steps into the small, provider-neutral shape used by the ride HUD. */
export function normalizeMapboxSteps(legs: unknown[] = []): RouteInstruction[] {
  const result: RouteInstruction[] = [];
  let distanceFromStart = 0;

  for (const legValue of legs) {
    const leg = asRecord(legValue);
    for (const stepValue of asArray(leg.steps)) {
      const step = asRecord(stepValue);
      const maneuver = asRecord(step.maneuver);
      const kind = text(maneuver.type);
      const modifier = text(maneuver.modifier);
      const name = text(step.name).trim();
      const type = classifyManeuver(`${kind} ${modifier}`, "");
      const instruction = kind === "arrive"
        ? "Arrive at your destination"
        : `${kind === "merge" ? "Merge" : kind === "roundabout" ? "Enter the roundabout" : "Turn"}${modifier ? ` ${modifier}` : ""}${name ? ` onto ${name}` : ""}`.trim();

      if (type && kind !== "depart") {
        result.push({
          instruction,
          type,
          distanceFromStart,
          coordinate: coordinateFrom(maneuver.location),
        });
      }
      const distance = Number(step.distance);
      if (Number.isFinite(distance) && distance > 0) distanceFromStart += distance;
    }
  }

  return result;
}

/** Convert OpenRouteService's segment steps into route-relative instructions. */
export function normalizeOrsSteps(
  segments: unknown[] = [],
  coordinates: [number, number][] = [],
): RouteInstruction[] {
  const result: RouteInstruction[] = [];
  let distanceFromStart = 0;

  for (const segmentValue of segments) {
    const segment = asRecord(segmentValue);
    for (const stepValue of asArray(segment.steps)) {
      const step = asRecord(stepValue);
      const instruction = text(step.instruction).trim();
      const type = classifyManeuver(step.type, instruction);
      const wayPoints = asArray(step.way_points);
      const pointIndex = Number(wayPoints[0]);
      const coordinate = Number.isInteger(pointIndex) ? coordinateFrom(coordinates[pointIndex]) : undefined;
      if (type && instruction) result.push({ instruction, type, distanceFromStart, coordinate });
      const distance = Number(step.distance);
      if (Number.isFinite(distance) && distance > 0) distanceFromStart += distance;
    }
  }

  return result;
}
