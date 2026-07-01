import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import styled from "styled-components";
import { Button } from "@/components/ui";
import {
  categoryFetchAPI,
  DEVICE_CATEGORY_QUERY_KEY,
  flattenDeviceCategoryTree,
  sortByDisplayOrder,
} from "@/services/deviceService";

/**
 * 대·중·소 카테고리 3열 선택 UI (공통)
 *
 * @param {{
 *   selectedMajorId: number | null;
 *   selectedMidId: number | null;
 *   selectedSmallId: number | null;
 *   onMajorChange: (categoryId: number, category: import("@/services/deviceService").DeviceCategoryFlat) => void;
 *   onMidChange: (categoryId: number, category: import("@/services/deviceService").DeviceCategoryFlat) => void;
 *   onSmallChange: (
 *     categoryId: number,
 *     category: import("@/services/deviceService").DeviceCategoryFlat,
 *     ctx: {
 *       major: import("@/services/deviceService").DeviceCategoryFlat | null;
 *       mid: import("@/services/deviceService").DeviceCategoryFlat | null;
 *     }
 *   ) => void;
 *   autoSelectFirstMajor?: boolean;
 *   compact?: boolean;
 * }} props
 */
const DeviceCategoryPicker = ({
  selectedMajorId,
  selectedMidId,
  selectedSmallId,
  onMajorChange,
  onMidChange,
  onSmallChange,
  autoSelectFirstMajor = true,
  compact = false,
}) => {
  const {
    data: categoryTree,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: DEVICE_CATEGORY_QUERY_KEY,
    queryFn: async () => {
      const res = await categoryFetchAPI();
      if (!res?.success) throw new Error(res?.message || "카테고리 조회 실패");
      return res.data ?? [];
    },
  });

  const flat = useMemo(() => flattenDeviceCategoryTree(categoryTree), [categoryTree]);

  const majors = useMemo(
    () => flat.filter((c) => c.parentId == null && c.active).sort(sortByDisplayOrder),
    [flat]
  );
  const mids = useMemo(
    () =>
      selectedMajorId == null
        ? []
        : flat.filter((c) => c.parentId === selectedMajorId && c.active).sort(sortByDisplayOrder),
    [flat, selectedMajorId]
  );
  const smalls = useMemo(
    () =>
      selectedMidId == null
        ? []
        : flat.filter((c) => c.parentId === selectedMidId && c.active).sort(sortByDisplayOrder),
    [flat, selectedMidId]
  );

  const selectedMajor = useMemo(
    () => flat.find((c) => c.categoryId === selectedMajorId) ?? null,
    [flat, selectedMajorId]
  );
  const selectedMid = useMemo(
    () => flat.find((c) => c.categoryId === selectedMidId) ?? null,
    [flat, selectedMidId]
  );

  useEffect(() => {
    if (!autoSelectFirstMajor || !majors.length) return;
    if (selectedMajorId != null && majors.some((m) => m.categoryId === selectedMajorId)) return;
    onMajorChange(majors[0].categoryId, majors[0]);
  }, [autoSelectFirstMajor, majors, selectedMajorId, onMajorChange]);

  if (isLoading && !categoryTree) {
    return <StatusBox>카테고리를 불러오는 중…</StatusBox>;
  }

  if (isError) {
    return (
      <ErrorBox>
        <p>{error?.message ?? "카테고리를 불러오지 못했습니다."}</p>
        <Button variant="secondary" onClick={() => refetch()}>
          다시 시도
        </Button>
      </ErrorBox>
    );
  }

  return (
    <>
      {isFetching && !isLoading && <FetchHint>동기화 중…</FetchHint>}
      <ThreeCol>
        <Pane $compact={compact}>
          <PaneHeader>
            <PaneTitleText>대분류</PaneTitleText>
          </PaneHeader>
          <ListBox $compact={compact}>
            {majors.length === 0 && <EmptyHint>등록된 대분류가 없습니다.</EmptyHint>}
            {majors.map((m) => (
              <ListItem
                key={m.categoryId}
                $active={m.categoryId === selectedMajorId}
                onClick={() => onMajorChange(m.categoryId, m)}
              >
                <ItemLabel>{m.categoryName}</ItemLabel>
                {m.categoryCode && <ItemCode>{m.categoryCode}</ItemCode>}
              </ListItem>
            ))}
          </ListBox>
        </Pane>

        <Pane $compact={compact}>
          <PaneHeader>
            <PaneTitleText>중분류</PaneTitleText>
          </PaneHeader>
          <ListBox $compact={compact}>
            {mids.length === 0 && (
              <EmptyHint>
                {selectedMajorId ? "중분류가 없습니다." : "대분류를 선택하세요."}
              </EmptyHint>
            )}
            {mids.map((m) => (
              <ListItem
                key={m.categoryId}
                $active={m.categoryId === selectedMidId}
                onClick={() => onMidChange(m.categoryId, m)}
              >
                <ItemLabel>{m.categoryName}</ItemLabel>
                {m.categoryCode && <ItemCode>{m.categoryCode}</ItemCode>}
              </ListItem>
            ))}
          </ListBox>
        </Pane>

        <Pane $compact={compact}>
          <PaneHeader>
            <PaneTitleText>소분류</PaneTitleText>
          </PaneHeader>
          <ListBox $compact={compact}>
            {smalls.length === 0 && (
              <EmptyHint>
                {selectedMidId ? "소분류가 없습니다." : "중분류를 선택하세요."}
              </EmptyHint>
            )}
            {smalls.map((s) => (
              <ListItem
                key={s.categoryId}
                $active={s.categoryId === selectedSmallId}
                onClick={() =>
                  onSmallChange(s.categoryId, s, {
                    major: selectedMajor,
                    mid: selectedMid,
                  })
                }
              >
                <ItemLabel>{s.categoryName}</ItemLabel>
                {s.categoryCode && <ItemCode>{s.categoryCode}</ItemCode>}
              </ListItem>
            ))}
          </ListBox>
        </Pane>
      </ThreeCol>
    </>
  );
};

