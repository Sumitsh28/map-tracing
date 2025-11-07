export interface Coordinate {
  lat: number;
  lng: number;
}

export interface Waypoint extends Coordinate {
  id: number;
  type: "initial" | "interpolated";
  timestamp: string;
  temperature: number;
  windSpeed: number;
  windDirection: number;
  elapsedTimeHours: number; // For battery simulation
}

export interface MissionSummary {
  totalIdealDistance: number;
  totalRealisticDistance: number;
  totalFlightTimeHours: number;
  maxTemperature: number;
  minTemperature: number;
  maxWindSpeed: number;
  minWindSpeed: number;
}
