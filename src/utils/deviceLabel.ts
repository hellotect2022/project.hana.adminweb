/**
 * 장비 표시 라벨 헬퍼.
 * - 표시명(deviceDisplayName)이 있으면 "표시명 (장비명)" 형태로 합쳐 보여준다.
 * - 표시명이 없으면 내부 장비명(deviceName)만 보여준다.
 * - 둘 다 없으면 빈 문자열(절대 "undefined" 문자열이 노출되지 않도록 널 안전 처리).
 * deviceName 은 내부 식별용 원본명(deviceKey 파생 등)이므로 폼 입력값·원본명 표시에는 사용하지 말 것.
 */
export function deviceLabel(
  device:
    | { deviceName?: string | null; deviceDisplayName?: string | null }
    | null
    | undefined
): string {
  if (!device) return "";
  const display = device.deviceDisplayName?.trim() ?? "";
  const name = device.deviceName?.trim() ?? "";
  if (display && name) return `${display} (${name})`;
  if (display) return display;
  return name;
}
