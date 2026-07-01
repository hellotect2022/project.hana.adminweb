import { addUserToRoleAPI, fetchUsersExceptRoleAPI, fetchUsersInRoleAPI, removeUserFromRoleAPI, ROLES_LIST_QUERY_KEY } from "@/services/roleService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import styled from "styled-components";
import { Button } from "@/components/ui";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

/**
 * 권한(Role)별 소속 사용자 목록 + 검색으로 사용자 추가
 * 필요 API: GET /auth/roles/{roleId}/users, POST 매핑, DELETE 매핑
 * (현재는 onChange로 부모 상태만 갱신 — API 연동 시 mutate 호출로 교체)
 */
const RoleMembersModalContent = ({
  role,
  onChange = (..._a: any[]) => {},
  onClose = () => {},
  embedded = false,
}) => {
  const [searchKey, setSearchKey] = useState("");
  const queryClient = useQueryClient();

  // 권한별 사용자 목록 조회 API 
  const {data:fetchUserInRoles} = useQuery({
    queryKey: ['fetchUserInRoles', role.roleId],
    queryFn: () => fetchUsersInRoleAPI(role.roleId),
    select: (response) => response.data.data
  })

  const {data:fetchUsersExceptRole} = useQuery({
    queryKey: ['fetchUsersExceptRole', role.roleId],
    queryFn: () => fetchUsersExceptRoleAPI(role.roleId, searchKey),
    select: (response) => response.data.data,
    enabled: !!role.roleId // roleId가 있을 때만 실행
  })

  // 1. 사용자 추가 Mutation
  const { mutate: addMember } = useMutation({
    mutationFn: ({roleId, userId}: any) => addUserToRoleAPI(roleId, userId),
    onSuccess: () => {
      // 소속 목록·제외 목록·역할 카드(소속 인원수) 모두 새로고침
      queryClient.invalidateQueries({ queryKey: ['fetchUserInRoles', role.roleId] });
      queryClient.invalidateQueries({ queryKey: ['fetchUsersExceptRole', role.roleId] });
      queryClient.invalidateQueries({ queryKey: ROLES_LIST_QUERY_KEY });
      setSearchKey(""); // 검색어 초기화
    },
    onError: (err) => window.alert(getApiErrorMessage(err, "사용자 추가에 실패했습니다.")),
  });

  // 2. 사용자 제거 Mutation
  const { mutate: removeMember } = useMutation({
    mutationFn: ({roleId, userId}: any) => removeUserFromRoleAPI(roleId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fetchUserInRoles', role.roleId] });
      queryClient.invalidateQueries({ queryKey: ['fetchUsersExceptRole', role.roleId] });
      queryClient.invalidateQueries({ queryKey: ROLES_LIST_QUERY_KEY });
    },
    onError: (err) => window.alert(getApiErrorMessage(err, "사용자 제거에 실패했습니다.")),
  });

  const handleRemove = (userId) => removeMember({roleId: role.roleId, userId:userId})

  const handleAdd = (userId) => {
    console.log("????",userId)
    addMember({roleId: role.roleId, userId:userId})
  }

  const handleSearch = (e) => {
    setSearchKey(e.target.value)
  } 

  return (
    <Wrap $embedded={embedded}>
      {!embedded && (
        <SubTitle>
          권한: <strong>{role.roleName}</strong>
        </SubTitle>
      )}

      <Section>
        <SectionLabel>소속 사용자 ({fetchUserInRoles?.length}명)</SectionLabel>
        <MemberTable>
          <thead>
            <tr>
              <th>사용자 ID</th>
              <th>아이디</th>
              <th>이름</th>
              <th className="col-action">관리</th>
            </tr>
          </thead>
          <tbody>
            {fetchUserInRoles?.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", color: "#9ca3af" }}>
                  소속된 사용자가 없습니다.
                </td>
              </tr>
              
            ) : (
              fetchUserInRoles?.map((m) => (
                <tr key={m.userId}>
                  <td>{m.userId}</td>
                  <td>{m.loginId}</td>
                  <td>{m.username}</td>
                  <td className="col-action">
                    <Button variant="danger" size="sm" onClick={() => handleRemove(m.userId)}>
                      제거
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </MemberTable>
      </Section>

      <Section>
        <SectionLabel>사용자 검색 · 추가</SectionLabel>
        <SearchRow>
          <SearchInput
            placeholder="예: kim, 운영, 모니터, 한글 이름…"
            value={searchKey}
            onChange={(e) => handleSearch(e)}
          />
        </SearchRow>
        <Hint>
          <strong>동작:</strong> 위 표는 <em>이미 이 권한에 속한</em> 사용자입니다. 아래는
          아직 속하지 않은 사용자만 보입니다. 검색어를 비우면 <strong>추가 가능한 전체</strong>가
          나오고, 입력하면 아이디·이름으로 필터됩니다. <strong>추가</strong>를 누르면 위 표로
          옮겨집니다.
        </Hint>
        <HitList>
          {fetchUsersExceptRole?.length === 0 ? (
            <EmptyHits>추가 가능한 사용자가 없거나 검색 결과가 없습니다.</EmptyHits>
          ) : (
            fetchUsersExceptRole?.map((u) => (
              <HitRow key={u.userId}>
                <HitInfo>
                  <span className="login">{u.loginId}</span>
                  <span className="name">{u.username}</span>
                  <span className="id">#{u.userId}</span>
                </HitInfo>
                <Button variant="primary" size="sm" onClick={() => handleAdd(u.userId)}>
                  추가
                </Button>
              </HitRow>
            ))
          )}
        </HitList>
      </Section>

      {!embedded && (
        <FooterRow>
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
        </FooterRow>
      )}
    </Wrap>
  );
};

const Wrap = styled.div<{ $embedded?: boolean }>`
  width: ${(p) => (p.$embedded ? "100%" : "min(92vw, 640px)")};
  max-height: ${(p) => (p.$embedded ? "none" : "72vh")};
`;

const SubTitle = styled.p`
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #4b5563;
`;

const Section = styled.section`
  margin-bottom: 20px;
  
`;

const SectionLabel = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: #111d2c;
  margin-bottom: 8px;
`;

const MemberTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
  th {
    text-align: left;
    padding: 8px 10px;
    background: #f9fafb;
    font-weight: 600;
    color: #374151;
    border-bottom: 1px solid #e5e7eb;
  }
  td {
    padding: 8px 10px;
    border-bottom: 1px solid #f3f4f6;
  }
  .col-action {
    width: 80px;
    text-align: center;
  }
`;

const SearchRow = styled.div`
  margin-bottom: 8px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  box-sizing: border-box;
`;

const Hint = styled.p`
  margin: 0 0 10px 0;
  font-size: 12px;
  color: #4b5563;
  line-height: 1.55;
  em {
    font-style: normal;
    font-weight: 600;
    color: #1976d2;
  }
`;

const HitList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 260px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px;
  background: #fafafa;
`;

const HitRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  background: #fff;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
`;

const HitInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  flex-wrap: wrap;
  .login {
    color: #1976d2;
    font-weight: 600;
  }
  .name {
    font-weight: 600;
    color: #111827;
  }
  .id {
    font-size: 12px;
    color: #9ca3af;
  }
`;

const EmptyHits = styled.div`
  font-size: 13px;
  color: #9ca3af;
  padding: 12px;
  text-align: center;
`;

const FooterRow = styled.div`
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
`;

export default RoleMembersModalContent;
