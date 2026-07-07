import privateApi from "./api";

/**
 * 알람 정책(AlarmPolicy) API 클라이언트 — 이벤트 알람 그룹 (WA-ALARM-POLICY)
 * Base: privateApi, `/api/alarm/policies`, 응답은 ApiResponse<T> 엔벨로프(success/message/data).
 * 백엔드 계약: hana-digitaltwin alarm 도메인 (AlarmPolicyController / AlarmPolicyRequest / AlarmPolicyResponse).
 */

export type AlarmScope = "CATEGORY" | "DEVICE";
export type AlarmLevelKey = "CAUTION" | "WARNING" | "CRITICAL";
export type AlarmOperator = "GTE" | "LTE" | "GT" | "LT";
export type AlarmConditionKind = "THRESHOLD" | "TOGGLE";
export type AlarmDisplayType = "SIMPLE" | "SOP" | "POPUP_SOP";

export interface AlarmPolicyLevel {
  level: AlarmLevelKey;
  thresholdValue: number | null;
  icon: string;
  effect: string;
  displayOrder: number;
}

export interface AlarmPolicy {
  policyId: number;
  policyName: string;
  description: string | null;
  scope: AlarmScope;
  categoryId: number | null;
  /** 서버가 resolve 한 "대 › 중 › 소" 경로 (응답 전용) */
  categoryPath: string | null;
  deviceId: number | null;
  /** 서버가 resolve 한 장비명 (응답 전용) */
  deviceName: string | null;
  tagName: string | null;
  pointType: string | null;
  conditionKind: AlarmConditionKind;
  operator: AlarmOperator | null;
  triggerValue: string | null;
  displayType: AlarmDisplayType;
  sopTemplateId: number | null;
  effectEnabled: boolean;
  sustainSec: number;
  cooldownSec: number;
  active: boolean;
  levels: AlarmPolicyLevel[];
  createdAt?: string;
  updatedAt?: string;
}

/** 등록/수정 요청 페이로드 (policyId·createdAt·updatedAt 제외) */
export type AlarmPolicyPayload = Omit<
  AlarmPolicy,
  "policyId" | "createdAt" | "updatedAt" | "categoryPath" | "deviceName"
>;

export const ALARM_POLICY_QUERY_KEY = ["alarm", "policies"];
export const alarmPolicyKey = (policyId: number) => ["alarm", "policies", policyId];

/** GET /api/alarm/policies → List<AlarmPolicyResponse> */
export async function fetchAlarmPolicies(): Promise<AlarmPolicy[]> {
  const { data } = await privateApi.get("/alarm/policies");
  if (!data?.success) throw new Error(data?.message || "알람 정책 조회 실패");
  return data.data ?? [];
}

/** GET /api/alarm/policies/{id} → AlarmPolicyResponse */
export async function fetchAlarmPolicy(policyId: number): Promise<AlarmPolicy> {
  const { data } = await privateApi.get(`/alarm/policies/${policyId}`);
  if (!data?.success) throw new Error(data?.message || "알람 정책 상세 조회 실패");
  return data.data;
}

/** POST /api/alarm/policies (body AlarmPolicyRequest) → AlarmPolicyResponse */
export async function createAlarmPolicy(payload: AlarmPolicyPayload) {
  const { data } = await privateApi.post("/alarm/policies", payload);
  return data;
}

/** PUT /api/alarm/policies/{id} (body AlarmPolicyRequest) → AlarmPolicyResponse */
export async function updateAlarmPolicy({
  policyId,
  payload,
}: {
  policyId: number;
  payload: AlarmPolicyPayload;
}) {
  const { data } = await privateApi.put(`/alarm/policies/${policyId}`, payload);
  return data;
}

/** DELETE /api/alarm/policies/{id} */
export async function deleteAlarmPolicy(policyId: number) {
  const { data } = await privateApi.delete(`/alarm/policies/${policyId}`);
  return data;
}
