import { useState, useEffect } from "react";
import styled from "styled-components";

/**
 * 모달용 사용자 수정 폼 — Entity User + UserRole(Role) 기준
 * - loginId, userId: 수정 불가
 * - passwordHash: 폼에서는 비밀번호 변경 시에만 password로 전송 (서버에서 해시)
 * - accountNonLocked, failedLoginAttempts: 관리자 수정 가능
 * - lastPasswordChangeDate, lastLoginDate, createdAt, updatedAt: 조회 전용
 *
 * 필요 API: GET 사용자 상세(+userRoles), PUT 사용자 수정
 */
const ROLE_OPTIONS = [
  { roleId: 1, roleName: "최종관리자", description: "시스템 최고 권한" },
  { roleId: 2, roleName: "운영자", description: "일반 운영" },
  { roleId: 3, roleName: "조회자", description: "조회 전용" },
];

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const UserEditModalForm = ({ user, onSave, onCancel }) => {
  const [form, setForm] = useState({
    username: "",
    email: "",
    active: true,
    accountNonLocked: true,
    failedLoginAttempts: 0,
    roleIds: [],
    password: "",
    passwordConfirm: "",
  });

  useEffect(() => {
    if (!user) return;
    setForm({
      username: user.username ?? "",
      email: user.email ?? "",
      active: user.active !== false,
      accountNonLocked: user.accountNonLocked !== false,
      failedLoginAttempts: user.failedLoginAttempts ?? 0,
      roleIds: Array.isArray(user.roleIds) ? [...user.roleIds] : [],
      password: "",
      passwordConfirm: "",
    });
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
      return;
    }
    if (name === "failedLoginAttempts") {
      const n = value === "" ? 0 : Math.max(0, parseInt(value, 10) || 0);
      setForm((prev) => ({ ...prev, failedLoginAttempts: n }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleToggle = (roleId) => {
    setForm((prev) => ({
      ...prev,
      roleIds: prev.roleIds.includes(roleId)
        ? prev.roleIds.filter((id) => id !== roleId)
        : [...prev.roleIds, roleId],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.password || form.passwordConfirm) {
      if (form.password !== form.passwordConfirm) {
        window.alert("새 비밀번호와 확인이 일치하지 않습니다.");
        return;
      }
    }
    const payload = {
      userId: user.userId,
      username: form.username,
      email: form.email,
      active: form.active,
      accountNonLocked: form.accountNonLocked,
      failedLoginAttempts: Number.isFinite(form.failedLoginAttempts)
        ? form.failedLoginAttempts
        : 0,
      roleIds: form.roleIds,
    };
    if (form.password) {
      payload.password = form.password;
    }
    onSave?.(payload);
  };

  if (!user) return null;

  return (
    <Form onSubmit={handleSubmit}>
      <Section>
        <SectionTitle>식별 정보 (수정 불가)</SectionTitle>
        <FieldRow>
          <Label>사용자 ID</Label>
          <ReadOnly>{user.userId}</ReadOnly>
        </FieldRow>
        <FieldRow>
          <Label>로그인 ID</Label>
          <ReadOnly>{user.loginId}</ReadOnly>
        </FieldRow>
      </Section>

      <Section>
        <SectionTitle>기본 정보</SectionTitle>
        <FieldRow>
          <Label $required>사용자 이름</Label>
          <Input
            name="username"
            value={form.username}
            onChange={handleChange}
            required
            placeholder="username"
          />
        </FieldRow>
        <FieldRow>
          <Label>이메일</Label>
          <Input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="email"
          />
        </FieldRow>
        <FieldRow>
          <Label>활성 여부</Label>
          <CheckLabel>
            <Checkbox
              type="checkbox"
              name="active"
              checked={form.active}
              onChange={handleChange}
            />
            활성 사용자 (active)
          </CheckLabel>
        </FieldRow>
        <FieldRow>
          <Label>계정 잠금</Label>
          <CheckLabel>
            <Checkbox
              type="checkbox"
              name="accountNonLocked"
              checked={form.accountNonLocked}
              onChange={handleChange}
            />
            로그인 허용 (accountNonLocked — 체크 해제 시 잠금)
          </CheckLabel>
        </FieldRow>
        <FieldRow>
          <Label>로그인 실패 횟수</Label>
          <Input
            type="number"
            name="failedLoginAttempts"
            min={0}
            value={form.failedLoginAttempts}
            onChange={handleChange}
          />
        </FieldRow>
      </Section>

      <Section>
        <SectionTitle>역할 (UserRole → Role)</SectionTitle>
        <FieldRow>
          <Label>역할</Label>
          <RoleGroup>
            {ROLE_OPTIONS.map((role) => (
              <CheckLabel key={role.roleId}>
                <Checkbox
                  type="checkbox"
                  checked={form.roleIds.includes(role.roleId)}
                  onChange={() => handleRoleToggle(role.roleId)}
                />
                {role.roleName}
                {role.description && <RoleDesc>{role.description}</RoleDesc>}
              </CheckLabel>
            ))}
          </RoleGroup>
        </FieldRow>
      </Section>

      <Section>
        <SectionTitle>비밀번호 변경 (선택)</SectionTitle>
        <Hint>입력 시에만 서버에 password 전달 (passwordHash로 저장)</Hint>
        <FieldRow>
          <Label>새 비밀번호</Label>
          <Input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="변경 시에만 입력"
            autoComplete="new-password"
          />
        </FieldRow>
        <FieldRow>
          <Label>비밀번호 확인</Label>
          <Input
            type="password"
            name="passwordConfirm"
            value={form.passwordConfirm}
            onChange={handleChange}
            placeholder="비밀번호 확인"
            autoComplete="new-password"
          />
        </FieldRow>
      </Section>

      <Section>
        <SectionTitle>시스템 정보 (조회 전용)</SectionTitle>
        <FieldRow>
          <Label>비밀번호 변경일</Label>
          <ReadOnly>{formatDateTime(user.lastPasswordChangeDate)}</ReadOnly>
        </FieldRow>
        <FieldRow>
          <Label>최근 로그인</Label>
          <ReadOnly>{formatDateTime(user.lastLoginDate)}</ReadOnly>
        </FieldRow>
        <FieldRow>
          <Label>생성일시</Label>
          <ReadOnly>{formatDateTime(user.createdAt)}</ReadOnly>
        </FieldRow>
        <FieldRow>
          <Label>수정일시</Label>
          <ReadOnly>{formatDateTime(user.updatedAt)}</ReadOnly>
        </FieldRow>
      </Section>

      <ButtonRow>
        <CancelButton type="button" onClick={onCancel}>
          취소
        </CancelButton>
        <SaveButton type="submit">저장</SaveButton>
      </ButtonRow>
    </Form>
  );
};

const Form = styled.form`
  width: 100%;
  max-width: 640px;
`;

const Section = styled.section`
  margin-bottom: 20px;
`;

const SectionTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 700;
  color: #111d2c;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const Label = styled.label`
  font-size: 13px;
  color: #374151;
  &::after {
    content: "${(p) => (p.$required ? " *" : "")}";
    color: #dc2626;
  }
`;

const ReadOnly = styled.div`
  font-size: 14px;
  color: #6b7280;
`;

const Input = styled.input`
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
  max-width: 400px;
  &:focus {
    border-color: #4a6380;
  }
`;

const CheckLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  accent-color: #4a6380;
`;

const RoleGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
`;

const RoleDesc = styled.span`
  font-size: 12px;
  color: #6b7280;
  margin-left: 4px;
`;

const Hint = styled.p`
  margin: 0 0 10px 150px;
  font-size: 12px;
  color: #6b7280;
  @media (max-width: 520px) {
    margin-left: 0;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
`;

const CancelButton = styled.button`
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
`;

const SaveButton = styled.button`
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: #f59e0b;
  border: 1px solid #d97706;
  border-radius: 6px;
  cursor: pointer;
  &:hover {
    background: #d97706;
  }
`;

export default UserEditModalForm;
