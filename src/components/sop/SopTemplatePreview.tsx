import { useMemo, useState } from "react";
import styled from "styled-components";

/**
 * @param {{
 *   title?: string;
 *   timeoutMinutes?: number;
 *   steps?: Array<object>;
 *   transitions?: Array<object>;
 * }} structure
 */
export function parsePreviewStructure(jsonText, version) {
  if (jsonText?.trim()) {
    try {
      return JSON.parse(jsonText);
    } catch {
      /* fall through */
    }
  }
  if (version) {
    return {
      title: version.title,
      timeoutMinutes: version.timeoutMinutes,
      steps: version.steps ?? [],
      transitions: version.transitions ?? [],
    };
  }
  return null;
}

const ACTION_LABELS = {
  TRANSITION: "다음 단계",
  CLOSE_SOP: "SOP 종료",
  EXECUTE_API: "연동 실행",
  OPEN_MODAL: "확인 모달",
  NOOP: "—",
};

const SopTemplatePreview = ({ structure, parseError }) => {
  const [completedItems, setCompletedItems] = useState({});

  const steps = useMemo(() => {
    const list = [...(structure?.steps ?? [])];
    list.sort((a, b) => (a.stepNo ?? 0) - (b.stepNo ?? 0));
    return list;
  }, [structure?.steps]);

  const transitions = structure?.transitions ?? [];

  if (parseError) {
    return (
      <Wrap>
        <ParseError>{parseError}</ParseError>
      </Wrap>
    );
  }

  if (!structure || steps.length === 0) {
    return (
      <Wrap>
        <Empty>steps가 없습니다. JSON에 스텝을 추가하거나 저장된 버전을 불러오세요.</Empty>
      </Wrap>
    );
  }

  const itemKey = (stepNo, item, idx) =>
    `${stepNo}-${item.itemId ?? `i-${idx}`}`;

  const toggleItem = (stepNo, item, idx) => {
    const key = itemKey(stepNo, item, idx);
    setCompletedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const describeButton = (stepNo, button) => {
    const tr = transitions.find(
      (t) => t.fromStepNo === stepNo && t.triggerKey === button.buttonKey
    );
    if (tr) {
      if (tr.toStepNo != null) return `→ STEP ${tr.toStepNo}`;
      return `→ 종료 (${tr.resultStatus ?? "-"})`;
    }
    const to = button.actionConfig?.toStepNo;
    if (button.actionType === "CLOSE_SOP") {
      return `→ 종료 (${button.actionConfig?.resultStatus ?? "-"})`;
    }
    if (to != null) return `→ STEP ${to}`;
    return ACTION_LABELS[button.actionType] ?? button.actionType;
  };

  return (
    <Wrap>
      <SopPanel>
        <PanelHeader>
          <PanelTitle>{structure.title || "디지털 SOP"}</PanelTitle>
          <PanelMeta>미리보기 · 타임아웃 {structure.timeoutMinutes ?? 10}분</PanelMeta>
        </PanelHeader>

        <StepStack>
          {steps.map((step) => (
            <StepCard key={step.stepNo}>
              <StepCardHead>
                <StepLabel>STEP {step.stepNo}</StepLabel>
                {step.showCompleteButton !== false && (
                  <CompleteBadge type="button" disabled title="미리보기 전용">
                    완료
                  </CompleteBadge>
                )}
              </StepCardHead>
              <StepTitle>{step.title}</StepTitle>
              {step.subtitle && <StepSubtitle>{step.subtitle}</StepSubtitle>}

              <ItemList>
                {[...(step.items ?? [])]
                  .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                  .map((item, idx) => (
                    <ItemBlock key={itemKey(step.stepNo, item, idx)}>
                      {item.itemType === "CHECKLIST" && (
                        <CheckRow>
                          <input
                            type="checkbox"
                            checked={!!completedItems[itemKey(step.stepNo, item, idx)]}
                            onChange={() => toggleItem(step.stepNo, item, idx)}
                          />
                          <span>{item.label}</span>
                        </CheckRow>
                      )}
                      {item.itemType === "TEXT" && (
                        <TextRow>{item.label || item.description}</TextRow>
                      )}
                      {item.itemType === "CONTACT" && (
                        <ContactRow>
                          <strong>{item.label || "연락처"}</strong>
                          <span>
                            {item.config?.phone ?? item.config?.phones?.[0] ?? "—"}
                          </span>
                        </ContactRow>
                      )}
                      {item.itemType === "ACTION" && (
                        <ActionRow>
                          <span>⚡ {item.label}</span>
                          {item.config?.executor && (
                            <Tag>{item.config.executor}</Tag>
                          )}
                        </ActionRow>
                      )}
                      {item.itemType === "BUTTON_GROUP" && (
                        <ButtonGroup>
                          {[...(item.buttons ?? [])]
                            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                            .map((btn) => (
                              <FlowBtn
                                key={btn.buttonKey}
                                type="button"
                                $variant={btn.style}
                                disabled
                                title={describeButton(step.stepNo, btn)}
                              >
                                {btn.label}
                                <BtnHint>{describeButton(step.stepNo, btn)}</BtnHint>
                              </FlowBtn>
                            ))}
                        </ButtonGroup>
                      )}
                      {item.itemType === "DIVIDER" && <Divider />}
                    </ItemBlock>
                  ))}
              </ItemList>
            </StepCard>
          ))}
        </StepStack>

        {transitions.length > 0 && (
          <TransitionBox>
            <TransitionTitle>분기 정의 (transitions)</TransitionTitle>
            <TransitionList>
              {transitions.map((t, i) => (
                <li key={i}>
                  STEP {t.fromStepNo} · <code>{t.triggerKey}</code>
                  {" → "}
                  {t.toStepNo != null
                    ? `STEP ${t.toStepNo}`
                    : `종료 (${t.resultStatus ?? "-"})`}
                </li>
              ))}
            </TransitionList>
          </TransitionBox>
        )}
      </SopPanel>
    </Wrap>
  );
};

export default SopTemplatePreview;

const Wrap = styled.div`
  margin-top: 8px;
`;

const SopPanel = styled.div`
  background: #2d3748;
  color: #e2e8f0;
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  max-width: 560px;
`;

const PanelHeader = styled.div`
  border-bottom: 1px solid #4a5568;
  padding-bottom: 12px;
  margin-bottom: 16px;
`;

const PanelTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
`;

const PanelMeta = styled.div`
  font-size: 12px;
  color: #a0aec0;
  margin-top: 4px;
`;

const StepStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const StepCard = styled.section`
  background: #1a202c;
  border: 1px solid #4a5568;
  border-radius: 8px;
  padding: 14px;
`;

const StepCardHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
`;

const StepLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: #90cdf4;
  letter-spacing: 0.02em;
`;

const CompleteBadge = styled.button`
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 4px;
  border: 1px solid #68d391;
  background: transparent;
  color: #68d391;
  opacity: 0.7;
  cursor: default;
`;

const StepTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
`;

const StepSubtitle = styled.div`
  font-size: 12px;
  color: #a0aec0;
  margin-bottom: 10px;
`;

const ItemList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ItemBlock = styled.div``;

const CheckRow = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
  input {
    margin-top: 2px;
  }
`;

const TextRow = styled.p`
  margin: 0;
  font-size: 13px;
  color: #e2e8f0;
`;

const ContactRow = styled.div`
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  strong {
    color: #fbd38d;
  }
  span {
    color: #cbd5e0;
  }
`;

const ActionRow = styled.div`
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const Tag = styled.span`
  font-size: 10px;
  padding: 2px 6px;
  background: #4a5568;
  border-radius: 4px;
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const FlowBtn = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid #718096;
  cursor: default;
  opacity: 0.95;
  background: ${(p) =>
    p.$variant === "danger"
      ? "#c53030"
      : p.$variant === "primary"
        ? "#2b6cb0"
        : "#4a5568"};
  color: #fff;
`;

const BtnHint = styled.span`
  font-size: 10px;
  font-weight: 400;
  opacity: 0.85;
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid #4a5568;
  margin: 4px 0;
`;

const TransitionBox = styled.div`
  background: #1a202c;
  border-radius: 6px;
  padding: 12px;
  font-size: 11px;
  margin-top: 20px;
`;

const TransitionTitle = styled.div`
  font-weight: 600;
  color: #90cdf4;
  margin-bottom: 6px;
`;

const TransitionList = styled.ul`
  margin: 0;
  padding-left: 18px;
  color: #cbd5e0;
  li {
    margin-bottom: 4px;
  }
  code {
    color: #fbd38d;
  }
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
