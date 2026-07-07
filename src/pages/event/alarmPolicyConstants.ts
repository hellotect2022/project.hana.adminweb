import type {
  AlarmConditionKind,
  AlarmDisplayType,
  AlarmLevelKey,
  AlarmOperator,
  AlarmPolicy,
  AlarmPolicyLevel,
  AlarmScope,
} from "@/services/alarmPolicyService";

/** 범위 라벨 */
export const SCOPE_LABEL: Record<AlarmScope, string> = {
  CATEGORY: "카테고리",
  DEVICE: "디바이스",
};

/** 심각도 레벨 표기(라벨 + 배지 색) — 주의=amber / 경계=orange / 심각=red */
export const LEVEL_CONFIG: Record<
  AlarmLevelKey,
  { label: string; bg: string; color: string; dot: string }
> = {
  CAUTION: { label: "주의", bg: "#fef3c7", color: "#b45309", dot: "#f59e0b" },
  WARNING: { label: "경계", bg: "#ffedd5", color: "#c2410c", dot: "#f97316" },
  CRITICAL: { label: "심각", bg: "#fee2e2", color: "#b91c1c", dot: "#ef4444" },
};

/** 심각도 우선순위 (CRITICAL > WARNING > CAUTION) */
export const LEVEL_PRIORITY: Record<AlarmLevelKey, number> = {
  CAUTION: 1,
  WARNING: 2,
  CRITICAL: 3,
};

/** 레벨 표시 순서 (모달 3단 편집용) */
export const LEVEL_ORDER: AlarmLevelKey[] = ["CAUTION", "WARNING", "CRITICAL"];

/** 연산자 라벨 */
export const OPERATOR_LABEL: Record<AlarmOperator, string> = {
  GTE: "≥",
  LTE: "≤",
  GT: ">",
  LT: "<",
};

/** 경보 표시 유형 라벨 */
export const DISPLAY_TYPE_LABEL: Record<AlarmDisplayType, string> = {
  SIMPLE: "팝업",
  SOP: "SOP",
  POPUP_SOP: "팝업+SOP",
};

/** 조건 종류 라벨 */
export const CONDITION_KIND_LABEL: Record<AlarmConditionKind, string> = {
  THRESHOLD: "임계치(AI)",
  TOGGLE: "토글(DI)",
};

/** 정책의 최고 심각도 레벨 1개를 반환(없으면 null) */
export function highestLevel(policy: AlarmPolicy): AlarmPolicyLevel | null {
  if (!policy.levels?.length) return null;
  return [...policy.levels].sort(
    (a, b) => LEVEL_PRIORITY[b.level] - LEVEL_PRIORITY[a.level]
  )[0];
}

/**
 * 발생 조건 요약.
 * THRESHOLD → "operator thresholdValue"(예 "≥ 12"), TOGGLE → "= triggerValue".
 */
export function formatCondition(policy: AlarmPolicy): string {
  if (policy.conditionKind === "TOGGLE") {
    return `= ${policy.triggerValue ?? "-"}`;
  }
  const top = highestLevel(policy);
  const op = policy.operator ? OPERATOR_LABEL[policy.operator] : "";
  const value =
    top?.thresholdValue != null
      ? top.thresholdValue
      : policy.triggerValue ?? "-";
  return `${op} ${value}`.trim();
}
