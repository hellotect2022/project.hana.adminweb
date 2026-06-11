import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import {
  categoryFetchAPI,
  DEVICE_CATEGORY_QUERY_KEY,
  flattenDeviceCategoryTree,
  sortByDisplayOrder,
} from "@/services/deviceService";
import {
  createMenuFromCategory,
  deleteMenu,
  fetchAllMenus,
  MENU_ALL_QUERY_KEY,
  updateMenuSortOrders,
} from "@/services/menuService";

/**
 * 메뉴 표시 설정 — 대·중·소 1:1 3열 + 메뉴에는 categoryId(숫자) 단일 매핑
 * 장비 카테고리: GET /device/device-categories
 */

function getPathLabel(flatList, categoryId) {
  const row = flatList.find((c) => c.categoryId === categoryId);
  if (!row) return "";
  return row.fullPath?.replace(/\s*>\s*/g, " › ") ?? row.categoryName ?? "";
}

const CategoryManageForm = () => {
  const queryClient = useQueryClient();

  // 카테고리 조회 
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
      if (!res?.success) {
        throw new Error(res?.message || "장비 카테고리 조회에 실패했습니다.");
      }
      return res.data ?? [];
    },
  });

  const flat = useMemo(() => flattenDeviceCategoryTree(categoryTree),
    [categoryTree]
  );

  const [selectedMajorId, setSelectedMajorId] = useState(null);
  const [selectedMidId, setSelectedMidId] = useState(null);
  const [selectedSmallId, setSelectedSmallId] = useState(null);

  // 대분류
  const majors = useMemo(() => {
    return flat
      .filter((c) => c.parentId == null && c.active)
      .sort(sortByDisplayOrder);
  }, [flat]);

  //중분류
  const mids = useMemo(() => {
    if (selectedMajorId == null) return [];
    return flat
      .filter((c) => c.parentId === selectedMajorId && c.active)
      .sort(sortByDisplayOrder);
  }, [flat, selectedMajorId]);

  // 소분류
  const smalls = useMemo(() => {
    if (selectedMidId == null) return [];
    return flat
      .filter((c) => c.parentId === selectedMidId && c.active)
      .sort(sortByDisplayOrder);
  }, [flat, selectedMidId]);


  
  useEffect(() => {
    if (majors.length === 0) return;
    setSelectedMajorId((prev) => {
      if (prev != null && majors.some((m) => m.categoryId === prev)) return prev;
      return majors[0].categoryId;
    });
  }, [majors]);

  const activeCategoryId =
    selectedSmallId ?? selectedMidId ?? selectedMajorId ?? null;

  const activeLabel = useMemo(() => {
    if (activeCategoryId == null) return "";
    return getPathLabel(flat, activeCategoryId);
  }, [flat, activeCategoryId]);

  const pickMajor = (id) => {
    setSelectedMajorId(id);
    setSelectedMidId(null);
    setSelectedSmallId(null);
  };

  const pickMid = (id) => {
    setSelectedMidId(id);
    setSelectedSmallId(null);
  };

  const pickSmall = (id) => {
    setSelectedSmallId(id);
  };

  
  if (isLoading && !categoryTree) {
    return (
      <Wrap>
        <StatusBox>장비 카테고리를 불러오는 중…</StatusBox>
      </Wrap>
    );
  }

  if (isError) {
    return (
      <Wrap>
        <ErrorBox>
          <p>{error?.message ?? "카테고리를 불러오지 못했습니다."}</p>
          <RetryBtn type="button" onClick={() => refetch()}>
            다시 시도
          </RetryBtn>
        </ErrorBox>
      </Wrap>
    );
  }

  return (
    <Wrap>
      {isFetching && !isLoading ? (
        <FetchHint>동기화 중…</FetchHint>
      ) : null}

      <ThreeCol>
        {/* 대분류 */}
        <Pane>
          <PaneTitle>대분류</PaneTitle>
          <ListBox>
            {majors.length === 0 ? (
              <EmptyHint>등록된 대분류가 없습니다.</EmptyHint>
            ) : (
              majors.map((m) => (
                <ListItem
                  key={m.categoryId}
                  type="button"
                  $active={m.categoryId === selectedMajorId}
                  onClick={() => pickMajor(m.categoryId)}
                >
                  {m.categoryName}
                </ListItem>
              ))
            )}
          </ListBox>
          <PaneFoot>장비 카테고리는 API에서 조회합니다.</PaneFoot>
        </Pane>
        
        {/* 중분류 */}
        <Pane>
          <PaneTitle>중분류</PaneTitle>
          <ListBox>
            {mids.length === 0 ? (
              <EmptyHint>대분류를 선택하세요.</EmptyHint>
            ) : (
              mids.map((m) => (
                <ListItem
                  key={m.categoryId}
                  type="button"
                  $active={m.categoryId === selectedMidId}
                  onClick={() => pickMid(m.categoryId)}
                >
                  {m.categoryName}
                </ListItem>
              ))
            )}
          </ListBox>
          <PaneFoot>장비 카테고리는 API에서 조회합니다.</PaneFoot>
        </Pane>

        {/* 소분류 */}
        <Pane>
          <PaneTitle>소분류</PaneTitle>
          <ListBox>
            {smalls.length === 0 ? (
              <EmptyHint>중분류를 선택하세요.</EmptyHint>
            ) : (
              smalls.map((s) => (
                <ListItem
                  key={s.categoryId}
                  type="button"
                  $active={s.categoryId === selectedSmallId}
                  onClick={() => pickSmall(s.categoryId)}
                >
                  {s.categoryName}
                </ListItem>
              ))
            )}
          </ListBox>
          <PaneFoot>장비 카테고리는 API에서 조회합니다.</PaneFoot>
        </Pane>
      </ThreeCol>
    </Wrap>
  );
};

