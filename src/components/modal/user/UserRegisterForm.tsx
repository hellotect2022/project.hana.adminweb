import { useState } from "react";
import styled from "styled-components";
import { Button } from "@/components/ui";

/**
 * 사용자 등록 폼
 * Entity: User (loginId, username, passwordHash, email, active) + UserRole(Role)
 * @param {() => void} [onSuccess] - 등록 완료 후 (모달 닫기 등)
 * @param {() => void} [onCancel] - 취소 클릭 시
 */
const UserRegisterForm = ({ onSuccess, onCancel }) => {
  const [form, setForm] = useState({
    loginId: "",
    username: "",
    password: "",
    email: "",
    active: true,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

 
  const handleSubmit = (e) => {
    e.preventDefault();
    // 필요 API: 사용자 등록 (POST) - loginId, username, password, email, active, roleIds
    console.log("등록 요청:", form);
    onSuccess?.(form);
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Section>
        <SectionTitle>기본 정보</SectionTitle>
        <FieldRow>
          <Label $required>로그인 ID</Label>
          <Input
            name="loginId"
            value={form.loginId}
            onChange={handleChange}
            placeholder="로그인에 사용할 계정"
            maxLength={50}
            required
          />
        </FieldRow>
        <FieldRow>
          <Label $required>이름</Label>
          <Input
            name="username"
            value={form.username}
            onChange={handleChange}
            placeholder="사용자 이름"
            required
          />
        </FieldRow>
        <FieldRow>
          <Label $required>비밀번호</Label>
          <Input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="초기 비밀번호"
            autoComplete="new-password"
            required
          />
        </FieldRow>
        <FieldRow>
          <Label>이메일</Label>
          <Input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="example@domain.com"
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
            활성 사용자 (비활성 시 로그인 불가)
          </CheckLabel>
        </FieldRow>
      </Section>

      {/* <Section>
        <SectionTitle>권한</SectionTitle>
        <FieldRow>
          <Label>역할</Label>
          <RoleGroup>
            {roleOptions.map((role) => (
              <CheckLabel key={role.roleId}>
                <Checkbox
                  type="checkbox"
                  checked={form.roleIds.includes(role.roleId)}
                  onChange={() => handleRoleToggle(role.roleId)}
                />
                {role.roleName}
                {role.description && (
                  <RoleDesc>{role.description}</RoleDesc>
                )}
              </CheckLabel>
            ))}
          </RoleGroup>
        </FieldRow>
      </Section> */}

      <ButtonRow>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            취소
          </Button>
        )}
        <Button variant="primary" type="submit">사용자 등록</Button>
      </ButtonRow>
    </Form>
  );
};

const Form = styled.form`
  max-width: 640px;
`;

const Section = styled.section`
  margin-bottom: 28px;
`;

const SectionTitle = styled.h2`
  font-size: 16px;
  font-weight: 600;
  color: #111d2c;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #e8eaed;
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 12px;
  align-items: center;
  min-height: 40px;
  margin-bottom: 16px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
    align-items: flex-start;
  }
`;

const Label = styled.label<{ $required?: boolean }>`
  font-size: 14px;
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
  transition: border-color 0.2s;

  &:focus {
    border-color: #4a90d9;
    box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.15);
  }
  &::placeholder {
    color: #9ca3af;
  }
`;

const CheckLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  accent-color: #4a90d9;
  cursor: pointer;
`;

const RoleGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px 24px;
`;

const RoleDesc = styled.span`
  font-size: 12px;
  color: #6b7280;
  margin-left: 4px;
`;

const ButtonRow = styled.div`
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e8eaed;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

export default UserRegisterForm;
