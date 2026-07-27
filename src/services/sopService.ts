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

/* 부수효과만 (흐름 제어 아님). GOTO_STEP·CLOSE 는 STEP.next 로 이관되어 제거됨. */
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
  | "FRAME";

/* ── 서브객체 ── */
/* 부수효과 서술만. 흐름(다음 STEP) 은 STEP.next 가 결정한다(action 아님). */
export interface SopAction {
  kind: ActionKind;
  payload?: Record<string, unknown>;
}

/* ── STEP 전이(흐름) 정의 ──
 * 흐름은 버튼 action 이 아니라 STEP.next 가 결정한다.
 * 평가: rules(선택 버튼 id 매칭) 첫 매칭 → default → (둘 다 없으면 순번상 다음).
 * goto/default 값이 "CLOSE" 면 즉시 종료, 정수면 그 STEP(앞으로 점프 시 사이 SKIPPED). */
export interface SopNextRule {
  /** 선택된 버튼 id 와 매칭 */
  when: string;
  goto: number | "CLOSE";
}
export interface SopNext {
  default?: number | "CLOSE";
  rules?: SopNextRule[];
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
  /** 선택 식별자. STEP.next.rules 의 when 매칭 기준. 생략 시 label 사용. */
  id?: string;
  label: string;
  variant: Variant;
  /** 선택적 부수효과만(흐름 아님). 흐름은 STEP.next. */
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

/* ── 그룹(논리 컨테이너 노드) ──
 * group = 논리 그룹 키(Unity 자간용). 테두리 박스가 아니며, 미리보기에선
 * 자식만 렌더(시각 박스 없음). 시각 박스는 FRAME 이 담당한다.
 * 자식(components) = leaf 5종 · group · FRAME (재귀 중첩 허용, STEP ❌) */
export interface SopGroup {
  id: string;
  label?: string;
  components: SopNode[];
}
export interface SopGroupNode {
  group: SopGroup;
}

/* ── FRAME(시각 컨테이너 노드) ──
 * FRAME = 테두리 박스를 그리는 컨테이너 컴포넌트(componentType 을 가짐).
 * group 이 그리던 박스를 이제 FRAME 이 담당한다.
 * 자식(components) = leaf 5종 · group · FRAME (재귀 중첩 허용, STEP ❌) */
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
  /** 이 STEP 완료 후 흐름(다음 STEP) 정의. 생략 시 순번상 다음 STEP. */
  next?: SopNext;
  components: SopNode[];
}

/** 트리 노드 = STEP(컨테이너) | leaf 5종 | group 노드 | FRAME 노드 (children 재귀) */
export type SopNode =
  | StepComponent
  | SopLeafComponent
  | SopGroupNode
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

/** GET /api/sop/meta — enum 목록 + Variant 색 팔레트 */
export async function fetchSopMeta(): Promise<SopMeta> {
  const { data } = await privateApi.get("/sop/meta");
  return data?.data ?? data;
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
