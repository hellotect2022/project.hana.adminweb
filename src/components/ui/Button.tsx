import styled, { css } from "styled-components";
import { colors, radius, fontSize } from "@/styles/tokens";

/**
 * 표준 Button — 모든 화면의 버튼은 이 컴포넌트를 사용한다.
 *
 * 사용 예)
 *   <Button variant="primary">등록</Button>
 *   <Button variant="secondary">검색</Button>
 *   <Button variant="danger" size="sm">삭제</Button>
 *   <Button variant="outline" onClick={onCancel}>취소</Button>
 *
 * variant: primary(주 액션) | secondary(보조) | danger(삭제) | outline(취소/중립) | ghost(아이콘/텍스트)
 * size: md(기본, 툴바) | sm(테이블 행 내부)
 */
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "outline"
  | "ghost";

export type ButtonSize = "sm" | "md";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const Button = ({
  variant = "primary",
  size = "md",
  fullWidth = false,
  type = "button",
  ...rest
}: ButtonProps) => (
  <StyledButton
    $variant={variant}
    $size={size}
    $fullWidth={fullWidth}
    type={type}
    {...rest}
  />
);

export default Button;

const sizeStyles: Record<ButtonSize, ReturnType<typeof css>> = {
  md: css`
    padding: 8px 20px;
    font-size: ${fontSize.md};
    border-radius: ${radius.md};
  `,
  sm: css`
    padding: 4px 12px;
    font-size: ${fontSize.xs};
    border-radius: ${radius.sm};
  `,
};

const variantStyles: Record<ButtonVariant, ReturnType<typeof css>> = {
  primary: css`
    color: ${colors.white};
    background: ${colors.primary};
    border: 1px solid ${colors.primary};
    &:hover:not(:disabled) {
      background: ${colors.primaryHover};
      border-color: ${colors.primaryHover};
    }
  `,
  secondary: css`
    color: ${colors.white};
    background: ${colors.secondary};
    border: 1px solid ${colors.secondary};
    &:hover:not(:disabled) {
      background: ${colors.secondaryHover};
      border-color: ${colors.secondaryHover};
    }
  `,
  danger: css`
    color: ${colors.white};
    background: ${colors.danger};
    border: 1px solid ${colors.danger};
    &:hover:not(:disabled) {
      background: ${colors.dangerHover};
      border-color: ${colors.dangerHover};
    }
  `,
  outline: css`
    color: ${colors.text};
    background: ${colors.surface};
    border: 1px solid ${colors.border};
    &:hover:not(:disabled) {
      background: ${colors.surfaceHover};
      border-color: ${colors.borderHover};
    }
  `,
  ghost: css`
    color: ${colors.text};
    background: transparent;
    border: 1px solid transparent;
    &:hover:not(:disabled) {
      background: ${colors.surfaceHover};
    }
  `,
};

const StyledButton = styled.button<{
  $variant: ButtonVariant;
  $size: ButtonSize;
  $fullWidth: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  ${(p) => sizeStyles[p.$size]}
  ${(p) => variantStyles[p.$variant]}
  ${(p) => p.$fullWidth && "width: 100%;"}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
