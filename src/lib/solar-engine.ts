// Solar engine for 21 Esher Avenue, Walton-on-Thames, Surrey
// Based on astronomical calculations for 51.3867°N, -0.4175°W

const DEFAULT_LAT = 51.3867;
const DEFAULT_LNG = -0.4175;
const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

export interface SunPosition {
  elevation: number; // degrees above horizon
  azimuth: number;   // degrees from north, clockwise
}

export interface DaylightInfo {
  sunrise: number;   // decimal hours (UTC)
  sunset: number;    // decimal hours (UTC)
  daylight: number;  // hours
  solarNoon: number; // decimal hours (UTC)
  maxElevation: number; // degrees
}

function dayOfYear(month: number, day: number): number {
  const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let doy = day;
  for (let m = 1; m < month; m++) doy += daysInMonth[m];
  return doy;
}

function solarDeclination(doy: number): number {
  return -23.45 * Math.cos((360 / 365) * (doy + 10) * DEG);
}

function equationOfTime(doy: number): number {
  const b = (360 / 365) * (doy - 81) * DEG;
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

export function sunPosition(
  month: number,
  day: number,
  hour: number,
  lat = DEFAULT_LAT,
  lng = DEFAULT_LNG
): SunPosition {
  const doy = dayOfYear(month, day);
  const decl = solarDeclination(doy) * DEG;
  const eot = equationOfTime(doy);

  // Solar time
  const solarTime = hour + (lng / 15) + (eot / 60);
  const hourAngle = (solarTime - 12) * 15 * DEG;

  const latRad = lat * DEG;

  // Elevation
  const sinElev =
    Math.sin(latRad) * Math.sin(decl) +
    Math.cos(latRad) * Math.cos(decl) * Math.cos(hourAngle);
  const elevation = Math.asin(sinElev) * RAD;

  // Azimuth
  const cosAz =
    (Math.sin(decl) - Math.sin(latRad) * sinElev) /
    (Math.cos(latRad) * Math.cos(Math.asin(sinElev)));
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz))) * RAD;
  if (hourAngle > 0) azimuth = 360 - azimuth;

  return { elevation, azimuth };
}

export function sunriseSet(
  month: number,
  day: number,
  lat = DEFAULT_LAT,
  lng = DEFAULT_LNG
): DaylightInfo {
  const doy = dayOfYear(month, day);
  const decl = solarDeclination(doy) * DEG;
  const eot = equationOfTime(doy);
  const latRad = lat * DEG;

  // Hour angle at sunrise/sunset (when elevation = -0.833 deg for atmospheric refraction)
  const cosH =
    (Math.sin(-0.833 * DEG) - Math.sin(latRad) * Math.sin(decl)) /
    (Math.cos(latRad) * Math.cos(decl));

  // Handle polar day/night
  const clampedCosH = Math.max(-1, Math.min(1, cosH));
  const H = Math.acos(clampedCosH) * RAD;

  const solarNoon = 12 - lng / 15 - eot / 60;
  const sunrise = solarNoon - H / 15;
  const sunset = solarNoon + H / 15;
  const daylight = sunset - sunrise;

  // Max elevation at solar noon
  const maxElev = 90 - lat + solarDeclination(doy);

  return {
    sunrise,
    sunset,
    daylight,
    solarNoon,
    maxElevation: maxElev,
  };
}

// Shadow projection
export interface ShadowInfo {
  length: number;    // metres
  direction: number; // degrees from north (where shadow falls)
}

export function shadowProjection(
  objectHeightM: number,
  sunElevation: number,
  sunAzimuth: number
): ShadowInfo | null {
  if (sunElevation <= 0) return null; // sun below horizon

  const length = objectHeightM / Math.tan(sunElevation * DEG);
  // Shadow falls opposite to sun direction
  const direction = (sunAzimuth + 180) % 360;

  return { length, direction };
}

// Garden facing angle conversion
const FACING_ANGLES: Record<string, number> = {
  N: 0, NE: 45, E: 90, SE: 135,
  S: 180, SW: 225, W: 270, NW: 315,
};

export function facingAngle(facing: string): number {
  return FACING_ANGLES[facing] ?? 180;
}

