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

/**
 * deviceId 로부터 대/중/소 cascade 초깃값을 역산한다.
 * 장비의 categoryId(=소분류)에서 flat 카테고리 트리를 거슬러 중분류·대분류를 찾는다.
 * 카테고리 트리를 아직 못 구했거나 매칭 실패 시 deviceId 만 채운 값을 반환한다(선택 유지).
 * @param {number | string | null | undefined} deviceId
 * @param {Array<{ deviceId: number; categoryId: number | null }>} devices
 * @param {Array<{ categoryId: number; parentId: number | null }>} flatCategories
 * @returns {DeviceHierarchyFilterValue}
 */
export function deriveHierarchyFilterFromDevice(deviceId, devices, flatCategories) {
  if (deviceId == null || deviceId === "") return { ...EMPTY_HIERARCHY_FILTER };
  const device = (devices ?? []).find((d) => String(d.deviceId) === String(deviceId));
  const smallId = device?.categoryId;
  if (smallId == null) {
    return { ...EMPTY_HIERARCHY_FILTER, deviceId: String(deviceId) };
  }
  const cats = flatCategories ?? [];
  const findCat = (id) => cats.find((c) => c.categoryId === Number(id));
  const small = findCat(smallId);
  const mid = small?.parentId != null ? findCat(small.parentId) : undefined;
  const major = mid?.parentId != null ? findCat(mid.parentId) : undefined;
  return {
    majorId: major ? String(major.categoryId) : "",
    midId: mid ? String(mid.categoryId) : "",
    smallId: String(smallId),
    deviceId: String(deviceId),
  };
}

/**
 * categoryId(소/중/대 어느 depth든)로부터 대>중>소 cascade 초깃값을 역산한다.
 * 부모를 따라 올라가며 depth 를 판정한다(장비 미선택 → deviceId "").
 * @param {number | string | null | undefined} categoryId
 * @param {Array<{ categoryId: number; parentId: number | null }>} flatCategories
 * @returns {DeviceHierarchyFilterValue}
 */
export function deriveHierarchyFilterFromCategory(categoryId, flatCategories) {
  if (categoryId == null || categoryId === "") return { ...EMPTY_HIERARCHY_FILTER };
  const cats = flatCategories ?? [];
  const findCat = (id) => cats.find((c) => c.categoryId === Number(id));
  const cat = findCat(categoryId);
  if (!cat) {
    return { ...EMPTY_HIERARCHY_FILTER, smallId: String(categoryId) };
  }
  const parent = cat.parentId != null ? findCat(cat.parentId) : undefined;
  const grand = parent?.parentId != null ? findCat(parent.parentId) : undefined;
  if (grand) {
    // cat = 소, parent = 중, grand = 대
    return {
      majorId: String(grand.categoryId),
      midId: String(parent.categoryId),
      smallId: String(cat.categoryId),
      deviceId: "",
    };
  }
  if (parent) {
    // cat = 중, parent = 대 (소 미선택)
    return {
      majorId: String(parent.categoryId),
      midId: String(cat.categoryId),
      smallId: "",
      deviceId: "",
    };
  }
  // cat = 대
  return { majorId: String(cat.categoryId), midId: "", smallId: "", deviceId: "" };
}
