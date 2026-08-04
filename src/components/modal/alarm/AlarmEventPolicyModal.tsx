import { showAlert } from "@/utils/dialogBridge";
import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input, SearchableSelect, Select, Toggle } from "@/components/ui";
import DeviceHierarchyFilter from "@/components/device/DeviceHierarchyFilter";
import {
  deriveHierarchyFilterFromCategory,
  deriveHierarchyFilterFromDevice,
  EMPTY_HIERARCHY_FILTER,
} from "@/utils/deviceHierarchyFilterUtils";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import {
  ALARM_POLICY_QUERY_KEY,
  createAlarmPolicy,
  updateAlarmPolicy,
  type AlarmConditionKind,
  type AlarmDisplayType,
  type AlarmLevelKey,
  type AlarmOperator,
  type AlarmPolicy,
  type AlarmPolicyPayload,
  type AlarmScope,
  type OutputSpec,
} from "@/services/alarmPolicyService";
import {
  isComingSoon,
  metaEntries,
  metaKeys,
  useAlarmMeta,
  type AlarmMeta,
} from "@/services/alarmMetaService";
import {
  CCTV_DEFAULT_LIMIT,
  channelColor,
  levelColor,
  OUTPUT_SPEC_KEYS,
  type OutputChannelKey,
} from "@/pages/event/alarmPolicyConstants";
import {
  categoryFetchAPI,
  DEVICE_CATEGORY_QUERY_KEY,
  DEVICE_LIST_QUERY_KEY,
  fetchDeviceByIdAPI,
  fetchDevicesAPI,
  flattenDeviceCategoryTree,
} from "@/services/deviceService";
import { fetchSopTemplates } from "@/services/sopService";

/** 카테고리 schema_definition 의 포인트 정의 (대상 태그 후보) */
type SchemaDef = {
  tagName: string;
  type?: string;
  unit?: string;
  tagDesc?: string;
};

/** 레벨별 출력 채널 편집 상태 */
type ChannelDraft = {
  notify: boolean;
  sopEnabled: boolean;
  sopTemplateId: string;
  cctvEnabled: boolean;
  cctvLimit: string;
  smsEnabled: boolean;
};

/** 편집용 레벨 로컬 상태 */
type LevelDraft = {
  level: AlarmLevelKey;
  enabled: boolean;
  thresholdValue: string;
  icon: string;
  effect: string;
  ch: ChannelDraft;
};

function emptyChannel(): ChannelDraft {
  return {
    notify: false,
    sopEnabled: false,
    sopTemplateId: "",
    cctvEnabled: false,
    cctvLimit: String(CCTV_DEFAULT_LIMIT),
    smsEnabled: false,
  };
}

/** 서버 outputs → 편집 상태 */
function outputsToChannel(outputs?: OutputSpec | null): ChannelDraft {
  const base = emptyChannel();
  if (!outputs) return base;
  return {
    notify: !!outputs.notify?.enabled,
    sopEnabled: !!outputs.sop?.enabled,
    sopTemplateId:
      outputs.sop?.templateId != null ? String(outputs.sop.templateId) : "",
    cctvEnabled: !!outputs.cctv?.enabled,
    cctvLimit:
      outputs.cctv?.limit != null
        ? String(outputs.cctv.limit)
        : String(CCTV_DEFAULT_LIMIT),
    smsEnabled: !!outputs.sms?.enabled,
  };
}

/** 편집 상태 → 서버 outputs (켠 채널만 채움, 없으면 null) */
function channelToOutputs(ch: ChannelDraft): OutputSpec | null {
  const out: OutputSpec = {};
  if (ch.notify) out.notify = { enabled: true };
  if (ch.sopEnabled) {
    out.sop = {
      enabled: true,
      templateId: ch.sopTemplateId ? Number(ch.sopTemplateId) : null,
    };
  }
  if (ch.cctvEnabled) {
    out.cctv = {
      enabled: true,
      source: "DEVICE_MAPPING",
      limit: ch.cctvLimit ? Number(ch.cctvLimit) : CCTV_DEFAULT_LIMIT,
    };
  }
  if (ch.smsEnabled) {
    out.sms = { enabled: true, recipientGroupId: null, templateId: null };
  }
  return Object.keys(out).length ? out : null;
}

