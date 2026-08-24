import { useQuery } from "@tanstack/react-query";
import privateApi from "./api";
import type {
  AlarmConditionKind,
  AlarmEffect,
  AlarmLevelKey,
  AlarmOperator,
  AlarmScope,
  CctvSource,
} from "./alarmPolicyService";

/**
 * 알람 메타(AlarmMeta) API 클라이언트 — 서버 소유 enum 값 집합의 단일 출처.
 *
 * GET /api/alarm/meta → ApiResponse<AlarmMetaResponse>.
 * 각 필드는 {값: 설명} 맵이며 **선언 순서 보존**(JSON object key 순서 = 정렬 순서).
 * 프론트는 enum 값/라벨/순서를 하드코딩하지 않고 이 메타로 구동한다(드리프트 방지).
 * 색상 등 순수 UI 표현 토큰만 클라이언트가 소유한다(alarmPolicyConstants).
 */

/** {값: 설명} 맵. 선언 순서 = 정렬 순서. */
export type MetaMap<K extends string = string> = Record<K, string>;

export interface AlarmMeta {
  /** 범위 (CATEGORY/DEVICE) */
  scope: MetaMap<AlarmScope>;
  /** 심각도 레벨 (순서 = 오름차순 심각도) */
  level: MetaMap<AlarmLevelKey>;
  /** 비교 연산자 (값 = 비교 심볼) */
  operator: MetaMap<AlarmOperator>;
  /** 조건 종류 (THRESHOLD/TOGGLE) */
  conditionKind: MetaMap<AlarmConditionKind>;
  /** 레벨별 3D 이펙트 연출 (NONE/BLINK/COLOR_CHANGE/PULSE, enum name → 한글 설명) */
  effect: MetaMap<AlarmEffect>;
  /** 출력 채널 (대문자 키: NOTIFY/SOP/CCTV/SMS/BROADCAST/EMAIL …) */
  outputChannel: MetaMap;
  /** CCTV 소스 결정 방식 */
  cctvSource: MetaMap<CctvSource>;
}

export const ALARM_META_QUERY_KEY = ["alarm", "meta"] as const;

/** GET /api/alarm/meta → AlarmMetaResponse */
export async function getAlarmMeta(): Promise<AlarmMeta> {
  const { data } = await privateApi.get("/alarm/meta");
  if (!data?.success) throw new Error(data?.message || "알람 메타 조회 실패");
  return data.data;
}

/** 알람 메타 react-query 훅. 메타는 변화가 적어 오래 캐시한다. */
export function useAlarmMeta() {
  return useQuery({
    queryKey: ALARM_META_QUERY_KEY,
    queryFn: getAlarmMeta,
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

/** 설명에 "(준비중)" 이 포함되면 준비중 채널로 판단 */
export function isComingSoon(description: string | undefined): boolean {
  return !!description && description.includes("준비중");
}
