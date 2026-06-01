/**
 * Configurable ride-matching parameters.
 * Radius tiers expand when no partner accepts within the accept window.
 */

/** Search radii in meters — closest tier first */
export const MATCH_RADIUS_TIERS_METERS = [5000, 7000, 10000, 15000] as const;

/** Partner must accept within this window before cascade */
export const MATCH_ACCEPT_TIMEOUT_MS = 20_000;

/** Partner location older than this is excluded from matching */
export const MATCH_LOCATION_MAX_AGE_MS = 10 * 60 * 1000;

/** How often partners push GPS to the socket server */
export const PARTNER_GEO_PUSH_INTERVAL_MS = 5_000;

/** Average road-distance multiplier over straight-line (Kashmir-aware baseline) */
export const ROAD_DISTANCE_FACTOR_DEFAULT = 1.15;
export const ROAD_DISTANCE_FACTOR_KASHMIR = 1.35;

/** Future-ready scoring weights (unused in v1 sort, reserved for smart dispatch) */
export const MATCH_SCORE_WEIGHTS = {
  distance: 1,
  availability: 0.2,
  acceptanceRate: 0.15,
  rating: 0.1,
} as const;

export function radiusKm(meters: number): number {
  return Math.round((meters / 1000) * 10) / 10;
}

export function getRadiusTier(index: number): number {
  const tiers = MATCH_RADIUS_TIERS_METERS;
  return tiers[Math.min(Math.max(0, index), tiers.length - 1)];
}

export function nextRadiusTierIndex(current: number): number | null {
  if (current >= MATCH_RADIUS_TIERS_METERS.length - 1) return null;
  return current + 1;
}
