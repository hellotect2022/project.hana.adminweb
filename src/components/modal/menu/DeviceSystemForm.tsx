import { useMemo, useState } from "react";
import styled, { css } from "styled-components";

function renderCategoryPath(fullPath, categoryName) {
  const raw = fullPath || categoryName || "";
  const parts = raw.split(">").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  return parts.map((part, index) => (
    <span key={`${part}-${index}`}>
      {index > 0 && <PathSep aria-hidden>›</PathSep>}
      <PathSegment $last={index === parts.length - 1}>{part}</PathSegment>
    </span>
  ));
}

/**
 * BMS 시스템 생성/수정 폼 (공통 Modal 본문)
 */
const DeviceSystemForm = ({
  mode,
  initialValues,
  smallCategories,
  categoriesLoading,
  categoriesError,
  categoriesErr,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState(initialValues);
  const [pending, setPending] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");

  const filteredCategories = useMemo(() => {
    const keyword = categorySearch.trim().toLowerCase();
    if (!keyword) return smallCategories;
    return smallCategories.filter((c) => {
      const haystack = [
        c.fullPath,
        c.categoryName,
        c.categoryNameEn,
        c.categoryCode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [smallCategories, categorySearch]);

  const selectedCount = (form.categoryIds ?? []).length;

  const toggleCategoryId = (categoryId) => {
    setForm((prev) => {
      const ids = prev.categoryIds ?? [];
      const next = ids.includes(categoryId)
        ? ids.filter((id) => id !== categoryId)
        : [...ids, categoryId];
      return { ...prev, categoryIds: next };
    });
  };

  const handleSubmit = async () => {
    const systemName = form.systemName.trim();
    const systemCode = form.systemCode.trim();
    if (!systemName || !systemCode) {
      window.alert("시스템명과 시스템 코드를 입력하세요.");
      return;
    }
    let payload;
    if (mode === "create") {
      const sortOrder = parseInt(form.sortOrder, 10);
      if (Number.isNaN(sortOrder) || sortOrder < 1) {
        window.alert("정렬 순서는 1 이상의 숫자로 입력하세요.");
        return;
      }
      payload = { systemName, systemCode, sortOrder, categoryIds: form.categoryIds ?? [] };
    } else {
      payload = { systemName, systemCode, categoryIds: form.categoryIds ?? [] };
    }
    setPending(true);
    try {
      await onSubmit(payload);
      onClose?.();
    } catch {
      /* onSubmit에서 alert 처리 */
    } finally {
      setPending(false);
    }
  };

  return (
    <FormWrap>
      <FormGrid>
        <Field>
          <label htmlFor="ds-name">systemName</label>
          <TextInput
            id="ds-name"
            value={form.systemName}
            onChange={(e) => setForm((f) => ({ ...f, systemName: e.target.value }))}
            placeholder="표시 이름"
            autoComplete="off"
          />
        </Field>
        <Field>
          <label htmlFor="ds-code">systemCode</label>
          <TextInput
            id="ds-code"
            value={form.systemCode}
            onChange={(e) => setForm((f) => ({ ...f, systemCode: e.target.value }))}
            placeholder="고유 코드 (영문·숫자 등)"
            autoComplete="off"
          />
        </Field>
        {mode === "create" && (
          <Field $narrow>
            <label htmlFor="ds-sort">sortOrder</label>
            <TextInput
              id="ds-sort"
              type="number"
              min={1}
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
            />
          </Field>
        )}
      </FormGrid>

      <CategorySection>
        <CategorySectionHeader>
          <CategorySectionTitle>소분류 카테고리 매핑</CategorySectionTitle>
          {!categoriesLoading && !categoriesError && smallCategories.length > 0 && (
            <CategoryBadges>
              <Badge $tone="primary">선택 {selectedCount}</Badge>
              <Badge>
                {categorySearch.trim()
                  ? `검색 ${filteredCategories.length}`
                  : `전체 ${smallCategories.length}`}
              </Badge>
            </CategoryBadges>
          )}
        </CategorySectionHeader>

        {!categoriesLoading && !categoriesError && smallCategories.length > 0 && (
          <SearchWrap>
            <SearchIcon aria-hidden>⌕</SearchIcon>
            <CategorySearchInput
              type="search"
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder="대·중·소 경로, 이름, 코드로 검색"
              autoComplete="off"
            />
            {categorySearch && (
              <ClearSearchBtn
                type="button"
                aria-label="검색어 지우기"
                onClick={() => setCategorySearch("")}
              >
                ×
              </ClearSearchBtn>
            )}
          </SearchWrap>
        )}

        <CategoryCheckList>
          {categoriesLoading ? (
            <StateBox>
              <FormHint>소분류 카테고리를 불러오는 중…</FormHint>
            </StateBox>
          ) : categoriesError ? (
            <StateBox $error>
              <FormHint>카테고리 조회 실패: {categoriesErr?.message ?? "오류"}</FormHint>
            </StateBox>
          ) : smallCategories.length === 0 ? (
            <StateBox>
              <FormHint>
                등록된 소분류가 없습니다. 장비 관리 &gt; 카테고리 관리에서 소분류를 먼저 등록하세요.
              </FormHint>
            </StateBox>
          ) : filteredCategories.length === 0 ? (
            <StateBox>
              <FormHint>검색 결과가 없습니다.</FormHint>
            </StateBox>
          ) : (
            filteredCategories.map((c) => {
              const checked = (form.categoryIds ?? []).includes(c.categoryId);
              return (
                <CategoryCheckLabel key={c.categoryId} $selected={checked}>
                  <CategoryCheckbox
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCategoryId(c.categoryId)}
                  />
                  <CategoryCheckText>
                    {renderCategoryPath(c.fullPath, c.categoryName)}
                  </CategoryCheckText>
                </CategoryCheckLabel>
              );
            })
          )}
        </CategoryCheckList>
      </CategorySection>

      <Actions>
        <ToolBtn type="button" onClick={onClose} disabled={pending}>
          취소
        </ToolBtn>
        <ToolBtn type="button" $primary onClick={handleSubmit} disabled={pending}>
          {pending ? (mode === "create" ? "생성 중…" : "저장 중…") : mode === "create" ? "생성" : "저장"}
        </ToolBtn>
      </Actions>
    </FormWrap>
  );
};

export default DeviceSystemForm;

const FormWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 16px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.div`
  grid-column: ${(p) => (p.$narrow ? "span 1" : "span 1")};

  label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    margin-bottom: 6px;
    letter-spacing: 0.01em;
  }
`;

const inputBase = css`
  width: 100%;
  padding: 9px 12px;
  font-size: 13px;
  color: #1f2937;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-sizing: border-box;
  background: #fff;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus {
    border-color: #4a6380;
    box-shadow: 0 0 0 3px rgba(74, 99, 128, 0.12);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const TextInput = styled.input`
  ${inputBase}
`;

const CategorySection = styled.section`
  padding: 14px;
  border-radius: 12px;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
`;

const CategorySectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
`;

const CategorySectionTitle = styled.h3`
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #334155;
`;

const CategoryBadges = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 999px;
  color: ${(p) => (p.$tone === "primary" ? "#fff" : "#64748b")};
  background: ${(p) => (p.$tone === "primary" ? "#4a6380" : "#e2e8f0")};
`;

const SearchWrap = styled.div`
  position: relative;
  margin-bottom: 10px;
`;

const SearchIcon = styled.span`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-52%);
  font-size: 15px;
  color: #94a3b8;
  pointer-events: none;
  line-height: 1;
`;

const CategorySearchInput = styled.input`
  ${inputBase}
  padding-left: 34px;
  padding-right: 34px;
  background: #fff;
`;

const ClearSearchBtn = styled.button`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: #e2e8f0;
  color: #64748b;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #cbd5e1;
    color: #334155;
  }
`;

const CategoryCheckList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 280px;
  overflow-y: auto;
  padding-right: 2px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 999px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
`;

const CategoryCheckLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${(p) => (p.$selected ? "#4a6380" : "#e2e8f0")};
  background: ${(p) => (p.$selected ? "#eef2f7" : "#fff")};
  box-shadow: ${(p) =>
    p.$selected ? "0 1px 2px rgba(74, 99, 128, 0.08)" : "0 1px 2px rgba(15, 23, 42, 0.04)"};
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    border-color: ${(p) => (p.$selected ? "#3d5370" : "#cbd5e1")};
    background: ${(p) => (p.$selected ? "#e8edf3" : "#fafbfc")};
  }
`;

const CategoryCheckbox = styled.input`
  flex: 0 0 17px;
  width: 17px;
  height: 17px;
  margin: 0;
  padding: 0;
  accent-color: #4a6380;
  cursor: pointer;
`;

const CategoryCheckText = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 13px;
  line-height: 1.45;
  word-break: keep-all;
  overflow-wrap: anywhere;
`;

const PathSep = styled.span`
  margin: 0 6px;
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 500;
`;

const PathSegment = styled.span`
  color: ${(p) => (p.$last ? "#1e293b" : "#64748b")};
  font-weight: ${(p) => (p.$last ? 600 : 400)};
`;

const StateBox = styled.div`
  padding: 20px 12px;
  text-align: center;
  border-radius: 8px;
  background: #fff;
  border: 1px dashed ${(p) => (p.$error ? "#fecaca" : "#e2e8f0")};
`;

const FormHint = styled.p`
  margin: 0;
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 4px;
  border-top: 1px solid #f1f5f9;
`;

const ToolBtn = styled.button`
  min-width: 72px;
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid ${(p) => (p.$primary ? "#4a6380" : "#d1d5db")};
  background: ${(p) => (p.$primary ? "#4a6380" : "#fff")};
  color: ${(p) => (p.$primary ? "#fff" : "#374151")};
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;

  &:hover:not(:disabled) {
    background: ${(p) => (p.$primary ? "#3d5370" : "#f8fafc")};
    border-color: ${(p) => (p.$primary ? "#3d5370" : "#94a3b8")};
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
