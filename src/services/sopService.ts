import { useQuery } from "@tanstack/react-query";
import privateApi from "./api";

/* ────────────────────────────────────────────────────────────────
 * SOP 동적 템플릿 v2 (SDUI) — API 클라이언트 + 타입
 *
 * 스펙: docs/architecture/2026-07-24-sop-template-spec-v2.md
 * Web은 "SOP 의미 모델(JSON)"만 만들고, Unity가 그 JSON을 렌더한다.
 * body = { version: 2, steps: [ STEP, STEP, ... ] } (nested tree)
 *   - root steps[] 원소는 전부 STEP 컨테이너 컴포넌트.
 *   - STEP = { componentType:"STEP", no, title, state, complete?, components:[] }
 *     자식(components) = leaf 5종(LABEL/COMPLETE_ACTION/BUTTON_GROUP/
 *     PHONE_CONTACT/NOTE) · group 노드(논리, 테두리 없음) · FRAME(시각 테두리 박스).
 *   - group/FRAME 는 서로 재귀 중첩 허용(leaf + group + FRAME). STEP 만 최상위 고정
 *     (STEP 중첩 ❌). 컨테이너 자식 = leaf | group | FRAME (SopNode 재귀).
 * ──────────────────────────────────────────────────────────────── */

/* ── ENUM (닫힌 집합, 서버 Java enum 과 1:1) ── */
export type Variant =
  | "PRIMARY"
  | "SUCCESS"
  | "DANGER"
  | "WARN"
  | "INFO"
  | "NEUTRAL";

/* 부수효과만 (흐름 제어 아님). 흐름/종료는 STEP.rules 로 이관되어 제거됨. */
export type ActionKind = "CALL" | "BROADCAST" | "MARK_COMPLETE" | "NONE";

export type StepState = "LOCKED" | "PENDING" | "SUCCESS" | "SKIPPED";
export type CompletionState = "PENDING" | "DONE";

export type ComponentType =
  | "STEP"
  | "LABEL"
  | "COMPLETE_ACTION"
  | "BUTTON_GROUP"
  | "PHONE_CONTACT"
  | "NOTE"
  | "GROUP"
  | "FRAME";

/* ── 서브객체 ── */
/* 부수효과 서술만. 흐름(다음 STEP) 은 STEP.rules 가 결정한다(action 아님). */
export interface SopAction {
  kind: ActionKind;
  payload?: Record<string, unknown>;
}

/* ── STEP 전이(흐름) 규칙 ──
 * 흐름은 버튼 action 이 아니라 STEP 최상위 `rules: NextRule[]` 가 결정한다.
 * 평가: when(id 배열) 이 전부 충족되는 첫 규칙 → next(STEP no) 로 이동.
 *       next 생략 = SOP 종료. 매칭 규칙 없으면 순번상 다음 STEP.
 * when 의 id = COMPLETE_ACTION.id ∪ BUTTON_GROUP 선택 옵션 id (스텝 내 유일). */
export interface NextRule {
  /** 충족돼야 하는 id 배열(AND). 전부 satisfied 여야 매칭. */
  when: string[];
  /** 이동 대상 STEP no. 생략 = SOP 종료. */
  next?: number | string;
}

/* ── 컴포넌트 노드 (leaf) ── */
export interface LabelComponent {
  componentType: "LABEL";
  id?: string;
  text: string;
}

export interface CompleteActionComponent {
  componentType: "COMPLETE_ACTION";
  id?: string;
  text: string;
  state?: CompletionState;
  action?: SopAction;
}

export interface ButtonOption {
  /** 선택 식별자. STEP.rules 의 when 매칭 기준. 생략 시 label 사용. */
  id?: string;
  label: string;
  variant: Variant;
  /** 선택적 부수효과만(흐름 아님). 흐름은 STEP.rules. */
  action?: SopAction;
}

export interface ButtonGroupComponent {
  componentType: "BUTTON_GROUP";
  id?: string;
  options: ButtonOption[];
}

export interface PhoneContactComponent {
  componentType: "PHONE_CONTACT";
  id?: string;
  orgName: string;
  phone: string;
  prefix?: string;
  action?: SopAction;
}

export interface NoteComponent {
  componentType: "NOTE";
  id?: string;
  text: string;
}

/** 콘텐츠 5종 leaf 컴포넌트 */
export type SopLeafComponent =
  | LabelComponent
  | CompleteActionComponent
  | ButtonGroupComponent
  | PhoneContactComponent
  | NoteComponent;

/* ── GROUP(논리 컨테이너 노드) ──
 * GROUP = 논리 그룹(Unity 자간용). 테두리 박스가 아니며, 미리보기에선 자식만 렌더
 * (시각 박스 없음). 시각 박스는 FRAME 이 담당한다. FRAME 과 동일 구조(componentType +
 * components) 이며 렌더만 다르다.
 * 자식(components) = leaf 5종 · GROUP · FRAME (재귀 중첩 허용, STEP ❌) */
export interface GroupComponent {
  componentType: "GROUP";
  id?: string;
  label?: string;
  components: SopNode[];
}

/* ── FRAME(시각 컨테이너 노드) ──
 * FRAME = 테두리 박스를 그리는 컨테이너 컴포넌트(componentType 을 가짐).
 * 자식(components) = leaf 5종 · GROUP · FRAME (재귀 중첩 허용, STEP ❌) */
