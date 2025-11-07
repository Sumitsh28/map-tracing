"use client";

import React from "react";
import { MissionSummary } from "../helpers/types";
import { XIcon } from "lucide-react";

interface MissionSummaryModalProps {
  summary: MissionSummary | null;
  onClose: () => void;
}

const MissionSummaryModal: React.FC<MissionSummaryModalProps> = ({
  summary,
  onClose,
}) => {
  if (!summary) return null;

  const formatTime = (timeHours: number) => {
    const totalMinutes = Math.floor(timeHours * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const seconds = Math.floor((timeHours * 3600) % 60);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;
  };

  return (
    <div className="absolute inset-0 z-[5000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-gray-900/80 p-8 shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <XIcon className="h-6 w-6" />
        </button>

        <h2 className="mb-6 text-3xl font-semibold text-white">
          Mission Summary
        </h2>

        <div className="space-y-4">
          <InfoRow
            label="Total Flight Time"
            value={formatTime(summary.totalFlightTimeHours)}
          />
          <InfoRow
            label="Realistic Distance"
            value={`${summary.totalRealisticDistance.toFixed(2)} km`}
          />
          <InfoRow
            label="Ideal Distance"
            value={`${summary.totalIdealDistance.toFixed(2)} km`}
          />
          <div className="my-4 h-px bg-white/10" />
          <InfoRow
            label="Min / Max Temp"
            value={`${summary.minTemperature.toFixed(
              1
            )}°C / ${summary.maxTemperature.toFixed(1)}°C`}
          />
          <InfoRow
            label="Min / Max Wind"
            value={`${summary.minWindSpeed.toFixed(
              0
            )} km/h / ${summary.maxWindSpeed.toFixed(0)} km/h`}
          />
        </div>

        <button
          onClick={onClose}
          className="mt-8 w-full rounded-xl bg-gray-800/80 px-4 py-3 text-sm font-semibold text-white shadow-md hover:scale-[1.01] transition-transform"
        >
          Close
        </button>
      </div>
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div className="flex justify-between items-center rounded-lg bg-white/5 px-4 py-3">
    <span className="text-sm font-medium text-gray-300">{label}</span>
    <span className="text-base font-semibold text-white">{value}</span>
  </div>
);

export default MissionSummaryModal;
