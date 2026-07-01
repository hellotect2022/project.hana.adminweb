import privateApi from "./api";

/**
 * @typedef {{
 *   categoryId: number;
 *   parentId: number | null;
 *   depth: number;
 *   categoryName: string;
 *   categoryNameEn?: string | null;
 *   categoryCode: string;
 *   description?: string | null;
 *   displayOrder?: number;
 *   active?: boolean;
 *   fullPath: string;
 *   isRoot?: boolean;
 *   isLeaf?: boolean;
 *   schemaDefinitions?: Array<object>;
 *   children?: DeviceCategoryNode[];
 * }} DeviceCategoryNode
 */

/**
 * 장비 카테고리 트리 응답 (서버 래퍼)
 * @typedef {{
 *   success: boolean;
 *   message: string;
 *   data: DeviceCategoryNode[];
 *   errorCode: string | null;
 * }} DeviceCategoryListResponse
 */

/**
 * @typedef {{
 *   categoryId: number;
 *   parentId: number | null;
 *   categoryName: string;
 *   categoryNameEn?: string | null;
 *   categoryCode: string;
 *   fullPath: string;
 *   depth: number;
 *   displayOrder: number;
 *   active: boolean;
 *   isLeaf: boolean;
 *   schemaDefinitions: Array<object>;
 * }} DeviceCategoryFlat
 */

/**
 * @typedef {{
 *   deviceId: number;
 *   deviceName: string;
 *   description: string | null;
 *   active: boolean;
 *   categoryId: number | null;
 *   categoryName: string | null;
 *   categoryPath: string | null;
 *   assetId: number | null;
 *   assetName: string | null;
 *   transform: object | null;
 *   location: object | null;
 *   createdAt: string;
 *   updatedAt: string;
 *   set: boolean;
 * }} DeviceDTO
 */

export const DEVICE_CATEGORY_QUERY_KEY = ["device", "device-categories"];
export const DEVICE_LIST_QUERY_KEY = ["device", "list"];
export const DEVICE_POINT_MAPPING_QUERY_KEY = ["device", "points", "mapping"];

/**
 * GET /device/device-categories — 장비 카테고리 목록(트리)
 */
export async function categoryFetchAPI() {
  const { data } = await privateApi.get("/device/device-categories");
  return data;
}


/**
 * POST /device/device-categories — 카테고리 생성
 * @param {{ categoryName: string; categoryNameEn?: string; categoryCode: string; parentId?: number; description?: string; displayOrder?: number; active?: boolean }} payload
 */
export async function createCategoryAPI(payload) {
  const { data } = await privateApi.post("/device/device-categories", payload);
  return data;
}

/**
 * PUT /device/device-categories/{categoryId} — 카테고리 수정
 * @param {{ categoryId: number; payload: object }} param
 */
export async function updateCategoryAPI({ categoryId, payload }) {
  const { data } = await privateApi.put(`/device/device-categories/${categoryId}`, payload);
  return data;
}

/**
 * DELETE /device/device-categories/{categoryId} — 카테고리 삭제
 * @param {number} categoryId
 */
export async function deleteCategoryAPI(categoryId) {
  const { data } = await privateApi.delete(`/device/device-categories/${categoryId}`);
  return data;
}

/**
 * PUT /device/device-categories/{categoryId}/schema — 스키마 정의 저장
 * @param {{ categoryId: number; schema: Array<{tagName: string; type: string; unit: string; isDisplay: boolean}> }} param
 */
export async function updateCategorySchemaAPI({ categoryId, schema }) {
  const { data } = await privateApi.put(`/device/device-categories/${categoryId}/schema`, schema);
  return data;
}

/**
 * GET /device/all — 장비 목록 (Pageable)
 * @param {{ page?: number; size?: number; keyword?: string; categoryId?: number; sort?: string }} [params]
 * @returns {Promise<{success: boolean; data: { content: DeviceDTO[]; totalElements: number; totalPages: number; number: number; size: number; first: boolean; last: boolean } }>}
 */
export async function fetchDevicesAPI({ page = 0, size = 20, keyword, categoryId, sort }: { page?: number; size?: number; keyword?: string; categoryId?: number; sort?: string } = {}) {
  const { data } = await privateApi.get("/device/all", {
    params: {
      page,
      size,
      ...(keyword ? { keyword } : {}),
      ...(categoryId != null ? { categoryId } : {}),
      ...(sort ? { sort } : {}),
    },
  });
  return data;
}

