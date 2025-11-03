"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import MapAutoFitter from "./MapAutoFitter";
import Scene3D from "./Scene3D";

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
}

const haversineDistance = (p1: Coordinate, p2: Coordinate): number => {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371;

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

const interpolatePoint = (
  p1: Coordinate,
  p2: Coordinate,
  t: number
): Coordinate => {
  return {
    lat: p1.lat + (p2.lat - p1.lat) * t,
    lng: p1.lng + (p2.lng - p1.lng) * t,
  };
};

const getSimulatedData = (
  lat: number,
  lng: number
): Pick<Waypoint, "temperature" | "windSpeed" | "windDirection"> => {
  return {
    temperature: 20 + (lat % 5) - (lng % 3),
    windSpeed: 10 + (lat % 3) + (lng % 2),
    windDirection: Math.floor((lng + lat) % 360),
  };
};

const defaultIcon = L.icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const currentIcon = L.icon({
  iconUrl:
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iY3lhbiIgd2lkdGg9IjM2cHgiIGhlaWdodD0iMzZweCI+PHBhdGggZD0iTTEyIDJjLTUuNTIgMCAtMTAgNC40OCAtMTAgMTBzNC40OCAxMCAxMCAxMCAxMCAtNC40OCAxMCAtMTBTMjAuNTIgMiAxMiAyeiBtMCAxOGMtNC40MSAwIC04IC0zLjU5IC04IC04czMuNTkgLTggOCAtOCA4IDMuNTkgOCA4IC0zLjU5IDggLTggOHoiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI1Ii8+PC9zdmc+",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const interpolatedIcon = L.icon({
  iconUrl:
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzc1NzU3NSIgd2lkdGg9IjEycHgiIGhlaWdodD0iMTJweCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIC8+PC9zdmc+", // Simple grey dot
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

L.Marker.prototype.options.icon = defaultIcon;

const DRONE_SPEED_KMPH = 60;
const KM_PER_DEG_LAT = 111.1;

export default function MapVisualizer() {
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTouring, setIsTouring] = useState(false);
  const [isAutoRotating, setIsAutoRotating] = useState(true);

  const [rawText, setRawText] = useState("");
  const [initialPoints, setInitialPoints] = useState<Coordinate[]>([]);
  const [allWaypoints, setAllWaypoints] = useState<Waypoint[]>([]);
  const [idealWaypoints, setIdealWaypoints] = useState<Coordinate[]>([]);

  const [visualizedPoints, setVisualizedPoints] = useState<Coordinate[]>([]);
  const [currentPoint, setCurrentPoint] = useState<number | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleParseCoordinates = () => {
    setError(null);
    setVisualizedPoints([]);
    setAllWaypoints([]);
    setIdealWaypoints([]);
    setTotalPoints(0);
    setCurrentPoint(null);
    setIsLoading(true);
    setIsTouring(false);

    const pairRegex = /(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/g;
    const matches = [...rawText.matchAll(pairRegex)];

    if (matches.length === 0) {
      setError(
        "No valid 'lat, lng' pairs found. Please use the format: 25.1, 82.1"
      );
      setInitialPoints([]);
      setIsLoading(false);
      return;
    }

    const newPoints: Coordinate[] = [];
    for (const match of matches) {
      const lat = Number(match[1]);
      const lng = Number(match[2]);

      if (!isNaN(lat) && !isNaN(lng)) {
        newPoints.push({ lat, lng });
      }
    }

    if (newPoints.length > 0) {
      setInitialPoints(newPoints);
      setIsAutoRotating(true);
    } else {
      setError("Found matches but could not parse numbers. Check your input.");
      setInitialPoints([]);
    }
    setIsLoading(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsLoading(true);
    setIsTouring(false);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const json = JSON.parse(text);

        if (Array.isArray(json)) {
          const newPoints: Coordinate[] = json
            .map((item: any) => {
              if (Array.isArray(item) && item.length >= 2) {
                return { lat: item[0], lng: item[1] };
              }
              if (typeof item === "object" && item.lat && item.lng) {
                return { lat: item.lat, lng: item.lng };
              }
              return null;
            })
            .filter((p): p is Coordinate => p !== null);

          if (newPoints.length > 0) {
            setInitialPoints(newPoints);
            setRawText(newPoints.map((p) => `${p.lat}, ${p.lng}`).join("\n"));
            setIsAutoRotating(true);
            setAllWaypoints([]);
            setIdealWaypoints([]);
            setVisualizedPoints([]);
          } else {
            setError(
              "JSON file is an array, but items are not valid coordinates."
            );
          }
        } else {
          setError("Invalid JSON format. Expected an array of coordinates.");
        }
      } catch (err) {
        setError("Failed to parse JSON file. Make sure it is valid JSON.");
      }
      setIsLoading(false);
    };

    reader.onerror = () => {
      setError("Failed to read the file.");
      setIsLoading(false);
    };

    reader.readAsText(file);
  };

  const startVisualization = () => {
    if (initialPoints.length < 2) {
      setError("Need at least 2 points to start visualization.");
      return;
    }

    setError(null);
    setIsLoading(true);
    setIsTouring(false);
    setVisualizedPoints([]);
    setIdealWaypoints([]);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const generatedWaypoints: Waypoint[] = [];
    const generatedIdealCoords: Coordinate[] = [];
    let idCounter = 0;
    let time = new Date();

    const addWaypoint = (p: Coordinate, type: "initial" | "interpolated") => {
      time.setSeconds(time.getSeconds() + 10);
      const data = getSimulatedData(p.lat, p.lng);
      generatedWaypoints.push({
        ...p,
        id: idCounter++,
        type: type,
        timestamp: time.toISOString(),
        ...data,
      });
    };

    addWaypoint(initialPoints[0], "initial");
    generatedIdealCoords.push(initialPoints[0]);

    for (let i = 0; i < initialPoints.length - 1; i++) {
      const p1 = initialPoints[i];
      const p2 = initialPoints[i + 1];

      const segment_dist_km = haversineDistance(p1, p2);

      const extraPoints = Math.floor(segment_dist_km / 0.5);

      const step_dist_km = segment_dist_km / (extraPoints + 1);

      const step_time_hours = step_dist_km / DRONE_SPEED_KMPH;

      for (let j = 1; j <= extraPoints; j++) {
        const t = j / (extraPoints + 1);

        const idealPoint = interpolatePoint(p1, p2, t);
        generatedIdealCoords.push(idealPoint);

        const data = getSimulatedData(idealPoint.lat, idealPoint.lng);

        const toRad = (deg: number) => (deg * Math.PI) / 180;
        const windDirectionRad = toRad(data.windDirection);

        const drift_km = data.windSpeed * step_time_hours;

        const drift_y_km = drift_km * Math.cos(windDirectionRad);
        const drift_x_km = drift_km * Math.sin(windDirectionRad);

        const km_per_deg_lng = KM_PER_DEG_LAT * Math.cos(toRad(idealPoint.lat));

        const drift_lat = drift_y_km / KM_PER_DEG_LAT;
        const drift_lng = drift_x_km / km_per_deg_lng;

        const realisticPoint: Coordinate = {
          lat: idealPoint.lat + drift_lat,
          lng: idealPoint.lng + drift_lng,
        };

        addWaypoint(realisticPoint, "interpolated");
      }

      addWaypoint(p2, "initial");
      generatedIdealCoords.push(p2);
    }

    setAllWaypoints(generatedWaypoints);
    setIdealWaypoints(generatedIdealCoords);
    setTotalPoints(generatedWaypoints.length);
    setCurrentPoint(0);
    setIsLoading(false);

    const step = (index: number) => {
      if (index >= generatedWaypoints.length) {
        setCurrentPoint(null);
        return;
      }

      setVisualizedPoints(generatedWaypoints.slice(0, index + 1));
      setCurrentPoint(index);

      timeoutRef.current = setTimeout(() => {
        step(index + 1);
      }, 200);
    };

    step(0);
  };

  const handleDownloadData = () => {
    if (allWaypoints.length === 0) {
      setError(
        "No waypoint data to download. Please run the visualization first."
      );
      return;
    }

    try {
      const dataStr = JSON.stringify(allWaypoints, null, 2); // Pretty-print JSON
      const dataUri =
        "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", "drone_waypoints.json");
      linkElement.click();
    } catch (err) {
      setError("Failed to create download file.");
      console.error(err);
    }
  };

  return (
    <div className="flex h-full w-full flex-col-reverse md:flex-row">
      <div className="w-full flex-shrink-0 overflow-y-auto bg-gray-900 p-4 md:w-80 lg:w-96">
        <h2 className="mb-4 text-2xl font-bold text-white">Controls</h2>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-300">
            View Mode
          </label>
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => {
                setViewMode("2d");
                setIsTouring(false);
                setIsAutoRotating(false);
              }}
              className={`flex-1 rounded-l-md px-4 py-2 text-sm font-medium ${
                viewMode === "2d"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              2D Map
            </button>
            <button
              onClick={() => setViewMode("3d")}
              className={`flex-1 rounded-r-md px-4 py-2 text-sm font-medium ${
                viewMode === "3d"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              3D Path
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label
            htmlFor="coordinates"
            className="mb-2 block text-sm font-medium text-gray-300"
          >
            Input Coordinates (lat, lng pairs)
          </label>
          <textarea
            id="coordinates"
            rows={5}
            className="block w-full rounded-md border-gray-600 bg-gray-800 p-2.5 text-sm text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
            placeholder="25.2677, 82.9913
25.309, 82.999
25.305, 83.010"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          ></textarea>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-900 p-3">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        <button
          onClick={handleParseCoordinates}
          disabled={isLoading}
          className="mb-2 w-full rounded-lg bg-blue-600 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? "Loading..." : "Load Points"}
        </button>

        <div className="mb-4 text-center text-sm text-gray-400">
          Or Upload JSON File
        </div>
        <input
          type="file"
          accept=".json,application/json"
          onChange={handleFileUpload}
          className="mb-4 block w-full text-sm text-gray-400
            file:mr-4 file:rounded-md file:border-0
            file:bg-gray-700 file:px-4 file:py-2
            file:text-sm file:font-semibold file:text-blue-300
            hover:file:bg-gray-600"
        />

        <hr className="my-4 border-gray-700" />
        <div className="space-y-2">
          <button
            onClick={startVisualization}
            disabled={initialPoints.length < 2 || isLoading}
            className="w-full rounded-lg bg-green-600 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? "Visualizing..." : "Start Visualization"}
          </button>

          <button
            onClick={handleDownloadData}
            disabled={allWaypoints.length === 0 || isLoading}
            className="w-full rounded-lg bg-purple-600 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            Download Waypoint Data
          </button>

          {viewMode === "3d" && allWaypoints.length > 0 && (
            <>
              {!isTouring && (
                <button
                  onClick={() => setIsAutoRotating(!isAutoRotating)}
                  className={`w-full rounded-lg px-5 py-2.5 text-center text-sm font-medium text-white ${
                    isAutoRotating
                      ? "bg-yellow-600 hover:bg-yellow-700"
                      : "bg-gray-600 hover:bg-gray-700"
                  } disabled:opacity-50`}
                >
                  {isAutoRotating ? "Stop Rotation" : "Start Rotation"}
                </button>
              )}

              <button
                onClick={() => {
                  setIsTouring(!isTouring);
                  setIsAutoRotating(false);
                }}
                disabled={isLoading}
                className={`w-full rounded-lg px-5 py-2.5 text-center text-sm font-medium text-white ${
                  isTouring
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-indigo-600 hover:bg-indigo-700"
                } disabled:opacity-50`}
              >
                {isTouring ? "Stop 3D Tour" : "Start 3D Tour"}
              </button>
            </>
          )}
        </div>

        {totalPoints > 0 && (
          <div className="mt-4 rounded-md bg-gray-800 p-3 text-center">
            <p className="text-sm text-gray-300">
              {currentPoint !== null
                ? `Visualizing point ${currentPoint + 1} of ${totalPoints}`
                : `Visualization complete. ${totalPoints} total waypoints.`}
            </p>
            {currentPoint !== null && (
              <div className="mt-2 w-full rounded-full bg-gray-700">
                <div
                  className="rounded-full bg-blue-500 p-0.5 text-center text-xs font-medium leading-none text-blue-100"
                  style={{
                    width: `${((currentPoint + 1) / totalPoints) * 100}%`,
                  }}
                >
                  {Math.round(((currentPoint + 1) / totalPoints) * 100)}%
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="h-full w-full">
        {viewMode === "2d" ? (
          <MapContainer
            center={[25.3176, 82.9739]}
            zoom={13}
            className="h-full w-full"
            attributionControl={false}
          >
            <TileLayer
              attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />

            <TileLayer
              attribution="Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              pane="shadowPane"
            />
            <MapAutoFitter points={initialPoints} />

            {allWaypoints.length === 0 &&
              initialPoints.map((p, idx) => (
                <Marker key={`initial-${idx}`} position={[p.lat, p.lng]}>
                  <Popup>
                    Initial Point {idx + 1} <br /> {p.lat.toFixed(5)},{" "}
                    {p.lng.toFixed(5)}
                  </Popup>
                </Marker>
              ))}

            {idealWaypoints.length > 0 && (
              <Polyline
                pathOptions={{
                  color: "red",
                  weight: 2,
                  dashArray: "5, 10",
                  opacity: 0.7,
                }}
                positions={idealWaypoints.map((p) => [p.lat, p.lng])}
              />
            )}

            {allWaypoints.length > 0 &&
              allWaypoints.map((p) => (
                <Marker
                  key={`waypoint-${p.id}`}
                  position={[p.lat, p.lng]}
                  icon={p.type === "initial" ? defaultIcon : interpolatedIcon}
                  opacity={p.type === "initial" ? 1.0 : 0.6}
                  zIndexOffset={p.type === "initial" ? 1000 : 0}
                >
                  <Popup>
                    <strong>
                      {p.type === "initial" ? "Initial Point" : "Waypoint"}{" "}
                      {p.id}
                    </strong>
                    <br />
                    {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                    <br />
                    Timestamp: {new Date(p.timestamp).toLocaleTimeString()}
                    {p.type === "interpolated" && (
                      <>
                        <hr style={{ margin: "4px 0" }} />
                        <strong>Deviation Cause:</strong>
                        <br />- Wind: {p.windSpeed.toFixed(0)} km/h @{" "}
                        {p.windDirection.toFixed(0)}°
                        <br />- Temp: {p.temperature.toFixed(1)}°C
                      </>
                    )}
                  </Popup>
                </Marker>
              ))}

            <Polyline
              pathOptions={{ color: "cyan", weight: 3 }}
              positions={visualizedPoints.map((p) => [p.lat, p.lng])}
            />

            {currentPoint !== null && visualizedPoints[currentPoint] && (
              <Marker
                position={[
                  visualizedPoints[currentPoint].lat,
                  visualizedPoints[currentPoint].lng,
                ]}
                icon={currentIcon}
                zIndexOffset={2000}
              >
                <Popup>Point {currentPoint + 1}</Popup>
              </Marker>
            )}
          </MapContainer>
        ) : (
          <Scene3D
            points={allWaypoints}
            isTouring={isTouring}
            onTourComplete={() => setIsTouring(false)}
            isAutoRotating={isAutoRotating}
            onInteracted={() => setIsAutoRotating(false)}
          />
        )}
      </div>
    </div>
  );
}
