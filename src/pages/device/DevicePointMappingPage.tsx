import { useMemo, useState } from "react";
import styled from "styled-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import Pagination from "@/components/common/Pagination";
import DeviceHierarchyFilter from "@/components/device/DeviceHierarchyFilter";
import {
  DEVICE_LIST_QUERY_KEY,
  DEVICE_POINT_MAPPING_QUERY_KEY,
  fetchDevicePointsForMappingAPI,
  fetchDevicesAPI,
  saveDevicePointRefMappingAPI,
} from "@/services/deviceService";
import {
  EMPTY_HIERARCHY_FILTER,
  hasHierarchyFilter,
  resolveHierarchyCategoryId,
  resolveHierarchyDeviceId,
} from "@/utils/deviceHierarchyFilterUtils";

const PAGE_SIZE = 50;
const DEVICE_OPTION_SIZE = 500;

const norm = (v) => (v ?? "").trim();

const DevicePointMappingPage = () => {
  const queryClient = useQueryClient();

  const [draftFilter, setDraftFilter] = useState(EMPTY_HIERARCHY_FILTER);
  const [appliedFilter, setAppliedFilter] = useState(EMPTY_HIERARCHY_FILTER);
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(0);
  /** @type {[Record<number, { refDeviceCode: string; refPointCode: string }>, Function]} */
  const [drafts, setDrafts] = useState({});

  const { data: devices = [] } = useQuery({
    queryKey: [...DEVICE_LIST_QUERY_KEY, "options"],
    queryFn: () => fetchDevicesAPI({ page: 0, size: DEVICE_OPTION_SIZE }),
    select: (res) => res.data?.content ?? [],
  });

  const appliedDeviceId = resolveHierarchyDeviceId(appliedFilter);
  const appliedCategoryId = resolveHierarchyCategoryId(appliedFilter);

  const { data: { points = [], pagination, mappedCount = 0 } = {}, isLoading, isFetching } =
    useQuery({
      queryKey: [
        ...DEVICE_POINT_MAPPING_QUERY_KEY,
        page,
        appliedCategoryId ?? "all",
        appliedDeviceId ?? "all",
        keyword,
      ],
      queryFn: () =>
        fetchDevicePointsForMappingAPI({
          page,
          size: PAGE_SIZE,
          deviceId: appliedDeviceId,
          categoryId: appliedCategoryId,
          keyword: keyword || undefined,
        }),
      select: (res) => ({
        points: res.data?.content ?? [],
        mappedCount: res.data?.mappedCount ?? 0,
        pagination: {
          totalPages: res.data?.totalPages ?? 0,
          number: res.data?.number ?? 0,
          totalElements: res.data?.totalElements ?? 0,
          first: res.data?.first ?? true,
          last: res.data?.last ?? true,
        },
      }),
    });

  const isRowDirty = (row) => {
    const d = drafts[row.pointId];
    if (!d) return false;
    return (
      norm(d.refDeviceCode) !== norm(row.refDeviceCode) ||
      norm(d.refPointCode) !== norm(row.refPointCode)
    );
  };

  const dirtyRows = useMemo(() => points.filter(isRowDirty), [points, drafts]);

  const getRefDeviceCode = (row) =>
    drafts[row.pointId]?.refDeviceCode ?? row.refDeviceCode ?? "";

  const getRefPointCode = (row) =>
    drafts[row.pointId]?.refPointCode ?? row.refPointCode ?? "";

  const updateDraft = (pointId, field, value) => {
    setDrafts((prev) => {
      const row = points.find((p) => p.pointId === pointId);
      const base = prev[pointId] ?? {
        refDeviceCode: row?.refDeviceCode ?? "",
        refPointCode: row?.refPointCode ?? "",
      };
      return { ...prev, [pointId]: { ...base, [field]: value } };
    });
  };

  const { mutate: saveMappings, isPending: isSaving } = useMutation({
    mutationFn: () =>
      saveDevicePointRefMappingAPI(
        dirtyRows.map((row) => ({
          pointId: row.pointId,
          refDeviceCode: norm(getRefDeviceCode(row)) || null,
          refPointCode: norm(getRefPointCode(row)) || null,
        }))
      ),
    onSuccess: (res) => {
      if (res?.success !== false) {
        setDrafts({});
        queryClient.invalidateQueries({ queryKey: DEVICE_POINT_MAPPING_QUERY_KEY });
        window.alert(res?.message || "SI 포인트 매핑이 저장되었습니다.");
      }
    },
  });

  const handleSearch = () => {
    setKeyword(keywordInput.trim());
    setAppliedFilter(draftFilter);
    setPage(0);
    setDrafts({});
  };

  return (
    <AdminPageTemplate
      title="포인트 정보 매핑"
      description="논리 포인트와 연계 시스템(SI) 포인트를 ref_device_code · ref_point_code로 연결합니다."
    >
      <Toolbar>
        <DeviceHierarchyFilter
          devices={devices}
          value={draftFilter}
          onChange={setDraftFilter}
        />
        <SearchInput
          placeholder="장비·태그·포인트명·ref 코드 검색"
          value={keywordInput}
          onChange={(e) => setKeywordInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <SearchButton type="button" onClick={handleSearch}>
          검색
        </SearchButton>
        <Summary>
          총 {pagination?.totalElements ?? 0}건 · 매핑됨 {mappedCount}건
          {dirtyRows.length > 0 && ` · 변경 ${dirtyRows.length}건`}
        </Summary>
        <SaveButton
          type="button"
          disabled={dirtyRows.length === 0 || isSaving}
          onClick={() => saveMappings()}
        >
          {isSaving ? "저장 중…" : `변경 저장 (${dirtyRows.length})`}
        </SaveButton>
      </Toolbar>

      <HintBox>
        연계 시스템 포인트의 <code>ref_device_code</code>, <code>ref_point_code</code>를 입력하세요.
        두 값을 모두 비우면 매핑이 해제됩니다. 동일한 SI 코드는 한 논리 포인트에만 연결할 수 있습니다.
      </HintBox>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th style={{ width: 48 }}>#</Th>
              <Th>장비</Th>
              <Th>카테고리</Th>
              <Th>태그</Th>
              <Th>포인트명</Th>
              <Th>point_key</Th>
              <Th $center style={{ width: 72 }}>유형</Th>
              <Th $center style={{ width: 56 }}>단위</Th>
              <Th style={{ width: 140 }}>ref_device_code</Th>
              <Th style={{ width: 140 }}>ref_point_code</Th>
              <Th $center style={{ width: 72 }}>상태</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading || isFetching ? (
              <tr>
                <Td colSpan={11} $center>
                  불러오는 중…
                </Td>
              </tr>
            ) : points.length === 0 ? (
              <tr>
                <Td colSpan={11} $center>
                  {keyword || hasHierarchyFilter(appliedFilter)
                    ? "검색 결과가 없습니다."
                    : "대·중·소·장비를 선택 후 검색하거나, 검색어로 포인트를 찾을 수 있습니다."}
                </Td>
              </tr>
            ) : (
              points.map((row, idx) => {
                const dirty = isRowDirty(row);
                const mapped =
                  norm(getRefDeviceCode(row)) && norm(getRefPointCode(row));
                return (
                  <tr key={row.pointId} data-dirty={dirty ? "true" : undefined}>
                    <Td>{page * PAGE_SIZE + idx + 1}</Td>
                    <Td>
                      <DeviceName>{row.deviceName ?? "-"}</DeviceName>
                      {row.deviceKey && <SubText>{row.deviceKey}</SubText>}
                    </Td>
                    <Td>{row.categoryPath || "-"}</Td>
                    <Td>
                      <TagName>{row.tagName}</TagName>
                    </Td>
                    <Td>{row.pointName || "-"}</Td>
                    <Td>
                      <Mono>{row.pointKey}</Mono>
                    </Td>
                    <Td $center>{row.pointType || "-"}</Td>
                    <Td $center>{row.unit || "-"}</Td>
                    <Td>
                      <RefInput
                        value={getRefDeviceCode(row)}
                        onChange={(e) =>
                          updateDraft(row.pointId, "refDeviceCode", e.target.value)
                        }
                        placeholder="SI 장비 코드"
                        $dirty={dirty}
                      />
                    </Td>
                    <Td>
                      <RefInput
                        value={getRefPointCode(row)}
                        onChange={(e) =>
                          updateDraft(row.pointId, "refPointCode", e.target.value)
                        }
                        placeholder="SI 포인트 코드"
                        $dirty={dirty}
                      />
                    </Td>
                    <Td $center>
                      <StatusBadge $mapped={mapped} $dirty={dirty}>
                        {dirty ? "수정됨" : mapped ? "매핑" : "미매핑"}
                      </StatusBadge>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </TableWrap>

      {pagination && (
        <Pagination
          data={pagination}
          onPageChange={setPage}
          showSummary={false}
        />
      )}
    </AdminPageTemplate>
  );
};

export default DevicePointMappingPage;

const TOOLBAR_CONTROL_HEIGHT = "36px";

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 8px;
  padding: 16px 20px;
  margin-bottom: 12px;
  background: #fff;
  border: 1px solid #e1e2e5;
  border-radius: 5px;
`;

const SearchInput = styled.input`
  box-sizing: border-box;
  min-width: 200px;
  height: ${TOOLBAR_CONTROL_HEIGHT};
  padding: 0 12px;
  border: 1px solid #d0d3d8;
  border-radius: 4px;
  font-size: 13px;
  line-height: ${TOOLBAR_CONTROL_HEIGHT};
`;

const SearchButton = styled.button`
  box-sizing: border-box;
  height: ${TOOLBAR_CONTROL_HEIGHT};
  padding: 0 16px;
  background: #f4f5f7;
  border: 1px solid #d0d3d8;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
  &:hover {
    background: #e8eaed;
  }
`;

const Summary = styled.span`
  display: inline-flex;
  align-items: center;
  height: ${TOOLBAR_CONTROL_HEIGHT};
  font-size: 13px;
  line-height: 1.4;
  color: #5c6370;
  white-space: nowrap;
`;

const SaveButton = styled.button`
  box-sizing: border-box;
  height: ${TOOLBAR_CONTROL_HEIGHT};
  padding: 0 18px;
  margin-left: auto;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const HintBox = styled.p`
  margin: 0 0 12px;
  padding: 10px 14px;
  font-size: 12px;
  color: #5c6370;
  background: #f8f9fb;
  border: 1px solid #e8eaed;
  border-radius: 4px;
  code {
    font-size: 11px;
    background: #eef0f3;
    padding: 1px 4px;
    border-radius: 3px;
  }
`;

const TableWrap = styled.div`
  overflow-x: auto;
  background: #fff;
  border: 1px solid #e1e2e5;
  border-radius: 5px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  tbody tr[data-dirty="true"] {
    background: #fffbeb;
  }
`;

const Th = styled.th`
  padding: 10px 12px;
  text-align: ${(p) => (p.$center ? "center" : "left")};
  background: #f4f5f7;
  border-bottom: 1px solid #e1e2e5;
  font-weight: 600;
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 8px 12px;
  border-bottom: 1px solid #eef0f3;
  text-align: ${(p) => (p.$center ? "center" : "left")};
  vertical-align: middle;
`;

const DeviceName = styled.div`
  font-weight: 500;
`;

const SubText = styled.div`
  font-size: 11px;
  color: #8b919a;
  margin-top: 2px;
`;

const TagName = styled.span`
  font-family: ui-monospace, monospace;
  font-size: 12px;
`;

const Mono = styled.span`
  font-family: ui-monospace, monospace;
  font-size: 11px;
  color: #5c6370;
  word-break: break-all;
`;

const RefInput = styled.input`
  width: 100%;
  min-width: 120px;
  height: 32px;
  padding: 0 8px;
  border: 1px solid ${(p) => (p.$dirty ? "#f59e0b" : "#d0d3d8")};
  border-radius: 4px;
  font-size: 12px;
  font-family: ui-monospace, monospace;
  background: ${(p) => (p.$dirty ? "#fffef5" : "#fff")};
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  background: ${(p) =>
    p.$dirty ? "#fef3c7" : p.$mapped ? "#dcfce7" : "#f1f3f5"};
  color: ${(p) =>
    p.$dirty ? "#b45309" : p.$mapped ? "#15803d" : "#6b7280"};
`;
