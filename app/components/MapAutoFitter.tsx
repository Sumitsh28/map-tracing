"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import * as L from "leaflet";
import { type Coordinate } from "./MapVisualizer";

interface MapAutoFitterProps {
  points: Coordinate[];
}

export default function MapAutoFitter({ points }: MapAutoFitterProps) {
  const map = useMap();

  useEffect(() => {
    if (points && points.length > 0) {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));

      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [points, map]);
  return null;
}
