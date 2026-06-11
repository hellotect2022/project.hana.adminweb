import { useState } from "react";
import styled from "styled-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import { useModal } from "@/contexts/ModalContext";
import {
  createEventRuleAPI,
  deleteEventRuleAPI,
  EVENT_RULES_QUERY_KEY,
  fetchEventRulesAPI,
  toggleEventRuleActiveAPI,
  updateEventRuleAPI,
} from "@/services/eventService";
import { fetchSopTemplates } from "@/services/sopService";
import {
  ACTION_CONFIG,
  emptyCondition,
  emptyRule,
  OPERATORS,
  SEVERITY_CONFIG,
  summarizeConditions,
} from "./eventRuleConstants";

const SeverityBadge = ({ severity }) => {
  const cfg = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.WARNING;
  return (
    <SBadge style={{ background: cfg.bg, color: cfg.color }}>
      <SDot style={{ background: cfg.dot }} />
      {cfg.label}
    </SBadge>
  );
};

/** 공통 Modal 본문 — 규칙 추가/편집 폼 */
const RuleEditorForm = ({ rule: initialRule, onClose, onSave }) => {
  const [rule, setRule] = useState(() =>
    initialRule
      ? { ...initialRule, conditions: initialRule.conditions ?? [emptyCondition()] }
      : emptyRule()
  );

  const { data: sopTemplates = [] } = useQuery({
    queryKey: ["sop", "templates", "active"],
    queryFn: () => fetchSopTemplates(true),
  });

  const setField = (field, value) => setRule((p) => ({ ...p, [field]: value }));

  const updateCondition = (idx, field, value) =>
    setRule((p) => {
      const conditions = [...p.conditions];
      conditions[idx] = { ...conditions[idx], [field]: value };
      return { ...p, conditions };
    });

  const addCondition = () =>
    setRule((p) => ({ ...p, conditions: [...p.conditions, emptyCondition()] }));

  const removeCondition = (idx) =>
    setRule((p) => ({ ...p, conditions: p.conditions.filter((_, i) => i !== idx) }));

  const toggleAction = (type) =>
    setRule((p) => ({
      ...p,
      actions: p.actions.includes(type)
        ? p.actions.filter((a) => a !== type)
        : [...p.actions, type],
    }));

  const conditionSummary = summarizeConditions(rule.conditions, rule.conditionLogic);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(rule);
      onClose();
    } catch {
      /* mutation onError */
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
        <EditorScroll>
          {/* ① 기본 정보 */}
          <EditorSection>
            <EditorSectionTitle>① 기본 정보</EditorSectionTitle>
            <FieldGrid>
              <FieldGroup>
                <FieldLabel $required>규칙 이름</FieldLabel>
                <FieldInput
                  value={rule.ruleName}
                  onChange={(e) => setField("ruleName", e.target.value)}
                  placeholder="예) 급기 온도 과열 경보"
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel $required>심각도</FieldLabel>
                <FieldSelect
                  value={rule.severity}
                  onChange={(e) => setField("severity", e.target.value)}
                >
                  {Object.entries(SEVERITY_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label} ({k})</option>
                  ))}
                </FieldSelect>
              </FieldGroup>
              <FieldGroup $full>
                <FieldLabel>설명</FieldLabel>
                <FieldInput
                  value={rule.description ?? ""}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="이 규칙에 대한 간단한 설명"
                />
              </FieldGroup>
            </FieldGrid>
          </EditorSection>

          {/* ② 대상 장비 */}
          <EditorSection>
            <EditorSectionTitle>② 대상 장비 · 포인트</EditorSectionTitle>
            <FieldGrid>
              <FieldGroup>
                <FieldLabel>장비 ID</FieldLabel>
                <FieldInput
                  type="number"
                  value={rule.deviceId ?? ""}
                  onChange={(e) => setField("deviceId", e.target.value ? Number(e.target.value) : null)}
                  placeholder="장비 ID (추후 검색 연동)"
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>대표 tagName</FieldLabel>
                <FieldInput
                  value={rule.tagName ?? ""}
                  onChange={(e) => setField("tagName", e.target.value)}
                  placeholder="예: CurTemp, Voltage"
                />
              </FieldGroup>
            </FieldGrid>
          </EditorSection>

          {/* ③ 발동 조건 */}
          <EditorSection>
            <EditorSectionTitleRow>
              <EditorSectionTitle style={{ margin: 0 }}>③ 발동 조건</EditorSectionTitle>
              <LogicToggleGroup>
                {["AND", "OR"].map((l) => (
                  <LogicToggleBtn
                    key={l}
                    type="button"
                    $active={rule.conditionLogic === l}
                    onClick={() => setField("conditionLogic", l)}
                  >
                    {l}
                  </LogicToggleBtn>
                ))}
              </LogicToggleGroup>
            </EditorSectionTitleRow>
            <ConditionsWrap>
              {rule.conditions.map((cond, idx) => (
                <ConditionRow key={idx}>
                  {idx > 0 && <LogicSeparator>{rule.conditionLogic}</LogicSeparator>}
                  <ConditionCard>
                    <ConditionInput
                      placeholder="tagName"
                      value={cond.tagName}
                      onChange={(e) => updateCondition(idx, "tagName", e.target.value)}
                      style={{ width: 110 }}
                    />
                    <ConditionSelect
                      value={cond.operator}
                      onChange={(e) => updateCondition(idx, "operator", e.target.value)}
                      style={{ width: 130 }}
                    >
                      {OPERATORS.map((op) => <option key={op} value={op}>{op}</option>)}
                    </ConditionSelect>
                    <ConditionInput
                      type="number"
                      placeholder="값"
                      value={cond.value}
                      onChange={(e) => updateCondition(idx, "value", e.target.value)}
                    />
                    {(cond.operator === "IN_RANGE" || cond.operator === "OUT_OF_RANGE") && (
                      <>
                        <ConditionTilde>~</ConditionTilde>
                        <ConditionInput
                          type="number"
                          placeholder="값2"
                          value={cond.value2}
                          onChange={(e) => updateCondition(idx, "value2", e.target.value)}
                        />
                      </>
                    )}
                    <ConditionInput
                      placeholder="단위"
                      value={cond.unit}
                      onChange={(e) => updateCondition(idx, "unit", e.target.value)}
                      style={{ width: 70 }}
                    />
                    <RemoveCondBtn
                      type="button"
                      onClick={() => removeCondition(idx)}
                      disabled={rule.conditions.length === 1}
                    >✕</RemoveCondBtn>
                  </ConditionCard>
                </ConditionRow>
              ))}
              <AddCondBtn type="button" onClick={addCondition}>+ 조건 추가</AddCondBtn>
            </ConditionsWrap>
          </EditorSection>

          {/* ④ 발동 설정 */}
          <EditorSection>
            <EditorSectionTitle>④ 발동 설정</EditorSectionTitle>
            <FieldGrid>
              <FieldGroup>
                <FieldLabel>지속 시간 <FieldHint>조건 유지(초) 후 발동</FieldHint></FieldLabel>
                <FieldInputUnit>
                  <FieldInput type="number" min={0}
                    value={rule.sustainDuration}
                    onChange={(e) => setField("sustainDuration", Number(e.target.value))}
                  />
                  <UnitLabel>초</UnitLabel>
                </FieldInputUnit>
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>쿨다운 <FieldHint>재발동 방지</FieldHint></FieldLabel>
                <FieldInputUnit>
                  <FieldInput type="number" min={0}
                    value={rule.cooldown}
                    onChange={(e) => setField("cooldown", Number(e.target.value))}
                  />
                  <UnitLabel>초</UnitLabel>
                </FieldInputUnit>
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>활성 여부</FieldLabel>
                <ActiveToggle>
                  <ActiveCheckbox
                    type="checkbox"
                    checked={rule.active}
                    onChange={(e) => setField("active", e.target.checked)}
                  />
                  {rule.active ? "활성" : "비활성"}
                </ActiveToggle>
              </FieldGroup>
            </FieldGrid>
          </EditorSection>

          {/* ⑤ 액션 */}
          <EditorSection>
            <EditorSectionTitle>⑤ 발동 시 액션</EditorSectionTitle>
            <ActionsGrid>
              {Object.entries(ACTION_CONFIG).map(([type, cfg]) => {
                const checked = rule.actions.includes(type);
                return (
                  <ActionCard key={type} $checked={checked} onClick={() => toggleAction(type)}>
                    <ActionIcon>{cfg.icon}</ActionIcon>
                    <ActionLabel>{cfg.label}</ActionLabel>
                    <ActionCheckmark>{checked ? "✓" : ""}</ActionCheckmark>
                  </ActionCard>
                );
              })}
            </ActionsGrid>
            <FieldGrid style={{ marginTop: 12 }}>
              <FieldGroup>
                <FieldLabel>표시 유형 (Unity)</FieldLabel>
                <FieldSelect
                  value={rule.displayType ?? "SIMPLE"}
                  onChange={(e) => setField("displayType", e.target.value)}
                >
                  <option value="SIMPLE">SIMPLE — 일반 알람 팝업</option>
                  <option value="SOP">SOP — 디지털 SOP 패널</option>
                </FieldSelect>
              </FieldGroup>
              {(rule.displayType === "SOP" || rule.actions.includes("SOP")) && (
                <FieldGroup>
                  <FieldLabel>SOP 템플릿</FieldLabel>
                  <FieldSelect
                    value={rule.sopTemplateId ?? ""}
                    onChange={(e) =>
                      setField("sopTemplateId", e.target.value ? Number(e.target.value) : null)
                    }
                  >
                    <option value="">선택하세요</option>
                    {sopTemplates.map((t) => (
                      <option key={t.templateId} value={t.templateId}>
                        {t.templateName} ({t.templateCode})
                      </option>
                    ))}
                  </FieldSelect>
                </FieldGroup>
              )}
            </FieldGrid>
          </EditorSection>

          {/* ⑥ 요약 프리뷰 */}
          {(rule.ruleName || conditionSummary) && (
            <EditorSection>
              <EditorSectionTitle>⑥ 설정 요약 프리뷰</EditorSectionTitle>
              <SummaryPreview>
                {rule.tagName && (
                  <SummaryLine>
                    <SummaryKey>[대상]</SummaryKey>
                    {rule.deviceId ? `Device#${rule.deviceId}` : "—"} · <code>{rule.tagName}</code>
                  </SummaryLine>
                )}
                {conditionSummary && (
                  <SummaryLine>
                    <SummaryKey>[조건]</SummaryKey>
                    {conditionSummary}
                    {rule.sustainDuration > 0 && ` (${rule.sustainDuration}초 지속 시)`}
                  </SummaryLine>
                )}
                {rule.actions.length > 0 && (
                  <SummaryLine>
                    <SummaryKey>[액션]</SummaryKey>
                    {rule.actions.map((a) => ACTION_CONFIG[a]?.label).join(", ")}
                  </SummaryLine>
                )}
                <SummaryLine>
                  <SummaryKey>[심각도]</SummaryKey>
                  <SeverityBadge severity={rule.severity} />
                  {rule.cooldown > 0 && ` · 쿨다운 ${rule.cooldown}초`}
                </SummaryLine>
              </SummaryPreview>
            </EditorSection>
          )}
        </EditorScroll>

        <EditorFooter>
          <CancelBtn type="button" onClick={onClose}>취소</CancelBtn>
          <SaveBtn type="button" onClick={handleSave} disabled={saving}>
            {saving ? "저장 중…" : "저장"}
          </SaveBtn>
        </EditorFooter>
    </>
  );
};

