import * as THREE from 'three';
import { colliderMeshes, floorLevels } from '../state/registry';

export interface ZoneInfo { zoneId: number; zoneName: string; floorName?: string; floorNum?: number }
export type ZoneMap = Record<string, ZoneInfo>; // meshName(lower) → zone

const _ray = new THREE.Raycaster();

// 장비 Y로 "몇 층"인지 결정: 장비 바로 아래(또는 거의 같은 높이)의 가장 높은 층.
// (장비는 그 층 바닥에 올라가므로 floorY ≤ 장비Y. 모든 층보다 아래면 최하층.)
export function floorKeyForY(y: number): string | null {
  let best: string | null = null, bestLevel = -Infinity;
  let lowest: string | null = null, lowestLevel = Infinity;
  for (const [k, lvl] of floorLevels) {
    if (lvl < lowestLevel) { lowestLevel = lvl; lowest = k; }
    if (lvl <= y + 2 && lvl > bestLevel) { bestLevel = lvl; best = k; }
  }
  return best ?? lowest;
}

// zone 판정: ① 장비 Y로 층 결정 → ② 그 층 콜라이더에서만 (x,z) 수직 레이로 방(zone) 찾기.
// 그 층에 방이 없으면 윗층으로 새지 않고 null(영역 밖). 위아래로 옮기면 층도 자동 재판정.
export function resolveZoneAt(
  world: THREE.Vector3,
  zoneByMesh: ZoneMap,
): (ZoneInfo & { meshName: string }) | null {
  const fk = floorKeyForY(world.y);
  if (!fk) return null;
  const cands = colliderMeshes.filter((m) => m.userData.floorKey === fk);
  if (!cands.length) return null;
  _ray.set(new THREE.Vector3(world.x, world.y + 200, world.z), new THREE.Vector3(0, -1, 0));
  _ray.far = 4000;
  const hit = _ray.intersectObjects(cands, false)[0];
  if (!hit) return null;
  const z = zoneByMesh[(hit.object.name || '').toLowerCase()];
  return z ? { ...z, meshName: hit.object.name } : null;
}

export function flattenZones(tree: unknown): ZoneMap {
  const m: ZoneMap = {};
  const buildings = (tree as { floorList?: unknown }[]) ?? [];
  for (const b of buildings as Array<{ floorList?: Array<{ floorName: string; floorNum: number; zoneList?: Array<{ zoneId: number; zoneName: string; zoneMeshName?: string | null }> }> }>) {
    for (const f of b.floorList ?? []) {
      for (const z of f.zoneList ?? []) {
        if (z.zoneMeshName) m[z.zoneMeshName.toLowerCase()] = { zoneId: z.zoneId, zoneName: z.zoneName, floorName: f.floorName, floorNum: f.floorNum };
      }
    }
  }
  return m;
}
