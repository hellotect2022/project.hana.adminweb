import { showAlert, showConfirm } from "@/utils/dialogBridge";
import { useState } from "react";
import styled from "styled-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import { Button, Toggle } from "@/components/ui";
import DeviceHierarchyFilter from "@/components/device/DeviceHierarchyFilter";
import DeviceDetailModalContent from "@/components/modal/device/DeviceDetailModal";
import DeviceRegistForm from "@/components/modal/device/DeviceRegistForm";
import DeviceCctvMappingModal from "@/components/modal/device/DeviceCctvMappingModal";
import Pagination from "@/components/common/Pagination";
import { useModal } from "@/contexts/ModalContext";
import {
  CONNECTION_STATE_LABEL,
  deleteDeviceAPI,
  DEVICE_LIST_QUERY_KEY,
  downloadDeviceListExcelAPI,
  fetchDeviceByIdAPI,
  fetchDevicesAPI,
  OPERATION_STATE_LABEL,
  patchDeviceAPI,
  type ConnectionState,
  type OperationState,
} from "@/services/deviceService";
import {
  EMPTY_HIERARCHY_FILTER,
  hasHierarchyFilter,
  resolveHierarchyCategoryId,
  resolveHierarchyDeviceId,
} from "@/utils/deviceHierarchyFilterUtils";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { deviceLabel } from "@/utils/deviceLabel";

const PAGE_SIZE = 20;

