/**
 * Shadow Engine — calculates shadow cast by garden obstacles
 *
 * Uses solar position algorithms for latitude 51.4°N (Surrey, UK).
 * Computes sun elevation and azimuth for any date/time, then calculates
 * shadow length and direction from obstacles (hedges, fences, buildings).
 *
 * Output: estimated direct sun hours per day for planting zones.
 */

// ─── Solar position calculations ──────────────────────────────────────────────

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Calculate solar declination angle for a given day of year.
 * Ranges from -23.45° (winter solstice) to +23.45° (summer solstice).
 */
function solarDeclination(dayOfYear: number): number {
  return 23.45 * Math.sin(DEG_TO_RAD * (360 / 365) * (dayOfYear - 81));
}

/**
 * Calculate the equation of time correction (minutes) for a given day of year.
 * Accounts for Earth's elliptical orbit and axial tilt.
 */
function equationOfTime(dayOfYear: number): number {
  const B = (360 / 365) * (dayOfYear - 81) * DEG_TO_RAD;
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
}

/**
 * Calculate solar hour angle for a given time.
 * @param solarNoonOffset - minutes before/after solar noon
 */
function hourAngle(hour: number, minute: number, longitude: number, dayOfYear: number): number {
  const eot = equationOfTime(dayOfYear);
  // Solar time correction: longitude offset from timezone meridian + equation of time
  // UK is UTC+0 in winter, UTC+1 (BST) in summer. Meridian = 0° for GMT.
  const lstMeridian = 0; // Greenwich
  const timeCorrectionMinutes = 4 * (longitude - lstMeridian) + eot;
  const solarTimeMinutes = hour * 60 + minute + timeCorrectionMinutes;
  return (solarTimeMinutes - 720) * 0.25; // 0.25 degrees per minute, noon = 0°
}

/**
 * Calculate sun elevation (altitude) angle in degrees.
 * @param latitude - degrees north
 * @param declination - solar declination in degrees
 * @param ha - hour angle in degrees
 */
function sunElevation(latitude: number, declination: number, ha: number): number {
  const latRad = latitude * DEG_TO_RAD;
  const decRad = declination * DEG_TO_RAD;
  const haRad = ha * DEG_TO_RAD;
  const sinAlt =
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  return Math.asin(Math.max(-1, Math.min(1, sinAlt))) * RAD_TO_DEG;
}

/**
 * Calculate sun azimuth angle in degrees (0° = North, 90° = East, 180° = South).
 */
function sunAzimuth(latitude: number, declination: number, ha: number, elevation: number): number {
  const latRad = latitude * DEG_TO_RAD;
  const decRad = declination * DEG_TO_RAD;
  const elevRad = elevation * DEG_TO_RAD;
  const cosAz =
    (Math.sin(decRad) - Math.sin(latRad) * Math.sin(elevRad)) /
    (Math.cos(latRad) * Math.cos(elevRad));
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz))) * RAD_TO_DEG;
  // Afternoon: azimuth > 180°
  if (ha > 0) azimuth = 360 - azimuth;
  return azimuth;
}

/**
 * Get day of year from month (1-12) and day (1-31).
 */
function dayOfYear(month: number, day: number): number {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let doy = day;
  for (let i = 0; i < month - 1; i++) doy += daysInMonth[i];
  return doy;
}

/**
 * Is BST (British Summer Time) in effect? Rough approximation.
 * BST runs last Sunday in March to last Sunday in October.
 */
function isBST(month: number): boolean {
  return month >= 4 && month <= 9; // close enough for our purposes
}

// ─── Obstacle & zone types ────────────────────────────────────────────────────

export interface ShadowObstacle {
  id: string;
  name: string;
  heightM: number;
  /** Compass bearing FROM the planting zone TO the obstacle (0=N, 90=E, 180=S, 270=W) */
  bearingDeg: number;
  /** Distance from obstacle to nearest edge of planting zone, in metres */
  distanceM: number;
  /** Width of the obstacle in metres (for partial shading calculation) */
  widthM?: number;
}

export interface SunHourResult {
  month: number;
  monthName: string;
  directSunHours: number;
  /** Hour-by-hour: true if sun is blocked by an obstacle */
  shadowProfile: { hour: number; inShadow: boolean; sunElevation: number; sunAzimuth: number }[];
  /** Which obstacles block sun at which times */
  blockingDetails: { hour: number; obstacleId: string; obstacleName: string }[];
}

