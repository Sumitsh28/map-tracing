import * as L from "leaflet";

export const defaultIcon = L.icon({
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

export const currentIcon = L.icon({
  iconUrl:
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iY3lhbiIgd2lkdGg9IjM2cHgiIGhlaWdodD0iMzZweCI+PHBhdGggZD0iTTEyIDJjLTUuNTIgMCAtMTAgNC40OCAtMTAgMTBzNC44OCAxMCAxMCAxMCAxMCAtNC40OCAxMCAtMTBTMjAuNTIgMiAxMiAyeiBtMCAxOGMtNC40MSAwIC04IC0zLjU5IC04IC04czMuNTkgLTggOCAtOCA4IDMuNTkgOCA4IC0zLjU5IDggLTggOHoiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI1Ii8+PC9zdmc+",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export const interpolatedIcon = L.icon({
  iconUrl:
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0ZGRkZGRiIgd2lkdGg9IjEycHgiIGhlaWdodD0iMTJweCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIC8+PC9zdmc+",
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

export const userLocationIcon = L.icon({
  iconUrl:
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzBkNjVmZCIgd2lkdGg9IjI2cHgiIGhlaWdodD0iMjZweCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiAvPjwvc3ZnPg==",
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -13],
});

export const tempDotIcon = L.icon({
  iconUrl:
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2Y4N2ExYSIgd2lkdGg9IjEycHgiIGhlaWdodD0iMTJweCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiAvPjwvc3ZnPg==", // Orange dot
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

// Set the default icon for all markers
L.Marker.prototype.options.icon = defaultIcon;
