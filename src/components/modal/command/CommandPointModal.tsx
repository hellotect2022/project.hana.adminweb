import { showAlert } from "@/utils/dialogBridge";
import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input, SearchableSelect, Toggle } from "@/components/ui";
import DeviceHierarchyFilter from "@/components/device/DeviceHierarchyFilter";
import { EMPTY_HIERARCHY_FILTER } from "@/utils/deviceHierarchyFilterUtils";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import {
  deviceLogicalPointsQueryKey,
  fetchDeviceLogicalPointsAPI,
} from "@/services/deviceService";
import {
  commandPointsQueryKey,
  COMMAND_POINTS_PAGE_QUERY_KEY,
  createCommandPoint,
  updateCommandPoint,
  type CommandPointRequest,
  type CommandPointResponse,
} from "@/services/commandService";

/** tbl_device_point 논리 포인트 (매핑 UI 표시용) */
interface LogicalPoint {
  pointId: number;
  pointKey: string;
  tagName: string;
  pointName: string;
  pointType: string | null;
  unit: string | null;
  active: boolean;
  refDeviceCode: string | null;
  refPointCode: string | null;
}

interface Props {
  /** 수정(edit) 모드에서 고정된 대상 디바이스. create 모드에선 미지정(모달 내 계층 선택). */
  deviceId?: number;
  deviceName?: string | null;
  /** 수정 대상. null 이면 신규 등록 */
  commandPoint?: CommandPointResponse | null;
  onClose: () => void;
}

/**
 * 제어 포인트 등록/수정 모달 (WA-COMMAND-POINT)
 * 해당 디바이스의 tbl_device_point 목록에서 제어에 사용할 포인트를 고르고,
 * 표시명·ON/OFF 전송값·정렬·활성을 설정한다.
 * ref_device_code / ref_point_code(=XN 코드)를 함께 노출해 매핑을 검증한다.
 */
