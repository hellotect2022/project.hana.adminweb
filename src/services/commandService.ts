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

/** 제어 명령 값 */
export type ControlValue = "on" | "off";

/** 제어 명령 요청 (DeviceControlRequest) */
export interface DeviceControlRequest {
  commandPointId: number;
  value: ControlValue;
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
