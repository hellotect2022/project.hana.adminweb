import privateApi from "./api";

function unwrapData(res) {
  const body = res?.data;
  if (!body || typeof body !== "object") return undefined;
  if ("data" in body && body.data !== undefined) return body.data;
  return body;
}

export const MEMO_QUERY_KEY = ["memo"];

/**
 * GET /api/memo — 메모 목록(최근 수정순)
 * @param {{ page?: number; size?: number; keyword?: string }} [params]
 * @returns {Promise<{ content: any[]; page: { totalElements: number; totalPages: number; number: number; size: number } }>}
 */
export async function fetchMemosAPI({
  page = 0,
  size = 20,
  keyword,
}: { page?: number; size?: number; keyword?: string } = {}) {
  const res = await privateApi.get("/memo", {
    params: { page, size, ...(keyword ? { keyword } : {}) },
  });
  const data = unwrapData(res);
  return {
    content: Array.isArray(data?.content) ? data.content : [],
    page: data?.page ?? { totalElements: 0, totalPages: 0, number: 0, size },
  };
}

/**
 * POST /api/memo — 메모 등록
 * @param {{ title: string; content?: string }} body
 */
export async function createMemoAPI(body) {
  const res = await privateApi.post("/memo", body);
  return res?.data;
}

/**
 * PUT /api/memo/{memoId} — 메모 수정
 * @param {number} memoId
 * @param {{ title: string; content?: string }} body
 */
export async function updateMemoAPI(memoId, body) {
  const res = await privateApi.put(`/memo/${memoId}`, body);
  return res?.data;
}

/**
 * DELETE /api/memo/{memoId} — 메모 삭제
 * @param {number} memoId
 */
export async function deleteMemoAPI(memoId) {
  const res = await privateApi.delete(`/memo/${memoId}`);
  return res?.data;
}
