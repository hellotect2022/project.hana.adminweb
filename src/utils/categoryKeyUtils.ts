/**
 * @param {{ categoryCode?: string; categoryName?: string } | null | undefined} cat
 */
export function resolveCategoryCode(cat) {
  if (!cat) return "";
  if (cat.categoryCode?.trim()) return cat.categoryCode.trim();
  return (cat.categoryName ?? "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_가-힣-]/g, "");
}

/**
 * 대·중·소 categoryCode 조합 (예: 전기설비_전력제어_SUBE)
 * @param {{ categoryCode?: string; categoryName?: string } | null} major
 * @param {{ categoryCode?: string; categoryName?: string } | null} mid
 * @param {{ categoryCode?: string; categoryName?: string } | null} small
 */
export function buildCategoryCodePath(major, mid, small) {
  const majorCode = resolveCategoryCode(major);
  const midCode = resolveCategoryCode(mid);
  const smallCode = resolveCategoryCode(small);
  if (!majorCode || !midCode || !smallCode) return "";
  return `${majorCode}_${midCode}_${smallCode}`;
}

/** 3D Asset asset_name — categoryCode 조합, 소문자 */
export function buildAssetNameFromCategories(major, mid, small) {
  return buildCategoryCodePath(major, mid, small).toLowerCase();
}

/**
 * 대·중·소 categoryCode + deviceName 으로 deviceKey 생성
 * 형식: {대}_{중}_{소}_{deviceName}
 */
export function buildDeviceKey(major, mid, small, deviceName) {
  const prefix = buildCategoryCodePath(major, mid, small);
  const name = deviceName?.trim() ?? "";
  if (!prefix || !name) return "";
  return `${prefix}_${name}`;
}

/** point_key: {deviceKey}_{schemaTagName} */
export function buildPointKey(deviceKey, schemaTagName) {
  const key = deviceKey?.trim() ?? "";
  const tag = schemaTagName?.trim() ?? "";
  if (!key || !tag) return "";
  return `${key}_${tag}`;
}
