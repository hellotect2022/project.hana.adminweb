/** @typedef {{ majorId: string; midId: string; smallId: string; deviceId: string }} DeviceHierarchyFilterValue */

export const EMPTY_HIERARCHY_FILTER = /** @type {DeviceHierarchyFilterValue} */ ({
  majorId: "",
  midId: "",
  smallId: "",
  deviceId: "",
});

/**
 * 적용 필터에서 API categoryId 파라미터 결정 (장비 선택 시에는 deviceId만 사용)
 * @param {DeviceHierarchyFilterValue} filter
 * @returns {number | undefined}
 */
export function resolveHierarchyCategoryId(filter) {
  if (filter.deviceId) return undefined;
  if (filter.smallId) return Number(filter.smallId);
  if (filter.midId) return Number(filter.midId);
  if (filter.majorId) return Number(filter.majorId);
  return undefined;
}

/**
 * @param {DeviceHierarchyFilterValue} filter
 * @returns {number | undefined}
 */
export function resolveHierarchyDeviceId(filter) {
  return filter.deviceId ? Number(filter.deviceId) : undefined;
}

/**
 * @param {DeviceHierarchyFilterValue} filter
 */
export function hasHierarchyFilter(filter) {
  return Boolean(filter.majorId || filter.midId || filter.smallId || filter.deviceId);
}
