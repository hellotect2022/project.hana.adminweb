import { useQuery } from "@tanstack/react-query";
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
 *   propertyType?: string | null;
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
 *   assetId: number | null;
 *   assetName: string | null;
 *   propertyType: string | null;
 *   schemaDefinitions: Array<object>;
 * }} DeviceCategoryFlat
 */

/**
 * @typedef {{
 *   deviceId: number;
 *   deviceName: string;
 *   deviceDisplayName?: string | null;
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
 *   propertyInfo?: Record<string, any> | null;
 *   alarmState?: boolean;
 *   operationState?: "RUNNING" | "STOPPED" | "FAULT" | "UNKNOWN";
 *   connectionState?: "CONNECTED" | "DISCONNECTED" | "UNKNOWN";
 *   commandPoints?: Array<{ commandPointId: number; label: string; tagName: string | null; onValue: string; offValue: string }>;
 * }} DeviceDTO
 */

/** 장비 동작상태 (서버 enum) */
export type OperationState = "RUNNING" | "STOPPED" | "FAULT" | "UNKNOWN";
/** 장비 연결상태 (서버 enum) */
export type ConnectionState = "CONNECTED" | "DISCONNECTED" | "UNKNOWN";

/** 동작상태 라벨 */
export const OPERATION_STATE_LABEL: Record<OperationState, string> = {
  RUNNING: "동작",
  STOPPED: "정지",
  FAULT: "고장",
  UNKNOWN: "알수없음",
};
/** 연결상태 라벨 */
export const CONNECTION_STATE_LABEL: Record<ConnectionState, string> = {
  CONNECTED: "연결됨",
  DISCONNECTED: "연결끊김",
  UNKNOWN: "알수없음",
};

export const DEVICE_CATEGORY_QUERY_KEY = ["device", "device-categories"];
export const DEVICE_LIST_QUERY_KEY = ["device", "list"];
export const DEVICE_POINT_MAPPING_QUERY_KEY = ["device", "points", "mapping"];
export const DEVICE_PROPERTY_TYPES_QUERY_KEY = ["device", "property-types"];

/**
 * 카테고리 propertyType 별 property_info 스켈레톤 메타 항목
 * @typedef {{ type: string; template: Record<string, any> }} DevicePropertyTypeMeta
 */

/**
 * GET /device/property-types — propertyType 별 property_info 스켈레톤(서버 파생)
 * @returns {Promise<Array<{ type: string; template: Record<string, any> }>>}
 */
export async function getDevicePropertyTypes(): Promise<
  Array<{ type: string; template: Record<string, any> }>
> {
  const { data } = await privateApi.get("/device/property-types");
  return data?.data ?? [];
}

/** 장비 property 타입 메타 react-query 훅 (변화 적어 오래 캐시) */
export function useDevicePropertyTypes() {
  return useQuery({
    queryKey: DEVICE_PROPERTY_TYPES_QUERY_KEY,
    queryFn: getDevicePropertyTypes,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });
}

/**
 * GET /device/device-categories — 장비 카테고리 목록(트리)
 */
export async function categoryFetchAPI() {
  const { data } = await privateApi.get("/device/device-categories");
  return data;
}


/**
 * POST /device/device-categories — 카테고리 생성
 * @param {{ categoryName: string; categoryNameEn?: string; categoryCode: string; parentId?: number; description?: string; displayOrder?: number; active?: boolean; assetId?: number | null; propertyType?: string | null }} payload
 */
export async function createCategoryAPI(payload) {
  const { data } = await privateApi.post("/device/device-categories", payload);
  return data;
}

/**
 * PUT /device/device-categories/{categoryId} — 카테고리 수정
 * @param {{ categoryId: number; payload: { categoryName?: string; categoryNameEn?: string | null; categoryCode?: string; active?: boolean; assetId?: number | null; propertyType?: string | null } }} param
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
 *   deviceDisplayName?: string;
 *   deviceKey?: string;
 *   description?: string;
 *   categoryId?: number;
 *   assetId?: number | null;
 *   active: boolean;
 *   propertyInfo?: Record<string, any> | null;
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
 * @param {{ deviceId: number; payload: { deviceName?: string; deviceDisplayName?: string | null; description?: string; active?: boolean; categoryId?: number | null; assetId?: number | null; propertyInfo?: Record<string, any> | null } }} param
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
 * GET /device/excel — 현재 목록 필터(카테고리/키워드) 기준 장비 목록 xlsx(blob)
 * @param {{ categoryId?: number; keyword?: string }} [params]
 * @returns axios response (data: Blob, headers 포함 — 파일명 파싱용)
 */
