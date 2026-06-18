"use client";

import { useEffect, useRef, useState } from "react";
import Map, { Marker, Source, Layer, useMap } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import {
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

import { getMapProps } from "@/lib/mapConfig";

export type ShareTripMapProps = {
  driverLocation: LatLng | null;
  pickupLocation: LatLng;
  dropLocation: LatLng;
  status: string;
  sosActive?: boolean;
  vehicleType?: string;
};

function AutoFollow({ pos }: { pos: LatLng | null }) {
  const { current: map } = useMap();
  useEffect(() => {
    if (pos && map) {
      map.easeTo({
        center: [pos[1], pos[0]],
        zoom: Math.max(map.getZoom(), 14.5),
        pitch: 50,
        duration: 1400,
      });
    }
  }, [pos, map]);
  return null;
}

export default function ShareTripMap({
  driverLocation,
  pickupLocation,
  dropLocation,
  status,
  sosActive = false,
}: ShareTripMapProps) {
  const [routePD, setRoutePD] = useState<GeoJSON.Feature | null>(null);
  const [routeDD, setRouteDD] = useState<GeoJSON.Feature | null>(null);
  const smoothDriver = useSmoothCoords(driverLocation, 1000);
  const isOngoing = status === "started" || status === "ongoing";

  useEffect(() => {
    const ac = new AbortController();
    void fetchDrivingRoute([pickupLocation, dropLocation], {
      signal: ac.signal,
    }).then((r) => r && setRoutePD(routeToGeoJSON(r.geometry)));
    return () => ac.abort();
  }, [pickupLocation, dropLocation]);

  useEffect(() => {
    if (!driverLocation) return;
    const ac = new AbortController();
    void fetchDrivingRoute([driverLocation, dropLocation], {
      signal: ac.signal,
    }).then((r) => r && setRouteDD(routeToGeoJSON(r.geometry)));
    return () => ac.abort();
  }, [driverLocation, dropLocation]);

  return (
    <div className="relative h-full w-full bg-[#0c0f14]">
      <Map
        initialViewState={{
          longitude: pickupLocation[1],
          latitude: pickupLocation[0],
          zoom: 13.5,
          pitch: 48,
        }}
        style={{ width: "100%", height: "100%" }}
        {...getMapProps()}
      >
        <AutoFollow pos={smoothDriver} />

        {routePD && (
          <Source type="geojson" data={routePD}>
            <Layer
              id="share-route-pd"
              type="line"
              paint={{
                "line-color": "#9ca3af",
                "line-width": 4,
                "line-opacity": 0.6,
              }}
            />
          </Source>
        )}

        {isOngoing && routeDD && (
          <Source type="geojson" data={routeDD}>
            <Layer
              id="share-route-dd"
              type="line"
              paint={{
                "line-color": "#9eff6b",
                "line-width": 5,
                "line-opacity": 0.9,
              }}
            />
          </Source>
        )}

        <Marker longitude={pickupLocation[1]} latitude={pickupLocation[0]} anchor="bottom">
          <PickupMarker />
        </Marker>
        <Marker longitude={dropLocation[1]} latitude={dropLocation[0]} anchor="bottom">
          <DropMarker />
        </Marker>

        {smoothDriver && (
          <Marker longitude={smoothDriver[1]} latitude={smoothDriver[0]} anchor="center">
            <DriverMarker bearing={0} etaMinutes={0} label="Live" />
          </Marker>
        )}
      </Map>

      {sosActive && (
        <div className="absolute top-4 left-4 right-4 z-10 rounded-xl border border-red-500/40 bg-red-600/90 px-4 py-2 text-center text-xs font-bold text-white animate-pulse">
          SOS ACTIVE — Emergency tracking enabled
        </div>
      )}
    </div>
  );
}
