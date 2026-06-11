import { useMemo, useState } from 'react';
import * as THREE from 'three';
import styled from 'styled-components';
import type { DeviceDTO } from '@/types/device';
import { useAllDevices, useSetActive } from '../hooks';
import { floorNameToKey, floorLabel } from '../lib/manifest';
import { useViewerStore } from '../state/viewerStore';
import { deviceObjects } from '../state/registry';

// ---- 카테고리 트리: categoryPath("대 > 중 > 소") 로 대→중→소→장비 계층 구성 ----
interface TreeNode {
  name: string;
  path: string;
  children: Map<string, TreeNode>;
  devices: DeviceDTO[];
}
function buildTree(devices: DeviceDTO[]): TreeNode {
  const root: TreeNode = { name: '', path: '', children: new Map(), devices: [] };
  for (const d of devices) {
    const segs = (d.categoryPath || d.categoryName || '미분류').split('>').map((s) => s.trim()).filter(Boolean);
    let node = root;
    let acc = '';
    for (const seg of segs) {
      acc = acc ? `${acc} > ${seg}` : seg;
      if (!node.children.has(seg)) node.children.set(seg, { name: seg, path: acc, children: new Map(), devices: [] });
      node = node.children.get(seg)!;
    }
    node.devices.push(d);
  }
  return root;
}
function countDevices(n: TreeNode): { total: number; placed: number } {
  let total = n.devices.length;
  let placed = n.devices.filter((d) => d.placed).length;
  for (const c of n.children.values()) {
    const s = countDevices(c);
    total += s.total; placed += s.placed;
  }
  return { total, placed };
}

const Panel = styled.div<{ $open: boolean }>`
  position: fixed; top: 0; left: 0; bottom: 0; z-index: 12; width: 320px;
  display: ${(p) => (p.$open ? 'flex' : 'none')};
  flex-direction: column; padding: 12px; box-sizing: border-box;
  background: rgba(22, 24, 29, 0.96); border-right: 1px solid #3a3f48;
  color: #d7dbe0; font: 13px/1.4 system-ui, sans-serif;
`;
const Head = styled.div`
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;
  strong { font-size: 14px; }
  button { background: none; border: none; color: #9aa0a8; font-size: 20px; cursor: pointer; }
`;
const Search = styled.input`
  width: 100%; box-sizing: border-box; padding: 7px 9px; margin-bottom: 8px;
  border: 1px solid #3a3f48; border-radius: 5px; background: #2a2e36; color: #e6e9ee;
`;
const Scroll = styled.div`overflow-y: auto;`;
const Row = styled.div<{ $depth: number }>`
  display: flex; align-items: center; gap: 6px; padding: 5px 6px; cursor: pointer; border-radius: 5px;
  padding-left: ${(p) => 6 + p.$depth * 14}px;
  &:hover { background: rgba(255,255,255,0.05); }
  .tw { width: 12px; color: #8b929c; }
  .nm { font-weight: 600; }
  .cnt { margin-left: auto; font-size: 11px; color: #767d88; }
`;
const Card = styled.div<{ $placed: boolean; $sel: boolean; $active: boolean }>`
  display: flex; align-items: center; gap: 6px; cursor: pointer; border-radius: 5px;
  padding: 6px 8px; margin: 2px 0;
  background: ${(p) => (p.$sel ? 'rgba(74,134,255,0.25)' : 'transparent')};
  opacity: ${(p) => (!p.$active ? 0.4 : p.$placed ? 0.6 : 1)};
  border: 1px dashed ${(p) => (p.$placed ? 'transparent' : '#6a5a30')};
  &:hover { background: rgba(74,134,255,0.18); }
  .nm { font-weight: 600; color: #eef1f5; }
  .meta { font-size: 11px; color: #99a0a9; }
`;
const St = styled.span<{ $on: boolean }>`
  min-width: 30px; text-align: center; padding: 1px 5px; border-radius: 4px;
  font-size: 10px; font-weight: 700; color: #fff;
  background: ${(p) => (p.$on ? '#2f6f4a' : '#6a4a18')};
`;
const ActiveBtn = styled.button<{ $on: boolean }>`
  margin-left: auto; flex-shrink: 0; min-width: 42px; padding: 3px 6px; cursor: pointer;
  font-size: 10px; font-weight: 700; border-radius: 4px; color: #fff;
  border: 1px solid ${(p) => (p.$on ? '#2f8f5a' : '#7a3a3a')};
  background: ${(p) => (p.$on ? 'rgba(47,143,90,0.85)' : 'rgba(122,58,58,0.85)')};
  &:hover { filter: brightness(1.15); }
`;

