import { useEffect, useMemo, useState } from "react";
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

  const { data: systems = [], isLoading: systemsLoading } = useQuery({
    queryKey: DEVICE_SYSTEM_ALL_QUERY_KEY,
    queryFn: fetchAllDeviceSystems,
  });

  const sortedSystems = useMemo(() => {
    return [...systems].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    );
  }, [systems]);

  const [localSystemRows, setLocalSystemRows] = useState([]);

  useEffect(() => {
    const ordered = [...systems].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    );
    setLocalSystemRows(ordered.map((m) => ({ ...m })));
  }, [systems]);

  const isOrderDirty = useMemo(() => {
    if (localSystemRows.length !== sortedSystems.length) return false;
    return localSystemRows.some(
      (r, i) => r.systemId !== sortedSystems[i]?.systemId
    );
  }, [localSystemRows, sortedSystems]);

  const formatCategoryLabels = (row) => {
    if (row.categories?.length) {
      return row.categories.map((c) => c.categoryName).join(", ");
    }
    if (!row.categoryIds?.length) return "—";
    return row.categoryIds
      .map((id) => smallCategories.find((c) => c.categoryId === id)?.categoryName ?? id)
      .join(", ");
  };

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
    setLocalSystemRows(sortedSystems.map((m) => ({ ...m })));
  };

  const nextSortOrder = useMemo(() => {
    if (!systems.length) return 1;
    return Math.max(...systems.map((m) => m.sortOrder ?? 0)) + 1;
  }, [systems]);

  const createSystemMutation = useMutation({
    mutationFn: ({ systemName, systemCode, sortOrder, categoryIds }: any) =>
      createDeviceSystem({ systemName, systemCode, sortOrder, categoryIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEVICE_SYSTEM_ALL_QUERY_KEY });
    },
    onError: (err) => {
      window.alert(getApiErrorMessage(err, "BMS 시스템 생성에 실패했습니다."));
    },
  });

  const deleteSystemMutation = useMutation({
    mutationFn: (systemId) => deleteDeviceSystem(systemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEVICE_SYSTEM_ALL_QUERY_KEY });
    },
    onError: (err) => {
      window.alert(getApiErrorMessage(err, "BMS 시스템 삭제에 실패했습니다."));
    },
  });

  const updateSystemMutation = useMutation({
    mutationFn: ({ systemId, systemName, systemCode, categoryIds }: any) =>
      updateDeviceSystem(systemId, { systemName, systemCode, categoryIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEVICE_SYSTEM_ALL_QUERY_KEY });
    },
    onError: (err) => {
      window.alert(getApiErrorMessage(err, "BMS 시스템 수정에 실패했습니다."));
    },
  });

  const sortOrdersMutation = useMutation({
    mutationFn: (payload: any) => updateDeviceSystemSortOrders(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEVICE_SYSTEM_ALL_QUERY_KEY });
    },
    onError: (err) => {
      window.alert(getApiErrorMessage(err, "순서 저장에 실패했습니다."));
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
            categoryIds: [],
          }}
          smallCategories={smallCategories}
          categoriesLoading={categoriesLoading}
          categoriesError={categoriesError}
          categoriesErr={categoriesErr}
          onClose={closeModal}
          onSubmit={(data) => createSystemMutation.mutateAsync(data)}
        />
      ),
    });
  };

  const handleDeleteSystem = (systemId) => {
    if (!window.confirm("이 BMS 시스템을 서버에서 삭제할까요?")) return;
    deleteSystemMutation.mutate(systemId);
  };

  const openEditModal = (row) => {
    openModal({
      title: "BMS 시스템 수정",
      hideFooter: true,
      wide: true,
      content: (
        <DeviceSystemForm
          mode="edit"
          initialValues={{
            systemName: row.systemName ?? "",
            systemCode: row.systemCode ?? "",
            categoryIds: row.categoryIds ?? [],
          }}
          smallCategories={smallCategories}
          categoriesLoading={categoriesLoading}
          categoriesError={categoriesError}
          categoriesErr={categoriesErr}
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
          시스템을 추가하고 소분류 카테고리를 매핑한 뒤, ↑↓ 로 순서를 바꾸고「순서 저장」하세요.
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
              <th>소분류 카테고리</th>
              <th>sortOrder</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {localSystemRows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "#9ca3af" }}>
                  {systemsLoading
                    ? "시스템 목록을 불러오는 중입니다."
                    : "등록된 시스템이 없습니다. 상단「시스템 생성」으로 추가하세요."}
                </td>
              </tr>
            ) : (
              localSystemRows.map((r, index) => (
                <tr key={r.systemId}>
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
                  <td>{formatCategoryLabels(r)}</td>
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
              ))
            )}
          </tbody>
        </MenuTable>
      </MenuTableWrap>
      <FootNote>
        생성: <code>POST /api/device-system</code> · 수정:{" "}
        <code>PUT /api/device-system/{"{systemId}"}</code> · 삭제:{" "}
        <code>DELETE /api/device-system/{"{systemId}"}</code> · 목록:{" "}
        <code>GET /api/device-system/all</code> · 순서:{" "}
        <code>PUT /api/device-system/sort-orders</code>
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
