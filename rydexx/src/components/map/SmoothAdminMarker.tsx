import { Marker } from "react-map-gl/mapbox";
import { useSmoothCoords } from "@/hooks/useSmoothCoords";
import { useEffect, useRef, useState } from "react";
import { bearingDegrees, type LatLng } from "@/lib/mapboxRouting";

export default function SmoothAdminMarker({
  longitude,
  latitude,
  children,
  onClick,
  isActiveRide
}: {
  longitude: number;
  latitude: number;
  children: React.ReactNode;
  onClick?: () => void;
  isActiveRide?: boolean;
}) {
  // Use a smooth duration depending on if it's on a ride or idle
  const smoothLoc = useSmoothCoords([latitude, longitude], isActiveRide ? 3500 : 4500);
  const [bearing, setBearing] = useState(0);
  const prevRef = useRef<LatLng | null>(null);

  useEffect(() => {
    const current: LatLng = [latitude, longitude];
    if (prevRef.current) {
      // Calculate delta to avoid erratic spins on tiny GPS jitters
      const dist = Math.sqrt(
        Math.pow(prevRef.current[0] - latitude, 2) + 
        Math.pow(prevRef.current[1] - longitude, 2)
      );
      if (dist > 0.00005) {
        setBearing(bearingDegrees(prevRef.current, current));
      }
    }
    prevRef.current = current;
  }, [latitude, longitude]);

  if (!smoothLoc) return null;

  return (
    <Marker 
      longitude={smoothLoc[1]} 
      latitude={smoothLoc[0]} 
      anchor="center"
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <div 
        style={{ 
          transform: `rotate(${bearing}deg)`, 
          transition: "transform 0.8s ease-out" 
        }}
      >
        {/* Anti-rotate the SOS/status indicators if they exist inside children, or just let them rotate.
            Since it's a circle, rotating it just points the vehicle icon correctly! */}
        {children}
      </div>
    </Marker>
  );
}
