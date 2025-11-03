import { NextResponse } from "next/server";

function parseBBox(bbox?: string) {
  if (!bbox) return null;
  const parts = bbox.split(",").map((s) => parseFloat(s.trim()));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return null;
  const [minLng, minLat, maxLng, maxLat] = parts;
  return { minLng, minLat, maxLng, maxLat };
}

function latLngToTile(lon: number, lat: number, z: number) {
  const xtile = Math.floor(((lon + 180) / 360) * Math.pow(2, z));
  const latRad = (lat * Math.PI) / 180;
  const ytile = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      Math.pow(2, z)
  );
  return { x: xtile, y: ytile, z };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const bboxParam = url.searchParams.get("bbox") ?? undefined;
    const bbox = parseBBox(bboxParam);

    const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    if (MAPBOX_TOKEN) {
      let mapboxUrl: string;

      if (bbox) {
        const bboxString = `[${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}]`;

        mapboxUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${bboxString}/1024x1024@2x?padding=60&access_token=${MAPBOX_TOKEN}`;
      } else {
        const centerLng = parseFloat(url.searchParams.get("lng") ?? "82.99");
        const centerLat = parseFloat(url.searchParams.get("lat") ?? "25.30");
        const zoom = 15;
        mapboxUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${centerLng},${centerLat},${zoom},0/1024x1024@2x?access_token=${MAPBOX_TOKEN}`;
      }

      const r = await fetch(mapboxUrl);
      if (!r.ok) {
        return NextResponse.json(
          { error: "Mapbox returned error", status: r.status, url: mapboxUrl },
          { status: 502 }
        );
      }
      const bytes = await r.arrayBuffer();
      return new NextResponse(Buffer.from(bytes), {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=3600",
        },
      });
    } else {
      let centerLng = 82.99,
        centerLat = 25.3,
        zoom = 15;
      if (bbox) {
        centerLng = (bbox.minLng + bbox.maxLng) / 2;
        centerLat = (bbox.minLat + bbox.maxLat) / 2;

        const lngSpan = Math.abs(bbox.maxLng - bbox.minLng);
        const latSpan = Math.abs(bbox.maxLat - bbox.minLat);
        const maxSpan = Math.max(lngSpan, latSpan);

        if (maxSpan > 1.5) zoom = 9;
        else if (maxSpan > 0.5) zoom = 11;
        else if (maxSpan > 0.12) zoom = 13;
        else if (maxSpan > 0.02) zoom = 15;
        else zoom = 16;
      }

      const tile = latLngToTile(centerLng, centerLat, zoom);
      const osmUrl = `https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`;
      const r = await fetch(osmUrl);
      if (!r.ok) {
        return NextResponse.json(
          { error: "OSM tile fetch failed", status: r.status },
          { status: 502 }
        );
      }
      const bytes = await r.arrayBuffer();
      return new NextResponse(Buffer.from(bytes), {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }
  } catch (err: any) {
    console.error("get-map-image error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
