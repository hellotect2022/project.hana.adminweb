import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { SceneManifest, MaterialMap } from './lib/manifest';
import { fetchAllDevices, fetchLocationInfo, saveDevicePlacement, patchDeviceActive } from '@/services/deviceService';
import type { DevicePlacementRequest } from '@/types/device';
import { flattenZones, type ZoneMap } from './lib/zone';

const getJson = <T,>(url: string) => fetch(url).then((r) => r.json() as Promise<T>);

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

// 장비 활성/비활성 토글 (PATCH) → DB active 저장 + 목록 갱신(비활성 시 3D 숨김).
export function useSetActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deviceId, active }: { deviceId: number; active: boolean }) => patchDeviceActive(deviceId, active),
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

export const useMaterialMap = () =>
  useQuery<MaterialMap>({ queryKey: ['material-map'], queryFn: () => getJson('/manifest/material-map.json'), staleTime: Infinity });
