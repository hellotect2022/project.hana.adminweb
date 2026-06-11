import { NavLink, useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const Bar = styled.header`
  display: flex;
  align-items: center;
  gap: 24px;
  height: 56px;
  padding: 0 20px;
  background: ${(p) => p.theme.colors.headerBg};
  color: ${(p) => p.theme.colors.headerText};
`;

const Brand = styled.div`
  font-weight: 800;
  letter-spacing: 0.4px;
`;

const Nav = styled.nav`
  display: flex;
  gap: 6px;
  a {
    padding: 8px 12px;
    border-radius: 6px;
    color: ${(p) => p.theme.colors.headerText};
    opacity: 0.8;
    &.active { background: rgba(255, 255, 255, 0.12); opacity: 1; }
    &:hover { opacity: 1; }
  }
`;

const Spacer = styled.div`
  flex: 1;
`;

// ⭐ WebGL 진입 버튼 — 클릭 시 /webgl 라우트로 화면 전환
const WebglBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-weight: 700;
  cursor: pointer;
  color: #fff;
  background: ${(p) => p.theme.colors.primary};
  border: none;
  border-radius: 8px;
  &:hover { filter: brightness(1.08); }
`;

export function Header() {
  const navigate = useNavigate();
  return (
    <Bar>
      <Brand>HANA DREAMTOWN</Brand>
      <Nav>
        <NavLink to="/" end>대시보드</NavLink>
        <NavLink to="/devices">장비</NavLink>
      </Nav>
      <Spacer />
      <WebglBtn onClick={() => navigate('/webgl')} title="3D 디지털트윈 뷰어">
        ◢ WebGL
      </WebglBtn>
    </Bar>
  );
}