/** 메타 level 순서로 레벨 초안 구성 */
function buildInitialLevels(
  policy: AlarmPolicy | null | undefined,
  levelKeys: AlarmLevelKey[]
): LevelDraft[] {
  return levelKeys.map((level) => {
    const existing = policy?.levels?.find((l) => l.level === level);
    return {
      level,
      enabled: !!existing,
      thresholdValue:
        existing?.thresholdValue != null ? String(existing.thresholdValue) : "",
      icon: existing?.icon ?? "",
      effect: existing?.effect ?? "",
      ch: outputsToChannel(existing?.outputs),
    };
  });
}

interface Props {
  /** 수정 대상. null 이면 신규 등록 */
  policy?: AlarmPolicy | null;
  onClose: () => void;
}

/**
 * 알람/이벤트 정책 등록·수정 모달 (WA-ALARM-POLICY, 통합)
 * scope 토글(카테고리/디바이스) + 대>중>소 계층 필터 + 포인트(tag) + 조건 +
 * 레벨별 임계값·출력 채널(알림/SOP/CCTV/SMS) + 경보표시(displayType)·이펙트 + 발동 설정.
 * 값/라벨/순서는 서버 메타(GET /api/alarm/meta)로 구동. 메타 로딩 전에는 로딩 표시.
 */
const AlarmEventPolicyModal = ({ policy, onClose }: Props) => {
  const { data: meta, isError } = useAlarmMeta();

  if (isError) {
    return <Center>알람 메타 정보를 불러오지 못했습니다.</Center>;
  }
  if (!meta) {
    return <Center>불러오는 중…</Center>;
  }
  return <AlarmEventPolicyForm meta={meta} policy={policy} onClose={onClose} />;
};

export default AlarmEventPolicyModal;

/* ────────────────────────────────────────────────────────────────
 * 편집 폼 — meta 는 로딩 완료 후 주입되므로 non-null 로 사용.
 * ──────────────────────────────────────────────────────────────── */
interface FormProps extends Props {
  meta: AlarmMeta;
}

