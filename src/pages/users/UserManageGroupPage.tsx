import styled from "styled-components";
import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import RoleManageModal from "@/components/modal/user/RoleManageModal";
import { useModal } from "@/contexts/ModalContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteRoleAPI,
  fetchRolesList,
  ROLES_LIST_QUERY_KEY,
} from "@/services/roleService";
import { Button, Badge } from "@/components/ui";

/**
 * 권한(Role / tbl_role) 관리 — 카드 그리드
 * 카드: 권한명 · 소속 인원 · 설명 · 수정/삭제
 * 등록/수정 모달에서 소속 사용자 추가·제외까지 처리
 */
const UserManageGroupPage = () => {
  const { openModal, closeModal } = useModal();
  const queryClient = useQueryClient();

  const {
    data: roles = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ROLES_LIST_QUERY_KEY,
    queryFn: fetchRolesList,
  });

  const { mutate: deleteRole } = useMutation({
    mutationFn: deleteRoleAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_LIST_QUERY_KEY });
      closeModal();
    },
  });

  const openRegisterModal = () => {
    openModal({
      title: "권한 등록",
      hideFooter: true,
      wide: true,
      content: <RoleManageModal mode="create" onClose={closeModal} />,
    });
  };

  const openEditModal = (row) => {
    openModal({
      title: "권한 수정",
      hideFooter: true,
      wide: true,
      content: <RoleManageModal mode="edit" initial={row} onClose={closeModal} />,
    });
  };

  const openDeleteModal = (row) => {
    openModal({
      title: "권한 삭제 확인",
      content: (
        <DeleteMessage>
          권한 <strong>{row.roleName}</strong> 을(를) 삭제할까요?
          <br />
          <SmallText>
            소속된 사용자가 있으면 서버에서 삭제가 거절됩니다. (먼저 소속 사용자를 해제하세요)
          </SmallText>
        </DeleteMessage>
      ),
      onConfirm: () => deleteRole(row.roleId),
    });
  };

  return (
    <AdminPageTemplate
      title="권한 관리"
      description="역할(Role) 마스터를 등록·수정·삭제하고, 권한별 소속 사용자를 관리합니다."
    >
      <HeaderBar>
        <Button variant="primary" onClick={openRegisterModal}>
          + 권한 등록
        </Button>
      </HeaderBar>

      {isLoading ? (
        <StateBox>불러오는 중…</StateBox>
      ) : isError ? (
        <StateBox>{error?.message ?? "권한 목록을 불러오지 못했습니다."}</StateBox>
      ) : roles.length === 0 ? (
        <StateBox>등록된 권한이 없습니다.</StateBox>
      ) : (
        <CardGrid>
          {roles.map((row) => (
            <Card key={row.roleId}>
              <CardTop>
                <RoleName>{row.roleName}</RoleName>
                <Badge tone="info">{row.userCount ?? 0}명</Badge>
              </CardTop>
              <CardDesc>{row.description || "—"}</CardDesc>
              <CardActions>
                <Button variant="secondary" size="sm" onClick={() => openEditModal(row)}>
                  수정
                </Button>
                <Button variant="danger" size="sm" onClick={() => openDeleteModal(row)}>
                  삭제
                </Button>
              </CardActions>
            </Card>
          ))}
        </CardGrid>
      )}
    </AdminPageTemplate>
  );
};

export default UserManageGroupPage;

const HeaderBar = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 18px 20px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
`;

const CardTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
`;

const RoleName = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #111d2c;
`;

const CardDesc = styled.p`
  margin: 0 0 16px;
  font-size: 13px;
  color: #6b7280;
  min-height: 18px;
`;

const CardActions = styled.div`
  display: flex;
  gap: 8px;
`;

const StateBox = styled.div`
  padding: 40px 0;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
`;

const DeleteMessage = styled.div`
  text-align: left;
  line-height: 1.6;
  color: #374151;
`;

const SmallText = styled.span`
  display: block;
  margin-top: 10px;
  font-size: 12px;
  color: #6b7280;
`;
