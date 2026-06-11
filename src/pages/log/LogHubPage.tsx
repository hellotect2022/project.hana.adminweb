import { useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import styled from "styled-components";
import {
  AUDIT_QUERY_KEYS,
  fetchAccessLogs,
  fetchAuditStatistics,
  fetchUsageLogs,
} from "@/services/auditLogService";

const SECTIONS = ["access", "usage", "statistics"];
const PAGE_SIZE = 12;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function formatDt(iso) {
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function typeLabel(t) {
  switch (t) {
    case "LOGIN_SUCCESS":
      return "로그인 성공";
    case "LOGIN_FAIL":
      return "로그인 실패";
    case "LOGOUT":
      return "로그아웃";
    default:
      return t;
  }
}

const LogHubPage = () => {
  const { section } = useParams();
  const [dateFrom, setDateFrom] = useState(() => daysAgoISO(6));
  const [dateTo, setDateTo] = useState(() => todayISO());
  const [pageAccess, setPageAccess] = useState(0);
  const [pageUsage, setPageUsage] = useState(0);

  console.log('section->',section)

  const statsQuery = useQuery({
    queryKey: AUDIT_QUERY_KEYS.stats(dateFrom, dateTo),
    queryFn: () => fetchAuditStatistics(dateFrom, dateTo),
    staleTime: 30_000,
  });

  const accessQuery = useQuery({
    queryKey: AUDIT_QUERY_KEYS.access(dateFrom, dateTo, pageAccess, PAGE_SIZE),
    queryFn: () => fetchAccessLogs(dateFrom, dateTo, pageAccess, PAGE_SIZE),
    enabled: section === "access",
    staleTime: 15_000,
  });

  const usageQuery = useQuery({
    queryKey: AUDIT_QUERY_KEYS.usage(dateFrom, dateTo, pageUsage, PAGE_SIZE),
    queryFn: () => fetchUsageLogs(dateFrom, dateTo, pageUsage, PAGE_SIZE),
    /** 사용 로그 탭: 서버에서 목록 조회 (GET /api/audit/usage-logs) */
    enabled: section === "usage",
    staleTime: 15_000,
    refetchOnMount: "always",
  });

  const summary = statsQuery.data?.summary;
  const daily = statsQuery.data?.daily ?? [];
  const topMenus = statsQuery.data?.topMenus ?? [];
  const byHour = statsQuery.data?.usageByHour ?? [];

  const maxLoginD = useMemo(
    () => Math.max(1, ...daily.map((d) => d.logins)),
    [daily]
  );
  const maxVisitD = useMemo(
    () => Math.max(1, ...daily.map((d) => d.visits)),
    [daily]
  );

  const maxHour = useMemo(() => {
    let m = 1;
    byHour.forEach((h) => {
      m = Math.max(m, h.count);
    });
    return m;
  }, [byHour]);

  const maxTop = useMemo(() => {
    if (!topMenus.length) return 1;
    return Math.max(...topMenus.map((x) => x.count));
  }, [topMenus]);

  useEffect(() => {
    setPageAccess(0);
    setPageUsage(0);
  }, [dateFrom, dateTo, section]);

  const accessRows = accessQuery.data?.content ?? [];
  const accessTotal = accessQuery.data?.totalElements ?? 0;
  const accessTotalPages = Math.max(
    1,
    accessQuery.data?.totalPages ?? 1
  );

  const usageRows = usageQuery.data?.content ?? [];
  const usageTotal = usageQuery.data?.totalElements ?? 0;
  const usageTotalPages = Math.max(
    1,
    usageQuery.data?.totalPages ?? 1
  );

  if (!SECTIONS.includes(section)) {
    return <Navigate to="/log/access" replace />;
  }

  return (
    <Shell>
      <Hero>
        <HeroInner>
          <HeroTitle>운영 인사이트</HeroTitle>
          <HeroSub>
            접속·사용 로그 및 통계는 서버 API(
            <code>/api/audit</code>)에서 조회합니다. (관리자 SPA에서는 메뉴 이동
            자동 기록 없음)
          </HeroSub>
          <KpiRow>
            <Kpi>
              <KpiLabel>기간 내 로그인 성공</KpiLabel>
              <KpiValue>
                {statsQuery.isLoading
                  ? "…"
                  : (summary?.loginSuccessTotal ?? 0)}
              </KpiValue>
              <KpiHint>오늘 {summary?.loginSuccessToday ?? 0}건</KpiHint>
            </Kpi>
            <Kpi>
              <KpiLabel>기간 내 메뉴 방문</KpiLabel>
              <KpiValue>
                {statsQuery.isLoading ? "…" : (summary?.usageTotal ?? 0)}
              </KpiValue>
              <KpiHint>오늘 {summary?.usageToday ?? 0}건</KpiHint>
            </Kpi>
            <Kpi>
              <KpiLabel>로그인 실패 (기간)</KpiLabel>
              <KpiValue>
                {statsQuery.isLoading ? "…" : (summary?.loginFailTotal ?? 0)}
              </KpiValue>
              <KpiHint>오늘 {summary?.loginFailToday ?? 0}건</KpiHint>
            </Kpi>
            <Kpi $accent>
              <KpiLabel>로그아웃 (기간)</KpiLabel>
              <KpiValue>
                {statsQuery.isLoading ? "…" : (summary?.logoutTotal ?? 0)}
              </KpiValue>
              <KpiHint>통계 기간: {dateFrom} ~ {dateTo}</KpiHint>
            </Kpi>
          </KpiRow>
        </HeroInner>
      </Hero>

      <TabBar>
        <Tab to="/log/access" end>
          접속 로그
        </Tab>
        <Tab to="/log/usage">사용 로그</Tab>
        <Tab to="/log/statistics">운영 통계</Tab>
      </TabBar>

      <FilterBar>
        <FilterGroup>
          <FilterLabel htmlFor="d-from">시작일</FilterLabel>
          <FilterInput
            id="d-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </FilterGroup>
        <FilterGroup>
          <FilterLabel htmlFor="d-to">종료일</FilterLabel>
          <FilterInput
            id="d-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </FilterGroup>
        <FilterHint>선택한 기간으로 아래 목록·통계를 필터합니다.</FilterHint>
      </FilterBar>

      {section === "access" && (
        <Panel>
          <PanelTitle>접속 로그</PanelTitle>
          <PanelDesc>
            로그인 성공·실패, 로그아웃 시점이 서버에 기록됩니다. (
            <code>GET /api/audit/access-logs</code>)
          </PanelDesc>
          {accessQuery.isError ? (
            <PanelDesc style={{ color: "#b91c1c" }}>
              접속 로그를 불러오지 못했습니다. API 권한·주소를 확인하세요.
            </PanelDesc>
          ) : null}
          <TableWrap>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 88 }}>accessLogId</th>
                  <th>시각</th>
                  <th>유형</th>
                  <th>아이디</th>
                  <th>이름</th>
                  <th>접속 IP</th>
                  <th>클라이언트</th>
                </tr>
              </thead>
              <tbody>
                {accessQuery.isLoading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", color: "#94a3b8" }}>
                      불러오는 중…
                    </td>
                  </tr>
                ) : accessRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", color: "#94a3b8" }}>
                      기간 내 기록이 없습니다.
                    </td>
                  </tr>
                ) : (
                  accessRows.map((row) => (
                    <tr key={row.accessLogId ?? row.id}>
                      <td>{row.accessLogId ?? "—"}</td>
                      <td>{formatDt(row.at)}</td>
                      <td>
                        <TypeBadge $t={row.type}>{typeLabel(row.type)}</TypeBadge>
                      </td>
                      <td>{row.loginId}</td>
                      <td>{row.username || "—"}</td>
                      <td>
                        <code>{row.clientIp || "—"}</code>
                      </td>
                      <td title={row.userAgent}>
                        {row.userAgent
                          ? row.userAgent.slice(0, 36) +
                            (row.userAgent.length > 36 ? "…" : "")
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </TableWrap>
          <Pager
            page={pageAccess}
            totalPages={accessTotalPages}
            onChange={setPageAccess}
            total={accessTotal}
          />
        </Panel>
      )}

      {section === "usage" && (
        <Panel>
          <PanelTitle>사용 로그</PanelTitle>
          <PanelDesc>
            서버에 저장된 메뉴 사용 이력을 조회합니다. (
            <code>GET /api/audit/usage-logs</code>)
          </PanelDesc>
          {usageQuery.isError ? (
            <PanelDesc style={{ color: "#b91c1c" }}>
              사용 로그를 불러오지 못했습니다.
            </PanelDesc>
          ) : null}
          <TableWrap>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 88 }}>usageLogId</th>
                  <th>시각</th>
                  <th>메뉴</th>
                  <th>경로</th>
                  <th>아이디</th>
                </tr>
              </thead>
              <tbody>
                {usageQuery.isLoading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "#94a3b8" }}>
                      불러오는 중…
                    </td>
                  </tr>
                ) : usageRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "#94a3b8" }}>
                      기간 내 기록이 없습니다.
                    </td>
                  </tr>
                ) : (
                  usageRows.map((row) => (
                    <tr key={row.usageLogId ?? row.id}>
                      <td>{row.usageLogId ?? "—"}</td>
                      <td>{formatDt(row.at)}</td>
                      <td>{row.menuLabel}</td>
                      <td>
                        <code>{row.path}</code>
                      </td>
                      <td>{row.loginId || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </TableWrap>
          <Pager
            page={pageUsage}
            totalPages={usageTotalPages}
            onChange={setPageUsage}
            total={usageTotal}
          />
        </Panel>
      )}

      {section === "statistics" && (
        <StatsGrid>
          <Panel>
            <PanelTitle>일별 추이</PanelTitle>
            <PanelDesc>
              선택 기간의 일별 로그인 성공(청록)과 메뉴 방문(남색)입니다. (
              <code>GET /api/audit/statistics</code>)
            </PanelDesc>
            {statsQuery.isLoading ? (
              <PanelDesc>통계를 불러오는 중…</PanelDesc>
            ) : null}
            {statsQuery.isError ? (
              <PanelDesc style={{ color: "#b91c1c" }}>
                통계를 불러오지 못했습니다.
              </PanelDesc>
            ) : null}
            <BarChart>
              {daily.map((d) => {
                const h1 = (d.logins / maxLoginD) * 100;
                const h2 = (d.visits / maxVisitD) * 100;
                return (
                  <BarCol key={d.day}>
                    <BarPair>
                      <BarFill $h={h1} $c="linear-gradient(180deg,#2dd4bf,#0d9488)" />
                      <BarFill $h={h2} $c="linear-gradient(180deg,#60a5fa,#2563eb)" />
                    </BarPair>
                    <BarDay>{d.day.slice(5)}</BarDay>
                  </BarCol>
                );
              })}
            </BarChart>
            <LegendRow>
              <LegendDot $bg="#0d9488" /> 로그인 성공
              <LegendDot $bg="#2563eb" style={{ marginLeft: 12 }} /> 메뉴 방문
            </LegendRow>
          </Panel>

          <Panel>
            <PanelTitle>메뉴별 방문 (상위)</PanelTitle>
            <PanelDesc>선택 기간 동안 가장 많이 열린 메뉴입니다.</PanelDesc>
            <RankList>
              {topMenus.length === 0 ? (
                <EmptyHint>데이터가 없습니다.</EmptyHint>
              ) : (
                topMenus.map((m, i) => (
                  <RankRow key={m.label}>
                    <RankIdx>{i + 1}</RankIdx>
                    <RankLabel>{m.label}</RankLabel>
                    <RankBarWrap>
                      <RankBar $w={(m.count / maxTop) * 100} />
                    </RankBarWrap>
                    <RankCount>{m.count}</RankCount>
                  </RankRow>
                ))
              )}
            </RankList>
          </Panel>

          <Panel $wide>
            <PanelTitle>시간대별 메뉴 방문</PanelTitle>
            <PanelDesc>선택 기간 합산, 0–23시(로컬 시간).</PanelDesc>
            <HourGrid>
              {byHour.map(({ hour, count }) => (
                <HourCell key={hour}>
                  <HourBar
                    $h={maxHour ? (count / maxHour) * 100 : 0}
                    title={`${hour}시: ${count}건`}
                  />
                  <HourNum>{hour}</HourNum>
                </HourCell>
              ))}
            </HourGrid>
          </Panel>
        </StatsGrid>
      )}
    </Shell>
  );
};

