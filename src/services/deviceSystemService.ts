import privateApi from "./api";

/**
 * @typedef {{
 *   categoryId: number;
 *   categoryName: string;
 *   categoryCode?: string;
 * }} DeviceSystemCategoryBrief
 */

/**
 * @typedef {{
 *   systemId: number;
 *   systemName: string;
 *   systemCode: string;
 *   sortOrder: number;
 *   active?: boolean;
 *   categoryIds: number[];
 *   categories?: DeviceSystemCategoryBrief[];
 * }} DeviceSystemRow
 */

/**
 * @typedef {{
 *   systemName: string;
 *   systemCode: string;
 *   sortOrder: number;
 *   categoryIds?: number[];
 * }} DeviceSystemCreateRequest
 */

export const DEVICE_SYSTEM_ALL_QUERY_KEY = ["device-system", "all"];

/**
 * GET /api/device-system/all
 * @returns {Promise<DeviceSystemRow[]>}
 */
export async function fetchAllDeviceSystems() {
  const {
    data: { data: results },
  } = await privateApi.get("/device-system/all");
  if (!Array.isArray(results)) return [];
  return results.map((s) => ({
    systemId: s.systemId,
    systemName: s.systemName,
    systemCode: s.systemCode,
    sortOrder: s.sortOrder,
    active: s.active,
    categoryIds: s.categoryIds ?? [],
    categories: s.categories ?? [],
  }));
}

/**
 * POST /api/device-system
 * @param {DeviceSystemCreateRequest} body
 */
export async function createDeviceSystem(body) {
  const { data } = await privateApi.post("/device-system", body);
  return data;
}

/**
 * PUT /api/device-system/{systemId}
 * @param {number} systemId
 * @param {{ systemName: string; systemCode: string; categoryIds?: number[]; active?: boolean }} body
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
