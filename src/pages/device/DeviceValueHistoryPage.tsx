import { Fragment, useState } from "react";
import styled from "styled-components";
import { useQuery } from "@tanstack/react-query";
import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import { Button } from "@/components/ui";
import DeviceHierarchyFilter from "@/components/device/DeviceHierarchyFilter";
import Pagination from "@/components/common/Pagination";
import { EMPTY_HIERARCHY_FILTER } from "@/utils/deviceHierarchyFilterUtils";
import {
  deviceValueHistoryQueryKey,
  getDeviceValueHistory,
  type DeviceValueHistoryResponse,
} from "@/services/deviceService";

const PAGE_SIZE = 50;

/** datetime-local ("YYYY-MM-DDTHH:mm") → ISO-8601(오프셋 포함). 빈값이면 undefined. */
function toIso(local: string): string | undefined {
  if (!local) return undefined;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/**
 * 장비 실시간 값 이력 (WA-DEVICE-VALUE-HISTORY) — 장비 관리 그룹
 * 대>중>소>장비 선택 + 기간(from/to)으로 그 장비의 값 스냅샷 이력을 최신순 페이징 조회한다.
 */
const DeviceValueHistoryPage = () => {
  const [filter, setFilter] = useState(EMPTY_HIERARCHY_FILTER);
  const [pickedDevice, setPickedDevice] = useState<any | null>(null);
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [applied, setApplied] = useState<{ from?: string; to?: string }>({});
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const deviceId = filter.deviceId ? Number(filter.deviceId) : undefined;
  const deviceName =
    pickedDevice?.deviceName ??
    (deviceId != null ? `Device#${deviceId}` : undefined);

  const { data: res, isLoading, isError, error } = useQuery({
    queryKey: [
      ...deviceValueHistoryQueryKey(deviceId ?? "none"),
      page,
      applied.from ?? "",
      applied.to ?? "",
    ],
    queryFn: () =>
      getDeviceValueHistory({
        deviceId: deviceId!,
        from: applied.from,
        to: applied.to,
        page,
        size: PAGE_SIZE,
      }),
    enabled: deviceId != null,
  });

  const rows: DeviceValueHistoryResponse[] = res?.data?.content ?? [];
  const pagination = {
    totalPages: res?.data?.page?.totalPages ?? 0,
    number: res?.data?.page?.number ?? 0,
    totalElements: res?.data?.page?.totalElements ?? 0,
    first: res?.data?.page?.first ?? true,
    last: res?.data?.page?.last ?? true,
  };

  const applyPeriod = () => {
    setApplied({ from: toIso(fromInput), to: toIso(toInput) });
    setPage(0);
  };

  const toggleExpand = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const formatTime = (str: string | null) =>
    str ? new Date(str).toLocaleString("ko-KR") : "-";

  return (
    <AdminPageTemplate
      title="장비 실시간 값 이력"
      description="장비를 선택하고 기간을 지정해 해당 장비의 실시간 값 스냅샷 이력을 최신순으로 조회합니다."
    >
      <Toolbar>
        <DeviceHierarchyFilter
          value={filter}
          onChange={(v) => {
            setFilter(v);
            if (!v.deviceId) setPickedDevice(null);
            setPage(0);
          }}
          onDevicePicked={setPickedDevice}
        />
        <PeriodField>
          <PeriodLabel>시작</PeriodLabel>
          <DateInput
            type="datetime-local"
            value={fromInput}
            onChange={(e) => setFromInput(e.target.value)}
          />
        </PeriodField>
        <PeriodField>
          <PeriodLabel>종료</PeriodLabel>
          <DateInput
            type="datetime-local"
            value={toInput}
            onChange={(e) => setToInput(e.target.value)}
          />
        </PeriodField>
        <Button variant="secondary" onClick={applyPeriod} disabled={deviceId == null}>
          조회
        </Button>
      </Toolbar>

      {deviceId == null ? (
        <EmptyPanel>
          대분류 → 중분류 → 소분류 → 장비 순으로 대상 장비를 선택하세요.
        </EmptyPanel>
      ) : (
        <>
          <Summary>
            대상 장비: <strong>{deviceName}</strong>
          </Summary>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th style={{ width: 200 }}>수집 시각</Th>
                  <Th style={{ width: 90 }} $center>포인트 수</Th>
                  <Th>요약</Th>
                  <Th $center style={{ width: 90 }}>상세</Th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <Td colSpan={4} $center>불러오는 중…</Td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <Td colSpan={4} $center>
                      {(error as Error)?.message ?? "이력을 불러오지 못했습니다."}
                    </Td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <Td colSpan={4} $center>해당 기간의 값 이력이 없습니다.</Td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const pts = row.points ?? [];
                    const rowKey = `${row.deviceId}-${row.createdAt}`;
                    const open = expanded.has(rowKey);
                    const summary = pts
                      .slice(0, 4)
                      .map(
                        (p) =>
                          `${p.tagName ?? p.pointkey ?? "-"}=${p.valueRaw ?? "-"}${
                            p.unit ? p.unit : ""
                          }`
                      )
                      .join(", ");
                    return (
                      <Fragment key={rowKey}>
                        <tr>
                          <Td>
                            <Mono>{formatTime(row.createdAt)}</Mono>
                          </Td>
                          <Td $center>{pts.length}</Td>
                          <Td>
                            <SummaryText>
                              {summary}
                              {pts.length > 4 ? " …" : ""}
                            </SummaryText>
                          </Td>
                          <Td $center>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => toggleExpand(rowKey)}
                              disabled={pts.length === 0}
                            >
                              {open ? "접기" : "펼치기"}
                            </Button>
                          </Td>
                        </tr>
                        {open && pts.length > 0 && (
                          <tr>
                            <Td colSpan={4} style={{ background: "#f9fafb" }}>
                              <DetailTable>
                                <thead>
                                  <tr>
                                    <DTh>tagName</DTh>
                                    <DTh>pointName</DTh>
                                    <DTh>값</DTh>
                                    <DTh>단위</DTh>
                                    <DTh>objectType</DTh>
                                    <DTh>알람</DTh>
                                    <DTh>수집시각</DTh>
                                  </tr>
                                </thead>
                                <tbody>
                                  {pts.map((p, i) => (
                                    <tr key={p.pointId ?? p.pointkey ?? i}>
                                      <DTd><Mono>{p.tagName || "-"}</Mono></DTd>
                                      <DTd>{p.pointName || "-"}</DTd>
                                      <DTd><Mono>{p.valueRaw ?? "-"}</Mono></DTd>
                                      <DTd>{p.unit || "-"}</DTd>
                                      <DTd>{p.objectType || "-"}</DTd>
                                      <DTd>{p.alarmYn || "-"}</DTd>
                                      <DTd><Mono>{formatTime(p.updateDatetime)}</Mono></DTd>
                                    </tr>
                                  ))}
                                </tbody>
                              </DetailTable>
                            </Td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </Table>
          </TableWrap>

          {pagination.totalPages > 0 && (
            <Pagination data={pagination} onPageChange={setPage} />
          )}
        </>
      )}
    </AdminPageTemplate>
  );
};

export default DeviceValueHistoryPage;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px;
  margin-bottom: 16px;
`;

const PeriodField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const PeriodLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
`;

const DateInput = styled.input`
  height: 36px;
  padding: 0 10px;
  font-size: 13px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
  &:focus { border-color: #4a90d9; }
`;

const EmptyPanel = styled.div`
  padding: 48px 0;
  text-align: center;
  font-size: 14px;
  color: #9ca3af;
  background: #fff;
  border: 1px dashed #e5e7eb;
  border-radius: 8px;
`;

const Summary = styled.div`
  margin-bottom: 10px;
  font-size: 13px;
  color: #6b7280;
  strong { color: #111827; }
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

const Th = styled.th<{ $center?: boolean }>`
  padding: 11px 14px;
  text-align: ${(p) => (p.$center ? "center" : "left")};
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

const Mono = styled.span`
  font-family: monospace;
  font-size: 12px;
  color: #374151;
`;

const SummaryText = styled.span`
  font-size: 12px;
  color: #4b5563;
  word-break: break-all;
`;

const DetailTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
`;

const DTh = styled.th`
  padding: 7px 10px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  color: #6b7280;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
`;

const DTd = styled.td`
  padding: 6px 10px;
  border-bottom: 1px solid #eef2f6;
  color: #374151;
`;
