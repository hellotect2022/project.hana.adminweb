import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SceneManifest, MaterialMap, TestManifest, FloorEntry } from './lib/manifest';
import { fetchAllDevices, fetchLocationInfo, saveDevicePlacement, patchDeviceActiveBulk } from './data/deviceService';
import type { BulkActiveRequest } from './data/deviceService';
import type { DevicePlacementRequest } from './data/types';
import { flattenZones, type ZoneMap } from './lib/zone';
import { assetUrl } from './lib/asset';

// url 은 public 정적 경로(/manifest/...). 배포 base(VITE_BASE) 를 반영해 fetch.
const getJson = <T,>(url: string) => fetch(assetUrl(url)).then((r) => r.json() as Promise<T>);

// public/models 에 실제로 존재하는 glb 만 통과시킨다.
// dev 서버는 없는 파일에 404 대신 index.html(HTML, 200)을 돌려주므로
// 상태 코드뿐 아니라 content-type 이 HTML 이 아닌지까지 확인한다.
async function glbExists(glb: string): Promise<boolean> {
  try {
    const res = await fetch(assetUrl(`/models/${glb}`), { method: 'HEAD' });
    const ct = res.headers.get('content-type') ?? '';
    return res.ok && !ct.includes('text/html');
  } catch {
    return false;
  }
}

// 매니페스트 floors 중 파일이 실제 존재하는 항목만 반환. 검사 전엔 null.
export function useExistingFloors(floors: FloorEntry[] | undefined): FloorEntry[] | null {
  const [existing, setExisting] = useState<FloorEntry[] | null>(null);
  useEffect(() => {
    if (!floors) { setExisting(null); return; }
    let cancelled = false;
    Promise.all(floors.map(async (f) => ((await glbExists(f.glb)) ? f : null))).then((arr) => {
      if (!cancelled) setExisting(arr.filter((f): f is FloorEntry => f !== null));
    });
    return () => { cancelled = true; };
  }, [floors]);
  return existing;
}

// 전체 장비(페이지 순회). 3D Devices 와 사이드바가 공유(캐시).
export const useAllDevices = () =>
  useQuery({ queryKey: ['devices', 'all'], queryFn: fetchAllDevices, staleTime: 30_000 });

// zone 매핑(zoneMeshName↔zoneId). 라이브 location-info → 실패 시 정적 zone-map.json.
export const useZoneMap = () =>
  useQuery<ZoneMap>({
    queryKey: ['zone-map'],
    staleTime: Infinity,
    queryFn: async () => {
      try {
        const tree = await fetchLocationInfo();
        const m = flattenZones(tree);
        if (Object.keys(m).length) return m;
      } catch { /* fallback below */ }
      const j = await getJson<{ byMesh: ZoneMap }>('/manifest/zone-map.json');
      return j.byMesh ?? {};
    },
  });

// 장비 활성/비활성 일괄 처리 (PATCH /device/active) → DB active 저장 + 목록 갱신(비활성 시 3D 숨김).
// 전체(ALL)/카테고리(CATEGORY)/개별(DEVICES) 모두 이 훅으로 통일. data = updatedCount.
export function useSetActiveBulk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BulkActiveRequest) => patchDeviceActiveBulk(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices', 'all'] }),
  });
}

// 개별 토글 호환 훅 — 내부적으로 bulk(scope=DEVICES,[id])로 처리. 캐시 무효화 동일.
export function useSetActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deviceId, active }: { deviceId: number; active: boolean }) =>
      patchDeviceActiveBulk({ scope: 'DEVICES', deviceIds: [deviceId], active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices', 'all'] }),
  });
}

// 여러 장비 배치를 일괄 저장(순차 PUT). 편집 모드 배치 커밋용.
export function useSaveAll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bodies: DevicePlacementRequest[]) => {
      const out = [];
      for (const b of bodies) out.push(await saveDevicePlacement(b));
      return out;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices', 'all'] }),
  });
}

export const useSceneManifest = () =>
  useQuery<SceneManifest>({ queryKey: ['scene-manifest'], queryFn: () => getJson('/manifest/scene-manifest.json'), staleTime: Infinity });

export const useTestManifest = () =>
  useQuery<TestManifest>({ queryKey: ['test-manifest'], queryFn: () => getJson('/manifest/test-manifest.json'), staleTime: Infinity });

export const useMaterialMap = () =>
  useQuery<MaterialMap>({ queryKey: ['material-map'], queryFn: () => getJson('/manifest/material-map.json'), staleTime: Infinity });
