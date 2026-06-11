import * as turf from "@turf/turf";
import type { LatLng } from "@/lib/mapboxRouting";

/**
 * Snaps a raw GPS coordinate to the nearest point on the route polyline.
 * Useful for smooth car icon rendering on maps.
 * 
 * @param driverLatLng Current GPS coordinates [lat, lng]
 * @param route GeoJSON LineString of the active route
 * @returns Snapped coordinates [lat, lng]
 */
export function snapToRoute(driverLatLng: LatLng, route: GeoJSON.LineString): LatLng {
  const pt = turf.point([driverLatLng[1], driverLatLng[0]]); // Turf uses [lng, lat]
  const snapped = turf.nearestPointOnLine(route, pt);
  
  // Return in [lat, lng] format
  return [snapped.geometry.coordinates[1], snapped.geometry.coordinates[0]];
}

/**
 * Checks if a driver has deviated from the active route by more than the allowed threshold.
 * 
 * @param driverLatLng Current GPS coordinates [lat, lng]
 * @param route GeoJSON LineString of the active route
 * @param maxDistanceMeters Maximum allowed distance from the route in meters before triggering deviation (default 50m)
 * @returns true if deviated, false otherwise
 */
export function checkRouteDeviation(
  driverLatLng: LatLng,
  route: GeoJSON.LineString,
  maxDistanceMeters: number = 50
): boolean {
  const pt = turf.point([driverLatLng[1], driverLatLng[0]]);
  
  // turf.pointToLineDistance returns distance in specified units
  const distance = turf.pointToLineDistance(pt, route, { units: "meters" });
  
  return distance > maxDistanceMeters;
}
