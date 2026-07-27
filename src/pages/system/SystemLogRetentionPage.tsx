import { showAlert, showConfirm } from "@/utils/dialogBridge";
import { useMemo, useState } from "react";
import styled from "styled-components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminPageTemplate from "@/components/common/AdminPageTemplate";
import { Button } from "@/components/ui";
import {
  LOG_RETENTION_QUERY_KEY,
  fetchLogRetentionPolicies,
  runLogRetentionPurge,
  updateLogRetentionPolicies,
} from "@/services/logRetentionService";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

/**
 * 로그 종류별 보관 일수 설정 + (선택) 즉시 정리
 *
 * 서버는 스케줄러를 **하나** 두고, 매일 설정된 일수보다 오래된 행만 삭제합니다.
 * 로그 종류마다 스케줄러를 나눌 필요는 없습니다.
 */
const SystemLogRetentionPage = () => {
  const queryClient = useQueryClient();
  const { data: policies = [], isLoading, isError } = useQuery({
    queryKey: LOG_RETENTION_QUERY_KEY,
    queryFn: fetchLogRetentionPolicies,
  });

  const [draft, setDraft] = useState({});

  const mergedRows = useMemo(() => {
    return policies.map((p) => ({
      ...p,
      retentionDays:
        draft[p.policyKey] !== undefined
          ? draft[p.policyKey]
          : p.retentionDays,
    }));
  }, [policies, draft]);

  const isDirty = useMemo(() => {
    return policies.some(
      (p) =>
        draft[p.policyKey] !== undefined &&
        draft[p.policyKey] !== p.retentionDays
    );
  }, [policies, draft]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateLogRetentionPolicies({
        policies: mergedRows.map((r) => ({
          policyKey: r.policyKey,
          retentionDays: Math.min(
            3650,
            Math.max(1, parseInt(String(r.retentionDays), 10) || 1)
          ),
        })),
      }),
    onSuccess: () => {
      setDraft({});
      queryClient.invalidateQueries({ queryKey: LOG_RETENTION_QUERY_KEY });
      showAlert("저장되었습니다.");
    },
    onError: (err) => {
      showAlert(getApiErrorMessage(err, "저장에 실패했습니다."));
    },
  });

  const purgeMutation = useMutation({
    mutationFn: runLogRetentionPurge,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["audit"] });
      showAlert(
        `정리 완료.\n접속 로그 ${result?.deletedAccessRows ?? 0}건, 사용 로그 ${result?.deletedUsageRows ?? 0}건 삭제 (적용 보관일: 접속 ${result?.accessRetentionDaysApplied ?? "-"}일 / 사용 ${result?.usageRetentionDaysApplied ?? "-"}일)`
      );
    },
    onError: (err) => {
      showAlert(getApiErrorMessage(err, "정리 실행에 실패했습니다."));
    },
  });

  const handleDayChange = (policyKey, value) => {
    const n = parseInt(value, 10);
    if (Number.isNaN(n)) {
      setDraft((d) => ({ ...d, [policyKey]: "" }));
      return;
    }
    setDraft((d) => ({ ...d, [policyKey]: Math.min(3650, Math.max(1, n)) }));
  };

  const handlePurgeNow = async () => {
    const ok = await showConfirm(
      "보관 일수보다 오래된 로그를 지금 삭제할까요? (배치와 동일한 기준입니다.)"
    );
    if (!ok) {
      return;
    }
    purgeMutation.mutate();
  };

  return (
    <AdminPageTemplate
      title="로그 보관 기간"
      description="로그 종류별로 ‘며칠치까지 보관할지’만 정합니다. 삭제 작업은 서버의 스케줄러 한 개가 주기적으로 수행합니다."
    >
      <IntroCard>
        <IntroTitle>설계 안내</IntroTitle>
        <IntroList>
          <li>
            <strong>스케줄러는 하나</strong>로 두는 것이 일반적입니다. 매일(또는
            설정한 시각) 한 번 실행되며, DB에 저장된 보관 일수를 읽고 접속 로그·사용
            로그 테이블을 순서대로 정리합니다.
          </li>
          <li>
            <strong>로그마다 스케줄러를 나눌 필요는 없습니다.</strong> 다만 보관
            <em>일수</em>는 로그 성격에 따라 다르게 두는 경우가 많습니다 (예: 접속
            180일, 사용 90일).
          </li>
          <li>
            아래 값은 <code>tbl_log_retention_policy</code>에 저장되며, 서버
            설정 <code>app.log-retention.purge-cron</code>으로 실행 시각을 바꿀 수
            있습니다.
          </li>
        </IntroList>
      </IntroCard>

      <Panel>
        <PanelHeader>
          <PanelTitle>보관 일수</PanelTitle>
          <PanelActions>
            <Button
              variant="outline"
              onClick={handlePurgeNow}
              disabled={purgeMutation.isPending || saveMutation.isPending}
            >
              {purgeMutation.isPending ? "정리 중…" : "만료 로그 지금 정리"}
            </Button>
            <Button
              variant="primary"
              onClick={() => saveMutation.mutate()}
              disabled={
                !isDirty || saveMutation.isPending || isLoading || isError
              }
            >
              {saveMutation.isPending ? "저장 중…" : "설정 저장"}
            </Button>
          </PanelActions>
        </PanelHeader>

        {isLoading ? (
          <Muted>불러오는 중…</Muted>
        ) : isError ? (
          <ErrorText>정책을 불러오지 못했습니다.</ErrorText>
        ) : (
          <TableWrap>
            <table>
              <thead>
                <tr>
                  <th>로그 유형</th>
                  <th>정책 키</th>
                  <th style={{ width: 200 }}>보관 일수</th>
                  <th>설명</th>
                  <th style={{ width: 180 }}>수정 시각</th>
                </tr>
              </thead>
              <tbody>
                {mergedRows.map((row) => (
                  <tr key={row.policyKey}>
                    <td>
                      <strong>{row.label}</strong>
                    </td>
                    <td>
                      <code>{row.policyKey}</code>
                    </td>
                    <td>
                      <DayInput
                        type="number"
                        min={1}
                        max={3650}
                        value={row.retentionDays}
                        onChange={(e) =>
                          handleDayChange(row.policyKey, e.target.value)
                        }
                      />
                      <DaySuffix>일</DaySuffix>
                    </td>
                    <td className="desc">{row.description || "—"}</td>
                    <td className="muted">
                      {row.updatedAt
                        ? new Date(row.updatedAt).toLocaleString("ko-KR")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}

        <FootNote>
          보관 일수 <strong>N</strong>이면, 오늘 기준 <strong>N일 이전</strong>
          데이터가 삭제 대상입니다. (매일 스케줄 또는「만료 로그 지금 정리」)
        </FootNote>
      </Panel>
    </AdminPageTemplate>
  );
};

const IntroCard = styled.section`
  margin-bottom: 20px;
  padding: 16px 18px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
`;

const IntroTitle = styled.h2`
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: 700;
  color: #334155;
`;

const IntroList = styled.ul`
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  line-height: 1.6;
  color: #475569;
  strong {
    color: #1e293b;
  }
  code {
    font-size: 11px;
    background: #fff;
    padding: 1px 5px;
    border-radius: 4px;
    border: 1px solid #e2e8f0;
  }
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
  flex-wrap: wrap;
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

const PanelActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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
  td.desc {
    color: #64748b;
    font-size: 12px;
  }
  td.muted {
    font-size: 12px;
    color: #94a3b8;
  }
  code {
    font-size: 12px;
    color: #0d47a1;
  }
`;

const DayInput = styled.input`
  width: 88px;
  padding: 6px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 14px;
`;

const DaySuffix = styled.span`
  margin-left: 6px;
  font-size: 13px;
  color: #64748b;
`;

const Muted = styled.p`
  margin: 0;
  color: #94a3b8;
  font-size: 14px;
`;

const ErrorText = styled.p`
  margin: 0;
  color: #b91c1c;
  font-size: 14px;
`;

const FootNote = styled.p`
  margin: 14px 0 0 0;
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
`;

export default SystemLogRetentionPage;
