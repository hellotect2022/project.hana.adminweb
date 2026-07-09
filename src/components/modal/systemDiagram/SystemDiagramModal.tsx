import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Select, Toggle } from "@/components/ui";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import {
  SYSTEM_DIAGRAM_QUERY_KEY,
  createSystemDiagram,
  updateSystemDiagram,
  type DiagramWiringPayloadItem,
  type SystemDiagram,
  type SystemDiagramPayload,
} from "@/services/systemDiagramService";
import {
  DEVICE_CATEGORY_QUERY_KEY,
  DEVICE_LIST_QUERY_KEY,
  categoryFetchAPI,
  fetchDeviceByIdAPI,
  flattenDeviceCategoryTree,
} from "@/services/deviceService";
import DeviceHierarchyFilter from "@/components/device/DeviceHierarchyFilter";
import {
  EMPTY_HIERARCHY_FILTER,
  deriveHierarchyFilterFromDevice,
} from "@/utils/deviceHierarchyFilterUtils";
import {
  UNITY_ASSET_LIST_QUERY_KEY,
  fetchUnityAssetsList,
} from "@/services/unityAssetService";

/**
 * 계통도 등록/수정 모달 (WA-SYSTEM-DIAGRAM)
 * 기본정보 → 마스터 장비 → 서브 장비(다중) → 배선(from/to + 세그먼트 다중) 을 편집한다.
 *
 * 주의: 세그먼트 좌표(start/end x·y·z)는 Unity 월드좌표이며, 3D 씬에서 직접 찍는 UI는
 * 다음 Loop이다. 지금은 숫자 입력 폼(수기 입력)으로 처리한다.
 */

/** 편집용 세그먼트 로컬 상태 (좌표는 문자열로 보관 후 저장 시 Number 변환) */
type SegmentDraft = {
  key: string;
  assetId: string;
  sx: string;
  sy: string;
  sz: string;
  ex: string;
  ey: string;
  ez: string;
};

/** 편집용 배선 로컬 상태 */
type WiringDraft = {
  key: string;
  wiringName: string;
  wiringType: string;
  color: string;
  fromDeviceId: string;
  toDeviceId: string;
  segments: SegmentDraft[];
};

let seq = 0;
const nextKey = () => `k${Date.now()}_${seq++}`;

const emptySegment = (): SegmentDraft => ({
  key: nextKey(),
  assetId: "",
  sx: "0",
  sy: "0",
  sz: "0",
  ex: "0",
  ey: "0",
  ez: "0",
});

const emptyWiring = (): WiringDraft => ({
  key: nextKey(),
  wiringName: "",
  wiringType: "",
  color: "#2563eb",
  fromDeviceId: "",
  toDeviceId: "",
  segments: [],
});

function buildInitialWirings(diagram?: SystemDiagram | null): WiringDraft[] {
  if (!diagram?.wirings?.length) return [];
  return [...diagram.wirings]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((w) => ({
      key: nextKey(),
      wiringName: w.wiringName ?? "",
      wiringType: w.wiringType ?? "",
      color: w.color ?? "#2563eb",
      fromDeviceId: w.fromDeviceId != null ? String(w.fromDeviceId) : "",
      toDeviceId: w.toDeviceId != null ? String(w.toDeviceId) : "",
      segments: (w.segments ?? []).map((s) => ({
        key: nextKey(),
        assetId: s.assetId != null ? String(s.assetId) : "",
        sx: String(s.start?.x ?? 0),
        sy: String(s.start?.y ?? 0),
        sz: String(s.start?.z ?? 0),
        ex: String(s.end?.x ?? 0),
        ey: String(s.end?.y ?? 0),
        ez: String(s.end?.z ?? 0),
      })),
    }));
}

/**
 * 수정 모드 시드: 응답(SystemDiagramResponse)에 이미 들어있는 장비명으로 id→name 맵을
 * 구성한다. 500-cap 목록에 의존하지 않으므로 앞 500개 밖 장비도 정확히 표시된다.
 */
