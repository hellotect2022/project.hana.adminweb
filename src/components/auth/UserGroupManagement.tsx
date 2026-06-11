import { useState } from "react";
import styled from "styled-components";

/**
 * 사용자 그룹 관리 UI
 * 필요 API: 그룹 목록 조회(GET), 그룹 등록(POST), 그룹 수정(PUT), 그룹 삭제(DELETE), 멤버 수 집계(선택)
 */
const UserGroupManagement = () => {
  const [keyword, setKeyword] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm] = useState({ groupName: "", description: "" });

  const [groups, setGroups] = useState([
    {
      groupId: 1,
      groupName: "유지보수팀",
      description: "시설·BMS 유지보수 담당",
      memberCount: 12,
      createdAt: "2026-01-10",
    },
    {
      groupId: 2,
      groupName: "운영본부",
      description: "일반 운영 및 모니터링",
      memberCount: 8,
      createdAt: "2026-02-03",
    },
    {
      groupId: 3,
      groupName: "외부협력사",
      description: "제한된 메뉴만 접근",
      memberCount: 3,
      createdAt: "2026-02-20",
    },
  ]);

  const filtered = groups.filter(
    (g) =>
      !keyword ||
      g.groupName.includes(keyword) ||
      (g.description && g.description.includes(keyword))
  );

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (!form.groupName.trim()) return;
    // 필요 API: POST 그룹 등록
    const nextId = Math.max(0, ...groups.map((g) => g.groupId)) + 1;
    setGroups((prev) => [
      ...prev,
      {
        groupId: nextId,
        groupName: form.groupName.trim(),
        description: form.description.trim(),
        memberCount: 0,
        createdAt: new Date().toISOString().slice(0, 10),
      },
    ]);
    setForm({ groupName: "", description: "" });
    setShowRegister(false);
  };

  const handleDelete = (groupId) => {
    if (!window.confirm("이 그룹을 삭제할까요?")) return;
    // 필요 API: DELETE 그룹
    setGroups((prev) => prev.filter((g) => g.groupId !== groupId));
  };

  return (
    <Wrap>
      <Toolbar>
        <SearchBox
          type="search"
          placeholder="그룹명, 설명 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <PrimaryButton
          type="button"
          onClick={() => setShowRegister((v) => !v)}
          $active={showRegister}
        >
          {showRegister ? "등록 폼 닫기" : "그룹 등록"}
        </PrimaryButton>
      </Toolbar>

      {showRegister && (
        <RegisterCard>
          <RegisterTitle>새 그룹 등록</RegisterTitle>
          <RegisterForm onSubmit={handleRegister}>
            <FormGrid>
              <Field>
                <Label $required>그룹명</Label>
                <Input
                  name="groupName"
                  value={form.groupName}
                  onChange={handleFormChange}
                  placeholder="예: 유지보수팀"
                  maxLength={80}
                  required
                />
              </Field>
              <Field>
                <Label>설명</Label>
                <TextArea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  placeholder="그룹 용도를 입력하세요"
                  rows={3}
                />
              </Field>
            </FormGrid>
            <FormActions>
              <SecondaryButton type="button" onClick={() => setShowRegister(false)}>
                취소
              </SecondaryButton>
              <PrimaryButton type="submit">등록</PrimaryButton>
            </FormActions>
          </RegisterForm>
        </RegisterCard>
      )}

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>그룹명</Th>
              <Th>설명</Th>
              <Th $narrow>소속 인원</Th>
              <Th $narrow>등록일</Th>
              <Th $narrow>동작</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <Td colSpan={5}>등록된 그룹이 없습니다.</Td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.groupId}>
                  <Td>
                    <GroupNameCell>{row.groupName}</GroupNameCell>
                  </Td>
                  <Td>{row.description || "—"}</Td>
                  <Td $narrow>
                    <MemberBadge>{row.memberCount}명</MemberBadge>
                  </Td>
                  <Td $narrow>{row.createdAt}</Td>
                  <Td $narrow>
                    <GhostButton type="button">수정</GhostButton>
                    <GhostButton type="button" $danger onClick={() => handleDelete(row.groupId)}>
                      삭제
                    </GhostButton>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </TableWrap>

      <Hint>
        수정 버튼은 이후 그룹 상세/수정 모달 또는 별도 페이지와 연결하면 됩니다. (필요 API: PUT
        그룹 수정)
      </Hint>
    </Wrap>
  );
};

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`;

const Toolbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const SearchBox = styled.input`
  padding: 8px 12px;
  width: min(100%, 280px);
  font-size: 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
  &::placeholder {
    color: #9ca3af;
  }
  &:focus {
    border-color: #4a90d9;
    box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.15);
  }
`;

const PrimaryButton = styled.button`
  padding: 10px 24px;
  font-size: 15px;
  font-weight: 600;
  color: #1565c0;
  background-color: ${(p) => (p.$active ? "#bbdefb" : "#e3f2fd")};
  border: 1px solid #2196f3;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s;
  &:hover {
    background-color: #bbdefb;
    border-color: #1976d2;
  }
`;

const SecondaryButton = styled.button`
  padding: 10px 24px;
  font-size: 15px;
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

const RegisterCard = styled.div`
  margin-bottom: 20px;
  padding: 20px 24px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
`;

const RegisterTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #111d2c;
`;

const RegisterForm = styled.form``;

const FormGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  &::after {
    content: "${(p) => (p.$required ? " *" : "")}";
    color: #dc2626;
  }
`;

const Input = styled.input`
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
  max-width: 400px;
  &:focus {
    border-color: #4a90d9;
    box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.15);
  }
`;

const TextArea = styled.textarea`
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
  resize: vertical;
  max-width: 560px;
  font-family: inherit;
  &:focus {
    border-color: #4a90d9;
    box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.15);
  }
`;

const FormActions = styled.div`
  display: flex;
  gap: 12px;
`;

const TableWrap = styled.div`
  overflow-x: auto;
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
  font-weight: 600;
  color: #374151;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
  ${(p) => p.$narrow && "width: 1%;"}
`;

const Td = styled.td`
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  color: #111827;
  vertical-align: middle;
  ${(p) => p.$narrow && "white-space: nowrap;"}
`;

const GroupNameCell = styled.span`
  font-weight: 600;
  color: #111d2c;
`;

const MemberBadge = styled.span`
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: #e0f2fe;
  color: #0369a1;
`;

const GhostButton = styled.button`
  padding: 4px 10px;
  margin-right: 6px;
  font-size: 13px;
  font-weight: 500;
  color: ${(p) => (p.$danger ? "#b91c1c" : "#2196f3")};
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background: ${(p) => (p.$danger ? "#fef2f2" : "#e3f2fd")};
    text-decoration: underline;
  }
`;

const Hint = styled.p`
  margin: 16px 0 0 0;
  font-size: 12px;
  color: #6b7280;
`;

export default UserGroupManagement;
