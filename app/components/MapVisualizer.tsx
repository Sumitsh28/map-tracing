"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMapEvents,
  useMap,
} from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import MapAutoFitter from "./MapAutoFitter";
import Scene3D from "./Scene3D";
import { ChevronLeftIcon, ChevronRightIcon, CrosshairIcon } from "lucide-react";

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

function MapClickHandler({
  onMapClick,
  isSelectMode,
}: {
  onMapClick: (latlng: L.LatLng) => void;
  isSelectMode: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    if (isSelectMode) {
      container.style.cursor = "crosshair";
    } else {
      container.style.cursor = "";
    }
    return () => {
      container.style.cursor = "";
    };
  }, [map, isSelectMode]);

  useMapEvents({
    click(e) {
      if (isSelectMode) {
        onMapClick(e.latlng);
      }
    },
  });

  return null;
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
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iY3lhbiIgd2lkdGg9IjM2cHgiIGhlaWdodD0iMzZweCI+PHBhdGggZD0iTTEyIDJjLTUuNTIgMCAtMTAgNC40OCAtMTAgMTBzNC44OCAxMCAxMCAxMCAxMCAtNC40OCAxMCAtMTBTMjAuNTIgMiAxMiAyeiBtMCAxOGMtNC40MSAwIC04IC0zLjU5IC04IC04czMuNTkgLTggOCAtOCA4IDMuNTkgOCA4IC0zLjU5IDggLTggOHoiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI1Ii8+PC9zdmc+",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const interpolatedIcon = L.icon({
  iconUrl:
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0ZGRkZGRiIgd2lkdGg9IjEycHgiIGhlaWdodD0iMTJweCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIC8+PC9zdmc+",
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const userLocationIcon = L.icon({
  iconUrl:
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzBkNjVmZCIgd2lkdGg9IjI0cHgiIGhlaWdodD0iMjRweCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiAvPjwvc3ZnPg==",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

const tempDotIcon = L.icon({
  iconUrl:
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2Y4N2ExYSIgd2lkdGg9IjEycHgiIGhlaWdodD0iMTJweCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiAvPjwvc3ZnPg==", // Orange dot
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

L.Marker.prototype.options.icon = defaultIcon;

// --- Constants ---
const DRONE_SPEED_KMPH = 60;
const KM_PER_DEG_LAT = 111.1;

// --- Component ---
export default function MapVisualizer() {
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTouring, setIsTouring] = useState(false);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const [rawText, setRawText] = useState("");
  const [initialPoints, setInitialPoints] = useState<Coordinate[]>([]);

  const [clickedPoints, setClickedPoints] = useState<Coordinate[]>([]);

  const [allWaypoints, setAllWaypoints] = useState<Waypoint[]>([]);
  const [staticSimulatedPath, setStaticSimulatedPath] = useState<Waypoint[]>(
    []
  );
  const [visualizedPoints, setVisualizedPoints] = useState<Waypoint[]>([]);
  const [idealWaypoints, setIdealWaypoints] = useState<Coordinate[]>([]);

  const [currentPoint, setCurrentPoint] = useState<number | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [usePlaygroundWind, setUsePlaygroundWind] = useState(false);
  const [playgroundWindSpeed, setPlaygroundWindSpeed] = useState(20);
  const [playgroundWindDirection, setPlaygroundWindDirection] = useState(90);

  const mapRef = useRef<L.Map | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [isSelectMode, setIsSelectMode] = useState(false);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Effect for watching user's geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocationError(null);
      },
      (err) => {
        setLocationError(`Geolocation error: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const handleViewModeChange = (mode: "2d" | "3d") => {
    setViewMode(mode);
    if (mode === "3d") {
      setIsSelectMode(false);
    }
    if (mode === "2d") {
      setIsTouring(false);
      setIsAutoRotating(false);
    }
  };

  const resetPaths = () => {
    setVisualizedPoints([]);
    setAllWaypoints([]);
    setStaticSimulatedPath([]);
    setIdealWaypoints([]);
    setTotalPoints(0);
    setCurrentPoint(null);
    setIsTouring(false);
    setClickedPoints([]);
  };

  const handleParseCoordinates = () => {
    setError(null);
    resetPaths();
    setIsLoading(true);

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
    resetPaths();
    setIsLoading(true);

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
    setStaticSimulatedPath([]);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const generatePath = (
      useCustomWind: boolean
    ): { waypoints: Waypoint[]; idealCoords: Coordinate[] } => {
      const waypoints: Waypoint[] = [];
      const idealCoords: Coordinate[] = [];
      let idCounter = 0;
      let time = new Date();

      const addWaypoint = (
        p: Coordinate,
        type: "initial" | "interpolated",
        data: Pick<Waypoint, "temperature" | "windSpeed" | "windDirection">
      ) => {
        time.setSeconds(time.getSeconds() + 10);
        waypoints.push({
          ...p,
          id: idCounter++,
          type: type,
          timestamp: time.toISOString(),
          ...data,
        });
      };

      const initialData = getSimulatedData(
        initialPoints[0].lat,
        initialPoints[0].lng
      );
      addWaypoint(initialPoints[0], "initial", initialData);
      idealCoords.push(initialPoints[0]);

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
          idealCoords.push(idealPoint);

          const { temperature, windSpeed, windDirection } = useCustomWind
            ? {
                temperature: getSimulatedData(idealPoint.lat, idealPoint.lng)
                  .temperature,
                windSpeed: playgroundWindSpeed,
                windDirection: playgroundWindDirection,
              }
            : getSimulatedData(idealPoint.lat, idealPoint.lng);

          const toRad = (deg: number) => (deg * Math.PI) / 180;
          const windDirectionRad = toRad(windDirection);
          const drift_km = windSpeed * step_time_hours;
          const drift_y_km = drift_km * Math.cos(windDirectionRad);
          const drift_x_km = drift_km * Math.sin(windDirectionRad);
          const km_per_deg_lng =
            KM_PER_DEG_LAT * Math.cos(toRad(idealPoint.lat));
          const drift_lat = drift_y_km / KM_PER_DEG_LAT;
          const drift_lng = drift_x_km / km_per_deg_lng;
          const realisticPoint: Coordinate = {
            lat: idealPoint.lat + drift_lat,
            lng: idealPoint.lng + drift_lng,
          };

          addWaypoint(realisticPoint, "interpolated", {
            temperature,
            windSpeed,
            windDirection,
          });
        }

        const endData = getSimulatedData(p2.lat, p2.lng);
        addWaypoint(p2, "initial", endData);
        idealCoords.push(p2);
      }
      return { waypoints, idealCoords };
    };

    const { waypoints: officialWaypoints, idealCoords } = generatePath(false);
    setAllWaypoints(officialWaypoints);
    setIdealWaypoints(idealCoords);

    let pathFor2DAnimation: Waypoint[];

    if (usePlaygroundWind) {
      setStaticSimulatedPath(officialWaypoints);
      const { waypoints: playgroundWaypoints } = generatePath(true);
      pathFor2DAnimation = playgroundWaypoints;
    } else {
      pathFor2DAnimation = officialWaypoints;
    }

    setTotalPoints(pathFor2DAnimation.length);
    setCurrentPoint(0);
    setIsLoading(false);

    const step = (index: number) => {
      if (index >= pathFor2DAnimation.length) {
        setCurrentPoint(null);
        return;
      }

      setVisualizedPoints(pathFor2DAnimation.slice(0, index + 1));
      setCurrentPoint(index);

      timeoutRef.current = setTimeout(() => {
        step(index + 1);
      }, 300);
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
      const dataStr = JSON.stringify(allWaypoints, null, 2);
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

  const handleMapClick = (latlng: L.LatLng) => {
    const newCoordStr = `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
    setRawText((prev) => (prev ? `${prev}\n${newCoordStr}` : newCoordStr));

    const newCoord = { lat: latlng.lat, lng: latlng.lng };
    setClickedPoints((prev) => [...prev, newCoord]);
  };

  const handleFlyToUserLocation = () => {
    if (mapRef.current && userLocation) {
      mapRef.current.flyTo([userLocation.lat, userLocation.lng], 15);
    }
  };

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-gray-950">
      <div className="h-full w-full">
        {viewMode === "2d" ? (
          <MapContainer
            center={[25.3176, 82.9739]}
            zoom={13}
            className="h-full w-full z-0"
            attributionControl={false}
            ref={mapRef}
            dragging={!isSelectMode}
            scrollWheelZoom={true}
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

            <MapClickHandler
              onMapClick={handleMapClick}
              isSelectMode={isSelectMode}
            />

            {clickedPoints.map((p, idx) => (
              <Marker
                key={`temp-${idx}`}
                position={[p.lat, p.lng]}
                icon={tempDotIcon}
                zIndexOffset={500}
              />
            ))}

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
                  color: "#ef4444",
                  weight: 2,
                  dashArray: "6, 8",
                  opacity: 0.85,
                }}
                positions={idealWaypoints.map((p) => [p.lat, p.lng])}
              />
            )}

            {staticSimulatedPath.length > 0 && (
              <Polyline
                pathOptions={{
                  color: "#a855f7",
                  weight: 3,
                  opacity: 0.7,
                }}
                positions={staticSimulatedPath.map((p) => [p.lat, p.lng])}
              />
            )}

            <Polyline
              pathOptions={{ color: "#06b6d4", weight: 3 }}
              positions={visualizedPoints.map((p) => [p.lat, p.lng])}
            />

            {visualizedPoints.length > 0 &&
              visualizedPoints.map((p) => (
                <Marker
                  key={`waypoint-${p.id}`}
                  position={[p.lat, p.lng]}
                  icon={p.type === "initial" ? defaultIcon : interpolatedIcon}
                  opacity={p.type === "initial" ? 1.0 : 0.65}
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
                        <hr style={{ margin: "6px 0" }} />
                        <strong>Deviation Cause:</strong>
                        <br />- Wind: {p.windSpeed.toFixed(0)} km/h @{" "}
                        {p.windDirection.toFixed(0)}°
                        <br />- Temp: {p.temperature.toFixed(1)}°C
                      </>
                    )}
                  </Popup>
                </Marker>
              ))}

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

            {userLocation && (
              <Marker
                position={[userLocation.lat, userLocation.lng]}
                icon={userLocationIcon}
                zIndexOffset={1500}
              >
                <Popup>Your Location</Popup>
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

      {/* --- MODIFIED --- Fly to Location Button (Bottom Left) */}
      <div className="absolute bottom-6 left-6 z-[1000] flex flex-col items-start">
        <button
          onClick={handleFlyToUserLocation}
          disabled={!userLocation || viewMode === "3d"}
          className="rounded-xl border border-white/10 bg-gray-950/75 px-4 py-3 text-sm font-semibold text-blue-200 shadow-xl backdrop-blur-lg transition-colors hover:bg-gray-900/75 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Fly to my location"
        >
          {userLocation ? "My Location" : "Locating..."}
        </button>
        {locationError && (
          <p className="mt-2 rounded-lg bg-red-900/75 p-2 text-xs text-red-100 shadow-lg backdrop-blur-lg">
            {locationError}
          </p>
        )}
      </div>

      {/* --- Control Panel (Right Side) --- */}
      <div
        className={`absolute right-6 top-1/2 -translate-y-1/2 z-30 w-96 max-w-[420px] p-1 transition-transform duration-300 ease-in-out ${
          isPanelOpen ? "translate-x-0" : "translate-x-[calc(100%-56px)]"
        }`}
      >
        <button
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          aria-label={isPanelOpen ? "Collapse panel" : "Expand panel"}
          className="absolute top-1/2 -translate-y-1/2 rounded-lg text-white shadow-2xl z-[9999] bg-gray-950/75 hover:bg-gray-900/75 border border-white/10 transition-transform hover:scale-105 flex items-center justify-center"
          style={{
            left: "-16px",
            width: "32px",
            height: "32px",
          }}
        >
          {isPanelOpen ? (
            <ChevronRightIcon className="h-5 w-5" />
          ) : (
            <ChevronLeftIcon className="h-5 w-5" />
          )}
        </button>

        <div
          className="relative rounded-3xl border border-white/6 bg-gradient-to-br from-black/40 to-gray-900/30 backdrop-blur-lg shadow-xl overflow-hidden"
          style={{
            boxShadow:
              "0 10px 30px rgba(2,6,23,0.6), inset 0 1px 0 rgba(255,255,255,0.02)",
            WebkitBackdropFilter: "saturate(120%) blur(14px)",
            backdropFilter: "saturate(120%) blur(14px)",
          }}
        >
          <div className="p-5">
            <h2 className="mb-4 text-2xl font-semibold text-white">
              Drone Controls
            </h2>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-300">
                View Mode
              </label>
              <div className="flex rounded-xl bg-white/2 p-1 gap-1">
                <button
                  onClick={() => handleViewModeChange("2d")}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                    viewMode === "2d"
                      ? "bg-gray-800 text-white shadow-inner"
                      : "bg-transparent text-gray-300 hover:bg-white/2"
                  }`}
                >
                  2D Map
                </button>
                <button
                  onClick={() => handleViewModeChange("3d")}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                    viewMode === "3d"
                      ? "bg-gray-800 text-white shadow-inner"
                      : "bg-transparent text-gray-300 hover:bg-white/2"
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
                className="block w-full rounded-xl border border-white/6 bg-gradient-to-br from-black/30 to-gray-900/30 p-3 text-sm text-white placeholder-gray-400 focus:border-white/20 focus:ring-0 outline-none shadow-inner"
                placeholder={`25.2677, 82.9913
25.309, 82.999
25.305, 83.010
(Or click on the map in 2D mode)`}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
              ></textarea>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-900/50 p-3">
                <p className="text-sm text-red-100">{error}</p>
              </div>
            )}

            {viewMode === "2d" && (
              <button
                onClick={() => setIsSelectMode(!isSelectMode)}
                className={`mb-3 w-full flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold text-center cursor-pointer transition-colors ${
                  isSelectMode
                    ? "border-blue-400 bg-blue-900/50 text-white"
                    : "border-white/6 bg-transparent text-blue-200 hover:bg-white/5"
                }`}
              >
                <CrosshairIcon className="h-4 w-4" />
                {isSelectMode
                  ? "Selection Mode Active"
                  : "Enable Select Coordinates"}
              </button>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleParseCoordinates}
                disabled={isLoading}
                className="flex-1 rounded-xl border border-white/6 bg-gray-800/80 px-4 py-2 text-sm font-semibold text-white shadow-md hover:scale-[1.01] transition-transform disabled:opacity-50"
              >
                {isLoading ? "Loading..." : "Load Points"}
              </button>

              <label className="flex-1">
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="rounded-xl border border-white/6 bg-transparent px-4 py-2 text-sm font-semibold text-blue-200 text-center cursor-pointer hover:bg-white/2">
                  Upload JSON
                </div>
              </label>
            </div>

            <div className="my-4 h-px bg-white/6" />
            <div className="space-y-3 rounded-xl bg-white/5 p-3">
              <label className="flex items-center justify-between text-base font-medium text-white">
                Wind Playground (2D Only)
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded text-blue-500 border-gray-500 focus:ring-blue-500"
                  checked={usePlaygroundWind}
                  onChange={(e) => setUsePlaygroundWind(e.target.checked)}
                />
              </label>

              <div
                className={`mt-2 space-y-3 transition-opacity ${
                  !usePlaygroundWind ? "opacity-50" : ""
                }`}
              >
                <label className="mb-1 block text-sm font-medium text-gray-300">
                  Wind Speed ({playgroundWindSpeed} km/h)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={playgroundWindSpeed}
                  disabled={!usePlaygroundWind}
                  onChange={(e) =>
                    setPlaygroundWindSpeed(Number(e.target.value))
                  }
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                />
                <label className="mb-1 block text-sm font-medium text-gray-300">
                  Wind Direction ({playgroundWindDirection}°)
                </label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="1"
                  value={playgroundWindDirection}
                  disabled={!usePlaygroundWind}
                  onChange={(e) =>
                    setPlaygroundWindDirection(Number(e.target.value))
                  }
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="my-4 h-px bg-white/6" />

            <div className="space-y-3">
              <button
                onClick={startVisualization}
                disabled={initialPoints.length < 2 || isLoading}
                className="w-full rounded-2xl bg-gradient-to-br from-gray-800/90 to-gray-700/80 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                {isLoading ? "Visualizing..." : "Start Visualization"}
              </button>

              <button
                onClick={handleDownloadData}
                disabled={allWaypoints.length === 0 || isLoading}
                className="w-full rounded-2xl border border-white/6 bg-transparent px-4 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-white/2 transition-all disabled:opacity-50"
              >
                Download Waypoint Data
              </button>

              {viewMode === "3d" && allWaypoints.length > 0 && (
                <div className="grid grid-cols-1 gap-2">
                  {!isTouring && (
                    <button
                      onClick={() => setIsAutoRotating(!isAutoRotating)}
                      className={`w-full rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-md transition-all ${
                        isAutoRotating
                          ? "bg-gray-700/90 hover:bg-gray-700"
                          : "bg-transparent hover:bg-white/2 border border-white/6"
                      }`}
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
                    className={`w-full rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-md transition-all ${
                      isTouring
                        ? "bg-red-700/90 hover:bg-red-600"
                        : "bg-indigo-700/90 hover:bg-indigo-600"
                    }`}
                  >
                    {isTouring ? "Stop 3D Tour" : "Start 3D Tour"}
                  </button>
                </div>
              )}
            </div>

            {totalPoints > 0 && (
              <div className="mt-5 rounded-xl bg-white/2 p-3 text-center">
                <p className="text-sm font-medium text-white">
                  {currentPoint !== null
                    ? `Visualizing point ${currentPoint + 1} of ${totalPoints}`
                    : `Visualization complete. ${totalPoints} total waypoints.`}
                </p>
                {currentPoint !== null && (
                  <div className="mt-2 w-full rounded-full bg-gray-800/60">
                    <div
                      className="rounded-full bg-white/10 p-1 text-center text-xs font-medium leading-none text-white"
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
        </div>
      </div>
    </div>
  );
}
