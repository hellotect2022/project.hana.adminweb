import { showAlert } from "@/utils/dialogBridge";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import ZonePolicyCreateModal from "@/components/modal/zone/ZonePolicyCreateModal";
import { useModal } from "@/contexts/ModalContext";
import {
  deleteZonePolicyAPI,
  fetchZonePolicies,
  fetchZoneSummary,
  saveZonePoliciesAPI,
  ZONE_POLICY_QUERY_KEY,
  ZONE_POLICY_SUMMARY_QUERY_KEY,
} from "@/services/spaceZoneService";
import { Button, Tab, TabBar, Input, Toggle } from "@/components/ui";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

const TABS = [
  { key: "LIGHTING", label: "조명 구역" },
  { key: "FIRE_DETECTION", label: "화재감지 구역" },
];

/**
 * 공간(구역)·조명/화재감지 관리 (WA-SPACE-LIGHT)
 * 구역(Zone, 위치)에 대한 표시 정책(색상/투명도/활성)을 관리. 상태(ON/OFF/Fault)는 집계값.
 */
const SpaceLightManagePage = () => {
  const { openModal, closeModal } = useModal();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("LIGHTING");
  const isFire = tab === "FIRE_DETECTION";

  const { data: summary = { total: 0, on: 0, off: 0, fault: 0 } } = useQuery({
    queryKey: [...ZONE_POLICY_SUMMARY_QUERY_KEY, tab],
    queryFn: () => fetchZoneSummary(tab),
  });

  const { data: policies = [], isLoading, isError, error } = useQuery({
    queryKey: [...ZONE_POLICY_QUERY_KEY, tab],
    queryFn: () => fetchZonePolicies(tab),
  });

  // 인라인 편집용 로컬 복사본
  const [rows, setRows] = useState([]);
  useEffect(() => {
    setRows(policies.map((p) => ({ ...p })));
  }, [policies]);

  const patchRow = (policyId, patch) =>
    setRows((prev) => prev.map((r) => (r.policyId === policyId ? { ...r, ...patch } : r)));

  const { mutate: saveAll, isPending: isSaving } = useMutation({
    mutationFn: saveZonePoliciesAPI,
    onSuccess: (res) => {
      if (res?.success === false) {
        showAlert(res?.message || "저장에 실패했습니다.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ZONE_POLICY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ZONE_POLICY_SUMMARY_QUERY_KEY });
      showAlert("정책이 저장되었습니다.");
    },
    onError: (err) => showAlert(getApiErrorMessage(err, "정책 저장 중 오류가 발생했습니다.")),
  });

  const { mutate: removePolicy } = useMutation({
    mutationFn: deleteZonePolicyAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ZONE_POLICY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ZONE_POLICY_SUMMARY_QUERY_KEY });
      closeModal();
    },
    onError: (err) => showAlert(getApiErrorMessage(err, "삭제 중 오류가 발생했습니다.")),
  });

  const handleSave = () => {
    saveAll(
      rows.map((r) => ({
        policyId: r.policyId,
        displayName: r.displayName,
        colorCode: r.colorCode,
        opacity: r.opacity != null ? Number(r.opacity) : null,
        active: r.active,
        evacuationAutoShow: isFire ? r.evacuationAutoShow : null,
      }))
    );
  };

  const openCreateModal = () => {
    openModal({
      title: tab === "LIGHTING" ? "조명 구역 추가" : "화재감지 구역 추가",
      hideFooter: true,
      wide: true,
      content: <ZonePolicyCreateModal systemType={tab} onClose={closeModal} />,
    });
  };

  const openDeleteModal = (row) => {
    openModal({
      title: "표현정책 삭제",
      content: `구역 "${row.displayName || row.zoneName}" 의 표현정책을 삭제할까요? (Zone/장비는 삭제되지 않습니다)`,
      onConfirm: () => removePolicy(row.policyId),
    });
  };

  const colSpan = isFire ? 7 : 6;

  return (
    <AdminPageTemplate
      title="3D 공간(구역)·조명/화재감지 관리"
      description="구역(Zone)별 표시 위치와 상태별 표현 정책(색상·투명도·활성)을 관리합니다."
    >
      <TabBar>
        {TABS.map((t) => (
          <Tab key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
          </Tab>
        ))}
      </TabBar>

      <Cards>
        <Card>
          <CardNum>{summary.total}</CardNum>
          <CardLabel>전체 구역</CardLabel>
        </Card>
        <Card>
          <CardNum $tone="on">{summary.on}</CardNum>
          <CardLabel>정상(ON)</CardLabel>
        </Card>
        <Card>
          <CardNum $tone="off">{summary.off}</CardNum>
          <CardLabel>소등(OFF)</CardLabel>
        </Card>
        <Card>
          <CardNum $tone="fault">{summary.fault}</CardNum>
          <CardLabel>Fault</CardLabel>
        </Card>
      </Cards>

      <PanelHead>
        <PanelTitle>
          {isFire ? "화재감지 구역" : "조명 구역"} — 구역별 Zone(위치) 및 상태별 표현 정책
        </PanelTitle>
        <Button variant="primary" onClick={openCreateModal}>
          + 구역 추가
        </Button>
      </PanelHead>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>구역명</Th>
              <Th>Zone(위치)</Th>
              <Th>색상 코드</Th>
              <Th $center>투명도</Th>
              <Th $center>활성</Th>
              {isFire && <Th $center>피난대피로 자동표시</Th>}
              <Th $center>관리</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><Td colSpan={colSpan} $center>불러오는 중…</Td></tr>
            ) : isError ? (
              <tr><Td colSpan={colSpan} $center>{error?.message ?? "목록을 불러오지 못했습니다."}</Td></tr>
            ) : rows.length === 0 ? (
              <tr><Td colSpan={colSpan} $center>등록된 구역이 없습니다. "+ 구역 추가"로 등록하세요.</Td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.policyId}>
                  <Td>
                    <Input
                      value={r.displayName ?? ""}
                      onChange={(e) => patchRow(r.policyId, { displayName: e.target.value })}
                      style={{ width: "100%" }}
                    />
                  </Td>
                  <Td>
                    <ZoneLoc>
                      {r.buildingName} {r.floorName} · {r.zoneName}
                    </ZoneLoc>
                  </Td>
                  <Td>
                    <ColorRow>
                      <input
                        type="color"
                        value={r.colorCode || "#cccccc"}
                        onChange={(e) => patchRow(r.policyId, { colorCode: e.target.value })}
                      />
                      <Input
                        value={r.colorCode ?? ""}
                        onChange={(e) => patchRow(r.policyId, { colorCode: e.target.value })}
                        style={{ width: 110 }}
                        maxLength={16}
                      />
                    </ColorRow>
                  </Td>
                  <Td $center>
                    <OpacityCell>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={r.opacity ?? 0}
                        onChange={(e) => patchRow(r.policyId, { opacity: e.target.value })}
                        style={{ width: 70 }}
                      />
                      %
                    </OpacityCell>
                  </Td>
                  <Td $center>
                    <Toggle on={!!r.active} onClick={() => patchRow(r.policyId, { active: !r.active })}>
                      {r.active ? "활성" : "비활성"}
                    </Toggle>
                  </Td>
                  {isFire && (
                    <Td $center>
                      <Toggle
                        on={!!r.evacuationAutoShow}
                        onClick={() => patchRow(r.policyId, { evacuationAutoShow: !r.evacuationAutoShow })}
                      >
                        {r.evacuationAutoShow ? "연동" : "미연동"}
                      </Toggle>
                    </Td>
                  )}
                  <Td $center>
                    <Button variant="danger" size="sm" onClick={() => openDeleteModal(r)}>
                      삭제
                    </Button>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </TableWrap>

      {/* <SaveBar>
        <Button variant="primary" onClick={handleSave} disabled={isSaving || rows.length === 0}>
          정책 저장
        </Button>
      </SaveBar> */}
    </AdminPageTemplate>
  );
};

