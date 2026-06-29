import privateApi from "./api";

export const UNITY_ZONE_LIST_QUERY_KEY = ["unityZone", "list"];
export const UNITY_FLOOR_OPTION_QUERY_KEY = ["unityZone", "floors"];

/**
 * 콜라이더(존) DTO
 * @typedef {{
 *   zoneId: number;
 *   floorId: number;
 *   floorNum?: number | null;
 *   floorName?: string | null;
 *   zoneName: string;
 *   zoneMeshName: string;
 * }} UnityZoneDTO
 */

/**
 * 층 옵션 DTO
 * @typedef {{ floorId: number; floorNum?: number | null; floorName: string }} FloorOptionDTO
 */

/**
 * GET /unity-zones/floors — 층 선택 옵션
 * @returns {Promise<FloorOptionDTO[]>}
 */
export async function fetchFloorOptions() {
  const { data } = await privateApi.get("/unity-zones/floors");
  if (!data?.success) throw new Error(data?.message || "층 목록 조회 실패");
  return data.data ?? [];
}

/**
 * GET /unity-zones?floorId= — 콜라이더 목록(층별 필터)
 * @param {{ floorId?: number | null }} [params]
 * @returns {Promise<UnityZoneDTO[]>}
 */
export async function fetchZonesList(params = {}) {
  const { data } = await privateApi.get("/unity-zones", {
    params: params.floorId != null ? { floorId: params.floorId } : undefined,
  });
  if (!data?.success) throw new Error(data?.message || "콜라이더 목록 조회 실패");
  return data.data ?? [];
}

/**
 * POST /unity-zones — 콜라이더 등록
 * @param {{ floorId: number; zoneName: string; zoneMeshName: string }} payload
 */
export async function createZoneAPI(payload) {
  const { data } = await privateApi.post("/unity-zones", payload);
  return data;
}

/**
 * PUT /unity-zones/{zoneId} — 콜라이더 수정
 * @param {{ zoneId: number; floorId: number; zoneName: string; zoneMeshName: string }} param
 */
export async function updateZoneAPI({ zoneId, ...payload }) {
  const { data } = await privateApi.put(`/unity-zones/${zoneId}`, payload);
  return data;
}
