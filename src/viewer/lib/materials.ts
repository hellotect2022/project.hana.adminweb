import * as THREE from 'three';
import type { MaterialMap } from './manifest';

// 원본 PNG 풀화질 로드 + 비등방성 (hanadream_web 의 방식 그대로).
const texCache = new Map<string, Promise<THREE.Texture | null>>();
const texLoader = new THREE.TextureLoader();

function loadTex(file: string, srgb: boolean, maxAniso: number): Promise<THREE.Texture | null> {
  const name = file.toLowerCase();
  const cached = texCache.get(name);
  if (cached) return cached;
  const p = texLoader
    .loadAsync(`/textures/${name}`)
    .then((t) => {
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.flipY = false; // glTF UV 규약
      t.anisotropy = maxAniso;
      t.needsUpdate = true;
      return t;
    })
    .catch(() => null);
  texCache.set(name, p);
  return p;
}

// GLB 머티리얼 슬롯명 → material-map 적용(색/메탈/러프 + 텍스처 비동기 주입).
export function applyMaterialMap(root: THREE.Object3D, matMap: MaterialMap, maxAniso: number): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((mat) => {
      const std = mat as THREE.MeshStandardMaterial;
      const def = matMap[std.name];
      if (!def) return;
      const f = def.factors || {};
      const t = def.textures || {};
      if (f.baseColor) {
        std.color.setRGB(f.baseColor[0], f.baseColor[1], f.baseColor[2]);
        if (f.baseColor[3] < 1) { std.transparent = true; std.opacity = f.baseColor[3]; }
      }
      if (typeof f.metallic === 'number') std.metalness = f.metallic;
      if (typeof f.smoothness === 'number') std.roughness = 1 - f.smoothness;
      if (t.map) loadTex(t.map, true, maxAniso).then((x) => { if (x) { std.map = x; std.needsUpdate = true; } });
      if (t.normalMap) loadTex(t.normalMap, false, maxAniso).then((x) => { if (x) { std.normalMap = x; std.needsUpdate = true; } });
    });
  });
}
