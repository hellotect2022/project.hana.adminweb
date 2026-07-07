import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Select, Toggle } from "@/components/ui";
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
} from "@/services/alarmPolicyService";
import {
  CONDITION_KIND_LABEL,
  DISPLAY_TYPE_LABEL,
  LEVEL_CONFIG,
  LEVEL_ORDER,
  OPERATOR_LABEL,
  SCOPE_LABEL,
} from "@/pages/event/alarmPolicyConstants";
import {
  categoryFetchAPI,
  DEVICE_CATEGORY_QUERY_KEY,
  DEVICE_LIST_QUERY_KEY,
  fetchDevicesAPI,
  flattenDeviceCategoryTree,
} from "@/services/deviceService";
import { fetchSopTemplates } from "@/services/sopService";

const OPERATORS: AlarmOperator[] = ["GTE", "LTE", "GT", "LT"];
const CONDITION_KINDS: AlarmConditionKind[] = ["THRESHOLD", "TOGGLE"];
const DISPLAY_TYPES: AlarmDisplayType[] = ["SIMPLE", "SOP", "POPUP_SOP"];

/** 카테고리 schema_definition 의 포인트 정의 (대상 태그 후보) */
type SchemaDef = {
  tagName: string;
  type?: string;
  unit?: string;
  tagDesc?: string;
};

/** 편집용 레벨 로컬 상태(사용 여부 enabled 포함) */
type LevelDraft = {
  level: AlarmLevelKey;
  enabled: boolean;
  thresholdValue: string;
  icon: string;
  effect: string;
};

function buildInitialLevels(policy?: AlarmPolicy | null): LevelDraft[] {
  return LEVEL_ORDER.map((level) => {
    const existing = policy?.levels?.find((l) => l.level === level);
    return {
      level,
      enabled: !!existing,
      thresholdValue:
        existing?.thresholdValue != null ? String(existing.thresholdValue) : "",
      icon: existing?.icon ?? "",
      effect: existing?.effect ?? "",
    };
  });
}

interface Props {
  /** 수정 대상. null 이면 신규 등록 */
  policy?: AlarmPolicy | null;
  onClose: () => void;
}

/**
 * 알람 정책 등록/수정 모달 (WA-ALARM-POLICY)
 * 범위(디바이스/카테고리) → 대상 선택 → 조건/연산자/레벨 3단/경보표시/이펙트 설정.
 */
