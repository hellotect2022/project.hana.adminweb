import { showAlert, showConfirm } from "@/utils/dialogBridge";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import {
  categoryFetchAPI,
  DEVICE_CATEGORY_QUERY_KEY,
  flattenDeviceCategoryTree,
} from "@/services/deviceService";
import {
  createDeviceSystem,
  deleteDeviceSystem,
  DEVICE_SYSTEM_ALL_QUERY_KEY,
  fetchAllDeviceSystems,
  updateDeviceSystem,
  updateDeviceSystemSortOrders,
} from "@/services/deviceSystemService";
import DeviceSystemForm from "@/components/modal/menu/DeviceSystemForm";
import SubSystemPanel from "@/components/menu/SubSystemPanel";
import { Button } from "@/components/ui";
import { useModal } from "@/contexts/ModalContext";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

const SMALL_CATEGORY_DEPTH = 2;

/**
 * BMS 시스템 표시 설정 — tbl_device_system + 소분류 카테고리 매핑
 */

const MenuDisplaySettings = () => {
  const queryClient = useQueryClient();
  const { openModal, closeModal } = useModal();

  const {
    data: categoryTree = [],
    isLoading: categoriesLoading,
    isError: categoriesError,
    error: categoriesErr,
  } = useQuery({
    queryKey: DEVICE_CATEGORY_QUERY_KEY,
    queryFn: async () => {
      const res = await categoryFetchAPI();
      if (!res?.success) {
        throw new Error(res?.message || "카테고리 조회에 실패했습니다.");
      }
      return res.data ?? [];
    },
  });

  const smallCategories = useMemo(() => {
    return flattenDeviceCategoryTree(categoryTree)
      .filter((c) => c.depth === SMALL_CATEGORY_DEPTH && c.active)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [categoryTree]);

  const { data: systems, isLoading: systemsLoading } = useQuery({
    queryKey: DEVICE_SYSTEM_ALL_QUERY_KEY,
    queryFn: fetchAllDeviceSystems,
    // 정렬을 쿼리에서 수행 → 결과 참조가 렌더 간 안정(react-query 메모이즈).
    // 기본값 []를 제거해 로딩 중 매 렌더 새 배열 생성으로 인한 무한루프를 방지.
    select: (data) => [...data].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
  });

  const [localSystemRows, setLocalSystemRows] = useState([]);
  const [expandedSystemId, setExpandedSystemId] = useState<number | null>(null);

  useEffect(() => {
    if (!systems) return; // 로딩(undefined) 구간 스킵
    setLocalSystemRows(systems.map((m) => ({ ...m })));
  }, [systems]);

  // 펼쳐진 시스템의 최신(안정) 참조 — SubSystemPanel effect 안전성 확보.
  const expandedSystem = useMemo(
    () => (systems ?? []).find((s) => s.systemId === expandedSystemId) ?? null,
    [systems, expandedSystemId]
  );

  const isOrderDirty = useMemo(() => {
    if (!systems || localSystemRows.length !== systems.length) return false;
    return localSystemRows.some(
      (r, i) => r.systemId !== systems[i]?.systemId
    );
  }, [localSystemRows, systems]);

  const moveSystemRow = (index, direction) => {
    setLocalSystemRows((prev) => {
      const j = direction === "up" ? index - 1 : index + 1;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[j]] = [next[j], next[index]];
      return next.map((r, i) => ({ ...r, sortOrder: i + 1 }));
    });
  };

  const resetLocalOrder = () => {
    setLocalSystemRows((systems ?? []).map((m) => ({ ...m })));
  };

  const nextSortOrder = useMemo(() => {
    if (!systems?.length) return 1;
    return Math.max(...systems.map((m) => m.sortOrder ?? 0)) + 1;
  }, [systems]);

  const createSystemMutation = useMutation({
    mutationFn: ({ systemName, systemCode, sortOrder, active, categoryIds }: any) =>
      createDeviceSystem({ systemName, systemCode, sortOrder, active, categoryIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEVICE_SYSTEM_ALL_QUERY_KEY });
    },
    onError: (err) => {
      showAlert(getApiErrorMessage(err, "BMS 시스템 생성에 실패했습니다."));
    },
  });

  const deleteSystemMutation = useMutation({
    mutationFn: (systemId) => deleteDeviceSystem(systemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEVICE_SYSTEM_ALL_QUERY_KEY });
    },
    onError: (err) => {
      showAlert(getApiErrorMessage(err, "BMS 시스템 삭제에 실패했습니다."));
    },
  });

  const updateSystemMutation = useMutation({
    mutationFn: ({ systemId, systemName, systemCode, active, categoryIds }: any) =>
      updateDeviceSystem(systemId, { systemName, systemCode, active, categoryIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEVICE_SYSTEM_ALL_QUERY_KEY });
    },
    onError: (err) => {
      showAlert(getApiErrorMessage(err, "BMS 시스템 수정에 실패했습니다."));
    },
  });

  const sortOrdersMutation = useMutation({
    mutationFn: (payload: any) => updateDeviceSystemSortOrders(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEVICE_SYSTEM_ALL_QUERY_KEY });
    },
    onError: (err) => {
      showAlert(getApiErrorMessage(err, "순서 저장에 실패했습니다."));
    },
  });

  const handleSaveSortOrders = () => {
    if (!isOrderDirty) return;
    const payload = localSystemRows.map((r, i) => ({
      systemId: r.systemId,
      sortOrder: i + 1,
    }));
    sortOrdersMutation.mutate(payload);
  };

  const openCreateModal = () => {
    openModal({
      title: "BMS 시스템 생성",
      hideFooter: true,
      wide: true,
      content: (
        <DeviceSystemForm
          mode="create"
          initialValues={{
            systemName: "",
            systemCode: "",
            sortOrder: String(nextSortOrder),
            active: true,
            categoryIds: [],
          }}
          smallCategories={smallCategories}
          categoriesLoading={categoriesLoading}
          categoriesError={categoriesError}
          categoriesErr={categoriesErr}
          hasSubSystems={false}
          onClose={closeModal}
          onSubmit={(data) => createSystemMutation.mutateAsync(data)}
        />
      ),
    });
  };

  const handleDeleteSystem = async (systemId) => {
    const ok = await showConfirm("이 BMS 시스템을 서버에서 삭제할까요?");
    if (!ok) return;
    deleteSystemMutation.mutate(systemId);
  };

  const openEditModal = (row) => {
    openModal({
      title: "시스템 수정",
      hideFooter: true,
      wide: true,
      content: (
        <DeviceSystemForm
          mode="edit"
          initialValues={{
            systemName: row.systemName ?? "",
            systemCode: row.systemCode ?? "",
            active: row.active ?? true,
            categoryIds: row.categoryIds ?? [],
          }}
          smallCategories={smallCategories}
          categoriesLoading={categoriesLoading}
          categoriesError={categoriesError}
          categoriesErr={categoriesErr}
          hasSubSystems={(row.subSystems?.length ?? 0) > 0}
          onClose={closeModal}
          onSubmit={(data) =>
            updateSystemMutation.mutateAsync({
              systemId: row.systemId,
              ...data,
            })
          }
        />
      ),
    });
  };

  const anySystemMutationPending =
    createSystemMutation.isPending ||
    deleteSystemMutation.isPending ||
    updateSystemMutation.isPending;

  return (
    <Wrap>
      <ToolbarBar>
        <ToolbarHint>
          시스템을 추가하고「펼치기」로 서브시스템을 등록해 소분류 카테고리를 매핑하거나, 시스템 「수정」에서 소분류를 직접 매핑(2단)할 수 있습니다. 두 방식은 배타적으로 사용하세요. ↑↓ 로 순서를 바꾸고「순서 저장」합니다.
        </ToolbarHint>
        <Button
          variant="primary"
          onClick={openCreateModal}
          disabled={systemsLoading}
        >
          + 시스템 등록
        </Button>
      </ToolbarBar>

      <MenuSectionHeader>
        <MenuTitle>
          {systemsLoading ? (
            <MenuTitleHint> (불러오는 중…)</MenuTitleHint>
          ) : null}
          {isOrderDirty ? <DirtyBadge>순서 변경됨</DirtyBadge> : null}
        </MenuTitle>
        <SortToolbar>
          <Button
            variant="outline"
            onClick={resetLocalOrder}
            disabled={!isOrderDirty || sortOrdersMutation.isPending}
          >
            순서 초기화
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveSortOrders}
            disabled={
              !isOrderDirty ||
              sortOrdersMutation.isPending ||
              localSystemRows.length === 0
            }
          >
            {sortOrdersMutation.isPending ? "저장 중…" : "순서 저장"}
          </Button>
        </SortToolbar>
      </MenuSectionHeader>
      <MenuTableWrap>
        <MenuTable>
          <thead>
            <tr>
              <th style={{ width: 88 }}>이동</th>
              <th>systemId</th>
              <th>systemName</th>
              <th>systemCode</th>
              <th>서브시스템</th>
              <th>직접 매핑 소분류</th>
              <th>sortOrder</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {localSystemRows.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", color: "#9ca3af" }}>
                  {systemsLoading
                    ? "시스템 목록을 불러오는 중입니다."
                    : "등록된 시스템이 없습니다. 상단「시스템 생성」으로 추가하세요."}
                </td>
              </tr>
            ) : (
              localSystemRows.map((r, index) => {
                const isExpanded = expandedSystemId === r.systemId;
                const subCount = r.subSystems?.length ?? 0;
                const directCategories = r.categories ?? [];
                const directNames = directCategories
                  .map((c) => c.categoryName)
                  .filter(Boolean);
                return (
                <Fragment key={r.systemId}>
                <tr>
                  <td>
                    <OrderBtnGroup>
                      <OrderBtn
                        type="button"
                        aria-label="위로"
                        onClick={() => moveSystemRow(index, "up")}
                        disabled={
                          index === 0 ||
                          sortOrdersMutation.isPending ||
                          anySystemMutationPending
                        }
                      >
                        ↑
                      </OrderBtn>
                      <OrderBtn
                        type="button"
                        aria-label="아래로"
                        onClick={() => moveSystemRow(index, "down")}
                        disabled={
                          index >= localSystemRows.length - 1 ||
                          sortOrdersMutation.isPending ||
                          anySystemMutationPending
                        }
                      >
                        ↓
                      </OrderBtn>
                    </OrderBtnGroup>
                  </td>
                  <td>{r.systemId}</td>
                  <td>{r.systemName}</td>
                  <td>
                    <code>{r.systemCode}</code>
                  </td>
                  <td>
                    <ExpandBtn
                      type="button"
                      $expanded={isExpanded}
                      onClick={() =>
                        setExpandedSystemId((prev) =>
                          prev === r.systemId ? null : r.systemId
                        )
                      }
                    >
                      <Caret aria-hidden>{isExpanded ? "▼" : "▶"}</Caret>
                      서브시스템 {subCount}
                    </ExpandBtn>
                  </td>
                  <td>
                    {directNames.length > 0 ? (
                      <DirectMapCell title={directNames.join(", ")}>
                        <DirectCountBadge>{directNames.length}</DirectCountBadge>
                        <DirectNames>{directNames.join(", ")}</DirectNames>
                      </DirectMapCell>
                    ) : (
                      <MutedDash>—</MutedDash>
                    )}
                  </td>
                  <td>{r.sortOrder}</td>
                  <td>
                    <RowActions>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openEditModal(r)}
                        disabled={anySystemMutationPending}
                      >
                        수정
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteSystem(r.systemId)}
                        disabled={anySystemMutationPending}
                      >
                        삭제
                      </Button>
                    </RowActions>
                  </td>
                </tr>
                {isExpanded && expandedSystem?.systemId === r.systemId ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 0, background: "#f1f5f9" }}>
                      <SubPanelWrap>
                        <SubSystemPanel
                          system={expandedSystem}
                          smallCategories={smallCategories}
                          categoriesLoading={categoriesLoading}
                          categoriesError={categoriesError}
                          categoriesErr={categoriesErr}
                        />
                      </SubPanelWrap>
                    </td>
                  </tr>
                ) : null}
                </Fragment>
                );
              })
            )}
          </tbody>
        </MenuTable>
      </MenuTableWrap>
      <FootNote>
        시스템: <code>GET /api/device-system/all</code> ·{" "}
        <code>POST/PUT/DELETE /api/device-system</code> ·{" "}
        <code>PUT /api/device-system/sort-orders</code>
        <br />
        서브시스템:{" "}
        <code>GET /api/device-system/sub-systems?systemId=</code> ·{" "}
        <code>POST/PUT/DELETE /api/device-system/sub-systems</code> ·{" "}
        <code>PUT /api/device-system/sub-systems/sort-orders</code>
      </FootNote>
    </Wrap>
  );
};

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0 24px;
`;

const ToolbarBar = styled.div`
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

const ToolbarHint = styled.p`
  margin: 0;
  font-size: 13px;
  color: #475569;
  line-height: 1.5;
  //max-width: 520px;
`;

const MenuSectionHeader = styled.div`
  //border: 2px solid black;
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

const RowActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
`;

const ExpandBtn = styled.button<{ $expanded?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid ${(p) => (p.$expanded ? "#4a6380" : "#cbd5e1")};
  border-radius: 6px;
  background: ${(p) => (p.$expanded ? "#eef2f7" : "#fff")};
  color: ${(p) => (p.$expanded ? "#3d5370" : "#334155")};
  cursor: pointer;
  &:hover {
    background: ${(p) => (p.$expanded ? "#e8edf3" : "#f1f5f9")};
  }
`;

const Caret = styled.span`
  font-size: 10px;
  line-height: 1;
`;

const DirectMapCell = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 260px;
`;

const DirectCountBadge = styled.span`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 18px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  background: #4a6380;
  color: #fff;
`;

const DirectNames = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: #475569;
`;

const MutedDash = styled.span`
  color: #cbd5e1;
`;

const SubPanelWrap = styled.div`
  padding: 10px 14px 14px;
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

export default MenuDisplaySettings;
