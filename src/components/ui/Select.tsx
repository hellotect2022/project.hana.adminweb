import styled from "styled-components";
import { colors, radius, fontSize } from "@/styles/tokens";

/**
 * 표준 드롭다운.
 *   <Select value={v} onChange={...}><option .../></Select>
 */
const Select = styled.select`
  padding: 8px 12px;
  font-size: ${fontSize.md};
  color: ${colors.textStrong};
  background: ${colors.surface};
  border: 1px solid ${colors.border};
  border-radius: ${radius.md};
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s;

  &:focus {
    border-color: ${colors.accent};
  }
  &:disabled {
    background: ${colors.surfaceMuted};
    cursor: not-allowed;
  }
`;

export default Select;
