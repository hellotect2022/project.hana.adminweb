import { showAlert } from "@/utils/dialogBridge";
import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchLocationTree,
  UNITY_LOCATION_TREE_QUERY_KEY,
} from "@/services/unityZoneService";
import {
  createZonePolicyWithZoneAPI,
  ZONE_POLICY_QUERY_KEY,
  ZONE_POLICY_SUMMARY_QUERY_KEY,
} from "@/services/spaceZoneService";
import { Button, Input, Select, Toggle } from "@/components/ui";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

/**
 * 조명/화재 구역 추가 — 빌딩/층 선택 + 구역명/mesh_collider ID 입력 시
 * 새 Zone(위치, mesh_type=3D)과 표현정책을 동시에 생성한다.
 */
const ZonePolicyCreateModal = ({ systemType, onClose }) => {
  const queryClient = useQueryClient();
  const isFire = systemType === "FIRE_DETECTION";

  const { data: tree = [] } = useQuery({
    queryKey: UNITY_LOCATION_TREE_QUERY_KEY,
    queryFn: fetchLocationTree,
  });

  const [buildingId, setBuildingId] = useState("");
  // 트리 로드 후 첫 빌딩 자동 선택 (초기엔 tree가 비어 있어 useState 초기화로는 못 잡음)
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

  const [floorId, setFloorId] = useState("");
  const floor = useMemo(
    () => floors.find((f) => String(f.floorId) === floorId) ?? null,
    [floors, floorId]
  );

  const [zoneName, setZoneName] = useState("");
  const [zoneMeshName, setZoneMeshName] = useState("");
  const [colorCode, setColorCode] = useState("#00CC88");
  const [opacity, setOpacity] = useState<number | string>(30);
  const [active, setActive] = useState(true);
  const [evacuationAutoShow, setEvacuationAutoShow] = useState(false);

  const { mutate: create, isPending } = useMutation({
    mutationFn: createZonePolicyWithZoneAPI,
    onSuccess: (res) => {
      if (res?.success === false) {
        showAlert(res?.message || "등록에 실패했습니다.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ZONE_POLICY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ZONE_POLICY_SUMMARY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: UNITY_LOCATION_TREE_QUERY_KEY });
      onClose?.();
    },
    onError: (err) => showAlert(getApiErrorMessage(err, "구역 등록 중 오류가 발생했습니다.")),
  });

  const handleBuildingChange = (e) => {
    setBuildingId(e.target.value);
    setFloorId("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!floorId) {
      showAlert("층을 선택하세요.");
      return;
    }
    if (!zoneName.trim()) {
      showAlert("구역명을 입력하세요.");
      return;
    }
    if (!zoneMeshName.trim()) {
      showAlert("mesh_collider ID를 입력하세요.");
      return;
    }
    create({
      floorId: Number(floorId),
      zoneName: zoneName.trim(),
      zoneMeshName: zoneMeshName.trim(),
      systemType,
      displayName: zoneName.trim(),
      colorCode: colorCode.trim() || null,
      opacity: Number(opacity),
      active,
      evacuationAutoShow: isFire ? evacuationAutoShow : null,
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
          {building ? building.buildingName : "—"} / {floor ? floor.floorName : "—"}{" "}
          <MeshTag>3D</MeshTag>
        </Belong>
      </FieldRow>
      <FieldRow>
        <Label $required>구역명</Label>
        <Input
          value={zoneName}
          onChange={(e) => setZoneName(e.target.value)}
          placeholder="예: 조명구역 B1F-01"
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
        <Label>색상 코드</Label>
        <ColorRow>
          <input type="color" value={colorCode} onChange={(e) => setColorCode(e.target.value)} />
          <Input
            value={colorCode}
            onChange={(e) => setColorCode(e.target.value)}
            placeholder="#00CC88"
            maxLength={16}
            style={{ width: 140 }}
          />
        </ColorRow>
      </FieldRow>
      <FieldRow>
        <Label>투명도(%)</Label>
        <Input
          type="number"
          min={0}
          max={100}
          value={opacity}
          onChange={(e) => setOpacity(e.target.value)}
          style={{ width: 120 }}
        />
      </FieldRow>
      <FieldRow>
        <Label>활성</Label>
        <Toggle on={active} onClick={() => setActive((v) => !v)}>
          {active ? "활성" : "비활성"}
        </Toggle>
      </FieldRow>
      {isFire && (
        <FieldRow>
          <Label>피난대피로 자동 표시</Label>
          <Toggle on={evacuationAutoShow} onClick={() => setEvacuationAutoShow((v) => !v)}>
            {evacuationAutoShow ? "연동" : "미연동"}
          </Toggle>
        </FieldRow>
      )}
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

export default ZonePolicyCreateModal;

const Form = styled.form`
  width: min(92vw, 460px);
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
  display: flex;
  align-items: center;
  gap: 8px;
`;

const MeshTag = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: #4338ca;
  background: #eef2ff;
  border-radius: 999px;
  padding: 1px 8px;
`;

const ColorRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  input[type="color"] {
    width: 38px;
    height: 34px;
    padding: 0;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: #fff;
    cursor: pointer;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 14px;
  margin-top: 4px;
  border-top: 1px solid #e5e7eb;
`;
