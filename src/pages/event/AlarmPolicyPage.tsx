import { showAlert } from "@/utils/dialogBridge";
import { useState } from "react";
import styled from "styled-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import { Button } from "@/components/ui";
import { useModal } from "@/contexts/ModalContext";
import AlarmPolicyModal from "@/components/modal/alarm/AlarmPolicyModal";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import {
  ALARM_POLICY_QUERY_KEY,
  deleteAlarmPolicy,
  fetchAlarmPolicies,
  updateAlarmPolicy,
  type AlarmPolicy,
} from "@/services/alarmPolicyService";
import {
  DISPLAY_TYPE_LABEL,
  formatCondition,
  highestLevel,
  LEVEL_CONFIG,
  SCOPE_LABEL,
} from "./alarmPolicyConstants";

/** 대상 장비·태그 셀 텍스트 */
function targetText(p: AlarmPolicy): string {
  const tag = p.tagName ?? "-";
  if (p.scope === "DEVICE") {
    // 서버가 resolve 한 장비명 우선, 없으면 deviceId 폴백
    const name = p.deviceName ?? (p.deviceId != null ? `Device#${p.deviceId}` : "-");
    return `${name} · ${tag}`;
  }
  const path = p.categoryPath ?? (p.categoryId != null ? `Category#${p.categoryId}` : "-");
  return `${path} · ${tag}`;
}

/**
 * 알람 정책 관리 (WA-ALARM-POLICY) — 이벤트 알람 그룹
 * 카테고리/장비 범위의 임계치·토글 알람 정책과 심각도 레벨을 관리한다.
 */