const DeviceManagePage = () => {
  const { openModal, closeModal } = useModal();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [draftFilter, setDraftFilter] = useState(EMPTY_HIERARCHY_FILTER);
  const [appliedFilter, setAppliedFilter] = useState(EMPTY_HIERARCHY_FILTER);

  // 장비 드롭다운은 DeviceHierarchyFilter 가 소분류별로 서버에서 직접 조회한다.
  // (과거 500-cap 목록 프리페치 → 앞 500개 밖 장비 누락 버그 제거)

  const appliedDeviceId = resolveHierarchyDeviceId(appliedFilter);
  const appliedCategoryId = resolveHierarchyCategoryId(appliedFilter);

  const { data: { devices = [], pagination } = {}, isLoading } = useQuery({
    queryKey: [
      ...DEVICE_LIST_QUERY_KEY,
      page,
      keyword,
      appliedCategoryId ?? "all",
      appliedDeviceId ?? "all",
    ],
    queryFn: async () => {
      if (appliedDeviceId != null) {
        const res = await fetchDeviceByIdAPI(appliedDeviceId);
        const device = res?.data ?? null;
        return {
          devices: device ? [device] : [],
          pagination: {
            totalPages: device ? 1 : 0,
            number: 0,
            totalElements: device ? 1 : 0,
            first: true,
            last: true,
          },
        };
      }
      const res = await fetchDevicesAPI({
        page,
        size: PAGE_SIZE,
        keyword: keyword || undefined,
        categoryId: appliedCategoryId,
      });


      console.log('res--',res)
      return {
        devices: res.data?.content ?? [],
        pagination: {
          totalPages: res.data?.page?.totalPages ?? 0,
          number: res.data?.page?.number ?? 0,
          totalElements: res.data?.page?.totalElements ?? 0,
          first: res.data?.page?.first ?? true,
          last: res.data?.page?.last ?? true,
        },
      };
    },
  });

  const handleSearch = () => {
    setKeyword(keywordInput.trim());
    setAppliedFilter(draftFilter);
    setPage(0);
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const res = await downloadDeviceListExcelAPI({
        categoryId: appliedCategoryId ?? undefined,
        keyword: keyword || undefined,
      });
      const disposition =
        res?.headers?.["content-disposition"] ||
        res?.headers?.["Content-Disposition"] ||
        "";
      let filename = "device-list.xlsx";
      const star = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
      const plain = /filename="?([^";]+)"?/i.exec(disposition);
      if (star?.[1]) filename = decodeURIComponent(star[1]);
      else if (plain?.[1]) filename = plain[1];

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      showAlert("엑셀 다운로드에 실패했습니다.");
    } finally {
      setIsExporting(false);
    }
  };

  const { mutate: removeDevice, isPending: isDeleting } = useMutation({
    mutationFn: deleteDeviceAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEVICE_LIST_QUERY_KEY });
    },
    onError: (err) => {
      showAlert(getApiErrorMessage(err, "장비 삭제에 실패했습니다."));
    },
  });

  // 알람 on/off 토글 (alarmState 만 부분 수정)
  const [alarmBusy, setAlarmBusy] = useState<Set<number>>(new Set());
  const { mutate: toggleAlarm } = useMutation({
    mutationFn: ({ deviceId, alarmState }: { deviceId: number; alarmState: boolean }) =>
      patchDeviceAPI({ deviceId, payload: { alarmState } }),
    onMutate: ({ deviceId }) =>
      setAlarmBusy((prev) => new Set(prev).add(deviceId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEVICE_LIST_QUERY_KEY });
    },
    onError: (err) => {
      showAlert(getApiErrorMessage(err, "알람 설정 변경에 실패했습니다."));
    },
    onSettled: (_d, _e, { deviceId }) =>
      setAlarmBusy((prev) => {
        const next = new Set(prev);
        next.delete(deviceId);
        return next;
      }),
  });

  const handleDeleteDevice = async (device) => {
    const label = deviceLabel(device) || `ID #${device.deviceId}`;
    const ok = await showConfirm(`장비 "${label}" 을(를) 삭제할까요?\n연결된 포인트·이벤트 규칙도 함께 삭제됩니다.`);
    if (!ok) {
      return;
    }
    removeDevice(device.deviceId);
  };

  const openDetailModal = (device) => {
    openModal({
      title: `장비 상세 — ${deviceLabel(device)}`,
      hideFooter: true,
      wide: true,
      content: (
        <DeviceDetailModalContent
          device={device}
          onClose={closeModal}
          onDeleted={() => queryClient.invalidateQueries({ queryKey: DEVICE_LIST_QUERY_KEY })}
        />
      ),
    });
  };

  const openRegisterModal = () => {
    openModal({
      title: "장비 등록",
      hideFooter: true,
      full: true,
      content: (
        <DeviceRegistForm
          onCancel={closeModal}
          onSuccess={(res) => {
            showAlert(res?.message || "장비가 등록되었습니다.");
            //closeModal();
          }}
        />
      ),
    });
  };

  const openCctvMappingModal = (device) => {
    openModal({
      title: `CCTV 매핑 — ${deviceLabel(device)}`,
      hideFooter: true,
      wide: true,
      content: (
        <DeviceCctvMappingModal device={device} onClose={closeModal} />
      ),
    });
  };

  return (
    <AdminPageTemplate title="장비 관리" description="등록된 장비 목록을 조회하고 새 장비를 추가합니다.">
      <Toolbar>
        <DeviceHierarchyFilter
          value={draftFilter}
          onChange={setDraftFilter}
        />
        <SearchInput
          placeholder="장비 이름·카테고리·키 검색"
          value={keywordInput}
          onChange={(e) => setKeywordInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button
          variant="secondary"
          onClick={handleSearch}
          style={{ height: TOOLBAR_CONTROL_HEIGHT, flexShrink: 0 }}
        >
          검색
        </Button>
        <Summary>
          총 {pagination?.totalElements ?? 0}건
          {keyword ? ` · 검색: "${keyword}"` : ""}
          {hasHierarchyFilter(appliedFilter) ? " · 카테고리 필터 적용" : ""}
        </Summary>
        <Button
          variant="secondary"
          onClick={handleDownloadExcel}
          disabled={isExporting}
          style={{ height: TOOLBAR_CONTROL_HEIGHT, marginLeft: "auto", flexShrink: 0 }}
        >
          {isExporting ? "다운로드 중..." : "엑셀 다운로드"}
        </Button>
        <Button
          variant="primary"
          onClick={openRegisterModal}
          style={{ height: TOOLBAR_CONTROL_HEIGHT, flexShrink: 0 }}
        >
          + 장비 추가
        </Button>
      </Toolbar>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th $center style={{ width: 70 }}>번호</Th>
              <Th $center style={{ width: 250 }}>표시이름</Th>
              <Th $center style={{ width: 120 }}>장비 이름</Th>
              <Th style={{ width: 280}}>카테고리</Th>
              <Th style={{ width: 120 }}>장비설명</Th>
              <Th $center style={{ width: 80 }}>활성</Th>
              <Th $center style={{ width: 90 }}>알람</Th>
              <Th $center style={{ width: 80 }}>배치</Th>
              <Th $center style={{ width: 150 }}>동작 / 연결</Th>
              <Th $center style={{ width: 240 }}>관리</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <Td colSpan={10} $center>
                  불러오는 중...
                </Td>
              </tr>
            ) : devices.length === 0 ? (
              <tr>
                <Td colSpan={10} $center>
                  {keyword || hasHierarchyFilter(appliedFilter)
                    ? "검색 결과가 없습니다."
                    : "등록된 장비가 없습니다. 대·중·소·장비를 선택 후 검색하거나 키워드로 검색해 보세요."}
                </Td>
              </tr>
            ) : (
              devices.map((device, idx) => (
                <tr key={device.deviceId}>
                  <Td $center>{page * PAGE_SIZE + idx + 1}</Td>
                  <Td $center>
                    {device.deviceDisplayName?.trim() ? (
                      device.deviceDisplayName
                    ) : (
                      <MutedText>미지정</MutedText>
                    )}
                  </Td>
                  <Td $center>{device.deviceName}</Td>
                  <Td>{device.categoryPath || device.categoryName || "-"}</Td>
                  <Td>{device.description }</Td>
                  <Td $center>
                    <Badge $active={device.active}>{device.active ? "활성" : "비활성"}</Badge>
                  </Td>
                  <Td $center>
                    <Toggle
                      on={device.alarmState !== false}
                      disabled={alarmBusy.has(device.deviceId)}
                      title="끄면 이 장비 알람이 발생해도 서버가 전송하지 않음(반영 최대 30초)"
                      onClick={() =>
                        toggleAlarm({
                          deviceId: device.deviceId,
                          alarmState: !(device.alarmState !== false),
                        })
                      }
                    >
                      {device.alarmState !== false ? "ON" : "OFF"}
                    </Toggle>
                  </Td>
                  <Td $center>
                    <Badge $placed={device.placed ?? device.set}>
                      {device.placed ?? device.set ? "배치됨" : "미배치"}
                    </Badge>
                  </Td>
                  <Td $center>
                    <StateStack>
                      <StateBadge $state={device.operationState ?? "UNKNOWN"}>
                        {OPERATION_STATE_LABEL[
                          (device.operationState ?? "UNKNOWN") as OperationState
                        ]}
                      </StateBadge>
                      <StateBadge $state={device.connectionState ?? "UNKNOWN"}>
                        {CONNECTION_STATE_LABEL[
                          (device.connectionState ?? "UNKNOWN") as ConnectionState
                        ]}
                      </StateBadge>
                    </StateStack>
                  </Td>
                  <Td $center>
                    <BtnGroup>
                      <Button variant="secondary" size="sm" onClick={() => openDetailModal(device)}>
                        상세보기
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openCctvMappingModal(device)}
                        title="주변 CCTV 매핑"
                      >
                        CCTV 매핑
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteDevice(device)}
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

      {pagination && (
        <Pagination data={pagination} onPageChange={setPage} showSummary={false} />
      )}
    </AdminPageTemplate>
  );
};

