import { env } from "~/lib/env.server";

export type WeatherNow = {
  yrUrl: string;
  temperatureC: number;
  windMs: number;
  windDirectionDeg: number;
  precipitationMm: number;
  humidityPct: number;
  cloudPct: number;
  symbolCode: string | null;
  observedAt: string;
};

function toNumberOrNull(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function getYrWeatherNow(): Promise<WeatherNow | null> {
  const lat = toNumberOrNull(process.env.WEATHER_LAT);
  const lon = toNumberOrNull(process.env.WEATHER_LON);

  if (lat == null || lon == null) return null;

  const url = new URL("https://api.met.no/weatherapi/locationforecast/2.0/compact");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": `hytta-app (${env.APP_URL})`
      }
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      properties?: {
        timeseries?: Array<{
          time: string;
          data?: {
            instant?: {
              details?: {
                air_temperature?: number;
                wind_speed?: number;
                wind_from_direction?: number;
                relative_humidity?: number;
                cloud_area_fraction?: number;
              };
            };
            next_1_hours?: {
              details?: { precipitation_amount?: number };
              summary?: { symbol_code?: string };
            };
          };
        }>;
      };
    };

    const first = payload.properties?.timeseries?.[0];
    const details = first?.data?.instant?.details;
    const temperature = details?.air_temperature;
    const windMs = details?.wind_speed;
    const windDirectionDeg = details?.wind_from_direction;
    const humidityPct = details?.relative_humidity;
    const cloudPct = details?.cloud_area_fraction;
    const precipitationMm = first?.data?.next_1_hours?.details?.precipitation_amount ?? 0;
    if (
      typeof temperature !== "number" ||
      typeof windMs !== "number" ||
      typeof windDirectionDeg !== "number" ||
      typeof humidityPct !== "number" ||
      typeof cloudPct !== "number"
    ) {
      return null;
    }

    return {
      yrUrl: `https://www.yr.no/nb/v%C3%A6rvarsel/daglig-tabell/${lat},${lon}`,
      temperatureC: Math.round(temperature),
      windMs: Math.round(windMs * 10) / 10,
      windDirectionDeg: Math.round(windDirectionDeg),
      precipitationMm: Math.round(precipitationMm * 10) / 10,
      humidityPct: Math.round(humidityPct),
      cloudPct: Math.round(cloudPct),
      symbolCode: first?.data?.next_1_hours?.summary?.symbol_code ?? null,
      observedAt: first?.time ?? new Date().toISOString()
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