function buildInitialNameMap(
  diagram?: SystemDiagram | null
): Record<number, string> {
  const m: Record<number, string> = {};
  if (!diagram) return m;
  if (diagram.masterDeviceId != null && diagram.masterDeviceName) {
    m[diagram.masterDeviceId] = diagram.masterDeviceName;
  }
  diagram.devices?.forEach((d) => {
    if (d.deviceId != null && d.deviceName) m[d.deviceId] = d.deviceName;
  });
  diagram.wirings?.forEach((w) => {
    if (w.fromDeviceId != null && w.fromDeviceName)
      m[w.fromDeviceId] = w.fromDeviceName;
    if (w.toDeviceId != null && w.toDeviceName)
      m[w.toDeviceId] = w.toDeviceName;
  });
  return m;
}

interface Props {
  /** 수정 대상. null 이면 신규 등록 */
  diagram?: SystemDiagram | null;
  onClose: () => void;
}

const SystemDiagramModal = ({ diagram, onClose }: Props) => {
  const queryClient = useQueryClient();
  const isEdit = !!diagram?.diagramId;

  const [diagramName, setDiagramName] = useState(diagram?.diagramName ?? "");
  const [diagramCode, setDiagramCode] = useState(diagram?.diagramCode ?? "");
  const [masterDeviceId, setMasterDeviceId] = useState<string>(
    diagram?.masterDeviceId != null ? String(diagram.masterDeviceId) : ""
  );
  const [description, setDescription] = useState(diagram?.description ?? "");
  const [sortOrder, setSortOrder] = useState<string>(
    String(diagram?.sortOrder ?? 0)
  );
  const [active, setActive] = useState(diagram?.active ?? true);
  const [subDeviceIds, setSubDeviceIds] = useState<string[]>(
    () =>
      diagram?.devices
        ?.slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((d) => String(d.deviceId)) ?? []
  );
  // 대>중>소>장비 cascade 선택 상태 (masterFilter=마스터용 / subFilter=서브 추가용)
  const [masterFilter, setMasterFilter] = useState(EMPTY_HIERARCHY_FILTER);
  const [subFilter, setSubFilter] = useState(EMPTY_HIERARCHY_FILTER);
  const [wirings, setWirings] = useState<WiringDraft[]>(() =>
    buildInitialWirings(diagram)
  );

  // 수정 모드: 원본 마스터 장비를 단건 조회(GET /device/{id})해 categoryId 확보.
  // 500-cap 목록에 의존하지 않으므로 앞 500개 밖 마스터도 대/중/소를 역산할 수 있다.
  const editMasterId =
    isEdit && diagram?.masterDeviceId != null ? diagram.masterDeviceId : null;
  const { data: masterDeviceRes } = useQuery({
    queryKey: [...DEVICE_LIST_QUERY_KEY, "system-diagram-master", editMasterId],
    queryFn: () => fetchDeviceByIdAPI(Number(editMasterId)),
    enabled: editMasterId != null,
  });
  const masterDevice: any = masterDeviceRes?.data ?? null;

  // 카테고리 트리 — 수정 모드 진입 시 masterDeviceId → 대/중/소 역산용
  // (DeviceHierarchyFilter 내부 쿼리와 동일 키라 react-query 가 캐시 공유)
  const { data: categoryTree } = useQuery({
    queryKey: DEVICE_CATEGORY_QUERY_KEY,
    queryFn: async () => {
      const res = await categoryFetchAPI();
      if (!res?.success) throw new Error(res?.message || "카테고리 조회 실패");
      return res.data ?? [];
    },
  });
  const flatCategories = useMemo(
    () => flattenDeviceCategoryTree(categoryTree),
    [categoryTree]
  );

  // 수정 모드: 단건 조회한 원본 마스터의 categoryId 로 대/중/소 cascade 초깃값 1회 세팅.
  // 합성 배열 [{ deviceId, categoryId }] 을 넘겨 기존 역산 유틸을 그대로 재사용한다.
  const masterInitRef = useRef(false);
  useEffect(() => {
    if (masterInitRef.current) return;
    if (editMasterId == null) {
      masterInitRef.current = true;
      return;
    }
    // 단건 조회 결과 + 카테고리 트리 둘 다 로드돼야 역산 가능
    if (!masterDevice || !flatCategories.length) return;
    setMasterFilter(
      deriveHierarchyFilterFromDevice(
        editMasterId,
        [
          {
            deviceId: Number(editMasterId),
            categoryId: masterDevice.categoryId ?? null,
          },
        ],
        flatCategories
      )
    );
    masterInitRef.current = true;
  }, [editMasterId, masterDevice, flatCategories]);
  // id→장비명 맵(병합형 state). 수정 모드는 응답 값으로 시드하고, 신규 선택 시
  // cascade 가 넘겨준 장비 객체로 병합한다. 500-cap 목록에 의존하지 않는다.
  const [deviceNameById, setDeviceNameById] = useState<Record<number, string>>(
    () => buildInitialNameMap(diagram)
  );

  // cascade 에서 방금 고른 장비 객체를 맵에 병합(해제 시 null → 무시).
  const rememberDeviceName = (device: any | null) => {
    if (!device || device.deviceId == null || !device.deviceName) return;
    setDeviceNameById((prev) =>
      prev[device.deviceId] === device.deviceName
        ? prev
        : { ...prev, [device.deviceId]: device.deviceName }
    );
  };

  // 단건 조회한 마스터 장비명으로 라벨 보강(응답 시드에 없을 경우 대비).
  useEffect(() => {
    if (masterDevice?.deviceId == null || !masterDevice.deviceName) return;
    setDeviceNameById((prev) =>
      prev[masterDevice.deviceId] === masterDevice.deviceName
        ? prev
        : { ...prev, [masterDevice.deviceId]: masterDevice.deviceName }
    );
  }, [masterDevice]);

  // 배관(PIPE) 에셋 목록 — unityAssetService 재사용, assetType === "PIPE" 만
  const { data: assets = [] } = useQuery({
    queryKey: [...UNITY_ASSET_LIST_QUERY_KEY, "pipe"],
    queryFn: () => fetchUnityAssetsList({ activeOnly: true }),
  });
  const pipeAssets = useMemo(
    () => (assets as any[]).filter((a) => a.assetType === "PIPE"),
    [assets]
  );

  // 계통도 소속 장비(마스터 + 서브) = 배선 from/to 후보
  const memberDeviceIds = useMemo(() => {
    const ids: number[] = [];
    if (masterDeviceId) ids.push(Number(masterDeviceId));
    subDeviceIds.forEach((id) => ids.push(Number(id)));
    return ids;
  }, [masterDeviceId, subDeviceIds]);

  // 서브 후보 제외 대상 = 마스터 + 이미 추가된 서브 (memberDeviceIds 재사용).
  // DeviceHierarchyFilter 가 소분류별 장비를 서버에서 직접 조회하므로,
  // 여기서 사전 필터링(subCandidates) 대신 excludeDeviceIds 로 제외만 전달한다.

  // 마스터 cascade 변경: 최종 선택된 deviceId 를 masterDeviceId 에 반영
  const handleMasterFilterChange = (v: typeof EMPTY_HIERARCHY_FILTER) => {
    setMasterFilter(v);
    setMasterDeviceId(v.deviceId || "");
  };

  const addSubDevice = () => {
    const picked = subFilter.deviceId;
    if (!picked) return;
    if (picked === masterDeviceId) {
      window.alert("마스터 장비는 서브 장비로 추가할 수 없습니다.");
      return;
    }
    if (subDeviceIds.includes(picked)) return;
    setSubDeviceIds((prev) => [...prev, picked]);
    setSubFilter(EMPTY_HIERARCHY_FILTER);
  };

  const removeSubDevice = (id: string) =>
    setSubDeviceIds((prev) => prev.filter((x) => x !== id));

  const patchWiring = (key: string, patch: Partial<WiringDraft>) =>
    setWirings((prev) =>
      prev.map((w) => (w.key === key ? { ...w, ...patch } : w))
    );

  const addWiring = () => setWirings((prev) => [...prev, emptyWiring()]);
  const removeWiring = (key: string) =>
    setWirings((prev) => prev.filter((w) => w.key !== key));

  const addSegment = (wiringKey: string) =>
    setWirings((prev) =>
      prev.map((w) =>
        w.key === wiringKey
          ? { ...w, segments: [...w.segments, emptySegment()] }
          : w
      )
    );
  const removeSegment = (wiringKey: string, segKey: string) =>
    setWirings((prev) =>
      prev.map((w) =>
        w.key === wiringKey
          ? { ...w, segments: w.segments.filter((s) => s.key !== segKey) }
          : w
      )
    );
  const patchSegment = (
    wiringKey: string,
    segKey: string,
    patch: Partial<SegmentDraft>
  ) =>
    setWirings((prev) =>
      prev.map((w) =>
        w.key === wiringKey
          ? {
              ...w,
              segments: w.segments.map((s) =>
                s.key === segKey ? { ...s, ...patch } : s
              ),
            }
          : w
      )
    );

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: SystemDiagramPayload) =>
      isEdit
        ? updateSystemDiagram({ diagramId: diagram!.diagramId, payload })
        : createSystemDiagram(payload),
    onSuccess: (res: any) => {
      if (res?.success === false) {
        window.alert(res?.message || "저장에 실패했습니다.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: SYSTEM_DIAGRAM_QUERY_KEY });
      onClose();
    },
    onError: (err) =>
      window.alert(getApiErrorMessage(err, "계통도 저장 중 오류가 발생했습니다.")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!diagramName.trim()) {
      window.alert("계통도명을 입력하세요.");
      return;
    }
    if (!masterDeviceId) {
      window.alert("마스터 장비를 선택하세요.");
      return;
    }

    // 배선 검증: 이름·from·to 필수, from/to 는 계통도 소속 장비여야 함
    for (const w of wirings) {
      if (!w.wiringName.trim()) {
        window.alert("배선명을 입력하세요.");
        return;
      }
      if (!w.fromDeviceId || !w.toDeviceId) {
        window.alert(`배선 "${w.wiringName}" 의 from/to 장비를 선택하세요.`);
        return;
      }
      if (
        !memberDeviceIds.includes(Number(w.fromDeviceId)) ||
        !memberDeviceIds.includes(Number(w.toDeviceId))
      ) {
        window.alert(
          `배선 "${w.wiringName}" 의 from/to 는 계통도 소속 장비(마스터+서브)여야 합니다.`
        );
        return;
      }
      for (const s of w.segments) {
        if (!s.assetId) {
          window.alert(`배선 "${w.wiringName}" 의 세그먼트 배관 에셋을 선택하세요.`);
          return;
        }
      }
    }

    const payload: SystemDiagramPayload = {
      diagramName: diagramName.trim(),
      diagramCode: diagramCode.trim() || null,
      masterDeviceId: Number(masterDeviceId),
      description: description.trim() || null,
      sortOrder: Number(sortOrder) || 0,
      active,
      devices: subDeviceIds.map((id, idx) => ({
        deviceId: Number(id),
        sortOrder: idx,
      })),
      wirings: wirings.map<DiagramWiringPayloadItem>((w, idx) => ({
        wiringName: w.wiringName.trim(),
        wiringType: w.wiringType.trim() || null,
        color: w.color || null,
        sortOrder: idx,
        fromDeviceId: Number(w.fromDeviceId),
        toDeviceId: Number(w.toDeviceId),
        segments: w.segments.map((s) => ({
          assetId: Number(s.assetId),
          start: { x: Number(s.sx) || 0, y: Number(s.sy) || 0, z: Number(s.sz) || 0 },
          end: { x: Number(s.ex) || 0, y: Number(s.ey) || 0, z: Number(s.ez) || 0 },
        })),
      })),
    };

    mutateAsync(payload).catch(() => {
      /* onError 에서 처리 */
    });
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Scroll>
        {/* ① 기본 정보 */}
        <Section>
          <SectionTitle>① 기본 정보</SectionTitle>
          <Field>
            <Label $required>계통도명</Label>
            <Input
              value={diagramName}
              onChange={(e) => setDiagramName(e.target.value)}
              placeholder="예: 냉동기 1호기 계통"
              style={{ width: "100%" }}
            />
          </Field>
          <Field>
            <Label>코드</Label>
            <Input
              value={diagramCode ?? ""}
              onChange={(e) => setDiagramCode(e.target.value)}
              placeholder="계통도 코드(선택)"
              style={{ width: "100%" }}
            />
          </Field>
          <Field style={{ alignItems: "flex-start" }}>
            <Label $required>마스터 장비</Label>
            <CascadeWrap>
              <DeviceHierarchyFilter
                value={masterFilter}
                onChange={handleMasterFilterChange}
                onDevicePicked={rememberDeviceName}
              />
              <PickHint>
                {masterDeviceId
                  ? `선택됨: ${
                      deviceNameById[Number(masterDeviceId)] ??
                      `Device#${masterDeviceId}`
                    }`
                  : "대>중>소 순으로 좁혀 장비 하나를 선택하세요."}
              </PickHint>
            </CascadeWrap>
          </Field>
          <Field>
            <Label>설명</Label>
            <Input
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="계통도 설명(선택)"
              style={{ width: "100%" }}
            />
          </Field>
          <Field>
            <Label>정렬순서</Label>
            <Input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              style={{ width: "100%" }}
            />
          </Field>
          <Field>
            <Label>활성</Label>
            <Toggle on={active} onClick={() => setActive((v) => !v)}>
              {active ? "활성" : "비활성"}
            </Toggle>
          </Field>
        </Section>

        {/* ② 서브 장비 */}
        <Section>
          <SectionTitle>② 서브 장비 (마스터 제외)</SectionTitle>
          <PickerRow>
            <DeviceHierarchyFilter
              excludeDeviceIds={memberDeviceIds}
              value={subFilter}
              onChange={setSubFilter}
              onDevicePicked={rememberDeviceName}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={addSubDevice}
              disabled={!subFilter.deviceId}
            >
              추가
            </Button>
          </PickerRow>
          {subDeviceIds.length === 0 ? (
            <EmptyHint>추가된 서브 장비가 없습니다.</EmptyHint>
          ) : (
            <ChipList>
              {subDeviceIds.map((id) => (
                <DeviceChip key={id}>
                  {deviceNameById[Number(id)] ?? `Device#${id}`}
                  <ChipRemove
                    type="button"
                    onClick={() => removeSubDevice(id)}
                    aria-label="제거"
                  >
                    ×
                  </ChipRemove>
                </DeviceChip>
              ))}
            </ChipList>
          )}
        </Section>

        {/* ③ 배선 */}
        <Section>
          <SectionTitle>③ 배선(wirings)</SectionTitle>
          {pipeAssets.length === 0 && (
            <EmptyHint>
              등록된 배관 에셋 없음 — 세그먼트를 추가하려면 배관(PIPE) 에셋을 먼저
              등록하세요.
            </EmptyHint>
          )}
          {wirings.length === 0 ? (
            <EmptyHint>추가된 배선이 없습니다.</EmptyHint>
          ) : (
            wirings.map((w, wi) => (
              <WiringCard key={w.key}>
                <WiringHead>
                  <WiringNo>배선 #{wi + 1}</WiringNo>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => removeWiring(w.key)}
                  >
                    배선 삭제
                  </Button>
                </WiringHead>
                <WiringGrid>
                  <MiniField>
                    <MiniLabel $required>배선명</MiniLabel>
                    <Input
                      value={w.wiringName}
                      onChange={(e) =>
                        patchWiring(w.key, { wiringName: e.target.value })
                      }
                      placeholder="예: 냉수 공급관"
                      style={{ width: "100%" }}
                    />
                  </MiniField>
                  <MiniField>
                    <MiniLabel>타입</MiniLabel>
                    <Input
                      value={w.wiringType}
                      onChange={(e) =>
                        patchWiring(w.key, { wiringType: e.target.value })
                      }
                      placeholder="예: SUPPLY, RETURN(선택)"
                      style={{ width: "100%" }}
                    />
                  </MiniField>
                  <MiniField>
                    <MiniLabel>색</MiniLabel>
                    <ColorInput
                      type="color"
                      value={w.color || "#2563eb"}
                      onChange={(e) =>
                        patchWiring(w.key, { color: e.target.value })
                      }
                    />
                  </MiniField>
                  <MiniField>
                    <MiniLabel $required>from 장비</MiniLabel>
                    <Select
                      value={w.fromDeviceId}
                      onChange={(e) =>
                        patchWiring(w.key, { fromDeviceId: e.target.value })
                      }
                      style={{ width: "100%" }}
                    >
                      <option value="">선택</option>
                      {memberDeviceIds.map((id) => (
                        <option key={id} value={id}>
                          {deviceNameById[id] ?? `Device#${id}`}
                          {String(id) === masterDeviceId ? " (마스터)" : ""}
                        </option>
                      ))}
                    </Select>
                  </MiniField>
                  <MiniField>
                    <MiniLabel $required>to 장비</MiniLabel>
                    <Select
                      value={w.toDeviceId}
                      onChange={(e) =>
                        patchWiring(w.key, { toDeviceId: e.target.value })
                      }
                      style={{ width: "100%" }}
                    >
                      <option value="">선택</option>
                      {memberDeviceIds.map((id) => (
                        <option key={id} value={id}>
                          {deviceNameById[id] ?? `Device#${id}`}
                          {String(id) === masterDeviceId ? " (마스터)" : ""}
                        </option>
                      ))}
                    </Select>
                  </MiniField>
                </WiringGrid>

                {/* 세그먼트 */}
                <SegHead>
                  <SegTitle>세그먼트 (배관 에셋 + 좌표)</SegTitle>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => addSegment(w.key)}
                    disabled={pipeAssets.length === 0}
                  >
                    + 세그먼트
                  </Button>
                </SegHead>
                {w.segments.length === 0 ? (
                  <SegEmpty>세그먼트가 없습니다.</SegEmpty>
                ) : (
                  w.segments.map((s, si) => (
                    <SegCard key={s.key}>
                      <SegRow>
                        <SegNo>#{si + 1}</SegNo>
                        <Select
                          value={s.assetId}
                          onChange={(e) =>
                            patchSegment(w.key, s.key, { assetId: e.target.value })
                          }
                          style={{ flex: 1 }}
                        >
                          <option value="">배관 에셋 선택</option>
                          {pipeAssets.map((a) => (
                            <option key={a.assetId} value={a.assetId}>
                              {a.assetName}
                            </option>
                          ))}
                        </Select>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => removeSegment(w.key, s.key)}
                        >
                          삭제
                        </Button>
                      </SegRow>
                      <CoordRow>
                        <CoordLabel>start</CoordLabel>
                        <CoordInput
                          type="number"
                          step="any"
                          value={s.sx}
                          onChange={(e) =>
                            patchSegment(w.key, s.key, { sx: e.target.value })
                          }
                          placeholder="x"
                        />
                        <CoordInput
                          type="number"
                          step="any"
                          value={s.sy}
                          onChange={(e) =>
                            patchSegment(w.key, s.key, { sy: e.target.value })
                          }
                          placeholder="y"
                        />
                        <CoordInput
                          type="number"
                          step="any"
                          value={s.sz}
                          onChange={(e) =>
                            patchSegment(w.key, s.key, { sz: e.target.value })
                          }
                          placeholder="z"
                        />
                      </CoordRow>
                      <CoordRow>
                        <CoordLabel>end</CoordLabel>
                        <CoordInput
                          type="number"
                          step="any"
                          value={s.ex}
                          onChange={(e) =>
                            patchSegment(w.key, s.key, { ex: e.target.value })
                          }
                          placeholder="x"
                        />
                        <CoordInput
                          type="number"
                          step="any"
                          value={s.ey}
                          onChange={(e) =>
                            patchSegment(w.key, s.key, { ey: e.target.value })
                          }
                          placeholder="y"
                        />
                        <CoordInput
                          type="number"
                          step="any"
                          value={s.ez}
                          onChange={(e) =>
                            patchSegment(w.key, s.key, { ez: e.target.value })
                          }
                          placeholder="z"
                        />
                      </CoordRow>
                    </SegCard>
                  ))
                )}
              </WiringCard>
            ))
          )}
          <AddWiringRow>
            <Button type="button" variant="secondary" onClick={addWiring}>
              + 배선 추가
            </Button>
          </AddWiringRow>
        </Section>
      </Scroll>

      <Footer>
        <Button variant="outline" type="button" onClick={onClose}>
          취소
        </Button>
        <Button variant="primary" type="submit" disabled={isPending}>
          {isPending ? "저장 중…" : isEdit ? "수정" : "등록"}
        </Button>
      </Footer>
    </Form>
  );
};

