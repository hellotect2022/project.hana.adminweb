import { api } from './api';
import type {
  ApiResponse, Page, DeviceDTO,
  DevicePlacementRequest, DevicePlacementResponse, UnityBuilding,
} from '@/types/device';

// GET /api/device/all — 페이징(Page<DeviceResponse>). data.content 가 배열.
export async function fetchDevicesPage(
  params: { page?: number; size?: number; keyword?: string } = {},
): Promise<Page<DeviceDTO>> {
  const { data } = await api.get<ApiResponse<Page<DeviceDTO>>>('/device/all', {
    params: {
      page: params.page ?? 0,
      size: params.size ?? 20,
      ...(params.keyword ? { keyword: params.keyword } : {}),
    },
  });
  return data.data;
}

// 전체 장비 = 페이지 순회
export async function fetchAllDevices(): Promise<DeviceDTO[]> {
  const all: DeviceDTO[] = [];
  for (let page = 0; page < 100; page++) {
    const p = await fetchDevicesPage({ page, size: 200 });
    all.push(...p.content);
    if (p.last || p.content.length < 200) break;
  }
  return all;
}

// PUT /api/device/placement — 배치 저장
export async function saveDevicePlacement(
  body: DevicePlacementRequest,
): Promise<DevicePlacementResponse> {
  const { data } = await api.put<ApiResponse<DevicePlacementResponse>>('/device/placement', body);
  return data.data;
}

// GET /api/device/location-info — zone 트리(zoneMeshName↔zoneId)
export async function fetchLocationInfo(): Promise<UnityBuilding[]> {
  const { data } = await api.get<ApiResponse<UnityBuilding[]>>('/device/location-info');
  return data.data;
}
