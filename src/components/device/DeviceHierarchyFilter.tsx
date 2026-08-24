import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import styled from "styled-components";
import { SearchableSelect } from "@/components/ui";
import {
  categoryFetchAPI,
  fetchDevicesAPI,
  DEVICE_CATEGORY_QUERY_KEY,
  DEVICE_LIST_QUERY_KEY,
  flattenDeviceCategoryTree,
  sortByDisplayOrder,
} from "@/services/deviceService";

/**
 * 대분류 → 중분류 → 소분류 → 장비 4단 cascade 필터 (controlled)
 *
 * 대/중/소분류는 항목이 적어 native <select> 를 유지한다.
 * 장비는 대형 소분류(예: 팬코일유닛 ~1051대)에서 native select 스크롤이 불편해
 * **검색형 콤보박스(자체 구현)** 로 제공한다. 선택된 소분류(smallId)의 장비를
 * 서버에서 직접 조회(size 2000)해 장비명 부분일치(대소문자 무시)로 실시간 필터한다.
 *
 * @param {{
 *   devices?: import("@/services/deviceService").DeviceDTO[]; // deprecated: 장비 드롭다운에 더 이상 사용하지 않음. 내부 서버 조회로 대체됨.
 *   excludeDeviceIds?: (number|string)[]; // 장비 드롭다운에서 제외할 id (계통도 마스터/이미 추가된 서브 등)
 *   value: import("@/utils/deviceHierarchyFilterUtils").DeviceHierarchyFilterValue;
 *   onChange: (value: import("@/utils/deviceHierarchyFilterUtils").DeviceHierarchyFilterValue) => void;
 *   onDevicePicked?: (device: import("@/services/deviceService").DeviceDTO | null) => void; // 방금 선택된 장비 객체(해제 시 null). 라벨 캡처용(선택 사항).
 *   hideDevice?: boolean; // true 면 장비 검색란을 숨김(대>중>소 카테고리 선택 전용, 예: scope=CATEGORY).
 * }} props
 */
