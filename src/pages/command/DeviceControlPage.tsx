import { showAlert } from "@/utils/dialogBridge";
import { useMemo, useState } from "react";
import styled from "styled-components";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import Pagination from "@/components/common/Pagination";
import DeviceHierarchyFilter from "@/components/device/DeviceHierarchyFilter";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import {
  DEVICE_LIST_QUERY_KEY,
  fetchDevicesAPI,
} from "@/services/deviceService";
import {
  EMPTY_HIERARCHY_FILTER,
  resolveHierarchyCategoryId,
} from "@/utils/deviceHierarchyFilterUtils";
import {
  controlDevice,
  type CommandPointItem,
  type ControlValue,
} from "@/services/commandService";

const PAGE_SIZE = 20;

/** 실시간 현재값 포인트(XnPointData) 부분 형태 */
interface RealtimePoint {
  tagName: string | null;
  valueRaw: string | null;
}
interface DeviceRow {
  deviceId: number;
  deviceName: string;
  categoryPath: string | null;
  active: boolean;
  commandPoints?: CommandPointItem[];
  currentValue?: { points?: RealtimePoint[] | null } | null;
}

/**
 * 제어 포인트 현재 상태 판정.
 *
 * 현재값(currentValue.points)이 있으면 tagName 으로 매칭해 valueRaw 를 onValue/offValue 와
 * 비교하여 "on"/"off" 를 반환한다. 매칭 실패 시 null("알 수 없음").
 * 실시간 스트림(websocket) 연동은 후속 과제로 두고, 여기서는 목록 응답에 임베드된
 * 스냅샷 현재값만 사용한다(과한 실시간 연동 배제 — 사용자 결정).
 */
function resolveState(
  device: DeviceRow,
  cp: CommandPointItem
): ControlValue | null {
  const pts = device.currentValue?.points ?? [];
  if (!cp.tagName || !pts.length) return null;
  const match = pts.find((p) => p.tagName === cp.tagName);
  if (!match || match.valueRaw == null) return null;
  const raw = String(match.valueRaw).trim();
  if (raw === String(cp.onValue).trim()) return "on";
  if (raw === String(cp.offValue).trim()) return "off";
  return null;
}

/**
 * 디바이스 제어 패널 (WA-DEVICE-CONTROL) — 디바이스 제어 그룹
 * 대>중>소 필터로 디바이스 목록을 조회하고, 각 디바이스의 제어 포인트를 on/off 로 제어한다.
 */
