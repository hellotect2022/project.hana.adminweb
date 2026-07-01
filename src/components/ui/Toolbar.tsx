import styled from "styled-components";
import { colors, radius, fontSize, space } from "@/styles/tokens";

/**
 * 목록 상단 필터/액션 바.
 *
 *   <Toolbar>
 *     <FilterGroup>
 *       <FilterLabel>에셋 타입</FilterLabel>
 *       <Select .../>
 *       <Input .../>
 *       <Button variant="secondary">검색</Button>
 *     </FilterGroup>
 *     <Button variant="primary">+ 등록</Button>
 *   </Toolbar>
 */
export const Toolbar = styled.div`
  display: flex;
  flex-wrap: nowrap;
  justify-content: space-between;
  align-items: center;
  gap: ${space.md};
  padding: ${space.lg} ${space.xl};
  margin-bottom: ${space.lg};
  background: ${colors.surface};
  border: 1px solid ${colors.borderLight};
  border-radius: ${radius.md};
  overflow-x: auto;
`;

export const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: ${space.sm};
  flex-wrap: nowrap;
  white-space: nowrap;
`;

export const FilterLabel = styled.span`
  font-size: ${fontSize.md};
  font-weight: 600;
  color: ${colors.text};
`;
