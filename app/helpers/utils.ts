// utils.ts

import { Coordinate, Waypoint, MissionSummary } from "./types";

// --- Constants ---
export const DRONE_SPEED_KMPH = 60;
export const KM_PER_DEG_LAT = 111.1;

// --- Helper Functions ---

export const haversineDistance = (p1: Coordinate, p2: Coordinate): number => {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(p2.lat - p1.lat);
  const dLng = toRad(p2.lng - p1.lng);
  const lat1 = toRad(p1.lat);
  const lat2 = toRad(p2.lat);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const interpolatePoint = (
  p1: Coordinate,
  p2: Coordinate,
  t: number
): Coordinate => {
  return {
    lat: p1.lat + (p2.lat - p1.lat) * t,
    lng: p1.lng + (p2.lng - p1.lng) * t,
  };
};

export const getSimulatedData = (
  lat: number,
  lng: number
): Pick<Waypoint, "temperature" | "windSpeed" | "windDirection"> => {
  return {
    temperature: 20 + (lat % 5) - (lng % 3),
    windSpeed: 10 + (lat % 3) + (lng % 2),
    windDirection: Math.floor((lng + lat) % 360),
  };
};

/**
 * Generates the full path of waypoints based on initial points and wind.
 * Includes battery simulation logic.
 */
export const generatePath = (
  initialPoints: Coordinate[],
  useCustomWind: boolean,
  playgroundWindSpeed: number,
  playgroundWindDirection: number,
  maxFlightTimeMinutes: number | null
): {
  waypoints: Waypoint[];
  idealCoords: Coordinate[];
  batteryDepleted: boolean;
  finalWaypointIndex: number;
} => {
  const waypoints: Waypoint[] = [];
  const idealCoords: Coordinate[] = [];
  let idCounter = 0;
  let time = new Date();
  let totalElapsedTimeHours = 0;
  const maxFlightTimeHours =
    maxFlightTimeMinutes !== null ? maxFlightTimeMinutes / 60 : null;

  let batteryDepleted = false;
  let finalWaypointIndex = 0;

  const addWaypoint = (
    p: Coordinate,
    type: "initial" | "interpolated",
    data: Pick<Waypoint, "temperature" | "windSpeed" | "windDirection">,
    elapsedTimeHours: number
  ) => {
    time.setSeconds(time.getSeconds() + 10); // Timestamp for logging, not simulation
    waypoints.push({
      ...p,
      id: idCounter++,
      type: type,
      timestamp: time.toISOString(),
      ...data,
      elapsedTimeHours: elapsedTimeHours,
    });
  };

  const initialData = getSimulatedData(
    initialPoints[0].lat,
    initialPoints[0].lng
  );
  addWaypoint(initialPoints[0], "initial", initialData, 0);
  idealCoords.push(initialPoints[0]);

  let lastPointInSegment: Coordinate = initialPoints[0];

  for (let i = 0; i < initialPoints.length - 1; i++) {
    if (batteryDepleted) break;

    const p1_ideal = initialPoints[i];
    const p2_ideal = initialPoints[i + 1];

    const idealSegmentDist = haversineDistance(p1_ideal, p2_ideal);
    const extraPoints = Math.floor(idealSegmentDist / 0.5); // Interpolate every 500m

    for (let j = 1; j <= extraPoints; j++) {
      const t = j / (extraPoints + 1);
      const idealPoint = interpolatePoint(p1_ideal, p2_ideal, t);
      idealCoords.push(idealPoint);

      const { temperature, windSpeed, windDirection } = useCustomWind
        ? {
            temperature: getSimulatedData(idealPoint.lat, idealPoint.lng)
              .temperature,
            windSpeed: playgroundWindSpeed,
            windDirection: playgroundWindDirection,
          }
        : getSimulatedData(idealPoint.lat, idealPoint.lng);

      // --- MODIFIED: Simplified Battery Drain & Flight Time Logic ---

      // 1. Calculate distance of this small step (from last realistic point to next ideal point)
      const step_dist_km = haversineDistance(lastPointInSegment, idealPoint);

      // 2. Calculate time to cover this distance, adding wind penalty
      let windPenaltyFactor = 1.0;
      if (useCustomWind) {
        // Simple model: 100km/h wind adds 100% (2x) time, 50km/h adds 50% (1.5x)
        // This simulates fighting against the wind.
        windPenaltyFactor = 1 + windSpeed / 100;
      }

      const step_time_hours =
        (step_dist_km / DRONE_SPEED_KMPH) * windPenaltyFactor;

      totalElapsedTimeHours += step_time_hours;

      // 3. Check for battery depletion
      if (
        maxFlightTimeHours !== null &&
        totalElapsedTimeHours > maxFlightTimeHours
      ) {
        batteryDepleted = true;
        finalWaypointIndex = waypoints.length - 1;
        break; // Stop this inner loop
      }

      // 4. Calculate drift based on this step's time
      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const windDirectionRad = toRad(windDirection);
      const drift_km = windSpeed * step_time_hours;
      const drift_y_km = drift_km * Math.cos(windDirectionRad);
      const drift_x_km = drift_km * Math.sin(windDirectionRad);
      const km_per_deg_lng = KM_PER_DEG_LAT * Math.cos(toRad(idealPoint.lat));
      const drift_lat = drift_y_km / KM_PER_DEG_LAT;
      const drift_lng = drift_x_km / km_per_deg_lng;

      const realisticPoint: Coordinate = {
        lat: idealPoint.lat + drift_lat,
        lng: idealPoint.lng + drift_lng,
      };

      addWaypoint(
        realisticPoint,
        "interpolated",
        {
          temperature,
          windSpeed,
          windDirection,
        },
        totalElapsedTimeHours
      );

      lastPointInSegment = realisticPoint;
    }

    if (batteryDepleted) break; // Stop outer loop

    // Add the final "initial" point of the segment
    const endData = getSimulatedData(p2_ideal.lat, p2_ideal.lng);
    const final_segment_dist = haversineDistance(lastPointInSegment, p2_ideal);

    let finalWindPenalty = 1.0;
    const finalWindSpeed = useCustomWind
      ? playgroundWindSpeed
      : endData.windSpeed;
    if (useCustomWind) {
      finalWindPenalty = 1 + finalWindSpeed / 100;
    }

    const final_segment_time =
      (final_segment_dist / DRONE_SPEED_KMPH) * finalWindPenalty;
    totalElapsedTimeHours += final_segment_time;

    if (
      maxFlightTimeHours !== null &&
      totalElapsedTimeHours > maxFlightTimeHours
    ) {
      batteryDepleted = true;
      finalWaypointIndex = waypoints.length - 1;
      break; // Stop simulation, don't add the final point
    }

    addWaypoint(p2_ideal, "initial", endData, totalElapsedTimeHours);
    idealCoords.push(p2_ideal);
    lastPointInSegment = p2_ideal; // The next segment starts from this ideal point
  }

  if (!batteryDepleted) {
    finalWaypointIndex = waypoints.length - 1;
  }

  return { waypoints, idealCoords, batteryDepleted, finalWaypointIndex };
};

/**
 * Calculates the mission summary from a list of waypoints.
 */
export const calculateMissionSummary = (
  waypoints: Waypoint[],
  idealCoords: Coordinate[]
): MissionSummary => {
  if (waypoints.length < 2) {
    return {
      totalIdealDistance: 0,
      totalRealisticDistance: 0,
      totalFlightTimeHours: 0,
      maxTemperature: 0,
      minTemperature: 0,
      maxWindSpeed: 0,
      minWindSpeed: 0,
    };
  }

  let totalRealisticDistance = 0;
  let totalIdealDistance = 0;
  let maxTemperature = -Infinity;
  let minTemperature = Infinity;
  let maxWindSpeed = -Infinity;
  let minWindSpeed = Infinity;

  for (let i = 1; i < waypoints.length; i++) {
    totalRealisticDistance += haversineDistance(waypoints[i - 1], waypoints[i]);
    const wpData = waypoints[i];
    maxTemperature = Math.max(maxTemperature, wpData.temperature);
    minTemperature = Math.min(minTemperature, wpData.temperature);
    maxWindSpeed = Math.max(maxWindSpeed, wpData.windSpeed);
    minWindSpeed = Math.min(minWindSpeed, wpData.windSpeed);
  }

  // Also check the first waypoint for stats
  const firstWp = waypoints[0];
  maxTemperature = Math.max(maxTemperature, firstWp.temperature);
  minTemperature = Math.min(minTemperature, firstWp.temperature);
  maxWindSpeed = Math.max(maxWindSpeed, firstWp.windSpeed);
  minWindSpeed = Math.min(minWindSpeed, firstWp.windSpeed);

  for (let i = 1; i < idealCoords.length; i++) {
    totalIdealDistance += haversineDistance(idealCoords[i - 1], idealCoords[i]);
  }

  const totalFlightTimeHours = waypoints[waypoints.length - 1].elapsedTimeHours;

  return {
    totalIdealDistance,
    totalRealisticDistance,
    totalFlightTimeHours,
    maxTemperature,
    minTemperature,
    maxWindSpeed,
    minWindSpeed,
  };
};
