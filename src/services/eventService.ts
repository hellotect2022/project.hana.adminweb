import privateApi from "./api";

/**
 * @typedef {{
 *   tagName: string;
 *   operator: string;
 *   value: number;
 *   value2?: number | null;
 *   unit?: string;
 * }} EventConditionItem
 */

/**
 * @typedef {{
 *   ruleId: number;
 *   ruleName: string;
 *   description?: string | null;
 *   deviceId?: number | null;
 *   deviceName?: string | null;
 *   tagName?: string | null;
 *   conditions: EventConditionItem[];
 *   conditionLogic: "AND" | "OR";
 *   sustainDuration: number;
 *   cooldown: number;
 *   severity: "INFO" | "WARNING" | "CRITICAL" | "EMERGENCY";
 *   actions: string[];
 *   displayType?: "SIMPLE" | "SOP";
 *   sopTemplateId?: number | null;
 *   sopTemplateName?: string | null;
 *   active: boolean;
 *   createdAt: string;
 *   updatedAt: string;
 * }} EventRuleDTO
 */

export const EVENT_RULES_QUERY_KEY = ["event", "rules"];
export const eventRulesByDeviceKey = (deviceId) => ["event", "rules", "device", deviceId];

// ─────────────────────────────────────────────
// 조회
// ─────────────────────────────────────────────

/**
 * GET /event/rules — 전체 이벤트 규칙 목록
 * @returns {Promise<{success: boolean; data: EventRuleDTO[]}>}
 */
export async function fetchEventRulesAPI() {
  const { data } = await privateApi.get("/event/rules");
  return data;
}

/**
 * GET /event/rules/{ruleId} — 단건 조회
 * @param {number} ruleId
 * @returns {Promise<{success: boolean; data: EventRuleDTO}>}
 */
export async function fetchEventRuleByIdAPI(ruleId) {
  const { data } = await privateApi.get(`/event/rules/${ruleId}`);
  return data;
}

/**
 * GET /event/rules/device/{deviceId} — 장비별 이벤트 규칙 목록
 * @param {number} deviceId
 */
export async function fetchEventRulesByDeviceAPI(deviceId) {
  const { data } = await privateApi.get(`/event/rules/device/${deviceId}`);
  return data;
}

/**
 * GET /event/rules/severity/{severity} — 심각도별 이벤트 규칙 목록
 * @param {string} severity
 */
export async function fetchEventRulesBySeverityAPI(severity) {
  const { data } = await privateApi.get(`/event/rules/severity/${severity}`);
  return data;
}

// ─────────────────────────────────────────────
// 생성 / 수정 / 삭제
// ─────────────────────────────────────────────

/**
 * POST /event/rules — 이벤트 규칙 생성
 * @param {Omit<EventRuleDTO, "ruleId" | "createdAt" | "updatedAt">} payload
 */
export async function createEventRuleAPI(payload) {
  const { data } = await privateApi.post("/event/rules", payload);
  return data;
}

/**
 * PUT /event/rules/{ruleId} — 이벤트 규칙 전체 수정
 * @param {{ ruleId: number; payload: object }} param
 */
export async function updateEventRuleAPI({ ruleId, payload }) {
  const { data } = await privateApi.put(`/event/rules/${ruleId}`, payload);
  return data;
}

/**
 * PATCH /event/rules/{ruleId}/toggle — 활성/비활성 토글
 * @param {number} ruleId
 */
export async function toggleEventRuleActiveAPI(ruleId) {
  const { data } = await privateApi.patch(`/event/rules/${ruleId}/toggle`);
  return data;
}

/**
 * DELETE /event/rules/{ruleId} — 이벤트 규칙 삭제
 * @param {number} ruleId
 */
export async function deleteEventRuleAPI(ruleId) {
  const { data } = await privateApi.delete(`/event/rules/${ruleId}`);
  return data;
}
