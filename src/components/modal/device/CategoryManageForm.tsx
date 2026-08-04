import { showConfirm } from "@/utils/dialogBridge";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import { Button, SearchableSelect } from "@/components/ui";
import {
  categoryFetchAPI,
  createCategoryAPI,
  deleteCategoryAPI,
  DEVICE_CATEGORY_QUERY_KEY,
  DEVICE_LIST_QUERY_KEY,
  flattenDeviceCategoryTree,
  sortByDisplayOrder,
  updateCategoryAPI,
  updateCategorySchemaAPI,
  useDevicePropertyTypes,
} from "@/services/deviceService";
import {
  fetchUnityAssetsList,
  UNITY_ASSET_LIST_QUERY_KEY,
} from "@/services/unityAssetService";

// 스키마 type 선택지
const SCHEMA_TYPES = ["AI", "DI", "DO", "AO", "FUNCTION", "String", "Bool"];

const emptySchemRow = () => ({
  _key: Math.random().toString(36).slice(2),
  tagName: "",
  type: "AI",
  unit: "",
  isDisplay: true,
});

// ─────────────────────────────────────────────
// 인라인 추가 행 컴포넌트
// ─────────────────────────────────────────────
const InlineAddRow = ({ onConfirm, onCancel }) => {
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [code, setCode] = useState("");
  const nameRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const canConfirm = name.trim().length > 0 && code.trim().length > 0;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm({
      categoryName: name.trim(),
      categoryNameEn: nameEn.trim() || undefined,
      categoryCode: code.trim(),
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && canConfirm) handleConfirm();
    if (e.key === "Escape") onCancel();
  };

  return (
    <AddRowWrap>
      <AddRowFields>
        <AddRowInput
          ref={nameRef}
          placeholder="카테고리 이름 (필수)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <AddRowInput
          placeholder="카테고리 영문이름 (선택)"
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <AddRowInput
          placeholder="코드명 (필수)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </AddRowFields>
      <AddRowActions>
        <AddRowConfirm
          type="button"
          disabled={!canConfirm}
          onClick={handleConfirm}
          title="확인"
        >
          ✓
        </AddRowConfirm>
        <AddRowCancelBtn type="button" onClick={onCancel} title="취소">
          ✕
        </AddRowCancelBtn>
      </AddRowActions>
    </AddRowWrap>
  );
};

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
const CategoryManageForm = () => {
  const queryClient = useQueryClient();

  const {
    data: categoryTree,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: DEVICE_CATEGORY_QUERY_KEY,
    queryFn: async () => {
      const res = await categoryFetchAPI();
      if (!res?.success) throw new Error(res?.message || "카테고리 조회 실패");
      return res.data ?? [];
    },
  });

  const flat = useMemo(() => flattenDeviceCategoryTree(categoryTree), [categoryTree]);

  // ─── 선택 상태 ───
  const [selectedMajorId, setSelectedMajorId] = useState(null);
  const [selectedMidId, setSelectedMidId] = useState(null);
  const [selectedSmallId, setSelectedSmallId] = useState(null);

  // ─── 인라인 추가 상태 ───
  const [addingLevel, setAddingLevel] = useState(null); // 'major' | 'mid' | 'small' | null

  // ─── 스키마 편집 상태 ───
  const [schemaRows, setSchemaRows] = useState([]);
  const [schemaDirty, setSchemaDirty] = useState(false);

  // ─── 선택 카테고리 이름·코드 편집 ───
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryNameEn, setEditCategoryNameEn] = useState("");
  const [editCategoryCode, setEditCategoryCode] = useState("");
  const [editAssetId, setEditAssetId] = useState("");
  const [editPropertyType, setEditPropertyType] = useState("");
  const [categoryInfoDirty, setCategoryInfoDirty] = useState(false);

  // 카테고리 propertyType 옵션(메타)
  const { data: propertyTypes = [] } = useDevicePropertyTypes();

  // ─── 기본 3D 에셋 후보(PIPE 제외: 카테고리 기본에셋은 장비 메시) ───
  const {
    data: assets = [],
    isLoading: isAssetsLoading,
    isError: isAssetsError,
    error: assetsError,
  } = useQuery({
    queryKey: UNITY_ASSET_LIST_QUERY_KEY,
    queryFn: () => fetchUnityAssetsList({ activeOnly: true }),
  });

  const selectableAssets = useMemo(
    () => assets.filter((a) => a?.assetType !== "PIPE"),
    [assets]
  );

  // 기본 3D 에셋 SearchableSelect 옵션
  const assetOptions = useMemo(
    () =>
      selectableAssets.map((a) => ({
        value: a.assetId,
        label: a.assetName,
      })),
    [selectableAssets]
  );

  // ─── 계층 목록 ───
  const majors = useMemo(
    () => flat.filter((c) => c.parentId == null && c.active).sort(sortByDisplayOrder),
    [flat]
  );
  const mids = useMemo(
    () =>
      selectedMajorId == null
        ? []
        : flat.filter((c) => c.parentId === selectedMajorId && c.active).sort(sortByDisplayOrder),
    [flat, selectedMajorId]
  );
  const smalls = useMemo(
    () =>
      selectedMidId == null
        ? []
        : flat.filter((c) => c.parentId === selectedMidId && c.active).sort(sortByDisplayOrder),
    [flat, selectedMidId]
  );

  // 초기 대분류 선택
  useEffect(() => {
    if (!majors.length) return;
    setSelectedMajorId((prev) =>
      prev != null && majors.some((m) => m.categoryId === prev) ? prev : majors[0].categoryId
    );
  }, [majors]);

  // 현재 선택된 카테고리 ID (소 > 중 > 대 우선순위)
  const activeCategoryId = selectedSmallId ?? selectedMidId ?? selectedMajorId ?? null;

  // 선택된 카테고리 노드
  const activeCategory = useMemo(
    () => flat.find((c) => c.categoryId === activeCategoryId) ?? null,
    [flat, activeCategoryId]
  );

  /** 스키마 정의는 소분류(depth=2)이면서 leaf인 카테고리만 편집 */
  const canEditSchema = useMemo(
    () => activeCategory?.isLeaf === true && activeCategory?.depth === 2,
    [activeCategory]
  );

  // 선택 변경 시 카테고리 정보·스키마 초기화
  useEffect(() => {
    if (!activeCategory) {
      setEditCategoryName("");
      setEditCategoryNameEn("");
      setEditCategoryCode("");
      setEditAssetId("");
      setEditPropertyType("");
      setCategoryInfoDirty(false);
      setSchemaRows([]);
      setSchemaDirty(false);
      return;
    }
    setEditCategoryName(activeCategory.categoryName ?? "");
    setEditCategoryNameEn(activeCategory.categoryNameEn ?? "");
    setEditCategoryCode(activeCategory.categoryCode ?? "");
    setEditAssetId(activeCategory.assetId != null ? String(activeCategory.assetId) : "");
    setEditPropertyType(activeCategory.propertyType ?? "");
    setCategoryInfoDirty(false);
    const rows = (activeCategory.schemaDefinitions ?? []).map((s) => ({
      _key: Math.random().toString(36).slice(2),
      tagName: s.tagName ?? "",
      type: s.type ?? "AI",
      tagDesc: s.tagDesc ?? "",
      unit: s.unit ?? "",
      isDisplay: s.isDisplay ?? true,
    }));
    setSchemaRows(rows);
    setSchemaDirty(false);
  }, [activeCategoryId]);

  // ─── Mutations ───
  const { mutate: createCategory, isPending: isCreating } = useMutation({
    mutationFn: createCategoryAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEVICE_CATEGORY_QUERY_KEY });
      setAddingLevel(null);
    },
  });

  const { mutate: deleteCategory } = useMutation({
    mutationFn: deleteCategoryAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEVICE_CATEGORY_QUERY_KEY });
    },
  });

  const { mutate: updateCategory, isPending: isUpdatingCategory } = useMutation({
    mutationFn: updateCategoryAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEVICE_CATEGORY_QUERY_KEY });
      setCategoryInfoDirty(false);
    },
  });

  const { mutate: saveSchema, isPending: isSavingSchema } = useMutation({
    mutationFn: updateCategorySchemaAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEVICE_CATEGORY_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DEVICE_LIST_QUERY_KEY });
      setSchemaDirty(false);
    },
  });

  // ─── 핸들러 ───
  const pickMajor = (id) => {
    setSelectedMajorId(id);
    setSelectedMidId(null);
    setSelectedSmallId(null);
    setAddingLevel(null);
  };
  const pickMid = (id) => {
    setSelectedMidId(id);
    setSelectedSmallId(null);
    setAddingLevel(null);
  };
  const pickSmall = (id) => {
    setSelectedSmallId(id);
    setAddingLevel(null);
  };

  const handleAddConfirm = (level, { categoryName, categoryNameEn, categoryCode }) => {
    const parentId =
      level === "major" ? null : level === "mid" ? selectedMajorId : selectedMidId;
    createCategory({ categoryName, categoryNameEn, categoryCode, parentId, active: true, assetId: null });
  };

  const handleSaveCategoryInfo = () => {
    if (!activeCategoryId || !editCategoryName.trim() || !editCategoryCode.trim()) return;
    updateCategory({
      categoryId: activeCategoryId,
      payload: {
        categoryName: editCategoryName.trim(),
        categoryNameEn: editCategoryNameEn.trim() || null,
        categoryCode: editCategoryCode.trim(),
        active: activeCategory?.active ?? true,
        assetId: editAssetId ? Number(editAssetId) : null,
        propertyType: editPropertyType || null,
      },
    });
  };

  const renderCategoryListLabel = (item) => (
    <ItemTextCol>
      <ItemLabelRow>
        <ItemLabel>{item.categoryName}</ItemLabel>
        {item.categoryCode && <ItemCode>{item.categoryCode}</ItemCode>}
      </ItemLabelRow>
      {item.categoryNameEn && <ItemSubLabel>{item.categoryNameEn}</ItemSubLabel>}
    </ItemTextCol>
  );

  const handleDelete = async (e, categoryId, level) => {
    e.stopPropagation();
    const ok = await showConfirm("이 카테고리를 삭제할까요?\n하위 카테고리도 함께 삭제됩니다.");
    if (!ok) return;
    deleteCategory(categoryId);
    if (level === "major") { setSelectedMajorId(null); setSelectedMidId(null); setSelectedSmallId(null); }
    if (level === "mid") { setSelectedMidId(null); setSelectedSmallId(null); }
    if (level === "small") setSelectedSmallId(null);
  };

  // 스키마 편집
  const updateSchemaRow = (key, field, value) => {
    setSchemaRows((prev) =>
      prev.map((r) => (r._key === key ? { ...r, [field]: value } : r))
    );
    setSchemaDirty(true);
  };

  const addSchemaRow = () => {
    setSchemaRows((prev) => [...prev, emptySchemRow()]);
    setSchemaDirty(true);
  };

  const removeSchemaRow = (key) => {
    setSchemaRows((prev) => prev.filter((r) => r._key !== key));
    setSchemaDirty(true);
  };

  const handleSaveSchema = () => {
    if (!activeCategoryId) return;
    const schema = schemaRows.map(({ tagName, type, unit, tagDesc, isDisplay }) => ({
      tagName,
      type,
      unit,
      tagDesc,
      isDisplay,
    }));
    saveSchema({ categoryId: activeCategoryId, schema });
  };

  // ─── 렌더 ───
  if (isLoading && !categoryTree) {
    return <Wrap><StatusBox>카테고리를 불러오는 중…</StatusBox></Wrap>;
  }

  if (isError) {
    return (
      <Wrap>
        <ErrorBox>
          <p>{error?.message ?? "카테고리를 불러오지 못했습니다."}</p>
          <Button variant="secondary" onClick={() => refetch()}>다시 시도</Button>
        </ErrorBox>
      </Wrap>
    );
  }

  return (
    <Wrap>
      {isFetching && !isLoading && <FetchHint>동기화 중…</FetchHint>}

      {/* ── 대·중·소 3열 ── */}
      <ThreeCol>
        {/* 대분류 */}
        <Pane>
          <PaneHeader>
            <PaneTitleText>대분류</PaneTitleText>
            <PaneAddBtn
              type="button"
              onClick={() => setAddingLevel(addingLevel === "major" ? null : "major")}
              $active={addingLevel === "major"}
            >
              + 추가
            </PaneAddBtn>
          </PaneHeader>
          <ListBox>
            {majors.length === 0 && addingLevel !== "major" && (
              <EmptyHint>등록된 대분류가 없습니다.</EmptyHint>
            )}
            {majors.map((m) => (
              <ListItem
                key={m.categoryId}
                $active={m.categoryId === selectedMajorId}
                onClick={() => pickMajor(m.categoryId)}
              >
                {renderCategoryListLabel(m)}
                <DeleteItemBtn
                  onClick={(e) => handleDelete(e, m.categoryId, "major")}
                  title="삭제"
                >
                  ×
                </DeleteItemBtn>
              </ListItem>
            ))}
            {addingLevel === "major" && (
              <InlineAddRow
                onConfirm={(payload) => handleAddConfirm("major", payload)}
                onCancel={() => setAddingLevel(null)}
              />
            )}
          </ListBox>
        </Pane>

        {/* 중분류 */}
        <Pane>
          <PaneHeader>
            <PaneTitleText>중분류</PaneTitleText>
            <PaneAddBtn
              type="button"
              disabled={!selectedMajorId}
              onClick={() => setAddingLevel(addingLevel === "mid" ? null : "mid")}
              $active={addingLevel === "mid"}
            >
              + 추가
            </PaneAddBtn>
          </PaneHeader>
          <ListBox>
            {mids.length === 0 && addingLevel !== "mid" && (
              <EmptyHint>
                {selectedMajorId ? "중분류가 없습니다." : "대분류를 선택하세요."}
              </EmptyHint>
            )}
            {mids.map((m) => (
              <ListItem
                key={m.categoryId}
                $active={m.categoryId === selectedMidId}
                onClick={() => pickMid(m.categoryId)}
              >
                {renderCategoryListLabel(m)}
                <DeleteItemBtn
                  onClick={(e) => handleDelete(e, m.categoryId, "mid")}
                  title="삭제"
                >
                  ×
                </DeleteItemBtn>
              </ListItem>
            ))}
            {addingLevel === "mid" && selectedMajorId && (
              <InlineAddRow
                onConfirm={(payload) => handleAddConfirm("mid", payload)}
                onCancel={() => setAddingLevel(null)}
              />
            )}
          </ListBox>
        </Pane>

        {/* 소분류 */}
        <Pane>
          <PaneHeader>
            <PaneTitleText>소분류</PaneTitleText>
            <PaneAddBtn
              type="button"
              disabled={!selectedMidId}
              onClick={() => setAddingLevel(addingLevel === "small" ? null : "small")}
              $active={addingLevel === "small"}
            >
              + 추가
            </PaneAddBtn>
          </PaneHeader>
          <ListBox>
            {smalls.length === 0 && addingLevel !== "small" && (
              <EmptyHint>
                {selectedMidId ? "소분류가 없습니다." : "중분류를 선택하세요."}
              </EmptyHint>
            )}
            {smalls.map((s) => (
              <ListItem
                key={s.categoryId}
                type="button"
                $active={s.categoryId === selectedSmallId}
                onClick={() => pickSmall(s.categoryId)}
              >
                {renderCategoryListLabel(s)}
                <DeleteItemBtn
                  onClick={(e) => handleDelete(e, s.categoryId, "small")}
                  title="삭제"
                >
                  ×
                </DeleteItemBtn>
              </ListItem>
            ))}
            {addingLevel === "small" && selectedMidId && (
              <InlineAddRow
                onConfirm={(payload) => handleAddConfirm("small", payload)}
                onCancel={() => setAddingLevel(null)}
              />
            )}
          </ListBox>
        </Pane>
      </ThreeCol>

      {activeCategoryId && (
        <CategoryInfoSection>
          <CategoryInfoHeader>
            <CategoryInfoTitle>
              카테고리 정보
              <SchemaPath>{activeCategory?.fullPath ?? ""}</SchemaPath>
              {categoryInfoDirty && <DirtyBadge>저장 안 됨</DirtyBadge>}
            </CategoryInfoTitle>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSaveCategoryInfo}
              disabled={
                !categoryInfoDirty ||
                !editCategoryName.trim() ||
                !editCategoryCode.trim() ||
                isUpdatingCategory
              }
            >
              {isUpdatingCategory ? "저장 중…" : "정보 저장"}
            </Button>
          </CategoryInfoHeader>
          <CategoryInfoGrid>
            <CategoryFieldGroup>
              <CategoryFieldLabel>
                카테고리 이름 <RequiredMark>*</RequiredMark>
              </CategoryFieldLabel>
              <CategoryFieldInput
                value={editCategoryName}
                onChange={(e) => {
                  setEditCategoryName(e.target.value);
                  setCategoryInfoDirty(true);
                }}
                placeholder="한글 표시명"
              />
            </CategoryFieldGroup>
            <CategoryFieldGroup>
              <CategoryFieldLabel>카테고리 영문이름</CategoryFieldLabel>
              <CategoryFieldInput
                value={editCategoryNameEn}
                onChange={(e) => {
                  setEditCategoryNameEn(e.target.value);
                  setCategoryInfoDirty(true);
                }}
                placeholder="영문 표시명 (선택)"
              />
            </CategoryFieldGroup>
            <CategoryFieldGroup>
              <CategoryFieldLabel>
                코드명 <RequiredMark>*</RequiredMark>
              </CategoryFieldLabel>
              <CategoryFieldInput
                value={editCategoryCode}
                onChange={(e) => {
                  setEditCategoryCode(e.target.value);
                  setCategoryInfoDirty(true);
                }}
                placeholder="deviceKey 조합용 (필수)"
              />
            </CategoryFieldGroup>
            <CategoryFieldGroup>
              <CategoryFieldLabel>기본 3D 에셋 (asset)</CategoryFieldLabel>
              {isAssetsError ? (
                <AssetStatus $error>
                  {assetsError?.message ?? "에셋 목록을 불러오지 못했습니다."}
                </AssetStatus>
              ) : (
                <SearchableSelect
                  options={assetOptions}
                  value={editAssetId}
                  onChange={(v) => {
                    setEditAssetId(v);
                    setCategoryInfoDirty(true);
                  }}
                  placeholder="에셋 검색/선택"
                  loading={isAssetsLoading}
                  emptyText="선택 가능한 에셋이 없습니다"
                  noMatchText="검색 결과 없음"
                />
              )}
            </CategoryFieldGroup>
            <CategoryFieldGroup>
              <CategoryFieldLabel>속성 타입 (propertyType)</CategoryFieldLabel>
              <PropertyTypeSelect
                value={editPropertyType}
                onChange={(e) => {
                  setEditPropertyType(e.target.value);
                  setCategoryInfoDirty(true);
                }}
              >
                <option value="">없음 (null)</option>
                {propertyTypes.map((p) => (
                  <option key={p.type} value={p.type}>
                    {p.type}
                  </option>
                ))}
              </PropertyTypeSelect>
            </CategoryFieldGroup>
          </CategoryInfoGrid>
          <CategoryInfoHint>
            코드명은 장비 등록 시 deviceKey(대_중_소_장비이름) 조합에 사용됩니다. 영문이름은 표시·관리용이며 선택입니다.
            기본 3D 에셋은 이 카테고리에 속한 장비의 3D 렌더 기본 모델입니다.
          </CategoryInfoHint>
        </CategoryInfoSection>
      )}

      {/* ── 스키마 정의 편집 섹션 (소분류 leaf만) ── */}
      {canEditSchema && (
        <SchemaSection>
          <SchemaHeader>
            <SchemaTitle>
              스키마 정의
              <SchemaPath>{activeCategory?.fullPath ?? ""}</SchemaPath>
              {schemaDirty && <DirtyBadge>저장 안 됨</DirtyBadge>}
            </SchemaTitle>
            <SchemaActions>
              <Button variant="primary" size="sm" onClick={addSchemaRow}>
                + 항목 추가
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSaveSchema}
                disabled={!schemaDirty || isSavingSchema}
              >
                {isSavingSchema ? "저장 중…" : "저장"}
              </Button>
            </SchemaActions>
          </SchemaHeader>

          {schemaRows.length === 0 ? (
            <SchemaEmpty>
              스키마 항목이 없습니다. <strong>+ 항목 추가</strong>를 눌러 추가하세요.
            </SchemaEmpty>
          ) : (
            <SchemaTableWrap>
              <SchemaTable>
                <thead>
                  <tr>
                    <STh style={{ width: 100 }}>tagName</STh>
                    <STh style={{ width: 50 }}>type</STh>
                    <STh style={{ width: 50 }}>unit</STh>
                    <STh $center style={{ width: 50 }}>표시(isDisplay)</STh>
                    <STh $center style={{ width: 180 }}>설명</STh>
                    <STh $center style={{ width: 60 }}>삭제</STh>
                  </tr>
                </thead>
                <tbody>
                  {schemaRows.map((row) => (
                    <tr key={row._key}>
                      <STd>
                        <SchemaInput
                          value={row.tagName}
                          onChange={(e) => updateSchemaRow(row._key, "tagName", e.target.value)}
                          placeholder="예) CurTemp"
                        />
                      </STd>
                      <STd>
                        <SchemaSelect
                          value={row.type}
                          onChange={(e) => updateSchemaRow(row._key, "type", e.target.value)}
                        >
                          {SCHEMA_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </SchemaSelect>
                      </STd>
                      <STd>
                        <SchemaInput
                          value={row.unit}
                          onChange={(e) => updateSchemaRow(row._key, "unit", e.target.value)}
                          placeholder="예) ℃"
                        />
                      </STd>
                      <STd $center>
                        <SchemaCheckbox
                          type="checkbox"
                          checked={row.isDisplay}
                          onChange={(e) => updateSchemaRow(row._key, "isDisplay", e.target.checked)}
                        />
                      </STd>
                      <STd>
                        <SchemaInput
                          value={row.tagDesc}
                          onChange={(e) => updateSchemaRow(row._key, "tagDesc", e.target.value)}
                          placeholder="예) 설명"
                        />
                      </STd>
                      <STd $center>
                        <RemoveRowBtn type="button" onClick={() => removeSchemaRow(row._key)}>
                          ×
                        </RemoveRowBtn>
                      </STd>
                    </tr>
                  ))}
                </tbody>
              </SchemaTable>
            </SchemaTableWrap>
          )}

          <SchemaFootNote>
            JSON 미리보기:{" "}
            <code>
              {JSON.stringify(
                schemaRows.map(({ tagName, type, unit, tagDesc, isDisplay }) => ({
                  tagName, type, unit, tagDesc, is_display: isDisplay,
                }))
              )}
            </code>
          </SchemaFootNote>
        </SchemaSection>
      )}
    </Wrap>
  );
};

