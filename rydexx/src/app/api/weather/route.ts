import { NextRequest } from "next/server";

const FALLBACK_WEATHER = {
  temp: 22,
  feelsLike: 21,
  humidity: 55,
  windSpeed: 3.6,
  condition: "Clouds",
  description: "scattered clouds",
  name: "Srinagar",
  isFallback: true
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat") || "34.0837";
    const lng = searchParams.get("lng") || "74.7973";

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return Response.json(FALLBACK_WEATHER);
    }

    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`
    );

    if (!response.ok) {
      const errText = await response.text();
      console.warn("OpenWeather API responded with error. Falling back to mock:", errText);
      return Response.json(FALLBACK_WEATHER);
    }

    const data = await response.json();

    const weatherInfo = {
      temp: Math.round(data.main?.temp ?? 22),
      feelsLike: Math.round(data.main?.feels_like ?? 21),
      humidity: data.main?.humidity ?? 55,
      windSpeed: data.wind?.speed ?? 3.6,
      condition: data.weather?.[0]?.main ?? "Clouds",
      description: data.weather?.[0]?.description ?? "scattered clouds",
      name: data.name || "Srinagar",
    };

    return Response.json(weatherInfo);
  } catch (error) {
    console.warn("Error fetching weather. Falling back to mock:", error);
    return Response.json(FALLBACK_WEATHER);
  }
}