// ─────────────────────────────────────────────
// 메인 페이지
// ─────────────────────────────────────────────
const EventThresholdPage = () => {
  const queryClient = useQueryClient();
  const { openModal, closeModal } = useModal();
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [activeFilter, setActiveFilter] = useState("ALL");

  /* ── 데이터 조회 */
  const { data: res, isLoading, isError } = useQuery({
    queryKey: EVENT_RULES_QUERY_KEY,
    queryFn: fetchEventRulesAPI,
  });
  const rules = res?.data ?? [];

  /* ── 생성 */
  const { mutateAsync: createRuleAsync } = useMutation({
    mutationFn: createEventRuleAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EVENT_RULES_QUERY_KEY });
    },
  });

  const { mutateAsync: updateRuleAsync } = useMutation({
    mutationFn: ({ ruleId, payload }) => updateEventRuleAPI({ ruleId, payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EVENT_RULES_QUERY_KEY });
    },
  });

  /* ── 활성 토글 */
  const { mutate: toggleActive } = useMutation({
    mutationFn: toggleEventRuleActiveAPI,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EVENT_RULES_QUERY_KEY }),
  });

  /* ── 삭제 */
  const { mutate: deleteRule } = useMutation({
    mutationFn: deleteEventRuleAPI,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EVENT_RULES_QUERY_KEY }),
  });

  const handleSave = async (rule) => {
    if (rule.ruleId) {
      await updateRuleAsync({ ruleId: rule.ruleId, payload: rule });
    } else {
      await createRuleAsync(rule);
    }
  };

  const openRuleEditor = (rule) => {
    openModal({
      title: rule?.ruleId ? "규칙 편집" : "규칙 추가",
      hideFooter: true,
      full: true,
      content: (
        <RuleEditorForm
          rule={rule}
          onClose={closeModal}
          onSave={handleSave}
        />
      ),
    });
  };

  const handleDelete = (ruleId) => {
    if (!window.confirm("이 규칙을 삭제할까요?")) return;
    deleteRule(ruleId);
  };

  /* ── 클라이언트 필터 */
  const filtered = rules.filter((r) => {
    if (severityFilter !== "ALL" && r.severity !== severityFilter) return false;
    if (activeFilter === "ACTIVE"   && !r.active)  return false;
    if (activeFilter === "INACTIVE" && r.active)   return false;
    return true;
  });

  return (
    <AdminPageTemplate
      title="이벤트 규칙 관리"
      description="장비 포인트별 임계값·조건을 설정하고, 발동 시 수행할 액션을 정의합니다."
    >
      {/* ── 툴바 */}
      <Toolbar>
        <FilterGroup>
          <FilterLabel>심각도</FilterLabel>
          <FilterChips>
            {["ALL", ...Object.keys(SEVERITY_CONFIG)].map((s) => (
              <FilterChip
                key={s}
                type="button"
                $active={severityFilter === s}
                $color={s !== "ALL" ? SEVERITY_CONFIG[s]?.dot : undefined}
                onClick={() => setSeverityFilter(s)}
              >
                {s === "ALL" ? "전체" : SEVERITY_CONFIG[s].label}
              </FilterChip>
            ))}
          </FilterChips>
          <FilterLabel style={{ marginLeft: 16 }}>상태</FilterLabel>
          <FilterSelect value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
            <option value="ALL">전체</option>
            <option value="ACTIVE">활성만</option>
            <option value="INACTIVE">비활성만</option>
          </FilterSelect>
        </FilterGroup>
        <AddRuleBtn type="button" onClick={() => openRuleEditor(null)}>
          + 규칙 추가
        </AddRuleBtn>
      </Toolbar>

      {/* ── 테이블 */}
      <TableWrap>
        {isLoading ? (
          <LoadingMsg>데이터를 불러오는 중…</LoadingMsg>
        ) : isError ? (
          <ErrorMsg>규칙 목록을 불러오지 못했습니다. 서버 상태를 확인하세요.</ErrorMsg>
        ) : (
          <RuleTable>
            <thead>
              <tr>
                <Th>규칙 이름</Th>
                <Th>대상 장비 · 포인트</Th>
                <Th>조건 요약</Th>
                <Th $center style={{ width: 90 }}>심각도</Th>
                <Th style={{ width: 200 }}>액션</Th>
                <Th $center style={{ width: 110 }}>지속/쿨다운</Th>
                <Th $center style={{ width: 80 }}>활성</Th>
                <Th $center style={{ width: 120 }}>관리</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <Td colSpan={8} $center>조건에 맞는 규칙이 없습니다.</Td>
                </tr>
              ) : (
                filtered.map((rule) => (
                  <tr key={rule.ruleId}>
                    <Td><RuleName>{rule.ruleName}</RuleName></Td>
                    <Td>
                      <DeviceCell>
                        <DeviceName>{rule.deviceName ?? `Device#${rule.deviceId}`}</DeviceName>
                        {rule.tagName && <TagChip>{rule.tagName}</TagChip>}
                      </DeviceCell>
                    </Td>
                    <Td>
                      <CondSummaryText>
                        {summarizeConditions(rule.conditions, rule.conditionLogic)}
                      </CondSummaryText>
                    </Td>
                    <Td $center><SeverityBadge severity={rule.severity} /></Td>
                    <Td>
                      <ActionChips>
                        {(rule.actions ?? []).map((a) => (
                          <ActionChip key={a}>
                            {ACTION_CONFIG[a]?.icon} {ACTION_CONFIG[a]?.label}
                          </ActionChip>
                        ))}
                      </ActionChips>
                    </Td>
                    <Td $center>
                      <TimingText>
                        {rule.sustainDuration > 0 ? `${rule.sustainDuration}s` : "즉시"}
                        {" / "}
                        {rule.cooldown > 0 ? `${rule.cooldown}s` : "없음"}
                      </TimingText>
                    </Td>
                    <Td $center>
                      <ActiveToggleBtn
                        type="button"
                        $active={rule.active}
                        onClick={() => toggleActive(rule.ruleId)}
                      >
                        {rule.active ? "ON" : "OFF"}
                      </ActiveToggleBtn>
                    </Td>
                    <Td $center>
                      <BtnGroup>
                        <EditBtn type="button" onClick={() => openRuleEditor(rule)}>편집</EditBtn>
                        <DeleteBtn type="button" onClick={() => handleDelete(rule.ruleId)}>삭제</DeleteBtn>
                      </BtnGroup>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </RuleTable>
        )}
      </TableWrap>

      {/* ── 하단 요약 */}
      {!isLoading && !isError && (
        <SummaryBar>
          전체 {rules.length}개 규칙 ·&nbsp;
          활성 <strong>{rules.filter((r) => r.active).length}</strong>개 ·&nbsp;
          {Object.entries(SEVERITY_CONFIG).map(([k, v]) => (
            <span key={k}>
              <SeverityDot style={{ background: v.dot }} />
              {v.label} {rules.filter((r) => r.severity === k).length}개&nbsp;
            </span>
          ))}
        </SummaryBar>
      )}

    </AdminPageTemplate>
  );
};

export default EventThresholdPage;

// ─────────────────────────────────────────────
// Styled Components
// ─────────────────────────────────────────────
const Toolbar = styled.div`
  display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center;
  gap: 12px; padding: 14px 18px; margin-bottom: 14px;
  background: #fff; border: 1px solid #e1e2e5; border-radius: 6px;
`;
const FilterGroup  = styled.div`display: flex; flex-wrap: wrap; align-items: center; gap: 8px;`;
const FilterLabel  = styled.span`font-size: 12px; font-weight: 600; color: #64748b;`;
const FilterChips  = styled.div`display: flex; gap: 4px;`;
const FilterChip   = styled.button`
  padding: 4px 12px; font-size: 12px; font-weight: 600; border-radius: 16px; cursor: pointer;
  border: 1.5px solid ${(p) => (p.$active ? (p.$color ?? "#4a6380") : "#e5e7eb")};
  background: ${(p) => (p.$active ? (p.$color ? `${p.$color}22` : "#e8ecf1") : "#fff")};
  color: ${(p) => (p.$active ? (p.$color ?? "#4a6380") : "#6b7280")};
  &:hover { background: #f3f4f6; }
`;
const FilterSelect = styled.select`
  padding: 5px 10px; font-size: 13px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; outline: none;
`;
const AddRuleBtn = styled.button`
  padding: 8px 20px; font-size: 14px; font-weight: 700; color: #fff; background: #2563eb;
  border: none; border-radius: 6px; cursor: pointer; white-space: nowrap;
  &:hover { background: #1d4ed8; }
`;
const TableWrap = styled.div`overflow-x: auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px;`;
const LoadingMsg   = styled.p`text-align: center; padding: 40px; color: #64748b;`;
const ErrorMsg     = styled.p`text-align: center; padding: 40px; color: #ef4444;`;
const RuleTable    = styled.table`width: 100%; border-collapse: collapse; font-size: 13px;`;
const Th = styled.th`
  padding: 10px 14px; text-align: ${(p) => (p.$center ? "center" : "left")};
  font-size: 12px; font-weight: 700; color: #374151; background: #f9fafb;
  border-bottom: 1px solid #e5e7eb; white-space: nowrap;
`;
const Td = styled.td`
  padding: 10px 14px; border-bottom: 1px solid #f3f4f6; vertical-align: middle;
  text-align: ${(p) => (p.$center ? "center" : "left")};
`;
const RuleName = styled.span`font-size: 13px; font-weight: 600; color: #111827;`;
const DeviceCell   = styled.div`display: flex; flex-direction: column; gap: 3px;`;
const DeviceName   = styled.span`font-size: 12px; font-weight: 600; color: #374151;`;
const TagChip      = styled.code`
  display: inline-block; font-size: 11px; color: #1d4ed8;
  background: #eff6ff; padding: 1px 6px; border-radius: 3px;
`;
const CondSummaryText = styled.span`font-size: 12px; color: #374151; font-family: monospace;`;
const SBadge = styled.span`
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px; font-size: 11px; font-weight: 700; border-radius: 12px;
`;
const SDot = styled.span`width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;`;
const ActionChips  = styled.div`display: flex; flex-wrap: wrap; gap: 4px;`;
const ActionChip   = styled.span`
  padding: 2px 7px; font-size: 11px; font-weight: 600; border-radius: 4px;
  background: #f3f4f6; color: #374151; white-space: nowrap;
`;
const TimingText   = styled.span`font-size: 11px; font-family: monospace; color: #64748b;`;
const ActiveToggleBtn = styled.button`
  padding: 3px 12px; font-size: 12px; font-weight: 700; border-radius: 12px; border: none; cursor: pointer;
  background: ${(p) => (p.$active ? "#dcfce7" : "#f3f4f6")};
  color: ${(p) => (p.$active ? "#15803d" : "#9ca3af")};
  &:hover { filter: brightness(0.95); }
`;
const BtnGroup  = styled.div`display: flex; gap: 5px; justify-content: center;`;
const EditBtn   = styled.button`
  padding: 4px 12px; font-size: 12px; font-weight: 600; color: #fff;
  background: #f59e0b; border: none; border-radius: 4px; cursor: pointer;
  &:hover { background: #d97706; }
`;
const DeleteBtn = styled.button`
  padding: 4px 12px; font-size: 12px; font-weight: 600; color: #fff;
  background: #ef4444; border: none; border-radius: 4px; cursor: pointer;
  &:hover { background: #dc2626; }
`;
const SummaryBar  = styled.div`
  display: flex; align-items: center; flex-wrap: wrap; gap: 4px;
  margin-top: 10px; font-size: 12px; color: #64748b;
`;
const SeverityDot = styled.span`
  display: inline-block; width: 7px; height: 7px; border-radius: 50%;
  margin-right: 2px; vertical-align: middle;
`;

const EditorScroll = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  max-height: min(72vh, 640px);
  overflow-y: auto;
  padding-right: 4px;
`;
const EditorFooter = styled.div`
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;
const CancelBtn   = styled.button`
  padding: 9px 22px; font-size: 14px; font-weight: 600; color: #374151;
  background: #fff; border: 1px solid #d1d5db; border-radius: 7px; cursor: pointer;
  &:hover { background: #f3f4f6; }
`;
const SaveBtn     = styled.button`
  padding: 9px 22px; font-size: 14px; font-weight: 700; color: #fff;
  background: #2563eb; border: none; border-radius: 7px; cursor: pointer;
  &:disabled { opacity: 0.6; cursor: not-allowed; }
  &:hover:not(:disabled) { background: #1d4ed8; }
`;

/* Editor Section */
const EditorSection        = styled.div`
  padding: 16px 0; border-bottom: 1px solid #f3f4f6; &:last-child { border-bottom: none; }
`;
const EditorSectionTitle   = styled.h3`margin: 0 0 12px 0; font-size: 13px; font-weight: 700; color: #374151;`;
const EditorSectionTitleRow = styled.div`
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;
`;
const FieldGrid   = styled.div`display: grid; grid-template-columns: 1fr 1fr; gap: 12px;`;
const FieldGroup  = styled.div`
  display: flex; flex-direction: column; gap: 5px;
  ${(p) => p.$full && "grid-column: span 2;"}
`;
const FieldLabel  = styled.label`
  font-size: 12px; font-weight: 600; color: #374151;
  display: flex; align-items: center; gap: 6px;
  &::after { content: "${(p) => (p.$required ? " *" : "")}"; color: #ef4444; }
`;
const FieldHint   = styled.span`font-size: 11px; color: #94a3b8; font-weight: 400;`;
const FieldInput  = styled.input`
  padding: 7px 10px; font-size: 13px; border: 1px solid #d1d5db; border-radius: 5px; outline: none;
  &:focus { border-color: #4a90d9; } &::placeholder { color: #c4c9d0; }
`;
const FieldSelect = styled.select`
  padding: 7px 10px; font-size: 13px; border: 1px solid #d1d5db; border-radius: 5px; background: #fff; outline: none;
`;
const FieldInputUnit = styled.div`display: flex; align-items: center; gap: 6px;`;
const UnitLabel      = styled.span`font-size: 13px; color: #64748b; white-space: nowrap;`;
const ActiveToggle   = styled.label`
  display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: #374151; cursor: pointer; margin-top: 6px;
`;
const ActiveCheckbox = styled.input`width: 16px; height: 16px; accent-color: #2563eb; cursor: pointer;`;

/* Condition Builder */
const LogicToggleGroup = styled.div`display: flex; gap: 4px;`;
const LogicToggleBtn   = styled.button`
  padding: 4px 14px; font-size: 12px; font-weight: 700; border-radius: 4px; cursor: pointer;
  border: 1.5px solid ${(p) => (p.$active ? "#4a6380" : "#e5e7eb")};
  background: ${(p) => (p.$active ? "#4a6380" : "#fff")};
  color: ${(p) => (p.$active ? "#fff" : "#6b7280")};
`;
const ConditionsWrap   = styled.div`display: flex; flex-direction: column; gap: 0;`;
const ConditionRow     = styled.div`display: flex; flex-direction: column; gap: 4px;`;
const LogicSeparator   = styled.div`
  padding: 2px 10px; font-size: 11px; font-weight: 700; color: #6b7280;
  background: #f3f4f6; border-radius: 4px; align-self: flex-start; margin: 4px 0;
`;
const ConditionCard    = styled.div`
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
  padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;
`;
const ConditionSelect  = styled.select`
  padding: 5px 8px; font-size: 13px; border: 1px solid #d1d5db; border-radius: 4px; background: #fff; min-width: 100px; outline: none;
`;
const ConditionInput   = styled.input`
  padding: 5px 8px; font-size: 13px; border: 1px solid #d1d5db; border-radius: 4px; width: 80px; outline: none;
  &::placeholder { color: #c4c9d0; }
`;
const ConditionTilde   = styled.span`font-size: 14px; color: #6b7280;`;
const RemoveCondBtn    = styled.button`
  width: 24px; height: 24px; font-size: 12px; color: #9ca3af;
  background: transparent; border: none; border-radius: 4px; cursor: pointer;
  &:hover:not(:disabled) { color: #ef4444; background: #fee2e2; }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
`;
const AddCondBtn = styled.button`
  margin-top: 8px; padding: 6px 14px; font-size: 12px; font-weight: 600; color: #2563eb;
  background: #eff6ff; border: 1px dashed #bfdbfe; border-radius: 5px; cursor: pointer; align-self: flex-start;
  &:hover { background: #dbeafe; }
`;

/* Action Cards */
const ActionsGrid    = styled.div`display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;`;
const ActionCard     = styled.div`
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 14px 8px; cursor: pointer; transition: all 0.15s;
  border: 2px solid ${(p) => (p.$checked ? "#2563eb" : "#e5e7eb")};
  border-radius: 8px;
  background: ${(p) => (p.$checked ? "#eff6ff" : "#fafafa")};
  &:hover { border-color: #2563eb; background: #eff6ff; }
`;
const ActionIcon     = styled.span`font-size: 22px;`;
const ActionLabel    = styled.span`font-size: 12px; font-weight: 600; color: #374151; text-align: center;`;
const ActionCheckmark = styled.span`font-size: 13px; font-weight: 700; color: #2563eb; height: 16px;`;

/* Summary Preview */
const SummaryPreview = styled.div`
  padding: 14px 16px; background: #1e293b; border-radius: 8px;
  display: flex; flex-direction: column; gap: 8px;
`;
const SummaryLine = styled.div`
  display: flex; align-items: center; flex-wrap: wrap; gap: 8px;
  font-size: 13px; color: #e2e8f0;
  code { font-size: 12px; color: #7dd3fc; background: rgba(125,211,252,0.1); padding: 1px 6px; border-radius: 3px; }
`;
const SummaryKey = styled.span`font-size: 11px; font-weight: 700; color: #94a3b8; letter-spacing: 0.03em; white-space: nowrap;`;
