import { Floor } from './Floor';
import { useSceneManifest, useMaterialMap } from '../hooks';

// scene-manifest 의 64개 층을 배치. material-map 로 머티리얼/텍스처 적용.
export function Building() {
  const { data: manifest } = useSceneManifest();
  const { data: matMap } = useMaterialMap();
  if (!manifest || !matMap) return null;
  return (
    <group>
      {manifest.floors.map((f) => (
        <Floor key={f.glb} data={f} matMap={matMap} />
      ))}
    </group>
  );
}
