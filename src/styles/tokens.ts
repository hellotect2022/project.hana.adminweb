/**
 * 디자인 토큰 — UI 색상/반경/간격/타이포의 단일 진실원천(Single Source of Truth).
 *
 * 규칙
 *  - 컴포넌트에서 hex 값을 직접 쓰지 말고 반드시 이 토큰을 import 해서 사용한다.
 *  - 색상 변경은 이 파일 한 곳만 수정하면 전체에 반영된다.
 *  - 토큰 값은 기존 코드베이스에서 가장 많이 쓰이던 색을 표준으로 채택했다.
 */

export const colors = {
  /* 액션(브랜드) */
  primary: "#2563eb",        // 주요 액션(등록/저장)
  primaryHover: "#1d4ed8",
  secondary: "#4a6380",      // 보조 액션(검색/수정) — 기존 최다 사용 슬레이트
  secondaryHover: "#3d5370",
  danger: "#dc2626",         // 파괴적 액션(삭제)
  dangerHover: "#b91c1c",

  /* 포커스/강조 */
  accent: "#4a90d9",         // input focus 등

  /* 텍스트 */
  textStrong: "#111827",
  text: "#374151",
  textMuted: "#6b7280",
  textSubtle: "#9ca3af",

  /* 경계선 */
  border: "#d1d5db",
  borderLight: "#e5e7eb",
  borderHover: "#9ca3af",

  /* 표면(배경) */
  surface: "#ffffff",
  surfaceMuted: "#f9fafb",
  surfaceHover: "#f3f4f6",
  surfaceSubtle: "#f8fafc",

  /* 기타 */
  white: "#ffffff",
  dark: "#111d2c",           // 헤더/사이드바 계열
} as const;

/** 상태 뱃지(Badge) 색상 — 배경/텍스트 쌍 */
export const statusColors = {
  successBg: "#dcfce7",
  successText: "#15803d",
  dangerBg: "#fee2e2",
  dangerText: "#dc2626",
  infoBg: "#eef2ff",
  infoText: "#4338ca",
  neutralBg: "#f3f4f6",
  neutralText: "#374151",
  warningBg: "#fef9c3",
  warningText: "#a16207",
} as const;

export const radius = {
  sm: "4px",
  md: "6px",
  lg: "8px",
  pill: "999px",
} as const;

export const space = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
} as const;

export const fontSize = {
  xs: "12px",
  sm: "13px",
  md: "14px",
  lg: "16px",
} as const;

export const shadow = {
  sm: "0 1px 2px rgba(0, 0, 0, 0.05)",
  md: "0 4px 12px rgba(0, 0, 0, 0.08)",
} as const;

export type ColorToken = keyof typeof colors;
