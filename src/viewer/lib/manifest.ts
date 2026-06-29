import type { Vec3, Quat } from './coords';

export interface FloorEntry {
  glb: string;
  name: string;       // 예: 15f_in, 1f_ceiling, b7f_out
  position: Vec3;     // Unity LH 원본
  rotation: Quat;
  scale: Vec3;
}
export interface SceneManifest {
  space?: unknown;
  floors: FloorEntry[];
}

export interface TestEntry {
  glb: string;
  name: string;       // 예: 15f_in, 1f_ceiling, b7f_out
  position: Vec3;     // Unity LH 원본
  rotation: Quat;
  scale: Vec3;
}

export interface TestManifest {
  space?: unknown;
  floors: TestEntry[];
}

// 머티리얼 맵
export interface MatDef {
  textures?: { map?: string; normalMap?: string };
  factors?: { baseColor?: number[]; metallic?: number; smoothness?: number };
}
export type MaterialMap = Record<string, MatDef>;

// 층 이름 → 층 키 (2f_in/2f_out/2f_ceiling → 2f)
export const floorKeyOf = (name: string): string => name.replace(/_(in|out|ceiling)$/i, '');
export const isCeiling = (glbOrName: string): boolean => /ceiling/i.test(glbOrName);

// 패널 라벨
export function floorLabel(key: string): string {
  let m: RegExpMatchArray | null;
  if ((m = key.match(/^b(\d+)f$/))) return 'B' + m[1] + 'F';
  if ((m = key.match(/^(\d+)f$/))) return m[1] + 'F';
  if ((m = key.match(/^ph(\d+)f$/))) return 'PH' + m[1] + 'F';
  if (key === 'rf') return 'RF';
  if (key.startsWith('ground')) return 'GND';
  return key.toUpperCase();
}

// 장비 location.floorName → 층 키 (1F→1f, B1→b1f, 지하1층→b1f, 15F→15f)
export function floorNameToKey(fn: string | null | undefined): string | null {
  if (fn == null) return null;
  const s = String(fn).trim();
  let m: RegExpMatchArray | null;
  if ((m = s.match(/지하\s*(\d+)/))) return 'b' + m[1] + 'f';
  if ((m = s.match(/(\d+)\s*층/))) return m[1] + 'f';
  if ((m = s.match(/^b(\d+)f?$/i))) return 'b' + m[1] + 'f';
  if ((m = s.match(/^ph(\d+)/i))) return 'ph' + m[1] + 'f';
  if ((m = s.match(/^(\d+)f?$/i))) return m[1] + 'f';
  return null;
}

// 높이 랭크(클수록 위층). null = 실제 층 아님(패널 제외).
export function floorRank(key: string): number | null {
  let m: RegExpMatchArray | null;
  if (key === 'length' || key === 'ground_001_') return null;
  if ((m = key.match(/^b(\d+)f$/))) return -Number(m[1]);
  if (key.startsWith('ground')) return 0;
  if ((m = key.match(/^(\d+)f$/))) return Number(m[1]);
  if ((m = key.match(/^ph(\d+)f$/))) return 15 + Number(m[1]);
  if (key === 'rf') return 18;
  return null;
}
