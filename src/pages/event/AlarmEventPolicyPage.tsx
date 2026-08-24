import { showAlert } from "@/utils/dialogBridge";
import { useMemo, useState } from "react";
import styled from "styled-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import { Button } from "@/components/ui";
import { useModal } from "@/contexts/ModalContext";
import AlarmEventPolicyModal from "@/components/modal/alarm/AlarmEventPolicyModal";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import {
  ALARM_POLICY_QUERY_KEY,
  deleteAlarmPolicy,
  fetchAlarmPolicies,
  type AlarmPolicy,
  type AlarmScope,
} from "@/services/alarmPolicyService";
import {
  metaKeys,
  useAlarmMeta,
  type AlarmMeta,
} from "@/services/alarmMetaService";
import {
  channelColor,
  enabledChannels,
  formatCondition,
  levelColor,
  OUTPUT_SPEC_KEYS,
  type OutputChannelKey,
} from "./alarmPolicyConstants";

/** 대상 셀 텍스트 — scope 에 따라 카테고리 경로 또는 장비명 + tag */
function targetText(p: AlarmPolicy): string {
  const tag = p.tagName ?? "-";
  if (p.scope === "DEVICE") {
    const name =
      p.deviceName ?? (p.deviceId != null ? `Device#${p.deviceId}` : "-");
    return `${name} · ${tag}`;
  }
  const path =
    p.categoryPath ?? (p.categoryId != null ? `Category#${p.categoryId}` : "-");
  return `${path} · ${tag}`;
}

/** 메타 outputChannel 순서에서 OutputSpec 지원 채널만 소문자로 추출 */
function channelOrderFromMeta(meta: AlarmMeta): OutputChannelKey[] {
  return (metaKeys(meta.outputChannel).map((k) => k.toLowerCase()) as OutputChannelKey[]).filter(
    (k) => (OUTPUT_SPEC_KEYS as string[]).includes(k)
  );
}

/** 채널 라벨(메타 소유) — "(준비중)" 접미사는 제거 */
function channelLabel(meta: AlarmMeta, key: OutputChannelKey): string {
  const raw = meta.outputChannel[key.toUpperCase()] ?? key;
  return raw.replace(/\(준비중\)/g, "").trim();
}

type ScopeFilter = "ALL" | AlarmScope;

/**
 * 알람/이벤트 정책 (WA-ALARM-POLICY, 통합)
 * 카테고리·디바이스 범위의 임계치(AI)·토글(DI) 정책과 레벨별 출력 채널
 * (알림/SOP/CCTV/SMS)·이펙트를 한 화면에서 관리한다.
 * 단일 API(/api/alarm/policies) + 서버 메타로 값/라벨/순서 구동.
 */
