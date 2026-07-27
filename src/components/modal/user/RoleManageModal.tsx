import { showAlert } from "@/utils/dialogBridge";
import { useState } from "react";
import styled from "styled-components";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createRoleAPI,
  updateRoleAPI,
  ROLES_LIST_QUERY_KEY,
} from "@/services/roleService";
import { Button } from "@/components/ui";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import RoleMembersModalContent from "./RoleMembersModalContent";

/**
 * 권한 등록/수정 + 소속 사용자 추가·제외를 한 모달에서 처리.
 * - edit: 기존 권한이므로 이름/설명 + 소속 사용자 관리를 함께 표시.
 * - create: 먼저 이름/설명으로 권한을 등록하면, 그 자리에서 소속 사용자 관리가 열린다.
 */
const RoleManageModal = ({ mode = "create", initial = null, onClose }) => {
  const queryClient = useQueryClient();
  const [roleName, setRoleName] = useState(initial?.roleName ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  // 멤버 관리를 위한 "확정된" 권한(roleId 보유). edit면 initial, create면 등록 후 채워짐.
  const [role, setRole] = useState(mode === "edit" ? initial : null);
  const [savedMsg, setSavedMsg] = useState("");

  const { mutate: createRole, isPending: isCreating } = useMutation({
    mutationFn: createRoleAPI,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ROLES_LIST_QUERY_KEY });
      const created = res?.data?.data;
      if (created?.roleId) {
        setRole(created);
        setRoleName(created.roleName ?? roleName);
        setSavedMsg("권한이 등록되었습니다. 이제 소속 사용자를 추가할 수 있습니다.");
      }
    },
    onError: (err) => showAlert(getApiErrorMessage(err, "권한 등록에 실패했습니다.")),
  });

  const { mutate: updateRole, isPending: isUpdating } = useMutation({
    mutationFn: updateRoleAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_LIST_QUERY_KEY });
      setSavedMsg("저장되었습니다.");
    },
    onError: (err) => showAlert(getApiErrorMessage(err, "권한 수정에 실패했습니다.")),
  });

  const handleSaveInfo = (e) => {
    e.preventDefault();
    const name = roleName.trim();
    if (!name) {
      showAlert("권한명을 입력하세요.");
      return;
    }
    if (role?.roleId) {
      updateRole({ roleId: role.roleId, roleName: name, description: description.trim() });
    } else {
      // 신규 등록은 권한명을 대문자로 통일
      createRole({ roleName: name.toUpperCase(), description: description.trim() });
    }
  };

  const saving = isCreating || isUpdating;

  return (
    <Wrap>
      <InfoForm onSubmit={handleSaveInfo}>
        <SectionTitle>{role?.roleId ? "권한 정보" : "새 권한 등록"}</SectionTitle>
        {role?.roleId && (
          <FieldRow>
            <Label>권한 ID</Label>
            <ReadOnly>{role.roleId}</ReadOnly>
          </FieldRow>
        )}
        <FieldRow>
          <Label $required>권한명</Label>
          <Input
            value={roleName}
            onChange={(e) => {
              setRoleName(e.target.value);
              setSavedMsg("");
            }}
            placeholder="역할 고유명 (예: MANAGER)"
            maxLength={100}
            required
          />
        </FieldRow>
        <FieldRow>
          <Label>설명</Label>
          <TextArea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setSavedMsg("");
            }}
            placeholder="권한에 대한 설명"
            rows={3}
          />
        </FieldRow>
        <InfoActions>
          {savedMsg && <SavedMsg>{savedMsg}</SavedMsg>}
          <Button variant="primary" type="submit" disabled={saving}>
            {role?.roleId ? "정보 저장" : "권한 등록"}
          </Button>
        </InfoActions>
      </InfoForm>

      <Divider />

      {role?.roleId ? (
        <RoleMembersModalContent role={role} embedded />
      ) : (
        <MembersHint>
          먼저 위에서 <strong>권한을 등록</strong>하면, 이 자리에서 소속 사용자를 추가·제외할 수
          있습니다.
        </MembersHint>
      )}

      <FooterRow>
        <Button variant="outline" onClick={onClose}>
          닫기
        </Button>
      </FooterRow>
    </Wrap>
  );
};

export default RoleManageModal;

const Wrap = styled.div`
  width: min(92vw, 640px);
`;

const InfoForm = styled.form`
  margin-bottom: 4px;
`;

const SectionTitle = styled.h3`
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 700;
  color: #111d2c;
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 10px;
  align-items: start;
  margin-bottom: 12px;
`;

const Label = styled.label<{ $required?: boolean }>`
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
  &:focus {
    outline: none;
    border-color: #4a90d9;
  }
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
  &:focus {
    outline: none;
    border-color: #4a90d9;
  }
`;

const InfoActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
`;

const SavedMsg = styled.span`
  font-size: 13px;
  color: #15803d;
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 16px 0;
`;

const MembersHint = styled.p`
  margin: 0;
  padding: 16px;
  font-size: 13px;
  color: #6b7280;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  line-height: 1.55;
`;

const FooterRow = styled.div`
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
  margin-top: 8px;
  border-top: 1px solid #e5e7eb;
`;