const DeviceHierarchyFilter = ({
  excludeDeviceIds = [],
  value,
  onChange,
  onDevicePicked = undefined,
  hideDevice = false,
}) => {
  const { majorId, midId, smallId, deviceId } = value;

  const { data: categoryTree, isLoading: categoriesLoading } = useQuery({
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
      majorId
        ? flat
            .filter((c) => c.parentId === Number(majorId) && c.active)
            .sort(sortByDisplayOrder)
        : [],
    [flat, majorId]
  );

  const smalls = useMemo(
    () =>
      midId
        ? flat
            .filter((c) => c.parentId === Number(midId) && c.active)
            .sort(sortByDisplayOrder)
        : [],
    [flat, midId]
  );

  // 선택된 소분류의 장비를 서버에서 직접 조회 (개수 제한 없이 정확).
  // size 2000: 최대 카테고리(팬코일유닛 ~1051대)를 넉넉히 커버 → 500-cap 누락 버그 방지.
  const { data: deviceRes, isLoading: devicesLoading } = useQuery({
    queryKey: [...DEVICE_LIST_QUERY_KEY, "hierarchy-filter", smallId],
    queryFn: () => fetchDevicesAPI({ categoryId: Number(smallId), size: 2000 }),
    enabled: !!smallId,
  });

  const devicesInSmall = useMemo(() => {
    if (!smallId) return [];
    const list = deviceRes?.data?.content ?? [];
    const excluded = new Set((excludeDeviceIds ?? []).map((id) => String(id)));
    return list
      .filter((d) => !excluded.has(String(d.deviceId)))
      .sort((a, b) => (a.deviceName ?? "").localeCompare(b.deviceName ?? "", "ko"));
  }, [deviceRes, smallId, excludeDeviceIds]);

  const handleMajorChange = (nextMajorId) => {
    onChange({ majorId: nextMajorId, midId: "", smallId: "", deviceId: "" });
  };

  const handleMidChange = (nextMidId) => {
    onChange({ ...value, midId: nextMidId, smallId: "", deviceId: "" });
  };

  const handleSmallChange = (nextSmallId) => {
    onChange({ ...value, smallId: nextSmallId, deviceId: "" });
  };

  const handleDeviceChange = (nextDeviceId) => {
    onChange({ ...value, deviceId: nextDeviceId });
    if (onDevicePicked) {
      if (!nextDeviceId) {
        onDevicePicked(null);
      } else {
        const list = deviceRes?.data?.content ?? [];
        const picked = list.find(
          (d) => String(d.deviceId) === String(nextDeviceId)
        );
        onDevicePicked(picked ?? null);
      }
    }
  };

  /* ── 장비 검색형 콤보박스 (공용 SearchableSelect 사용) ────── */
  // 장비 목록을 SearchableSelect 옵션으로 매핑 (제외 적용은 devicesInSmall 에서 이미 처리됨)
  const deviceOptions = useMemo(
    () =>
      devicesInSmall.map((d) => ({
        value: d.deviceId,
        label: d.deviceName ?? `Device#${d.deviceId}`,
        sublabel: d.categoryName,
      })),
    [devicesInSmall]
  );

  const devicePlaceholder = !smallId
    ? "소분류를 먼저 선택"
    : devicesLoading
    ? "불러오는 중…"
    : "장비 검색";

  return (
    <CascadeGroup>
      <CascadeField>
        <CascadeLabel>대분류</CascadeLabel>
        <CascadeSelect
          value={majorId}
          onChange={(e) => handleMajorChange(e.target.value)}
          disabled={categoriesLoading}
        >
          <option value="">대분류 선택</option>
          {majors.map((c) => (
            <option key={c.categoryId} value={c.categoryId}>
              {c.categoryCode ? `${c.categoryName} (${c.categoryCode})` : c.categoryName}
            </option>
          ))}
        </CascadeSelect>
      </CascadeField>

      <CascadeField>
        <CascadeLabel>중분류</CascadeLabel>
        <CascadeSelect
          value={midId}
          onChange={(e) => handleMidChange(e.target.value)}
          disabled={!majorId || categoriesLoading}
        >
          <option value="">{majorId ? "중분류 선택" : "대분류를 먼저 선택"}</option>
          {mids.map((c) => (
            <option key={c.categoryId} value={c.categoryId}>
              {c.categoryCode ? `${c.categoryName} (${c.categoryCode})` : c.categoryName}
            </option>
          ))}
        </CascadeSelect>
      </CascadeField>

      <CascadeField>
        <CascadeLabel>소분류</CascadeLabel>
        <CascadeSelect
          value={smallId}
          onChange={(e) => handleSmallChange(e.target.value)}
          disabled={!midId || categoriesLoading}
        >
          <option value="">{midId ? "소분류 선택" : "중분류를 먼저 선택"}</option>
          {smalls.map((c) => (
            <option key={c.categoryId} value={c.categoryId}>
              {c.categoryCode ? `${c.categoryName} (${c.categoryCode})` : c.categoryName}
            </option>
          ))}
        </CascadeSelect>
      </CascadeField>

      {!hideDevice && (
        <CascadeField>
          <CascadeLabel>장비</CascadeLabel>
          <SearchableSelect
            options={deviceOptions}
            value={deviceId}
            onChange={handleDeviceChange}
            placeholder={devicePlaceholder}
            disabled={!smallId}
            loading={devicesLoading}
            emptyText="해당 소분류에 장비 없음"
            noMatchText="검색 결과 없음"
          />
        </CascadeField>
      )}
    </CascadeGroup>
  );
};

export default DeviceHierarchyFilter;

const CONTROL_HEIGHT = "36px";

const CascadeGroup = styled.div`
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
`;

const CascadeField = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 4px;
  min-width: 132px;
`;

const CascadeLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  color: #64748b;
  white-space: nowrap;
`;

const CascadeSelect = styled.select`
  box-sizing: border-box;
  width: 100%;
  min-width: 132px;
  height: ${CONTROL_HEIGHT};
  padding: 0 10px;
  border: 1px solid #d0d3d8;
  border-radius: 4px;
  font-size: 13px;
  line-height: normal;
  background: #fff;

  &:disabled {
    background: #f4f5f7;
    color: #9ca3af;
    cursor: not-allowed;
  }
`;
