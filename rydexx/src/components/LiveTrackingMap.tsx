"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { Marker, Source, Layer, useMap } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  bearingDegrees,
  distanceMeters,
  fetchDrivingRoute,
  routeToGeoJSON,
  type LatLng,
} from "@/lib/mapboxRouting";
import { useSmoothCoords } from "@/hooks/useSmoothCoords";
import {
  PickupMarker,
  DropMarker,
  DriverMarker,
} from "@/components/ride/RideMapMarkers";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const MAP_STYLE = "mapbox://styles/mapbox/navigation-night-v1";

export type RideMapPhase = "arriving" | "ongoing" | "completed" | "searching";

type Props = {
  driverLocation: LatLng | null;
  pickupLocation: LatLng;
  dropLocation: LatLng;
  status: RideMapPhase;
  onStats?: (data: {
    distanceToPickup: number;
    durationToPickup: number;
    distanceToDrop: number;
    durationToDrop: number;
  }) => void;
};

function FitRouteBounds({
  points,
  active,
  phase,
}: {
  points: LatLng[];
  active: boolean;
  phase: RideMapPhase;
}) {
  const { current: map } = useMap();
  const fittedRef = useRef<string>("");

  useEffect(() => {
    if (!map || !active || points.length < 2) return;

    const key = `${phase}-${points.map((p) => p.join(",")).join("|")}`;
    if (fittedRef.current === key) return;
    fittedRef.current = key;

    const lngs = points.map((p) => p[1]);
    const lats = points.map((p) => p[0]);

    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      {
        padding: { top: 120, bottom: 200, left: 48, right: 48 },
        pitch: phase === "completed" ? 0 : 52,
        bearing: -18,
        duration: 1400,
        maxZoom: 16,
      },
    );
  }, [map, points, active, phase]);

  return null;
}

function FollowDriver({
  position,
  enabled,
}: {
  position: LatLng | null;
  enabled: boolean;
}) {
  const { current: map } = useMap();
  const lastFlyRef = useRef(0);

  useEffect(() => {
    if (!map || !position || !enabled) return;
    const now = Date.now();
    if (now - lastFlyRef.current < 2200) return;
    lastFlyRef.current = now;

    const zoom = Math.max(map.getZoom(), 15.2);
    map.easeTo({
      center: [position[1], position[0]],
      zoom,
      pitch: 58,
      duration: 1200,
      essential: true,
    });
  }, [map, position?.[0], position?.[1], enabled]);

  return null;
}

