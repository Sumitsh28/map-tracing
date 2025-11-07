"use client";

import React, { useEffect } from "react";
import {
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMapEvents,
  useMap,
} from "react-leaflet";
import * as L from "leaflet";
import MapAutoFitter from "./MapAutoFitter";
import { Coordinate, Waypoint } from "../helpers/types";
import {
  defaultIcon,
  currentIcon,
  interpolatedIcon,
  userLocationIcon,
  tempDotIcon,
} from "../helpers/icons";

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

interface MapOverlaysProps {
  initialPoints: Coordinate[];
  clickedPoints: Coordinate[];
  allWaypoints: Waypoint[];
  idealWaypoints: Coordinate[];
  staticSimulatedPath: Waypoint[];
  visualizedPoints: Waypoint[];
  currentPoint: number | null;
  userLocation: Coordinate | null;
  handleMapClick: (latlng: L.LatLng) => void;
  isSelectMode: boolean;
}

const MapOverlays: React.FC<MapOverlaysProps> = ({
  initialPoints,
  clickedPoints,
  allWaypoints,
  idealWaypoints,
  staticSimulatedPath,
  visualizedPoints,
  currentPoint,
  userLocation,
  handleMapClick,
  isSelectMode,
}) => {
  return (
    <>
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
          <Marker
            key={`initial-${idx}`}
            position={[p.lat, p.lng]}
            icon={defaultIcon}
          >
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
                {p.type === "initial" ? "Initial Point" : "Waypoint"} {p.id}
              </strong>
              <br />
              {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
              <br />
              Timestamp: {new Date(p.timestamp).toLocaleTimeString()}
              <br />
              Flight Time: {(p.elapsedTimeHours * 60).toFixed(1)} mins
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
    </>
  );
};

export default MapOverlays;
