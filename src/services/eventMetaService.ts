import { useQuery } from "@tanstack/react-query";
import privateApi from "./api";
import type {
  RuleConditionKind,
  EventEffect,
  EventLevelKey,
  RuleOperator,
  RuleScope,
  CctvSource,
  SuppressMode,
} from "./eventRuleService";

/**
 * 이벤트 메타(EventMeta) API 클라이언트 — 서버 소유 enum 값 집합의 단일 출처.
 *
 * GET /api/event/meta → ApiResponse<EventMetaResponse>.
 * 각 필드는 {값: 설명} 맵이며 **선언 순서 보존**(JSON object key 순서 = 정렬 순서).
 * 프론트는 enum 값/라벨/순서를 하드코딩하지 않고 이 메타로 구동한다(드리프트 방지).
 * 색상 등 순수 UI 표현 토큰만 클라이언트가 소유한다(eventRuleConstants).
 *
 * ⚠ 2026-09-04: 구 `outputChannel`(OutputChannel enum)은 삭제됐다. 출력 채널은
 *   `notificationChannel`(POPUP/SOP/CCTV/SMS/EMAIL/DEVICE_CONTROL) 하나로 일원화된다.
 */

/** {값: 설명} 맵. 선언 순서 = 정렬 순서. */
export type MetaMap<K extends string = string> = Record<K, string>;

export interface EventMeta {
  /** 범위 (CATEGORY/DEVICE) */
  scope: MetaMap<RuleScope>;
  /** 심각도 레벨 (순서 = 오름차순 심각도) */
  level: MetaMap<EventLevelKey>;
  /** 비교 연산자 (값 = 비교 심볼) */
  operator: MetaMap<RuleOperator>;
  /** 조건 종류 (THRESHOLD/TOGGLE) */
  conditionKind: MetaMap<RuleConditionKind>;
  /** 레벨별 3D 이펙트 연출 (NONE/BLINK/COLOR_CHANGE/PULSE, enum name → 한글 설명) */
  effect: MetaMap<EventEffect>;
  /** CCTV 소스 결정 방식 */
  cctvSource: MetaMap<CctvSource>;
  /** 출력 채널 (UPPER_SNAKE 키: POPUP/SOP/CCTV/SMS/EMAIL/DEVICE_CONTROL) */
  notificationChannel: MetaMap;
  /** 채널별 액션 진행 상태 (PENDING/SENT/IN_PROGRESS/DONE/FAILED/SKIPPED) */
  actionStatus: MetaMap;
  /** 이벤트 파생 상태 (ACTIVE_UNACK/ACTIVE_ACK/CLEARED_UNACK/CLOSED) */
  eventStatus: MetaMap;
  /** 해소 후 재발생 억제 범위 (WHILE_ACTIVE/UNTIL_ACKED) */
  suppressMode: MetaMap<SuppressMode>;
}

export const EVENT_META_QUERY_KEY = ["event", "meta"] as const;

/** GET /api/event/meta → EventMetaResponse */
export async function getEventMeta(): Promise<EventMeta> {
  const { data } = await privateApi.get("/event/meta");
  if (!data?.success) throw new Error(data?.message || "이벤트 메타 조회 실패");
  return data.data;
}

/** 이벤트 메타 react-query 훅. 메타는 변화가 적어 오래 캐시한다. */
export function useEventMeta() {
  return useQuery({
    queryKey: EVENT_META_QUERY_KEY,
    queryFn: getEventMeta,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });
}

/** 맵 → [값, 설명][] (선언 순서 보존) */
export function metaEntries<K extends string>(map: MetaMap<K>): [K, string][] {
  return Object.entries(map ?? {}) as [K, string][];
}

/** 맵 키 배열 (선언 순서 보존) */
export function metaKeys<K extends string>(map: MetaMap<K>): K[] {
  return Object.keys(map ?? {}) as K[];
}
