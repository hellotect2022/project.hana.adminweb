import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui";
import {
  categoryFetchAPI,
  DEVICE_CATEGORY_QUERY_KEY,
  devicePointsQueryKey,
  fetchDevicePointsAPI,
  flattenDeviceCategoryTree,
  saveTagMappingAPI,
} from "@/services/deviceService";

// ─────────────────────────────────────────────
// 커스텀 드롭다운 컴포넌트
// select 안에서 "더 불러오기" 버튼을 클릭할 수 없기 때문에
// 드롭다운을 직접 구현합니다.
// ─────────────────────────────────────────────
const PointCombobox = ({ value, onChange, points, hasNextPage, onLoadMore, isFetchingNextPage }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);


  const selected = points.find((p) => {
    //console.log(value,'-',p)
    return p.deviceCode+":"+p.pointCode === value
  });
  const label = selected
    ? `[${selected.objectType ?? "?"}] ${selected.pointName}${selected.unit ? ` (${selected.unit})` : ""}`
    : "— 미매핑 —";

  return (
    <ComboWrap ref={containerRef}>
      <ComboTrigger
        type="button"
        $mapped={!!value}
        $open={open}
        onClick={() => setOpen((p) => !p)}
      >
        <TriggerLabel $mapped={!!value}>{label}</TriggerLabel>
        <TriggerArrow $open={open}>▾</TriggerArrow>
      </ComboTrigger>

      {open && (
        <DropdownList>
          {/* 미매핑 선택지 */}
          <DropItem
            $selected={!value}
            onMouseDown={() => { onChange(""); setOpen(false); }}
          >
            — 미매핑 —
          </DropItem>

          {/* 포인트 목록 */}
          {points.map((p) => (
            <DropItem
              key={p.deviceCode+":"+p.pointCode}
              $selected={p.pointCode === value}
              onMouseDown={() => { onChange(p); setOpen(false); }}
            >
              <DropCode>[{p.objectType ?? "?"}]</DropCode>
              <DropName>{p.pointName}</DropName>
              {p.unit && <DropUnit>({p.unit})</DropUnit>}
            </DropItem>
          ))}

          {/* 더 불러오기 버튼 — 드롭다운 안에 있어서 클릭 가능 */}
          {hasNextPage && (
            <LoadMoreItem
              onMouseDown={(e) => {
                e.preventDefault(); // 드롭다운 닫히지 않게
                onLoadMore();
              }}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? "로딩 중…" : "▼ 다음 10개 더 불러오기"}
            </LoadMoreItem>
          )}

          {!hasNextPage && points.length > 0 && (
            <EndHint>— 전체 {points.length}개 로드 완료 —</EndHint>
          )}
        </DropdownList>
      )}
    </ComboWrap>
  );
};

