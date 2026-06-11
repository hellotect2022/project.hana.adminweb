import { useEffect } from 'react';
import * as THREE from 'three';
import { TransformControls } from '@react-three/drei';
import { unityFromObject } from '../lib/coords';
import { resolveZoneAt } from '../lib/zone';
import { deviceObjects } from '../state/registry';
import { useViewerStore } from '../state/viewerStore';
import { useZoneMap } from '../hooks';

// 선택 장비에 TransformControls 부착. 이동/회전/스케일 → editTRS + zone 재판정.
export function EditorGizmo() {
  const editMode = useViewerStore((s) => s.editMode);
  const selectedId = useViewerStore((s) => s.selectedDeviceId);
  const mode = useViewerStore((s) => s.gizmoMode);
  const setDisplay = useViewerStore((s) => s.setDisplay);
  const recordEdit = useViewerStore((s) => s.recordEdit);
  const { data: zoneByMesh } = useZoneMap();

  const obj = selectedId != null ? deviceObjects.get(selectedId) : undefined;

  const compute = () => {
    const trs = unityFromObject(obj!);
    const z = zoneByMesh ? resolveZoneAt(obj!.getWorldPosition(new THREE.Vector3()), zoneByMesh) : null;
    return { trs, zone: z ? { zoneId: z.zoneId, zoneName: z.zoneName } : null };
  };

  // 선택 변경 시 표시값만 갱신(누적 X — 이미 edits에 있으면 그 값 우선은 Inspector가 처리)
  useEffect(() => {
    if (!obj || !zoneByMesh) return;
    const { trs, zone } = compute();
    setDisplay(trs, zone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obj, zoneByMesh]);

  if (!editMode || !obj) return null;

  // 기즈모 조작 중(onObjectChange)·놓을 때(onMouseUp) 모두 누적 → 이벤트 한 번 놓쳐도 dirty 보장
  const onChange = () => { if (selectedId == null) return; const { trs, zone } = compute(); recordEdit(selectedId, trs, zone); };

  return <TransformControls object={obj} mode={mode} onObjectChange={onChange} onMouseUp={onChange} />;
}
