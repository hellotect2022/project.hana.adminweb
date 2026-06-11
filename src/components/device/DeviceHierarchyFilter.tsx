import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import styled from "styled-components";
import {
  categoryFetchAPI,
  DEVICE_CATEGORY_QUERY_KEY,
  flattenDeviceCategoryTree,
  sortByDisplayOrder,
} from "@/services/deviceService";

/**
 * 대분류 → 중분류 → 소분류 → 장비 4단 cascade 필터 (controlled)
 *
 * @param {{
 *   devices: import("@/services/deviceService").DeviceDTO[];
 *   value: import("@/utils/deviceHierarchyFilterUtils").DeviceHierarchyFilterValue;
 *   onChange: (value: import("@/utils/deviceHierarchyFilterUtils").DeviceHierarchyFilterValue) => void;
 * }} props
 */
const DeviceHierarchyFilter = ({ devices, value, onChange }) => {
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

  const devicesInSmall = useMemo(() => {
    if (!smallId) return [];
    return devices
      .filter((d) => d.categoryId === Number(smallId))
      .sort((a, b) => (a.deviceName ?? "").localeCompare(b.deviceName ?? "", "ko"));
  }, [devices, smallId]);

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
  };

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
              {c.categoryName}
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
              {c.categoryName}
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
              {c.categoryName}
            </option>
          ))}
        </CascadeSelect>
      </CascadeField>

      <CascadeField>
        <CascadeLabel>장비</CascadeLabel>
        <CascadeSelect
          value={deviceId}
          onChange={(e) => handleDeviceChange(e.target.value)}
          disabled={!smallId}
        >
          <option value="">{smallId ? "장비 선택" : "소분류를 먼저 선택"}</option>
          {devicesInSmall.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.deviceName}
            </option>
          ))}
        </CascadeSelect>
      </CascadeField>
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
