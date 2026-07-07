import styled from "styled-components";
import { colors, radius, fontSize } from "@/styles/tokens";

/**
 * 표준 텍스트 입력.
 *   <Input placeholder="검색어" value={v} onChange={...} />
 * styled-components 이므로 모든 input 속성/이벤트가 그대로 전달된다.
 */
const Input = styled.input`
  box-sizing: border-box; /* width:100% 시 padding·border 포함 (셀 초과 방지) */
  padding: 8px 12px;
  font-size: ${fontSize.md};
  color: ${colors.textStrong};
  background: ${colors.surface};
  border: 1px solid ${colors.border};
  border-radius: ${radius.md};
  outline: none;
  transition: border-color 0.15s;

  &::placeholder {
    color: ${colors.textSubtle};
  }
  &:focus {
    border-color: ${colors.accent};
  }
  &:disabled {
    background: ${colors.surfaceMuted};
    cursor: not-allowed;
  }
`;

export default Input;
