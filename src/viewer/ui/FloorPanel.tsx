import styled from 'styled-components';
import { useSceneManifest } from '../hooks';
import { floorKeyOf, floorLabel, floorRank } from '../lib/manifest';
import { useViewerStore } from '../state/viewerStore';

const Panel = styled.div`
  position: fixed;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-height: 92vh;
  overflow-y: auto;
  padding: 4px;
  font: 12px/1 system-ui, sans-serif;
`;
const Btn = styled.button<{ $active: boolean }>`
  min-width: 64px;
  padding: 7px 10px;
  cursor: pointer;
  border: 1px solid ${(p) => (p.$active ? '#4a86ff' : '#3a3f48')};
  border-radius: 5px;
  background: ${(p) => (p.$active ? '#4a86ff' : 'rgba(40,44,52,.85)')};
  color: ${(p) => (p.$active ? '#fff' : '#cfd4db')};
  text-align: center;
  &:hover { background: ${(p) => (p.$active ? '#4a86ff' : 'rgba(70,76,86,.95)')}; }
`;

export function FloorPanel() {
  const { data: manifest } = useSceneManifest();
  const selectedFloors = useViewerStore((s) => s.selectedFloors);
  const toggleFloor = useViewerStore((s) => s.toggleFloor);
  const clearFloors = useViewerStore((s) => s.clearFloors);
  if (!manifest) return null;

  const keys = [...new Set(manifest.floors.map((f) => floorKeyOf(f.name)))]
    .filter((k) => floorRank(k) !== null)
    .sort((a, b) => (floorRank(b) as number) - (floorRank(a) as number));

  // 다중 선택: 각 층 버튼은 독립 토글. 빈 선택 = 전체.
  return (
    <Panel>
      <Btn $active={selectedFloors.length === 0} onClick={clearFloors} style={{ fontWeight: 600 }}>
        전체
      </Btn>
      {keys.map((k) => (
        <Btn key={k} $active={selectedFloors.includes(k)} onClick={() => toggleFloor(k)}>
          {floorLabel(k)}
        </Btn>
      ))}
    </Panel>
  );
}
