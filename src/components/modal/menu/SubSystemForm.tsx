import { showAlert } from "@/utils/dialogBridge";
import { useEffect, useMemo, useState } from "react";
import styled, { css } from "styled-components";
import { Button } from "@/components/ui";

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
 * 서브시스템 생성/수정 폼 (공통 Modal 본문)
 * 소분류 카테고리 다중 매핑(categoryIds)을 소유한다.
 */
const SubSystemForm = ({
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
      const haystack = [c.fullPath, c.categoryName, c.categoryNameEn, c.categoryCode]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [smallCategories, categorySearch]);

  const selectedCount = (form.categoryIds ?? []).length;

  // 선택된 항목을 목록 최상단으로 정렬하기 위한 "스냅샷".
  // 모달 오픈 시점과 검색어 변경 시점에만 갱신 → 체크/해제 시 즉시 재정렬로 인한
  // 클릭 위치 튐(UX 저하)을 방지한다. 스냅샷 밖의 실시간 토글은 체크표시만 갱신.
  const [pinnedIds, setPinnedIds] = useState<Set<number>>(
    () => new Set(initialValues.categoryIds ?? [])
  );
  useEffect(() => {
    console.log('언제호출?')
    setPinnedIds(new Set(form.categoryIds ?? []));
    // form.categoryIds 는 의도적으로 의존성에서 제외(스냅샷). 검색어 변경 시에만 재정렬.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorySearch]);

  // 선택(스냅샷) 먼저 + 나머지 원래 순서 유지(안정 정렬).
  const orderedCategories = useMemo(() => {
    const selectedFirst = [];
    const rest = [];
    for (const c of filteredCategories) {
      if (pinnedIds.has(c.categoryId)) selectedFirst.push(c);
      else rest.push(c);
    }
    return [...selectedFirst, ...rest];
  }, [filteredCategories, pinnedIds]);

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
    const subSystemName = form.subSystemName.trim();
    if (!subSystemName) {
      showAlert("서브시스템명을 입력하세요.");
      return;
    }
    let payload;
    if (mode === "create") {
      const sortOrder = parseInt(form.sortOrder, 10);
      if (Number.isNaN(sortOrder) || sortOrder < 1) {
        showAlert("정렬 순서는 1 이상의 숫자로 입력하세요.");
        return;
      }
      payload = {
        subSystemName,
        sortOrder,
        active: form.active ?? true,
        categoryIds: form.categoryIds ?? [],
      };
    } else {
      payload = {
        subSystemName,
        active: form.active ?? true,
        categoryIds: form.categoryIds ?? [],
      };
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
          <label htmlFor="ss-name">subSystemName</label>
          <TextInput
            id="ss-name"
            value={form.subSystemName}
            onChange={(e) => setForm((f) => ({ ...f, subSystemName: e.target.value }))}
            placeholder="서브시스템 표시 이름"
            autoComplete="off"
          />
        </Field>
        {mode === "create" && (
          <Field $narrow>
            <label htmlFor="ss-sort">sortOrder</label>
            <TextInput
              id="ss-sort"
              type="number"
              min={1}
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
            />
          </Field>
        )}
        <Field>
          <label>활성</label>
          <ActiveToggle>
            <input
              type="checkbox"
              checked={form.active ?? true}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            />
            <span>{form.active ?? true ? "활성" : "비활성"}</span>
          </ActiveToggle>
        </Field>
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
            orderedCategories.map((c) => {
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
        <Button variant="outline" onClick={onClose} disabled={pending}>
          취소
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={pending}>
          {pending ? (mode === "create" ? "생성 중…" : "저장 중…") : mode === "create" ? "생성" : "저장"}
        </Button>
      </Actions>
    </FormWrap>
  );
};

export default SubSystemForm;

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

const Field = styled.div<{ $narrow?: boolean }>`
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

const ActiveToggle = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  font-size: 13px;
  color: #334155;
  cursor: pointer;

  input {
    width: 17px;
    height: 17px;
    accent-color: #4a6380;
    cursor: pointer;
  }
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

const Badge = styled.span<{ $tone?: string }>`
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

const CategoryCheckLabel = styled.label<{ $selected?: boolean }>`
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

const PathSegment = styled.span<{ $last?: boolean }>`
  color: ${(p) => (p.$last ? "#1e293b" : "#64748b")};
  font-weight: ${(p) => (p.$last ? 600 : 400)};
`;

const StateBox = styled.div<{ $error?: boolean }>`
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
