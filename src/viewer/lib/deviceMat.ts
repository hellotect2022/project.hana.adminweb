import * as THREE from 'three';

// 장비 강조(녹색 발광) / 모델 없는 장비(주황 큐브) — hanadream_web 과 동일 톤.
export const DEVICE_MAT = new THREE.MeshStandardMaterial({
  color: 0x1fbf5e, emissive: 0x0c5a2a, emissiveIntensity: 1.0, roughness: 0.4, metalness: 0.0,
});
export const DEVICE_SELECTED_MAT = new THREE.MeshStandardMaterial({
  color: 0xffcc33, emissive: 0x7a5500, emissiveIntensity: 1.0, roughness: 0.4, metalness: 0.0,
});
export const DEVICE_MISS_MAT = new THREE.MeshStandardMaterial({
  color: 0xff8a1e, emissive: 0x6a3200, emissiveIntensity: 1.0,
});
