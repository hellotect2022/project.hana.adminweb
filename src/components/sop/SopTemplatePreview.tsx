import { useEffect, useMemo, useState, type ReactNode } from "react";
import styled from "styled-components";
import { useSopMeta } from "@/services/sopService";
import type {
  ButtonOption,
  FrameComponent,
  GroupComponent,
  SopLeafComponent,
  SopMeta,
  SopNode,
  SopTemplateBody,
  StepComponent,
  StepState,
  Variant,
} from "@/services/sopService";

/**
 * SOP 동적 템플릿 v2 미리보기 렌더러 (Unity SOP 패널 근사).
 *
 * docs/architecture/sop-template-preview.html (v2 nested · 게이팅) 의 렌더/게이팅
 * 로직을 React 로 이식.
 * - body = { version, steps:[ STEP, STEP, ... ] } (nested tree)
 *     · root steps[] 원소는 전부 STEP 컨테이너 컴포넌트.
 *     · STEP = { componentType:"STEP", no, title, state, complete?, components:[자식] }
 *     · STEP.components 자식 = leaf 5종 · group(논리, 테두리 없음) · FRAME(시각 테두리 박스).
 *     · group = 자식만 렌더(박스 없음, Unity 자간용) / FRAME = 테두리 박스 컨테이너.
 *     · group/FRAME 는 서로 재귀 중첩 허용(leaf + group + FRAME). STEP 만 최상위 고정
 *       (STEP 중첩 ❌). 렌더/게이팅 모두 컨테이너를 재귀 탐색한다.
 * - 게이팅: STEP 이 PENDING 이면 하위 항목 전부 클릭 가능(비활성화 없음).
 *     · 필수(체크 대상) = COMPLETE_ACTION + BUTTON_GROUP. 필수 전부 체크되면 다음 STEP.
 *     · COMPLETE_ACTION 완료 클릭 → 체크 토글.
 *     · BUTTON_GROUP 옵션 클릭 → 그 그룹 체크 + 선택 id 기록(흐름 라우팅) + 선택적 부수효과 로그.
 * - 전이(흐름): 버튼 action 이 아니라 STEP 최상위 rules[] 가 결정한다.
 *     · 충족 id 집합 = 체크된 COMPLETE_ACTION.id ∪ 선택된 BUTTON_GROUP 옵션 id (컨테이너 재귀).
 *     · rules 중 when(id 배열) 이 전부 충족되는 첫 규칙 → next(STEP no) 로 이동.
 *     · 규칙 next 생략 → SOP 종료. 매칭 규칙 없으면 순번상 다음 STEP.
 *     · 앞으로 점프 시 사이 STEP LOCKED→SKIPPED.
 * - check(체크)·chosen 은 런타임 STATE 에만 (템플릿 저장 ❌).
 * - StepState(LOCKED/PENDING/SUCCESS/SKIPPED) 시각화 / Variant 색 팔레트는
 *   서버 메타(GET /api/sop/meta)의 variant(HEX)로 구동. 클라 하드코딩 색/라벨 없음.
 */

interface RuntimeState {
  order: number[];
  stepState: Record<number, StepState>;
  completed: Record<string, boolean>;
  /** 컴포넌트 key → 선택된 BUTTON_GROUP 옵션 id (하이라이트 + 전이 충족 id) */
  chosen: Record<string, string>;
  focus: number | null;
}

interface LogEntry {
  time: string;
  kind: string;
  msg: string;
}

/* ── 노드 판별 (GROUP·FRAME 모두 componentType + components 동일 구조) ── */
const isGroupNode = (n: SopNode): n is GroupComponent =>
  !!n && (n as GroupComponent).componentType === "GROUP";
const isFrameNode = (n: SopNode): n is FrameComponent =>
  !!n && (n as FrameComponent).componentType === "FRAME";
const isStepNode = (n: SopNode): n is StepComponent =>
  !!n && (n as StepComponent).componentType === "STEP";
