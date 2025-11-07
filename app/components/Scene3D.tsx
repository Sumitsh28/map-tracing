"use client";
import React, { Suspense, useMemo, useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Line, useTexture } from "@react-three/drei";
import * as THREE from "three";
import * as L from "leaflet";
import { Waypoint } from "../helpers/types";

interface PathData {
  points: THREE.Vector3[];
  cumulativeLengths: number[];
  totalLength: number;
}

interface Scene3DProps {
  points: Waypoint[];
  isTouring: boolean;
  onTourComplete: () => void;
  isAutoRotating: boolean;
  onInteracted: () => void;
}

interface PlaneProps {
  bounds: L.LatLngBounds | null;
}

function CameraRig({
  pathData,
  isTouring,
  onTourComplete,
  controlsRef,
}: {
  pathData: PathData;
  isTouring: boolean;
  onTourComplete: () => void;
  controlsRef: React.RefObject<any>;
}) {
  const { camera } = useThree();
  const progress = useRef(0);
  const initialCameraPos = useRef<THREE.Vector3 | null>(null);
  const initialCameraTarget = useRef<THREE.Vector3 | null>(null);
  const { points, cumulativeLengths, totalLength } = pathData;

  const [isReturning, setIsReturning] = useState(false);

  const getPointAtDistance = useMemo(() => {
    return (distance: number): THREE.Vector3 => {
      if (!points || points.length === 0) return new THREE.Vector3(0, 0, 0);
      if (distance <= 0) return points[0].clone();
      if (distance >= totalLength) return points[points.length - 1].clone();

      let i = 1;
      while (i < cumulativeLengths.length && cumulativeLengths[i] < distance) {
        i++;
      }
      const p1 = points[i - 1];
      const p2 = points[i];
      const segmentLength = cumulativeLengths[i] - cumulativeLengths[i - 1];
      const distanceIntoSegment = distance - cumulativeLengths[i - 1];
      if (segmentLength < 1e-6) {
        return p1.clone();
      }
      const tSegment = distanceIntoSegment / segmentLength;
      return new THREE.Vector3().lerpVectors(p1, p2, tSegment);
    };
  }, [points, cumulativeLengths, totalLength]);

  useEffect(() => {
    const controls = controlsRef.current;
    const cameraHeight = 0.25;
    const cameraOffset = 0.45;

    if (isTouring) {
      progress.current = 0;
      setIsReturning(false);
      if (!initialCameraPos.current) {
        initialCameraPos.current = camera.position.clone();
        if (controls) {
          initialCameraTarget.current = controls.target.clone();
        } else {
          initialCameraTarget.current = new THREE.Vector3(0, 0, 0);
        }
      }

      if (points.length > 0) {
        const startPoint = points[0].clone();
        const lookAheadDistance = Math.min(0.1, totalLength);
        const lookAtPoint = getPointAtDistance(lookAheadDistance);
        const dir = new THREE.Vector3()
          .subVectors(lookAtPoint, startPoint)
          .normalize();
        const camPos = startPoint.clone();
        camPos.add(dir.multiplyScalar(-cameraOffset));
        camPos.y += cameraHeight;
        camera.position.copy(camPos);
        camera.lookAt(lookAtPoint);
        if (controls) {
          controls.target.copy(lookAtPoint);
        }
      }
    } else {
      if (!isReturning) {
        if (initialCameraPos.current) {
          camera.position.copy(initialCameraPos.current);
          if (controls && initialCameraTarget.current) {
            controls.target.copy(initialCameraTarget.current);
          }
          initialCameraPos.current = null;
          initialCameraTarget.current = null;
        }
      }
    }
  }, [isTouring, camera, points, totalLength, getPointAtDistance, controlsRef]);

  useFrame((state, delta) => {
    const controls = controlsRef.current;

    if (isReturning) {
      if (initialCameraPos.current && initialCameraTarget.current && controls) {
        camera.position.lerp(initialCameraPos.current, 0.05);

        const newTarget = controls.target
          .clone()
          .lerp(initialCameraTarget.current, 0.05);
        controls.target.copy(newTarget);

        camera.lookAt(newTarget);

        if (camera.position.distanceTo(initialCameraPos.current) < 0.1) {
          camera.position.copy(initialCameraPos.current);
          controls.target.copy(initialCameraTarget.current);
          camera.lookAt(initialCameraTarget.current);
          initialCameraPos.current = null;
          initialCameraTarget.current = null;
          setIsReturning(false);
          onTourComplete();
        }
      } else {
        setIsReturning(false);
        onTourComplete();
      }
      return;
    }

    if (!isTouring || points.length < 2 || totalLength === 0 || !controls) {
      return;
    }

    const cameraHeight = 0.25;
    const cameraOffset = 0.45;

    const tourDuration = 30;
    progress.current += delta / tourDuration;

    if (progress.current >= 1) {
      progress.current = 1;
      setIsReturning(true);
      return;
    }
    const t = progress.current;

    const currentDistance = t * totalLength;
    const currentPathPoint = getPointAtDistance(currentDistance);

    const lookAheadDistance = Math.min(currentDistance + 0.1, totalLength);
    const lookAtPoint = getPointAtDistance(lookAheadDistance);

    const dir = new THREE.Vector3()
      .subVectors(lookAtPoint, currentPathPoint)
      .normalize();
    const camPos = currentPathPoint.clone();
    if (dir.length() > 0.0001) {
      camPos.add(dir.multiplyScalar(-cameraOffset));
    }
    camPos.y += cameraHeight;

    camera.position.copy(camPos);
    camera.lookAt(lookAtPoint);

    controls.target.copy(lookAtPoint);
  });

  return null;
}

