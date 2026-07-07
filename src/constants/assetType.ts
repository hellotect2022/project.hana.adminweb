/**
 * 장비 에셋 타입 — 백엔드 AssetType enum과 1:1 대응.
 * DB에는 영문 코드(name)로 저장되고, 화면에는 label(한글)로 표시한다.
 */
export const ASSET_TYPES = [
  { code: "EQUIPMENT", label: "장비" },
  { code: "EFFECT", label: "이펙트" },
  { code: "ZONE", label: "구역" },
  { code: "EVACUATION_ROUTE", label: "피난대피로" },
  { code: "TOILET_STALL", label: "화장실 칸" },
  { code: "PARKING_SLOT", label: "주차 면" },
] as const;

export type AssetTypeCode = (typeof ASSET_TYPES)[number]["code"];

export const DEFAULT_ASSET_TYPE: AssetTypeCode = "EQUIPMENT";

const LABEL_BY_CODE: Record<string, string> = ASSET_TYPES.reduce(
  (acc, t) => ({ ...acc, [t.code]: t.label }),
  {}
);

/** 영문 코드 → 한글 라벨. 응답에 assetTypeLabel이 있으면 그것을 우선 사용 권장. */
export function assetTypeLabel(code?: string | null): string {
  if (!code) return LABEL_BY_CODE[DEFAULT_ASSET_TYPE];
  return LABEL_BY_CODE[code] ?? code;
}
