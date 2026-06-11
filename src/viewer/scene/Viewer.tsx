import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';

// R3F 뷰어 골격(수직 슬라이스): 캔버스 + 컨트롤 + 그리드 + 플레이스홀더.
// 다음 슬라이스에서 Building(scene-manifest)·Devices·ZoneColliders·PlacementGizmo 컴포넌트를 채운다.
function Placeholder() {
  return (
    <mesh position={[0, 1, 0]} castShadow>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="#3a6ff7" metalness={0.1} roughness={0.4} />
    </mesh>
  );
}

export function Viewer() {
  return (
    <Canvas
      shadows
      camera={{ position: [8, 6, 8], fov: 60, near: 0.1, far: 100000 }}
      style={{ width: '100vw', height: '100vh', display: 'block' }}
    >
      <color attach="background" args={['#20242b']} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 16, 8]} intensity={2} castShadow />
      <Suspense fallback={null}>
        <Placeholder />
      </Suspense>
      <Grid args={[40, 40]} cellColor="#3a3f48" sectionColor="#586072" infiniteGrid fadeDistance={120} />
      <OrbitControls makeDefault enableDamping />
      <GizmoHelper alignment="bottom-right" margin={[72, 72]}>
        <GizmoViewport axisColors={['#ff5a5a', '#5aff8f', '#5a8cff']} labelColor="white" />
      </GizmoHelper>
    </Canvas>
  );
}