function Pager({ page, totalPages, onChange, total }) {
  return (
    <PagerRow>
      <PagerInfo>
        총 {total}건 · {page + 1} / {totalPages} 페이지
      </PagerInfo>
      <PagerBtns>
        <PagerBtn
          type="button"
          disabled={page <= 0}
          onClick={() => onChange(page - 1)}
        >
          이전
        </PagerBtn>
        <PagerBtn
          type="button"
          disabled={page >= totalPages - 1}
          onClick={() => onChange(page + 1)}
        >
          다음
        </PagerBtn>
      </PagerBtns>
    </PagerRow>
  );
}

const Shell = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  &::-webkit-scrollbar {
    display: none;
  }
`;

const Hero = styled.div`
  border-radius: 14px;
  padding: 1px;
  background: linear-gradient(
    135deg,
    rgba(45, 212, 191, 0.35),
    rgba(37, 99, 235, 0.45),
    rgba(15, 23, 42, 0.9)
  );
  margin-bottom: 18px;
`;

const HeroInner = styled.div`
  border-radius: 13px;
  background: linear-gradient(160deg, #0f172a 0%, #1e293b 55%, #0f172a 100%);
  padding: 22px 24px 20px;
  color: #e2e8f0;
`;

const HeroTitle = styled.h1`
  margin: 0 0 8px 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  background: linear-gradient(90deg, #5eead4, #93c5fd);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const HeroSub = styled.p`
  margin: 0 0 20px 0;
  font-size: 13px;
  line-height: 1.55;
  color: #94a3b8;
  max-width: 720px;
  code {
    font-size: 11px;
    background: rgba(255, 255, 255, 0.06);
    padding: 1px 6px;
    border-radius: 4px;
    color: #cbd5e1;
  }
`;

const KpiRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
`;

const Kpi = styled.div`
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 10px;
  padding: 12px 14px;
  backdrop-filter: blur(8px);
  box-shadow: ${(p) =>
    p.$accent
      ? "0 0 0 1px rgba(94, 234, 212, 0.15)"
      : "0 4px 20px rgba(0,0,0,0.2)"};
`;

const KpiLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const KpiValue = styled.div`
  font-size: 24px;
  font-weight: 800;
  color: #f8fafc;
  margin-top: 4px;
`;

const KpiHint = styled.div`
  font-size: 11px;
  color: #64748b;
  margin-top: 4px;
`;

const TabBar = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
`;

const Tab = styled(NavLink)`
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 999px;
  text-decoration: none;
  color: #475569;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  transition: background 0.2s, color 0.2s, box-shadow 0.2s;
  &.active {
    color: #fff;
    background: linear-gradient(135deg, #4a6380, #334155);
    border-color: transparent;
    box-shadow: 0 4px 14px rgba(74, 99, 128, 0.35);
  }
  &:hover:not(.active) {
    background: #e2e8f0;
  }
`;

const FilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px 20px;
  margin-bottom: 16px;
  padding: 12px 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const FilterLabel = styled.label`
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
`;

const FilterInput = styled.input`
  padding: 6px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 13px;
`;

const FilterHint = styled.span`
  font-size: 12px;
  color: #64748b;
  flex: 1;
  min-width: 200px;
`;

const Panel = styled.section`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 18px 18px 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  grid-column: ${(p) => (p.$wide ? "1 / -1" : "auto")};
`;

const PanelTitle = styled.h2`
  margin: 0 0 6px 0;
  font-size: 16px;
  font-weight: 700;
  color: #111d2c;
`;

const PanelDesc = styled.p`
  margin: 0 0 14px 0;
  font-size: 13px;
  color: #64748b;
  line-height: 1.45;
  code {
    font-size: 11px;
    background: #f1f5f9;
    padding: 1px 5px;
    border-radius: 4px;
    color: #475569;
  }
`;

const TableWrap = styled.div`
  overflow-x: auto;
  border: 1px solid #f1f5f9;
  border-radius: 8px;
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  th,
  td {
    padding: 10px 12px;
    text-align: left;
    border-bottom: 1px solid #f1f5f9;
  }
  th {
    background: #f8fafc;
    font-weight: 600;
    color: #475569;
    white-space: nowrap;
  }
  code {
    font-size: 12px;
    color: #1d4ed8;
  }
`;

const TypeBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: ${(p) =>
    p.$t === "LOGIN_FAIL"
      ? "#fef2f2"
      : p.$t === "LOGOUT"
        ? "#f1f5f9"
        : "#ecfdf5"};
  color: ${(p) =>
    p.$t === "LOGIN_FAIL"
      ? "#b91c1c"
      : p.$t === "LOGOUT"
        ? "#475569"
        : "#047857"};
`;

const PagerRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 12px;
`;

const PagerInfo = styled.span`
  font-size: 12px;
  color: #64748b;
`;

const PagerBtns = styled.div`
  display: flex;
  gap: 8px;
`;

const PagerBtn = styled.button`
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #fff;
  cursor: pointer;
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const BarChart = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 6px;
  height: 160px;
  padding: 8px 4px 0;
`;

const BarCol = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
`;

const BarPair = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 4px;
  width: 100%;
  height: 120px;
`;

const BarFill = styled.div`
  width: 42%;
  max-width: 16px;
  height: ${(p) => `${p.$h}%`};
  min-height: ${(p) => (p.$h > 0 ? "4px" : "0")};
  border-radius: 4px;
  background: ${(p) => p.$c};
  transition: height 0.35s ease;
`;

const BarDay = styled.div`
  margin-top: 8px;
  font-size: 10px;
  color: #64748b;
  font-weight: 600;
`;

const LegendRow = styled.div`
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #64748b;
  margin-top: 8px;
`;

const LegendDot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 2px;
  background: ${(p) => p.$bg};
  margin-right: 6px;
`;

const RankList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const RankRow = styled.div`
  display: grid;
  grid-template-columns: 22px 1fr 1fr 36px;
  align-items: center;
  gap: 8px;
  font-size: 13px;
`;

const RankIdx = styled.span`
  font-weight: 800;
  color: #94a3b8;
  font-size: 12px;
`;

const RankLabel = styled.span`
  color: #1e293b;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RankBarWrap = styled.div`
  height: 8px;
  background: #f1f5f9;
  border-radius: 999px;
  overflow: hidden;
`;

const RankBar = styled.div`
  height: 100%;
  width: ${(p) => p.$w}%;
  border-radius: 999px;
  background: linear-gradient(90deg, #4a6380, #60a5fa);
  transition: width 0.4s ease;
`;

const RankCount = styled.span`
  text-align: right;
  font-weight: 700;
  color: #475569;
  font-size: 12px;
`;

const EmptyHint = styled.div`
  font-size: 13px;
  color: #94a3b8;
  padding: 12px 0;
`;

const HourGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(24, minmax(0, 1fr));
  gap: 2px;
  align-items: end;
  height: 100px;
`;

const HourCell = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
`;

const HourBar = styled.div`
  width: 100%;
  max-width: 14px;
  height: ${(p) => `${p.$h}%`};
  min-height: ${(p) => (p.$h > 0 ? "3px" : "0")};
  background: linear-gradient(180deg, #a78bfa, #6366f1);
  border-radius: 3px 3px 0 0;
  transition: height 0.35s ease;
`;

const HourNum = styled.div`
  font-size: 9px;
  color: #94a3b8;
  margin-top: 4px;
`;

export default LogHubPage;