export default DeviceManagePage;

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

const SearchInput = styled.input`
  box-sizing: border-box;
  min-width: 200px;
  height: ${TOOLBAR_CONTROL_HEIGHT};
  padding: 0 12px;
  font-size: 13px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
  &::placeholder { color: #9ca3af; }
  &:focus { border-color: #4a90d9; }
  &:disabled {
    background: #f4f5f7;
    color: #9ca3af;
    cursor: not-allowed;
  }
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

const Badge = styled.span<{ $active?: boolean; $placed?: boolean }>`
  display: inline-block;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 12px;
  background: ${(p) => {
    if (p.$active !== undefined) return p.$active ? "#dcfce7" : "#fee2e2";
    if (p.$placed !== undefined) return p.$placed ? "#dbeafe" : "#f3f4f6";
    return "#f3f4f6";
  }};
  color: ${(p) => {
    if (p.$active !== undefined) return p.$active ? "#15803d" : "#dc2626";
    if (p.$placed !== undefined) return p.$placed ? "#1d4ed8" : "#6b7280";
    return "#6b7280";
  }};
`;

const MutedText = styled.span`
  font-size: 12px;
  color: #9ca3af;
  font-style: italic;
`;

const BtnGroup = styled.div`
  display: flex;
  gap: 6px;
  justify-content: center;
  flex-wrap: wrap;
`;

const StateStack = styled.div`
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
`;

const StateBadge = styled.span<{ $state: string }>`
  display: inline-block;
  padding: 2px 10px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 12px;
  white-space: nowrap;
  background: ${(p) => {
    switch (p.$state) {
      case "RUNNING":
      case "CONNECTED":
        return "#dcfce7";
      case "FAULT":
      case "DISCONNECTED":
        return "#fee2e2";
      case "STOPPED":
        return "#fef3c7";
      default:
        return "#f3f4f6";
    }
  }};
  color: ${(p) => {
    switch (p.$state) {
      case "RUNNING":
      case "CONNECTED":
        return "#15803d";
      case "FAULT":
      case "DISCONNECTED":
        return "#b91c1c";
      case "STOPPED":
        return "#b45309";
      default:
        return "#6b7280";
    }
  }};
`;