const getBounds = (points: { x: number; y: number; z: number }[]) => {
  if (points.length === 0) return { min: { x: 0, z: 0 }, max: { x: 0, z: 0 } };
  let minX = points[0].x,
    maxX = points[0].x,
    minZ = points[0].z,
    maxZ = points[0].z;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }
  return { min: { x: minX, z: minZ }, max: { x: maxX, z: maxZ } };
};

const normalize = (
  val: number,
  min: number,
  max: number,
  newMin: number,
  newMax: number
) => {
  return ((val - min) * (newMax - newMin)) / (max - min || 1) + newMin;
};

const getPathBounds = (points: Waypoint[]): L.LatLngBounds | null => {
  if (!points || points.length === 0) return null;
  const latLngs = points.map((p) => [p.lat, p.lng] as L.LatLngExpression);
  return L.latLngBounds(latLngs);
};

function Plane({ bounds }: PlaneProps) {
  const mapUrl = useMemo(() => {
    if (!bounds) {
      return "/api/get-map-image";
    }
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const minLng = sw.lng.toFixed(6);
    const minLat = sw.lat.toFixed(6);
    const maxLng = ne.lng.toFixed(6);
    const maxLat = ne.lat.toFixed(6);
    return `/api/get-map-image?bbox=${minLng},${minLat},${maxLng},${maxLat}`;
  }, [bounds]);

  const mapTexture = useTexture(mapUrl);
  mapTexture.wrapS = mapTexture.wrapT = THREE.RepeatWrapping;
  mapTexture.repeat.set(1, 1);

  const mapRadius = 0.8;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      {/* 2. We use CircleGeometry which maps the texture correctly */}
      <circleGeometry args={[mapRadius, 64]} />

      <meshBasicMaterial map={mapTexture} toneMapped={false} />
    </mesh>
  );
}

function NormalizedPath({ points }: { points: THREE.Vector3[] }) {
  if (points.length < 2) return null;
  return <Line points={points} color={"#00ffff"} lineWidth={3} />;
}

export default function Scene3D({
  points,
  isTouring,
  onTourComplete,
  isAutoRotating,
  onInteracted,
}: Scene3DProps) {
  const pathData = useMemo((): PathData => {
    const pathPoints = points.map((p) => ({ x: p.lng, y: 0, z: -p.lat }));

    if (!pathPoints || pathPoints.length === 0) {
      return { points: [], cumulativeLengths: [], totalLength: 0 };
    }

    const bounds = getBounds(pathPoints);
    const size = {
      x: bounds.max.x - bounds.min.x,
      z: bounds.max.z - bounds.min.z,
    };
    const center = {
      x: bounds.min.x + size.x / 2,
      z: bounds.min.z + size.z / 2,
    };
    const maxDim = Math.max(size.x || 1, size.z || 1);

    const normPoints = pathPoints.map((p) => {
      const nx = normalize(
        p.x,
        center.x - maxDim / 2,
        center.x + maxDim / 2,
        -0.5,
        0.5
      );
      const nz = normalize(
        p.z,
        center.z - maxDim / 2,
        center.z + maxDim / 2,
        -0.5,
        0.5
      );
      return new THREE.Vector3(nx, p.y, nz);
    });

    const cumulativeLengths: number[] = [0];
    let totalLength = 0;
    for (let i = 1; i < normPoints.length; i++) {
      const dist = normPoints[i].distanceTo(normPoints[i - 1]);
      totalLength += dist;
      cumulativeLengths.push(totalLength);
    }

    return {
      points: normPoints,
      cumulativeLengths: cumulativeLengths,
      totalLength: totalLength,
    };
  }, [points]);

  const pathBounds = useMemo(() => getPathBounds(points), [points]);

  const controlsRef = useRef<any>(null);

  return (
    <Canvas
      camera={{ position: [0, 1.5, 1.5], fov: 50 }}
      style={{ background: "#111827" }}
    >
      <Suspense fallback={null}>
        <NormalizedPath points={pathData.points} />
        <Plane bounds={pathBounds} />
        <ambientLight intensity={1.2} />
        <pointLight position={[10, 10, 10]} />
        <OrbitControls
          ref={controlsRef}
          enableZoom
          enablePan
          maxPolarAngle={Math.PI / 2.1}
          enabled={!isTouring}
          autoRotate={isAutoRotating}
          autoRotateSpeed={2.0}
          onStart={onInteracted}
        />
        <CameraRig
          pathData={pathData}
          isTouring={isTouring}
          onTourComplete={onTourComplete}
          controlsRef={controlsRef}
        />
      </Suspense>
    </Canvas>
  );
}
