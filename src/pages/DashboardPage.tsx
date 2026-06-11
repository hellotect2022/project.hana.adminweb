import styled from 'styled-components';

const Card = styled.div`
  background: ${(p) => p.theme.colors.panel};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 10px;
  padding: 24px;
`;
const H = styled.h1`
  margin: 0 0 8px;
  font-size: 20px;
`;
const P = styled.p`
  color: ${(p) => p.theme.colors.subtext};
  margin: 0;
`;

export function DashboardPage() {
  return (
    <Card>
      <H>대시보드</H>
      <P>
        admin(React/TS) + WebGL 뷰어(R3F) 통합 골격입니다. 우측 상단 <b>WebGL</b> 버튼으로 3D 뷰어로 전환하세요.
      </P>
    </Card>
  );
}
