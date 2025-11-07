"use client";

import React, { useState, useEffect, useRef } from "react";
import { MapContainer } from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";

import Scene3D from "./Scene3D";
import ControlPanel from "./ControlPanel";
import MapOverlays from "./MapOverlays";
import MissionSummaryModal from "./MissionSummaryModal";

import { Coordinate, Waypoint, MissionSummary } from "../helpers/types";
import { generatePath, calculateMissionSummary } from "../helpers/utils";

export default function MapVisualizer() {
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTouring, setIsTouring] = useState(false);
  const [isAutoRotating, setIsAutoRotating] = useState(true);

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

  const [missionSummary, setMissionSummary] = useState<MissionSummary | null>(
    null
  );

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
      (err) => setLocationError(`Geolocation error: ${err.message}`),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const resetPaths = (clearInputs: boolean = false) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setError(null);
    setVisualizedPoints([]);
    setAllWaypoints([]);
    setStaticSimulatedPath([]);
    setIdealWaypoints([]);
    setTotalPoints(0);
    setCurrentPoint(null);
    setIsTouring(false);
    setClickedPoints([]);
    setMissionSummary(null);
    if (clearInputs) {
      setRawText("");
      setInitialPoints([]);
    }
  };

  const handleClear = () => {
    resetPaths(true);
  };

  const handleParseCoordinates = () => {
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

    const newPoints: Coordinate[] = matches
      .map((match) => ({
        lat: Number(match[1]),
        lng: Number(match[2]),
      }))
      .filter((p) => !isNaN(p.lat) && !isNaN(p.lng));

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

    resetPaths();
    setIsLoading(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const json = JSON.parse(text);
        if (!Array.isArray(json)) {
          throw new Error("Invalid JSON format. Expected an array.");
        }

        const newPoints: Coordinate[] = json
          .map((item: any) => {
            if (Array.isArray(item) && item.length >= 2)
              return { lat: item[0], lng: item[1] };
            if (typeof item === "object" && item.lat && item.lng)
              return { lat: item.lat, lng: item.lng };
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
      } catch (err: any) {
        setError(`Failed to parse JSON file: ${err.message}`);
      }
      setIsLoading(false);
    };
    reader.onerror = () => {
      setError("Failed to read the file.");
      setIsLoading(false);
    };
    reader.readAsText(file);
  };

  const handleStartVisualization = (maxFlightTime: number | null) => {
    if (initialPoints.length < 2) {
      setError("Need at least 2 points to start visualization.");
      return;
    }

    resetPaths();
    setIsLoading(true);

    const { waypoints: officialWaypoints } = generatePath(
      initialPoints,
      false,
      0,
      0,
      null
    );
    setAllWaypoints(officialWaypoints);

    const {
      waypoints: pathForAnimation,
      idealCoords,
      batteryDepleted,
      finalWaypointIndex,
    } = generatePath(
      initialPoints,
      usePlaygroundWind,
      playgroundWindSpeed,
      playgroundWindDirection,
      maxFlightTime
    );

    setIdealWaypoints(idealCoords);

    if (usePlaygroundWind) {
      setStaticSimulatedPath(officialWaypoints);
    }

    setTotalPoints(finalWaypointIndex + 1);
    setCurrentPoint(0);
    setIsLoading(false);

    const step = (index: number) => {
      if (index > finalWaypointIndex) {
        setCurrentPoint(null);

        const finalWaypoints = pathForAnimation.slice(
          0,
          finalWaypointIndex + 1
        );
        const summary = calculateMissionSummary(finalWaypoints, idealCoords);
        setMissionSummary(summary);

        if (batteryDepleted) {
          setError("Mission stopped: Battery depleted.");
        }
        return;
      }

      setVisualizedPoints(pathForAnimation.slice(0, index + 1));
      setCurrentPoint(index);

      timeoutRef.current = setTimeout(() => {
        step(index + 1);
      }, 300);
    };

    step(0);
  };

  const handleDownloadData = () => {
    if (allWaypoints.length === 0) {
      setError("No waypoint data to download. Run visualization first.");
      return;
    }
    try {
      const dataStr = JSON.stringify(allWaypoints, null, 2);
      const dataUri =
        "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
      const link = document.createElement("a");
      link.setAttribute("href", dataUri);
      link.setAttribute("download", "drone_waypoints.json");
      link.click();
    } catch (err: any) {
      setError(`Failed to create download file: ${err.message}`);
    }
  };

  const handleMapClick = (latlng: L.LatLng) => {
    const newCoordStr = `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
    setRawText((prev) => (prev ? `${prev}\n${newCoordStr}` : newCoordStr));
    setClickedPoints((prev) => [...prev, { lat: latlng.lat, lng: latlng.lng }]);
  };

  const handleFlyToUserLocation = () => {
    if (mapRef.current && userLocation) {
      mapRef.current.flyTo([userLocation.lat, userLocation.lng], 15);
    }
  };

  const handleViewModeChange = (mode: "2d" | "3d") => {
    setViewMode(mode);
    if (mode === "3d") setIsSelectMode(false);
    if (mode === "2d") {
      setIsTouring(false);
      setIsAutoRotating(false);
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
            <MapOverlays
              initialPoints={initialPoints}
              clickedPoints={clickedPoints}
              allWaypoints={allWaypoints}
              idealWaypoints={idealWaypoints}
              staticSimulatedPath={staticSimulatedPath}
              visualizedPoints={visualizedPoints}
              currentPoint={currentPoint}
              userLocation={userLocation}
              handleMapClick={handleMapClick}
              isSelectMode={isSelectMode}
            />
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

      <div className="absolute bottom-6 left-6 z-[1000] flex flex-col items-start">
        <button
          onClick={handleFlyToUserLocation}
          disabled={!userLocation || viewMode === "3d"}
          className="rounded-xl border border-white/10 bg-gray-950/75 px-4 py-3 text-sm font-semibold text-blue-200 shadow-xl backdrop-blur-lg transition-colors hover:bg-gray-900/75 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Fly to my location"
        >
          {userLocation ? " My Location" : "Locating..."}
        </button>
        {locationError && (
          <p className="mt-2 rounded-lg bg-red-900/75 p-2 text-xs text-red-100 shadow-lg backdrop-blur-lg">
            {locationError}
          </p>
        )}
      </div>

      {/* Control Panel (Right Side) */}
      <ControlPanel
        rawText={rawText}
        error={error}
        isLoading={isLoading}
        isSelectMode={isSelectMode}
        usePlaygroundWind={usePlaygroundWind}
        playgroundWindSpeed={playgroundWindSpeed}
        playgroundWindDirection={playgroundWindDirection}
        isTouring={isTouring}
        isAutoRotating={isAutoRotating}
        totalPoints={totalPoints}
        currentPoint={currentPoint}
        initialPoints={initialPoints}
        allWaypoints={allWaypoints}
        viewMode={viewMode}
        setRawText={setRawText}
        setIsSelectMode={setIsSelectMode}
        setUsePlaygroundWind={setUsePlaygroundWind}
        setPlaygroundWindSpeed={setPlaygroundWindSpeed}
        setPlaygroundWindDirection={setPlaygroundWindDirection}
        setIsTouring={setIsTouring}
        setIsAutoRotating={setIsAutoRotating}
        handleParseCoordinates={handleParseCoordinates}
        handleFileUpload={handleFileUpload}
        handleStartVisualization={handleStartVisualization}
        handleDownloadData={handleDownloadData}
        handleViewModeChange={handleViewModeChange}
        handleClear={handleClear}
      />

      {/* Mission Summary Modal (Full Screen Overlay) */}
      <MissionSummaryModal
        summary={missionSummary}
        onClose={() => setMissionSummary(null)}
      />
    </div>
  );
}
