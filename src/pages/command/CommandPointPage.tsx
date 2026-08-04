import { showAlert } from "@/utils/dialogBridge";
import { useState } from "react";
import styled from "styled-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import { Button } from "@/components/ui";
import DeviceHierarchyFilter from "@/components/device/DeviceHierarchyFilter";
import Pagination from "@/components/common/Pagination";
import CommandPointModal from "@/components/modal/command/CommandPointModal";
import { useModal } from "@/contexts/ModalContext";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { EMPTY_HIERARCHY_FILTER } from "@/utils/deviceHierarchyFilterUtils";
import {
  COMMAND_POINTS_PAGE_QUERY_KEY,
  deleteCommandPoint,
  getCommandPointsPage,
  type CommandPointResponse,
} from "@/services/commandService";

const PAGE_SIZE = 20;

/**
 * 제어 포인트 관리 (WA-COMMAND-POINT) — 디바이스 제어 그룹
 * 제어 포인트를 장비 선택 없이 페이지네이션으로 직접 나열한다.
 * (선택) keyword 검색 + 소분류(categoryId) 필터. 등록은 대상 장비/포인트를 골라 진행.
 */
const CommandPointPage = () => {
  const queryClient = useQueryClient();
  const { openModal, closeModal } = useModal();

  const [filter, setFilter] = useState(EMPTY_HIERARCHY_FILTER);
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(0);

  // 소분류(smallId) 선택 시에만 categoryId 필터(백엔드 categoryId = 장비 소분류)
  const categoryId = filter.smallId ? Number(filter.smallId) : undefined;

  const { data: res, isLoading, isError, error } = useQuery({
    queryKey: [...COMMAND_POINTS_PAGE_QUERY_KEY, page, keyword, categoryId ?? "all"],
    queryFn: () =>
      getCommandPointsPage({
        keyword: keyword || undefined,
        categoryId,
        page,
        size: PAGE_SIZE,
      }),
  });

  const points: CommandPointResponse[] = res?.data?.content ?? [];
  const pagination = {
    totalPages: res?.data?.page?.totalPages ?? 0,
    number: res?.data?.page?.number ?? 0,
    totalElements: res?.data?.page?.totalElements ?? 0,
    first: res?.data?.page?.first ?? true,
    last: res?.data?.page?.last ?? true,
  };

  const { mutate: removePoint } = useMutation({
    mutationFn: deleteCommandPoint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMMAND_POINTS_PAGE_QUERY_KEY });
      closeModal();
    },
    onError: (err) =>
      showAlert(getApiErrorMessage(err, "삭제 중 오류가 발생했습니다.")),
  });

  const handleSearch = () => {
    setKeyword(keywordInput.trim());
    setPage(0);
  };

  const openRegister = () => {
    // 자기완결형: 모달 안에서 대>중>소>장비 선택 → 포인트 선택 (deviceId 미지정으로 오픈)
    openModal({
      title: "제어 포인트 등록",
      hideFooter: true,
      wide: true,
      content: <CommandPointModal commandPoint={null} onClose={closeModal} />,
    });
  };

  const openEdit = (cp: CommandPointResponse) => {
    openModal({
      title: "제어 포인트 수정",
      hideFooter: true,
      wide: true,
      content: (
        <CommandPointModal
          deviceId={cp.deviceId}
          deviceName={cp.deviceName}
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
      description="제어 포인트(제어 버튼)를 조회·등록·관리합니다. 포인트의 ref_device_code·ref_point_code(XN 코드)로 실제 제어가 중계됩니다."
    >
      <Toolbar>
        <DeviceHierarchyFilter
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setPage(0);
          }}
        />
        <SearchInput
          placeholder="장비명·tagName·표시명 검색"
          value={keywordInput}
          onChange={(e) => setKeywordInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button variant="secondary" onClick={handleSearch}>
          검색
        </Button>
        <Spacer />
        <Button variant="primary" onClick={openRegister} title="제어 포인트 등록">
          + 제어 포인트 등록
        </Button>
      </Toolbar>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th style={{ width: 48 }}>#</Th>
              <Th>장비명</Th>
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
                <Td colSpan={10} $center>불러오는 중…</Td>
              </tr>
            ) : isError ? (
              <tr>
                <Td colSpan={10} $center>
                  {(error as Error)?.message ?? "목록을 불러오지 못했습니다."}
                </Td>
              </tr>
            ) : points.length === 0 ? (
              <tr>
                <Td colSpan={10} $center>
                  등록된 제어 포인트가 없습니다. 장비를 선택해 "+ 제어 포인트 등록"으로 추가하세요.
                </Td>
              </tr>
            ) : (
              points.map((p, idx) => (
                <tr key={p.commandPointId}>
                  <Td $center>{page * PAGE_SIZE + idx + 1}</Td>
                  <Td>
                    <DeviceCell>
                      {p.deviceName || <Muted>Device#{p.deviceId}</Muted>}
                    </DeviceCell>
                  </Td>
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
                    {p.active ? <ActiveDot $on>ON</ActiveDot> : <ActiveDot>OFF</ActiveDot>}
                  </Td>
                  <Td $center>
                    <BtnGroup>
                      <Button variant="secondary" size="sm" onClick={() => openEdit(p)}>
                        수정
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => openDelete(p)}>
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

      {pagination.totalPages > 0 && (
        <Pagination data={pagination} onPageChange={setPage} />
      )}
    </AdminPageTemplate>
  );
};

export default CommandPointPage;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px;
  margin-bottom: 16px;
`;

const SearchInput = styled.input`
  box-sizing: border-box;
  min-width: 200px;
  height: 36px;
  padding: 0 12px;
  font-size: 13px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
  &::placeholder { color: #9ca3af; }
  &:focus { border-color: #4a90d9; }
`;

const Spacer = styled.div`
  flex: 1;
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

const DeviceCell = styled.span`
  font-size: 13px;
  color: #111827;
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
