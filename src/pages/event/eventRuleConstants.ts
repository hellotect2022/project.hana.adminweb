/** 이벤트 규칙 페이지·편집 폼 공용 상수 */

export const SEVERITY_CONFIG = {
  INFO: { label: "정보", bg: "#dbeafe", color: "#1d4ed8", dot: "#3b82f6" },
  WARNING: { label: "경고", bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" },
  CRITICAL: { label: "위험", bg: "#fee2e2", color: "#991b1b", dot: "#ef4444" },
  EMERGENCY: { label: "긴급", bg: "#fce7f3", color: "#9d174d", dot: "#ec4899" },
};

export const ACTION_CONFIG = {
  ALARM: { label: "알람 발생", icon: "🔔" },
  NOTIFICATION: { label: "알림 전송", icon: "📨" },
  SOP: { label: "SOP 실행", icon: "📋" },
  RELAY_CONTROL: { label: "제어 연동", icon: "⚡" },
};

export const OPERATORS = [">", ">=", "<", "<=", "==", "!=", "IN_RANGE", "OUT_OF_RANGE"];

export const emptyCondition = () => ({
  tagName: "",
  operator: ">",
  value: "",
  value2: "",
  unit: "",
});

export const emptyRule = () => ({
  ruleName: "",
  description: "",
  deviceId: null,
  deviceName: "",
  tagName: "",
  conditions: [emptyCondition()],
  conditionLogic: "AND",
  sustainDuration: 0,
  cooldown: 0,
  severity: "WARNING",
  actions: [],
  displayType: "SIMPLE",
  sopTemplateId: null,
  active: true,
});

export const summarizeConditions = (conditions = [], logic) =>
  conditions
    .filter((c) => c.tagName && c.operator)
    .map((c) =>
      c.operator === "IN_RANGE" || c.operator === "OUT_OF_RANGE"
        ? `${c.tagName} ${c.operator} [${c.value}~${c.value2}] ${c.unit ?? ""}`
        : `${c.tagName} ${c.operator} ${c.value} ${c.unit ?? ""}`
    )
    .join(` ${logic} `);
