import { useMemo } from "react";
import styled from "styled-components";
import { sortByDisplayOrder } from "@/services/deviceService";

const SMALL_CATEGORY_DEPTH = 2;

/**
 * 소분류(depth=2)만 선택 — fullPath(대 > 중 > 소) 표시
 * @param {{
 *   categories: import("@/services/deviceService").DeviceCategoryFlat[];
 *   value: string;
 *   onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
 *   allowEmpty?: boolean;
 *   emptyLabel?: string;
 *   disabled?: boolean;
 * }} props
 */
const DeviceSmallCategorySelect = ({
  categories,
  value,
  onChange,
  allowEmpty = true,
  emptyLabel = "— 미지정 —",
  disabled = false,
}) => {
  const smallCategories = useMemo(
    () =>
      categories
        .filter((c) => c.depth === SMALL_CATEGORY_DEPTH && c.active !== false)
        .sort(sortByDisplayOrder),
    [categories]
  );

  return (
    <Select value={value} onChange={onChange} disabled={disabled}>
      {allowEmpty && <option value="">{emptyLabel}</option>}
      {smallCategories.map((c) => (
        <option key={c.categoryId} value={String(c.categoryId)}>
          {c.fullPath || c.categoryName}
        </option>
      ))}
    </Select>
  );
};

export default DeviceSmallCategorySelect;

const Select = styled.select`
  width: 100%;
  padding: 7px 10px;
  font-size: 13px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  outline: none;

  &:focus {
    border-color: #4a90d9;
    box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.15);
  }
`;