export interface ZoneSunAnalysis {
  zoneName: string;
  monthlyResults: SunHourResult[];
  /** Average direct sun hours across growing season (Apr-Sep) */
  avgGrowingSunHours: number;
  /** Best and worst months */
  bestMonth: { month: number; hours: number };
  worstMonth: { month: number; hours: number };
  /** Plant suitability assessment */
  suitability: 'full-sun' | 'partial-shade' | 'full-shade';
  recommendation: string;
}

// ─── Core calculation ─────────────────────────────────────────────────────────

const SURREY_LATITUDE = 51.4;
const SURREY_LONGITUDE = -0.4; // Walton-on-Thames

/**
 * Calculate whether an obstacle casts shadow on the planting zone
 * at a specific date and time.
 *
 * @returns true if the obstacle blocks direct sun at this time
 */
function isInShadow(
  obstacle: ShadowObstacle,
  sunElev: number,
  sunAz: number
): boolean {
  if (sunElev <= 0) return false; // sun below horizon

  // Shadow length from obstacle
  const shadowLength = obstacle.heightM / Math.tan(sunElev * DEG_TO_RAD);

  // Shadow direction: opposite to sun azimuth
  const shadowAz = (sunAz + 180) % 360;

  // Check if shadow direction points toward the planting zone
  // The obstacle is at bearing `obstacle.bearingDeg` from the zone
  // Shadow reaches the zone if shadow direction ≈ opposite of obstacle bearing
  const obstacleBearingFromZone = obstacle.bearingDeg;
  const shadowPointsToward = obstacleBearingFromZone; // shadow falls away from obstacle

  // Angular difference between shadow direction and line from obstacle to zone
  // Shadow falls AWAY from the sun. If obstacle is NW of zone (bearing 315),
  // shadow falls toward zone when sun is NW (azimuth ~315), casting shadow SE.
  let angleDiff = Math.abs(sunAz - obstacleBearingFromZone);
  if (angleDiff > 180) angleDiff = 360 - angleDiff;

  // Shadow hits the zone when:
  // 1. Sun is roughly behind the obstacle (angle diff < 45°)
  // 2. Shadow is long enough to reach the zone
  const widthAngle = obstacle.widthM
    ? Math.atan2(obstacle.widthM / 2, obstacle.distanceM) * RAD_TO_DEG
    : 30; // default: wide obstacle

  if (angleDiff < widthAngle && shadowLength >= obstacle.distanceM) {
    return true;
  }

  return false;
}

/**
 * Calculate direct sun hours for a planting zone on a specific date,
 * considering all shadow obstacles.
 */