const AlarmPolicyModal = ({ policy, onClose }: Props) => {
  const queryClient = useQueryClient();
  const isEdit = !!policy?.policyId;

  const [scope, setScope] = useState<AlarmScope>(policy?.scope ?? "DEVICE");
  const [deviceId, setDeviceId] = useState<string>(
    policy?.deviceId != null ? String(policy.deviceId) : ""
  );
  const [categoryId, setCategoryId] = useState<string>(
    policy?.categoryId != null ? String(policy.categoryId) : ""
  );
  const [policyName, setPolicyName] = useState(policy?.policyName ?? "");
  const [description, setDescription] = useState(policy?.description ?? "");
  const [tagName, setTagName] = useState(policy?.tagName ?? "");
  const [pointType, setPointType] = useState(policy?.pointType ?? "");
  const [conditionKind, setConditionKind] = useState<AlarmConditionKind>(
    policy?.conditionKind ?? "THRESHOLD"
  );
  const [operator, setOperator] = useState<AlarmOperator>(
    policy?.operator ?? "GTE"
  );
  const [triggerValue, setTriggerValue] = useState(policy?.triggerValue ?? "");
  const [displayType, setDisplayType] = useState<AlarmDisplayType>(
    policy?.displayType ?? "SIMPLE"
  );
  const [sopTemplateId, setSopTemplateId] = useState<string>(
    policy?.sopTemplateId != null ? String(policy.sopTemplateId) : ""
  );
  const [effectEnabled, setEffectEnabled] = useState(policy?.effectEnabled ?? false);
  const [sustainSec, setSustainSec] = useState<string>(
    String(policy?.sustainSec ?? 0)
  );
  const [cooldownSec, setCooldownSec] = useState<string>(
    String(policy?.cooldownSec ?? 0)
  );
  const [active, setActive] = useState(policy?.active ?? true);
  const [levels, setLevels] = useState<LevelDraft[]>(() =>
    buildInitialLevels(policy)
  );

  const isThreshold = conditionKind === "THRESHOLD";
  const usesSop = displayType === "SOP" || displayType === "POPUP_SOP";

  // 대상 선택용 목록 (기존 deviceService 재사용)
  const { data: catRes } = useQuery({
    queryKey: DEVICE_CATEGORY_QUERY_KEY,
    queryFn: categoryFetchAPI,
  });
  const flatCategories = useMemo(
    () => flattenDeviceCategoryTree(catRes?.data ?? []) as any[],
    [catRes]
  );
  const leafCategories = useMemo(() => {
    // 소분류(leaf)만 노출 (없으면 전체)
    const leaves = flatCategories.filter((c) => c.isLeaf);
    return (leaves.length ? leaves : flatCategories).sort((a, b) =>
      (a.fullPath ?? "").localeCompare(b.fullPath ?? "")
    );
  }, [flatCategories]);
  const categoryById = useMemo(() => {
    const m = new Map<number, any>();
    flatCategories.forEach((c) => m.set(c.categoryId, c));
    return m;
  }, [flatCategories]);

  const { data: deviceRes } = useQuery({
    queryKey: [...DEVICE_LIST_QUERY_KEY, "alarm-policy-picker"],
    queryFn: () => fetchDevicesAPI({ page: 0, size: 500 }),
  });
  const devices = deviceRes?.data?.content ?? [];

  // 선택된 대상의 카테고리 → schema_definition 에서 대상 태그 후보를 도출
  const selectedDevice = useMemo(
    () => devices.find((d: any) => String(d.deviceId) === deviceId),
    [devices, deviceId]
  );
  const activeCategoryId =
    scope === "DEVICE"
      ? selectedDevice?.categoryId ?? null
      : categoryId
      ? Number(categoryId)
      : null;
  const tagOptions = useMemo<SchemaDef[]>(() => {
    if (activeCategoryId == null) return [];
    const defs = (categoryById.get(activeCategoryId)?.schemaDefinitions ??
      []) as SchemaDef[];
    return defs.filter((d) => d?.tagName);
  }, [activeCategoryId, categoryById]);

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

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: AlarmPolicyPayload) =>
      isEdit
        ? updateAlarmPolicy({ policyId: policy!.policyId, payload })
        : createAlarmPolicy(payload),
    onSuccess: (res: any) => {
      if (res?.success === false) {
        window.alert(res?.message || "저장에 실패했습니다.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ALARM_POLICY_QUERY_KEY });
      onClose();
    },
    onError: (err) =>
      window.alert(getApiErrorMessage(err, "알람 정책 저장 중 오류가 발생했습니다.")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!policyName.trim()) {
      window.alert("정책명을 입력하세요.");
      return;
    }
    if (scope === "DEVICE" && !deviceId) {
      window.alert("대상 디바이스를 선택하세요.");
      return;
    }
    if (scope === "CATEGORY" && !categoryId) {
      window.alert("대상 카테고리(소분류)를 선택하세요.");
      return;
    }
    if (!tagName.trim()) {
      window.alert("대상 태그(tagName)를 입력하세요.");
      return;
    }

    const enabledLevels = levels.filter((l) => l.enabled);
    if (enabledLevels.length === 0) {
      window.alert("심각도 레벨을 최소 1개 이상 사용 설정하세요.");
      return;
    }

    const payload: AlarmPolicyPayload = {
      policyName: policyName.trim(),
      description: description.trim() || null,
      scope,
      categoryId: scope === "CATEGORY" ? Number(categoryId) : null,
      deviceId: scope === "DEVICE" ? Number(deviceId) : null,
      tagName: tagName.trim(),
      pointType: pointType.trim() || null,
      conditionKind,
      operator: isThreshold ? operator : null,
      triggerValue: triggerValue.trim() || null,
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
      })),
    };

    mutateAsync(payload).catch(() => {
      /* onError 에서 처리 */
    });
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Scroll>
        {/* ① 범위 · 대상 */}
        <Section>
          <SectionTitle>① 범위 · 대상</SectionTitle>
          <Field>
            <Label $required>범위</Label>
            <SegGroup>
              {(["DEVICE", "CATEGORY"] as AlarmScope[]).map((s) => (
                <SegBtn
                  key={s}
                  type="button"
                  $active={scope === s}
                  onClick={() => setScope(s)}
                >
                  {SCOPE_LABEL[s]}
                </SegBtn>
              ))}
            </SegGroup>
          </Field>

          {scope === "DEVICE" ? (
            <Field>
              <Label $required>대상 디바이스</Label>
              <Select
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                style={{ width: "100%" }}
              >
                <option value="">디바이스 선택</option>
                {devices.map((d: any) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.deviceName}
                    {d.categoryPath ? ` (${d.categoryPath})` : ""}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field>
              <Label $required>대상 카테고리(소분류)</Label>
              <Select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={{ width: "100%" }}
              >
                <option value="">카테고리 선택</option>
                {leafCategories.map((c) => (
                  <option key={c.categoryId} value={c.categoryId}>
                    {c.fullPath || c.categoryName}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field>
            <Label $required>대상 태그(tagName)</Label>
            {tagOptions.length > 0 ? (
              <Select
                value={tagName}
                onChange={(e) => handleTagSelect(e.target.value)}
                style={{ width: "100%" }}
              >
                <option value="">태그 선택</option>
                {tagName && !tagOptions.some((d) => d.tagName === tagName) && (
                  <option value={tagName}>{tagName} (현재값)</option>
                )}
                {tagOptions.map((d) => (
                  <option key={d.tagName} value={d.tagName}>
                    {d.tagName}
                    {d.type ? ` · ${d.type}` : ""}
                    {d.unit ? ` (${d.unit})` : ""}
                    {d.tagDesc ? ` — ${d.tagDesc}` : ""}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                placeholder={
                  activeCategoryId == null
                    ? "대상(디바이스/카테고리)을 먼저 선택하세요"
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
              placeholder="태그 선택 시 자동 (예: AI, DI)"
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
              {CONDITION_KINDS.map((k) => (
                <option key={k} value={k}>
                  {CONDITION_KIND_LABEL[k]}
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
                {OPERATORS.map((op) => (
                  <option key={op} value={op}>
                    {OPERATOR_LABEL[op]} ({op})
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
        </Section>

        {/* ④ 심각도 레벨 (3단) */}
        <Section>
          <SectionTitle>④ 심각도 레벨 (주의 / 경계 / 심각)</SectionTitle>
          <LevelTable>
            <thead>
              <tr>
                <Lth style={{ width: 90 }}>사용 / 레벨</Lth>
                {isThreshold && <Lth style={{ width: 120 }}>임계값</Lth>}
                <Lth>아이콘</Lth>
                <Lth>이펙트</Lth>
              </tr>
            </thead>
            <tbody>
              {levels.map((l) => {
                const cfg = LEVEL_CONFIG[l.level];
                return (
                  <tr key={l.level}>
                    <Ltd>
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
                        {cfg.label}
                      </LevelToggle>
                    </Ltd>
                    {isThreshold && (
                      <Ltd>
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
                          style={{ width: "100%" }}
                        />
                      </Ltd>
                    )}
                    <Ltd>
                      <Input
                        value={l.icon}
                        disabled={!l.enabled}
                        onChange={(e) =>
                          patchLevel(l.level, { icon: e.target.value })
                        }
                        placeholder="아이콘 키/이모지"
                        style={{ width: "100%" }}
                      />
                    </Ltd>
                    <Ltd>
                      <Input
                        value={l.effect}
                        disabled={!l.enabled}
                        onChange={(e) =>
                          patchLevel(l.level, { effect: e.target.value })
                        }
                        placeholder="예: blink, pulse"
                        style={{ width: "100%" }}
                      />
                    </Ltd>
                  </tr>
                );
              })}
            </tbody>
          </LevelTable>
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
              {DISPLAY_TYPES.map((d) => (
                <option key={d} value={d}>
                  {DISPLAY_TYPE_LABEL[d]}
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
            <Label>이펙트 연출</Label>
            <Toggle
              on={effectEnabled}
              onClick={() => setEffectEnabled((v) => !v)}
            >
              {effectEnabled ? "3D 연출 ON" : "3D 연출 OFF"}
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

export default AlarmPolicyModal;

const Form = styled.form`
`;

const Scroll = styled.div`
  //border : 2px solid red;
  //max-height: min(72vh, 640px);
  overflow-y: auto;
  /* 스크롤은 유지하되 스크롤바 표시는 숨김 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
  &::-webkit-scrollbar {
    display: none; /* Chrome/Safari */
  }
`;

const Section = styled.div`
  //border : 2px solid blue;
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
  //border : 2px solid green;
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

const LevelTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
`;

const Lth = styled.th`
  padding: 8px 8px;
  text-align: left;
  font-size: 12px;
  font-weight: 700;
  color: #374151;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
`;

const Ltd = styled.td`
  padding: 6px 8px;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: middle;
`;

const LevelToggle = styled.button<{ $on?: boolean; $bg: string; $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 700;
  border-radius: 12px;
  cursor: pointer;
  border: 1.5px solid ${(p) => (p.$on ? p.$color : "#e5e7eb")};
  background: ${(p) => (p.$on ? p.$bg : "#fff")};
  color: ${(p) => (p.$on ? p.$color : "#9ca3af")};
`;

const Dot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
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
