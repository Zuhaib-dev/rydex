import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat") || "34.0837";
    const lng = searchParams.get("lng") || "74.7973";

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return Response.json(
        { message: "OpenWeather API key is not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenWeather API error details:", errText);
      return Response.json(
        { message: "Failed to fetch weather from OpenWeather" },
        { status: response.status }
      );
    }

    const data = await response.json();

    const weatherInfo = {
      temp: Math.round(data.main?.temp ?? 0),
      feelsLike: Math.round(data.main?.feels_like ?? 0),
      humidity: data.main?.humidity ?? 0,
      windSpeed: data.wind?.speed ?? 0,
      condition: data.weather?.[0]?.main ?? "Clouds",
      description: data.weather?.[0]?.description ?? "scattered clouds",
      name: data.name || "Srinagar",
    };

    return Response.json(weatherInfo);
  } catch (error) {
    console.error("Error fetching weather:", error);
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}
