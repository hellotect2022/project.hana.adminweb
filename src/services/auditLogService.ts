import privateApi from "./api";

/**
 * ApiResponse<T> → T
 * @template T
 * @param {import('axios').AxiosResponse<{ data?: T }>} res
 * @returns {T | undefined}
 */
function unwrapData(res) {
  const body = res?.data;
  if (!body || typeof body !== "object") return undefined;
  if ("data" in body && body.data !== undefined) return body.data;
  return body;
}

/**
 * GET /api/audit/access-logs
 * @param {string} from YYYY-MM-DD
 * @param {string} to YYYY-MM-DD
 * @param {number} [page=0]
 * @param {number} [size=12]
 */
export async function fetchAccessLogs(from, to, page = 0, size = 12) {
  const res = await privateApi.get("/audit/access-logs", {
    params: { from, to, page, size },
  });
  const data = unwrapData(res);
  if (!data || typeof data !== "object") {
    return {
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size,
    };
  }
  return data;
}

/**
 * 사용 로그(메뉴 진입) 목록 조회
 * GET /api/audit/usage-logs?from=&to=&page=&size=
 * @returns {Promise<{ content: object[]; totalElements: number; totalPages: number; number: number; size: number }>}
 */
export async function fetchUsageLogs(from, to, page = 0, size = 12) {
  const res = await privateApi.get("/audit/usage-logs", {
    params: { from, to, page, size },
  });
  const data = unwrapData(res);
  if (!data || typeof data !== "object") {
    return {
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size,
    };
  }
  return data;
}

/**
 * GET /api/audit/statistics
 */
export async function fetchAuditStatistics(from, to) {
  const res = await privateApi.get("/audit/statistics", {
    params: { from, to },
  });
  const data = unwrapData(res);
  return data ?? null;
}

export const AUDIT_QUERY_KEYS = {
  stats: (from, to) => ["audit", "statistics", from, to],
  access: (from, to, page, size) => ["audit", "access", from, to, page, size],
  usage: (from, to, page, size) => ["audit", "usage", from, to, page, size],
};