export default SpaceLightManagePage;

const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 20px;

  @media (max-width: 760px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const Card = styled.div`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 18px 20px;
`;

const CardNum = styled.div<{ $tone?: "on" | "off" | "fault" }>`
  font-size: 28px;
  font-weight: 800;
  color: ${(p) =>
    p.$tone === "on" ? "#15803d" : p.$tone === "fault" ? "#dc2626" : p.$tone === "off" ? "#6b7280" : "#111d2c"};
`;

const CardLabel = styled.div`
  margin-top: 4px;
  font-size: 13px;
  color: #6b7280;
`;

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
  font-size: 14px;
`;

const Th = styled.th<{ $center?: boolean }>`
  padding: 12px 16px;
  text-align: ${(p) => (p.$center ? "center" : "left")};
  font-weight: 700;
  color: #111827;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
`;

const Td = styled.td<{ $center?: boolean }>`
  padding: 10px 16px;
  border-bottom: 1px solid #e5e7eb;
  color: #111827;
  text-align: ${(p) => (p.$center ? "center" : "left")};
  vertical-align: middle;
`;

const ZoneLoc = styled.span`
  color: #374151;
`;

const ColorRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  input[type="color"] {
    width: 34px;
    height: 32px;
    padding: 0;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: #fff;
    cursor: pointer;
  }
`;

const OpacityCell = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #374151;
`;

const SaveBar = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
`;
