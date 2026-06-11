import privateApi from "@/services/api";

/**
 * 관리자/권한 관련 API (Bearer 인증 필요)
 * 백엔드 경로는 프로젝트에 맞게 조정하세요. (예: /api/v1/admin/... )
 *
 * 응답 형식 가정: { success, data, meta? } 또는 Spring Page → data.content
 * 컴포넌트에서는 res.data 또는 unwrap 유틸로 사용
 */

// ---------------------------------------------------------------------------
// 사용자 (User)
// ---------------------------------------------------------------------------

/**
 * 사용자 목록 조회
 * @param {{ page?: number, size?: number, keyword?: string, searchField?: 'loginId'|'username', active?: boolean }} [params]
 */
export function fetchUsers(params = {}) {
  return privateApi.get("/admin/users", { params });
}

/**
 * 사용자 단건 조회 (상세·수정 폼)
 * @param {number|string} userId
 */
export function fetchUserById(userId) {
  return privateApi.get(`/admin/users/${userId}`);
}

/**
 * 사용자 생성
 * @param {{ loginId: string, username: string, password: string, email?: string, active?: boolean, roleIds?: number[] }} body
 */
export function createUser(body) {
  return privateApi.post("/admin/users", body);
}

/**
 * 사용자 수정
 * @param {number|string} userId
 * @param {object} body - username, email, active, accountNonLocked, failedLoginAttempts, roleIds, password(선택)
 */
export function updateUser(userId, body) {
  return privateApi.put(`/admin/users/${userId}`, body);
}

/**
 * 사용자 삭제 (또는 비활성 처리 — 백엔드 정책에 따름)
 * @param {number|string} userId
 */
export function deleteUser(userId) {
  return privateApi.delete(`/admin/users/${userId}`);
}

/**
 * 비밀번호 초기화
 * @param {number|string} userId
 * @param {{ newPassword: string }} [body]
 */
export function resetUserPassword(userId, body) {
  return privateApi.post(`/admin/users/${userId}/password-reset`, body ?? {});
}

// ---------------------------------------------------------------------------
// 권한 Role (tbl_role)
// ---------------------------------------------------------------------------

/**
 * 권한(Role) 목록 조회
 * @param {{ page?: number, size?: number, keyword?: string, searchField?: 'roleName'|'description' }} [params]
 */
export function fetchRolesAPI(params = {}) {
  return privateApi.get("/auth/roles", { params });
}

/**
 * 권한 생성
 * @param {{ roleName: string, description?: string }} body
 */
export function createRoleAPI(body) {
  return privateApi.post("/auth/roles", body);
}

/**
 * 권한 수정
 * @param {number|string} roleId
 * @param {{ roleName: string, description?: string }} body
 */
export function updateRoleAPI({roleId, ...body}) {
  return privateApi.put(`/auth/roles/${roleId}`, body);
}

/**
 * 권한 삭제
 * @param {number|string} roleId
 */
export function deleteRoleAPI(roleId) {
  return privateApi.delete(`/auth/roles/${roleId}`);
}

/**
 * 권한별 소속 사용자 목록 (UserRole 기준)
 * @param {number|string} roleId
 */
export function fetchUsersInRoleAPI(roleId) {
  return privateApi.get(`/auth/roles/${roleId}/users`);
}

/**
 * 권한에 사용자 매핑 추가
 * @param {number|string} roleId
 * @param {{ userId: number }} body
 */
export function addUserToRoleAPI(roleId, body) {
  return privateApi.post(`/auth/roles/${roleId}/users`, body);
}

/**
 * 권한에서 사용자 매핑 제거
 * @param {number|string} roleId
 * @param {number|string} userId
 */
export function removeUserFromRoleAPI(roleId, userId) {
  return privateApi.delete(`/auth/roles/${roleId}/users/${userId}`);
}


/**
 * 권한 단건 조회
 * @param {number|string} roleId
 */
export function fetchRoleById(roleId) {
  return privateApi.get(`/admin/roles/${roleId}`);
}



/**
 * 권한 삭제
 * @param {number|string} roleId
 */
export function deleteRole(roleId) {
  return privateApi.delete(`/admin/roles/${roleId}`);
}

// ---------------------------------------------------------------------------
// 사용자–권한 매핑 (UserRole, 선택)
// ---------------------------------------------------------------------------

/**
 * 특정 사용자의 역할 목록
 * @param {number|string} userId
 */
export function fetchUserRoles(userId) {
  return privateApi.get(`/admin/users/${userId}/roles`);
}

/**
 * 사용자에게 역할 부여 (매핑 행 생성)
 * @param {number|string} userId
 * @param {{ roleId: number }} body
 */
export function assignRoleToUser(userId, body) {
  return privateApi.post(`/admin/users/${userId}/roles`, body);
}

/**
 * 사용자 역할 매핑 해제
 * @param {number|string} userId
 * @param {number|string} roleId
 */
export function removeRoleFromUser(userId, roleId) {
  return privateApi.delete(`/admin/users/${userId}/roles/${roleId}`);
}

// ---------------------------------------------------------------------------
// 내 정보 (이미 AuthContext에서 쓰는 패턴과 맞출 수 있음)
// ---------------------------------------------------------------------------

export function fetchMe() {
  return privateApi.get("/auth/me");
}

// ---------------------------------------------------------------------------
// 그룹별 BMS 시스템 권한 (역할 → device-system 허용)
// ---------------------------------------------------------------------------

/** GET — ApiResponse.data 에 허용 systemId 목록 */
export function fetchRoleDeviceSystemPermissionsAPI(roleId) {
  return privateApi.get(`/device-system/roles/${roleId}/permissions`);
}

/** PUT — body: { systemIds: number[] } */
export function saveRoleDeviceSystemPermissionsAPI(roleId, body) {
  return privateApi.put(`/device-system/roles/${roleId}/permissions`, body);
}
