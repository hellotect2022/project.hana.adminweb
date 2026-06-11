import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { DeviceDTO } from '@/types/device';
import { applyUnityToObject } from '../lib/coords';
import { DEVICE_MAT, DEVICE_SELECTED_MAT, DEVICE_MISS_MAT } from '../lib/deviceMat';
import { floorNameToKey } from '../lib/manifest';
import { useViewerStore, isFloorVisible } from '../state/viewerStore';
import { deviceObjects } from '../state/registry';
import type { ThreeEvent } from '@react-three/fiber';

function useDeviceVisible(device: DeviceDTO): boolean {
  const selectedFloors = useViewerStore((s) => s.selectedFloors);
  const sd = useViewerStore((s) => s.showDevices);
  const key = floorNameToKey(device.location?.floorName);
  return sd && isFloorVisible(selectedFloors, key);
}

// 편집 모드에서 장비 클릭 → 선택 + 카메라 줌
export function onDevicePick(deviceId: number) {
  return (e: ThreeEvent<MouseEvent>) => {
    const st = useViewerStore.getState();
    if (!st.editMode) return;
    e.stopPropagation();
    st.selectDevice(deviceId);
    const o = deviceObjects.get(deviceId);
    if (o) { const p = o.getWorldPosition(new THREE.Vector3()); st.setFocus({ x: p.x, y: p.y, z: p.z }); }
  };
}
// 노드 등록(레지스트리) — 기즈모/인스펙터가 참조. (등록/해제 시 registryVersion 증가로 리렌더 유도)
export function useRegister(deviceId: number, ref: RefObject<THREE.Group | null>) {
  useLayoutEffect(() => {
    if (ref.current) { deviceObjects.set(deviceId, ref.current); useViewerStore.getState().bumpRegistry(); }
    return () => { deviceObjects.delete(deviceId); useViewerStore.getState().bumpRegistry(); };
  }, [deviceId, ref]);
}

// 배치된 장비 GLB (녹색/선택 시 노랑 오버라이드). transform(Unity) → flipX 적용.
export function DeviceModel({ device }: { device: DeviceDTO }) {
  const gltf = useGLTF(`/models/${device.assetName}.glb`, true);
  const selectedId = useViewerStore((s) => s.selectedDeviceId);
  const selected = selectedId === device.deviceId;

  const obj = useMemo(() => {
    const c = clone(gltf.scene);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.material = selected ? DEVICE_SELECTED_MAT : DEVICE_MAT;
    });
    return c;
  }, [gltf.scene, selected]);

  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    if (ref.current && device.transform) applyUnityToObject(ref.current, device.transform);
  }, [device.transform]);
  useRegister(device.deviceId, ref);

  return (
    <group ref={ref} userData={{ isDevice: true }} visible={useDeviceVisible(device)} onClick={onDevicePick(device.deviceId)}>
      <primitive object={obj} />
    </group>
  );
}

// 모델 없는(또는 로드 실패) 장비 — 주황 큐브.
export function DeviceCube({ device }: { device: DeviceDTO }) {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    if (ref.current && device.transform) applyUnityToObject(ref.current, device.transform);
  }, [device.transform]);
  useRegister(device.deviceId, ref);
  return (
    <group ref={ref} userData={{ isDevice: true }} visible={useDeviceVisible(device)} onClick={onDevicePick(device.deviceId)}>
      <mesh material={DEVICE_MISS_MAT}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
    </group>
  );
}
