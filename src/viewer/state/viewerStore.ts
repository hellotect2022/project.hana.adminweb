import { create } from 'zustand';
import type { UnityTransform } from '../lib/coords';

export type GizmoMode = 'translate' | 'rotate' | 'scale';
export interface EditZone { zoneId: number; zoneName: string }
// 저장 전 누적되는 변경분(장비별)
export interface EditEntry { trs: UnityTransform; zoneId: number | null; zoneName: string | null }

// 뷰어 공유 상태 (R3F 씬 ↔ DOM 패널). 편집/장비는 다음 슬라이스에서 확장.
interface ViewerState {
  // 다중 선택: 빈 배열 = 전체 표시. 층 버튼은 토글(중복 선택 가능).
  selectedFloors: string[];
  showCeiling: boolean;
  showDevices: boolean;
  editMode: boolean;
  selectedDeviceId: number | null;
  sidebarOpen: boolean;
  focus: { x: number; y: number; z: number } | null; // 카메라 줌 타겟
  registryVersion: number; // 3D 객체 (등록/해제) 시 증가 → 기즈모/인스펙터 리렌더 트리거
  // 편집 상태
  gizmoMode: GizmoMode;
  editTRS: UnityTransform | null;     // 선택 장비 표시값(인스펙터)
  editZone: EditZone | null;
  edits: Record<number, EditEntry>;   // 변경 누적(배치 저장 대상)
  showColliders: boolean;
  // 미배치 장비 드롭 배치(저장 전 임시): deviceId → 드롭 월드좌표 + 층
  pending: Record<number, { pos: [number, number, number]; floorKey: string | null }>;
  addPending: (id: number, pos: [number, number, number], floorKey: string | null) => void;
  removePending: (id: number) => void;
  toggleFloor: (k: string) => void;   // 클릭 토글(추가/제거)
  showOnlyFloor: (k: string) => void; // 단독 표시(장비 포커스용)
  clearFloors: () => void;            // 전체
  toggleCeiling: () => void;
  toggleDevices: () => void;
  setEditMode: (v: boolean) => void;
  selectDevice: (id: number | null) => void;
  setFocus: (p: { x: number; y: number; z: number } | null) => void;
  bumpRegistry: () => void;
  toggleSidebar: () => void;
  setGizmoMode: (m: GizmoMode) => void;
  setDisplay: (trs: UnityTransform | null, zone: EditZone | null) => void;
  recordEdit: (id: number, trs: UnityTransform, zone: EditZone | null) => void;
  removeEdit: (id: number) => void;
  clearEdits: () => void;
  toggleColliders: () => void;
}

export const useViewerStore = create<ViewerState>((set) => ({
  selectedFloors: [],
  showCeiling: false,
  showDevices: true,
  editMode: false,
  selectedDeviceId: null,
  sidebarOpen: false,
  focus: null,
  registryVersion: 0,
  gizmoMode: 'translate',
  editTRS: null,
  editZone: null,
  edits: {},
  showColliders: false,
  pending: {},
  addPending: (id, pos, floorKey) => set((s) => ({ pending: { ...s.pending, [id]: { pos, floorKey } } })),
  removePending: (id) => set((s) => { const n = { ...s.pending }; delete n[id]; return { pending: n }; }),
  toggleFloor: (k) =>
    set((s) => ({
      selectedFloors: s.selectedFloors.includes(k)
        ? s.selectedFloors.filter((x) => x !== k)
        : [...s.selectedFloors, k],
    })),
  showOnlyFloor: (k) => set({ selectedFloors: [k] }),
  clearFloors: () => set({ selectedFloors: [] }),
  toggleCeiling: () => set((s) => ({ showCeiling: !s.showCeiling })),
  toggleDevices: () => set((s) => ({ showDevices: !s.showDevices })),
  setEditMode: (v) => set({ editMode: v, selectedDeviceId: null, editTRS: null, editZone: null }),
  selectDevice: (id) => set({ selectedDeviceId: id }),
  setFocus: (p) => set({ focus: p }),
  bumpRegistry: () => set((s) => ({ registryVersion: s.registryVersion + 1 })),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setGizmoMode: (m) => set({ gizmoMode: m }),
  // 선택 시 표시값만(누적 X)
  setDisplay: (trs, zone) => set({ editTRS: trs, editZone: zone }),
  // 변경 누적(배치 저장 대상) + 표시 갱신
  recordEdit: (id, trs, zone) =>
    set((s) => ({ editTRS: trs, editZone: zone, edits: { ...s.edits, [id]: { trs, zoneId: zone?.zoneId ?? null, zoneName: zone?.zoneName ?? null } } })),
  removeEdit: (id) => set((s) => { const n = { ...s.edits }; delete n[id]; return { edits: n }; }),
  clearEdits: () => set({ edits: {} }),
  toggleColliders: () => set((s) => ({ showColliders: !s.showColliders })),
}));

// 다중 선택 가시성: 빈 배열이면 전체.
export const isFloorVisible = (selected: string[], key: string | null): boolean =>
  selected.length === 0 || (key != null && selected.includes(key));
