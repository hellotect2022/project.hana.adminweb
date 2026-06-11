import privateApi from "./api";

export const UNITY_ASSET_LIST_QUERY_KEY = ["unityAsset", "list"];

/**
 * @typedef {{
 *   assetId: number;
 *   assetName: string;
 *   description?: string | null;
 *   active?: boolean;
 *   createdAt?: string;
 *   updatedAt?: string;
 * }} UnityAssetDTO
 */

/**
 * GET /unity-assets — 목록 조회
 * @param {{ activeOnly?: boolean }} [params]
 */
export async function fetchUnityAssetsAPI(params = {}) {
  const { data } = await privateApi.get("/unity-assets", {
    params: params.activeOnly ? { activeOnly: true } : undefined,
  });
  return data;
}

/**
 * @param {{ activeOnly?: boolean }} [params]
 * @returns {Promise<UnityAssetDTO[]>}
 */
export async function fetchUnityAssetsList(params = {}) {
  const res = await fetchUnityAssetsAPI(params);
  if (!res?.success) throw new Error(res?.message || "Unity 에셋 목록 조회 실패");
  return res.data ?? [];
}

/**
 * GET /unity-assets/{assetId}
 * @param {number} assetId
 */
export async function fetchUnityAssetByIdAPI(assetId) {
  const { data } = await privateApi.get(`/unity-assets/${assetId}`);
  return data;
}

/**
 * POST /unity-assets
 * @param {{ assetName: string; description?: string; active?: boolean }} payload
 */
export async function createUnityAssetAPI(payload) {
  const { data } = await privateApi.post("/unity-assets", payload);
  return data;
}

/**
 * PUT /unity-assets/{assetId}
 * @param {{ assetId: number; assetName: string; description?: string; active?: boolean }} param
 */
export async function updateUnityAssetAPI({ assetId, ...payload }) {
  const { data } = await privateApi.put(`/unity-assets/${assetId}`, payload);
  return data;
}

/**
 * DELETE /unity-assets/{assetId}
 * @param {number} assetId
 */
export async function deleteUnityAssetAPI(assetId) {
  const { data } = await privateApi.delete(`/unity-assets/${assetId}`);
  return data;
}