/* leaf(콘텐츠 5종)만 통과 — 컨테이너(STEP/GROUP/FRAME) 제외 */
const asLeaf = (n: SopNode): SopLeafComponent | null =>
  isStepNode(n) || isGroupNode(n) || isFrameNode(n)
    ? null
    : (n as SopLeafComponent);
const ctOf = (n: SopNode): string =>
  (n as { componentType?: string }).componentType || "";

/* ── key 계산 (HTML contKey 와 동일 규칙, path 접두 재귀) ──
 * GROUP 컨테이너 키 = prefix + "g" + (id|g{i}) / FRAME 컨테이너 키 = prefix + "f" + (id|f{i}).
 * STEP 시작 prefix = "s"+no. leaf 키 = prefix + "i" + i. */
const contKey = (prefix: string, n: SopNode, i: number): string =>
  isGroupNode(n)
    ? prefix + "g" + ((n as GroupComponent).id || "g" + i)
    : prefix + "f" + ((n as FrameComponent).id || "f" + i);
/* GROUP/FRAME 컨테이너의 자식 배열(둘 다 아니면 null) */
const childrenOf = (n: SopNode): SopNode[] | null =>
  isGroupNode(n) || isFrameNode(n)
    ? (n as GroupComponent | FrameComponent).components || []
    : null;

/* root steps[] 중 STEP 컨테이너만 추출 */
const stepsOf = (body: SopTemplateBody | null): StepComponent[] =>
  (body?.steps || []).filter(isStepNode);

/* 상태 시드. validStates = 서버 메타 stepState 키 집합(유효 상태 판별). */
function seedState(
  body: SopTemplateBody | null,
  validStates: Set<string>
): RuntimeState {
  const order: number[] = [];
  const stepState: Record<number, StepState> = {};
  stepsOf(body).forEach((s) => {
    order.push(s.no);
    stepState[s.no] =
      s.state && validStates.has(s.state) ? (s.state as StepState) : "LOCKED";
  });
  let focus: number | null =
    order.find((no) => stepState[no] === "PENDING") ?? null;
  if (focus == null) focus = order[0] ?? null;
  return { order, stepState, completed: {}, chosen: {}, focus };
}

/* 이 STEP 의 충족 id 집합 = 체크된 COMPLETE_ACTION.id ∪ 선택된 BUTTON_GROUP 옵션 id
 * (group/FRAME 컨테이너 재귀). STEP.rules 전이 평가 기준. HTML satisfiedIds 와 동일. */
function satisfiedIds(s: RuntimeState, step: StepComponent): Set<string> {
  const set = new Set<string>();
  const walk = (nodes: SopNode[], prefix: string) => {
    (nodes || []).forEach((c, i) => {
      const kids = childrenOf(c);
      if (kids) {
        walk(kids, contKey(prefix, c, i));
        return;
      }
      const key = prefix + "i" + i;
      const ct = ctOf(c);
      if (ct === "COMPLETE_ACTION") {
        const id = (c as { id?: string }).id;
        if (s.completed[key] && id != null) set.add(id);
      } else if (ct === "BUTTON_GROUP") {
        const oid = s.chosen[key];
        if (oid != null) set.add(oid);
      }
    });
  };
  walk(step.components || [], "s" + step.no);
  return set;
}

/* 이 STEP 의 필수(체크 대상) 컴포넌트 key 목록 = COMPLETE_ACTION + BUTTON_GROUP
 * (group/FRAME 중첩 재귀 — 깊게 중첩된 컨테이너 내부 필수 항목까지 집계).
 * HTML 원본 collectReq/reqKeys 규칙과 동일. */
const isReqType = (ct: string) =>
  ct === "COMPLETE_ACTION" || ct === "BUTTON_GROUP";