/**
 * GET /device/{deviceId} — 특정 장비 상세 조회
 * @param {number} deviceId
 * @returns {Promise<{success: boolean; data: DeviceDTO}>}
 */
export async function fetchDeviceByIdAPI(deviceId) {
  const { data } = await privateApi.get(`/device/${deviceId}`);
  return data;
}

/**
 * @typedef {{
 *   tagName: string;
 *   pointKey: string;
 *   schemaTagName?: string;
 *   pointName?: string;
 *   pointType?: string;
 *   unit?: string;
 *   tagDesc?: string;
 *   isDisplay?: boolean;
 * }} DevicePointRegisterItem
 */

/**
 * POST /device — 장비 등록
 * @param {{
 *   deviceName: string;
 *   deviceKey?: string;
 *   description?: string;
 *   categoryId?: number;
 *   assetId?: number | null;
 *   active: boolean;
 *   points?: DevicePointRegisterItem[];
 * }} payload
 */
export async function createDeviceAPI(payload) {
  const { data } = await privateApi.post("/device", payload);
  return data;
}

/**
 * PUT /device/{deviceId} — 장비 수정 (백엔드 구현 필요)
 * @param {{ deviceId: number; payload: object }} param
 */
export async function updateDeviceAPI({ deviceId, payload }) {
  const { data } = await privateApi.put(`/device/${deviceId}`, payload);
  return data;
}

/**
 * PATCH /device/{deviceId} — 장비 기본 정보 부분 수정
 * @param {{ deviceId: number; payload: { deviceName?: string; description?: string; active?: boolean; categoryId?: number | null; assetId?: number | null } }} param
 */
export async function patchDeviceAPI({ deviceId, payload }) {
  const { data } = await privateApi.patch(`/device/${deviceId}`, payload);
  return data;
}

/**
 * DELETE /device/{deviceId} — 장비 삭제 (백엔드 구현 필요)
 * @param {number} deviceId
 */
export async function deleteDeviceAPI(deviceId) {
  const { data } = await privateApi.delete(`/device/${deviceId}`);
  return data;
}

/**
 * GET /device/{deviceId}/points — 장비 논리 포인트 목록 (tbl_device_point)
 * @param {number} deviceId
 * @returns {Promise<{success: boolean; data: DeviceLogicalPointDTO[]}>}
 */
export async function fetchDeviceLogicalPointsAPI(deviceId) {
  const { data } = await privateApi.get(`/device/${deviceId}/points`);
  return data;
}

/**
 * @typedef {{
 *   pointId: number;
 *   pointKey: string;
 *   tagName: string;
 *   pointName: string;
 *   pointType: string | null;
 *   unit: string | null;
 *   active: boolean;
 *   refDeviceCode: string | null;
 *   refPointCode: string | null;
 * }} DeviceLogicalPointDTO
 */

export const deviceLogicalPointsQueryKey = (deviceId) => ["device", "logical-points", deviceId];

/**
 * POST /device/xn/points — SI view 포인트 검색 (매핑 UI용)
 * @param {{ deviceId: number; page?: number; keyword?: string }} param
 * @returns {Promise<{success: boolean; data: Array<{deviceCode, pointCode, pointName, objectType, unit, valueRaw, alarmYn, updateDateTime}>}>}
 */
export async function fetchDevicePointsAPI({ deviceId, page = 0, keyword, priorityCodes }) {
  const { data } = await privateApi.post(`/device/xn/points`, 
    {
      keyword,
      priorityCodes
    },
    {
      params: {
        page
      },
  });
  return data;
}

/**
 * @typedef {{
 *   pointId: number;
 *   deviceId: number;
 *   deviceName: string;
 *   deviceKey: string;
 *   categoryPath: string | null;
 *   pointKey: string;
 *   tagName: string;
 *   pointName: string;
 *   pointType: string | null;
 *   unit: string | null;
 *   active: boolean;
 *   refDeviceCode: string | null;
 *   refPointCode: string | null;
 * }} DevicePointMappingItemDTO
 */

/**
 * @typedef {{
 *   content: DevicePointMappingItemDTO[];
 *   totalElements: number;
 *   totalPages: number;
 *   number: number;
 *   size: number;
 *   first: boolean;
 *   last: boolean;
 *   mappedCount: number;
 * }} DevicePointMappingPageDTO
 */

/**
 * GET /device/points/mapping — 논리 포인트 + SI ref 매핑 목록 (Pageable)
 * @param {{ page?: number; size?: number; deviceId?: number; categoryId?: number; keyword?: string; sort?: string }} [params]
 */