export default CategoryManageForm;

// ─────────────────────────────────────────────
// Styled Components
// ─────────────────────────────────────────────

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0 24px;
`;

const StatusBox = styled.div`
  padding: 48px 24px;
  text-align: center;
  font-size: 14px;
  color: #64748b;
`;

const ErrorBox = styled.div`
  padding: 24px;
  text-align: center;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;
  p { margin: 0 0 12px 0; }
`;

const FetchHint = styled.div`
  font-size: 12px;
  color: #64748b;
  text-align: right;
`;

const ThreeCol = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  align-items: stretch;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Pane = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
  min-height: 280px;
`;

const PaneHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #e8ecf1;
  border-bottom: 1px solid #d1d5db;
`;

const PaneTitleText = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: #111d2c;
`;

const PaneAddBtn = styled.button<{ $active?: boolean }>`
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 600;
  color: ${(p) => (p.$active ? "#fff" : "#4a6380")};
  background: ${(p) => (p.$active ? "#4a6380" : "#fff")};
  border: 1px solid #4a6380;
  border-radius: 4px;
  cursor: pointer;
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  &:hover:not(:disabled) {
    background: ${(p) => (p.$active ? "#3d5370" : "#e8ecf1")};
  }
`;

const ListBox = styled.div`
  flex: 1;
  min-height: 220px;
  max-height: 340px;
  overflow-y: auto;
  padding: 6px;
`;

