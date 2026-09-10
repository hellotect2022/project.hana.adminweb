import privateApi from "./api";
import type { ConnectionState } from "./deviceService";

/* ────────────────────────────────────────────────────────────────
 * 인프라 마스터(중계기/NVR/VMS/미들웨어) — /api/device-infra
 * 등록은 관리자 직접(ref_infra_code 입력), 장비 매핑은
 * 자동 산정(NULL 만 채움·수동 우선) + 수동 지정 하이브리드.
 * networkState 라벨은 deviceService 의 CONNECTION_STATE_LABEL 재사용.
 * ──────────────────────────────────────────────────────────────── */

/** 인프라 타입 (서버 enum InfraType) */
export type InfraType = "REPEATER" | "NVR" | "VMS" | "MIDDLEWARE" | "ETC";

/** 인프라 타입 라벨 (서버 InfraType.description 과 동일) */
export const INFRA_TYPE_LABEL: Record<InfraType, string> = {
  REPEATER: "중계기",
  NVR: "NVR",
  VMS: "VMS",
  MIDDLEWARE: "미들웨어 서버",
  ETC: "기타",
};

/** 인프라 마스터 1건 (서버 DeviceInfraResponse) */
export interface DeviceInfraDTO {
  infraId: number;
  /** 외부(vwDigitalTwin_02) 매핑 키 — NVR/VMS 등 수동 타입은 null */
  refInfraCode: string | null;
  infraName: string;
  infraType: InfraType;
  networkState: ConnectionState;
  lastCommAt: string | null;
  active: boolean;
  properties: Record<string, unknown> | null;
  /** 소속 장비 수 */
  mappedDeviceCount: number;
  createdAt: string;
  updatedAt: string;
}

/** 등록/수정 요청 body (서버 DeviceInfraRequest — 수정 시 제공 필드만 반영) */
export interface DeviceInfraRequestBody {
  /** 외부 매핑 키. 수정 시 "" 전송 → 서버 trimToNull 로 해제(null), 미전송(null) → 유지 */
  refInfraCode?: string | null;
  infraName: string;
  infraType: InfraType;
  active?: boolean;
  properties?: Record<string, unknown> | null;
}

/** 정합성 리포트 (서버 ConsistencyResponse) */
export interface InfraConsistencyReport {
  /** XN ref 보유 + infra_id NULL — 미매핑 장비 */
  unmappedXnDevices: Array<{ deviceId: number; deviceName: string }>;
  /** 서로 다른 ref 2개 이상 참조 — 오귀속 검수 후보 */
  multiRefDevices: Array<{ deviceId: number; deviceName: string; refCount: number }>;
}

export const DEVICE_INFRA_QUERY_KEY = ["device-infra"];
export const DEVICE_INFRA_CONSISTENCY_QUERY_KEY = ["device-infra", "consistency"];

/**
 * GET /device-infra?type= — 인프라 목록(매핑 장비 수 포함, 타입/이름 순 정렬)
 * @param type 인프라 타입 필터(미지정 시 전체)
 */
export async function fetchDeviceInfrasAPI(type?: InfraType | ""): Promise<DeviceInfraDTO[]> {
  const { data } = await privateApi.get("/device-infra", {
    params: {
      ...(type ? { type } : {}),
    },
  });
  return data?.data ?? [];
}

/**
 * POST /device-infra — 인프라 등록
 * 중복 ref 코드는 400(IllegalArgument) → 전역 api 에러 모달이 처리.
 * @returns ApiResponse (data: DeviceInfraDTO)
 */
export async function createDeviceInfraAPI(payload: DeviceInfraRequestBody) {
  const { data } = await privateApi.post("/device-infra", payload);
  return data;
}

/**
 * PUT /device-infra/{infraId} — 인프라 수정(제공 필드만 반영)
 * @returns ApiResponse (data: DeviceInfraDTO)
 */
export async function updateDeviceInfraAPI({
  infraId,
  payload,
}: {
  infraId: number;
  payload: DeviceInfraRequestBody;
}) {
  const { data } = await privateApi.put(`/device-infra/${infraId}`, payload);
  return data;
}

/**
 * DELETE /device-infra/{infraId} — 인프라 삭제
 * 소속 장비의 infra_id 는 FK(ON DELETE SET NULL)로 해제되어 정합성 리포트(미매핑)에 노출됨.
 */
export async function deleteDeviceInfraAPI(infraId: number) {
  const { data } = await privateApi.delete(`/device-infra/${infraId}`);
  return data;
}

/**
 * PUT /device-infra/mapping — 장비 소속 수동 지정/해제
 * infraId=null 이면 해제. 수동 지정은 자동 산정이 덮지 않는다(NULL-only 규칙).
 */
