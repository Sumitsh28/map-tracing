"use client";

import React, { useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CrosshairIcon,
  AlertTriangleIcon,
  Trash2Icon,
} from "lucide-react";
import { Coordinate, Waypoint } from "../helpers/types";

interface ControlPanelProps {
  rawText: string;
  error: string | null;
  isLoading: boolean;
  isSelectMode: boolean;
  usePlaygroundWind: boolean;
  playgroundWindSpeed: number;
  playgroundWindDirection: number;
  isTouring: boolean;
  isAutoRotating: boolean;
  totalPoints: number;
  currentPoint: number | null;
  initialPoints: Coordinate[];
  allWaypoints: Waypoint[];
  viewMode: "2d" | "3d";

  setRawText: (text: string) => void;
  setIsSelectMode: (isSelect: boolean) => void;
  setUsePlaygroundWind: (use: boolean) => void;
  setPlaygroundWindSpeed: (speed: number) => void;
  setPlaygroundWindDirection: (dir: number) => void;
  setIsTouring: (isTouring: boolean) => void;
  setIsAutoRotating: (isRotating: boolean) => void;

  handleParseCoordinates: () => void;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleStartVisualization: (maxFlightTime: number | null) => void;
  handleDownloadData: () => void;
  handleViewModeChange: (mode: "2d" | "3d") => void;
  handleClear: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  rawText,
  error,
  isLoading,
  isSelectMode,
  usePlaygroundWind,
  playgroundWindSpeed,
  playgroundWindDirection,
  isTouring,
  isAutoRotating,
  totalPoints,
  currentPoint,
  initialPoints,
  allWaypoints,
  viewMode,
  setRawText,
  setIsSelectMode,
  setUsePlaygroundWind,
  setPlaygroundWindSpeed,
  setPlaygroundWindDirection,
  setIsTouring,
  setIsAutoRotating,
  handleParseCoordinates,
  handleFileUpload,
  handleStartVisualization,
  handleDownloadData,
  handleViewModeChange,
  handleClear,
}) => {
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [maxFlightTime, setMaxFlightTime] = useState<string>("");

  const onStartClick = () => {
    const time = maxFlightTime.trim() === "" ? null : Number(maxFlightTime);
    handleStartVisualization(time);
  };

  return (
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
(Or click on the map in 2D mode)`}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            ></textarea>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-900/50 p-3 flex items-center gap-3">
              <AlertTriangleIcon className="h-5 w-5 text-red-100 flex-shrink-0" />
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

          <button
            onClick={handleClear}
            disabled={isLoading}
            className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border border-white/6 bg-transparent px-4 py-2 text-sm font-semibold text-red-300 text-center cursor-pointer hover:bg-red-900/30 transition-colors disabled:opacity-50"
          >
            <Trash2Icon className="h-4 w-4" />
            Clear / Reset
          </button>

          <div className="my-4 h-px bg-white/6" />

          <div className="mb-4">
            <label
              htmlFor="battery"
              className="mb-2 block text-sm font-medium text-gray-300"
            >
              Max Flight Time (minutes)
            </label>
            <input
              id="battery"
              type="number"
              min="0"
              step="1"
              value={maxFlightTime}
              onChange={(e) => setMaxFlightTime(e.target.value)}
              className="block w-full rounded-xl border border-white/6 bg-gradient-to-br from-black/30 to-gray-900/30 p-3 text-sm text-white placeholder-gray-400 focus:border-white/20 focus:ring-0 outline-none shadow-inner"
              placeholder="e.g., 30 (empty for unlimited)"
            />
          </div>

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
                onChange={(e) => setPlaygroundWindSpeed(Number(e.target.value))}
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
              onClick={onStartClick}
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
  );
};

export default ControlPanel;
