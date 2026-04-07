/**
 * Weather service — centralised Open-Meteo integration with 1-hour cache.
 *
 * Fetches: min/max temperature, precipitation, wind speed and gusts.
 * Provides frost-alert classification against a configurable threshold.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface ForecastDay {
  date: string;          // ISO date
  minTemp: number;       // °C
  maxTemp: number;       // °C
  precipMm: number;      // mm total
  maxWindKph: number;    // km/h
  maxGustKph: number;    // km/h
}

export interface WeatherForecast {
  days: ForecastDay[];
  fetchedAt: number;     // Date.now() when cached
  lat: number;
  lng: number;
}

export type FrostLevel = 'none' | 'risk' | 'hard';

export interface FrostAlert {
  level: FrostLevel;
  message: string;
  coldestDay: ForecastDay | null;
  frostDays: ForecastDay[];   // days where minTemp < threshold
}

export interface RainAlert {
  totalMm: number;
  heaviestDay: ForecastDay | null;
  message: string | null;
}

export interface WindAlert {
  maxGustKph: number;
  gustDay: ForecastDay | null;
  message: string | null;
}

// ── Cache ────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
let cached: WeatherForecast | null = null;

function isCacheValid(lat: number, lng: number): boolean {
  if (!cached) return false;
  if (Date.now() - cached.fetchedAt > CACHE_TTL_MS) return false;
  // Invalidate if location changed significantly (> ~1km)
  if (Math.abs(cached.lat - lat) > 0.01 || Math.abs(cached.lng - lng) > 0.01) return false;
  return true;
}

// ── Fetch ────────────────────────────────────────────────────────────────────

const OPEN_METEO_FIELDS = [
  'temperature_2m_min',
  'temperature_2m_max',
  'precipitation_sum',
  'wind_speed_10m_max',
  'wind_gusts_10m_max',
].join(',');

export async function fetchWeather(
  lat: number,
  lng: number,
  forecastDays = 5,
): Promise<WeatherForecast> {
  if (isCacheValid(lat, lng) && cached) return cached;

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}` +
    `&daily=${OPEN_METEO_FIELDS}` +
    `&timezone=Europe/London` +
    `&forecast_days=${forecastDays}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather API ${res.status}`);
  const data = await res.json();

  const d = data.daily;
  const days: ForecastDay[] = (d.time as string[]).map((t: string, i: number) => ({
    date: t,
    minTemp: d.temperature_2m_min[i],
    maxTemp: d.temperature_2m_max[i],
    precipMm: d.precipitation_sum[i] ?? 0,
    maxWindKph: d.wind_speed_10m_max[i] ?? 0,
    maxGustKph: d.wind_gusts_10m_max[i] ?? 0,
  }));

  cached = { days, fetchedAt: Date.now(), lat, lng };
  return cached;
}

/** Synchronous read of last successful fetch (for components that already triggered a load). */
export function getCachedWeather(): WeatherForecast | null {
  return cached;
}

// ── Alerts ───────────────────────────────────────────────────────────────────

const FROST_RISK_THRESHOLD = 3;   // °C — cover tender crops
const HARD_FROST_THRESHOLD = 0;   // °C — serious damage

export function getFrostAlert(forecast: WeatherForecast): FrostAlert {
  const frostDays = forecast.days.filter((d) => d.minTemp < FROST_RISK_THRESHOLD);

  if (frostDays.length === 0) {
    return { level: 'none', message: '', coldestDay: null, frostDays: [] };
  }

  const coldest = frostDays.reduce((a, b) => (a.minTemp < b.minTemp ? a : b));
  const isHard = coldest.minTemp <= HARD_FROST_THRESHOLD;

  const dayLabel = new Date(coldest.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

  if (isHard) {
    return {
      level: 'hard',
      message: `Hard frost forecast ${dayLabel} (${coldest.minTemp.toFixed(0)}°C). Move tender crops under cover or wrap GreenStalks tonight.`,
      coldestDay: coldest,
      frostDays,
    };
  }

  return {
    level: 'risk',
    message: `Frost risk ${dayLabel} (${coldest.minTemp.toFixed(0)}°C). Cover tender seedlings and check GreenStalk pockets.`,
    coldestDay: coldest,
    frostDays,
  };
}

export function getRainAlert(forecast: WeatherForecast): RainAlert {
  const totalMm = forecast.days.reduce((sum, d) => sum + d.precipMm, 0);
  const heaviest = forecast.days.reduce((a, b) => (a.precipMm > b.precipMm ? a : b));

  let message: string | null = null;
  if (totalMm > 30) {
    message = `Heavy rain expected this week (${totalMm.toFixed(0)}mm). Check drainage holes and hold off watering.`;
  } else if (totalMm < 2 && forecast.days.length >= 3) {
    message = `Dry spell ahead — water GreenStalks daily, twice in heat.`;
  }

  return { totalMm, heaviestDay: heaviest.precipMm > 0 ? heaviest : null, message };
}

export function getWindAlert(forecast: WeatherForecast): WindAlert {
  const gustDay = forecast.days.reduce((a, b) => (a.maxGustKph > b.maxGustKph ? a : b));

  let message: string | null = null;
  if (gustDay.maxGustKph > 60) {
    const dayLabel = new Date(gustDay.date).toLocaleDateString('en-GB', { weekday: 'short' });
    message = `Strong gusts ${dayLabel} (${gustDay.maxGustKph.toFixed(0)} km/h). Secure GreenStalks and tall supports.`;
  }

  return { maxGustKph: gustDay.maxGustKph, gustDay: gustDay.maxGustKph > 40 ? gustDay : null, message };
}