const AlarmEventPolicyPage = () => {
  const queryClient = useQueryClient();
  const { openModal, closeModal } = useModal();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("ALL");

  const { data: meta } = useAlarmMeta();

  const { data: all = [], isLoading, isError, error } = useQuery({
    queryKey: ALARM_POLICY_QUERY_KEY,
    queryFn: fetchAlarmPolicies,
  });

  const policies = useMemo(
    () => (scopeFilter === "ALL" ? all : all.filter((p) => p.scope === scopeFilter)),
    [all, scopeFilter]
  );

  const selected = policies.find((p) => p.policyId === selectedId) ?? null;

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
      title: policy ? "알람/이벤트 정책 수정" : "알람/이벤트 정책 등록",
      hideFooter: true,
      wide: true,
      content: <AlarmEventPolicyModal policy={policy} onClose={closeModal} />,
    });
  };

  const openDelete = (policy: AlarmPolicy) => {
    openModal({
      title: "알람/이벤트 정책 삭제",
      content: `정책 "${policy.policyName}" 을(를) 삭제할까요?`,
      onConfirm: () => removePolicy(policy.policyId),
    });
  };

  const loading = isLoading || !meta;

  // scope 필터 탭 (전체 + 메타 scope)
  const scopeTabs: { key: ScopeFilter; label: string }[] = [
    { key: "ALL", label: "전체" },
    ...(meta
      ? (metaKeys(meta.scope) as AlarmScope[]).map((s) => ({
          key: s as ScopeFilter,
          label: meta.scope[s] ?? s,
        }))
      : []),
  ];

  return (
    <AdminPageTemplate
      title="알람/이벤트 정책"
      description="카테고리·장비(포인트) 범위의 임계치(AI)·토글(DI) 정책과 레벨(주의·경계·심각)별 출력 채널(알림·SOP·CCTV·SMS)·이펙트를 관리합니다."
    >
      <PanelHead>
        <TabBar>
          {scopeTabs.map((t) => (
            <Tab
              key={t.key}
              type="button"
              $active={scopeFilter === t.key}
              onClick={() => setScopeFilter(t.key)}
            >
              {t.label}
            </Tab>
          ))}
        </TabBar>
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
              <Th>대상 · 포인트</Th>
              <Th $center>발생 조건</Th>
              <Th $center>레벨 · 출력 채널</Th>
              <Th $center>관리</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <Td colSpan={6} $center>
                  불러오는 중…
                </Td>
              </tr>
            ) : isError ? (
              <tr>
                <Td colSpan={6} $center>
                  {(error as Error)?.message ?? "목록을 불러오지 못했습니다."}
                </Td>
              </tr>
            ) : policies.length === 0 ? (
              <tr>
                <Td colSpan={6} $center>
                  등록된 정책이 없습니다. "+ 정책 등록"으로 추가하세요.
                </Td>
              </tr>
            ) : (
              policies.map((p) => (
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
                      {meta!.scope[p.scope] ?? p.scope}
                    </ScopeBadge>
                  </Td>
                  <Td>
                    <TargetText>{targetText(p)}</TargetText>
                  </Td>
                  <Td $center>
                    <CondText>{formatCondition(p, meta!)}</CondText>
                  </Td>
                  <Td>
                    <LevelChannelSummary policy={p} meta={meta!} />
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
              ))
            )}
          </tbody>
        </Table>
      </TableWrap>

      {/* 선택 정책 상세 — 레벨별 임계값 + 출력 채널 */}
      {selected && meta && (
        <DetailPanel>
          <DetailHead>
            <DetailTitle>
              선택 정책: <strong>{selected.policyName}</strong>
            </DetailTitle>
            <DetailMeta>
              {meta.scope[selected.scope] ?? selected.scope} · {targetText(selected)}
            </DetailMeta>
          </DetailHead>
          {selected.levels?.length ? (
            <DetailTable>
              <thead>
                <tr>
                  <Th $center style={{ width: 110 }}>
                    레벨
                  </Th>
                  <Th $center style={{ width: 120 }}>
                    임계값
                  </Th>
                  <Th>출력 채널</Th>
                </tr>
              </thead>
              <tbody>
                {[...selected.levels]
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((l) => {
                    const cfg = levelColor(l.level);
                    const chans = enabledChannels(
                      l.outputs,
                      channelOrderFromMeta(meta)
                    );
                    return (
                      <tr key={l.level}>
                        <Td $center>
                          <LevelBadge $bg={cfg.bg} $color={cfg.color}>
                            <Dot style={{ background: cfg.dot }} />
                            {meta.level[l.level] ?? l.level}
                          </LevelBadge>
                        </Td>
                        <Td $center>
                          <Mono>
                            {l.thresholdValue != null ? l.thresholdValue : "-"}
                          </Mono>
                        </Td>
                        <Td>
                          {chans.length ? (
                            <ChannelChips>
                              {chans.map((c) => {
                                const col = channelColor(c);
                                return (
                                  <ChannelChip
                                    key={c}
                                    $bg={col.bg}
                                    $color={col.color}
                                  >
                                    {channelLabel(meta, c)}
                                    {c === "sop" &&
                                      l.outputs?.sop?.templateId != null &&
                                      ` #${l.outputs.sop.templateId}`}
                                    {c === "cctv" &&
                                      l.outputs?.cctv?.limit != null &&
                                      ` ${l.outputs.cctv.limit}분할`}
                                  </ChannelChip>
                                );
                              })}
                            </ChannelChips>
                          ) : (
                            <Muted>채널 없음</Muted>
                          )}
                        </Td>
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

export default AlarmEventPolicyPage;

/** 목록 행: 레벨별로 켜진 출력 채널을 한 줄 요약 (메타 구동) */
const LevelChannelSummary = ({
  policy,
  meta,
}: {
  policy: AlarmPolicy;
  meta: AlarmMeta;
}) => {
  const levelOrder = metaKeys(meta.level);
  const channelOrder = channelOrderFromMeta(meta);

  const present = levelOrder.filter((lv) =>
    policy.levels?.some((l) => l.level === lv)
  );
  if (present.length === 0) return <Muted>-</Muted>;

  return (
    <SummaryWrap>
      {present.map((lv) => {
        const cfg = levelColor(lv);
        const level = policy.levels?.find((l) => l.level === lv);
        const chans = enabledChannels(level?.outputs, channelOrder);
        return (
          <SummaryRow key={lv}>
            <LevelBadge $bg={cfg.bg} $color={cfg.color}>
              <Dot style={{ background: cfg.dot }} />
              {meta.level[lv] ?? lv}
            </LevelBadge>
            <SummaryChips>
              {chans.length ? (
                chans.map((c) => {
                  const col = channelColor(c);
                  return (
                    <MiniChip key={c} $bg={col.bg} $color={col.color}>
                      {channelLabel(meta, c)}
                    </MiniChip>
                  );
                })
              ) : (
                <Muted>채널 없음</Muted>
              )}
            </SummaryChips>
          </SummaryRow>
        );
      })}
    </SummaryWrap>
  );
};

const PanelHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
`;

const TabBar = styled.div`
  display: inline-flex;
  gap: 6px;
`;

const Tab = styled.button<{ $active?: boolean }>`
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 999px;
  cursor: pointer;
  border: 1px solid ${(p) => (p.$active ? "#2563eb" : "#e5e7eb")};
  background: ${(p) => (p.$active ? "#eff6ff" : "#fff")};
  color: ${(p) => (p.$active ? "#2563eb" : "#6b7280")};
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

const TargetText = styled.code`
  font-size: 12px;
  color: #374151;
  font-family: monospace;
`;

const CondText = styled.span`
  font-size: 12px;
  font-family: monospace;
  color: #374151;
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
  white-space: nowrap;
`;

const Dot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
`;

const SummaryWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const SummaryRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SummaryChips = styled.div`
  display: inline-flex;
  gap: 4px;
  flex-wrap: wrap;
`;

const MiniChip = styled.span<{ $bg: string; $color: string }>`
  display: inline-block;
  padding: 1px 7px;
  font-size: 10px;
  font-weight: 700;
  border-radius: 6px;
  background: ${(p) => p.$bg};
  color: ${(p) => p.$color};
`;

const BtnGroup = styled.div`
  display: flex;
  gap: 5px;
  justify-content: center;
`;

const Muted = styled.span`
  color: #9ca3af;
  font-size: 12px;
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

const ChannelChips = styled.div`
  display: inline-flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const ChannelChip = styled.span<{ $bg: string; $color: string }>`
  display: inline-block;
  padding: 2px 9px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 6px;
  background: ${(p) => p.$bg};
  color: ${(p) => p.$color};
`;

const EmptyDetail = styled.div`
  padding: 16px 0;
  font-size: 13px;
  color: #9ca3af;
  text-align: center;
`;
