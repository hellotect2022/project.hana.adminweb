import { useQuery } from "@tanstack/react-query";
import styled from "styled-components";
import { Button } from "@/components/ui";
import {
  DEVICE_INFRA_CONSISTENCY_QUERY_KEY,
  fetchDeviceInfraConsistencyAPI,
} from "@/services/deviceInfraService";

/**
 * 인프라 매핑 정합성 리포트 (openModal wide + hideFooter 패턴).
 * - 미매핑 장비: XN ref 보유 + infra_id NULL — 자동 산정/수동 지정 대상
 * - 다중 ref 참조 장비: 서로 다른 ref 2개 이상 참조 — 오귀속 검수 후보
 */
const DeviceInfraConsistencyModal = () => {
  const {
    data: report,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: DEVICE_INFRA_CONSISTENCY_QUERY_KEY,
    queryFn: fetchDeviceInfraConsistencyAPI,
  });

  if (isLoading) {
    return <StatusBox>정합성 리포트를 불러오는 중…</StatusBox>;
  }

  if (isError) {
    return (
      <ErrorBox>
        <p>{(error as Error)?.message ?? "정합성 리포트를 불러오지 못했습니다."}</p>
        <Button variant="secondary" onClick={() => refetch()}>
          다시 시도
        </Button>
      </ErrorBox>
    );
  }

  const unmapped = report?.unmappedXnDevices ?? [];
  const multiRef = report?.multiRefDevices ?? [];

  return (
    <Wrap>
      <Section>
        <SectionTitle>
          미매핑 장비 (XN ref 보유)
          <CountBadge $warn={unmapped.length > 0}>{unmapped.length}건</CountBadge>
        </SectionTitle>
        <SectionHint>
          포인트에 XN ref 코드가 있으나 인프라 소속(infra_id)이 비어있는 장비입니다.
          자동 산정 또는 수동 지정으로 매핑하세요.
        </SectionHint>
        {unmapped.length === 0 ? (
          <EmptyHint>미매핑 장비가 없습니다.</EmptyHint>
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th $center style={{ width: 100 }}>장비 ID</Th>
                  <Th>장비 이름</Th>
                </tr>
              </thead>
              <tbody>
                {unmapped.map((d) => (
                  <tr key={d.deviceId}>
                    <Td $center>{d.deviceId}</Td>
                    <Td>{d.deviceName}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Section>

      <Section>
        <SectionTitle>
          다중 ref 참조 장비 (검수 후보)
          <CountBadge $warn={multiRef.length > 0}>{multiRef.length}건</CountBadge>
        </SectionTitle>
        <SectionHint>
          서로 다른 ref 코드를 2개 이상 참조하는 장비입니다. 포인트 매핑 오귀속 여부를
          검수하세요.
        </SectionHint>
        {multiRef.length === 0 ? (
          <EmptyHint>다중 ref 참조 장비가 없습니다.</EmptyHint>
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th $center style={{ width: 100 }}>장비 ID</Th>
                  <Th>장비 이름</Th>
                  <Th $center style={{ width: 120 }}>참조 ref 수</Th>
                </tr>
              </thead>
              <tbody>
                {multiRef.map((d) => (
                  <tr key={d.deviceId}>
                    <Td $center>{d.deviceId}</Td>
                    <Td>{d.deviceName}</Td>
                    <Td $center>{d.refCount}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Section>
    </Wrap>
  );
};

export default DeviceInfraConsistencyModal;

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 4px 0 8px;
`;

const StatusBox = styled.div`
  padding: 48px 24px;
  text-align: center;
  font-size: 14px;
  color: #64748b;
`;

const ErrorBox = styled.div`
  padding: 24px;
  text-align: center;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;
  p {
    margin: 0 0 12px 0;
  }
`;

const Section = styled.section`
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  padding: 14px 16px;
`;

const SectionTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 6px 0;
  font-size: 14px;
  font-weight: 700;
  color: #111d2c;
`;

const CountBadge = styled.span<{ $warn?: boolean }>`
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: ${(p) => (p.$warn ? "#fef3c7" : "#dcfce7")};
  color: ${(p) => (p.$warn ? "#92400e" : "#15803d")};
`;

const SectionHint = styled.p`
  margin: 0 0 10px 0;
  font-size: 12px;
  color: #94a3b8;
`;

const EmptyHint = styled.div`
  padding: 18px 12px;
  text-align: center;
  font-size: 13px;
  color: #9ca3af;
  background: #f9fafb;
  border-radius: 6px;
`;

const TableWrap = styled.div`
  max-height: 260px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
`;

const Th = styled.th<{ $center?: boolean }>`
  position: sticky;
  top: 0;
  padding: 9px 12px;
  text-align: ${(p) => (p.$center ? "center" : "left")};
  font-size: 12px;
  font-weight: 700;
  color: #374151;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
`;

const Td = styled.td<{ $center?: boolean }>`
  padding: 8px 12px;
  border-bottom: 1px solid #f3f4f6;
  color: #111827;
  text-align: ${(p) => (p.$center ? "center" : "left")};
`;
