import { showAlert } from "@/utils/dialogBridge";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import { Button } from "@/components/ui";
import {
  categoryFetchAPI,
  createDeviceAPI,
  DEVICE_CATEGORY_QUERY_KEY,
  DEVICE_LIST_QUERY_KEY,
  flattenDeviceCategoryTree,
  sortByDisplayOrder,
  useDevicePropertyTypes,
} from "@/services/deviceService";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

/** @param {{ categoryCode?: string; categoryName: string }} cat */
function resolveCategoryCode(cat) {
  if (!cat) return "";
  if (cat.categoryCode?.trim()) return cat.categoryCode.trim();
  return cat.categoryName
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_가-힣-]/g, "");
}

/**
 * 대·중·소 categoryCode + deviceName 으로 deviceKey 생성
 * 형식: {대}_{중}_{소}_{deviceName}
 */
export function buildDeviceKey(major, mid, small, deviceName) {
  const majorCode = resolveCategoryCode(major);
  const midCode = resolveCategoryCode(mid);
  const smallCode = resolveCategoryCode(small);
  const name = deviceName?.trim() ?? "";
  if (!majorCode || !midCode || !smallCode || !name) return "";
  return `${majorCode}_${midCode}_${smallCode}_${name}`;
}

/** point_key: {deviceKey}_{schemaTagName} (예: 전기설비_전력제어_SUBE_test_test3) */
export function buildPointKey(deviceKey, schemaTagName) {
  const key = deviceKey?.trim() ?? "";
  const tag = schemaTagName?.trim() ?? "";
  if (!key || !tag) return "";
  return `${key}_${tag}`;
}

/** @param {Array<{ tagName?: string; type?: string; unit?: string; tagDesc?: string; isDisplay?: boolean }>} schemaDefinitions */
export function buildPointRowsFromSchema(deviceKey, schemaDefinitions = []) {
  return schemaDefinitions
    .filter((s) => s?.tagName?.trim())
    .map((s) => {
      const schemaTagName = s.tagName.trim();
      return {
        schemaTagName,
        tagName: schemaTagName,
        pointKey: buildPointKey(deviceKey, schemaTagName),
        pointName: s.tagDesc?.trim() || schemaTagName,
        pointType: s.type ?? "",
        unit: s.unit ?? "",
        tagDesc: s.tagDesc ?? "",
        isDisplay: s.isDisplay ?? true,
      };
    });
}

/**
 * @param {{ onSuccess?: (res: unknown, variables: unknown) => void; onCancel?: () => void }} props
 */
