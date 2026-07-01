import { useMemo, useState } from "react";
import styled from "styled-components";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createZoneAPI,
  UNITY_LOCATION_TREE_QUERY_KEY,
} from "@/services/unityZoneService";
import { Button, Input, Select } from "@/components/ui";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

/**
 * Zone 생성 모달.
 * 빌딩 → 층 선택 시 소속 정보가 표시되고, Zone명 / mesh_collider ID 입력 후 등록한다.
 * (위치 트리는 building → floor → zone 구조. 동(dong) 레벨은 데이터에 없음)
 */
const ZoneCreateModal = ({ tree = [], defaultBuildingId = null, defaultFloorId = null, onClose }) => {
  const queryClient = useQueryClient();

  const [buildingId, setBuildingId] = useState(
    defaultBuildingId != null ? String(defaultBuildingId) : (tree[0] ? String(tree[0].buildingId) : "")
  );
  const building = useMemo(
    () => tree.find((b) => String(b.buildingId) === buildingId) ?? null,
    [tree, buildingId]
  );
  const floors = building?.floorList ?? [];

  const [floorId, setFloorId] = useState(
    defaultFloorId != null ? String(defaultFloorId) : ""
  );
  const floor = useMemo(
    () => floors.find((f) => String(f.floorId) === floorId) ?? null,
    [floors, floorId]
  );

  const [zoneName, setZoneName] = useState("");
  const [zoneMeshName, setZoneMeshName] = useState("");
  const [meshType, setMeshType] = useState("2D"); // WA-ZONE 기본 2D

  const { mutate: createZone, isPending } = useMutation({
    mutationFn: createZoneAPI,
    onSuccess: (res) => {
      if (res?.success === false) {
        window.alert(res?.message || "등록에 실패했습니다.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: UNITY_LOCATION_TREE_QUERY_KEY });
      onClose?.();
    },
    onError: (err) => window.alert(getApiErrorMessage(err, "Zone 등록 중 오류가 발생했습니다.")),
  });

  const handleBuildingChange = (e) => {
    setBuildingId(e.target.value);
    setFloorId(""); // 빌딩 바뀌면 층 초기화
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!floorId) {
      window.alert("층을 선택하세요.");
      return;
    }
    if (!zoneName.trim()) {
      window.alert("Zone명을 입력하세요.");
      return;
    }
    if (!zoneMeshName.trim()) {
      window.alert("mesh_collider ID를 입력하세요.");
      return;
    }
    createZone({
      floorId: Number(floorId),
      zoneName: zoneName.trim(),
      zoneMeshName: zoneMeshName.trim(),
      meshType,
    });
  };

  return (
    <Form onSubmit={handleSubmit}>
      <FieldRow>
        <Label $required>빌딩</Label>
        <Select value={buildingId} onChange={handleBuildingChange}>
          {tree.length === 0 && <option value="">빌딩 없음</option>}
          {tree.map((b) => (
            <option key={b.buildingId} value={b.buildingId}>
              {b.buildingName}
            </option>
          ))}
        </Select>
      </FieldRow>

      <FieldRow>
        <Label $required>층</Label>
        <Select value={floorId} onChange={(e) => setFloorId(e.target.value)}>
          <option value="">층 선택</option>
          {floors.map((f) => (
            <option key={f.floorId} value={f.floorId}>
              {f.floorName}
            </option>
          ))}
        </Select>
      </FieldRow>

      <FieldRow>
        <Label>소속</Label>
        <Belong>
          {building ? building.buildingName : "—"} / {floor ? floor.floorName : "—"}
        </Belong>
      </FieldRow>

      <FieldRow>
        <Label $required>Zone명</Label>
        <Input
          value={zoneName}
          onChange={(e) => setZoneName(e.target.value)}
          placeholder="예: 업무구역A"
          maxLength={200}
        />
      </FieldRow>

      <FieldRow>
        <Label $required>mesh_collider ID</Label>
        <Input
          value={zoneMeshName}
          onChange={(e) => setZoneMeshName(e.target.value)}
          placeholder="예: mc_B_1F_zone01"
          maxLength={200}
        />
      </FieldRow>

      <FieldRow>
        <Label $required>메쉬 타입</Label>
        <Select value={meshType} onChange={(e) => setMeshType(e.target.value)}>
          <option value="2D">2D</option>
          <option value="3D">3D</option>
        </Select>
      </FieldRow>

      <ButtonRow>
        <Button variant="outline" type="button" onClick={onClose}>
          취소
        </Button>
        <Button variant="primary" type="submit" disabled={isPending}>
          등록
        </Button>
      </ButtonRow>
    </Form>
  );
};

export default ZoneCreateModal;

const Form = styled.form`
  width: min(92vw, 480px);
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: 10px;
  align-items: center;
  margin-bottom: 14px;
`;

const Label = styled.label<{ $required?: boolean }>`
  font-size: 14px;
  color: #374151;
  &::after {
    content: "${(p) => (p.$required ? " *" : "")}";
    color: #dc2626;
  }
`;

const Belong = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #111d2c;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 14px;
  margin-top: 4px;
  border-top: 1px solid #e5e7eb;
`;
