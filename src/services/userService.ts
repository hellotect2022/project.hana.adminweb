import privateApi from "@/services/api";

// ---------------------------------------------------------------------------
// 사용자 (User)
// ---------------------------------------------------------------------------

/**
 * 사용자 목록 조회
 * @param {{ page?: number, size?: number, keyword?: string, searchField?: 'loginId'|'username', active?: boolean }} [params]
 */
export function fetchUsersAPI(params = {}) {
  return privateApi.get("/users", { params });
}


/**
 * 사용자 생성
 * @param {{ loginId: string, username: string, password: string, email?: string, active?: boolean, roleIds?: number[] }} body
 */
export function createUserAPI(body) {
  return privateApi.post("/users", body);
}

/**
 * 사용자 수정
 * @param {number|string} userId
 * @param {object} body - username, email, active, accountNonLocked, failedLoginAttempts, roleIds, password(선택)
 */
export function updateUserAPI({userId, payload}) {
  return privateApi.put(`/users/${userId}`, payload);
}

/**
 * 사용자 삭제 (또는 비활성 처리 — 백엔드 정책에 따름)
 * @param {number|string} userId
 */
export function deleteUserAPI(userId) {
  return privateApi.delete(`/users/${userId}`);
}


/**
 * 사용자 단건 조회 (상세·수정 폼)
 * @param {number|string} userId
 */
export function fetchUserById(userId) {
  return privateApi.get(`/admin/users/${userId}`);
}

/**
 * 비밀번호 초기화
 * @param {number|string} userId
 * @param {{ newPassword: string }} [body]
 */
export function resetUserPassword(userId, body) {
  return privateApi.post(`/admin/users/${userId}/password-reset`, body ?? {});
}