export interface FrameComponent {
  componentType: "FRAME";
  id?: string;
  components: SopNode[];
}

/** STEP = 컨테이너 컴포넌트 (componentType:"STEP"). 자식들을 components 로 품음.
 * - root(body.steps)의 원소는 전부 STEP.
 * - STEP.components 자식 = leaf 5종 · group · FRAME. (STEP 안 STEP ❌, group/FRAME 재귀 중첩 ⭕)
 * - state/complete 는 게이팅(A)에 사용. */
export interface StepComponent {
  componentType: "STEP";
  id?: string;
  no: number;
  title: string;
  state?: StepState;
  complete?: { action: ActionKind };
  /** 이 STEP 완료 후 흐름(다음 STEP) 규칙. 생략/미매칭 시 순번상 다음 STEP. */
  rules?: NextRule[];
  components: SopNode[];
}

/** 트리 노드 = STEP(컨테이너) | leaf 5종 | GROUP 노드 | FRAME 노드 (children 재귀) */
export type SopNode =
  | StepComponent
  | SopLeafComponent
  | GroupComponent
  | FrameComponent;

/** PUT /body 로 저장되는 본문 = { version, steps:[ STEP... ] } */
export interface SopTemplateBody {
  version: number;
  steps: SopNode[];
}

/* ── 템플릿 DTO ── */
export interface SopTemplateSummary {
  templateId: number;
  templateCode: string;
  templateName: string;
  description?: string | null;
  active: boolean;
  title?: string | null;
  revision?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SopTemplateDetail extends SopTemplateSummary {
  body?: SopTemplateBody | null;
}

export interface CreateSopTemplateRequest {
  templateCode: string;
  templateName: string;
  description?: string;
  title?: string;
}

export interface UpdateSopTemplateRequest {
  templateName?: string;
  description?: string;
  title?: string;
  active?: boolean;
}

/* ── SOP 메타(enum/색 팔레트) — GET /api/sop/meta ──
 * 각 enum 은 { 값: 설명 } map. variant 는 { 값: hex } 색 팔레트 겸용
 * (미리보기 색 소스). (별도 variantColors map 은 폐기됨) */
export interface SopMeta {
  componentType: Record<string, string>;
  actionKind: Record<string, string>;
  /** Variant → hex 색상 팔레트 (미리보기 색 소스 + 설명 겸용) */
  variant: Record<string, string>;
  stepState: Record<string, string>;
  completionState: Record<string, string>;
}

/* ── react-query 키 ── */
export const SOP_TEMPLATES_QUERY_KEY = ["sop", "templates"] as const;
export const SOP_META_QUERY_KEY = ["sop", "meta"] as const;
export const sopTemplateKey = (templateId: number | string) =>
  ["sop", "templates", templateId] as const;

/* ── ApiResponse<T> = { data, ... } 언랩 ── */

/** GET /api/sop/meta — enum 목록 + Variant 색 팔레트(HEX). 서버 소유 값의 단일 출처. */
export async function getSopMeta(): Promise<SopMeta> {
  const { data } = await privateApi.get("/sop/meta");
  return data?.data ?? data;
}

/** @deprecated getSopMeta 사용 — 하위 호환 유지용 별칭 */
export const fetchSopMeta = getSopMeta;

/** SOP 메타 react-query 훅. 메타는 변화가 적어 오래 캐시한다. */
export function useSopMeta() {
  return useQuery({
    queryKey: SOP_META_QUERY_KEY,
    queryFn: getSopMeta,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });
}

/** 맵 → [값, 설명][] (선언 순서 보존) */
export function sopMetaEntries(
  map: Record<string, string> | undefined
): [string, string][] {
  return Object.entries(map ?? {});
}

/** GET /api/sop/templates?activeOnly=false */
export async function fetchSopTemplates(
  activeOnly = false
): Promise<SopTemplateSummary[]> {
  const { data } = await privateApi.get("/sop/templates", {
    params: { activeOnly },
  });
  return data?.data ?? [];
}

/** GET /api/sop/templates/{id} */
export async function fetchSopTemplate(
  templateId: number | string
): Promise<SopTemplateDetail | undefined> {
  const { data } = await privateApi.get(`/sop/templates/${templateId}`);
  return data?.data;
}

/** POST /api/sop/templates */
export async function createSopTemplate(
  body: CreateSopTemplateRequest
): Promise<SopTemplateSummary> {
  const { data } = await privateApi.post("/sop/templates", body);
  return data?.data ?? data;
}

/** PUT /api/sop/templates/{id} (메타 수정) */
export async function updateSopTemplate(
  templateId: number | string,
  body: UpdateSopTemplateRequest
): Promise<SopTemplateSummary> {
  const { data } = await privateApi.put(`/sop/templates/${templateId}`, body);
  return data?.data ?? data;
}

/** DELETE /api/sop/templates/{id} (soft delete → active=false) */
export async function deleteSopTemplate(
  templateId: number | string
): Promise<void> {
  await privateApi.delete(`/sop/templates/${templateId}`);
}

/** PUT /api/sop/templates/{id}/body — body = { version, steps:[STEP...] } */
export async function saveSopTemplateBody(
  templateId: number | string,
  body: SopTemplateBody
): Promise<SopTemplateDetail | undefined> {
  const { data } = await privateApi.put(
    `/sop/templates/${templateId}/body`,
    body
  );
  return data?.data;
}
