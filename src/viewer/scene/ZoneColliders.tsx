import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useGLTF, Html } from '@react-three/drei';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { flipPos } from '../lib/coords';
import { floorKeyOf } from '../lib/manifest';
import { assetUrl } from '../lib/asset';
import type { FloorEntry } from '../lib/manifest';
import type { ZoneMap } from '../lib/zone';
import { useSceneManifest, useZoneMap } from '../hooks';
import { registerCollider, unregisterCollider, floorLevels } from '../state/registry';
import { useViewerStore, isFloorVisible } from '../state/viewerStore';
import { DeviceErrorBoundary } from './DeviceErrorBoundary';

// zone별 고유 색 (zoneId 해시 → HSL). 캐시.
const zoneMatCache = new Map<number, THREE.Material>();
function zoneMat(zoneId: number): THREE.Material {
  let m = zoneMatCache.get(zoneId);
  if (!m) {
    const hue = ((zoneId * 47) % 360) / 360;
    const col = new THREE.Color().setHSL(hue, 0.7, 0.55);
    m = new THREE.MeshBasicMaterial({ color: col, wireframe: true, transparent: true, opacity: 0.7, depthTest: false });
    zoneMatCache.set(zoneId, m);
  }
  return m;
}
const HIDDEN_MAT = new THREE.MeshBasicMaterial({ visible: false }); // zone 아닌 메쉬(층 평면 등)

interface ZoneLabel { zoneId: number; zoneName: string; floorName?: string; pos: [number, number, number] }

function ZoneFloor({ floorKey, entry, zoneByMesh }: { floorKey: string; entry: FloorEntry; zoneByMesh: ZoneMap }) {
  const gltf = useGLTF(assetUrl(`/models/colliders/collider_${floorKey}.glb`), true);
  const showColliders = useViewerStore((s) => s.showColliders);
  const selectedFloors = useViewerStore((s) => s.selectedFloors);
  const zoneMeshes = useRef<THREE.Mesh[]>([]);
  const [labels, setLabels] = useState<ZoneLabel[]>([]);

  const obj = useMemo(() => {
    const c = clone(gltf.scene);
    const list: THREE.Mesh[] = [];
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.userData.floorKey = floorKey;
      m.userData.isCollider = true;
      const info = zoneByMesh[(m.name || '').toLowerCase()];
      if (info) { m.material = zoneMat(info.zoneId); list.push(m); }
      else m.material = HIDDEN_MAT;
    });
    zoneMeshes.current = list;
    return c;
  }, [gltf.scene, zoneByMesh, floorKey]);

  useEffect(() => {
    const ms = zoneMeshes.current;
    ms.forEach(registerCollider);
    return () => ms.forEach(unregisterCollider);
  }, [obj]);

  const visible = showColliders && isFloorVisible(selectedFloors, floorKey);

  // 라벨(zone 중심, 월드좌표) — 콜라이더 표시될 때 계산(이때 matrixWorld 준비됨)
  useEffect(() => {
    if (!visible) return;
    const ls: ZoneLabel[] = zoneMeshes.current.map((m) => {
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      const c = m.geometry.boundingBox!.getCenter(new THREE.Vector3());
      m.updateWorldMatrix(true, false);
      m.localToWorld(c);
      const info = zoneByMesh[(m.name || '').toLowerCase()]!;
      return { zoneId: info.zoneId, zoneName: info.zoneName, floorName: info.floorName, pos: [c.x, c.y, c.z] };
    });
    setLabels(ls);
  }, [obj, zoneByMesh, visible]);

  const pos = flipPos(entry.position);
  return (
    <>
      <group position={pos} scale={entry.scale} visible={visible}>
        <primitive object={obj} />
      </group>
      {visible && labels.map((l) => (
        <Html key={l.zoneId} position={l.pos} center distanceFactor={50} zIndexRange={[50, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{
            whiteSpace: 'nowrap', textAlign: 'center', padding: '1px 6px', borderRadius: 4,
            font: '700 11px system-ui, sans-serif', color: '#fff', textShadow: '0 1px 2px #000',
            background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.25)',
          }}>
            {l.floorName} {l.zoneName}<br />#{l.zoneId}
          </div>
        </Html>
      ))}
    </>
  );
}

export function ZoneColliders() {
  const { data: manifest } = useSceneManifest();
  const { data: zoneByMesh } = useZoneMap();

  // 층 높이 테이블(floorKey → 바닥 Y) 채움 — resolveZoneAt 가 장비 Y로 층 판정에 사용.
  useEffect(() => {
    if (!manifest) return;
    floorLevels.clear();
    for (const f of manifest.floors) {
      const k = floorKeyOf(f.name);
      if (/_in$/.test(f.name) && !floorLevels.has(k)) floorLevels.set(k, f.position[1]);
    }
  }, [manifest]);

  if (!manifest || !zoneByMesh) return null;

  const inByKey = new Map<string, FloorEntry>();
  for (const f of manifest.floors) {
    const k = floorKeyOf(f.name);
    if (/_in$/.test(f.name) && !inByKey.has(k)) inByKey.set(k, f);
  }
  const keys = [...inByKey.keys()].filter((k) => /^b?\d+f$/.test(k));

  return (
    <group>
      {keys.map((k) => (
        <Suspense key={k} fallback={null}>
          <DeviceErrorBoundary fallback={null}>
            <ZoneFloor floorKey={k} entry={inByKey.get(k)!} zoneByMesh={zoneByMesh} />
          </DeviceErrorBoundary>
        </Suspense>
      ))}
    </group>
  );
}
