import { showAlert, showConfirm } from "@/utils/dialogBridge";
import { useMemo, useState } from "react";
import styled from "styled-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui";
import { deviceLabel } from "@/utils/deviceLabel";
import {
  bulkAssignInfraDevicesAPI,
  bulkUnassignInfraDevicesAPI,
  DEVICE_INFRA_QUERY_KEY,
  deviceInfraCandidatesQueryKey,
  deviceInfraMappedQueryKey,
  fetchInfraMappedDevicesAPI,
  fetchInfraMappingCandidatesAPI,
  INFRA_TYPE_LABEL,
  type DeviceInfraDTO,
} from "@/services/deviceInfraService";

interface DeviceInfraMappingModalProps {
  /** 매핑 기준 인프라 */
  infra: DeviceInfraDTO;
  onClose: () => void;
}

/**
 * 인프라 기준 장비 수동 매핑 모달 (openModal wide + hideFooter 패턴).
 * 좌: 매핑된 장비(체크 다중선택 → 일괄 해제) / 우: 후보 검색(체크 다중선택 → 일괄 추가).
 * 타 인프라 소속 후보는 현재 소속을 배지로 표시하고, 추가 시 이 인프라로 이동한다.
 * 성공 시 "device-infra" 프리픽스 invalidate — 매핑 목록/후보/인프라 목록(mappedDeviceCount)/정합성 모두 갱신.
 * 서버 에러는 전역 api 에러 모달이 처리한다.
 */
