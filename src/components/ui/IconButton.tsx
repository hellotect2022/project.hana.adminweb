import styled from "styled-components";
import { colors, radius } from "@/styles/tokens";

/**
 * 아이콘 전용 버튼(닫기 ×, 순서 ↑↓, 확인 ✓ 등). 정사각형, 저강조.
 *   <IconButton aria-label="닫기" onClick={onClose}>×</IconButton>
 *   <IconButton aria-label="위로" size="sm">↑</IconButton>
 *
 * 접근성을 위해 aria-label 을 반드시 지정한다.
 */
export type IconButtonSize = "sm" | "md";

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: IconButtonSize;
}

const IconButton = ({ size = "md", type = "button", ...rest }: IconButtonProps) => (
  <StyledIconButton $size={size} type={type} {...rest} />
);

export default IconButton;

const dim: Record<IconButtonSize, string> = { sm: "28px", md: "34px" };

const StyledIconButton = styled.button<{ $size: IconButtonSize }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${(p) => dim[p.$size]};
  height: ${(p) => dim[p.$size]};
  padding: 0;
  font-size: ${(p) => (p.$size === "sm" ? "14px" : "16px")};
  line-height: 1;
  color: ${colors.textMuted};
  background: transparent;
  border: 1px solid transparent;
  border-radius: ${radius.md};
  cursor: pointer;
  transition: background 0.15s, color 0.15s;

  &:hover:not(:disabled) {
    background: ${colors.surfaceHover};
    color: ${colors.text};
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;