function collectReq(nodes: SopNode[], prefix: string, out: string[]): void {
  (nodes || []).forEach((c, i) => {
    const kids = childrenOf(c); // group 또는 FRAME 컨테이너 → 재귀
    if (kids) {
      collectReq(kids, contKey(prefix, c, i), out);
    } else if (!isStepNode(c) && isReqType(ctOf(c))) {
      out.push(prefix + "i" + i);
    }
  });
}
function reqKeys(step: StepComponent): string[] {
  const out: string[] = [];
  collectReq(step.components || [], "s" + step.no, out);
  return out;
}
/* STEP 의 필수 항목이 전부 체크됐는지 */
const stepComplete = (s: RuntimeState, step: StepComponent) =>
  reqKeys(step).every((k) => s.completed[k]);

const nextNo = (s: RuntimeState, no: number | null): number | null => {
  if (no == null) return null;
  const i = s.order.indexOf(no);
  return i >= 0 && i + 1 < s.order.length ? s.order[i + 1] : null;
};
const between = (s: RuntimeState, a: number, b: number): number[] => {
  const i = s.order.indexOf(a);
  const j = s.order.indexOf(b);
  return i < 0 || j < 0 ? [] : s.order.slice(i + 1, j);
};

interface PreviewProps {
  body: SopTemplateBody | null;
  parseError?: string | null;
  eventName?: string;
}

/**
 * SOP 미리보기 (wrapper) — 서버 메타(GET /api/sop/meta)를 소비해 렌더러에 주입.
 * 메타 로딩 전에는 placeholder 를 표시(알람 UI 와 동일 패턴). 색/enum 값의
 * 단일 출처는 서버 메타이며 클라 하드코딩 팔레트는 없다.
 */
const SopTemplatePreview = (props: PreviewProps) => {
  const { data: meta, isError } = useSopMeta();

  if (props.parseError) {
    return (
      <Wrap>
        <ParseError>{props.parseError}</ParseError>
      </Wrap>
    );
  }
  if (isError) {
    return (
      <Wrap>
        <Empty>SOP 메타 정보를 불러오지 못했습니다.</Empty>
      </Wrap>
    );
  }
  if (!meta) {
    return (
      <Wrap>
        <Empty>불러오는 중…</Empty>
      </Wrap>
    );
  }
  return <SopTemplatePreviewInner {...props} meta={meta} />;
};

