import { useMemo, useState } from "react";
import styled from "styled-components";
import { useQuery } from "@tanstack/react-query";
import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import AlarmHistoryPanel from "@/components/alarm/AlarmHistoryPanel";
import {
  DEVICE_CATEGORY_QUERY_KEY,
  categoryFetchAPI,
  flattenDeviceCategoryTree,
} from "@/services/deviceService";

/**
 * 알람 이력 보기.
 *
 * 기획서의 알람 이력 화면 6종(전력감시·엘리베이터·소방방재·태양광발전·출입통제·화장실 물리버튼)이
 * 모두 같은 형식이라 {@link AlarmHistoryPanel} 하나로 처리하고, 이 페이지는 어떤 묶음을 볼지
 * 고르는 역할만 한다.
 *
 * 화면 묶음 단위를 카테고리로 할지 시스템으로 할지는 아직 미확정이라
 * 우선 **카테고리 선택**으로 만들어 둔다. 시스템으로 정해지면 이 선택기만 교체하면 되고
 * 패널과 API 는 그대로 쓴다.
 */
const AlarmHistoryPage = () => {
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const { data: categoryTree = [] } = useQuery({
    queryKey: DEVICE_CATEGORY_QUERY_KEY,
    queryFn: async () => {
      const res = await categoryFetchAPI();
      if (!res?.success) throw new Error(res?.message || "카테고리 조회 실패");
      return res.data ?? [];
    },
    staleTime: 1000 * 60 * 10,
  });

  const flat = useMemo(() => flattenDeviceCategoryTree(categoryTree), [categoryTree]);

  const selected = useMemo(
    () => flat.find((c) => c.categoryId === categoryId) ?? null,
    [flat, categoryId]
  );

  // 대·중분류를 고르면 서버가 하위 소분류 전체로 확장하므로 모든 깊이를 선택지로 둔다.
  const options = useMemo(
    () =>
      flat.map((c) => ({
        categoryId: c.categoryId,
        label: c.fullPath || c.categoryName,
      })),
    [flat]
  );

  return (
    <AdminPageTemplate
      title="알람 이력"
      description="발생한 알람을 장비 종류·층·알람명으로 조회합니다. 완료 여부는 담당자가 확인(ack) 처리했는지를 나타냅니다."
    >
      <PickerRow>
        <PickerLabel>장비 종류</PickerLabel>
        <PickerSelect
          value={categoryId ?? ""}
          onChange={(e) =>
            setCategoryId(e.target.value === "" ? null : Number(e.target.value))
          }
        >
          <option value="">전체</option>
          {options.map((o) => (
            <option key={o.categoryId} value={o.categoryId}>
              {o.label}
            </option>
          ))}
        </PickerSelect>
      </PickerRow>

      <AlarmHistoryPanel
        // 카테고리를 바꾸면 패널 내부 필터·페이지를 초기화한다.
        key={categoryId ?? "all"}
        title={selected?.categoryName ?? "전체"}
        categoryId={categoryId}
      />
    </AdminPageTemplate>
  );
};

export default AlarmHistoryPage;

/* ─────────────────────────────────────────── */

const PickerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
`;

const PickerLabel = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #374151;
`;

const PickerSelect = styled.select`
  height: 34px;
  min-width: 280px;
  padding: 0 8px;
  border: 1px solid #d0d3d8;
  border-radius: 4px;
  font-size: 13px;
  background: #fff;
  cursor: pointer;
`;
