import privateApi from "./api";

function unwrapData(res) {
  const body = res?.data;
  if (!body || typeof body !== "object") return undefined;
  if ("data" in body && body.data !== undefined) return body.data;
  return body;
}

/**
 * GET /api/system/log-retention
 */
export async function fetchLogRetentionPolicies() {
  const res = await privateApi.get("/system/log-retention");
  const data = unwrapData(res);
  return Array.isArray(data) ? data : [];
}

/**
 * PUT /api/system/log-retention
 * @param {{ policies: { policyKey: string; retentionDays: number }[] }} body
 */
export async function updateLogRetentionPolicies(body) {
  const res = await privateApi.put("/system/log-retention", body);
  return unwrapData(res);
}

/**
 * POST /api/system/log-retention/run-purge
 */
export async function runLogRetentionPurge() {
  const res = await privateApi.post("/system/log-retention/run-purge");
  return unwrapData(res);
}

export const LOG_RETENTION_QUERY_KEY = ["system", "log-retention"];
