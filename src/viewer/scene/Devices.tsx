import { Suspense } from 'react';
import { useAllDevices } from '../hooks';
import { DeviceModel, DeviceCube } from './DeviceInstance';
import { DeviceErrorBoundary } from './DeviceErrorBoundary';

// 배치된 장비(transform 존재)만 3D 표시. 미배치는 사이드바에서 드래그(다음 슬라이스).
export function Devices() {
  const { data } = useAllDevices();
  if (!data) return null;
  const placed = data.filter((d) => d.transform);
  return (
    <group>
      {placed.map((d) => (
        <Suspense key={d.deviceId} fallback={null}>
          <DeviceErrorBoundary fallback={<DeviceCube device={d} />}>
            {d.assetName ? <DeviceModel device={d} /> : <DeviceCube device={d} />}
          </DeviceErrorBoundary>
        </Suspense>
      ))}
    </group>
  );
}
