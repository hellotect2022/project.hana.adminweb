import { NavLink, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { SvgIcons } from "../common/Icon";
import { useAuth } from "@/contexts/AuthContext";
import { useModal } from "@/contexts/ModalContext";
import { useSidebarHistory } from "@/contexts/SidebarHistoryContext";

const Header = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { openModal } = useModal();
    const { sidebarHistory, removeSidebarHistory } = useSidebarHistory();

    const handleLogout = () => {
        openModal({ title: "로그아웃", content: "로그아웃 합니까? ", onConfirm: logout });
    };

    return (
    <HeaderContainer>
      {/* 최근 방문 이력 */}
      
      <RecentHistoryArea>
        {sidebarHistory.map((item,index) => (
          <RecentHistoryBtn key={`${item.path}-${item.label}`} to={item.path}>
            <div>{item.label}</div>
            <div style={{fontSize:"10px"}} onClick={(e)=>{
              e.preventDefault();
              e.stopPropagation();
              removeSidebarHistory(item.path);
            }}>X</div>
          </RecentHistoryBtn>
        ))}
      </RecentHistoryArea>

      {/* 왼쪽: 탭 영역 */}
      {/* <TabArea>
        <TabItem>사용자탭 ×</TabItem>
        <TabItem $active>기본정보 ×</TabItem>
        <TabItem>사용자탭 ×</TabItem>
      </TabArea> */}

      {/* 오른쪽: 시스템 정보 영역 */}
      <SystemArea>
        <WebglButton onClick={() => navigate('/webgl')} title="3D 디지털트윈 뷰어">◢ WebGL</WebglButton>

        <SearchWrapper>
          <input type="text" placeholder="통합검색" />
          <SvgIcons.Search width={13} height={13}/>
        </SearchWrapper>
        
        <InfoDivider />
        
        <StatusInfo>
          <span>2026.02.23</span>
          <span>14:03</span>
          <span>💧 10%</span>
          <span>☀️ 맑음 19°C</span>
        </StatusInfo>

        <LogoutButton onClick={()=>handleLogout()}>
          {/* <FiLogOut /> 로그아웃 */}
          <SvgIcons.Logout width={24} height={24}/>
          로그아웃
        </LogoutButton>
      </SystemArea>
    </HeaderContainer>
    )
}


const HeaderContainer = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 50px;
  background-color: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  padding: 0 20px;
`;

const RecentHistoryArea = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  margin-right: 16px;
  &::-webkit-scrollbar { display: none; } /* 스크롤바 숨기기 (선택) */
`;

const RecentHistoryBtn = styled(NavLink)`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  gap: 8px;
  font-size: 12px;
  text-decoration: none; /* NavLink 기본 밑줄 제거 */
  background-color: #F2F2F2;
  color : #8E8E8E;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  white-space: nowrap;
  &.active {
    background-color:#4A6380;
    color: #ffffff;
  }
  &:hover {
    background: #4A6380;
    color: #ffffff;
  }
`;

const RecentHistoryLabel = styled.span`
  font-size: 12px;
  color: #566a7f;
  white-space: nowrap;
`;





const SystemArea = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  color: #595959;
  font-size: 14px;
`;

const SearchWrapper = styled.div`
  position: relative;
  input {
    padding: 4px 30px 4px 10px;
    border: 1px solid #dcdde1;
    border-radius: 4px;
    outline: none;
  }
  svg {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    color: #a6adb4;
  }
`;

const StatusInfo = styled.div`
  display: flex;
  gap: 15px;
  font-weight: 500;
`;

const InfoDivider = styled.div`
  width: 1px;
  height: 16px;
  background-color: #dcdde1;
`;

const WebglButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-weight: 700;
  cursor: pointer;
  color: #fff;
  background: #3a6ff7;
  border: none;
  border-radius: 6px;
  &:hover { filter: brightness(1.08); }
`;

const LogoutButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: #595959;
  cursor: pointer;
  font-weight: 600;
  
  &:hover { color: #2f3542; }
`;

export default Header;