export async function fetchDevicePointsForMappingAPI({
  page = 0,
  size = 50,
  deviceId,
  categoryId,
  keyword,
  unmapped = false,
  sort,
}: { page?: number; size?: number; deviceId?: number; categoryId?: number; keyword?: string; unmapped?: boolean; sort?: string } = {}) {
  const { data } = await privateApi.get("/device/points/mapping", {
    params: {
      page,
      size,
      ...(deviceId != null ? { deviceId } : {}),
      ...(categoryId != null ? { categoryId } : {}),
      ...(keyword ? { keyword } : {}),
      ...(unmapped ? { unmapped: true } : {}),
      ...(sort ? { sort } : {}),
    },
  });
  return data;
}

/**
 * PUT /device/points/ref-mapping — ref_device_code / ref_point_code 일괄 저장
 * @param {Array<{ pointId: number; refDeviceCode?: string | null; refPointCode?: string | null }>} items
 */
export async function saveDevicePointRefMappingAPI(items) {
  const { data } = await privateApi.put("/device/points/ref-mapping", items);
  return data;
}

/** 포인트 매핑 통계 쿼리 키 (categoryId / keyword 를 뒤에 붙여 사용) */
export const POINT_MAPPING_STATS_QUERY_KEY = ["device", "points", "mapping", "stats"];

/**
 * GET /device/points/mapping/stats — 현재 검색 필터 기준 매핑 통계
 * @param {{ categoryId?: number; keyword?: string }} [params]
 * @returns {Promise<{ total: number; mapped: number }>}
 */
export async function fetchPointMappingStatsAPI({
  categoryId,
  keyword,
}: { categoryId?: number; keyword?: string } = {}) {
  const { data } = await privateApi.get("/device/points/mapping/stats", {
    params: {
      ...(categoryId != null ? { categoryId } : {}),
      ...(keyword ? { keyword } : {}),
    },
  });
  return data?.data; // { total, mapped }
}

/**
 * GET /device/points/mapping/template — 현재 필터 기준 업로드용 xlsx 양식(blob)
 * @param {{ categoryId?: number; keyword?: string }} [params]
 * @returns axios response (data: Blob, headers 포함 — 파일명 파싱용)
 */
export async function downloadPointMappingTemplateAPI({
  categoryId,
  keyword,
}: { categoryId?: number; keyword?: string } = {}) {
  const res = await privateApi.get("/device/points/mapping/template", {
    params: {
      ...(categoryId != null ? { categoryId } : {}),
      ...(keyword ? { keyword } : {}),
    },
    responseType: "blob",
  });
  return res;
}

/**
 * POST /device/points/mapping/import — xlsx 업로드로 ref 매핑 일괄 반영
 * @param {File} file
 * @returns {Promise<{ total: number; applied: number; failed: Array<{ row: number; pointKey: string; reason: string }> }>}
 */
export async function importPointMappingAPI(file) {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await privateApi.post("/device/points/mapping/import", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data?.data; // { total, applied, failed[] }
}

/**
 * PUT /device/{deviceId}/points/tag-mapping — tagName 매핑 저장
 * @param {{ deviceId: number; mappings: Array<{tagName: string; pointId: number|null}> }} param
 */
export async function saveTagMappingAPI({ deviceId, mappings }) {
  console.log('mappings',mappings)
  const { data } = await privateApi.put(`/device/${deviceId}/points/tag-mapping`, mappings);
  return data;
}

/** @param {number} deviceId */
export const devicePointsQueryKey = (deviceId) => ["device", "points", deviceId];

/**
 * 중첩 children 트리를 평탄 리스트로 변환 (대·중·소 컬럼 필터용)
 * @param {DeviceCategoryNode[] | undefined | null} nodes
 * @returns {DeviceCategoryFlat[]}
 */
export function flattenDeviceCategoryTree(nodes) {
  /** @type {DeviceCategoryFlat[]} */
  const out = [];
  const walk = (list) => {
    if (!list?.length) return;
    for (const n of list) {
      out.push({
        categoryId: n.categoryId,
        parentId: n.parentId,
        categoryName: n.categoryName,
        categoryNameEn: n.categoryNameEn ?? "",
        categoryCode: n.categoryCode ?? "",
        fullPath: n.fullPath,
        depth: n.depth,
        displayOrder: n.displayOrder ?? 0,
        active: n.active !== false,
        isLeaf: n.isLeaf === true,
        schemaDefinitions: n.schemaDefinitions ?? [],
      });
      if (n.children?.length) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

export function sortByDisplayOrder(a, b) {
  return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
}