export async function downloadDeviceListExcelAPI({
  categoryId,
  keyword,
}: { categoryId?: number; keyword?: string } = {}) {
  const res = await privateApi.get("/device/excel", {
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

/* ────────────────────────────────────────────────────────────────
 * CCTV 매핑 — 장비 주변 CCTV(이벤트 8분할 배치) 매핑.
 * 순서(cctvIds 배열 순서) = sort_order 로 저장(replace).
 * ──────────────────────────────────────────────────────────────── */

/** CCTV 장비 속성(자격증명은 UI 미노출) */
export interface CctvProperty {
  type: "CCTV";
  main_url?: string;
  sub_url?: string;
  user_id?: string;
  password?: string;
  [k: string]: unknown;
}

/** CCTV 정보 projection (매핑/후보 공용) */
export interface CctvInfo {
  deviceId: number;
  deviceName: string;
  floorId: number | null;
  floorName: string | null;
  deviceProperty: CctvProperty | null;
}

export const deviceCctvMappingQueryKey = (deviceId: number | string) => [
  "device",
  "cctv-mapping",
  deviceId,
];
export const DEVICE_CCTV_CANDIDATES_QUERY_KEY = ["device", "cctv-candidates"];

/** GET /device/{deviceId}/cctv-mapping → 현재 매핑(sort_order 순) */
export async function getCctvMapping(
  deviceId: number | string
): Promise<CctvInfo[]> {
  const { data } = await privateApi.get(`/device/${deviceId}/cctv-mapping`);
  return data?.data ?? [];
}

/** GET /device/cctv-candidates → CCTV 후보 장비 전체 */
export async function getCctvCandidates(): Promise<CctvInfo[]> {
  const { data } = await privateApi.get(`/device/cctv-candidates`);
  return data?.data ?? [];
}

/** POST /device/{deviceId}/cctv-mapping — body {cctvIds:[선택 순서]} (순서=sort_order, replace) */
export async function postCctvMapping(
  deviceId: number | string,
  cctvIds: number[]
) {
  const { data } = await privateApi.post(`/device/${deviceId}/cctv-mapping`, {
    cctvIds,
  });
  return data;
}

/* ────────────────────────────────────────────────────────────────
 * 장비 실시간 값 이력 (device value history)
 * ──────────────────────────────────────────────────────────────── */

/** XN 포인트 값 스냅샷 1건 (XnPointData) */
export interface XnPointData {
  deviceId: number | null;
  pointId: number | null;
  pointkey: string | null;
  deviceCode: string | null;
  pointCode: string | null;
  alarmYn: string | null;
  objectType: string | null;
  pointName: string | null;
  valueRaw: string | null;
  unit: string | null;
  tagName: string | null;
  updateDatetime: string | null;
}

/** 실시간 값 이력 1건 (= 특정 시각의 device bundle 스냅샷).
 * PK 가 복합 (device_id, created_at) 이라 surrogate id 는 없음. */
export interface DeviceValueHistoryResponse {
  deviceId: number;
  deviceKey: string;
  createdAt: string;
  points: XnPointData[];
}

/** 장비 실시간 값 이력 쿼리 키 (deviceId + 조건별로 뒤에 붙여 사용) */
export const deviceValueHistoryQueryKey = (deviceId: number | string) => [
  "device",
  "value-history",
  String(deviceId),
];

/**
 * GET /api/device/{deviceId}/value-history?from=&to=&page=&size=
 * → ApiResponse<PageResponse<DeviceValueHistoryResponse>> (content + page, 공용 Pagination 소비)
 * @returns 전체 ApiResponse (res.data.content / res.data.page 로 소비)
 */
export async function getDeviceValueHistory({
  deviceId,
  from,
  to,
  page = 0,
  size = 50,
}: {
  deviceId: number;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}) {
  const { data } = await privateApi.get(`/device/${deviceId}/value-history`, {
    params: {
      page,
      size,
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    },
  });
  return data;
}

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
        assetId: n.assetId ?? null,
        assetName: n.assetName ?? null,
        propertyType: n.propertyType ?? null,
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
