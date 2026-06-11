import type { DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import * as THREE from 'three';
import { Viewer } from './scene/Viewer';
import { FloorPanel } from './ui/FloorPanel';
import { DeviceSidebar } from './ui/DeviceSidebar';
import { Inspector } from './ui/Inspector';
import { useViewerStore } from './state/viewerStore';
import { viewerCtx } from './state/registry';
import { flipPos, type UnityTransform } from './lib/coords';
import { resolveZoneAt } from './lib/zone';
import { useAllDevices, useZoneMap, useSaveAll } from './hooks';
import type { DevicePlacementRequest } from '@/types/device';

const round = (n: number) => Math.round(n * 1e4) / 1e4;

const Full = styled.div`
  position: fixed;
  inset: 0;
  background: #20242b;
`;
const TopBar = styled.div`
  position: fixed;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  gap: 8px;
`;
const Btn = styled.button<{ $on?: boolean }>`
  padding: 8px 14px;
  font-weight: 700;
  cursor: pointer;
  color: #e8ecf2;
  background: ${(p) => (p.$on ? '#4a86ff' : 'rgba(20,22,28,0.85)')};
  border: 1px solid ${(p) => (p.$on ? '#4a86ff' : '#3a3f48')};
  border-radius: 8px;
  &:hover { filter: brightness(1.1); }
`;
const SaveBtn = styled.button`
  padding: 8px 16px; font-weight: 800; cursor: pointer; color: #fff;
  background: #2fae6a; border: 1px solid #2fae6a; border-radius: 8px;
  &:hover { filter: brightness(1.08); }
  &:disabled { background: #2a2e36; color: #6b7280; border-color: #3a3f48; cursor: default; }
`;

export function ViewerPage() {
  const navigate = useNavigate();
  const showCeiling = useViewerStore((s) => s.showCeiling);
  const toggleCeiling = useViewerStore((s) => s.toggleCeiling);
  const showDevices = useViewerStore((s) => s.showDevices);
  const toggleDevices = useViewerStore((s) => s.toggleDevices);
  const toggleSidebar = useViewerStore((s) => s.toggleSidebar);
  const editMode = useViewerStore((s) => s.editMode);
  const setEditMode = useViewerStore((s) => s.setEditMode);
  const showColliders = useViewerStore((s) => s.showColliders);
  const toggleColliders = useViewerStore((s) => s.toggleColliders);
  const addPending = useViewerStore((s) => s.addPending);
  const selectDevice = useViewerStore((s) => s.selectDevice);
  const setFocus = useViewerStore((s) => s.setFocus);
  const recordEdit = useViewerStore((s) => s.recordEdit);
  const edits = useViewerStore((s) => s.edits);
  const clearEdits = useViewerStore((s) => s.clearEdits);
  const { data: devices } = useAllDevices();
  const { data: zoneByMesh } = useZoneMap();
  const saveAll = useSaveAll();
  const editCount = Object.keys(edits).length;

  // 변경분(이동/신규배치) 일괄 저장 → 리스트 커밋
  const onSaveAll = () => {
    if (!editCount || !devices) return;
    const bodies: DevicePlacementRequest[] = Object.entries(edits).map(([id, e]) => {
      const did = Number(id);
      const dev = devices.find((d) => d.deviceId === did);
      return {
        deviceId: did,
        deviceName: dev?.deviceName ?? `device-${did}`,
        description: dev?.description ?? '',
        unityZoneId: e.zoneId ?? dev?.location?.zoneId ?? null,
        ...e.trs,
      };
    });
    saveAll.mutate(bodies, { onSuccess: () => clearEdits() }); // pending은 transform 생기면 자동 정리
  };

  // 미배치 카드 → 캔버스 드롭: 드롭 지점을 건물 표면에 레이캐스트 → 임시 배치 + 선택
  const onDrop = (e: DragEvent) => {
    if (!editMode) { console.warn('[drop] editMode=false'); return; }
    e.preventDefault();
    const id = Number(e.dataTransfer.getData('text/deviceId'));
    if (!id) { console.warn('[drop] dataTransfer 비어있음 (id 없음)'); return; }
    const { camera, raycaster, gl, world } = viewerCtx;
    if (!camera || !raycaster || !gl || !world) { console.warn('[drop] viewerCtx 미준비', { camera: !!camera, raycaster: !!raycaster, gl: !!gl, world: !!world }); return; }
    const rect = gl.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    const allHits = raycaster.intersectObject(world, true);
    // three 레이캐스터는 visible=false 도 맞히므로, 숨긴 층(다른 층)·디바이스·콜라이더는 제외 →
    // 화면에 보이는 층 표면에만 안착(층 단독보기에서 정확한 floorKey 보장).
    const hit = allHits.find((h) => {
      let o: THREE.Object3D | null = h.object;
      while (o) {
        if (o.userData?.isDevice || o.userData?.isCollider) return false;
        if (o.visible === false) return false;
        o = o.parent;
      }
      return true;
    });
    if (!hit) { console.warn('[drop] 보이는 건물 표면을 못 맞춤 — 해당 층을 먼저 선택하거나 건물 위에 드롭하세요'); return; }
    let fk: string | null = null;
    let o: THREE.Object3D | null = hit.object;
    while (o) { if (o.userData?.floorKey) { fk = o.userData.floorKey as string; break; } o = o.parent; }
    const p = hit.point;
    addPending(id, [p.x, p.y, p.z], fk);
    // 드롭 즉시 변경분으로 기록(안 움직여도 저장 대상). 신규는 회전0/스케일1.
    const fp = flipPos([p.x, p.y, p.z]);
    const trs: UnityTransform = { posX: round(fp[0]), posY: round(fp[1]), posZ: round(fp[2]), rotX: 0, rotY: 0, rotZ: 0, scaleX: 1, scaleY: 1, scaleZ: 1 };
    const z = zoneByMesh ? resolveZoneAt(p.clone(), zoneByMesh) : null;
    recordEdit(id, trs, z ? { zoneId: z.zoneId, zoneName: z.zoneName } : null);
    selectDevice(id);
    setFocus({ x: p.x, y: p.y, z: p.z }); // 드롭 지점으로 줌 → 작은 장비도 보이게
  };

  return (
    <Full onDragOver={(e) => { if (editMode) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } }} onDrop={onDrop}>
      <TopBar>
        <Btn onClick={() => navigate(-1)}>← 관리자로</Btn>
        <Btn onClick={toggleSidebar}>장비 분류</Btn>
        <Btn $on={editMode} onClick={() => setEditMode(!editMode)}>✎ 편집 {editMode ? 'ON' : 'OFF'}</Btn>
        {editMode && (
          <SaveBtn disabled={!editCount || saveAll.isPending} onClick={onSaveAll}>
            {saveAll.isPending ? '저장 중…' : `저장${editCount ? ` (${editCount})` : ''}`}
          </SaveBtn>
        )}
        <Btn $on={showDevices} onClick={toggleDevices}>장비 {showDevices ? 'ON' : 'OFF'}</Btn>
        <Btn $on={showCeiling} onClick={toggleCeiling}>천장 {showCeiling ? 'ON' : 'OFF'}</Btn>
        {editMode && <Btn $on={showColliders} onClick={toggleColliders}>구역 {showColliders ? 'ON' : 'OFF'}</Btn>}
      </TopBar>
      <FloorPanel />
      <DeviceSidebar />
      <Inspector />
      <Viewer />
    </Full>
  );
}
