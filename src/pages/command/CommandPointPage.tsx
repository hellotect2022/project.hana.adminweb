import { showAlert } from "@/utils/dialogBridge";
import { useState } from "react";
import styled from "styled-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import { Button } from "@/components/ui";
import DeviceHierarchyFilter from "@/components/device/DeviceHierarchyFilter";
import CommandPointModal from "@/components/modal/command/CommandPointModal";
import { useModal } from "@/contexts/ModalContext";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { EMPTY_HIERARCHY_FILTER } from "@/utils/deviceHierarchyFilterUtils";
import {
  commandPointsQueryKey,
  deleteCommandPoint,
  fetchCommandPoints,
  type CommandPointResponse,
} from "@/services/commandService";

/**
 * 제어 포인트 관리 (WA-COMMAND-POINT) — 디바이스 제어 그룹
 * 대>중>소>장비 필터로 디바이스를 선택하면 해당 디바이스의 제어 포인트를 조회/등록/수정/삭제한다.
 */
const CommandPointPage = () => {
  const queryClient = useQueryClient();
  const { openModal, closeModal } = useModal();

  const [filter, setFilter] = useState(EMPTY_HIERARCHY_FILTER);
  const [pickedDevice, setPickedDevice] = useState<any | null>(null);

  const deviceId = filter.deviceId ? Number(filter.deviceId) : undefined;
  const deviceName =
    pickedDevice?.deviceName ??
    (deviceId != null ? `Device#${deviceId}` : undefined);

  const {
    data: points = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: commandPointsQueryKey(deviceId ?? "none"),
    queryFn: () => fetchCommandPoints(deviceId!),
    enabled: deviceId != null,
  });

  const { mutate: removePoint } = useMutation({
    mutationFn: deleteCommandPoint,
    onSuccess: () => {
      if (deviceId != null)
        queryClient.invalidateQueries({ queryKey: commandPointsQueryKey(deviceId) });
      closeModal();
    },
    onError: (err) =>
      showAlert(getApiErrorMessage(err, "삭제 중 오류가 발생했습니다.")),
  });

  const openEditor = (cp: CommandPointResponse | null) => {
    if (deviceId == null) {
      showAlert("먼저 대상 디바이스를 선택하세요.");
      return;
    }
    openModal({
      title: cp ? "제어 포인트 수정" : "제어 포인트 등록",
      hideFooter: true,
      wide: true,
      content: (
        <CommandPointModal
          deviceId={deviceId}
          deviceName={deviceName}
          commandPoint={cp}
          onClose={closeModal}
        />
      ),
    });
  };

  const openDelete = (cp: CommandPointResponse) => {
    openModal({
      title: "제어 포인트 삭제",
      content: `제어 포인트 "${cp.label}" 을(를) 삭제할까요?`,
      onConfirm: () => removePoint(cp.commandPointId),
    });
  };

  return (
    <AdminPageTemplate
      title="제어 포인트 관리"
      description="디바이스별 제어 포인트(제어 버튼)를 등록·관리합니다. 포인트의 ref_device_code·ref_point_code(XN 코드)로 실제 제어가 중계됩니다."
    >
      <Toolbar>
        <DeviceHierarchyFilter
          value={filter}
          onChange={(v) => {
            setFilter(v);
            if (!v.deviceId) setPickedDevice(null);
          }}
          onDevicePicked={setPickedDevice}
        />
        <Spacer />
        <Button
          variant="primary"
          onClick={() => openEditor(null)}
          disabled={deviceId == null}
        >
          + 제어 포인트 등록
        </Button>
      </Toolbar>

      {deviceId == null ? (
        <EmptyPanel>대분류 → 중분류 → 소분류 → 장비 순으로 대상 디바이스를 선택하세요.</EmptyPanel>
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th style={{ width: 48 }}>#</Th>
                <Th>표시명</Th>
                <Th>tagName</Th>
                <Th>ref_device_code</Th>
                <Th>ref_point_code</Th>
                <Th $center style={{ width: 90 }}>ON / OFF</Th>
                <Th $center style={{ width: 64 }}>정렬</Th>
                <Th $center style={{ width: 72 }}>활성</Th>
                <Th $center style={{ width: 140 }}>관리</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <Td colSpan={9} $center>불러오는 중…</Td>
                </tr>
              ) : isError ? (
                <tr>
                  <Td colSpan={9} $center>
                    {(error as Error)?.message ?? "목록을 불러오지 못했습니다."}
                  </Td>
                </tr>
              ) : points.length === 0 ? (
                <tr>
                  <Td colSpan={9} $center>
                    등록된 제어 포인트가 없습니다. "+ 제어 포인트 등록"으로 추가하세요.
                  </Td>
                </tr>
              ) : (
                [...points]
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((p, idx) => (
                    <tr key={p.commandPointId}>
                      <Td $center>{idx + 1}</Td>
                      <Td>
                        <PointName>{p.label}</PointName>
                        {!p.active && <MutedTag>비활성</MutedTag>}
                      </Td>
                      <Td>
                        <Mono>{p.tagName || <Muted>-</Muted>}</Mono>
                      </Td>
                      <Td>
                        <Mono>{p.refDeviceCode || <Muted>미매핑</Muted>}</Mono>
                      </Td>
                      <Td>
                        <Mono>{p.refPointCode || <Muted>미매핑</Muted>}</Mono>
                      </Td>
                      <Td $center>
                        <Mono>
                          {p.onValue} / {p.offValue}
                        </Mono>
                      </Td>
                      <Td $center>{p.sortOrder}</Td>
                      <Td $center>
                        {p.active ? (
                          <ActiveDot $on>ON</ActiveDot>
                        ) : (
                          <ActiveDot>OFF</ActiveDot>
                        )}
                      </Td>
                      <Td $center>
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
                    </tr>
                  ))
              )}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </AdminPageTemplate>
  );
};

export default CommandPointPage;

const Toolbar = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 10px;
  margin-bottom: 16px;
`;

const Spacer = styled.div`
  flex: 1;
`;

const EmptyPanel = styled.div`
  padding: 48px 0;
  text-align: center;
  font-size: 14px;
  color: #9ca3af;
  background: #fff;
  border: 1px dashed #e5e7eb;
  border-radius: 8px;
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

const PointName = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #111827;
`;

const MutedTag = styled.span`
  margin-left: 6px;
  font-size: 11px;
  color: #9ca3af;
`;

const Mono = styled.span`
  font-family: monospace;
  font-size: 12px;
  color: #374151;
`;

const Muted = styled.span`
  color: #9ca3af;
`;

const ActiveDot = styled.span<{ $on?: boolean }>`
  display: inline-block;
  padding: 2px 10px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  background: ${(p) => (p.$on ? "#dcfce7" : "#f3f4f6")};
  color: ${(p) => (p.$on ? "#15803d" : "#9ca3af")};
`;

const BtnGroup = styled.div`
  display: flex;
  gap: 5px;
  justify-content: center;
`;