// Calculate sun hours per cell for a full day
export function calculateSunHoursGrid(
  widthCells: number,
  depthCells: number,
  cellSizeM: number,
  gardenFacing: string,
  houseWallHeightM: number,
  fenceHeightM: number,
  month: number,
  day: number,
  lat = DEFAULT_LAT,
  lng = DEFAULT_LNG
): number[][] {
  const grid: number[][] = Array.from({ length: depthCells }, () =>
    new Array(widthCells).fill(0)
  );

  const gardenAngle = facingAngle(gardenFacing);
  const info = sunriseSet(month, day, lat, lng);
  const startHour = Math.ceil(info.sunrise);
  const endHour = Math.floor(info.sunset);

  for (let hour = startHour; hour <= endHour; hour++) {
    const pos = sunPosition(month, day, hour, lat, lng);
    if (pos.elevation <= 0) continue;

    // House wall shadow (back of garden = row 0)
    const houseShadow = shadowProjection(houseWallHeightM, pos.elevation, pos.azimuth);

    // Fence shadows (left and right sides)
    const fenceShadow = shadowProjection(fenceHeightM, pos.elevation, pos.azimuth);

    for (let row = 0; row < depthCells; row++) {
      for (let col = 0; col < widthCells; col++) {
        const cellCenterX = (col + 0.5) * cellSizeM;
        const cellCenterY = (row + 0.5) * cellSizeM;
        const gardenWidthM = widthCells * cellSizeM;
        const gardenDepthM = depthCells * cellSizeM;

        let inShadow = false;

        // Check house wall shadow
        // The house is at the "back" (row 0). Shadow extends into the garden.
        if (houseShadow) {
          const relAzimuth = ((pos.azimuth - gardenAngle + 360) % 360);
          // Shadow from house wall projects into garden (positive Y direction)
          const shadowReachY = houseShadow.length * Math.cos((relAzimuth - 180) * DEG);
          const shadowReachX = houseShadow.length * Math.sin((relAzimuth - 180) * DEG);

          if (shadowReachY > 0 && cellCenterY < shadowReachY) {
            // Check if the cell is within the horizontal extent of the shadow
            const shadowWidthAtY = gardenWidthM; // wall spans full width
            if (cellCenterX >= 0 && cellCenterX <= shadowWidthAtY) {
              inShadow = true;
            }
          }
        }

        // Check left fence shadow
        if (fenceShadow && !inShadow) {
          const relAzimuth = ((pos.azimuth - gardenAngle + 360) % 360);
          const shadowReachX = fenceShadow.length * Math.sin((relAzimuth - 90) * DEG);
          if (shadowReachX > 0 && cellCenterX < shadowReachX) {
            inShadow = true;
          }
        }

        // Check right fence shadow
        if (fenceShadow && !inShadow) {
          const relAzimuth = ((pos.azimuth - gardenAngle + 360) % 360);
          const shadowReachX = fenceShadow.length * Math.sin((relAzimuth + 90) * DEG);
          if (shadowReachX > 0 && (gardenWidthM - cellCenterX) < shadowReachX) {
            inShadow = true;
          }
        }

        if (!inShadow) {
          grid[row][col] += 1; // 1 hour of sun
        }
      }
    }
  }

  return grid;
}

// Classify sun hours into planting zones
export type SunZone = 'full-sun' | 'partial-sun' | 'light-shade' | 'deep-shade';

export function classifySunZone(hours: number): SunZone {
  if (hours >= 6) return 'full-sun';
  if (hours >= 3) return 'partial-sun';
  if (hours >= 1) return 'light-shade';
  return 'deep-shade';
}

export const SUN_ZONE_COLORS: Record<SunZone, string> = {
  'full-sun': '#ff9800',     // vivid orange — prime growing spots
  'partial-sun': '#fdd835',  // bright yellow — good for most crops
  'light-shade': '#81d4fa',  // sky blue — leafy greens, herbs
  'deep-shade': '#546e7a',   // blue-gray — ferns, hostas only
};

/** Continuous color for sun hours (0-12+) — smooth gradient for heatmap */
export function sunHoursColor(hours: number): string {
  // 0h = deep blue-gray → 3h = cool blue → 6h = warm yellow → 10h+ = hot orange-red
  const t = Math.min(hours / 10, 1); // normalize to 0-1
  if (t < 0.1) return '#546e7a'; // deep shade
  if (t < 0.3) return lerpColor('#81d4fa', '#aed581', (t - 0.1) / 0.2); // blue → green
  if (t < 0.6) return lerpColor('#aed581', '#fdd835', (t - 0.3) / 0.3); // green → yellow
  return lerpColor('#fdd835', '#ff6d00', (t - 0.6) / 0.4); // yellow → deep orange
}

function lerpColor(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16), ag = parseInt(a.slice(3, 5), 16), ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16), bg = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
}

// BST offset (last Sunday in March to last Sunday in October)
export function isBST(month: number): boolean {
  return month >= 4 && month <= 9; // rough approximation
}

export function toLocalHour(utcHour: number, month: number): number {
  return utcHour + (isBST(month) ? 1 : 0);
}

export function formatTime(decimalHours: number): string {
  const h = Math.floor(decimalHours);
  const m = Math.round((decimalHours - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Monthly mid-day for solar calculations
export function midMonthDay(month: number): number {
  return 15;
}