export default CategoryManageForm;

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0 24px;
`;

const StatusBox = styled.div`
  padding: 48px 24px;
  text-align: center;
  font-size: 14px;
  color: #64748b;
`;

const ErrorBox = styled.div`
  padding: 24px;
  text-align: center;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;
  p {
    margin: 0 0 12px 0;
  }
`;

const RetryBtn = styled.button`
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: #4a6380;
  border: none;
  border-radius: 6px;
  cursor: pointer;
`;

const FetchHint = styled.div`
  font-size: 12px;
  color: #64748b;
  text-align: right;
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

const Pane = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
  min-height: 320px;
`;

const PaneTitle = styled.div`
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 700;
  color: #111d2c;
  background: #e8ecf1;
  border-bottom: 1px solid #d1d5db;
`;

const PaneFoot = styled.div`
  padding: 8px 10px;
  font-size: 11px;
  color: #94a3b8;
  border-top: 1px solid #e5e7eb;
  background: #fafafa;
`;

const ListBox = styled.div`
  flex: 1;
  min-height: 240px;
  max-height: 360px;
  overflow-y: auto;
  padding: 6px;
`;

const ListItem = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  margin-bottom: 4px;
  font-size: 14px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: ${(p) => (p.$active ? "rgba(74, 99, 128, 0.15)" : "transparent")};
  color: ${(p) => (p.$active ? "#1e3a5f" : "#374151")};
  font-weight: ${(p) => (p.$active ? 600 : 400)};
  cursor: pointer;
  &:hover {
    background: ${(p) => (p.$active ? "rgba(74, 99, 128, 0.2)" : "#f3f4f6")};
  }
`;

const EmptyHint = styled.div`
  padding: 24px 12px;
  text-align: center;
  font-size: 13px;
  color: #9ca3af;
`;

const AddBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
`;

const AddInfo = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #475569;
  span.path {
    color: #111d2c;
    font-weight: 500;
  }
  code {
    font-size: 13px;
    color: #0d47a1;
    background: #fff;
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
  }
`;

const ArrowBtn = styled.button`
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  background: #4a6380;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  white-space: nowrap;
  &:hover:not(:disabled) {
    filter: brightness(1.06);
  }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const MenuSection = styled.section`
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: #fafafa;
`;

const MenuSectionHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
`;

const MenuTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #111d2c;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`;

const MenuTitleHint = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: #94a3b8;
`;

const DirtyBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: #fef3c7;
  color: #92400e;
`;

const SortToolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const ToolBtn = styled.button`
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid ${(p) => (p.$primary ? "#4a6380" : "#cbd5e1")};
  background: ${(p) => (p.$primary ? "#4a6380" : "#fff")};
  color: ${(p) => (p.$primary ? "#fff" : "#334155")};
  cursor: pointer;
  &:hover:not(:disabled) {
    filter: brightness(1.03);
  }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const OrderBtnGroup = styled.div`
  display: flex;
  gap: 4px;
`;

const OrderBtn = styled.button`
  width: 32px;
  height: 28px;
  padding: 0;
  font-size: 14px;
  line-height: 1;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  background: #fff;
  color: #334155;
  cursor: pointer;
  &:hover:not(:disabled) {
    background: #f1f5f9;
  }
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`;

const MenuTableWrap = styled.div`
  overflow-x: auto;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
`;

const MenuTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  th,
  td {
    padding: 8px 10px;
    border-bottom: 1px solid #f3f4f6;
    text-align: left;
  }
  th {
    background: #f9fafb;
    font-weight: 600;
    color: #374151;
  }
  code {
    font-size: 12px;
    color: #0d47a1;
  }
`;

const RemoveBtn = styled.button`
  padding: 4px 10px;
  font-size: 12px;
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 4px;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const FootNote = styled.p`
  margin: 12px 0 0 0;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.5;
  code {
    font-size: 11px;
    background: #f1f5f9;
    padding: 1px 4px;
    border-radius: 3px;
  }
`;


