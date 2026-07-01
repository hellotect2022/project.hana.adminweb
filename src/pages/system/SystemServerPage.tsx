import { useMemo, useState } from "react";
import styled from "styled-components";
import { useQuery } from "@tanstack/react-query";
import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import { Badge, Button } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import {
  MONITOR_STATUS_QUERY_KEY,
  fetchMonitorStatusAPI,
} from "@/services/monitorService";

/**
 * 서버 관리 콘솔
 *
 * `GET /api/monitor/status`(ADMIN JWT 필요)를 5초 간격으로 폴링해
 * event / gateway / digitaltwin 3개 서비스의 생존 상태·리소스를 관제한다.
 *
 * 규약
 * - 사용률(processCpuLoad/systemCpuLoad/diskUsage 및 힙 비율)은 0.0~1.0 분수 → ×100 표기.
 * - -1.0(또는 값 없음)은 "측정 불가".
 * - 힙 사용률은 호스트 메모리가 아니라 JVM 힙(heapUsedBytes/heapMaxBytes) 사용률이다.
 * - 상단 카드는 인프라 의존처(DB/Kafka 등) 도달성(dependencies)만 표시하며 리소스는 없다.
 * - 비ADMIN(403) 은 인라인 안내로 처리(전역 모달은 서비스에서 skip).
 */

/** 백엔드 서비스명 → 화면 친화명 매핑(없으면 원 이름 그대로 노출). */
const SERVICE_DISPLAY_NAME: Record<string, string> = {
  "hana-digitaltwin": "API 서버",
  "hana-gateway": "게이트웨이",
  "hana-event": "이벤트 서버",
};

const POLL_INTERVAL_MS = 5000;

type LiveStatus = "UP" | "DOWN" | "UNKNOWN" | string;

/** 사용률(0.0~1.0) → "xx.x%" / "측정 불가". */
function formatUsagePercent(value: unknown): string {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
    return "측정 불가";
  }
  return `${(value * 100).toFixed(1)}%`;
}

/** LiveStatus → Badge tone + 라벨. */
function liveStatusView(status: LiveStatus): { tone: BadgeTone; label: string } {
  switch (status) {
    case "UP":
      return { tone: "success", label: "정상" };
    case "DOWN":
      return { tone: "danger", label: "비정상" };
    default:
      return { tone: "warning", label: "확인불가" };
  }
}

/** 서비스 status(LiveStatus) → 실행 상태 Badge. */
function serviceStatusView(status: LiveStatus): { tone: BadgeTone; label: string } {
  switch (status) {
    case "UP":
      return { tone: "success", label: "Running" };
    case "DOWN":
      return { tone: "danger", label: "Stopped" };
    default:
      return { tone: "warning", label: "Unknown" };
  }
}

/** heapUsedBytes → "NNMB" (수집 실패 시 "—"). */
function formatHeapMB(bytes: unknown): string {
  if (typeof bytes !== "number" || Number.isNaN(bytes) || bytes < 0) return "—";
  return `${(bytes / 1048576).toFixed(0)}MB`;
}

/** used/max 비율(0~1) → formatUsagePercent 표기. max<=0 또는 값 없으면 "측정 불가". */
function formatRatioPercent(used: unknown, max: unknown): string {
  if (
    typeof used !== "number" ||
    typeof max !== "number" ||
    Number.isNaN(used) ||
    Number.isNaN(max) ||
    max <= 0 ||
    used < 0
  ) {
    return "측정 불가";
  }
  return formatUsagePercent(used / max);
}

