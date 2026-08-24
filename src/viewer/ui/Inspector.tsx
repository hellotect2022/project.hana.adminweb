import * as THREE from 'three';
import styled from 'styled-components';
import type { UnityTransform } from '../lib/coords';
import { applyUnityToObject } from '../lib/coords';
import { resolveZoneAt } from '../lib/zone';
import { deviceObjects } from '../state/registry';
import { useViewerStore, type GizmoMode, type EditZone } from '../state/viewerStore';
import { useAllDevices, useZoneMap } from '../hooks';
import { deviceLabel } from '@/utils/deviceLabel';

const Box = styled.div`
  position: fixed; bottom: 14px; right: 14px; z-index: 13; width: 250px;
  display: flex; flex-direction: column; gap: 8px; padding: 12px; box-sizing: border-box;
  background: rgba(22,24,29,.97); border: 1px solid #3a3f48; border-radius: 8px;
  color: #d7dbe0; font: 12px/1.4 system-ui, sans-serif;
`;
const Ttl = styled.div`font-size: 13px; font-weight: 700; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`;
const Sub = styled.div`font-size: 11px; color: #99a0a9; margin-top: -4px;`;
const Zone = styled.div`font-size: 11px; color: #7fd0ff;`;
const Dirty = styled.span`color: #e0913a; font-size: 11px; font-weight: 700;`;
const Modes = styled.div`display: flex; gap: 4px; button { flex: 1; padding: 6px 0; cursor: pointer; font-size: 12px; border: 1px solid #3a3f48; border-radius: 5px; background: rgba(40,44,52,.85); color: #cfd4db; } button.on { background: #4a86ff; border-color: #4a86ff; color: #fff; }`;
const Grid = styled.div`display: grid; grid-template-columns: 16px 1fr 1fr 1fr; gap: 4px; align-items: center; label { color: #99a0a9; font-size: 11px; } input { width: 100%; box-sizing: border-box; padding: 4px 5px; font: 11px monospace; border: 1px solid #343a44; border-radius: 4px; background: #2a2e36; color: #e6e9ee; }`;
const Actions = styled.div`display: flex; gap: 6px; button { flex: 1; padding: 8px 0; cursor: pointer; font-size: 12px; font-weight: 600; border-radius: 5px; border: 1px solid #3a3f48; background: rgba(40,44,52,.85); color: #cfd4db; }`;

export function Inspector() {
  const editMode = useViewerStore((s) => s.editMode);
  const selectedId = useViewerStore((s) => s.selectedDeviceId);
  const editTRS = useViewerStore((s) => s.editTRS);
  const editZone = useViewerStore((s) => s.editZone);
  const edits = useViewerStore((s) => s.edits);
  const mode = useViewerStore((s) => s.gizmoMode);
  const setGizmoMode = useViewerStore((s) => s.setGizmoMode);
  const recordEdit = useViewerStore((s) => s.recordEdit);
  const removeEdit = useViewerStore((s) => s.removeEdit);
  const setDisplay = useViewerStore((s) => s.setDisplay);
  const selectDevice = useViewerStore((s) => s.selectDevice);
  const pending = useViewerStore((s) => s.pending);
  const removePending = useViewerStore((s) => s.removePending);
  const { data: devices } = useAllDevices();
  const { data: zoneByMesh } = useZoneMap();

  const dev = devices?.find((d) => d.deviceId === selectedId);
  if (!editMode || !dev || !editTRS) return null;
  const obj = deviceObjects.get(dev.deviceId);
  const isPending = pending[dev.deviceId] != null;
  const isDirty = edits[dev.deviceId] != null;

  const zoneOf = (): EditZone | null => {
    if (!obj || !zoneByMesh) return editZone;
    const r = resolveZoneAt(obj.getWorldPosition(new THREE.Vector3()), zoneByMesh);
    return r ? { zoneId: r.zoneId, zoneName: r.zoneName } : null;
  };
  const onField = (k: keyof UnityTransform, v: string) => {
    const next = { ...editTRS, [k]: parseFloat(v) || 0 };
    if (obj) applyUnityToObject(obj, next);
    recordEdit(dev.deviceId, next, zoneOf());
  };
  const onRevert = () => {
    if (isPending) { removePending(dev.deviceId); removeEdit(dev.deviceId); selectDevice(null); return; }
    if (obj && dev.transform) { applyUnityToObject(obj, dev.transform); removeEdit(dev.deviceId); setDisplay(dev.transform, zoneOf()); }
  };

  return (
    <Box>
      <Ttl>{deviceLabel(dev)} {isDirty && <Dirty>● 변경됨</Dirty>}</Ttl>
      <Sub>#{dev.deviceId} · {dev.assetName ?? '(자산없음)'}{isPending ? ' · 신규배치' : ''}</Sub>
      <Zone>{editZone ? `구역: ${editZone.zoneName} (#${editZone.zoneId})` : '구역: (영역 밖 — 미지정)'}</Zone>
      <Modes>
        {(['translate', 'rotate', 'scale'] as GizmoMode[]).map((m) => (
          <button key={m} className={mode === m ? 'on' : ''} onClick={() => setGizmoMode(m)}>
            {m === 'translate' ? '이동' : m === 'rotate' ? '회전' : '크기'}
          </button>
        ))}
      </Modes>
      <Grid>
        <label>P</label>
        {(['posX', 'posY', 'posZ'] as const).map((k) => <input key={k} type="number" step="0.1" value={editTRS[k]} onChange={(e) => onField(k, e.target.value)} />)}
        <label>R</label>
        {(['rotX', 'rotY', 'rotZ'] as const).map((k) => <input key={k} type="number" step="1" value={editTRS[k]} onChange={(e) => onField(k, e.target.value)} />)}
        <label>S</label>
        {(['scaleX', 'scaleY', 'scaleZ'] as const).map((k) => <input key={k} type="number" step="0.05" value={editTRS[k]} onChange={(e) => onField(k, e.target.value)} />)}
      </Grid>
      <Actions>
        <button onClick={onRevert}>{isPending ? '배치 취소' : '되돌리기'}</button>
      </Actions>
      <div style={{ fontSize: 10, color: '#757c86' }}>변경분은 상단 ‘저장 (N)’ 으로 한 번에 커밋됩니다.</div>
    </Box>
  );
}
