import { showAlert, showConfirm } from "@/utils/dialogBridge";
import { useState } from "react";
import styled from "styled-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import { Button, Select } from "@/components/ui";
import DeviceInfraForm from "@/components/modal/infra/DeviceInfraForm";
import DeviceInfraConsistencyModal from "@/components/modal/infra/DeviceInfraConsistencyModal";
import DeviceInfraMappingModal from "@/components/modal/infra/DeviceInfraMappingModal";
import { useModal } from "@/contexts/ModalContext";
import {
  autoAssignDeviceInfraAPI,
  deleteDeviceInfraAPI,
  DEVICE_INFRA_QUERY_KEY,
  fetchDeviceInfrasAPI,
  INFRA_TYPE_LABEL,
  type DeviceInfraDTO,
  type InfraType,
} from "@/services/deviceInfraService";
import {
  CONNECTION_STATE_LABEL,
  connectionStateColor,
  type ConnectionState,
} from "@/services/deviceService";

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/**
 * 인프라 관리 — 인프라 마스터(중계기/NVR/VMS/미들웨어) CRUD + 장비 매핑 자동 산정/정합성 리포트.
 * 장비 소속 수동 지정(드롭다운)은 장비 상세/등록 폼에서 후속 반영 예정.
 */
const DeviceInfraManagePage = () => {
  const { openModal, closeModal } = useModal();
  const queryClient = useQueryClient();

  const [typeFilter, setTypeFilter] = useState<InfraType | "">("");

  const { data: infras = [], isLoading } = useQuery({
    queryKey: [...DEVICE_INFRA_QUERY_KEY, "list", typeFilter || "all"],
    queryFn: () => fetchDeviceInfrasAPI(typeFilter),
  });

  // 삭제 — 소속 장비 infra_id 는 FK(SET NULL)로 해제됨
  const { mutate: removeInfra, isPending: isDeleting } = useMutation({
    mutationFn: deleteDeviceInfraAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEVICE_INFRA_QUERY_KEY });
    },
    // onError 알림 없음 — 전역 api 에러 모달이 처리
  });

  // 자동 산정 — 미매핑(infra_id NULL) 장비만 채움(수동 우선)
  const { mutate: autoAssign, isPending: isAssigning } = useMutation({
    mutationFn: () => autoAssignDeviceInfraAPI(),
    onSuccess: ({ assignedCount }) => {
      queryClient.invalidateQueries({ queryKey: DEVICE_INFRA_QUERY_KEY });
      showAlert(`${assignedCount}개 장비가 매핑되었습니다.`);
    },
    // onError 알림 없음 — 전역 api 에러 모달이 처리
  });

  const handleDeleteInfra = async (infra: DeviceInfraDTO) => {
    const ok = await showConfirm(
      "이 인프라를 삭제할까요?\n소속 장비의 매핑은 해제됩니다(상태는 마지막 값 유지)."
    );
    if (!ok) return;
    removeInfra(infra.infraId);
  };

  const handleAutoAssign = async () => {
    const ok = await showConfirm(
      "포인트 ref 기준으로 미매핑 장비의 인프라를 자동 산정할까요?\n(수동 지정된 장비는 변경되지 않습니다)"
    );
    if (!ok) return;
    autoAssign();
  };

  const openRegisterModal = () => {
    openModal({
      title: "인프라 등록",
      hideFooter: true,
      content: (
        <DeviceInfraForm
          onCancel={closeModal}
          onSuccess={(res) => {
            closeModal();
            showAlert(res?.message || "인프라가 등록되었습니다.");
          }}
        />
      ),
    });
  };

  const openEditModal = (infra: DeviceInfraDTO) => {
    openModal({
      title: `인프라 수정 — ${infra.infraName}`,
      hideFooter: true,
      content: (
        <DeviceInfraForm
          initial={infra}
          onCancel={closeModal}
          onSuccess={(res) => {
            closeModal();
            showAlert(res?.message || "인프라가 수정되었습니다.");
          }}
        />
      ),
    });
  };

  const openConsistencyModal = () => {
    openModal({
      title: "인프라 매핑 정합성 리포트",
      hideFooter: true,
      wide: true,
      content: <DeviceInfraConsistencyModal />,
    });
  };

  const openMappingModal = (infra: DeviceInfraDTO) => {
    openModal({
      title: `장비 매핑 — ${infra.infraName}`,
      hideFooter: true,
      wide: true,
      content: <DeviceInfraMappingModal infra={infra} onClose={closeModal} />,
    });
  };

  return (
    <AdminPageTemplate
      title="인프라 관리"
      description="중계기/NVR/VMS/미들웨어 인프라 마스터를 관리하고, 장비 소속 매핑을 자동 산정·검수합니다."
    >
      <Toolbar>
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as InfraType | "")}
          style={{ height: TOOLBAR_CONTROL_HEIGHT, minWidth: 160 }}
        >
          <option value="">전체 타입</option>
          {(Object.keys(INFRA_TYPE_LABEL) as InfraType[]).map((t) => (
            <option key={t} value={t}>
              {INFRA_TYPE_LABEL[t]}
            </option>
          ))}
        </Select>
        <Summary>
          총 {infras.length}건
          {typeFilter ? ` · 타입: ${INFRA_TYPE_LABEL[typeFilter]}` : ""}
        </Summary>
        <Button
          variant="secondary"
          onClick={handleAutoAssign}
          disabled={isAssigning}
          title="포인트 ref 최빈값 기준으로 미매핑 장비의 인프라 소속을 일괄 산정합니다"
          style={{ height: TOOLBAR_CONTROL_HEIGHT, marginLeft: "auto", flexShrink: 0 }}
        >
          {isAssigning ? "산정 중..." : "자동 산정"}
        </Button>
        <Button
          variant="secondary"
          onClick={openConsistencyModal}
          title="미매핑 장비/다중 ref 참조 장비 검수"
          style={{ height: TOOLBAR_CONTROL_HEIGHT, flexShrink: 0 }}
        >
          정합성 리포트
        </Button>
        <Button
          variant="primary"
          onClick={openRegisterModal}
          style={{ height: TOOLBAR_CONTROL_HEIGHT, flexShrink: 0 }}
        >
          + 인프라 등록
        </Button>
      </Toolbar>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th $center style={{ width: 70 }}>번호</Th>
              <Th style={{ width: 240 }}>이름</Th>
              <Th $center style={{ width: 130 }}>타입</Th>
              <Th $center style={{ width: 160 }}>ref 코드</Th>
              <Th $center style={{ width: 120 }}>네트워크 상태</Th>
              <Th $center style={{ width: 80 }}>활성</Th>
              <Th $center style={{ width: 110 }}>매핑 장비 수</Th>
              <Th $center style={{ width: 240 }}>관리</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <Td colSpan={8} $center>
                  불러오는 중...
                </Td>
              </tr>
            ) : infras.length === 0 ? (
              <tr>
                <Td colSpan={8} $center>
                  {typeFilter
                    ? "해당 타입의 인프라가 없습니다."
                    : "등록된 인프라가 없습니다. [+ 인프라 등록]으로 추가하세요."}
                </Td>
              </tr>
            ) : (
              infras.map((infra, idx) => (
                <tr key={infra.infraId}>
                  <Td $center>{idx + 1}</Td>
                  <Td>{infra.infraName}</Td>
                  <Td $center>
                    <TypeBadge>{INFRA_TYPE_LABEL[infra.infraType] ?? infra.infraType}</TypeBadge>
                  </Td>
                  <Td $center>
                    {infra.refInfraCode ? (
                      <RefCode>{infra.refInfraCode}</RefCode>
                    ) : (
                      "-"
                    )}
                  </Td>
                  <Td $center>
                    <StateBadge
                      $state={infra.networkState ?? "UNKNOWN"}
                      title={`최근 통신: ${formatDateTime(infra.lastCommAt)}`}
                    >
                      {CONNECTION_STATE_LABEL[
                        (infra.networkState ?? "UNKNOWN") as ConnectionState
                      ] ?? CONNECTION_STATE_LABEL.UNKNOWN}
                    </StateBadge>
                  </Td>
                  <Td $center>
                    <Badge $active={infra.active}>{infra.active ? "활성" : "비활성"}</Badge>
                  </Td>
                  <Td $center>{infra.mappedDeviceCount}</Td>
                  <Td $center>
                    <BtnGroup>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openMappingModal(infra)}
                        title="이 인프라 소속 장비를 추가/해제합니다"
                      >
                        장비 매핑
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => openEditModal(infra)}>
                        수정
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteInfra(infra)}
                        disabled={isDeleting}
                      >
                        삭제
                      </Button>
                    </BtnGroup>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </TableWrap>
    </AdminPageTemplate>
  );
};