const AlarmPolicyPage = () => {
  const queryClient = useQueryClient();
  const { openModal, closeModal } = useModal();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: policies = [], isLoading, isError, error } = useQuery({
    queryKey: ALARM_POLICY_QUERY_KEY,
    queryFn: fetchAlarmPolicies,
  });

  const selected = policies.find((p) => p.policyId === selectedId) ?? null;

  /** 이펙트 토글 즉시 저장 (PUT 전체 페이로드 재구성) */
  const { mutate: toggleEffect, isPending: isToggling } = useMutation({
    mutationFn: (p: AlarmPolicy) =>
      updateAlarmPolicy({
        policyId: p.policyId,
        payload: {
          policyName: p.policyName,
          description: p.description,
          scope: p.scope,
          categoryId: p.categoryId,
          deviceId: p.deviceId,
          tagName: p.tagName,
          pointType: p.pointType,
          conditionKind: p.conditionKind,
          operator: p.operator,
          triggerValue: p.triggerValue,
          displayType: p.displayType,
          sopTemplateId: p.sopTemplateId,
          effectEnabled: !p.effectEnabled,
          sustainSec: p.sustainSec,
          cooldownSec: p.cooldownSec,
          active: p.active,
          levels: p.levels,
        },
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ALARM_POLICY_QUERY_KEY }),
    onError: (err) =>
      showAlert(getApiErrorMessage(err, "이펙트 설정 저장 중 오류가 발생했습니다.")),
  });

  const { mutate: removePolicy } = useMutation({
    mutationFn: deleteAlarmPolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALARM_POLICY_QUERY_KEY });
      closeModal();
    },
    onError: (err) =>
      showAlert(getApiErrorMessage(err, "삭제 중 오류가 발생했습니다.")),
  });

  const openEditor = (policy: AlarmPolicy | null) => {
    openModal({
      title: policy ? "알람 정책 수정" : "알람 정책 등록",
      hideFooter: true,
      wide: true,
      content: <AlarmPolicyModal policy={policy} onClose={closeModal} />,
    });
  };

  const openDelete = (policy: AlarmPolicy) => {
    openModal({
      title: "알람 정책 삭제",
      content: `정책 "${policy.policyName}" 을(를) 삭제할까요?`,
      onConfirm: () => removePolicy(policy.policyId),
    });
  };

  return (
    <AdminPageTemplate
      title="알람 정책 관리"
      description="카테고리·장비 범위의 임계치(AI)·토글(DI) 알람 정책과 심각도 레벨, 경보 표시·이펙트 연출을 관리합니다."
    >
      <PanelHead>
        <PanelTitle>알람 정책 목록</PanelTitle>
        <Button variant="primary" onClick={() => openEditor(null)}>
          + 정책 등록
        </Button>
      </PanelHead>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>정책명</Th>
              <Th $center>범위</Th>
              <Th>대상 장비 · 태그</Th>
              <Th $center>레벨</Th>
              <Th $center>발생 조건</Th>
              <Th $center>경보 표시</Th>
              <Th $center>이펙트 연출</Th>
              <Th $center>관리</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <Td colSpan={8} $center>
                  불러오는 중…
                </Td>
              </tr>
            ) : isError ? (
              <tr>
                <Td colSpan={8} $center>
                  {(error as Error)?.message ?? "목록을 불러오지 못했습니다."}
                </Td>
              </tr>
            ) : policies.length === 0 ? (
              <tr>
                <Td colSpan={8} $center>
                  등록된 알람 정책이 없습니다. "+ 정책 등록"으로 추가하세요.
                </Td>
              </tr>
            ) : (
              policies.map((p) => {
                const top = highestLevel(p);
                const lvlCfg = top ? LEVEL_CONFIG[top.level] : null;
                return (
                  <Row
                    key={p.policyId}
                    $selected={p.policyId === selectedId}
                    onClick={() => setSelectedId(p.policyId)}
                  >
                    <Td>
                      <PolicyName>{p.policyName}</PolicyName>
                      {!p.active && <MutedTag>비활성</MutedTag>}
                    </Td>
                    <Td $center>
                      <ScopeBadge $scope={p.scope}>
                        {SCOPE_LABEL[p.scope]}
                      </ScopeBadge>
                      {p.scope === "DEVICE" && (
                        <PriorityBadge>개별우선</PriorityBadge>
                      )}
                    </Td>
                    <Td>
                      <TargetText>{targetText(p)}</TargetText>
                    </Td>
                    <Td $center>
                      {lvlCfg ? (
                        <LevelBadge $bg={lvlCfg.bg} $color={lvlCfg.color}>
                          <Dot style={{ background: lvlCfg.dot }} />
                          {lvlCfg.label}
                        </LevelBadge>
                      ) : (
                        <Muted>-</Muted>
                      )}
                    </Td>
                    <Td $center>
                      <CondText>{formatCondition(p)}</CondText>
                    </Td>
                    <Td $center>
                      <Chip>{DISPLAY_TYPE_LABEL[p.displayType]}</Chip>
                    </Td>
                    <Td $center onClick={(e) => e.stopPropagation()}>
                      <EffectToggle
                        type="button"
                        $on={p.effectEnabled}
                        disabled={isToggling}
                        onClick={() => toggleEffect(p)}
                      >
                        {p.effectEnabled ? "ON" : "OFF"}
                      </EffectToggle>
                    </Td>
                    <Td $center onClick={(e) => e.stopPropagation()}>
                      <BtnGroup>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEditor(p)}
                        >
                          수정
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => openDelete(p)}
                        >
                          삭제
                        </Button>
                      </BtnGroup>
                    </Td>
                  </Row>
                );
              })
            )}
          </tbody>
        </Table>
      </TableWrap>

      {/* 선택 정책 상세 — 레벨별 표 */}
      {selected && (
        <DetailPanel>
          <DetailHead>
            <DetailTitle>
              선택 정책: <strong>{selected.policyName}</strong>
            </DetailTitle>
            <DetailMeta>
              {SCOPE_LABEL[selected.scope]} · {targetText(selected)}
            </DetailMeta>
          </DetailHead>
          {selected.levels?.length ? (
            <DetailTable>
              <thead>
                <tr>
                  <Th $center style={{ width: 120 }}>
                    레벨
                  </Th>
                  <Th $center style={{ width: 140 }}>
                    임계값
                  </Th>
                  <Th>아이콘</Th>
                  <Th>이펙트</Th>
                </tr>
              </thead>
              <tbody>
                {[...selected.levels]
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((l) => {
                    const cfg = LEVEL_CONFIG[l.level];
                    return (
                      <tr key={l.level}>
                        <Td $center>
                          <LevelBadge $bg={cfg.bg} $color={cfg.color}>
                            <Dot style={{ background: cfg.dot }} />
                            {cfg.label}
                          </LevelBadge>
                        </Td>
                        <Td $center>
                          <Mono>
                            {l.thresholdValue != null ? l.thresholdValue : "-"}
                          </Mono>
                        </Td>
                        <Td>{l.icon || <Muted>-</Muted>}</Td>
                        <Td>{l.effect || <Muted>-</Muted>}</Td>
                      </tr>
                    );
                  })}
              </tbody>
            </DetailTable>
          ) : (
            <EmptyDetail>등록된 레벨이 없습니다.</EmptyDetail>
          )}
        </DetailPanel>
      )}
    </AdminPageTemplate>
  );
};