export function calculateSunHoursForDate(
  obstacles: ShadowObstacle[],
  month: number,
  day: number = 15 // middle of month
): SunHourResult {
  const doy = dayOfYear(month, day);
  const decl = solarDeclination(doy);
  const bst = isBST(month);
  const tzOffset = bst ? 1 : 0;

  const shadowProfile: SunHourResult['shadowProfile'] = [];
  const blockingDetails: SunHourResult['blockingDetails'] = [];
  let sunHours = 0;

  // Check every 30 minutes from 5am to 9pm
  for (let h = 5; h <= 21; h++) {
    for (let m = 0; m < 60; m += 30) {
      const clockHour = h + tzOffset;
      const ha = hourAngle(h, m, SURREY_LONGITUDE, doy);
      const elev = sunElevation(SURREY_LATITUDE, decl, ha);
      const az = sunAzimuth(SURREY_LATITUDE, decl, ha, elev);

      if (elev <= 2) continue; // sun too low to count

      let blocked = false;
      for (const obs of obstacles) {
        if (isInShadow(obs, elev, az)) {
          blocked = true;
          blockingDetails.push({ hour: clockHour, obstacleId: obs.id, obstacleName: obs.name });
          break;
        }
      }

      shadowProfile.push({
        hour: clockHour + m / 60,
        inShadow: blocked,
        sunElevation: Math.round(elev * 10) / 10,
        sunAzimuth: Math.round(az * 10) / 10,
      });

      if (!blocked) sunHours += 0.5; // 30 minutes of sun
    }
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return {
    month,
    monthName: monthNames[month - 1],
    directSunHours: Math.round(sunHours * 10) / 10,
    shadowProfile,
    blockingDetails,
  };
}

/**
 * Calculate full growing season sun analysis for a planting zone.
 */
export function analyzeZone(
  zoneName: string,
  obstacles: ShadowObstacle[],
  months: number[] = [3, 4, 5, 6, 7, 8, 9, 10]
): ZoneSunAnalysis {
  const monthlyResults = months.map((m) => calculateSunHoursForDate(obstacles, m));

  const growingMonths = monthlyResults.filter((r) => r.month >= 4 && r.month <= 9);
  const avgGrowingSunHours =
    growingMonths.length > 0
      ? Math.round((growingMonths.reduce((s, r) => s + r.directSunHours, 0) / growingMonths.length) * 10) / 10
      : 0;

  const sorted = [...monthlyResults].sort((a, b) => a.directSunHours - b.directSunHours);
  const worstMonth = sorted[0];
  const bestMonth = sorted[sorted.length - 1];

  let suitability: ZoneSunAnalysis['suitability'];
  let recommendation: string;

  if (avgGrowingSunHours >= 6) {
    suitability = 'full-sun';
    recommendation = 'Excellent for all crops including tomatoes, peppers, strawberries, and beans. Position sun-hungry GreenStalk pockets here.';
  } else if (avgGrowingSunHours >= 3) {
    suitability = 'partial-shade';
    recommendation = `Gets ${avgGrowingSunHours}h average sun. Good for: lettuce, spinach, chard, herbs (parsley, chives, mint), radishes, peas, kale. Avoid: tomatoes, peppers, strawberries (they need 6+ hours).`;
  } else {
    suitability = 'full-shade';
    recommendation = `Only ${avgGrowingSunHours}h sun — limited growing options. Best for: mint, parsley, wild garlic, ferns. Consider this zone for seed starting and overwintering only.`;
  }

  return {
    zoneName,
    monthlyResults,
    avgGrowingSunHours,
    bestMonth: { month: bestMonth.month, hours: bestMonth.directSunHours },
    worstMonth: { month: worstMonth.month, hours: worstMonth.directSunHours },
    suitability,
    recommendation,
  };
}

/**
 * Pre-configured analysis for 21 Esher Avenue based on the handoff document.
 * The laurel hedge is 3-4m tall on the NW side, ~3m from the terrace.
 */
export function analyzeEsherAvenue(): Record<string, ZoneSunAnalysis> {
  // Terrace zone: main planting area. Laurel hedge NW, house to SE.
  const terraceObstacles: ShadowObstacle[] = [
    {
      id: 'laurel-hedge',
      name: 'Laurel/Ivy Hedge (3.5m)',
      heightM: 3.5,
      bearingDeg: 315, // NW of terrace
      distanceM: 3,
      widthM: 10, // wide hedge
    },
    {
      id: 'house',
      name: 'House (2-storey)',
      heightM: 7,
      bearingDeg: 135, // SE of terrace (house is behind)
      distanceM: 8,
      widthM: 8,
    },
  ];

  // Conservatory zone: north-west facing, limited sun
  const conservatoryObstacles: ShadowObstacle[] = [
    {
      id: 'house-above',
      name: 'House wall above conservatory',
      heightM: 5,
      bearingDeg: 180, // south (house is to south of conservatory)
      distanceM: 0.5,
      widthM: 8,
    },
  ];

  // Right fence border: variable, cordyline shade
  const fenceBorderObstacles: ShadowObstacle[] = [
    {
      id: 'right-fence',
      name: 'Right fence (1.8m)',
      heightM: 1.8,
      bearingDeg: 90, // east
      distanceM: 0.5,
      widthM: 10,
    },
    {
      id: 'cordylines',
      name: 'Cordyline trees (2.5m)',
      heightM: 2.5,
      bearingDeg: 90,
      distanceM: 0.3,
      widthM: 3,
    },
  ];

  return {
    terrace: analyzeZone('South Terrace (GreenStalk Zone)', terraceObstacles),
    conservatory: analyzeZone('Conservatory', conservatoryObstacles),
    fenceBorder: analyzeZone('Right Fence Border', fenceBorderObstacles),
  };
}
