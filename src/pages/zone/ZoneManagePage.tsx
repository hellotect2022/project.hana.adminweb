import { showAlert } from "@/utils/dialogBridge";
import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import ZoneCreateModal from "@/components/modal/zone/ZoneCreateModal";
import { useModal } from "@/contexts/ModalContext";
import {
  fetchLocationTree,
  updateZoneAPI,
  UNITY_LOCATION_TREE_QUERY_KEY,
} from "@/services/unityZoneService";
import { Button, Input, Select, Toolbar, FilterGroup, FilterLabel } from "@/components/ui";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

/** 트리에서 zoneId 로 { building, floor, zone } 찾기 */
function findZone(tree, zoneId) {
  for (const b of tree) {
    for (const f of b.floorList ?? []) {
      for (const z of f.zoneList ?? []) {
        if (z.zoneId === zoneId) return { building: b, floor: f, zone: z };
      }
    }
  }
  return null;
}

/**
 * Zone 관리 — 빌딩/층 트리 + 구역 상세/수정 + 생성
 * 데이터 트리: building → floor → zone (동 레벨 없음). 삭제 미지원(CRU).
 */
const ZoneManagePage = () => {
  const { openModal, closeModal } = useModal();
  const queryClient = useQueryClient();

  const { data: tree = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: UNITY_LOCATION_TREE_QUERY_KEY,
    queryFn: fetchLocationTree,
  });

  const [buildingId, setBuildingId] = useState("");
  const [floorFilter, setFloorFilter] = useState("all");
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [collapsedFloors, setCollapsedFloors] = useState(() => new Set());

  // 트리 로드 시 첫 빌딩 자동 선택
  useEffect(() => {
    if (tree.length && !tree.some((b) => String(b.buildingId) === buildingId)) {
      setBuildingId(String(tree[0].buildingId));
    }
  }, [tree, buildingId]);

  const building = useMemo(
    () => tree.find((b) => String(b.buildingId) === buildingId) ?? null,
    [tree, buildingId]
  );
  const floors = building?.floorList ?? [];
  const visibleFloors =
    floorFilter === "all" ? floors : floors.filter((f) => String(f.floorId) === floorFilter);

  const selected = useMemo(() => findZone(tree, selectedZoneId), [tree, selectedZoneId]);

  // 수정 폼 상태 (선택 변경 시 동기화)
  const [editName, setEditName] = useState("");
  const [editMesh, setEditMesh] = useState("");
  const [editMeshType, setEditMeshType] = useState("2D");
  useEffect(() => {
    setEditName(selected?.zone?.zoneName ?? "");
    setEditMesh(selected?.zone?.zoneMeshName ?? "");
    setEditMeshType(selected?.zone?.meshType ?? "2D");
  }, [selectedZoneId, selected?.zone?.zoneName, selected?.zone?.zoneMeshName, selected?.zone?.meshType]);

  const { mutate: updateZone, isPending: isSaving } = useMutation({
    mutationFn: updateZoneAPI,
    onSuccess: (res) => {
      if (res?.success === false) {
        showAlert(res?.message || "수정에 실패했습니다.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: UNITY_LOCATION_TREE_QUERY_KEY });
    },
    onError: (err) => showAlert(getApiErrorMessage(err, "수정 중 오류가 발생했습니다.")),
  });

  const toggleFloor = (floorId) => {
    setCollapsedFloors((prev) => {
      const next = new Set(prev);
      next.has(floorId) ? next.delete(floorId) : next.add(floorId);
      return next;
    });
  };

  const openCreateModal = () => {
    openModal({
      title: "Zone 생성",
      hideFooter: true,
      wide: true,
      content: (
        <ZoneCreateModal
          tree={tree}
          defaultBuildingId={building?.buildingId ?? null}
          defaultFloorId={floorFilter !== "all" ? Number(floorFilter) : null}
          onClose={closeModal}
        />
      ),
    });
  };

  const handleSave = () => {
    if (!selected) return;
    if (!editName.trim()) {
      showAlert("Zone명을 입력하세요.");
      return;
    }
    if (!editMesh.trim()) {
      showAlert("mesh_collider ID를 입력하세요.");
      return;
    }
    updateZone({
      zoneId: selected.zone.zoneId,
      floorId: selected.floor.floorId,
      zoneName: editName.trim(),
      zoneMeshName: editMesh.trim(),
      meshType: editMeshType,
    });
  };

  return (
    <AdminPageTemplate title="Zone 관리" description="빌딩·층별 구역(Zone)을 조회·등록·수정합니다.">
      <Toolbar>
        <FilterGroup>
          <FilterLabel>빌딩</FilterLabel>
          <Select
            value={buildingId}
            onChange={(e) => {
              setBuildingId(e.target.value);
              setFloorFilter("all");
              setSelectedZoneId(null);
            }}
          >
            {tree.length === 0 && <option value="">빌딩 없음</option>}
            {tree.map((b) => (
              <option key={b.buildingId} value={b.buildingId}>
                {b.buildingName}
              </option>
            ))}
          </Select>
          <FilterLabel>층</FilterLabel>
          <Select value={floorFilter} onChange={(e) => setFloorFilter(e.target.value)}>
            <option value="all">전체</option>
            {floors.map((f) => (
              <option key={f.floorId} value={f.floorId}>
                {f.floorName}
              </option>
            ))}
          </Select>
          <Button variant="secondary" onClick={() => refetch()}>
            검색
          </Button>
        </FilterGroup>
        <Button variant="primary" onClick={openCreateModal}>
          + Zone 생성
        </Button>
      </Toolbar>

      <Body>
        <TreePanel>
          <PanelTitle>구역 계층 트리</PanelTitle>
          {isLoading ? (
            <Muted>불러오는 중…</Muted>
          ) : isError ? (
            <Muted>{error?.message ?? "트리를 불러오지 못했습니다."}</Muted>
          ) : !building ? (
            <Muted>표시할 빌딩이 없습니다.</Muted>
          ) : (
            <Tree>
              <BuildingNode>▼ {building.buildingName}</BuildingNode>
              {visibleFloors.length === 0 ? (
                <Muted style={{ paddingLeft: 16 }}>층 정보가 없습니다.</Muted>
              ) : (
                visibleFloors.map((f) => {
                  const collapsed = collapsedFloors.has(f.floorId);
                  const zones = f.zoneList ?? [];
                  return (
                    <FloorBlock key={f.floorId}>
                      <FloorNode type="button" onClick={() => toggleFloor(f.floorId)}>
                        {collapsed ? "▶" : "▼"} {f.floorName}{" "}
                        <Count>(Zone {zones.length}개)</Count>
                      </FloorNode>
                      {!collapsed &&
                        (zones.length === 0 ? (
                          <ZoneEmpty>구역 없음</ZoneEmpty>
                        ) : (
                          zones.map((z) => (
                            <ZoneNode
                              key={z.zoneId}
                              type="button"
                              $active={z.zoneId === selectedZoneId}
                              onClick={() => setSelectedZoneId(z.zoneId)}
                            >
                              ▸ {z.zoneName}
                            </ZoneNode>
                          ))
                        ))}
                    </FloorBlock>
                  );
                })
              )}
            </Tree>
          )}
        </TreePanel>

        <DetailPanel>
          {!selected ? (
            <Muted>왼쪽 트리에서 구역을 선택하세요.</Muted>
          ) : (
            <>
              <DetailHeader>{selected.zone.zoneName}</DetailHeader>
              <DetailGrid>
                <Field>
                  <FieldLabel>Zone명</FieldLabel>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={200} />
                </Field>
                <Field>
                  <FieldLabel>Zone ID</FieldLabel>
                  <ReadOnlyValue>{selected.zone.zoneId}</ReadOnlyValue>
                </Field>
                <Field>
                  <FieldLabel>소속</FieldLabel>
                  <ReadOnlyValue>
                    {selected.building.buildingName} / {selected.floor.floorName}
                  </ReadOnlyValue>
                </Field>
                <Field>
                  <FieldLabel>mesh_collider ID</FieldLabel>
                  <Input value={editMesh} onChange={(e) => setEditMesh(e.target.value)} maxLength={200} />
                </Field>
                <Field>
                  <FieldLabel>메쉬 타입</FieldLabel>
                  <Select value={editMeshType} onChange={(e) => setEditMeshType(e.target.value)}>
                    <option value="2D">2D</option>
                    <option value="3D">3D</option>
                  </Select>
                </Field>
              </DetailGrid>

              <Notice>
                ⚠ 삭제는 지원하지 않습니다 — 3D mesh_collider 사전 빌드 제약. 조회·등록·수정만
                가능합니다.
              </Notice>

              <DetailActions>
                <Button variant="primary" onClick={handleSave} disabled={isSaving}>
                  수정 저장
                </Button>
              </DetailActions>
            </>
          )}
        </DetailPanel>
      </Body>
    </AdminPageTemplate>
  );
};

export default ZoneManagePage;

const Body = styled.div`
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 16px;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.div`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 16px 18px;
`;

const TreePanel = styled(Panel)``;
const DetailPanel = styled(Panel)`
  min-height: 240px;
`;

const PanelTitle = styled.h3`
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 700;
  color: #111d2c;
`;

const Tree = styled.div`
  font-size: 14px;
`;

const BuildingNode = styled.div`
  font-weight: 700;
  color: #111d2c;
  padding: 4px 0;
`;

const FloorBlock = styled.div`
  margin-left: 12px;
`;

const FloorNode = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px 0;
  font-weight: 600;
  color: #374151;
`;

const Count = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: #9ca3af;
`;

const ZoneNode = styled.button<{ $active?: boolean }>`
  display: block;
  width: 100%;
  text-align: left;
  margin-left: 16px;
  padding: 6px 10px;
  border: 1px solid ${(p) => (p.$active ? "#bfdbfe" : "transparent")};
  border-radius: 6px;
  background: ${(p) => (p.$active ? "#eff6ff" : "transparent")};
  color: ${(p) => (p.$active ? "#1d4ed8" : "#374151")};
  font-weight: ${(p) => (p.$active ? 600 : 400)};
  cursor: pointer;
  &:hover {
    background: ${(p) => (p.$active ? "#eff6ff" : "#f3f4f6")};
  }
`;

const ZoneEmpty = styled.div`
  margin-left: 16px;
  padding: 6px 10px;
  font-size: 13px;
  color: #9ca3af;
`;

const DetailHeader = styled.h2`
  margin: 0 0 18px;
  font-size: 18px;
  font-weight: 700;
  color: #111d2c;
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 24px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FieldLabel = styled.span`
  font-size: 12px;
  color: #9ca3af;
`;

const ReadOnlyValue = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #111d2c;
  padding: 8px 0;
`;

const Notice = styled.div`
  margin-top: 18px;
  padding: 12px 14px;
  font-size: 13px;
  color: #92660a;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  line-height: 1.5;
`;

const DetailActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 18px;
`;

const Muted = styled.div`
  color: #9ca3af;
  font-size: 14px;
  padding: 12px 0;
`;
