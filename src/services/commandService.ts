import privateApi from "./api";

/**
 * 디바이스 제어(command) API 클라이언트 — 제어 포인트 관리 + 실제 제어(XN 중계).
 * Base: privateApi, `/api/command/*`, 응답은 ApiResponse<T> 엔벨로프(success/message/data).
 * 백엔드 계약: hana-digitaltwin command 도메인
 *   (CommandPointController / DeviceControlController / *Request / *Response).
 */

/** 제어 포인트 등록/수정 요청 (CommandPointRequest) */
export interface CommandPointRequest {
  deviceId: number;
  /** 제어에 사용할 tbl_device_point ID (해당 디바이스 소속이어야 함) */
  pointId: number;
  label: string;
  /** ON 명령 전송값 (기본 "1") */
  onValue: string;
  /** OFF 명령 전송값 (기본 "0") */
  offValue: string;
  sortOrder: number;
  active: boolean;
}

/** 제어 포인트 응답 (CommandPointResponse) — 대상 포인트의 tagName/ref 코드 포함 */
export interface CommandPointResponse {
  commandPointId: number;
  deviceId: number;
  deviceName: string | null;
  pointId: number;
  tagName: string | null;
  refDeviceCode: string | null;
  refPointCode: string | null;
  label: string;
  onValue: string;
  offValue: string;
  sortOrder: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** 제어 명령 값 (UI 내부 상태·버튼 표시용) */
export type ControlValue = "on" | "off";

/** 제어 명령 요청 (DeviceControlRequest) — API 전송값은 "1"(ON)/"0"(OFF) */
export interface DeviceControlRequest {
  commandPointId: number;
  /** 백엔드 계약: "1"=ON / "0"=OFF (서버가 제어포인트 onValue/offValue 로 매핑) */
  value: "1" | "0";
}

/** 제어 명령 결과 (DeviceControlResponse) */
export interface DeviceControlResult {
  success: boolean;
  message: string;
}

/** 디바이스 응답에 임베드되는 제어 포인트 요약 (DeviceResponse.CommandPointItem) */
export interface CommandPointItem {
  commandPointId: number;
  label: string;
  tagName: string | null;
  onValue: string;
  offValue: string;
}

/** 특정 디바이스의 제어 포인트 목록 쿼리 키 */
export const commandPointsQueryKey = (deviceId: number | string) => [
  "command",
  "points",
  String(deviceId),
];

/** 제어 포인트 페이지 목록 쿼리 키 (장비 비의존, 페이지네이션) */
export const COMMAND_POINTS_PAGE_QUERY_KEY = ["command", "points", "page"];

/** GET /api/command/points?deviceId= → List<CommandPointResponse> */
export async function fetchCommandPoints(
  deviceId: number
): Promise<CommandPointResponse[]> {
  const { data } = await privateApi.get("/command/points", {
    params: { deviceId },
  });
  if (!data?.success) throw new Error(data?.message || "제어 포인트 조회 실패");
  return data.data ?? [];
}

/**
 * GET /api/command/points/page?keyword=&categoryId=&page=&size=
 * → ApiResponse<PageResponse<CommandPointResponse>> (디바이스 목록 /device/all 과 동일 형태)
 * 장비 선택 없이 제어 포인트 자체를 페이지네이션으로 조회한다.
 * @returns 전체 ApiResponse (res.data.content / res.data.page 로 소비 — DeviceManagePage 방식)
 */
export async function getCommandPointsPage({
  keyword,
  categoryId,
  page = 0,
  size = 20,
}: {
  keyword?: string;
  categoryId?: number;
  page?: number;
  size?: number;
} = {}) {
  const { data } = await privateApi.get("/command/points/page", {
    params: {
      page,
      size,
      ...(keyword ? { keyword } : {}),
      ...(categoryId != null ? { categoryId } : {}),
    },
  });
  return data;
}

/** POST /api/command/points (CommandPointRequest) → CommandPointResponse */
export async function createCommandPoint(payload: CommandPointRequest) {
  const { data } = await privateApi.post("/command/points", payload);
  return data;
}

/** PUT /api/command/points/{id} (CommandPointRequest) → CommandPointResponse */
export async function updateCommandPoint({
  id,
  payload,
}: {
  id: number;
  payload: CommandPointRequest;
}) {
  const { data } = await privateApi.put(`/command/points/${id}`, payload);
  return data;
}

/** DELETE /api/command/points/{id} */
export async function deleteCommandPoint(id: number) {
  const { data } = await privateApi.delete(`/command/points/${id}`);
  return data;
}

/**
 * POST /api/command/control (DeviceControlRequest) → DeviceControlResponse
 * 제어 포인트에 on/off 명령을 전송해 외부(XN) 연계로 중계한다.
 */
export async function controlDevice(
  payload: DeviceControlRequest
): Promise<DeviceControlResult> {
  const { data } = await privateApi.post("/command/control", payload);
  if (!data?.success) {
    // ApiResponse 자체가 실패한 경우 (요청 검증 실패 등)
    throw new Error(data?.message || "제어 명령 전송 실패");
  }
  // data.data = { success, message } (XN 연계 수락 여부)
  return data.data as DeviceControlResult;
}
