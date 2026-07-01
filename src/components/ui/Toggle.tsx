import styled from "styled-components";
import { colors, radius, fontSize } from "@/styles/tokens";

/**
 * on/off 또는 선택 상태를 가진 pill 토글 버튼.
 * 필터 칩(전체/선택), AND·OR, ON·OFF 등 2상태 토글에 사용.
 *   <Toggle on={active} onClick={() => setActive(!active)}>활성</Toggle>
 *   <Toggle on={logic === "AND"} onClick={...}>AND</Toggle>
 */
export interface ToggleProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  on?: boolean;
}

const Toggle = ({ on = false, type = "button", ...rest }: ToggleProps) => (
  <StyledToggle $on={on} type={type} {...rest} />
);

export default Toggle;

const StyledToggle = styled.button<{ $on?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 5px 14px;
  font-size: ${fontSize.sm};
  font-weight: 600;
  border-radius: ${radius.pill};
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;

  color: ${(p) => (p.$on ? colors.white : colors.textMuted)};
  background: ${(p) => (p.$on ? colors.primary : colors.surface)};
  border: 1px solid ${(p) => (p.$on ? colors.primary : colors.border)};

  &:hover:not(:disabled) {
    border-color: ${colors.primary};
    color: ${(p) => (p.$on ? colors.white : colors.primary)};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