export default DeviceInfraManagePage;

const TOOLBAR_CONTROL_HEIGHT = "36px";

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 8px;
  padding: 16px 20px;
  margin-bottom: 12px;
  background: #ffffff;
  border: 1px solid #e1e2e5;
  border-radius: 5px;
`;

const Summary = styled.span`
  display: inline-flex;
  align-items: center;
  height: ${TOOLBAR_CONTROL_HEIGHT};
  font-size: 13px;
  line-height: 1.4;
  color: #6b7280;
  white-space: nowrap;
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
  text-align: left;
  font-weight: 700;
  color: #111827;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  ${(p) => p.$center && "text-align: center;"}
`;

const Td = styled.td<{ $center?: boolean }>`
  padding: 11px 16px;
  border-bottom: 1px solid #e5e7eb;
  color: #111827;
  ${(p) => p.$center && "text-align: center;"}
`;

const Badge = styled.span<{ $active?: boolean }>`
  display: inline-block;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 12px;
  background: ${(p) => (p.$active ? "#dcfce7" : "#fee2e2")};
  color: ${(p) => (p.$active ? "#15803d" : "#dc2626")};
`;

const TypeBadge = styled.span`
  display: inline-block;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 12px;
  background: #e8ecf1;
  color: #4a6380;
  white-space: nowrap;
`;

const RefCode = styled.code`
  font-size: 12px;
  font-weight: 600;
  color: #4a6380;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 4px;
`;

const BtnGroup = styled.div`
  display: flex;
  gap: 6px;
  justify-content: center;
  flex-wrap: wrap;
`;

/* 네트워크 상태 배지 — 색은 deviceService 의 CONNECTION_STATE_COLOR 단일 소스
   (NORMAL/ABNORMAL/DISCONNECTED/UNKNOWN, 미지정은 UNKNOWN 회색 폴백) */
const StateBadge = styled.span<{ $state: string }>`
  display: inline-block;
  padding: 2px 10px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 12px;
  white-space: nowrap;
  background: ${(p) => connectionStateColor(p.$state).bg};
  color: ${(p) => connectionStateColor(p.$state).color};
`;
