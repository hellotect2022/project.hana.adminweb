import { useState } from "react";
import styled from "styled-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import { Button } from "@/components/ui";
import DeviceHierarchyFilter from "@/components/device/DeviceHierarchyFilter";
import DeviceDetailModalContent from "@/components/modal/device/DeviceDetailModal";
import DeviceRegistForm from "@/components/modal/device/DeviceRegistForm";
import DevicePointMappingModal from "@/components/modal/device/DevicePointMappingModal";
import Pagination from "@/components/common/Pagination";
import { useModal } from "@/contexts/ModalContext";
import {
  deleteDeviceAPI,
  DEVICE_LIST_QUERY_KEY,
  fetchDeviceByIdAPI,
  fetchDevicesAPI,
} from "@/services/deviceService";
import {
  EMPTY_HIERARCHY_FILTER,
  hasHierarchyFilter,
  resolveHierarchyCategoryId,
  resolveHierarchyDeviceId,
} from "@/utils/deviceHierarchyFilterUtils";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

const PAGE_SIZE = 20;
const DEVICE_OPTION_SIZE = 500;

const DeviceManagePage = () => {
  const { openModal, closeModal } = useModal();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [draftFilter, setDraftFilter] = useState(EMPTY_HIERARCHY_FILTER);
  const [appliedFilter, setAppliedFilter] = useState(EMPTY_HIERARCHY_FILTER);

  const { data: deviceOptions = [] } = useQuery({
    queryKey: [...DEVICE_LIST_QUERY_KEY, "options"],
    queryFn: () => fetchDevicesAPI({ page: 0, size: DEVICE_OPTION_SIZE }),
    select: (res) => res.data?.content ?? [],
  });

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

  const { mutate: removeDevice, isPending: isDeleting } = useMutation({
    mutationFn: deleteDeviceAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEVICE_LIST_QUERY_KEY });
    },
    onError: (err) => {
      window.alert(getApiErrorMessage(err, "장비 삭제에 실패했습니다."));
    },
  });

  const handleDeleteDevice = (device) => {
    const label = device.deviceName || `ID #${device.deviceId}`;
    if (!window.confirm(`장비 "${label}" 을(를) 삭제할까요?\n연결된 포인트·이벤트 규칙도 함께 삭제됩니다.`)) {
      return;
    }
    removeDevice(device.deviceId);
  };

  const openDetailModal = (device) => {
    openModal({
      title: `장비 상세 — ${device.deviceName}`,
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
            window.alert(res?.message || "장비가 등록되었습니다.");
            closeModal();
          }}
        />
      ),
    });
  };

  const openMappingModal = (device) => {
    openModal({
      title: `포인트 매핑 — ${device.deviceName}`,
      hideFooter: true,
      wide: true,
      content: (
        <DevicePointMappingModal device={device} onClose={closeModal} />
      ),
    });
  };

  return (
    <AdminPageTemplate title="장비 관리" description="등록된 장비 목록을 조회하고 새 장비를 추가합니다.">
      <Toolbar>
        <DeviceHierarchyFilter
          devices={deviceOptions}
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
          variant="primary"
          onClick={openRegisterModal}
          style={{ height: TOOLBAR_CONTROL_HEIGHT, marginLeft: "auto", flexShrink: 0 }}
        >
          + 장비 추가
        </Button>
      </Toolbar>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th $center style={{ width: 70 }}>번호</Th>
              <Th $center style={{ width: 120 }}>장비 이름</Th>
              <Th style={{ width: 320}}>카테고리</Th>
              <Th style={{ width: 120 }}>장비설명</Th>
              <Th $center style={{ width: 90 }}>활성</Th>
              <Th $center style={{ width: 90 }}>배치</Th>
              <Th $center style={{ width: 240 }}>관리</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <Td colSpan={6} $center>
                  불러오는 중...
                </Td>
              </tr>
            ) : devices.length === 0 ? (
              <tr>
                <Td colSpan={6} $center>
                  {keyword || hasHierarchyFilter(appliedFilter)
                    ? "검색 결과가 없습니다."
                    : "등록된 장비가 없습니다. 대·중·소·장비를 선택 후 검색하거나 키워드로 검색해 보세요."}
                </Td>
              </tr>
            ) : (
              devices.map((device, idx) => (
                <tr key={device.deviceId}>
                  <Td $center>{page * PAGE_SIZE + idx + 1}</Td>
                  <Td $center>{device.deviceName}</Td>
                  <Td>{device.categoryPath || device.categoryName || "-"}</Td>
                  <Td>{device.description }</Td>
                  <Td $center>
                    <Badge $active={device.active}>{device.active ? "활성" : "비활성"}</Badge>
                  </Td>
                  <Td $center>
                    <Badge $placed={device.placed ?? device.set}>
                      {device.placed ?? device.set ? "배치됨" : "미배치"}
                    </Badge>
                  </Td>
                  <Td $center>
                    <BtnGroup>
                      <Button variant="secondary" size="sm" onClick={() => openDetailModal(device)}>
                        상세보기
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openMappingModal(device)}
                        disabled={!device.categoryId}
                        title={!device.categoryId ? "카테고리가 없어 매핑 불가" : "포인트 매핑"}
                      >
                        포인트 매핑
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

const BtnGroup = styled.div`
  display: flex;
  gap: 6px;
  justify-content: center;
  flex-wrap: wrap;
`;

