import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { flipPos } from '../lib/coords';
import { applyMaterialMap } from '../lib/materials';
import { floorKeyOf, isCeiling } from '../lib/manifest';
import type { FloorEntry, MaterialMap } from '../lib/manifest';
import { useViewerStore, isFloorVisible } from '../state/viewerStore';

// 한 층(_in/_out/_ceiling) GLB. flipX 위치 + 회전 identity(검증: FBX2glTF가 이미 Y-up).
export function Floor({ data, matMap }: { data: FloorEntry; matMap: MaterialMap }) {
  const gltf = useGLTF(`/models/${data.glb}`, true); // draco(CDN)
  const gl = useThree((s) => s.gl);

  const obj = useMemo(() => {
    const c = clone(gltf.scene);
    applyMaterialMap(c, matMap, gl.capabilities.getMaxAnisotropy());
    return c;
  }, [gltf.scene, matMap, gl]);

  const key = floorKeyOf(data.name);
  const ceiling = isCeiling(data.glb) || isCeiling(data.name);
  const selectedFloors = useViewerStore((s) => s.selectedFloors);
  const showCeiling = useViewerStore((s) => s.showCeiling);
  const visible = isFloorVisible(selectedFloors, key) && (!ceiling || showCeiling);

  const pos = flipPos(data.position);
  return (
    <group position={pos} scale={data.scale} visible={visible} userData={{ floorKey: key }}>
      <primitive object={obj} />
    </group>
  );
}