const DeviceInfraMappingModal = ({ infra, onClose }: DeviceInfraMappingModalProps) => {
  const queryClient = useQueryClient();
  const infraId = infra.infraId;

  // ─── 매핑된 장비 ───
  const { data: mapped = [], isLoading: loadingMapped } = useQuery({
    queryKey: deviceInfraMappedQueryKey(infraId),
    queryFn: () => fetchInfraMappedDevicesAPI(infraId),
  });

  // ─── 후보 검색 (엔터/버튼으로 적용) ───
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const { data: candidates = [], isLoading: loadingCandidates } = useQuery({
    queryKey: deviceInfraCandidatesQueryKey(infraId, keyword),
    queryFn: () => fetchInfraMappingCandidatesAPI({ infraId, keyword: keyword || undefined }),
  });

  // ─── 체크 선택 상태 ───
  const [mappedSel, setMappedSel] = useState<Set<number>>(new Set());
  const [candSel, setCandSel] = useState<Set<number>>(new Set());

  // 검색 적용 시 후보 선택 초기화 — 화면에 보이는 후보만 선택/전송되도록(이동 확인 개수 정합)
  const handleSearch = () => {
    setKeyword(keywordInput.trim());
    setCandSel(new Set());
  };

  const toggleIn = (setter: React.Dispatch<React.SetStateAction<Set<number>>>, id: number) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allMappedChecked = mapped.length > 0 && mapped.every((d) => mappedSel.has(d.deviceId));
  const allCandChecked =
    candidates.length > 0 && candidates.every((d) => candSel.has(d.deviceId));

  const toggleAllMapped = () =>
    setMappedSel(allMappedChecked ? new Set() : new Set(mapped.map((d) => d.deviceId)));
  const toggleAllCand = () =>
    setCandSel(allCandChecked ? new Set() : new Set(candidates.map((d) => d.deviceId)));

  const invalidateAll = () => {
    // "device-infra" 프리픽스 — 목록(mappedDeviceCount)/매핑/후보/정합성 쿼리 일괄 무효화
    queryClient.invalidateQueries({ queryKey: DEVICE_INFRA_QUERY_KEY });
  };

  // ─── 일괄 해제 ───
  const { mutate: unassign, isPending: isUnassigning } = useMutation({
    mutationFn: (deviceIds: number[]) => bulkUnassignInfraDevicesAPI({ infraId, deviceIds }),
    onSuccess: ({ affectedCount }) => {
      setMappedSel(new Set());
      invalidateAll();
      showAlert(`${affectedCount}개 장비가 해제되었습니다.`);
    },
    // onError 알림 없음 — 전역 api 에러 모달이 처리
  });

  const handleUnassign = async () => {
    const ids = [...mappedSel];
    if (ids.length === 0) return;
    const ok = await showConfirm(`선택한 ${ids.length}개 장비의 매핑을 해제할까요?`);
    if (!ok) return;
    unassign(ids);
  };

  // ─── 일괄 추가 ───
  const { mutate: assign, isPending: isAssigning } = useMutation({
    mutationFn: (deviceIds: number[]) => bulkAssignInfraDevicesAPI({ infraId, deviceIds }),
    onSuccess: ({ affectedCount }) => {
      setCandSel(new Set());
      invalidateAll();
      showAlert(`${affectedCount}개 장비가 매핑되었습니다.`);
    },
    // onError 알림 없음 — 전역 api 에러 모달이 처리
  });

  const selectedCandidates = useMemo(
    () => candidates.filter((c) => candSel.has(c.deviceId)),
    [candidates, candSel]
  );

  const handleAssign = async () => {
    const ids = [...candSel];
    if (ids.length === 0) return;
    const movedCount = selectedCandidates.filter((c) => c.infraId != null).length;
    if (movedCount > 0) {
      const ok = await showConfirm(
        `타 인프라 소속 ${movedCount}개 포함 — 이 인프라로 이동합니다. 진행할까요?`
      );
      if (!ok) return;
    }
    assign(ids);
  };

  return (
    <Wrap>
      <Desc>
        <InfraName>{infra.infraName}</InfraName>
        <TypeBadge>{INFRA_TYPE_LABEL[infra.infraType] ?? infra.infraType}</TypeBadge>
        {infra.refInfraCode && <RefCode>{infra.refInfraCode}</RefCode>}
        <DescText>
          — 이 인프라에 소속시킬 장비를 추가하거나, 매핑된 장비를 해제합니다. 수동
          매핑은 자동 산정이 덮지 않습니다.
        </DescText>
      </Desc>

      <Cols>
        {/* ── 매핑된 장비 ── */}
        <Panel>
          <PanelHead>
            <PanelTitle>
              매핑된 장비
              <Count>{mapped.length}대</Count>
            </PanelTitle>
            <Button
              variant="danger"
              size="sm"
              onClick={handleUnassign}
              disabled={mappedSel.size === 0 || isUnassigning}
            >
              {isUnassigning ? "해제 중…" : `선택 해제 (${mappedSel.size})`}
            </Button>
          </PanelHead>
          <TableScroll>
            <MapTable>
              <thead>
                <tr>
                  <Th $center style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={allMappedChecked}
                      onChange={toggleAllMapped}
                      disabled={mapped.length === 0}
                      title="전체 선택"
                    />
                  </Th>
                  <Th>장비</Th>
                  <Th style={{ width: 120 }}>카테고리</Th>
                </tr>
              </thead>
              <tbody>
                {loadingMapped ? (
                  <tr>
                    <Td colSpan={3} $center>불러오는 중…</Td>
                  </tr>
                ) : mapped.length === 0 ? (
                  <tr>
                    <Td colSpan={3} $center>매핑된 장비가 없습니다.</Td>
                  </tr>
                ) : (
                  mapped.map((d) => (
                    <Row
                      key={d.deviceId}
                      $on={mappedSel.has(d.deviceId)}
                      onClick={() => toggleIn(setMappedSel, d.deviceId)}
                    >
                      <Td $center>
                        <input
                          type="checkbox"
                          checked={mappedSel.has(d.deviceId)}
                          onChange={() => toggleIn(setMappedSel, d.deviceId)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Td>
                      <Td>{deviceLabel(d) || `Device#${d.deviceId}`}</Td>
                      <Td>
                        <SubText>{d.categoryName ?? "-"}</SubText>
                      </Td>
                    </Row>
                  ))
                )}
              </tbody>
            </MapTable>
          </TableScroll>
        </Panel>

        {/* ── 장비 추가 (후보 검색) ── */}
        <Panel>
          <PanelHead>
            <PanelTitle>
              장비 추가
              <Count>{candidates.length}건</Count>
            </PanelTitle>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAssign}
              disabled={candSel.size === 0 || isAssigning}
            >
              {isAssigning ? "추가 중…" : `선택 추가 (${candSel.size})`}
            </Button>
          </PanelHead>
          <SearchRow>
            <SearchInput
              placeholder="장비명/표시명 검색"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button variant="secondary" size="sm" onClick={handleSearch}>
              검색
            </Button>
          </SearchRow>
          <TableScroll>
            <MapTable>
              <thead>
                <tr>
                  <Th $center style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={allCandChecked}
                      onChange={toggleAllCand}
                      disabled={candidates.length === 0}
                      title="전체 선택"
                    />
                  </Th>
                  <Th>장비</Th>
                  <Th style={{ width: 110 }}>카테고리</Th>
                  <Th style={{ width: 130 }}>현재 소속</Th>
                </tr>
              </thead>
              <tbody>
                {loadingCandidates ? (
                  <tr>
                    <Td colSpan={4} $center>불러오는 중…</Td>
                  </tr>
                ) : candidates.length === 0 ? (
                  <tr>
                    <Td colSpan={4} $center>
                      {keyword ? "검색 결과가 없습니다." : "추가할 후보 장비가 없습니다. 키워드로 검색해 보세요."}
                    </Td>
                  </tr>
                ) : (
                  candidates.map((c) => (
                    <Row
                      key={c.deviceId}
                      $on={candSel.has(c.deviceId)}
                      onClick={() => toggleIn(setCandSel, c.deviceId)}
                    >
                      <Td $center>
                        <input
                          type="checkbox"
                          checked={candSel.has(c.deviceId)}
                          onChange={() => toggleIn(setCandSel, c.deviceId)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Td>
                      <Td>{deviceLabel(c) || `Device#${c.deviceId}`}</Td>
                      <Td>
                        <SubText>{c.categoryName ?? "-"}</SubText>
                      </Td>
                      <Td>
                        {c.infraName ? (
                          <OwnerBadge title="추가 시 이 인프라로 이동됩니다">
                            {c.infraName} <MoveNote>이동됨</MoveNote>
                          </OwnerBadge>
                        ) : (
                          <SubText>미매핑</SubText>
                        )}
                      </Td>
                    </Row>
                  ))
                )}
              </tbody>
            </MapTable>
          </TableScroll>
          <PanelFoot>후보는 최대 100건까지 표시됩니다. 타 인프라 소속 장비는 추가 시 이 인프라로 이동합니다.</PanelFoot>
        </Panel>
      </Cols>

      <Footer>
        <Button variant="outline" type="button" onClick={onClose}>
          닫기
        </Button>
      </Footer>
    </Wrap>
  );
};

export default DeviceInfraMappingModal;

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
`;

const Desc = styled.p`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 0 0 14px 0;
  font-size: 13px;
  color: #4b5563;
  line-height: 1.5;
`;

const InfraName = styled.strong`
  font-size: 14px;
  color: #111d2c;
`;

const TypeBadge = styled.span`
  display: inline-block;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 12px;
  background: #e8ecf1;
  color: #4a6380;
  white-space: nowrap;
`;

const RefCode = styled.code`
  font-size: 11px;
  font-weight: 600;
  color: #4a6380;
  background: #f1f5f9;
  padding: 1px 6px;
  border-radius: 4px;
`;

const DescText = styled.span`
  color: #6b7280;
`;

const Cols = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  align-items: start;
  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
`;

const PanelHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
`;

const PanelTitle = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: #374151;
`;

const Count = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
`;

const SearchRow = styled.div`
  display: flex;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid #f3f4f6;
`;

const SearchInput = styled.input`
  box-sizing: border-box;
  flex: 1;
  min-width: 0;
  padding: 6px 10px;
  font-size: 13px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
  &::placeholder {
    color: #9ca3af;
  }
  &:focus {
    border-color: #4a90d9;
  }
`;

const TableScroll = styled.div`
  max-height: 340px;
  overflow-y: auto;
`;

const MapTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
`;

const Th = styled.th<{ $center?: boolean }>`
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 8px 10px;
  text-align: ${(p) => (p.$center ? "center" : "left")};
  font-size: 12px;
  font-weight: 700;
  color: #374151;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
`;

const Td = styled.td<{ $center?: boolean }>`
  padding: 7px 10px;
  border-bottom: 1px solid #f3f4f6;
  color: #111827;
  text-align: ${(p) => (p.$center ? "center" : "left")};
`;

const Row = styled.tr<{ $on?: boolean }>`
  cursor: pointer;
  background: ${(p) => (p.$on ? "#eff6ff" : "transparent")};
  &:hover {
    background: ${(p) => (p.$on ? "#e0edff" : "#f9fafb")};
  }
`;

const SubText = styled.span`
  font-size: 12px;
  color: #6b7280;
`;

const OwnerBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 12px;
  background: #fef3c7;
  color: #92400e;
  white-space: nowrap;
`;

const MoveNote = styled.span`
  font-size: 10px;
  font-weight: 500;
  color: #b45309;
`;

const PanelFoot = styled.div`
  padding: 6px 12px;
  font-size: 11px;
  color: #94a3b8;
  background: #f8fafc;
  border-top: 1px solid #f3f4f6;
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 16px;
  margin-top: 14px;
  border-top: 1px solid #e5e7eb;
`;
