import { Floor } from './Floor';
import { assetUrl } from '../lib/asset';
import { useSceneManifest, useMaterialMap, useTestManifest, useExistingFloors } from '../hooks';
import { useGLTF } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { flipPos } from '../lib/coords';

// scene-manifest 의 64개 층을 배치. material-map 로 머티리얼/텍스처 적용.
export function Building() {
  const { data: manifest } = useSceneManifest();
  const { data: matMap } = useMaterialMap();
  const { data: test } = useTestManifest();
  // public/models 에 실제 존재하는 glb 만 필터링(없는 ceiling 등은 제외).
  const floors = useExistingFloors(manifest?.floors);
  if (!matMap || !floors) return null;
  return (
    <group>
      {floors.map((f, i) => (
        <Floor key={`${f.glb}__${i}`} data={f} matMap={matMap} />
      ))}
      {/* {test.floors.map((f,i)=>{
        console.log('f',f,'i',i)
        return (<FloorItem key={`${f.glb}__${i}`} f={f}/>);
      })} */}
    </group>
  );
}


// 1. 반복 로직을 담을 별도 컴포넌트 생성
function FloorItem({ f }: { f: any }) {
  const gltf = useGLTF(assetUrl(`/models/${f.glb}`), true);
  const gl = useThree((s) => s.gl);
  
  const obj = useMemo(() => {
    const c = clone(gltf.scene);
    // applyMaterialMap(c, matMap, gl.capabilities.getMaxAnisotropy());
    return c;
  }, [gltf.scene, gl]);
  
  const pos = flipPos(f.position);

  return <group position={pos}>
    <primitive object={obj} />
  </group>;
}