// ─────────────────────────────────────────────
// 메인 모달
// ─────────────────────────────────────────────
const DevicePointMappingModal = ({ device, onClose }) => {
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [priorityCodes, setPriorityCodes] = useState([])

  // 카테고리 스키마 조회
  const { data: flat = [] } = useQuery({
    queryKey: DEVICE_CATEGORY_QUERY_KEY,
    queryFn: async () => {
      const res = await categoryFetchAPI();
      if (!res?.success) throw new Error(res?.message ?? "카테고리 조회 실패");
      return res.data ?? [];
    },
    select: (tree) => flattenDeviceCategoryTree(tree),
  });



  const schema = flat.find((c) => c.categoryId === device.categoryId)?.schemaDefinitions ?? [];

  // 포인트 목록 조회 (페이지네이션)
  // GET /device/{id}/points?page=0&keyword=xxx  size=10 고정
  const {
    data: pageData,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ["devicePoints", device.deviceId, keyword],
    queryFn: ({ pageParam = 0 }) => fetchDevicePointsAPI({ deviceId: device.deviceId, page: pageParam, keyword, priorityCodes }),
    select: (data) =>{
      console.log('data',data);
      return data;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.data || lastPage.data.length < 10) return undefined;
      return allPages.length;
    },
    initialPageParam: 0,
    enabled: !!priorityCodes && priorityCodes.length > 0
  });

  const points = pageData?.pages.flatMap((p) => p.data ?? []) ?? [];

  // 매핑 상태: { [tagName]: pointCode | "" }
  const [mapping, setMapping] = useState({});
  const [dirty, setDirty] = useState(false);


  const test = {};

  const initMappingInfo = () => {
    //console.log('device->',device)
    if (!schema.length) return;
    const init = {};
    console.log('kkkk', device)
    schema.forEach((s) => { 
      init[s.tagName] = device.deviceMappingInfo?.[s.tagName] ?? ""; 
    });

    setPriorityCodes(Object.values(init))
    setMapping(init);
    setDirty(false);
  }

  useEffect(() => {
    initMappingInfo()
  }, [device.deviceId, schema]);

  


  const { mutate: saveMapping, isPending: isSaving } = useMutation({
    mutationFn: saveTagMappingAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: devicePointsQueryKey(device.deviceId) });
      setDirty(false);
    },
  });

  const handleSave = () => {
    console.log('mapping', mapping);
    saveMapping({ deviceId: device.deviceId, mappings: mapping });
  };

  const handleSearch = () => {
    setPriorityCodes(Object.values(mapping))
    setKeyword(searchInput.trim())
  };

  if (!device.categoryId) {
    return (
      <Container>
        <Notice>카테고리가 지정되지 않아 스키마를 불러올 수 없습니다. 먼저 카테고리를 설정해 주세요.</Notice>
      </Container>
    );
  }

  if (!isLoading && schema.length === 0) {
    return (
      <Container>
        <Notice>
          카테고리 <strong>{device.categoryName}</strong>에 schema_definition이 없습니다.
          장비 카테고리 관리 페이지에서 먼저 정의해 주세요.
        </Notice>
      </Container>
    );
  }

  const mappedCount = schema.filter((s) => mapping[s.tagName]).length;

  // console.log('ss',schema)
  // console.log('mm',mapping)

  return (
    <Container>
      <InfoBar>
        <InfoItem><InfoLabel>장비</InfoLabel><InfoValue>{device.deviceName}</InfoValue></InfoItem>
        <InfoItem><InfoLabel>카테고리</InfoLabel><InfoValue>{device.categoryPath || device.categoryName || "-"}</InfoValue></InfoItem>
        <InfoItem>
          <InfoLabel>매핑 현황</InfoLabel>
          <MappingBadge $done={mappedCount === schema.length}>
            {mappedCount} / {schema.length} 완료
          </MappingBadge>
        </InfoItem>
      </InfoBar>

      <SearchBar>
        <SearchInput
          placeholder="포인트명 검색 후 Enter"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button variant="secondary" onClick={handleSearch}>검색</Button>
        <HintText>
          {isLoading ? "로딩 중…" : `${points.length}개 로드됨${hasNextPage ? " (더 있음)" : " (전체)"}`}
        </HintText>
      </SearchBar>

      <TableWrap>
        <MappingTable>
          <thead>
            <tr>
              <MTh style={{ width: 140 }}>tagName</MTh>
              <MTh style={{ width: 70 }}>type</MTh>
              <MTh style={{ width: 80 }}>unit</MTh>
              <MTh style={{ width: 60 }} $center>표시</MTh>
              <MTh>매핑할 DevicePoint (view)</MTh>
              <MTh style={{ width: 80 }} $center>상태</MTh>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><MTd colSpan={6} $center>포인트 로딩 중…</MTd></tr>
            ) : (
              schema.map((s) => {
                const selectedCode = mapping[s.tagName] ?? "";
                return (
                  <tr key={s.tagName}>
                    <MTd><TagName>{s.tagName}</TagName></MTd>
                    <MTd><TypeBadge $type={s.type}>{s.type}</TypeBadge></MTd>
                    <MTd><UnitText>{s.unit || "—"}</UnitText></MTd>
                    <MTd $center>
                      {s.isDisplay ? <span>✓</span> : <span style={{ color: "#d1d5db" }}>—</span>}
                    </MTd>
                    <MTd>
                      <PointCombobox
                        value={selectedCode}
                        onChange={(point) => {
                          console.log('point', point);
                          setMapping((prev) => ({ ...prev, [s.tagName]: point.deviceCode+":"+point.pointCode }));
                          setDirty(true);
                        }}
                        points={points}
                        hasNextPage={hasNextPage}
                        onLoadMore={fetchNextPage}
                        isFetchingNextPage={isFetchingNextPage}
                      />
                    </MTd>
                    <MTd $center>
                      <StatusBadge $ok={!!selectedCode}>{selectedCode ? "매핑됨" : "미매핑"}</StatusBadge>
                    </MTd>
                  </tr>
                );
              })
            )}
          </tbody>
        </MappingTable>
      </TableWrap>

      <PreviewSection>
        <PreviewTitle>
          저장 시 전송되는 매핑 데이터
          {dirty && <DirtyBadge>미저장 변경사항 있음</DirtyBadge>}
        </PreviewTitle>
        <PreviewCode>
          {mapping && JSON.stringify(mapping, null, 2)}
          {/* {JSON.stringify(
            schema.map((s) => ({ tagName: s.tagName, key: mapping[s.tagName] || null })),
            null,
            2
          )} */}
        </PreviewCode>
      </PreviewSection>

      <ActionRow>
        <Button variant="outline" onClick={onClose}>닫기</Button>
        <Button variant="primary" onClick={handleSave} disabled={!dirty || isSaving}>
          {isSaving ? "저장 중…" : "매핑 저장"}
        </Button>
      </ActionRow>
    </Container>
  );
};

