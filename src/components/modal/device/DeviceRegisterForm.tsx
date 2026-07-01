import { useState } from "react";
import styled from "styled-components";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui";
import { categoryFetchAPI, DEVICE_CATEGORY_QUERY_KEY, flattenDeviceCategoryTree } from "@/services/deviceService";

/**
 * 장비 등록 폼
 * @param {{ onSuccess: (data: object) => void; onCancel: () => void }} props
 */
const DeviceRegisterForm = ({ onSuccess, onCancel }) => {
  const [form, setForm] = useState({
    deviceName: "",
    description: "",
    categoryId: "",
    active: true,
  });

  const { data: categories = [] } = useQuery({
    queryKey: DEVICE_CATEGORY_QUERY_KEY,
    queryFn: categoryFetchAPI,
    select: (res) =>
      flattenDeviceCategoryTree(res.data).filter((c) => c.active !== false),
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
    const payload = {
      ...form,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
    };
    onSuccess?.(payload);
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Section>
        <SectionTitle>기본 정보</SectionTitle>

        <FieldRow>
          <Label $required>장비 이름</Label>
          <Input
            name="deviceName"
            value={form.deviceName}
            onChange={handleChange}
            placeholder="장비 이름을 입력하세요"
            maxLength={100}
            required
          />
        </FieldRow>

        <FieldRow>
          <Label>설명</Label>
          <Textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="장비에 대한 설명 (선택)"
            rows={3}
          />
        </FieldRow>

        <FieldRow>
          <Label>카테고리</Label>
          <Select name="categoryId" value={form.categoryId} onChange={handleChange}>
            <option value="">— 카테고리 선택 —</option>
            {categories.map((c) => (
              <option key={c.categoryId} value={c.categoryId}>
                {"　".repeat(Math.max(0, c.depth - 1))}
                {c.categoryName}
              </option>
            ))}
          </Select>
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
            활성 상태로 등록
          </CheckLabel>
        </FieldRow>
      </Section>

      <ButtonRow>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            취소
          </Button>
        )}
        <Button variant="primary" type="submit">장비 등록</Button>
      </ButtonRow>
    </Form>
  );
};

const Form = styled.form`
  min-width: 420px;
  max-width: 560px;
`;

const Section = styled.section`
  margin-bottom: 24px;
`;

const SectionTitle = styled.h2`
  font-size: 15px;
  font-weight: 600;
  color: #111d2c;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #e8eaed;
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 12px;
  align-items: center;
  min-height: 40px;
  margin-bottom: 16px;
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
  &::placeholder { color: #9ca3af; }
`;

const Textarea = styled.textarea`
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s;
  &:focus {
    border-color: #4a90d9;
    box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.15);
  }
  &::placeholder { color: #9ca3af; }
`;

const Select = styled.select`
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  outline: none;
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
  width: 16px;
  height: 16px;
  accent-color: #4a90d9;
  cursor: pointer;
`;

const ButtonRow = styled.div`
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e8eaed;
  display: flex;
  gap: 12px;
`;

export default DeviceRegisterForm;
