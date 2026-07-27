import { showAlert, showConfirm } from "@/utils/dialogBridge";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import {
  createSubSystem,
  deleteSubSystem,
  DEVICE_SYSTEM_ALL_QUERY_KEY,
  updateSubSystem,
  updateSubSystemSortOrders,
} from "@/services/deviceSystemService";
import SubSystemForm from "@/components/modal/menu/SubSystemForm";
import { Button } from "@/components/ui";
import { useModal } from "@/contexts/ModalContext";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

/**
 * 시스템 하위 서브시스템 관리 패널(추가/수정/삭제/순서).
 * `system` 은 react-query 로 메모이즈된 안정 참조라 effect 의존성으로 안전하다.
 */
const SubSystemPanel = ({
  system,
  smallCategories,
  categoriesLoading,
  categoriesError,
  categoriesErr,
}) => {
  const queryClient = useQueryClient();
  const { openModal, closeModal } = useModal();

  // 정렬된 원본(서버 상태) — system 참조가 바뀔 때만 재계산.
  const sortedSubs = useMemo(() => {
    return [...(system.subSystems ?? [])].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    );
  }, [system]);

  const [localSubRows, setLocalSubRows] = useState([]);

  useEffect(() => {
    setLocalSubRows(sortedSubs.map((s) => ({ ...s })));
  }, [sortedSubs]);

  const isOrderDirty = useMemo(() => {
    if (localSubRows.length !== sortedSubs.length) return false;
    return localSubRows.some((r, i) => r.subSystemId !== sortedSubs[i]?.subSystemId);
  }, [localSubRows, sortedSubs]);

  const nextSortOrder = useMemo(() => {
    if (!sortedSubs.length) return 1;
    return Math.max(...sortedSubs.map((s) => s.sortOrder ?? 0)) + 1;
  }, [sortedSubs]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: DEVICE_SYSTEM_ALL_QUERY_KEY });

  const createMutation = useMutation({
    mutationFn: (body: any) => createSubSystem({ systemId: system.systemId, ...body }),
    onSuccess: invalidate,
    onError: (err) => showAlert(getApiErrorMessage(err, "서브시스템 생성에 실패했습니다.")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ subSystemId, ...body }: any) => updateSubSystem(subSystemId, body),
    onSuccess: invalidate,
    onError: (err) => showAlert(getApiErrorMessage(err, "서브시스템 수정에 실패했습니다.")),
  });

  const deleteMutation = useMutation({
    mutationFn: (subSystemId: number) => deleteSubSystem(subSystemId),
    onSuccess: invalidate,
    onError: (err) => showAlert(getApiErrorMessage(err, "서브시스템 삭제에 실패했습니다.")),
  });

  const sortOrdersMutation = useMutation({
    mutationFn: (payload: any) => updateSubSystemSortOrders(payload),
    onSuccess: invalidate,
    onError: (err) => showAlert(getApiErrorMessage(err, "서브시스템 순서 저장에 실패했습니다.")),
  });

  const anyPending =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const moveRow = (index, direction) => {
    setLocalSubRows((prev) => {
      const j = direction === "up" ? index - 1 : index + 1;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[j]] = [next[j], next[index]];
      return next.map((r, i) => ({ ...r, sortOrder: i + 1 }));
    });
  };

  const resetOrder = () => setLocalSubRows(sortedSubs.map((s) => ({ ...s })));

  const handleSaveOrder = () => {
    if (!isOrderDirty) return;
    const payload = localSubRows.map((r, i) => ({
      subSystemId: r.subSystemId,
      sortOrder: i + 1,
    }));
    sortOrdersMutation.mutate(payload);
  };

  const formatCategories = (row) => {
    if (row.categories?.length) {
      return row.categories.map((c) => c.categoryName).join(", ");
    }
    if (!row.categoryIds?.length) return "—";
    return row.categoryIds
      .map((id) => smallCategories.find((c) => c.categoryId === id)?.categoryName ?? id)
      .join(", ");
  };

  const openCreateModal = () => {
    openModal({
      title: "서브시스템 생성",
      hideFooter: true,
      wide: true,
      content: (
        <SubSystemForm
          mode="create"
          initialValues={{
            subSystemName: "",
            sortOrder: String(nextSortOrder),
            active: true,
            categoryIds: [],
          }}
          smallCategories={smallCategories}
          categoriesLoading={categoriesLoading}
          categoriesError={categoriesError}
          categoriesErr={categoriesErr}
          onClose={closeModal}
          onSubmit={(data) => createMutation.mutateAsync(data)}
        />
      ),
    });
  };

  const openEditModal = (row) => {
    openModal({
      title: "서브시스템 수정",
      hideFooter: true,
      wide: true,
      content: (
        <SubSystemForm
          mode="edit"
          initialValues={{
            subSystemName: row.subSystemName ?? "",
            active: row.active ?? true,
            categoryIds: row.categoryIds ?? [],
          }}
          smallCategories={smallCategories}
          categoriesLoading={categoriesLoading}
          categoriesError={categoriesError}
          categoriesErr={categoriesErr}
          onClose={closeModal}
          onSubmit={(data) =>
            updateMutation.mutateAsync({ subSystemId: row.subSystemId, ...data })
          }
        />
      ),
    });
  };

  const handleDelete = async (subSystemId) => {
    const ok = await showConfirm("이 서브시스템을 삭제할까요?");
    if (!ok) return;
    deleteMutation.mutate(subSystemId);
  };

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>
          서브시스템
          {isOrderDirty ? <DirtyBadge>순서 변경됨</DirtyBadge> : null}
        </PanelTitle>
        <PanelActions>
          <Button
            variant="outline"
            size="sm"
            onClick={resetOrder}
            disabled={!isOrderDirty || sortOrdersMutation.isPending}
          >
            순서 초기화
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveOrder}
            disabled={!isOrderDirty || sortOrdersMutation.isPending || localSubRows.length === 0}
          >
            {sortOrdersMutation.isPending ? "저장 중…" : "순서 저장"}
          </Button>
          <Button variant="secondary" size="sm" onClick={openCreateModal}>
            + 서브시스템 추가
          </Button>
        </PanelActions>
      </PanelHeader>

      <SubTable>
        <thead>
          <tr>
            <th style={{ width: 80 }}>이동</th>
            <th>subSystemId</th>
            <th>subSystemName</th>
            <th>소분류 카테고리</th>
            <th style={{ width: 70 }}>순서</th>
            <th style={{ width: 70 }}>활성</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {localSubRows.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ textAlign: "center", color: "#9ca3af" }}>
                등록된 서브시스템이 없습니다.「+ 서브시스템 추가」로 등록하세요.
              </td>
            </tr>
          ) : (
            localSubRows.map((r, index) => (
              <tr key={r.subSystemId}>
                <td>
                  <OrderBtnGroup>
                    <OrderBtn
                      type="button"
                      aria-label="위로"
                      onClick={() => moveRow(index, "up")}
                      disabled={index === 0 || sortOrdersMutation.isPending || anyPending}
                    >
                      ↑
                    </OrderBtn>
                    <OrderBtn
                      type="button"
                      aria-label="아래로"
                      onClick={() => moveRow(index, "down")}
                      disabled={
                        index >= localSubRows.length - 1 || sortOrdersMutation.isPending || anyPending
                      }
                    >
                      ↓
                    </OrderBtn>
                  </OrderBtnGroup>
                </td>
                <td>{r.subSystemId}</td>
                <td>{r.subSystemName}</td>
                <td>{formatCategories(r)}</td>
                <td>{r.sortOrder}</td>
                <td>{r.active === false ? "비활성" : "활성"}</td>
                <td>
                  <RowActions>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openEditModal(r)}
                      disabled={anyPending}
                    >
                      수정
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(r.subSystemId)}
                      disabled={anyPending}
                    >
                      삭제
                    </Button>
                  </RowActions>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </SubTable>
    </Panel>
  );
};

export default SubSystemPanel;

const Panel = styled.div`
  padding: 12px 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
`;

const PanelHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
`;

const PanelTitle = styled.h4`
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #334155;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const DirtyBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: #fef3c7;
  color: #92400e;
`;

const PanelActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const SubTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  th,
  td {
    padding: 7px 9px;
    border-bottom: 1px solid #f3f4f6;
    text-align: left;
  }
  th {
    background: #f9fafb;
    font-weight: 600;
    color: #374151;
  }
`;

const OrderBtnGroup = styled.div`
  display: flex;
  gap: 4px;
`;

const OrderBtn = styled.button`
  width: 30px;
  height: 26px;
  padding: 0;
  font-size: 13px;
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

const RowActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
`;
