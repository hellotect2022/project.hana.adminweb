import { Suspense, useRef } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport, Bounds, Html } from '@react-three/drei';
import { Building } from './Building';
import { Devices } from './Devices';
import { ZoneColliders } from './ZoneColliders';
import { PendingDevices } from './PendingDevices';
import { EditorGizmo } from './EditorGizmo';
import { DeviceZoneLabel } from './DeviceZoneLabel';
import { Bridge } from './Bridge';
import { CameraFocus } from './CameraFocus';
import { useViewerStore } from '../state/viewerStore';

function Loading() {
  return <Html center style={{ color: '#cfd4db', font: '13px system-ui' }}>건물 로딩…</Html>;
}

export function Viewer() {
  const selectDevice = useViewerStore((s) => s.selectDevice);
  const worldRef = useRef<THREE.Group>(null);
  return (
    <Canvas
      camera={{ position: [200, 150, 200], fov: 60, near: 0.1, far: 100000 }}
      style={{ width: '100vw', height: '100vh', display: 'block' }}
      onPointerMissed={() => selectDevice(null)}
    >
      <color attach="background" args={['#20242b']} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[80, 160, 60]} intensity={2.2} />
      <group ref={worldRef}>
        <Suspense fallback={<Loading />}>
          <Bounds fit clip margin={1.2}>
            <Building />
          </Bounds>
          <Devices />
          <ZoneColliders />
          <PendingDevices />
        </Suspense>
      </group>
      <EditorGizmo />
      <DeviceZoneLabel />
      <Bridge worldRef={worldRef} />
      <CameraFocus />
      <Grid args={[1000, 1000]} cellSize={10} cellColor="#2c313a" sectionColor="#3a4150" infiniteGrid fadeDistance={2000} position={[0, -0.01, 0]} />
      <OrbitControls makeDefault enableDamping />
      <GizmoHelper alignment="bottom-right" margin={[72, 72]}>
        <GizmoViewport axisColors={['#ff5a5a', '#5aff8f', '#5a8cff']} labelColor="white" />
      </GizmoHelper>
    </Canvas>
  );
}
