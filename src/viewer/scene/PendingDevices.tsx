import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { DeviceDTO } from '../data/types';
import { DEVICE_MAT, DEVICE_SELECTED_MAT, DEVICE_MISS_MAT } from '../lib/deviceMat';
import { useViewerStore } from '../state/viewerStore';
import { useAllDevices } from '../hooks';
import { useRegister, onDevicePick } from './DeviceInstance';
import { DeviceErrorBoundary } from './DeviceErrorBoundary';

type Pos = [number, number, number];

// 드롭으로 막 배치된(저장 전) 장비. pos(three 월드좌표)에 한 번 놓고 이후엔 기즈모가 제어.
function PendingModel({ device, pos }: { device: DeviceDTO; pos: Pos }) {
  const gltf = useGLTF(`/models/${device.assetName}.glb`, true);
  const selectedId = useViewerStore((s) => s.selectedDeviceId);
  const sel = selectedId === device.deviceId;
  const obj = useMemo(() => {
    const c = clone(gltf.scene);
    c.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.material = sel ? DEVICE_SELECTED_MAT : DEVICE_MAT; });
    return c;
  }, [gltf.scene, sel]);
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => { ref.current?.position.set(pos[0], pos[1], pos[2]); }, []); // 최초 1회
  useRegister(device.deviceId, ref);
  return (
    <group ref={ref} userData={{ isDevice: true }} onClick={onDevicePick(device.deviceId)}>
      <primitive object={obj} />
    </group>
  );
}

function PendingCube({ device, pos }: { device: DeviceDTO; pos: Pos }) {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => { ref.current?.position.set(pos[0], pos[1], pos[2]); }, []);
  useRegister(device.deviceId, ref);
  return (
    <group ref={ref} userData={{ isDevice: true }} onClick={onDevicePick(device.deviceId)}>
      <mesh material={DEVICE_MISS_MAT}><boxGeometry args={[2, 2, 2]} /></mesh>
    </group>
  );
}

export function PendingDevices() {
  const pending = useViewerStore((s) => s.pending);
  const removePending = useViewerStore((s) => s.removePending);
  const { data: devices } = useAllDevices();

  // 저장 후 refetch 로 transform 이 생기면 정식 Devices 가 렌더 → 그때 pending 정리(공백 없음)
  useEffect(() => {
    if (!devices) return;
    for (const id of Object.keys(pending)) {
      const dev = devices.find((d) => d.deviceId === Number(id));
      if (dev?.transform) removePending(Number(id));
    }
  }, [devices, pending, removePending]);

  if (!devices) return null;
  return (
    <group>
      {Object.entries(pending).map(([id, p]) => {
        const dev = devices.find((d) => d.deviceId === Number(id));
        // 저장되어 transform 이 생기면 일반 Devices 가 렌더 → 그 전까지 임시 유지(공백 없음)
        if (!dev || dev.transform) return null;
        return (
          <Suspense key={id} fallback={null}>
            <DeviceErrorBoundary fallback={<PendingCube device={dev} pos={p.pos} />}>
              {dev.assetName ? <PendingModel device={dev} pos={p.pos} /> : <PendingCube device={dev} pos={p.pos} />}
            </DeviceErrorBoundary>
          </Suspense>
        );
      })}
    </group>
  );
}
