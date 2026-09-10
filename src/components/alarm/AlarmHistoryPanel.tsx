import { useMemo, useState } from "react";
import styled from "styled-components";
import { useQuery } from "@tanstack/react-query";
import Pagination from "@/components/common/Pagination";
import {
  ALARM_HISTORY_QUERY_KEY,
  ALARM_RULE_OPTION_QUERY_KEY,
  fetchAlarmHistoryAPI,
  fetchAlarmRuleOptionsAPI,
} from "@/services/alarmHistoryService";
import {
  UNITY_FLOOR_OPTION_QUERY_KEY,
  fetchFloorOptions,
} from "@/services/unityZoneService";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

/** 기획서 기본값 — "(최근 7일)" */
const DEFAULT_DAYS = 7;
const PAGE_SIZE = 20;

const isoDaysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

/** "26.02.04 17:10" — 기획서 표기 */
const formatOccurredAt = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getFullYear() % 100)}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(
    d.getHours()
  )}:${p(d.getMinutes())}`;
};

interface AlarmHistoryPanelProps {
  /** 패널 제목 — "{시스템명} 알람 이력" 의 앞부분 */
  title: string;
  /** 이 패널이 다룰 장비 카테고리. 대·중분류를 주면 서버가 하위 소분류로 확장한다 */
  categoryId?: number | null;
  /** 층 선택 드롭다운 노출 여부 (엘리베이터처럼 층 개념이 없는 화면은 false) */
  showFloorFilter?: boolean;
  /** "알람명" 열의 라벨 — 소방방재/태양광은 "이벤트명" 으로 쓴다 */
  alarmNameLabel?: string;
  /** 조회 기간(일). 기본 7 */
  days?: number;
  /** 알람명을 강조색으로 표시 (소방방재의 "화재감지" 처럼) */
  highlightAlarmName?: boolean;
}

/**
 * 알람 이력 공통 패널.
 *
 * 전력감시·엘리베이터·소방방재·태양광발전·출입통제·화장실 물리버튼 화면이 모두
 * `명칭 / 위치 / 알람명 / 완료 여부 / 발생 일시` 같은 형식이라 하나로 만든다.
 * 화면마다 다른 건 제목과 고정 필터(categoryId)뿐이다.
 *
 * **완료 여부는 서버의 `completed`(= ackedAt 존재)** 를 그대로 쓴다 —
 * 조건 해소(active)가 아니라 사람이 조치했는지다.
 */
const AlarmHistoryPanel = ({
  title,
  categoryId = null,
  showFloorFilter = true,
  alarmNameLabel = "알람명",
  days = DEFAULT_DAYS,
  highlightAlarmName = false,
}: AlarmHistoryPanelProps) => {
  const [page, setPage] = useState(0);
  const [floorId, setFloorId] = useState<number | null>(null);
  const [ruleId, setRuleId] = useState<number | null>(null);
  const [completed, setCompleted] = useState<boolean | null>(null);

  const from = useMemo(() => isoDaysAgo(days), [days]);

  const { data: floors = [] } = useQuery({
    queryKey: UNITY_FLOOR_OPTION_QUERY_KEY,
    queryFn: fetchFloorOptions,
    enabled: showFloorFilter,
    staleTime: 1000 * 60 * 30,
  });

  const { data: ruleOptions = [] } = useQuery({
    queryKey: [...ALARM_RULE_OPTION_QUERY_KEY, from],
    queryFn: () => fetchAlarmRuleOptionsAPI({ from }),
    staleTime: 1000 * 60 * 5,
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      ...ALARM_HISTORY_QUERY_KEY,
      page,
      categoryId ?? "all",
      floorId ?? "all",
      ruleId ?? "all",
      completed ?? "all",
      from,
    ],
    queryFn: () =>
      fetchAlarmHistoryAPI({
        page,
        size: PAGE_SIZE,
        categoryId,
        floorId,
        ruleId,
        completed,
        from,
      }),
  });

  const rows = data?.content ?? [];
  const pagination = data?.page;

  /** 필터가 바뀌면 첫 페이지로 되돌린다 — 안 그러면 3페이지에서 필터를 바꿨을 때 빈 화면이 뜬다. */
  const changeFilter = (setter, value) => {
    setter(value);
    setPage(0);
  };

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>
          {title} 알람 이력 <Muted>(최근 {days}일)</Muted>
        </PanelTitle>
      </PanelHeader>

      <FilterRow>
        {showFloorFilter && (
          <FilterSelect
            value={floorId ?? ""}
            onChange={(e) =>
              changeFilter(setFloorId, e.target.value === "" ? null : Number(e.target.value))
            }
          >
            <option value="">층 선택</option>
            {floors.map((f) => (
              <option key={f.floorId} value={f.floorId}>
                {f.floorName}
              </option>
            ))}
          </FilterSelect>
        )}

        <FilterSelect
          value={ruleId ?? ""}
          onChange={(e) =>
            changeFilter(setRuleId, e.target.value === "" ? null : Number(e.target.value))
          }
        >
          <option value="">데이터 선택</option>
          {ruleOptions.map((r) => (
            <option key={r.ruleId} value={r.ruleId}>
              {r.ruleName}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          value={completed === null ? "" : String(completed)}
          onChange={(e) =>
            changeFilter(setCompleted, e.target.value === "" ? null : e.target.value === "true")
          }
        >
          <option value="">완료 여부</option>
          <option value="false">미완료</option>
          <option value="true">완료</option>
        </FilterSelect>
      </FilterRow>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>명칭</Th>
              <Th $center style={{ width: 90 }}>위치</Th>
              <Th style={{ width: 140 }}>{alarmNameLabel}</Th>
              <Th $center style={{ width: 100 }}>완료 여부</Th>
              <Th $center style={{ width: 150 }}>발생 일시</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <Td colSpan={5} $center>불러오는 중…</Td>
              </tr>
            ) : isError ? (
              <tr>
                <Td colSpan={5} $center>
                  {getApiErrorMessage(error, "알람 이력을 불러오지 못했습니다.")}
                </Td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <Td colSpan={5} $center>최근 {days}일간 알람이 없습니다.</Td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.eventId}>
                  <Td>
                    <Name>{row.deviceName ?? row.deviceKey ?? "-"}</Name>
                  </Td>
                  <Td $center>{row.floorName ?? "--"}</Td>
                  <Td>
                    <AlarmName $highlight={highlightAlarmName}>
                      {row.ruleName ?? "-"}
                    </AlarmName>
                  </Td>
                  <Td $center>
                    <StatusBadge $done={row.completed}>
                      {row.completed ? "완료" : "미완료"}
                    </StatusBadge>
                  </Td>
                  <Td $center>{formatOccurredAt(row.occurredAt)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </TableWrap>

      {pagination && pagination.totalPages > 1 && (
        <Pagination data={pagination} onPageChange={setPage} showSummary={false} />
      )}
    </Panel>
  );
};

export default AlarmHistoryPanel;

/* ─────────────────────────────────────────── */

const Panel = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 16px;
  background: #fff;
`;

const PanelHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const PanelTitle = styled.h2`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #111827;
`;

const Muted = styled.span`
  font-size: 12px;
  font-weight: 400;
  color: #9ca3af;
`;

const FilterRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const FilterSelect = styled.select`
  height: 34px;
  min-width: 140px;
  padding: 0 8px;
  border: 1px solid #d0d3d8;
  border-radius: 4px;
  font-size: 13px;
  background: #fff;
  cursor: pointer;
`;

const TableWrap = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th<{ $center?: boolean }>`
  text-align: ${(p) => (p.$center ? "center" : "left")};
  padding: 10px 8px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  white-space: nowrap;
`;

const Td = styled.td<{ $center?: boolean }>`
  text-align: ${(p) => (p.$center ? "center" : "left")};
  padding: 10px 8px;
  border-bottom: 1px solid #f3f4f6;
  font-size: 13px;
  color: #374151;
`;

const Name = styled.span`
  font-weight: 600;
  color: #111827;
`;

const AlarmName = styled.span<{ $highlight?: boolean }>`
  font-weight: ${(p) => (p.$highlight ? 700 : 400)};
  color: ${(p) => (p.$highlight ? "#dc2626" : "#374151")};
`;

const StatusBadge = styled.span<{ $done?: boolean }>`
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  background: ${(p) => (p.$done ? "#dcfce7" : "#fef3c7")};
  color: ${(p) => (p.$done ? "#166534" : "#92400e")};
`;