const DeviceRegistForm = ({ onSuccess = (..._a: any[]) => {}, onCancel = (..._a: any[]) => {} }) => {
  const inModal = Boolean(onCancel || onSuccess);
  const queryClient = useQueryClient();
  const [selectedMajorId, setSelectedMajorId] = useState(null);
  const [selectedMidId, setSelectedMidId] = useState(null);
  const [selectedSmallId, setSelectedSmallId] = useState(null);
  const [deviceName, setDeviceName] = useState("");
  const [deviceDisplayName, setDeviceDisplayName] = useState("");
  const [deviceDescription, setDeviceDescription] = useState("");
  const [submitError, setSubmitError] = useState("");
  // property_info 동적 입력값 (카테고리 propertyType 기반)
  const [propertyInfo, setPropertyInfo] = useState<Record<string, string>>({});

  // 카테고리 propertyType 별 property_info 스켈레톤 메타
  const { data: propertyTypes = [] } = useDevicePropertyTypes();

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

  const selectedMajor = useMemo(
    () => flat.find((c) => c.categoryId === selectedMajorId) ?? null,
    [flat, selectedMajorId]
  );
  const selectedMid = useMemo(
    () => flat.find((c) => c.categoryId === selectedMidId) ?? null,
    [flat, selectedMidId]
  );
  const selectedSmall = useMemo(
    () => flat.find((c) => c.categoryId === selectedSmallId) ?? null,
    [flat, selectedSmallId]
  );

  const deviceKey = useMemo(
    () => buildDeviceKey(selectedMajor, selectedMid, selectedSmall, deviceName),
    [selectedMajor, selectedMid, selectedSmall, deviceName]
  );

  const schemaDefinitions = selectedSmall?.schemaDefinitions ?? [];

  const pointRows = useMemo(
    () => buildPointRowsFromSchema(deviceKey, schemaDefinitions),
    [deviceKey, schemaDefinitions]
  );

  // 선택된 소분류의 propertyType → property_info 동적 필드 구성
  const smallPropertyType: string | null = selectedSmall?.propertyType ?? null;
  const propTemplate = useMemo<Record<string, any> | null>(
    () =>
      propertyTypes.find((p) => p.type === smallPropertyType)?.template ?? null,
    [propertyTypes, smallPropertyType]
  );
  // template 키에서 type 제외 = 입력 필드 목록 (예: CCTV → main_url/sub_url/user_id/password)
  const propFields = useMemo<string[]>(
    () => (propTemplate ? Object.keys(propTemplate).filter((k) => k !== "type") : []),
    [propTemplate]
  );
  const showPropertyInfo =
    !!smallPropertyType && smallPropertyType !== "GENERIC" && propFields.length > 0;

  useEffect(() => {
    if (!majors.length) return;
    setSelectedMajorId((prev) =>
      prev != null && majors.some((m) => m.categoryId === prev) ? prev : majors[0].categoryId
    );
  }, [majors]);

  const { mutate: createDevice, isPending: isCreating } = useMutation({
    mutationFn: createDeviceAPI,
    onSuccess: (res, variables) => {
      if (res?.success === false) {
        setSubmitError(res?.message || "장비 등록에 실패했습니다.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: DEVICE_LIST_QUERY_KEY });
      const pointCount = variables?.points?.length ?? 0;
      const message =
        res?.message ||
        (pointCount > 0
          ? `장비 및 포인트 ${pointCount}건이 등록되었습니다.`
          : "장비가 등록되었습니다.");
      if (onSuccess) {
        onSuccess(res, variables);
      } else {
        setDeviceName("");
        setDeviceDisplayName("");
        setSubmitError("");
        showAlert(message);
      }
    },
    onError: (err) => {
      setSubmitError(getApiErrorMessage(err, "장비 등록 중 오류가 발생했습니다."));
    },
  });

  const pickMajor = (id) => {
    setSelectedMajorId(id);
    setSelectedMidId(null);
    setSelectedSmallId(null);
    setDeviceName("");
    setDeviceDisplayName("");
    setDeviceDescription("");
    setPropertyInfo({});
    setSubmitError("");
  };
  const pickMid = (id) => {
    setSelectedMidId(id);
    setSelectedSmallId(null);
    setDeviceName("");
    setDeviceDisplayName("");
    setDeviceDescription("");
    setPropertyInfo({});
    setSubmitError("");
  };
  const pickSmall = (id) => {
    setSelectedSmallId(id);
    setDeviceName("");
    setDeviceDisplayName("");
    setDeviceDescription("");
    setPropertyInfo({});
    setSubmitError("");
  };

  const canRegister = Boolean(selectedSmallId && deviceName.trim() && deviceKey);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canRegister) return;
    setSubmitError("");
    // property_info: 카테고리 propertyType 이 있고 GENERIC 이 아니면 type + 입력값으로 조립.
    // (type 은 카테고리에서 자동 결정 — 사용자가 못 바꿈. 값 없으면 null.)
    let propertyInfoPayload: Record<string, any> | null = null;
    if (showPropertyInfo && smallPropertyType) {
      const entries: Record<string, any> = {};
      propFields.forEach((k) => {
        const v = propertyInfo[k];
        entries[k] = v != null && v !== "" ? v : null;
      });
      propertyInfoPayload = { type: smallPropertyType, ...entries };
    }
    createDevice({
      deviceName: deviceName.trim(),
      // 표시명은 선택 입력 — 비우면 생략(백엔드에서 장비명으로 표시).
      ...(deviceDisplayName.trim() ? { deviceDisplayName: deviceDisplayName.trim() } : {}),
      description: deviceDescription.trim(),
      deviceKey,
      categoryId: selectedSmallId,
      active: true,
      propertyInfo: propertyInfoPayload,
      points: pointRows.map(({ tagName, pointKey, schemaTagName, pointName, pointType, unit, tagDesc, isDisplay }) => ({
        tagName,
        pointKey,
        schemaTagName,
        pointName,
        pointType,
        unit,
        tagDesc,
        isDisplay,
      })),
    });
  };

  if (isLoading && !categoryTree) {
    return (
      <Wrap $inModal={inModal}>
        <StatusBox>카테고리를 불러오는 중…</StatusBox>
      </Wrap>
    );
  }

  if (isError) {
    return (
      <Wrap $inModal={inModal}>
        <ErrorBox>
          <p>{error?.message ?? "카테고리를 불러오지 못했습니다."}</p>
          <Button variant="secondary" onClick={() => refetch()}>
            다시 시도
          </Button>
        </ErrorBox>
      </Wrap>
    );
  }

  return (
    <Wrap $inModal={inModal}>
      {isFetching && !isLoading && <FetchHint>동기화 중…</FetchHint>}

      <ThreeCol>
        <Pane>
          <PaneHeader>
            <PaneTitleText>대분류</PaneTitleText>
          </PaneHeader>
          <ListBox>
            {majors.length === 0 && <EmptyHint>등록된 대분류가 없습니다.</EmptyHint>}
            {majors.map((m) => (
              <ListItem
                key={m.categoryId}
                $active={m.categoryId === selectedMajorId}
                onClick={() => pickMajor(m.categoryId)}
              >
                <ItemLabel>{m.categoryName}</ItemLabel>
                {m.categoryCode && <ItemCode>{m.categoryCode}</ItemCode>}
              </ListItem>
            ))}
          </ListBox>
        </Pane>

        <Pane>
          <PaneHeader>
            <PaneTitleText>중분류</PaneTitleText>
          </PaneHeader>
          <ListBox>
            {mids.length === 0 && (
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
                <ItemLabel>{m.categoryName}</ItemLabel>
                {m.categoryCode && <ItemCode>{m.categoryCode}</ItemCode>}
              </ListItem>
            ))}
          </ListBox>
        </Pane>

        <Pane>
          <PaneHeader>
            <PaneTitleText>소분류</PaneTitleText>
          </PaneHeader>
          <ListBox>
            {smalls.length === 0 && (
              <EmptyHint>
                {selectedMidId ? "소분류가 없습니다." : "중분류를 선택하세요."}
              </EmptyHint>
            )}
            {smalls.map((s) => (
              <ListItem
                key={s.categoryId}
                $active={s.categoryId === selectedSmallId}
                onClick={() => pickSmall(s.categoryId)}
              >
                <ItemLabel>{s.categoryName}</ItemLabel>
                {s.categoryCode && <ItemCode>{s.categoryCode}</ItemCode>}
              </ListItem>
            ))}
          </ListBox>
        </Pane>
      </ThreeCol>

      {selectedSmallId ? (
        <RegisterSection onSubmit={handleSubmit}>
          <RegisterHeader>
            <RegisterTitle>장비 정보 등록</RegisterTitle>
            <RegisterPath>{selectedSmall?.fullPath ?? ""}</RegisterPath>
          </RegisterHeader>

          <FieldGrid>
            <FieldLabel $required>장비 이름 (deviceName)</FieldLabel>
            <FieldInput
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="장비 이름을 입력하세요"
              maxLength={100}
              required
            />

            <FieldLabel>표시명 (deviceDisplayName)</FieldLabel>
            <FieldInput
              value={deviceDisplayName}
              onChange={(e) => setDeviceDisplayName(e.target.value)}
              placeholder="비우면 장비명으로 표시됩니다"
              maxLength={100}
            />

            <FieldLabel>장비 키 (deviceKey)</FieldLabel>
            <KeyFieldWrap>
              <KeyInput
                value={deviceKey}
                readOnly
                placeholder="카테고리·장비 이름 입력 시 자동 생성"
              />
              <KeyHint>
                형식: 대(categoryCode)_중(categoryCode)_소(categoryCode)_장비이름
              </KeyHint>
            </KeyFieldWrap>

            <FieldLabel $required>장비 설명 (deviceDescription)</FieldLabel>
            <KeyFieldWrap>
              <FieldInput
                value={deviceDescription}
                onChange={(e) => setDeviceDescription(e.target.value)}
                placeholder="장비 설명을 입력하세요"
                maxLength={200}
                required
              />
            </KeyFieldWrap>
          </FieldGrid>

          {showPropertyInfo && (
            <PropSection>
              <PropHeader>
                <PropTitle>
                  장비 속성 (property_info)
                  <PropTypeBadge>{smallPropertyType}</PropTypeBadge>
                </PropTitle>
                <PropHint>
                  카테고리 타입에 따라 자동 구성됩니다. type 은 카테고리에서 결정됩니다.
                </PropHint>
              </PropHeader>
              <PropGrid>
                {propFields.map((k) => {
                  return (
                    <PropField key={k}>
                      <PropLabel>{k}</PropLabel>
                      <FieldInput
                        type="text"
                        value={propertyInfo[k] ?? ""}
                        onChange={(e) =>
                          setPropertyInfo((prev) => ({ ...prev, [k]: e.target.value }))
                        }
                        placeholder={k}
                        autoComplete="off"
                      />
                    </PropField>
                  );
                })}
              </PropGrid>
            </PropSection>
          )}

          <PointsSection>
            <PointsHeader>
              <PointsTitle>
                포인트 정보
                {pointRows.length > 0 && (
                  <PointsCount>{pointRows.length}개</PointsCount>
                )}
              </PointsTitle>
              <PointsHint>
                tag_name = 스키마 tag (예: test3) · point_key = deviceKey_tag (예: 전기설비_전력제어_SUBE_test_test3)
              </PointsHint>
            </PointsHeader>

            {schemaDefinitions.length === 0 ? (
              <PointsEmpty>
                이 소분류에 스키마 정의가 없습니다. 카테고리 관리에서 스키마를 먼저 등록하세요.
              </PointsEmpty>
            ) : !deviceKey ? (
              <PointsEmpty>장비 이름을 입력하면 point_key가 자동 생성됩니다.</PointsEmpty>
            ) : pointRows.length === 0 ? (
              <PointsEmpty>유효한 schema tagName이 없습니다.</PointsEmpty>
            ) : (
              <>
                <PointsTableWrap>
                  <PointsTable>
                    <thead>
                      <tr>
                        <PTh style={{ width: 100 }}>tagName</PTh>
                        <PTh>point_key</PTh>
                        <PTh style={{ width: 70 }}>type</PTh>
                        <PTh style={{ width: 70 }}>unit</PTh>
                        <PTh $center style={{ width: 56 }}>표시</PTh>
                        <PTh style={{ width: 140 }}>설명</PTh>
                      </tr>
                    </thead>
                    <tbody>
                      {pointRows.map((row) => (
                        <tr key={row.schemaTagName}>
                          <PTd>
                            <SchemaTag>{row.tagName}</SchemaTag>
                          </PTd>
                          <PTd>
                            <FullTagName>{row.pointKey}</FullTagName>
                          </PTd>
                          <PTd>
                            <TypeBadge $type={row.pointType}>{row.pointType || "—"}</TypeBadge>
                          </PTd>
                          <PTd>{row.unit || "—"}</PTd>
                          <PTd $center>
                            {row.isDisplay ? <span>✓</span> : <span style={{ color: "#d1d5db" }}>—</span>}
                          </PTd>
                          <PTd>{row.tagDesc || "—"}</PTd>
                        </tr>
                      ))}
                    </tbody>
                  </PointsTable>
                </PointsTableWrap>
                <PointsPreview>
                  등록 시 전송되는 points:{" "}
                  <code>
                    {JSON.stringify(
                      pointRows.map(({ tagName, pointKey, pointName, pointType, unit, isDisplay }) => ({
                        tagName,
                        pointKey,
                        pointName,
                        pointType,
                        unit,
                        isDisplay,
                      }))
                    )}
                  </code>
                </PointsPreview>
              </>
            )}
          </PointsSection>

          {submitError && <SubmitError>{submitError}</SubmitError>}

          <ButtonRow>
            {onCancel ? (
              <Button variant="outline" onClick={onCancel}>
                취소
              </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={() => {
                setDeviceName("");
                setDeviceDisplayName("");
                setSubmitError("");
                setDeviceDescription("");
              }}
            >
              입력 초기화
            </Button>
            <Button variant="primary" type="submit" disabled={!canRegister || isCreating}>
              {isCreating ? "등록 중…" : "장비 등록"}
            </Button>
          </ButtonRow>
        </RegisterSection>
      ) : (
        <RegisterPlaceholder>
          소분류를 선택하면 아래에서 장비를 등록할 수 있습니다.
        </RegisterPlaceholder>
      )}
    </Wrap>
  );
};

export default DeviceRegistForm;

const Wrap = styled.div<{ $inModal?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: ${(p) => (p.$inModal ? "0 0 4px" : "8px 0 24px")};
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
  p {
    margin: 0 0 12px 0;
  }
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

const ListBox = styled.div`
  flex: 1;
  min-height: 220px;
  max-height: 340px;
  overflow-y: auto;
  padding: 6px;
`;

const ListItem = styled.div<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 8px;
  margin-bottom: 3px;
  font-size: 13px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: ${(p) => (p.$active ? "rgba(74, 99, 128, 0.15)" : "transparent")};
  color: ${(p) => (p.$active ? "#1e3a5f" : "#374151")};
  font-weight: ${(p) => (p.$active ? 600 : 400)};
  cursor: pointer;
  &:hover {
    background: ${(p) => (p.$active ? "rgba(74,99,128,0.2)" : "#f3f4f6")};
  }
`;

const ItemLabel = styled.span`
  flex: 1;
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

const EmptyHint = styled.div`
  padding: 20px 12px;
  text-align: center;
  font-size: 13px;
  color: #9ca3af;
`;

const RegisterSection = styled.form`
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fafafa;
  overflow: hidden;
`;

const RegisterPlaceholder = styled.div`
  padding: 32px 24px;
  text-align: center;
  font-size: 14px;
  color: #9ca3af;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 8px;
`;

const RegisterHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
`;

const RegisterTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #111d2c;
`;

const RegisterPath = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: #4a6380;
  background: #e8ecf1;
  padding: 1px 8px;
  border-radius: 4px;
`;

const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 16px 12px;
  align-items: start;
  padding: 20px 16px;
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const FieldLabel = styled.label<{ $required?: boolean }>`
  font-size: 14px;
  color: #374151;
  padding-top: 8px;
  &::after {
    content: "${(p) => (p.$required ? " *" : "")}";
    color: #dc2626;
  }
`;

const FieldInput = styled.input`
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
  &:focus {
    border-color: #4a90d9;
    box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.15);
  }
  &::placeholder {
    color: #9ca3af;
  }
`;

const KeyFieldWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const KeyInput = styled.input`
  padding: 8px 12px;
  font-size: 14px;
  font-family: ui-monospace, monospace;
  color: #1e3a5f;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  cursor: default;
`;

const KeyHint = styled.span`
  font-size: 12px;
  color: #94a3b8;
`;

const PointsSection = styled.section`
  margin: 0 16px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
`;

const PropSection = styled.section`
  margin: 0 16px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
`;

const PropHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
`;

const PropTitle = styled.h4`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #111d2c;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PropTypeBadge = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: #1d4ed8;
  background: #dbeafe;
  padding: 1px 8px;
  border-radius: 999px;
`;

const PropHint = styled.span`
  font-size: 12px;
  color: #94a3b8;
`;

const PropGrid = styled.div`
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 12px;
  align-items: center;
  padding: 16px;
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const PropField = styled.div`
  display: contents;
`;

const PropLabel = styled.label`
  font-size: 13px;
  color: #374151;
  font-family: ui-monospace, monospace;
`;

const PointsHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
`;

const PointsTitle = styled.h4`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #111d2c;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PointsCount = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #4a6380;
  background: #e8ecf1;
  padding: 1px 8px;
  border-radius: 999px;
`;

const PointsHint = styled.span`
  font-size: 12px;
  color: #94a3b8;
`;

const PointsEmpty = styled.div`
  padding: 24px 16px;
  text-align: center;
  font-size: 13px;
  color: #9ca3af;
  line-height: 1.6;
`;

const PointsTableWrap = styled.div`
  overflow-x: auto;
`;

const PointsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
`;

const PTh = styled.th<{ $center?: boolean }>`
  padding: 9px 12px;
  text-align: ${(p) => (p.$center ? "center" : "left")};
  font-size: 12px;
  font-weight: 700;
  color: #374151;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
`;

const PTd = styled.td<{ $center?: boolean }>`
  padding: 8px 12px;
  border-bottom: 1px solid #f3f4f6;
  color: #374151;
  vertical-align: middle;
  text-align: ${(p) => (p.$center ? "center" : "left")};
`;

const SchemaTag = styled.code`
  font-size: 12px;
  color: #475569;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
`;

const FullTagName = styled.code`
  font-size: 12px;
  color: #1e3a5f;
  word-break: break-all;
`;

const TypeBadge = styled.span<{ $type?: string }>`
  display: inline-block;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 4px;
  background: ${(p) => {
    const t = p.$type;
    if (t === "AI" || t === "AO") return "#dbeafe";
    if (t === "DI" || t === "DO") return "#dcfce7";
    return "#f3f4f6";
  }};
  color: ${(p) => {
    const t = p.$type;
    if (t === "AI" || t === "AO") return "#1d4ed8";
    if (t === "DI" || t === "DO") return "#15803d";
    return "#6b7280";
  }};
`;

const PointsPreview = styled.p`
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

const SubmitError = styled.p`
  margin: 0 16px;
  padding: 10px 12px;
  font-size: 13px;
  color: #991b1b;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
`;