export default function LiveRideMap({
  driverLocation,
  pickupLocation,
  dropLocation,
  status,
  onStats,
}: Props) {
  const mapRef = useRef<MapRef | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [routePD, setRoutePD] = useState<GeoJSON.Feature | null>(null);
  const [routeActive, setRouteActive] = useState<GeoJSON.Feature | null>(null);
  const [etaPickup, setEtaPickup] = useState(0);
  const [etaDrop, setEtaDrop] = useState(0);
  const [bearing, setBearing] = useState(0);

  const smoothDriver = useSmoothCoords(driverLocation, 1000);
  const prevDriverRef = useRef<LatLng | null>(null);
  const routeAbortRef = useRef<AbortController | null>(null);
  const lastRouteFetchRef = useRef(0);
  const lastRoutePosRef = useRef<LatLng | null>(null);

  const onStatsRef = useRef(onStats);
  onStatsRef.current = onStats;

  const boundsPoints = useMemo(() => {
    if (status === "arriving") {
      const pts: LatLng[] = [pickupLocation];
      if (smoothDriver) pts.push(smoothDriver);
      return pts;
    } else if (status === "ongoing") {
      const pts: LatLng[] = [dropLocation];
      if (smoothDriver) pts.push(smoothDriver);
      return pts;
    } else {
      const pts: LatLng[] = [pickupLocation, dropLocation];
      if (smoothDriver) pts.push(smoothDriver);
      return pts;
    }
  }, [pickupLocation, dropLocation, smoothDriver, status]);

  // Pickup → Drop baseline route
  useEffect(() => {
    const ac = new AbortController();
    void fetchDrivingRoute([pickupLocation, dropLocation], {
      signal: ac.signal,
    }).then((r) => {
      if (r) setRoutePD(routeToGeoJSON(r.geometry));
    });
    return () => ac.abort();
  }, [pickupLocation, dropLocation]);

  const refreshDriverRoutes = useCallback(
    async (driver: LatLng, force = false) => {
      const now = Date.now();
      const moved =
        lastRoutePosRef.current &&
        distanceMeters(lastRoutePosRef.current, driver) > 45;
      if (
        !force &&
        !moved &&
        now - lastRouteFetchRef.current < 12000
      ) {
        return;
      }

      lastRouteFetchRef.current = now;
      lastRoutePosRef.current = driver;

      routeAbortRef.current?.abort();
      const ac = new AbortController();
      routeAbortRef.current = ac;

      const [toPickup, toDrop] = await Promise.all([
        fetchDrivingRoute([driver, pickupLocation], { signal: ac.signal }),
        fetchDrivingRoute([driver, dropLocation], { signal: ac.signal }),
      ]);

      if (ac.signal.aborted) return;

      if (status === "arriving" && toPickup) {
        setRouteActive(routeToGeoJSON(toPickup.geometry));
        setEtaPickup(toPickup.durationMinutes);
      } else if (status === "ongoing" && toDrop) {
        setRouteActive(routeToGeoJSON(toDrop.geometry));
        setEtaDrop(toDrop.durationMinutes);
      }

      if (toPickup && toDrop) {
        onStatsRef.current?.({
          distanceToPickup: toPickup.distanceKm,
          durationToPickup: toPickup.durationMinutes,
          distanceToDrop: toDrop.distanceKm,
          durationToDrop: toDrop.durationMinutes,
        });
      }
    },
    [pickupLocation, dropLocation, status],
  );

  useEffect(() => {
    if (!driverLocation) return;
    if (prevDriverRef.current) {
      setBearing(bearingDegrees(prevDriverRef.current, driverLocation));
    }
    prevDriverRef.current = driverLocation;
    void refreshDriverRoutes(driverLocation);
  }, [driverLocation, refreshDriverRoutes]);

  useEffect(() => {
    if (driverLocation) {
      void refreshDriverRoutes(driverLocation, true);
    } else {
      setRouteActive(null);
    }
  }, [status, driverLocation, refreshDriverRoutes]);

  const displayEta = status === "arriving" ? etaPickup : etaDrop;
  const followDriver =
    mapLoaded && !!smoothDriver && status !== "completed" && status !== "searching";

  return (
    <div className="relative h-full w-full bg-[#0c0f14]">
      {!MAPBOX_TOKEN && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950 text-sm text-white/50">
          Map token missing
        </div>
      )}

      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: pickupLocation[1],
          latitude: pickupLocation[0],
          zoom: 14,
          pitch: 50,
          bearing: -20,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={MAP_STYLE}
        attributionControl={false}
        onLoad={() => setMapLoaded(true)}
      >
        <FitRouteBounds
          points={boundsPoints}
          active={mapLoaded}
          phase={status}
        />
        <FollowDriver position={smoothDriver} enabled={followDriver} />

        {/* Planned route glow */}
        {routePD && (
          <Source id="route-pd" type="geojson" data={routePD}>
            <Layer
              id="route-pd-glow"
              type="line"
              paint={{
                "line-color": "#9eff6b",
                "line-width": 10,
                "line-opacity": 0.12,
                "line-blur": 4,
              }}
            />
            <Layer
              id="route-pd-line"
              type="line"
              layout={{ "line-join": "round", "line-cap": "round" }}
              paint={{
                "line-color": status === "ongoing" ? "#4b5563" : "#e5e7eb",
                "line-width": status === "ongoing" ? 3 : 5,
                "line-opacity": status === "ongoing" ? 0.35 : 0.85,
              }}
            />
          </Source>
        )}

        {/* Active leg (driver → pickup or drop) */}
        {routeActive && (
          <Source id="route-active" type="geojson" data={routeActive}>
            <Layer
              id="route-active-glow"
              type="line"
              paint={{
                "line-color": "#9eff6b",
                "line-width": 12,
                "line-opacity": 0.2,
                "line-blur": 3,
              }}
            />
            <Layer
              id="route-active-line"
              type="line"
              layout={{ "line-join": "round", "line-cap": "round" }}
              paint={{
                "line-color": "#9eff6b",
                "line-width": 5,
                "line-opacity": 0.95,
                "line-dasharray": status === "arriving" ? [0, 0] : [0, 0],
              }}
            />
          </Source>
        )}

        <Marker
          longitude={pickupLocation[1]}
          latitude={pickupLocation[0]}
          anchor="bottom"
        >
          <PickupMarker />
        </Marker>

        <Marker
          longitude={dropLocation[1]}
          latitude={dropLocation[0]}
          anchor="bottom"
        >
          <DropMarker />
        </Marker>

        {smoothDriver && status !== "searching" && (
          <Marker
            longitude={smoothDriver[1]}
            latitude={smoothDriver[0]}
            anchor="center"
          >
            <DriverMarker
              bearing={bearing}
              etaMinutes={displayEta}
              label={status === "ongoing" ? "En route" : "Driver"}
            />
          </Marker>
        )}
      </Map>

      {/* Vignette for depth */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 100%, transparent 40%, rgba(0,0,0,0.35) 100%)",
        }}
      />
    </div>
  );
}
