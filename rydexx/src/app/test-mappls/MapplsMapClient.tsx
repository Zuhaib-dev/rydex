"use client";

import { useEffect, useRef, useState } from "react";

interface MapplsMapClientProps {
  apiKey: string;
}

export default function MapplsMapClient({ apiKey }: MapplsMapClientProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);

  useEffect(() => {
    if (!apiKey) return;

    const scriptId = "mappls-sdk-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const initMap = () => {
      try {
        // Mappls SDK may expose global as either `mappls` (lowercase) or `Mappls` (capital) depending on version
        const sdk = (window as any).mappls || (window as any).Mappls;
        if (!sdk) {
          setError("Mappls SDK loaded but no global 'mappls' / 'Mappls' object found.");
          setLoading(false);
          return;
        }

        console.log("Initializing Mappls Map with key:", apiKey.substring(0, 6) + "...");
        
        // Mappls Map takes a string div ID (confirmed in their official docs)
        const map = new sdk.Map("mappls-map-container", {
          center: [28.6139, 77.2090], 
          zoom: 10,
          zoomControl: true,
          hybrid: true,
        });

        // Add a marker in Delhi to demonstrate how annotations look
        new sdk.Marker({
          map: map,
          position: { lat: 28.6139, lng: 77.2090 },
          popupHtml: '<div style="padding: 10px; color: black; font-family: sans-serif; font-size: 13px;"><b>Rydex Sandbox Center</b><br>Mappls MapmyIndia Active Vector Map</div>',
          popupOptions: { openPopup: true }
        });

        setMapInstance(map);
        setLoading(false);
      } catch (err: any) {
        console.error("MapmyIndia Map initialization failed:", err);
        setError(`Map initialization failed: ${err.message || err}`);
        setLoading(false);
      }
    };

    if (!script) {
      setLoading(true);
      script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://apis.mappls.com/advancedmaps/api/${apiKey}/map_sdk?v=3.0&layer=vector`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        const checkInterval = setInterval(() => {
          const sdk = (window as any).mappls || (window as any).Mappls;
          if (sdk) {
            clearInterval(checkInterval);
            initMap();
          }
        }, 100);

        setTimeout(() => {
          clearInterval(checkInterval);
          const sdk = (window as any).mappls || (window as any).Mappls;
          if (!sdk) {
            setError("Timeout waiting for MapmyIndia global object to initialize. Key may be invalid, expired, or not yet approved by Mappls.");
            setLoading(false);
          }
        }, 8000);
      };
      script.onerror = () => {
        setError("Failed to load MapmyIndia advanced maps script. The key may be invalid or not yet activated — 401 credentials check failed.");
        setLoading(false);
      };
      document.head.appendChild(script);
    } else {
      const sdk = (window as any).mappls || (window as any).Mappls;
      if (sdk) {
        initMap();
      } else {
        const checkInterval = setInterval(() => {
          const sdk2 = (window as any).mappls || (window as any).Mappls;
          if (sdk2) {
            clearInterval(checkInterval);
            initMap();
          }
        }, 100);
      }
    }

    return () => {
      // Cleanup map instance on component unmount
      if (mapInstance && typeof mapInstance.remove === "function") {
        try {
          mapInstance.remove();
        } catch (e) {}
      }
    };
  }, [apiKey]);

  const panTo = (lat: number, lng: number, name: string) => {
    if (!mapInstance) return;
    const sdk = (window as any).mappls || (window as any).Mappls;
    try {
      mapInstance.setCenter([lat, lng]);
      mapInstance.setZoom(12);

      if (sdk) {
        new sdk.Marker({
          map: mapInstance,
          position: { lat, lng },
          popupHtml: `<div style="padding: 10px; color: black; font-family: sans-serif; font-size: 13px;"><b>${name}</b><br>Panned Rydex demo location.</div>`,
          popupOptions: { openPopup: true }
        });
      }
    } catch (err) {
      console.error("Pan mapping operation failed:", err);
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* City Shortcuts */}
      <div className="absolute top-4 left-4 z-10 flex gap-2 bg-zinc-950/85 backdrop-blur border border-zinc-800 p-2.5 rounded-xl shadow-2xl">
        <button
          onClick={() => panTo(28.6139, 77.2090, "Delhi Center")}
          className="text-xs bg-zinc-800 hover:bg-emerald-500 hover:text-black transition-colors px-3 py-1.5 rounded-lg font-medium cursor-pointer"
        >
          Delhi
        </button>
        <button
          onClick={() => panTo(19.0760, 72.8777, "Mumbai Hub")}
          className="text-xs bg-zinc-800 hover:bg-emerald-500 hover:text-black transition-colors px-3 py-1.5 rounded-lg font-medium cursor-pointer"
        >
          Mumbai
        </button>
        <button
          onClick={() => panTo(12.9716, 77.5946, "Bangalore Office")}
          className="text-xs bg-zinc-800 hover:bg-emerald-500 hover:text-black transition-colors px-3 py-1.5 rounded-lg font-medium cursor-pointer"
        >
          Bangalore
        </button>
      </div>

      {loading && (
        <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur z-20 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
          <p className="text-sm text-zinc-400">Loading MapmyIndia vector mapping engine...</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 bg-zinc-950/95 z-20 flex flex-col items-center justify-center p-6 gap-3 text-center">
          <span className="text-3xl">⚠️</span>
          <h4 className="font-bold text-rose-400 text-sm">SDK Loading Failed</h4>
          <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">{error}</p>
          <div className="text-2xs text-zinc-600 font-mono mt-4">
            Key reference: {apiKey.substring(0, 8)}...
          </div>
        </div>
      )}

      {/* Map Target */}
      <div ref={mapRef} className="flex-1 w-full h-full" id="mappls-map-container" />
    </div>
  );
}
