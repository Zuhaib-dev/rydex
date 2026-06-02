"use client";

import { useEffect, useState } from "react";
import { 
  Sun, 
  Cloud, 
  CloudRain, 
  CloudDrizzle, 
  CloudLightning, 
  Snowflake, 
  CloudFog, 
  Droplets, 
  Wind,
  RefreshCw
} from "lucide-react";
import axios from "axios";

interface WeatherWidgetProps {
  lat?: number | null;
  lng?: number | null;
  className?: string;
}

interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  description: string;
  name: string;
}

export default function WeatherWidget({ lat, lng, className = "" }: WeatherWidgetProps) {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchWeather = async () => {
    setLoading(true);
    setError(false);
    try {
      const url = lat && lng 
        ? `/api/weather?lat=${lat}&lng=${lng}`
        : `/api/weather`;
      const res = await axios.get(url);
      setData(res.data);
    } catch (err) {
      console.error("Failed to load weather data", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, [lat, lng]);

  const getWeatherIcon = (condition: string) => {
    const iconClass = "w-10 h-10 transition-transform duration-1000";
    switch (condition) {
      case "Clear":
        return <Sun className={`${iconClass} text-amber-500 animate-[spin_20s_linear_infinite]`} />;
      case "Clouds":
        return <Cloud className={`${iconClass} text-zinc-400 animate-pulse`} />;
      case "Rain":
        return <CloudRain className={`${iconClass} text-blue-400`} />;
      case "Drizzle":
        return <CloudDrizzle className={`${iconClass} text-sky-400`} />;
      case "Thunderstorm":
        return <CloudLightning className={`${iconClass} text-yellow-500`} />;
      case "Snow":
        return <Snowflake className={`${iconClass} text-blue-100`} />;
      case "Mist":
      case "Smoke":
      case "Haze":
      case "Dust":
      case "Fog":
      case "Sand":
      case "Ash":
      case "Squall":
      case "Tornado":
        return <CloudFog className={`${iconClass} text-zinc-300`} />;
      default:
        return <Cloud className={`${iconClass} text-zinc-400`} />;
    }
  };

  const getWeatherGradient = (condition: string) => {
    switch (condition) {
      case "Clear":
        return "from-amber-500/10 to-orange-500/5 border-amber-500/20";
      case "Rain":
      case "Drizzle":
      case "Thunderstorm":
        return "from-blue-500/10 to-indigo-500/5 border-blue-500/20";
      case "Snow":
        return "from-sky-300/10 to-blue-200/5 border-sky-300/20";
      default:
        return "from-zinc-500/5 to-zinc-600/5 border-zinc-200/40";
    }
  };

  if (loading) {
    return (
      <div className={`rounded-3xl p-5 border border-zinc-200/50 bg-white/40 backdrop-blur-md flex items-center justify-between shadow-sm animate-pulse min-h-[96px] ${className}`}>
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-zinc-200/80 rounded w-1/3" />
          <div className="h-6 bg-zinc-200/80 rounded w-1/2" />
        </div>
        <div className="w-10 h-10 rounded-full bg-zinc-200/80 animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`rounded-3xl p-4 border border-red-200/30 bg-red-50/50 backdrop-blur-md flex items-center justify-between shadow-sm ${className}`}>
        <p className="text-[11px] font-bold text-red-600">Failed to load weather details</p>
        <button 
          onClick={fetchWeather}
          className="p-2 hover:bg-red-100/50 rounded-xl transition text-red-600"
        >
          <RefreshCw size={14} className="animate-spin" style={{ animationDuration: '2s' }} />
        </button>
      </div>
    );
  }

  const gradient = getWeatherGradient(data.condition);

  return (
    <div className={`rounded-3xl p-5 border bg-white/60 backdrop-blur-lg shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col gap-3.5 transition-all duration-300 hover:shadow-md ${gradient} ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Current Weather</h4>
          <p className="text-sm font-black text-zinc-800 tracking-tight mt-0.5">{data.name}</p>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={fetchWeather}
            className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200/80 flex items-center justify-center transition text-zinc-500 active:scale-95"
            title="Refresh weather"
          >
            <RefreshCw size={11} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            {getWeatherIcon(data.condition)}
          </div>
          <div>
            <div className="flex items-baseline">
              <span className="text-3xl font-black text-zinc-800 tracking-tighter">{data.temp}</span>
              <span className="text-base font-bold text-zinc-500 ml-0.5">°C</span>
            </div>
            <p className="text-[11px] font-black uppercase tracking-wider text-zinc-500 capitalize mt-0.5">
              {data.description}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 text-right border-l border-zinc-200/60 pl-4 shrink-0">
          <div className="flex items-center gap-1.5 justify-end">
            <Droplets size={12} className="text-blue-500" />
            <span className="text-2xs font-bold text-zinc-600">{data.humidity}%</span>
          </div>
          <div className="flex items-center gap-1.5 justify-end">
            <Wind size={12} className="text-zinc-500" />
            <span className="text-2xs font-bold text-zinc-600">{data.windSpeed} m/s</span>
          </div>
        </div>
      </div>
    </div>
  );
}