/** uptimeMs → "Nd Nh Nm" (없으면 "—"). */
function formatUptime(ms: unknown): string {
  if (typeof ms !== "number" || Number.isNaN(ms) || ms < 0) return "—";
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${mins}m`);
  return parts.join(" ");
}

/** responseTimeMs → "NNms" (없으면 "—"). */
function formatMs(ms: unknown): string {
  if (typeof ms !== "number" || Number.isNaN(ms) || ms < 0) return "—";
  return `${ms}ms`;
}

/** ISO 시각 → 로컬 표기 (없으면 "—"). */
function formatDateTime(iso: unknown): string {
  if (!iso || typeof iso !== "string") return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("ko-KR");
}

/** axios 에러에서 HTTP status 를 안전하게 뽑는다. */
function getHttpStatus(err: unknown): number | undefined {
  return (err as { response?: { status?: number } } | undefined)?.response?.status;
}

const SystemServerPage = () => {
  const { user } = useAuth() ?? {};

  // AuthContext user.roles(List<String>) 로 ADMIN 여부 판정.
  // 노출 형태가 애매하면 서버 403 graceful 처리로 갈음(라우트 레벨 가드는 후속).
  const roles: string[] = Array.isArray(user?.roles)
    ? user.roles
    : Array.isArray(user?.role)
      ? user.role
      : [];
  const isAdmin = roles.some((r) => String(r).toUpperCase() === "ADMIN");

  const { data, isLoading, isError, error, dataUpdatedAt } = useQuery({
    queryKey: MONITOR_STATUS_QUERY_KEY,
    queryFn: fetchMonitorStatusAPI,
    refetchInterval: POLL_INTERVAL_MS,
    enabled: isAdmin,
    retry: false,
  });

  const forbidden = getHttpStatus(error) === 403;

  // 선택된(펼쳐진) 서비스명 – 클릭 토글로 상세 행을 아코디언처럼 노출한다.
  const [expanded, setExpanded] = useState<string | null>(null);

  const services = useMemo(
    () => (Array.isArray(data?.services) ? data.services : []),
    [data]
  );

  // 상단 카드: 인프라 의존처(DB/Kafka 등) 도달성만 표시. 리소스는 없다.
  const dependencies = useMemo(
    () => (Array.isArray(data?.dependencies) ? data.dependencies : []),
    [data]
  );

  // ----- 비ADMIN / 권한 부족 안내 -----
  if (!isAdmin || forbidden) {
    return (
      <AdminPageTemplate
        title="서버 관리 콘솔"
        description="서버 상태 및 관리를 수행합니다."
      >
        <Notice>
          <NoticeTitle>관리자 권한이 필요합니다</NoticeTitle>
          <NoticeText>
            서버 관리 콘솔은 ADMIN 권한을 가진 사용자만 조회할 수 있습니다.
          </NoticeText>
        </Notice>
      </AdminPageTemplate>
    );
  }

  return (
    <AdminPageTemplate
      title="서버 관리 콘솔"
      description="event / gateway / digitaltwin 서비스의 생존 상태와 리소스를 5초 간격으로 관제합니다."
    >
      <TopBar>
        <UpdatedAt>
          {dataUpdatedAt
            ? `최근 갱신: ${new Date(dataUpdatedAt).toLocaleTimeString("ko-KR")}`
            : "갱신 대기 중"}
        </UpdatedAt>
      </TopBar>

      {isError && !forbidden && (
        <ErrorText>서버 상태를 불러오지 못했습니다. 잠시 후 다시 시도됩니다.</ErrorText>
      )}

      {/* 상단 카드: 인프라 의존처 도달성 (DB / Kafka 등) */}
      <SectionLabel>인프라 의존성</SectionLabel>
      {isLoading && dependencies.length === 0 ? (
        <Muted>불러오는 중…</Muted>
      ) : dependencies.length === 0 ? (
        <Muted>등록된 인프라 의존처가 없습니다.</Muted>
      ) : (
        <CardGrid>
          {dependencies.map((dep) => {
            const view = liveStatusView(dep?.status);
            return (
              <Card key={`${dep?.name}-${dep?.target}`}>
                <CardLabel>
                  {dep?.name ?? "—"}
                  {dep?.target && <CardTarget title={dep.target}>{dep.target}</CardTarget>}
                </CardLabel>
                <CardValue>
                  <Badge tone={view.tone}>{view.label}</Badge>
                </CardValue>
              </Card>
            );
          })}
        </CardGrid>
      )}

      {/* 서비스 테이블: 서비스별 리소스 */}
      <Panel>
        <PanelHeader>
          <PanelTitle>서비스 상태</PanelTitle>
        </PanelHeader>

        {isLoading && services.length === 0 ? (
          <Muted>불러오는 중…</Muted>
        ) : services.length === 0 ? (
          <Muted>표시할 서비스가 없습니다.</Muted>
        ) : (
          <TableWrap>
            <table>
              <thead>
                <tr>
                  <th>서비스명</th>
                  <th style={{ width: 110 }}>상태</th>
                  <th style={{ width: 90 }}>CPU</th>
                  <th style={{ width: 90 }}>힙</th>
                  <th style={{ width: 90 }}>디스크</th>
                  <th style={{ width: 90 }}>PID</th>
                  <th style={{ width: 190 }}>시작 시각</th>
                  <th style={{ width: 110 }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {services.map((svc) => {
                  const view = serviceStatusView(svc?.status);
                  const displayName =
                    SERVICE_DISPLAY_NAME[svc?.service] ?? svc?.service ?? "—";
                  const resource = svc?.resource;
                  const isOpen = expanded === svc?.service;
                  return (
                    <FragmentRow
                      key={svc?.service ?? displayName}
                      svc={svc}
                      view={view}
                      displayName={displayName}
                      resource={resource}
                      isOpen={isOpen}
                      onToggle={() =>
                        setExpanded((cur) =>
                          cur === svc?.service ? null : (svc?.service ?? null)
                        )
                      }
                    />
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        )}

        <FootNote>
          사용률은 0~100%로 표기하며, 측정 불가 항목은 “측정 불가”로 표시됩니다.
          「힙」은 호스트 물리 메모리가 아닌 JVM 힙(heapUsedBytes/heapMaxBytes)
          사용률입니다. DB·Kafka 등 인프라 의존처는 리소스를 수집하지 않고 도달성만
          표시합니다. 서비스명을 클릭하면 상세 리소스를 확인할 수 있습니다.
        </FootNote>
      </Panel>
    </AdminPageTemplate>
  );
};

/**
 * 서비스 1건에 대한 요약 행 + (펼침 시) 상세 행.
 * 서비스명은 button(role) 로 노출해 접근성을 확보하고, 클릭 시 상세 행을 토글한다.
 */
type ServiceRowProps = {
  svc: any;
  view: { tone: BadgeTone; label: string };
  displayName: string;
  resource: any;
  isOpen: boolean;
  onToggle: () => void;
};

const FragmentRow = ({
  svc,
  view,
  displayName,
  resource,
  isOpen,
  onToggle,
}: ServiceRowProps) => {
  const hasResource = resource != null;
  return (
    <>
      <tr>
        <td>
          <NameButton
            type="button"
            onClick={onToggle}
            aria-expanded={isOpen}
            title="클릭하면 상세 리소스를 표시합니다."
          >
            <Caret aria-hidden>{isOpen ? "▾" : "▸"}</Caret>
            <NameCol>
              <strong>{displayName}</strong>
              {SERVICE_DISPLAY_NAME[svc?.service] && (
                <RawName>{svc?.service}</RawName>
              )}
            </NameCol>
          </NameButton>
        </td>
        <td>
          <Badge tone={view.tone}>{view.label}</Badge>
        </td>
        <td className="mono">
          {hasResource ? formatUsagePercent(resource?.processCpuLoad) : "—"}
        </td>
        <td className="mono">
          {hasResource
            ? formatRatioPercent(resource?.heapUsedBytes, resource?.heapMaxBytes)
            : "—"}
        </td>
        <td className="mono">
          {hasResource ? formatUsagePercent(resource?.diskUsage) : "—"}
        </td>
        <td className="mono">{svc?.pid != null ? svc.pid : "—"}</td>
        <td className="muted">{formatDateTime(svc?.startedAt)}</td>
        <td>
          <Button
            variant="outline"
            size="sm"
            disabled
            title="재시작 기능은 준비 중입니다."
          >
            재시작
          </Button>
        </td>
      </tr>
      {isOpen && (
        <tr>
          <td colSpan={8} style={{ padding: 0 }}>
            <DetailPanel>
              {hasResource ? (
                <DetailGrid>
                  <DetailItem>
                    <DetailKey>시스템 CPU</DetailKey>
                    <DetailVal>{formatUsagePercent(resource?.systemCpuLoad)}</DetailVal>
                  </DetailItem>
                  <DetailItem>
                    <DetailKey>스레드 수</DetailKey>
                    <DetailVal>
                      {typeof resource?.threadCount === "number"
                        ? resource.threadCount
                        : "—"}
                    </DetailVal>
                  </DetailItem>
                  <DetailItem>
                    <DetailKey>가동 시간</DetailKey>
                    <DetailVal>{formatUptime(resource?.uptimeMs)}</DetailVal>
                  </DetailItem>
                  <DetailItem>
                    <DetailKey>응답 시간</DetailKey>
                    <DetailVal>{formatMs(svc?.responseTimeMs)}</DetailVal>
                  </DetailItem>
                  <DetailItem>
                    <DetailKey>힙 사용</DetailKey>
                    <DetailVal>
                      {formatHeapMB(resource?.heapUsedBytes)} /{" "}
                      {formatHeapMB(resource?.heapMaxBytes)}
                    </DetailVal>
                  </DetailItem>
                  <DetailItem>
                    <DetailKey>시작 시각</DetailKey>
                    <DetailVal>{formatDateTime(svc?.startedAt)}</DetailVal>
                  </DetailItem>
                </DetailGrid>
              ) : (
                <Muted>
                  리소스 정보가 없습니다(서비스 미응답 또는 수집 실패).
                </Muted>
              )}
              {svc?.detail && <DetailNote>{svc.detail}</DetailNote>}
            </DetailPanel>
          </td>
        </tr>
      )}
    </>
  );
};

const TopBar = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
`;

const SectionLabel = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: #475569;
  margin-bottom: 10px;
`;

const CardTarget = styled.span`
  display: block;
  margin-top: 2px;
  font-size: 11px;
  font-weight: 500;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const NameButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
  color: inherit;
  font: inherit;
  &:hover strong {
    text-decoration: underline;
  }
`;

const Caret = styled.span`
  font-size: 11px;
  color: #94a3b8;
`;

const NameCol = styled.span`
  display: inline-flex;
  flex-direction: column;
`;

const DetailPanel = styled.div`
  padding: 14px 16px;
  background: #f8fafc;
  border-top: 1px solid #eef2f7;
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px 20px;
`;

const DetailItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const DetailKey = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
`;

const DetailVal = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  font-variant-numeric: tabular-nums;
`;

const DetailNote = styled.p`
  margin: 12px 0 0 0;
  font-size: 12px;
  color: #64748b;
`;

const UpdatedAt = styled.span`
  font-size: 12px;
  color: #94a3b8;
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
`;

const Card = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 16px 18px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
`;

const CardLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 8px;
`;

const CardValue = styled.div`
  font-size: 22px;
  font-weight: 700;
  color: #111d2c;
`;

const Panel = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 18px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
`;

const PanelTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #111d2c;
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
    vertical-align: middle;
  }
  th {
    background: #f8fafc;
    font-weight: 600;
    color: #475569;
  }
  td.mono {
    font-variant-numeric: tabular-nums;
    color: #334155;
  }
  td.muted {
    font-size: 12px;
    color: #94a3b8;
  }
`;

const RawName = styled.span`
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: #94a3b8;
`;

const Muted = styled.p`
  margin: 0;
  color: #94a3b8;
  font-size: 14px;
`;

const ErrorText = styled.p`
  margin: 0 0 16px 0;
  color: #b91c1c;
  font-size: 14px;
`;

const FootNote = styled.p`
  margin: 14px 0 0 0;
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
`;

const Notice = styled.div`
  padding: 32px;
  text-align: center;
  border: 1px dashed #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
`;

const NoticeTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 700;
  color: #334155;
`;

const NoticeText = styled.p`
  margin: 0;
  font-size: 13px;
  color: #64748b;
`;

export default SystemServerPage;