export default AlarmPolicyPage;

const PanelHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
`;

const PanelTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #111d2c;
`;

const TableWrap = styled.div`
  overflow-x: auto;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
`;

const Th = styled.th<{ $center?: boolean }>`
  padding: 11px 14px;
  text-align: ${(p) => (p.$center ? "center" : "left")};
  font-size: 12px;
  font-weight: 700;
  color: #374151;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
`;

const Td = styled.td<{ $center?: boolean }>`
  padding: 10px 14px;
  border-bottom: 1px solid #f3f4f6;
  color: #111827;
  text-align: ${(p) => (p.$center ? "center" : "left")};
  vertical-align: middle;
`;

const Row = styled.tr<{ $selected?: boolean }>`
  cursor: pointer;
  background: ${(p) => (p.$selected ? "#eff6ff" : "#fff")};
  &:hover {
    background: ${(p) => (p.$selected ? "#e0edff" : "#f9fafb")};
  }
`;

const PolicyName = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #111827;
`;

const MutedTag = styled.span`
  margin-left: 6px;
  font-size: 11px;
  color: #9ca3af;
`;

const ScopeBadge = styled.span<{ $scope: "CATEGORY" | "DEVICE" }>`
  display: inline-block;
  padding: 2px 10px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  background: ${(p) => (p.$scope === "DEVICE" ? "#e0edff" : "#eef2f6")};
  color: ${(p) => (p.$scope === "DEVICE" ? "#1d4ed8" : "#475569")};
`;

const PriorityBadge = styled.span`
  display: inline-block;
  margin-left: 4px;
  padding: 1px 7px;
  font-size: 10px;
  font-weight: 700;
  border-radius: 999px;
  background: #fef3c7;
  color: #b45309;
`;

const TargetText = styled.code`
  font-size: 12px;
  color: #374151;
  font-family: monospace;
`;

const LevelBadge = styled.span<{ $bg: string; $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 12px;
  background: ${(p) => p.$bg};
  color: ${(p) => p.$color};
`;

const Dot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
`;

const CondText = styled.span`
  font-size: 12px;
  font-family: monospace;
  color: #374151;
`;

const Chip = styled.span`
  display: inline-block;
  padding: 2px 9px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  background: #f3f4f6;
  color: #374151;
`;

const EffectToggle = styled.button<{ $on?: boolean }>`
  padding: 3px 14px;
  font-size: 12px;
  font-weight: 700;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  background: ${(p) => (p.$on ? "#ccfbf1" : "#f3f4f6")};
  color: ${(p) => (p.$on ? "#0f766e" : "#9ca3af")};
  &:hover:not(:disabled) {
    filter: brightness(0.96);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const BtnGroup = styled.div`
  display: flex;
  gap: 5px;
  justify-content: center;
`;

const Muted = styled.span`
  color: #9ca3af;
`;

const Mono = styled.span`
  font-family: monospace;
  color: #374151;
`;

const DetailPanel = styled.div`
  margin-top: 18px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px 18px;
`;

const DetailHead = styled.div`
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
`;

const DetailTitle = styled.h4`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #111d2c;
`;

const DetailMeta = styled.span`
  font-size: 12px;
  color: #6b7280;
`;

const DetailTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
`;

const EmptyDetail = styled.div`
  padding: 16px 0;
  font-size: 13px;
  color: #9ca3af;
  text-align: center;
`;
