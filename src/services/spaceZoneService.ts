import privateApi from "./api";

export const ZONE_POLICY_QUERY_KEY = ["zonePolicy", "list"];
export const ZONE_POLICY_SUMMARY_QUERY_KEY = ["zonePolicy", "summary"];

/**
 * 표현정책 DTO
 * @typedef {{
 *   policyId: number; zoneId: number; zoneName: string;
 *   buildingName: string; floorName: string;
 *   systemType: 'LIGHTING' | 'FIRE_DETECTION'; systemTypeLabel: string;
 *   displayName: string | null; colorCode: string | null;
 *   opacity: number | null; active: boolean; evacuationAutoShow: boolean | null;
 * }} ZonePolicyDTO
 */

/** GET /space/zone-policies?systemType= */
export async function fetchZonePolicies(systemType) {
  const { data } = await privateApi.get("/space/zone-policies", { params: { systemType } });
  if (!data?.success) throw new Error(data?.message || "표현정책 조회 실패");
  return data.data ?? [];
}

/** GET /space/zone-policies/summary?systemType= → { total, on, off, fault } */
export async function fetchZoneSummary(systemType) {
  const { data } = await privateApi.get("/space/zone-policies/summary", { params: { systemType } });
  if (!data?.success) throw new Error(data?.message || "구역 현황 조회 실패");
  return data.data ?? { total: 0, on: 0, off: 0, fault: 0 };
}

/** POST /space/zone-policies — 구역 표현정책 등록(기존 Zone 선택) */
export async function createZonePolicyAPI(payload) {
  const { data } = await privateApi.post("/space/zone-policies", payload);
  return data;
}

/**
 * POST /space/zone-policies/with-zone — 새 Zone(3D) + 표현정책 동시 생성
 * @param {{ floorId: number; zoneName: string; zoneMeshName: string; systemType: string;
 *   displayName?: string; colorCode?: string; opacity?: number; active?: boolean; evacuationAutoShow?: boolean }} payload
 */
export async function createZonePolicyWithZoneAPI(payload) {
  const { data } = await privateApi.post("/space/zone-policies/with-zone", payload);
  return data;
}

/** PUT /space/zone-policies — 정책 저장(일괄). items: [{ policyId, displayName?, colorCode?, opacity?, active?, evacuationAutoShow? }] */
export async function saveZonePoliciesAPI(items) {
  const { data } = await privateApi.put("/space/zone-policies", items);
  return data;
}

/** DELETE /space/zone-policies/{policyId} */
export async function deleteZonePolicyAPI(policyId) {
  const { data } = await privateApi.delete(`/space/zone-policies/${policyId}`);
  return data;
}
