import privateApi from "./api";

/**
 * @typedef {{
 *   categoryId: number;
 *   categoryName: string;
 *   categoryCode?: string;
 * }} DeviceSystemCategoryBrief
 */

/**
 * 서브시스템(subSystem) — 시스템 하위, 소분류 카테고리 매핑을 소유
 * @typedef {{
 *   subSystemId: number;
 *   subSystemName: string;
 *   sortOrder: number;
 *   active?: boolean;
 *   categories: DeviceSystemCategoryBrief[];
 *   categoryIds: number[];
 * }} SubSystemRow
 */

/**
 * 하이브리드 구조:
 *  - subSystems[]           : 3단(시스템 → 서브시스템 → 소분류) 매핑
 *  - categories[]           : 2단(시스템 → 소분류 직접) 매핑 전용
 *  - categoryIds[]          : categories 에서 파생(직접 매핑 초깃값용)
 * @typedef {{
 *   systemId: number;
 *   systemName: string;
 *   systemCode: string;
 *   sortOrder: number;
 *   active?: boolean;
 *   subSystems: SubSystemRow[];
 *   categories: DeviceSystemCategoryBrief[];
 *   categoryIds: number[];
 * }} DeviceSystemRow
 */

/**
 * @typedef {{
 *   systemName: string;
 *   systemCode: string;
 *   sortOrder: number;
 *   active?: boolean;
 *   categoryIds?: number[];
 * }} DeviceSystemCreateRequest
 */

export const DEVICE_SYSTEM_ALL_QUERY_KEY = ["device-system", "all"];
export const SUB_SYSTEM_QUERY_KEY = (systemId) => [
  "device-system",
  "sub-systems",
  systemId,
];

/**
 * 백엔드 서브시스템 응답 → SubSystemRow 정규화(categoryIds 파생)
 */
function normalizeSubSystem(s) {
  const categories = s.categories ?? [];
  const categoryIds = categories
    .map((c) => c.categoryId)
    .filter((id) => id != null);
  return {
    subSystemId: s.subSystemId,
    subSystemName: s.subSystemName,
    sortOrder: s.sortOrder,
    active: s.active,
    categories,
    categoryIds,
  };
}

/**
 * GET /api/device-system/all
 * 응답 3단 중첩: system → subSystems → categories
 * @returns {Promise<DeviceSystemRow[]>}
 */
export async function fetchAllDeviceSystems() {
  const {
    data: { data: results },
  } = await privateApi.get("/device-system/all");
  if (!Array.isArray(results)) return [];
  return results.map((s) => {
    // categories[] 는 이제 "직접 매핑 전용"(subSystem 밑 카테고리는 subSystems[].categories 에만)
    const categories = Array.isArray(s.categories) ? s.categories : [];
    const categoryIds = categories
      .map((c) => c.categoryId)
      .filter((id) => id != null);
    return {
      systemId: s.systemId,
      systemName: s.systemName,
      systemCode: s.systemCode,
      sortOrder: s.sortOrder,
      active: s.active,
      subSystems: Array.isArray(s.subSystems)
        ? s.subSystems.map(normalizeSubSystem)
        : [],
      categories,
      categoryIds,
    };
  });
}

/**
 * POST /api/device-system
 * body.categoryIds(옵션): 시스템에 소분류를 "직접"(2단, subSystem 없이) 매핑.
 * @param {DeviceSystemCreateRequest} body
 */
export async function createDeviceSystem(body) {
  const { data } = await privateApi.post("/device-system", body);
  return data;
}

/**
 * PUT /api/device-system/{systemId}
 * body.categoryIds(옵션): 시스템 직접 매핑 소분류(2단). subSystem 밑 매핑은 서버가 건드리지 않음.
 * @param {number} systemId
 * @param {{ systemName: string; systemCode: string; sortOrder?: number; active?: boolean; categoryIds?: number[] }} body
 */
export async function updateDeviceSystem(systemId, body) {
  const { data } = await privateApi.put(`/device-system/${systemId}`, body);
  return data;
}

/**
 * DELETE /api/device-system/{systemId}
 * @param {number} systemId
 */
export async function deleteDeviceSystem(systemId) {
  const { data } = await privateApi.delete(`/device-system/${systemId}`);
  return data;
}

/**
 * PUT /api/device-system/sort-orders
 * @param {{ systemId: number; sortOrder: number }[]} items
 */
export async function updateDeviceSystemSortOrders(items) {
  const { data } = await privateApi.put("/device-system/sort-orders", items);
  return data;
}

/* ------------------------------------------------------------------ */
/* 서브시스템(subSystem) CRUD — /api/device-system/sub-systems          */
/* ------------------------------------------------------------------ */

/**
 * GET /api/device-system/sub-systems?systemId=
 * @param {number} systemId
 * @returns {Promise<SubSystemRow[]>}
 */
export async function fetchSubSystems(systemId) {
  const {
    data: { data: results },
  } = await privateApi.get("/device-system/sub-systems", {
    params: { systemId },
  });
  if (!Array.isArray(results)) return [];
  return results.map(normalizeSubSystem);
}

/**
 * POST /api/device-system/sub-systems
 * @param {{ systemId: number; subSystemName: string; sortOrder: number; active?: boolean; categoryIds: number[] }} body
 */
export async function createSubSystem(body) {
  const { data } = await privateApi.post("/device-system/sub-systems", body);
  return data;
}

/**
 * PUT /api/device-system/sub-systems/{subSystemId}
 * @param {number} subSystemId
 * @param {{ subSystemName: string; sortOrder?: number; active?: boolean; categoryIds: number[] }} body
 */
export async function updateSubSystem(subSystemId, body) {
  const { data } = await privateApi.put(
    `/device-system/sub-systems/${subSystemId}`,
    body
  );
  return data;
}

/**
 * PUT /api/device-system/sub-systems/sort-orders
 * @param {{ subSystemId: number; sortOrder: number }[]} items
 */
export async function updateSubSystemSortOrders(items) {
  const { data } = await privateApi.put(
    "/device-system/sub-systems/sort-orders",
    items
  );
  return data;
}

/**
 * DELETE /api/device-system/sub-systems/{subSystemId}
 * @param {number} subSystemId
 */
export async function deleteSubSystem(subSystemId) {
  const { data } = await privateApi.delete(
    `/device-system/sub-systems/${subSystemId}`
  );
  return data;
}

/* ------------------------------------------------------------------ */
/* 시스템/서브시스템 소속 장비 조회 — /api/device/device-system/devices  */
/* ------------------------------------------------------------------ */

/**
 * GET /api/device/device-system/devices
 * 하이브리드 조회: subSystemId(3단) 또는 systemId(직접 2단) 중 하나만 전달.
 * @param {{ subSystemId?: number; systemId?: number }} params
 * @returns {Promise<any[]>}
 */
export async function fetchDeviceSystemDevices(args: any = {}) {
  const { subSystemId, systemId } = args;
  const params: Record<string, number> = {};
  if (subSystemId != null) params.subSystemId = subSystemId;
  else if (systemId != null) params.systemId = systemId;
  const {
    data: { data: results },
  } = await privateApi.get("/device/device-system/devices", { params });
  return Array.isArray(results) ? results : [];
}
