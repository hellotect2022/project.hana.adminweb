import privateApi from "./api";

/**
 * 이벤트 규칙(EventRule) API 클라이언트 — 알람/이벤트 정책 화면 (WA-ALARM-POLICY)
 * Base: privateApi, `/api/event/rules`, 응답은 ApiResponse<T> 엔벨로프(success/message/data).
 * 백엔드 계약: hana-digitaltwin event 도메인 (EventRuleController / EventRuleRequest / EventRuleResponse).
 *
 * ⚠ 2026-09-04 이벤트 도메인 재구조화로 서버 계약이 바뀌었다.
 *   - `policyId`/`policyName` → **`ruleId`/`ruleName`**
 *   - `OutputSpec.notify`     → **`popup`** (서버는 요청만 옛 키를 alias 로 받고, 응답은 popup 으로 내린다)
 *   - 경로 `/alarm/policies`  → **`/event/rules`** (구 경로 별칭은 서버에서 제거됨)
 *   - 규칙 설정에 `deadband`/`suppressMode` 추가, `cooldownSec` 은 미사용(평가에서 안 씀)
 */

export type RuleScope = "CATEGORY" | "DEVICE";
export type EventLevelKey = "CAUTION" | "WARNING" | "CRITICAL";
export type RuleOperator = "GTE" | "LTE" | "GT" | "LT";
export type RuleConditionKind = "THRESHOLD" | "TOGGLE";
/** 레벨별 3D 이펙트 연출 (서버 enum name, meta.effect 로 구동) */
export type EventEffect = "NONE" | "BLINK" | "COLOR_CHANGE" | "PULSE";
/** 해소된 뒤 재발생을 언제까지 막을지 (meta.suppressMode) */
export type SuppressMode = "WHILE_ACTIVE" | "UNTIL_ACKED";

/* ────────────────────────────────────────────────────────────────
 * 레벨별 출력 채널 세트 (OutputSpec) — hana-common OutputSpec 과 1:1.
 * 레벨(주의/경계/심각)이 발생하면 켜진 채널만 동작하고, 켜진 채널 수만큼
 * 서버가 tbl_event_action 행을 만든다. 꺼진 채널은 `{ enabled:false }`
 * 또는 생략 가능(백엔드 NON_NULL).
 *
 * JSON 키는 서버 필드명과 정확히 같아야 한다: popup / sop / cctv / sms / email / deviceControl.
 * ──────────────────────────────────────────────────────────────── */
export type CctvSource = "DEVICE_MAPPING" | "EXPLICIT";

/** 팝업/토스트 알림. on/off 만. 사용자 확인(ack) 대상. */
export interface PopupOutput {
  enabled: boolean;
}
/** SOP 절차 패널. 켜지면 클라이언트에 내려줄 SOP 템플릿(templateId). */
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
/** 문자 발송 — 액션 행은 남지만 실제 발송기는 미구현(후속). */
export interface SmsOutput {
  enabled: boolean;
  recipientGroupId?: number | null;
  templateId?: number | null;
}
/** 이메일 발송 — 액션 행만, 발송기 미구현(후속). */
export interface EmailOutput {
  enabled: boolean;
  recipientGroupId?: number | null;
  templateId?: number | null;
}
/** 디바이스 제어 — 액션 행만, 실행기 미구현(후속). */
export interface DeviceControlOutput {
  enabled: boolean;
  commandPointId?: number | null;
  value?: string | null;
}
/** 레벨별 출력 채널 세트. */
export interface OutputSpec {
  popup?: PopupOutput | null;
  sop?: SopOutput | null;
  cctv?: CctvOutput | null;
  sms?: SmsOutput | null;
  email?: EmailOutput | null;
  deviceControl?: DeviceControlOutput | null;
}

export interface EventRuleLevel {
  level: EventLevelKey;
  thresholdValue: number | null;
  icon: string;
  effect: string;
  displayOrder: number;
  /** 이 레벨 발생 시 켤 출력 채널 세트(선택). 없으면 액션 없는 이벤트(표시 전용). */
  outputs?: OutputSpec | null;
}

export interface EventRule {
  ruleId: number;
  ruleName: string;
  description: string | null;
  scope: RuleScope;
  categoryId: number | null;
  /** 서버가 resolve 한 "대 › 중 › 소" 경로 (응답 전용) */
  categoryPath: string | null;
  deviceId: number | null;
  /** 서버가 resolve 한 장비명 (응답 전용) */
  deviceName: string | null;
  tagName: string | null;
  pointType: string | null;
  conditionKind: RuleConditionKind;
  operator: RuleOperator | null;
  triggerValue: string | null;
  sustainSec: number;
  /** @deprecated Active 축이 중복을 구조적으로 막아 평가에서 쓰이지 않는다(화면 계약 유지용). */
  cooldownSec: number;
  /** 해소 판정 여유값. 임계 근처 요동으로 발생/해소가 반복되는 플래핑 방지. null=0 */
  deadband: number | null;
  /** 해소된 뒤 재발생 억제 범위. 미지정 시 서버가 WHILE_ACTIVE 로 채운다. */
  suppressMode: SuppressMode | null;
  active: boolean;
  levels: EventRuleLevel[];
  createdAt?: string;
  updatedAt?: string;
}

/** 등록/수정 요청 페이로드 (ruleId·createdAt·updatedAt·응답 전용 필드 제외) */
export type EventRulePayload = Omit<
  EventRule,
  "ruleId" | "createdAt" | "updatedAt" | "categoryPath" | "deviceName"
>;

export const EVENT_RULE_QUERY_KEY = ["event", "rules"];
export const eventRuleKey = (ruleId: number) => ["event", "rules", ruleId];

/** GET /api/event/rules → List<EventRuleResponse> */
export async function fetchEventRules(): Promise<EventRule[]> {
  const { data } = await privateApi.get("/event/rules");
  if (!data?.success) throw new Error(data?.message || "이벤트 규칙 조회 실패");
  return data.data ?? [];
}

/** GET /api/event/rules/{ruleId} → EventRuleResponse */
export async function fetchEventRule(ruleId: number): Promise<EventRule> {
  const { data } = await privateApi.get(`/event/rules/${ruleId}`);
  if (!data?.success) throw new Error(data?.message || "이벤트 규칙 상세 조회 실패");
  return data.data;
}

/** POST /api/event/rules (body EventRuleRequest) → EventRuleResponse */
export async function createEventRule(payload: EventRulePayload) {
  const { data } = await privateApi.post("/event/rules", payload);
  return data;
}

/** PUT /api/event/rules/{ruleId} (body EventRuleRequest) → EventRuleResponse */
export async function updateEventRule({
  ruleId,
  payload,
}: {
  ruleId: number;
  payload: EventRulePayload;
}) {
  const { data } = await privateApi.put(`/event/rules/${ruleId}`, payload);
  return data;
}

/** DELETE /api/event/rules/{ruleId} */
export async function deleteEventRule(ruleId: number) {
  const { data } = await privateApi.delete(`/event/rules/${ruleId}`);
  return data;
}