export default SystemDiagramModal;

const Form = styled.form``;

const Scroll = styled.div`
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

const Section = styled.div`
  padding: 14px 0;
  border-bottom: 1px solid #f3f4f6;
  &:last-child {
    border-bottom: none;
  }
`;

const SectionTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 13px;
  font-weight: 700;
  color: #374151;
`;

const Field = styled.div`
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
  &:last-child {
    margin-bottom: 0;
  }
`;

const Label = styled.label<{ $required?: boolean }>`
  font-size: 13px;
  color: #374151;
  &::after {
    content: "${(p) => (p.$required ? " *" : "")}";
    color: #dc2626;
  }
`;

const PickerRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-end;
  flex-wrap: wrap;
  margin-bottom: 10px;
`;

const CascadeWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`;

const PickHint = styled.span`
  font-size: 12px;
  color: #6b7280;
`;

const ChipList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const DeviceChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px 4px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 999px;
  background: #eef2f6;
  color: #475569;
`;

const ChipRemove = styled.button`
  border: none;
  background: #d1d5db;
  color: #374151;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  &:hover {
    background: #9ca3af;
    color: #fff;
  }
`;

const EmptyHint = styled.div`
  padding: 10px 0;
  font-size: 12px;
  color: #9ca3af;
`;

const WiringCard = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  background: #fbfcfd;
`;

const WiringHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
`;

const WiringNo = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: #111827;
`;

const WiringGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
`;

const MiniField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const MiniLabel = styled.label<{ $required?: boolean }>`
  font-size: 12px;
  color: #6b7280;
  &::after {
    content: "${(p) => (p.$required ? " *" : "")}";
    color: #dc2626;
  }
`;

const ColorInput = styled.input`
  width: 100%;
  height: 36px;
  padding: 2px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  background: #fff;
`;

const SegHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const SegTitle = styled.h4`
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
`;

const SegEmpty = styled.div`
  font-size: 12px;
  color: #9ca3af;
  padding: 4px 0 8px;
`;

const SegCard = styled.div`
  border: 1px dashed #d1d5db;
  border-radius: 6px;
  padding: 8px 10px;
  margin-bottom: 8px;
  background: #fff;
`;

const SegRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`;

const SegNo = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: #6b7280;
  width: 26px;
`;

const CoordRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  &:last-child {
    margin-bottom: 0;
  }
`;

const CoordLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  width: 40px;
`;

const CoordInput = styled(Input)`
  flex: 1;
  min-width: 0;
`;

const AddWiringRow = styled.div`
  margin-top: 4px;
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 14px;
  margin-top: 4px;
  border-top: 1px solid #e5e7eb;
`;