const SopTemplatePreviewInner = ({
  body,
  parseError = null,
  eventName,
  meta,
}: PreviewProps & { meta: SopMeta }) => {
  // 서버 메타 variant(HEX) → 렌더 팔레트. 클라 하드코딩 없음.
  const palette = useMemo<Record<Variant, string>>(
    () => ({ ...(meta.variant as Record<Variant, string>) }),
    [meta]
  );
  // 유효 stepState 집합(메타 키)
  const validStates = useMemo(
    () => new Set(Object.keys(meta.stepState)),
    [meta]
  );

  const [state, setState] = useState<RuntimeState>(() =>
    seedState(body, validStates)
  );
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // body 변경 시 상태 재시드
  useEffect(() => {
    setState(seedState(body, validStates));
    setLogs([]);
  }, [body, validStates]);

  const steps = useMemo<StepComponent[]>(() => stepsOf(body), [body]);

  if (parseError) {
    return (
      <Wrap>
        <ParseError>{parseError}</ParseError>
      </Wrap>
    );
  }

  if (!body || !Array.isArray(body.steps)) {
    return (
      <Wrap>
        <Empty>steps 배열이 없습니다.</Empty>
      </Wrap>
    );
  }

  const pushLog = (kind: string, msg: string) => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    const time = [d.getHours(), d.getMinutes(), d.getSeconds()].map(p).join(":");
    setLogs((prev) => [{ time, kind, msg }, ...prev]);
  };

  /* ── 전이 (setState 내부에서 s 를 직접 변형) ── */
  const cloneState = (prev: RuntimeState): RuntimeState => ({
    ...prev,
    stepState: { ...prev.stepState },
    completed: { ...prev.completed },
    chosen: { ...prev.chosen },
  });
  const pad = (n: number) => String(n).padStart(2, "0");
  const completeStep = (s: RuntimeState, no: number | null) => {
    if (no != null) s.stepState[no] = "SUCCESS";
  };
  const openStep = (s: RuntimeState, no: number | null) => {
    if (no != null && s.stepState[no] !== "SUCCESS") {
      s.stepState[no] = "PENDING";
      s.focus = no;
    }
  };
  const advanceNext = (s: RuntimeState, step: StepComponent) => {
    completeStep(s, step.no);
    openStep(s, nextNo(s, step.no));
  };

  /* STEP.rules 평가: when(id 배열) 이 전부 충족되는 첫 규칙 → next(STEP no).
   * next 생략 → "END"(종료). 매칭 규칙 없으면 null(순번 다음). HTML resolveNext 와 동일. */
  const resolveNext = (
    s: RuntimeState,
    step: StepComponent
  ): number | "END" | null => {
    const rules = step.rules;
    if (Array.isArray(rules)) {
      const sat = satisfiedIds(s, step);
      const rule = rules.find(
        (r) =>
          Array.isArray(r.when) &&
          r.when.length > 0 &&
          r.when.every((id) => sat.has(id))
      );
      if (rule) return rule.next != null ? Number(rule.next) : "END";
    }
    return null; // 순번상 다음
  };

  /* 전이 실행 (STEP.rules 결과 적용). HTML advanceVia 와 동일. */
  const advanceVia = (s: RuntimeState, step: StepComponent) => {
    const t = resolveNext(s, step);
    if (t === "END") {
      completeStep(s, step.no);
      pushLog("END", "종료(규칙 next 없음)");
      return;
    }
    if (t == null) {
      advanceNext(s, step);
      pushLog("ADVANCE", "STEP " + pad(step.no) + " → 다음(순번)");
      return;
    }
    const ti = Number(t);
    completeStep(s, step.no);
    between(s, step.no, ti).forEach((n) => {
      if (s.stepState[n] === "LOCKED") s.stepState[n] = "SKIPPED";
    });
    openStep(s, ti);
    pushLog("ADVANCE", "→ STEP " + pad(ti) + " (사이 SKIPPED)");
  };

  /* 필수 항목 전부 체크되면 STEP.rules 로 전이. HTML tryAdvance 와 동일. */
  const tryAdvance = (s: RuntimeState, step: StepComponent) => {
    if (s.stepState[step.no] !== "PENDING" || !stepComplete(s, step)) return;
    advanceVia(s, step);
  };

  /* COMPLETE_ACTION 체크 토글 (비활성화 없음, 아무때나) */
  const toggleComplete = (step: StepComponent, key: string, kind: string) => {
    setState((prev) => {
      const s = cloneState(prev);
      s.completed[key] = !s.completed[key];
      pushLog(kind || "MARK_COMPLETE", s.completed[key] ? "체크" : "해제");
      tryAdvance(s, step);
      return s;
    });
  };

  /* BUTTON_GROUP 옵션 선택 — 흐름은 STEP.rules 가 결정, 버튼은 선택(id)만 + 선택적 부수효과 */
  const clickButton = (step: StepComponent, key: string, opt: ButtonOption) => {
    setState((prev) => {
      const s = cloneState(prev);
      const oid = opt.id != null ? opt.id : opt.label;
      s.completed[key] = true; // 버튼그룹 체크됨
      s.chosen[key] = oid; // 하이라이트 + 전이 충족 id
      const a = opt.action;
      if (a && a.kind && a.kind !== "NONE")
        pushLog(a.kind, "'" + opt.label + "' 부수효과");
      pushLog("SELECT", "'" + opt.label + "' 선택");
      tryAdvance(s, step);
      return s;
    });
  };

  /* ── 렌더 (현재 state 기준) ── */
  const renderComponent = (
    c: SopLeafComponent,
    step: StepComponent,
    key: string
  ) => {
    const active = state.stepState[step.no] === "PENDING";
    switch (c.componentType) {
      case "LABEL":
        return (
          <Lbl key={key}>
            <Mk>⊙</Mk> {c.text}
          </Lbl>
        );
      case "NOTE":
        return <Note key={key}>{c.text}</Note>;
      case "PHONE_CONTACT": {
        const num =
          (c.action?.payload && (c.action.payload as any).number) ||
          c.phone ||
          "";
        return (
          <Phone
            key={key}
            onClick={() => {
              if (active) pushLog("CALL", "전화 연결 · " + num);
            }}
          >
            {c.prefix ? <Pre>{c.prefix}</Pre> : null}
            <Org>{c.orgName}</Org>
            <Ico>☎</Ico>
            <Num>{num}</Num>
          </Phone>
        );
      }
      case "COMPLETE_ACTION": {
        const done = !!state.completed[key];
        return (
          <Row key={key} className="between">
            <Lbl>
              <Mk>⊙</Mk> {c.text}
            </Lbl>
            <Pill
              type="button"
              $done={done}
              $neutral={palette.NEUTRAL}
              onClick={
                active
                  ? () =>
                      toggleComplete(
                        step,
                        key,
                        (c.action && c.action.kind) || "MARK_COMPLETE"
                      )
                  : undefined
              }
            >
              완료
            </Pill>
          </Row>
        );
      }
      case "BUTTON_GROUP": {
        // 항상 활성(비활성화 없음). PENDING STEP 에서만 클릭 동작.
        return (
          <BtnGroup key={key}>
            {(c.options || []).map((o, oi) => {
              const oid = o.id != null ? o.id : o.label;
              const chosen = state.chosen[key] === oid;
              return (
                <Btn
                  key={o.id ?? oi}
                  type="button"
                  $bg={palette[o.variant] || palette.NEUTRAL}
                  $chosen={chosen}
                  onClick={active ? () => clickButton(step, key, o) : undefined}
                >
                  {o.label}
                </Btn>
              );
            })}
          </BtnGroup>
        );
      }
      default:
        return (
          <Note key={key}>
            알 수 없는 componentType: {(c as any).componentType}
          </Note>
        );
    }
  };

  /* 컨테이너/leaf 재귀 렌더 (HTML renderNodes 동일).
   * group = 논리 그룹(테두리 없음, group-wrap) / FRAME = 테두리 박스(frame-box).
   * 둘 다 중첩 시 재귀 렌더. 빈 컨테이너(자식 0)는 렌더하지 않음. */
  const renderNodes = (
    nodes: SopNode[],
    step: StepComponent,
    prefix: string
  ): ReactNode[] => {
    const out: ReactNode[] = [];
    (nodes || []).forEach((c, i) => {
      if (isStepNode(c)) return; // STEP 중첩 미허용
      if (isGroupNode(c)) {
        const key = contKey(prefix, c, i);
        const children = renderNodes(c.components || [], step, key);
        if (children.length > 0) out.push(<GroupWrap key={key}>{children}</GroupWrap>);
      } else if (isFrameNode(c)) {
        const key = contKey(prefix, c, i);
        const children = renderNodes(c.components || [], step, key);
        if (children.length > 0) out.push(<FrameBox key={key}>{children}</FrameBox>);
      } else {
        const leaf = asLeaf(c);
        if (leaf) out.push(renderComponent(leaf, step, prefix + "i" + i));
      }
    });
    return out;
  };

  const renderStep = (step: StepComponent, si: number) => {
    const st: StepState = state.stepState[step.no] || "LOCKED";
    const stLower = st.toLowerCase();
    return (
      <SectionBox key={si} className={stLower}>
        <StepHead className={stLower}>
          <StepBadge className={stLower} $success={palette.SUCCESS}>
            STEP {String(step.no).padStart(2, "0")}
            {st === "SUCCESS" ? " ✓" : st === "SKIPPED" ? " ⤼" : ""}
          </StepBadge>
          <StepTitle>{step.title}</StepTitle>
          {st === "SKIPPED" ? (
            <SkipTag>건너뜀</SkipTag>
          ) : st === "LOCKED" ? (
            <LockIco>🔒</LockIco>
          ) : step.complete ? (
            <Pill
              type="button"
              $done={st === "SUCCESS"}
              $neutral={palette.NEUTRAL}
              onClick={
                st === "PENDING"
                  ? () => {
                      setState((prev) => {
                        const s = cloneState(prev);
                        advanceVia(s, step);
                        return s;
                      });
                    }
                  : undefined
              }
            >
              완료
            </Pill>
          ) : null}
        </StepHead>
        <StepBody>{renderNodes(step.components || [], step, "s" + step.no)}</StepBody>
      </SectionBox>
    );
  };

  return (
    <Wrap>
      <Toolbar>
        <ResetBtn
          type="button"
          onClick={() => {
            setState(seedState(body, validStates));
            setLogs([]);
          }}
        >
          ↺ 상태 초기화
        </ResetBtn>
        <ToolHint>
          미리보기 · 하위 항목 전부 클릭 가능 · 필수(완료+선택) 전부 체크 시 다음 STEP
        </ToolHint>
      </Toolbar>
      <PreviewArea>
        <Sop>
          <SopTitlebar>
            <span>SOP 이벤트명</span>
            <Sep>|</Sep>
            <span>{eventName || ""}</span>
          </SopTitlebar>
          {steps.length === 0 ? (
            <Empty>STEP 이 없습니다.</Empty>
          ) : (
            steps.map((step, si) => renderStep(step, si))
          )}
        </Sop>
      </PreviewArea>
      <LogBox>
        <LogHead>이벤트 로그 (dispatch)</LogHead>
        {logs.map((l, i) => (
          <LogLine key={i}>
            <LogT>{l.time}</LogT> <LogK>{l.kind}</LogK> {l.msg}
          </LogLine>
        ))}
      </LogBox>
    </Wrap>
  );
};