export default DevicePointMappingModal;

// ── Styled Components ────────────────────────────────────────────────

const Container = styled.div`
  min-width: 680px;
  max-width: 900px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Notice = styled.div`
  padding: 32px;
  text-align: center;
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 8px;
  font-size: 14px;
  color: #92400e;
  line-height: 1.8;
`;

const InfoBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
`;

const InfoItem = styled.div`display: flex; align-items: center; gap: 8px;`;
const InfoLabel = styled.span`font-size: 12px; font-weight: 600; color: #64748b;`;
const InfoValue = styled.span`font-size: 13px; color: #111827;`;

const MappingBadge = styled.span<{ $done?: boolean }>`
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 700;
  border-radius: 12px;
  background: ${(p) => (p.$done ? "#dcfce7" : "#fef3c7")};
  color: ${(p) => (p.$done ? "#15803d" : "#92400e")};
`;

const SearchBar = styled.div`display: flex; align-items: center; gap: 8px;`;

const SearchInput = styled.input`
  padding: 7px 12px;
  width: 280px;
  font-size: 13px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
  &:focus { border-color: #4a90d9; }
  &::placeholder { color: #9ca3af; }
`;

const HintText = styled.span`font-size: 12px; color: #94a3b8;`;

const TableWrap = styled.div`
  //overflow-x: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
`;

const MappingTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
`;

const MTh = styled.th<{ $center?: boolean }>`
  padding: 9px 12px;
  text-align: ${(p) => (p.$center ? "center" : "left")};
  font-size: 12px;
  font-weight: 700;
  color: #374151;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
`;

const MTd = styled.td<{ $center?: boolean }>`
  padding: 8px 10px;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: middle;
  text-align: ${(p) => (p.$center ? "center" : "left")};
`;

const TagName = styled.code`
  font-size: 12px;
  font-weight: 700;
  color: #0d47a1;
  background: #e8f0fe;
  padding: 2px 7px;
  border-radius: 4px;
