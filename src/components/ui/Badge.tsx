import styled from "styled-components";
import { radius, fontSize, statusColors } from "@/styles/tokens";

/**
 * 상태 뱃지(pill).
 *   <Badge tone="success">활성</Badge>
 *   <Badge tone="danger">비활성</Badge>
 *   <Badge tone="info">장비</Badge>
 *
 * tone: success | danger | info | neutral | warning
 */
export type BadgeTone = "success" | "danger" | "info" | "neutral" | "warning";

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const toneMap: Record<BadgeTone, { bg: string; fg: string }> = {
  success: { bg: statusColors.successBg, fg: statusColors.successText },
  danger: { bg: statusColors.dangerBg, fg: statusColors.dangerText },
  info: { bg: statusColors.infoBg, fg: statusColors.infoText },
  neutral: { bg: statusColors.neutralBg, fg: statusColors.neutralText },
  warning: { bg: statusColors.warningBg, fg: statusColors.warningText },
};

const Badge = ({ tone = "neutral", ...rest }: BadgeProps) => (
  <StyledBadge $tone={tone} {...rest} />
);

export default Badge;

const StyledBadge = styled.span<{ $tone: BadgeTone }>`
  display: inline-block;
  padding: 2px 10px;
  font-size: ${fontSize.xs};
  font-weight: 600;
  border-radius: ${radius.pill};
  white-space: nowrap;
  background: ${(p) => toneMap[p.$tone].bg};
  color: ${(p) => toneMap[p.$tone].fg};
`;
