import axios from "axios";
import {
  createApiError,
  extractApiError,
  notifyApiError,
} from "@/utils/apiErrorModalBridge";
import { notifyLoadingEnd, notifyLoadingStart } from "@/utils/globalLoadingBridge";

// 환경변수를 통한 base_url 설정
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
//const API_BASE_URL  = "http://192.168.10.218:8083/api"

// 1. 인증이 필요 없는 공통 인스턴스 (로그인, 회원가입 등)
export const publicApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
        'Content-Type' : 'application/json'
    }
});

// 2. 인증이 필요한 인스턴스 (내 정보, 게시글 작성 등)
const privateApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
        'Content-Type' : 'application/json'
    }
});

function handleApiResponseSuccess(response) {
  if (response.config?.skipApiErrorModal) return response;

  const apiError = extractApiError(response.data);
  if (apiError) {
    notifyApiError(apiError);
    return Promise.reject(createApiError(apiError));
  }
  return response;
}

function handleApiResponseError(error) {
  if (!error.config?.skipApiErrorModal) {
    const apiError = extractApiError(error.response?.data);
    if (apiError) notifyApiError(apiError);
  }
  return Promise.reject(error);
}

function attachApiErrorInterceptors(instance) {
  instance.interceptors.response.use(handleApiResponseSuccess, handleApiResponseError);
}

function attachGlobalLoadingInterceptors(instance) {
  instance.interceptors.request.use((config) => {
    if (!config.skipGlobalLoading) {
      notifyLoadingStart();
    }
    return config;
  });
  instance.interceptors.response.use(
    (response) => {
      if (!response.config?.skipGlobalLoading) {
        notifyLoadingEnd();
      }
      return response;
    },
    (error) => {
      if (!error.config?.skipGlobalLoading) {
        notifyLoadingEnd();
      }
      return Promise.reject(error);
    }
  );
}

// privateApi에만 인터셉터 적용
privateApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

attachGlobalLoadingInterceptors(publicApi);
attachApiErrorInterceptors(publicApi);

// 응답 인터셉터: 401 에러 발생 시 토큰 갱신 시도 (api 에러 모달은 앞선 인터셉터에서 처리)
privateApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });

        const { accessToken } = res.data;
        localStorage.setItem('accessToken', accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return privateApi(originalRequest);
      } catch (refreshError) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

attachGlobalLoadingInterceptors(privateApi);
attachApiErrorInterceptors(privateApi);

export default privateApi;

// ========== 필요한 API (한글 정리) ==========
// 아래 URL 입력 장소에 연동할 API가 필요합니다.
//
// [사용자 관리] (Entity: User, UserRole, Role)
// - 사용자 등록: POST - body: loginId, username, password, email, active, roleIds[] (서버에서 passwordHash, active/accountNonLocked/failedLoginAttempts/lastPasswordChangeDate 등 처리)
// - 목록 조회: GET - query: page, size, keyword(로그인ID/이름) → User 목록 + 역할명
// - 정보 수정: GET 사용자 상세(+userRoles/roleId), PUT 사용자 수정 — username, email, active, accountNonLocked, failedLoginAttempts, roleIds[], password(선택 시 passwordHash 갱신 및 lastPasswordChangeDate는 서버 처리), updatedAt은 @PreUpdate
// - 비밀번호 초기화: POST - userId 또는 loginId → 초기 비밀번호 설정
// - 역할 목록: GET - Role 목록 (등록/수정 폼에서 역할 선택용)
//
// [권한 관리]
// - Role 마스터(tbl_role): GET 목록(검색), POST 등록(roleName unique, description), PUT 수정, DELETE 삭제 — /manage/group 화면
// - 사용자 그룹 관리(AuthGroupsPage 등): GET 그룹 목록(검색·페이징), POST 그룹 등록(groupName, description), PUT 그룹 수정, DELETE 그룹 삭제, (선택) 멤버 수 집계
// - 그룹별 메뉴 권한 설정: 그룹별 메뉴 권한 조회/저장 API
// - 그룹별 기능 권한 설정: 그룹별 기능 권한 조회/저장 API
//
// [메뉴 관리]
// - 표시 설정: 메뉴 표시 설정 조회/저장 API
// - 정보 수정: 메뉴 정보 조회/수정 API
//
// [이벤트 관리]
// - 유형 관리: 이벤트 유형 목록/등록/수정/삭제 API
// - 명칭 관리: 이벤트 명칭 목록/등록/수정/삭제 API
// - 임계값 설정: 임계값 조회/저장 API
// - 알림 설정: 알림 설정 조회/저장 API
//
// [로그 관리]
// - 접속 로그: 접속 로그 목록 조회 API
// - 사용 로그: 사용 로그 목록 조회 API
// - 운영 통계: 운영 통계 조회 API
//
// [시스템 관리]
// - 서버 관리 콘솔: 서버 상태/관리 API
// - 로그 보관 기간: 로그 보관 기간 조회/저장 API