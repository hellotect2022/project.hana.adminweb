import { useState, useEffect } from "react";
import styled from "styled-components";

/**
 * 권한(Role / tbl_role) 등록·수정 폼
 * Entity: roleId, roleName(unique), description (+ DateEntity createdAt/updatedAt)
 * 필요 API: POST /roles, PUT /roles/{id}
 */
const RoleManageForm = ({ mode = "create", initial = null, onSubmit, onCancel }) => {
  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (mode === "edit" && initial) {
      setRoleName(initial.roleName ?? "");
      setDescription(initial.description ?? "");
    } else {
      setRoleName("");
      setDescription("");
    }
  }, [mode, initial]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = roleName.trim();
    if (!name) return;
    if (mode === "edit" && initial) {
      onSubmit?.({
        roleId: initial.roleId,
        roleName: name,
        description: description.trim(),
      });
    } else {
      onSubmit?.({
        roleName: name,
        description: description.trim(),
      });
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      {mode === "edit" && initial && (
        <FieldRow>
          <Label>권한 ID</Label>
          <ReadOnly>{initial.roleId}</ReadOnly>
        </FieldRow>
      )}
      <FieldRow>
        <Label $required>권한명</Label>
        <Input
          value={roleName}
          onChange={(e) => setRoleName(e.target.value)}
          placeholder="역할 고유명 (roleName)"
          maxLength={100}
          required
        />
      </FieldRow>
      <FieldRow>
        <Label>설명</Label>
        <TextArea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="권한에 대한 설명"
          rows={4}
        />
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

const Form = styled.form`
  width: 100%;
  max-width: 480px;
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 100px 1fr;
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

const ReadOnly = styled.div`
  font-size: 14px;
  color: #6b7280;
  padding-top: 8px;
`;

const Input = styled.input`
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  width: 100%;
  box-sizing: border-box;
`;

const TextArea = styled.textarea`
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  font-family: inherit;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
`;

const CancelButton = styled.button`
  padding: 8px 18px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
`;

const SubmitButton = styled.button`
  padding: 8px 18px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: #4a6380;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  &:hover {
    background: #3d5370;
  }
`;

export default RoleManageForm;
