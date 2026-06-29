import { useEffect, useState } from "react";
import styled from "styled-components";

/**
 * 콜라이더(존) 등록·수정 폼
 * @param {{
 *   mode?: "create" | "edit";
 *   initial?: any;
 *   floorOptions?: Array<{ floorId: number; floorNum?: number | null; floorName: string }>;
 *   defaultFloorId?: number | null;
 *   onSubmit?: (payload: any) => void;
 *   onCancel?: () => void;
 * }} props
 */
const ColliderManageForm = ({
  mode = "create",
  initial = null,
  floorOptions = [],
  defaultFloorId = null,
  onSubmit,
  onCancel,
}) => {
  const [floorId, setFloorId] = useState("");
  const [zoneName, setZoneName] = useState("");
  const [zoneMeshName, setZoneMeshName] = useState("");

  useEffect(() => {
    if (mode === "edit" && initial) {
      setFloorId(initial.floorId != null ? String(initial.floorId) : "");
      setZoneName(initial.zoneName ?? "");
      setZoneMeshName(initial.zoneMeshName ?? "");
    } else {
      setFloorId(defaultFloorId != null ? String(defaultFloorId) : "");
      setZoneName("");
      setZoneMeshName("");
    }
  }, [mode, initial, defaultFloorId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!floorId) {
      window.alert("층을 선택하세요.");
      return;
    }
    const name = zoneName.trim();
    const mesh = zoneMeshName.trim();
    if (!name || !mesh) return;

    const payload = {
      floorId: Number(floorId),
      zoneName: name,
      zoneMeshName: mesh,
    };
    if (mode === "edit" && initial) {
      onSubmit?.({ zoneId: initial.zoneId, ...payload });
    } else {
      onSubmit?.(payload);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      {mode === "edit" && initial && (
        <FieldRow>
          <Label>존 ID</Label>
          <ReadOnly>{initial.zoneId}</ReadOnly>
        </FieldRow>
      )}

      <FieldRow>
        <Label $required>층 (floor)</Label>
        <Select value={floorId} onChange={(e) => setFloorId(e.target.value)} required>
          <option value="">층 선택</option>
          {floorOptions.map((f) => (
            <option key={f.floorId} value={f.floorId}>
              {f.floorName}
              {f.floorNum != null ? ` (${f.floorNum})` : ""}
            </option>
          ))}
        </Select>
      </FieldRow>

      <FieldRow>
        <Label $required>이름 (name)</Label>
        <Input
          value={zoneName}
          onChange={(e) => setZoneName(e.target.value)}
          placeholder="예: 주차장"
          maxLength={200}
          required
        />
      </FieldRow>

      <FieldRow>
        <Label $required>mesh_name</Label>
        <InputWrap>
          <Input
            value={zoneMeshName}
            onChange={(e) => setZoneMeshName(e.target.value)}
            placeholder="예: collider_b2f_parking_01"
            maxLength={200}
            required
          />
          <InputHint>등록 시 mesh_name 중복 여부를 서버에서 검사합니다.</InputHint>
        </InputWrap>
      </FieldRow>

      <ButtonRow>
        <CancelButton type="button" onClick={onCancel}>
          취소
        </CancelButton>
        <SubmitButton type="submit">{mode === "edit" ? "저장" : "등록"}</SubmitButton>
      </ButtonRow>
    </Form>
  );
};

export default ColliderManageForm;

const Form = styled.form`
  width: 100%;
  max-width: 560px;
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 10px;
  align-items: start;
  margin-bottom: 14px;
`;

const Label = styled.label`
  font-size: 14px;
  color: #374151;
  padding-top: 8px;
  &::after {
    content: "${(p) => (p.$required ? " *" : "")}";
    color: #dc2626;
  }
`;

const InputWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Input = styled.input`
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
  &:focus {
    border-color: #4a90d9;
  }
`;

const Select = styled.select`
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  outline: none;
  &:focus {
    border-color: #4a90d9;
  }
`;

const InputHint = styled.span`
  font-size: 12px;
  color: #64748b;
`;

const ReadOnly = styled.span`
  padding-top: 8px;
  font-size: 14px;
  color: #6b7280;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #e8eaed;
`;

const CancelButton = styled.button`
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  cursor: pointer;
  &:hover {
    background: #f3f4f6;
  }
`;

const SubmitButton = styled.button`
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  color: #1565c0;
  background: #e3f2fd;
  border: 1px solid #2196f3;
  border-radius: 8px;
  cursor: pointer;
  &:hover {
    background: #bbdefb;
  }
`;