export default DeviceCategoryPicker;

const StatusBox = styled.div`
  padding: 24px;
  text-align: center;
  font-size: 14px;
  color: #64748b;
`;

const ErrorBox = styled.div`
  padding: 20px;
  text-align: center;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fef2f2;
  p {
    margin: 0 0 12px;
    font-size: 14px;
    color: #b91c1c;
  }
`;

const FetchHint = styled.div`
  font-size: 12px;
  color: #64748b;
  text-align: right;
  margin-bottom: 6px;
`;

const ThreeCol = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  align-items: stretch;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Pane = styled.div<{ $compact?: boolean }>`
  display: flex;
  flex-direction: column;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
  min-height: ${(p) => (p.$compact ? "200px" : "280px")};
`;

const PaneHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #e8ecf1;
  border-bottom: 1px solid #d1d5db;
`;

const PaneTitleText = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: #111d2c;
`;

const ListBox = styled.div<{ $compact?: boolean }>`
  flex: 1;
  min-height: ${(p) => (p.$compact ? "140px" : "220px")};
  max-height: ${(p) => (p.$compact ? "200px" : "340px")};
  overflow-y: auto;
  padding: 6px;
`;

const ListItem = styled.div<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 8px;
  margin-bottom: 3px;
  font-size: 13px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: ${(p) => (p.$active ? "rgba(74, 99, 128, 0.15)" : "transparent")};
  color: ${(p) => (p.$active ? "#1e3a5f" : "#374151")};
  font-weight: ${(p) => (p.$active ? 600 : 400)};
  cursor: pointer;
  &:hover {
    background: ${(p) => (p.$active ? "rgba(74,99,128,0.2)" : "#f3f4f6")};
  }
`;

const ItemLabel = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ItemCode = styled.span`
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #4a6380;
  background: #e8ecf1;
  padding: 1px 6px;
  border-radius: 3px;
`;

const EmptyHint = styled.div`
  padding: 20px 12px;
  text-align: center;
  font-size: 13px;
  color: #9ca3af;
`;
