import { useMemo, useState } from "react";
import styled from "styled-components";
import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import UserRegisterForm from "@/components/modal/user/UserRegisterForm";
import UserEditModalForm from "@/components/modal/user/UserEditModalForm";
import { useModal } from "@/contexts/ModalContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {createUserAPI, deleteUserAPI, fetchUsersAPI, updateUserAPI } from "@/services/userService";
import Pagination from "@/components/common/Pagination";


/**
 * 사용자 관리 — 검색/등록 + 목록
 * 등록·수정·삭제는 ModalContext 기반 모달
 */
const UserManagePage = () => {
  const { openModal, closeModal } = useModal();

  const [typeFilter, setTypeFilter] = useState("all");
  const [searchField, setSearchField] = useState("loginId");
  const [keywordInput, setKeywordInput] = useState("");

  const [page, setPage] = useState(0); // 서버 기준 0부터 시작
  const [searchKeyword, setSearchKeyword] = useState({});
  
  const queryClient = useQueryClient()
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
      ...(trimmedKeyword && {[searchField]:trimmedKeyword})
    }
    //setSearchKeyword(keywordInput.trim());
    setSearchKeyword(searchParam)
    setPage(0)

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
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">전체</option>
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
          </Select>
          <Select value={searchField} onChange={(e) => setSearchField(e.target.value)}>
            <option value="loginId">아이디</option>
            <option value="username">이름</option>
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
          사용자 등록
        </RegisterButton>
      </Toolbar>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>번호</Th>
              <Th>아이디</Th>
              <Th>이름</Th>
              {/* <Th>그룹명</Th> */}
              <Th $center>관리</Th>
            </tr>
          </thead>
          <tbody>
            {fetchUsers?.length === 0 ? (
              <tr>
                <Td colSpan={5}>조건에 맞는 사용자가 없습니다.</Td>
              </tr>
            ) : (
              fetchUsers?.map((row) => (
                <tr key={row.userId}>
                  <Td>{row.userId}</Td>
                  <Td>{row.loginId}</Td>
                  <Td>{row.username}</Td>
                  {/* <Td>{row.roleName}</Td> */}
                  <Td $center>
                    <EditBtn type="button" onClick={() => openEditModal(row)}>
                      수정
                    </EditBtn>
                    <DeleteBtn type="button" onClick={() => openDeleteModal(row)}>
                      삭제
                    </DeleteBtn>
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

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
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
  min-width: 100px;
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
  ${(p) => p.$center && "text-align: center;"}
`;

const Td = styled.td`
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  color: #111827;
  ${(p) => p.$center && "text-align: center;"}
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

export default UserManagePage;
