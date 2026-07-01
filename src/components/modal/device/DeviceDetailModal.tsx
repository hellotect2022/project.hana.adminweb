import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui";
import {
  categoryFetchAPI,
  DEVICE_CATEGORY_QUERY_KEY,
  deviceLogicalPointsQueryKey,
  DEVICE_LIST_QUERY_KEY,
  deleteDeviceAPI,
  fetchDeviceLogicalPointsAPI,
  flattenDeviceCategoryTree,
  patchDeviceAPI,
} from "@/services/deviceService";
import DeviceSmallCategorySelect from "@/components/device/DeviceSmallCategorySelect";
import {
  fetchUnityAssetsList,
  UNITY_ASSET_LIST_QUERY_KEY,
} from "@/services/unityAssetService";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

/**
 * 장비 상세 보기 + 기본 정보 편집 모달
 * @param {{ device: object; onClose?: () => void; onDeleted?: () => void }} props
 */
const DeviceDetailModal = ({ device, onClose, onDeleted }) => {
  const queryClient = useQueryClient();

  // ── 편집 상태 ──
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    deviceName: device?.deviceName ?? "",
    description: device?.description ?? "",
    active: device?.active ?? true,
    categoryId: device?.categoryId ? String(device.categoryId) : "",
    assetId: device?.assetId != null ? String(device.assetId) : "",
  });
  const [dirty, setDirty] = useState(false);

  // device prop이 바뀌면 form 초기화
  useEffect(() => {
    if (!device) return;
    setForm({
      deviceName: device.deviceName ?? "",
      description: device.description ?? "",
      active: device.active ?? true,
      categoryId: device.categoryId ? String(device.categoryId) : "",
      assetId: device.assetId != null ? String(device.assetId) : "",
    });
    setDirty(false);
    setEditMode(false);
  }, [device]);

  const {
    data: assets = [],
    isLoading: isAssetsLoading,
    isError: isAssetsError,
    error: assetsError,
  } = useQuery({
    queryKey: UNITY_ASSET_LIST_QUERY_KEY,
    queryFn: () => fetchUnityAssetsList({ activeOnly: true }),
    enabled: editMode,
  });

  // ── 카테고리 목록 ──
  const { data: flatCategories = [] } = useQuery({
    queryKey: DEVICE_CATEGORY_QUERY_KEY,
    queryFn: async () => {
      const res = await categoryFetchAPI();
      if (!res?.success) throw new Error(res?.message ?? "카테고리 조회 실패");
      return res.data ?? [];
    },
    select: (tree) => flattenDeviceCategoryTree(tree).filter((c) => c.active !== false),
  });

  const selectedCategoryLabel = useMemo(() => {
    if (!form.categoryId) return "— 미지정 —";
    const cat = flatCategories.find((c) => String(c.categoryId) === form.categoryId);
    return cat ? (cat.fullPath || cat.categoryName) : `ID: ${form.categoryId}`;
  }, [flatCategories, form.categoryId]);

  const {
    data: devicePoints = [],
    isLoading: isPointsLoading,
    isError: isPointsError,
    error: pointsError,
  } = useQuery({
    queryKey: deviceLogicalPointsQueryKey(device?.deviceId),
    queryFn: async () => {
      const res = await fetchDeviceLogicalPointsAPI(device.deviceId);
      if (!res?.success) throw new Error(res?.message ?? "포인트 조회 실패");
      return res.data ?? [];
    },
    enabled: Boolean(device?.deviceId),
  });

  // ── 저장 mutation ──
  const { mutate: patchDevice, isPending: isSaving } = useMutation({
    mutationFn: patchDeviceAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEVICE_LIST_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: deviceLogicalPointsQueryKey(device.deviceId) });
      setEditMode(false);
      setDirty(false);
    },
    onError: (err) => {
      window.alert(getApiErrorMessage(err, "장비 저장에 실패했습니다."));
    },
  });

  const { mutate: removeDevice, isPending: isDeleting } = useMutation({
    mutationFn: deleteDeviceAPI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEVICE_LIST_QUERY_KEY });
      onDeleted?.();
      onClose?.();
    },
    onError: (err) => {
      window.alert(getApiErrorMessage(err, "장비 삭제에 실패했습니다."));
    },
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const handleSave = () => {
    patchDevice({
      deviceId: device.deviceId,
      payload: {
        deviceName: form.deviceName || null,
        description: form.description || null,
        active: form.active,
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        assetId: form.assetId ? Number(form.assetId) : null,
      },
    });
  };

  const handleDelete = () => {
    if (isDeleting) return;
    const label = device.deviceName || `ID #${device.deviceId}`;
    if (!window.confirm(`장비 "${label}" 을(를) 삭제할까요?\n연결된 포인트·이벤트 규칙도 함께 삭제됩니다.`)) {
      return;
    }
    removeDevice(device.deviceId);
  };

  const handleCancel = () => {
    setForm({
      deviceName: device.deviceName ?? "",
      description: device.description ?? "",
      active: device.active ?? true,
      categoryId: device.categoryId ? String(device.categoryId) : "",
      assetId: device.assetId != null ? String(device.assetId) : "",
    });
    setDirty(false);
    setEditMode(false);
  };

  if (!device) return <Empty>장비 정보를 불러올 수 없습니다.</Empty>;

  const formatDate = (str) =>
    str ? new Date(str).toLocaleString("ko-KR") : "-";

  const loc = device.location;
  const tf = device.transform;

  return (
    <Container>
      {/* ── 헤더 액션 ── */}
      <ModalToolbar>
        <DeviceIdBadge>ID #{device.deviceId}</DeviceIdBadge>
        <ToolbarActions>
          {!editMode ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => setEditMode(true)}>
                ✏ 편집
              </Button>
              <Button variant="danger" size="sm" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? "삭제 중…" : "삭제"}
              </Button>
            </>
          ) : (
            <EditingHint>편집 중 {dirty && <DirtyDot />}</EditingHint>
          )}
        </ToolbarActions>
      </ModalToolbar>

      {/* ── 기본 정보 섹션 ── */}
      <Section>
        <SectionTitle>기본 정보</SectionTitle>

        {/* 장비 이름 */}
        <Row>
          <RowLabel>장비 이름</RowLabel>
          <RowValue>
            {editMode ? (
              <Input
                value={form.deviceName}
                onChange={(e) => handleChange("deviceName", e.target.value)}
                placeholder="장비 이름"
              />
            ) : (
              device.deviceName
            )}
          </RowValue>
        </Row>

        {/* 설명 */}
        <Row $alignTop>
          <RowLabel>설명</RowLabel>
          <RowValue>
            {editMode ? (
              <Textarea
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="장비 설명 (선택)"
                rows={2}
              />
            ) : (
              device.description || "-"
            )}
          </RowValue>
        </Row>

        {/* 활성 여부 */}
        <Row>
          <RowLabel>활성 여부</RowLabel>
          <RowValue>
            {editMode ? (
              <CheckLabel>
                <Checkbox
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => handleChange("active", e.target.checked)}
                />
                {form.active ? "활성" : "비활성"}
              </CheckLabel>
            ) : (
              <Badge $active={device.active}>{device.active ? "활성" : "비활성"}</Badge>
            )}
          </RowValue>
        </Row>

        {/* 카테고리 ★ */}
        <Row>
          <RowLabel $highlight>카테고리</RowLabel>
          <RowValue>
            {editMode ? (
              <CategoryFieldWrap>
                <DeviceSmallCategorySelect
                  categories={flatCategories}
                  value={form.categoryId}
                  onChange={(e) => handleChange("categoryId", e.target.value)}
                />
                <CategoryEditHint>
                  소분류만 선택 가능합니다. 저장 시 device_key·포인트 point_key가 새 카테고리 기준으로
                  일괄 갱신됩니다.
                </CategoryEditHint>
              </CategoryFieldWrap>
            ) : form.categoryId ? (
              <CategoryPath>{selectedCategoryLabel}</CategoryPath>
            ) : (
              <CategoryEmpty>미지정</CategoryEmpty>
            )}
          </RowValue>
        </Row>

        <Row>
          <RowLabel>3D 에셋</RowLabel>
          <RowValue>
            {editMode ? (
              isAssetsLoading ? (
                <AssetStatus>에셋 목록 불러오는 중…</AssetStatus>
              ) : isAssetsError ? (
                <AssetStatus $error>
                  {assetsError?.message ?? "에셋 목록을 불러오지 못했습니다."}
                </AssetStatus>
              ) : (
                <AssetSelect
                  value={form.assetId}
                  onChange={(e) => handleChange("assetId", e.target.value)}
                >
                  <option value="">— 3D 에셋 없음 —</option>
                  {assets.map((a) => (
                    <option key={a.assetId} value={String(a.assetId)}>
                      {a.assetName}
                    </option>
                  ))}
                </AssetSelect>
              )
            ) : (
              device.assetName || "-"
            )}
          </RowValue>
        </Row>
        <Row>
          <RowLabel>배치 상태</RowLabel>
          <RowValue>
            <Badge $placed={device.set}>{device.set ? "배치됨" : "미배치"}</Badge>
          </RowValue>
        </Row>
        <Row>
          <RowLabel>등록일</RowLabel>
          <RowValue>{formatDate(device.createdAt)}</RowValue>
        </Row>
        <Row>
          <RowLabel>수정일</RowLabel>
          <RowValue>{formatDate(device.updatedAt)}</RowValue>
        </Row>
      </Section>

      <Section>
        <SectionTitle>
          장비 포인트
          {!isPointsLoading && devicePoints.length > 0 && (
            <PointCount>{devicePoints.length}개</PointCount>
          )}
        </SectionTitle>
        {isPointsLoading ? (
          <PointsHint>포인트 목록을 불러오는 중…</PointsHint>
        ) : isPointsError ? (
          <PointsHint $error>{pointsError?.message ?? "포인트를 불러오지 못했습니다."}</PointsHint>
        ) : devicePoints.length === 0 ? (
          <PointsHint>등록된 포인트가 없습니다.</PointsHint>
        ) : (
          <PointsTableWrap>
            <PointsTable>
              <thead>
                <tr>
                  <th>태그명</th>
                  <th>포인트명</th>
                  <th>타입</th>
                  <th>단위</th>
                  <th>SI 매핑</th>
                  <th>활성</th>
                </tr>
              </thead>
              <tbody>
                {devicePoints.map((p) => (
                  <tr key={p.pointId}>
                    <td>
                      <TagCell>{p.tagName || "-"}</TagCell>
                      <KeySub>{p.pointKey}</KeySub>
                    </td>
                    <td>{p.pointName || "-"}</td>
                    <td>{p.pointType || "-"}</td>
                    <td>{p.unit || "-"}</td>
                    <td>
                      {p.refDeviceCode && p.refPointCode
                        ? `${p.refDeviceCode}:${p.refPointCode}`
                        : "—"}
                    </td>
                    <td>
                      <Badge $active={p.active !== false}>
                        {p.active !== false ? "활성" : "비활성"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </PointsTable>
          </PointsTableWrap>
        )}
      </Section>

      {/* ── 위치 정보 ── */}
      {loc && (
        <Section>
          <SectionTitle>위치 정보</SectionTitle>
          {[
            { label: "건물", value: loc.buildingName },
            { label: "층", value: loc.floorName },
            { label: "구역", value: loc.zoneName },
            { label: "상세 구역", value: loc.zoneDetailName },
          ].map((r) => (
            <Row key={r.label}>
              <RowLabel>{r.label}</RowLabel>
              <RowValue>{r.value || "-"}</RowValue>
            </Row>
          ))}
        </Section>
      )}

      {/* ── 3D 배치 정보 ── */}
      {tf && (
        <Section>
          <SectionTitle>3D 배치 정보</SectionTitle>
          {[
            { label: "위치 (X/Y/Z)", value: `${tf.posX ?? 0} / ${tf.posY ?? 0} / ${tf.posZ ?? 0}` },
            { label: "회전 (X/Y/Z)", value: `${tf.rotX ?? 0} / ${tf.rotY ?? 0} / ${tf.rotZ ?? 0}` },
            { label: "스케일 (X/Y/Z)", value: `${tf.scaleX ?? 1} / ${tf.scaleY ?? 1} / ${tf.scaleZ ?? 1}` },
          ].map((r) => (
            <Row key={r.label}>
              <RowLabel>{r.label}</RowLabel>
              <RowValue>{r.value}</RowValue>
            </Row>
          ))}
        </Section>
      )}

      {/* ── 편집 모드 액션 버튼 ── */}
      {editMode && (
        <ActionRow>
          <Button variant="outline" onClick={handleCancel}>
            취소
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={!dirty || isSaving}>
            {isSaving ? "저장 중…" : "저장"}
          </Button>
        </ActionRow>
      )}
    </Container>
  );
};

export default DeviceDetailModal;

// ─────────────────────────────────────────────
// Styled Components
// ─────────────────────────────────────────────

const Container = styled.div`
  min-width: 520px;
  max-width: min(92vw, 720px);
`;

const PointCount = styled.span`
  margin-left: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
`;

const PointsHint = styled.p<{ $error?: boolean }>`
  margin: 0;
  font-size: 13px;
  color: ${(p) => (p.$error ? "#dc2626" : "#94a3b8")};
`;

const PointsTableWrap = styled.div`
  overflow-x: auto;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
`;

const PointsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;

  th {
    text-align: left;
    padding: 8px 10px;
    background: #f8fafc;
    color: #475569;
    font-weight: 600;
    white-space: nowrap;
    border-bottom: 1px solid #e5e7eb;
  }

  td {
    padding: 8px 10px;
    color: #111827;
    border-bottom: 1px solid #f3f4f6;
    vertical-align: top;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }
`;

const TagCell = styled.span`
  display: block;
  font-weight: 600;
  color: #1d4ed8;
`;

const KeySub = styled.span`
  display: block;
  margin-top: 2px;
  font-size: 10px;
  color: #94a3b8;
  word-break: break-all;
`;

const ModalToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
`;

const DeviceIdBadge = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  background: #f1f5f9;
  padding: 3px 10px;
  border-radius: 12px;
`;

const ToolbarActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const EditingHint = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #f59e0b;
`;

const DirtyDot = styled.span`
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #f59e0b;
`;

const Section = styled.section`
  margin-bottom: 20px;
`;

const SectionTitle = styled.h3`
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 700;
  color: #374151;
  margin: 0 0 10px 0;
  padding-bottom: 7px;
  border-bottom: 1px solid #e8eaed;
`;

const Row = styled.div<{ $alignTop?: boolean }>`
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 8px;
  align-items: ${(p) => (p.$alignTop ? "flex-start" : "center")};
  padding: 7px 0;
  border-bottom: 1px solid #f3f4f6;
`;

const RowLabel = styled.span<{ $highlight?: boolean }>`
  font-size: 13px;
  font-weight: 600;
  color: ${(p) => (p.$highlight ? "#2563eb" : "#6b7280")};
  white-space: nowrap;
`;

const RowValue = styled.div`
  font-size: 13px;
  color: #111827;
  word-break: break-all;
`;

const Badge = styled.span<{ $active?: boolean; $placed?: boolean }>`
  display: inline-block;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 12px;
  background: ${(p) => {
    if (p.$active !== undefined) return p.$active ? "#dcfce7" : "#fee2e2";
    if (p.$placed !== undefined) return p.$placed ? "#dbeafe" : "#f3f4f6";
    return "#f3f4f6";
  }};
  color: ${(p) => {
    if (p.$active !== undefined) return p.$active ? "#15803d" : "#dc2626";
    if (p.$placed !== undefined) return p.$placed ? "#1d4ed8" : "#6b7280";
    return "#6b7280";
  }};
`;

const Input = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 6px 10px;
  font-size: 13px;
  border: 1px solid #d1d5db;
  border-radius: 5px;
  outline: none;
  &:focus { border-color: #4a90d9; box-shadow: 0 0 0 2px rgba(74,144,217,0.12); }
  &::placeholder { color: #c4c9d0; }
`;

const Textarea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  padding: 6px 10px;
  font-size: 13px;
  border: 1px solid #d1d5db;
  border-radius: 5px;
  outline: none;
  resize: vertical;
  font-family: inherit;
  &:focus { border-color: #4a90d9; }
  &::placeholder { color: #c4c9d0; }
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
  width: 15px;
  height: 15px;
  accent-color: #4a90d9;
  cursor: pointer;
`;

const CategoryFieldWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
`;

const CategoryEditHint = styled.span`
  font-size: 11px;
  line-height: 1.45;
  color: #64748b;
`;

const AssetSelect = styled.select`
  width: 100%;
  padding: 6px 10px;
  font-size: 13px;
  border: 1px solid #d1d5db;
  border-radius: 5px;
  background: #fff;
  outline: none;
  cursor: pointer;
  &:focus {
    border-color: #4a90d9;
    box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.12);
  }
`;

const AssetStatus = styled.span<{ $error?: boolean }>`
  font-size: 12px;
  color: ${(p) => (p.$error ? "#dc2626" : "#64748b")};
`;

const CategoryPath = styled.span`
  font-size: 13px;
  color: #1d4ed8;
  background: #eff6ff;
  padding: 2px 10px;
  border-radius: 4px;
`;

const CategoryEmpty = styled.span`
  font-size: 13px;
  color: #9ca3af;
  font-style: italic;
`;

const ActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
  margin-top: 4px;
`;

const Empty = styled.div`
  padding: 40px;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
`;
