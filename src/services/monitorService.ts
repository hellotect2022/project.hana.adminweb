import type { AxiosRequestConfig } from "axios";
import privateApi from "./api";

/**
 * 서버 관리 콘솔 – 서비스 통합 모니터링 API 클라이언트.
 *
 * 백엔드 계약: GET /api/monitor/status → ApiResponse<MonitorSnapshot> (ADMIN JWT 필요)
 * - 사용률(processCpuLoad/systemCpuLoad/diskUsage 및 힙 비율)은 0.0~1.0 분수 → 화면에서 ×100 표기.
 * - 측정 불가 값은 -1.0.
 * - 힙 사용률은 호스트 물리메모리가 아니라 JVM 힙 사용률(heapUsedBytes/heapMaxBytes)이다.
 * - 상단 카드는 host 요약이 아니라 인프라 의존처(DB/Kafka 등) 도달성(dependencies)으로 대체됐다.
 * - LiveStatus 는 "UP" | "DOWN" | "UNKNOWN".
 */

/**
 * @typedef {"UP" | "DOWN" | "UNKNOWN"} LiveStatus
 */

/**
 * JVM/프로세스 리소스 사용량.
 * @typedef {Object} ResourceUsage
 * @property {number} heapUsedBytes   사용 힙 바이트
 * @property {number} heapMaxBytes    최대 힙 바이트
 * @property {number} processCpuLoad  프로세스 CPU 0.0~1.0, 측정 불가 시 -1.0
 * @property {number} systemCpuLoad   시스템 CPU 0.0~1.0, 측정 불가 시 -1.0
 * @property {number} threadCount     현재 스레드 수
 * @property {number} uptimeMs        JVM 가동 시간(ms)
 * @property {number} diskUsage       디스크 사용률 0.0~1.0, 측정 불가 시 -1.0
 */

/**
 * 단일 서비스 모니터링 결과.
 * @typedef {Object} ServiceMonitor
 * @property {string} service                서비스명 (예: hana-event)
 * @property {LiveStatus} status             생존 상태
 * @property {number | null} responseTimeMs  health 응답 시간(ms), 미응답이면 null
 * @property {ResourceUsage | null} resource 리소스 사용량, 수집 실패 시 null
 * @property {string | null} detail          비고/에러 메시지 등 optional
 * @property {number | null} pid             프로세스 PID, 수집 실패 시 null
 * @property {string | null} startedAt       프로세스 시작 시각(ISO), 수집 실패 시 null
 */

/**
 * 인프라 의존처 도달성 상태(상단 카드용).
 * DB/Kafka 등 외부 의존처는 리소스를 수집하지 않고 도달성(status)만 표시한다.
 * @typedef {Object} DependencyStatus
 * @property {string} name       의존처 이름 (예: "DB", "Kafka")
 * @property {string} target     대상 주소 "host:port"
 * @property {LiveStatus} status 도달성 상태 (UP/DOWN/UNKNOWN)
 */

/**
 * 서비스 통합 모니터링 스냅샷.
 * @typedef {Object} MonitorSnapshot
 * @property {string} timestamp                  스냅샷 시각(ISO)
 * @property {ServiceMonitor[]} services         서비스별 모니터링 결과 목록
 * @property {DependencyStatus[]} dependencies   인프라 의존처 도달성 목록(상단 카드)
 */

/**
 * ApiResponse 래핑(`{ data: ... }`)을 안전하게 벗겨낸다.
 * @param {import("axios").AxiosResponse} res
 */
function unwrapData(res) {
  const body = res?.data;
  if (!body || typeof body !== "object") return undefined;
  if ("data" in body && body.data !== undefined) return body.data;
  return body;
}

/** react-query 캐시 키 */
export const MONITOR_STATUS_QUERY_KEY = ["system", "monitor", "status"];

/**
 * GET /api/monitor/status
 *
 * ADMIN 권한이 없으면 403 이 반환된다. 이 화면은 403 을 인라인 안내로
 * 직접 처리하므로 전역 에러 모달을 건너뛴다(skipApiErrorModal).
 *
 * @returns {Promise<MonitorSnapshot | undefined>}
 */
export async function fetchMonitorStatusAPI() {
  // skipApiErrorModal / skipGlobalLoading 은 api.ts 인터셉터가 읽는 커스텀 플래그로,
  // 표준 AxiosRequestConfig 타입에는 없어 캐스팅으로 전달한다.
  const config = {
    skipApiErrorModal: true,
    skipGlobalLoading: true,
  } as AxiosRequestConfig;
  const res = await privateApi.get("/monitor/status", config);
  console.log('fukc',res)
  return unwrapData(res);
}