const ListItem = styled.div<{ $active?: boolean; type?: string }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
  padding: 7px 8px;
  margin-bottom: 3px;
  font-size: 13px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: ${(p) => (p.$active ? "rgba(74, 99, 128, 0.15)" : "transparent")};
  color: ${(p) => (p.$active ? "#1e3a5f" : "#374151")};
  font-weight: ${(p) => (p.$active ? 600 : 400)};
  cursor: pointer;
  &:hover { background: ${(p) => (p.$active ? "rgba(74,99,128,0.2)" : "#f3f4f6")}; }
`;

const ItemTextCol = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const ItemLabelRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`;

const ItemLabel = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
`;

const ItemSubLabel = styled.span`
  font-size: 11px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ItemCode = styled.span`
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #4a6380;
  background: #e8ecf1;
  padding: 1px 6px;
  border-radius: 3px;
`;

const DeleteItemBtn = styled.button`
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  padding: 0;
  font-size: 13px;
  line-height: 1;
  color: #9ca3af;
  background: transparent;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
  ${ListItem}:hover & {
    opacity: 1;
  }
  &:hover {
    color: #dc2626;
    background: #fee2e2;
  }
`;

const EmptyHint = styled.div`
  padding: 20px 12px;
  text-align: center;
  font-size: 13px;
  color: #9ca3af;
`;

