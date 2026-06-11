import { useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useViewerStore } from '../state/viewerStore';

// store.focus 가 바뀌면 그 지점으로 카메라/컨트롤 줌(드롭·선택 시 장비가 보이도록).
export function CameraFocus() {
  const focus = useViewerStore((s) => s.focus);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as
    | { target: THREE.Vector3; update: () => void }
    | null;

  useEffect(() => {
    if (!focus || !controls) return;
    const t = new THREE.Vector3(focus.x, focus.y, focus.z);
    controls.target.copy(t);
    camera.position.copy(t).add(new THREE.Vector3(14, 11, 14)); // 장비(~2m)에 적당한 근접 뷰
    camera.updateProjectionMatrix();
    controls.update();
  }, [focus, camera, controls]);

  return null;
}
