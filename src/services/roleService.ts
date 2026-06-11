import privateApi from "@/services/api";
// ---------------------------------------------------------------------------
// 권한 Role (tbl_role)
// ---------------------------------------------------------------------------

/** React Query — 권한 목록 (GET /api/roles) */
export const ROLES_LIST_QUERY_KEY = ["roles", "list"];

/**
 * 권한(Role) 목록 조회
 * @param {{ page?: number, size?: number, keyword?: string, searchField?: 'roleName'|'description' }} [params]
 */
export function fetchRolesAPI(params = {}) {
  return privateApi.get("/roles", { params });
}

/**
 * GET /api/roles — 목록을 UI용 { roleId, roleName }[] 로 정규화
 * (ApiResponse.data, Page.content, 또는 배열 직행 지원)
 * @returns {Promise<{ roleId: number; roleName: string }[]>}
 */
export async function fetchRolesList() {
  const res = await fetchRolesAPI({ size: 500 });
  const payload = res.data;
  const raw =
    payload?.data ??
    payload?.content ??
    (Array.isArray(payload) ? payload : []);

  if (!Array.isArray(raw)) return [];

  return raw
    .map((r) => {
      const roleId = Number(r.roleId ?? r.id);
      const roleName =
        String(r.roleName ?? r.name ?? "").trim() || "(이름 없음)";
      return {
        ...r,
        roleId,
        roleName,
      };
    })
    .filter((r) => !Number.isNaN(r.roleId));
}

/**
 * 권한 생성
 * @param {{ roleName: string, description?: string }} body
 */
export function createRoleAPI(body) {
  return privateApi.post("/roles", body);
}

/**
 * 권한 수정
 * @param {number|string} roleId
 * @param {{ roleName: string, description?: string }} body
 */
export function updateRoleAPI({roleId, ...body}) {
  return privateApi.put(`/roles/${roleId}`, body);
}

/**
 * 권한 삭제
 * @param {number|string} roleId
 */
export function deleteRoleAPI(roleId) {
  return privateApi.delete(`/roles/${roleId}`);
}

/**
 * 권한별 소속 사용자 목록 (UserRole 기준)
 * @param {number|string} roleId
 */
export function fetchUsersInRoleAPI(roleId) {
  return privateApi.get(`/roles/${roleId}/users`);
}

export function fetchUsersExceptRoleAPI(roleId, searchKey) {
  return privateApi.get(`/roles/${roleId}/users/exclude?search=${searchKey}`);
}

/**
 * 권한에 사용자 매핑 추가
 * @param {number|string} roleId
 * @param {{ userId: number }} body
 */
export function addUserToRoleAPI(roleId, userId) {
  console.log('fuck',roleId, userId)
  return privateApi.post(`/roles/${roleId}/users/${userId}`);
}

/**
 * 권한에서 사용자 매핑 제거
 * @param {number|string} roleId
 * @param {number|string} userId
 */
export function removeUserFromRoleAPI(roleId, userId) {
  return privateApi.delete(`/roles/${roleId}/users/${userId}`);
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