const CommandPointModal = ({
  deviceId: propDeviceId,
  deviceName: propDeviceName,
  commandPoint,
  onClose,
}: Props) => {
  const queryClient = useQueryClient();
  const isEdit = !!commandPoint?.commandPointId;

  // create 모드: 모달 내부 대>중>소>장비 계층 선택 / edit 모드: prop 으로 고정
  const [hier, setHier] = useState(EMPTY_HIERARCHY_FILTER);
  const [pickedDevice, setPickedDevice] = useState<any | null>(null);

  const deviceId: number | undefined = isEdit
    ? propDeviceId
    : hier.deviceId
    ? Number(hier.deviceId)
    : undefined;
  const deviceName: string | null | undefined = isEdit
    ? propDeviceName
    : pickedDevice?.deviceName ??
      (deviceId != null ? `Device#${deviceId}` : undefined);

  const [pointId, setPointId] = useState<string>(
    commandPoint?.pointId != null ? String(commandPoint.pointId) : ""
  );
  const [label, setLabel] = useState(commandPoint?.label ?? "");
  const [onValue, setOnValue] = useState(commandPoint?.onValue ?? "1");
  const [offValue, setOffValue] = useState(commandPoint?.offValue ?? "0");
  const [sortOrder, setSortOrder] = useState<string>(
    String(commandPoint?.sortOrder ?? 0)
  );
  const [active, setActive] = useState(commandPoint?.active ?? true);

  // create 모드에서 대상 장비가 바뀌면 선택 포인트/표시명 초기화
  useEffect(() => {
    if (isEdit) return;
    setPointId("");
    setLabel("");
  }, [deviceId, isEdit]);

  // 선택된 디바이스의 논리 포인트 목록 (제어 대상 후보)
  const { data: pointsRes, isLoading: pointsLoading } = useQuery({
    queryKey: deviceLogicalPointsQueryKey(deviceId ?? "none"),
    queryFn: () => fetchDeviceLogicalPointsAPI(deviceId),
    enabled: !!deviceId,
  });
  const points: LogicalPoint[] = pointsRes?.data ?? [];

  const pointOptions = useMemo(
    () =>
      points.map((p) => ({
        value: p.pointId,
        label: `${p.tagName}${p.pointName ? ` · ${p.pointName}` : ""}`,
        sublabel: [
          p.refDeviceCode ? `dev:${p.refDeviceCode}` : null,
          p.refPointCode ? `pt:${p.refPointCode}` : null,
          p.pointType ?? null,
        ]
          .filter(Boolean)
          .join(" · "),
      })),
    [points]
  );

  const selectedPoint = useMemo(
    () => points.find((p) => String(p.pointId) === pointId) ?? null,
    [points, pointId]
  );

  // 포인트 선택 시 표시명이 비어있으면 tagName/pointName 으로 기본값 제안
  const handlePointChange = (next: string) => {
    setPointId(next);
    if (!label.trim()) {
      const p = points.find((x) => String(x.pointId) === next);
      if (p) setLabel(p.pointName || p.tagName || "");
    }
  };

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (payload: CommandPointRequest) =>
      isEdit
        ? updateCommandPoint({ id: commandPoint!.commandPointId, payload })
        : createCommandPoint(payload),
    onSuccess: (res: any) => {
      if (res?.success === false) {
        showAlert(res?.message || "저장에 실패했습니다.");
        return;
      }
      if (deviceId != null)
        queryClient.invalidateQueries({ queryKey: commandPointsQueryKey(deviceId) });
      queryClient.invalidateQueries({ queryKey: COMMAND_POINTS_PAGE_QUERY_KEY });
      onClose();
    },
    onError: (err) =>
      showAlert(getApiErrorMessage(err, "제어 포인트 저장 중 오류가 발생했습니다.")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (deviceId == null) {
      showAlert("대상 장비를 선택하세요.");
      return;
    }
    if (!pointId) {
      showAlert("제어에 사용할 포인트를 선택하세요.");
      return;
    }
    if (!label.trim()) {
      showAlert("표시명을 입력하세요.");
      return;
    }
    if (!onValue.trim() || !offValue.trim()) {
      showAlert("ON/OFF 전송값을 입력하세요.");
      return;
    }
    const payload: CommandPointRequest = {
      deviceId,
      pointId: Number(pointId),
      label: label.trim(),
      onValue: onValue.trim(),
      offValue: offValue.trim(),
      sortOrder: Number(sortOrder) || 0,
      active,
    };
    mutateAsync(payload).catch(() => {
      /* onError 에서 처리 */
    });
  };

  return (
    <Form onSubmit={handleSubmit}>
      {/* create 모드: 대>중>소>장비 선택 (edit 모드는 prop 으로 고정) */}
      {!isEdit && (
        <DevicePickWrap>
          <Label $required>대상 장비 (대 › 중 › 소 → 장비 선택)</Label>
          <DeviceHierarchyFilter
            value={hier}
            onChange={(v) => {
              setHier(v);
              if (!v.deviceId) setPickedDevice(null);
            }}
            onDevicePicked={setPickedDevice}
          />
        </DevicePickWrap>
      )}

      {deviceName && (
        <DeviceInfo>
          대상 디바이스: <strong>{deviceName}</strong>
        </DeviceInfo>
      )}

      <Field>
        <Label $required>제어 포인트</Label>
        <SearchableSelect
          options={pointOptions}
          value={pointId}
          onChange={handlePointChange}
          loading={pointsLoading}
          disabled={deviceId == null}
          placeholder={
            deviceId == null
              ? "먼저 대상 장비를 선택하세요"
              : "tagName·포인트명으로 검색"
          }
          emptyText="이 디바이스에 등록된 포인트가 없습니다"
          noMatchText="검색 결과 없음"
        />
      </Field>

      {/* 선택 포인트의 XN 매핑 코드 노출 — 제어 중계 검증용 */}
      {selectedPoint && (
        <RefBox>
          <RefRow>
            <RefKey>tagName</RefKey>
            <RefVal>{selectedPoint.tagName || "-"}</RefVal>
          </RefRow>
          <RefRow>
            <RefKey>ref_device_code</RefKey>
            <RefVal>{selectedPoint.refDeviceCode || <Muted>미매핑</Muted>}</RefVal>
          </RefRow>
          <RefRow>
            <RefKey>ref_point_code</RefKey>
            <RefVal>{selectedPoint.refPointCode || <Muted>미매핑</Muted>}</RefVal>
          </RefRow>
          {(!selectedPoint.refDeviceCode || !selectedPoint.refPointCode) && (
            <RefWarn>
              XN 코드가 비어 있으면 실제 제어가 실패할 수 있습니다. 포인트 매핑을 먼저 확인하세요.
            </RefWarn>
          )}
        </RefBox>
      )}

      <Field>
        <Label $required>표시명</Label>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="예: 급기팬 기동"
          style={{ width: "100%" }}
        />
      </Field>

      <TwoCol>
        <Field>
          <Label $required>ON 전송값</Label>
          <Input
            value={onValue}
            onChange={(e) => setOnValue(e.target.value)}
            placeholder="1"
            style={{ width: "100%" }}
          />
        </Field>
        <Field>
          <Label $required>OFF 전송값</Label>
          <Input
            value={offValue}
            onChange={(e) => setOffValue(e.target.value)}
            placeholder="0"
            style={{ width: "100%" }}
          />
        </Field>
      </TwoCol>

      <TwoCol>
        <Field>
          <Label>정렬 순서</Label>
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
      </TwoCol>

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

export default CommandPointModal;

const Form = styled.form``;

const DevicePickWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
`;

const DeviceInfo = styled.div`
  margin-bottom: 14px;
  font-size: 13px;
  color: #6b7280;
  strong {
    color: #111827;
  }
`;

const Field = styled.div`
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
`;

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const Label = styled.label<{ $required?: boolean }>`
  font-size: 13px;
  color: #374151;
  &::after {
    content: "${(p) => (p.$required ? " *" : "")}";
    color: #dc2626;
  }
`;

const RefBox = styled.div`
  margin: 0 0 14px 0;
  padding: 10px 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
`;

const RefRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
`;

const RefKey = styled.span`
  width: 130px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
`;

const RefVal = styled.code`
  font-size: 12px;
  font-family: monospace;
  color: #374151;
`;

const RefWarn = styled.p`
  margin: 8px 0 0 0;
  font-size: 11px;
  color: #b45309;
`;

const Muted = styled.span`
  color: #9ca3af;
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 14px;
  margin-top: 4px;
  border-top: 1px solid #e5e7eb;
`;
