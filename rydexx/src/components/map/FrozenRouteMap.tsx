"use client";

import { useMemo } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { routeToGeoJSON } from "@/lib/mapboxRouting";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

/** Coordinates as GeoJSON [lng, lat] */
type Props = {
  pickup: [number, number];
  drop: [number, number];
  routePolyline: GeoJSON.LineString;
  className?: string;
  interactive?: boolean;
};

export default function FrozenRouteMap({
  pickup,
  drop,
  routePolyline,
  className = "h-full w-full",
  interactive = false,
}: Props) {
  const routeFeature = useMemo(
    () => routeToGeoJSON(routePolyline),
    [routePolyline],
  );

  const bounds = useMemo(() => {
    const coords = routePolyline.coordinates;
    const lngs = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    return {
      minLng: Math.min(...lngs, pickup[0], drop[0]),
      maxLng: Math.max(...lngs, pickup[0], drop[0]),
      minLat: Math.min(...lats, pickup[1], drop[1]),
      maxLat: Math.max(...lats, pickup[1], drop[1]),
    };
  }, [routePolyline, pickup, drop]);

  const centerLng = (bounds.minLng + bounds.maxLng) / 2;
  const centerLat = (bounds.minLat + bounds.maxLat) / 2;

  return (
    <div className={`relative ${className} bg-[#e8eae9]`}>
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: centerLng,
          latitude: centerLat,
          zoom: 12,
          pitch: 45,
          bearing: -15,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        interactive={interactive}
        scrollZoom={interactive}
        dragPan={interactive}
        onLoad={(e) => {
          e.target.fitBounds(
            [
              [bounds.minLng, bounds.minLat],
              [bounds.maxLng, bounds.maxLat],
            ],
            { padding: 56, maxZoom: 14, duration: 0 },
          );
        }}
      >
        <Source id="frozen-route" type="geojson" data={routeFeature}>
          <Layer
            id="frozen-route-line"
            type="line"
            paint={{
              "line-color": "#1d4ed8",
              "line-width": 5,
              "line-opacity": 0.95,
            }}
            layout={{ "line-join": "round", "line-cap": "round" }}
          />
        </Source>

        <Marker longitude={pickup[0]} latitude={pickup[1]} anchor="bottom">
          <div className="w-3 h-3 rounded-full bg-zinc-900 border-2 border-white shadow-md" />
        </Marker>
        <Marker longitude={drop[0]} latitude={drop[1]} anchor="bottom">
          <div className="w-3 h-3 rounded-sm bg-white border-2 border-zinc-900 shadow-md" />
        </Marker>
      </Map>
    </div>
  );
}
