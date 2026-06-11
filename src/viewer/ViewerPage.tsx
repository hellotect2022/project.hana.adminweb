import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Viewer } from './scene/Viewer';

const Full = styled.div`
  position: fixed;
  inset: 0;
  background: #20242b;
`;
const BackBtn = styled.button`
  position: fixed;
  top: 14px;
  left: 14px;
  z-index: 10;
  padding: 8px 14px;
  font-weight: 700;
  cursor: pointer;
  color: #e8ecf2;
  background: rgba(20, 22, 28, 0.85);
  border: 1px solid #3a3f48;
  border-radius: 8px;
  &:hover { background: rgba(40, 44, 52, 0.95); }
`;

// /webgl 라우트 진입점 — 전체화면 R3F 뷰어 (헤더 WebGL 버튼으로 진입)
export function ViewerPage() {
  const navigate = useNavigate();
  return (
    <Full>
      <BackBtn onClick={() => navigate(-1)}>← 관리자로</BackBtn>
      <Viewer />
    </Full>
  );
}
