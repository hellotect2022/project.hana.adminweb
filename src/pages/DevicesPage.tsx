import { useState } from 'react';
import styled from 'styled-components';
import { useDevices } from '@/hooks/useDevices';

const Card = styled.div`
  background: ${(p) => p.theme.colors.panel};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 10px;
  padding: 20px;
`;
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid ${(p) => p.theme.colors.border}; }
  th { color: ${(p) => p.theme.colors.subtext}; font-weight: 600; }
`;
const Badge = styled.span<{ $on: boolean }>`
  display: inline-block;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: ${(p) => (p.$on ? p.theme.colors.accent : '#9aa0a8')};
`;
const Pager = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 14px;
  button { padding: 6px 12px; cursor: pointer; }
`;

export function DevicesPage() {
  const [page, setPage] = useState(0);
  const { data, isLoading, isError, error } = useDevices(page);

  return (
    <Card>
      <h1 style={{ marginTop: 0, fontSize: 20 }}>장비 목록</h1>
      {isLoading && <p>불러오는 중…</p>}
      {isError && <p style={{ color: 'crimson' }}>오류: {(error as Error).message}</p>}
      {data && (
        <>
          <Table>
            <thead>
              <tr>
                <th>ID</th><th>이름</th><th>카테고리</th><th>층</th><th>배치</th>
              </tr>
            </thead>
            <tbody>
              {data.content.map((d) => (
                <tr key={d.deviceId}>
                  <td>{d.deviceId}</td>
                  <td>{d.deviceName}</td>
                  <td>{d.categoryName ?? '-'}</td>
                  <td>{d.location?.floorName ?? '-'}</td>
                  <td><Badge $on={d.placed}>{d.placed ? '배치됨' : '미배치'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pager>
            <button disabled={data.first} onClick={() => setPage((n) => Math.max(0, n - 1))}>이전</button>
            <span>{data.number + 1} / {data.totalPages} (총 {data.totalElements})</span>
            <button disabled={data.last} onClick={() => setPage((n) => n + 1)}>다음</button>
          </Pager>
        </>
      )}
    </Card>
  );
}
