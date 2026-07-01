/**
 * axios/ApiError 등 unknown 에러에서 사용자 메시지를 안전하게 추출한다.
 * react-query onError의 err는 `Error`로 타입되어 `err.response` 접근 시 타입 에러가 나므로
 * 이 헬퍼로 일원화한다.
 */
export function getApiErrorMessage(
  err: unknown,
  fallback = "오류가 발생했습니다."
): string {
  const e = err as any;
  const msg =
    e?.response?.data?.message ??
    e?.response?.data?.error ??
    e?.apiError?.message ??
    e?.message ??
    fallback;
  return typeof msg === "string" ? msg : JSON.stringify(msg);
}