function NodeView({ node, depth, expanded, toggle, filter, onToggleActive }: {
  node: TreeNode; depth: number; expanded: Set<string>; toggle: (p: string) => void; filter: string;
  onToggleActive: (deviceId: number, active: boolean) => void;
}) {
  const editMode = useViewerStore((s) => s.editMode);
  const selectedId = useViewerStore((s) => s.selectedDeviceId);
  const showOnlyFloor = useViewerStore((s) => s.showOnlyFloor);
  const selectDevice = useViewerStore((s) => s.selectDevice);
  const setFocus = useViewerStore((s) => s.setFocus);

  const kids = [...node.children.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  const open = expanded.has(node.path) || filter.length > 0;
  const c = countDevices(node);

  return (
    <div>
      <Row $depth={depth} onClick={() => toggle(node.path)}>
        <span className="tw">{kids.length || node.devices.length ? (open ? '▾' : '▸') : ''}</span>
        <span className="nm">{node.name}</span>
        <span className="cnt">{c.placed}/{c.total}</span>
      </Row>
      {open && (
        <>
          {kids.map((k) => (
            <NodeView key={k.path} node={k} depth={depth + 1} expanded={expanded} toggle={toggle} filter={filter} onToggleActive={onToggleActive} />
          ))}
          {node.devices.map((d) => (
            <div key={d.deviceId} style={{ paddingLeft: 6 + (depth + 1) * 14 }}>
              <Card
                $placed={d.placed}
                $sel={selectedId === d.deviceId}
                $active={d.active}
                draggable={editMode && !d.placed}
                onDragStart={(e) => { e.dataTransfer.setData('text/deviceId', String(d.deviceId)); e.dataTransfer.effectAllowed = 'copy'; }}
                onClick={() => {
                  const key = floorNameToKey(d.location?.floorName);
                  if (d.placed && key) showOnlyFloor(key);
                  selectDevice(d.deviceId);
                  const o = deviceObjects.get(d.deviceId);
                  if (o) { const p = o.getWorldPosition(new THREE.Vector3()); setFocus({ x: p.x, y: p.y, z: p.z }); }
                }}
              >
                <St $on={d.placed}>{d.placed ? '배치' : '미배치'}</St>
                <div style={{ minWidth: 0 }}>
                  <div className="nm">{d.deviceName}</div>
                  <div className="meta">{d.assetName ?? '(자산없음)'} · {d.location?.floorName ? floorLabel(floorNameToKey(d.location.floorName) ?? '') : '-'}</div>
                </div>
                <ActiveBtn
                  $on={d.active}
                  title={d.active ? '클릭 시 비활성(3D 숨김)' : '클릭 시 활성'}
                  onClick={(e) => { e.stopPropagation(); onToggleActive(d.deviceId, !d.active); }}
                >
                  {d.active ? '활성' : '비활성'}
                </ActiveBtn>
              </Card>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export function DeviceSidebar() {
  const { data } = useAllDevices();
  const open = useViewerStore((s) => s.sidebarOpen);
  const togglePanel = useViewerStore((s) => s.toggleSidebar);
  const editMode = useViewerStore((s) => s.editMode);
  const setActive = useSetActive();
  const onToggleActive = (deviceId: number, active: boolean) => setActive.mutate({ deviceId, active });
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (p: string) => setExpanded((s) => { const n = new Set(s); n.has(p) ? n.delete(p) : n.add(p); return n; });

  const tree = useMemo(() => {
    const fl = q.trim().toLowerCase();
    const filtered = (data ?? []).filter((d) => !fl || `${d.deviceName} ${d.assetName ?? ''} ${d.categoryPath ?? ''}`.toLowerCase().includes(fl));
    return buildTree(filtered);
  }, [data, q]);

  const roots = [...tree.children.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  return (
    <Panel $open={open}>
      <Head>
        <strong>장비 분류 {editMode && <span style={{ color: '#e0913a', fontSize: 11 }}>· 미배치 카드를 씬으로 드래그</span>}</strong>
        <button onClick={togglePanel}>×</button>
      </Head>
      <Search placeholder="이름 / 자산 / 분류 검색…" value={q} onChange={(e) => setQ(e.target.value)} />
      <Scroll>
        {roots.map((r) => (
          <NodeView key={r.path} node={r} depth={0} expanded={expanded} toggle={toggle} filter={q.trim()} onToggleActive={onToggleActive} />
        ))}
        {!roots.length && <div style={{ color: '#888', padding: 8 }}>결과 없음</div>}
      </Scroll>
    </Panel>
  );
}
