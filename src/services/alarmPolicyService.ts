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

/* ────────────────────────────────────────────────────────────────
 * 레벨별 출력 채널 세트 (OutputSpec) — hana-common OutputSpec 과 1:1.
 * 레벨(주의/경계/심각)이 발생하면 켜진 채널만 동작한다. 꺼진 채널은
 * `{ enabled:false }` 또는 생략 가능(백엔드 NON_NULL). JSON 키 주의:
 * NOTIFY 채널의 키는 반드시 `notify`.
 * ──────────────────────────────────────────────────────────────── */
export type CctvSource = "DEVICE_MAPPING" | "EXPLICIT";

/** 기본 팝업/토스트 알림. on/off 만. */
export interface NotifyOutput {
  enabled: boolean;
}
/** SOP 절차 패널. 켜지면 표시할 SOP 템플릿(templateId). */
export interface SopOutput {
  enabled: boolean;
  templateId?: number | null;
}
/** 주변 CCTV. source=DEVICE_MAPPING(발생 장비 매핑 자동), limit=최대 카메라 수. */
export interface CctvOutput {
  enabled: boolean;
  source?: CctvSource;
  limit?: number | null;
}
/** 문자 발송 — 슬롯만 존재(발송 연동은 후속, UI "준비중"). */
export interface SmsOutput {
  enabled: boolean;
  recipientGroupId?: number | null;
  templateId?: number | null;
}
/** 레벨별 출력 채널 세트. */
export interface OutputSpec {
  notify?: NotifyOutput | null;
  sop?: SopOutput | null;
  cctv?: CctvOutput | null;
  sms?: SmsOutput | null;
}

export interface AlarmPolicyLevel {
  level: AlarmLevelKey;
  thresholdValue: number | null;
  icon: string;
  effect: string;
  displayOrder: number;
  /** 이 레벨 발생 시 켤 출력 채널 세트(선택). 없으면 채널 미설정. */
  outputs?: OutputSpec | null;
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