const CategoryInfoSection = styled.section`
  margin-top: 16px;
  padding: 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #fff;
`;

const CategoryInfoHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
`;

const CategoryInfoTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #111d2c;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const CategoryInfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const RequiredMark = styled.span`
  color: #dc2626;
  font-weight: 700;
`;

const CategoryFieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const CategoryFieldLabel = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: #566a7f;
`;

const CategoryFieldInput = styled.input`
  padding: 8px 10px;
  font-size: 13px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
  &:focus {
    border-color: #4a6380;
  }
`;

const PropertyTypeSelect = styled.select`
  padding: 8px 10px;
  font-size: 13px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  outline: none;
  &:focus {
    border-color: #4a6380;
  }
`;

const AssetStatus = styled.span<{ $error?: boolean }>`
  font-size: 12px;
  padding-top: 8px;
  color: ${(p) => (p.$error ? "#dc2626" : "#64748b")};
`;

const CategoryInfoHint = styled.p`
  margin: 10px 0 0;
  font-size: 12px;
  color: #94a3b8;
`;

// ─── 인라인 추가 행 ───
const AddRowWrap = styled.div`
  box-sizing: border-box;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  background: #f0f9ff;
  border: 1px dashed #7dd3fc;
  border-radius: 4px;
  margin-top: 4px;
`;

