import * as THREE from 'three';

// R3F 밖(레이캐스트/기즈모)에서 접근해야 하는 객체 레지스트리.
export const deviceObjects = new Map<number, THREE.Object3D>(); // deviceId → 3D 노드
export const colliderMeshes: THREE.Mesh[] = [];                  // zone 콜라이더(레이캐스트 대상)
export const floorLevels = new Map<string, number>();           // floorKey → 그 층 바닥 월드 Y (장비 Y로 층 판정용)

export function registerCollider(m: THREE.Mesh) {
  if (!colliderMeshes.includes(m)) colliderMeshes.push(m);
}
export function unregisterCollider(m: THREE.Mesh) {
  const i = colliderMeshes.indexOf(m);
  if (i >= 0) colliderMeshes.splice(i, 1);
}

// R3F 밖(DOM 드롭 핸들러)에서 레이캐스트하려고 캔버스의 카메라/레이캐스터/월드그룹을 캡처.
export interface ViewerCtx {
  camera?: THREE.Camera;
  raycaster?: THREE.Raycaster;
  gl?: THREE.WebGLRenderer;
  world?: THREE.Object3D | null;
}
export const viewerCtx: ViewerCtx = {};
export function setViewerCtx(c: ViewerCtx) {
  Object.assign(viewerCtx, c);
}
