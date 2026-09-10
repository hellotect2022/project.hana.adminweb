import privateApi from "./api";

function unwrapData(res) {
  const body = res?.data;
  if (!body || typeof body !== "object") return undefined;
  if ("data" in body && body.data !== undefined) return body.data;
  return body;
}

export const ALARM_HISTORY_QUERY_KEY = ["event", "history"];
export const ALARM_RULE_OPTION_QUERY_KEY = ["event", "history", "rules"];

/**
 * @typedef {{
 *   eventId: string; ruleId: number|null; ruleName: string|null; level: string|null;
 *   deviceId: number|null; deviceName: string|null; deviceKey: string|null;
 *   floorName: string|null; zoneName: string|null;
 *   categoryId: number|null; categoryName: string|null;
 *   occurredAt: string; ackedAt: string|null; active: boolean; completed: boolean;
 * }} AlarmHistoryRow
 */

/**
 * GET /api/event/history — 알람 이력(공통)
 *
 * 화면 6종(전력감시·엘리베이터·소방방재·태양광·출입통제·화장실 물리버튼)이 모두 이 API 를 쓴다.
 * 화면마다 다른 건 제목과 고정 필터뿐이다.
 *
 * **완료 여부는 `ackedAt` 기준**이다 — 조건 해소(`active`)가 아니라 사람이 조치했는지다.
 */
export async function fetchAlarmHistoryAPI({
  page = 0,
  size = 20,
  categoryId,
  floorId,
  ruleId,
  completed,
  level,
  deviceId,
  from,
  to,
}: {
  page?: number;
  size?: number;
  categoryId?: number | null;
  floorId?: number | null;
  ruleId?: number | null;
  completed?: boolean | null;
  level?: string | null;
  deviceId?: number | null;
  from?: string | null;
  to?: string | null;
} = {}) {
  const res = await privateApi.get("/event/history", {
    params: {
      page,
      size,
      ...(categoryId != null ? { categoryId } : {}),
      ...(floorId != null ? { floorId } : {}),
      ...(ruleId != null ? { ruleId } : {}),
      ...(completed != null ? { completed } : {}),
      ...(level ? { level } : {}),
      ...(deviceId != null ? { deviceId } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    },
  });
  const data = unwrapData(res);
  return {
    content: Array.isArray(data?.content) ? data.content : [],
    page: data?.page ?? { totalElements: 0, totalPages: 0, number: 0, size },
  };
}

/**
 * GET /api/event/history/rules — "데이터 선택"(알람명) 드롭다운 선택지
 *
 * 실제로 발생한 적 있는 알람명만 내려온다.
 * @returns {Promise<{ ruleId: number; ruleName: string }[]>}
 */
export async function fetchAlarmRuleOptionsAPI({ from }: { from?: string | null } = {}) {
  const res = await privateApi.get("/event/history/rules", {
    params: { ...(from ? { from } : {}) },
  });
  const data = unwrapData(res);
  return Array.isArray(data) ? data : [];
}