`;

const TYPE_COLORS = {
  AI: { bg: "#dbeafe", color: "#1d4ed8" },
  DI: { bg: "#dcfce7", color: "#15803d" },
  AO: { bg: "#fef9c3", color: "#854d0e" },
  DO: { bg: "#fce7f3", color: "#9d174d" },
  String: { bg: "#f3e8ff", color: "#6b21a8" },
  Bool: { bg: "#ffedd5", color: "#9a3412" },
};

const TypeBadge = styled.span<{ $type?: string }>`
  display: inline-block; padding: 2px 8px; font-size: 11px; font-weight: 700; border-radius: 4px;
  background: ${(p) => TYPE_COLORS[p.$type]?.bg ?? "#f3f4f6"};
  color: ${(p) => TYPE_COLORS[p.$type]?.color ?? "#374151"};
`;

const UnitText = styled.span`font-size: 12px; color: #475569;`;

const StatusBadge = styled.span<{ $ok?: boolean }>`
  display: inline-block; padding: 2px 8px; font-size: 11px; font-weight: 600; border-radius: 10px;
  background: ${(p) => (p.$ok ? "#dcfce7" : "#f3f4f6")};
  color: ${(p) => (p.$ok ? "#15803d" : "#9ca3af")};
`;

// ── PointCombobox Styles ──────────────────────────────

const ComboWrap = styled.div`
  position: relative;
  width: 100%;
  min-width: 220px;
`;

const ComboTrigger = styled.button<{ $mapped?: boolean; $open?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 5px 10px;
  font-size: 13px;
  text-align: left;
  border: 1px solid ${(p) => (p.$mapped ? "#86efac" : p.$open ? "#4a90d9" : "#e5e7eb")};
  border-radius: 5px;
  background: ${(p) => (p.$mapped ? "#f0fdf4" : "#fff")};
  cursor: pointer;
  &:hover { border-color: #4a90d9; }
`;

const TriggerLabel = styled.span<{ $mapped?: boolean }>`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${(p) => (p.$mapped ? "#15803d" : "#9ca3af")};
`;

const TriggerArrow = styled.span<{ $open?: boolean }>`
  flex-shrink: 0;
  margin-left: 6px;
  font-size: 12px;
  color: #94a3b8;
  transition: transform 0.15s;
  transform: ${(p) => (p.$open ? "rotate(180deg)" : "rotate(0deg)")};
`;

const DropdownList = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 999;
  max-height: 240px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
`;

const DropItem = styled.div<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  font-size: 13px;
  cursor: pointer;
  background: ${(p) => (p.$selected ? "#eff6ff" : "transparent")};
  color: ${(p) => (p.$selected ? "#1d4ed8" : "#111827")};
  &:hover { background: #f3f4f6; }
`;

const DropCode = styled.span`
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
`;

const DropName = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const DropUnit = styled.span`
  flex-shrink: 0;
  font-size: 11px;
  color: #94a3b8;
`;

const LoadMoreItem = styled.div<{ disabled?: boolean }>`
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
  color: #2563eb;
  background: #eff6ff;
  border-top: 1px dashed #bfdbfe;
  cursor: ${(p) => (p.disabled ? "not-allowed" : "pointer")};
  opacity: ${(p) => (p.disabled ? 0.5 : 1)};
  &:hover:not([disabled]) { background: #dbeafe; }
`;

const EndHint = styled.div`
  padding: 6px 10px;
  font-size: 11px;
  text-align: center;
  color: #94a3b8;
  border-top: 1px solid #f3f4f6;
`;

const PreviewSection = styled.div`
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
`;

const PreviewTitle = styled.div`
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const DirtyBadge = styled.span`
  font-size: 11px; font-weight: 600; padding: 1px 8px; border-radius: 999px;
  background: #fef3c7; color: #92400e;
`;

const PreviewCode = styled.pre`
  margin: 0;
  padding: 10px 14px;
  font-size: 11px;
  color: #334155;
  background: #fff;
  overflow-x: auto;
  max-height: 140px;
  line-height: 1.6;
`;

const ActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
`;