const DeviceControlPage = () => {
  const queryClient = useQueryClient();

  const [draftFilter, setDraftFilter] = useState(EMPTY_HIERARCHY_FILTER);
  const [appliedFilter, setAppliedFilter] = useState(EMPTY_HIERARCHY_FILTER);
  const [pickedDevice, setPickedDevice] = useState<any | null>(null);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState<Set<number>>(new Set());

  const pickedDeviceId = appliedFilter.deviceId
    ? Number(appliedFilter.deviceId)
    : undefined;
  // 장비를 콕 집었으면 그 소분류로 조회 후 클라이언트에서 해당 장비만 노출.
  const categoryId =
    pickedDeviceId != null
      ? pickedDevice?.categoryId ?? undefined
      : resolveHierarchyCategoryId(appliedFilter);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      ...DEVICE_LIST_QUERY_KEY,
      "control",
      page,
      categoryId ?? "all",
      pickedDeviceId ?? "all",
    ],
    queryFn: () => fetchDevicesAPI({ page, size: PAGE_SIZE, categoryId }),
    select: (res) => ({
      devices: (res.data?.content ?? []) as DeviceRow[],
      pagination: {
        totalPages: res.data?.totalPages ?? 0,
        number: res.data?.number ?? 0,
        totalElements: res.data?.totalElements ?? 0,
        first: res.data?.first ?? true,
        last: res.data?.last ?? true,
      },
    }),
  });

  const devices = useMemo(() => {
    const list = data?.devices ?? [];
    if (pickedDeviceId != null)
      return list.filter((d) => d.deviceId === pickedDeviceId);
    return list;
  }, [data, pickedDeviceId]);

  const handleApply = () => {
    setAppliedFilter(draftFilter);
    setPage(0);
  };

  const handleControl = async (
    device: DeviceRow,
    cp: CommandPointItem,
    value: ControlValue
  ) => {
    if (busy.has(cp.commandPointId)) return;
    setBusy((prev) => new Set(prev).add(cp.commandPointId));
    try {
      const result = await controlDevice({
        commandPointId: cp.commandPointId,
        value,
      });
      if (result.success) {
        // 성공 후 목록 재조회로 스냅샷 현재값 갱신(best-effort)
        queryClient.invalidateQueries({ queryKey: DEVICE_LIST_QUERY_KEY });
      } else {
        showAlert(
          `[${device.deviceName} · ${cp.label}] 제어 실패: ${result.message}`
        );
      }
    } catch (err) {
      showAlert(
        getApiErrorMessage(err, "제어 명령 전송 중 오류가 발생했습니다.")
      );
    } finally {
      setBusy((prev) => {
        const next = new Set(prev);
        next.delete(cp.commandPointId);
        return next;
      });
    }
  };

  return (
    <AdminPageTemplate
      title="디바이스 제어"
      description="디바이스별 제어 포인트를 on/off 로 제어합니다. 명령은 외부(XN) 연계로 중계됩니다."
    >
      <Toolbar>
        <DeviceHierarchyFilter
          value={draftFilter}
          onChange={(v) => {
            setDraftFilter(v);
            if (!v.deviceId) setPickedDevice(null);
          }}
          onDevicePicked={setPickedDevice}
        />
        <ApplyBtn type="button" onClick={handleApply}>
          조회
        </ApplyBtn>
      </Toolbar>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th style={{ width: 220 }}>디바이스</Th>
              <Th>카테고리</Th>
              <Th style={{ width: "45%" }}>제어</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <Td colSpan={3} $center>불러오는 중…</Td>
              </tr>
            ) : isError ? (
              <tr>
                <Td colSpan={3} $center>
                  {(error as Error)?.message ?? "목록을 불러오지 못했습니다."}
                </Td>
              </tr>
            ) : devices.length === 0 ? (
              <tr>
                <Td colSpan={3} $center>표시할 디바이스가 없습니다.</Td>
              </tr>
            ) : (
              devices.map((d) => {
                const cps = d.commandPoints ?? [];
                return (
                  <tr key={d.deviceId}>
                    <Td>
                      <DeviceName>{d.deviceName}</DeviceName>
                      {!d.active && <MutedTag>비활성</MutedTag>}
                    </Td>
                    <Td>
                      <PathText>{d.categoryPath || <Muted>-</Muted>}</PathText>
                    </Td>
                    <Td>
                      {cps.length === 0 ? (
                        <Muted>제어 없음</Muted>
                      ) : (
                        <ControlGroup>
                          {cps.map((cp) => {
                            const state = resolveState(d, cp);
                            const isBusy = busy.has(cp.commandPointId);
                            return (
                              <ControlUnit key={cp.commandPointId}>
                                <CtrlLabel title={cp.tagName ?? undefined}>
                                  {cp.label}
                                </CtrlLabel>
                                <CtrlBtns>
                                  <CtrlBtn
                                    type="button"
                                    $tone="on"
                                    $active={state === "on"}
                                    disabled={isBusy}
                                    onClick={() => handleControl(d, cp, "on")}
                                  >
                                    ON
                                  </CtrlBtn>
                                  <CtrlBtn
                                    type="button"
                                    $tone="off"
                                    $active={state === "off"}
                                    disabled={isBusy}
                                    onClick={() => handleControl(d, cp, "off")}
                                  >
                                    OFF
                                  </CtrlBtn>
                                </CtrlBtns>
                              </ControlUnit>
                            );
                          })}
                        </ControlGroup>
                      )}
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </TableWrap>

      {/* 특정 장비를 콕 집은 경우엔 단건 노출이므로 페이지네이션 숨김 */}
      {pickedDeviceId == null && data?.pagination && (
        <Pagination
          data={data.pagination}
          onPageChange={setPage}
          hideOnSinglePage
        />
      )}
    </AdminPageTemplate>
  );
};

export default DeviceControlPage;

const Toolbar = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 10px;
  margin-bottom: 16px;
`;

const ApplyBtn = styled.button`
  height: 36px;
  padding: 0 18px;
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: #2563eb;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background: #1d4ed8;
  }
`;

const TableWrap = styled.div`
  overflow-x: auto;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
`;

const Th = styled.th`
  padding: 11px 14px;
  text-align: left;
  font-size: 12px;
  font-weight: 700;
  color: #374151;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
`;

const Td = styled.td<{ $center?: boolean }>`
  padding: 10px 14px;
  border-bottom: 1px solid #f3f4f6;
  color: #111827;
  text-align: ${(p) => (p.$center ? "center" : "left")};
  vertical-align: middle;
`;

const DeviceName = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #111827;
`;

const MutedTag = styled.span`
  margin-left: 6px;
  font-size: 11px;
  color: #9ca3af;
`;

const PathText = styled.span`
  font-size: 12px;
  color: #6b7280;
`;

const Muted = styled.span`
  color: #9ca3af;
`;

const ControlGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const ControlUnit = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
  border: 1px solid #eef2f6;
  border-radius: 8px;
  background: #fafbfc;
`;

const CtrlLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CtrlBtns = styled.div`
  display: inline-flex;
  gap: 4px;
`;

const CtrlBtn = styled.button<{ $tone: "on" | "off"; $active?: boolean }>`
  min-width: 48px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 700;
  border-radius: 6px;
  cursor: pointer;
  border: 1.5px solid
    ${(p) =>
      p.$active
        ? p.$tone === "on"
          ? "#15803d"
          : "#b91c1c"
        : "#e5e7eb"};
  background: ${(p) =>
    p.$active
      ? p.$tone === "on"
        ? "#dcfce7"
        : "#fee2e2"
      : "#fff"};
  color: ${(p) =>
    p.$active
      ? p.$tone === "on"
        ? "#15803d"
        : "#b91c1c"
      : "#6b7280"};

  &:hover:not(:disabled) {
    border-color: ${(p) => (p.$tone === "on" ? "#15803d" : "#b91c1c")};
    color: ${(p) => (p.$tone === "on" ? "#15803d" : "#b91c1c")};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
