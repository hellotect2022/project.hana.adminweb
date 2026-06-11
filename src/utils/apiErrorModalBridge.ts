/** @typedef {{ message: string; errorCode: string }} ApiErrorPayload */

/** @type {((payload: ApiErrorPayload) => void) | null} */
let handler = null;

/**
 * ModalProvider 마운트 시 등록
 * @param {((payload: ApiErrorPayload) => void) | null} fn
 */
export function setApiErrorModalHandler(fn) {
  handler = fn;
}

/**
 * @param {ApiErrorPayload} payload
 */
export function notifyApiError(payload) {
  if (!payload?.errorCode || !handler) return;
  handler(payload);
}

/**
 * @param {unknown} data
 * @returns {ApiErrorPayload | null}
 */
export function extractApiError(data) {
  if (!data || typeof data !== "object") return null;
  const body = /** @type {{ message?: string; errorCode?: string | null; success?: boolean }} */ (data);
  const code = body.errorCode;
  if (code == null || String(code).trim() === "") return null;
  return {
    message: body.message?.trim() || "오류가 발생했습니다.",
    errorCode: String(code).trim(),
  };
}

/**
 * @param {ApiErrorPayload} payload
 */
export function createApiError(payload) {
  const err = new Error(payload.message);
  err.name = "ApiError";
  /** @type {ApiErrorPayload} */
  err.apiError = payload;
  return err;
}
