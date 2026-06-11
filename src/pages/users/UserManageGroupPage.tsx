import { useMemo, useState } from "react";
import styled from "styled-components";
import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import RoleManageForm from "@/components/modal/user/RoleManageForm";
import RoleMembersModalContent from "@/components/modal/user/RoleMembersModalContent";
import { useModal } from "@/contexts/ModalContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRoleAPI,
  deleteRoleAPI,
  fetchRolesList,
  ROLES_LIST_QUERY_KEY,
  updateRoleAPI,
} from "@/services/roleService";


/**
 * 권한(Role / tbl_role) 관리
 * 역할 목록 + 소속 인원(클릭 시 모달에서 사용자 목록·검색 추가)
 */
const UserManageGroupPage = () => {
  const { openModal, closeModal } = useModal();

  const [searchField, setSearchField] = useState("roleName");
  const [keywordInput, setKeywordInput] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const queryClient = useQueryClient(); // 2. 인스턴스 가져오기

  // 조회용 
  const {
    data: fetchRoles = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ROLES_LIST_QUERY_KEY,
    queryFn: fetchRolesList,
  });

  // 생성용
  const { mutate: createRole } = useMutation({
    mutationFn: createRoleAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_LIST_QUERY_KEY });
      closeModal();
    }
  });

  // 수정용
  const { mutate: updateRole } = useMutation({
    mutationFn: updateRoleAPI,
    onSuccess: () => {
      console.log("✅ 성공!"); // 호출 안 됨
      queryClient.invalidateQueries({ queryKey: ROLES_LIST_QUERY_KEY });
      closeModal();
    }
  });

  // 삭제용
  const { mutate: deleteRole } = useMutation({
    mutationFn: deleteRoleAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROLES_LIST_QUERY_KEY });
      closeModal();
    }
  });


  const handleSearchClick = () => {
    setSearchKeyword(keywordInput.trim());
  };

  const filtered = useMemo(() => {
    const list = fetchRoles ?? [];
    if (!searchKeyword) return list;
    const k = searchKeyword.toLowerCase();
    return list.filter((row) => {
      if (searchField === "roleName") {
        return row.roleName.toLowerCase().includes(k);
      }
      return (row.description || "").toLowerCase().includes(k);
    });
  }, [fetchRoles, searchField, searchKeyword]);
  

  const openRegisterModal = () => {
    openModal({title: "권한 등록",hideFooter: true,wide: true,content: (
        <RoleManageForm
          mode="create"
          onCancel={closeModal}
          onSubmit={({ roleName: name, description: desc }) => {
            const dup = (fetchRoles ?? []).some((r) => r.roleName.toUpperCase() === name.toUpperCase());
            if (dup) {
              window.alert("이미 같은 권한명이 있습니다. (roleName unique)");
              return;
            }
            createRole({roleName:name.toUpperCase(), description:desc})
          }}
        />
      ),
    });
  };

  const openEditModal = (row) => {
    openModal({title: "권한 수정", hideFooter: true, wide: true,content: (
        <RoleManageForm
          mode="edit"
          initial={row}
          onCancel={closeModal}
          onSubmit={({ roleId, roleName: name, description: desc }) => {
            const dup = (fetchRoles ?? []).some((r) =>r.roleId !== roleId &&r.roleName.toLowerCase() === name.toLowerCase());
            if (dup) {
              window.alert("이미 같은 권한명이 있습니다. (roleName unique)");
              return;
            }
            
            updateRole({ roleId, roleName: name, description: desc });
          }}
        />
      ),
    });
  };

  const openDeleteModal = (row) => {
    openModal({title: "권한 삭제 확인",content: (
        <DeleteMessage>
          권한 <strong>{row.roleName}</strong> 을(를) 삭제할까요?
          <br />
          <SmallText>
            UserRole 등에서 참조 중이면 서버에서 삭제가 거절될 수 있습니다.
          </SmallText>
        </DeleteMessage>
      ),
      onConfirm: () => {
        deleteRole(row.roleId)
      },
    });
  };

  const openMembersModal = (row) => {
    openModal({
      title: "소속 사용자 관리",
      hideFooter: true,
      wide: true,
      content: (
        <RoleMembersModalContent
          role={row}
          onChange={(next) => {
            setMembersByRoleId((prev) => ({
              ...prev,
              [row.roleId]: next,
            }));
            // TODO: API — POST/DELETE /auth/roles/{roleId}/users/{userId} 등
          }}
          onClose={() => {
            queryClient.invalidateQueries({ queryKey: ROLES_LIST_QUERY_KEY });
            closeModal()
          }}
        />
      ),
    });
  };

  const getMemberCount = (row) => {
    if (row.memberCount != null && row.memberCount !== undefined) {
      return row.memberCount;
    }
    return membersByRoleId[row.roleId]?.length ?? 0;
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <AdminPageTemplate
      title="권한 관리"
      description="역할(Role) 마스터(tbl_role)를 등록·수정·삭제합니다."
    >
      <Toolbar>
        <FilterGroup>
          <Select value={searchField} onChange={(e) => setSearchField(e.target.value)}>
            <option value="roleName">권한명</option>
            <option value="description">설명</option>
          </Select>
          <SearchInput
            placeholder="검색명을 입력하세요"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchClick()}
          />
          <SearchButton type="button" onClick={handleSearchClick}>
            검색
          </SearchButton>
        </FilterGroup>
        <RegisterButton type="button" onClick={openRegisterModal}>
          권한 등록
        </RegisterButton>
      </Toolbar>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>번호</Th>
              <Th>권한명</Th>
              <Th>설명</Th>
              <Th $center>소속 인원</Th>
              <Th $center>관리</Th>
            </tr>
          </thead>
          <tbody>
            {!filtered || filtered.length === 0 ? (
              <tr>
                <Td colSpan={5}>조건에 맞는 권한이 없습니다.</Td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.roleId}>
                  <Td>{row.roleId}</Td>
                  <Td>
                    <RoleNameCell>{row.roleName}</RoleNameCell>
                  </Td>
                  <Td>{row.description || "—"}</Td>
                  <Td $center>
                    <MemberCountBtn
                      type="button"
                      onClick={() => openMembersModal(row)}
                      title="클릭하여 소속 사용자 관리"
                    >
                      {row.userCount}명
                    </MemberCountBtn>
                  </Td>
                  <Td $center>
                    <EditBtn type="button" onClick={() => openEditModal(row)}>수정</EditBtn>
                    <DeleteBtn type="button" onClick={() => openDeleteModal(row)}>삭제</DeleteBtn>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </TableWrap>
    </AdminPageTemplate>
  );
};

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

