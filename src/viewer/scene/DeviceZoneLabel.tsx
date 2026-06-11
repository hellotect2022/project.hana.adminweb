import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { deviceObjects } from '../state/registry';
import { useViewerStore } from '../state/viewerStore';

// 편집 모드에서 선택/이동 중인 장비 위에 현재 zone(구역) 라벨을 따라다니게 표시.
export function DeviceZoneLabel() {
  const editMode = useViewerStore((s) => s.editMode);
  const selectedId = useViewerStore((s) => s.selectedDeviceId);
  const editZone = useViewerStore((s) => s.editZone);
  const ref = useRef<THREE.Group>(null);

  // 매 프레임 선택 장비 위치를 따라가게(기즈모 이동 중에도 실시간)
  useFrame(() => {
    if (!ref.current || selectedId == null) return;
    const o = deviceObjects.get(selectedId);
    if (o) o.getWorldPosition(ref.current.position);
  });

  if (!editMode || selectedId == null) return null;

  return (
    <group ref={ref}>
      <Html position={[0, 3, 0]} center distanceFactor={40} zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
        <div
          style={{
            whiteSpace: 'nowrap',
            padding: '3px 8px',
            borderRadius: 6,
            font: '600 12px system-ui, sans-serif',
            color: '#fff',
            background: editZone ? 'rgba(20,90,55,0.92)' : 'rgba(120,70,20,0.92)',
            border: `1px solid ${editZone ? '#2fae6a' : '#e0913a'}`,
          }}
        >
          {editZone ? `📍 ${editZone.zoneName} (#${editZone.zoneId})` : '⚠ 영역 밖 (구역 미지정)'}
        </div>
      </Html>
    </group>
  );
}
