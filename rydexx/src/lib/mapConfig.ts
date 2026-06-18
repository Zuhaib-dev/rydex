export const MAP_PROVIDER = process.env.NEXT_PUBLIC_ACTIVE_MAP_PROVIDER || "ola";
export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
export const OLA_MAPS_API_KEY = process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY || "";

export const MAP_STYLE = MAP_PROVIDER === "mapbox" 
  ? "mapbox://styles/mapbox/dark-v11" 
  : "https://api.olamaps.io/tiles/vector/v1/styles/default-dark-standard/style.json";

export const getMapProps = () => {
  if (MAP_PROVIDER === "mapbox") {
    return {
      // MapLibre requires using mapbox API correctly or passing token 
      // when using a mapbox:// style (it intercepts if we use maplibregl but 
      // since we use MapLibre v3 it doesn't natively parse mapbox:// styles anymore, 
      // however, we can transform it or try to rely on any fallback).
      // Since maplibre-gl v3 dropped mapbox://, we must pass the actual URL for mapbox style:
      mapStyle: `https://api.mapbox.com/styles/v1/mapbox/dark-v11?access_token=${MAPBOX_TOKEN}`,
      // Just in case maplibre handles mapboxAccessToken prop at all
      // mapboxAccessToken: MAPBOX_TOKEN 
    };
  }
  
  // Default to Ola Maps
  return {
    mapStyle: MAP_STYLE,
    transformRequest: (url: string) => {
      if (url.includes("api.olamaps.io")) {
        return {
          url: url.includes("?") 
            ? `${url}&api_key=${OLA_MAPS_API_KEY}` 
            : `${url}?api_key=${OLA_MAPS_API_KEY}`
        };
      }
      return { url };
    }
  };
};
