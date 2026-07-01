import { useMemo, useState } from "react";
import styled from "styled-components";
import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import UserRegisterForm from "@/components/modal/user/UserRegisterForm";
import UserEditModalForm from "@/components/modal/user/UserEditModalForm";
import { useModal } from "@/contexts/ModalContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {createUserAPI, deleteUserAPI, fetchUsersAPI, updateUserAPI } from "@/services/userService";
import { fetchRolesList, ROLES_LIST_QUERY_KEY } from "@/services/roleService";
import Pagination from "@/components/common/Pagination";
import { Button, Input, Select, Badge, Toolbar, FilterGroup } from "@/components/ui";


/**
 * 사용자 관리 — 검색/등록 + 목록
 * 등록·수정·삭제는 ModalContext 기반 모달
 */
const UserManagePage = () => {
  const { openModal, closeModal } = useModal();

  const [typeFilter, setTypeFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all"); // "all" | roleId
  const [searchField, setSearchField] = useState("loginId");
  const [keywordInput, setKeywordInput] = useState("");

  const [page, setPage] = useState(0); // 서버 기준 0부터 시작
  const [searchKeyword, setSearchKeyword] = useState({});
  
  const queryClient = useQueryClient()

  // 권한그룹 필터용 역할 목록
  const { data: roles = [] } = useQuery({
    queryKey: ROLES_LIST_QUERY_KEY,
    queryFn: fetchRolesList,
  });

  // 1. 조회용
  const {data:{fetchUsers, pagination}={}} = useQuery({
    queryKey: ['fetchUsers',page, searchKeyword],
    queryFn: () => fetchUsersAPI({page, size:10, ...searchKeyword}),
    select: (response) => ({
      fetchUsers: response.data.data.content,
      pagination : {
        totalPages: response.data.data.totalPages,
        currentPage: response.data.data.number,
        totalElements: response.data.data.totalElements,
        isLast: response.data.data.last
      }
    })
  })

  console.log('fetchUsers',fetchUsers)

  // 2. 생성용
  const { mutate: createUser } = useMutation({
    mutationFn: createUserAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fetchUsers'] });
      closeModal();
    }
  });

  // 3. 수정용
  const { mutate: updateUser } = useMutation({
    mutationFn: updateUserAPI,
    onSuccess: () => {
      console.log("✅ 성공! ???"); // 호출 안 됨
      queryClient.invalidateQueries({ queryKey: ['fetchUsers'] });
      console.log("???")
      closeModal();
    },
  });

  // 4.삭제용
    const { mutate: deleteUser } = useMutation({
      mutationFn: deleteUserAPI,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['fetchUsers'] });
        closeModal();
      }
    });

  const handleSearchClick = () => {
    
    const trimmedKeyword = keywordInput.trim()
    let isActive = null;
    if (typeFilter === 'active') isActive = true;
    if (typeFilter === 'inactive') isActive = false;
    const searchParam = {
      ...(isActive != null && {active: isActive}),
      ...(roleFilter !== "all" && { roleId: Number(roleFilter) }),
      ...(trimmedKeyword && {[searchField]:trimmedKeyword})
    }
    //setSearchKeyword(keywordInput.trim());
    setSearchKeyword(searchParam)
    setPage(0)

  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const openRegisterModal = () => {
    openModal({title: "사용자 등록",hideFooter: true,wide: true,
      content: (
        <UserRegisterForm
          onCancel={closeModal}
          onSuccess={(formData) => {
            createUser(formData)
          }}
        />
      ),
    });
  };

  const openEditModal = (row) => {
    openModal({title: "사용자 수정", hideFooter: true, wide: true,
      content: (
        <UserEditModalForm
          user={row}
          onCancel={closeModal}
          onSave={(payload) => {
            updateUser({userId:row.userId, payload})
          }}
        />
      ),
    });
  };

  const openDeleteModal = (row) => {
    openModal({title: "삭제 확인",
      content: `${row.username} (${row.loginId}) 사용자를 삭제할까요?`,
      onConfirm: () => {
        deleteUser(row.userId)
      },
    });
  };

  return (
    <AdminPageTemplate title="사용자 관리" description="">
      <Toolbar>
        <FilterGroup>
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">권한그룹 전체</option>
            {roles.map((r) => (
              <option key={r.roleId} value={r.roleId}>
                {r.roleName}
              </option>
            ))}
          </Select>
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">전체</option>
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
          </Select>
          <Select value={searchField} onChange={(e) => setSearchField(e.target.value)}>
            <option value="loginId">아이디</option>
            <option value="username">이름</option>
          </Select>
          <Input
            placeholder="검색명을 입력하세요"
            style={{ width: "min(100%, 260px)" }}
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchClick()}
          />
          <Button variant="secondary" onClick={handleSearchClick}>
            검색
          </Button>
        </FilterGroup>
        <Button variant="primary" onClick={openRegisterModal}>
          + 사용자 등록
        </Button>
      </Toolbar>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>No</Th>
              <Th>아이디</Th>
              <Th>이름</Th>
              <Th $center>권한그룹</Th>
              <Th $center>최종 로그인</Th>
              <Th $center>관리</Th>
            </tr>
          </thead>
          <tbody>
            {fetchUsers?.length === 0 ? (
              <tr>
                <Td colSpan={6} $center>조건에 맞는 사용자가 없습니다.</Td>
              </tr>
            ) : (
              fetchUsers?.map((row) => (
                <tr key={row.userId}>
                  <Td>{row.userId}</Td>
                  <Td>{row.loginId}</Td>
                  <Td>{row.username}</Td>
                  <Td $center>
                    {row.roles?.length ? (
                      <RoleBadges>
                        {row.roles.map((r) => (
                          <Badge key={r.roleId} tone="info">{r.roleName}</Badge>
                        ))}
                      </RoleBadges>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td $center>{formatDate(row.lastLoginDate)}</Td>
                  <Td $center>
                    <Button variant="secondary" size="sm" onClick={() => openEditModal(row)} style={{ marginRight: 8 }}>
                      수정
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => openDeleteModal(row)}>
                      삭제
                    </Button>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </TableWrap>
      {pagination && <Pagination 
        data={pagination} 
        onPageChange={(targetPage) => setPage(targetPage)}
      />}
    </AdminPageTemplate>
  );
};

const RoleBadges = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
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

const Th = styled.th<{ $center?: boolean }>`
  padding: 12px 16px;
  text-align: left;
  font-weight: 700;
  color: #111827;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  ${(p) => p.$center && "text-align: center;"}
`;

const Td = styled.td<{ $center?: boolean }>`
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  color: #111827;
  ${(p) => p.$center && "text-align: center;"}
`;

export default UserManagePage;