const AlarmEventPolicyForm = ({ meta, policy, onClose }: FormProps) => {
  const queryClient = useQueryClient();
  const isEdit = !!policy?.policyId;

  const levelKeys = useMemo(
    () => metaKeys(meta.level) as AlarmLevelKey[],
    [meta]
  );
  const operatorKeys = useMemo(
    () => metaKeys(meta.operator) as AlarmOperator[],
    [meta]
  );

  const [scope, setScope] = useState<AlarmScope>(policy?.scope ?? "DEVICE");
  // 대상: 대>중>소 계층 필터 (CATEGORY=smallId 사용 / DEVICE=deviceId 사용)
  const [hier, setHier] = useState(() =>
    policy?.scope === "DEVICE" && policy?.deviceId != null
      ? { ...EMPTY_HIERARCHY_FILTER, deviceId: String(policy.deviceId) }
      : EMPTY_HIERARCHY_FILTER
  );
  const deviceId = hier.deviceId;

  const [policyName, setPolicyName] = useState(policy?.policyName ?? "");
  const [description, setDescription] = useState(policy?.description ?? "");
  const [tagName, setTagName] = useState(policy?.tagName ?? "");
  const [pointType, setPointType] = useState(policy?.pointType ?? "");
  const [conditionKind, setConditionKind] = useState<AlarmConditionKind>(
    policy?.conditionKind ??
      ((metaKeys(meta.conditionKind)[0] ?? "THRESHOLD") as AlarmConditionKind)
  );
  const [operator, setOperator] = useState<AlarmOperator>(
    policy?.operator ?? (operatorKeys[0] ?? "GTE")
  );
  const [triggerValue, setTriggerValue] = useState(policy?.triggerValue ?? "");
  const [displayType, setDisplayType] = useState<AlarmDisplayType>(
    policy?.displayType ??
      ((metaKeys(meta.displayType)[0] ?? "SIMPLE") as AlarmDisplayType)
  );
  const [sopTemplateId, setSopTemplateId] = useState<string>(
    policy?.sopTemplateId != null ? String(policy.sopTemplateId) : ""
  );
  const [effectEnabled, setEffectEnabled] = useState(
    policy?.effectEnabled ?? false
  );
  const [sustainSec, setSustainSec] = useState<string>(
    String(policy?.sustainSec ?? 0)
  );
  const [cooldownSec, setCooldownSec] = useState<string>(
    String(policy?.cooldownSec ?? 0)
  );
  const [active, setActive] = useState(policy?.active ?? true);
  const [levels, setLevels] = useState<LevelDraft[]>(() =>
    buildInitialLevels(policy, levelKeys)
  );

  const isThreshold = conditionKind === "THRESHOLD";
  const isCategory = scope === "CATEGORY";
  const usesSop = displayType === "SOP" || displayType === "POPUP_SOP";

  // 카테고리 트리 (schema + cascade 역산용).
  // ※ queryFn 은 다른 모든 소비처(DeviceHierarchyFilter 등)와 동일하게 트리 배열(res.data)을
  //   반환해야 한다. 같은 queryKey 를 공유하므로 형태가 다르면 캐시 충돌로 빈 배열이 된다.
  const { data: categoryTree } = useQuery({
    queryKey: DEVICE_CATEGORY_QUERY_KEY,
    queryFn: async () => {
      const res = await categoryFetchAPI();
      if (!res?.success) throw new Error(res?.message || "카테고리 조회 실패");
      return res.data ?? [];
    },
  });
  const flatCategories = useMemo(
    () => flattenDeviceCategoryTree(categoryTree ?? []) as any[],
    [categoryTree]
  );
  const categoryById = useMemo(() => {
    const m = new Map<number, any>();
    flatCategories.forEach((c) => m.set(c.categoryId, c));
    return m;
  }, [flatCategories]);

  // 수정 모드: 기존 정책 → 대/중/소 cascade 초깃값 역산
  const { data: editDeviceRes } = useQuery({
    queryKey: [...DEVICE_LIST_QUERY_KEY, "alarm-policy-edit-device", policy?.deviceId],
    queryFn: () => fetchDeviceByIdAPI(policy!.deviceId),
    enabled: isEdit && policy?.scope === "DEVICE" && policy?.deviceId != null,
  });
  const hierSeeded = useRef(false);
  useEffect(() => {
    if (hierSeeded.current) return;
    if (!isEdit || flatCategories.length === 0) return;
    if (policy?.scope === "DEVICE") {
      if (policy?.deviceId == null) {
        hierSeeded.current = true;
        return;
      }
      const dev = editDeviceRes?.data;
      if (!dev) return;
      setHier(deriveHierarchyFilterFromDevice(policy.deviceId, [dev], flatCategories));
      hierSeeded.current = true;
    } else {
      // CATEGORY
      if (policy?.categoryId == null) {
        hierSeeded.current = true;
        return;
      }
      setHier(deriveHierarchyFilterFromCategory(policy.categoryId, flatCategories));
      hierSeeded.current = true;
    }
  }, [editDeviceRes, flatCategories, isEdit, policy]);

  // 선택된 소분류(smallId) = 카테고리(정책 categoryId) 또는 장비의 카테고리 → schema 후보
  const activeCategoryId = hier.smallId ? Number(hier.smallId) : null;
  const tagOptions = useMemo<SchemaDef[]>(() => {
    if (activeCategoryId == null) return [];
    const defs = (categoryById.get(activeCategoryId)?.schemaDefinitions ??
      []) as SchemaDef[];
    return defs.filter((d) => d?.tagName);
  }, [activeCategoryId, categoryById]);

  // DEVICE 범위: 선택된 소분류의 장비 목록 → 장비 드롭다운(SearchableSelect) 옵션
  const { data: deviceListRes, isLoading: devicesLoading } = useQuery({
    queryKey: [...DEVICE_LIST_QUERY_KEY, "alarm-policy-device-picker", hier.smallId],
    queryFn: () => fetchDevicesAPI({ categoryId: Number(hier.smallId), size: 500 }),
    enabled: !isCategory && !!hier.smallId,
  });
  const deviceOptions = useMemo(
    () =>
      (deviceListRes?.data?.content ?? []).map((d: any) => ({
        value: d.deviceId,
        label: d.deviceName ?? `Device#${d.deviceId}`,
        sublabel: d.description || undefined,
      })),
    [deviceListRes]
  );
  const handleDeviceChange = (val: string) =>
    setHier((prev) => ({ ...prev, deviceId: val }));

  // 대상 변경으로 스키마에 없어진 태그는 초기화 (스키마 미로딩 시엔 유지)
  useEffect(() => {
    if (
      tagOptions.length > 0 &&
      tagName &&
      !tagOptions.some((d) => d.tagName === tagName)
    ) {
      setTagName("");
      setPointType("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagOptions]);

  // 태그 선택 시 포인트 타입/조건 종류 자동 설정 (AI→임계치, DI→토글)
  const handleTagSelect = (tn: string) => {
    setTagName(tn);
    const def = tagOptions.find((d) => d.tagName === tn);
    if (def?.type) {
      setPointType(def.type);
      const t = def.type.toUpperCase();
      if (t.includes("DI")) setConditionKind("TOGGLE");
      else if (t.includes("AI")) setConditionKind("THRESHOLD");
    }
  };

  const { data: sopTemplates = [] } = useQuery({
    queryKey: ["sop", "templates", "active"],
    queryFn: () => fetchSopTemplates(true),
  });

  const patchLevel = (level: AlarmLevelKey, patch: Partial<LevelDraft>) =>
    setLevels((prev) =>
      prev.map((l) => (l.level === level ? { ...l, ...patch } : l))
    );
  const patchChannel = (level: AlarmLevelKey, patch: Partial<ChannelDraft>) =>
    setLevels((prev) =>
      prev.map((l) =>
        l.level === level ? { ...l, ch: { ...l.ch, ...patch } } : l
      )
    );

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: AlarmPolicyPayload) =>
      isEdit
        ? updateAlarmPolicy({ policyId: policy!.policyId, payload })
        : createAlarmPolicy(payload),
    onSuccess: (res: any) => {
      if (res?.success === false) {
        showAlert(res?.message || "저장에 실패했습니다.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ALARM_POLICY_QUERY_KEY });
      onClose();
    },
    onError: (err) =>
      showAlert(getApiErrorMessage(err, "알람/이벤트 정책 저장 중 오류가 발생했습니다.")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isCategory && !hier.smallId) {
      showAlert("대상 카테고리(소분류)를 선택하세요.");
      return;
    }
    if (!isCategory && !deviceId) {
      showAlert("대상 장비를 선택하세요.");
      return;
    }
    if (!tagName.trim()) {
      showAlert("대상 포인트(tagName)를 선택/입력하세요.");
      return;
    }
    if (!policyName.trim()) {
      showAlert("정책명을 입력하세요.");
      return;
    }
    if (!isThreshold && !triggerValue.trim()) {
      showAlert("토글 조건의 트리거 값을 입력하세요.");
      return;
    }

    const enabledLevels = levels.filter((l) => l.enabled);
    if (enabledLevels.length === 0) {
      showAlert("레벨을 최소 1개 이상 사용 설정하세요.");
      return;
    }
    if (
      isThreshold &&
      !enabledLevels.some((l) => l.thresholdValue.trim() !== "")
    ) {
      showAlert("임계치 조건은 레벨 중 최소 1개에 임계값을 입력해야 합니다.");
      return;
    }

    const payload: AlarmPolicyPayload = {
      policyName: policyName.trim(),
      description: description?.trim() || null,
      scope,
      categoryId: isCategory ? Number(hier.smallId) : null,
      deviceId: !isCategory ? Number(deviceId) : null,
      tagName: tagName.trim(),
      pointType: pointType.trim() || null,
      conditionKind,
      operator: isThreshold ? operator : null,
      triggerValue: !isThreshold ? triggerValue.trim() || null : null,
      displayType,
      sopTemplateId: usesSop && sopTemplateId ? Number(sopTemplateId) : null,
      effectEnabled,
      sustainSec: Number(sustainSec) || 0,
      cooldownSec: Number(cooldownSec) || 0,
      active,
      levels: enabledLevels.map((l, idx) => ({
        level: l.level,
        thresholdValue:
          isThreshold && l.thresholdValue !== ""
            ? Number(l.thresholdValue)
            : null,
        icon: l.icon.trim(),
        effect: l.effect.trim(),
        displayOrder: idx,
        outputs: channelToOutputs(l.ch),
      })),
    };

    mutateAsync(payload).catch(() => {
      /* onError 에서 처리 */
    });
  };

  /** 레벨별 출력 채널 그리드 — 메타 outputChannel 순서/라벨/준비중 구동 */
  const renderChannels = (l: LevelDraft) =>
    metaKeys(meta.outputChannel).map((upper) => {
      const lower = upper.toLowerCase() as OutputChannelKey;
      const rawLabel = meta.outputChannel[upper] ?? upper;
      const soon = isComingSoon(rawLabel);
      const label = rawLabel.replace(/\(준비중\)/g, "").trim();
      const col = channelColor(lower);
      const supported = (OUTPUT_SPEC_KEYS as string[]).includes(lower);

      // OutputSpec 슬롯이 없는 채널(BROADCAST/EMAIL 등) — 비활성 준비중 표시
      if (!supported) {
        return (
          <ChannelBox key={upper} $muted>
            <ChannelHead>
              <ChannelName $color={col.color}>
                {label}
                {soon && <ComingSoon>준비중</ComingSoon>}
              </ChannelName>
              <Toggle on={false} disabled>
                OFF
              </Toggle>
            </ChannelHead>
            <ChannelDesc>연동 예정</ChannelDesc>
          </ChannelBox>
        );
      }

      if (lower === "notify") {
        return (
          <ChannelBox key={upper} $on={l.ch.notify}>
            <ChannelHead>
              <ChannelName $color={col.color}>
                {label}
                {soon && <ComingSoon>준비중</ComingSoon>}
              </ChannelName>
              <Toggle
                on={l.ch.notify}
                disabled={!l.enabled}
                onClick={() => patchChannel(l.level, { notify: !l.ch.notify })}
              >
                {l.ch.notify ? "ON" : "OFF"}
              </Toggle>
            </ChannelHead>
            <ChannelDesc>팝업·토스트 알림</ChannelDesc>
          </ChannelBox>
        );
      }

      if (lower === "sop") {
        return (
          <ChannelBox key={upper} $on={l.ch.sopEnabled}>
            <ChannelHead>
              <ChannelName $color={col.color}>
                {label}
                {soon && <ComingSoon>준비중</ComingSoon>}
              </ChannelName>
              <Toggle
                on={l.ch.sopEnabled}
                disabled={!l.enabled}
                onClick={() =>
                  patchChannel(l.level, { sopEnabled: !l.ch.sopEnabled })
                }
              >
                {l.ch.sopEnabled ? "ON" : "OFF"}
              </Toggle>
            </ChannelHead>
            {l.ch.sopEnabled ? (
              <Select
                value={l.ch.sopTemplateId}
                disabled={!l.enabled}
                onChange={(e) =>
                  patchChannel(l.level, { sopTemplateId: e.target.value })
                }
                style={{ width: "100%" }}
              >
                <option value="">SOP 템플릿 선택</option>
                {sopTemplates.map((t: any) => (
                  <option key={t.templateId} value={t.templateId}>
                    {t.templateName}
                    {t.templateCode ? ` (${t.templateCode})` : ""}
                  </option>
                ))}
              </Select>
            ) : (
              <ChannelDesc>대응 절차 패널</ChannelDesc>
            )}
          </ChannelBox>
        );
      }

      if (lower === "cctv") {
        return (
          <ChannelBox key={upper} $on={l.ch.cctvEnabled}>
            <ChannelHead>
              <ChannelName $color={col.color}>
                {label}
                {soon && <ComingSoon>준비중</ComingSoon>}
              </ChannelName>
              <Toggle
                on={l.ch.cctvEnabled}
                disabled={!l.enabled}
                onClick={() =>
                  patchChannel(l.level, { cctvEnabled: !l.ch.cctvEnabled })
                }
              >
                {l.ch.cctvEnabled ? "ON" : "OFF"}
              </Toggle>
            </ChannelHead>
            {l.ch.cctvEnabled ? (
              <CctvRow>
                <span>발생 장비 주변</span>
                <Input
                  type="number"
                  min={1}
                  max={16}
                  value={l.ch.cctvLimit}
                  disabled={!l.enabled}
                  onChange={(e) =>
                    patchChannel(l.level, { cctvLimit: e.target.value })
                  }
                  style={{ width: 64 }}
                />
                <span>분할</span>
              </CctvRow>
            ) : (
              <ChannelDesc>발생 장비 주변 자동 선정</ChannelDesc>
            )}
          </ChannelBox>
        );
      }

      // sms — 슬롯 있음(켜면 저장), 라벨은 메타(준비중 배지)
      return (
        <ChannelBox key={upper} $on={l.ch.smsEnabled} $muted>
          <ChannelHead>
            <ChannelName $color={col.color}>
              {label}
              {soon && <ComingSoon>준비중</ComingSoon>}
            </ChannelName>
            <Toggle
              on={l.ch.smsEnabled}
              disabled={!l.enabled}
              onClick={() =>
                patchChannel(l.level, { smsEnabled: !l.ch.smsEnabled })
              }
            >
              {l.ch.smsEnabled ? "ON" : "OFF"}
            </Toggle>
          </ChannelHead>
          <ChannelDesc>문자 발송(발송 연동 예정)</ChannelDesc>
        </ChannelBox>
      );
    });

  return (
    <Form onSubmit={handleSubmit}>
      <Scroll>
        {/* ① 대상 — scope 토글 + 대>중>소 계층 필터 */}
        <Section>
          <SectionTitle>① 대상</SectionTitle>
          <Field>
            <Label $required>범위</Label>
            <SegGroup>
              {metaEntries(meta.scope).map(([value, label]) => (
                <SegBtn
                  key={value}
                  type="button"
                  $active={scope === value}
                  onClick={() => setScope(value)}
                >
                  {label}
                </SegBtn>
              ))}
            </SegGroup>
          </Field>
          <FieldStack>
            <Label $required>
              {isCategory
                ? "대상 카테고리 (대 › 중 › 소 선택)"
                : "대상 (대 › 중 › 소 선택)"}
            </Label>
            <DeviceHierarchyFilter value={hier} onChange={setHier} hideDevice />
            {isCategory && (
              <Hint>소분류(소)까지 선택하면 그 카테고리가 대상이 됩니다.</Hint>
            )}
          </FieldStack>
          {!isCategory && (
            <Field>
              <Label $required>장비</Label>
              <SearchableSelect
                options={deviceOptions}
                value={hier.deviceId}
                onChange={handleDeviceChange}
                placeholder={
                  !hier.smallId ? "소분류를 먼저 선택" : "장비 검색/선택"
                }
                disabled={!hier.smallId}
                loading={devicesLoading}
                emptyText="해당 소분류에 장비 없음"
                noMatchText="검색 결과 없음"
              />
            </Field>
          )}
          <Field>
            <Label $required>포인트(tagName)</Label>
            {tagOptions.length > 0 ? (
              <SearchableSelect
                options={tagOptions.map((d) => ({
                  value: d.tagName,
                  label: d.tagName,
                  sublabel: [
                    d.type,
                    d.unit ? `(${d.unit})` : "",
                    d.tagDesc ? `— ${d.tagDesc}` : "",
                  ]
                    .filter(Boolean)
                    .join(" "),
                }))}
                value={tagName}
                onChange={handleTagSelect}
                placeholder="포인트 검색/선택"
                emptyText="포인트 없음"
                noMatchText="검색 결과 없음"
              />
            ) : (
              <Input
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                placeholder={
                  activeCategoryId == null
                    ? isCategory
                      ? "카테고리(소분류)를 먼저 선택하세요"
                      : "장비를 먼저 선택하세요"
                    : "스키마 없음 — 직접 입력 (예: CurTemp)"
                }
                style={{ width: "100%" }}
              />
            )}
          </Field>
          <Field>
            <Label>포인트 타입</Label>
            <Input
              value={pointType}
              onChange={(e) => setPointType(e.target.value)}
              placeholder="포인트 선택 시 자동 (예: AI, DI)"
              style={{ width: "100%" }}
            />
          </Field>
        </Section>

        {/* ② 기본 정보 */}
        <Section>
          <SectionTitle>② 기본 정보</SectionTitle>
          <Field>
            <Label $required>정책명</Label>
            <Input
              value={policyName}
              onChange={(e) => setPolicyName(e.target.value)}
              placeholder="예: 급기 온도 과열 경보"
              style={{ width: "100%" }}
            />
          </Field>
          <Field>
            <Label>설명</Label>
            <Input
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="정책 설명(선택)"
              style={{ width: "100%" }}
            />
          </Field>
        </Section>

        {/* ③ 발생 조건 */}
        <Section>
          <SectionTitle>③ 발생 조건</SectionTitle>
          <Field>
            <Label $required>조건 종류</Label>
            <Select
              value={conditionKind}
              onChange={(e) =>
                setConditionKind(e.target.value as AlarmConditionKind)
              }
              style={{ width: "100%" }}
            >
              {metaEntries(meta.conditionKind).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          {isThreshold ? (
            <Field>
              <Label $required>연산자</Label>
              <Select
                value={operator}
                onChange={(e) => setOperator(e.target.value as AlarmOperator)}
                style={{ width: "100%" }}
              >
                {metaEntries(meta.operator).map(([value, symbol]) => (
                  <option key={value} value={value}>
                    {symbol} ({value})
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field>
              <Label $required>트리거 값</Label>
              <Input
                value={triggerValue}
                onChange={(e) => setTriggerValue(e.target.value)}
                placeholder="예: 1 (토글 ON)"
                style={{ width: "100%" }}
              />
            </Field>
          )}
          <Hint>
            {isThreshold
              ? "레벨별 임계값과 연산자로 조건을 평가합니다. (예: 임계값 이상)"
              : "포인트 값이 트리거 값과 같아지면 발생합니다."}
          </Hint>
        </Section>

        {/* ④ 레벨별 임계값 + 출력 채널 (핵심) */}
        <Section>
          <SectionTitle>④ 레벨별 임계값 · 출력 채널</SectionTitle>
          <Hint>
            레벨을 켜고, 레벨마다 켤 출력 채널을 선택하세요. 심각도가 올라갈수록
            채널을 더 켜 에스컬레이션을 구성할 수 있습니다.
          </Hint>
          <LevelCards>
            {levels.map((l) => {
              const cfg = levelColor(l.level);
              const label = meta.level[l.level] ?? l.level;
              return (
                <LevelCard key={l.level} $on={l.enabled} $accent={cfg.dot}>
                  <LevelCardHead>
                    <LevelToggle
                      type="button"
                      $on={l.enabled}
                      $bg={cfg.bg}
                      $color={cfg.color}
                      onClick={() =>
                        patchLevel(l.level, { enabled: !l.enabled })
                      }
                    >
                      <Dot style={{ background: cfg.dot }} />
                      {label}
                    </LevelToggle>
                    {isThreshold && (
                      <ThresholdBox>
                        <ThresholdLabel>
                          {operator ? meta.operator[operator] ?? "" : ""} 임계값
                        </ThresholdLabel>
                        <Input
                          type="number"
                          value={l.thresholdValue}
                          disabled={!l.enabled}
                          onChange={(e) =>
                            patchLevel(l.level, {
                              thresholdValue: e.target.value,
                            })
                          }
                          placeholder="값"
                          style={{ width: 110 }}
                        />
                      </ThresholdBox>
                    )}
                  </LevelCardHead>

                  <ChannelGrid $disabled={!l.enabled}>
                    {renderChannels(l)}
                  </ChannelGrid>

                  {/* 3D 아이콘/이펙트 (연출용, 선택) */}
                  <LevelExtra $disabled={!l.enabled}>
                    <ExtraField>
                      <ExtraLabel>아이콘</ExtraLabel>
                      <Input
                        value={l.icon}
                        disabled={!l.enabled}
                        onChange={(e) =>
                          patchLevel(l.level, { icon: e.target.value })
                        }
                        placeholder="아이콘 키/이모지"
                        style={{ width: "100%" }}
                      />
                    </ExtraField>
                    <ExtraField>
                      <ExtraLabel>이펙트</ExtraLabel>
                      <Input
                        value={l.effect}
                        disabled={!l.enabled}
                        onChange={(e) =>
                          patchLevel(l.level, { effect: e.target.value })
                        }
                        placeholder="예: blink, pulse"
                        style={{ width: "100%" }}
                      />
                    </ExtraField>
                  </LevelExtra>
                </LevelCard>
              );
            })}
          </LevelCards>
        </Section>

        {/* ⑤ 경보 표시 · 연출 */}
        <Section>
          <SectionTitle>⑤ 경보 표시 · 연출</SectionTitle>
          <Field>
            <Label $required>경보 표시</Label>
            <Select
              value={displayType}
              onChange={(e) =>
                setDisplayType(e.target.value as AlarmDisplayType)
              }
              style={{ width: "100%" }}
            >
              {metaEntries(meta.displayType).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          {usesSop && (
            <Field>
              <Label>SOP 템플릿</Label>
              <Select
                value={sopTemplateId}
                onChange={(e) => setSopTemplateId(e.target.value)}
                style={{ width: "100%" }}
              >
                <option value="">선택하세요</option>
                {sopTemplates.map((t: any) => (
                  <option key={t.templateId} value={t.templateId}>
                    {t.templateName}
                    {t.templateCode ? ` (${t.templateCode})` : ""}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field>
            <Label>3D 이펙트 연출</Label>
            <Toggle
              on={effectEnabled}
              onClick={() => setEffectEnabled((v) => !v)}
            >
              {effectEnabled ? "연출 ON" : "연출 OFF"}
            </Toggle>
          </Field>
        </Section>

        {/* ⑥ 발동 설정 */}
        <Section>
          <SectionTitle>⑥ 발동 설정</SectionTitle>
          <TwoCol>
            <Field>
              <Label>지속 시간(초)</Label>
              <Input
                type="number"
                min={0}
                value={sustainSec}
                onChange={(e) => setSustainSec(e.target.value)}
                style={{ width: "100%" }}
              />
            </Field>
            <Field>
              <Label>쿨다운(초)</Label>
              <Input
                type="number"
                min={0}
                value={cooldownSec}
                onChange={(e) => setCooldownSec(e.target.value)}
                style={{ width: "100%" }}
              />
            </Field>
          </TwoCol>
          <Field>
            <Label>활성</Label>
            <Toggle on={active} onClick={() => setActive((v) => !v)}>
              {active ? "활성" : "비활성"}
            </Toggle>
          </Field>
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

const Center = styled.div`
  padding: 40px 0;
  text-align: center;
  font-size: 13px;
  color: #9ca3af;
`;

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

/* 계층 필터처럼 넓은 컨트롤은 라벨 아래로 세로 배치.
 * 드롭다운은 portal 로 떠서 잘리지 않으므로 내부 overflow 를 두지 않는다. */
const FieldStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
`;

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
`;

const Label = styled.label<{ $required?: boolean }>`
  font-size: 13px;
  color: #374151;
  &::after {
    content: "${(p) => (p.$required ? " *" : "")}";
    color: #dc2626;
  }
`;

const SegGroup = styled.div`
  display: inline-flex;
  gap: 6px;
`;

const SegBtn = styled.button<{ $active?: boolean }>`
  padding: 6px 18px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  border: 1.5px solid ${(p) => (p.$active ? "#2563eb" : "#e5e7eb")};
  background: ${(p) => (p.$active ? "#eff6ff" : "#fff")};
  color: ${(p) => (p.$active ? "#2563eb" : "#6b7280")};
`;

const Hint = styled.p`
  margin: 0 0 12px 0;
  font-size: 12px;
  color: #6b7280;
`;

const LevelCards = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const LevelCard = styled.div<{ $on?: boolean; $accent: string }>`
  border: 1px solid ${(p) => (p.$on ? "#e5e7eb" : "#f0f1f3")};
  border-left: 3px solid ${(p) => (p.$on ? p.$accent : "#e5e7eb")};
  border-radius: 8px;
  padding: 12px 14px;
  background: ${(p) => (p.$on ? "#fff" : "#fafafa")};
`;

const LevelCardHead = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 12px;
`;

const LevelToggle = styled.button<{ $on?: boolean; $bg: string; $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  font-size: 12px;
  font-weight: 700;
  border-radius: 12px;
  cursor: pointer;
  border: 1.5px solid ${(p) => (p.$on ? p.$color : "#e5e7eb")};
  background: ${(p) => (p.$on ? p.$bg : "#fff")};
  color: ${(p) => (p.$on ? p.$color : "#9ca3af")};
`;

const ThresholdBox = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

const ThresholdLabel = styled.span`
  font-size: 12px;
  color: #6b7280;
  font-weight: 600;
`;

const Dot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
`;

const ChannelGrid = styled.div<{ $disabled?: boolean }>`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 10px;
  opacity: ${(p) => (p.$disabled ? 0.5 : 1)};
  pointer-events: ${(p) => (p.$disabled ? "none" : "auto")};
`;

const ChannelBox = styled.div<{ $on?: boolean; $muted?: boolean }>`
  border: 1px solid ${(p) => (p.$on ? "#c7d2fe" : "#e5e7eb")};
  background: ${(p) => (p.$on ? "#f5f7ff" : "#fff")};
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ChannelHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const ChannelName = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: ${(p) => p.$color};
`;

const ComingSoon = styled.span`
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 700;
  border-radius: 999px;
  background: #f3f4f6;
  color: #9ca3af;
`;

const ChannelDesc = styled.span`
  font-size: 11px;
  color: #9ca3af;
`;

const CctvRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #374151;
`;

const LevelExtra = styled.div<{ $disabled?: boolean }>`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 10px;
  opacity: ${(p) => (p.$disabled ? 0.5 : 1)};
  pointer-events: ${(p) => (p.$disabled ? "none" : "auto")};
`;

const ExtraField = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ExtraLabel = styled.span`
  font-size: 12px;
  color: #6b7280;
  flex-shrink: 0;
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 14px;
  margin-top: 4px;
  border-top: 1px solid #e5e7eb;
`;
