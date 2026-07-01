import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import DeviceCategoryPicker from "@/components/device/DeviceCategoryPicker";
import { Button } from "@/components/ui";
import { buildAssetNameFromCategories } from "@/utils/categoryKeyUtils";
import { ASSET_TYPES, DEFAULT_ASSET_TYPE } from "@/constants/assetType";

/**
 * 장비 에셋 등록·수정 폼
 */
const UnityAssetManageForm = ({ mode = "create", initial = null, onSubmit, onCancel }) => {
  const [assetName, setAssetName] = useState("");
  const [assetType, setAssetType] = useState<string>(DEFAULT_ASSET_TYPE);
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [selectedMajorId, setSelectedMajorId] = useState(null);
  const [selectedMidId, setSelectedMidId] = useState(null);
  const [selectedSmallId, setSelectedSmallId] = useState(null);
  const [selectionCtx, setSelectionCtx] = useState({ major: null, mid: null, small: null });
  const [assetNameTouched, setAssetNameTouched] = useState(false);

  useEffect(() => {
    if (mode === "edit" && initial) {
      setAssetName(initial.assetName ?? "");
      setAssetType(initial.assetType ?? DEFAULT_ASSET_TYPE);
      setDescription(initial.description ?? "");
      setActive(initial.active !== false);
      setSelectedMajorId(null);
      setSelectedMidId(null);
      setSelectedSmallId(null);
      setSelectionCtx({ major: null, mid: null, small: null });
      setAssetNameTouched(true);
    } else {
      setAssetName("");
      setAssetType(DEFAULT_ASSET_TYPE);
      setDescription("");
      setActive(true);
      setSelectedMajorId(null);
      setSelectedMidId(null);
      setSelectedSmallId(null);
      setSelectionCtx({ major: null, mid: null, small: null });
      setAssetNameTouched(false);
    }
  }, [mode, initial]);

  const applyAutoAssetName = useCallback((major, mid, small) => {
    const autoName = buildAssetNameFromCategories(major, mid, small);
    if (autoName) setAssetName(autoName);
  }, []);

  const handleMajorChange = useCallback((categoryId) => {
    setSelectedMajorId(categoryId);
    setSelectedMidId(null);
    setSelectedSmallId(null);
    setSelectionCtx({ major: null, mid: null, small: null });
  }, []);

  const handleMidChange = useCallback((categoryId) => {
    setSelectedMidId(categoryId);
    setSelectedSmallId(null);
    setSelectionCtx((prev) => ({ ...prev, mid: null, small: null }));
  }, []);

  const handleSmallChange = useCallback(
    (categoryId, small, { major, mid }) => {
      setSelectedSmallId(categoryId);
      setSelectionCtx({ major, mid, small });
      if (!assetNameTouched) {
        applyAutoAssetName(major, mid, small);
      }
    },
    [assetNameTouched, applyAutoAssetName]
  );

  const handleAssetNameChange = (e) => {
    setAssetNameTouched(true);
    setAssetName(e.target.value);
  };

  const handleResetFromCategory = () => {
    const { major, mid, small } = selectionCtx;
    if (!small) {
      window.alert("소분류를 먼저 선택하세요.");
      return;
    }
    applyAutoAssetName(major, mid, small);
    setAssetNameTouched(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = assetName.trim().toLowerCase();
    if (!name) return;
    const payload = {
      assetName: name,
      assetType,
      description: description.trim() || null,
      active,
    };
    if (mode === "edit" && initial) {
      onSubmit?.({ assetId: initial.assetId, ...payload });
    } else {
      onSubmit?.(payload);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      {mode === "edit" && initial && (
        <FieldRow>
          <Label>에셋 ID</Label>
          <ReadOnly>{initial.assetId}</ReadOnly>
        </FieldRow>
      )}

      <CategorySection>
        <CategorySectionTitle>
          카테고리 선택 (asset_name 자동 생성)
        </CategorySectionTitle>
        <CategoryHint>
          소분류까지 선택하면{" "}
          <code>대categoryCode_중categoryCode_소categoryCode</code> 형식으로 소문자 에셋
          이름이 자동 입력됩니다. 입력란에서 직접 수정할 수도 있습니다.
        </CategoryHint>
        <DeviceCategoryPicker
          compact
          selectedMajorId={selectedMajorId}
          selectedMidId={selectedMidId}
          selectedSmallId={selectedSmallId}
          onMajorChange={handleMajorChange}
          onMidChange={handleMidChange}
          onSmallChange={handleSmallChange}
        />
      </CategorySection>

      <FieldRow>
        <Label $required>에셋 타입</Label>
        <Select value={assetType} onChange={(e) => setAssetType(e.target.value)}>
          {ASSET_TYPES.map((t) => (
            <option key={t.code} value={t.code}>
              {t.label}
            </option>
          ))}
        </Select>
      </FieldRow>
      <FieldRow>
        <Label $required>에셋 이름 (asset_name)</Label>
        <InputWrap>
          <Input
            value={assetName}
            onChange={handleAssetNameChange}
            placeholder="예: 전기설비_전력제어_sube"
            maxLength={200}
            required
          />
          {selectedSmallId != null && assetNameTouched && (
            <InputHint>
              직접 수정 중입니다.{" "}
              <ResetLink type="button" onClick={handleResetFromCategory}>
                카테고리 기준으로 다시 채우기
              </ResetLink>
            </InputHint>
          )}
        </InputWrap>
      </FieldRow>
      <FieldRow>
        <Label>설명</Label>
        <TextArea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="에셋 설명"
          rows={4}
        />
      </FieldRow>
      <FieldRow>
        <Label>활성</Label>
        <CheckLabel>
          <Checkbox
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          활성 상태
        </CheckLabel>
      </FieldRow>
      <ButtonRow>
        <Button variant="outline" type="button" onClick={onCancel}>
          취소
        </Button>
        <Button variant="primary" type="submit">
          {mode === "edit" ? "저장" : "등록"}
        </Button>
      </ButtonRow>
    </Form>
  );
};

export default UnityAssetManageForm;

const Form = styled.form`
  width: 100%;
  max-width: 720px;
`;

const CategorySection = styled.section`
  margin-bottom: 18px;
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
`;

const CategorySectionTitle = styled.h3`
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 700;
  color: #334155;
`;

const CategoryHint = styled.p`
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.5;
  color: #64748b;

  code {
    font-size: 11px;
    color: #4a6380;
    background: #e8ecf1;
    padding: 1px 4px;
    border-radius: 3px;
  }
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 10px;
  align-items: start;
  margin-bottom: 14px;
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

const InputWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Input = styled.input`
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
  &:focus {
    border-color: #4a90d9;
  }
`;

const Select = styled.select`
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
  background: #fff;
  &:focus {
    border-color: #4a90d9;
  }
`;

const InputHint = styled.span`
  font-size: 12px;
  color: #64748b;
`;

const ResetLink = styled.button`
  padding: 0;
  border: none;
  background: none;
  color: #2563eb;
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;

  &:hover {
    color: #1d4ed8;
  }
`;

const TextArea = styled.textarea`
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
  resize: vertical;
  font-family: inherit;
`;

const ReadOnly = styled.span`
  padding-top: 8px;
  font-size: 14px;
  color: #6b7280;
`;

const CheckLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #374151;
  padding-top: 6px;
  cursor: pointer;
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  accent-color: #4a90d9;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #e8eaed;
`;