export default SopTemplatePreview;

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
`;
const ResetBtn = styled.button`
  background: #232c3d;
  color: #cfd6e2;
  border: 1px solid #33405a;
  border-radius: 6px;
  font-size: 12px;
  padding: 5px 11px;
  cursor: pointer;
  &:hover {
    background: #2b3750;
  }
`;
const ToolHint = styled.span`
  font-size: 12px;
  color: #6b7482;
`;

const PreviewArea = styled.div`
  background: #0d1017;
  border-radius: 10px;
  padding: 18px;
  overflow: auto;
`;

const Sop = styled.div`
  max-width: 390px;
  margin: 0 auto;
  background: #141a26;
  border: 1px solid #212a3b;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
  color: #e8edf5;
  font-family: "Segoe UI", "Malgun Gothic", system-ui, sans-serif;
`;

const SopTitlebar = styled.div`
  padding: 13px 16px;
  font-size: 15px;
  font-weight: 700;
  border-bottom: 1px solid #212a3b;
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(180deg, #1a2233, #141a26);
  &::before {
    content: "";
    width: 3px;
    height: 16px;
    background: #c8412c;
    border-radius: 2px;
  }
`;
const Sep = styled.span`
  color: #6b7482;
  font-weight: 400;
`;

const SectionBox = styled.div`
  padding: 0 0 12px;
  transition: opacity 0.25s;
  &.locked {
    opacity: 0.34;
    pointer-events: none;
    filter: grayscale(0.3);
  }
  &.skipped {
    opacity: 0.42;
    pointer-events: none;
  }
`;

const StepHead = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 14px 12px 10px;
  padding: 9px 12px;
  border-radius: 7px;
  background: linear-gradient(180deg, #26324f, #1d273f);
  border-left: 3px solid transparent;
  &.pending {
    border-left-color: #c8412c;
  }
`;
const StepBadge = styled.span<{ $success: string }>`
  background: #3557a6;
  color: #fff;
  font-size: 11.5px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 5px;
  white-space: nowrap;
  letter-spacing: 0.4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  &.success {
    background: ${(p) => p.$success};
  }
  &.skipped {
    background: #565d70;
  }
`;
const StepTitle = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #eef2f8;
  flex: 1;
  line-height: 1.3;
`;
const SkipTag = styled.span`
  font-size: 10px;
  color: #b6bccb;
  border: 1px solid #4a5266;
  border-radius: 4px;
  padding: 1px 6px;
  white-space: nowrap;
`;
const LockIco = styled.span`
  color: #6b7482;
  font-size: 12px;
`;
const StepBody = styled.div`
  padding: 0 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Lbl = styled.div`
  font-size: 13px;
  color: #d5dbe6;
  display: flex;
  align-items: center;
  gap: 6px;
`;
const Mk = styled.span`
  color: #7f8a9c;
`;
const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  &.between {
    justify-content: space-between;
  }
`;

const BtnGroup = styled.div`
  display: flex;
  flex-direction: row;
  gap: 8px;
  flex-wrap: wrap;
`;
const Btn = styled.button<{ $bg: string; $chosen: boolean }>`
  border: 0;
  border-radius: 7px;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  padding: 0 12px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  justify-content: center;
  min-width: 96px;
  transition: filter 0.12s, transform 0.05s;
  background: ${(p) => p.$bg};
  outline: ${(p) => (p.$chosen ? "2px solid #fff" : "none")};
  outline-offset: 1px;
  &:hover {
    filter: brightness(1.12);
  }
  &:active {
    transform: translateY(1px);
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    filter: grayscale(0.4);
  }
  &:disabled:hover {
    filter: grayscale(0.4);
  }
`;
const Pill = styled.button<{ $done: boolean; $neutral: string }>`
  font-size: 12px;
  font-weight: 600;
  padding: 6px 16px;
  border-radius: 6px;
  white-space: nowrap;
  cursor: pointer;
  border: 0;
  transition: filter 0.12s;
  background: ${(p) => (p.$done ? "#eef1f5" : p.$neutral)};
  color: ${(p) => (p.$done ? "#1a2233" : "#c3cad6")};
  &:hover {
    filter: brightness(1.15);
  }
`;

const Phone = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  color: #cbd2de;
  cursor: pointer;
  &:hover span:last-child {
    text-decoration: underline;
  }
`;
const Pre = styled.span`
  color: #6b7482;
`;
const Org = styled.span`
  color: #d5dbe6;
`;
const Ico = styled.span`
  color: #e0574b;
`;
const Num = styled.span`
  color: #e8edf5;
  letter-spacing: 0.3px;
`;

const Note = styled.div`
  font-size: 13px;
  color: #9aa6b8;
`;

/* FRAME = 테두리 박스 컴포넌트(시각) */
const FrameBox = styled.div`
  border: 1px solid #384662;
  border-radius: 8px;
  padding: 11px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: rgba(255, 255, 255, 0.015);
`;
/* group = 논리 그룹(테두리 없음, Unity 자간용) */
const GroupWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const LogBox = styled.div`
  margin-top: 12px;
  max-height: 140px;
  border: 1px solid #232a38;
  border-radius: 8px;
  background: #0c1119;
  overflow: auto;
  padding: 8px 12px;
  font-family: "Cascadia Code", "Consolas", monospace;
  font-size: 11.5px;
`;
const LogHead = styled.div`
  color: #6b7482;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 10px;
  margin-bottom: 4px;
`;
const LogLine = styled.div`
  color: #a7d7c0;
  padding: 1px 0;
`;
const LogT = styled.span`
  color: #6b7482;
`;
const LogK = styled.span`
  color: #e0b45a;
`;

const ParseError = styled.div`
  padding: 16px;
  background: #fef2f2;
  color: #991b1b;
  border-radius: 8px;
`;
const Empty = styled.div`
  padding: 40px;
  text-align: center;
  color: #64748b;
  background: #f8fafc;
  border-radius: 8px;
`;