const AddRowFields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  min-width: 0;
`;

const AddRowInput = styled.input`
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 6px 8px;
  font-size: 12px;
  border: 1px solid #bae6fd;
  border-radius: 4px;
  outline: none;
  &:focus { border-color: #0284c7; }
  &::placeholder { color: #94a3b8; }
`;

const AddRowActions = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`;

const AddRowConfirm = styled.button`
  min-width: 32px;
  height: 28px;
  padding: 0 8px;
  font-size: 14px;
  font-weight: 700;
  color: #15803d;
  background: #dcfce7;
  border: 1px solid #86efac;
  border-radius: 4px;
  cursor: pointer;
  flex-shrink: 0;
  &:disabled { opacity: 0.4; cursor: not-allowed; }
  &:hover:not(:disabled) { background: #bbf7d0; }
`;

const AddRowCancelBtn = styled.button`
  min-width: 32px;
  height: 28px;
  padding: 0 8px;
  font-size: 14px;
  color: #dc2626;
  background: #fef2f2;
  border: 1px solid #fca5a5;
  border-radius: 4px;
  cursor: pointer;
  flex-shrink: 0;
  &:hover { background: #fee2e2; }
`;

// ─── 스키마 섹션 ───
const SchemaSection = styled.section`
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fafafa;
  overflow: hidden;
`;

const SchemaHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
`;

const SchemaTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #111d2c;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`;

const SchemaPath = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: #4a6380;
  background: #e8ecf1;
  padding: 1px 8px;
  border-radius: 4px;
`;

const DirtyBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: #fef3c7;
  color: #92400e;
`;

const SchemaActions = styled.div`
  display: flex;
  gap: 8px;
`;

const SchemaEmpty = styled.div`
  padding: 28px;
  text-align: center;
  font-size: 13px;
  color: #9ca3af;
  strong { color: #4a6380; }
`;

const SchemaTableWrap = styled.div`
  overflow-x: auto;
`;

const SchemaTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
`;

const STh = styled.th<{ $center?: boolean }>`
  padding: 9px 12px;
  text-align: ${(p) => (p.$center ? "center" : "left")};
  font-size: 12px;
  font-weight: 700;
  color: #374151;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
`;

const STd = styled.td<{ $center?: boolean }>`
  padding: 6px 8px;
  border-bottom: 1px solid #f3f4f6;
  text-align: ${(p) => (p.$center ? "center" : "left")};
`;

const SchemaInput = styled.input`
  width: 100%;
  padding: 5px 8px;
  font-size: 13px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  outline: none;
  &:focus { border-color: #4a90d9; }
  &::placeholder { color: #c4c9d0; }
`;

const SchemaSelect = styled.select`
  width: 100%;
  padding: 5px 6px;
  font-size: 13px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: #fff;
  outline: none;
`;

const SchemaCheckbox = styled.input`
  width: 16px;
  height: 16px;
  accent-color: #4a90d9;
  cursor: pointer;
`;

const RemoveRowBtn = styled.button`
  width: 24px;
  height: 24px;
  padding: 0;
  font-size: 15px;
  line-height: 1;
  color: #9ca3af;
  background: transparent;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  &:hover { color: #dc2626; background: #fee2e2; }
`;

const SchemaFootNote = styled.p`
  margin: 0;
  padding: 10px 16px;
  font-size: 11px;
  color: #94a3b8;
  border-top: 1px solid #e5e7eb;
  background: #f8fafc;
  code {
    word-break: break-all;
    font-size: 11px;
    color: #475569;
  }
`;