const Toolbar = styled.div`
  display: flex;
  //flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  min-height: 50px;
  padding: 16px 20px;
  margin-bottom: 16px;
  background: #ffffff;
  border: 1px solid #e1e2e5;
  border-radius: 5px;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: row;
  //flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`;

const Select = styled.select`
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  min-width: 120px;
`;

const SearchInput = styled.input`
  padding: 8px 12px;
  width: min(100%, 260px);
  font-size: 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
  &::placeholder {
    color: #9ca3af;
  }
`;

const SearchButton = styled.button`
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  color: #fff;
  background: #4a6380;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  &:hover {
    background: #3d5370;
  }
`;

const RegisterButton = styled.button`
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: #4a6380;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  &:hover {
    background: #3d5370;
  }
`;

const TableWrap = styled.div`
  overflow-x: auto;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
`;

const Th = styled.th`
  padding: 12px 16px;
  text-align: left;
  font-weight: 700;
  color: #111827;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
  ${(p) => p.$center && "text-align: center;"}
`;

const Td = styled.td`
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  color: #111827;
  ${(p) => p.$center && "text-align: center;"}
`;

const RoleNameCell = styled.span`
  font-weight: 600;
  color: #1976d2;
`;

const MemberCountBtn = styled.button`
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 700;
  color: #0d47a1;
  background: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 999px;
  cursor: pointer;
  min-width: 56px;
  &:hover {
    background: #bbdefb;
    border-color: #42a5f5;
  }
`;

const EditBtn = styled.button`
  padding: 4px 14px;
  margin-right: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: #f59e0b;
  border: 1px solid #d97706;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background: #d97706;
  }
`;

const DeleteBtn = styled.button`
  padding: 4px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: #dc2626;
  border: 1px solid #b91c1c;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background: #b91c1c;
  }
`;

export default UserManageGroupPage;