export async function setDeviceInfraMappingAPI({
  deviceId,
  infraId,
}: {
  deviceId: number;
  infraId: number | null;
}) {
  const { data } = await privateApi.put("/device-infra/mapping", { deviceId, infraId });
  return data;
}

/**
 * POST /device-infra/auto-assign — 포인트 ref 최빈값 기준 자동 산정
 * infra_id 가 비어있는 장비만 채운다(수동 우선).
 * @param payload.excludeRefCodes 공유신호(외기온도류) 인프라 코드 제외 목록(선택)
 * @returns { assignedCount } 매핑된 장비 수
 */
export async function autoAssignDeviceInfraAPI(
  payload: { excludeRefCodes?: string[] } = {}
): Promise<{ assignedCount: number }> {
  const { data } = await privateApi.post("/device-infra/auto-assign", payload);
  return data?.data ?? { assignedCount: 0 };
}

/**
 * GET /device-infra/consistency — 매핑 정합성 리포트
 * 미매핑 장비(XN ref 보유) + 다중 ref 참조 장비(검수 후보)
 */
export async function fetchDeviceInfraConsistencyAPI(): Promise<InfraConsistencyReport> {
  const { data } = await privateApi.get("/device-infra/consistency");
  return data?.data ?? { unmappedXnDevices: [], multiRefDevices: [] };
}

/* ────────────────────────────────────────────────────────────────
 * 인프라 기준 장비 수동 매핑 — 소속 장비 목록/후보 검색/일괄 매핑·해제
 * ──────────────────────────────────────────────────────────────── */

/** 인프라 소속 장비 1건 (서버 MappedDeviceResponse) */
export interface InfraMappedDevice {
  deviceId: number;
  deviceName: string;
  deviceDisplayName: string | null;
  categoryName: string | null;
}

/** 매핑 후보 장비 1건 (서버 CandidateDeviceResponse) — infraId/infraName 이 있으면 타 인프라 소속(매핑 시 이 인프라로 이동됨) */
export interface InfraCandidateDevice extends InfraMappedDevice {
  infraId: number | null;
  infraName: string | null;
}

/** 인프라별 매핑 장비 목록 쿼리 키 */
export const deviceInfraMappedQueryKey = (infraId: number | string) => [
  "device-infra",
  "mapped",
  infraId,
];

/** 인프라별 매핑 후보 검색 쿼리 키 */
export const deviceInfraCandidatesQueryKey = (
  infraId: number | string,
  keyword?: string
) => ["device-infra", "candidates", infraId, keyword ?? ""];

/**
 * GET /device-infra/{infraId}/devices — 이 인프라 소속 장비 목록
 */
export async function fetchInfraMappedDevicesAPI(
  infraId: number
): Promise<InfraMappedDevice[]> {
  const { data } = await privateApi.get(`/device-infra/${infraId}/devices`);
  return data?.data ?? [];
}

/**
 * GET /device-infra/{infraId}/candidates?keyword= — 매핑 후보 장비 검색(최대 100건)
 * 이 인프라 소속이 아닌 장비를 장비명/표시명 부분일치로 검색.
 * 타 인프라 소속 장비는 현재 소속(infraId/infraName)이 함께 반환된다.
 */
export async function fetchInfraMappingCandidatesAPI({
  infraId,
  keyword,
}: {
  infraId: number;
  keyword?: string;
}): Promise<InfraCandidateDevice[]> {
  const { data } = await privateApi.get(`/device-infra/${infraId}/candidates`, {
    params: {
      ...(keyword ? { keyword } : {}),
    },
  });
  return data?.data ?? [];
}

/**
 * POST /device-infra/{infraId}/devices — 선택 장비 일괄 매핑
 * 타 인프라 소속 장비도 이 인프라로 이동한다(명시적 수동 지정).
 * @returns { affectedCount } 반영된 장비 수
 */
export async function bulkAssignInfraDevicesAPI({
  infraId,
  deviceIds,
}: {
  infraId: number;
  deviceIds: number[];
}): Promise<{ affectedCount: number }> {
  const { data } = await privateApi.post(`/device-infra/${infraId}/devices`, { deviceIds });
  return data?.data ?? { affectedCount: 0 };
}

/**
 * POST /device-infra/{infraId}/devices/remove — 선택 장비 일괄 해제(infra_id=NULL)
 * 해제된 장비는 정합성 리포트(미매핑)에 노출될 수 있다.
 * @returns { affectedCount } 반영된 장비 수
 */
export async function bulkUnassignInfraDevicesAPI({
  infraId,
  deviceIds,
}: {
  infraId: number;
  deviceIds: number[];
}): Promise<{ affectedCount: number }> {
  const { data } = await privateApi.post(`/device-infra/${infraId}/devices/remove`, {
    deviceIds,
  });
  return data?.data ?? { affectedCount: 0 };
}
