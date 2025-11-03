"use client";

import dynamic from "next/dynamic";
import React from "react";

const MapVisualizer = dynamic(() => import("./components/MapVisualizer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <p className="text-lg text-gray-300">Loading Map...</p>
    </div>
  ),
});

export default function MapWrapper() {
  return (
    <main className="h-full w-full">
      <MapVisualizer />
    </main>
  );
}
