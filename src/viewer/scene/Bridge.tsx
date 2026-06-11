import { useEffect, type RefObject } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { setViewerCtx } from '../state/registry';

// Canvas 안에서 camera/raycaster/gl 과 월드그룹을 캡처 → DOM 드롭 핸들러가 레이캐스트에 사용.
export function Bridge({ worldRef }: { worldRef: RefObject<THREE.Group | null> }) {
  const camera = useThree((s) => s.camera);
  const raycaster = useThree((s) => s.raycaster);
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    setViewerCtx({ camera, raycaster, gl, world: worldRef.current });
  }, [camera, raycaster, gl, worldRef]);
  return null;
}
