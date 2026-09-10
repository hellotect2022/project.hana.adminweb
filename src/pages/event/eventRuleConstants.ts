import type {
  EventLevelKey,
  EventRule,
  EventRuleLevel,
  OutputSpec,
} from "@/services/eventRuleService";
import type { EventMeta } from "@/services/eventMetaService";

/* ────────────────────────────────────────────────────────────────
 * 순수 UI 표현 토큰 (서버 소유 아님) — 색상만 클라이언트가 소유한다.
 * enum 값/라벨/순서는 서버 메타(GET /api/event/meta)에서 구동한다.
 * ──────────────────────────────────────────────────────────────── */

/** 심각도 레벨 색 — 주의=amber / 경계=orange / 심각=red. 라벨/순서는 메타 사용. */
export const LEVEL_COLORS: Record<
  EventLevelKey,
  { bg: string; color: string; dot: string }
> = {
  CAUTION: { bg: "#fef3c7", color: "#b45309", dot: "#f59e0b" },
  WARNING: { bg: "#ffedd5", color: "#c2410c", dot: "#f97316" },
  CRITICAL: { bg: "#fee2e2", color: "#b91c1c", dot: "#ef4444" },
};

const LEVEL_COLOR_FALLBACK = { bg: "#eef2f6", color: "#475569", dot: "#94a3b8" };

/** 레벨 색 조회(미지정 레벨은 회색 폴백) */
export function levelColor(level: string) {
  return LEVEL_COLORS[level as EventLevelKey] ?? LEVEL_COLOR_FALLBACK;
}

/** OutputSpec 의 출력 채널 키(서버 필드명과 동일한 camelCase). */
export type OutputChannelKey =
  | "popup"
  | "sop"
  | "cctv"
  | "sms"
  | "email"
  | "deviceControl";

/**
 * 메타 notificationChannel 키(UPPER_SNAKE) → OutputSpec 필드 키.
 * `toLowerCase()` 로는 DEVICE_CONTROL → "device_control" 이 되어 필드명과 어긋나므로 표로 둔다.
 */
const META_TO_OUTPUT_KEY: Record<string, OutputChannelKey> = {
  POPUP: "popup",
  SOP: "sop",
  CCTV: "cctv",
  SMS: "sms",
  EMAIL: "email",
  DEVICE_CONTROL: "deviceControl",
};

/** 메타 키 → OutputSpec 키. 서버가 새 채널을 추가하고 프론트가 모르면 null. */
export function toOutputKey(metaKey: string): OutputChannelKey | null {
  return META_TO_OUTPUT_KEY[metaKey] ?? null;
}

export const OUTPUT_SPEC_KEYS: OutputChannelKey[] = [
  "popup",
  "sop",
  "cctv",
  "sms",
  "email",
  "deviceControl",
];

/**
 * 이 화면에서 실제로 편집 가능한 채널.
 * 나머지(email/deviceControl)는 서버 발송·실행기가 아직 없어 "준비중" 비활성으로 표시한다.
 * (규칙에 켜두면 tbl_event_action 행은 PENDING 으로 남지만 아무도 처리하지 않는다.)
 */
export const EDITABLE_CHANNELS: OutputChannelKey[] = [
  "popup",
  "sop",
  "cctv",
  "sms",
];

/** 채널 색. 라벨/순서는 메타 사용. */
export const CHANNEL_COLORS: Record<string, { bg: string; color: string }> = {
  popup: { bg: "#dbeafe", color: "#1d4ed8" },
  sop: { bg: "#e0e7ff", color: "#4338ca" },
  cctv: { bg: "#dcfce7", color: "#15803d" },
  sms: { bg: "#f3f4f6", color: "#6b7280" },
  email: { bg: "#fae8ff", color: "#a21caf" },
  deviceControl: { bg: "#fef9c3", color: "#a16207" },
};

const CHANNEL_COLOR_FALLBACK = { bg: "#f3f4f6", color: "#6b7280" };

/** 채널 색 조회(미지정 채널은 회색 폴백) */
export function channelColor(key: string) {
  return CHANNEL_COLORS[key] ?? CHANNEL_COLOR_FALLBACK;
}

/** CCTV 기본 카메라 수(분할) — 순수 UI 기본값 */
export const CCTV_DEFAULT_LIMIT = 8;

/* ── OutputSpec 판독 (순수 함수) ── */

/** 특정 채널이 켜졌는지 */
export function isChannelOn(
  outputs: OutputSpec | null | undefined,
  key: OutputChannelKey
): boolean {
  if (!outputs) return false;
  return !!outputs[key]?.enabled;
}

/**
 * 레벨 outputs 에서 켜진 채널 키 목록.
 * order = 메타 outputChannel 순서에서 파생한 소문자 키 배열(생략 시 OUTPUT_SPEC_KEYS).
 */
export function enabledChannels(
  outputs: OutputSpec | null | undefined,
  order: OutputChannelKey[] = OUTPUT_SPEC_KEYS
): OutputChannelKey[] {
  return order.filter((k) => isChannelOn(outputs, k));
}

/* ── 조건 요약 (메타 구동) ── */

/** 메타 level 키 순서를 심각도 우선순위(index)로 사용. */
function levelRank(level: EventLevelKey, levelOrder: string[]): number {
  return levelOrder.indexOf(level);
}

/** 정책의 최고 심각도 레벨 1개(메타 순서 기준). 없으면 null. */
export function highestLevel(
  policy: EventRule,
  levelOrder: string[]
): EventRuleLevel | null {
  if (!policy.levels?.length) return null;
  return [...policy.levels].sort(
    (a, b) => levelRank(b.level, levelOrder) - levelRank(a.level, levelOrder)
  )[0];
}

/**
 * 발생 조건 요약. 연산자 심볼·레벨 순서는 메타에서 구동.
 * THRESHOLD → "operator thresholdValue"(예 ">= 12"), TOGGLE → "= triggerValue".
 */
export function formatCondition(policy: EventRule, meta: EventMeta): string {
  if (policy.conditionKind === "TOGGLE") {
    return `= ${policy.triggerValue ?? "-"}`;
  }
  const levelOrder = Object.keys(meta.level);
  const top = highestLevel(policy, levelOrder);
  const op = policy.operator ? meta.operator[policy.operator] ?? "" : "";
  const value =
    top?.thresholdValue != null
      ? top.thresholdValue
      : policy.triggerValue ?? "-";
  return `${op} ${value}`.trim();
}
