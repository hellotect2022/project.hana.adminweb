import { showAlert } from "@/utils/dialogBridge";
import { useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import { Button } from "@/components/ui";
import Pagination from "@/components/common/Pagination";
import DeviceHierarchyFilter from "@/components/device/DeviceHierarchyFilter";
import {
  DEVICE_POINT_MAPPING_QUERY_KEY,
  POINT_DATA_SOURCE_QUERY_KEY,
  POINT_MAPPING_STATS_QUERY_KEY,
  downloadPointMappingTemplateAPI,
  fetchDevicePointsForMappingAPI,
  fetchPointDataSourcesAPI,
  fetchPointMappingStatsAPI,
  importPointMappingAPI,
  saveDevicePointRefMappingAPI,
} from "@/services/deviceService";
import {
  EMPTY_HIERARCHY_FILTER,
  hasHierarchyFilter,
  resolveHierarchyCategoryId,
  resolveHierarchyDeviceId,
} from "@/utils/deviceHierarchyFilterUtils";

const PAGE_SIZE = 50;

const norm = (v) => (v ?? "").trim();

/**
 * 서버에서 data_source 가 비어 있으면(null) 하위호환으로 VIEW01 로 간주된다.
 * 화면에서도 같은 규칙으로 보여줘야 관리자가 실제 동작과 다르게 이해하지 않는다.
 */
const DEFAULT_DATA_SOURCE = "VIEW01";
const normDataSource = (v) => norm(v) || DEFAULT_DATA_SOURCE;

const DevicePointMappingPage = () => {
  const queryClient = useQueryClient();

  const [draftFilter, setDraftFilter] = useState(EMPTY_HIERARCHY_FILTER);
  const [appliedFilter, setAppliedFilter] = useState(EMPTY_HIERARCHY_FILTER);
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(0);
  const [unmappedOnly, setUnmappedOnly] = useState(false); // 미매핑(ref 코드 없음)만 표시
  /** @type {[Record<number, { refDeviceCode: string; refPointCode: string; dataSource: string }>, Function]} */
  const [drafts, setDrafts] = useState({});

  // 원천 소스 선택지 — 거의 바뀌지 않는 코드 목록이라 길게 캐시한다.
  const { data: dataSources = [] } = useQuery({
    queryKey: POINT_DATA_SOURCE_QUERY_KEY,
    queryFn: fetchPointDataSourcesAPI,
    staleTime: 1000 * 60 * 30,
  });

  // 장비 드롭다운은 DeviceHierarchyFilter 가 소분류별로 서버에서 직접 조회한다.
  // (과거 500-cap 목록 프리페치 → 앞 500개 밖 장비 누락 버그 제거)

  const appliedDeviceId = resolveHierarchyDeviceId(appliedFilter);
  const appliedCategoryId = resolveHierarchyCategoryId(appliedFilter);

  const { data: { points = [], pagination } = {}, isLoading, isFetching } =
    useQuery({
      queryKey: [
        ...DEVICE_POINT_MAPPING_QUERY_KEY,
        page,
        appliedCategoryId ?? "all",
        appliedDeviceId ?? "all",
        keyword,
        unmappedOnly ? "unmapped" : "all",
      ],
      queryFn: () =>
        fetchDevicePointsForMappingAPI({
          page,
          size: PAGE_SIZE,
          deviceId: appliedDeviceId,
          categoryId: appliedCategoryId,
          keyword: keyword || undefined,
          unmapped: unmappedOnly,
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

  // 상단 통계 카드용: 현재 검색 필터(카테고리/검색어) 기준 전체·매핑 집계.
  // unmapped 토글과 무관하게 항상 정확한 4개 값을 유지한다.
  const { data: stats = { total: 0, mapped: 0 } } = useQuery({
    queryKey: [
      ...POINT_MAPPING_STATS_QUERY_KEY,
      appliedCategoryId ?? "all",
      keyword,
    ],
    queryFn: () =>
      fetchPointMappingStatsAPI({
        categoryId: appliedCategoryId ?? undefined,
        keyword: keyword || undefined,
      }),
  });

  const statTotal = stats?.total ?? 0;
  const statMapped = stats?.mapped ?? 0;
  const statUnmapped = Math.max(0, statTotal - statMapped);
  const statRate = statTotal > 0 ? Math.round((statMapped / statTotal) * 100) : 0;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleDownloadTemplate = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const res = await downloadPointMappingTemplateAPI({
        categoryId: appliedCategoryId ?? undefined,
        keyword: keyword || undefined,
      });
      const disposition =
        res?.headers?.["content-disposition"] ||
        res?.headers?.["Content-Disposition"] ||
        "";
      let filename = "point-mapping-template.xlsx";
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
      showAlert("양식 다운로드에 실패했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePickFile = () => {
    if (isImporting) return;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일 재선택 허용
    if (!file) return;
    setIsImporting(true);
    try {
      const result = await importPointMappingAPI(file);
      const total = result?.total ?? 0;
      const applied = result?.applied ?? 0;
      const failed = Array.isArray(result?.failed) ? result.failed : [];
      queryClient.invalidateQueries({ queryKey: DEVICE_POINT_MAPPING_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: POINT_MAPPING_STATS_QUERY_KEY });
      setDrafts({});

      let msg = `반영 ${applied}/${total}건`;
      if (failed.length > 0) {
        const preview = failed
          .slice(0, 10)
          .map((f) => `· ${f.row}행 [${f.pointKey ?? "-"}] ${f.reason ?? ""}`)
          .join("\n");
        const more = failed.length > 10 ? `\n… 외 ${failed.length - 10}건` : "";
        msg += `\n실패 ${failed.length}건:\n${preview}${more}`;
      }
      showAlert(msg);
    } catch {
      showAlert("파일 업로드에 실패했습니다.");
    } finally {
      setIsImporting(false);
    }
  };

  const isRowDirty = (row) => {
    const d = drafts[row.pointId];
    if (!d) return false;
    return (
      norm(d.refDeviceCode) !== norm(row.refDeviceCode) ||
      norm(d.refPointCode) !== norm(row.refPointCode) ||
      normDataSource(d.dataSource) !== normDataSource(row.dataSource)
    );
  };

  const dirtyRows = useMemo(() => points.filter(isRowDirty), [points, drafts]);

  // 미매핑 필터는 서버에서 처리(unmapped 파라미터) → 화면은 서버 결과를 그대로 사용.
  const displayRows = points;

  const toggleUnmappedOnly = (next) => {
    setUnmappedOnly(next);
    setPage(0); // 필터 바뀌면 첫 페이지부터
  };

  const getRefDeviceCode = (row) =>
    drafts[row.pointId]?.refDeviceCode ?? row.refDeviceCode ?? "";

  const getRefPointCode = (row) =>
    drafts[row.pointId]?.refPointCode ?? row.refPointCode ?? "";

  /** 서버가 null 을 VIEW01 로 취급하므로 화면도 VIEW01 로 표시한다. */
  const getDataSource = (row) =>
    normDataSource(drafts[row.pointId]?.dataSource ?? row.dataSource);

  const updateDraft = (pointId, field, value) => {
    setDrafts((prev) => {
      const row = points.find((p) => p.pointId === pointId);
      const base = prev[pointId] ?? {
        refDeviceCode: row?.refDeviceCode ?? "",
        refPointCode: row?.refPointCode ?? "",
        dataSource: normDataSource(row?.dataSource),
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
          // 항상 명시적으로 보낸다. 서버는 null 을 "변경 없음"으로 처리하므로,
          // 사용자가 VIEW01 로 되돌린 경우를 반영하려면 코드를 실어야 한다.
          dataSource: getDataSource(row),
        }))
      ),
    onSuccess: (res) => {
      if (res?.success !== false) {
        setDrafts({});
        queryClient.invalidateQueries({ queryKey: DEVICE_POINT_MAPPING_QUERY_KEY });
        showAlert(res?.message || "SI 포인트 매핑이 저장되었습니다.");
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
          value={draftFilter}
          onChange={setDraftFilter}
        />
        <SearchInput
          placeholder="장비·태그·포인트명·ref 코드 검색"
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
        <UnmappedToggle title="저장된 ref 코드가 없는(미매핑) 포인트만 현재 결과에서 표시">
          <input
            type="checkbox"
            checked={unmappedOnly}
            onChange={(e) => toggleUnmappedOnly(e.target.checked)}
          />
          미매핑만
        </UnmappedToggle>
        <ToolbarSpacer />
        <Button
          variant="secondary"
          onClick={handleDownloadTemplate}
          disabled={isDownloading}
          style={{ height: TOOLBAR_CONTROL_HEIGHT, flexShrink: 0 }}
        >
          {isDownloading ? "다운로드 중…" : "양식 다운로드"}
        </Button>
        <Button
          variant="secondary"
          onClick={handlePickFile}
          disabled={isImporting}
          style={{ height: TOOLBAR_CONTROL_HEIGHT, flexShrink: 0 }}
        >
          {isImporting ? "업로드 중…" : "파일 업로드"}
        </Button>
        <HiddenFileInput
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          onChange={handleFileSelected}
        />
        <Button
          variant="primary"
          disabled={dirtyRows.length === 0 || isSaving}
          onClick={() => saveMappings()}
          style={{ height: TOOLBAR_CONTROL_HEIGHT, flexShrink: 0 }}
        >
          {isSaving ? "저장 중…" : `변경 저장 (${dirtyRows.length})`}
        </Button>
      </Toolbar>

      <CardGrid>
        <Card>
          <CardLabel>전체 포인트</CardLabel>
          <CardValue>{statTotal.toLocaleString()}</CardValue>
        </Card>
        <Card>
          <CardLabel>매핑 완료</CardLabel>
          <CardValue $tone="mapped">{statMapped.toLocaleString()}</CardValue>
        </Card>
        <Card>
          <CardLabel>매핑률</CardLabel>
          <CardValue>{statRate}%</CardValue>
        </Card>
        <Card>
          <CardLabel>미매핑</CardLabel>
          <CardValue $tone="unmapped">{statUnmapped.toLocaleString()}</CardValue>
        </Card>
        {dirtyRows.length > 0 && (
          <Card>
            <CardLabel>변경 대기</CardLabel>
            <CardValue $tone="dirty">{dirtyRows.length.toLocaleString()}</CardValue>
          </Card>
        )}
      </CardGrid>

      <HintBox>
        연계 시스템 포인트의 <code>ref_device_code</code>, <code>ref_point_code</code>를 입력하세요.
        두 값을 모두 비우면 매핑이 해제됩니다. 동일한 SI 코드는 한 논리 포인트에만 연결할 수 있습니다.
        <br />
        <strong>원천 소스</strong>는 이 포인트의 값을 채우는 수집 경로입니다. 카테고리 스키마에
        소스를 지정하면 <strong>저장 시 이 값이 덮어쓰기</strong>되므로, 스키마가 있는 포인트는
        카테고리 관리에서 지정하세요.
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
              <Th style={{ width: 130 }}>원천 소스</Th>
              <Th $center style={{ width: 72 }}>상태</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading || isFetching ? (
              <tr>
                <Td colSpan={12} $center>
                  불러오는 중…
                </Td>
              </tr>
            ) : displayRows.length === 0 ? (
              <tr>
                <Td colSpan={12} $center>
                  {unmappedOnly
                    ? "미매핑 포인트가 없습니다."
                    : keyword || hasHierarchyFilter(appliedFilter)
                    ? "검색 결과가 없습니다."
                    : "대·중·소·장비를 선택 후 검색하거나, 검색어로 포인트를 찾을 수 있습니다."}
                </Td>
              </tr>
            ) : (
              displayRows.map((row, idx) => {
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
                    <Td>{row.pointDisplayName || "-"}</Td>
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
                    <Td>
                      <SourceSelect
                        value={getDataSource(row)}
                        onChange={(e) =>
                          updateDraft(row.pointId, "dataSource", e.target.value)
                        }
                        $dirty={dirty}
                        title="이 포인트의 값을 채우는 수집 경로. 잘못 지정하면 값이 덮이거나 수집되지 않습니다."
                      >
                        {dataSources.length === 0 && (
                          <option value={DEFAULT_DATA_SOURCE}>{DEFAULT_DATA_SOURCE}</option>
                        )}
                        {dataSources.map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.label}
                          </option>
                        ))}
                      </SourceSelect>
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

const UnmappedToggle = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid #d0d3d8;
  border-radius: 4px;
  font-size: 13px;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
  user-select: none;
  input { cursor: pointer; }
  &:hover { background: #f2f4f7; }
`;

const ToolbarSpacer = styled.div`
  flex: 1 1 auto;
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
`;

const Card = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 16px 18px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
`;

const CardLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 8px;
`;

const CardValue = styled.div<{ $tone?: "mapped" | "unmapped" | "dirty" }>`
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${(p) =>
    p.$tone === "mapped"
      ? "#15803d"
      : p.$tone === "unmapped"
      ? "#b91c1c"
      : p.$tone === "dirty"
      ? "#b45309"
      : "#111d2c"};
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

const Th = styled.th<{ $center?: boolean }>`
  padding: 10px 12px;
  text-align: ${(p) => (p.$center ? "center" : "left")};
  background: #f4f5f7;
  border-bottom: 1px solid #e1e2e5;
  font-weight: 600;
  white-space: nowrap;
`;

const Td = styled.td<{ $center?: boolean }>`
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

const RefInput = styled.input<{ $dirty?: boolean }>`
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

const SourceSelect = styled.select<{ $dirty?: boolean }>`
  width: 100%;
  min-width: 110px;
  height: 32px;
  padding: 0 6px;
  border: 1px solid ${(p) => (p.$dirty ? "#f59e0b" : "#d0d3d8")};
  border-radius: 4px;
  font-size: 12px;
  background: ${(p) => (p.$dirty ? "#fffef5" : "#fff")};
  cursor: pointer;
`;

const StatusBadge = styled.span<{ $mapped?: boolean | string; $dirty?: boolean }>`
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
